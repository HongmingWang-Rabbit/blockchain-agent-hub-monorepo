'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, keccak256, toHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import { 
  GovernorAgentABI, 
  TreasuryABI, 
  AGNTTokenABI,
  ProposalState,
  PROPOSAL_STATE_LABELS,
  SpendingCategory,
  SPENDING_CATEGORY_LABELS,
  VoteType,
} from '@agent-hub/sdk';

// Contract addresses (testnet)
const GOVERNOR_ADDRESS = '0x626496716673bb5E7F2634d2eBc96ae0697713a4' as const;
const TREASURY_ADDRESS = '0xdc454EfAa5eEBF4D6786750f664bCff461C68b33' as const;
const AGNT_TOKEN_ADDRESS = '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as const;
const TIMELOCK_ADDRESS = '0x0F8538a8829c1658eac0D20B11421828d2099c1C' as const;

// Governance is now deployed!
const GOVERNANCE_DEPLOYED = true;

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
  const categories = Object.values(SpendingCategory).filter(v => typeof v === 'number') as SpendingCategory[];

  // Mock data until contracts are deployed
  const mockData = {
    balance: '850,000',
    periodRemaining: '12 days',
    categories: [
      { name: 'Grants', limit: '100,000', spent: '35,000', remaining: '65,000' },
      { name: 'Rewards', limit: '200,000', spent: '78,500', remaining: '121,500' },
      { name: 'Operations', limit: '50,000', spent: '12,300', remaining: '37,700' },
      { name: 'Liquidity', limit: '500,000', spent: '0', remaining: '500,000' },
      { name: 'Emergency', limit: '100,000', spent: '0', remaining: '100,000' },
    ],
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>💰</span> Treasury
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-white/60">Total Balance</div>
          <div className="text-2xl font-bold text-emerald-400">{mockData.balance} AGNT</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-white/60">Period Reset In</div>
          <div className="text-2xl font-bold">{mockData.periodRemaining}</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-white/60 mb-3">Spending Categories</h3>
      <div className="space-y-3">
        {mockData.categories.map((cat) => {
          const percentUsed = (parseFloat(cat.spent.replace(',', '')) / parseFloat(cat.limit.replace(',', ''))) * 100;
          return (
            <div key={cat.name} className="bg-white/5 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{cat.name}</span>
                <span className="text-white/60">{cat.spent} / {cat.limit} AGNT</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VotingPower() {
  const { address } = useAccount();

  // Mock data
  const mockVotingPower = address ? '125,000' : '0';
  const mockDelegatedTo = address || 'Not delegated';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🗳️</span> Your Voting Power
      </h2>

      <div className="text-3xl font-bold text-purple-400 mb-2">
        {mockVotingPower} AGNT
      </div>
      
      <div className="text-sm text-white/60 mb-4">
        Delegated to: <span className="text-white font-mono text-xs">
          {mockDelegatedTo.slice(0, 6)}...{mockDelegatedTo.slice(-4)}
        </span>
      </div>

      <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors">
        Delegate Votes
      </button>
    </div>
  );
}

function ProposalsList() {
  // Mock proposals until contracts are deployed
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

  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [voteType, setVoteType] = useState<VoteType>(VoteType.For);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>📜</span> Proposals
        </h2>
        <button className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
          Create Proposal
        </button>
      </div>

      <div className="space-y-4">
        {mockProposals.map((proposal) => (
          <div 
            key={proposal.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
          >
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

            {proposal.state === ProposalState.Active && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedProposal(proposal.id)}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  👍 Vote For
                </button>
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  👎 Against
                </button>
                <button 
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  🤷 Abstain
                </button>
              </div>
            )}

            {proposal.state === ProposalState.Succeeded && (
              <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                Queue for Execution
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoteBar({ label, value, color }: { label: string; value: string; color: string }) {
  // Parse values and calculate percentage
  const numValue = parseFloat(value.replace(/,/g, ''));
  const total = 15_100_000; // Mock total
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

function GovernanceStats() {
  const stats = [
    { label: 'Total AGNT Supply', value: '400M', icon: '🪙' },
    { label: 'Circulating Supply', value: '120M', icon: '💱' },
    { label: 'Quorum Required', value: '4%', icon: '📊' },
    { label: 'Proposal Threshold', value: '1,000 AGNT', icon: '📝' },
    { label: 'Voting Period', value: '7 days', icon: '⏰' },
    { label: 'Timelock Delay', value: '48 hours', icon: '🔒' },
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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🏛️ Governance</h1>
        <p className="text-white/60">
          Vote on protocol changes, treasury spending, and ecosystem growth
        </p>
      </div>

      {/* Notice for pre-deployment */}
      {!GOVERNANCE_DEPLOYED && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-yellow-400 font-medium">⚠️ Preview Mode</div>
          <div className="text-sm text-white/60">
            Governance contracts are in development. This is a preview of the upcoming governance UI.
          </div>
        </div>
      )}

      {/* Stats */}
      <GovernanceStats />

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Proposals - 2 columns */}
        <div className="lg:col-span-2">
          <ProposalsList />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <VotingPower />
          <TreasuryOverview />
        </div>
      </div>
    </div>
  );
}
