/**
 * DynamicPricing contract ABI
 * Dynamic pricing oracle for task pricing with surge, peak hours, and reputation discounts
 */

export const DynamicPricingABI = [
  // Constructor
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'string', name: 'capability', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'BasePriceSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'taskCount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'DemandUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'string', name: 'capability', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'basePrice', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'finalPrice', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'surgeMultiplier', type: 'uint256' },
    ],
    name: 'PriceCalculated',
    type: 'event',
  },
  // Read functions - Constants
  {
    inputs: [],
    name: 'DISCOUNT_HIGH_REP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISCOUNT_PERFECT_REP',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PEAK_START',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PEAK_END',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PEAK_MULTIPLIER',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SURGE_THRESHOLD_LOW',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SURGE_THRESHOLD_MED',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SURGE_THRESHOLD_HIGH',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Read functions - State
  {
    inputs: [{ internalType: 'string', name: '', type: 'string' }],
    name: 'basePrices',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'recentTaskCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastDemandUpdate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Read functions - Calculated
  {
    inputs: [
      { internalType: 'string', name: 'capability', type: 'string' },
      { internalType: 'uint256', name: 'agentReputation', type: 'uint256' },
    ],
    name: 'calculatePrice',
    outputs: [{ internalType: 'uint256', name: 'finalPrice', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'capability', type: 'string' }],
    name: 'getPriceRange',
    outputs: [
      { internalType: 'uint256', name: 'minPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'currentPrice', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPricingInfo',
    outputs: [
      { internalType: 'uint256', name: 'currentSurge', type: 'uint256' },
      { internalType: 'bool', name: 'isPeak', type: 'bool' },
      { internalType: 'uint256', name: 'tasksLastHour', type: 'uint256' },
      { internalType: 'uint256', name: 'nextSurgeAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'reputation', type: 'uint256' }],
    name: 'getReputationDiscount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSurgeMultiplier',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPeakHours',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'string', name: 'capability', type: 'string' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'setBasePrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'recordTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
