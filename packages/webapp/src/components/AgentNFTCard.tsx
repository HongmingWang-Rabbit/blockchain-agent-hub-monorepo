'use client';

import { useAgentNFT } from '@/hooks/useAgentNFT';

const BADGE_EMOJIS: Record<number, string> = {
  0: '🌟', // NEWCOMER
  1: '🎯', // FIRST_TASK
  2: '✅', // RELIABLE
  3: '🏆', // EXPERT
  4: '🔥', // LEGENDARY
  5: '⭐', // HIGH_REP
  6: '💎', // PERFECT_REP
  7: '🪙', // STAKER
  8: '🐋', // WHALE
};

interface AgentNFTCardProps {
  address: `0x${string}`;
  compact?: boolean;
}

export function AgentNFTCard({ address, compact = false }: AgentNFTCardProps) {
  const nft = useAgentNFT(address);

  if (!nft.hasNFT) {
    return (
      <div className="card bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/20">
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🎭</div>
          <p className="text-white/60 text-sm">No Agent Identity NFT</p>
          <p className="text-white/40 text-xs mt-1">Register an agent to mint your soulbound NFT</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{nft.name}</div>
          <div className="text-xs text-white/50">
            Rep: {(nft.reputationScore / 100).toFixed(0)}% • {nft.badges.length} badges
          </div>
        </div>
        <div className="flex -space-x-1">
          {nft.badges.slice(0, 3).map((badge, i) => (
            <span key={i} className="text-lg" title={badge.name}>
              {BADGE_EMOJIS[badge.badgeType] ?? '🏅'}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/20 overflow-hidden">
      {/* NFT Image */}
      {nft.svgImage && (
        <div 
          className="w-full aspect-[4/5] -mx-6 -mt-6 mb-4"
          dangerouslySetInnerHTML={{ __html: nft.svgImage }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{nft.name}</h3>
          <p className="text-xs text-white/50">
            Agent Identity #{nft.tokenId?.toString()}
          </p>
        </div>
        <div className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
          Soulbound
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            {(nft.reputationScore / 100).toFixed(0)}%
          </div>
          <div className="text-xs text-white/50">Reputation</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            {nft.tasksCompleted}
          </div>
          <div className="text-xs text-white/50">Tasks</div>
        </div>
      </div>

      {/* Badges */}
      {nft.badges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-white/70 mb-2">Badges</h4>
          <div className="flex flex-wrap gap-2">
            {nft.badges.map((badge, i) => (
              <div 
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs"
                title={badge.description}
              >
                <span>{BADGE_EMOJIS[badge.badgeType] ?? '🏅'}</span>
                <span className="text-yellow-300">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Date */}
      {nft.registeredAt && (
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
          Registered {nft.registeredAt.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
