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

import { 
  AGNTTokenABI, 
  AgentRegistryABI, 
  TaskMarketplaceABI, 
  AgentNFTABI, 
  WorkflowEngineABI, 
  DynamicPricingABI,
  GovernorAgentABI,
  TreasuryABI,
  SpendingCategory,
  CrossChainHubABI,
  CrossChainReceiverABI,
} from './abis';
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
  Proposal,
  TreasuryStatus,
  CreateProposalParams,
  VoteParams,
  BroadcastedAgent,
  ChainConfig,
  RemoteAgent,
  BroadcastAgentParams,
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
  private readonly governor;
  private readonly treasury;
  private readonly crossChainHub;
  private readonly crossChainReceiver;

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

    // Initialize Governor if address provided
    if (config.network.contracts.governor) {
      this.governor = getContract({
        address: config.network.contracts.governor,
        abi: GovernorAgentABI,
        client: this.publicClient,
      });
    }

    // Initialize Treasury if address provided
    if (config.network.contracts.treasury) {
      this.treasury = getContract({
        address: config.network.contracts.treasury,
        abi: TreasuryABI,
        client: this.publicClient,
      });
    }

    // Initialize CrossChainHub if address provided
    if (config.network.contracts.crossChainHub) {
      this.crossChainHub = getContract({
        address: config.network.contracts.crossChainHub,
        abi: CrossChainHubABI,
        client: this.publicClient,
      });
    }

    // Initialize CrossChainReceiver if address provided
    if (config.network.contracts.crossChainReceiver) {
      this.crossChainReceiver = getContract({
        address: config.network.contracts.crossChainReceiver,
        abi: CrossChainReceiverABI,
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

  // ========== Governance Operations ==========

  /**
   * Check if Governor is available
   */
  hasGovernor(): boolean {
    return !!this.governor;
  }

  /**
   * Check if Treasury is available
   */
  hasTreasury(): boolean {
    return !!this.treasury;
  }

  /**
   * Get governor name
   */
  async getGovernorName(): Promise<string> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.name() as Promise<string>;
  }

  /**
   * Get voting delay (in blocks)
   */
  async getVotingDelay(): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.votingDelay() as Promise<bigint>;
  }

  /**
   * Get voting period (in blocks)
   */
  async getVotingPeriod(): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.votingPeriod() as Promise<bigint>;
  }

  /**
   * Get proposal threshold (minimum tokens to propose)
   */
  async getProposalThreshold(): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.proposalThreshold() as Promise<bigint>;
  }

  /**
   * Get quorum at a specific block number
   */
  async getQuorum(blockNumber: bigint): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.quorum([blockNumber]) as Promise<bigint>;
  }

  /**
   * Get proposal state
   */
  async getProposalState(proposalId: bigint): Promise<number> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.state([proposalId]) as Promise<number>;
  }

  /**
   * Get proposal votes
   */
  async getProposalVotes(proposalId: bigint): Promise<{ against: bigint; for: bigint; abstain: bigint }> {
    if (!this.governor) throw new Error('Governor contract not configured');
    const result = await this.governor.read.proposalVotes([proposalId]);
    return {
      against: result[0] as bigint,
      for: result[1] as bigint,
      abstain: result[2] as bigint,
    };
  }

  /**
   * Get proposal snapshot (block when voting started)
   */
  async getProposalSnapshot(proposalId: bigint): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.proposalSnapshot([proposalId]) as Promise<bigint>;
  }

  /**
   * Get proposal deadline (block when voting ends)
   */
  async getProposalDeadline(proposalId: bigint): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.proposalDeadline([proposalId]) as Promise<bigint>;
  }

  /**
   * Get proposal type
   */
  async getProposalType(proposalId: bigint): Promise<number> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.proposalTypes([proposalId]) as Promise<number>;
  }

  /**
   * Get proposal proposer
   */
  async getProposalProposer(proposalId: bigint): Promise<Address> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.proposalProposer([proposalId]) as Promise<Address>;
  }

  /**
   * Check if account has voted on proposal
   */
  async hasVoted(proposalId: bigint, account: Address): Promise<boolean> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.hasVoted([proposalId, account]) as Promise<boolean>;
  }

  /**
   * Get voting power at a specific timepoint
   */
  async getVotes(account: Address, timepoint: bigint): Promise<bigint> {
    if (!this.governor) throw new Error('Governor contract not configured');
    return this.governor.read.getVotes([account, timepoint]) as Promise<bigint>;
  }

  /**
   * Create a proposal
   */
  async propose(params: CreateProposalParams): Promise<Hex> {
    if (!this.governor) throw new Error('Governor contract not configured');
    
    if (params.proposalType !== undefined) {
      return this.walletClient!.writeContract({
        address: this.network.contracts.governor!,
        abi: GovernorAgentABI,
        functionName: 'proposeTyped',
        args: [params.targets, params.values, params.calldatas, params.description, params.proposalType],
        ...this.getWriteParams(),
      });
    }

    return this.walletClient!.writeContract({
      address: this.network.contracts.governor!,
      abi: GovernorAgentABI,
      functionName: 'propose',
      args: [params.targets, params.values, params.calldatas, params.description],
      ...this.getWriteParams(),
    });
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(params: VoteParams): Promise<Hex> {
    if (!this.governor) throw new Error('Governor contract not configured');
    
    if (params.reason) {
      return this.walletClient!.writeContract({
        address: this.network.contracts.governor!,
        abi: GovernorAgentABI,
        functionName: 'castVoteWithReason',
        args: [params.proposalId, params.support, params.reason],
        ...this.getWriteParams(),
      });
    }

    return this.walletClient!.writeContract({
      address: this.network.contracts.governor!,
      abi: GovernorAgentABI,
      functionName: 'castVote',
      args: [params.proposalId, params.support],
      ...this.getWriteParams(),
    });
  }

  /**
   * Queue a successful proposal
   */
  async queueProposal(
    targets: Address[],
    values: bigint[],
    calldatas: Hex[],
    descriptionHash: Hex
  ): Promise<Hex> {
    if (!this.governor) throw new Error('Governor contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.governor!,
      abi: GovernorAgentABI,
      functionName: 'queue',
      args: [targets, values, calldatas, descriptionHash],
      ...this.getWriteParams(),
    });
  }

  /**
   * Execute a queued proposal
   */
  async executeProposal(
    targets: Address[],
    values: bigint[],
    calldatas: Hex[],
    descriptionHash: Hex
  ): Promise<Hex> {
    if (!this.governor) throw new Error('Governor contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.governor!,
      abi: GovernorAgentABI,
      functionName: 'execute',
      args: [targets, values, calldatas, descriptionHash],
      ...this.getWriteParams(),
    });
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(
    targets: Address[],
    values: bigint[],
    calldatas: Hex[],
    descriptionHash: Hex
  ): Promise<Hex> {
    if (!this.governor) throw new Error('Governor contract not configured');
    
    return this.walletClient!.writeContract({
      address: this.network.contracts.governor!,
      abi: GovernorAgentABI,
      functionName: 'cancel',
      args: [targets, values, calldatas, descriptionHash],
      ...this.getWriteParams(),
    });
  }

  // ========== Treasury Operations ==========

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<bigint> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    return this.treasury.read.balance() as Promise<bigint>;
  }

  /**
   * Check if treasury is paused
   */
  async isTreasuryPaused(): Promise<boolean> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    return this.treasury.read.paused() as Promise<boolean>;
  }

  /**
   * Get category spending limit
   */
  async getCategoryLimit(category: SpendingCategory): Promise<bigint> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    return this.treasury.read.categoryLimits([category]) as Promise<bigint>;
  }

  /**
   * Get category spent amount this period
   */
  async getCategorySpent(category: SpendingCategory): Promise<bigint> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    return this.treasury.read.categorySpent([category]) as Promise<bigint>;
  }

  /**
   * Get remaining budget for a category
   */
  async getRemainingBudget(category: SpendingCategory): Promise<bigint> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    return this.treasury.read.remainingBudget([category]) as Promise<bigint>;
  }

  /**
   * Get time until period reset (seconds)
   */
  async getTimeUntilPeriodReset(): Promise<number> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    const time = await this.treasury.read.timeUntilPeriodReset();
    return Number(time);
  }

  /**
   * Get period start timestamp
   */
  async getPeriodStart(): Promise<Date> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    const timestamp = await this.treasury.read.periodStart();
    return new Date(Number(timestamp) * 1000);
  }

  /**
   * Get period duration (seconds)
   */
  async getPeriodDuration(): Promise<number> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    const duration = await this.treasury.read.periodDuration();
    return Number(duration);
  }

  /**
   * Get full treasury status
   */
  async getTreasuryStatus(): Promise<TreasuryStatus> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    
    const [balance, paused, periodStart, periodDuration, timeUntilReset] = await Promise.all([
      this.getTreasuryBalance(),
      this.isTreasuryPaused(),
      this.getPeriodStart(),
      this.getPeriodDuration(),
      this.getTimeUntilPeriodReset(),
    ]);

    // Get all category budgets
    const categories = [
      SpendingCategory.Grants,
      SpendingCategory.Rewards,
      SpendingCategory.Operations,
      SpendingCategory.Liquidity,
      SpendingCategory.Emergency,
    ];

    const categoryBudgets = await Promise.all(
      categories.map(async (category) => {
        const [limit, spent, remaining] = await Promise.all([
          this.getCategoryLimit(category),
          this.getCategorySpent(category),
          this.getRemainingBudget(category),
        ]);
        return { category, limit, spent, remaining };
      })
    );

    return {
      balance,
      paused,
      periodStart,
      periodDuration,
      timeUntilReset,
      categoryBudgets,
    };
  }

  /**
   * Deposit tokens to treasury
   */
  async depositToTreasury(amount: bigint): Promise<Hex> {
    if (!this.treasury) throw new Error('Treasury contract not configured');
    
    // First approve tokens
    const approveTx = await this.approveTokens(
      this.network.contracts.treasury!,
      amount
    );
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    return this.walletClient!.writeContract({
      address: this.network.contracts.treasury!,
      abi: TreasuryABI,
      functionName: 'deposit',
      args: [amount],
      ...this.getWriteParams(),
    });
  }

  /**
   * Delegate AGNT voting power
   */
  async delegateVotes(delegatee: Address): Promise<Hex> {
    this.requireWallet();
    return this.walletClient!.writeContract({
      address: this.network.contracts.agntToken,
      abi: AGNTTokenABI,
      functionName: 'delegate',
      args: [delegatee],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get current delegate for an account
   */
  async getDelegate(account: Address): Promise<Address> {
    return this.agntToken.read.delegates([account]) as Promise<Address>;
  }

  /**
   * Get current voting power (checkpointed)
   */
  async getCurrentVotes(account: Address): Promise<bigint> {
    return this.agntToken.read.getVotes([account]) as Promise<bigint>;
  }

  // ========== Cross-Chain Operations ==========

  /**
   * Check if CrossChainHub is available
   */
  hasCrossChainHub(): boolean {
    return !!this.crossChainHub;
  }

  /**
   * Check if CrossChainReceiver is available
   */
  hasCrossChainReceiver(): boolean {
    return !!this.crossChainReceiver;
  }

  /**
   * Get broadcast fee (in native token)
   */
  async getBroadcastFee(): Promise<bigint> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    return this.crossChainHub.read.broadcastFee() as Promise<bigint>;
  }

  /**
   * Get minimum reputation required to broadcast
   */
  async getMinReputationToBroadcast(): Promise<number> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    const minRep = await this.crossChainHub.read.minReputationToBroadcast();
    return Number(minRep);
  }

  /**
   * Check if an agent is already broadcasted
   */
  async isAgentBroadcasted(agentAddress: Address): Promise<boolean> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    return this.crossChainHub.read.isBroadcasted([agentAddress]) as Promise<boolean>;
  }

  /**
   * Get count of broadcasted agents
   */
  async getBroadcastedAgentCount(): Promise<number> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    const count = await this.crossChainHub.read.getBroadcastedAgentCount();
    return Number(count);
  }

  /**
   * Get all broadcasted agents
   */
  async getBroadcastedAgents(): Promise<BroadcastedAgent[]> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    
    const agents = await this.crossChainHub.read.getBroadcastedAgents() as readonly {
      owner: Address;
      name: string;
      metadataURI: string;
      capabilities: readonly string[];
      reputationScore: bigint;
      totalTasksCompleted: bigint;
      broadcastTimestamp: bigint;
      isActive: boolean;
    }[];

    return agents.map(agent => ({
      owner: agent.owner,
      name: agent.name,
      metadataURI: agent.metadataURI,
      capabilities: [...agent.capabilities],
      reputationScore: Number(agent.reputationScore),
      totalTasksCompleted: Number(agent.totalTasksCompleted),
      broadcastTimestamp: new Date(Number(agent.broadcastTimestamp) * 1000),
      isActive: agent.isActive,
    }));
  }

  /**
   * Get supported chains for cross-chain discovery
   */
  async getSupportedChains(): Promise<ChainConfig[]> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    
    const chains = await this.crossChainHub.read.getSupportedChains() as readonly {
      chainId: bigint;
      name: string;
      receiverContract: Address;
      isActive: boolean;
    }[];

    return chains.map(chain => ({
      chainId: Number(chain.chainId),
      name: chain.name,
      receiverContract: chain.receiverContract,
      isActive: chain.isActive,
    }));
  }

  /**
   * Broadcast agent for cross-chain discovery
   */
  async broadcastAgent(params: BroadcastAgentParams): Promise<Hex> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    
    const fee = await this.getBroadcastFee();

    return this.walletClient!.writeContract({
      address: this.network.contracts.crossChainHub!,
      abi: CrossChainHubABI,
      functionName: 'broadcastAgent',
      args: [
        params.name,
        params.metadataURI,
        params.capabilities,
        BigInt(params.reputationScore),
        BigInt(params.totalTasksCompleted),
      ],
      value: fee,
      ...this.getWriteParams(),
    });
  }

  /**
   * Update existing broadcast
   */
  async updateBroadcast(params: BroadcastAgentParams): Promise<Hex> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');

    return this.walletClient!.writeContract({
      address: this.network.contracts.crossChainHub!,
      abi: CrossChainHubABI,
      functionName: 'updateBroadcast',
      args: [
        params.name,
        params.metadataURI,
        params.capabilities,
        BigInt(params.reputationScore),
        BigInt(params.totalTasksCompleted),
      ],
      ...this.getWriteParams(),
    });
  }

  /**
   * Revoke cross-chain broadcast
   */
  async revokeBroadcast(): Promise<Hex> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');

    return this.walletClient!.writeContract({
      address: this.network.contracts.crossChainHub!,
      abi: CrossChainHubABI,
      functionName: 'revokeBroadcast',
      args: [],
      ...this.getWriteParams(),
    });
  }

  /**
   * Get agent capabilities from broadcast
   */
  async getBroadcastedAgentCapabilities(agentAddress: Address): Promise<string[]> {
    if (!this.crossChainHub) throw new Error('CrossChainHub contract not configured');
    return this.crossChainHub.read.getAgentCapabilities([agentAddress]) as Promise<string[]>;
  }

  // ========== Cross-Chain Receiver Operations ==========

  /**
   * Get all remote agents from other chains
   */
  async getAllRemoteAgents(): Promise<RemoteAgent[]> {
    if (!this.crossChainReceiver) throw new Error('CrossChainReceiver contract not configured');
    
    const agents = await this.crossChainReceiver.read.getAllRemoteAgents() as readonly {
      sourceChainId: bigint;
      owner: Address;
      name: string;
      metadataURI: string;
      capabilities: readonly string[];
      reputationScore: bigint;
      totalTasksCompleted: bigint;
      lastSyncTimestamp: bigint;
      isActive: boolean;
    }[];

    return agents.map(agent => ({
      sourceChainId: Number(agent.sourceChainId),
      owner: agent.owner,
      name: agent.name,
      metadataURI: agent.metadataURI,
      capabilities: [...agent.capabilities],
      reputationScore: Number(agent.reputationScore),
      totalTasksCompleted: Number(agent.totalTasksCompleted),
      lastSyncTimestamp: new Date(Number(agent.lastSyncTimestamp) * 1000),
      isActive: agent.isActive,
    }));
  }

  /**
   * Get remote agents by source chain
   */
  async getRemoteAgentsByChain(sourceChainId: number): Promise<RemoteAgent[]> {
    if (!this.crossChainReceiver) throw new Error('CrossChainReceiver contract not configured');
    
    const agents = await this.crossChainReceiver.read.getAgentsBySourceChain([BigInt(sourceChainId)]) as readonly {
      sourceChainId: bigint;
      owner: Address;
      name: string;
      metadataURI: string;
      capabilities: readonly string[];
      reputationScore: bigint;
      totalTasksCompleted: bigint;
      lastSyncTimestamp: bigint;
      isActive: boolean;
    }[];

    return agents.map(agent => ({
      sourceChainId: Number(agent.sourceChainId),
      owner: agent.owner,
      name: agent.name,
      metadataURI: agent.metadataURI,
      capabilities: [...agent.capabilities],
      reputationScore: Number(agent.reputationScore),
      totalTasksCompleted: Number(agent.totalTasksCompleted),
      lastSyncTimestamp: new Date(Number(agent.lastSyncTimestamp) * 1000),
      isActive: agent.isActive,
    }));
  }

  /**
   * Get remote agents by capability
   */
  async getRemoteAgentsByCapability(capability: string, sourceChainId?: number): Promise<RemoteAgent[]> {
    if (!this.crossChainReceiver) throw new Error('CrossChainReceiver contract not configured');
    
    const chainId = sourceChainId ?? 0;
    const agents = await this.crossChainReceiver.read.getAgentsByCapability([capability, BigInt(chainId)]) as readonly {
      sourceChainId: bigint;
      owner: Address;
      name: string;
      metadataURI: string;
      capabilities: readonly string[];
      reputationScore: bigint;
      totalTasksCompleted: bigint;
      lastSyncTimestamp: bigint;
      isActive: boolean;
    }[];

    return agents.map(agent => ({
      sourceChainId: Number(agent.sourceChainId),
      owner: agent.owner,
      name: agent.name,
      metadataURI: agent.metadataURI,
      capabilities: [...agent.capabilities],
      reputationScore: Number(agent.reputationScore),
      totalTasksCompleted: Number(agent.totalTasksCompleted),
      lastSyncTimestamp: new Date(Number(agent.lastSyncTimestamp) * 1000),
      isActive: agent.isActive,
    }));
  }

  /**
   * Get total count of remote agents
   */
  async getRemoteAgentCount(): Promise<number> {
    if (!this.crossChainReceiver) throw new Error('CrossChainReceiver contract not configured');
    const count = await this.crossChainReceiver.read.totalRemoteAgents();
    return Number(count);
  }

  /**
   * Get remote agent count by chain
   */
  async getRemoteAgentCountByChain(sourceChainId: number): Promise<number> {
    if (!this.crossChainReceiver) throw new Error('CrossChainReceiver contract not configured');
    const count = await this.crossChainReceiver.read.getAgentCountByChain([BigInt(sourceChainId)]);
    return Number(count);
  }
}
