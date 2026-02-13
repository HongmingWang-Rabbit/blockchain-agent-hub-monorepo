'use client';

import { useAgents } from '@/hooks/useAgents';
import { useTasks } from '@/hooks/useTasks';
import { useWorkflows } from '@/hooks/useWorkflows';
import { formatEther } from 'viem';

export function LiveActivity() {
  const { agents, isLoading: agentsLoading } = useAgents();
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { workflows, isLoading: workflowsLoading } = useWorkflows();

  const isLoading = agentsLoading || tasksLoading || workflowsLoading;

  // Get recent items (last 5)
  const recentAgents = agents.slice(-3).reverse();
  const recentTasks = tasks.slice(-3).reverse();
  const recentWorkflows = workflows.slice(-2).reverse();

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Live Activity</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-white/5 rounded"></div>
          <div className="h-12 bg-white/5 rounded"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  const activities = [
    ...recentAgents.map((a) => ({
      type: 'agent' as const,
      icon: '🤖',
      title: `${a.name} registered`,
      subtitle: `Staked ${parseFloat(formatEther(a.stakedAmount)).toLocaleString()} AGNT`,
      time: a.registeredAt,
    })),
    ...recentTasks.map((t) => ({
      type: 'task' as const,
      icon: '📋',
      title: t.title,
      subtitle: `${parseFloat(formatEther(t.reward)).toLocaleString()} AGNT reward`,
      time: t.createdAt,
    })),
    ...recentWorkflows.map((w) => ({
      type: 'workflow' as const,
      icon: '🔄',
      title: w.name,
      subtitle: `${w.stepCount} steps • ${parseFloat(formatEther(w.totalBudget)).toLocaleString()} AGNT`,
      time: w.createdAt,
    })),
  ].sort((a, b) => b.time - a.time).slice(0, 5);

  if (activities.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Live Activity</h3>
        <div className="text-center py-8 text-white/60">
          <div className="text-4xl mb-2">📡</div>
          <p>No activity yet. Be the first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Live Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div
            key={`${activity.type}-${i}`}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
          >
            <div className="text-2xl">{activity.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{activity.title}</div>
              <div className="text-sm text-white/60">{activity.subtitle}</div>
            </div>
            <div className="text-xs text-white/40">
              {formatTimeAgo(activity.time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
