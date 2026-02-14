import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("Gasless Contracts (ERC-2771)", function () {
  async function deployGaslessFixture() {
    const [owner, user1, user2, relayer] = await ethers.getSigners();

    // Deploy Forwarder
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy();

    // Deploy AGNT Token
    const AGNTToken = await ethers.getContractFactory("AGNTToken");
    const token = await AGNTToken.deploy(owner.address);

    // Deploy AgentRegistryGasless with forwarder
    const AgentRegistryGasless = await ethers.getContractFactory("AgentRegistryGasless");
    const registry = await AgentRegistryGasless.deploy(
      await token.getAddress(),
      owner.address,
      await forwarder.getAddress()
    );

    // Deploy TaskMarketplaceGasless with forwarder
    const TaskMarketplaceGasless = await ethers.getContractFactory("TaskMarketplaceGasless");
    const marketplace = await TaskMarketplaceGasless.deploy(
      await token.getAddress(),
      await registry.getAddress(),
      owner.address,
      await forwarder.getAddress()
    );

    // Mint tokens to users
    await token.mint(user1.address, ethers.parseEther("10000"));
    await token.mint(user2.address, ethers.parseEther("10000"));

    // Approve tokens for registry and marketplace
    await token.connect(user1).approve(await registry.getAddress(), ethers.MaxUint256);
    await token.connect(user1).approve(await marketplace.getAddress(), ethers.MaxUint256);
    await token.connect(user2).approve(await registry.getAddress(), ethers.MaxUint256);
    await token.connect(user2).approve(await marketplace.getAddress(), ethers.MaxUint256);

    // Add marketplace as slasher
    await registry.addSlasher(await marketplace.getAddress());

    return { owner, user1, user2, relayer, forwarder, token, registry, marketplace };
  }

  describe("Forwarder Deployment", function () {
    it("Should deploy forwarder correctly", async function () {
      const { forwarder } = await loadFixture(deployGaslessFixture);
      expect(await forwarder.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("AgentRegistryGasless", function () {
    it("Should recognize trusted forwarder", async function () {
      const { registry, forwarder } = await loadFixture(deployGaslessFixture);
      expect(await registry.isTrustedForwarder(await forwarder.getAddress())).to.be.true;
    });

    it("Should register agent normally (without meta-tx)", async function () {
      const { registry, token, user1 } = await loadFixture(deployGaslessFixture);
      
      const tx = await registry.connect(user1).registerAgent(
        "TestAgent",
        "ipfs://metadata",
        ["code-review"],
        ethers.parseEther("100")
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return registry.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "AgentRegistered";
        } catch { return false; }
      });
      
      expect(event).to.not.be.undefined;
    });

    it("Should execute meta-transaction through forwarder", async function () {
      const { registry, forwarder, token, user1, relayer } = await loadFixture(deployGaslessFixture);
      
      // Prepare the call data for registerAgent
      const callData = registry.interface.encodeFunctionData("registerAgent", [
        "MetaTxAgent",
        "ipfs://metadata",
        ["text-generation"],
        ethers.parseEther("100")
      ]);

      // Get the nonce for user1
      const nonce = await forwarder.nonces(user1.address);

      // Build the ForwardRequest struct
      // ERC2771Forwarder in OZ v5 uses a specific struct
      const registryAddress = await registry.getAddress();
      
      // Current block timestamp + some buffer for deadline
      const deadline = BigInt(await time.latest()) + 3600n;

      // Create the EIP-712 typed data
      const domain = {
        name: "AgentHub Forwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await forwarder.getAddress()
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint48" },
          { name: "data", type: "bytes" }
        ]
      };

      const request = {
        from: user1.address,
        to: registryAddress,
        value: 0n,
        gas: 500000n,
        nonce: nonce,
        deadline: deadline,
        data: callData
      };

      // Sign the request with user1
      const signature = await user1.signTypedData(domain, types, request);

      // Relayer submits the request (pays gas)
      // Build the full request struct with signature
      const fullRequest = {
        from: user1.address,
        to: registryAddress,
        value: 0n,
        gas: 500000n,
        deadline: deadline,
        data: callData,
        signature: signature
      };

      // Execute through forwarder (relayer pays gas)
      await forwarder.connect(relayer).execute(fullRequest);

      // Verify agent was created with user1 as owner
      const agentIds = await registry.ownerAgents(user1.address, 0);
      const agent = await registry.agents(agentIds);
      expect(agent.owner).to.equal(user1.address);
      expect(agent.name).to.equal("MetaTxAgent");
    });

    it("Should reject invalid signature", async function () {
      const { registry, forwarder, user1, user2, relayer } = await loadFixture(deployGaslessFixture);
      
      const callData = registry.interface.encodeFunctionData("registerAgent", [
        "BadAgent",
        "ipfs://bad",
        ["hacking"],
        ethers.parseEther("100")
      ]);

      const nonce = await forwarder.nonces(user1.address);
      const deadline = BigInt(await time.latest()) + 3600n;
      const registryAddress = await registry.getAddress();

      const domain = {
        name: "AgentHub Forwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await forwarder.getAddress()
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint48" },
          { name: "data", type: "bytes" }
        ]
      };

      // Request claims to be from user1
      const request = {
        from: user1.address,
        to: registryAddress,
        value: 0n,
        gas: 500000n,
        nonce: nonce,
        deadline: deadline,
        data: callData
      };

      // But user2 signs it (wrong signer)
      const badSignature = await user2.signTypedData(domain, types, request);

      const fullRequest = {
        from: user1.address,
        to: registryAddress,
        value: 0n,
        gas: 500000n,
        deadline: deadline,
        data: callData,
        signature: badSignature
      };

      // Should revert with invalid signer
      await expect(
        forwarder.connect(relayer).execute(fullRequest)
      ).to.be.revertedWithCustomError(forwarder, "ERC2771ForwarderInvalidSigner");
    });
  });

  describe("TaskMarketplaceGasless", function () {
    it("Should recognize trusted forwarder", async function () {
      const { marketplace, forwarder } = await loadFixture(deployGaslessFixture);
      expect(await marketplace.isTrustedForwarder(await forwarder.getAddress())).to.be.true;
    });

    it("Should create task normally", async function () {
      const { marketplace, user1 } = await loadFixture(deployGaslessFixture);
      
      const deadline = BigInt(await time.latest()) + 86400n; // 1 day
      
      await expect(
        marketplace.connect(user1).createTask(
          "Test Task",
          "ipfs://task",
          ["code-review"],
          ethers.parseEther("50"),
          deadline,
          false
        )
      ).to.emit(marketplace, "TaskCreated");
    });

    it("Should execute createTask via meta-transaction", async function () {
      const { marketplace, forwarder, user1, relayer } = await loadFixture(deployGaslessFixture);
      
      const taskDeadline = BigInt(await time.latest()) + 86400n;
      
      const callData = marketplace.interface.encodeFunctionData("createTask", [
        "Meta Task",
        "ipfs://meta-task",
        ["text-generation"],
        ethers.parseEther("25"),
        taskDeadline,
        false
      ]);

      const nonce = await forwarder.nonces(user1.address);
      const requestDeadline = BigInt(await time.latest()) + 3600n;
      const marketplaceAddress = await marketplace.getAddress();

      const domain = {
        name: "AgentHub Forwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await forwarder.getAddress()
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint48" },
          { name: "data", type: "bytes" }
        ]
      };

      const request = {
        from: user1.address,
        to: marketplaceAddress,
        value: 0n,
        gas: 600000n,
        nonce: nonce,
        deadline: requestDeadline,
        data: callData
      };

      const signature = await user1.signTypedData(domain, types, request);

      const fullRequest = {
        from: user1.address,
        to: marketplaceAddress,
        value: 0n,
        gas: 600000n,
        deadline: requestDeadline,
        data: callData,
        signature: signature
      };

      // Execute via relayer
      const tx = await forwarder.connect(relayer).execute(fullRequest);
      await tx.wait();

      // Verify task was created
      const taskCount = await marketplace.getTaskCount();
      expect(taskCount).to.equal(1n);
      
      // Verify the task belongs to user1
      const taskIds = await marketplace.requesterTasks(user1.address, 0);
      const task = await marketplace.tasks(taskIds);
      expect(task.requester).to.equal(user1.address);
      expect(task.title).to.equal("Meta Task");
    });
  });

  describe("Integration: Full Gasless Flow", function () {
    it("Should complete full agent registration and task flow gaslessly", async function () {
      const { registry, marketplace, forwarder, token, user1, user2, relayer, owner } = await loadFixture(deployGaslessFixture);
      
      const domain = {
        name: "AgentHub Forwarder",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await forwarder.getAddress()
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint48" },
          { name: "data", type: "bytes" }
        ]
      };

      // Step 1: User1 registers an agent (gaslessly)
      const registerData = registry.interface.encodeFunctionData("registerAgent", [
        "GaslessAgent",
        "ipfs://gasless",
        ["code-review", "testing"],
        ethers.parseEther("200")
      ]);

      let nonce = await forwarder.nonces(user1.address);
      let deadline = BigInt(await time.latest()) + 3600n;
      
      let request = {
        from: user1.address,
        to: await registry.getAddress(),
        value: 0n,
        gas: 600000n,
        nonce: nonce,
        deadline: deadline,
        data: registerData
      };

      let signature = await user1.signTypedData(domain, types, request);
      
      await forwarder.connect(relayer).execute({
        ...request,
        signature: signature
      });

      // Verify registration
      const agentId = await registry.ownerAgents(user1.address, 0);
      const agent = await registry.agents(agentId);
      expect(agent.name).to.equal("GaslessAgent");

      // Step 2: User2 creates a task (gaslessly)
      const taskDeadline = BigInt(await time.latest()) + 86400n;
      const createTaskData = marketplace.interface.encodeFunctionData("createTask", [
        "Gasless Task",
        "ipfs://gasless-task",
        ["code-review"],
        ethers.parseEther("100"),
        taskDeadline,
        false
      ]);

      nonce = await forwarder.nonces(user2.address);
      deadline = BigInt(await time.latest()) + 3600n;
      
      request = {
        from: user2.address,
        to: await marketplace.getAddress(),
        value: 0n,
        gas: 600000n,
        nonce: nonce,
        deadline: deadline,
        data: createTaskData
      };

      signature = await user2.signTypedData(domain, types, request);
      
      await forwarder.connect(relayer).execute({
        ...request,
        signature: signature
      });

      // Verify task
      const taskId = await marketplace.requesterTasks(user2.address, 0);
      const task = await marketplace.tasks(taskId);
      expect(task.title).to.equal("Gasless Task");
      expect(task.requester).to.equal(user2.address);

      // Step 3: User1's agent accepts the task (gaslessly)
      const acceptData = marketplace.interface.encodeFunctionData("acceptTask", [
        taskId,
        agentId
      ]);

      nonce = await forwarder.nonces(user1.address);
      deadline = BigInt(await time.latest()) + 3600n;
      
      request = {
        from: user1.address,
        to: await marketplace.getAddress(),
        value: 0n,
        gas: 400000n,
        nonce: nonce,
        deadline: deadline,
        data: acceptData
      };

      signature = await user1.signTypedData(domain, types, request);
      
      await forwarder.connect(relayer).execute({
        ...request,
        signature: signature
      });

      // Verify task is assigned
      const updatedTask = await marketplace.tasks(taskId);
      expect(updatedTask.assignedAgent).to.equal(agentId);
      expect(updatedTask.status).to.equal(1); // Assigned
    });
  });
});
