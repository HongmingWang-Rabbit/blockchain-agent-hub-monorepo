import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying WorkflowEngine with:", deployer.address);

  // Load existing deployment
  const deploymentPath = "./deployments.json";
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Existing contracts:", Object.keys(deployment.contracts));

  // Deploy WorkflowEngine
  console.log("\nDeploying WorkflowEngine...");
  const WorkflowEngine = await ethers.getContractFactory("WorkflowEngine");
  const workflowEngine = await WorkflowEngine.deploy(
    deployment.contracts.AGNTToken,
    deployment.contracts.AgentRegistry,
    deployment.contracts.TaskMarketplace,
    deployer.address
  );
  await workflowEngine.waitForDeployment();
  const workflowAddress = await workflowEngine.getAddress();
  console.log("WorkflowEngine deployed to:", workflowAddress);

  // Update deployment
  deployment.contracts.WorkflowEngine = workflowAddress;
  deployment.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n========================================");
  console.log("WorkflowEngine Deployment Complete!");
  console.log("========================================");
  console.log("WorkflowEngine:   ", workflowAddress);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
