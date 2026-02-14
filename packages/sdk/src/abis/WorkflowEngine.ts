/**
 * WorkflowEngine contract ABI
 * Composable multi-agent workflow orchestration
 */

export enum WorkflowStatus {
  Draft = 0,
  Active = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4,
}

export enum StepStatus {
  Pending = 0,
  Ready = 1,
  InProgress = 2,
  Completed = 3,
  Failed = 4,
}

export enum StepType {
  Sequential = 0,
  Parallel = 1,
  Conditional = 2,
}

export const WorkflowEngineABI = [
  // Constructor
  {
    inputs: [
      { internalType: 'address', name: '_agntToken', type: 'address' },
      { internalType: 'address', name: '_agentRegistry', type: 'address' },
      { internalType: 'address', name: '_taskMarketplace', type: 'address' },
      { internalType: 'address', name: '_owner', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'budget', type: 'uint256' },
    ],
    name: 'WorkflowCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
    ],
    name: 'WorkflowStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'totalSpent', type: 'uint256' },
    ],
    name: 'WorkflowCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'failedStepId', type: 'bytes32' },
    ],
    name: 'WorkflowFailed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'string', name: 'capability', type: 'string' },
    ],
    name: 'StepAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'agentId', type: 'bytes32' },
    ],
    name: 'StepStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'outputURI', type: 'string' },
    ],
    name: 'StepCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { indexed: true, internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'reason', type: 'string' },
    ],
    name: 'StepFailed',
    type: 'event',
  },
  // Read functions
  {
    inputs: [],
    name: 'getWorkflowCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    name: 'workflows',
    outputs: [
      { internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint256', name: 'totalBudget', type: 'uint256' },
      { internalType: 'uint256', name: 'spent', type: 'uint256' },
      { internalType: 'enum WorkflowEngine.WorkflowStatus', name: 'status', type: 'uint8' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    name: 'getWorkflowSteps',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    name: 'getReadySteps',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '', type: 'bytes32' },
      { internalType: 'bytes32', name: '', type: 'bytes32' },
    ],
    name: 'workflowSteps',
    outputs: [
      { internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'capability', type: 'string' },
      { internalType: 'bytes32', name: 'assignedAgent', type: 'bytes32' },
      { internalType: 'uint256', name: 'reward', type: 'uint256' },
      { internalType: 'enum WorkflowEngine.StepType', name: 'stepType', type: 'uint8' },
      { internalType: 'enum WorkflowEngine.StepStatus', name: 'status', type: 'uint8' },
      { internalType: 'string', name: 'inputURI', type: 'string' },
      { internalType: 'string', name: 'outputURI', type: 'string' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'completedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allWorkflowIds',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint256', name: 'budget', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'createWorkflow',
    outputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'capability', type: 'string' },
      { internalType: 'uint256', name: 'reward', type: 'uint256' },
      { internalType: 'enum WorkflowEngine.StepType', name: 'stepType', type: 'uint8' },
      { internalType: 'bytes32[]', name: 'dependencies', type: 'bytes32[]' },
      { internalType: 'string', name: 'inputURI', type: 'string' },
    ],
    name: 'addStep',
    outputs: [{ internalType: 'bytes32', name: 'stepId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    name: 'startWorkflow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'agentId', type: 'bytes32' },
    ],
    name: 'acceptStep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { internalType: 'string', name: 'outputURI', type: 'string' },
    ],
    name: 'completeStep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'workflowId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'stepId', type: 'bytes32' },
      { internalType: 'string', name: 'reason', type: 'string' },
    ],
    name: 'failStep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowId', type: 'bytes32' }],
    name: 'cancelWorkflow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
