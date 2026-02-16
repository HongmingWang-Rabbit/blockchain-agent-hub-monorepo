'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatEther } from 'viem';
import { Navbar } from '@/components/Navbar';
import { useAgents } from '@/hooks/useAgents';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAgentNFT } from '@/hooks/useAgentNFT';
import { useMemo } from 'react';

function formatNumber(value: number | bigint): string {
  const num = typeof value === 'bigint' ? parseFloat(formatEther(value)) : value;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getReputationColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getReputationBgColor(score: number): string {
  if (score >= 90) return 'from-green-500 to-emerald-400';
  if (score >= 70) return 'from-blue-500 to-cyan-400';
  if (score >= 50) return 'from-yellow-500 to-orange-400';
  return 'from-red-500 to-pink-400';
}

function getReputationLabel(score: number): string {
  if (score >= 95) return 'Legendary';
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'New';
}

function getAgentEmoji(score: number, tasks: number): string {
  if (score >= 95 && tasks >= 50) return '🏆';
  if (score >= 90 && tasks >= 20) return '⭐';
  if (tasks >= 10) return '🎯';
  if (tasks >= 1) return '🚀';
  return '🤖';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

const BADGE_EMOJIS: Record<number, string> = {
  0: '🌟', // Newcomer
  1: '🎯', // First Steps
  2: '🏆', // Reliable (10+ tasks)
  3: '🔥', // Expert (50+ tasks)
  4: '💎', // Legendary (100+ tasks)
  5: '⭐', // Highly Rated (90%+ rep)
  6: '🐋', // Whale (10k+ staked)
};

const STATUS_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-blue-500/20', text: 'text-blue-400' },      // Open
  1: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, // Assigned
  2: { bg: 'bg-purple-500/20', text: 'text-purple-400' }, // Submitted
  3: { bg: 'bg-green-500/20', text: 'text-green-400' },   // Completed
  4: { bg: 'bg-red-500/20', text: 'text-red-400' },       // Disputed
  5: { bg: 'bg-gray-500/20', text: 'text-gray-400' },     // Cancelled
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Open',
  1: 'In Progress',
  2: 'Under Review',
  3: 'Completed',
  4: 'Disputed',
  5: 'Cancelled',
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as `0x${string}`;
  
  const { agents, isLoading: agentsLoading } = useAgents();
  const { tasks, isLoading: tasksLoading } = useTasks();
  
  // Find the agent
  const agent = useMemo(() => {
    return agents.find(a => a.id.toLowerCase() === agentId.toLowerCase());
  }, [agents, agentId]);
  
  // Get agent's NFT data
  const nftData = useAgentNFT(agent?.id);
  
  // Filter tasks for this agent
  const agentTasks = useMemo(() => {
    if (!agent) return [];
    return tasks
      .filter(t => t.assignedAgent.toLowerCase() === agent.id.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, agent]);
  
  // Calculate additional stats
  const stats = useMemo(() => {
    if (!agent) return null;
    
    const completedTasks = agentTasks.filter(t => t.status === 3);
    const failedTasks = agentTasks.filter(t => t.status === 4 || t.status === 5);
    const inProgressTasks = agentTasks.filter(t => t.status === 1 || t.status === 2);
    const totalRewards = completedTasks.reduce((sum, t) => sum + t.reward, BigInt(0));
    const avgReward = completedTasks.length > 0 
      ? totalRewards / BigInt(completedTasks.length) 
      : BigInt(0);
    
    return {
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      inProgressTasks: inProgressTasks.length,
      totalRewards,
      avgReward,
      successRate: agent.tasksCompleted + agent.tasksFailed > 0
        ? (agent.tasksCompleted / (agent.tasksCompleted + agent.tasksFailed) * 100)
        : 100,
    };
  }, [agent, agentTasks]);

  const isLoading = agentsLoading || tasksLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-1/4"></div>
            <div className="h-64 bg-white/10 rounded-xl"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-white/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-white mb-2">Agent Not Found</h1>
            <p className="text-gray-400 mb-6">
              The agent with ID <code className="text-purple-400">{agentId.slice(0, 10)}...</code> doesn&apos;t exist.
            </p>
            <Link
              href="/agents"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Browse Agents
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const registeredDate = new Date(agent.registeredAt * 1000);
  const daysSinceRegistration = Math.floor((Date.now() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/agents" className="hover:text-white transition">Agents</Link>
          <span>/</span>
          <span className="text-white">{agent.name}</span>
        </nav>

        {/* Header Section */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Agent Avatar & NFT */}
            <div className="flex flex-col items-center">
              {nftData.svgImage ? (
                <div 
                  className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
                  dangerouslySetInnerHTML={{ __html: nftData.svgImage }}
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-5xl shadow-lg shadow-purple-500/20 border-2 border-purple-500/50">
                  {getAgentEmoji(agent.reputationScore, agent.tasksCompleted)}
                </div>
              )}
              {nftData.hasNFT && (
                <div className="mt-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300">
                  NFT #{nftData.tokenId?.toString()}
                </div>
              )}
            </div>

            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">{agent.name}</h1>
                  <div className="flex items-center gap-3 text-sm">
                    <a
                      href={`https://hashkey-testnet.explorer.caldera.xyz/address/${agent.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-400 font-mono transition"
                    >
                      {agent.owner.slice(0, 6)}...{agent.owner.slice(-4)} ↗
                    </a>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">
                      Registered {formatDate(agent.registeredAt)}
                    </span>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  agent.isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {agent.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>

              {/* Reputation Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Reputation</span>
                  <span className={`font-bold text-lg ${getReputationColor(agent.reputationScore)}`}>
                    {agent.reputationScore.toFixed(1)}% • {getReputationLabel(agent.reputationScore)}
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getReputationBgColor(agent.reputationScore)} transition-all duration-500`}
                    style={{ width: `${agent.reputationScore}%` }}
                  />
                </div>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <span 
                    key={cap} 
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm border border-purple-500/20"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Tasks Completed</div>
            <div className="text-3xl font-bold text-blue-400">{agent.tasksCompleted}</div>
            {stats && stats.inProgressTasks > 0 && (
              <div className="text-xs text-yellow-400 mt-1">
                {stats.inProgressTasks} in progress
              </div>
            )}
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Success Rate</div>
            <div className="text-3xl font-bold text-green-400">
              {stats?.successRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {agent.tasksFailed} failed
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Total Staked</div>
            <div className="text-3xl font-bold text-purple-400">
              {formatNumber(agent.stakedAmount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">AGNT</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <div className="text-gray-400 text-sm mb-1">Total Earned</div>
            <div className="text-3xl font-bold text-pink-400">
              {formatNumber(agent.totalEarned)}
            </div>
            <div className="text-xs text-gray-500 mt-1">AGNT</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Badges & Details */}
          <div className="space-y-6">
            {/* Badges */}
            {nftData.hasNFT && nftData.badges.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🎖️</span> Badges
                </h2>
                <div className="space-y-3">
                  {nftData.badges.map((badge, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50"
                    >
                      <span className="text-2xl">
                        {BADGE_EMOJIS[badge.badgeType] || '🏅'}
                      </span>
                      <div>
                        <div className="font-medium text-white">{badge.name}</div>
                        <div className="text-xs text-gray-400">{badge.description}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Awarded {formatTimeAgo(Math.floor(badge.awardedAt.getTime() / 1000))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Details */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📋</span> Details
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Agent ID</dt>
                  <dd className="font-mono text-gray-300">{agent.id.slice(0, 10)}...</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Owner</dt>
                  <dd className="font-mono text-purple-400">
                    <a
                      href={`https://hashkey-testnet.explorer.caldera.xyz/address/${agent.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {agent.owner.slice(0, 8)}...
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Registered</dt>
                  <dd className="text-gray-300">{formatDate(agent.registeredAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Days Active</dt>
                  <dd className="text-gray-300">{daysSinceRegistration}</dd>
                </div>
                {stats && stats.avgReward > BigInt(0) && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Avg. Reward</dt>
                    <dd className="text-green-400">{formatNumber(stats.avgReward)} AGNT</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Right Column - Task History */}
          <div className="md:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📝</span> Task History
                <span className="ml-auto text-sm font-normal text-gray-400">
                  {agentTasks.length} tasks
                </span>
              </h2>
              
              {agentTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-400">No tasks yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This agent hasn&apos;t been assigned any tasks
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentTasks.slice(0, 10).map((task) => {
                    const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS[0];
                    return (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-3 text-sm mt-1">
                            <span className="text-purple-400">{task.requiredCapability}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">{formatTimeAgo(task.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <div className="font-medium text-green-400">
                              {formatNumber(task.reward)} AGNT
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {STATUS_LABELS[task.status] || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {agentTasks.length > 10 && (
                    <div className="text-center pt-4">
                      <span className="text-gray-400 text-sm">
                        Showing 10 of {agentTasks.length} tasks
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <a
            href={`https://hashkey-testnet.explorer.caldera.xyz/address/${agent.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-purple-400 transition flex items-center gap-1"
          >
            View on Explorer ↗
          </a>
          {nftData.hasNFT && (
            <a
              href={`https://hashkey-testnet.explorer.caldera.xyz/token/${CONTRACTS.AGENT_NFT}/instance/${nftData.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-400 transition flex items-center gap-1"
            >
              View NFT ↗
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

// Import CONTRACTS for NFT link
import { CONTRACTS } from '@/contracts';
