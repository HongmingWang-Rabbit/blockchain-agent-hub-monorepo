import { describe, it, expect, beforeAll } from 'vitest';
import { parseEther, formatEther } from 'viem';
import {
  AgentHubClient,
  HASHKEY_TESTNET,
  TaskStatus,
  WorkflowStatus,
  StepStatus,
  StepType,
  ProposalState,
  SpendingCategory,
  type BroadcastedAgent,
  type ChainConfig,
  type RemoteAgent,
} from './index';

describe('AgentHubClient', () => {
  let client: AgentHubClient;

  beforeAll(() => {
    client = new AgentHubClient({
      network: HASHKEY_TESTNET,
    });
  });

  describe('initialization', () => {
    it('should create client with testnet config', () => {
      expect(client).toBeDefined();
      expect(client.publicClient).toBeDefined();
      expect(client.walletClient).toBeUndefined();
    });

    it('should have correct network config', () => {
      expect(client.network.chainId).toBe(133);
      expect(client.network.contracts.agntToken).toBe('0x7379C9d687F8c22d41be43fE510F8225afF253f6');
      expect(client.network.contracts.agentRegistry).toBe('0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49');
      expect(client.network.contracts.taskMarketplace).toBe('0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061');
      expect(client.network.contracts.agentNFT).toBe('0x4476e726B4030923bD29C98F8881Da2727B6a0B6');
      expect(client.network.contracts.workflowEngine).toBe('0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd');
      expect(client.network.contracts.dynamicPricing).toBe('0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3');
    });

    it('should have all optional contracts available', () => {
      expect(client.hasNFTContract()).toBe(true);
      expect(client.hasWorkflowEngine()).toBe(true);
      expect(client.hasDynamicPricing()).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should parse amount correctly', () => {
      const amount = client.parseAmount('100');
      expect(amount).toBe(parseEther('100'));
    });

    it('should format amount correctly', () => {
      const formatted = client.formatAmount(parseEther('100'));
      expect(formatted).toBe('100');
    });

    it('should handle decimal amounts', () => {
      const amount = client.parseAmount('123.456');
      expect(client.formatAmount(amount)).toBe('123.456');
    });
  });

  describe('types and enums', () => {
    it('should have TaskStatus enum', () => {
      expect(TaskStatus.Open).toBe(0);
      expect(TaskStatus.Assigned).toBe(1);
      expect(TaskStatus.Submitted).toBe(2);
      expect(TaskStatus.PendingReview).toBe(3);
      expect(TaskStatus.Completed).toBe(4);
      expect(TaskStatus.Disputed).toBe(5);
      expect(TaskStatus.Cancelled).toBe(6);
      expect(TaskStatus.Failed).toBe(7);
    });

    it('should have WorkflowStatus enum', () => {
      expect(WorkflowStatus.Draft).toBe(0);
      expect(WorkflowStatus.Active).toBe(1);
      expect(WorkflowStatus.Completed).toBe(2);
      expect(WorkflowStatus.Failed).toBe(3);
      expect(WorkflowStatus.Cancelled).toBe(4);
    });

    it('should have StepStatus enum', () => {
      expect(StepStatus.Pending).toBe(0);
      expect(StepStatus.Ready).toBe(1);
      expect(StepStatus.InProgress).toBe(2);
      expect(StepStatus.Completed).toBe(3);
      expect(StepStatus.Failed).toBe(4);
    });

    it('should have StepType enum', () => {
      expect(StepType.Sequential).toBe(0);
      expect(StepType.Parallel).toBe(1);
      expect(StepType.Conditional).toBe(2);
    });
  });

  describe('read operations (live testnet)', () => {
    it('should get agent count', async () => {
      const count = await client.getAgentCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get task count', async () => {
      const count = await client.getTaskCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get workflow count', async () => {
      const count = await client.getWorkflowCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get NFT total supply', async () => {
      const supply = await client.getNFTTotalSupply();
      expect(typeof supply).toBe('number');
      expect(supply).toBeGreaterThanOrEqual(0);
    });

    it('should get minimum stake', async () => {
      const minStake = await client.getMinStake();
      expect(typeof minStake).toBe('bigint');
      expect(minStake).toBeGreaterThan(0n);
    });

    it('should get platform fee', async () => {
      const fee = await client.getPlatformFee();
      expect(typeof fee).toBe('number');
      expect(fee).toBeGreaterThanOrEqual(0);
      expect(fee).toBeLessThan(100);
    });

    it('should get token balance for address', async () => {
      const balance = await client.getTokenBalance('0x0000000000000000000000000000000000000001');
      expect(typeof balance).toBe('bigint');
    });

    it('should get formatted balance', async () => {
      const balance = await client.getFormattedBalance('0x0000000000000000000000000000000000000001');
      expect(typeof balance).toBe('string');
    });

    it('should check if address has agent NFT', async () => {
      const hasNFT = await client.hasAgentNFT('0x0000000000000000000000000000000000000001');
      expect(typeof hasNFT).toBe('boolean');
    });
  });

  describe('dynamic pricing operations (live testnet)', () => {
    it('should check peak hours status', async () => {
      const isPeak = await client.isPeakHours();
      expect(typeof isPeak).toBe('boolean');
    });

    it('should get surge multiplier', async () => {
      const multiplier = await client.getSurgeMultiplier();
      expect(typeof multiplier).toBe('number');
      expect(multiplier).toBeGreaterThanOrEqual(10000); // At least 1x (10000 basis points)
    });

    it('should get reputation discount for various levels', async () => {
      const lowDiscount = await client.getReputationDiscount(5000);
      const highDiscount = await client.getReputationDiscount(9500);
      const perfectDiscount = await client.getReputationDiscount(10000);
      
      expect(typeof lowDiscount).toBe('number');
      expect(typeof highDiscount).toBe('number');
      expect(typeof perfectDiscount).toBe('number');
      
      // Higher reputation should get equal or better discount
      expect(highDiscount).toBeGreaterThanOrEqual(lowDiscount);
      expect(perfectDiscount).toBeGreaterThanOrEqual(highDiscount);
    });

    it('should get pricing info', async () => {
      const info = await client.getPricingInfo();
      expect(info).toHaveProperty('currentSurge');
      expect(info).toHaveProperty('isPeak');
      expect(info).toHaveProperty('tasksLastHour');
      expect(info).toHaveProperty('nextSurgeAt');
      expect(typeof info.currentSurge).toBe('number');
      expect(typeof info.isPeak).toBe('boolean');
    });
  });

  describe('agent query operations', () => {
    it('should return null for non-existent agent', async () => {
      const nonExistentId = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
      const agent = await client.getAgent(nonExistentId);
      expect(agent).toBeNull();
    });

    it('should return empty array for unknown capability', async () => {
      const agents = await client.getAgentsByCapability('non-existent-capability-xyz');
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBe(0);
    });
  });

  describe('task query operations', () => {
    it('should return null for non-existent task', async () => {
      const nonExistentId = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
      const task = await client.getTask(nonExistentId);
      expect(task).toBeNull();
    });
  });

  describe('workflow query operations', () => {
    it('should return null for non-existent workflow', async () => {
      const nonExistentId = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
      const workflow = await client.getWorkflow(nonExistentId);
      expect(workflow).toBeNull();
    });

    it('should return empty array for non-existent workflow steps', async () => {
      const nonExistentId = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
      const steps = await client.getWorkflowSteps(nonExistentId);
      expect(Array.isArray(steps)).toBe(true);
    });

    it('should return empty ready steps for non-existent workflow', async () => {
      const nonExistentId = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
      const readySteps = await client.getReadySteps(nonExistentId);
      expect(Array.isArray(readySteps)).toBe(true);
    });
  });

  describe('write operations (no wallet - should throw)', () => {
    it('should throw when registering agent without wallet', async () => {
      await expect(
        client.registerAgent({
          name: 'Test Agent',
          metadataURI: 'ipfs://test',
          capabilities: ['test'],
          stakeAmount: parseEther('100'),
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when creating task without wallet', async () => {
      await expect(
        client.createTask({
          title: 'Test Task',
          descriptionURI: 'ipfs://test',
          requiredCapabilities: ['test'],
          reward: parseEther('10'),
          deadline: new Date(Date.now() + 86400000),
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when creating workflow without wallet', async () => {
      await expect(
        client.createWorkflow({
          name: 'Test Workflow',
          description: 'Test description',
          budget: parseEther('100'),
          deadline: new Date(Date.now() + 86400000),
        })
      ).rejects.toThrow('Wallet client required');
    });
  });

  describe('governance operations (live testnet)', () => {
    it('should have governance contracts configured', () => {
      expect(client.hasGovernor()).toBe(true);
      expect(client.hasTreasury()).toBe(true);
    });

    it('should have correct governance contract addresses', () => {
      expect(client.network.contracts.governor).toBe('0x626496716673bb5E7F2634d2eBc96ae0697713a4');
      expect(client.network.contracts.treasury).toBe('0xdc454EfAa5eEBF4D6786750f664bCff461C68b33');
      expect(client.network.contracts.timelock).toBe('0x0F8538a8829c1658eac0D20B11421828d2099c1C');
    });

    it('should get governor name', async () => {
      const name = await client.getGovernorName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should get voting delay', async () => {
      const delay = await client.getVotingDelay();
      expect(typeof delay).toBe('bigint');
    });

    it('should get voting period', async () => {
      const period = await client.getVotingPeriod();
      expect(typeof period).toBe('bigint');
      expect(period).toBeGreaterThan(0n);
    });

    it('should get proposal threshold', async () => {
      const threshold = await client.getProposalThreshold();
      expect(typeof threshold).toBe('bigint');
    });
  });

  describe('treasury operations (live testnet)', () => {
    it('should get treasury balance', async () => {
      const balance = await client.getTreasuryBalance();
      expect(typeof balance).toBe('bigint');
    });

    it('should check treasury paused status', async () => {
      const paused = await client.isTreasuryPaused();
      expect(typeof paused).toBe('boolean');
    });

    it('should get category limits', async () => {
      const grantsLimit = await client.getCategoryLimit(SpendingCategory.Grants);
      const rewardsLimit = await client.getCategoryLimit(SpendingCategory.Rewards);
      
      expect(typeof grantsLimit).toBe('bigint');
      expect(typeof rewardsLimit).toBe('bigint');
    });

    it('should get remaining budget for categories', async () => {
      const remaining = await client.getRemainingBudget(SpendingCategory.Operations);
      expect(typeof remaining).toBe('bigint');
    });

    it('should get period duration', async () => {
      const duration = await client.getPeriodDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should get time until period reset', async () => {
      const timeUntil = await client.getTimeUntilPeriodReset();
      expect(typeof timeUntil).toBe('number');
    });

    it('should get full treasury status', async () => {
      const status = await client.getTreasuryStatus();
      
      expect(status).toHaveProperty('balance');
      expect(status).toHaveProperty('paused');
      expect(status).toHaveProperty('periodStart');
      expect(status).toHaveProperty('periodDuration');
      expect(status).toHaveProperty('timeUntilReset');
      expect(status).toHaveProperty('categoryBudgets');
      
      expect(typeof status.balance).toBe('bigint');
      expect(typeof status.paused).toBe('boolean');
      expect(status.periodStart).toBeInstanceOf(Date);
      expect(Array.isArray(status.categoryBudgets)).toBe(true);
      expect(status.categoryBudgets.length).toBe(5); // 5 categories
      
      // Check category budget structure
      status.categoryBudgets.forEach(cb => {
        expect(cb).toHaveProperty('category');
        expect(cb).toHaveProperty('limit');
        expect(cb).toHaveProperty('spent');
        expect(cb).toHaveProperty('remaining');
      });
    });
  });

  describe('delegation operations (live testnet)', () => {
    it('should get current delegate for zero address', async () => {
      const delegate = await client.getDelegate('0x0000000000000000000000000000000000000001');
      expect(typeof delegate).toBe('string');
    });

    it('should get current votes for zero address', async () => {
      const votes = await client.getCurrentVotes('0x0000000000000000000000000000000000000001');
      expect(typeof votes).toBe('bigint');
    });
  });

  describe('governance write operations (no wallet - should throw)', () => {
    it('should throw when creating proposal without wallet', async () => {
      await expect(
        client.propose({
          targets: ['0x0000000000000000000000000000000000000001'],
          values: [0n],
          calldatas: ['0x'],
          description: 'Test Proposal',
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when casting vote without wallet', async () => {
      await expect(
        client.castVote({
          proposalId: 1n,
          support: 1,
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when delegating without wallet', async () => {
      await expect(
        client.delegateVotes('0x0000000000000000000000000000000000000001')
      ).rejects.toThrow('Wallet client required');
    });
  });

  describe('cross-chain operations (live testnet)', () => {
    it('should have cross-chain contracts configured', () => {
      expect(client.hasCrossChainHub()).toBe(true);
      expect(client.hasCrossChainReceiver()).toBe(true);
    });

    it('should have correct cross-chain contract addresses', () => {
      expect(client.network.contracts.crossChainHub).toBe('0x6349F97FEeb19D9646a34f81904b50bB704FAD08');
      expect(client.network.contracts.crossChainReceiver).toBe('0x5Ae42BA8EDcB98deFF361E088AF09F9880e5C2b9');
    });

    it('should get broadcast fee', async () => {
      const fee = await client.getBroadcastFee();
      expect(typeof fee).toBe('bigint');
    });

    it('should get minimum reputation to broadcast', async () => {
      const minRep = await client.getMinReputationToBroadcast();
      expect(typeof minRep).toBe('number');
      expect(minRep).toBeGreaterThanOrEqual(0);
      expect(minRep).toBeLessThanOrEqual(10000);
    });

    it('should check if agent is broadcasted', async () => {
      const isBroadcasted = await client.isAgentBroadcasted('0x0000000000000000000000000000000000000001');
      expect(typeof isBroadcasted).toBe('boolean');
    });

    it('should get broadcasted agent count', async () => {
      const count = await client.getBroadcastedAgentCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get all broadcasted agents', async () => {
      const agents = await client.getBroadcastedAgents();
      expect(Array.isArray(agents)).toBe(true);
      
      if (agents.length > 0) {
        const agent = agents[0];
        expect(agent).toHaveProperty('owner');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('metadataURI');
        expect(agent).toHaveProperty('capabilities');
        expect(agent).toHaveProperty('reputationScore');
        expect(agent).toHaveProperty('totalTasksCompleted');
        expect(agent).toHaveProperty('broadcastTimestamp');
        expect(agent).toHaveProperty('isActive');
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(agent.broadcastTimestamp).toBeInstanceOf(Date);
      }
    });

    it('should get supported chains', async () => {
      const chains = await client.getSupportedChains();
      expect(Array.isArray(chains)).toBe(true);
      
      if (chains.length > 0) {
        const chain = chains[0];
        expect(chain).toHaveProperty('chainId');
        expect(chain).toHaveProperty('name');
        expect(chain).toHaveProperty('receiverContract');
        expect(chain).toHaveProperty('isActive');
        expect(typeof chain.chainId).toBe('number');
        expect(typeof chain.name).toBe('string');
      }
    });
  });

  describe('cross-chain receiver operations (live testnet)', () => {
    it('should get remote agent count', async () => {
      const count = await client.getRemoteAgentCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get all remote agents', async () => {
      const agents = await client.getAllRemoteAgents();
      expect(Array.isArray(agents)).toBe(true);
      
      if (agents.length > 0) {
        const agent = agents[0];
        expect(agent).toHaveProperty('owner');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('sourceChainId');
        expect(agent).toHaveProperty('lastSyncTimestamp');
        expect(agent.lastSyncTimestamp).toBeInstanceOf(Date);
      }
    });

    it('should get remote agents by chain', async () => {
      const agents = await client.getRemoteAgentsByChain(1); // Ethereum mainnet
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should get remote agents by capability', async () => {
      const agents = await client.getRemoteAgentsByCapability('code-review');
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should get remote agents by capability and chain', async () => {
      const agents = await client.getRemoteAgentsByCapability('code-review', 1);
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('cross-chain write operations (no wallet - should throw)', () => {
    it('should throw when broadcasting agent without wallet', async () => {
      await expect(
        client.broadcastAgent({
          name: 'Test Agent',
          metadataURI: 'ipfs://test',
          capabilities: ['test'],
          reputationScore: 8500,
          totalTasksCompleted: 10,
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when updating broadcast without wallet', async () => {
      await expect(
        client.updateBroadcast({
          name: 'Test Agent Updated',
          metadataURI: 'ipfs://test',
          capabilities: ['test'],
          reputationScore: 9000,
          totalTasksCompleted: 15,
        })
      ).rejects.toThrow('Wallet client required');
    });

    it('should throw when revoking broadcast without wallet', async () => {
      await expect(client.revokeBroadcast()).rejects.toThrow('Wallet client required');
    });
  });
});
