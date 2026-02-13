'use client';

import { useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { agentRegistryAbi, taskMarketplaceAbi, agntTokenAbi } from '@/contracts/abis';
import { formatEther } from 'viem';

export interface HubStats {
  totalAgents: number;
  totalTasks: number;
  totalSupply: string;
}

export function useHubStats() {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.AGENT_REGISTRY,
        abi: agentRegistryAbi,
        functionName: 'getAgentCount',
      },
      {
        address: CONTRACTS.TASK_MARKETPLACE,
        abi: taskMarketplaceAbi,
        functionName: 'getTaskCount',
      },
      {
        address: CONTRACTS.AGNT_TOKEN,
        abi: agntTokenAbi,
        functionName: 'totalSupply',
      },
    ],
  });

  const stats: HubStats | undefined = data ? {
    totalAgents: data[0]?.status === 'success' ? Number(data[0].result) : 0,
    totalTasks: data[1]?.status === 'success' ? Number(data[1].result) : 0,
    totalSupply: data[2]?.status === 'success' 
      ? parseFloat(formatEther(data[2].result as bigint)).toLocaleString() 
      : '0',
  } : undefined;

  return { stats, isLoading, error };
}
