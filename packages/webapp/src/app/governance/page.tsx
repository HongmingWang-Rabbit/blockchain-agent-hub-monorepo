'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { 
  ProposalState,
  PROPOSAL_STATE_LABELS,
  SPENDING_CATEGORY_LABELS,
  SpendingCategory,
  VoteType,
} from '@agent-hub/sdk';
import {
  useVotingPower,
  useTreasury,
  useGovernorStats,
  useVoting,
  useHasVoted,
} from '../../hooks/useGovernance';
import DelegateModal from '../../components/DelegateModal';
import CreateProposalModal from '../../components/CreateProposalModal';

function ProposalStateLabel({ state }: { state: ProposalState }) {
  const colors: Record<ProposalState, string> = {
    [ProposalState.Pending]: 'bg-yellow-500/20 text-yellow-400',
    [ProposalState.Active]: 'bg-blue-500/20 text-blue-400',
    [ProposalState.Canceled]: 'bg-gray-500/20 text-gray-400',
    [ProposalState.Defeated]: 'bg-red-500/20 text-red-400',
    [ProposalState.Succeeded]: 'bg-green-500/20 text-green-400',
    [ProposalState.Queued]: 'bg-purple-500/20 text-purple-400',
    [ProposalState.Expired]: 'bg-gray-500/20 text-gray-400',
    [ProposalState.Executed]: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[state]}`}>
      {PROPOSAL_STATE_LABELS[state]}
    </span>
  );
}

function TreasuryOverview() {
  const { balance, formattedBalance, categories, periodRemaining } = useTreasury();

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>💰</span> Treasury
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-white/60">Total Balance</div>
          <div className="text-2xl font-bold text-emerald-400">
            {Number(formattedBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })} AGNT
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-white/60">Period Reset In</div>
          <div className="text-2xl font-bold">{periodRemaining} days</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-white/60 mb-3">Spending Categories</h3>
      <div className="space-y-3">
        {categories.map((cat) => {
          const limitNum = Number(formatEther(cat.limit));
          const spentNum = Number(formatEther(cat.spent));
          const percentUsed = limitNum > 0 ? (spentNum / limitNum) * 100 : 0;
          
          return (
            <div key={cat.name} className="bg-white/5 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{cat.name}</span>
                <span className="text-white/60">
                  {spentNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {limitNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} AGNT
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VotingPower({ onDelegateClick }: { onDelegateClick: () => void }) {
  const { address } = useAccount();
  const { votingPower, formattedVotingPower, delegatee, tokenBalance } = useVotingPower();

  const isSelfDelegated = delegatee && address && delegatee.toLowerCase() === address.toLowerCase();
  const hasDelegated = delegatee && delegatee !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🗳️</span> Your Voting Power
      </h2>

      <div className="text-3xl font-bold text-purple-400 mb-2">
        {address ? Number(formattedVotingPower).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} AGNT
      </div>
      
      <div className="text-sm text-white/60 mb-2">
        Token Balance: {address ? Number(formatEther(tokenBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} AGNT
      </div>
      
      <div className="text-sm text-white/60 mb-4">
        Delegated to: {' '}
        {!address ? (
          <span className="text-yellow-400">Connect wallet</span>
        ) : !hasDelegated ? (
          <span className="text-yellow-400">Not delegated</span>
        ) : isSelfDelegated ? (
          <span className="text-green-400">Self</span>
        ) : (
          <span className="text-white font-mono text-xs">
            {delegatee?.slice(0, 6)}...{delegatee?.slice(-4)}
          </span>
        )}
      </div>

      <button 
        onClick={onDelegateClick}
        disabled={!address}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Delegate Votes
      </button>
    </div>
  );
}

function ProposalCard({ 
  proposal, 
  onVote 
}: { 
  proposal: {
    id: string;
    title: string;
    proposer: string;
    state: ProposalState;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    endTime: string;
  };
  onVote?: (proposalId: string, support: VoteType) => void;
}) {
  const { castVote, isPending } = useVoting();
  const proposalIdBigInt = BigInt(proposal.id);
  const hasVoted = useHasVoted(proposalIdBigInt);

  const handleVote = (support: VoteType) => {
    castVote(proposalIdBigInt, support);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-purple-500/50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{proposal.title}</h3>
          <div className="text-sm text-white/60">
            by {proposal.proposer} • {proposal.endTime}
          </div>
        </div>
        <ProposalStateLabel state={proposal.state} />
      </div>

      <div className="space-y-2 mb-4">
        <VoteBar label="For" value={proposal.forVotes} color="bg-green-500" />
        <VoteBar label="Against" value={proposal.againstVotes} color="bg-red-500" />
        <VoteBar label="Abstain" value={proposal.abstainVotes} color="bg-gray-500" />
      </div>

      {proposal.state === ProposalState.Active && !hasVoted && (
        <div className="flex gap-2">
          <button 
            onClick={() => handleVote(VoteType.For)}
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            👍 For
          </button>
          <button 
            onClick={() => handleVote(VoteType.Against)}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            👎 Against
          </button>
          <button 
            onClick={() => handleVote(VoteType.Abstain)}
            disabled={isPending}
            className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            🤷 Abstain
          </button>
        </div>
      )}

      {proposal.state === ProposalState.Active && hasVoted && (
        <div className="text-center text-sm text-green-400 py-2">
          ✅ You have voted on this proposal
        </div>
      )}

      {proposal.state === ProposalState.Succeeded && (
        <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
          Queue for Execution
        </button>
      )}
    </div>
  );
}

function VoteBar({ label, value, color }: { label: string; value: string; color: string }) {
  const numValue = parseFloat(value.replace(/,/g, ''));
  const total = 15_100_000;
  const percentage = (numValue / total) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-sm text-white/60">{label}</div>
      <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="w-24 text-right text-sm font-medium">{value}</div>
    </div>
  );
}

function ProposalsList({ onCreateClick }: { onCreateClick: () => void }) {
  // NOTE: In production, you'd fetch real proposal IDs from events and query each
  // For now, we show sample proposals - replace with actual proposal indexing
  const mockProposals = [
    {
      id: '1',
      title: 'Increase Grants Budget to 200k AGNT',
      proposer: '0x1234...5678',
      state: ProposalState.Active,
      forVotes: '12,500,000',
      againstVotes: '2,100,000',
      abstainVotes: '500,000',
      endTime: 'in 2 days',
    },
    {
      id: '2',
      title: 'Add "machine-learning" to Capability Whitelist',
      proposer: '0xabcd...efgh',
      state: ProposalState.Succeeded,
      forVotes: '18,200,000',
      againstVotes: '1,800,000',
      abstainVotes: '200,000',
      endTime: 'ended',
    },
    {
      id: '3',
      title: 'Q1 2026 Developer Grant Program',
      proposer: '0x9999...1111',
      state: ProposalState.Executed,
      forVotes: '22,000,000',
      againstVotes: '500,000',
      abstainVotes: '100,000',
      endTime: 'executed',
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>📜</span> Proposals
        </h2>
        <button 
          onClick={onCreateClick}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Create Proposal
        </button>
      </div>

      <div className="space-y-4">
        {mockProposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
        💡 <strong>Note:</strong> Real proposals will appear here once created. Create your first proposal to see live voting!
      </div>
    </div>
  );
}

function GovernanceStats() {
  const { 
    quorumPercent, 
    formattedThreshold, 
    votingPeriodDays, 
    timelockDelayHours,
    totalSupply 
  } = useGovernorStats();

  const formattedSupply = (Number(totalSupply) / 1e24).toFixed(0); // In millions
  const circulatingSupply = Math.round(Number(formattedSupply) * 0.3); // Estimate 30% circulating

  const stats = [
    { label: 'Total AGNT Supply', value: `${formattedSupply}M`, icon: '🪙' },
    { label: 'Circulating Supply', value: `${circulatingSupply}M`, icon: '💱' },
    { label: 'Quorum Required', value: `${quorumPercent}%`, icon: '📊' },
    { label: 'Proposal Threshold', value: `${formattedThreshold} AGNT`, icon: '📝' },
    { label: 'Voting Period', value: `${votingPeriodDays} days`, icon: '⏰' },
    { label: 'Timelock Delay', value: `${timelockDelayHours} hours`, icon: '🔒' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-lg font-bold">{stat.value}</div>
          <div className="text-xs text-white/60">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function GovernancePage() {
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🏛️ Governance</h1>
        <p className="text-white/60">
          Vote on protocol changes, treasury spending, and ecosystem growth
        </p>
      </div>

      {/* Live Notice */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <div className="text-green-400 font-medium">✅ Governance is Live!</div>
        <div className="text-sm text-white/60">
          GovernorAgent, Treasury, and Timelock are deployed on HashKey Testnet. Create proposals and vote!
        </div>
      </div>

      {/* Stats */}
      <GovernanceStats />

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Proposals - 2 columns */}
        <div className="lg:col-span-2">
          <ProposalsList onCreateClick={() => setShowCreateProposalModal(true)} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <VotingPower onDelegateClick={() => setShowDelegateModal(true)} />
          <TreasuryOverview />
        </div>
      </div>

      {/* Modals */}
      <DelegateModal 
        isOpen={showDelegateModal} 
        onClose={() => setShowDelegateModal(false)} 
      />
      <CreateProposalModal 
        isOpen={showCreateProposalModal} 
        onClose={() => setShowCreateProposalModal(false)} 
      />
    </div>
  );
}
