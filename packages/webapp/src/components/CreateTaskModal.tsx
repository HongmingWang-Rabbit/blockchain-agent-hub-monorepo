'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { usePriceRange, usePricingInfo } from '@/hooks/usePricing';
import { STANDARD_CAPABILITIES } from '@/contracts/abis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ isOpen, onClose }: Props) {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [descriptionURI, setDescriptionURI] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requiresHuman, setRequiresHuman] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { priceRange } = usePriceRange(selectedCapability || 'default');
  const { pricingInfo } = usePricingInfo();

  // Auto-set reward when capability changes
  useEffect(() => {
    if (priceRange?.current && !reward) {
      setReward(parseFloat(priceRange.current).toFixed(0));
    }
  }, [priceRange, reward]);

  const handleCapabilityChange = (cap: string) => {
    setSelectedCapability(cap);
    setReward(''); // Reset reward to trigger auto-fill
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsSubmitting(true);
    try {
      // TODO: Connect to actual contract
      console.log('Creating task:', {
        title,
        descriptionURI,
        requiredCapability: selectedCapability,
        reward: parseEther(reward).toString(),
        deadline: new Date(deadline),
        requiresHumanVerification: requiresHuman,
      });
      
      alert('Task creation will work after contract integration!');
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Default deadline 7 days from now
  const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const surgeActive = pricingInfo && pricingInfo.surgeMultiplier > 1;
  const isPeak = pricingInfo?.isPeakHours;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create Task</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">
            ×
          </button>
        </div>

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
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCapability === cap
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
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
              />
              {priceRange && (
                <p className="text-xs text-white/50 mt-1">
                  Suggested: {parseFloat(priceRange.current).toFixed(0)} AGNT
                  <span className="text-white/30 ml-1">
                    (range: {parseFloat(priceRange.min).toFixed(0)}-{parseFloat(priceRange.max).toFixed(0)})
                  </span>
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
            />
            <label htmlFor="requiresHuman" className="text-sm">
              Require human verification before release
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !selectedCapability}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : `Create Task (${reward || '0'} AGNT)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
