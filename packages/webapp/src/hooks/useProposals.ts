'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { formatEther, parseAbiItem, keccak256, toHex } from 'viem';
import { GovernorAgentABI, ProposalState } from '@agent-hub/sdk';
import { GOVERNOR_ADDRESS } from './useGovernance';

export interface IndexedProposal {
  id: string;
  proposalId: bigint;
  title: string;
  description: string;
  proposer: `0x${string}`;
  state: ProposalState;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  targets: `0x${string}`[];
  values: bigint[];
  calldatas: `0x${string}`[];
  descriptionHash: `0x${string}`;
}

// Parse title from markdown description
function parseTitle(description: string): string {
  // Look for markdown header
  const headerMatch = description.match(/^#\s+(.+)$/m);
  if (headerMatch) {
    return headerMatch[1].trim();
  }
  // Fall back to first line
  const firstLine = description.split('\n')[0];
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
}

export function useProposals() {
  const publicClient = usePublicClient();
  const { data: currentBlock } = useBlockNumber();
  const [proposals, setProposals] = useState<IndexedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!publicClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch ProposalCreated events from the last 50000 blocks (adjust as needed)
      const zero = BigInt(0);
      const blockRange = BigInt(50000);
      const fromBlock = currentBlock ? currentBlock - blockRange : zero;
      
      const logs = await publicClient.getLogs({
        address: GOVERNOR_ADDRESS,
        event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
        fromBlock: fromBlock > zero ? fromBlock : zero,
        toBlock: 'latest',
      });

      // Process each proposal
      const indexedProposals: IndexedProposal[] = await Promise.all(
        logs.map(async (log) => {
          const { args } = log;
          const proposalId = args.proposalId!;
          const proposer = args.proposer as `0x${string}`;
          const targets = args.targets as `0x${string}`[];
          const values = args.values as bigint[];
          const calldatas = args.calldatas as `0x${string}`[];
          const description = args.description as string;
          const voteStart = args.voteStart as bigint;
          const voteEnd = args.voteEnd as bigint;

          // Fetch current state and votes
          const [state, votes] = await Promise.all([
            publicClient.readContract({
              address: GOVERNOR_ADDRESS,
              abi: GovernorAgentABI,
              functionName: 'state',
              args: [proposalId],
            }),
            publicClient.readContract({
              address: GOVERNOR_ADDRESS,
              abi: GovernorAgentABI,
              functionName: 'proposalVotes',
              args: [proposalId],
            }),
          ]);

          const [againstVotes, forVotes, abstainVotes] = votes as [bigint, bigint, bigint];

          return {
            id: proposalId.toString(),
            proposalId,
            title: parseTitle(description),
            description,
            proposer,
            state: state as ProposalState,
            forVotes,
            againstVotes,
            abstainVotes,
            startBlock: voteStart,
            endBlock: voteEnd,
            targets,
            values,
            calldatas,
            descriptionHash: keccak256(toHex(description)),
          };
        })
      );

      // Sort by most recent first
      indexedProposals.sort((a, b) => Number(b.proposalId - a.proposalId));
      
      setProposals(indexedProposals);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, currentBlock]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    isLoading,
    error,
    refetch: fetchProposals,
  };
}

// Format proposal end time
export function useProposalTimeRemaining(endBlock: bigint): string {
  const { data: currentBlock } = useBlockNumber();
  
  if (!currentBlock) return 'Loading...';
  
  if (currentBlock >= endBlock) {
    return 'Ended';
  }
  
  const blocksRemaining = Number(endBlock - currentBlock);
  // Assume ~2s block time for HashKey Chain
  const secondsRemaining = blocksRemaining * 2;
  
  if (secondsRemaining < 60) {
    return `${secondsRemaining}s remaining`;
  }
  if (secondsRemaining < 3600) {
    return `${Math.floor(secondsRemaining / 60)}m remaining`;
  }
  if (secondsRemaining < 86400) {
    return `${Math.floor(secondsRemaining / 3600)}h remaining`;
  }
  return `${Math.floor(secondsRemaining / 86400)}d remaining`;
}
