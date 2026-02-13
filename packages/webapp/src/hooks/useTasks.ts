'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { taskMarketplaceAbi, agntTokenAbi, TaskStatus } from '@/contracts/abis';
import { useMemo } from 'react';

export interface Task {
  id: `0x${string}`;
  creator: `0x${string}`;
  title: string;
  descriptionURI: string;
  requiredCapability: string;
  reward: bigint;
  deadline: number;
  assignedAgent: `0x${string}`;
  status: number;
  statusLabel: string;
  requiresVerification: boolean;
  createdAt: number;
}

const statusLabels: Record<number, string> = {
  [TaskStatus.Open]: 'Open',
  [TaskStatus.Assigned]: 'In Progress',
  [TaskStatus.Submitted]: 'Under Review',
  [TaskStatus.Completed]: 'Completed',
  [TaskStatus.Disputed]: 'Disputed',
  [TaskStatus.Cancelled]: 'Cancelled',
};

export function useTaskCount() {
  return useReadContract({
    address: CONTRACTS.TASK_MARKETPLACE,
    abi: taskMarketplaceAbi,
    functionName: 'getTaskCount',
  });
}

export function useTasks() {
  const { data: count, isLoading: countLoading } = useTaskCount();

  // Get all task IDs
  const taskIdCalls = useMemo(() => {
    if (!count || count === BigInt(0)) return [];
    return Array.from({ length: Number(count) }, (_, i) => ({
      address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
      abi: taskMarketplaceAbi,
      functionName: 'allTaskIds' as const,
      args: [BigInt(i)],
    }));
  }, [count]);

  const { data: taskIds, isLoading: idsLoading } = useReadContracts({
    contracts: taskIdCalls,
  });

  // Get task data for each ID
  const taskDataCalls = useMemo(() => {
    if (!taskIds) return [];
    return taskIds
      .filter((r) => r.status === 'success')
      .map((r) => ({
        address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
        abi: taskMarketplaceAbi,
        functionName: 'tasks' as const,
        args: [r.result as `0x${string}`],
      }));
  }, [taskIds]);

  const { data: taskData, isLoading: dataLoading, refetch } = useReadContracts({
    contracts: taskDataCalls,
  });

  // Parse into Task objects
  const tasks = useMemo((): Task[] => {
    if (!taskIds || !taskData) return [];

    const result: Task[] = [];
    const validIds = taskIds.filter((r) => r.status === 'success');

    for (let i = 0; i < validIds.length; i++) {
      const taskResult = taskData[i];

      if (taskResult?.status === 'success') {
        const d = taskResult.result as [
          `0x${string}`, string, string, string, bigint, bigint, `0x${string}`, number, boolean, bigint
        ];
        const status = d[7];
        result.push({
          id: validIds[i].result as `0x${string}`,
          creator: d[0],
          title: d[1],
          descriptionURI: d[2],
          requiredCapability: d[3],
          reward: d[4],
          deadline: Number(d[5]),
          assignedAgent: d[6],
          status,
          statusLabel: statusLabels[status] || 'Unknown',
          requiresVerification: d[8],
          createdAt: Number(d[9]),
        });
      }
    }

    return result;
  }, [taskIds, taskData]);

  return {
    tasks,
    isLoading: countLoading || idsLoading || dataLoading,
    refetch,
  };
}

export function useCreateTask() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = async (
    title: string,
    descriptionURI: string,
    requiredCapability: string,
    reward: bigint,
    deadline: bigint,
    requiresVerification: boolean
  ) => {
    writeContract({
      address: CONTRACTS.TASK_MARKETPLACE,
      abi: taskMarketplaceAbi,
      functionName: 'createTask',
      args: [title, descriptionURI, requiredCapability, reward, deadline, requiresVerification],
    });
  };

  return {
    create,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useAcceptTask() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const accept = (taskId: `0x${string}`, agentId: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.TASK_MARKETPLACE,
      abi: taskMarketplaceAbi,
      functionName: 'acceptTask',
      args: [taskId, agentId],
    });
  };

  return { accept, isPending, isConfirming, isSuccess, hash };
}
