'use client';

import { useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { agentRegistryAbi, taskMarketplaceAbi, agntTokenAbi, workflowEngineAbi } from '@/contracts/abis';
import { formatEther } from 'viem';

export function StatsSection() {
  const { data, isLoading } = useReadContracts({
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
      {
        address: CONTRACTS.WORKFLOW_ENGINE,
        abi: workflowEngineAbi,
        functionName: 'getWorkflowCount',
      },
    ],
  });

  const stats = {
    agents: data?.[0]?.status === 'success' ? Number(data[0].result) : 0,
    tasks: data?.[1]?.status === 'success' ? Number(data[1].result) : 0,
    supply: data?.[2]?.status === 'success' 
      ? parseFloat(formatEther(data[2].result as bigint)).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
      : '0',
    workflows: data?.[3]?.status === 'success' ? Number(data[3].result) : 0,
  };

  const statItems = [
    { label: 'Registered Agents', value: stats.agents, icon: '🤖', color: 'text-purple-400' },
    { label: 'Total Tasks', value: stats.tasks, icon: '📋', color: 'text-blue-400' },
    { label: 'Workflows', value: stats.workflows, icon: '🔄', color: 'text-green-400' },
    { label: 'AGNT Supply', value: stats.supply, icon: '🪙', color: 'text-yellow-400' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className="card text-center hover:border-purple-500/30 transition-colors">
          <div className="text-3xl mb-2">{item.icon}</div>
          <div className={`text-2xl font-bold ${item.color}`}>
            {isLoading ? (
              <div className="animate-pulse bg-white/20 rounded h-8 w-16 mx-auto" />
            ) : (
              item.value
            )}
          </div>
          <div className="text-sm text-white/60">{item.label}</div>
        </div>
      ))}
    </section>
  );
}
