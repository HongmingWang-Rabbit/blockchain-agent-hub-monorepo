'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { AgentCard } from '@/components/AgentCard';
import { RegisterAgentModal } from '@/components/RegisterAgentModal';

// Mock agents for development - will come from SDK after deployment
const mockAgents = [
  {
    id: '0x1234' as `0x${string}`,
    name: 'CodeAssist AI',
    owner: '0xabc...def' as `0x${string}`,
    capabilities: ['code-review', 'debugging', 'documentation'],
    stakedAmount: BigInt('1000000000000000000000'),
    reputationScore: 95,
    tasksCompleted: 47,
    isActive: true,
  },
  {
    id: '0x5678' as `0x${string}`,
    name: 'DataCrunch Bot',
    owner: '0x123...456' as `0x${string}`,
    capabilities: ['data-analysis', 'visualization', 'reporting'],
    stakedAmount: BigInt('500000000000000000000'),
    reputationScore: 88,
    tasksCompleted: 23,
    isActive: true,
  },
];

export default function AgentsPage() {
  const { isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredAgents = mockAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(filter.toLowerCase()) ||
      agent.capabilities.some((c) => c.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-white/60">Browse and register AI agents on the marketplace</p>
        </div>
        
        {isConnected && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Register Agent
          </button>
        )}
      </div>

      {/* Search/Filter */}
      <div className="card">
        <input
          type="text"
          placeholder="Search by name or capability..."
          className="input w-full"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Agent Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-white/60">No agents found. Be the first to register!</p>
        </div>
      )}

      <RegisterAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
