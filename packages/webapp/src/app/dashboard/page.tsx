'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { AgentNFTCard } from '@/components/AgentNFTCard';
import { useUserData } from '@/hooks/useUserData';
import { formatEther } from 'viem';
import { TaskStatus } from '@/contracts/abis';

const statusLabels: Record<number, string> = {
  [TaskStatus.Open]: 'Open',
  [TaskStatus.Assigned]: 'In Progress',
  [TaskStatus.Submitted]: 'Under Review',
  [TaskStatus.Completed]: 'Completed',
  [TaskStatus.Disputed]: 'Disputed',
  [TaskStatus.Cancelled]: 'Cancelled',
};

const statusStyles: Record<number, string> = {
  [TaskStatus.Open]: 'bg-blue-500/20 text-blue-400',
  [TaskStatus.Assigned]: 'bg-yellow-500/20 text-yellow-400',
  [TaskStatus.Submitted]: 'bg-purple-500/20 text-purple-400',
  [TaskStatus.Completed]: 'bg-green-500/20 text-green-400',
  [TaskStatus.Disputed]: 'bg-red-500/20 text-red-400',
  [TaskStatus.Cancelled]: 'bg-gray-500/20 text-gray-400',
};

function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-white/10 rounded w-24 mx-auto"></div>
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { stats, agents, tasksAsRequester, tasksAsAgent, workflows, isLoading, refetch } = useUserData();

  if (!isConnected) {
    return (
      <div className="card text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-white/60 mb-6">
          Connect your wallet to view your agents and tasks.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Combine all tasks (removing duplicates if any)
  const allUserTasks = [...tasksAsRequester];
  const requesterIds = new Set(tasksAsRequester.map(t => t.id));
  tasksAsAgent.forEach(t => {
    if (!requesterIds.has(t.id)) {
      allUserTasks.push(t);
    }
  });

  // Sort by recent first, limit to 5
  const recentTasks = allUserTasks
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/60">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <button 
          onClick={refetch}
          className="btn-secondary text-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-purple-400">{stats.agentCount}</div>
          )}
          <div className="text-sm text-white/60">My Agents</div>
        </div>
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-blue-400">{stats.activeTaskCount}</div>
          )}
          <div className="text-sm text-white/60">Active Tasks</div>
        </div>
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-green-400">{stats.completedTaskCount}</div>
          )}
          <div className="text-sm text-white/60">Completed</div>
        </div>
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-pink-400">{stats.workflowCount}</div>
          )}
          <div className="text-sm text-white/60">Workflows</div>
        </div>
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-yellow-400">{formatNumber(stats.totalEarned)}</div>
          )}
          <div className="text-sm text-white/60">AGNT Earned</div>
        </div>
        <div className="card text-center">
          {isLoading ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-white">{formatNumber(stats.tokenBalance)}</div>
          )}
          <div className="text-sm text-white/60">AGNT Balance</div>
        </div>
      </div>

      {/* Agent Identity NFT */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Your Agent Identity</h2>
          <AgentNFTCard address={address!} />
        </div>

        <div className="md:col-span-2 grid gap-6">
          {/* My Agents */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Agents</h2>
              <Link href="/agents" className="text-purple-400 text-sm hover:underline">
                View All →
              </Link>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg"></div>
                ))}
              </div>
            ) : agents.length === 0 ? (
              <p className="text-white/60 text-center py-4">
                No agents registered.{' '}
                <Link href="/agents" className="text-purple-400 hover:underline">
                  Register one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {agents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        🤖
                      </div>
                      <div>
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-xs text-white/60">
                          {agent.tasksCompleted} tasks • Score: {agent.reputationScore.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">
                        {formatNumber(formatEther(agent.stakedAmount))} staked
                      </span>
                      <span
                        className={`badge ${
                          agent.isActive ? 'badge-active' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Tasks */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Tasks</h2>
              <Link href="/tasks" className="text-purple-400 text-sm hover:underline">
                View All →
              </Link>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-lg"></div>
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-white/60 text-center py-4">
                No tasks yet.{' '}
                <Link href="/tasks" className="text-purple-400 hover:underline">
                  Browse marketplace
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => {
                  const isRequester = task.creator.toLowerCase() === address?.toLowerCase();
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{task.title}</div>
                        <div className="text-xs text-white/60">
                          {isRequester ? '📤 Posted' : '📥 Accepted'} •{' '}
                          {formatNumber(formatEther(task.reward))} AGNT
                        </div>
                      </div>
                      <span className={`badge ${statusStyles[task.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {statusLabels[task.status] || 'Unknown'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Workflows */}
      {workflows.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">My Workflows</h2>
            <Link href="/workflows" className="text-purple-400 text-sm hover:underline">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {workflows.slice(0, 3).map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{workflow.name}</div>
                  <div className="text-xs text-white/60">
                    {workflow.stepCount} steps • {formatNumber(formatEther(workflow.totalBudget))} AGNT budget
                  </div>
                </div>
                <span className={`badge ${
                  workflow.status === 0 ? 'bg-gray-500/20 text-gray-400' :
                  workflow.status === 1 ? 'bg-blue-500/20 text-blue-400' :
                  workflow.status === 2 ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {workflow.statusLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/agents" className="btn-primary">
            + Register Agent
          </Link>
          <Link href="/tasks" className="btn-secondary">
            + Create Task
          </Link>
          <Link href="/workflows" className="btn-secondary">
            + Create Workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
