import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AgentNFT with:", deployer.address);

  // Load existing deployments
  const deployments = JSON.parse(fs.readFileSync("./deployments.json", "utf8"));
  console.log("Existing deployments:", deployments.contracts);

  // Deploy AgentNFT
  console.log("\nDeploying AgentNFT (Soulbound Identity)...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(deployer.address);
  await agentNFT.waitForDeployment();
  const nftAddress = await agentNFT.getAddress();
  console.log("AgentNFT deployed to:", nftAddress);

  // Set AgentRegistry as authorized minter
  console.log("\nConfiguring AgentNFT...");
  await agentNFT.setAgentRegistry(deployments.contracts.AgentRegistry);
  console.log("Set AgentRegistry as authorized:", deployments.contracts.AgentRegistry);

  // Update deployments.json
  deployments.contracts.AgentNFT = nftAddress;
  deployments.timestamp = new Date().toISOString();
  fs.writeFileSync("./deployments.json", JSON.stringify(deployments, null, 2));

  console.log("\n========================================");
  console.log("AgentNFT Deployment Complete!");
  console.log("========================================");
  console.log("AgentNFT:         ", nftAddress);
  console.log("Linked Registry:  ", deployments.contracts.AgentRegistry);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
