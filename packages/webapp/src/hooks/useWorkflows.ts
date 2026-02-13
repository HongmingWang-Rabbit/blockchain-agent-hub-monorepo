'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { workflowEngineAbi, WorkflowStatus, StepStatus } from '@/contracts/abis';
import { useMemo } from 'react';

export interface Workflow {
  id: `0x${string}`;
  creator: `0x${string}`;
  name: string;
  description: string;
  totalBudget: bigint;
  spent: bigint;
  status: number;
  statusLabel: string;
  createdAt: number;
  deadline: number;
  stepCount: number;
}

export interface WorkflowStep {
  id: `0x${string}`;
  name: string;
  capability: string;
  assignedAgent: `0x${string}`;
  reward: bigint;
  stepType: number;
  status: number;
  statusLabel: string;
  inputURI: string;
  outputURI: string;
  startedAt: number;
  completedAt: number;
}

const workflowStatusLabels: Record<number, string> = {
  [WorkflowStatus.Draft]: 'Draft',
  [WorkflowStatus.Active]: 'Active',
  [WorkflowStatus.Paused]: 'Paused',
  [WorkflowStatus.Completed]: 'Completed',
  [WorkflowStatus.Failed]: 'Failed',
  [WorkflowStatus.Cancelled]: 'Cancelled',
};

const stepStatusLabels: Record<number, string> = {
  [StepStatus.Pending]: 'Pending',
  [StepStatus.Running]: 'Running',
  [StepStatus.Completed]: 'Completed',
  [StepStatus.Failed]: 'Failed',
  [StepStatus.Skipped]: 'Skipped',
};

export function useWorkflowCount() {
  return useReadContract({
    address: CONTRACTS.WORKFLOW_ENGINE,
    abi: workflowEngineAbi,
    functionName: 'getWorkflowCount',
  });
}

export function useWorkflows() {
  const { data: count, isLoading: countLoading } = useWorkflowCount();

  // Get all workflow IDs
  const workflowIdCalls = useMemo(() => {
    if (!count || count === BigInt(0)) return [];
    return Array.from({ length: Number(count) }, (_, i) => ({
      address: CONTRACTS.WORKFLOW_ENGINE as `0x${string}`,
      abi: workflowEngineAbi,
      functionName: 'allWorkflowIds' as const,
      args: [BigInt(i)],
    }));
  }, [count]);

  const { data: workflowIds, isLoading: idsLoading } = useReadContracts({
    contracts: workflowIdCalls,
  });

  // Get workflow data for each ID
  const workflowDataCalls = useMemo(() => {
    if (!workflowIds) return [];
    return workflowIds
      .filter((r) => r.status === 'success')
      .flatMap((r) => [
        {
          address: CONTRACTS.WORKFLOW_ENGINE as `0x${string}`,
          abi: workflowEngineAbi,
          functionName: 'workflows' as const,
          args: [r.result as `0x${string}`],
        },
        {
          address: CONTRACTS.WORKFLOW_ENGINE as `0x${string}`,
          abi: workflowEngineAbi,
          functionName: 'getWorkflowSteps' as const,
          args: [r.result as `0x${string}`],
        },
      ]);
  }, [workflowIds]);

  const { data: workflowData, isLoading: dataLoading, refetch } = useReadContracts({
    contracts: workflowDataCalls,
  });

  // Parse into Workflow objects
  const workflows = useMemo((): Workflow[] => {
    if (!workflowIds || !workflowData) return [];

    const result: Workflow[] = [];
    const validIds = workflowIds.filter((r) => r.status === 'success');

    for (let i = 0; i < validIds.length; i++) {
      const wfResult = workflowData[i * 2];
      const stepsResult = workflowData[i * 2 + 1];

      if (wfResult?.status === 'success') {
        const d = wfResult.result as [
          `0x${string}`, `0x${string}`, string, string, bigint, bigint, number, bigint, bigint
        ];
        const status = d[6];
        const steps = stepsResult?.status === 'success' ? (stepsResult.result as `0x${string}`[]) : [];
        
        result.push({
          id: validIds[i].result as `0x${string}`,
          creator: d[1],
          name: d[2],
          description: d[3],
          totalBudget: d[4],
          spent: d[5],
          status,
          statusLabel: workflowStatusLabels[status] || 'Unknown',
          createdAt: Number(d[7]),
          deadline: Number(d[8]),
          stepCount: steps.length,
        });
      }
    }

    return result;
  }, [workflowIds, workflowData]);

  return {
    workflows,
    isLoading: countLoading || idsLoading || dataLoading,
    refetch,
  };
}

export function useCreateWorkflow() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = (
    name: string,
    description: string,
    budget: bigint,
    deadline: bigint
  ) => {
    writeContract({
      address: CONTRACTS.WORKFLOW_ENGINE,
      abi: workflowEngineAbi,
      functionName: 'createWorkflow',
      args: [name, description, budget, deadline],
    });
  };

  return { create, isPending, isConfirming, isSuccess, error, hash };
}
