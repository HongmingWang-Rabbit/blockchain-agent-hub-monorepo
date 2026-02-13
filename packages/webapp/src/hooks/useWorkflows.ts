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

export function useWorkflowSteps(workflowId: `0x${string}` | undefined) {
  const { data: stepIds } = useReadContract({
    address: CONTRACTS.WORKFLOW_ENGINE,
    abi: workflowEngineAbi,
    functionName: 'getWorkflowSteps',
    args: workflowId ? [workflowId] : undefined,
    query: { enabled: !!workflowId },
  });

  const stepDataCalls = useMemo(() => {
    if (!stepIds || !workflowId) return [];
    return (stepIds as `0x${string}`[]).map((stepId) => ({
      address: CONTRACTS.WORKFLOW_ENGINE as `0x${string}`,
      abi: workflowEngineAbi,
      functionName: 'workflowSteps' as const,
      args: [workflowId, stepId] as const,
    }));
  }, [stepIds, workflowId]);

  const { data: stepData, isLoading, refetch } = useReadContracts({
    contracts: stepDataCalls,
  });

  const steps = useMemo((): WorkflowStep[] => {
    if (!stepIds || !stepData) return [];

    return (stepIds as `0x${string}`[]).map((stepId, i) => {
      const result = stepData[i];
      if (result?.status !== 'success') {
        return null;
      }
      const d = result.result as [
        `0x${string}`, string, string, `0x${string}`, bigint, number, number, string, string, bigint, bigint
      ];
      return {
        id: d[0],
        name: d[1],
        capability: d[2],
        assignedAgent: d[3],
        reward: d[4],
        stepType: d[5],
        status: d[6],
        statusLabel: stepStatusLabels[d[6]] || 'Unknown',
        inputURI: d[7],
        outputURI: d[8],
        startedAt: Number(d[9]),
        completedAt: Number(d[10]),
      };
    }).filter(Boolean) as WorkflowStep[];
  }, [stepIds, stepData]);

  return { steps, isLoading, refetch };
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

export function useAddStep() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addStep = (
    workflowId: `0x${string}`,
    name: string,
    capability: string,
    reward: bigint,
    stepType: number,
    dependencies: `0x${string}`[],
    inputURI: string
  ) => {
    writeContract({
      address: CONTRACTS.WORKFLOW_ENGINE,
      abi: workflowEngineAbi,
      functionName: 'addStep',
      args: [workflowId, name, capability, reward, stepType, dependencies, inputURI],
    });
  };

  return { addStep, isPending, isConfirming, isSuccess, error, hash };
}

export function useStartWorkflow() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const start = (workflowId: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.WORKFLOW_ENGINE,
      abi: workflowEngineAbi,
      functionName: 'startWorkflow',
      args: [workflowId],
    });
  };

  return { start, isPending, isConfirming, isSuccess, error, hash };
}

export function useAcceptStep() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const accept = (
    workflowId: `0x${string}`,
    stepId: `0x${string}`,
    agentId: `0x${string}`
  ) => {
    writeContract({
      address: CONTRACTS.WORKFLOW_ENGINE,
      abi: workflowEngineAbi,
      functionName: 'acceptStep',
      args: [workflowId, stepId, agentId],
    });
  };

  return { accept, isPending, isConfirming, isSuccess, error, hash };
}

export function useCompleteStep() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const complete = (
    workflowId: `0x${string}`,
    stepId: `0x${string}`,
    outputURI: string
  ) => {
    writeContract({
      address: CONTRACTS.WORKFLOW_ENGINE,
      abi: workflowEngineAbi,
      functionName: 'completeStep',
      args: [workflowId, stepId, outputURI],
    });
  };

  return { complete, isPending, isConfirming, isSuccess, error, hash };
}
