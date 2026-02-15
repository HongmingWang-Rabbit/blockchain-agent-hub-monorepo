'use client';

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, keccak256, toHex, encodeFunctionData } from 'viem';
import { 
  GovernorAgentABI, 
  TreasuryABI, 
  AGNTTokenABI,
  ProposalState,
} from '@agent-hub/sdk';
import { useState, useCallback, useEffect } from 'react';

// Contract addresses (testnet)
export const GOVERNOR_ADDRESS = '0x626496716673bb5E7F2634d2eBc96ae0697713a4' as const;
export const TREASURY_ADDRESS = '0xdc454EfAa5eEBF4D6786750f664bCff461C68b33' as const;
export const AGNT_TOKEN_ADDRESS = '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as const;
export const TIMELOCK_ADDRESS = '0x0F8538a8829c1658eac0D20B11421828d2099c1C' as const;

// ============ VOTING POWER HOOK ============
export function useVotingPower() {
  const { address } = useAccount();

  const { data: votingPower, refetch: refetchVotingPower } = useReadContract({
    address: AGNT_TOKEN_ADDRESS,
    abi: AGNTTokenABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: delegatee, refetch: refetchDelegatee } = useReadContract({
    address: AGNT_TOKEN_ADDRESS,
    abi: AGNTTokenABI,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: tokenBalance } = useReadContract({
    address: AGNT_TOKEN_ADDRESS,
    abi: AGNTTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, isPending: isDelegating, data: delegateHash } = useWriteContract();
  const { isLoading: isConfirmingDelegate, isSuccess: delegateSuccess } = useWaitForTransactionReceipt({
    hash: delegateHash,
  });

  // Refetch after delegation
  useEffect(() => {
    if (delegateSuccess) {
      refetchVotingPower();
      refetchDelegatee();
    }
  }, [delegateSuccess, refetchVotingPower, refetchDelegatee]);

  const delegate = useCallback(async (to: `0x${string}`) => {
    writeContract({
      address: AGNT_TOKEN_ADDRESS,
      abi: AGNTTokenABI,
      functionName: 'delegate',
      args: [to],
    });
  }, [writeContract]);

  const selfDelegate = useCallback(async () => {
    if (address) {
      delegate(address);
    }
  }, [address, delegate]);

  return {
    votingPower: votingPower ? BigInt(votingPower.toString()) : BigInt(0),
    formattedVotingPower: votingPower ? formatEther(votingPower as bigint) : '0',
    delegatee: delegatee as `0x${string}` | undefined,
    tokenBalance: tokenBalance ? BigInt(tokenBalance.toString()) : BigInt(0),
    delegate,
    selfDelegate,
    isDelegating: isDelegating || isConfirmingDelegate,
    delegateSuccess,
  };
}

// ============ TREASURY HOOK ============
export function useTreasury() {
  const { data: treasuryBalance } = useReadContract({
    address: AGNT_TOKEN_ADDRESS,
    abi: AGNTTokenABI,
    functionName: 'balanceOf',
    args: [TREASURY_ADDRESS],
  });

  const categoryNames = ['GRANTS', 'REWARDS', 'OPERATIONS', 'LIQUIDITY', 'EMERGENCY'];
  
  // Get limits for each category
  const { data: categoryLimits } = useReadContracts({
    contracts: categoryNames.map((_, index) => ({
      address: TREASURY_ADDRESS,
      abi: TreasuryABI,
      functionName: 'categoryLimits',
      args: [index],
    })),
  });

  // Get spent amounts for each category
  const { data: categorySpent } = useReadContracts({
    contracts: categoryNames.map((_, index) => ({
      address: TREASURY_ADDRESS,
      abi: TreasuryABI,
      functionName: 'categorySpent',
      args: [index],
    })),
  });

  const { data: timeUntilReset } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: TreasuryABI,
    functionName: 'timeUntilPeriodReset',
  });

  const categories = categoryNames.map((name, index) => {
    const limit = categoryLimits?.[index]?.result as bigint | undefined;
    const spent = categorySpent?.[index]?.result as bigint | undefined;
    return {
      name,
      limit: limit ?? BigInt(0),
      spent: spent ?? BigInt(0),
      remaining: (limit ?? BigInt(0)) - (spent ?? BigInt(0)),
    };
  });

  const timeUntilResetSeconds = timeUntilReset ? Number(timeUntilReset) : 0;
  const periodEndDate = new Date(Date.now() + timeUntilResetSeconds * 1000);
  const periodRemaining = Math.max(0, Math.floor(timeUntilResetSeconds / (60 * 60 * 24)));

  return {
    balance: treasuryBalance ? BigInt(treasuryBalance.toString()) : BigInt(0),
    formattedBalance: treasuryBalance ? formatEther(treasuryBalance as bigint) : '0',
    categories,
    periodEndDate,
    periodRemaining,
  };
}

// ============ GOVERNOR STATS HOOK ============
export function useGovernorStats() {
  const { data: quorumNumerator } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'quorumNumerator',
    args: [],
  });

  const { data: proposalThreshold } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'proposalThreshold',
  });

  const { data: votingPeriod } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'votingPeriod',
  });

  const { data: votingDelay } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'votingDelay',
  });

  const { data: totalSupply } = useReadContract({
    address: AGNT_TOKEN_ADDRESS,
    abi: AGNTTokenABI,
    functionName: 'totalSupply',
  });

  return {
    quorumPercent: quorumNumerator ? Number(quorumNumerator) : 4,
    proposalThreshold: proposalThreshold ? BigInt(proposalThreshold.toString()) : parseEther('1000'),
    votingPeriodBlocks: votingPeriod ? Number(votingPeriod) : 50400, // ~7 days at 12s blocks
    votingDelayBlocks: votingDelay ? Number(votingDelay) : 1,
    totalSupply: totalSupply ? BigInt(totalSupply.toString()) : BigInt(0),
    formattedThreshold: proposalThreshold ? formatEther(proposalThreshold as bigint) : '1,000',
    votingPeriodDays: votingPeriod ? Math.round(Number(votingPeriod) * 12 / 86400) : 7,
    timelockDelayHours: 48, // Hardcoded based on deployment
  };
}

// ============ PROPOSAL HOOK ============
export interface ProposalData {
  id: bigint;
  proposer: `0x${string}`;
  state: ProposalState;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  description: string;
}

export function useProposal(proposalId: bigint | undefined) {
  const { data: state } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'state',
    args: proposalId ? [proposalId] : undefined,
    query: { enabled: !!proposalId },
  });

  const { data: votes } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'proposalVotes',
    args: proposalId ? [proposalId] : undefined,
    query: { enabled: !!proposalId },
  });

  const { data: deadline } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'proposalDeadline',
    args: proposalId ? [proposalId] : undefined,
    query: { enabled: !!proposalId },
  });

  const { data: snapshot } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'proposalSnapshot',
    args: proposalId ? [proposalId] : undefined,
    query: { enabled: !!proposalId },
  });

  const { data: proposer } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'proposalProposer',
    args: proposalId ? [proposalId] : undefined,
    query: { enabled: !!proposalId },
  });

  const votesData = votes as [bigint, bigint, bigint] | undefined;

  return {
    state: state as ProposalState | undefined,
    forVotes: votesData?.[1] ?? BigInt(0),
    againstVotes: votesData?.[0] ?? BigInt(0),
    abstainVotes: votesData?.[2] ?? BigInt(0),
    deadline: deadline ? BigInt(deadline.toString()) : undefined,
    snapshot: snapshot ? BigInt(snapshot.toString()) : undefined,
    proposer: proposer as `0x${string}` | undefined,
  };
}

// ============ VOTING HOOK ============
export function useVoting() {
  const { writeContract, isPending, data: voteHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: voteHash });

  const castVote = useCallback((proposalId: bigint, support: number) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'castVote',
      args: [proposalId, support],
    });
  }, [writeContract]);

  const castVoteWithReason = useCallback((proposalId: bigint, support: number, reason: string) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'castVoteWithReason',
      args: [proposalId, support, reason],
    });
  }, [writeContract]);

  return {
    castVote,
    castVoteWithReason,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

// ============ CREATE PROPOSAL HOOK ============
export function useCreateProposal() {
  const { writeContract, isPending, data: proposeHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: proposeHash });

  const propose = useCallback((
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string
  ) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'propose',
      args: [targets, values, calldatas, description],
    });
  }, [writeContract]);

  // Helper for simple treasury spend proposals
  const proposeTreasurySpend = useCallback((
    recipient: `0x${string}`,
    amount: bigint,
    category: number,
    description: string
  ) => {
    const calldata = encodeFunctionData({
      abi: TreasuryABI,
      functionName: 'spend',
      args: [recipient, amount, category, description],
    });

    propose([TREASURY_ADDRESS], [BigInt(0)], [calldata as `0x${string}`], description);
  }, [propose]);

  // Helper for category limit change proposals
  const proposeCategoryLimitChange = useCallback((
    category: number,
    newLimit: bigint,
    description: string
  ) => {
    const calldata = encodeFunctionData({
      abi: TreasuryABI,
      functionName: 'setCategoryLimit',
      args: [category, newLimit],
    });

    propose([TREASURY_ADDRESS], [BigInt(0)], [calldata as `0x${string}`], description);
  }, [propose]);

  return {
    propose,
    proposeTreasurySpend,
    proposeCategoryLimitChange,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    receipt,
  };
}

// ============ PROPOSAL LIFECYCLE HOOK ============
export function useProposalLifecycle() {
  const { writeContract, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const queue = useCallback((
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    descriptionHash: `0x${string}`
  ) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'queue',
      args: [targets, values, calldatas, descriptionHash],
    });
  }, [writeContract]);

  const execute = useCallback((
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    descriptionHash: `0x${string}`
  ) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'execute',
      args: [targets, values, calldatas, descriptionHash],
    });
  }, [writeContract]);

  const cancel = useCallback((
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    descriptionHash: `0x${string}`
  ) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: GovernorAgentABI,
      functionName: 'cancel',
      args: [targets, values, calldatas, descriptionHash],
    });
  }, [writeContract]);

  return {
    queue,
    execute,
    cancel,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

// ============ HAS VOTED HOOK ============
export function useHasVoted(proposalId: bigint | undefined) {
  const { address } = useAccount();

  const { data: hasVoted } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: GovernorAgentABI,
    functionName: 'hasVoted',
    args: proposalId && address ? [proposalId, address] : undefined,
    query: { enabled: !!proposalId && !!address },
  });

  return hasVoted as boolean | undefined;
}
