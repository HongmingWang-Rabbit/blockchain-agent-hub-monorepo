'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import type { Task } from '@/hooks/useTasks';
import type { Agent } from '@/hooks/useAgents';
import { CONTRACTS } from '@/contracts';
import { taskMarketplaceAbi } from '@/contracts/abis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  action: 'accept' | 'submit' | 'approve' | 'dispute';
  userAgents: Agent[];
  onSuccess?: () => void;
}

export function TaskActionsModal({ isOpen, onClose, task, action, userAgents, onSuccess }: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<`0x${string}` | ''>('');
  const [resultURI, setResultURI] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Auto-select first agent if only one
  useEffect(() => {
    if (userAgents.length === 1 && !selectedAgentId) {
      setSelectedAgentId(userAgents[0].id);
    }
  }, [userAgents, selectedAgentId]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setSuccess(true);
      setIsProcessing(false);
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      switch (action) {
        case 'accept':
          if (!selectedAgentId) {
            setError('Please select an agent');
            setIsProcessing(false);
            return;
          }
          writeContract({
            address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
            abi: taskMarketplaceAbi,
            functionName: 'acceptTask',
            args: [task.id, selectedAgentId],
          });
          break;

        case 'submit':
          writeContract({
            address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
            abi: taskMarketplaceAbi,
            functionName: 'submitResult',
            args: [task.id, resultURI || ''],
          });
          break;

        case 'approve':
          writeContract({
            address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
            abi: taskMarketplaceAbi,
            functionName: 'approveResult',
            args: [task.id],
          });
          break;

        case 'dispute':
          writeContract({
            address: CONTRACTS.TASK_MARKETPLACE as `0x${string}`,
            abi: taskMarketplaceAbi,
            functionName: 'rejectResult',
            args: [task.id],
          });
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedAgentId('');
    setResultURI('');
    setError(null);
    setSuccess(false);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  const titles: Record<string, string> = {
    accept: 'Accept Task',
    submit: 'Submit Result',
    approve: 'Approve Result',
    dispute: 'Dispute Result',
  };

  const buttonLabels: Record<string, string> = {
    accept: 'Accept Task',
    submit: 'Submit Result',
    approve: 'Approve & Release Payment',
    dispute: 'Open Dispute',
  };

  const processing = isPending || isConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!processing ? handleClose : undefined} />
      
      <div className="relative card max-w-md w-full">
        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">
              {action === 'approve' ? '✅' : action === 'dispute' ? '⚠️' : '🎉'}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {action === 'accept' && 'Task Accepted!'}
              {action === 'submit' && 'Result Submitted!'}
              {action === 'approve' && 'Payment Released!'}
              {action === 'dispute' && 'Dispute Opened'}
            </h2>
            <p className="text-white/60 mb-6">
              {action === 'accept' && `You're now assigned to "${task.title}"`}
              {action === 'submit' && 'Waiting for the task creator to review.'}
              {action === 'approve' && `${formatEther(task.reward)} AGNT sent to the agent.`}
              {action === 'dispute' && 'An admin will review this dispute.'}
            </p>
            <button onClick={handleClose} className="btn-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{titles[action]}</h2>
              <button onClick={handleClose} className="text-white/60 hover:text-white text-2xl" disabled={processing}>
                ×
              </button>
            </div>

            {/* Task Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-1">{task.title}</h3>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                  {task.requiredCapability}
                </span>
                <span className="text-green-400 font-medium">
                  {formatEther(task.reward)} AGNT
                </span>
              </div>
            </div>

            {/* Processing State */}
            {processing && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <div>
                    <div className="font-medium">
                      {isPending ? 'Confirm in wallet...' : 'Processing...'}
                    </div>
                    <div className="text-sm text-white/60">
                      {isConfirming && 'Waiting for confirmation...'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Accept: Select Agent */}
              {action === 'accept' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Your Agent</label>
                  {userAgents.length === 0 ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm">
                        You don't have any active agents with the "{task.requiredCapability}" capability.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userAgents.map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedAgentId === agent.id
                              ? 'bg-purple-500/20 border border-purple-500'
                              : 'bg-white/5 border border-white/10 hover:border-white/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="agent"
                            value={agent.id}
                            checked={selectedAgentId === agent.id}
                            onChange={(e) => setSelectedAgentId(e.target.value as `0x${string}`)}
                            className="sr-only"
                            disabled={processing}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-white/60">
                              {agent.reputationScore}% reputation • {agent.tasksCompleted} tasks
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedAgentId === agent.id
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-white/30'
                          }`} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit: Result URI */}
              {action === 'submit' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Result URI (Optional)</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="ipfs://... or https://..."
                    value={resultURI}
                    onChange={(e) => setResultURI(e.target.value)}
                    disabled={processing}
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Link to your deliverables (code, report, etc.)
                  </p>
                </div>
              )}

              {/* Approve: Confirmation */}
              {action === 'approve' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400">
                    Approving will release <strong>{formatEther(task.reward)} AGNT</strong> to the agent.
                    This action cannot be undone.
                  </p>
                </div>
              )}

              {/* Dispute: Warning */}
              {action === 'dispute' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400">
                    Opening a dispute will freeze the escrow until an admin reviews the case.
                    Only dispute if the result is genuinely unsatisfactory.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={processing}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || (action === 'accept' && (!selectedAgentId || userAgents.length === 0))}
                  className={`flex-1 disabled:opacity-50 ${
                    action === 'dispute'
                      ? 'px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors'
                      : 'btn-primary'
                  }`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : (
                    buttonLabels[action]
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
