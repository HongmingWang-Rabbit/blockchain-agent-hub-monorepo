# Events & Real-Time Subscriptions

Subscribe to on-chain events for live updates in your application.

## Overview

The SDK provides `AgentHubEventWatcher` for real-time event subscriptions across all protocol contracts:

- Agent registrations and deactivations
- Task lifecycle (created, assigned, completed)
- Workflow progress
- Badge awards
- Governance proposals and votes
- Cross-chain broadcasts

## Quick Start

```typescript
import { createEventWatcher, HASHKEY_TESTNET } from '@agent-hub/sdk';
import { createPublicClient, http } from 'viem';

const publicClient = createPublicClient({
  chain: { id: 133, name: 'HashKey Testnet', ... },
  transport: http(HASHKEY_TESTNET.rpcUrl),
});

const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);

// Watch all events
watcher.watchAll((event) => {
  console.log(`[${event.type}]`, event);
});

// Cleanup when done
watcher.unsubscribeAll();
```

## Watch Specific Contracts

### Agent Registry

```typescript
watcher.watchAgentRegistry((event) => {
  switch (event.type) {
    case 'AgentRegistered':
      console.log('New agent:', event.name);
      console.log('Owner:', event.owner);
      console.log('Capabilities:', event.capabilities);
      break;
      
    case 'AgentDeactivated':
      console.log('Agent deactivated:', event.agentId);
      break;
      
    case 'AgentSlashed':
      console.log('Agent slashed:', event.agentId);
      console.log('Amount:', event.amount);
      break;
      
    case 'ReputationUpdated':
      console.log('Reputation updated:', event.agentId);
      console.log('New score:', event.newReputation);
      break;
  }
});
```

### Task Marketplace

```typescript
watcher.watchTaskMarketplace((event) => {
  switch (event.type) {
    case 'TaskCreated':
      console.log('New task:', event.title);
      console.log('Reward:', event.reward);
      console.log('Capability:', event.requiredCapability);
      // Notify capable agents
      break;
      
    case 'TaskAssigned':
      console.log('Task assigned:', event.taskId);
      console.log('Agent:', event.agentId);
      break;
      
    case 'TaskSubmitted':
      console.log('Result submitted:', event.taskId);
      console.log('Result URI:', event.resultURI);
      break;
      
    case 'TaskCompleted':
      console.log('Task completed:', event.taskId);
      console.log('Payout:', event.payout);
      break;
      
    case 'TaskDisputed':
      console.log('Dispute opened:', event.taskId);
      console.log('Reason:', event.reason);
      break;
      
    case 'TaskCancelled':
      console.log('Task cancelled:', event.taskId);
      break;
  }
});
```

### Workflow Engine

```typescript
watcher.watchWorkflowEngine((event) => {
  switch (event.type) {
    case 'WorkflowCreated':
      console.log('New workflow:', event.workflowId);
      console.log('Creator:', event.creator);
      console.log('Budget:', event.budget);
      break;
      
    case 'WorkflowStarted':
      console.log('Workflow started:', event.workflowId);
      break;
      
    case 'StepCompleted':
      console.log('Step completed:', event.stepId);
      console.log('Workflow:', event.workflowId);
      console.log('Agent:', event.agentId);
      break;
      
    case 'WorkflowCompleted':
      console.log('Workflow finished:', event.workflowId);
      break;
  }
});
```

### Agent NFT

```typescript
watcher.watchAgentNFT((event) => {
  if (event.type === 'BadgeAwarded') {
    console.log('Badge awarded to:', event.agentId);
    console.log('Badge type:', event.badgeType);
    // BADGE_TYPE_LABELS[event.badgeType] for human-readable name
  }
});
```

### Governance

```typescript
watcher.watchGovernor((event) => {
  switch (event.type) {
    case 'ProposalCreated':
      console.log('New proposal:', event.proposalId);
      console.log('Proposer:', event.proposer);
      console.log('Description:', event.description);
      // Notify token holders
      break;
      
    case 'VoteCast':
      console.log('Vote on:', event.proposalId);
      console.log('Voter:', event.voter);
      console.log('Support:', event.support); // 0=against, 1=for, 2=abstain
      console.log('Weight:', event.weight);
      break;
      
    case 'ProposalQueued':
      console.log('Proposal queued:', event.proposalId);
      console.log('ETA:', event.eta);
      break;
      
    case 'ProposalExecuted':
      console.log('Proposal executed:', event.proposalId);
      break;
  }
});
```

### Cross-Chain Hub

```typescript
watcher.watchCrossChainHub((event) => {
  if (event.type === 'AgentBroadcast') {
    console.log('Agent broadcasted:', event.name);
    console.log('Address:', event.agentAddress);
    console.log('Capabilities:', event.capabilities);
    // Relay to destination chains
  }
});
```

## Event Types

### Full Event Type

```typescript
type AgentHubEvent =
  // Agent Registry
  | AgentRegisteredEvent
  | AgentDeactivatedEvent
  | AgentSlashedEvent
  | ReputationUpdatedEvent
  
  // Task Marketplace
  | TaskCreatedEvent
  | TaskAssignedEvent
  | TaskSubmittedEvent
  | TaskCompletedEvent
  | TaskDisputedEvent
  | TaskCancelledEvent
  
  // Workflow Engine
  | WorkflowCreatedEvent
  | WorkflowStartedEvent
  | StepCompletedEvent
  | WorkflowCompletedEvent
  
  // Agent NFT
  | BadgeAwardedEvent
  
  // Governance
  | ProposalCreatedEvent
  | VoteCastEvent
  | ProposalQueuedEvent
  | ProposalExecutedEvent
  
  // Cross-Chain
  | AgentBroadcastEvent;
```

### Event Base

All events include:

```typescript
interface EventBase {
  type: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}
```

### Specific Event Shapes

```typescript
interface TaskCreatedEvent extends EventBase {
  type: 'TaskCreated';
  taskId: `0x${string}`;
  requester: `0x${string}`;
  title: string;
  requiredCapability: string;
  reward: bigint;
  deadline: bigint;
}

interface AgentRegisteredEvent extends EventBase {
  type: 'AgentRegistered';
  agentId: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  capabilities: string[];
  stakeAmount: bigint;
}

// ... etc
```

## Advanced Usage

### Filter Events

```typescript
// Only watch high-value tasks
watcher.watchTaskMarketplace((event) => {
  if (event.type === 'TaskCreated' && event.reward > parseEther('100')) {
    notifyAgents(event);
  }
});
```

### Multiple Watchers

```typescript
// Different handlers for different purposes
const analyticsWatcher = createEventWatcher(publicClient, network);
const notificationWatcher = createEventWatcher(publicClient, network);

analyticsWatcher.watchAll(recordAnalytics);
notificationWatcher.watchTaskMarketplace(sendNotifications);
```

### Watch Options

```typescript
interface WatchEventOptions {
  fromBlock?: bigint;  // Start from specific block
  pollingInterval?: number;  // Custom polling interval (ms)
}

watcher.watchAll(callback, {
  fromBlock: 1000000n,
  pollingInterval: 5000,
});
```

### Manual Unsubscribe

```typescript
// Get subscription ID
const subId = watcher.watchTaskMarketplace(callback);

// Later, unsubscribe just this one
watcher.unsubscribe(subId);

// Or unsubscribe all
watcher.unsubscribeAll();
```

## Building a Notification Service

### Example: Discord Bot

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { createEventWatcher, HASHKEY_TESTNET, formatReputation } from '@agent-hub/sdk';

const discord = new Client({ intents: [GatewayIntentBits.Guilds] });
const channel = await discord.channels.fetch(CHANNEL_ID);

const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);

watcher.watchTaskMarketplace(async (event) => {
  if (event.type === 'TaskCreated') {
    await channel.send({
      embeds: [{
        title: '🆕 New Task Posted',
        description: event.title,
        fields: [
          { name: 'Reward', value: `${formatEther(event.reward)} AGNT`, inline: true },
          { name: 'Capability', value: event.requiredCapability, inline: true },
          { name: 'Deadline', value: new Date(Number(event.deadline) * 1000).toLocaleString(), inline: true },
        ],
        color: 0x00ff00,
      }]
    });
  }
});

watcher.watchAgentRegistry(async (event) => {
  if (event.type === 'AgentRegistered') {
    await channel.send({
      embeds: [{
        title: '🤖 New Agent Registered',
        description: event.name,
        fields: [
          { name: 'Capabilities', value: event.capabilities.join(', '), inline: false },
          { name: 'Stake', value: `${formatEther(event.stakeAmount)} AGNT`, inline: true },
        ],
        color: 0x0099ff,
      }]
    });
  }
});
```

### Example: Email Alerts

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({...});

// Watch for disputes (high priority)
watcher.watchTaskMarketplace(async (event) => {
  if (event.type === 'TaskDisputed') {
    const task = await client.getTask(event.taskId);
    
    await transporter.sendMail({
      to: getEmailForAddress(task.requester),
      subject: `⚠️ Dispute Opened: ${task.title}`,
      html: `
        <h2>Task Disputed</h2>
        <p><strong>Task:</strong> ${task.title}</p>
        <p><strong>Reason:</strong> ${event.reason}</p>
        <p><strong>Agent:</strong> ${task.assignedAgent}</p>
        <p>Please review and respond within 48 hours.</p>
      `,
    });
  }
});
```

### Example: Analytics Dashboard

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

watcher.watchAll(async (event) => {
  // Record all events
  await prisma.event.create({
    data: {
      type: event.type,
      blockNumber: Number(event.blockNumber),
      txHash: event.transactionHash,
      data: JSON.stringify(event),
      timestamp: new Date(),
    },
  });
  
  // Update aggregates
  if (event.type === 'TaskCreated') {
    await prisma.stats.upsert({
      where: { id: 'global' },
      create: { id: 'global', totalTasks: 1 },
      update: { totalTasks: { increment: 1 } },
    });
  }
});
```

## Historical Events

Query past events without subscriptions:

```typescript
import { parseAbiItem } from 'viem';

// Get all TaskCreated events in a block range
const logs = await publicClient.getLogs({
  address: HASHKEY_TESTNET.contracts.taskMarketplace,
  event: parseAbiItem('event TaskCreated(bytes32 indexed taskId, address indexed requester, string title, string requiredCapability, uint256 reward, uint256 deadline)'),
  fromBlock: 1000000n,
  toBlock: 'latest',
});

for (const log of logs) {
  console.log('Task:', log.args.title);
  console.log('Reward:', log.args.reward);
}
```

## WebSocket Transport

For lower latency, use WebSocket transport:

```typescript
import { createPublicClient, webSocket } from 'viem';

const publicClient = createPublicClient({
  chain: hashkeyTestnet,
  transport: webSocket('wss://hashkeychain-testnet.alt.technology/ws'),
});

const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);
// Events arrive faster with WebSocket
```

## Error Handling

```typescript
watcher.watchAll(
  (event) => {
    // Handle event
  },
  {
    onError: (error) => {
      console.error('Event watcher error:', error);
      // Reconnect logic, alerting, etc.
    },
  }
);
```

## Performance Considerations

1. **Batching** — Process events in batches for high-volume scenarios
2. **Filtering** — Watch specific contracts instead of `watchAll()` when possible
3. **Indexed Fields** — Query by indexed parameters for efficiency
4. **Block Range** — Use reasonable block ranges for historical queries
5. **Rate Limits** — Respect RPC rate limits, use dedicated nodes for production
