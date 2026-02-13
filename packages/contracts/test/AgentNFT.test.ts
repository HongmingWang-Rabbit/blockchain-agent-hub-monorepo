import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AgentNFT, AGNTToken } from "../typechain-types";

describe("AgentNFT", function () {
  async function deployFixture() {
    const [owner, agent1, agent2, registry] = await ethers.getSigners();

    // Deploy AgentNFT
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const agentNFT = await AgentNFT.deploy(owner.address);

    // Set registry
    await agentNFT.setAgentRegistry(registry.address);

    return { agentNFT, owner, agent1, agent2, registry };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { agentNFT, owner } = await loadFixture(deployFixture);
      expect(await agentNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      const { agentNFT } = await loadFixture(deployFixture);
      expect(await agentNFT.name()).to.equal("Agent Identity");
      expect(await agentNFT.symbol()).to.equal("AGENT-ID");
    });

    it("Should allow owner to set agent registry", async function () {
      const { agentNFT, registry } = await loadFixture(deployFixture);
      expect(await agentNFT.agentRegistry()).to.equal(registry.address);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT for agent via registry", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await expect(
        agentNFT.connect(registry).mintAgentNFT(
          agent1.address,
          "TestAgent",
          ["code-review", "debugging"]
        )
      )
        .to.emit(agentNFT, "AgentNFTMinted")
        .withArgs(agent1.address, 0, "TestAgent");

      expect(await agentNFT.balanceOf(agent1.address)).to.equal(1);
      expect(await agentNFT.ownerOf(0)).to.equal(agent1.address);
      expect(await agentNFT.hasNFT(agent1.address)).to.be.true;
    });

    it("Should award newcomer badge on mint", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      const badges = await agentNFT.getBadges(0);
      expect(badges.length).to.equal(1);
      expect(badges[0].name).to.equal("Newcomer");
    });

    it("Should prevent minting twice for same agent", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(registry).mintAgentNFT(
          agent1.address,
          "TestAgent2",
          ["debugging"]
        )
      ).to.be.revertedWithCustomError(agentNFT, "AlreadyHasNFT");
    });

    it("Should only allow registry to mint", async function () {
      const { agentNFT, agent1, agent2 } = await loadFixture(deployFixture);

      await expect(
        agentNFT.connect(agent2).mintAgentNFT(
          agent1.address,
          "TestAgent",
          ["code-review"]
        )
      ).to.be.revertedWithCustomError(agentNFT, "OnlyAgentRegistry");
    });
  });

  describe("Soulbound (No Transfers)", function () {
    it("Should prevent transfers between addresses", async function () {
      const { agentNFT, agent1, agent2, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(agent1).transferFrom(agent1.address, agent2.address, 0)
      ).to.be.revertedWithCustomError(agentNFT, "TransferNotAllowed");
    });

    it("Should prevent approvals", async function () {
      const { agentNFT, agent1, agent2, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(agent1).approve(agent2.address, 0)
      ).to.be.revertedWithCustomError(agentNFT, "TransferNotAllowed");
    });

    it("Should prevent setApprovalForAll", async function () {
      const { agentNFT, agent1, agent2, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(agent1).setApprovalForAll(agent2.address, true)
      ).to.be.revertedWithCustomError(agentNFT, "TransferNotAllowed");
    });
  });

  describe("Reputation Updates", function () {
    it("Should update reputation", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(registry).updateReputation(agent1.address, 7500, 5)
      )
        .to.emit(agentNFT, "ReputationUpdated")
        .withArgs(0, 7500);

      const identity = await agentNFT.agentIdentities(0);
      expect(identity.reputationScore).to.equal(7500);
      expect(identity.tasksCompleted).to.equal(5);
    });

    it("Should fail if agent has no NFT", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await expect(
        agentNFT.connect(registry).updateReputation(agent1.address, 7500, 5)
      ).to.be.revertedWithCustomError(agentNFT, "NoNFTFound");
    });
  });

  describe("Badge System", function () {
    it("Should award first task badge", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await expect(
        agentNFT.connect(registry).updateReputation(agent1.address, 5500, 1)
      )
        .to.emit(agentNFT, "BadgeAwarded")
        .withArgs(0, 1, "First Steps"); // BadgeType.FIRST_TASK = 1

      const badges = await agentNFT.getBadges(0);
      expect(badges.length).to.equal(2); // Newcomer + First Steps
    });

    it("Should award reliable badge at 10 tasks", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await agentNFT.connect(registry).updateReputation(agent1.address, 6000, 10);

      const badges = await agentNFT.getBadges(0);
      const badgeNames = badges.map(b => b.name);
      expect(badgeNames).to.include("Reliable");
    });

    it("Should award high rep badge at 90%+", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      await agentNFT.connect(registry).updateReputation(agent1.address, 9500, 20);

      const badges = await agentNFT.getBadges(0);
      const badgeNames = badges.map(b => b.name);
      expect(badgeNames).to.include("Highly Rated");
    });

    it("Should award staking badges", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      const stakeAmount = ethers.parseEther("1000");
      await agentNFT.connect(registry).awardStakingBadge(agent1.address, stakeAmount);

      const badges = await agentNFT.getBadges(0);
      const badgeNames = badges.map(b => b.name);
      expect(badgeNames).to.include("Staker");
    });

    it("Should award whale badge for large stakes", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      const whaleAmount = ethers.parseEther("10000");
      await agentNFT.connect(registry).awardStakingBadge(agent1.address, whaleAmount);

      const badges = await agentNFT.getBadges(0);
      const badgeNames = badges.map(b => b.name);
      expect(badgeNames).to.include("Whale");
    });

    it("Should not duplicate badges", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      // Award first task badge multiple times
      await agentNFT.connect(registry).updateReputation(agent1.address, 5500, 1);
      await agentNFT.connect(registry).updateReputation(agent1.address, 5600, 2);

      const badges = await agentNFT.getBadges(0);
      const firstTaskBadges = badges.filter(b => b.name === "First Steps");
      expect(firstTaskBadges.length).to.equal(1);
    });
  });

  describe("Token URI and SVG", function () {
    it("Should generate valid SVG", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      const svg = await agentNFT.generateSVG(0);
      expect(svg).to.include("<svg");
      expect(svg).to.include("TestAgent");
      expect(svg).to.include("Reputation:");
    });

    it("Should generate data URI for token", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review", "debugging"]
      );

      const uri = await agentNFT.tokenURI(0);
      expect(uri).to.include("data:application/json;base64,");

      // Decode and verify
      const base64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64, "base64").toString());
      
      expect(json.name).to.include("TestAgent");
      expect(json.description).to.include("Soulbound AI Agent");
      expect(json.image).to.include("data:image/svg+xml;base64,");
    });

    it("Should change color based on reputation", async function () {
      const { agentNFT, agent1, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(
        agent1.address,
        "TestAgent",
        ["code-review"]
      );

      // Default 50% reputation = blue
      let svg = await agentNFT.generateSVG(0);
      expect(svg).to.include("#3498DB"); // Blue

      // Update to 95% = gold
      await agentNFT.connect(registry).updateReputation(agent1.address, 9500, 10);
      svg = await agentNFT.generateSVG(0);
      expect(svg).to.include("#FFD700"); // Gold
    });
  });

  describe("Enumeration", function () {
    it("Should track total supply", async function () {
      const { agentNFT, agent1, agent2, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(agent1.address, "Agent1", ["a"]);
      await agentNFT.connect(registry).mintAgentNFT(agent2.address, "Agent2", ["b"]);

      expect(await agentNFT.totalSupply()).to.equal(2);
    });

    it("Should enumerate by index", async function () {
      const { agentNFT, agent1, agent2, registry } = await loadFixture(deployFixture);

      await agentNFT.connect(registry).mintAgentNFT(agent1.address, "Agent1", ["a"]);
      await agentNFT.connect(registry).mintAgentNFT(agent2.address, "Agent2", ["b"]);

      expect(await agentNFT.tokenByIndex(0)).to.equal(0);
      expect(await agentNFT.tokenByIndex(1)).to.equal(1);
    });
  });
});
