// Main client
export { AgentHubClient, type AgentHubClientConfig } from './client';

// Event Watcher (Real-time subscriptions)
export {
  AgentHubEventWatcher,
  createEventWatcher,
  type EventSubscription,
  type WatchEventOptions,
  type AgentHubEvent,
  type AgentRegisteredEvent,
  type AgentDeactivatedEvent,
  type AgentSlashedEvent,
  type TaskCreatedEvent,
  type TaskAssignedEvent,
  type TaskCompletedEvent,
  type TaskSubmittedEvent,
  type TaskCancelledEvent,
  type WorkflowCreatedEvent,
  type WorkflowStartedEvent,
  type WorkflowCompletedEvent,
  type StepCompletedEvent,
  type BadgeAwardedEvent,
  type ProposalCreatedEvent,
  type VoteCastEvent,
  type AgentBroadcastEvent,
} from './events';

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
  // Cross-Chain
  CrossChainHubABI,
  CrossChainReceiverABI,
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
  // AgentHubEvent is exported from events.ts
  AgentIdentity,
  Badge,
  Workflow,
  WorkflowStep,
  CreateWorkflowParams,
  AddStepParams,
  PricingInfo,
  PriceRange,
  // Governance types
  Proposal,
  TreasuryStatus,
  CreateProposalParams,
  VoteParams,
  // Cross-Chain types
  BroadcastedAgent,
  ChainConfig,
  RemoteAgent,
  BroadcastAgentParams,
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

// Webhooks (Push Integrations)
export {
  WebhookManager,
  createWebhookManager,
  generateWebhookSecret,
  generateWebhookId,
  generateDeliveryId,
  createWebhookSignature,
  verifyWebhookSignature,
  eventToWebhookType,
  eventToWebhookData,
  matchesFilter,
  formatDiscordPayload,
  formatSlackPayload,
  type WebhookEventType,
  type WebhookFilter,
  type WebhookConfig,
  type WebhookPayload,
  type WebhookEventData,
  type WebhookDeliveryResult,
  type WebhookDeliveryLog,
  type WebhookManagerConfig,
} from './webhooks';
