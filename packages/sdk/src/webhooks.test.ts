import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebhookManager,
  createWebhookManager,
  generateWebhookSecret,
  generateWebhookId,
  createWebhookSignature,
  verifyWebhookSignature,
  eventToWebhookType,
  eventToWebhookData,
  matchesFilter,
  formatDiscordPayload,
  formatSlackPayload,
  type WebhookFilter,
  type WebhookEventData,
} from './webhooks';
import type { AgentHubEvent, TaskCreatedEvent, AgentRegisteredEvent } from './events';

// Mock crypto for consistent testing
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  let counter = 0;
  return {
    ...actual,
    randomBytes: (size: number) => {
      counter++;
      // Return predictable bytes for testing
      const bytes = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        bytes[i] = (counter + i) % 256;
      }
      return bytes;
    },
  };
});

describe('Webhook Utilities', () => {
  describe('generateWebhookSecret', () => {
    it('generates a 64-character hex string', () => {
      const secret = generateWebhookSecret();
      expect(secret).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });
  });

  describe('generateWebhookId', () => {
    it('generates ID with wh_ prefix', () => {
      const id = generateWebhookId();
      expect(id).toMatch(/^wh_[0-9a-f]{32}$/);
    });
  });

  describe('createWebhookSignature / verifyWebhookSignature', () => {
    it('creates verifiable signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret-key';
      const signature = createWebhookSignature(payload, secret);

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('rejects invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret-key';
      const wrongSignature = 'wrong-signature';

      expect(verifyWebhookSignature(payload, wrongSignature, secret)).toBe(false);
    });

    it('rejects modified payload', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret-key';
      const signature = createWebhookSignature(payload, secret);
      const modifiedPayload = JSON.stringify({ test: 'modified' });

      expect(verifyWebhookSignature(modifiedPayload, signature, secret)).toBe(false);
    });
  });

  describe('eventToWebhookType', () => {
    it('maps event types correctly', () => {
      const testCases: [Partial<AgentHubEvent>, string][] = [
        [{ type: 'AgentRegistered' }, 'agent.registered'],
        [{ type: 'TaskCreated' }, 'task.created'],
        [{ type: 'TaskCompleted' }, 'task.completed'],
        [{ type: 'WorkflowCreated' }, 'workflow.created'],
        [{ type: 'BadgeAwarded' }, 'badge.awarded'],
        [{ type: 'ProposalCreated' }, 'governance.proposal_created'],
        [{ type: 'AgentBroadcast' }, 'crosschain.agent_broadcast'],
      ];

      for (const [event, expected] of testCases) {
        expect(eventToWebhookType(event as AgentHubEvent)).toBe(expected);
      }
    });
  });

  describe('eventToWebhookData', () => {
    it('converts event to webhook data', () => {
      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 1000000000000000000n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const data = eventToWebhookData(event);

      expect(data.type).toBe('task.created');
      expect(data.blockNumber).toBe('12345');
      expect(data.transactionHash).toBe('0xdef456');
      expect(data.data.taskId).toBe('0x1234');
      expect(data.data.reward).toBe('1000000000000000000'); // BigInt converted to string
    });
  });
});

describe('Filter Matching', () => {
  const taskEvent: TaskCreatedEvent = {
    type: 'TaskCreated',
    taskId: '0x1234',
    requester: '0xabcd',
    reward: 100000000000000000000n, // 100 tokens
    requiredCapability: 'code-review',
    blockNumber: 12345n,
    transactionHash: '0xdef456',
  };

  const agentEvent: AgentRegisteredEvent = {
    type: 'AgentRegistered',
    agentId: '0x5678',
    owner: '0xowner',
    name: 'TestAgent',
    blockNumber: 12346n,
    transactionHash: '0xabc123',
  };

  it('matches when no filter', () => {
    expect(matchesFilter(taskEvent)).toBe(true);
  });

  it('matches when filter is empty', () => {
    expect(matchesFilter(taskEvent, {})).toBe(true);
  });

  describe('event type filter', () => {
    it('matches specific event type', () => {
      const filter: WebhookFilter = { events: ['task.created'] };
      expect(matchesFilter(taskEvent, filter)).toBe(true);
    });

    it('rejects non-matching event type', () => {
      const filter: WebhookFilter = { events: ['task.completed'] };
      expect(matchesFilter(taskEvent, filter)).toBe(false);
    });

    it('matches wildcard', () => {
      const filter: WebhookFilter = { events: ['*'] };
      expect(matchesFilter(taskEvent, filter)).toBe(true);
    });

    it('matches any in list', () => {
      const filter: WebhookFilter = { events: ['task.completed', 'task.created'] };
      expect(matchesFilter(taskEvent, filter)).toBe(true);
    });
  });

  describe('capability filter', () => {
    it('matches required capability', () => {
      const filter: WebhookFilter = { capabilities: ['code-review'] };
      expect(matchesFilter(taskEvent, filter)).toBe(true);
    });

    it('rejects non-matching capability', () => {
      const filter: WebhookFilter = { capabilities: ['debugging'] };
      expect(matchesFilter(taskEvent, filter)).toBe(false);
    });
  });

  describe('minimum reward filter', () => {
    it('matches when reward exceeds minimum', () => {
      const filter: WebhookFilter = { minReward: 50000000000000000000n }; // 50 tokens
      expect(matchesFilter(taskEvent, filter)).toBe(true);
    });

    it('rejects when reward below minimum', () => {
      const filter: WebhookFilter = { minReward: 200000000000000000000n }; // 200 tokens
      expect(matchesFilter(taskEvent, filter)).toBe(false);
    });
  });

  describe('agent ID filter', () => {
    it('matches when agent ID in filter', () => {
      const filter: WebhookFilter = { agentIds: ['0x5678'] };
      expect(matchesFilter(agentEvent, filter)).toBe(true);
    });

    it('rejects when agent ID not in filter', () => {
      const filter: WebhookFilter = { agentIds: ['0x9999'] };
      expect(matchesFilter(agentEvent, filter)).toBe(false);
    });
  });
});

describe('WebhookManager', () => {
  let manager: WebhookManager;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    manager = createWebhookManager({
      fetch: mockFetch,
      defaultRetry: {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      },
      timeoutMs: 1000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWebhook', () => {
    it('registers webhook with defaults', () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');

      expect(webhook.id).toMatch(/^wh_/);
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.secret).toHaveLength(64);
      expect(webhook.active).toBe(true);
      expect(webhook.failureCount).toBe(0);
    });

    it('registers webhook with filter', () => {
      const webhook = manager.registerWebhook('https://example.com/webhook', {
        filter: { events: ['task.created'] },
        description: 'Task notifications',
      });

      expect(webhook.filter?.events).toContain('task.created');
      expect(webhook.description).toBe('Task notifications');
    });
  });

  describe('getWebhook / listWebhooks', () => {
    it('retrieves webhook by ID', () => {
      const registered = manager.registerWebhook('https://example.com/webhook');
      const retrieved = manager.getWebhook(registered.id);

      expect(retrieved).toEqual(registered);
    });

    it('returns undefined for unknown ID', () => {
      expect(manager.getWebhook('unknown')).toBeUndefined();
    });

    it('lists all webhooks', () => {
      manager.registerWebhook('https://example.com/1');
      manager.registerWebhook('https://example.com/2');

      const list = manager.listWebhooks();
      expect(list).toHaveLength(2);
    });
  });

  describe('updateWebhook', () => {
    it('updates webhook properties', () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');
      const updated = manager.updateWebhook(webhook.id, { active: false });

      expect(updated?.active).toBe(false);
      expect(manager.getWebhook(webhook.id)?.active).toBe(false);
    });

    it('returns undefined for unknown ID', () => {
      expect(manager.updateWebhook('unknown', { active: false })).toBeUndefined();
    });
  });

  describe('deleteWebhook', () => {
    it('deletes webhook', () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');
      expect(manager.deleteWebhook(webhook.id)).toBe(true);
      expect(manager.getWebhook(webhook.id)).toBeUndefined();
    });

    it('returns false for unknown ID', () => {
      expect(manager.deleteWebhook('unknown')).toBe(false);
    });
  });

  describe('rotateSecret', () => {
    it('generates new secret', () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');
      const oldSecret = webhook.secret;
      const newSecret = manager.rotateSecret(webhook.id);

      expect(newSecret).not.toBe(oldSecret);
      expect(manager.getWebhook(webhook.id)?.secret).toBe(newSecret);
    });
  });

  describe('dispatchEvent', () => {
    it('delivers to matching webhooks', async () => {
      manager.registerWebhook('https://example.com/webhook');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const results = await manager.dispatchEvent(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('skips inactive webhooks', async () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');
      manager.updateWebhook(webhook.id, { active: false });

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const results = await manager.dispatchEvent(event);

      expect(results).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips webhooks that do not match filter', async () => {
      manager.registerWebhook('https://example.com/webhook', {
        filter: { events: ['agent.registered'] },
      });

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const results = await manager.dispatchEvent(event);

      expect(results).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('includes correct headers', async () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      await manager.dispatchEvent(event);

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['X-Webhook-Id']).toBe(webhook.id);
      expect(call[1].headers['X-Webhook-Signature']).toBeDefined();
      expect(call[1].headers['X-Webhook-Timestamp']).toBeDefined();
      expect(call[1].headers['Content-Type']).toBe('application/json');
    });

    it('retries on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      manager.registerWebhook('https://example.com/webhook');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const results = await manager.dispatchEvent(event);

      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('reports failure after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      manager.registerWebhook('https://example.com/webhook');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      const results = await manager.dispatchEvent(event);

      expect(results[0].success).toBe(false);
      expect(results[0].attempts).toBe(2);
      expect(results[0].error).toBe('Network error');
    });
  });

  describe('testWebhook', () => {
    it('sends test event', async () => {
      const webhook = manager.registerWebhook('https://example.com/webhook');
      const result = await manager.testWebhook(webhook.id);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].data._test).toBe(true);
    });

    it('returns error for unknown webhook', async () => {
      const result = await manager.testWebhook('unknown');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Webhook not found');
    });
  });

  describe('getDeliveryLogs', () => {
    it('returns delivery logs', async () => {
      manager.registerWebhook('https://example.com/webhook');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      await manager.dispatchEvent(event);

      const logs = manager.getDeliveryLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(true);
    });

    it('filters by webhook ID', async () => {
      const webhook1 = manager.registerWebhook('https://example.com/1');
      manager.registerWebhook('https://example.com/2');

      const event: TaskCreatedEvent = {
        type: 'TaskCreated',
        taskId: '0x1234',
        requester: '0xabcd',
        reward: 100n,
        requiredCapability: 'code-review',
        blockNumber: 12345n,
        transactionHash: '0xdef456',
      };

      await manager.dispatchEvent(event);

      const logs = manager.getDeliveryLogs({ webhookId: webhook1.id });
      expect(logs).toHaveLength(1);
    });
  });
});

describe('Integration Helpers', () => {
  const sampleEvents: WebhookEventData[] = [
    {
      type: 'task.created',
      blockNumber: '12345',
      transactionHash: '0xabcdef1234567890',
      data: {
        taskId: '0x1234',
        reward: '100000000000000000000',
        requiredCapability: 'code-review',
      },
    },
    {
      type: 'agent.registered',
      blockNumber: '12346',
      transactionHash: '0xfedcba0987654321',
      data: {
        agentId: '0x5678',
        name: 'TestAgent',
      },
    },
  ];

  describe('formatDiscordPayload', () => {
    it('creates valid Discord payload', () => {
      const payload = formatDiscordPayload(sampleEvents);

      expect(payload.embeds).toHaveLength(2);
      expect(payload.embeds[0].title).toContain('Task Created');
      expect(payload.embeds[0].color).toBe(0x0099ff); // Blue for task.created
      expect(payload.embeds[1].title).toContain('Agent Registered');
      expect(payload.embeds[1].color).toBe(0x00ff00); // Green for agent.registered
    });

    it('limits embeds to 10', () => {
      const manyEvents = Array(15).fill(sampleEvents[0]);
      const payload = formatDiscordPayload(manyEvents);

      expect(payload.embeds).toHaveLength(10);
      expect(payload.content).toContain('10 of 15');
    });
  });

  describe('formatSlackPayload', () => {
    it('creates valid Slack payload', () => {
      const payload = formatSlackPayload(sampleEvents);

      expect(payload.text).toContain('2 new event');
      expect(payload.blocks[0].type).toBe('header');
      expect(payload.blocks[1].type).toBe('section');
    });

    it('limits to 5 events', () => {
      const manyEvents = Array(10).fill(sampleEvents[0]);
      const payload = formatSlackPayload(manyEvents);

      // Header + (5 sections + 5 dividers) = 11 blocks
      const sectionCount = payload.blocks.filter(b => b.type === 'section').length;
      expect(sectionCount).toBe(5);
    });
  });
});
