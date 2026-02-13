import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("WorkflowEngine", function () {
  let agntToken: any;
  let agentRegistry: any;
  let taskMarketplace: any;
  let workflowEngine: any;
  let owner: any;
  let agent1: any;
  let agent2: any;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const WORKFLOW_BUDGET = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();

    // Deploy AGNT Token
    const AGNTToken = await ethers.getContractFactory("AGNTToken");
    agntToken = await AGNTToken.deploy(owner.address);

    // Deploy AgentRegistry
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy(await agntToken.getAddress(), owner.address);

    // Deploy TaskMarketplace
    const TaskMarketplace = await ethers.getContractFactory("TaskMarketplace");
    taskMarketplace = await TaskMarketplace.deploy(
      await agntToken.getAddress(),
      await agentRegistry.getAddress(),
      owner.address
    );

    // Deploy WorkflowEngine
    const WorkflowEngine = await ethers.getContractFactory("WorkflowEngine");
    workflowEngine = await WorkflowEngine.deploy(
      await agntToken.getAddress(),
      await agentRegistry.getAddress(),
      await taskMarketplace.getAddress(),
      owner.address
    );

    // Mint tokens to owner for testing
    await agntToken.mint(owner.address, WORKFLOW_BUDGET * BigInt(10));
    
    // Approve workflow engine to spend tokens
    await agntToken.approve(await workflowEngine.getAddress(), WORKFLOW_BUDGET * BigInt(10));
  });

  describe("Workflow Creation", function () {
    it("Should create a workflow with budget escrowed", async function () {
      const deadline = (await time.latest()) + 86400; // 1 day

      const tx = await workflowEngine.createWorkflow(
        "Test Workflow",
        "A test workflow description",
        WORKFLOW_BUDGET,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((l: any) => l.fragment?.name === "WorkflowCreated");
      expect(event).to.not.be.undefined;

      const workflowId = event.args[0];
      const workflow = await workflowEngine.workflows(workflowId);

      expect(workflow.name).to.equal("Test Workflow");
      expect(workflow.totalBudget).to.equal(WORKFLOW_BUDGET);
      expect(workflow.status).to.equal(0); // Draft

      // Check tokens were escrowed
      const engineBalance = await agntToken.balanceOf(await workflowEngine.getAddress());
      expect(engineBalance).to.equal(WORKFLOW_BUDGET);
    });

    it("Should reject workflow with empty name", async function () {
      const deadline = (await time.latest()) + 86400;

      await expect(
        workflowEngine.createWorkflow("", "Description", WORKFLOW_BUDGET, deadline)
      ).to.be.revertedWith("Name required");
    });

    it("Should reject workflow with past deadline", async function () {
      const deadline = (await time.latest()) - 100;

      await expect(
        workflowEngine.createWorkflow("Test", "Description", WORKFLOW_BUDGET, deadline)
      ).to.be.revertedWith("Deadline must be future");
    });
  });

  describe("Step Management", function () {
    let workflowId: string;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await workflowEngine.createWorkflow(
        "Test Workflow",
        "Description",
        WORKFLOW_BUDGET,
        deadline
      );
      const receipt = await tx.wait();
      workflowId = receipt.logs.find((l: any) => l.fragment?.name === "WorkflowCreated").args[0];
    });

    it("Should add steps to workflow", async function () {
      const stepReward = ethers.parseEther("100");

      await workflowEngine.addStep(
        workflowId,
        "Step 1",
        "data-analysis",
        stepReward,
        0, // Sequential
        [], // No dependencies
        "ipfs://input1"
      );

      const steps = await workflowEngine.getWorkflowSteps(workflowId);
      expect(steps.length).to.equal(1);
    });

    it("Should add step with dependencies", async function () {
      const stepReward = ethers.parseEther("100");

      // Add first step
      const tx1 = await workflowEngine.addStep(
        workflowId,
        "Step 1",
        "data-analysis",
        stepReward,
        0,
        [],
        "ipfs://input1"
      );
      const receipt1 = await tx1.wait();
      const step1Id = receipt1.logs.find((l: any) => l.fragment?.name === "StepAdded").args[1];

      // Add second step that depends on first
      await workflowEngine.addStep(
        workflowId,
        "Step 2",
        "report-generation",
        stepReward,
        0,
        [step1Id], // Depends on step 1
        "ipfs://input2"
      );

      const steps = await workflowEngine.getWorkflowSteps(workflowId);
      expect(steps.length).to.equal(2);
    });

    it("Should reject step exceeding budget", async function () {
      const excessiveReward = WORKFLOW_BUDGET + ethers.parseEther("1");

      await expect(
        workflowEngine.addStep(
          workflowId,
          "Expensive Step",
          "capability",
          excessiveReward,
          0,
          [],
          ""
        )
      ).to.be.revertedWith("Exceeds budget");
    });
  });

  describe("Workflow Execution", function () {
    let workflowId: string;
    let stepId: string;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await workflowEngine.createWorkflow(
        "Test Workflow",
        "Description",
        WORKFLOW_BUDGET,
        deadline
      );
      const receipt = await tx.wait();
      workflowId = receipt.logs.find((l: any) => l.fragment?.name === "WorkflowCreated").args[0];

      // Add a step
      const stepTx = await workflowEngine.addStep(
        workflowId,
        "Step 1",
        "data-analysis",
        ethers.parseEther("100"),
        0,
        [],
        "ipfs://input"
      );
      const stepReceipt = await stepTx.wait();
      stepId = stepReceipt.logs.find((l: any) => l.fragment?.name === "StepAdded").args[1];
    });

    it("Should start workflow", async function () {
      await workflowEngine.startWorkflow(workflowId);

      const workflow = await workflowEngine.workflows(workflowId);
      expect(workflow.status).to.equal(1); // Active
    });

    it("Should reject starting without steps", async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await workflowEngine.createWorkflow(
        "Empty Workflow",
        "No steps",
        ethers.parseEther("100"),
        deadline
      );
      const receipt = await tx.wait();
      const emptyWorkflowId = receipt.logs.find((l: any) => l.fragment?.name === "WorkflowCreated").args[0];

      await expect(
        workflowEngine.startWorkflow(emptyWorkflowId)
      ).to.be.revertedWith("No steps defined");
    });

    it("Should allow agent to accept and complete step", async function () {
      await workflowEngine.startWorkflow(workflowId);

      const agentId = ethers.keccak256(ethers.toUtf8Bytes("agent1"));

      // Accept step
      await workflowEngine.acceptStep(workflowId, stepId, agentId);

      let step = await workflowEngine.workflowSteps(workflowId, stepId);
      expect(step.status).to.equal(1); // Running

      // Complete step
      await workflowEngine.completeStep(workflowId, stepId, "ipfs://output");

      step = await workflowEngine.workflowSteps(workflowId, stepId);
      expect(step.status).to.equal(2); // Completed
    });
  });

  describe("Workflow Cancellation", function () {
    it("Should refund unspent budget on cancel", async function () {
      const deadline = (await time.latest()) + 86400;
      const tx = await workflowEngine.createWorkflow(
        "Test Workflow",
        "Description",
        WORKFLOW_BUDGET,
        deadline
      );
      const receipt = await tx.wait();
      const workflowId = receipt.logs.find((l: any) => l.fragment?.name === "WorkflowCreated").args[0];

      const balanceBefore = await agntToken.balanceOf(owner.address);

      await workflowEngine.cancelWorkflow(workflowId);

      const balanceAfter = await agntToken.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(WORKFLOW_BUDGET);
    });
  });
});
