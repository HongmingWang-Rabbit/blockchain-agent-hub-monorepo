'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { dynamicPricingAbi } from '@/contracts/abis';
import { formatEther } from 'viem';

export interface PricingInfo {
  surgeMultiplier: number;
  isPeakHours: boolean;
  tasksLastHour: number;
  nextSurgeAt: number;
}

export function usePricingInfo() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.DYNAMIC_PRICING,
    abi: dynamicPricingAbi,
    functionName: 'getPricingInfo',
  });

  const pricingInfo: PricingInfo | undefined = data
    ? {
        surgeMultiplier: Number((data as [bigint, boolean, bigint, bigint])[0]) / 100,
        isPeakHours: (data as [bigint, boolean, bigint, bigint])[1],
        tasksLastHour: Number((data as [bigint, boolean, bigint, bigint])[2]),
        nextSurgeAt: Number((data as [bigint, boolean, bigint, bigint])[3]),
      }
    : undefined;

  return { pricingInfo, isLoading, error };
}

export function usePriceRange(capability: string) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.DYNAMIC_PRICING,
    abi: dynamicPricingAbi,
    functionName: 'getPriceRange',
    args: [capability],
  });

  const priceRange = data
    ? {
        min: formatEther((data as [bigint, bigint, bigint])[0]),
        max: formatEther((data as [bigint, bigint, bigint])[1]),
        current: formatEther((data as [bigint, bigint, bigint])[2]),
      }
    : undefined;

  return { priceRange, isLoading };
}

export function useCalculatePrice(capability: string, agentReputation: number = 5000) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.DYNAMIC_PRICING,
    abi: dynamicPricingAbi,
    functionName: 'calculatePrice',
    args: [capability, BigInt(agentReputation)],
  });

  return {
    price: data ? formatEther(data as bigint) : undefined,
    priceWei: data as bigint | undefined,
    isLoading,
  };
}

export function useMultiplePrices(capabilities: string[]) {
  const contracts = capabilities.map((cap) => ({
    address: CONTRACTS.DYNAMIC_PRICING as `0x${string}`,
    abi: dynamicPricingAbi,
    functionName: 'getPriceRange' as const,
    args: [cap],
  }));

  const { data, isLoading } = useReadContracts({ contracts });

  const prices = capabilities.reduce((acc, cap, i) => {
    const result = data?.[i];
    if (result?.status === 'success') {
      const [min, max, current] = result.result as [bigint, bigint, bigint];
      acc[cap] = {
        min: formatEther(min),
        max: formatEther(max),
        current: formatEther(current),
      };
    }
    return acc;
  }, {} as Record<string, { min: string; max: string; current: string }>);

  return { prices, isLoading };
}
