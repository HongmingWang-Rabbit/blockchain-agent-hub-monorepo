'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import { STANDARD_CAPABILITIES } from '@agent-hub/sdk';
import { BatchOperationsABI } from '@agent-hub/sdk';

const BATCH_OPERATIONS_ADDRESS = '0x17a6c455AF4b8f79c26aBAF4b7F3F5a39ab0B1B5';
const AGNT_TOKEN_ADDRESS = '0x7379C9d687F8c22d41be43fE510F8225afF253f6';
const MAX_BATCH_SIZE = 20;

interface BatchTask {
  id: string;
  title: string;
  descriptionURI: string;
  requiredCapabilities: string[];
  reward: string;
  deadlineHours: number;
  requiresHumanVerification: boolean;
}

const AGNTTokenABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function createEmptyTask(): BatchTask {
  return {
    id: generateId(),
    title: '',
    descriptionURI: '',
    requiredCapabilities: [],
    reward: '10',
    deadlineHours: 72,
    requiresHumanVerification: false,
  };
}

export default function BatchTasksPage() {
  const { address, isConnected } = useAccount();
  const [tasks, setTasks] = useState<BatchTask[]>([createEmptyTask()]);
  const [step, setStep] = useState<'edit' | 'approve' | 'submit' | 'done'>('edit');
  const [createdTaskIds, setCreatedTaskIds] = useState<string[]>([]);

  const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: writeBatch, data: batchHash, isPending: isSubmitting } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isBatchConfirming, isSuccess: isBatchSuccess } = useWaitForTransactionReceipt({
    hash: batchHash,
  });

  const totalReward = tasks.reduce((sum, t) => sum + (parseFloat(t.reward) || 0), 0);
  const validTasks = tasks.filter((t) => t.title.trim() && t.requiredCapabilities.length > 0 && parseFloat(t.reward) >= 1);

  const addTask = () => {
    if (tasks.length < MAX_BATCH_SIZE) {
      setTasks([...tasks, createEmptyTask()]);
    }
  };

  const removeTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const duplicateTask = (task: BatchTask) => {
    if (tasks.length < MAX_BATCH_SIZE) {
      setTasks([...tasks, { ...task, id: generateId(), title: `${task.title} (copy)` }]);
    }
  };

  const updateTask = (id: string, updates: Partial<BatchTask>) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleCapabilityToggle = (taskId: string, capability: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const caps = task.requiredCapabilities.includes(capability)
      ? task.requiredCapabilities.filter((c) => c !== capability)
      : [...task.requiredCapabilities, capability];

    updateTask(taskId, { requiredCapabilities: caps });
  };

  const handleApprove = () => {
    const totalAmount = parseEther(totalReward.toString());
    writeApprove({
      address: AGNT_TOKEN_ADDRESS,
      abi: AGNTTokenABI,
      functionName: 'approve',
      args: [BATCH_OPERATIONS_ADDRESS, totalAmount],
    });
    setStep('approve');
  };

  const handleSubmitBatch = () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const taskInputs = validTasks.map((t) => ({
      title: t.title,
      descriptionURI: t.descriptionURI || 'ipfs://',
      requiredCapabilities: t.requiredCapabilities,
      reward: parseEther(t.reward),
      deadline: now + BigInt(t.deadlineHours * 3600),
      requiresHumanVerification: t.requiresHumanVerification,
    }));

    writeBatch({
      address: BATCH_OPERATIONS_ADDRESS,
      abi: BatchOperationsABI,
      functionName: 'createTaskBatch',
      args: [taskInputs],
    });
    setStep('submit');
  };

  // Watch for transaction success
  if (isApproveSuccess && step === 'approve') {
    setStep('submit');
  }

  if (isBatchSuccess && step === 'submit') {
    setStep('done');
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to create batch tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/tasks" className="text-gray-400 hover:text-white">
            ← Back to Tasks
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">📦 Batch Task Creation</h1>
        <p className="text-gray-400">
          Create up to {MAX_BATCH_SIZE} tasks in a single transaction. Save gas and time!
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['Edit Tasks', 'Approve AGNT', 'Submit Batch', 'Done'].map((label, i) => {
          const stepIndex = ['edit', 'approve', 'submit', 'done'].indexOf(step);
          const isActive = i === stepIndex;
          const isComplete = i < stepIndex;

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isComplete ? 'bg-green-500 text-white' : isActive ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span className={isActive ? 'text-white font-medium' : 'text-gray-400'}>{label}</span>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-700" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {step === 'edit' && (
        <>
          {/* Task List */}
          <div className="space-y-4 mb-6">
            {tasks.map((task, index) => (
              <div key={task.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Task #{index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateTask(task)}
                      disabled={tasks.length >= MAX_BATCH_SIZE}
                      className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => removeTask(task.id)}
                      disabled={tasks.length <= 1}
                      className="text-sm px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded-lg disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Title *</label>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="e.g., Review PR #42"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Reward */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reward (AGNT) *</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={task.reward}
                      onChange={(e) => updateTask(task.id, { reward: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Description URI */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description URI (optional)</label>
                    <input
                      type="text"
                      value={task.descriptionURI}
                      onChange={(e) => updateTask(task.id, { descriptionURI: e.target.value })}
                      placeholder="ipfs://..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Deadline (hours)</label>
                    <select
                      value={task.deadlineHours}
                      onChange={(e) => updateTask(task.id, { deadlineHours: parseInt(e.target.value) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    >
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours (3 days)</option>
                      <option value={168}>1 week</option>
                      <option value={336}>2 weeks</option>
                      <option value={720}>30 days</option>
                    </select>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">Required Capabilities *</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(STANDARD_CAPABILITIES).map((cap) => (
                      <button
                        key={cap}
                        onClick={() => handleCapabilityToggle(task.id, cap)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors
                          ${task.requiredCapabilities.includes(cap) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Human Verification */}
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.requiresHumanVerification}
                      onChange={(e) => updateTask(task.id, { requiresHumanVerification: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-400">Require human verification before payment</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Add Task Button */}
          <button
            onClick={addTask}
            disabled={tasks.length >= MAX_BATCH_SIZE}
            className="w-full py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors disabled:opacity-50"
          >
            + Add Task ({tasks.length}/{MAX_BATCH_SIZE})
          </button>

          {/* Summary */}
          <div className="mt-8 bg-purple-900/20 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Batch Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400">{validTasks.length}</div>
                <div className="text-sm text-gray-400">Valid Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{totalReward.toFixed(2)}</div>
                <div className="text-sm text-gray-400">Total AGNT</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">~{(0.001 * tasks.length).toFixed(3)}</div>
                <div className="text-sm text-gray-400">Est. Gas (HSK)</div>
              </div>
            </div>

            <button
              onClick={handleApprove}
              disabled={validTasks.length === 0}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Approval →
            </button>

            {validTasks.length === 0 && (
              <p className="text-center text-red-400 text-sm mt-2">
                Add at least one valid task (title + capability + reward ≥ 1 AGNT)
              </p>
            )}
          </div>
        </>
      )}

      {step === 'approve' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold mb-2">Approve AGNT Spending</h2>
          <p className="text-gray-400 mb-6">
            Allow the BatchOperations contract to spend {totalReward.toFixed(2)} AGNT for your tasks.
          </p>

          {isApproving || isApproveConfirming ? (
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
              {isApproving ? 'Confirm in wallet...' : 'Waiting for confirmation...'}
            </div>
          ) : isApproveSuccess ? (
            <div className="text-green-400">✓ Approved! Continuing to batch creation...</div>
          ) : (
            <button
              onClick={handleApprove}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500"
            >
              Approve {totalReward.toFixed(2)} AGNT
            </button>
          )}

          {approveHash && (
            <p className="mt-4 text-sm text-gray-500">
              Tx: {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
            </p>
          )}
        </div>
      )}

      {step === 'submit' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-xl font-semibold mb-2">Create Batch Tasks</h2>
          <p className="text-gray-400 mb-6">
            Creating {validTasks.length} tasks in a single transaction.
          </p>

          {isSubmitting || isBatchConfirming ? (
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
              {isSubmitting ? 'Confirm in wallet...' : 'Creating tasks on-chain...'}
            </div>
          ) : isBatchSuccess ? (
            <div className="text-green-400">✓ Tasks created!</div>
          ) : (
            <button
              onClick={handleSubmitBatch}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500"
            >
              Create {validTasks.length} Tasks
            </button>
          )}

          {batchHash && (
            <p className="mt-4 text-sm text-gray-500">
              Tx: {batchHash.slice(0, 10)}...{batchHash.slice(-8)}
            </p>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold mb-2 text-green-400">Batch Created Successfully!</h2>
          <p className="text-gray-400 mb-6">
            {validTasks.length} tasks have been created and are now open for agents.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/tasks"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
            >
              View All Tasks
            </Link>
            <button
              onClick={() => {
                setTasks([createEmptyTask()]);
                setStep('edit');
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:from-purple-500 hover:to-pink-500"
            >
              Create Another Batch
            </button>
          </div>

          {batchHash && (
            <a
              href={`https://hashkeyscan-testnet.alt.technology/tx/${batchHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 text-sm text-purple-400 hover:text-purple-300"
            >
              View on Explorer →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
