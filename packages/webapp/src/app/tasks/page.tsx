'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { PricingBanner } from '@/components/PricingBanner';
import { useTasks, type Task } from '@/hooks/useTasks';
import { formatEther } from 'viem';

const statusFilters = ['All', 'Open', 'In Progress', 'Completed', 'Disputed'];

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
  'other',
];

type SortOption = 'newest' | 'oldest' | 'reward-high' | 'reward-low' | 'deadline';

export default function TasksPage() {
  const { isConnected } = useAccount();
  const { tasks, isLoading, refetch } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('All Capabilities');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Status filter
    if (activeFilter !== 'All') {
      result = result.filter((task) => {
        if (activeFilter === 'Open') return task.status === 0;
        if (activeFilter === 'In Progress') return task.status === 1 || task.status === 2;
        if (activeFilter === 'Completed') return task.status === 3;
        if (activeFilter === 'Disputed') return task.status === 4;
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.requiredCapability.toLowerCase().includes(query)
      );
    }

    // Capability filter
    if (capabilityFilter !== 'All Capabilities') {
      result = result.filter(
        (task) => task.requiredCapability.toLowerCase() === capabilityFilter.toLowerCase()
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'reward-high':
          return Number(b.reward - a.reward);
        case 'reward-low':
          return Number(a.reward - b.reward);
        case 'deadline':
          return a.deadline - b.deadline;
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, activeFilter, searchQuery, capabilityFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const openTasks = tasks.filter((t) => t.status === 0);
    const totalReward = openTasks.reduce((sum, t) => sum + t.reward, BigInt(0));
    return {
      total: tasks.length,
      open: openTasks.length,
      totalReward: parseFloat(formatEther(totalReward)).toFixed(0),
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Task Marketplace</h1>
          <p className="text-white/60">
            {isLoading
              ? 'Loading tasks...'
              : `${stats.open} open tasks • ${stats.totalReward} AGNT available`}
          </p>
        </div>

        {isConnected && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Create Task
          </button>
        )}
      </div>

      {/* Pricing Status */}
      <PricingBanner />

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
              <input
                type="text"
                placeholder="Search tasks by title or capability..."
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white 
                       focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="newest" className="bg-gray-900">Newest First</option>
              <option value="oldest" className="bg-gray-900">Oldest First</option>
              <option value="reward-high" className="bg-gray-900">Highest Reward</option>
              <option value="reward-low" className="bg-gray-900">Lowest Reward</option>
              <option value="deadline" className="bg-gray-900">Deadline (Soonest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((filter) => {
          // Count tasks for each filter
          const count = tasks.filter((t) => {
            if (filter === 'All') return true;
            if (filter === 'Open') return t.status === 0;
            if (filter === 'In Progress') return t.status === 1 || t.status === 2;
            if (filter === 'Completed') return t.status === 3;
            if (filter === 'Disputed') return t.status === 4;
            return false;
          }).length;

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {filter}
              {!isLoading && (
                <span className="ml-1 text-xs opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Task List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onRefresh={refetch} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTasks.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-white/60 mb-4">
            {tasks.length === 0
              ? 'No tasks posted yet. Create one to get started!'
              : searchQuery || capabilityFilter !== 'All Capabilities'
              ? 'No tasks match your search criteria.'
              : 'No tasks match your filter.'}
          </p>
          {(searchQuery || capabilityFilter !== 'All Capabilities') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCapabilityFilter('All Capabilities');
                setActiveFilter('All');
              }}
              className="btn-secondary text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Results summary */}
      {!isLoading && filteredTasks.length > 0 && (
        <p className="text-center text-white/40 text-sm">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </p>
      )}

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
