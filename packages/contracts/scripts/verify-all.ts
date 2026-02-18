/**
 * Contract Verification Script
 * 
 * Verifies all deployed contracts on the block explorer.
 * Run after deploy-all.ts to make contracts readable on explorer.
 * 
 * Usage:
 *   npx hardhat run scripts/verify-all.ts --network hashkey
 *   npx hardhat run scripts/verify-all.ts --network hashkey-mainnet
 */

import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

interface Deployment {
  contracts: Record<string, string>;
  deployer: string;
}

async function verifyContract(
  name: string,
  address: string,
  constructorArgs: unknown[]
): Promise<boolean> {
  try {
    console.log(`\n   Verifying ${name} at ${address}...`);
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`   ✓ ${name} verified successfully`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Already Verified")) {
      console.log(`   ✓ ${name} already verified`);
      return true;
    }
    console.log(`   ✗ ${name} verification failed: ${errorMessage}`);
    return false;
  }
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║            CONTRACT VERIFICATION                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load deployment info
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found. Run deploy-all.ts first.");
  }

  const deployment: Deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const { contracts, deployer } = deployment;

  console.log(`Deployer: ${deployer}`);
  console.log(`Contracts to verify: ${Object.keys(contracts).length}\n`);

  const results: Record<string, boolean> = {};

  // Verification order with constructor arguments
  const verifications: Array<{ name: string; args: unknown[] }> = [
    { name: "AGNTToken", args: [deployer] },
    { name: "AgentRegistry", args: [contracts.AGNTToken, deployer] },
    { name: "TaskMarketplace", args: [contracts.AGNTToken, contracts.AgentRegistry, deployer] },
    { name: "AgentNFT", args: [contracts.AgentRegistry] },
    { name: "WorkflowEngine", args: [contracts.AGNTToken, contracts.AgentRegistry, contracts.TaskMarketplace, deployer] },
    { name: "DynamicPricing", args: [deployer] },
    { name: "CrossChainHub", args: [contracts.AgentRegistry] },
    { name: "CrossChainReceiver", args: [] },
    { name: "TimelockController", args: [48 * 60 * 60, [], [], deployer] },
    { name: "Treasury", args: [contracts.AGNTToken, contracts.TimelockController] },
    { 
      name: "GovernorAgent", 
      args: [
        contracts.AGNTToken,
        contracts.TimelockController,
        43200, // votingDelay
        302400, // votingPeriod
        ethers.parseEther("1000"), // proposalThreshold
      ] 
    },
    { name: "BatchOperations", args: [contracts.AGNTToken, contracts.TaskMarketplace, contracts.AgentRegistry, deployer] },
  ];

  console.log("═══ Verifying Contracts ═══");

  for (const { name, args } of verifications) {
    if (contracts[name]) {
      results[name] = await verifyContract(name, contracts[name], args);
    } else {
      console.log(`   ⚠ ${name} not found in deployments.json`);
      results[name] = false;
    }
  }

  // Summary
  const verified = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║               VERIFICATION SUMMARY                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  for (const [name, success] of Object.entries(results)) {
    console.log(`   ${success ? "✓" : "✗"} ${name}`);
  }

  console.log(`\n   Total: ${verified}/${total} contracts verified`);

  if (verified === total) {
    console.log("\n   🎉 All contracts verified successfully!\n");
  } else {
    console.log("\n   ⚠️  Some contracts failed verification. Check errors above.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification script failed:", error);
    process.exit(1);
  });
