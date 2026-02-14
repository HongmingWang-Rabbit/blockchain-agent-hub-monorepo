import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('TaskMarketplace', function () {
  async function deployMarketplaceFixture() {
    const [owner, requester, agentOwner, arbiter] = await ethers.getSigners();

    // Deploy token
    const AGNTToken = await ethers.getContractFactory('AGNTToken');
    const token = await AGNTToken.deploy(owner.address);

    // Deploy registry
    const AgentRegistry = await ethers.getContractFactory('AgentRegistry');
    const registry = await AgentRegistry.deploy(await token.getAddress(), owner.address);

    // Deploy marketplace
    const TaskMarketplace = await ethers.getContractFactory('TaskMarketplace');
    const marketplace = await TaskMarketplace.deploy(
      await token.getAddress(),
      await registry.getAddress(),
      owner.address
    );

    // Add marketplace as slasher
    await registry.addSlasher(await marketplace.getAddress());

    // Transfer tokens
    const transferAmount = ethers.parseEther('10000');
    await token.transfer(requester.address, transferAmount);
    await token.transfer(agentOwner.address, transferAmount);

    // Approve spending
    await token.connect(requester).approve(await marketplace.getAddress(), transferAmount);
    await token.connect(agentOwner).approve(await registry.getAddress(), transferAmount);

    // Register an agent
    const tx = await registry.connect(agentOwner).registerAgent(
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

    // Get latest block timestamp for consistent deadline calculations
    const latestTime = await time.latest();

    return { token, registry, marketplace, owner, requester, agentOwner, agentId, latestTime };
  }

  describe('Task Creation', function () {
    it('Should create a task successfully', async function () {
      const { marketplace, requester, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400; // 24h from now

      const tx = await marketplace.connect(requester).createTask(
        'Summarize Document',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );

      await expect(tx).to.emit(marketplace, 'TaskCreated');
    });

    it('Should reject task with reward below minimum', async function () {
      const { marketplace, requester, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      await expect(
        marketplace.connect(requester).createTask(
          'Test Task',
          'ipfs://task-desc',
          ['text-generation'],
          ethers.parseEther('0.5'), // Below 1 AGNT minimum
          deadline,
          false
        )
      ).to.be.revertedWith('Reward too low');
    });

    it('Should reject task with past deadline', async function () {
      const { marketplace, requester, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime - 100; // In the past

      await expect(
        marketplace.connect(requester).createTask(
          'Test Task',
          'ipfs://task-desc',
          ['text-generation'],
          ethers.parseEther('10'),
          deadline,
          false
        )
      ).to.be.revertedWith('Deadline must be in future');
    });

    it('Should escrow tokens on task creation', async function () {
      const { marketplace, requester, token, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;
      const reward = ethers.parseEther('10');

      const balanceBefore = await token.balanceOf(requester.address);

      await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        reward,
        deadline,
        false
      );

      const balanceAfter = await token.balanceOf(requester.address);
      expect(balanceBefore - balanceAfter).to.equal(reward);
    });
  });

  describe('Task Acceptance', function () {
    it('Should allow agent to accept task', async function () {
      const { marketplace, requester, agentOwner, agentId, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await expect(
        marketplace.connect(agentOwner).acceptTask(taskId, agentId)
      ).to.emit(marketplace, 'TaskAssigned');

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(1); // Assigned
    });

    it('Should reject acceptance of non-open task', async function () {
      const { marketplace, requester, agentOwner, agentId, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      // Accept once
      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);

      // Try to accept again
      await expect(
        marketplace.connect(agentOwner).acceptTask(taskId, agentId)
      ).to.be.revertedWith('Task not open');
    });
  });

  describe('Result Submission', function () {
    async function createAndAcceptTask() {
      const fixture = await loadFixture(deployMarketplaceFixture);
      const { marketplace, requester, agentOwner, agentId, latestTime } = fixture;
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);

      return { ...fixture, taskId };
    }

    it('Should allow agent to submit result', async function () {
      const { marketplace, agentOwner, taskId } = await createAndAcceptTask();

      await expect(
        marketplace.connect(agentOwner).submitResult(taskId, 'ipfs://result')
      ).to.emit(marketplace, 'TaskSubmitted');

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(2); // Submitted
      expect(task.resultURI).to.equal('ipfs://result');
    });

    it('Should reject submission by non-assigned agent', async function () {
      const { marketplace, requester, taskId } = await createAndAcceptTask();

      await expect(
        marketplace.connect(requester).submitResult(taskId, 'ipfs://result')
      ).to.be.revertedWith('Not assigned agent owner');
    });
  });

  describe('Result Approval', function () {
    async function createSubmittedTask() {
      const fixture = await loadFixture(deployMarketplaceFixture);
      const { marketplace, requester, agentOwner, agentId, token, latestTime } = fixture;
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('100'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);
      await marketplace.connect(agentOwner).submitResult(taskId, 'ipfs://result');

      return { ...fixture, taskId };
    }

    it('Should approve result and pay agent', async function () {
      const { marketplace, requester, agentOwner, token, taskId } = await createSubmittedTask();

      const balanceBefore = await token.balanceOf(agentOwner.address);

      await marketplace.connect(requester).approveResult(taskId);

      const balanceAfter = await token.balanceOf(agentOwner.address);
      // 100 AGNT reward - 2.5% fee = 97.5 AGNT
      const expectedPayout = ethers.parseEther('97.5');
      expect(balanceAfter - balanceBefore).to.equal(expectedPayout);

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(4); // Completed
    });

    it('Should reject approval by non-requester', async function () {
      const { marketplace, agentOwner, taskId } = await createSubmittedTask();

      await expect(
        marketplace.connect(agentOwner).approveResult(taskId)
      ).to.be.revertedWith('Not requester');
    });
  });

  describe('Disputes', function () {
    async function createSubmittedTask() {
      const fixture = await loadFixture(deployMarketplaceFixture);
      const { marketplace, requester, agentOwner, agentId, latestTime } = fixture;
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('100'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);
      await marketplace.connect(agentOwner).submitResult(taskId, 'ipfs://result');

      return { ...fixture, taskId };
    }

    it('Should allow requester to reject result', async function () {
      const { marketplace, requester, taskId } = await createSubmittedTask();

      await expect(
        marketplace.connect(requester).rejectResult(taskId, 'Poor quality')
      ).to.emit(marketplace, 'TaskDisputed');

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(5); // Disputed
    });

    it('Should resolve dispute in favor of agent', async function () {
      const { marketplace, requester, agentOwner, owner, token, taskId } = await createSubmittedTask();

      await marketplace.connect(requester).rejectResult(taskId, 'Poor quality');

      const balanceBefore = await token.balanceOf(agentOwner.address);
      await marketplace.connect(owner).resolveDispute(taskId, true);
      const balanceAfter = await token.balanceOf(agentOwner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(4); // Completed
    });

    it('Should resolve dispute against agent', async function () {
      const { marketplace, requester, owner, token, taskId } = await createSubmittedTask();

      await marketplace.connect(requester).rejectResult(taskId, 'Poor quality');

      const balanceBefore = await token.balanceOf(requester.address);
      await marketplace.connect(owner).resolveDispute(taskId, false);
      const balanceAfter = await token.balanceOf(requester.address);

      // Requester should get refund
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('100'));

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(7); // Failed
    });
  });

  describe('Task Cancellation', function () {
    it('Should allow requester to cancel open task', async function () {
      const { marketplace, requester, token, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;
      const reward = ethers.parseEther('50');

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        reward,
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      const balanceBefore = await token.balanceOf(requester.address);
      await marketplace.connect(requester).cancelTask(taskId);
      const balanceAfter = await token.balanceOf(requester.address);

      expect(balanceAfter - balanceBefore).to.equal(reward);

      const task = await marketplace.tasks(taskId);
      expect(task.status).to.equal(6); // Cancelled
    });

    it('Should reject cancellation of assigned task', async function () {
      const { marketplace, requester, agentOwner, agentId, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);

      await expect(
        marketplace.connect(requester).cancelTask(taskId)
      ).to.be.revertedWith('Task not open');
    });
  });

  describe('Auto Release', function () {
    it('Should auto-release after timeout', async function () {
      const { marketplace, requester, agentOwner, agentId, token, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('100'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);
      await marketplace.connect(agentOwner).submitResult(taskId, 'ipfs://result');

      // Fast forward 7 days
      await time.increase(7 * 24 * 60 * 60 + 1);

      const balanceBefore = await token.balanceOf(agentOwner.address);
      await marketplace.autoRelease(taskId);
      const balanceAfter = await token.balanceOf(agentOwner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it('Should reject auto-release before timeout', async function () {
      const { marketplace, requester, agentOwner, agentId, latestTime } = await loadFixture(deployMarketplaceFixture);
      const deadline = latestTime + 86400;

      const tx = await marketplace.connect(requester).createTask(
        'Test Task',
        'ipfs://task-desc',
        ['text-generation'],
        ethers.parseEther('100'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const event: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId = event?.args?.taskId;

      await marketplace.connect(agentOwner).acceptTask(taskId, agentId);
      await marketplace.connect(agentOwner).submitResult(taskId, 'ipfs://result');

      await expect(
        marketplace.autoRelease(taskId)
      ).to.be.revertedWith('Timeout not reached');
    });
  });
});
