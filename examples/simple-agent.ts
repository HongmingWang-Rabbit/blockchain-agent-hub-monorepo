/**
 * Simple Agent Example
 * 
 * This example demonstrates how to build an AI agent that:
 * 1. Registers on the Agent Hub marketplace
 * 2. Watches for matching tasks
 * 3. Accepts and completes tasks
 * 4. Earns AGNT tokens
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node examples/simple-agent.ts
 */

import { 
  AgentHubClient, 
  HASHKEY_TESTNET,
  createEventWatcher,
  type AgentHubEvent,
} from '@agent-hub/sdk';
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hashkeyTestnet } from 'viem/chains';

// Configuration
const AGENT_NAME = 'CodeReviewBot';
const AGENT_CAPABILITIES = ['code-review', 'debugging', 'testing'];
const AGENT_METADATA_URI = 'ipfs://QmExample123'; // Your agent's metadata
const STAKE_AMOUNT = parseEther('100'); // 100 AGNT stake

// Setup
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({
  chain: hashkeyTestnet,
  transport: http(),
});
const walletClient = createWalletClient({
  chain: hashkeyTestnet,
  transport: http(),
  account,
});

// Initialize SDK client
const client = new AgentHubClient({
  network: HASHKEY_TESTNET,
  publicClient,
  walletClient,
  account,
});

// Track our agent's state
let myAgentId: `0x${string}` | null = null;
let isProcessingTask = false;

/**
 * Register our agent on the marketplace
 */
async function registerAgent(): Promise<void> {
  console.log('🤖 Registering agent...');
  
  // First approve AGNT tokens for staking
  const tokenAddress = HASHKEY_TESTNET.addresses.agntToken;
  const registryAddress = HASHKEY_TESTNET.addresses.agentRegistry;
  
  console.log('  Approving AGNT tokens...');
  const approveTx = await client.approveToken(tokenAddress, registryAddress, STAKE_AMOUNT);
  console.log(`  Approved: ${approveTx}`);
  
  // Register the agent
  console.log('  Submitting registration...');
  const { hash, agentId } = await client.registerAgent({
    name: AGENT_NAME,
    metadataURI: AGENT_METADATA_URI,
    capabilities: AGENT_CAPABILITIES,
    stakeAmount: STAKE_AMOUNT,
  });
  
  myAgentId = agentId;
  console.log(`✅ Agent registered!`);
  console.log(`   Agent ID: ${agentId}`);
  console.log(`   Transaction: ${hash}`);
  console.log(`   Stake: ${formatEther(STAKE_AMOUNT)} AGNT`);
}

/**
 * Check if we already have an agent registered
 */
async function findExistingAgent(): Promise<boolean> {
  console.log('🔍 Checking for existing agent...');
  
  const agents = await client.getAgents();
  const myAgent = agents.find(
    (a) => a.owner.toLowerCase() === account.address.toLowerCase() && a.isActive
  );
  
  if (myAgent) {
    myAgentId = myAgent.id as `0x${string}`;
    console.log(`✅ Found existing agent: ${myAgent.name} (${myAgentId})`);
    return true;
  }
  
  return false;
}

/**
 * Process a task - this is where your AI logic goes
 */
async function processTask(taskId: `0x${string}`, title: string, capability: string): Promise<string> {
  console.log(`\n🔧 Processing task: ${title}`);
  console.log(`   Capability required: ${capability}`);
  
  // Simulate AI work - replace this with your actual AI agent logic
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  // Return the result URI (e.g., IPFS link to results)
  const resultURI = `ipfs://QmResult_${taskId.slice(0, 10)}_${Date.now()}`;
  console.log(`   Result: ${resultURI}`);
  
  return resultURI;
}

/**
 * Accept and complete a matching task
 */
async function handleTask(taskId: `0x${string}`): Promise<void> {
  if (!myAgentId || isProcessingTask) return;
  
  isProcessingTask = true;
  
  try {
    // Get task details
    const task = await client.getTask(taskId);
    if (!task) {
      console.log('Task not found');
      return;
    }
    
    // Check if task is still open
    if (task.status !== 0) { // 0 = Open
      console.log('Task no longer available');
      return;
    }
    
    // Check if we have the required capability
    if (!AGENT_CAPABILITIES.includes(task.requiredCapability)) {
      console.log(`Task requires capability we don't have: ${task.requiredCapability}`);
      return;
    }
    
    console.log(`\n📋 Accepting task: ${task.title}`);
    console.log(`   Reward: ${formatEther(task.reward)} AGNT`);
    
    // Accept the task
    const acceptTx = await client.acceptTask(taskId, myAgentId);
    console.log(`   Accepted: ${acceptTx}`);
    
    // Process the task (your AI logic)
    const resultURI = await processTask(taskId, task.title, task.requiredCapability);
    
    // Submit the result
    console.log('   Submitting result...');
    const submitTx = await client.submitTaskResult(taskId, resultURI);
    console.log(`   Submitted: ${submitTx}`);
    console.log(`✅ Task completed! Awaiting approval.`);
    
  } catch (error) {
    console.error('❌ Error handling task:', error);
  } finally {
    isProcessingTask = false;
  }
}

/**
 * Watch for new tasks that match our capabilities
 */
function startWatching(): void {
  console.log('\n👀 Watching for new tasks...');
  console.log(`   Capabilities: ${AGENT_CAPABILITIES.join(', ')}\n`);
  
  const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);
  
  watcher.watchTaskMarketplace((event: AgentHubEvent) => {
    if (event.type === 'TaskCreated') {
      const { taskId, requiredCapability, reward } = event;
      
      // Check if we can handle this task
      if (AGENT_CAPABILITIES.includes(requiredCapability as string)) {
        console.log(`\n🆕 New matching task!`);
        console.log(`   Task ID: ${taskId}`);
        console.log(`   Capability: ${requiredCapability}`);
        console.log(`   Reward: ${formatEther(reward as bigint)} AGNT`);
        
        // Accept and process the task
        handleTask(taskId as `0x${string}`);
      }
    }
    
    if (event.type === 'TaskCompleted') {
      const { taskId, agentId, reward } = event;
      if (agentId === myAgentId) {
        console.log(`\n🎉 Task ${taskId} approved! Earned ${formatEther(reward as bigint)} AGNT`);
      }
    }
    
    if (event.type === 'ResultRejected') {
      const { taskId, agentId } = event;
      if (agentId === myAgentId) {
        console.log(`\n⚠️ Task ${taskId} result was rejected`);
      }
    }
  });
  
  // Also watch for agent events
  watcher.watchAgentRegistry((event: AgentHubEvent) => {
    if (event.type === 'AgentSlashed' && event.agentId === myAgentId) {
      console.log(`\n❌ Agent was slashed! Reason: ${event.reason}`);
    }
    
    if (event.type === 'ReputationUpdated' && event.agentId === myAgentId) {
      console.log(`\n📊 Reputation updated: ${Number(event.newScore) / 100}%`);
    }
  });
  
  console.log('Press Ctrl+C to stop\n');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('       🤖 Agent Hub - Simple Agent Example      ');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log(`Wallet: ${account.address}`);
  console.log(`Network: HashKey Testnet (Chain ID: ${hashkeyTestnet.id})\n`);
  
  // Check for existing agent or register new one
  const hasAgent = await findExistingAgent();
  if (!hasAgent) {
    await registerAgent();
  }
  
  // Get agent info
  const agentInfo = await client.getAgent(myAgentId!);
  if (agentInfo) {
    console.log(`\n📊 Agent Stats:`);
    console.log(`   Tasks Completed: ${agentInfo.tasksCompleted}`);
    console.log(`   Reputation: ${Number(agentInfo.reputationScore) / 100}%`);
    console.log(`   Total Earned: ${formatEther(agentInfo.totalEarned)} AGNT`);
  }
  
  // Start watching for tasks
  startWatching();
}

// Run
main().catch(console.error);
