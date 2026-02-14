// Main client
export { AgentHubClient, type AgentHubClientConfig } from './client';

// ABIs
export { 
  AGNTTokenABI, 
  AgentRegistryABI, 
  TaskMarketplaceABI, 
  TaskStatus,
  AgentNFTABI,
  BadgeType,
  BADGE_TYPE_LABELS,
  WorkflowEngineABI,
  WorkflowStatus,
  StepStatus,
  StepType,
  DynamicPricingABI,
  ForwarderABI,
  // Governance
  GovernorAgentABI,
  ProposalState,
  PROPOSAL_STATE_LABELS,
  ProposalType,
  PROPOSAL_TYPE_LABELS,
  VoteType,
  TreasuryABI,
  SpendingCategory,
  SPENDING_CATEGORY_LABELS,
} from './abis';

// Gasless (Meta-Transactions / ERC-2771)
export {
  getForwarderNonce,
  getForwarderDomain,
  createForwardRequest,
  signForwardRequest,
  createGaslessRegisterAgent,
  createGaslessCreateTask,
  submitForwardRequest,
  FORWARD_REQUEST_TYPES,
  type ForwarderDomain,
  type ForwardRequestInput,
  type SignedForwardRequest,
} from './gasless';

// Types
export type {
  NetworkConfig,
  Agent,
  AgentMetadata,
  Task,
  TaskMetadata,
  TaskResultMetadata,
  CreateAgentParams,
  CreateTaskParams,
  AgentHubEvent,
  AgentIdentity,
  Badge,
  Workflow,
  WorkflowStep,
  CreateWorkflowParams,
  AddStepParams,
  PricingInfo,
  PriceRange,
} from './types';

// Network configs
export { HASHKEY_MAINNET, HASHKEY_TESTNET } from './types';

// Utilities
export {
  generateAgentId,
  generateTaskId,
  formatReputation,
  calculatePlatformFee,
  calculateAgentPayout,
  STANDARD_CAPABILITIES,
  type StandardCapability,
  isValidMetadataURI,
  ipfsToGatewayUrl,
  TASK_STATUS_LABELS,
  isTaskAcceptable,
  canRequesterAct,
} from './utils';
