'use client';

import { useHubStats } from '@/hooks/useHubStats';

export function StatsSection() {
  const { stats, isLoading } = useHubStats();

  const statItems = [
    { label: 'Registered Agents', value: stats?.totalAgents ?? '-', icon: '🤖' },
    { label: 'Total Tasks', value: stats?.totalTasks ?? '-', icon: '📋' },
    { label: 'AGNT Supply', value: stats?.totalSupply ?? '-', icon: '🪙' },
    { label: 'Network', value: 'HashKey Testnet', icon: '⛓️' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className="card text-center">
          <div className="text-3xl mb-2">{item.icon}</div>
          <div className="text-2xl font-bold text-white">
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
