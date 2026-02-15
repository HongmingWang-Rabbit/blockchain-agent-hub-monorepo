'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { usePriceRange, usePricingInfo } from '@/hooks/usePricing';
import { useCreateTask } from '@/hooks/useTasks';
import { useAgntBalance, useAgntAllowance, useApproveAgnt } from '@/hooks/useAgents';
import { CONTRACTS } from '@/contracts';
import { STANDARD_CAPABILITIES } from '@/contracts/abis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'form' | 'approve' | 'create' | 'success';

export function CreateTaskModal({ isOpen, onClose, onSuccess }: Props) {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [descriptionURI, setDescriptionURI] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requiresHuman, setRequiresHuman] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  const { priceRange } = usePriceRange(selectedCapability || 'default');
  const { pricingInfo } = usePricingInfo();

  // Contract interactions
  const { data: balance } = useAgntBalance(address);
  const { data: allowance } = useAgntAllowance(address, CONTRACTS.TASK_MARKETPLACE as `0x${string}`);
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: approveSuccess } = useApproveAgnt();
  const { create, isPending: isCreating, isConfirming: isCreateConfirming, isSuccess: createSuccess, error: createError } = useCreateTask();

  const rewardAmount = reward ? parseEther(reward) : BigInt(0);
  const needsApproval = allowance !== undefined && rewardAmount > allowance;

  // Auto-set reward when capability changes
  useEffect(() => {
    if (priceRange?.current && !reward) {
      setReward(parseFloat(priceRange.current).toFixed(0));
    }
  }, [priceRange, reward]);

  // Handle approval success
  useEffect(() => {
    if (approveSuccess && step === 'approve') {
      setStep('create');
      handleCreateTask();
    }
  }, [approveSuccess]);

  // Handle create success
  useEffect(() => {
    if (createSuccess) {
      setStep('success');
      onSuccess?.();
    }
  }, [createSuccess, onSuccess]);

  // Handle create error
  useEffect(() => {
    if (createError) {
      setError(createError.message || 'Failed to create task');
      setStep('form');
    }
  }, [createError]);

  const handleCapabilityChange = (cap: string) => {
    setSelectedCapability(cap);
    setReward(''); // Reset reward to trigger auto-fill
  };

  const handleCreateTask = () => {
    if (!address || !reward) return;

    const deadlineTimestamp = BigInt(Math.floor(new Date(deadline).getTime() / 1000));
    
    create(
      title,
      descriptionURI || '',
      selectedCapability,
      rewardAmount,
      deadlineTimestamp,
      requiresHuman
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setError(null);

    // Check balance
    if (balance && rewardAmount > balance) {
      setError(`Insufficient AGNT balance. You have ${(Number(balance) / 1e18).toFixed(2)} AGNT.`);
      return;
    }

    // Need approval?
    if (needsApproval) {
      setStep('approve');
      approve(CONTRACTS.TASK_MARKETPLACE as `0x${string}`, rewardAmount);
    } else {
      setStep('create');
      handleCreateTask();
    }
  };

  const handleClose = () => {
    // Reset state
    setTitle('');
    setDescriptionURI('');
    setSelectedCapability('');
    setReward('');
    setDeadline('');
    setRequiresHuman(false);
    setStep('form');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Default deadline 7 days from now
  const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const surgeActive = pricingInfo && pricingInfo.surgeMultiplier > 1;
  const isPeak = pricingInfo?.isPeakHours;
  const isProcessing = isApproving || isApproveConfirming || isCreating || isCreateConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'form' ? handleClose : undefined} />
      
      <div className="relative card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Success State */}
        {step === 'success' ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Task Created!</h2>
            <p className="text-white/60 mb-6">
              Your task &ldquo;{title}&rdquo; is now live on the marketplace.
            </p>
            <button onClick={handleClose} className="btn-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Task</h2>
              <button onClick={handleClose} className="text-white/60 hover:text-white text-2xl" disabled={isProcessing}>
                ×
              </button>
            </div>

            {/* Processing State */}
            {step !== 'form' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <div>
                    {step === 'approve' && (
                      <>
                        <div className="font-medium">Approving AGNT...</div>
                        <div className="text-sm text-white/60">
                          {isApproving ? 'Confirm in your wallet' : 'Waiting for confirmation...'}
                        </div>
                      </>
                    )}
                    {step === 'create' && (
                      <>
                        <div className="font-medium">Creating Task...</div>
                        <div className="text-sm text-white/60">
                          {isCreating ? 'Confirm in your wallet' : 'Waiting for confirmation...'}
                        </div>
                      </>
                    )}
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

            {/* Pricing Status */}
            {(surgeActive || isPeak) && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  {surgeActive && (
                    <span className="text-yellow-400">
                      ⚡ {pricingInfo.surgeMultiplier}x surge pricing active
                    </span>
                  )}
                  {isPeak && (
                    <span className="text-orange-400">
                      🌅 Peak hours (+15%)
                    </span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="What do you need done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description URI</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="ipfs://... or https://..."
                  value={descriptionURI}
                  onChange={(e) => setDescriptionURI(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-white/50 mt-1">Link to detailed task description</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Required Capability</label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_CAPABILITIES.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => handleCapabilityChange(cap)}
                      disabled={isProcessing}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCapability === cap
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-50'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Reward (AGNT)</label>
                  <input
                    type="number"
                    className="input w-full"
                    placeholder={priceRange?.current || '15'}
                    min="1"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    required
                    disabled={isProcessing}
                  />
                  {priceRange && (
                    <p className="text-xs text-white/50 mt-1">
                      Suggested: {parseFloat(priceRange.current).toFixed(0)} AGNT
                      <span className="text-white/30 ml-1">
                        (range: {parseFloat(priceRange.min).toFixed(0)}-{parseFloat(priceRange.max).toFixed(0)})
                      </span>
                    </p>
                  )}
                  {balance !== undefined && (
                    <p className="text-xs text-white/40 mt-1">
                      Balance: {(Number(balance) / 1e18).toLocaleString()} AGNT
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={deadline || defaultDeadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresHuman"
                  checked={requiresHuman}
                  onChange={(e) => setRequiresHuman(e.target.checked)}
                  className="rounded"
                  disabled={isProcessing}
                />
                <label htmlFor="requiresHuman" className="text-sm">
                  Require human verification before release
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1" disabled={isProcessing}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !title || !selectedCapability || !reward}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : needsApproval ? (
                    `Approve & Create (${reward || '0'} AGNT)`
                  ) : (
                    `Create Task (${reward || '0'} AGNT)`
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
