import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BatchOperations with:", deployer.address);

  // Contract addresses from previous deployments (HashKey Testnet)
  const AGNT_TOKEN = "0x7379C9d687F8c22d41be43fE510F8225afF253f6";
  const TASK_MARKETPLACE = "0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061";
  const AGENT_REGISTRY = "0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49";

  console.log("\nUsing existing contracts:");
  console.log("  AGNT Token:        ", AGNT_TOKEN);
  console.log("  Task Marketplace:  ", TASK_MARKETPLACE);
  console.log("  Agent Registry:    ", AGENT_REGISTRY);

  // Deploy BatchOperations
  console.log("\nDeploying BatchOperations...");
  const BatchOperations = await ethers.getContractFactory("BatchOperations");
  const batchOperations = await BatchOperations.deploy(
    AGNT_TOKEN,
    TASK_MARKETPLACE,
    AGENT_REGISTRY,
    deployer.address
  );
  await batchOperations.waitForDeployment();
  const batchAddress = await batchOperations.getAddress();
  console.log("BatchOperations deployed to:", batchAddress);

  // Summary
  console.log("\n========================================");
  console.log("BatchOperations Deployment Complete!");
  console.log("========================================");
  console.log("BatchOperations: ", batchAddress);
  console.log("========================================");

  // Save deployment info
  const fs = require("fs");
  const path = require("path");
  
  // Try to load existing deployments
  let existingDeployments: any = {};
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  try {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  const deploymentInfo = {
    ...existingDeployments,
    contracts: {
      ...existingDeployments.contracts,
      BatchOperations: batchAddress,
    },
    batchDeployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
