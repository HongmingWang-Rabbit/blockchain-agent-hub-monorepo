'use client';

import { usePricingInfo } from '@/hooks/usePricing';

export function PricingBanner() {
  const { pricingInfo, isLoading } = usePricingInfo();

  if (isLoading || !pricingInfo) {
    return null;
  }

  const { surgeMultiplier, isPeakHours, tasksLastHour, nextSurgeAt } = pricingInfo;
  
  // Only show banner if there's surge or peak hours
  if (surgeMultiplier <= 1 && !isPeakHours) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3">
          {surgeMultiplier > 1 && (
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">⚡</span>
              <span className="font-semibold text-yellow-300">
                {surgeMultiplier}x Surge
              </span>
              <span className="text-white/60">
                ({tasksLastHour} tasks/hr)
              </span>
            </span>
          )}
          
          {isPeakHours && (
            <span className="flex items-center gap-1">
              <span className="text-orange-400">🌅</span>
              <span className="text-orange-300">Peak Hours (+15%)</span>
            </span>
          )}
        </div>

        {nextSurgeAt > 0 && surgeMultiplier < 2 && (
          <span className="text-white/50 text-xs">
            Next surge at {nextSurgeAt} tasks/hr
          </span>
        )}
      </div>
    </div>
  );
}
