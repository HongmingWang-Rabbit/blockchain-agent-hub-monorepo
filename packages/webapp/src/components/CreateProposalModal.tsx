'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, isAddress, encodeFunctionData } from 'viem';
import { TreasuryABI, SPENDING_CATEGORY_LABELS, SpendingCategory } from '@agent-hub/sdk';
import { useCreateProposal, useGovernorStats, useVotingPower, TREASURY_ADDRESS, GOVERNOR_ADDRESS } from '../hooks/useGovernance';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProposalType = 'treasury_spend' | 'category_limit' | 'custom';

export default function CreateProposalModal({ isOpen, onClose }: CreateProposalModalProps) {
  const { address } = useAccount();
  const { votingPower } = useVotingPower();
  const { proposalThreshold, formattedThreshold } = useGovernorStats();
  const { propose, proposeTreasurySpend, proposeCategoryLimitChange, isPending, isSuccess, error } = useCreateProposal();

  const [proposalType, setProposalType] = useState<ProposalType>('treasury_spend');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Treasury spend fields
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<SpendingCategory>(SpendingCategory.Grants);
  
  // Category limit fields
  const [newLimit, setNewLimit] = useState('');
  
  // Custom proposal fields
  const [targetAddress, setTargetAddress] = useState('');
  const [calldata, setCalldata] = useState('');
  const [value, setValue] = useState('0');

  const [validationError, setValidationError] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setRecipient('');
      setAmount('');
      setCategory(SpendingCategory.Grants);
      setNewLimit('');
      setTargetAddress('');
      setCalldata('');
      setValue('0');
      setValidationError('');
    }
  }, [isOpen]);

  // Close on success
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => onClose(), 2000);
    }
  }, [isSuccess, onClose]);

  const hasEnoughVotingPower = votingPower >= proposalThreshold;

  const validate = (): boolean => {
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Title is required');
      return false;
    }

    if (!description.trim()) {
      setValidationError('Description is required');
      return false;
    }

    if (proposalType === 'treasury_spend') {
      if (!recipient || !isAddress(recipient)) {
        setValidationError('Valid recipient address required');
        return false;
      }
      if (!amount || parseFloat(amount) <= 0) {
        setValidationError('Amount must be greater than 0');
        return false;
      }
    }

    if (proposalType === 'category_limit') {
      if (!newLimit || parseFloat(newLimit) <= 0) {
        setValidationError('New limit must be greater than 0');
        return false;
      }
    }

    if (proposalType === 'custom') {
      if (!targetAddress || !isAddress(targetAddress)) {
        setValidationError('Valid target address required');
        return false;
      }
      if (!calldata.startsWith('0x')) {
        setValidationError('Calldata must be hex encoded (start with 0x)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const fullDescription = `# ${title}\n\n${description}`;

    if (proposalType === 'treasury_spend') {
      proposeTreasurySpend(
        recipient as `0x${string}`,
        parseEther(amount),
        category,
        fullDescription
      );
    } else if (proposalType === 'category_limit') {
      proposeCategoryLimitChange(
        category,
        parseEther(newLimit),
        fullDescription
      );
    } else {
      propose(
        [targetAddress as `0x${string}`],
        [parseEther(value)],
        [calldata as `0x${string}`],
        fullDescription
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full p-6 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📝</span> Create Proposal
          </h2>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Voting Power Check */}
        {!hasEnoughVotingPower && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="text-yellow-400 font-medium mb-1">⚠️ Insufficient Voting Power</div>
            <div className="text-sm text-white/70">
              You need at least {formattedThreshold} AGNT voting power to create a proposal.
              Your current voting power: {(Number(votingPower) / 1e18).toLocaleString()} AGNT
            </div>
          </div>
        )}

        {/* Proposal Type */}
        <div className="mb-6">
          <label className="text-sm text-white/60 mb-2 block">Proposal Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'treasury_spend', label: '💰 Treasury Spend', desc: 'Request funds from treasury' },
              { type: 'category_limit', label: '📊 Category Limit', desc: 'Change spending limits' },
              { type: 'custom', label: '⚙️ Custom', desc: 'Execute arbitrary call' },
            ].map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => setProposalType(type as ProposalType)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  proposalType === type
                    ? 'bg-purple-600 border-purple-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                } border`}
              >
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-white/60 mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm text-white/60 mb-2 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Increase grants budget to 200k AGNT"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm text-white/60 mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the rationale for this proposal..."
            rows={4}
            className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Treasury Spend Fields */}
        {proposalType === 'treasury_spend' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(Number(e.target.value) as SpendingCategory)}
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  {Object.entries(SPENDING_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-gray-900">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Amount (AGNT)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white font-mono placeholder:text-white/40 focus:outline-none focus:border-purple-500"
              />
            </div>
          </>
        )}

        {/* Category Limit Fields */}
        {proposalType === 'category_limit' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(Number(e.target.value) as SpendingCategory)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                {Object.entries(SPENDING_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-gray-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">New Limit (AGNT)</label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="200000"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Custom Proposal Fields */}
        {proposalType === 'custom' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Target Contract</label>
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white font-mono placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Value (HSK)</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">Calldata (hex)</label>
              <input
                type="text"
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white font-mono placeholder:text-white/40 focus:outline-none focus:border-purple-500"
              />
            </div>
          </>
        )}

        {/* Errors */}
        {(validationError || error) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
            {validationError || (error as Error)?.message || 'Transaction failed'}
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-400">
            ✅ Proposal created successfully! It will appear after block confirmation.
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
            onClick={handleSubmit}
            disabled={isPending || !hasEnoughVotingPower}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Creating...
              </span>
            ) : (
              'Create Proposal'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
