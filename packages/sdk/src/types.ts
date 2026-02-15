import type { Address, Hex } from 'viem';
import { TaskStatus } from './abis/TaskMarketplace';
import { WorkflowStatus, StepStatus, StepType } from './abis/WorkflowEngine';

export { TaskStatus, WorkflowStatus, StepStatus, StepType };

/**
 * Network configuration
 */
export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  contracts: {
    agntToken: Address;
    agentRegistry: Address;
    taskMarketplace: Address;
    agentNFT?: Address;
    workflowEngine?: Address;
    dynamicPricing?: Address;
    forwarder?: Address;
    governor?: Address;
    treasury?: Address;
    timelock?: Address;
  };
}

/**
 * Agent NFT Identity
 */
export interface AgentIdentity {
  tokenId: bigint;
  owner: Address;
  name: string;
  capabilities: string[];
  registeredAt: Date;
  reputationScore: number;
  tasksCompleted: number;
  badges: Badge[];
  svgImage?: string;
  tokenURI?: string;
}

/**
 * Badge data
 */
export interface Badge {
  name: string;
  description: string;
  awardedAt: Date;
  badgeType: number;
}

/**
 * HashKey Chain configuration
 */
export const HASHKEY_MAINNET: NetworkConfig = {
  chainId: 177,
  rpcUrl: 'https://mainnet.hashkeychain.com',
  contracts: {
    agntToken: '0x0000000000000000000000000000000000000000' as Address, // TODO: Deploy
    agentRegistry: '0x0000000000000000000000000000000000000000' as Address,
    taskMarketplace: '0x0000000000000000000000000000000000000000' as Address,
  },
};

export const HASHKEY_TESTNET: NetworkConfig = {
  chainId: 133,
  rpcUrl: 'https://hashkeychain-testnet.alt.technology',
  contracts: {
    agntToken: '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as Address,
    agentRegistry: '0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49' as Address,
    taskMarketplace: '0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061' as Address,
    agentNFT: '0x4476e726B4030923bD29C98F8881Da2727B6a0B6' as Address,
    workflowEngine: '0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd' as Address,
    dynamicPricing: '0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3' as Address,
    forwarder: '0xDf0a2B3afCf6C0Cbe55D66c94A2da04f696dB7A0' as Address,
    governor: '0x626496716673bb5E7F2634d2eBc96ae0697713a4' as Address,
    treasury: '0xdc454EfAa5eEBF4D6786750f664bCff461C68b33' as Address,
    timelock: '0x0F8538a8829c1658eac0D20B11421828d2099c1C' as Address,
  },
};

/**
 * Agent data structure
 */
export interface Agent {
  id: Hex;
  owner: Address;
  name: string;
  metadataURI: string;
  capabilities: string[];
  stakedAmount: bigint;
  reputationScore: number; // 0-10000 (0-100.00%)
  tasksCompleted: number;
  tasksFailed: number;
  totalEarned: bigint;
  registeredAt: Date;
  isActive: boolean;
}

/**
 * Agent metadata (stored on IPFS)
 */
export interface AgentMetadata {
  name: string;
  description: string;
  avatar?: string;
  website?: string;
  capabilities: {
    id: string;
    name: string;
    description: string;
    inputSchema?: object;
    outputSchema?: object;
  }[];
  pricing?: {
    baseRate: string; // AGNT per task
    currency: 'AGNT';
  };
  contact?: {
    email?: string;
    discord?: string;
    twitter?: string;
  };
}

/**
 * Task data structure
 */
export interface Task {
  id: Hex;
  requester: Address;
  assignedAgent: Hex | null;
  title: string;
  descriptionURI: string;
  requiredCapabilities: string[];
  reward: bigint;
  createdAt: Date;
  deadline: Date;
  submittedAt: Date | null;
  resultURI: string | null;
  status: TaskStatus;
  requiresHumanVerification: boolean;
}

/**
 * Task description metadata (stored on IPFS)
 */
export interface TaskMetadata {
  title: string;
  description: string;
  requirements: string[];
  expectedOutput: string;
  inputData?: object;
  attachments?: string[]; // IPFS CIDs
}

/**
 * Task result metadata (stored on IPFS)
 */
export interface TaskResultMetadata {
  taskId: Hex;
  agentId: Hex;
  output: unknown;
  logs?: string[];
  executionTime?: number; // milliseconds
  completedAt: string; // ISO timestamp
}

/**
 * Create agent parameters
 */
export interface CreateAgentParams {
  name: string;
  metadataURI: string;
  capabilities: string[];
  stakeAmount: bigint;
}

/**
 * Create task parameters
 */
export interface CreateTaskParams {
  title: string;
  descriptionURI: string;
  requiredCapabilities: string[];
  reward: bigint;
  deadline: Date;
  requiresHumanVerification?: boolean;
}

/**
 * SDK events
 */
export type AgentHubEvent =
  | { type: 'AgentRegistered'; agentId: Hex; owner: Address; name: string }
  | { type: 'AgentSlashed'; agentId: Hex; amount: bigint; reason: string }
  | { type: 'TaskCreated'; taskId: Hex; requester: Address; reward: bigint }
  | { type: 'TaskAssigned'; taskId: Hex; agentId: Hex }
  | { type: 'TaskCompleted'; taskId: Hex; agentId: Hex; payout: bigint }
  | { type: 'TaskDisputed'; taskId: Hex; reason: string }
  | { type: 'WorkflowCreated'; workflowId: Hex; creator: Address; name: string }
  | { type: 'WorkflowStarted'; workflowId: Hex }
  | { type: 'WorkflowCompleted'; workflowId: Hex; totalSpent: bigint }
  | { type: 'StepCompleted'; workflowId: Hex; stepId: Hex; outputURI: string };

// ========== Workflow Types ==========

/**
 * Workflow data structure
 */
export interface Workflow {
  id: Hex;
  creator: Address;
  name: string;
  description: string;
  totalBudget: bigint;
  spent: bigint;
  status: WorkflowStatus;
  createdAt: Date;
  deadline: Date;
  steps?: WorkflowStep[];
}

/**
 * Workflow step data structure
 */
export interface WorkflowStep {
  id: Hex;
  name: string;
  capability: string;
  assignedAgent: Hex | null;
  reward: bigint;
  stepType: StepType;
  status: StepStatus;
  inputURI: string;
  outputURI: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Create workflow parameters
 */
export interface CreateWorkflowParams {
  name: string;
  description: string;
  budget: bigint;
  deadline: Date;
}

/**
 * Add step parameters
 */
export interface AddStepParams {
  workflowId: Hex;
  name: string;
  capability: string;
  reward: bigint;
  stepType?: StepType;
  dependencies?: Hex[];
  inputURI?: string;
}

// ========== Dynamic Pricing Types ==========

/**
 * Pricing information
 */
export interface PricingInfo {
  currentSurge: number; // Basis points (10000 = 1x)
  isPeak: boolean;
  tasksLastHour: number;
  nextSurgeAt: number; // Task count threshold
}

/**
 * Price range for a capability
 */
export interface PriceRange {
  minPrice: bigint;
  maxPrice: bigint;
  currentPrice: bigint;
}

// ========== Governance Types ==========

/**
 * Proposal data structure
 */
export interface Proposal {
  id: bigint;
  proposer: Address;
  state: number; // ProposalState enum
  proposalType: number; // ProposalType enum
  targets: Address[];
  values: bigint[];
  calldatas: Hex[];
  description: string;
  voteStart: bigint;
  voteEnd: bigint;
  votes: {
    against: bigint;
    for: bigint;
    abstain: bigint;
  };
}

/**
 * Treasury status
 */
export interface TreasuryStatus {
  balance: bigint;
  paused: boolean;
  periodStart: Date;
  periodDuration: number; // seconds
  timeUntilReset: number; // seconds
  categoryBudgets: {
    category: number;
    limit: bigint;
    spent: bigint;
    remaining: bigint;
  }[];
}

/**
 * Create proposal parameters
 */
export interface CreateProposalParams {
  targets: Address[];
  values: bigint[];
  calldatas: Hex[];
  description: string;
  proposalType?: number;
}

/**
 * Vote parameters
 */
export interface VoteParams {
  proposalId: bigint;
  support: number; // 0 = Against, 1 = For, 2 = Abstain
  reason?: string;
}
