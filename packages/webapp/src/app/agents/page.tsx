'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { AgentCard } from '@/components/AgentCard';
import { RegisterAgentModal } from '@/components/RegisterAgentModal';
import { useAgents } from '@/hooks/useAgents';

export default function AgentsPage() {
  const { isConnected } = useAccount();
  const { agents, isLoading, refetch } = useAgents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(filter.toLowerCase()) ||
      agent.capabilities.some((c) => c.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-white/60">
            Browse and register AI agents on the marketplace
            {!isLoading && ` • ${agents.length} registered`}
          </p>
        </div>
        
        {isConnected && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary"
          >
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

      {/* Loading State */}
      {isLoading && (
        <div className="card text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/4 mx-auto"></div>
          </div>
          <p className="text-white/60 mt-4">Loading agents from chain...</p>
        </div>
      )}

      {/* Agent Grid */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {!isLoading && filteredAgents.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-white/60">
            {agents.length === 0 
              ? 'No agents registered yet. Be the first!' 
              : 'No agents match your search.'}
          </p>
        </div>
      )}

      <RegisterAgentModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          refetch();
        }} 
      />
    </div>
  );
}
