import { describe, it, expect, beforeAll } from 'vitest';
import { parseEther, formatEther } from 'viem';
import {
  AgentHubClient,
  HASHKEY_TESTNET,
  TaskStatus,
  WorkflowStatus,
  StepStatus,
  StepType,
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
      expect(TaskStatus.Completed).toBe(2);
      expect(TaskStatus.Verified).toBe(3);
      expect(TaskStatus.Disputed).toBe(4);
      expect(TaskStatus.Cancelled).toBe(5);
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
});
