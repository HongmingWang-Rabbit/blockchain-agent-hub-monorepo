/**
 * Batch Operations SDK
 * 
 * Provides utilities for creating and managing batch task operations
 * on the Agent Hub marketplace.
 */

import type { PublicClient, WalletClient, Address, Hash, Log } from 'viem';
import { parseEther, encodeFunctionData, decodeEventLog } from 'viem';

// BatchOperations ABI (minimal for SDK usage)
export const BatchOperationsABI = [
  {
    type: 'function',
    name: 'createTaskBatch',
    inputs: [
      {
        name: 'tasks',
        type: 'tuple[]',
        components: [
          { name: 'title', type: 'string' },
          { name: 'descriptionURI', type: 'string' },
          { name: 'requiredCapabilities', type: 'string[]' },
          { name: 'reward', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'requiresHumanVerification', type: 'bool' },
        ],
      },
    ],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'taskIds', type: 'bytes32[]' },
          { name: 'totalCost', type: 'uint256' },
          { name: 'successCount', type: 'uint256' },
          { name: 'failedCount', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createTaskBatchFromTemplate',
    inputs: [
      { name: 'titles', type: 'string[]' },
      { name: 'descriptionURI', type: 'string' },
      { name: 'requiredCapabilities', type: 'string[]' },
      { name: 'rewardPerTask', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'requiresHumanVerification', type: 'bool' },
    ],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'taskIds', type: 'bytes32[]' },
          { name: 'totalCost', type: 'uint256' },
          { name: 'successCount', type: 'uint256' },
          { name: 'failedCount', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptTaskBatch',
    inputs: [
      { name: 'taskIds', type: 'bytes32[]' },
      { name: 'agentId', type: 'bytes32' },
    ],
    outputs: [{ name: 'acceptedCount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getTasksEligibleForCancel',
    inputs: [
      { name: 'taskIds', type: 'bytes32[]' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: 'eligibleTasks', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBatchTasks',
    inputs: [{ name: 'batchId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserBatches',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBatchCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateBatchCost',
    inputs: [
      {
        name: 'tasks',
        type: 'tuple[]',
        components: [
          { name: 'title', type: 'string' },
          { name: 'descriptionURI', type: 'string' },
          { name: 'requiredCapabilities', type: 'string[]' },
          { name: 'reward', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'requiresHumanVerification', type: 'bool' },
        ],
      },
    ],
    outputs: [{ name: 'totalReward', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'maxBatchSize',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BatchCreated',
    inputs: [
      { name: 'batchId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'taskCount', type: 'uint256', indexed: false },
      { name: 'totalReward', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BatchTaskCreated',
    inputs: [
      { name: 'batchId', type: 'bytes32', indexed: true },
      { name: 'taskId', type: 'bytes32', indexed: true },
      { name: 'index', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Task input for batch creation
 */
export interface BatchTaskInput {
  title: string;
  descriptionURI: string;
  requiredCapabilities: string[];
  reward: bigint;
  deadline: bigint;
  requiresHumanVerification: boolean;
}

/**
 * Result of a batch creation
 */
export interface BatchResult {
  taskIds: `0x${string}`[];
  totalCost: bigint;
  successCount: bigint;
  failedCount: bigint;
}

/**
 * Batch creation response including transaction details
 */
export interface BatchCreationResponse {
  hash: Hash;
  batchId: `0x${string}`;
  result: BatchResult;
}

/**
 * Create a batch of tasks
 */
export async function createTaskBatch(
  publicClient: PublicClient,
  walletClient: WalletClient,
  batchOperationsAddress: Address,
  tasks: BatchTaskInput[]
): Promise<BatchCreationResponse> {
  const account = walletClient.account;
  if (!account) throw new Error('Wallet account required');

  const hash = await walletClient.writeContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'createTaskBatch',
    args: [tasks],
    account,
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse BatchCreated event
  let batchId: `0x${string}` = '0x0' as `0x${string}`;
  let result: BatchResult = {
    taskIds: [],
    totalCost: 0n,
    successCount: 0n,
    failedCount: 0n,
  };

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BatchOperationsABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === 'BatchCreated') {
        batchId = (decoded.args as any).batchId;
        result.totalCost = (decoded.args as any).totalReward;
        result.successCount = (decoded.args as any).taskCount;
      }
    } catch {
      // Not our event
    }
  }

  // Get task IDs from the batch
  const taskIds = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'getBatchTasks',
    args: [batchId],
  });

  result.taskIds = taskIds as `0x${string}`[];
  result.failedCount = BigInt(tasks.length) - result.successCount;

  return { hash, batchId, result };
}

/**
 * Create tasks from a template (same description, different titles)
 */
export async function createTaskBatchFromTemplate(
  publicClient: PublicClient,
  walletClient: WalletClient,
  batchOperationsAddress: Address,
  options: {
    titles: string[];
    descriptionURI: string;
    requiredCapabilities: string[];
    rewardPerTask: bigint;
    deadline: bigint;
    requiresHumanVerification: boolean;
  }
): Promise<BatchCreationResponse> {
  const account = walletClient.account;
  if (!account) throw new Error('Wallet account required');

  const hash = await walletClient.writeContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'createTaskBatchFromTemplate',
    args: [
      options.titles,
      options.descriptionURI,
      options.requiredCapabilities,
      options.rewardPerTask,
      options.deadline,
      options.requiresHumanVerification,
    ],
    account,
    chain: walletClient.chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let batchId: `0x${string}` = '0x0' as `0x${string}`;
  let result: BatchResult = {
    taskIds: [],
    totalCost: 0n,
    successCount: 0n,
    failedCount: 0n,
  };

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BatchOperationsABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === 'BatchCreated') {
        batchId = (decoded.args as any).batchId;
        result.totalCost = (decoded.args as any).totalReward;
        result.successCount = (decoded.args as any).taskCount;
      }
    } catch {
      // Not our event
    }
  }

  const taskIds = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'getBatchTasks',
    args: [batchId],
  });

  result.taskIds = taskIds as `0x${string}`[];
  result.failedCount = BigInt(options.titles.length) - result.successCount;

  return { hash, batchId, result };
}

/**
 * Agent accepts multiple tasks at once
 */
export async function acceptTaskBatch(
  publicClient: PublicClient,
  walletClient: WalletClient,
  batchOperationsAddress: Address,
  taskIds: `0x${string}`[],
  agentId: `0x${string}`
): Promise<{ hash: Hash; acceptedCount: bigint }> {
  const account = walletClient.account;
  if (!account) throw new Error('Wallet account required');

  const hash = await walletClient.writeContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'acceptTaskBatch',
    args: [taskIds, agentId],
    account,
    chain: walletClient.chain,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  // The actual count would need to be parsed from events or contract state
  return { hash, acceptedCount: BigInt(taskIds.length) };
}

/**
 * Get tasks eligible for cancellation
 */
export async function getTasksEligibleForCancel(
  publicClient: PublicClient,
  batchOperationsAddress: Address,
  taskIds: `0x${string}`[],
  userAddress: Address
): Promise<`0x${string}`[]> {
  const result = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'getTasksEligibleForCancel',
    args: [taskIds, userAddress],
  });

  return result as `0x${string}`[];
}

/**
 * Get tasks in a batch
 */
export async function getBatchTasks(
  publicClient: PublicClient,
  batchOperationsAddress: Address,
  batchId: `0x${string}`
): Promise<`0x${string}`[]> {
  const result = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'getBatchTasks',
    args: [batchId],
  });

  return result as `0x${string}`[];
}

/**
 * Get all batches created by a user
 */
export async function getUserBatches(
  publicClient: PublicClient,
  batchOperationsAddress: Address,
  userAddress: Address
): Promise<`0x${string}`[]> {
  const result = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'getUserBatches',
    args: [userAddress],
  });

  return result as `0x${string}`[];
}

/**
 * Get maximum batch size allowed
 */
export async function getMaxBatchSize(
  publicClient: PublicClient,
  batchOperationsAddress: Address
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'maxBatchSize',
  });

  return result as bigint;
}

/**
 * Calculate total cost for a batch of tasks
 */
export async function calculateBatchCost(
  publicClient: PublicClient,
  batchOperationsAddress: Address,
  tasks: BatchTaskInput[]
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: batchOperationsAddress,
    abi: BatchOperationsABI,
    functionName: 'calculateBatchCost',
    args: [tasks],
  });

  return result as bigint;
}

/**
 * Helper to create task inputs with AGNT amounts as strings
 */
export function createTaskInputs(
  tasks: Array<{
    title: string;
    descriptionURI: string;
    requiredCapabilities: string[];
    rewardAGNT: string; // e.g., "10" for 10 AGNT
    deadlineHours: number;
    requiresHumanVerification?: boolean;
  }>
): BatchTaskInput[] {
  const now = BigInt(Math.floor(Date.now() / 1000));

  return tasks.map((task) => ({
    title: task.title,
    descriptionURI: task.descriptionURI,
    requiredCapabilities: task.requiredCapabilities,
    reward: parseEther(task.rewardAGNT),
    deadline: now + BigInt(task.deadlineHours * 3600),
    requiresHumanVerification: task.requiresHumanVerification ?? false,
  }));
}

/**
 * Batch manager class for convenient operations
 */
export class BatchManager {
  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private batchOperationsAddress: Address
  ) {}

  async createBatch(tasks: BatchTaskInput[]): Promise<BatchCreationResponse> {
    return createTaskBatch(
      this.publicClient,
      this.walletClient,
      this.batchOperationsAddress,
      tasks
    );
  }

  async createFromTemplate(options: {
    titles: string[];
    descriptionURI: string;
    requiredCapabilities: string[];
    rewardPerTask: bigint;
    deadline: bigint;
    requiresHumanVerification: boolean;
  }): Promise<BatchCreationResponse> {
    return createTaskBatchFromTemplate(
      this.publicClient,
      this.walletClient,
      this.batchOperationsAddress,
      options
    );
  }

  async acceptTasks(
    taskIds: `0x${string}`[],
    agentId: `0x${string}`
  ): Promise<{ hash: Hash; acceptedCount: bigint }> {
    return acceptTaskBatch(
      this.publicClient,
      this.walletClient,
      this.batchOperationsAddress,
      taskIds,
      agentId
    );
  }

  async getEligibleForCancel(
    taskIds: `0x${string}`[],
    userAddress: Address
  ): Promise<`0x${string}`[]> {
    return getTasksEligibleForCancel(
      this.publicClient,
      this.batchOperationsAddress,
      taskIds,
      userAddress
    );
  }

  async getBatchTasks(batchId: `0x${string}`): Promise<`0x${string}`[]> {
    return getBatchTasks(
      this.publicClient,
      this.batchOperationsAddress,
      batchId
    );
  }

  async getUserBatches(userAddress: Address): Promise<`0x${string}`[]> {
    return getUserBatches(
      this.publicClient,
      this.batchOperationsAddress,
      userAddress
    );
  }

  async getMaxBatchSize(): Promise<bigint> {
    return getMaxBatchSize(this.publicClient, this.batchOperationsAddress);
  }

  async calculateCost(tasks: BatchTaskInput[]): Promise<bigint> {
    return calculateBatchCost(
      this.publicClient,
      this.batchOperationsAddress,
      tasks
    );
  }
}

/**
 * Create a batch manager instance
 */
export function createBatchManager(
  publicClient: PublicClient,
  walletClient: WalletClient,
  batchOperationsAddress: Address
): BatchManager {
  return new BatchManager(publicClient, walletClient, batchOperationsAddress);
}
