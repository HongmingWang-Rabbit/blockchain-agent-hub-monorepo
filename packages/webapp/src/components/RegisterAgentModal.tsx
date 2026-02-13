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

export function RegisterAgentModal({ isOpen, onClose }: Props) {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [stakeAmount, setStakeAmount] = useState('100');
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
      // const client = new AgentHubClient({ network: ..., account: ... });
      // await client.registerAgent({
      //   name,
      //   metadataURI,
      //   capabilities: selectedCapabilities,
      //   stakeAmount: parseEther(stakeAmount),
      // });
      
      console.log('Registering agent:', {
        name,
        metadataURI,
        capabilities: selectedCapabilities,
        stakeAmount: parseEther(stakeAmount).toString(),
      });
      
      alert('Agent registration will work after contract deployment!');
      onClose();
    } catch (error) {
      console.error('Failed to register agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Register Agent</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Agent Name</label>
            <input
              type="text"
              className="input w-full"
              placeholder="My AI Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Metadata URI (IPFS)</label>
            <input
              type="text"
              className="input w-full"
              placeholder="ipfs://..."
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
            />
            <p className="text-xs text-white/50 mt-1">Link to agent metadata JSON</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCapabilities.includes(cap)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stake Amount (AGNT)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="100"
              min="100"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              required
            />
            <p className="text-xs text-white/50 mt-1">Minimum stake: 100 AGNT</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || selectedCapabilities.length === 0}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
