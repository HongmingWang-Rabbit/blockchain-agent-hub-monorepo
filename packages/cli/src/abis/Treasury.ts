// Treasury ABI
export const TreasuryABI = [
  // Read functions
  {
    type: 'function',
    name: 'agntToken',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'balance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'categoryLimits',
    inputs: [{ name: 'category', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'categorySpent',
    inputs: [{ name: 'category', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'remainingBudget',
    inputs: [{ name: 'category', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'periodStart',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'periodDuration',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'timeUntilPeriodReset',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  // Write functions
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'category', type: 'uint8' },
      { name: 'reason', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'spend',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'category', type: 'uint8' },
      { name: 'reason', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setCategoryLimit',
    inputs: [
      { name: 'category', type: 'uint8' },
      { name: 'limit', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setEmergencyPause',
    inputs: [{ name: '_paused', type: 'bool' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setPeriodDuration',
    inputs: [{ name: 'duration', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setGovernor',
    inputs: [{ name: 'governor', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // Events
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'Withdrawal',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'category', type: 'uint8', indexed: false },
      { name: 'reason', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'CategoryLimitUpdated',
    inputs: [
      { name: 'category', type: 'uint8', indexed: false },
      { name: 'newLimit', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'PeriodReset',
    inputs: [
      { name: 'newPeriodStart', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'EmergencyPause',
    inputs: [
      { name: 'paused', type: 'bool', indexed: false }
    ]
  }
] as const;

// Spending categories
export enum SpendingCategory {
  Grants = 0,
  Rewards = 1,
  Operations = 2,
  Liquidity = 3,
  Emergency = 4
}

export const SPENDING_CATEGORY_LABELS: Record<SpendingCategory, string> = {
  [SpendingCategory.Grants]: 'Developer/Agent Grants',
  [SpendingCategory.Rewards]: 'Agent Performance Rewards',
  [SpendingCategory.Operations]: 'Operational Expenses',
  [SpendingCategory.Liquidity]: 'Liquidity Provisioning',
  [SpendingCategory.Emergency]: 'Emergency Fund'
};
