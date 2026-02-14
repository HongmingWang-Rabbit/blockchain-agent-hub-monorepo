'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { AgentCard } from '@/components/AgentCard';
import { RegisterAgentModal } from '@/components/RegisterAgentModal';
import { useAgents } from '@/hooks/useAgents';
import { formatEther } from 'viem';

// Common capabilities for filter dropdown
const CAPABILITIES = [
  'All Capabilities',
  'code-review',
  'data-analysis',
  'content-writing',
  'translation',
  'research',
  'debugging',
  'testing',
  'documentation',
  'design',
];

type SortOption = 'reputation' | 'tasks' | 'stake' | 'newest' | 'name';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function AgentsPage() {
  const { isConnected } = useAccount();
  const { agents, isLoading, refetch } = useAgents();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('All Capabilities');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.capabilities.some((c) => c.toLowerCase().includes(query))
      );
    }

    // Capability filter
    if (capabilityFilter !== 'All Capabilities') {
      result = result.filter((agent) =>
        agent.capabilities.some(
          (c) => c.toLowerCase() === capabilityFilter.toLowerCase()
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((agent) =>
        statusFilter === 'active' ? agent.isActive : !agent.isActive
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputationScore - a.reputationScore;
        case 'tasks':
          return b.tasksCompleted - a.tasksCompleted;
        case 'stake':
          return Number(b.stakedAmount - a.stakedAmount);
        case 'newest':
          return b.registeredAt - a.registeredAt;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [agents, searchQuery, capabilityFilter, statusFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeAgents = agents.filter((a) => a.isActive);
    const totalStaked = agents.reduce((sum, a) => sum + a.stakedAmount, BigInt(0));
    const avgReputation =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.reputationScore, 0) / agents.length
        : 0;

    return {
      total: agents.length,
      active: activeAgents.length,
      totalStaked: parseFloat(formatEther(totalStaked)).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      avgReputation: avgReputation.toFixed(0),
    };
  }, [agents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-white/60">
            {isLoading
              ? 'Loading agents...'
              : `${stats.active} active agents • ${stats.totalStaked} AGNT staked`}
          </p>
        </div>

        {isConnected && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Register Agent
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {!isLoading && agents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center py-3">
            <div className="text-2xl font-bold text-purple-400">{stats.total}</div>
            <div className="text-xs text-white/60">Total Agents</div>
          </div>
          <div className="card text-center py-3">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-xs text-white/60">Active</div>
          </div>
          <div className="card text-center py-3">
            <div className="text-2xl font-bold text-yellow-400">{stats.totalStaked}</div>
            <div className="text-xs text-white/60">AGNT Staked</div>
          </div>
          <div className="card text-center py-3">
            <div className="text-2xl font-bold text-blue-400">{stats.avgReputation}%</div>
            <div className="text-xs text-white/60">Avg Reputation</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
              <input
                type="text"
                placeholder="Search agents by name or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                         text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle Filters Button (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden btn-secondary text-sm"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Filter Controls */}
          <div className={`flex flex-col sm:flex-row gap-3 ${showFilters ? '' : 'hidden md:flex'}`}>
            {/* Capability Filter */}
            <select
              value={capabilityFilter}
              onChange={(e) => setCapabilityFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white 
                       focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              {CAPABILITIES.map((cap) => (
                <option key={cap} value={cap} className="bg-gray-900">
                  {cap}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white 
                       focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all" className="bg-gray-900">All Status</option>
              <option value="active" className="bg-gray-900">Active Only</option>
              <option value="inactive" className="bg-gray-900">Inactive Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white 
                       focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="reputation" className="bg-gray-900">Highest Reputation</option>
              <option value="tasks" className="bg-gray-900">Most Tasks</option>
              <option value="stake" className="bg-gray-900">Highest Stake</option>
              <option value="newest" className="bg-gray-900">Newest First</option>
              <option value="name" className="bg-gray-900">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-white/10 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
            </div>
          ))}
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

      {/* Empty State */}
      {!isLoading && filteredAgents.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-white/60 mb-4">
            {agents.length === 0
              ? 'No agents registered yet. Be the first!'
              : 'No agents match your search criteria.'}
          </p>
          {(searchQuery || capabilityFilter !== 'All Capabilities' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCapabilityFilter('All Capabilities');
                setStatusFilter('all');
              }}
              className="btn-secondary text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Results summary */}
      {!isLoading && filteredAgents.length > 0 && (
        <p className="text-center text-white/40 text-sm">
          Showing {filteredAgents.length} of {agents.length} agents
        </p>
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
