#!/usr/bin/env node
import { Command } from 'commander';
import { createPublicClient, createWalletClient, http, formatEther, parseEther, type Address, type Hash, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hashkeyTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import {
  AGNTTokenABI,
  AgentRegistryABI,
  TaskMarketplaceABI,
  AgentNFTABI,
  WorkflowEngineABI,
  DynamicPricingABI,
  CrossChainHubABI,
  GovernorAgentABI,
  TreasuryABI,
} from './abis/index.js';

dotenv.config();

// Contract addresses (HashKey Testnet)
const CONTRACTS = {
  agntToken: '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as Address,
  agentRegistry: '0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49' as Address,
  taskMarketplace: '0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061' as Address,
  agentNFT: '0x4476e726B4030923bD29C98F8881Da2727B6a0B6' as Address,
  workflowEngine: '0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd' as Address,
  dynamicPricing: '0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3' as Address,
  crossChainHub: '0x6349F97FEeb19D9646a34f81904b50bB704FAD08' as Address,
  governor: '0x626496716673bb5E7F2634d2eBc96ae0697713a4' as Address,
  treasury: '0xdc454EfAa5eEBF4D6786750f664bCff461C68b33' as Address,
};

// Create clients
function getPublicClient() {
  return createPublicClient({
    chain: hashkeyTestnet,
    transport: http(process.env.RPC_URL || 'https://hashkeychain-testnet.alt.technology'),
  });
}

function getWalletClient() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error(chalk.red('Error: PRIVATE_KEY environment variable not set'));
    console.error(chalk.yellow('Set it in .env file or export PRIVATE_KEY=0x...'));
    process.exit(1);
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: hashkeyTestnet,
    transport: http(process.env.RPC_URL || 'https://hashkeychain-testnet.alt.technology'),
  });
}

// CLI Program
const program = new Command();

program
  .name('agent-hub')
  .description('CLI for Blockchain Agent Hub on HashKey Chain')
  .version('0.1.0');

// ============ Token Commands ============
const tokenCmd = program.command('token').description('AGNT token operations');

tokenCmd
  .command('balance <address>')
  .description('Get AGNT token balance')
  .action(async (address: string) => {
    const spinner = ora('Fetching balance...').start();
    try {
      const client = getPublicClient();
      const balance = await client.readContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'balanceOf',
        args: [address as Address],
      });
      spinner.succeed(chalk.green(`Balance: ${formatEther(balance as bigint)} AGNT`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

tokenCmd
  .command('transfer <to> <amount>')
  .description('Transfer AGNT tokens')
  .action(async (to: string, amount: string) => {
    const spinner = ora('Sending transaction...').start();
    try {
      const wallet = getWalletClient();
      const hash = await wallet.writeContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'transfer',
        args: [to as Address, parseEther(amount)],
      });
      spinner.succeed(chalk.green(`Transaction sent: ${hash}`));
      console.log(chalk.cyan(`Explorer: https://hashkeychain-testnet-explorer.alt.technology/tx/${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

tokenCmd
  .command('approve <spender> <amount>')
  .description('Approve AGNT spending')
  .action(async (spender: string, amount: string) => {
    const spinner = ora('Approving...').start();
    try {
      const wallet = getWalletClient();
      const hash = await wallet.writeContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'approve',
        args: [spender as Address, parseEther(amount)],
      });
      spinner.succeed(chalk.green(`Approved: ${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Agent Commands ============
const agentCmd = program.command('agent').description('Agent registry operations');

agentCmd
  .command('list')
  .description('List all registered agents')
  .action(async () => {
    const spinner = ora('Fetching agents...').start();
    try {
      const client = getPublicClient();
      const count = await client.readContract({
        address: CONTRACTS.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'getAgentCount',
      }) as bigint;

      spinner.stop();
      console.log(chalk.cyan(`\n📊 Total Agents: ${count}\n`));

      for (let i = 0n; i < count && i < 10n; i++) {
        const agentId = await client.readContract({
          address: CONTRACTS.agentRegistry,
          abi: AgentRegistryABI,
          functionName: 'allAgentIds',
          args: [i],
        }) as `0x${string}`;

        const agent = await client.readContract({
          address: CONTRACTS.agentRegistry,
          abi: AgentRegistryABI,
          functionName: 'agents',
          args: [agentId],
        }) as any;

        const capabilities = await client.readContract({
          address: CONTRACTS.agentRegistry,
          abi: AgentRegistryABI,
          functionName: 'getAgentCapabilities',
          args: [agentId],
        }) as string[];

        console.log(chalk.bold(`Agent: ${agentId.slice(0, 10)}...`));
        console.log(`  Name: ${agent[1]}`);
        console.log(`  Owner: ${agent[0]}`);
        console.log(`  Stake: ${formatEther(agent[3])} AGNT`);
        console.log(`  Reputation: ${Number(agent[4]) / 100}%`);
        console.log(`  Active: ${agent[9]}`);
        console.log(`  Capabilities: ${capabilities.join(', ')}`);
        console.log('');
      }

      if (count > 10n) {
        console.log(chalk.gray(`... and ${Number(count) - 10} more agents`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

agentCmd
  .command('info <agentId>')
  .description('Get agent details (use bytes32 hex ID)')
  .action(async (agentId: string) => {
    const spinner = ora('Fetching agent...').start();
    try {
      const client = getPublicClient();
      const agent = await client.readContract({
        address: CONTRACTS.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'agents',
        args: [agentId as `0x${string}`],
      }) as any;

      const capabilities = await client.readContract({
        address: CONTRACTS.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'getAgentCapabilities',
        args: [agentId as `0x${string}`],
      }) as string[];

      spinner.stop();
      console.log(chalk.cyan(`\n🤖 Agent ${agentId.slice(0, 16)}...\n`));
      console.log(`  Name: ${chalk.bold(agent[1])}`);
      console.log(`  Owner: ${agent[0]}`);
      console.log(`  Metadata: ${agent[2]}`);
      console.log(`  Stake: ${formatEther(agent[3])} AGNT`);
      console.log(`  Capabilities: ${capabilities.join(', ')}`);
      console.log(`  Reputation: ${Number(agent[4]) / 100}%`);
      console.log(`  Tasks Completed: ${agent[5]}`);
      console.log(`  Tasks Failed: ${agent[6]}`);
      console.log(`  Total Earned: ${formatEther(agent[7])} AGNT`);
      console.log(`  Active: ${agent[9]}`);
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

agentCmd
  .command('register <name> <metadataURI> <capabilities> <stakeAmount>')
  .description('Register a new agent (capabilities comma-separated)')
  .action(async (name: string, metadataURI: string, capabilities: string, stakeAmount: string) => {
    const spinner = ora('Registering agent...').start();
    try {
      const wallet = getWalletClient();
      const client = getPublicClient();
      const capArray = capabilities.split(',').map(c => c.trim());

      // First approve tokens
      spinner.text = 'Approving tokens...';
      const approveHash = await wallet.writeContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'approve',
        args: [CONTRACTS.agentRegistry, parseEther(stakeAmount)],
      });
      await client.waitForTransactionReceipt({ hash: approveHash });

      // Then register
      spinner.text = 'Registering agent...';
      const hash = await wallet.writeContract({
        address: CONTRACTS.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'registerAgent',
        args: [name, metadataURI, capArray, parseEther(stakeAmount)],
      });

      spinner.succeed(chalk.green(`Agent registered! TX: ${hash}`));
      console.log(chalk.cyan(`Explorer: https://hashkeychain-testnet-explorer.alt.technology/tx/${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Task Commands ============
const taskCmd = program.command('task').description('Task marketplace operations');

taskCmd
  .command('list')
  .description('List all tasks')
  .action(async () => {
    const spinner = ora('Fetching tasks...').start();
    try {
      const client = getPublicClient();
      const count = await client.readContract({
        address: CONTRACTS.taskMarketplace,
        abi: TaskMarketplaceABI,
        functionName: 'getTaskCount',
      }) as bigint;

      spinner.stop();
      console.log(chalk.cyan(`\n📋 Total Tasks: ${count}\n`));

      const statusNames = ['Open', 'Assigned', 'Submitted', 'PendingReview', 'Completed', 'Disputed', 'Cancelled', 'Failed'];
      const statusColors = ['green', 'yellow', 'blue', 'magenta', 'cyan', 'red', 'gray', 'red'];

      for (let i = 0n; i < count && i < 10n; i++) {
        const taskId = await client.readContract({
          address: CONTRACTS.taskMarketplace,
          abi: TaskMarketplaceABI,
          functionName: 'allTaskIds',
          args: [i],
        }) as `0x${string}`;

        const task = await client.readContract({
          address: CONTRACTS.taskMarketplace,
          abi: TaskMarketplaceABI,
          functionName: 'tasks',
          args: [taskId],
        }) as any;

        const statusColor = (chalk as any)[statusColors[Number(task[8])]];
        console.log(chalk.bold(`Task: ${taskId.slice(0, 10)}...`));
        console.log(`  Title: ${task[1]}`);
        console.log(`  Requester: ${task[0]}`);
        console.log(`  Capability: ${task[3]}`);
        console.log(`  Reward: ${formatEther(task[4])} AGNT`);
        console.log(`  Status: ${statusColor(statusNames[Number(task[8])])}`);
        console.log('');
      }

      if (count > 10n) {
        console.log(chalk.gray(`... and ${Number(count) - 10} more tasks`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

taskCmd
  .command('create <title> <descriptionURI> <capability> <reward> <deadline>')
  .description('Create a new task (deadline in hours from now)')
  .action(async (title: string, descriptionURI: string, capability: string, reward: string, deadline: string) => {
    const spinner = ora('Creating task...').start();
    try {
      const wallet = getWalletClient();
      const client = getPublicClient();
      const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 3600);

      // Approve tokens first
      spinner.text = 'Approving tokens...';
      const approveHash = await wallet.writeContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'approve',
        args: [CONTRACTS.taskMarketplace, parseEther(reward)],
      });
      await client.waitForTransactionReceipt({ hash: approveHash });

      // Create task
      spinner.text = 'Creating task...';
      const hash = await wallet.writeContract({
        address: CONTRACTS.taskMarketplace,
        abi: TaskMarketplaceABI,
        functionName: 'createTask',
        args: [title, descriptionURI, capability, parseEther(reward), deadlineTimestamp, false],
      });

      spinner.succeed(chalk.green(`Task created! TX: ${hash}`));
      console.log(chalk.cyan(`Explorer: https://hashkeychain-testnet-explorer.alt.technology/tx/${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Pricing Commands ============
const priceCmd = program.command('price').description('Dynamic pricing operations');

priceCmd
  .command('calculate <capability> [reputation]')
  .description('Calculate dynamic price for a capability')
  .action(async (capability: string, reputation?: string) => {
    const spinner = ora('Calculating price...').start();
    try {
      const client = getPublicClient();
      const rep = reputation ? BigInt(parseInt(reputation) * 100) : 5000n;

      const price = await client.readContract({
        address: CONTRACTS.dynamicPricing,
        abi: DynamicPricingABI,
        functionName: 'calculatePrice',
        args: [capability, rep],
      }) as bigint;

      spinner.stop();
      console.log(chalk.cyan(`\n💰 Price for "${capability}":`));
      console.log(`  Base Price: ${formatEther(price)} AGNT`);
      console.log(`  Agent Reputation: ${(reputation || 50)}%`);
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ NFT Commands ============
const nftCmd = program.command('nft').description('Agent NFT operations');

nftCmd
  .command('view <agentId>')
  .description('View agent NFT metadata')
  .action(async (agentId: string) => {
    const spinner = ora('Fetching NFT...').start();
    try {
      const client = getPublicClient();

      const tokenURI = await client.readContract({
        address: CONTRACTS.agentNFT,
        abi: AgentNFTABI,
        functionName: 'tokenURI',
        args: [BigInt(agentId)],
      }) as string;

      spinner.stop();
      console.log(chalk.cyan(`\n🎨 Agent NFT #${agentId}\n`));

      // Parse base64 JSON
      if (tokenURI.startsWith('data:application/json;base64,')) {
        const json = JSON.parse(Buffer.from(tokenURI.split(',')[1], 'base64').toString());
        console.log(`  Name: ${json.name}`);
        console.log(`  Description: ${json.description}`);
        console.log(`  Attributes:`);
        for (const attr of json.attributes) {
          console.log(`    - ${attr.trait_type}: ${attr.value}`);
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Workflow Commands ============
const workflowCmd = program.command('workflow').description('Workflow operations');

workflowCmd
  .command('list')
  .description('List workflows')
  .action(async () => {
    const spinner = ora('Fetching workflows...').start();
    try {
      const client = getPublicClient();
      const count = await client.readContract({
        address: CONTRACTS.workflowEngine,
        abi: WorkflowEngineABI,
        functionName: 'getWorkflowCount',
      }) as bigint;

      spinner.stop();
      console.log(chalk.cyan(`\n🔄 Total Workflows: ${count}\n`));

      const statusNames = ['Draft', 'Active', 'Completed', 'Failed', 'Cancelled'];

      for (let i = 0n; i < count && i < 10n; i++) {
        const workflowId = await client.readContract({
          address: CONTRACTS.workflowEngine,
          abi: WorkflowEngineABI,
          functionName: 'allWorkflowIds',
          args: [i],
        }) as `0x${string}`;

        const workflow = await client.readContract({
          address: CONTRACTS.workflowEngine,
          abi: WorkflowEngineABI,
          functionName: 'workflows',
          args: [workflowId],
        }) as any;

        console.log(chalk.bold(`Workflow: ${workflowId.slice(0, 10)}...`));
        console.log(`  Name: ${workflow[1]}`);
        console.log(`  Creator: ${workflow[0]}`);
        console.log(`  Budget: ${formatEther(workflow[3])} AGNT`);
        console.log(`  Status: ${statusNames[Number(workflow[6])]}`);
        console.log('');
      }

      if (count > 10n) {
        console.log(chalk.gray(`... and ${Number(count) - 10} more workflows`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Cross-Chain Commands ============
const crossChainCmd = program.command('crosschain').description('Cross-chain operations');

crossChainCmd
  .command('broadcast <name> <metadataURI> <capabilities> <reputation> <tasksCompleted>')
  .description('Broadcast agent for cross-chain discovery')
  .action(async (name: string, metadataURI: string, capabilities: string, reputation: string, tasksCompleted: string) => {
    const spinner = ora('Broadcasting agent...').start();
    try {
      const wallet = getWalletClient();
      const capArray = capabilities.split(',').map(c => c.trim());

      const hash = await wallet.writeContract({
        address: CONTRACTS.crossChainHub,
        abi: CrossChainHubABI,
        functionName: 'broadcastAgent',
        args: [
          name,
          metadataURI,
          capArray,
          BigInt(parseInt(reputation) * 100),
          BigInt(tasksCompleted),
        ],
      });

      spinner.succeed(chalk.green(`Agent broadcasted! TX: ${hash}`));
      console.log(chalk.cyan('Agent is now discoverable on other chains'));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Governance Commands ============
const govCmd = program.command('gov').description('Governance operations');

govCmd
  .command('treasury')
  .description('View treasury balance')
  .action(async () => {
    const spinner = ora('Fetching treasury...').start();
    try {
      const client = getPublicClient();

      const balance = await client.readContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.treasury],
      }) as bigint;

      spinner.stop();
      console.log(chalk.cyan(`\n🏛️ Treasury\n`));
      console.log(`  Address: ${CONTRACTS.treasury}`);
      console.log(`  Balance: ${formatEther(balance)} AGNT`);
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

govCmd
  .command('delegate <delegatee>')
  .description('Delegate voting power')
  .action(async (delegatee: string) => {
    const spinner = ora('Delegating...').start();
    try {
      const wallet = getWalletClient();

      const hash = await wallet.writeContract({
        address: CONTRACTS.agntToken,
        abi: AGNTTokenABI,
        functionName: 'delegate',
        args: [delegatee as Address],
      });

      spinner.succeed(chalk.green(`Delegated to ${delegatee}! TX: ${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============ Status Command ============
program
  .command('status')
  .description('Show contract addresses and network info')
  .action(() => {
    console.log(chalk.cyan('\n🌐 Blockchain Agent Hub - HashKey Testnet\n'));
    console.log(chalk.bold('Network:'));
    console.log(`  Chain ID: 133`);
    console.log(`  RPC: https://hashkeychain-testnet.alt.technology`);
    console.log(`  Explorer: https://hashkeychain-testnet-explorer.alt.technology`);
    console.log('');
    console.log(chalk.bold('Contracts:'));
    for (const [name, address] of Object.entries(CONTRACTS)) {
      console.log(`  ${name}: ${address}`);
    }
    console.log('');
    console.log(chalk.bold('Webapp:'));
    console.log(`  https://webapp-nine-flax.vercel.app`);
  });

program.parse();
