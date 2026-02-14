import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying governance contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Load existing deployments
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const agntTokenAddress = deployments.contracts.AGNTToken;

  console.log("\nUsing AGNT Token at:", agntTokenAddress);

  // 1. Deploy TimelockController
  console.log("\n1. Deploying TimelockController...");
  const timelockDelay = 48 * 60 * 60; // 48 hours
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    timelockDelay,
    [], // proposers (set later)
    [], // executors (set later)
    deployer.address // admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("TimelockController deployed to:", timelockAddress);

  // 2. Deploy Treasury
  console.log("\n2. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(agntTokenAddress, timelockAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // 3. Deploy GovernorAgent
  console.log("\n3. Deploying GovernorAgent...");
  const GovernorAgent = await ethers.getContractFactory("GovernorAgent");
  
  // HashKey testnet: ~2 sec block time
  // Voting delay: ~1 day = 43200 blocks
  // Voting period: ~7 days = 302400 blocks
  // Proposal threshold: 1000 AGNT
  const votingDelay = 43200; // ~1 day
  const votingPeriod = 302400; // ~7 days  
  const proposalThreshold = ethers.parseEther("1000");
  
  const governor = await GovernorAgent.deploy(
    agntTokenAddress,
    timelockAddress,
    votingDelay,
    votingPeriod,
    proposalThreshold
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("GovernorAgent deployed to:", governorAddress);

  // 4. Set up Timelock roles
  console.log("\n4. Setting up Timelock roles...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  // Governor can propose
  await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  console.log("   - Governor granted PROPOSER_ROLE");

  // Anyone can execute (after timelock)
  await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  console.log("   - Open executor set");

  // Optionally revoke admin role from deployer (for full decentralization)
  // await timelock.revokeRole(ADMIN_ROLE, deployer.address);
  // console.log("   - Admin role revoked from deployer");

  // Update deployments.json
  deployments.contracts.TimelockController = timelockAddress;
  deployments.contracts.Treasury = treasuryAddress;
  deployments.contracts.GovernorAgent = governorAddress;
  deployments.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\n✅ Deployments updated in deployments.json");

  // Print summary
  console.log("\n========================================");
  console.log("🏛️  GOVERNANCE DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nContracts:");
  console.log(`  TimelockController: ${timelockAddress}`);
  console.log(`  Treasury:           ${treasuryAddress}`);
  console.log(`  GovernorAgent:      ${governorAddress}`);
  console.log("\nConfiguration:");
  console.log(`  Timelock Delay:     48 hours`);
  console.log(`  Quorum:             4%`);
  console.log(`  Voting Period:      7 days`);
  console.log(`  Proposal Threshold: 1,000 AGNT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
