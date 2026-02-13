'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { useCreateWorkflow } from '@/hooks/useWorkflows';
import { useApproveAgnt, useAgntAllowance, useAgntBalance } from '@/hooks/useAgents';
import { CONTRACTS } from '@/contracts';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkflowModal({ isOpen, onClose }: CreateWorkflowModalProps) {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('100');
  const [daysUntilDeadline, setDaysUntilDeadline] = useState('7');

  const { create, isPending, isConfirming, isSuccess, error } = useCreateWorkflow();
  const { approve, isPending: isApproving, isSuccess: isApproved } = useApproveAgnt();
  
  const { data: balance } = useAgntBalance(address);
  const { data: allowance } = useAgntAllowance(address, CONTRACTS.WORKFLOW_ENGINE);

  const budgetWei = parseEther(budget || '0');
  const needsApproval = allowance !== undefined && allowance < budgetWei;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (needsApproval) {
      approve(CONTRACTS.WORKFLOW_ENGINE, budgetWei);
      return;
    }

    const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + parseInt(daysUntilDeadline) * 86400);
    create(name, description, budgetWei, deadlineTimestamp);
  };

  if (!isOpen) return null;

  const hasEnoughBalance = balance !== undefined && balance >= budgetWei;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Create Workflow</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">Workflow Created!</h3>
            <p className="text-white/60 mb-4">
              Your workflow is now in Draft status. Add steps to it, then start execution.
            </p>
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Workflow Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Data Analysis Pipeline"
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                className="input w-full h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Budget (AGNT)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="input w-full"
                  required
                />
                {!hasEnoughBalance && budget && (
                  <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Deadline (days)</label>
                <input
                  type="number"
                  value={daysUntilDeadline}
                  onChange={(e) => setDaysUntilDeadline(e.target.value)}
                  placeholder="7"
                  min="1"
                  max="365"
                  className="input w-full"
                  required
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-white/60">Budget</span>
                <span>{budget} AGNT</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60">Your Balance</span>
                <span>{balance ? (Number(balance) / 1e18).toFixed(2) : '0'} AGNT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Deadline</span>
                <span>{daysUntilDeadline} days from now</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isConfirming || isApproving || !hasEnoughBalance}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isApproving
                  ? 'Approving...'
                  : isConfirming
                  ? 'Creating...'
                  : isPending
                  ? 'Confirm in Wallet...'
                  : needsApproval
                  ? 'Approve AGNT'
                  : 'Create Workflow'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
