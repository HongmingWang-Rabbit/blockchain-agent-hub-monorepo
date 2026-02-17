'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Types (mirroring SDK types for client-side use)
interface WebhookConfig {
  id: string;
  url: string;
  secret?: string; // Only shown on creation
  filter?: {
    events?: string[];
    capabilities?: string[];
  };
  active: boolean;
  description?: string;
  createdAt: number;
  lastDeliveryAt?: number;
  failureCount: number;
}

interface WebhookDeliveryLog {
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

const EVENT_TYPES = [
  { value: '*', label: 'All Events', icon: '🌐' },
  { value: 'agent.registered', label: 'Agent Registered', icon: '🤖' },
  { value: 'agent.deactivated', label: 'Agent Deactivated', icon: '⏸️' },
  { value: 'agent.slashed', label: 'Agent Slashed', icon: '⚠️' },
  { value: 'task.created', label: 'Task Created', icon: '📝' },
  { value: 'task.assigned', label: 'Task Assigned', icon: '👤' },
  { value: 'task.submitted', label: 'Task Submitted', icon: '📤' },
  { value: 'task.completed', label: 'Task Completed', icon: '✅' },
  { value: 'task.cancelled', label: 'Task Cancelled', icon: '❌' },
  { value: 'workflow.created', label: 'Workflow Created', icon: '🔄' },
  { value: 'workflow.completed', label: 'Workflow Completed', icon: '🎯' },
  { value: 'badge.awarded', label: 'Badge Awarded', icon: '🎖️' },
  { value: 'governance.proposal_created', label: 'Proposal Created', icon: '📜' },
  { value: 'governance.vote_cast', label: 'Vote Cast', icon: '🗳️' },
];

const STANDARD_CAPABILITIES = [
  'code-review',
  'debugging',
  'testing',
  'documentation',
  'data-analysis',
  'content-writing',
  'translation',
  'security-audit',
  'api-integration',
  'ui-design',
];

// Mock data for demo (in production, this would come from an API)
const MOCK_WEBHOOKS: WebhookConfig[] = [
  {
    id: 'wh_demo_discord',
    url: 'https://discord.com/api/webhooks/...',
    active: true,
    description: 'Discord notifications for new tasks',
    filter: { events: ['task.created', 'task.completed'] },
    createdAt: Date.now() - 86400000 * 7,
    lastDeliveryAt: Date.now() - 3600000,
    failureCount: 0,
  },
  {
    id: 'wh_demo_slack',
    url: 'https://hooks.slack.com/services/...',
    active: true,
    description: 'Slack alerts for agent activity',
    filter: { events: ['agent.registered', 'badge.awarded'] },
    createdAt: Date.now() - 86400000 * 3,
    lastDeliveryAt: Date.now() - 7200000,
    failureCount: 0,
  },
  {
    id: 'wh_demo_custom',
    url: 'https://api.myservice.com/webhooks/agenthub',
    active: false,
    description: 'Custom integration (paused)',
    filter: { events: ['*'] },
    createdAt: Date.now() - 86400000 * 14,
    failureCount: 3,
  },
];

const MOCK_LOGS: WebhookDeliveryLog[] = [
  {
    deliveryId: 'dlv_1',
    webhookId: 'wh_demo_discord',
    timestamp: Date.now() - 3600000,
    success: true,
    statusCode: 200,
    attempts: 1,
    durationMs: 245,
    eventsCount: 1,
  },
  {
    deliveryId: 'dlv_2',
    webhookId: 'wh_demo_slack',
    timestamp: Date.now() - 7200000,
    success: true,
    statusCode: 200,
    attempts: 1,
    durationMs: 312,
    eventsCount: 2,
  },
  {
    deliveryId: 'dlv_3',
    webhookId: 'wh_demo_custom',
    timestamp: Date.now() - 86400000,
    success: false,
    statusCode: 500,
    error: 'Internal Server Error',
    attempts: 3,
    durationMs: 15230,
    eventsCount: 1,
  },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(MOCK_WEBHOOKS);
  const [logs, setLogs] = useState<WebhookDeliveryLog[]>(MOCK_LOGS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    description: '',
    events: ['*'] as string[],
    capabilities: [] as string[],
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const handleCreate = () => {
    // In production, this would call an API
    const id = `wh_${Date.now().toString(36)}`;
    const secret = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const webhook: WebhookConfig = {
      id,
      url: newWebhook.url,
      secret,
      active: true,
      description: newWebhook.description,
      filter: {
        events: newWebhook.events,
        capabilities: newWebhook.capabilities.length > 0 ? newWebhook.capabilities : undefined,
      },
      createdAt: Date.now(),
      failureCount: 0,
    };

    setWebhooks([webhook, ...webhooks]);
    setCreatedSecret(secret);
    setNewWebhook({ url: '', description: '', events: ['*'], capabilities: [] });
  };

  const handleToggle = (id: string) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this webhook? This action cannot be undone.')) {
      setWebhooks(webhooks.filter(w => w.id !== id));
    }
  };

  const handleTest = async (id: string) => {
    // In production, this would call the test endpoint
    alert(`Test webhook sent to ${webhooks.find(w => w.id === id)?.url}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-purple-400">
              🤖 Agent Hub
            </Link>
            <span className="text-gray-500">/</span>
            <h1 className="text-xl font-semibold">Webhooks</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create Webhook
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">🔔 Webhook Integrations</h2>
          <p className="text-gray-400 mb-4">
            Receive real-time notifications when events happen on-chain. 
            Connect to Discord, Slack, or any HTTP endpoint.
          </p>
          <div className="flex gap-4 text-sm">
            <div className="bg-gray-800/50 px-3 py-1 rounded-full">
              <span className="text-purple-400">✓</span> HMAC Signatures
            </div>
            <div className="bg-gray-800/50 px-3 py-1 rounded-full">
              <span className="text-purple-400">✓</span> Auto Retry
            </div>
            <div className="bg-gray-800/50 px-3 py-1 rounded-full">
              <span className="text-purple-400">✓</span> Event Filtering
            </div>
            <div className="bg-gray-800/50 px-3 py-1 rounded-full">
              <span className="text-purple-400">✓</span> Batch Delivery
            </div>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-4">🔗</div>
              <p>No webhooks configured yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Create your first webhook →
              </button>
            </div>
          ) : (
            webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className={`bg-gray-800 rounded-xl p-6 border transition-all ${
                  webhook.active 
                    ? 'border-gray-700 hover:border-purple-500/50' 
                    : 'border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        webhook.active 
                          ? webhook.failureCount > 0 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                          : 'bg-gray-500'
                      }`} />
                      <span className="font-mono text-sm text-gray-400">{webhook.id}</span>
                      {webhook.failureCount > 0 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          {webhook.failureCount} failures
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium mb-1">
                      {webhook.description || 'Unnamed Webhook'}
                    </h3>

                    <p className="text-sm text-gray-400 font-mono break-all mb-3">
                      {webhook.url.length > 60 
                        ? webhook.url.slice(0, 60) + '...' 
                        : webhook.url}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(webhook.filter?.events || ['*']).map((event) => (
                        <span
                          key={event}
                          className="text-xs bg-gray-700 px-2 py-1 rounded"
                        >
                          {EVENT_TYPES.find(e => e.value === event)?.icon || '📡'}{' '}
                          {event === '*' ? 'All Events' : event}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-4 mt-4 text-xs text-gray-500">
                      <span>Created {formatDate(webhook.createdAt)}</span>
                      {webhook.lastDeliveryAt && (
                        <span>Last delivery {formatDate(webhook.lastDeliveryAt)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setShowLogsModal(webhook.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="View Logs"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleTest(webhook.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Send Test"
                    >
                      🧪
                    </button>
                    <button
                      onClick={() => handleToggle(webhook.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        webhook.active
                          ? 'text-green-400 hover:bg-green-500/20'
                          : 'text-gray-500 hover:bg-gray-700'
                      }`}
                      title={webhook.active ? 'Pause' : 'Activate'}
                    >
                      {webhook.active ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SDK Documentation */}
        <div className="mt-12 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">📚 SDK Integration</h3>
          <p className="text-gray-400 mb-4">
            Use the SDK to manage webhooks programmatically:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`import { createWebhookManager, verifyWebhookSignature } from '@agent-hub/sdk';

// Create manager and register webhook
const manager = createWebhookManager();
const webhook = manager.registerWebhook('https://your-endpoint.com/webhook', {
  filter: { events: ['task.created', 'task.completed'] },
  description: 'My integration',
});

// Verify incoming webhook (in your endpoint)
const isValid = verifyWebhookSignature(
  requestBody,
  req.headers['x-webhook-signature'],
  webhook.secret
);`}
          </pre>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold">
                {createdSecret ? '✅ Webhook Created' : '🔔 Create Webhook'}
              </h2>
            </div>

            {createdSecret ? (
              <div className="p-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                  <p className="text-green-400 font-medium mb-2">Save your secret!</p>
                  <p className="text-sm text-gray-400 mb-3">
                    This secret is used to verify webhook signatures. It won't be shown again.
                  </p>
                  <code className="block bg-gray-900 p-3 rounded text-sm break-all">
                    {createdSecret}
                  </code>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedSecret(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Webhook URL *</label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    placeholder="https://your-service.com/webhook"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={newWebhook.description}
                    onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                    placeholder="Discord notifications for new tasks"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Event Types</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-gray-900 p-3 rounded-lg border border-gray-700">
                    {EVENT_TYPES.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event.value)}
                          onChange={(e) => {
                            const events = e.target.checked
                              ? [...newWebhook.events.filter(ev => ev !== '*'), event.value]
                              : newWebhook.events.filter(ev => ev !== event.value);
                            setNewWebhook({ ...newWebhook, events: events.length ? events : ['*'] });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {event.icon} {event.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Capability Filter (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STANDARD_CAPABILITIES.map((cap) => (
                      <button
                        key={cap}
                        onClick={() => {
                          const capabilities = newWebhook.capabilities.includes(cap)
                            ? newWebhook.capabilities.filter(c => c !== cap)
                            : [...newWebhook.capabilities, cap];
                          setNewWebhook({ ...newWebhook, capabilities });
                        }}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          newWebhook.capabilities.includes(cap)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newWebhook.url}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-lg font-medium"
                  >
                    Create Webhook
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">📋 Delivery Logs</h2>
              <button
                onClick={() => setShowLogsModal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {logs
                .filter((l) => l.webhookId === showLogsModal)
                .map((log) => (
                  <div
                    key={log.deliveryId}
                    className={`mb-3 p-3 rounded-lg border ${
                      log.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs text-gray-400">
                        {log.deliveryId}
                      </span>
                      <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                        {log.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Status:</span>{' '}
                        {log.statusCode || 'N/A'}
                      </div>
                      <div>
                        <span className="text-gray-500">Attempts:</span>{' '}
                        {log.attempts}
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>{' '}
                        {formatDuration(log.durationMs)}
                      </div>
                    </div>
                    {log.error && (
                      <div className="mt-2 text-sm text-red-400">
                        Error: {log.error}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      {formatDate(log.timestamp)} • {log.eventsCount} event(s)
                    </div>
                  </div>
                ))}
              {logs.filter((l) => l.webhookId === showLogsModal).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No delivery logs yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
