import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('AgentRegistry', function () {
  async function deployRegistryFixture() {
    const [owner, agent1Owner, agent2Owner, slasher] = await ethers.getSigners();

    // Deploy token
    const AGNTToken = await ethers.getContractFactory('AGNTToken');
    const token = await AGNTToken.deploy(owner.address);

    // Deploy registry
    const AgentRegistry = await ethers.getContractFactory('AgentRegistry');
    const registry = await AgentRegistry.deploy(await token.getAddress(), owner.address);

    // Transfer some tokens to agent owners
    const transferAmount = ethers.parseEther('10000');
    await token.transfer(agent1Owner.address, transferAmount);
    await token.transfer(agent2Owner.address, transferAmount);

    // Approve registry to spend tokens
    await token.connect(agent1Owner).approve(await registry.getAddress(), transferAmount);
    await token.connect(agent2Owner).approve(await registry.getAddress(), transferAmount);

    return { token, registry, owner, agent1Owner, agent2Owner, slasher };
  }

  describe('Agent Registration', function () {
    it('Should register an agent successfully', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);
      const stakeAmount = ethers.parseEther('100');

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation', 'code-review'],
        stakeAmount
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      expect(event).to.not.be.undefined;
    });

    it('Should reject registration with insufficient stake', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);
      const stakeAmount = ethers.parseEther('50'); // Below min 100

      await expect(
        registry.connect(agent1Owner).registerAgent(
          'Test Agent',
          'ipfs://metadata',
          ['text-generation'],
          stakeAmount
        )
      ).to.be.revertedWith('Insufficient stake');
    });

    it('Should reject registration with empty name', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      await expect(
        registry.connect(agent1Owner).registerAgent(
          '',
          'ipfs://metadata',
          ['text-generation'],
          ethers.parseEther('100')
        )
      ).to.be.revertedWith('Name required');
    });

    it('Should reject registration with no capabilities', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      await expect(
        registry.connect(agent1Owner).registerAgent(
          'Test Agent',
          'ipfs://metadata',
          [],
          ethers.parseEther('100')
        )
      ).to.be.revertedWith('At least one capability required');
    });

    it('Should start with 50% reputation', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      const agent = await registry.agents(agentId);
      expect(agent.reputationScore).to.equal(5000); // 50%
    });

    it('Should index by capability', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation', 'code-review'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      const textGenAgents = await registry.getAgentsByCapability('text-generation');
      const codeReviewAgents = await registry.getAgentsByCapability('code-review');

      expect(textGenAgents).to.include(agentId);
      expect(codeReviewAgents).to.include(agentId);
    });
  });

  describe('Staking', function () {
    it('Should add stake correctly', async function () {
      const { registry, agent1Owner, token } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(agent1Owner).addStake(agentId, ethers.parseEther('50'));

      const agent = await registry.agents(agentId);
      expect(agent.stakedAmount).to.equal(ethers.parseEther('150'));
    });

    it('Should withdraw stake correctly', async function () {
      const { registry, agent1Owner, token } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('200')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(agent1Owner).withdrawStake(agentId, ethers.parseEther('50'));

      const agent = await registry.agents(agentId);
      expect(agent.stakedAmount).to.equal(ethers.parseEther('150'));
    });

    it('Should reject withdrawal below minimum stake', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('150')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await expect(
        registry.connect(agent1Owner).withdrawStake(agentId, ethers.parseEther('60'))
      ).to.be.revertedWith('Must maintain minimum stake');
    });
  });

  describe('Agent Management', function () {
    it('Should update metadata', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://old-metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(agent1Owner).updateAgent(agentId, 'ipfs://new-metadata');

      const agent = await registry.agents(agentId);
      expect(agent.metadataURI).to.equal('ipfs://new-metadata');
    });

    it('Should deactivate agent', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(agent1Owner).deactivateAgent(agentId);

      const agent = await registry.agents(agentId);
      expect(agent.isActive).to.be.false;
    });

    it('Should reactivate agent', async function () {
      const { registry, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(agent1Owner).deactivateAgent(agentId);
      await registry.connect(agent1Owner).reactivateAgent(agentId);

      const agent = await registry.agents(agentId);
      expect(agent.isActive).to.be.true;
    });

    it('Should reject non-owner updates', async function () {
      const { registry, agent1Owner, agent2Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await expect(
        registry.connect(agent2Owner).updateAgent(agentId, 'ipfs://hacked')
      ).to.be.revertedWith('Not agent owner');
    });
  });

  describe('Slashing', function () {
    it('Should slash agent correctly', async function () {
      const { registry, owner, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('1000')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(owner).slashAgent(agentId, 'Bad behavior');

      const agent = await registry.agents(agentId);
      // 10% slash of 1000 = 100, so remaining should be 900
      expect(agent.stakedAmount).to.equal(ethers.parseEther('900'));
      // Reputation should decrease by 500
      expect(agent.reputationScore).to.equal(4500);
    });

    it('Should auto-deactivate if slashing drops below min stake', async function () {
      const { registry, owner, agent1Owner } = await loadFixture(deployRegistryFixture);

      // Register with exactly minimum stake
      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(owner).slashAgent(agentId, 'Bad behavior');

      const agent = await registry.agents(agentId);
      expect(agent.isActive).to.be.false;
    });
  });

  describe('Task Recording', function () {
    it('Should record successful task', async function () {
      const { registry, owner, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      const earned = ethers.parseEther('10');
      await registry.connect(owner).recordTask(agentId, true, earned);

      const agent = await registry.agents(agentId);
      expect(agent.tasksCompleted).to.equal(1);
      expect(agent.totalEarned).to.equal(earned);
      expect(agent.reputationScore).to.equal(5100); // 5000 + 100
    });

    it('Should record failed task', async function () {
      const { registry, owner, agent1Owner } = await loadFixture(deployRegistryFixture);

      const tx = await registry.connect(agent1Owner).registerAgent(
        'Test Agent',
        'ipfs://metadata',
        ['text-generation'],
        ethers.parseEther('100')
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AgentRegistered'
      );
      const agentId = event?.args?.agentId;

      await registry.connect(owner).recordTask(agentId, false, 0);

      const agent = await registry.agents(agentId);
      expect(agent.tasksFailed).to.equal(1);
      expect(agent.reputationScore).to.equal(4800); // 5000 - 200
    });
  });
});
