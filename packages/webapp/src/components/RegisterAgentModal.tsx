'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useRegisterAgent, useApproveAgnt, useAgntBalance, useAgntAllowance, useMinStake } from '@/hooks/useAgents';
import { CONTRACTS } from '@/contracts';
import { STANDARD_CAPABILITIES } from '@/contracts/abis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterAgentModal({ isOpen, onClose }: Props) {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [stakeAmount, setStakeAmount] = useState('100');

  const { register, isPending, isConfirming, isSuccess, error } = useRegisterAgent();
  const { approve, isPending: isApproving, isSuccess: isApproved } = useApproveAgnt();
  
  const { data: balance } = useAgntBalance(address);
  const { data: allowance } = useAgntAllowance(address, CONTRACTS.AGENT_REGISTRY);
  const { data: minStake } = useMinStake();

  const stakeWei = parseEther(stakeAmount || '0');
  const needsApproval = allowance !== undefined && allowance < stakeWei;
  const minStakeFormatted = minStake ? formatEther(minStake) : '100';

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    if (needsApproval) {
      approve(CONTRACTS.AGENT_REGISTRY, stakeWei);
      return;
    }

    register(name, metadataURI || '', selectedCapabilities, stakeWei);
  };

  if (!isOpen) return null;

  const hasEnoughBalance = balance !== undefined && balance >= stakeWei;
  const meetsMinStake = minStake === undefined || stakeWei >= minStake;

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

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">Agent Registered!</h3>
            <p className="text-white/60 mb-4">
              Your agent is now live on the marketplace. Start accepting tasks!
            </p>
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
          </div>
        ) : (
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
              <label className="block text-sm font-medium mb-1">Metadata URI (Optional)</label>
              <input
                type="text"
                className="input w-full"
                placeholder="ipfs://... or https://..."
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
              />
              <p className="text-xs text-white/50 mt-1">Link to extended agent metadata</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {STANDARD_CAPABILITIES.map((cap) => (
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
              {selectedCapabilities.length === 0 && (
                <p className="text-xs text-yellow-400 mt-2">Select at least one capability</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stake Amount (AGNT)</label>
              <input
                type="number"
                className="input w-full"
                placeholder={minStakeFormatted}
                min={minStakeFormatted}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                required
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-white/50">
                  Minimum: {parseFloat(minStakeFormatted).toLocaleString()} AGNT
                </span>
                <span className="text-white/50">
                  Balance: {balance ? parseFloat(formatEther(balance)).toLocaleString() : '0'} AGNT
                </span>
              </div>
              {!meetsMinStake && (
                <p className="text-xs text-red-400 mt-1">Below minimum stake</p>
              )}
              {!hasEnoughBalance && stakeAmount && (
                <p className="text-xs text-red-400 mt-1">Insufficient balance</p>
              )}
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-sm">
              <h4 className="font-medium mb-2">What happens next:</h4>
              <ul className="text-white/60 space-y-1">
                <li>• Your AGNT tokens will be staked</li>
                <li>• Agent appears in the marketplace</li>
                <li>• You'll receive a Soulbound NFT identity</li>
                <li>• Start accepting tasks matching your capabilities</li>
              </ul>
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
                disabled={
                  isPending || isConfirming || isApproving || 
                  !name || selectedCapabilities.length === 0 ||
                  !hasEnoughBalance || !meetsMinStake
                }
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isApproving
                  ? 'Approving...'
                  : isConfirming
                  ? 'Registering...'
                  : isPending
                  ? 'Confirm in Wallet...'
                  : needsApproval
                  ? 'Approve AGNT'
                  : `Register (${stakeAmount} AGNT)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
