'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS } from '@/contracts';
import { crossChainHubAbi } from '@/contracts/abis';

interface BroadcastedAgent {
  owner: `0x${string}`;
  name: string;
  metadataURI: string;
  capabilities: readonly string[];
  reputationScore: bigint;
  totalTasksCompleted: bigint;
  broadcastTimestamp: bigint;
  isActive: boolean;
}

interface SupportedChain {
  chainId: bigint;
  name: string;
  receiverContract: `0x${string}`;
  isActive: boolean;
}

const chainIcons: Record<number, string> = {
  1: '⟠', // Ethereum
  137: '⬡', // Polygon
  42161: '🔷', // Arbitrum
  8453: '🔵', // Base
  133: '🔑', // HashKey
};

const chainColors: Record<number, string> = {
  1: 'from-blue-600 to-purple-600',
  137: 'from-purple-600 to-indigo-600',
  42161: 'from-blue-500 to-cyan-500',
  8453: 'from-blue-600 to-blue-400',
  133: 'from-pink-500 to-orange-500',
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-white/10 rounded w-24 mx-auto"></div>
    </div>
  );
}

export default function CrossChainPage() {
  const { isConnected, address } = useAccount();
  const [selectedCapability, setSelectedCapability] = useState<string>('all');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  
  // Read broadcasted agents
  const { data: broadcastedAgents, isLoading: loadingAgents, refetch: refetchAgents } = useReadContract({
    address: CONTRACTS.CROSS_CHAIN_HUB,
    abi: crossChainHubAbi,
    functionName: 'getBroadcastedAgents',
  });

  // Read supported chains
  const { data: supportedChains, isLoading: loadingChains } = useReadContract({
    address: CONTRACTS.CROSS_CHAIN_HUB,
    abi: crossChainHubAbi,
    functionName: 'getSupportedChains',
  });

  // Read broadcast fee
  const { data: broadcastFee } = useReadContract({
    address: CONTRACTS.CROSS_CHAIN_HUB,
    abi: crossChainHubAbi,
    functionName: 'broadcastFee',
  });

  // Read min reputation
  const { data: minReputation } = useReadContract({
    address: CONTRACTS.CROSS_CHAIN_HUB,
    abi: crossChainHubAbi,
    functionName: 'minReputationToBroadcast',
  });

  // Check if user has broadcasted
  const { data: isBroadcasted } = useReadContract({
    address: CONTRACTS.CROSS_CHAIN_HUB,
    abi: crossChainHubAbi,
    functionName: 'isBroadcasted',
    args: address ? [address] : undefined,
  });

  const agents = (broadcastedAgents as BroadcastedAgent[] | undefined) || [];
  const chains = (supportedChains as SupportedChain[] | undefined) || [];

  // Get unique capabilities from all agents
  const allCapabilities = Array.from(new Set(agents.flatMap(a => Array.from(a.capabilities))));

  // Filter agents by capability
  const filteredAgents = selectedCapability === 'all'
    ? agents
    : agents.filter(a => a.capabilities.includes(selectedCapability));

  const activeAgents = filteredAgents.filter(a => a.isActive);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🌐 Cross-Chain Discovery
          </h1>
          <p className="text-white/60 mt-2">
            Discover AI agents across multiple blockchains. Broadcast your agent to be visible everywhere.
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="btn-primary"
            disabled={!!isBroadcasted}
          >
            {isBroadcasted ? '✓ Already Broadcasted' : '📡 Broadcast Your Agent'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          {loadingAgents ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-purple-400">{agents.length}</div>
          )}
          <div className="text-sm text-white/60">Total Broadcasted</div>
        </div>
        <div className="card text-center">
          {loadingAgents ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-green-400">{activeAgents.length}</div>
          )}
          <div className="text-sm text-white/60">Active Agents</div>
        </div>
        <div className="card text-center">
          {loadingChains ? <LoadingSkeleton /> : (
            <div className="text-3xl font-bold text-blue-400">{chains.filter(c => c.isActive).length}</div>
          )}
          <div className="text-sm text-white/60">Supported Chains</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-400">{allCapabilities.length}</div>
          <div className="text-sm text-white/60">Unique Capabilities</div>
        </div>
      </div>

      {/* Supported Chains */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🔗 Supported Chains</h2>
        <div className="flex flex-wrap gap-3">
          {loadingChains ? (
            <div className="animate-pulse flex gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 w-32 bg-white/10 rounded-lg"></div>
              ))}
            </div>
          ) : chains.length === 0 ? (
            <p className="text-white/60">No chains configured yet.</p>
          ) : (
            chains.map((chain) => {
              const chainIdNum = Number(chain.chainId);
              return (
                <div
                  key={chainIdNum}
                  className={`px-4 py-2 rounded-lg bg-gradient-to-r ${chainColors[chainIdNum] || 'from-gray-600 to-gray-500'} ${
                    chain.isActive ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{chainIcons[chainIdNum] || '⛓️'}</span>
                    <div>
                      <div className="font-semibold">{chain.name}</div>
                      <div className="text-xs text-white/70">Chain ID: {chainIdNum}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-white/40 text-sm mt-4">
          Agents broadcasted on HashKey Chain are discoverable on all supported chains via the relayer network.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-white/60">Filter by capability:</label>
        <select
          value={selectedCapability}
          onChange={(e) => setSelectedCapability(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Capabilities</option>
          {allCapabilities.map((cap) => (
            <option key={cap} value={cap}>{cap}</option>
          ))}
        </select>
        <span className="text-sm text-white/40">
          Showing {activeAgents.length} of {filteredAgents.length} agents
        </span>
      </div>

      {/* Broadcasted Agents */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">📡 Broadcasted Agents</h2>
        
        {loadingAgents ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        ) : activeAgents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🌍</div>
            <p className="text-white/60">No agents broadcasted yet.</p>
            {isConnected && (
              <p className="text-sm text-white/40 mt-2">
                Be the first to broadcast your agent across chains!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeAgents.map((agent, index) => (
              <div
                key={`${agent.owner}-${index}`}
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                      🤖
                    </div>
                    <div>
                      <div className="font-bold text-lg">{agent.name}</div>
                      <div className="text-sm text-white/60">
                        {agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-400">
                        {(Number(agent.reputationScore) / 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-white/40">reputation</span>
                    </div>
                    <div className="text-sm text-white/60 mt-1">
                      {Number(agent.totalTasksCompleted)} tasks completed
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      Broadcasted {new Date(Number(agent.broadcastTimestamp) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          onSuccess={() => {
            setShowBroadcastModal(false);
            refetchAgents();
          }}
          broadcastFee={broadcastFee as bigint | undefined}
          minReputation={minReputation as bigint | undefined}
        />
      )}

      {!isConnected && (
        <div className="card text-center py-12">
          <h3 className="text-xl font-bold mb-4">Connect to Broadcast</h3>
          <p className="text-white/60 mb-6">
            Connect your wallet to broadcast your agent across chains.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      )}
    </div>
  );
}

// Broadcast Modal Component
function BroadcastModal({
  onClose,
  onSuccess,
  broadcastFee,
  minReputation,
}: {
  onClose: () => void;
  onSuccess: () => void;
  broadcastFee?: bigint;
  minReputation?: bigint;
}) {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capabilityInput, setCapabilityInput] = useState('');
  const [reputationScore, setReputationScore] = useState('8500');
  const [tasksCompleted, setTasksCompleted] = useState('10');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  const addCapability = () => {
    if (capabilityInput.trim() && !capabilities.includes(capabilityInput.trim())) {
      setCapabilities([...capabilities, capabilityInput.trim()]);
      setCapabilityInput('');
    }
  };

  const removeCapability = (cap: string) => {
    setCapabilities(capabilities.filter(c => c !== cap));
  };

  const handleBroadcast = () => {
    if (!name || capabilities.length === 0) return;

    writeContract({
      address: CONTRACTS.CROSS_CHAIN_HUB,
      abi: crossChainHubAbi,
      functionName: 'broadcastAgent',
      args: [
        name,
        metadataURI || '',
        capabilities,
        BigInt(reputationScore),
        BigInt(tasksCompleted),
      ],
      value: broadcastFee || BigInt(0),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-white/20 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">📡 Broadcast Agent</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My AI Agent"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Metadata URI</label>
              <input
                type="text"
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                placeholder="ipfs://..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Capabilities *</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={capabilityInput}
                  onChange={(e) => setCapabilityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                  placeholder="e.g., code-review"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                />
                <button onClick={addCapability} className="btn-secondary px-4">+</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded flex items-center gap-1"
                  >
                    {cap}
                    <button onClick={() => removeCapability(cap)} className="hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reputation Score</label>
                <input
                  type="number"
                  value={reputationScore}
                  onChange={(e) => setReputationScore(e.target.value)}
                  placeholder="8500 = 85%"
                  min="0"
                  max="10000"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                />
                <p className="text-xs text-white/40 mt-1">{(Number(reputationScore) / 100).toFixed(0)}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tasks Completed</label>
                <input
                  type="number"
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(e.target.value)}
                  placeholder="10"
                  min="0"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            {minReputation && (
              <p className="text-sm text-white/60">
                Minimum reputation required: {(Number(minReputation) / 100).toFixed(0)}%
              </p>
            )}

            {broadcastFee && broadcastFee > BigInt(0) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  Broadcast fee: {formatEther(broadcastFee)} HSK
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300">
                  Error: {error.message.slice(0, 100)}...
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleBroadcast}
              disabled={isPending || isConfirming || !name || capabilities.length === 0}
              className="btn-primary flex-1"
            >
              {isPending || isConfirming ? 'Broadcasting...' : '📡 Broadcast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
