// Minimal ABIs for webapp - only the functions we need

export const agntTokenAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const agentRegistryAbi = [
  {
    name: 'allAgentIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'agents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'stakedAmount', type: 'uint256' },
      { name: 'reputationScore', type: 'uint256' },
      { name: 'tasksCompleted', type: 'uint256' },
      { name: 'tasksFailed', type: 'uint256' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'getAgentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getAgentCapabilities',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ type: 'string[]' }],
  },
  {
    name: 'ownerAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'minStake',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'capabilities', type: 'string[]' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'agentId', type: 'bytes32' }],
  },
  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
    ],
  },
] as const;

export const taskMarketplaceAbi = [
  {
    name: 'allTaskIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'tasks',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'title', type: 'string' },
      { name: 'descriptionURI', type: 'string' },
      { name: 'requiredCapability', type: 'string' },
      { name: 'reward', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'assignedAgent', type: 'bytes32' },
      { name: 'status', type: 'uint8' },
      { name: 'requiresVerification', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
  {
    name: 'getTaskCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'createTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'descriptionURI', type: 'string' },
      { name: 'requiredCapability', type: 'string' },
      { name: 'reward', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'requiresVerification', type: 'bool' },
    ],
    outputs: [{ name: 'taskId', type: 'bytes32' }],
  },
  {
    name: 'acceptTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'taskId', type: 'bytes32' },
      { name: 'agentId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'submitTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'taskId', type: 'bytes32' },
      { name: 'resultURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'TaskCreated',
    type: 'event',
    inputs: [
      { name: 'taskId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'title', type: 'string', indexed: false },
      { name: 'reward', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Task status enum
export const TaskStatus = {
  Open: 0,
  Assigned: 1,
  Submitted: 2,
  Completed: 3,
  Disputed: 4,
  Cancelled: 5,
} as const;
