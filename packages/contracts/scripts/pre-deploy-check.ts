/**
 * Pre-Deployment Checklist Script
 * 
 * Run this before mainnet deployment to verify everything is ready.
 * 
 * Usage:
 *   npx hardhat run scripts/pre-deploy-check.ts --network hashkey-mainnet
 */

import { ethers } from "hardhat";
import { execSync } from "child_process";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          PRE-DEPLOYMENT CHECKLIST                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const results: CheckResult[] = [];
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deployer Balance Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Checking Deployer Balance ═══\n");
  
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = parseFloat(ethers.formatEther(balance));
  const requiredBalance = 0.1; // Minimum recommended balance
  
  if (balanceEth >= requiredBalance) {
    results.push({
      name: "Deployer Balance",
      status: "pass",
      message: `${balanceEth.toFixed(4)} native (>= ${requiredBalance} recommended)`,
    });
    console.log(`   ✓ Balance: ${balanceEth.toFixed(4)} native\n`);
  } else {
    results.push({
      name: "Deployer Balance",
      status: "fail",
      message: `${balanceEth.toFixed(4)} native (< ${requiredBalance} recommended)`,
    });
    console.log(`   ✗ Balance too low: ${balanceEth.toFixed(4)} native\n`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Contract Compilation Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Checking Contract Compilation ═══\n");

  try {
    execSync("npx hardhat compile", { stdio: "pipe" });
    results.push({
      name: "Contract Compilation",
      status: "pass",
      message: "All contracts compile successfully",
    });
    console.log("   ✓ All contracts compile successfully\n");
  } catch {
    results.push({
      name: "Contract Compilation",
      status: "fail",
      message: "Compilation errors detected",
    });
    console.log("   ✗ Compilation errors detected\n");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Test Suite Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Running Test Suite ═══\n");

  try {
    const testOutput = execSync("npx hardhat test 2>&1", { 
      encoding: "utf8",
      timeout: 120000,
    });
    
    const passingMatch = testOutput.match(/(\d+) passing/);
    const failingMatch = testOutput.match(/(\d+) failing/);
    
    const passing = passingMatch ? parseInt(passingMatch[1]) : 0;
    const failing = failingMatch ? parseInt(failingMatch[1]) : 0;

    if (failing === 0 && passing > 0) {
      results.push({
        name: "Test Suite",
        status: "pass",
        message: `${passing} tests passing, 0 failing`,
      });
      console.log(`   ✓ ${passing} tests passing, 0 failing\n`);
    } else {
      results.push({
        name: "Test Suite",
        status: "fail",
        message: `${passing} passing, ${failing} failing`,
      });
      console.log(`   ✗ ${passing} passing, ${failing} failing\n`);
    }
  } catch (error) {
    results.push({
      name: "Test Suite",
      status: "fail",
      message: "Test execution failed",
    });
    console.log("   ✗ Test execution failed\n");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Environment Variables Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Checking Environment Variables ═══\n");

  const requiredEnvVars = ["PRIVATE_KEY"];
  const optionalEnvVars = ["ETHERSCAN_API_KEY", "HASHKEY_MAINNET_RPC"];
  
  let envPass = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar} is set`);
    } else {
      console.log(`   ✗ ${envVar} is NOT set`);
      envPass = false;
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar} is set`);
    } else {
      console.log(`   ⚠ ${envVar} not set (optional)`);
    }
  }

  results.push({
    name: "Environment Variables",
    status: envPass ? "pass" : "fail",
    message: envPass ? "All required variables set" : "Missing required variables",
  });
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Network Connectivity Check
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══ Checking Network Connectivity ═══\n");

  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    results.push({
      name: "Network Connectivity",
      status: "pass",
      message: `Connected, current block: ${blockNumber}`,
    });
    console.log(`   ✓ Connected to network, current block: ${blockNumber}\n`);
  } catch {
    results.push({
      name: "Network Connectivity",
      status: "fail",
      message: "Cannot connect to network",
    });
    console.log("   ✗ Cannot connect to network\n");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Mainnet Warning
  // ═══════════════════════════════════════════════════════════════════════════
  if (network.chainId === 177n) {
    console.log("═══ ⚠️  MAINNET DEPLOYMENT WARNING ═══\n");
    console.log("   You are about to deploy to HashKey MAINNET.");
    console.log("   Ensure you have:");
    console.log("   • Completed a security audit");
    console.log("   • Tested thoroughly on testnet");
    console.log("   • Prepared multi-sig for ownership transfer");
    console.log("   • Reviewed all contract parameters\n");
    
    results.push({
      name: "Mainnet Check",
      status: "warn",
      message: "Deploying to mainnet - proceed with caution",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║               CHECKLIST SUMMARY                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warn").length;

  for (const result of results) {
    const icon = result.status === "pass" ? "✓" : result.status === "fail" ? "✗" : "⚠";
    const color = result.status === "pass" ? "32" : result.status === "fail" ? "31" : "33";
    console.log(`   ${icon} ${result.name}: ${result.message}`);
  }

  console.log(`\n   Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);

  if (failed === 0) {
    console.log("\n   ✅ All checks passed! Ready for deployment.\n");
    console.log("   Run: npx hardhat run scripts/deploy-all.ts --network <network>\n");
  } else {
    console.log("\n   ❌ Some checks failed. Fix issues before deploying.\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Pre-deployment check failed:", error);
    process.exit(1);
  });
