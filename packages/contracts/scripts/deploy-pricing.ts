import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DynamicPricing with:", deployer.address);

  // Load existing deployment
  const deploymentPath = "./deployments.json";
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Deploy DynamicPricing
  console.log("\nDeploying DynamicPricing...");
  const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
  const dynamicPricing = await DynamicPricing.deploy(deployer.address);
  await dynamicPricing.waitForDeployment();
  const pricingAddress = await dynamicPricing.getAddress();
  console.log("DynamicPricing deployed to:", pricingAddress);

  // Update deployment
  deployment.contracts.DynamicPricing = pricingAddress;
  deployment.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n========================================");
  console.log("DynamicPricing Deployment Complete!");
  console.log("========================================");
  console.log("DynamicPricing:   ", pricingAddress);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
