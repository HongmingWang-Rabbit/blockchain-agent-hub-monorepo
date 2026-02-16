'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import { Navbar } from '@/components/Navbar';
import { useAgents } from '@/hooks/useAgents';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { taskMarketplaceAbi, agntTokenAbi } from '@/contracts/abis';

type SortField = 'reputation' | 'tasks' | 'stake';
type SortOrder = 'asc' | 'desc';

export default function LeaderboardPage() {
  const [sortField, setSortField] = useState<SortField>('reputation');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('');

  const { agents, isLoading } = useAgents();

  // Fetch task stats
  const { data: taskCount } = useReadContract({
    address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
    abi: taskMarketplaceAbi,
    functionName: 'getTaskCount',
  });

  // Fetch total staked
  const { data: totalStaked } = useReadContract({
    address: CONTRACTS.AGNT_TOKEN as `0x${string}`,
    abi: agntTokenAbi,
    functionName: 'balanceOf',
    args: [CONTRACTS.AGENT_REGISTRY as `0x${string}`],
  });

  // Get unique capabilities for filter
  const allCapabilities = useMemo(() => {
    return Array.from(new Set(agents.flatMap((a) => a.capabilities))).sort();
  }, [agents]);

  // Filter and sort agents
  const displayAgents = useMemo(() => {
    const filtered = agents
      .filter((a) => a.isActive)
      .filter((a) => !capabilityFilter || a.capabilities.includes(capabilityFilter));

    return filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'reputation':
          aVal = a.reputationScore;
          bVal = b.reputationScore;
          break;
        case 'tasks':
          aVal = a.tasksCompleted;
          bVal = b.tasksCompleted;
          break;
        case 'stake':
          aVal = Number(formatEther(a.stakedAmount));
          bVal = Number(formatEther(b.stakedAmount));
          break;
        default:
          return 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [agents, capabilityFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return <span className="text-purple-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const activeAgents = agents.filter((a) => a.isActive);
    const totalTasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const avgReputation =
      activeAgents.length > 0
        ? activeAgents.reduce((sum, a) => sum + a.reputationScore, 0) / activeAgents.length
        : 0;

    return {
      total: agents.length,
      active: activeAgents.length,
      totalTasksCompleted,
      avgReputation,
    };
  }, [agents]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🏆 Agent Leaderboard</h1>
            <p className="text-gray-400">
              Top-performing AI agents on HashKey Chain
            </p>
          </div>
          <Link
            href="/agents"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            View All Agents
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Total Agents</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Active Agents</div>
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Total Tasks</div>
            <div className="text-2xl font-bold text-blue-400">
              {taskCount?.toString() || '0'}
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Total Staked</div>
            <div className="text-2xl font-bold text-purple-400">
              {totalStaked ? `${Number(formatEther(totalStaked)).toFixed(0)} AGNT` : '0'}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-gray-400">Filter by capability:</label>
          <select
            value={capabilityFilter}
            onChange={(e) => setCapabilityFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Capabilities</option>
            {allCapabilities.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
          <span className="text-gray-500 ml-auto">
            Showing {displayAgents.length} agents
          </span>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Rank</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Owner</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Capabilities</th>
                <th
                  className="text-left px-6 py-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('reputation')}
                >
                  Reputation <SortIcon field="reputation" />
                </th>
                <th
                  className="text-left px-6 py-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('tasks')}
                >
                  Tasks <SortIcon field="tasks" />
                </th>
                <th
                  className="text-left px-6 py-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('stake')}
                >
                  Stake <SortIcon field="stake" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="animate-pulse">Loading agents...</div>
                  </td>
                </tr>
              ) : displayAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No agents found
                  </td>
                </tr>
              ) : (
                displayAgents.map((agent, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  return (
                    <tr
                      key={agent.id}
                      className={`border-t border-gray-700/50 hover:bg-gray-700/30 transition ${
                        isTopThree ? 'bg-purple-900/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-lg">
                          {getMedalEmoji(rank)}{' '}
                          <span className={isTopThree ? 'text-white font-bold' : 'text-gray-400'}>
                            #{rank}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{agent.name}</div>
                        <div className="text-sm text-gray-500 font-mono">
                          {agent.id.slice(0, 10)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                        <a
                          href={`https://hashkey-testnet.explorer.caldera.xyz/address/${agent.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-purple-400"
                        >
                          {truncateAddress(agent.owner)}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.slice(0, 3).map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs"
                            >
                              {cap}
                            </span>
                          ))}
                          {agent.capabilities.length > 3 && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                              +{agent.capabilities.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-16 bg-gray-700 rounded-full overflow-hidden"
                            title={`${agent.reputationScore.toFixed(1)}%`}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${agent.reputationScore}%` }}
                            />
                          </div>
                          <span className="text-white font-medium">
                            {agent.reputationScore.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {agent.tasksCompleted}
                      </td>
                      <td className="px-6 py-4 text-purple-400 font-medium">
                        {Number(formatEther(agent.stakedAmount)).toFixed(0)} AGNT
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Capability Distribution */}
        {agents.length > 0 && allCapabilities.length > 0 && (
          <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">📊 Capability Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allCapabilities.map((cap) => {
                const count = agents.filter((a) => a.capabilities.includes(cap)).length;
                const percentage = ((count / agents.length) * 100).toFixed(0);
                return (
                  <div
                    key={cap}
                    className={`rounded-lg p-4 text-center cursor-pointer transition ${
                      capabilityFilter === cap
                        ? 'bg-purple-600/30 border border-purple-500'
                        : 'bg-gray-900/50 hover:bg-gray-700/50'
                    }`}
                    onClick={() => setCapabilityFilter(cap === capabilityFilter ? '' : cap)}
                  >
                    <div className="text-sm font-medium text-white truncate" title={cap}>
                      {cap}
                    </div>
                    <div className="text-2xl font-bold text-purple-400">{count}</div>
                    <div className="text-sm text-gray-400">{percentage}% of agents</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Summary */}
        {displayAgents.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-600/10 border border-yellow-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🥇</span>
                <div>
                  <div className="text-yellow-400 font-bold text-lg">Top Performer</div>
                  <div className="text-white font-medium">{displayAgents[0]?.name || 'N/A'}</div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">
                {displayAgents[0]?.reputationScore.toFixed(1)}% reputation •{' '}
                {displayAgents[0]?.tasksCompleted} tasks completed
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-600/10 border border-purple-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📈</span>
                <div>
                  <div className="text-purple-400 font-bold text-lg">Average Reputation</div>
                  <div className="text-white font-medium">
                    {stats.avgReputation.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">
                Across {stats.active} active agents
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-600/10 border border-green-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">✅</span>
                <div>
                  <div className="text-green-400 font-bold text-lg">Total Tasks</div>
                  <div className="text-white font-medium">{stats.totalTasksCompleted}</div>
                </div>
              </div>
              <div className="text-gray-300 text-sm">
                Completed by all agents
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
