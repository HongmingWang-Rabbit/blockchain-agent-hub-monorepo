/**
 * Full Deployment Script - Deploys all Blockchain Agent Hub contracts
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-all.ts --network hashkey       # testnet
 *   npx hardhat run scripts/deploy-all.ts --network hashkey-mainnet  # mainnet
 * 
 * This script deploys all contracts in the correct order and sets up
 * cross-contract permissions automatically.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentResult {
  network: string;
  chainId: string;
  deployer: string;
  timestamp: string;
  contracts: Record<string, string>;
  configuration: Record<string, string | number>;
  gasUsed: Record<string, string>;
}

async function main() {
  const startTime = Date.now();
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       BLOCKCHAIN AGENT HUB - FULL DEPLOYMENT               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} native\n`);

  const isMainnet = network.chainId === 177n;
  if (isMainnet) {
    console.log("⚠️  MAINNET DEPLOYMENT - Double-check all parameters!\n");
  }

  const gasUsed: Record<string, string> = {};
  const contracts: Record<string, string> = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Core Contracts
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 1: Core Contracts ═══\n");

  // 1. AGNT Token
  console.log("1. Deploying AGNT Token...");
  const AGNTToken = await ethers.getContractFactory("AGNTToken");
  const agntToken = await AGNTToken.deploy(deployer.address);
  const agntReceipt = await agntToken.deploymentTransaction()?.wait();
  contracts.AGNTToken = await agntToken.getAddress();
  gasUsed.AGNTToken = agntReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ AGNT Token: ${contracts.AGNTToken} (gas: ${gasUsed.AGNTToken})\n`);

  // 2. Agent Registry
  console.log("2. Deploying Agent Registry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(contracts.AGNTToken, deployer.address);
  const registryReceipt = await agentRegistry.deploymentTransaction()?.wait();
  contracts.AgentRegistry = await agentRegistry.getAddress();
  gasUsed.AgentRegistry = registryReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Agent Registry: ${contracts.AgentRegistry} (gas: ${gasUsed.AgentRegistry})\n`);

  // 3. Task Marketplace
  console.log("3. Deploying Task Marketplace...");
  const TaskMarketplace = await ethers.getContractFactory("TaskMarketplace");
  const taskMarketplace = await TaskMarketplace.deploy(
    contracts.AGNTToken,
    contracts.AgentRegistry,
    deployer.address
  );
  const marketReceipt = await taskMarketplace.deploymentTransaction()?.wait();
  contracts.TaskMarketplace = await taskMarketplace.getAddress();
  gasUsed.TaskMarketplace = marketReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Task Marketplace: ${contracts.TaskMarketplace} (gas: ${gasUsed.TaskMarketplace})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: Extended Contracts
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 2: Extended Contracts ═══\n");

  // 4. Agent NFT
  console.log("4. Deploying Agent NFT...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(contracts.AgentRegistry);
  const nftReceipt = await agentNFT.deploymentTransaction()?.wait();
  contracts.AgentNFT = await agentNFT.getAddress();
  gasUsed.AgentNFT = nftReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Agent NFT: ${contracts.AgentNFT} (gas: ${gasUsed.AgentNFT})\n`);

  // 5. Workflow Engine
  console.log("5. Deploying Workflow Engine...");
  const WorkflowEngine = await ethers.getContractFactory("WorkflowEngine");
  const workflowEngine = await WorkflowEngine.deploy(
    contracts.AGNTToken,
    contracts.AgentRegistry,
    contracts.TaskMarketplace,
    deployer.address
  );
  const workflowReceipt = await workflowEngine.deploymentTransaction()?.wait();
  contracts.WorkflowEngine = await workflowEngine.getAddress();
  gasUsed.WorkflowEngine = workflowReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Workflow Engine: ${contracts.WorkflowEngine} (gas: ${gasUsed.WorkflowEngine})\n`);

  // 6. Dynamic Pricing
  console.log("6. Deploying Dynamic Pricing...");
  const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
  const dynamicPricing = await DynamicPricing.deploy(deployer.address);
  const pricingReceipt = await dynamicPricing.deploymentTransaction()?.wait();
  contracts.DynamicPricing = await dynamicPricing.getAddress();
  gasUsed.DynamicPricing = pricingReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Dynamic Pricing: ${contracts.DynamicPricing} (gas: ${gasUsed.DynamicPricing})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Cross-Chain
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 3: Cross-Chain Contracts ═══\n");

  // 7. Cross-Chain Hub
  console.log("7. Deploying Cross-Chain Hub...");
  const CrossChainHub = await ethers.getContractFactory("CrossChainHub");
  const crossChainHub = await CrossChainHub.deploy(contracts.AgentRegistry);
  const hubReceipt = await crossChainHub.deploymentTransaction()?.wait();
  contracts.CrossChainHub = await crossChainHub.getAddress();
  gasUsed.CrossChainHub = hubReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Cross-Chain Hub: ${contracts.CrossChainHub} (gas: ${gasUsed.CrossChainHub})\n`);

  // 8. Cross-Chain Receiver
  console.log("8. Deploying Cross-Chain Receiver...");
  const CrossChainReceiver = await ethers.getContractFactory("CrossChainReceiver");
  const crossChainReceiver = await CrossChainReceiver.deploy();
  const receiverReceipt = await crossChainReceiver.deploymentTransaction()?.wait();
  contracts.CrossChainReceiver = await crossChainReceiver.getAddress();
  gasUsed.CrossChainReceiver = receiverReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Cross-Chain Receiver: ${contracts.CrossChainReceiver} (gas: ${gasUsed.CrossChainReceiver})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: Governance
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 4: Governance Contracts ═══\n");

  // 9. Timelock Controller
  console.log("9. Deploying Timelock Controller...");
  const timelockDelay = 48 * 60 * 60; // 48 hours
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    timelockDelay,
    [], // proposers (set later)
    [], // executors (set later)
    deployer.address // admin
  );
  const timelockReceipt = await timelock.deploymentTransaction()?.wait();
  contracts.TimelockController = await timelock.getAddress();
  gasUsed.TimelockController = timelockReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Timelock Controller: ${contracts.TimelockController} (gas: ${gasUsed.TimelockController})\n`);

  // 10. Treasury
  console.log("10. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(contracts.AGNTToken, contracts.TimelockController);
  const treasuryReceipt = await treasury.deploymentTransaction()?.wait();
  contracts.Treasury = await treasury.getAddress();
  gasUsed.Treasury = treasuryReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Treasury: ${contracts.Treasury} (gas: ${gasUsed.Treasury})\n`);

  // 11. Governor Agent
  console.log("11. Deploying Governor Agent...");
  const votingDelay = 43200; // ~1 day
  const votingPeriod = 302400; // ~7 days
  const proposalThreshold = ethers.parseEther("1000");
  
  const GovernorAgent = await ethers.getContractFactory("GovernorAgent");
  const governor = await GovernorAgent.deploy(
    contracts.AGNTToken,
    contracts.TimelockController,
    votingDelay,
    votingPeriod,
    proposalThreshold
  );
  const governorReceipt = await governor.deploymentTransaction()?.wait();
  contracts.GovernorAgent = await governor.getAddress();
  gasUsed.GovernorAgent = governorReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Governor Agent: ${contracts.GovernorAgent} (gas: ${gasUsed.GovernorAgent})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: Batch Operations
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 5: Batch Operations ═══\n");

  // 12. Batch Operations
  console.log("12. Deploying Batch Operations...");
  const BatchOperations = await ethers.getContractFactory("BatchOperations");
  const batchOperations = await BatchOperations.deploy(
    contracts.AGNTToken,
    contracts.TaskMarketplace,
    contracts.AgentRegistry,
    deployer.address
  );
  const batchReceipt = await batchOperations.deploymentTransaction()?.wait();
  contracts.BatchOperations = await batchOperations.getAddress();
  gasUsed.BatchOperations = batchReceipt?.gasUsed?.toString() || "0";
  console.log(`   ✓ Batch Operations: ${contracts.BatchOperations} (gas: ${gasUsed.BatchOperations})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: Configure Permissions
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 6: Configuring Permissions ═══\n");

  // Core permissions
  console.log("   Configuring core permissions...");
  await agntToken.addMinter(contracts.AgentRegistry);
  console.log("   ✓ AgentRegistry added as AGNT minter");
  
  await agentRegistry.addSlasher(contracts.TaskMarketplace);
  console.log("   ✓ TaskMarketplace added as slasher");

  // Set NFT contract on registry (if method exists)
  try {
    await agentRegistry.setAgentNFT(contracts.AgentNFT);
    console.log("   ✓ AgentNFT linked to Registry");
  } catch {
    console.log("   ⚠ AgentNFT linking skipped (method may not exist)");
  }

  // Governance permissions
  console.log("\n   Configuring governance permissions...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  
  await timelock.grantRole(PROPOSER_ROLE, contracts.GovernorAgent);
  console.log("   ✓ Governor granted PROPOSER_ROLE");
  
  await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  console.log("   ✓ Open executor set (anyone can execute)\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: Set Base Prices
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ PHASE 7: Setting Base Prices ═══\n");

  const basePrices = [
    ["code-review", "25"],
    ["debugging", "50"],
    ["security-audit", "200"],
    ["testing", "40"],
    ["documentation", "30"],
    ["data-analysis", "60"],
    ["api-integration", "75"],
    ["content-writing", "35"],
    ["translation", "25"],
    ["ui-design", "80"],
    ["research", "35"],
    ["data-extraction", "45"],
  ];

  for (const [capability, price] of basePrices) {
    await dynamicPricing.setBasePrice(capability, ethers.parseEther(price));
  }
  console.log(`   ✓ Set base prices for ${basePrices.length} capabilities\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL: Save Deployment Info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const totalGas = Object.values(gasUsed).reduce((a, b) => BigInt(a) + BigInt(b), 0n);
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  const deployment: DeploymentResult = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts,
    configuration: {
      timelockDelay: "48 hours",
      votingDelay: "1 day (~43200 blocks)",
      votingPeriod: "7 days (~302400 blocks)",
      proposalThreshold: "1000 AGNT",
      minimumStake: "100 AGNT",
      quorum: "4%",
    },
    gasUsed,
  };

  // Save deployments.json
  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(deployment, null, 2)
  );

  // Generate SDK config snippet
  const sdkConfig = `
// Add to packages/sdk/src/types.ts
export const HASHKEY_${isMainnet ? "MAINNET" : "TESTNET"}: NetworkConfig = {
  chainId: ${network.chainId},
  rpcUrl: '${isMainnet ? "https://mainnet.hashkeychain.com" : "https://testnet.hashkeychain.com"}',
  contracts: {
    agntToken: '${contracts.AGNTToken}',
    agentRegistry: '${contracts.AgentRegistry}',
    taskMarketplace: '${contracts.TaskMarketplace}',
    agentNFT: '${contracts.AgentNFT}',
    workflowEngine: '${contracts.WorkflowEngine}',
    dynamicPricing: '${contracts.DynamicPricing}',
    crossChainHub: '${contracts.CrossChainHub}',
    crossChainReceiver: '${contracts.CrossChainReceiver}',
    governor: '${contracts.GovernorAgent}',
    treasury: '${contracts.Treasury}',
    timelock: '${contracts.TimelockController}',
    batchOperations: '${contracts.BatchOperations}',
  },
};
`.trim();

  fs.writeFileSync(
    path.join(__dirname, "../sdk-config-snippet.ts"),
    sdkConfig
  );

  // Generate webapp .env snippet
  const webappEnv = `
# Add to packages/webapp/.env.local
NEXT_PUBLIC_CHAIN_ID=${network.chainId}
NEXT_PUBLIC_AGNT_TOKEN=${contracts.AGNTToken}
NEXT_PUBLIC_AGENT_REGISTRY=${contracts.AgentRegistry}
NEXT_PUBLIC_TASK_MARKETPLACE=${contracts.TaskMarketplace}
NEXT_PUBLIC_AGENT_NFT=${contracts.AgentNFT}
NEXT_PUBLIC_WORKFLOW_ENGINE=${contracts.WorkflowEngine}
NEXT_PUBLIC_DYNAMIC_PRICING=${contracts.DynamicPricing}
NEXT_PUBLIC_CROSS_CHAIN_HUB=${contracts.CrossChainHub}
NEXT_PUBLIC_GOVERNOR=${contracts.GovernorAgent}
NEXT_PUBLIC_TREASURY=${contracts.Treasury}
NEXT_PUBLIC_BATCH_OPERATIONS=${contracts.BatchOperations}
`.trim();

  fs.writeFileSync(
    path.join(__dirname, "../webapp-env-snippet.txt"),
    webappEnv
  );

  // Print summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                  DEPLOYMENT COMPLETE! 🎉                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 CONTRACT ADDRESSES:");
  console.log("────────────────────────────────────────────────────────────");
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`   ${name.padEnd(20)} ${address}`);
  }

  console.log("\n📊 DEPLOYMENT STATS:");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`   Total Gas Used:    ${totalGas.toLocaleString()}`);
  console.log(`   Deployment Time:   ${elapsedTime}s`);
  console.log(`   Contracts:         ${Object.keys(contracts).length}`);

  console.log("\n📁 FILES GENERATED:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("   ✓ deployments.json        — Full deployment info");
  console.log("   ✓ sdk-config-snippet.ts   — SDK NetworkConfig");
  console.log("   ✓ webapp-env-snippet.txt  — Webapp .env variables");

  console.log("\n🔜 NEXT STEPS:");
  console.log("────────────────────────────────────────────────────────────");
  console.log("   1. Verify contracts on explorer");
  console.log("   2. Copy sdk-config-snippet.ts to packages/sdk/src/types.ts");
  console.log("   3. Copy webapp-env-snippet.txt to packages/webapp/.env.local");
  console.log("   4. Fund treasury with initial AGNT");
  console.log("   5. Transfer ownership to multi-sig (for mainnet)");
  console.log("\n════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
