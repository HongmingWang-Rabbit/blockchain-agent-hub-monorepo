'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { AgentNFTABI, BadgeType, BADGE_TYPE_LABELS } from '@/contracts/abis';

export interface AgentNFTData {
  hasNFT: boolean;
  tokenId: bigint | null;
  name: string;
  registeredAt: Date | null;
  reputationScore: number;
  tasksCompleted: number;
  badges: {
    name: string;
    description: string;
    awardedAt: Date;
    badgeType: number;
    label: string;
  }[];
  svgImage: string | null;
}

export function useAgentNFT(address: `0x${string}` | undefined) {
  // Check if address has NFT
  const { data: hasNFT } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'hasNFT',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get token ID
  const { data: tokenId } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'agentToToken',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!hasNFT },
  });

  // Get identity data
  const { data: identity } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'agentIdentities',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && !!hasNFT },
  });

  // Get badges
  const { data: badgesRaw } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'getBadges',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && !!hasNFT },
  });

  // Get SVG
  const { data: svgImage } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'generateSVG',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && !!hasNFT },
  });

  const identityArray = identity as [string, bigint, bigint, bigint] | undefined;
  const badges = (badgesRaw as readonly { name: string; description: string; awardedAt: bigint; badgeType: number }[] | undefined) ?? [];

  return {
    hasNFT: !!hasNFT,
    tokenId: hasNFT ? (tokenId as bigint) : null,
    name: identityArray?.[0] ?? '',
    registeredAt: identityArray ? new Date(Number(identityArray[1]) * 1000) : null,
    reputationScore: identityArray ? Number(identityArray[2]) : 0,
    tasksCompleted: identityArray ? Number(identityArray[3]) : 0,
    badges: badges.map(b => ({
      name: b.name,
      description: b.description,
      awardedAt: new Date(Number(b.awardedAt) * 1000),
      badgeType: b.badgeType,
      label: BADGE_TYPE_LABELS[b.badgeType as BadgeType] ?? 'Unknown',
    })),
    svgImage: (svgImage as string) ?? null,
  } as AgentNFTData;
}

export function useNFTTotalSupply() {
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.AGENT_NFT,
    abi: AgentNFTABI,
    functionName: 'totalSupply',
  });

  return Number(totalSupply ?? 0);
}
