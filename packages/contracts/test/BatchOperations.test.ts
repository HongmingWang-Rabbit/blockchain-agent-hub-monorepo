import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('BatchOperations', function () {
  async function deployBatchFixture() {
    const [owner, requester, agentOwner, user2] = await ethers.getSigners();

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

    // Deploy batch operations
    const BatchOperations = await ethers.getContractFactory('BatchOperations');
    const batch = await BatchOperations.deploy(
      await token.getAddress(),
      await marketplace.getAddress(),
      await registry.getAddress(),
      owner.address
    );

    // Add marketplace as slasher
    await registry.addSlasher(await marketplace.getAddress());

    // Transfer tokens
    const transferAmount = ethers.parseEther('100000');
    await token.transfer(requester.address, transferAmount);
    await token.transfer(agentOwner.address, transferAmount);

    // Approve spending for batch operations
    await token.connect(requester).approve(await batch.getAddress(), transferAmount);
    await token.connect(requester).approve(await marketplace.getAddress(), transferAmount);
    await token.connect(agentOwner).approve(await registry.getAddress(), transferAmount);

    // Register an agent
    const tx = await registry.connect(agentOwner).registerAgent(
      'Test Agent',
      'ipfs://metadata',
      ['text-generation', 'code-review', 'debugging'],
      ethers.parseEther('100')
    );
    const receipt = await tx.wait();
    const event: any = receipt?.logs.find(
      (log: any) => log.fragment?.name === 'AgentRegistered'
    );
    const agentId = event?.args?.agentId;

    const latestTime = await time.latest();

    return { 
      token, registry, marketplace, batch, 
      owner, requester, agentOwner, user2, 
      agentId, latestTime 
    };
  }

  describe('Batch Task Creation', function () {
    it('Should create multiple tasks in a single batch', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const tasks = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 2',
          descriptionURI: 'ipfs://task2',
          requiredCapabilities: ['code-review'],
          reward: ethers.parseEther('15'),
          deadline,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 3',
          descriptionURI: 'ipfs://task3',
          requiredCapabilities: ['debugging'],
          reward: ethers.parseEther('20'),
          deadline,
          requiresHumanVerification: true,
        },
      ];

      const tx = await batch.connect(requester).createTaskBatch(tasks);
      const receipt = await tx.wait();

      // Check BatchCreated event
      const batchCreatedEvent: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'BatchCreated'
      );
      expect(batchCreatedEvent).to.not.be.undefined;
      expect(batchCreatedEvent?.args?.taskCount).to.equal(3n);
      expect(batchCreatedEvent?.args?.totalReward).to.equal(ethers.parseEther('45'));

      // Verify batch tasks
      const batchId = batchCreatedEvent?.args?.batchId;
      const batchTasks = await batch.getBatchTasks(batchId);
      expect(batchTasks.length).to.equal(3);
    });

    it('Should track user batches', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const tasks = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
      ];

      await batch.connect(requester).createTaskBatch(tasks);
      await batch.connect(requester).createTaskBatch(tasks);

      const userBatches = await batch.getUserBatches(requester.address);
      expect(userBatches.length).to.equal(2);
    });

    it('Should reject empty batch', async function () {
      const { batch, requester } = await loadFixture(deployBatchFixture);

      await expect(batch.connect(requester).createTaskBatch([]))
        .to.be.revertedWith('Empty batch');
    });

    it('Should reject batch exceeding max size', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      // Create 21 tasks (max is 20)
      const tasks = Array(21).fill(null).map((_, i) => ({
        title: `Task ${i}`,
        descriptionURI: `ipfs://task${i}`,
        requiredCapabilities: ['text-generation'],
        reward: ethers.parseEther('1'),
        deadline,
        requiresHumanVerification: false,
      }));

      await expect(batch.connect(requester).createTaskBatch(tasks))
        .to.be.revertedWith('Batch too large');
    });

    it('Should emit BatchTaskCreated for each task', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const tasks = [
        {
          title: 'Task A',
          descriptionURI: 'ipfs://taskA',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
        {
          title: 'Task B',
          descriptionURI: 'ipfs://taskB',
          requiredCapabilities: ['code-review'],
          reward: ethers.parseEther('15'),
          deadline,
          requiresHumanVerification: false,
        },
      ];

      const tx = await batch.connect(requester).createTaskBatch(tasks);
      
      await expect(tx).to.emit(batch, 'BatchTaskCreated');
    });
  });

  describe('Template Batch Creation', function () {
    it('Should create tasks from template', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const titles = ['Review PR #1', 'Review PR #2', 'Review PR #3'];
      const tx = await batch.connect(requester).createTaskBatchFromTemplate(
        titles,
        'ipfs://pr-review-template',
        ['code-review'],
        ethers.parseEther('25'),
        deadline,
        false
      );

      const receipt = await tx.wait();
      const batchCreatedEvent: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'BatchCreated'
      );

      expect(batchCreatedEvent?.args?.taskCount).to.equal(3n);
      expect(batchCreatedEvent?.args?.totalReward).to.equal(ethers.parseEther('75'));
    });

    it('Should reject template with no titles', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      await expect(
        batch.connect(requester).createTaskBatchFromTemplate(
          [],
          'ipfs://template',
          ['code-review'],
          ethers.parseEther('10'),
          deadline,
          false
        )
      ).to.be.revertedWith('No titles provided');
    });
  });

  describe('Batch Cost Calculation', function () {
    it('Should calculate correct total cost', async function () {
      const { batch, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const tasks = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 2',
          descriptionURI: 'ipfs://task2',
          requiredCapabilities: ['code-review'],
          reward: ethers.parseEther('25'),
          deadline,
          requiresHumanVerification: false,
        },
      ];

      const totalCost = await batch.calculateBatchCost(tasks);
      expect(totalCost).to.equal(ethers.parseEther('35'));
    });
  });

  describe('Batch Cancellation Helper', function () {
    it('Should identify tasks eligible for cancellation', async function () {
      const { batch, marketplace, requester, user2, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      // Create tasks directly through marketplace
      const tx1 = await marketplace.connect(requester).createTask(
        'Cancel Me 1',
        'ipfs://cancel1',
        ['text-generation'],
        ethers.parseEther('10'),
        deadline,
        false
      );
      const receipt1 = await tx1.wait();
      const event1: any = receipt1?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId1 = event1?.args?.taskId;

      const tx2 = await marketplace.connect(requester).createTask(
        'Cancel Me 2',
        'ipfs://cancel2',
        ['code-review'],
        ethers.parseEther('15'),
        deadline,
        false
      );
      const receipt2 = await tx2.wait();
      const event2: any = receipt2?.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      const taskId2 = event2?.args?.taskId;

      // Check eligibility for requester (should find both)
      const eligible = await batch.getTasksEligibleForCancel([taskId1, taskId2], requester.address);
      expect(eligible.length).to.equal(2);

      // Check eligibility for different user (should find none)
      const notEligible = await batch.getTasksEligibleForCancel([taskId1, taskId2], user2.address);
      expect(notEligible.length).to.equal(0);
    });
  });

  describe('Admin Functions', function () {
    it('Should update max batch size', async function () {
      const { batch, owner } = await loadFixture(deployBatchFixture);

      await expect(batch.connect(owner).setMaxBatchSize(30))
        .to.emit(batch, 'MaxBatchSizeUpdated')
        .withArgs(20, 30);

      expect(await batch.maxBatchSize()).to.equal(30);
    });

    it('Should reject invalid batch size', async function () {
      const { batch, owner } = await loadFixture(deployBatchFixture);

      await expect(batch.connect(owner).setMaxBatchSize(0))
        .to.be.revertedWith('Invalid batch size');

      await expect(batch.connect(owner).setMaxBatchSize(51))
        .to.be.revertedWith('Invalid batch size');
    });

    it('Should only allow owner to update settings', async function () {
      const { batch, requester } = await loadFixture(deployBatchFixture);

      await expect(batch.connect(requester).setMaxBatchSize(30))
        .to.be.revertedWithCustomError(batch, 'OwnableUnauthorizedAccount');
    });
  });

  describe('Batch Statistics', function () {
    it('Should track total batch count', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      expect(await batch.getBatchCount()).to.equal(0);

      const tasks = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
      ];

      await batch.connect(requester).createTaskBatch(tasks);
      expect(await batch.getBatchCount()).to.equal(1);

      await batch.connect(requester).createTaskBatch(tasks);
      expect(await batch.getBatchCount()).to.equal(2);
    });
  });

  describe('Token Handling', function () {
    it('Should transfer correct amount for batch', async function () {
      const { batch, token, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const initialBalance = await token.balanceOf(requester.address);

      const tasks = [
        {
          title: 'Task 1',
          descriptionURI: 'ipfs://task1',
          requiredCapabilities: ['text-generation'],
          reward: ethers.parseEther('10'),
          deadline,
          requiresHumanVerification: false,
        },
        {
          title: 'Task 2',
          descriptionURI: 'ipfs://task2',
          requiredCapabilities: ['code-review'],
          reward: ethers.parseEther('20'),
          deadline,
          requiresHumanVerification: false,
        },
      ];

      await batch.connect(requester).createTaskBatch(tasks);

      const finalBalance = await token.balanceOf(requester.address);
      expect(initialBalance - finalBalance).to.equal(ethers.parseEther('30'));
    });
  });

  describe('Large Batch Handling', function () {
    it('Should handle maximum batch size (20 tasks)', async function () {
      const { batch, requester, latestTime } = await loadFixture(deployBatchFixture);
      const deadline = latestTime + 86400;

      const tasks = Array(20).fill(null).map((_, i) => ({
        title: `Task ${i + 1}`,
        descriptionURI: `ipfs://task${i + 1}`,
        requiredCapabilities: ['text-generation'],
        reward: ethers.parseEther('1'),
        deadline,
        requiresHumanVerification: false,
      }));

      const tx = await batch.connect(requester).createTaskBatch(tasks);
      const receipt = await tx.wait();

      const batchCreatedEvent: any = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'BatchCreated'
      );
      expect(batchCreatedEvent?.args?.taskCount).to.equal(20n);
    });
  });
});
