import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying cross-chain contracts with:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'HSK');

  // Load existing deployments
  const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const agentRegistryAddress = deployments.contracts.AgentRegistry;
  console.log('\nUsing AgentRegistry:', agentRegistryAddress);

  // Deploy CrossChainHub
  console.log('\nDeploying CrossChainHub...');
  const CrossChainHub = await ethers.getContractFactory('CrossChainHub');
  const crossChainHub = await CrossChainHub.deploy(agentRegistryAddress);
  await crossChainHub.waitForDeployment();
  const hubAddress = await crossChainHub.getAddress();
  console.log('CrossChainHub deployed to:', hubAddress);

  // Deploy CrossChainReceiver (for receiving on other chains, but we deploy on HashKey for testing)
  console.log('\nDeploying CrossChainReceiver...');
  const CrossChainReceiver = await ethers.getContractFactory('CrossChainReceiver');
  const crossChainReceiver = await CrossChainReceiver.deploy();
  await crossChainReceiver.waitForDeployment();
  const receiverAddress = await crossChainReceiver.getAddress();
  console.log('CrossChainReceiver deployed to:', receiverAddress);

  // Add some example supported chains to the Hub
  console.log('\nAdding supported chains...');
  
  // Add Ethereum Mainnet (example - receiver would be deployed there)
  await crossChainHub.addChain(1, 'Ethereum', ethers.ZeroAddress); // ZeroAddress as placeholder
  console.log('Added Ethereum (chainId: 1)');
  
  // Add Polygon
  await crossChainHub.addChain(137, 'Polygon', ethers.ZeroAddress);
  console.log('Added Polygon (chainId: 137)');
  
  // Add Arbitrum One
  await crossChainHub.addChain(42161, 'Arbitrum', ethers.ZeroAddress);
  console.log('Added Arbitrum (chainId: 42161)');

  // Add Base
  await crossChainHub.addChain(8453, 'Base', ethers.ZeroAddress);
  console.log('Added Base (chainId: 8453)');

  // Update deployments.json
  deployments.contracts.CrossChainHub = hubAddress;
  deployments.contracts.CrossChainReceiver = receiverAddress;
  deployments.timestamp = new Date().toISOString();

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log('\nUpdated deployments.json');

  console.log('\n===== Cross-Chain Deployment Summary =====');
  console.log('CrossChainHub:', hubAddress);
  console.log('CrossChainReceiver:', receiverAddress);
  console.log('Supported Chains: Ethereum, Polygon, Arbitrum, Base');
  console.log('==========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
