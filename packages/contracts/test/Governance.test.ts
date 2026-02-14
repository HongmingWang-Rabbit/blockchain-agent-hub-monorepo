import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  AGNTToken, 
  GovernorAgent, 
  Treasury 
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

describe("Governance", function () {
  let agntToken: AGNTToken;
  let governor: GovernorAgent;
  let treasury: Treasury;
  let timelock: any;
  let owner: HardhatEthersSigner;
  let proposer: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;

  const VOTING_DELAY = 1; // 1 block
  const VOTING_PERIOD = 50; // 50 blocks
  const PROPOSAL_THRESHOLD = ethers.parseEther("1000"); // 1000 tokens to propose
  const TIMELOCK_DELAY = 3600; // 1 hour

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3, recipient] = await ethers.getSigners();

    // Deploy AGNT Token with Votes
    const AGNTToken = await ethers.getContractFactory("AGNTToken");
    agntToken = await AGNTToken.deploy(owner.address);

    // Deploy Timelock
    const TimelockController = await ethers.getContractFactory("TimelockController");
    timelock = await TimelockController.deploy(
      TIMELOCK_DELAY,
      [], // proposers (governor will be added)
      [], // executors (governor will be added)
      owner.address
    );

    // Deploy Governor
    const GovernorAgent = await ethers.getContractFactory("GovernorAgent");
    governor = await GovernorAgent.deploy(
      await agntToken.getAddress(),
      await timelock.getAddress(),
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THRESHOLD
    );

    // Setup timelock roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    
    await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governor.getAddress());
    await timelock.grantRole(CANCELLER_ROLE, await governor.getAddress());

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(
      await agntToken.getAddress(),
      owner.address
    );

    // Grant governor role to timelock
    await treasury.setGovernor(await timelock.getAddress());

    // Distribute tokens - enough to meet 4% quorum (16M of 400M)
    await agntToken.transfer(proposer.address, ethers.parseEther("2000000"));  // 2M
    await agntToken.transfer(voter1.address, ethers.parseEther("10000000"));   // 10M
    await agntToken.transfer(voter2.address, ethers.parseEther("8000000"));    // 8M
    await agntToken.transfer(voter3.address, ethers.parseEther("4000000"));    // 4M

    // Fund treasury
    await agntToken.transfer(await treasury.getAddress(), ethers.parseEther("1000000"));

    // Delegate voting power
    await agntToken.connect(proposer).delegate(proposer.address);
    await agntToken.connect(voter1).delegate(voter1.address);
    await agntToken.connect(voter2).delegate(voter2.address);
    await agntToken.connect(voter3).delegate(voter3.address);
  });

  describe("Token Voting Power", function () {
    it("Should track voting power through delegation", async function () {
      const votes = await agntToken.getVotes(voter1.address);
      expect(votes).to.equal(ethers.parseEther("10000000"));
    });

    it("Should allow delegating to another address", async function () {
      await agntToken.connect(voter3).delegate(voter1.address);
      
      const voter1Votes = await agntToken.getVotes(voter1.address);
      const voter3Votes = await agntToken.getVotes(voter3.address);
      
      expect(voter1Votes).to.equal(ethers.parseEther("14000000")); // 10M + 4M
      expect(voter3Votes).to.equal(0);
    });

    it("Should track historical voting power", async function () {
      const blockBefore = await ethers.provider.getBlockNumber();
      
      // Transfer some tokens
      await agntToken.connect(voter1).transfer(voter2.address, ethers.parseEther("1000000"));
      await agntToken.connect(voter2).delegate(voter2.address); // Re-delegate to update
      
      // Mine a block to ensure the transfer is recorded
      await mine(1);
      
      // Check past votes
      const pastVotes = await agntToken.getPastVotes(voter1.address, blockBefore);
      expect(pastVotes).to.equal(ethers.parseEther("10000000"));
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal", async function () {
      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = [
        treasury.interface.encodeFunctionData("setCategoryLimit", [
          0, // GRANTS
          ethers.parseEther("200000")
        ])
      ];
      const description = "Increase grants limit to 200k AGNT";

      await mine(1); // Ensure voting power is checkpointed

      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return governor.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("Should reject proposal from address without enough tokens", async function () {
      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = [
        treasury.interface.encodeFunctionData("setCategoryLimit", [0, ethers.parseEther("200000")])
      ];

      await expect(
        governor.connect(recipient).propose(targets, values, calldatas, "Test")
      ).to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
    });

    it("Should create typed proposal", async function () {
      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = [
        treasury.interface.encodeFunctionData("withdraw", [
          recipient.address,
          ethers.parseEther("10000"),
          0, // GRANTS
          "Developer grant Q1"
        ])
      ];

      await mine(1);

      const tx = await governor.connect(proposer).proposeTyped(
        targets,
        values,
        calldatas,
        "Q1 Developer Grant Program",
        1 // TREASURY_SPEND
      );

      const receipt = await tx.wait();
      const events = receipt?.logs || [];
      
      const typedEvent = events.find((log: any) => {
        try {
          const parsed = governor.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ProposalCreatedWithType";
        } catch {
          return false;
        }
      });

      expect(typedEvent).to.not.be.undefined;
    });
  });

  describe("Voting", function () {
    let proposalId: bigint;

    beforeEach(async function () {
      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = [
        treasury.interface.encodeFunctionData("setCategoryLimit", [
          0,
          ethers.parseEther("200000")
        ])
      ];
      const description = "Increase grants limit";

      await mine(1);

      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governor.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = governor.interface.parseLog({ topics: event.topics as string[], data: event.data });
        proposalId = parsed?.args[0];
      }
    });

    it("Should allow voting after delay", async function () {
      // Wait for voting delay
      await mine(VOTING_DELAY + 1);

      // Cast votes
      await governor.connect(voter1).castVote(proposalId, 1); // For
      await governor.connect(voter2).castVote(proposalId, 1); // For
      await governor.connect(voter3).castVote(proposalId, 0); // Against

      const [againstVotes, forVotes, abstainVotes] = await governor.proposalVotes(proposalId);

      expect(forVotes).to.equal(ethers.parseEther("18000000")); // 10M + 8M
      expect(againstVotes).to.equal(ethers.parseEther("4000000"));
      expect(abstainVotes).to.equal(0);
    });

    it("Should reject voting before delay", async function () {
      await expect(
        governor.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });

    it("Should support abstain votes", async function () {
      await mine(VOTING_DELAY + 1);
      
      await governor.connect(voter1).castVote(proposalId, 2); // Abstain

      const [, , abstainVotes] = await governor.proposalVotes(proposalId);
      expect(abstainVotes).to.equal(ethers.parseEther("10000000"));
    });

    it("Should allow voting with reason", async function () {
      await mine(VOTING_DELAY + 1);

      const tx = await governor.connect(voter1).castVoteWithReason(
        proposalId,
        1,
        "Supporting increased grants for ecosystem growth"
      );

      await expect(tx).to.emit(governor, "VoteCast");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId: bigint;
    let targets: string[];
    let values: number[];
    let calldatas: string[];
    let descriptionHash: string;

    beforeEach(async function () {
      targets = [await treasury.getAddress()];
      values = [0];
      calldatas = [
        treasury.interface.encodeFunctionData("setCategoryLimit", [
          0, // GRANTS
          ethers.parseEther("200000")
        ])
      ];
      const description = "Increase grants limit";
      descriptionHash = ethers.id(description);

      await mine(1);

      const tx = await governor.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governor.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = governor.interface.parseLog({ topics: event.topics as string[], data: event.data });
        proposalId = parsed?.args[0];
      }
    });

    it("Should execute successful proposal through timelock", async function () {
      // Vote
      await mine(VOTING_DELAY + 1);
      await governor.connect(voter1).castVote(proposalId, 1);
      await governor.connect(voter2).castVote(proposalId, 1);

      // Wait for voting to end
      await mine(VOTING_PERIOD + 1);

      // Queue in timelock
      await governor.queue(targets, values, calldatas, descriptionHash);

      // Wait for timelock delay
      await time.increase(TIMELOCK_DELAY + 1);

      // Execute
      await governor.execute(targets, values, calldatas, descriptionHash);

      // Verify change was applied
      const newLimit = await treasury.categoryLimits(0);
      expect(newLimit).to.equal(ethers.parseEther("200000"));
    });

    it("Should reject execution of failed proposal", async function () {
      // Vote against
      await mine(VOTING_DELAY + 1);
      await governor.connect(voter1).castVote(proposalId, 0);
      await governor.connect(voter2).castVote(proposalId, 0);

      // Wait for voting to end
      await mine(VOTING_PERIOD + 1);

      // Try to queue (should fail)
      await expect(
        governor.queue(targets, values, calldatas, descriptionHash)
      ).to.be.revertedWithCustomError(governor, "GovernorUnexpectedProposalState");
    });
  });

  describe("Treasury", function () {
    it("Should track spending by category", async function () {
      // Owner has governor role
      await treasury.withdraw(
        recipient.address,
        ethers.parseEther("5000"),
        0, // GRANTS
        "Test grant"
      );

      const spent = await treasury.categorySpent(0);
      expect(spent).to.equal(ethers.parseEther("5000"));
    });

    it("Should respect category limits", async function () {
      await expect(
        treasury.withdraw(
          recipient.address,
          ethers.parseEther("200000"), // Over 100k limit
          0,
          "Too much"
        )
      ).to.be.revertedWith("Treasury: exceeds category limit");
    });

    it("Should reset spending after period", async function () {
      // Spend some
      await treasury.withdraw(
        recipient.address,
        ethers.parseEther("50000"),
        0,
        "First grant"
      );

      // Fast forward past period
      await time.increase(31 * 24 * 60 * 60); // 31 days

      // Should be able to spend full limit again
      await treasury.withdraw(
        recipient.address,
        ethers.parseEther("100000"),
        0,
        "New period grant"
      );

      const spent = await treasury.categorySpent(0);
      expect(spent).to.equal(ethers.parseEther("100000"));
    });

    it("Should support emergency pause", async function () {
      await treasury.setEmergencyPause(true);

      await expect(
        treasury.withdraw(recipient.address, ethers.parseEther("1000"), 0, "Test")
      ).to.be.revertedWith("Treasury: paused");
    });

    it("Should report remaining budget", async function () {
      await treasury.withdraw(
        recipient.address,
        ethers.parseEther("30000"),
        0,
        "Partial spend"
      );

      const remaining = await treasury.remainingBudget(0);
      expect(remaining).to.equal(ethers.parseEther("70000"));
    });
  });

  describe("Quorum", function () {
    it("Should require 4% quorum", async function () {
      const quorum = await governor.quorum(await ethers.provider.getBlockNumber() - 1);
      const totalSupply = await agntToken.totalSupply();
      
      // 4% of total supply
      expect(quorum).to.equal(totalSupply * 4n / 100n);
    });
  });
});
