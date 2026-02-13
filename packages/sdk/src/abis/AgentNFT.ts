// AgentNFT ABI - Soulbound NFT for AI Agent Identity
export const AgentNFTABI = [
  // Read functions
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
    name: "getBadgeCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "agentRegistry",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },

  // Write functions (admin/registry only)
  {
    inputs: [
      { internalType: "address", name: "agent", type: "address" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string[]", name: "capabilities", type: "string[]" }
    ],
    name: "mintAgentNFT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "agent", type: "address" },
      { internalType: "uint256", name: "newReputation", type: "uint256" },
      { internalType: "uint256", name: "tasksCompleted", type: "uint256" }
    ],
    name: "updateReputation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "agent", type: "address" },
      { internalType: "uint256", name: "stakedAmount", type: "uint256" }
    ],
    name: "awardStakingBadge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_registry", type: "address" }],
    name: "setAgentRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "agent", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "string", name: "name", type: "string" }
    ],
    name: "AgentNFTMinted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newReputation", type: "uint256" }
    ],
    name: "ReputationUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "enum AgentNFT.BadgeType", name: "badgeType", type: "uint8" },
      { indexed: false, internalType: "string", name: "name", type: "string" }
    ],
    name: "BadgeAwarded",
    type: "event"
  }
] as const;

// Badge type enum for TypeScript
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
