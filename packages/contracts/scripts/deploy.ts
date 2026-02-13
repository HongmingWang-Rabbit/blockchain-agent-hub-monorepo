import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // 1. Deploy AGNT Token
  console.log("\n1. Deploying AGNT Token...");
  const AGNTToken = await ethers.getContractFactory("AGNTToken");
  const agntToken = await AGNTToken.deploy(deployer.address);
  await agntToken.waitForDeployment();
  const agntAddress = await agntToken.getAddress();
  console.log("   AGNT Token deployed to:", agntAddress);

  // 2. Deploy Agent Registry
  console.log("\n2. Deploying Agent Registry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(agntAddress, deployer.address);
  await agentRegistry.waitForDeployment();
  const registryAddress = await agentRegistry.getAddress();
  console.log("   Agent Registry deployed to:", registryAddress);

  // 3. Deploy Task Marketplace
  console.log("\n3. Deploying Task Marketplace...");
  const TaskMarketplace = await ethers.getContractFactory("TaskMarketplace");
  const taskMarketplace = await TaskMarketplace.deploy(
    agntAddress,
    registryAddress,
    deployer.address
  );
  await taskMarketplace.waitForDeployment();
  const marketplaceAddress = await taskMarketplace.getAddress();
  console.log("   Task Marketplace deployed to:", marketplaceAddress);

  // 4. Configure permissions
  console.log("\n4. Configuring permissions...");
  
  // Add TaskMarketplace as a minter for AGNT (for future rewards)
  await agntToken.addMinter(registryAddress);
  console.log("   Added AgentRegistry as AGNT minter");

  // Add TaskMarketplace as a slasher in AgentRegistry
  await agentRegistry.addSlasher(marketplaceAddress);
  console.log("   Added TaskMarketplace as slasher");

  // Summary
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("AGNT Token:       ", agntAddress);
  console.log("Agent Registry:   ", registryAddress);
  console.log("Task Marketplace: ", marketplaceAddress);
  console.log("========================================");

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AGNTToken: agntAddress,
      AgentRegistry: registryAddress,
      TaskMarketplace: marketplaceAddress,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
