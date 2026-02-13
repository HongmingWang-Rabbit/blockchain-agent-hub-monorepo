import { keccak256, toHex, type Hex, type Address } from 'viem';

/**
 * Generate an agent ID (matches contract logic)
 */
export function generateAgentId(
  owner: Address,
  name: string,
  timestamp: number
): Hex {
  const packed = toHex(
    new TextEncoder().encode(`${owner}${name}${timestamp}`)
  );
  return keccak256(packed);
}

/**
 * Generate a task ID (matches contract logic)
 */
export function generateTaskId(
  requester: Address,
  title: string,
  timestamp: number
): Hex {
  const packed = toHex(
    new TextEncoder().encode(`${requester}${title}${timestamp}`)
  );
  return keccak256(packed);
}

/**
 * Format reputation score (0-10000) to percentage string
 */
export function formatReputation(score: number): string {
  return `${(score / 100).toFixed(2)}%`;
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
  reward: bigint,
  feePercent: number
): bigint {
  return (reward * BigInt(Math.round(feePercent * 100))) / 10000n;
}

/**
 * Calculate agent payout after platform fee
 */
export function calculateAgentPayout(
  reward: bigint,
  feePercent: number
): bigint {
  const fee = calculatePlatformFee(reward, feePercent);
  return reward - fee;
}

/**
 * Standard capabilities for agents
 */
export const STANDARD_CAPABILITIES = {
  // Language & Content
  TEXT_GENERATION: 'text-generation',
  TEXT_SUMMARIZATION: 'text-summarization',
  TRANSLATION: 'translation',
  CONTENT_MODERATION: 'content-moderation',
  
  // Analysis
  SENTIMENT_ANALYSIS: 'sentiment-analysis',
  DATA_ANALYSIS: 'data-analysis',
  CODE_REVIEW: 'code-review',
  
  // Creative
  IMAGE_GENERATION: 'image-generation',
  IMAGE_ANALYSIS: 'image-analysis',
  AUDIO_TRANSCRIPTION: 'audio-transcription',
  
  // Blockchain
  SMART_CONTRACT_AUDIT: 'smart-contract-audit',
  TRANSACTION_ANALYSIS: 'transaction-analysis',
  TOKEN_ANALYSIS: 'token-analysis',
  
  // Automation
  WEB_SCRAPING: 'web-scraping',
  API_INTEGRATION: 'api-integration',
  WORKFLOW_AUTOMATION: 'workflow-automation',
} as const;

export type StandardCapability = typeof STANDARD_CAPABILITIES[keyof typeof STANDARD_CAPABILITIES];

/**
 * Validate metadata URI (should be IPFS or HTTPS)
 */
export function isValidMetadataURI(uri: string): boolean {
  if (uri.startsWith('ipfs://')) return true;
  if (uri.startsWith('https://')) return true;
  return false;
}

/**
 * Convert IPFS URI to gateway URL
 */
export function ipfsToGatewayUrl(
  ipfsUri: string,
  gateway = 'https://ipfs.io/ipfs/'
): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  return gateway + ipfsUri.slice(7);
}

/**
 * Task status labels
 */
export const TASK_STATUS_LABELS: Record<number, string> = {
  0: 'Open',
  1: 'Assigned',
  2: 'Submitted',
  3: 'Pending Review',
  4: 'Completed',
  5: 'Disputed',
  6: 'Cancelled',
  7: 'Failed',
};

/**
 * Check if task is actionable by agent
 */
export function isTaskAcceptable(status: number): boolean {
  return status === 0; // Only Open tasks
}

/**
 * Check if task is actionable by requester
 */
export function canRequesterAct(status: number): boolean {
  return status === 2 || status === 3; // Submitted or PendingReview
}
