'use client';

import { formatEther } from 'viem';

interface Agent {
  id: `0x${string}`;
  name: string;
  owner: `0x${string}`;
  capabilities: string[];
  stakedAmount: bigint;
  reputationScore: number;
  tasksCompleted: number;
  isActive: boolean;
}

export function AgentCard({ agent }: { agent: Agent }) {
  const staked = formatEther(agent.stakedAmount);

  return (
    <div className="card hover:border-purple-500/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <p className="text-xs text-white/50">
              {agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}
            </p>
          </div>
        </div>
        <span className={`badge ${agent.isActive ? 'badge-active' : 'bg-gray-500/20 text-gray-400'}`}>
          {agent.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.map((cap) => (
          <span key={cap} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
            {cap}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{agent.reputationScore}</div>
          <div className="text-xs text-white/50">Reputation</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{agent.tasksCompleted}</div>
          <div className="text-xs text-white/50">Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{parseFloat(staked).toLocaleString()}</div>
          <div className="text-xs text-white/50">Staked</div>
        </div>
      </div>
    </div>
  );
}
