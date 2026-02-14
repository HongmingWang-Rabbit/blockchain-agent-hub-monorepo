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

import { AGNTTokenABI, AgentRegistryABI, TaskMarketplaceABI, AgentNFTABI, WorkflowEngineABI, DynamicPricingABI } from './abis';
import type {
  NetworkConfig,
  Agent,
  Task,
  CreateAgentParams,
  CreateTaskParams,
  AgentIdentity,
  Badge,
  Workflow,
  WorkflowStep,
  CreateWorkflowParams,
  AddStepParams,
  PricingInfo,
  PriceRange,
} from './types';
import { TaskStatus, WorkflowStatus, StepStatus, StepType } from './types';

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
  private readonly agentNFT;
  private readonly workflowEngine;
  private readonly dynamicPricing;

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

    // Initialize AgentNFT if address provided
    if (config.network.contracts.agentNFT) {
      this.agentNFT = getContract({
        address: config.network.contracts.agentNFT,
        abi: AgentNFTABI,
        client: this.publicClient,
      });
    }

    // Initialize WorkflowEngine if address provided
    if (config.network.contracts.workflowEngine) {
      this.workflowEngine = getContract({
        address: config.network.contracts.workflowEngine,
        abi: WorkflowEngineABI,
        client: this.publicClient,
      });
    }

    // Initialize DynamicPricing if address provided
    if (config.network.contracts.dynamicPricing) {
      this.dynamicPricing = getContract({
        address: config.network.contracts.dynamicPricing,
        abi: DynamicPricingABI,
        client: this.publicClient,
      });
    }
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

  // ========== Agent NFT Operations ==========

  /**
   * Check if AgentNFT is available
   */
  hasNFTContract(): boolean {
    return !!this.agentNFT;
  }

  /**
   * Check if an address has an Agent NFT
   */
  async hasAgentNFT(address: Address): Promise<boolean> {
    if (!this.agentNFT) return false;
    return this.agentNFT.read.hasNFT([address]) as Promise<boolean>;
  }

  /**
   * Get token ID for an agent address
   */
  async getAgentTokenId(address: Address): Promise<bigint | null> {
    if (!this.agentNFT) return null;
    const hasNFT = await this.hasAgentNFT(address);
    if (!hasNFT) return null;
    return this.agentNFT.read.agentToToken([address]) as Promise<bigint>;
  }

  /**
   * Get Agent Identity by token ID
   */
  async getAgentIdentity(tokenId: bigint): Promise<AgentIdentity | null> {
    if (!this.agentNFT) return null;
    
    try {
      const owner = await this.agentNFT.read.ownerOf([tokenId]) as Address;
      const identity = await this.agentNFT.read.agentIdentities([tokenId]) as readonly [string, bigint, bigint, bigint];
      const badgesRaw = await this.agentNFT.read.getBadges([tokenId]) as readonly {
        name: string;
        description: string;
        awardedAt: bigint;
        badgeType: number;
      }[];
      
      return {
        tokenId,
        owner,
        name: identity[0],
        capabilities: [], // Not stored in identity struct directly
        registeredAt: new Date(Number(identity[1]) * 1000),
        reputationScore: Number(identity[2]),
        tasksCompleted: Number(identity[3]),
        badges: badgesRaw.map(b => ({
          name: b.name,
          description: b.description,
          awardedAt: new Date(Number(b.awardedAt) * 1000),
          badgeType: b.badgeType,
        })),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get Agent Identity by address
   */
  async getAgentIdentityByAddress(address: Address): Promise<AgentIdentity | null> {
    const tokenId = await this.getAgentTokenId(address);
    if (tokenId === null) return null;
    return this.getAgentIdentity(tokenId);
  }

  /**
   * Get SVG image for an agent NFT
   */
  async getAgentSVG(tokenId: bigint): Promise<string | null> {
    if (!this.agentNFT) return null;
    try {
      return this.agentNFT.read.generateSVG([tokenId]) as Promise<string>;
    } catch {
      return null;
    }
  }

  /**
   * Get token URI (full metadata with image)
   */
  async getAgentTokenURI(tokenId: bigint): Promise<string | null> {
    if (!this.agentNFT) return null;
    try {
      return this.agentNFT.read.tokenURI([tokenId]) as Promise<string>;
    } catch {
      return null;
    }
  }

  /**
   * Get total NFT supply
   */
  async getNFTTotalSupply(): Promise<number> {
    if (!this.agentNFT) return 0;
    const supply = await this.agentNFT.read.totalSupply();
    return Number(supply);
  }

  /**
   * Mint Agent NFT (owner/registry only)
   */
  async mintAgentNFT(agent: Address, name: string, capabilities: string[]): Promise<Hex> {
    if (!this.agentNFT) throw new Error('AgentNFT contract not configured');
    return this.walletClient!.writeContract({
      address: this.network.contracts.agentNFT!,
      abi: AgentNFTABI,
      functionName: 'mintAgentNFT',
      args: [agent, name, capabilities],
      ...this.getWriteParams(),
    });
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

  // ========== Workflow Operations ==========

  /**
   * Check if WorkflowEngine is available
   */
  hasWorkflowEngine(): boolean {
    return !!this.workflowEngine;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    // Approve tokens for budget
    const approveTx = await this.approveTokens(
      this.network.contracts.workflowEngine!,
      params.budget
    );
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    const deadline = BigInt(Math.floor(params.deadline.getTime() / 1000));

    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'createWorkflow',
      args: [params.name, params.description, params.budget, deadline],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: Hex): Promise<Workflow | null> {
    if (!this.workflowEngine) return null;
    
    const data = await this.workflowEngine.read.workflows([workflowId]);
    const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (data[0] === zeroBytes32) {
      return null;
    }

    return {
      id: data[0] as Hex,
      creator: data[1] as Address,
      name: data[2] as string,
      description: data[3] as string,
      totalBudget: data[4] as bigint,
      spent: data[5] as bigint,
      status: Number(data[6]) as WorkflowStatus,
      createdAt: new Date(Number(data[7]) * 1000),
      deadline: new Date(Number(data[8]) * 1000),
    };
  }

  /**
   * Get workflow step IDs
   */
  async getWorkflowSteps(workflowId: Hex): Promise<Hex[]> {
    if (!this.workflowEngine) return [];
    return this.workflowEngine.read.getWorkflowSteps([workflowId]) as Promise<Hex[]>;
  }

  /**
   * Get workflow step by ID
   */
  async getWorkflowStep(workflowId: Hex, stepId: Hex): Promise<WorkflowStep | null> {
    if (!this.workflowEngine) return null;
    
    const data = await this.workflowEngine.read.workflowSteps([workflowId, stepId]);
    const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (data[0] === zeroBytes32) {
      return null;
    }

    return {
      id: data[0] as Hex,
      name: data[1] as string,
      capability: data[2] as string,
      assignedAgent: data[3] === zeroBytes32 ? null : (data[3] as Hex),
      reward: data[4] as bigint,
      stepType: Number(data[5]) as StepType,
      status: Number(data[6]) as StepStatus,
      inputURI: data[7] as string,
      outputURI: data[8] || null,
      startedAt: Number(data[9]) > 0 ? new Date(Number(data[9]) * 1000) : null,
      completedAt: Number(data[10]) > 0 ? new Date(Number(data[10]) * 1000) : null,
    };
  }

  /**
   * Get ready steps (available for agents to claim)
   */
  async getReadySteps(workflowId: Hex): Promise<Hex[]> {
    if (!this.workflowEngine) return [];
    return this.workflowEngine.read.getReadySteps([workflowId]) as Promise<Hex[]>;
  }

  /**
   * Add a step to a workflow
   */
  async addStep(params: AddStepParams): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'addStep',
      args: [
        params.workflowId,
        params.name,
        params.capability,
        params.reward,
        params.stepType ?? StepType.Sequential,
        params.dependencies ?? [],
        params.inputURI ?? '',
      ],
      ...this.getWriteParams(),
    });
  }

  /**
   * Start a workflow
   */
  async startWorkflow(workflowId: Hex): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'startWorkflow',
      args: [workflowId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Accept a workflow step as an agent
   */
  async acceptStep(workflowId: Hex, stepId: Hex, agentId: Hex): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'acceptStep',
      args: [workflowId, stepId, agentId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Complete a workflow step
   */
  async completeStep(workflowId: Hex, stepId: Hex, outputURI: string): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'completeStep',
      args: [workflowId, stepId, outputURI],
      ...this.getWriteParams(),
    });
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: Hex): Promise<Hex> {
    if (!this.workflowEngine) throw new Error('WorkflowEngine contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.workflowEngine!,
      abi: WorkflowEngineABI,
      functionName: 'cancelWorkflow',
      args: [workflowId],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get total workflow count
   */
  async getWorkflowCount(): Promise<number> {
    if (!this.workflowEngine) return 0;
    const count = await this.workflowEngine.read.getWorkflowCount();
    return Number(count);
  }

  // ========== Dynamic Pricing Operations ==========

  /**
   * Check if DynamicPricing is available
   */
  hasDynamicPricing(): boolean {
    return !!this.dynamicPricing;
  }

  /**
   * Calculate price for a capability with agent reputation
   */
  async calculatePrice(capability: string, agentReputation: number): Promise<bigint> {
    if (!this.dynamicPricing) throw new Error('DynamicPricing contract not configured');
    return this.dynamicPricing.read.calculatePrice([capability, BigInt(agentReputation)]) as Promise<bigint>;
  }

  /**
   * Get price range for a capability
   */
  async getPriceRange(capability: string): Promise<PriceRange> {
    if (!this.dynamicPricing) throw new Error('DynamicPricing contract not configured');
    const result = await this.dynamicPricing.read.getPriceRange([capability]);
    return {
      minPrice: result[0] as bigint,
      maxPrice: result[1] as bigint,
      currentPrice: result[2] as bigint,
    };
  }

  /**
   * Get current pricing information
   */
  async getPricingInfo(): Promise<PricingInfo> {
    if (!this.dynamicPricing) throw new Error('DynamicPricing contract not configured');
    const result = await this.dynamicPricing.read.getPricingInfo();
    return {
      currentSurge: Number(result[0]),
      isPeak: result[1] as boolean,
      tasksLastHour: Number(result[2]),
      nextSurgeAt: Number(result[3]),
    };
  }

  /**
   * Get current surge multiplier (basis points, 10000 = 1x)
   */
  async getSurgeMultiplier(): Promise<number> {
    if (!this.dynamicPricing) return 10000;
    const multiplier = await this.dynamicPricing.read.getSurgeMultiplier();
    return Number(multiplier);
  }

  /**
   * Check if currently peak hours
   */
  async isPeakHours(): Promise<boolean> {
    if (!this.dynamicPricing) return false;
    return this.dynamicPricing.read.isPeakHours() as Promise<boolean>;
  }

  /**
   * Get reputation discount (basis points)
   */
  async getReputationDiscount(reputation: number): Promise<number> {
    if (!this.dynamicPricing) return 0;
    const discount = await this.dynamicPricing.read.getReputationDiscount([BigInt(reputation)]);
    return Number(discount);
  }

  /**
   * Get base price for a capability
   */
  async getBasePrice(capability: string): Promise<bigint> {
    if (!this.dynamicPricing) throw new Error('DynamicPricing contract not configured');
    return this.dynamicPricing.read.basePrices([capability]) as Promise<bigint>;
  }
}
