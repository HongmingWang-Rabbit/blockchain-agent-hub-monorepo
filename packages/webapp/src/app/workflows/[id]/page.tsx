'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { workflowEngineAbi, WorkflowStatus, StepStatus, StepType } from '@/contracts/abis';
import { useWorkflowSteps, useStartWorkflow, useAddStep } from '@/hooks/useWorkflows';

const stepTypeLabels: Record<number, string> = {
  [StepType.Sequential]: 'Sequential',
  [StepType.Parallel]: 'Parallel',
  [StepType.Conditional]: 'Conditional',
  [StepType.Aggregator]: 'Aggregator',
};

const stepStatusStyles: Record<number, { bg: string; text: string }> = {
  [StepStatus.Pending]: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  [StepStatus.Running]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  [StepStatus.Completed]: { bg: 'bg-green-500/20', text: 'text-green-400' },
  [StepStatus.Failed]: { bg: 'bg-red-500/20', text: 'text-red-400' },
  [StepStatus.Skipped]: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as `0x${string}`;
  const { address, isConnected } = useAccount();
  
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepName, setStepName] = useState('');
  const [stepCapability, setStepCapability] = useState('');
  const [stepReward, setStepReward] = useState('10');

  const { data: workflow } = useReadContract({
    address: CONTRACTS.WORKFLOW_ENGINE,
    abi: workflowEngineAbi,
    functionName: 'workflows',
    args: [workflowId],
  });

  const { steps, isLoading: stepsLoading, refetch } = useWorkflowSteps(workflowId);
  const { start, isPending: isStarting } = useStartWorkflow();
  const { addStep, isPending: isAddingStep, isSuccess: stepAdded } = useAddStep();

  if (!workflow) {
    return (
      <div className="card text-center py-12">
        <p className="text-white/60">Loading workflow...</p>
      </div>
    );
  }

  const [, creator, name, description, totalBudget, spent, status, createdAt, deadline] = workflow as [
    `0x${string}`, `0x${string}`, string, string, bigint, bigint, number, bigint, bigint
  ];

  const isOwner = address?.toLowerCase() === creator.toLowerCase();
  const isDraft = status === WorkflowStatus.Draft;
  const isActive = status === WorkflowStatus.Active;
  const budget = formatEther(totalBudget);
  const spentAmount = formatEther(spent);
  const remainingBudget = totalBudget - spent;

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const rewardWei = BigInt(Math.floor(parseFloat(stepReward) * 1e18));
    addStep(workflowId, stepName, stepCapability, rewardWei, StepType.Sequential, [], '');
  };

  const handleStartWorkflow = () => {
    start(workflowId);
  };

  // Reset form after successful add
  if (stepAdded && showAddStep) {
    setShowAddStep(false);
    setStepName('');
    setStepCapability('');
    setStepReward('10');
    refetch();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Link href="/workflows" className="hover:text-white">Workflows</Link>
        <span>/</span>
        <span className="text-white">{name}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-white/60 mt-1">{description || 'No description'}</p>
        </div>

        {isOwner && isDraft && steps.length > 0 && (
          <button
            onClick={handleStartWorkflow}
            disabled={isStarting}
            className="btn-primary"
          >
            {isStarting ? 'Starting...' : '▶️ Start Workflow'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-400">{steps.length}</div>
          <div className="text-sm text-white/60">Steps</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{parseFloat(budget).toLocaleString()}</div>
          <div className="text-sm text-white/60">Budget (AGNT)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{parseFloat(spentAmount).toLocaleString()}</div>
          <div className="text-sm text-white/60">Spent</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold ${isDraft ? 'text-gray-400' : isActive ? 'text-green-400' : 'text-blue-400'}`}>
            {isDraft ? 'Draft' : isActive ? 'Active' : 'Done'}
          </div>
          <div className="text-sm text-white/60">Status</div>
        </div>
      </div>

      {/* Steps */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Workflow Steps</h2>
          {isOwner && isDraft && (
            <button
              onClick={() => setShowAddStep(!showAddStep)}
              className="btn-secondary text-sm"
            >
              {showAddStep ? 'Cancel' : '+ Add Step'}
            </button>
          )}
        </div>

        {/* Add Step Form */}
        {showAddStep && (
          <form onSubmit={handleAddStep} className="bg-white/5 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                placeholder="Step name"
                className="input"
                required
              />
              <input
                type="text"
                value={stepCapability}
                onChange={(e) => setStepCapability(e.target.value)}
                placeholder="Required capability"
                className="input"
                required
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={stepReward}
                  onChange={(e) => setStepReward(e.target.value)}
                  placeholder="Reward"
                  className="input flex-1"
                  min="1"
                  required
                />
                <button
                  type="submit"
                  disabled={isAddingStep}
                  className="btn-primary whitespace-nowrap"
                >
                  {isAddingStep ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
            <p className="text-xs text-white/40">
              Remaining budget: {formatEther(remainingBudget)} AGNT
            </p>
          </form>
        )}

        {/* Steps List */}
        {stepsLoading ? (
          <div className="text-center py-8 text-white/60">Loading steps...</div>
        ) : steps.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-white/60">No steps yet. Add steps to build your workflow.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => {
              const style = stepStatusStyles[step.status] || stepStatusStyles[0];
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{step.name}</span>
                      <span className={`badge ${style.bg} ${style.text} text-xs`}>
                        {step.statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                        {step.capability}
                      </span>
                      <span>{formatEther(step.reward)} AGNT</span>
                      <span className="text-white/40">{stepTypeLabels[step.stepType]}</span>
                    </div>
                  </div>

                  {step.status === StepStatus.Pending && isActive && (
                    <button className="btn-secondary text-sm">
                      Accept
                    </button>
                  )}
                  
                  {step.status === StepStatus.Completed && (
                    <span className="text-green-400">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow Info */}
      <div className="card">
        <h3 className="font-semibold mb-3">Details</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60">Creator: </span>
            <span className="font-mono">{creator.slice(0, 10)}...{creator.slice(-8)}</span>
          </div>
          <div>
            <span className="text-white/60">Workflow ID: </span>
            <span className="font-mono">{workflowId.slice(0, 10)}...{workflowId.slice(-8)}</span>
          </div>
          <div>
            <span className="text-white/60">Created: </span>
            <span>{new Date(Number(createdAt) * 1000).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-white/60">Deadline: </span>
            <span>{new Date(Number(deadline) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
