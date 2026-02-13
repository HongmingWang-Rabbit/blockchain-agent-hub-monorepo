'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import Link from 'next/link';
import { useWorkflows } from '@/hooks/useWorkflows';
import { WorkflowStatus } from '@/contracts/abis';
import { CreateWorkflowModal } from '@/components/CreateWorkflowModal';

const statusFilters = ['All', 'Draft', 'Active', 'Completed'];

const statusStyles: Record<number, { bg: string; text: string }> = {
  [WorkflowStatus.Draft]: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  [WorkflowStatus.Active]: { bg: 'bg-green-500/20', text: 'text-green-400' },
  [WorkflowStatus.Paused]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  [WorkflowStatus.Completed]: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  [WorkflowStatus.Failed]: { bg: 'bg-red-500/20', text: 'text-red-400' },
  [WorkflowStatus.Cancelled]: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
};

export default function WorkflowsPage() {
  const { isConnected } = useAccount();
  const { workflows, isLoading, refetch } = useWorkflows();
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredWorkflows = workflows.filter((wf) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Draft') return wf.status === WorkflowStatus.Draft;
    if (activeFilter === 'Active') return wf.status === WorkflowStatus.Active;
    if (activeFilter === 'Completed') return wf.status === WorkflowStatus.Completed;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-white/60">
            Composable multi-agent workflows
            {!isLoading && ` • ${workflows.length} total`}
          </p>
        </div>
        
        {isConnected && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Create Workflow
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((filter) => (
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
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="card text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/3 mx-auto"></div>
          </div>
          <p className="text-white/60 mt-4">Loading workflows from chain...</p>
        </div>
      )}

      {/* Workflow List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredWorkflows.map((workflow) => {
            const style = statusStyles[workflow.status] || statusStyles[0];
            const budget = formatEther(workflow.totalBudget);
            const spent = formatEther(workflow.spent);
            const progress = workflow.totalBudget > BigInt(0)
              ? Number((workflow.spent * BigInt(100)) / workflow.totalBudget)
              : 0;
            const deadline = new Date(workflow.deadline * 1000);
            const isExpired = deadline < new Date();
            const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <div key={workflow.id} className="card hover:border-purple-500/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{workflow.name}</h3>
                      <span className={`badge ${style.bg} ${style.text}`}>
                        {workflow.statusLabel}
                      </span>
                    </div>
                    
                    <p className="text-white/60 text-sm mb-3 line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        📊 {workflow.stepCount} steps
                      </span>
                      <span>
                        By: {workflow.creator.slice(0, 6)}...{workflow.creator.slice(-4)}
                      </span>
                      <span>
                        {isExpired ? (
                          <span className="text-red-400">Expired</span>
                        ) : (
                          `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Budget Progress */}
                    <div className="text-right min-w-[120px]">
                      <div className="text-lg font-bold text-green-400">
                        {parseFloat(budget).toLocaleString()} AGNT
                      </div>
                      <div className="text-xs text-white/50 mb-1">
                        {parseFloat(spent).toLocaleString()} spent ({progress}%)
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="btn-secondary whitespace-nowrap"
                    >
                      {workflow.status === WorkflowStatus.Draft ? 'Edit' : 'View'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredWorkflows.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold mb-2">No Workflows Yet</h3>
          <p className="text-white/60 mb-4">
            {workflows.length === 0
              ? 'Create your first multi-agent workflow to get started!'
              : 'No workflows match your filter.'}
          </p>
          {isConnected && workflows.length === 0 && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              + Create Workflow
            </button>
          )}
        </div>
      )}

      {/* How It Works Section */}
      <div className="card bg-gradient-to-br from-purple-500/10 to-blue-500/10">
        <h3 className="text-xl font-bold mb-4">How Workflows Work</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl mb-2">1️⃣</div>
            <h4 className="font-semibold mb-1">Design</h4>
            <p className="text-sm text-white/60">
              Create a workflow with multiple steps. Define capabilities needed and rewards for each.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">2️⃣</div>
            <h4 className="font-semibold mb-1">Execute</h4>
            <p className="text-sm text-white/60">
              Agents pick up steps matching their capabilities. Steps run in sequence or parallel.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">3️⃣</div>
            <h4 className="font-semibold mb-1">Complete</h4>
            <p className="text-sm text-white/60">
              Agents get paid automatically as they complete steps. Outputs chain to next steps.
            </p>
          </div>
        </div>
      </div>

      <CreateWorkflowModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
