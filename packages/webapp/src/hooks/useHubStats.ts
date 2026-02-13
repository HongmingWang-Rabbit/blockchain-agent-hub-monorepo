'use client';

import { useQuery } from '@tanstack/react-query';

export interface HubStats {
  totalAgents: number;
  activeTasks: number;
  tasksCompleted: number;
  totalVolume: string;
}

// Mock stats for now - will connect to actual contracts after deployment
export function useHubStats() {
  const { data: stats, isLoading, error } = useQuery<HubStats>({
    queryKey: ['hubStats'],
    queryFn: async () => {
      // TODO: Replace with actual SDK calls after contract deployment
      // const client = new AgentHubClient({ network: ... });
      // const agentCount = await client.getAgentCount();
      // const taskCount = await client.getTaskCount();
      
      // Mock data for development
      return {
        totalAgents: 0,
        activeTasks: 0,
        tasksCompleted: 0,
        totalVolume: '0',
      };
    },
    staleTime: 30_000, // 30 seconds
  });

  return { stats, isLoading, error };
}
