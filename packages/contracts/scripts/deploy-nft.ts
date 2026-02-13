import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AgentNFT with:", deployer.address);

  // Load existing deployment info
  const deploymentPath = "./deployments.json";
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments.json not found - deploy core contracts first");
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Existing deployment:", deployment);

  // Deploy AgentNFT
  console.log("\n1. Deploying AgentNFT...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(deployer.address);
  await agentNFT.waitForDeployment();
  const nftAddress = await agentNFT.getAddress();
  console.log("   AgentNFT deployed to:", nftAddress);

  // Wire AgentNFT to AgentRegistry
  console.log("\n2. Setting AgentRegistry on AgentNFT...");
  const registryAddress = deployment.contracts.AgentRegistry;
  await agentNFT.setAgentRegistry(registryAddress);
  console.log("   Set AgentRegistry:", registryAddress);

  // Update deployment info
  deployment.contracts.AgentNFT = nftAddress;
  deployment.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n========================================");
  console.log("AgentNFT Deployment Complete!");
  console.log("========================================");
  console.log("AgentNFT:         ", nftAddress);
  console.log("AgentRegistry:    ", registryAddress);
  console.log("========================================");
  console.log("\nDeployment info updated in deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
