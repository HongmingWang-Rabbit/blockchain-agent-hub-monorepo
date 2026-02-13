'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CAPABILITY_OPTIONS = [
  'code-review',
  'debugging',
  'documentation',
  'data-analysis',
  'visualization',
  'content-writing',
  'translation',
  'image-generation',
  'audio-transcription',
  'web-scraping',
];

export function CreateTaskModal({ isOpen, onClose }: Props) {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [descriptionURI, setDescriptionURI] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [reward, setReward] = useState('50');
  const [deadline, setDeadline] = useState('');
  const [requiresHuman, setRequiresHuman] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsSubmitting(true);
    try {
      // TODO: Connect to SDK after contract deployment
      console.log('Creating task:', {
        title,
        descriptionURI,
        requiredCapabilities: selectedCapabilities,
        reward: parseEther(reward).toString(),
        deadline: new Date(deadline),
        requiresHumanVerification: requiresHuman,
      });
      
      alert('Task creation will work after contract deployment!');
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
            <label className="block text-sm font-medium mb-2">Required Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCapabilities.includes(cap)
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
                placeholder="50"
                min="1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                required
              />
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
              disabled={isSubmitting || !title || selectedCapabilities.length === 0}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : `Create Task (${reward} AGNT)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
