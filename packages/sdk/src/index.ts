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
  BADGE_TYPE_LABELS
} from './abis';

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
