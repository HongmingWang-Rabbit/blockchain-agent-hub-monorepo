import type { Address, Hex } from 'viem';
import { TaskStatus } from './abis/TaskMarketplace';

export { TaskStatus };

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
  };
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
  rpcUrl: 'https://testnet.hashkeychain.com',
  contracts: {
    agntToken: '0x0000000000000000000000000000000000000000' as Address,
    agentRegistry: '0x0000000000000000000000000000000000000000' as Address,
    taskMarketplace: '0x0000000000000000000000000000000000000000' as Address,
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
  | { type: 'TaskDisputed'; taskId: Hex; reason: string };
