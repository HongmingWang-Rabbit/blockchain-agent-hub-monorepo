/**
 * Post-Deployment SDK Updater
 * 
 * Automatically updates the SDK's network configuration with deployed contract addresses.
 * Run after deploying contracts to update packages/sdk/src/types.ts
 * 
 * Usage:
 *   npx hardhat run scripts/update-sdk-addresses.ts --network hashkey        # testnet
 *   npx hardhat run scripts/update-sdk-addresses.ts --network hashkeyMainnet # mainnet
 */

import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'hardhat';

interface DeploymentData {
  network: string;
  chainId: string;
  contracts: Record<string, string>;
}

// Contract name mapping from deployment to SDK config
const CONTRACT_MAP: Record<string, string> = {
  'AGNTToken': 'agntToken',
  'AgentRegistry': 'agentRegistry',
  'TaskMarketplace': 'taskMarketplace',
  'AgentNFT': 'agentNFT',
  'WorkflowEngine': 'workflowEngine',
  'DynamicPricing': 'dynamicPricing',
  'Forwarder': 'forwarder',
  'GovernorAgent': 'governor',
  'Treasury': 'treasury',
  'TimelockController': 'timelock',
  'CrossChainHub': 'crossChainHub',
  'CrossChainReceiver': 'crossChainReceiver',
  'BatchOperations': 'batchOperations',
};

async function main() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        SDK ADDRESS UPDATER                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Network: ${network.name} (chainId: ${chainId})\n`);
  
  // Determine config name based on network
  const isMainnet = chainId === 177;
  const configName = isMainnet ? 'HASHKEY_MAINNET' : 'HASHKEY_TESTNET';
  
  // Find deployment file
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => 
    f.includes(network.name) || f.includes(`chain-${chainId}`)
  );
  
  let deploymentData: DeploymentData | null = null;
  
  // Try to find the most recent deployment file
  if (deploymentFiles.length > 0) {
    const latestFile = deploymentFiles.sort().reverse()[0];
    const filePath = path.join(deploymentsDir, latestFile);
    deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Using deployment: ${latestFile}\n`);
  } else {
    // Try to read from hardcoded addresses in README or latest deployment
    const readmePath = path.join(__dirname, '..', '..', '..', 'README.md');
    const readme = fs.readFileSync(readmePath, 'utf8');
    
    // Extract addresses from README table
    const contracts: Record<string, string> = {};
    const addressRegex = /\| ([A-Za-z ]+) \| `(0x[a-fA-F0-9]{40})` \|/g;
    let match;
    
    while ((match = addressRegex.exec(readme)) !== null) {
      const contractName = match[1].trim().replace(/ /g, '');
      const address = match[2];
      
      // Map to deployment names
      if (contractName === 'AGNTToken') contracts.AGNTToken = address;
      else if (contractName === 'AgentRegistry') contracts.AgentRegistry = address;
      else if (contractName === 'TaskMarketplace') contracts.TaskMarketplace = address;
      else if (contractName === 'AgentNFT') contracts.AgentNFT = address;
      else if (contractName === 'WorkflowEngine') contracts.WorkflowEngine = address;
      else if (contractName === 'DynamicPricing') contracts.DynamicPricing = address;
      else if (contractName === 'CrossChainHub') contracts.CrossChainHub = address;
      else if (contractName === 'CrossChainReceiver') contracts.CrossChainReceiver = address;
      else if (contractName === 'BatchOperations') contracts.BatchOperations = address;
      else if (contractName === 'GovernorAgent') contracts.GovernorAgent = address;
      else if (contractName === 'Treasury') contracts.Treasury = address;
      else if (contractName === 'TimelockController') contracts.TimelockController = address;
    }
    
    deploymentData = {
      network: network.name,
      chainId: chainId.toString(),
      contracts
    };
    
    console.log('Extracted addresses from README.md\n');
  }
  
  if (!deploymentData || Object.keys(deploymentData.contracts).length === 0) {
    console.error('❌ No deployment data found. Run deploy-all.ts first.');
    process.exit(1);
  }
  
  // Update SDK types.ts
  const sdkTypesPath = path.join(__dirname, '..', '..', 'sdk', 'src', 'types.ts');
  let sdkTypes = fs.readFileSync(sdkTypesPath, 'utf8');
  
  console.log('Updating SDK addresses:\n');
  
  // Build the new contracts object
  const sdkContracts: Record<string, string> = {};
  for (const [deployName, address] of Object.entries(deploymentData.contracts)) {
    const sdkName = CONTRACT_MAP[deployName];
    if (sdkName) {
      sdkContracts[sdkName] = address;
      console.log(`   ${sdkName}: ${address}`);
    }
  }
  
  // Generate the replacement config block
  const configRegex = new RegExp(
    `export const ${configName}: NetworkConfig = \\{[^}]+contracts: \\{[^}]+\\}[^}]*\\};`,
    's'
  );
  
  const rpcUrl = isMainnet 
    ? 'https://mainnet.hashkeychain.com'
    : 'https://hashkeychain-testnet.alt.technology';
  
  const contractEntries = Object.entries(sdkContracts)
    .map(([key, addr]) => `    ${key}: '${addr}' as Address,`)
    .join('\n');
  
  const newConfig = `export const ${configName}: NetworkConfig = {
  chainId: ${chainId},
  rpcUrl: '${rpcUrl}',
  contracts: {
${contractEntries}
  },
};`;
  
  // Replace the config
  if (configRegex.test(sdkTypes)) {
    sdkTypes = sdkTypes.replace(configRegex, newConfig);
    fs.writeFileSync(sdkTypesPath, sdkTypes);
    console.log(`\n✅ Updated ${configName} in packages/sdk/src/types.ts`);
  } else {
    console.log(`\n⚠️  Could not find ${configName} config block. Manual update required.`);
    console.log('\nAdd this to packages/sdk/src/types.ts:\n');
    console.log(newConfig);
  }
  
  // Also create/update a JSON addresses file for the webapp
  const webappEnvExample = path.join(__dirname, '..', '..', 'webapp', '.env.example');
  const envContent = `# HashKey Chain ${isMainnet ? 'Mainnet' : 'Testnet'} Configuration
# Generated: ${new Date().toISOString()}

NEXT_PUBLIC_CHAIN_ID=${chainId}
NEXT_PUBLIC_AGNT_TOKEN=${sdkContracts.agntToken || ''}
NEXT_PUBLIC_AGENT_REGISTRY=${sdkContracts.agentRegistry || ''}
NEXT_PUBLIC_TASK_MARKETPLACE=${sdkContracts.taskMarketplace || ''}
NEXT_PUBLIC_AGENT_NFT=${sdkContracts.agentNFT || ''}
NEXT_PUBLIC_WORKFLOW_ENGINE=${sdkContracts.workflowEngine || ''}
NEXT_PUBLIC_DYNAMIC_PRICING=${sdkContracts.dynamicPricing || ''}
NEXT_PUBLIC_BATCH_OPERATIONS=${sdkContracts.batchOperations || ''}
NEXT_PUBLIC_GOVERNOR=${sdkContracts.governor || ''}
NEXT_PUBLIC_TREASURY=${sdkContracts.treasury || ''}
NEXT_PUBLIC_CROSSCHAIN_HUB=${sdkContracts.crossChainHub || ''}

# RPC
NEXT_PUBLIC_RPC_URL=${rpcUrl}

# WalletConnect (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
`;
  
  fs.writeFileSync(webappEnvExample, envContent);
  console.log(`✅ Updated packages/webapp/.env.example\n`);
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║               UPDATE COMPLETE                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('Next steps:');
  console.log('  1. Rebuild SDK: cd packages/sdk && npm run build');
  console.log('  2. Update webapp: cd packages/webapp && cp .env.example .env.local');
  console.log('  3. Commit changes: git add -A && git commit -m "chore: update addresses"');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
