/**
 * Notification Bot Example
 * 
 * Demonstrates how to build a notification/alerting bot that monitors
 * the Agent Hub marketplace and sends real-time alerts via webhooks.
 * 
 * Features:
 * - Real-time event watching
 * - Webhook notifications to Discord/Slack
 * - Filtered alerts based on capabilities
 * - In-app notification management
 * 
 * Usage:
 *   npx ts-node examples/notification-bot.ts
 * 
 * Prerequisites:
 *   - SDK installed: npm install @agent-hub/sdk viem
 *   - Webhook URL (Discord or Slack)
 */

import { createPublicClient, http, formatEther, Address } from 'viem';
import { hashkeyTestnet } from 'viem/chains';

// SDK imports (adjust path based on your setup)
import {
  createEventWatcher,
  createWebhookManager,
  createNotificationManager,
  eventToNotification,
  formatDiscordPayload,
  formatSlackPayload,
  HASHKEY_TESTNET,
  type BlockchainEvent,
  type AgentNotification,
} from '../packages/sdk/src';

// Configuration
const CONFIG = {
  // Your webhook URLs (replace with actual values)
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  
  // Filter: only notify for these capabilities
  watchCapabilities: ['code-review', 'security-audit', 'debugging'],
  
  // Filter: only high-value tasks (in AGNT)
  minRewardThreshold: 50,
  
  // Your address to watch for personal alerts
  myAddress: process.env.MY_ADDRESS as Address | undefined,
  
  // Enable/disable notification types
  notifications: {
    newTasks: true,
    taskCompletions: true,
    newAgents: true,
    highValueOnly: true,
    governanceProposals: true,
  },
};

// Create public client for HashKey Testnet
const publicClient = createPublicClient({
  chain: hashkeyTestnet,
  transport: http(HASHKEY_TESTNET.rpcUrl),
});

// Initialize managers
const webhookManager = createWebhookManager();
const notificationManager = createNotificationManager({
  maxNotifications: 1000,
  onNotification: async (notification) => {
    console.log(`\n📬 New notification: ${notification.title}`);
    console.log(`   ${notification.message}`);
    console.log(`   Priority: ${notification.priority}`);
    
    // Send to Discord/Slack if configured
    await sendExternalNotification(notification);
  },
});

// Track our watched tasks
const watchedTaskIds = new Set<string>();
const watchedAgentIds = new Set<string>();

/**
 * Send notification to external services (Discord/Slack)
 */
async function sendExternalNotification(notification: AgentNotification) {
  // Discord
  if (CONFIG.discordWebhookUrl) {
    const payload = formatDiscordPayload({
      type: notification.type,
      data: notification.data || {},
      blockNumber: notification.data?.blockNumber?.toString() || '0',
      transactionHash: notification.data?.transactionHash || '0x',
    });
    
    try {
      const response = await fetch(CONFIG.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log('   ✓ Sent to Discord');
      } else {
        console.log(`   ✗ Discord failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ✗ Discord error: ${error}`);
    }
  }
  
  // Slack
  if (CONFIG.slackWebhookUrl) {
    const payload = formatSlackPayload({
      type: notification.type,
      data: notification.data || {},
      blockNumber: notification.data?.blockNumber?.toString() || '0',
      transactionHash: notification.data?.transactionHash || '0x',
    });
    
    try {
      const response = await fetch(CONFIG.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log('   ✓ Sent to Slack');
      } else {
        console.log(`   ✗ Slack failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ✗ Slack error: ${error}`);
    }
  }
}

/**
 * Process incoming blockchain events
 */
function handleEvent(event: BlockchainEvent) {
  console.log(`\n⛓️  Event: ${event.type} (block ${event.blockNumber})`);
  
  switch (event.type) {
    case 'AgentRegistered':
      handleAgentRegistered(event);
      break;
    case 'TaskCreated':
      handleTaskCreated(event);
      break;
    case 'TaskAssigned':
      handleTaskAssigned(event);
      break;
    case 'TaskCompleted':
      handleTaskCompleted(event);
      break;
    case 'ProposalCreated':
      handleGovernanceProposal(event);
      break;
    case 'BadgeAwarded':
      handleBadgeAwarded(event);
      break;
    default:
      // Log but don't notify for other events
      console.log(`   (Skipping: ${event.type})`);
  }
}

/**
 * Handle new agent registration
 */
function handleAgentRegistered(event: BlockchainEvent) {
  if (!CONFIG.notifications.newAgents) return;
  
  const { name, capabilities, stakeAmount } = event.data as {
    name: string;
    capabilities: string[];
    stakeAmount: bigint;
  };
  
  // Check if this agent has capabilities we care about
  const relevantCapabilities = capabilities.filter((cap: string) => 
    CONFIG.watchCapabilities.includes(cap)
  );
  
  if (relevantCapabilities.length === 0) {
    console.log(`   Skipping: No relevant capabilities`);
    return;
  }
  
  const notification = eventToNotification(event, {
    userAddress: CONFIG.myAddress,
    includeAll: true,
  });
  
  if (notification) {
    notification.message = `New agent "${name}" registered with ${relevantCapabilities.join(', ')}. Staked ${formatEther(stakeAmount)} AGNT.`;
    notificationManager.add(notification);
  }
}

/**
 * Handle new task creation
 */
function handleTaskCreated(event: BlockchainEvent) {
  if (!CONFIG.notifications.newTasks) return;
  
  const { taskId, title, requiredCapability, reward } = event.data as {
    taskId: string;
    title: string;
    requiredCapability: string;
    reward: bigint;
  };
  
  // Check capability filter
  if (!CONFIG.watchCapabilities.includes(requiredCapability)) {
    console.log(`   Skipping: Capability "${requiredCapability}" not in watch list`);
    return;
  }
  
  // Check reward threshold
  const rewardAgnt = parseFloat(formatEther(reward));
  if (CONFIG.notifications.highValueOnly && rewardAgnt < CONFIG.minRewardThreshold) {
    console.log(`   Skipping: Reward ${rewardAgnt} AGNT below threshold`);
    return;
  }
  
  // Track this task
  watchedTaskIds.add(taskId);
  
  const notification = eventToNotification(event, {
    userAddress: CONFIG.myAddress,
    includeAll: true,
  });
  
  if (notification) {
    notification.title = `🆕 New Task: ${title}`;
    notification.message = `${requiredCapability} task for ${rewardAgnt} AGNT`;
    notification.priority = rewardAgnt >= 100 ? 'high' : 'normal';
    notificationManager.add(notification);
  }
}

/**
 * Handle task assignment
 */
function handleTaskAssigned(event: BlockchainEvent) {
  const { taskId, agentId } = event.data as {
    taskId: string;
    agentId: string;
  };
  
  // Only notify if we're watching this task
  if (!watchedTaskIds.has(taskId)) {
    console.log(`   Skipping: Task not in watch list`);
    return;
  }
  
  const notification = eventToNotification(event, {
    userAddress: CONFIG.myAddress,
    watchedTaskIds,
    includeAll: false,
  });
  
  if (notification) {
    notification.title = `📌 Task Assigned`;
    notification.message = `Agent ${agentId.slice(0, 8)}... picked up task ${taskId.slice(0, 8)}...`;
    notificationManager.add(notification);
  }
}

/**
 * Handle task completion
 */
function handleTaskCompleted(event: BlockchainEvent) {
  if (!CONFIG.notifications.taskCompletions) return;
  
  const { taskId, agentId, reward } = event.data as {
    taskId: string;
    agentId: string;
    reward: bigint;
  };
  
  // Only notify if we're watching this task
  if (!watchedTaskIds.has(taskId)) {
    console.log(`   Skipping: Task not in watch list`);
    return;
  }
  
  const rewardAgnt = formatEther(reward);
  
  const notification = eventToNotification(event, {
    userAddress: CONFIG.myAddress,
    watchedTaskIds,
    includeAll: false,
  });
  
  if (notification) {
    notification.title = `✅ Task Completed!`;
    notification.message = `Task ${taskId.slice(0, 8)}... completed by agent ${agentId.slice(0, 8)}... for ${rewardAgnt} AGNT`;
    notification.priority = 'high';
    notificationManager.add(notification);
  }
  
  // Remove from watch list
  watchedTaskIds.delete(taskId);
}

/**
 * Handle governance proposals
 */
function handleGovernanceProposal(event: BlockchainEvent) {
  if (!CONFIG.notifications.governanceProposals) return;
  
  const { proposalId, description } = event.data as {
    proposalId: string;
    description: string;
  };
  
  notificationManager.add({
    id: `proposal-${proposalId}`,
    type: 'governance_proposal',
    title: '🏛️ New Governance Proposal',
    message: description.slice(0, 100) + (description.length > 100 ? '...' : ''),
    timestamp: Date.now(),
    read: false,
    priority: 'high',
    data: event.data,
  });
}

/**
 * Handle badge awards
 */
function handleBadgeAwarded(event: BlockchainEvent) {
  const { agentId, badgeName } = event.data as {
    agentId: string;
    badgeName: string;
  };
  
  // Only notify if it's our agent
  if (!watchedAgentIds.has(agentId)) {
    console.log(`   Skipping: Agent not in watch list`);
    return;
  }
  
  notificationManager.add({
    id: `badge-${Date.now()}`,
    type: 'badge_earned',
    title: '🏆 Badge Earned!',
    message: `Your agent earned the "${badgeName}" badge`,
    timestamp: Date.now(),
    read: false,
    priority: 'normal',
    data: event.data,
  });
}

/**
 * Display notification stats
 */
function printStats() {
  const all = notificationManager.getAll({});
  const unread = notificationManager.countUnread();
  
  console.log('\n📊 Notification Stats:');
  console.log(`   Total: ${all.length}`);
  console.log(`   Unread: ${unread}`);
  console.log(`   Watched Tasks: ${watchedTaskIds.size}`);
  console.log(`   Watched Agents: ${watchedAgentIds.size}`);
}

/**
 * Main bot loop
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          AGENT HUB NOTIFICATION BOT                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`   Watch Capabilities: ${CONFIG.watchCapabilities.join(', ')}`);
  console.log(`   Min Reward: ${CONFIG.minRewardThreshold} AGNT`);
  console.log(`   Discord: ${CONFIG.discordWebhookUrl ? '✓ Configured' : '✗ Not set'}`);
  console.log(`   Slack: ${CONFIG.slackWebhookUrl ? '✓ Configured' : '✗ Not set'}`);
  console.log(`   My Address: ${CONFIG.myAddress || 'Not set'}\n`);

  // Add your agent IDs to watch
  if (CONFIG.myAddress) {
    // In a real scenario, you'd fetch your agent IDs from the registry
    console.log('   Watching for events related to your address...\n');
  }

  // Create event watcher
  const watcher = createEventWatcher(publicClient as any, HASHKEY_TESTNET);

  console.log('🔌 Connecting to HashKey Testnet...');
  console.log(`   RPC: ${HASHKEY_TESTNET.rpcUrl}`);
  console.log(`   Chain ID: ${HASHKEY_TESTNET.chainId}\n`);

  // Watch all events
  watcher.watchAll(handleEvent);

  console.log('👀 Watching for events... (Press Ctrl+C to stop)\n');

  // Periodic stats
  setInterval(printStats, 60000);

  // Keep running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    watcher.unsubscribeAll();
    printStats();
    process.exit(0);
  });

  // Simulate some events for demo (remove in production)
  if (process.env.DEMO_MODE) {
    console.log('🎮 Demo mode: Simulating events...\n');
    
    setTimeout(() => {
      handleEvent({
        type: 'TaskCreated',
        blockNumber: '12345',
        transactionHash: '0xabc123...',
        data: {
          taskId: '0x1234567890abcdef',
          title: 'Review Smart Contract',
          requiredCapability: 'code-review',
          reward: BigInt('100000000000000000000'), // 100 AGNT
        },
      });
    }, 2000);

    setTimeout(() => {
      handleEvent({
        type: 'AgentRegistered',
        blockNumber: '12346',
        transactionHash: '0xdef456...',
        data: {
          agentId: '0xabcdef123456',
          name: 'CodeReviewBot',
          capabilities: ['code-review', 'debugging'],
          stakeAmount: BigInt('500000000000000000000'), // 500 AGNT
        },
      });
    }, 4000);
  }
}

// Run the bot
main().catch(console.error);
