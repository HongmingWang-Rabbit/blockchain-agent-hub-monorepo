'use client';

import Link from 'next/link';
import { formatEther } from 'viem';

interface Agent {
  id: `0x${string}`;
  name: string;
  owner: `0x${string}`;
  capabilities: string[];
  stakedAmount: bigint;
  reputationScore: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalEarned: bigint;
  registeredAt: number;
  isActive: boolean;
}

function formatNumber(value: number | bigint): string {
  const num = typeof value === 'bigint' ? parseFloat(formatEther(value)) : value;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getReputationColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getReputationBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getReputationLabel(score: number): string {
  if (score >= 95) return 'Legendary';
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'New';
}

function getAgentEmoji(score: number, tasks: number): string {
  if (score >= 95 && tasks >= 50) return '🏆';
  if (score >= 90 && tasks >= 20) return '⭐';
  if (tasks >= 10) return '🎯';
  if (tasks >= 1) return '🚀';
  return '🤖';
}

export function AgentCard({ agent }: { agent: Agent }) {
  const staked = formatEther(agent.stakedAmount);
  const earned = formatEther(agent.totalEarned);
  const successRate = agent.tasksCompleted + agent.tasksFailed > 0
    ? (agent.tasksCompleted / (agent.tasksCompleted + agent.tasksFailed) * 100).toFixed(0)
    : '100';

  const registeredDate = new Date(agent.registeredAt * 1000);
  const daysSinceRegistration = Math.floor((Date.now() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Link href={`/agents/${agent.id}`} className="block card hover:border-purple-500/50 transition-all hover:transform hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl shadow-lg">
            {getAgentEmoji(agent.reputationScore, agent.tasksCompleted)}
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

      {/* Reputation Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-white/60">Reputation</span>
          <span className={`font-semibold ${getReputationColor(agent.reputationScore)}`}>
            {agent.reputationScore.toFixed(0)}% • {getReputationLabel(agent.reputationScore)}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getReputationBgColor(agent.reputationScore)} transition-all duration-500`}
            style={{ width: `${agent.reputationScore}%` }}
          />
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.capabilities.slice(0, 4).map((cap) => (
          <span 
            key={cap} 
            className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full"
          >
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 4 && (
          <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-full">
            +{agent.capabilities.length - 4} more
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/10">
        <div className="text-center">
          <div className="text-sm font-bold text-blue-400">{agent.tasksCompleted}</div>
          <div className="text-[10px] text-white/50">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-green-400">{successRate}%</div>
          <div className="text-[10px] text-white/50">Success</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-yellow-400">{formatNumber(agent.stakedAmount)}</div>
          <div className="text-[10px] text-white/50">Staked</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-pink-400">{formatNumber(agent.totalEarned)}</div>
          <div className="text-[10px] text-white/50">Earned</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-white/40">
        <span>
          {daysSinceRegistration === 0 
            ? 'Registered today' 
            : `${daysSinceRegistration}d active`}
        </span>
        <span className="font-mono">{agent.id.slice(0, 10)}...</span>
      </div>
    </Link>
  );
}
