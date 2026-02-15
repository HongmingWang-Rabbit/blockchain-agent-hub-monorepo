'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, isAddress } from 'viem';
import { useVotingPower } from '../hooks/useGovernance';

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DelegateModal({ isOpen, onClose }: DelegateModalProps) {
  const { address } = useAccount();
  const { 
    votingPower, 
    formattedVotingPower, 
    delegatee, 
    tokenBalance, 
    delegate, 
    selfDelegate, 
    isDelegating, 
    delegateSuccess 
  } = useVotingPower();

  const [delegateAddress, setDelegateAddress] = useState('');
  const [mode, setMode] = useState<'self' | 'other'>('self');
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setDelegateAddress('');
      setError('');
      setMode('self');
    }
  }, [isOpen]);

  // Close on success
  useEffect(() => {
    if (delegateSuccess) {
      setTimeout(() => onClose(), 1500);
    }
  }, [delegateSuccess, onClose]);

  const handleDelegate = async () => {
    setError('');
    
    if (mode === 'self') {
      selfDelegate();
    } else {
      if (!delegateAddress) {
        setError('Please enter a delegate address');
        return;
      }
      if (!isAddress(delegateAddress)) {
        setError('Invalid Ethereum address');
        return;
      }
      delegate(delegateAddress as `0x${string}`);
    }
  };

  const isSelfDelegated = delegatee && address && delegatee.toLowerCase() === address.toLowerCase();
  const hasDelegated = delegatee && delegatee !== '0x0000000000000000000000000000000000000000';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🗳️</span> Delegate Votes
          </h2>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Status */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-white/60">Token Balance</span>
            <span className="font-medium">
              {Number(formatEther(tokenBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })} AGNT
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-white/60">Voting Power</span>
            <span className="font-medium text-purple-400">
              {Number(formattedVotingPower).toLocaleString(undefined, { maximumFractionDigits: 2 })} AGNT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Delegated To</span>
            <span className="font-mono text-sm">
              {!hasDelegated ? (
                <span className="text-yellow-400">Not delegated</span>
              ) : isSelfDelegated ? (
                <span className="text-green-400">Self</span>
              ) : (
                `${delegatee?.slice(0, 6)}...${delegatee?.slice(-4)}`
              )}
            </span>
          </div>
        </div>

        {/* Delegation Mode */}
        <div className="mb-4">
          <label className="text-sm text-white/60 mb-2 block">Delegate To</label>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('self')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'self' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              👤 Myself
            </button>
            <button
              onClick={() => setMode('other')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'other' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              👥 Someone Else
            </button>
          </div>

          {mode === 'other' && (
            <input
              type="text"
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 font-mono"
            />
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6 text-sm text-blue-300">
          <strong>💡 About Delegation:</strong>
          <p className="mt-1 text-white/70">
            {mode === 'self' 
              ? 'Delegating to yourself activates your voting power. You must delegate to vote on proposals.'
              : 'Delegating to another address gives them your voting power. You can always re-delegate or self-delegate later.'
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success */}
        {delegateSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-400">
            ✅ Delegation successful!
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelegate}
            disabled={isDelegating || (mode === 'other' && !delegateAddress)}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isDelegating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Delegating...
              </span>
            ) : (
              'Delegate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
