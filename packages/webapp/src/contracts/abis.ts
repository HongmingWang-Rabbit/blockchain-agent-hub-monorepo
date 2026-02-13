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

// AgentNFT ABI - Soulbound NFT for AI Agent Identity
export const AgentNFTABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "hasNFT",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "agentToToken",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "agentIdentities",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "registeredAt", type: "uint256" },
      { internalType: "uint256", name: "reputationScore", type: "uint256" },
      { internalType: "uint256", name: "tasksCompleted", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getBadges",
    outputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "awardedAt", type: "uint256" },
          { internalType: "enum AgentNFT.BadgeType", name: "badgeType", type: "uint8" }
        ],
        internalType: "struct AgentNFT.Badge[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "generateSVG",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
] as const;

// Badge type enum
export enum BadgeType {
  NEWCOMER = 0,
  FIRST_TASK = 1,
  RELIABLE = 2,
  EXPERT = 3,
  LEGENDARY = 4,
  HIGH_REP = 5,
  PERFECT_REP = 6,
  STAKER = 7,
  WHALE = 8
}

// Badge type labels
export const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  [BadgeType.NEWCOMER]: 'Newcomer',
  [BadgeType.FIRST_TASK]: 'First Steps',
  [BadgeType.RELIABLE]: 'Reliable',
  [BadgeType.EXPERT]: 'Expert',
  [BadgeType.LEGENDARY]: 'Legendary',
  [BadgeType.HIGH_REP]: 'Highly Rated',
  [BadgeType.PERFECT_REP]: 'Perfect',
  [BadgeType.STAKER]: 'Staker',
  [BadgeType.WHALE]: 'Whale'
};

// WorkflowEngine ABI
export const workflowEngineAbi = [
  {
    name: 'workflows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'totalBudget', type: 'uint256' },
      { name: 'spent', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  {
    name: 'workflowSteps',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'bytes32' },
      { name: '', type: 'bytes32' },
    ],
    outputs: [
      { name: 'stepId', type: 'bytes32' },
      { name: 'name', type: 'string' },
      { name: 'capability', type: 'string' },
      { name: 'assignedAgent', type: 'bytes32' },
      { name: 'reward', type: 'uint256' },
      { name: 'stepType', type: 'uint8' },
      { name: 'status', type: 'uint8' },
      { name: 'inputURI', type: 'string' },
      { name: 'outputURI', type: 'string' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'completedAt', type: 'uint256' },
    ],
  },
  {
    name: 'getWorkflowCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allWorkflowIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'getWorkflowSteps',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'workflowId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    name: 'getReadySteps',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'workflowId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    name: 'createWorkflow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'budget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'workflowId', type: 'bytes32' }],
  },
  {
    name: 'addStep',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'name', type: 'string' },
      { name: 'capability', type: 'string' },
      { name: 'reward', type: 'uint256' },
      { name: 'stepType', type: 'uint8' },
      { name: 'dependencies', type: 'bytes32[]' },
      { name: 'inputURI', type: 'string' },
    ],
    outputs: [{ name: 'stepId', type: 'bytes32' }],
  },
  {
    name: 'startWorkflow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'workflowId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'acceptStep',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'stepId', type: 'bytes32' },
      { name: 'agentId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'completeStep',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'stepId', type: 'bytes32' },
      { name: 'outputURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'WorkflowCreated',
    type: 'event',
    inputs: [
      { name: 'workflowId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'budget', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Workflow status enum
export const WorkflowStatus = {
  Draft: 0,
  Active: 1,
  Paused: 2,
  Completed: 3,
  Failed: 4,
  Cancelled: 5,
} as const;

export const StepStatus = {
  Pending: 0,
  Running: 1,
  Completed: 2,
  Failed: 3,
  Skipped: 4,
} as const;

export const StepType = {
  Sequential: 0,
  Parallel: 1,
  Conditional: 2,
  Aggregator: 3,
} as const;
