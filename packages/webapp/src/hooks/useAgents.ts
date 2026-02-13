'use client';

import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { agentRegistryAbi, agntTokenAbi } from '@/contracts/abis';
import { useMemo } from 'react';
import { parseEther, formatEther } from 'viem';

export interface Agent {
  id: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  metadataURI: string;
  capabilities: string[];
  stakedAmount: bigint;
  reputationScore: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalEarned: bigint;
  registeredAt: number;
  isActive: boolean;
}

export function useAgentCount() {
  return useReadContract({
    address: CONTRACTS.AGENT_REGISTRY,
    abi: agentRegistryAbi,
    functionName: 'getAgentCount',
  });
}

export function useMinStake() {
  return useReadContract({
    address: CONTRACTS.AGENT_REGISTRY,
    abi: agentRegistryAbi,
    functionName: 'minStake',
  });
}

export function useAgents() {
  const { data: count, isLoading: countLoading } = useAgentCount();

  // Get all agent IDs
  const agentIdCalls = useMemo(() => {
    if (!count || count === BigInt(0)) return [];
    return Array.from({ length: Number(count) }, (_, i) => ({
      address: CONTRACTS.AGENT_REGISTRY as `0x${string}`,
      abi: agentRegistryAbi,
      functionName: 'allAgentIds' as const,
      args: [BigInt(i)],
    }));
  }, [count]);

  const { data: agentIds, isLoading: idsLoading } = useReadContracts({
    contracts: agentIdCalls,
  });

  // Get agent data for each ID
  const agentDataCalls = useMemo(() => {
    if (!agentIds) return [];
    return agentIds
      .filter((r) => r.status === 'success')
      .flatMap((r) => [
        {
          address: CONTRACTS.AGENT_REGISTRY as `0x${string}`,
          abi: agentRegistryAbi,
          functionName: 'agents' as const,
          args: [r.result as `0x${string}`],
        },
        {
          address: CONTRACTS.AGENT_REGISTRY as `0x${string}`,
          abi: agentRegistryAbi,
          functionName: 'getAgentCapabilities' as const,
          args: [r.result as `0x${string}`],
        },
      ]);
  }, [agentIds]);

  const { data: agentData, isLoading: dataLoading, refetch } = useReadContracts({
    contracts: agentDataCalls,
  });

  // Parse into Agent objects
  const agents = useMemo((): Agent[] => {
    if (!agentIds || !agentData) return [];

    const result: Agent[] = [];
    const validIds = agentIds.filter((r) => r.status === 'success');

    for (let i = 0; i < validIds.length; i++) {
      const agentResult = agentData[i * 2];
      const capsResult = agentData[i * 2 + 1];

      if (agentResult?.status === 'success' && capsResult?.status === 'success') {
        const d = agentResult.result as [
          `0x${string}`, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean
        ];
        result.push({
          id: validIds[i].result as `0x${string}`,
          owner: d[0],
          name: d[1],
          metadataURI: d[2],
          capabilities: capsResult.result as string[],
          stakedAmount: d[3],
          reputationScore: Number(d[4]) / 100, // Convert from 10000 to 100
          tasksCompleted: Number(d[5]),
          tasksFailed: Number(d[6]),
          totalEarned: d[7],
          registeredAt: Number(d[8]),
          isActive: d[9],
        });
      }
    }

    return result;
  }, [agentIds, agentData]);

  return {
    agents,
    isLoading: countLoading || idsLoading || dataLoading,
    refetch,
  };
}

export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = async (
    name: string,
    metadataURI: string,
    capabilities: string[],
    stakeAmount: bigint
  ) => {
    writeContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: agentRegistryAbi,
      functionName: 'registerAgent',
      args: [name, metadataURI, capabilities, stakeAmount],
    });
  };

  return {
    register,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useApproveAgnt() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (spender: `0x${string}`, amount: bigint) => {
    writeContract({
      address: CONTRACTS.AGNT_TOKEN,
      abi: agntTokenAbi,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, hash };
}

export function useAgntBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.AGNT_TOKEN,
    abi: agntTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useAgntAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.AGNT_TOKEN,
    abi: agntTokenAbi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!owner && !!spender },
  });
}
