/**
 * Contract Health Check Script
 * 
 * Monitor the health of deployed contracts. Run periodically to ensure
 * the marketplace is functioning correctly.
 * 
 * Usage:
 *   npx hardhat run scripts/health-check.ts --network hashkey
 *   npx hardhat run scripts/health-check.ts --network hashkey-mainnet
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface HealthMetrics {
  timestamp: number;
  network: string;
  chainId: bigint;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "critical";
  value: string;
  threshold?: string;
  message: string;
}

// Testnet addresses from README (fallback)
const TESTNET_ADDRESSES: Record<string, string> = {
  agntToken: "0x7379C9d687F8c22d41be43fE510F8225afF253f6",
  agentRegistry: "0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49",
  taskMarketplace: "0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061",
  agentNFT: "0x4476e726B4030923bD29C98F8881Da2727B6a0B6",
  workflowEngine: "0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd",
  dynamicPricing: "0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3",
  crossChainHub: "0x6349F97FEeb19D9646a34f81904b50bB704FAD08",
  crossChainReceiver: "0x5Ae42BA8EDcB98deFF361E088AF09F9880e5C2b9",
  batchOperations: "0x17a6c455AF4b8f79c26aBAF4b7F3F5a39ab0B1B5",
  governor: "0x626496716673bb5E7F2634d2eBc96ae0697713a4",
  treasury: "0xdc454EfAa5eEBF4D6786750f664bCff461C68b33",
  timelock: "0x0F8538a8829c1658eac0D20B11421828d2099c1C",
};

// Map PascalCase to camelCase
function normalizeContractKeys(contracts: Record<string, string>): Record<string, string> {
  const keyMap: Record<string, string> = {
    AGNTToken: "agntToken",
    AgentRegistry: "agentRegistry",
    TaskMarketplace: "taskMarketplace",
    AgentNFT: "agentNFT",
    WorkflowEngine: "workflowEngine",
    DynamicPricing: "dynamicPricing",
    CrossChainHub: "crossChainHub",
    CrossChainReceiver: "crossChainReceiver",
    BatchOperations: "batchOperations",
    GovernorAgent: "governor",
    Treasury: "treasury",
    TimelockController: "timelock",
  };
  
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(contracts)) {
    const normalizedKey = keyMap[key] || key.charAt(0).toLowerCase() + key.slice(1);
    normalized[normalizedKey] = value;
  }
  return normalized;
}

// Load deployment addresses
async function loadDeployments(chainId: bigint): Promise<Record<string, string>> {
  const deploymentPath = path.join(__dirname, "..", "deployments.json");
  
  // For HashKey Testnet, use known addresses
  if (chainId === 133n) {
    console.log("   Using HashKey Testnet addresses from README\n");
    return TESTNET_ADDRESSES;
  }
  
  // Try to load from deployments.json
  if (fs.existsSync(deploymentPath)) {
    const data = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    if (data.contracts) {
      return normalizeContractKeys(data.contracts);
    }
    return data;
  }
  
  throw new Error("deployments.json not found. Deploy contracts first.");
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          CONTRACT HEALTH CHECK                              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const network = await ethers.provider.getNetwork();
  const deployments = await loadDeployments(network.chainId);
  const checks: HealthCheck[] = [];

  console.log(`Network:   ${network.name} (chainId: ${network.chainId})`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Contract Accessibility
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Contract Accessibility ═══\n");

  const contracts = [
    { name: "AGNT Token", key: "agntToken" },
    { name: "Agent Registry", key: "agentRegistry" },
    { name: "Task Marketplace", key: "taskMarketplace" },
    { name: "Agent NFT", key: "agentNFT" },
    { name: "Workflow Engine", key: "workflowEngine" },
    { name: "Dynamic Pricing", key: "dynamicPricing" },
    { name: "Cross-Chain Hub", key: "crossChainHub" },
    { name: "Batch Operations", key: "batchOperations" },
  ];

  for (const contract of contracts) {
    const address = deployments[contract.key];
    if (!address) {
      checks.push({
        name: `${contract.name} Deployed`,
        status: "critical",
        value: "Not deployed",
        message: `${contract.name} address not found in deployments.json`,
      });
      console.log(`   ✗ ${contract.name}: Not deployed`);
      continue;
    }

    try {
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        checks.push({
          name: `${contract.name} Code`,
          status: "critical",
          value: address,
          message: "No bytecode at address",
        });
        console.log(`   ✗ ${contract.name}: No code at ${address}`);
      } else {
        checks.push({
          name: `${contract.name} Code`,
          status: "healthy",
          value: address,
          message: `Contract exists (${code.length / 2 - 1} bytes)`,
        });
        console.log(`   ✓ ${contract.name}: ${address.slice(0, 10)}...`);
      }
    } catch (error) {
      checks.push({
        name: `${contract.name} Check`,
        status: "critical",
        value: address,
        message: `Failed to query: ${error}`,
      });
      console.log(`   ✗ ${contract.name}: Query failed`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. AGNT Token Metrics
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ AGNT Token Metrics ═══\n");

  if (deployments.agntToken) {
    const token = await ethers.getContractAt("AGNTToken", deployments.agntToken);
    
    try {
      const totalSupply = await token.totalSupply();
      const decimals = await token.decimals();
      const supplyFormatted = ethers.formatUnits(totalSupply, decimals);
      
      checks.push({
        name: "AGNT Total Supply",
        status: "healthy",
        value: supplyFormatted,
        message: `${supplyFormatted} AGNT in circulation`,
      });
      console.log(`   Total Supply: ${supplyFormatted} AGNT`);

      // Check token holders via registry balance
      if (deployments.agentRegistry) {
        const registryBalance = await token.balanceOf(deployments.agentRegistry);
        const registryBalanceFormatted = ethers.formatUnits(registryBalance, decimals);
        
        checks.push({
          name: "Registry AGNT Balance",
          status: "healthy",
          value: registryBalanceFormatted,
          message: `${registryBalanceFormatted} AGNT staked in registry`,
        });
        console.log(`   Registry Staked: ${registryBalanceFormatted} AGNT`);
      }

      if (deployments.taskMarketplace) {
        const marketplaceBalance = await token.balanceOf(deployments.taskMarketplace);
        const marketplaceBalanceFormatted = ethers.formatUnits(marketplaceBalance, decimals);
        
        checks.push({
          name: "Marketplace AGNT Balance",
          status: "healthy",
          value: marketplaceBalanceFormatted,
          message: `${marketplaceBalanceFormatted} AGNT in escrow`,
        });
        console.log(`   Marketplace Escrow: ${marketplaceBalanceFormatted} AGNT`);
      }
    } catch (error) {
      checks.push({
        name: "AGNT Token Query",
        status: "warning",
        value: "Failed",
        message: `Could not query token: ${error}`,
      });
      console.log(`   ⚠ Failed to query token metrics`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Agent Registry Metrics
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Agent Registry Metrics ═══\n");

  if (deployments.agentRegistry) {
    const registry = await ethers.getContractAt("AgentRegistry", deployments.agentRegistry);
    
    try {
      const agentCount = await registry.agentCount();
      
      checks.push({
        name: "Registered Agents",
        status: Number(agentCount) > 0 ? "healthy" : "warning",
        value: agentCount.toString(),
        message: `${agentCount} agents registered`,
      });
      console.log(`   Registered Agents: ${agentCount}`);

      const minStake = await registry.minimumStake();
      const minStakeFormatted = ethers.formatEther(minStake);
      console.log(`   Minimum Stake: ${minStakeFormatted} AGNT`);
    } catch (error) {
      checks.push({
        name: "Registry Query",
        status: "warning",
        value: "Failed",
        message: `Could not query registry: ${error}`,
      });
      console.log(`   ⚠ Failed to query registry metrics`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Task Marketplace Metrics
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Task Marketplace Metrics ═══\n");

  if (deployments.taskMarketplace) {
    const marketplace = await ethers.getContractAt("TaskMarketplace", deployments.taskMarketplace);
    
    try {
      const taskCount = await marketplace.taskCount();
      
      checks.push({
        name: "Total Tasks",
        status: "healthy",
        value: taskCount.toString(),
        message: `${taskCount} tasks created`,
      });
      console.log(`   Total Tasks: ${taskCount}`);

      // Count open tasks
      let openTasks = 0;
      let completedTasks = 0;
      
      for (let i = 1; i <= Math.min(Number(taskCount), 100); i++) {
        try {
          const task = await marketplace.tasks(i);
          if (task.status === 0n) openTasks++;
          if (task.status === 2n) completedTasks++;
        } catch {
          // Skip
        }
      }
      
      console.log(`   Open Tasks: ${openTasks}`);
      console.log(`   Completed Tasks: ${completedTasks}`);
      
      if (openTasks > 50) {
        checks.push({
          name: "Open Tasks Backlog",
          status: "warning",
          value: openTasks.toString(),
          threshold: "50",
          message: `High number of open tasks (${openTasks})`,
        });
      }
    } catch (error) {
      checks.push({
        name: "Marketplace Query",
        status: "warning",
        value: "Failed",
        message: `Could not query marketplace: ${error}`,
      });
      console.log(`   ⚠ Failed to query marketplace metrics`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Workflow Engine Metrics
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Workflow Engine Metrics ═══\n");

  if (deployments.workflowEngine) {
    const workflow = await ethers.getContractAt("WorkflowEngine", deployments.workflowEngine);
    
    try {
      const workflowCount = await workflow.workflowCount();
      
      checks.push({
        name: "Total Workflows",
        status: "healthy",
        value: workflowCount.toString(),
        message: `${workflowCount} workflows created`,
      });
      console.log(`   Total Workflows: ${workflowCount}`);
    } catch (error) {
      console.log(`   ⚠ Failed to query workflow metrics`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Block Time Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Network Health ═══\n");

  try {
    const latestBlock = await ethers.provider.getBlock("latest");
    const blockTime = new Date(Number(latestBlock!.timestamp) * 1000);
    const now = new Date();
    const lagSeconds = (now.getTime() - blockTime.getTime()) / 1000;

    if (lagSeconds < 60) {
      checks.push({
        name: "Block Time Lag",
        status: "healthy",
        value: `${lagSeconds.toFixed(0)}s`,
        threshold: "60s",
        message: "Network is synced",
      });
      console.log(`   ✓ Block lag: ${lagSeconds.toFixed(0)}s (healthy)`);
    } else if (lagSeconds < 300) {
      checks.push({
        name: "Block Time Lag",
        status: "warning",
        value: `${lagSeconds.toFixed(0)}s`,
        threshold: "300s",
        message: "Network may be delayed",
      });
      console.log(`   ⚠ Block lag: ${lagSeconds.toFixed(0)}s (warning)`);
    } else {
      checks.push({
        name: "Block Time Lag",
        status: "critical",
        value: `${lagSeconds.toFixed(0)}s`,
        threshold: "300s",
        message: "Network appears stalled",
      });
      console.log(`   ✗ Block lag: ${lagSeconds.toFixed(0)}s (critical)`);
    }

    console.log(`   Latest Block: ${latestBlock!.number}`);
    console.log(`   Block Time: ${blockTime.toISOString()}`);
  } catch (error) {
    checks.push({
      name: "Network Query",
      status: "critical",
      value: "Failed",
      message: `Cannot query network: ${error}`,
    });
    console.log(`   ✗ Cannot query network`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  const summary = {
    healthy: checks.filter((c) => c.status === "healthy").length,
    warning: checks.filter((c) => c.status === "warning").length,
    critical: checks.filter((c) => c.status === "critical").length,
  };

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║               HEALTH CHECK SUMMARY                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`   ✓ Healthy:  ${summary.healthy}`);
  console.log(`   ⚠ Warning:  ${summary.warning}`);
  console.log(`   ✗ Critical: ${summary.critical}`);
  console.log();

  if (summary.critical > 0) {
    console.log("   ❌ CRITICAL ISSUES DETECTED - Immediate attention required!\n");
    for (const check of checks.filter((c) => c.status === "critical")) {
      console.log(`      • ${check.name}: ${check.message}`);
    }
    console.log();
  } else if (summary.warning > 0) {
    console.log("   ⚠️  Warnings detected - Review recommended.\n");
    for (const check of checks.filter((c) => c.status === "warning")) {
      console.log(`      • ${check.name}: ${check.message}`);
    }
    console.log();
  } else {
    console.log("   ✅ All systems healthy!\n");
  }

  // Save metrics to file (convert BigInt for JSON serialization)
  const metrics: HealthMetrics = {
    timestamp: Date.now(),
    network: network.name,
    chainId: network.chainId,
    checks,
    summary,
  };

  const metricsPath = path.join(__dirname, "..", "health-metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
  console.log(`   Metrics saved to: health-metrics.json\n`);

  // Exit with error if critical issues
  if (summary.critical > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Health check failed:", error);
    process.exit(1);
  });
