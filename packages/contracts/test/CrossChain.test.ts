import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CrossChainHub, CrossChainReceiver, AgentRegistry, AGNTToken } from "../typechain-types";

describe("CrossChain Agent Discovery", function () {
  async function deployFixture() {
    const [owner, relayer, agent1, agent2, agent3] = await ethers.getSigners();

    // Deploy AGNT Token
    const AGNTToken = await ethers.getContractFactory("AGNTToken");
    const agntToken = await AGNTToken.deploy(owner.address);

    // Deploy Agent Registry
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy(await agntToken.getAddress(), owner.address);

    // Deploy CrossChainHub
    const CrossChainHub = await ethers.getContractFactory("CrossChainHub");
    const hub = await CrossChainHub.deploy(await agentRegistry.getAddress());

    // Deploy CrossChainReceiver
    const CrossChainReceiver = await ethers.getContractFactory("CrossChainReceiver");
    const receiver = await CrossChainReceiver.deploy();

    // Configure
    await hub.setRelayer(relayer.address, true);
    await receiver.setRelayer(relayer.address, true);

    // Add destination chain to hub (simulating Ethereum mainnet)
    await hub.addChain(1, "Ethereum", await receiver.getAddress());

    // Add source chain to receiver (simulating HashKey chain)
    await receiver.addSourceChain(133, "HashKey Testnet", await hub.getAddress());

    return { 
      agntToken, 
      agentRegistry, 
      hub, 
      receiver, 
      owner, 
      relayer, 
      agent1, 
      agent2, 
      agent3 
    };
  }

  describe("CrossChainHub", function () {
    describe("Deployment", function () {
      it("Should set the agent registry address", async function () {
        const { hub, agentRegistry } = await loadFixture(deployFixture);
        expect(await hub.agentRegistry()).to.equal(await agentRegistry.getAddress());
      });

      it("Should set default minimum reputation", async function () {
        const { hub } = await loadFixture(deployFixture);
        expect(await hub.minReputationToBroadcast()).to.equal(5000);
      });

      it("Should set owner correctly", async function () {
        const { hub, owner } = await loadFixture(deployFixture);
        expect(await hub.owner()).to.equal(owner.address);
      });
    });

    describe("Chain Management", function () {
      it("Should add a destination chain", async function () {
        const { hub, receiver } = await loadFixture(deployFixture);
        
        const chain = await hub.supportedChains(1);
        expect(chain.chainId).to.equal(1);
        expect(chain.name).to.equal("Ethereum");
        expect(chain.receiverContract).to.equal(await receiver.getAddress());
        expect(chain.isActive).to.be.true;
      });

      it("Should reject duplicate chain", async function () {
        const { hub, receiver } = await loadFixture(deployFixture);
        
        await expect(
          hub.addChain(1, "Duplicate", await receiver.getAddress())
        ).to.be.revertedWithCustomError(hub, "ChainAlreadyExists");
      });

      it("Should remove a chain", async function () {
        const { hub } = await loadFixture(deployFixture);
        
        await hub.removeChain(1);
        const chain = await hub.supportedChains(1);
        expect(chain.isActive).to.be.false;
      });

      it("Should get supported chains", async function () {
        const { hub, owner } = await loadFixture(deployFixture);
        
        // Add another chain
        await hub.addChain(137, "Polygon", owner.address);
        
        const chains = await hub.getSupportedChains();
        expect(chains.length).to.equal(2);
      });
    });

    describe("Agent Broadcasting", function () {
      it("Should broadcast an agent", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          hub.connect(agent1).broadcastAgent(
            "TestAgent",
            "ipfs://metadata",
            ["code-review", "testing"],
            7500, // 75% reputation
            10
          )
        ).to.emit(hub, "AgentBroadcast")
          .withArgs(
            agent1.address,
            1, // chainId
            "TestAgent",
            "ipfs://metadata",
            ["code-review", "testing"],
            7500,
            10,
            (await ethers.provider.getBlock("latest"))!.timestamp + 1
          );

        expect(await hub.isBroadcasted(agent1.address)).to.be.true;
        expect(await hub.getBroadcastedAgentCount()).to.equal(1);
      });

      it("Should reject low reputation", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          hub.connect(agent1).broadcastAgent(
            "TestAgent",
            "ipfs://metadata",
            ["code-review"],
            3000, // 30% reputation - too low
            5
          )
        ).to.be.revertedWithCustomError(hub, "ReputationTooLow");
      });

      it("Should reject duplicate broadcast", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await hub.connect(agent1).broadcastAgent(
          "TestAgent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10
        );

        await expect(
          hub.connect(agent1).broadcastAgent(
            "TestAgent2",
            "ipfs://metadata2",
            ["testing"],
            8000,
            20
          )
        ).to.be.revertedWithCustomError(hub, "AlreadyBroadcasted");
      });

      it("Should require broadcast fee if set", async function () {
        const { hub, agent1, owner } = await loadFixture(deployFixture);
        
        const fee = ethers.parseEther("0.01");
        await hub.setBroadcastFee(fee);

        await expect(
          hub.connect(agent1).broadcastAgent(
            "TestAgent",
            "ipfs://metadata",
            ["code-review"],
            7500,
            10
          )
        ).to.be.revertedWithCustomError(hub, "InsufficientFee");

        // Should work with fee
        await hub.connect(agent1).broadcastAgent(
          "TestAgent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10,
          { value: fee }
        );

        expect(await hub.isBroadcasted(agent1.address)).to.be.true;
      });
    });

    describe("Update Broadcast", function () {
      it("Should update broadcasted agent info", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await hub.connect(agent1).broadcastAgent(
          "TestAgent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10
        );

        await hub.connect(agent1).updateBroadcast(
          "UpdatedAgent",
          "ipfs://new-metadata",
          ["code-review", "debugging"],
          8500,
          25
        );

        const agent = await hub.broadcastedAgents(agent1.address);
        expect(agent.name).to.equal("UpdatedAgent");
        expect(agent.reputationScore).to.equal(8500);
        expect(agent.totalTasksCompleted).to.equal(25);
      });

      it("Should reject update for non-broadcasted agent", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          hub.connect(agent1).updateBroadcast(
            "Agent",
            "ipfs://metadata",
            ["code-review"],
            7500,
            10
          )
        ).to.be.revertedWithCustomError(hub, "NotBroadcasted");
      });
    });

    describe("Revoke Broadcast", function () {
      it("Should revoke broadcast", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await hub.connect(agent1).broadcastAgent(
          "TestAgent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10
        );

        await expect(hub.connect(agent1).revokeBroadcast())
          .to.emit(hub, "AgentBroadcastRevoked")
          .withArgs(agent1.address, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

        expect(await hub.isBroadcasted(agent1.address)).to.be.false;
        expect(await hub.getBroadcastedAgentCount()).to.equal(0);
      });

      it("Should reject revoke for non-broadcasted agent", async function () {
        const { hub, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          hub.connect(agent1).revokeBroadcast()
        ).to.be.revertedWithCustomError(hub, "NotBroadcasted");
      });
    });
  });

  describe("CrossChainReceiver", function () {
    describe("Deployment", function () {
      it("Should set owner correctly", async function () {
        const { receiver, owner } = await loadFixture(deployFixture);
        expect(await receiver.owner()).to.equal(owner.address);
      });

      it("Should set default stale threshold", async function () {
        const { receiver } = await loadFixture(deployFixture);
        expect(await receiver.staleThreshold()).to.equal(7 * 24 * 60 * 60); // 7 days
      });
    });

    describe("Source Chain Management", function () {
      it("Should add a source chain", async function () {
        const { receiver, hub } = await loadFixture(deployFixture);
        
        const chain = await receiver.sourceChains(133);
        expect(chain.chainId).to.equal(133);
        expect(chain.name).to.equal("HashKey Testnet");
        expect(chain.hubContract).to.equal(await hub.getAddress());
        expect(chain.isActive).to.be.true;
      });

      it("Should reject duplicate source chain", async function () {
        const { receiver, hub } = await loadFixture(deployFixture);
        
        await expect(
          receiver.addSourceChain(133, "Duplicate", await hub.getAddress())
        ).to.be.revertedWithCustomError(receiver, "SourceChainAlreadyExists");
      });

      it("Should reject zero chain ID", async function () {
        const { receiver, hub } = await loadFixture(deployFixture);
        
        await expect(
          receiver.addSourceChain(0, "Invalid", await hub.getAddress())
        ).to.be.revertedWithCustomError(receiver, "InvalidChainId");
      });
    });

    describe("Agent Syncing", function () {
      it("Should sync an agent from relayer", async function () {
        const { receiver, relayer, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          receiver.connect(relayer).syncAgent(
            133, // sourceChainId
            agent1.address,
            "RemoteAgent",
            "ipfs://remote-metadata",
            ["code-review", "debugging"],
            8000,
            15
          )
        ).to.emit(receiver, "AgentSynced")
          .withArgs(
            133,
            agent1.address,
            "RemoteAgent",
            8000,
            (await ethers.provider.getBlock("latest"))!.timestamp + 1
          );

        expect(await receiver.totalRemoteAgents()).to.equal(1);
        expect(await receiver.isAgentActive(133, agent1.address)).to.be.true;
      });

      it("Should reject sync from non-relayer", async function () {
        const { receiver, agent1, agent2 } = await loadFixture(deployFixture);
        
        await expect(
          receiver.connect(agent1).syncAgent(
            133,
            agent2.address,
            "Agent",
            "ipfs://metadata",
            ["code-review"],
            7500,
            10
          )
        ).to.be.revertedWithCustomError(receiver, "NotAuthorizedRelayer");
      });

      it("Should reject sync from unregistered chain", async function () {
        const { receiver, relayer, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          receiver.connect(relayer).syncAgent(
            999, // unregistered chain
            agent1.address,
            "Agent",
            "ipfs://metadata",
            ["code-review"],
            7500,
            10
          )
        ).to.be.revertedWithCustomError(receiver, "SourceChainNotRegistered");
      });

      it("Should update existing agent on re-sync", async function () {
        const { receiver, relayer, agent1 } = await loadFixture(deployFixture);
        
        // Initial sync
        await receiver.connect(relayer).syncAgent(
          133,
          agent1.address,
          "Agent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10
        );

        // Re-sync with updated data
        await receiver.connect(relayer).syncAgent(
          133,
          agent1.address,
          "UpdatedAgent",
          "ipfs://new-metadata",
          ["code-review", "testing"],
          9000,
          25
        );

        // Should still be 1 agent
        expect(await receiver.totalRemoteAgents()).to.equal(1);
        
        const agent = await receiver.getAgent(133, agent1.address);
        expect(agent.name).to.equal("UpdatedAgent");
        expect(agent.reputationScore).to.equal(9000);
        expect(agent.totalTasksCompleted).to.equal(25);
      });
    });

    describe("Batch Syncing", function () {
      it("Should batch sync multiple agents", async function () {
        const { receiver, relayer, agent1, agent2, agent3 } = await loadFixture(deployFixture);
        
        await receiver.connect(relayer).batchSyncAgents(
          133,
          [agent1.address, agent2.address, agent3.address],
          ["Agent1", "Agent2", "Agent3"],
          ["ipfs://1", "ipfs://2", "ipfs://3"],
          [["code-review"], ["testing"], ["debugging"]],
          [8000, 7500, 9000],
          [10, 5, 20]
        );

        expect(await receiver.totalRemoteAgents()).to.equal(3);
        expect(await receiver.getAgentCountByChain(133)).to.equal(3);
      });
    });

    describe("Agent Removal", function () {
      it("Should remove an agent", async function () {
        const { receiver, relayer, agent1 } = await loadFixture(deployFixture);
        
        await receiver.connect(relayer).syncAgent(
          133,
          agent1.address,
          "Agent",
          "ipfs://metadata",
          ["code-review"],
          7500,
          10
        );

        await expect(receiver.connect(relayer).removeAgent(133, agent1.address))
          .to.emit(receiver, "AgentRemoved")
          .withArgs(133, agent1.address, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

        expect(await receiver.totalRemoteAgents()).to.equal(0);
        expect(await receiver.isAgentActive(133, agent1.address)).to.be.false;
      });

      it("Should reject removal of non-existent agent", async function () {
        const { receiver, relayer, agent1 } = await loadFixture(deployFixture);
        
        await expect(
          receiver.connect(relayer).removeAgent(133, agent1.address)
        ).to.be.revertedWithCustomError(receiver, "AgentNotFound");
      });
    });

    describe("Query Functions", function () {
      it("Should get agents by source chain", async function () {
        const { receiver, relayer, agent1, agent2 } = await loadFixture(deployFixture);
        
        await receiver.connect(relayer).syncAgent(
          133, agent1.address, "Agent1", "ipfs://1", ["code-review"], 8000, 10
        );
        await receiver.connect(relayer).syncAgent(
          133, agent2.address, "Agent2", "ipfs://2", ["testing"], 7500, 5
        );

        const agents = await receiver.getAgentsBySourceChain(133);
        expect(agents.length).to.equal(2);
        expect(agents[0].name).to.equal("Agent1");
        expect(agents[1].name).to.equal("Agent2");
      });

      it("Should get agents by capability", async function () {
        const { receiver, relayer, agent1, agent2 } = await loadFixture(deployFixture);
        
        await receiver.connect(relayer).syncAgent(
          133, agent1.address, "Agent1", "ipfs://1", ["code-review", "debugging"], 8000, 10
        );
        await receiver.connect(relayer).syncAgent(
          133, agent2.address, "Agent2", "ipfs://2", ["testing"], 7500, 5
        );

        const codeReviewAgents = await receiver.getAgentsByCapability("code-review", 133);
        expect(codeReviewAgents.filter(a => a.isActive).length).to.equal(1);
        expect(codeReviewAgents[0].name).to.equal("Agent1");
      });

      it("Should get all remote agents across chains", async function () {
        const { receiver, relayer, agent1, agent2, owner } = await loadFixture(deployFixture);
        
        // Add another source chain
        await receiver.addSourceChain(137, "Polygon", owner.address);
        await receiver.connect(relayer).syncAgent(
          133, agent1.address, "HashKeyAgent", "ipfs://1", ["code-review"], 8000, 10
        );
        await receiver.connect(relayer).syncAgent(
          137, agent2.address, "PolygonAgent", "ipfs://2", ["testing"], 7500, 5
        );

        const allAgents = await receiver.getAllRemoteAgents();
        expect(allAgents.length).to.equal(2);
      });
    });

    describe("Admin Functions", function () {
      it("Should update stale threshold", async function () {
        const { receiver, owner } = await loadFixture(deployFixture);
        
        const newThreshold = 14 * 24 * 60 * 60; // 14 days
        await receiver.setStaleThreshold(newThreshold);
        expect(await receiver.staleThreshold()).to.equal(newThreshold);
      });

      it("Should update source chain hub", async function () {
        const { receiver, owner, agent1 } = await loadFixture(deployFixture);
        
        await receiver.updateSourceChainHub(133, agent1.address);
        const chain = await receiver.sourceChains(133);
        expect(chain.hubContract).to.equal(agent1.address);
      });
    });
  });

  describe("End-to-End Flow", function () {
    it("Should complete full cross-chain discovery flow", async function () {
      const { hub, receiver, relayer, agent1 } = await loadFixture(deployFixture);

      // 1. Agent broadcasts on source chain (HashKey)
      await hub.connect(agent1).broadcastAgent(
        "CrossChainAgent",
        "ipfs://my-agent-metadata",
        ["code-review", "debugging", "testing"],
        8500,
        25
      );

      // 2. Verify broadcast on hub
      expect(await hub.isBroadcasted(agent1.address)).to.be.true;
      const broadcastedAgent = await hub.broadcastedAgents(agent1.address);
      expect(broadcastedAgent.name).to.equal("CrossChainAgent");

      // 3. Relayer syncs to destination chain (simulated Ethereum)
      const capabilities = await hub.getAgentCapabilities(agent1.address);
      await receiver.connect(relayer).syncAgent(
        133, // sourceChainId (HashKey Testnet)
        agent1.address,
        broadcastedAgent.name,
        broadcastedAgent.metadataURI,
        [...capabilities], // Convert readonly array to mutable
        broadcastedAgent.reputationScore,
        broadcastedAgent.totalTasksCompleted
      );

      // 4. Verify agent is discoverable on destination chain
      expect(await receiver.isAgentActive(133, agent1.address)).to.be.true;
      
      const remoteAgent = await receiver.getAgent(133, agent1.address);
      expect(remoteAgent.name).to.equal("CrossChainAgent");
      expect(remoteAgent.reputationScore).to.equal(8500);
      expect(remoteAgent.sourceChainId).to.equal(133);

      // 5. Can query by capability on destination chain
      const codeReviewers = await receiver.getAgentsByCapability("code-review", 133);
      expect(codeReviewers.filter(a => a.isActive).length).to.equal(1);

      // 6. Agent revokes broadcast on source chain
      await hub.connect(agent1).revokeBroadcast();
      expect(await hub.isBroadcasted(agent1.address)).to.be.false;

      // 7. Relayer removes from destination chain
      await receiver.connect(relayer).removeAgent(133, agent1.address);
      expect(await receiver.isAgentActive(133, agent1.address)).to.be.false;
    });
  });
});
