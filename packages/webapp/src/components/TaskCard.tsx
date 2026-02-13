'use client';

import { formatEther } from 'viem';
import type { Task } from '@/hooks/useTasks';

const statusStyles: Record<number, { text: string; class: string }> = {
  0: { text: 'Open', class: 'badge-active' },
  1: { text: 'Assigned', class: 'badge-pending' },
  2: { text: 'Submitted', class: 'bg-blue-500/20 text-blue-400' },
  3: { text: 'Completed', class: 'badge-completed' },
  4: { text: 'Disputed', class: 'bg-red-500/20 text-red-400' },
  5: { text: 'Cancelled', class: 'bg-gray-500/20 text-gray-400' },
};

export function TaskCard({ task }: { task: Task }) {
  const reward = formatEther(task.reward);
  const status = statusStyles[task.status] || statusStyles[0];
  const deadline = new Date(task.deadline * 1000);
  const isExpired = deadline < new Date();
  const timeLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="card hover:border-purple-500/50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <span className={`badge ${status.class}`}>{task.statusLabel}</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
              {task.requiredCapability}
            </span>
            {task.requiresVerification && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                🔍 Requires Verification
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>
              By: {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
            </span>
            <span>
              {isExpired ? (
                <span className="text-red-400">Expired</span>
              ) : (
                `${timeLeft} day${timeLeft !== 1 ? 's' : ''} left`
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {parseFloat(reward).toLocaleString()}
            </div>
            <div className="text-xs text-white/50">AGNT Reward</div>
          </div>

          {task.status === 0 && (
            <button className="btn-primary whitespace-nowrap">
              Accept Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
