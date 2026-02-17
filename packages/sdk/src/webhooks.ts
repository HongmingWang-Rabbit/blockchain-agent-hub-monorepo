/**
 * Webhook integrations for Agent Hub
 * 
 * Allows external services to receive push notifications for on-chain events.
 * Features:
 * - Event filtering by type, agent, task, capability
 * - HMAC signature verification for security
 * - Automatic retry with exponential backoff
 * - Batch delivery mode for high-volume scenarios
 */

import type { Hex, Address } from 'viem';
import type { AgentHubEvent } from './events';
import { createHmac, randomBytes } from 'crypto';

// ========== Types ==========

export type WebhookEventType =
  | 'agent.registered'
  | 'agent.deactivated'
  | 'agent.slashed'
  | 'task.created'
  | 'task.assigned'
  | 'task.submitted'
  | 'task.completed'
  | 'task.cancelled'
  | 'workflow.created'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.step_completed'
  | 'badge.awarded'
  | 'governance.proposal_created'
  | 'governance.vote_cast'
  | 'crosschain.agent_broadcast'
  | '*'; // Subscribe to all events

export interface WebhookFilter {
  /** Event types to subscribe to */
  events?: WebhookEventType[];
  /** Only events involving these agent IDs */
  agentIds?: Hex[];
  /** Only events involving these task IDs */
  taskIds?: Hex[];
  /** Only events involving these capabilities */
  capabilities?: string[];
  /** Only events from these addresses */
  addresses?: Address[];
  /** Minimum reward for task events (in wei) */
  minReward?: bigint;
}

export interface WebhookConfig {
  /** Unique identifier */
  id: string;
  /** Webhook endpoint URL */
  url: string;
  /** Secret for HMAC signature verification */
  secret: string;
  /** Event filters */
  filter?: WebhookFilter;
  /** Whether webhook is active */
  active: boolean;
  /** Optional description */
  description?: string;
  /** Created timestamp */
  createdAt: number;
  /** Last successful delivery */
  lastDeliveryAt?: number;
  /** Consecutive failure count */
  failureCount: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  /** Batch configuration */
  batch?: {
    enabled: boolean;
    maxSize: number;
    maxWaitMs: number;
  };
}

export interface WebhookPayload {
  /** Delivery ID (for deduplication) */
  id: string;
  /** Timestamp of delivery */
  timestamp: number;
  /** Webhook ID */
  webhookId: string;
  /** Single event or batch of events */
  events: WebhookEventData[];
}

export interface WebhookEventData {
  /** Event type (e.g., 'task.created') */
  type: WebhookEventType;
  /** Block number */
  blockNumber: string;
  /** Transaction hash */
  transactionHash: Hex;
  /** Event-specific data */
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  webhookId: string;
  deliveryId: string;
  statusCode?: number;
  error?: string;
  attempts: number;
  durationMs: number;
}

export interface WebhookDeliveryLog {
  deliveryId: string;
  webhookId: string;
  timestamp: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
  durationMs: number;
  eventsCount: number;
}

// ========== Utilities ==========

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a unique webhook ID
 */
export function generateWebhookId(): string {
  return `wh_${randomBytes(16).toString('hex')}`;
}

/**
 * Generate a unique delivery ID
 */
export function generateDeliveryId(): string {
  return `dlv_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

/**
 * Create HMAC signature for webhook payload
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify HMAC signature of webhook payload
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createWebhookSignature(payload, secret);
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert AgentHubEvent to webhook event type
 */
export function eventToWebhookType(event: AgentHubEvent): WebhookEventType {
  const mapping: Record<string, WebhookEventType> = {
    AgentRegistered: 'agent.registered',
    AgentDeactivated: 'agent.deactivated',
    AgentSlashed: 'agent.slashed',
    TaskCreated: 'task.created',
    TaskAssigned: 'task.assigned',
    TaskSubmitted: 'task.submitted',
    TaskCompleted: 'task.completed',
    TaskCancelled: 'task.cancelled',
    WorkflowCreated: 'workflow.created',
    WorkflowStarted: 'workflow.started',
    WorkflowCompleted: 'workflow.completed',
    StepCompleted: 'workflow.step_completed',
    BadgeAwarded: 'badge.awarded',
    ProposalCreated: 'governance.proposal_created',
    VoteCast: 'governance.vote_cast',
    AgentBroadcast: 'crosschain.agent_broadcast',
  };
  return mapping[event.type] || ('unknown' as WebhookEventType);
}

/**
 * Convert AgentHubEvent to webhook event data
 */
export function eventToWebhookData(event: AgentHubEvent): WebhookEventData {
  const type = eventToWebhookType(event);
  const { type: _type, blockNumber, transactionHash, ...data } = event as unknown as Record<string, unknown>;

  // Convert BigInt values to strings for JSON serialization
  const serializedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    serializedData[key] = typeof value === 'bigint' ? value.toString() : value;
  }

  return {
    type,
    blockNumber: blockNumber?.toString() ?? '0',
    transactionHash: transactionHash as Hex,
    data: serializedData,
  };
}

// ========== Filter Matching ==========

/**
 * Check if an event matches the webhook filter
 */
export function matchesFilter(event: AgentHubEvent, filter?: WebhookFilter): boolean {
  if (!filter) return true;

  const webhookType = eventToWebhookType(event);

  // Check event type filter
  if (filter.events && filter.events.length > 0) {
    if (!filter.events.includes('*') && !filter.events.includes(webhookType)) {
      return false;
    }
  }

  // Check agent ID filter
  if (filter.agentIds && filter.agentIds.length > 0) {
    const eventAgentId = (event as { agentId?: Hex }).agentId;
    if (eventAgentId && !filter.agentIds.includes(eventAgentId)) {
      return false;
    }
  }

  // Check task ID filter
  if (filter.taskIds && filter.taskIds.length > 0) {
    const eventTaskId = (event as { taskId?: Hex }).taskId;
    if (eventTaskId && !filter.taskIds.includes(eventTaskId)) {
      return false;
    }
  }

  // Check capability filter
  if (filter.capabilities && filter.capabilities.length > 0) {
    const eventCapability = (event as { requiredCapability?: string }).requiredCapability;
    if (eventCapability && !filter.capabilities.includes(eventCapability)) {
      return false;
    }
  }

  // Check address filter
  if (filter.addresses && filter.addresses.length > 0) {
    const eventOwner = (event as { owner?: Address }).owner;
    const eventRequester = (event as { requester?: Address }).requester;
    const eventCreator = (event as { creator?: Address }).creator;
    const relevantAddress = eventOwner || eventRequester || eventCreator;
    if (relevantAddress && !filter.addresses.includes(relevantAddress)) {
      return false;
    }
  }

  // Check minimum reward filter
  if (filter.minReward !== undefined) {
    const eventReward = (event as { reward?: bigint }).reward;
    if (eventReward !== undefined && eventReward < filter.minReward) {
      return false;
    }
  }

  return true;
}

// ========== Webhook Manager ==========

interface PendingBatch {
  webhookId: string;
  events: WebhookEventData[];
  timeout: ReturnType<typeof setTimeout>;
  startedAt: number;
}

export interface WebhookManagerConfig {
  /** Default retry configuration */
  defaultRetry?: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  /** HTTP timeout in milliseconds */
  timeoutMs?: number;
  /** Custom fetch implementation (for testing) */
  fetch?: typeof fetch;
  /** Callback for delivery logs */
  onDelivery?: (log: WebhookDeliveryLog) => void;
}

/**
 * Manages webhook registrations and deliveries
 */
export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private pendingBatches: Map<string, PendingBatch> = new Map();
  private deliveryLogs: WebhookDeliveryLog[] = [];
  private config: Required<WebhookManagerConfig>;

  constructor(config: WebhookManagerConfig = {}) {
    this.config = {
      defaultRetry: config.defaultRetry ?? {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      },
      timeoutMs: config.timeoutMs ?? 30000,
      fetch: config.fetch ?? globalThis.fetch,
      onDelivery: config.onDelivery ?? (() => {}),
    };
  }

  /**
   * Register a new webhook
   */
  registerWebhook(
    url: string,
    options: {
      filter?: WebhookFilter;
      description?: string;
      retry?: WebhookConfig['retry'];
      batch?: WebhookConfig['batch'];
    } = {}
  ): WebhookConfig {
    const id = generateWebhookId();
    const secret = generateWebhookSecret();

    const webhook: WebhookConfig = {
      id,
      url,
      secret,
      filter: options.filter,
      active: true,
      description: options.description,
      createdAt: Date.now(),
      failureCount: 0,
      retry: options.retry ?? this.config.defaultRetry,
      batch: options.batch,
    };

    this.webhooks.set(id, webhook);
    return webhook;
  }

  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  /**
   * List all webhooks
   */
  listWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Update a webhook
   */
  updateWebhook(id: string, updates: Partial<Omit<WebhookConfig, 'id' | 'secret' | 'createdAt'>>): WebhookConfig | undefined {
    const webhook = this.webhooks.get(id);
    if (!webhook) return undefined;

    const updated = { ...webhook, ...updates };
    this.webhooks.set(id, updated);
    return updated;
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    // Clean up pending batch if exists
    const batch = this.pendingBatches.get(id);
    if (batch) {
      clearTimeout(batch.timeout);
      this.pendingBatches.delete(id);
    }
    return this.webhooks.delete(id);
  }

  /**
   * Rotate webhook secret
   */
  rotateSecret(id: string): string | undefined {
    const webhook = this.webhooks.get(id);
    if (!webhook) return undefined;

    const newSecret = generateWebhookSecret();
    webhook.secret = newSecret;
    this.webhooks.set(id, webhook);
    return newSecret;
  }

  /**
   * Dispatch an event to all matching webhooks
   */
  async dispatchEvent(event: AgentHubEvent): Promise<WebhookDeliveryResult[]> {
    const results: WebhookDeliveryResult[] = [];
    const eventData = eventToWebhookData(event);

    for (const webhook of this.webhooks.values()) {
      if (!webhook.active) continue;
      if (!matchesFilter(event, webhook.filter)) continue;

      // Handle batching
      if (webhook.batch?.enabled) {
        this.addToBatch(webhook.id, eventData);
        continue;
      }

      // Immediate delivery
      const result = await this.deliverWebhook(webhook, [eventData]);
      results.push(result);
    }

    return results;
  }

  /**
   * Add event to pending batch
   */
  private addToBatch(webhookId: string, event: WebhookEventData): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.batch) return;

    let batch = this.pendingBatches.get(webhookId);

    if (!batch) {
      // Create new batch with flush timeout
      const timeout = setTimeout(
        () => this.flushBatch(webhookId),
        webhook.batch.maxWaitMs
      );

      batch = {
        webhookId,
        events: [],
        timeout,
        startedAt: Date.now(),
      };
      this.pendingBatches.set(webhookId, batch);
    }

    batch.events.push(event);

    // Flush if batch is full
    if (batch.events.length >= webhook.batch.maxSize) {
      this.flushBatch(webhookId);
    }
  }

  /**
   * Flush a pending batch
   */
  private async flushBatch(webhookId: string): Promise<WebhookDeliveryResult | undefined> {
    const batch = this.pendingBatches.get(webhookId);
    if (!batch || batch.events.length === 0) {
      this.pendingBatches.delete(webhookId);
      return undefined;
    }

    clearTimeout(batch.timeout);
    this.pendingBatches.delete(webhookId);

    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return undefined;

    return this.deliverWebhook(webhook, batch.events);
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWebhook(
    webhook: WebhookConfig,
    events: WebhookEventData[]
  ): Promise<WebhookDeliveryResult> {
    const deliveryId = generateDeliveryId();
    const startTime = Date.now();
    const maxAttempts = webhook.retry?.maxAttempts ?? this.config.defaultRetry.maxAttempts;
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload: WebhookPayload = {
          id: deliveryId,
          timestamp: Date.now(),
          webhookId: webhook.id,
          events,
        };

        const body = JSON.stringify(payload);
        const signature = createWebhookSignature(body, webhook.secret);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        try {
          const response = await this.config.fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Id': webhook.id,
              'X-Webhook-Delivery': deliveryId,
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': payload.timestamp.toString(),
            },
            body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          lastStatusCode = response.status;

          if (response.ok) {
            // Success
            webhook.failureCount = 0;
            webhook.lastDeliveryAt = Date.now();

            const result: WebhookDeliveryResult = {
              success: true,
              webhookId: webhook.id,
              deliveryId,
              statusCode: response.status,
              attempts: attempt,
              durationMs: Date.now() - startTime,
            };

            this.logDelivery(result, events.length);
            return result;
          }

          lastError = `HTTP ${response.status}: ${response.statusText}`;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          lastError = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxAttempts) {
        const delayMs = Math.min(
          (webhook.retry?.initialDelayMs ?? 1000) * Math.pow(2, attempt - 1),
          webhook.retry?.maxDelayMs ?? 30000
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // All attempts failed
    webhook.failureCount++;

    const result: WebhookDeliveryResult = {
      success: false,
      webhookId: webhook.id,
      deliveryId,
      statusCode: lastStatusCode,
      error: lastError,
      attempts: maxAttempts,
      durationMs: Date.now() - startTime,
    };

    this.logDelivery(result, events.length);
    return result;
  }

  /**
   * Log delivery result
   */
  private logDelivery(result: WebhookDeliveryResult, eventsCount: number): void {
    const log: WebhookDeliveryLog = {
      deliveryId: result.deliveryId,
      webhookId: result.webhookId,
      timestamp: Date.now(),
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      attempts: result.attempts,
      durationMs: result.durationMs,
      eventsCount,
    };

    this.deliveryLogs.push(log);

    // Keep only last 1000 logs
    if (this.deliveryLogs.length > 1000) {
      this.deliveryLogs = this.deliveryLogs.slice(-1000);
    }

    this.config.onDelivery(log);
  }

  /**
   * Get delivery logs
   */
  getDeliveryLogs(options?: {
    webhookId?: string;
    limit?: number;
    successOnly?: boolean;
  }): WebhookDeliveryLog[] {
    let logs = this.deliveryLogs;

    if (options?.webhookId) {
      logs = logs.filter(l => l.webhookId === options.webhookId);
    }

    if (options?.successOnly !== undefined) {
      logs = logs.filter(l => l.success === options.successOnly);
    }

    if (options?.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return {
        success: false,
        webhookId,
        deliveryId: 'test',
        error: 'Webhook not found',
        attempts: 0,
        durationMs: 0,
      };
    }

    const testEvent: WebhookEventData = {
      type: 'task.created',
      blockNumber: '0',
      transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      data: {
        taskId: '0x0000000000000000000000000000000000000000000000000000000000000001',
        requester: '0x0000000000000000000000000000000000000000',
        reward: '1000000000000000000',
        requiredCapability: 'test',
        _test: true,
      },
    };

    return this.deliverWebhook(webhook, [testEvent]);
  }

  /**
   * Flush all pending batches
   */
  async flushAllBatches(): Promise<WebhookDeliveryResult[]> {
    const results: WebhookDeliveryResult[] = [];
    const webhookIds = Array.from(this.pendingBatches.keys());

    for (const webhookId of webhookIds) {
      const result = await this.flushBatch(webhookId);
      if (result) results.push(result);
    }

    return results;
  }

  /**
   * Export webhook configs (without secrets for portability)
   */
  exportConfigs(): Omit<WebhookConfig, 'secret'>[] {
    return Array.from(this.webhooks.values()).map(({ secret: _secret, ...rest }) => rest);
  }

  /**
   * Import webhook configs
   */
  importConfigs(configs: WebhookConfig[]): void {
    for (const config of configs) {
      this.webhooks.set(config.id, config);
    }
  }
}

/**
 * Create a new webhook manager instance
 */
export function createWebhookManager(config?: WebhookManagerConfig): WebhookManager {
  return new WebhookManager(config);
}

// ========== Integration Helpers ==========

/**
 * Create Discord webhook payload from Agent Hub events
 */
export function formatDiscordPayload(events: WebhookEventData[]): {
  content: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp: string;
  }>;
} {
  const embeds = events.slice(0, 10).map(event => {
    const colors: Record<string, number> = {
      'agent.registered': 0x00ff00,  // Green
      'task.created': 0x0099ff,       // Blue
      'task.completed': 0x00ff00,     // Green
      'task.cancelled': 0xff0000,     // Red
      'badge.awarded': 0xffd700,      // Gold
      'governance.proposal_created': 0x9900ff, // Purple
    };

    const color = colors[event.type] ?? 0x808080;

    return {
      title: `🤖 ${event.type.replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      description: `Transaction: \`${event.transactionHash.slice(0, 10)}...\``,
      color,
      fields: Object.entries(event.data)
        .filter(([k]) => !k.startsWith('_'))
        .slice(0, 5)
        .map(([name, value]) => ({
          name: name.replace(/([A-Z])/g, ' $1').trim(),
          value: String(value).slice(0, 100),
          inline: true,
        })),
      timestamp: new Date().toISOString(),
    };
  });

  return {
    content: events.length > 10 ? `Showing 10 of ${events.length} events` : '',
    embeds,
  };
}

/**
 * Create Slack webhook payload from Agent Hub events  
 */
export function formatSlackPayload(events: WebhookEventData[]): {
  text: string;
  blocks: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }>;
} {
  const blocks: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🤖 Agent Hub: ${events.length} event${events.length > 1 ? 's' : ''}`,
      },
    },
  ];

  for (const event of events.slice(0, 5)) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${event.type}*\nBlock: ${event.blockNumber} | Tx: \`${event.transactionHash.slice(0, 10)}...\``,
      },
      fields: Object.entries(event.data)
        .filter(([k]) => !k.startsWith('_'))
        .slice(0, 4)
        .map(([name, value]) => ({
          type: 'mrkdwn',
          text: `*${name}:*\n${String(value).slice(0, 50)}`,
        })),
    });
    blocks.push({ type: 'divider' });
  }

  return {
    text: `Agent Hub: ${events.length} new event${events.length > 1 ? 's' : ''}`,
    blocks,
  };
}
