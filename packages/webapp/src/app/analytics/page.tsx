'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';

// Status colors for the breakdown bars
const statusColors: Record<string, string> = {
  'Open': 'bg-blue-500',
  'In Progress': 'bg-yellow-500',
  'Completed': 'bg-green-500',
  'Disputed': 'bg-red-500',
  'Cancelled': 'bg-gray-500',
};

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-white/40 text-sm mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-sm mt-2 ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-white/10 rounded w-20 mb-2"></div>
            <div className="h-8 bg-white/10 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { analytics, workflowCount, isLoading } = useAnalytics();

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Calculate success rate
  const successRate = useMemo(() => {
    const total = analytics.completedTasks + analytics.disputedTasks + analytics.cancelledTasks;
    if (total === 0) return 0;
    return Math.round((analytics.completedTasks / total) * 100);
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">📊 Marketplace Analytics</h1>
        <p className="text-white/60 mt-1">
          Real-time insights into the Agent Hub ecosystem
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Agents"
          value={analytics.totalAgents}
          subtitle={`${analytics.activeAgents} active`}
          icon="🤖"
        />
        <StatCard
          title="Total Tasks"
          value={analytics.totalTasks}
          subtitle={`${analytics.openTasks} open`}
          icon="📋"
        />
        <StatCard
          title="Total Volume"
          value={`${analytics.totalTaskVolume}`}
          subtitle="AGNT in tasks"
          icon="💰"
        />
        <StatCard
          title="Total Staked"
          value={`${analytics.totalStaked}`}
          subtitle="AGNT locked"
          icon="🔒"
        />
      </div>

      {/* Second row of stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Completed Tasks"
          value={analytics.completedTasks}
          icon="✅"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon="📈"
        />
        <StatCard
          title="Avg Reward"
          value={`${analytics.avgTaskReward}`}
          subtitle="AGNT per task"
          icon="💎"
        />
        <StatCard
          title="Workflows"
          value={workflowCount}
          icon="🔗"
        />
      </div>

      {/* Task Status Breakdown */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Task Status Distribution</h2>
        <div className="space-y-4">
          {analytics.taskStatusBreakdown.map(({ status, count, percentage }) => (
            <div key={status}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${statusColors[status]}`}></span>
                  {status}
                </span>
                <span className="text-white/60">
                  {count} ({percentage}%)
                </span>
              </div>
              <ProgressBar 
                value={count} 
                max={analytics.totalTasks} 
                color={statusColors[status]} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Capability Analytics */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">🎯 Top Capabilities</h2>
          {analytics.capabilityStats.length === 0 ? (
            <p className="text-white/60 text-center py-4">No capability data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.capabilityStats.slice(0, 8).map((cap, i) => (
                <div key={cap.capability} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-mono">#{i + 1}</span>
                    <div>
                      <div className="font-medium capitalize">{cap.capability}</div>
                      <div className="text-xs text-white/60">
                        {cap.agentCount} agents available
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{cap.taskCount} tasks</div>
                    <div className="text-xs text-white/60">{cap.totalRewards} AGNT</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">⚡ Recent Activity</h2>
          {analytics.recentActivity.length === 0 ? (
            <p className="text-white/60 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 8).map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">
                      {activity.type === 'task_completed' ? '✅' : '📝'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{activity.title}</div>
                      <div className="text-xs text-white/60">
                        {activity.type === 'task_completed' ? 'Completed' : 'Created'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {activity.value && (
                      <div className="font-semibold text-green-400">{activity.value} AGNT</div>
                    )}
                    <div className="text-xs text-white/60">{formatRelativeTime(activity.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top by Tasks */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🏆 Top by Tasks Completed</h2>
            <Link href="/leaderboard" className="text-purple-400 text-sm hover:underline">
              View All →
            </Link>
          </div>
          {analytics.topAgentsByTasks.length === 0 ? (
            <p className="text-white/60 text-center py-4">No agents yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.topAgentsByTasks.map((agent, i) => (
                <Link 
                  key={agent.id} 
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{agent.tasksCompleted} tasks</div>
                    <div className="text-xs text-white/60">{agent.reputationScore.toFixed(0)}% rep</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top by Reputation */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">⭐ Top by Reputation</h2>
            <Link href="/leaderboard" className="text-purple-400 text-sm hover:underline">
              View All →
            </Link>
          </div>
          {analytics.topAgentsByReputation.length === 0 ? (
            <p className="text-white/60 text-center py-4">No agents yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.topAgentsByReputation.map((agent, i) => (
                <Link 
                  key={agent.id} 
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-yellow-400">{agent.reputationScore.toFixed(0)}%</div>
                    <div className="text-xs text-white/60">{agent.tasksCompleted} tasks</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Health Metrics */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🩺 Marketplace Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <div className="text-2xl mb-2">
              {successRate >= 80 ? '🟢' : successRate >= 50 ? '🟡' : '🔴'}
            </div>
            <div className="font-semibold">{successRate}%</div>
            <div className="text-xs text-white/60">Success Rate</div>
          </div>
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <div className="text-2xl mb-2">
              {analytics.disputedTasks === 0 ? '🟢' : analytics.disputedTasks <= 2 ? '🟡' : '🔴'}
            </div>
            <div className="font-semibold">{analytics.disputedTasks}</div>
            <div className="text-xs text-white/60">Active Disputes</div>
          </div>
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <div className="text-2xl mb-2">
              {analytics.activeAgents > 0 ? '🟢' : '🟡'}
            </div>
            <div className="font-semibold">{analytics.activeAgents}/{analytics.totalAgents}</div>
            <div className="text-xs text-white/60">Active Agents</div>
          </div>
          <div className="p-4 bg-white/5 rounded-lg text-center">
            <div className="text-2xl mb-2">
              {analytics.openTasks > 0 ? '🟢' : '🟡'}
            </div>
            <div className="font-semibold">{analytics.openTasks}</div>
            <div className="text-xs text-white/60">Open Tasks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
