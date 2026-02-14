// GovernorAgent ABI
export const GovernorAgentABI = [
  // Read functions
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'votingDelay',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'votingPeriod',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalThreshold',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'quorum',
    inputs: [{ name: 'blockNumber', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'state',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalSnapshot',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalDeadline',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalVotes',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'againstVotes', type: 'uint256' },
      { name: 'forVotes', type: 'uint256' },
      { name: 'abstainVotes', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'hasVoted',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalTypes',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getVotes',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'timepoint', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  // Write functions
  {
    type: 'function',
    name: 'propose',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'proposeTyped',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
      { name: 'proposalType', type: 'uint8' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVote',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVoteWithReason',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'queue',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'descriptionHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'descriptionHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'descriptionHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  // Events
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: false },
      { name: 'proposer', type: 'address', indexed: false },
      { name: 'targets', type: 'address[]', indexed: false },
      { name: 'values', type: 'uint256[]', indexed: false },
      { name: 'signatures', type: 'string[]', indexed: false },
      { name: 'calldatas', type: 'bytes[]', indexed: false },
      { name: 'voteStart', type: 'uint256', indexed: false },
      { name: 'voteEnd', type: 'uint256', indexed: false },
      { name: 'description', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'ProposalCreatedWithType',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'proposalType', type: 'uint8', indexed: false },
      { name: 'description', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'voter', type: 'address', indexed: true },
      { name: 'proposalId', type: 'uint256', indexed: false },
      { name: 'support', type: 'uint8', indexed: false },
      { name: 'weight', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'ProposalQueued',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: false },
      { name: 'etaSeconds', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'ProposalExecuted',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: false }
    ]
  }
] as const;

// Proposal states
export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7
}

export const PROPOSAL_STATE_LABELS: Record<ProposalState, string> = {
  [ProposalState.Pending]: 'Pending',
  [ProposalState.Active]: 'Active',
  [ProposalState.Canceled]: 'Canceled',
  [ProposalState.Defeated]: 'Defeated',
  [ProposalState.Succeeded]: 'Succeeded',
  [ProposalState.Queued]: 'Queued',
  [ProposalState.Expired]: 'Expired',
  [ProposalState.Executed]: 'Executed'
};

// Proposal types
export enum ProposalType {
  ParameterChange = 0,
  TreasurySpend = 1,
  ContractUpgrade = 2,
  CapabilityWhitelist = 3,
  EmergencyAction = 4
}

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  [ProposalType.ParameterChange]: 'Parameter Change',
  [ProposalType.TreasurySpend]: 'Treasury Spend',
  [ProposalType.ContractUpgrade]: 'Contract Upgrade',
  [ProposalType.CapabilityWhitelist]: 'Capability Whitelist',
  [ProposalType.EmergencyAction]: 'Emergency Action'
};

// Vote options
export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2
}
