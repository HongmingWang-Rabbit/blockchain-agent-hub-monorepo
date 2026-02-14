'use client';

import { useAccount } from 'wagmi';
import { useMemo } from 'react';
import { useAgents, useAgntBalance, type Agent } from './useAgents';
import { useTasks, type Task } from './useTasks';
import { useWorkflows, type Workflow } from './useWorkflows';
import { formatEther } from 'viem';
import { TaskStatus } from '@/contracts/abis';

export interface UserStats {
  agentCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  totalEarned: string;
  tokenBalance: string;
  workflowCount: number;
}

export interface UserData {
  stats: UserStats;
  agents: Agent[];
  tasksAsRequester: Task[];
  tasksAsAgent: Task[];
  workflows: Workflow[];
  isLoading: boolean;
  refetch: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useUserData(): UserData {
  const { address, isConnected } = useAccount();
  
  const { agents: allAgents, isLoading: agentsLoading, refetch: refetchAgents } = useAgents();
  const { tasks: allTasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { workflows: allWorkflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows();
  const { data: tokenBalance, isLoading: balanceLoading } = useAgntBalance(address);

  // Filter agents owned by user
  const userAgents = useMemo(() => {
    if (!address || !allAgents) return [];
    return allAgents.filter(
      (agent) => agent.owner.toLowerCase() === address.toLowerCase()
    );
  }, [allAgents, address]);

  // Get agent IDs owned by user (for matching tasks)
  const userAgentIds = useMemo(() => {
    return new Set(userAgents.map((a) => a.id.toLowerCase()));
  }, [userAgents]);

  // Tasks where user is the creator/requester
  const tasksAsRequester = useMemo(() => {
    if (!address || !allTasks) return [];
    return allTasks.filter(
      (task) => task.creator.toLowerCase() === address.toLowerCase()
    );
  }, [allTasks, address]);

  // Tasks where user's agent is assigned
  const tasksAsAgent = useMemo(() => {
    if (!allTasks || userAgentIds.size === 0) return [];
    return allTasks.filter(
      (task) =>
        task.assignedAgent !== ZERO_ADDRESS &&
        userAgentIds.has(task.assignedAgent.toLowerCase())
    );
  }, [allTasks, userAgentIds]);

  // Workflows created by user
  const userWorkflows = useMemo(() => {
    if (!address || !allWorkflows) return [];
    return allWorkflows.filter(
      (wf) => wf.creator.toLowerCase() === address.toLowerCase()
    );
  }, [allWorkflows, address]);

  // Calculate stats
  const stats = useMemo((): UserStats => {
    // Active tasks = Open or In Progress (Assigned)
    const activeTasks = [...tasksAsRequester, ...tasksAsAgent].filter(
      (t) => t.status === TaskStatus.Open || t.status === TaskStatus.Assigned
    );

    // Completed tasks
    const completedTasks = [...tasksAsRequester, ...tasksAsAgent].filter(
      (t) => t.status === TaskStatus.Completed
    );

    // Calculate total earned from agents
    const totalEarned = userAgents.reduce(
      (sum, agent) => sum + agent.totalEarned,
      BigInt(0)
    );

    return {
      agentCount: userAgents.length,
      activeTaskCount: activeTasks.length,
      completedTaskCount: completedTasks.length,
      totalEarned: formatEther(totalEarned),
      tokenBalance: tokenBalance ? formatEther(tokenBalance) : '0',
      workflowCount: userWorkflows.length,
    };
  }, [userAgents, tasksAsRequester, tasksAsAgent, userWorkflows, tokenBalance]);

  const refetch = () => {
    refetchAgents();
    refetchTasks();
    refetchWorkflows();
  };

  const isLoading = agentsLoading || tasksLoading || workflowsLoading || balanceLoading;

  return {
    stats,
    agents: userAgents,
    tasksAsRequester,
    tasksAsAgent,
    workflows: userWorkflows,
    isLoading,
    refetch,
  };
}
