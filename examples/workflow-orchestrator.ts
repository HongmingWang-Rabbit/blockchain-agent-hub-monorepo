/**
 * Workflow Orchestrator Example
 * 
 * This example demonstrates how to:
 * 1. Create a multi-step workflow
 * 2. Chain multiple agents together
 * 3. Track workflow progress
 * 4. Handle step dependencies
 * 
 * Use case: Data Processing Pipeline
 * - Step 1: Data Extraction (data-extraction capability)
 * - Step 2: Data Cleaning (data-analysis capability)  
 * - Step 3: Report Generation (documentation capability)
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node examples/workflow-orchestrator.ts
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
const WORKFLOW_BUDGET = parseEther('500'); // Total budget: 500 AGNT

interface WorkflowStep {
  name: string;
  description: string;
  capability: string;
  reward: bigint;
  dependencies: number[]; // Indices of dependent steps
}

// Define the workflow steps
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    name: 'Extract Data',
    description: 'Pull data from source APIs and databases',
    capability: 'data-extraction',
    reward: parseEther('150'),
    dependencies: [],
  },
  {
    name: 'Clean & Transform',
    description: 'Clean, validate, and transform the extracted data',
    capability: 'data-analysis',
    reward: parseEther('200'),
    dependencies: [0], // Depends on step 0
  },
  {
    name: 'Generate Report',
    description: 'Create a comprehensive report with visualizations',
    capability: 'documentation',
    reward: parseEther('150'),
    dependencies: [1], // Depends on step 1
  },
];

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

const client = new AgentHubClient({
  network: HASHKEY_TESTNET,
  publicClient,
  walletClient,
  account,
});

// Track workflow state
let workflowId: `0x${string}` | null = null;
const stepIds: `0x${string}`[] = [];

/**
 * Create the workflow and add steps
 */
async function createWorkflow(): Promise<void> {
  console.log('📋 Creating workflow: Data Processing Pipeline\n');
  
  // Approve tokens for workflow budget
  const tokenAddress = HASHKEY_TESTNET.addresses.agntToken;
  const workflowEngineAddress = HASHKEY_TESTNET.addresses.workflowEngine;
  
  console.log('  Approving budget...');
  await client.approveToken(tokenAddress, workflowEngineAddress, WORKFLOW_BUDGET);
  
  // Calculate deadline (7 days from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
  
  // Create the workflow
  console.log('  Creating workflow...');
  const { hash, workflowId: wfId } = await client.createWorkflow({
    name: 'Data Processing Pipeline',
    description: 'Extract, transform, and report on data',
    budget: WORKFLOW_BUDGET,
    deadline,
  });
  
  workflowId = wfId;
  console.log(`  ✅ Workflow created: ${workflowId}`);
  console.log(`     Budget: ${formatEther(WORKFLOW_BUDGET)} AGNT`);
  console.log(`     TX: ${hash}\n`);
  
  // Add steps to the workflow
  console.log('📝 Adding steps:\n');
  
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    const step = WORKFLOW_STEPS[i];
    const dependencyIds = step.dependencies.map((idx) => stepIds[idx]);
    
    console.log(`  Step ${i + 1}: ${step.name}`);
    console.log(`    Capability: ${step.capability}`);
    console.log(`    Reward: ${formatEther(step.reward)} AGNT`);
    console.log(`    Dependencies: ${step.dependencies.length === 0 ? 'None' : step.dependencies.map(d => `Step ${d + 1}`).join(', ')}`);
    
    const { stepId } = await client.addWorkflowStep(workflowId, {
      name: step.name,
      requiredCapability: step.capability,
      reward: step.reward,
      timeout: 0, // Use default
      dependencies: dependencyIds,
      inputDataHash: '',
    });
    
    stepIds.push(stepId);
    console.log(`    ✅ Added: ${stepId}\n`);
  }
}

/**
 * Start the workflow execution
 */
async function startWorkflow(): Promise<void> {
  if (!workflowId) throw new Error('Workflow not created');
  
  console.log('🚀 Starting workflow execution...');
  const hash = await client.startWorkflow(workflowId);
  console.log(`  ✅ Workflow started: ${hash}\n`);
}

/**
 * Watch for workflow progress events
 */
function watchProgress(): void {
  console.log('👀 Watching for progress...\n');
  console.log('═══════════════════════════════════════════════');
  console.log('                 WORKFLOW EVENTS               ');
  console.log('═══════════════════════════════════════════════\n');
  
  const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);
  
  watcher.watchWorkflowEngine((event: AgentHubEvent) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (event.type) {
      case 'StepAccepted':
        if (event.workflowId === workflowId) {
          const stepIndex = stepIds.findIndex((id) => id === event.stepId);
          const stepName = WORKFLOW_STEPS[stepIndex]?.name || 'Unknown';
          console.log(`[${timestamp}] 🤖 Step "${stepName}" accepted by agent ${event.agentId?.slice(0, 10)}...`);
        }
        break;
        
      case 'StepCompleted':
        if (event.workflowId === workflowId) {
          const stepIndex = stepIds.findIndex((id) => id === event.stepId);
          const stepName = WORKFLOW_STEPS[stepIndex]?.name || 'Unknown';
          console.log(`[${timestamp}] ✅ Step "${stepName}" completed!`);
          console.log(`            Result: ${event.resultHash}`);
          console.log(`            Reward paid: ${formatEther(WORKFLOW_STEPS[stepIndex]?.reward || 0n)} AGNT\n`);
        }
        break;
        
      case 'WorkflowCompleted':
        if (event.workflowId === workflowId) {
          console.log('\n═══════════════════════════════════════════════');
          console.log('        🎉 WORKFLOW COMPLETED SUCCESSFULLY!     ');
          console.log('═══════════════════════════════════════════════\n');
          console.log(`  Total budget used: ${formatEther(event.totalPaid as bigint || 0n)} AGNT`);
          console.log(`  Refunded: ${formatEther(WORKFLOW_BUDGET - (event.totalPaid as bigint || 0n))} AGNT\n`);
          process.exit(0);
        }
        break;
        
      case 'WorkflowCancelled':
        if (event.workflowId === workflowId) {
          console.log(`[${timestamp}] ❌ Workflow cancelled. Refunded: ${formatEther(event.refundedAmount as bigint || 0n)} AGNT`);
          process.exit(1);
        }
        break;
    }
  });
  
  console.log('Waiting for agents to pick up steps...\n');
  console.log('(Steps will be executed in order of dependencies)\n');
}

/**
 * Get current workflow status
 */
async function printStatus(): Promise<void> {
  if (!workflowId) return;
  
  const workflow = await client.getWorkflow(workflowId);
  if (!workflow) return;
  
  console.log('\n📊 Workflow Status:');
  console.log(`   Name: ${workflow.name}`);
  console.log(`   Status: ${getStatusName(workflow.status)}`);
  console.log(`   Steps: ${workflow.totalSteps}`);
  console.log(`   Completed: ${workflow.completedSteps}`);
  console.log(`   Budget: ${formatEther(workflow.totalBudget)} AGNT`);
  console.log(`   Spent: ${formatEther(workflow.spentBudget)} AGNT\n`);
}

function getStatusName(status: number): string {
  const names = ['Draft', 'Active', 'Completed', 'Cancelled'];
  return names[status] || 'Unknown';
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('     🔄 Agent Hub - Workflow Orchestrator       ');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log(`Wallet: ${account.address}`);
  console.log(`Network: HashKey Testnet\n`);
  
  // Check AGNT balance
  const balance = await client.getTokenBalance(account.address);
  console.log(`AGNT Balance: ${formatEther(balance)}\n`);
  
  if (balance < WORKFLOW_BUDGET) {
    console.error(`❌ Insufficient balance. Need ${formatEther(WORKFLOW_BUDGET)} AGNT`);
    process.exit(1);
  }
  
  // Create the workflow
  await createWorkflow();
  
  // Start watching for events
  watchProgress();
  
  // Start the workflow
  await startWorkflow();
  
  // Print initial status
  await printStatus();
  
  console.log('Press Ctrl+C to exit (workflow will continue running)\n');
}

// Run
main().catch(console.error);
