'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import type { Task } from '@/hooks/useTasks';
import { useAcceptTask } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { TaskActionsModal } from './TaskActionsModal';

const statusStyles: Record<number, { text: string; class: string }> = {
  0: { text: 'Open', class: 'badge-active' },
  1: { text: 'Assigned', class: 'badge-pending' },
  2: { text: 'Submitted', class: 'bg-blue-500/20 text-blue-400' },
  3: { text: 'Completed', class: 'badge-completed' },
  4: { text: 'Disputed', class: 'bg-red-500/20 text-red-400' },
  5: { text: 'Cancelled', class: 'bg-gray-500/20 text-gray-400' },
};

export function TaskCard({ task, onRefresh }: { task: Task; onRefresh?: () => void }) {
  const { address } = useAccount();
  const { agents } = useAgents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'accept' | 'submit' | 'approve' | 'dispute' | null>(null);

  const reward = formatEther(task.reward);
  const status = statusStyles[task.status] || statusStyles[0];
  const deadline = new Date(task.deadline * 1000);
  const isExpired = deadline < new Date();
  const timeLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Find user's agents with the required capability
  const userAgents = agents.filter(
    (a) =>
      a.owner.toLowerCase() === address?.toLowerCase() &&
      a.isActive &&
      a.capabilities.includes(task.requiredCapability)
  );

  const isCreator = task.creator.toLowerCase() === address?.toLowerCase();
  const isAssignedAgent = agents.some(
    (a) =>
      a.owner.toLowerCase() === address?.toLowerCase() &&
      a.id === task.assignedAgent
  );

  const handleAction = (action: 'accept' | 'submit' | 'approve' | 'dispute') => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  // Determine available actions
  const getAvailableActions = () => {
    const actions: { label: string; action: 'accept' | 'submit' | 'approve' | 'dispute'; variant: string }[] = [];

    // Open task - agents can accept
    if (task.status === 0 && userAgents.length > 0) {
      actions.push({ label: 'Accept Task', action: 'accept', variant: 'primary' });
    }

    // Assigned - assigned agent can submit
    if (task.status === 1 && isAssignedAgent) {
      actions.push({ label: 'Submit Result', action: 'submit', variant: 'primary' });
    }

    // Submitted - creator can approve or dispute
    if (task.status === 2 && isCreator) {
      actions.push({ label: 'Approve', action: 'approve', variant: 'primary' });
      actions.push({ label: 'Dispute', action: 'dispute', variant: 'danger' });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <>
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
              {isCreator && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                  👤 Your Task
                </span>
              )}
              {isAssignedAgent && (
                <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                  🤖 Assigned to You
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-white/60">
              <span>
                By: {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
              </span>
              {task.assignedAgent !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <span>
                  Agent: {task.assignedAgent.slice(0, 10)}...
                </span>
              )}
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

            <div className="flex gap-2">
              {actions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => handleAction(action.action)}
                  className={`whitespace-nowrap ${
                    action.variant === 'primary'
                      ? 'btn-primary'
                      : action.variant === 'danger'
                      ? 'px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors'
                      : 'btn-secondary'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedAction && (
        <TaskActionsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAction(null);
          }}
          task={task}
          action={selectedAction}
          userAgents={userAgents}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
