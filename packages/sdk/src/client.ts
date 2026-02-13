import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
  type Chain,
  getContract,
  parseEther,
  formatEther,
} from 'viem';

import { AGNTTokenABI, AgentRegistryABI, TaskMarketplaceABI } from './abis';
import type {
  NetworkConfig,
  Agent,
  Task,
  CreateAgentParams,
  CreateTaskParams,
} from './types';
import { TaskStatus } from './types';

/**
 * SDK Client configuration
 */
export interface AgentHubClientConfig {
  network: NetworkConfig;
  account?: Account;
}

/**
 * Main SDK client for Blockchain Agent Hub
 */
export class AgentHubClient {
  public readonly publicClient: PublicClient;
  public readonly walletClient?: WalletClient;
  public readonly network: NetworkConfig;
  private readonly chain: Chain;

  private readonly agntToken;
  private readonly agentRegistry;
  private readonly taskMarketplace;

  constructor(config: AgentHubClientConfig) {
    this.network = config.network;

    this.chain = {
      id: config.network.chainId,
      name: 'HashKey Chain',
      nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
      rpcUrls: {
        default: { http: [config.network.rpcUrl] },
      },
    } as Chain;

    // Create public client for reads
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.network.rpcUrl),
    });

    // Create wallet client if account provided
    if (config.account) {
      this.walletClient = createWalletClient({
        account: config.account,
        chain: this.chain,
        transport: http(config.network.rpcUrl),
      });
    }

    // Initialize contract instances
    this.agntToken = getContract({
      address: config.network.contracts.agntToken,
      abi: AGNTTokenABI,
      client: this.publicClient,
    });

    this.agentRegistry = getContract({
      address: config.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      client: this.publicClient,
    });

    this.taskMarketplace = getContract({
      address: config.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      client: this.publicClient,
    });
  }

  // Helper for write operations
  private getWriteParams() {
    this.requireWallet();
    return {
      chain: this.chain,
      account: this.walletClient!.account!,
    };
  }

  // ========== Token Operations ==========

  /**
   * Get AGNT token balance
   */
  async getTokenBalance(address: Address): Promise<bigint> {
    return this.agntToken.read.balanceOf([address]);
  }

  /**
   * Get formatted AGNT balance
   */
  async getFormattedBalance(address: Address): Promise<string> {
    const balance = await this.getTokenBalance(address);
    return formatEther(balance);
  }

  /**
   * Approve AGNT spending
   */
  async approveTokens(spender: Address, amount: bigint): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.agntToken,
      abi: AGNTTokenABI,
      functionName: 'approve',
      args: [spender, amount],
      ...this.getWriteParams(),
    });
  }

  // ========== Agent Operations ==========

  /**
   * Register a new agent
   */
  async registerAgent(params: CreateAgentParams): Promise<Hex> {
    // First approve tokens for staking
    const approveTx = await this.approveTokens(
      this.network.contracts.agentRegistry,
      params.stakeAmount
    );
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Register agent
    return this.walletClient!.writeContract({
      address: this.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      functionName: 'registerAgent',
      args: [
        params.name,
        params.metadataURI,
        params.capabilities,
        params.stakeAmount,
      ],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: Hex): Promise<Agent | null> {
    const data = await this.agentRegistry.read.agents([agentId]);
    if (data[0] === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    const capabilities = await this.agentRegistry.read.getAgentCapabilities([
      agentId,
    ]);

    return {
      id: agentId,
      owner: data[0] as Address,
      name: data[1] as string,
      metadataURI: data[2] as string,
      capabilities: capabilities as string[],
      stakedAmount: data[3] as bigint,
      reputationScore: Number(data[4]),
      tasksCompleted: Number(data[5]),
      tasksFailed: Number(data[6]),
      totalEarned: data[7] as bigint,
      registeredAt: new Date(Number(data[8]) * 1000),
      isActive: data[9] as boolean,
    };
  }

  /**
   * Get all agents by capability
   */
  async getAgentsByCapability(capability: string): Promise<Hex[]> {
    return this.agentRegistry.read.getAgentsByCapability([capability]) as Promise<Hex[]>;
  }

  /**
   * Get total agent count
   */
  async getAgentCount(): Promise<number> {
    const count = await this.agentRegistry.read.getAgentCount();
    return Number(count);
  }

  /**
   * Add stake to agent
   */
  async addStake(agentId: Hex, amount: bigint): Promise<Hex> {
    const approveTx = await this.approveTokens(
      this.network.contracts.agentRegistry,
      amount
    );
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    return this.walletClient!.writeContract({
      address: this.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      functionName: 'addStake',
      args: [agentId, amount],
      ...this.getWriteParams(),
    });
  }

  /**
   * Withdraw stake from agent
   */
  async withdrawStake(agentId: Hex, amount: bigint): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      functionName: 'withdrawStake',
      args: [agentId, amount],
      ...this.getWriteParams(),
    });
  }

  /**
   * Deactivate agent
   */
  async deactivateAgent(agentId: Hex): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      functionName: 'deactivateAgent',
      args: [agentId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Reactivate agent
   */
  async reactivateAgent(agentId: Hex): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.agentRegistry,
      abi: AgentRegistryABI,
      functionName: 'reactivateAgent',
      args: [agentId],
      ...this.getWriteParams(),
    });
  }

  // ========== Task Operations ==========

  /**
   * Create a new task
   */
  async createTask(params: CreateTaskParams): Promise<Hex> {
    // Approve tokens for escrow
    const approveTx = await this.approveTokens(
      this.network.contracts.taskMarketplace,
      params.reward
    );
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    const deadline = BigInt(Math.floor(params.deadline.getTime() / 1000));

    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'createTask',
      args: [
        params.title,
        params.descriptionURI,
        params.requiredCapabilities,
        params.reward,
        deadline,
        params.requiresHumanVerification ?? false,
      ],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: Hex): Promise<Task | null> {
    const data = await this.taskMarketplace.read.tasks([taskId]);
    if (data[0] === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }

    const capabilities = await this.taskMarketplace.read.getTaskCapabilities([
      taskId,
    ]);

    const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

    return {
      id: data[0] as Hex,
      requester: data[1] as Address,
      assignedAgent: data[2] === zeroBytes32 ? null : (data[2] as Hex),
      title: data[3] as string,
      descriptionURI: data[4] as string,
      requiredCapabilities: capabilities as string[],
      reward: data[5] as bigint,
      createdAt: new Date(Number(data[6]) * 1000),
      deadline: new Date(Number(data[7]) * 1000),
      submittedAt: Number(data[8]) > 0 ? new Date(Number(data[8]) * 1000) : null,
      resultURI: data[9] || null,
      status: Number(data[10]) as TaskStatus,
      requiresHumanVerification: data[11] as boolean,
    };
  }

  /**
   * Accept a task as an agent
   */
  async acceptTask(taskId: Hex, agentId: Hex): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'acceptTask',
      args: [taskId, agentId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Submit task result
   */
  async submitResult(taskId: Hex, resultURI: string): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'submitResult',
      args: [taskId, resultURI],
      ...this.getWriteParams(),
    });
  }

  /**
   * Approve task result (requester)
   */
  async approveResult(taskId: Hex): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'approveResult',
      args: [taskId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Reject task result and dispute
   */
  async rejectResult(taskId: Hex, reason: string): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'rejectResult',
      args: [taskId, reason],
      ...this.getWriteParams(),
    });
  }

  /**
   * Cancel an open task
   */
  async cancelTask(taskId: Hex): Promise<Hex> {
    return this.walletClient!.writeContract({
      address: this.network.contracts.taskMarketplace,
      abi: TaskMarketplaceABI,
      functionName: 'cancelTask',
      args: [taskId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get best agent for a task
   */
  async getBestAgentForTask(taskId: Hex): Promise<{ agentId: Hex; score: bigint }> {
    const result = await this.taskMarketplace.read.getBestAgentForTask([taskId]);
    return {
      agentId: result[0] as Hex,
      score: result[1] as bigint,
    };
  }

  /**
   * Get total task count
   */
  async getTaskCount(): Promise<number> {
    const count = await this.taskMarketplace.read.getTaskCount();
    return Number(count);
  }

  // ========== Utility ==========

  /**
   * Parse AGNT amount from string
   */
  parseAmount(amount: string): bigint {
    return parseEther(amount);
  }

  /**
   * Format AGNT amount to string
   */
  formatAmount(amount: bigint): string {
    return formatEther(amount);
  }

  /**
   * Get minimum stake required
   */
  async getMinStake(): Promise<bigint> {
    return this.agentRegistry.read.minStake();
  }

  /**
   * Get platform fee percentage
   */
  async getPlatformFee(): Promise<number> {
    const fee = await this.taskMarketplace.read.platformFeePercent();
    return Number(fee) / 100; // Convert from basis points
  }

  private requireWallet(): void {
    if (!this.walletClient) {
      throw new Error('Wallet client required for write operations');
    }
  }
}
