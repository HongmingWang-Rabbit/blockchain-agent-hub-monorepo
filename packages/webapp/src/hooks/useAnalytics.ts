'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { agentRegistryAbi, taskMarketplaceAbi, agntTokenAbi, workflowEngineAbi, TaskStatus } from '@/contracts/abis';
import { formatEther } from 'viem';
import { useTasks } from './useTasks';
import { useAgents } from './useAgents';

export interface MarketplaceAnalytics {
  // Overview stats
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  disputedTasks: number;
  cancelledTasks: number;
  
  // Financial
  totalStaked: string;
  totalTaskVolume: string;
  avgTaskReward: string;
  
  // Task status distribution
  taskStatusBreakdown: {
    status: string;
    count: number;
    percentage: number;
  }[];
  
  // Capability analytics
  capabilityStats: {
    capability: string;
    taskCount: number;
    agentCount: number;
    totalRewards: string;
  }[];
  
  // Top performers
  topAgentsByTasks: {
    id: string;
    name: string;
    tasksCompleted: number;
    reputationScore: number;
  }[];
  
  topAgentsByReputation: {
    id: string;
    name: string;
    tasksCompleted: number;
    reputationScore: number;
  }[];
  
  // Time-based (approximated from task timestamps)
  recentActivity: {
    type: 'task_created' | 'task_completed' | 'agent_registered';
    title: string;
    timestamp: number;
    value?: string;
  }[];
}

export function useAnalytics() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { agents, isLoading: agentsLoading } = useAgents();

  // Fetch total staked
  const { data: totalStaked } = useReadContract({
    address: CONTRACTS.AGNT_TOKEN as `0x${string}`,
    abi: agntTokenAbi,
    functionName: 'balanceOf',
    args: [CONTRACTS.AGENT_REGISTRY as `0x${string}`],
  });

  // Fetch workflow count
  const { data: workflowCount } = useReadContract({
    address: CONTRACTS.WORKFLOW_ENGINE as `0x${string}`,
    abi: workflowEngineAbi,
    functionName: 'getWorkflowCount',
  });

  const analytics = useMemo((): MarketplaceAnalytics => {
    // Calculate task stats
    const openTasks = tasks.filter(t => t.status === TaskStatus.Open).length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.Completed).length;
    const disputedTasks = tasks.filter(t => t.status === TaskStatus.Disputed).length;
    const cancelledTasks = tasks.filter(t => t.status === TaskStatus.Cancelled).length;
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.Assigned || t.status === TaskStatus.Submitted).length;

    // Task volume
    const totalVolume = tasks.reduce((sum, t) => sum + t.reward, BigInt(0));
    const avgReward = tasks.length > 0 
      ? totalVolume / BigInt(tasks.length) 
      : BigInt(0);

    // Task status breakdown
    const statusCounts = [
      { status: 'Open', count: openTasks },
      { status: 'In Progress', count: inProgressTasks },
      { status: 'Completed', count: completedTasks },
      { status: 'Disputed', count: disputedTasks },
      { status: 'Cancelled', count: cancelledTasks },
    ];
    
    const taskStatusBreakdown = statusCounts.map(s => ({
      ...s,
      percentage: tasks.length > 0 ? Math.round((s.count / tasks.length) * 100) : 0,
    }));

    // Capability analytics
    const capabilityMap = new Map<string, { taskCount: number; agentCount: number; totalRewards: bigint }>();
    
    // Count tasks per capability
    tasks.forEach(t => {
      const cap = t.requiredCapability.toLowerCase();
      const existing = capabilityMap.get(cap) || { taskCount: 0, agentCount: 0, totalRewards: BigInt(0) };
      capabilityMap.set(cap, {
        ...existing,
        taskCount: existing.taskCount + 1,
        totalRewards: existing.totalRewards + t.reward,
      });
    });

    // Count agents per capability
    agents.forEach(a => {
      a.capabilities.forEach(cap => {
        const capLower = cap.toLowerCase();
        const existing = capabilityMap.get(capLower) || { taskCount: 0, agentCount: 0, totalRewards: BigInt(0) };
        capabilityMap.set(capLower, {
          ...existing,
          agentCount: existing.agentCount + 1,
        });
      });
    });

    const capabilityStats = Array.from(capabilityMap.entries())
      .map(([capability, stats]) => ({
        capability,
        taskCount: stats.taskCount,
        agentCount: stats.agentCount,
        totalRewards: parseFloat(formatEther(stats.totalRewards)).toFixed(0),
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 10);

    // Top agents
    const activeAgentsList = agents.filter(a => a.isActive);
    
    const topAgentsByTasks = [...activeAgentsList]
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.name,
        tasksCompleted: a.tasksCompleted,
        reputationScore: a.reputationScore,
      }));

    const topAgentsByReputation = [...activeAgentsList]
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.name,
        tasksCompleted: a.tasksCompleted,
        reputationScore: a.reputationScore,
      }));

    // Recent activity (from task creation timestamps)
    const recentActivity: MarketplaceAnalytics['recentActivity'] = tasks
      .filter(t => t.createdAt > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(t => ({
        type: t.status === TaskStatus.Completed ? 'task_completed' as const : 'task_created' as const,
        title: t.title,
        timestamp: t.createdAt,
        value: formatEther(t.reward),
      }));

    return {
      totalAgents: agents.length,
      activeAgents: activeAgentsList.length,
      totalTasks: tasks.length,
      openTasks,
      completedTasks,
      disputedTasks,
      cancelledTasks,
      totalStaked: totalStaked ? parseFloat(formatEther(totalStaked)).toFixed(0) : '0',
      totalTaskVolume: parseFloat(formatEther(totalVolume)).toFixed(0),
      avgTaskReward: parseFloat(formatEther(avgReward)).toFixed(2),
      taskStatusBreakdown,
      capabilityStats,
      topAgentsByTasks,
      topAgentsByReputation,
      recentActivity,
    };
  }, [tasks, agents, totalStaked]);

  return {
    analytics,
    workflowCount: workflowCount ? Number(workflowCount) : 0,
    isLoading: tasksLoading || agentsLoading,
  };
}
