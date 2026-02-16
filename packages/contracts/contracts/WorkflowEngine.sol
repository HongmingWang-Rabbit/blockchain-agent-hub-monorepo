// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title WorkflowEngine
 * @dev Composable multi-agent workflows for Blockchain Agent Hub
 * 
 * Features:
 * - Chain multiple agents in sequence
 * - Parallel execution of independent steps
 * - Conditional branching based on results
 * - Shared context across workflow steps
 * - Automatic payout distribution
 */
contract WorkflowEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public agntToken;
    IAgentRegistry public agentRegistry;
    address public taskMarketplace;

    // Workflow states
    enum WorkflowStatus {
        Draft,      // Being constructed
        Active,     // Running
        Paused,     // Temporarily stopped
        Completed,  // All steps done
        Failed,     // Step failed, workflow stopped
        Cancelled   // Manually cancelled
    }

    // Step execution status
    enum StepStatus {
        Pending,    // Not started
        Running,    // Agent working on it
        Completed,  // Successfully done
        Failed,     // Failed
        Skipped     // Conditionally skipped
    }

    // Step types
    enum StepType {
        Sequential,   // Must complete before next
        Parallel,     // Can run alongside other parallel steps
        Conditional,  // Execute based on condition
        Aggregator    // Wait for multiple inputs
    }

    struct WorkflowStep {
        bytes32 stepId;
        string name;
        string capability;      // Required agent capability
        bytes32 assignedAgent;  // Specific agent (0 = any matching)
        uint256 reward;         // AGNT reward for this step
        StepType stepType;
        StepStatus status;
        bytes32[] dependencies; // Steps that must complete first
        string inputURI;        // IPFS URI for input data
        string outputURI;       // IPFS URI for output (set on completion)
        uint256 startedAt;
        uint256 completedAt;
    }

    struct Workflow {
        bytes32 workflowId;
        address creator;
        string name;
        string description;
        uint256 totalBudget;
        uint256 spent;
        WorkflowStatus status;
        bytes32[] stepIds;
        uint256 createdAt;
        uint256 deadline;
    }

    // Storage
    mapping(bytes32 => Workflow) public workflows;
    mapping(bytes32 => mapping(bytes32 => WorkflowStep)) public workflowSteps;
    bytes32[] public allWorkflowIds;

    // Events
    event WorkflowCreated(bytes32 indexed workflowId, address indexed creator, string name, uint256 budget);
    event StepAdded(bytes32 indexed workflowId, bytes32 indexed stepId, string name, string capability);
    event WorkflowStarted(bytes32 indexed workflowId);
    event StepStarted(bytes32 indexed workflowId, bytes32 indexed stepId, bytes32 agentId);
    event StepCompleted(bytes32 indexed workflowId, bytes32 indexed stepId, string outputURI);
    event StepFailed(bytes32 indexed workflowId, bytes32 indexed stepId, string reason);
    event WorkflowCompleted(bytes32 indexed workflowId, uint256 totalSpent);
    event WorkflowFailed(bytes32 indexed workflowId, bytes32 failedStepId);

    constructor(
        address _agntToken,
        address _agentRegistry,
        address _taskMarketplace,
        address _owner
    ) Ownable(_owner) {
        agntToken = IERC20(_agntToken);
        agentRegistry = IAgentRegistry(_agentRegistry);
        taskMarketplace = _taskMarketplace;
    }

    /**
     * @dev Create a new workflow
     */
    function createWorkflow(
        string calldata name,
        string calldata description,
        uint256 budget,
        uint256 deadline
    ) external nonReentrant returns (bytes32 workflowId) {
        require(bytes(name).length > 0, "Name required");
        require(budget > 0, "Budget required");
        require(deadline > block.timestamp, "Deadline must be future");

        workflowId = keccak256(abi.encodePacked(msg.sender, name, block.timestamp));

        // Escrow the budget
        agntToken.safeTransferFrom(msg.sender, address(this), budget);

        workflows[workflowId] = Workflow({
            workflowId: workflowId,
            creator: msg.sender,
            name: name,
            description: description,
            totalBudget: budget,
            spent: 0,
            status: WorkflowStatus.Draft,
            stepIds: new bytes32[](0),
            createdAt: block.timestamp,
            deadline: deadline
        });

        allWorkflowIds.push(workflowId);

        emit WorkflowCreated(workflowId, msg.sender, name, budget);
    }

    /**
     * @dev Add a step to a workflow (only in Draft status)
     */
    function addStep(
        bytes32 workflowId,
        string calldata name,
        string calldata capability,
        uint256 reward,
        StepType stepType,
        bytes32[] calldata dependencies,
        string calldata inputURI
    ) external returns (bytes32 stepId) {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.creator == msg.sender, "Not workflow creator");
        require(workflow.status == WorkflowStatus.Draft, "Workflow not in draft");
        require(workflow.spent + reward <= workflow.totalBudget, "Exceeds budget");

        stepId = keccak256(abi.encodePacked(workflowId, name, workflow.stepIds.length));

        workflowSteps[workflowId][stepId] = WorkflowStep({
            stepId: stepId,
            name: name,
            capability: capability,
            assignedAgent: bytes32(0),
            reward: reward,
            stepType: stepType,
            status: StepStatus.Pending,
            dependencies: dependencies,
            inputURI: inputURI,
            outputURI: "",
            startedAt: 0,
            completedAt: 0
        });

        workflow.stepIds.push(stepId);
        workflow.spent += reward;

        emit StepAdded(workflowId, stepId, name, capability);
    }

    /**
     * @dev Start a workflow (moves from Draft to Active)
     */
    function startWorkflow(bytes32 workflowId) external {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.creator == msg.sender, "Not workflow creator");
        require(workflow.status == WorkflowStatus.Draft, "Not in draft");
        require(workflow.stepIds.length > 0, "No steps defined");

        workflow.status = WorkflowStatus.Active;
        emit WorkflowStarted(workflowId);

        // Auto-start steps with no dependencies
        _triggerReadySteps(workflowId);
    }

    /**
     * @dev Accept a workflow step (agent accepts work)
     */
    function acceptStep(
        bytes32 workflowId,
        bytes32 stepId,
        bytes32 agentId
    ) external nonReentrant {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.status == WorkflowStatus.Active, "Workflow not active");

        WorkflowStep storage step = workflowSteps[workflowId][stepId];
        require(step.status == StepStatus.Pending, "Step not pending");
        require(_areDependenciesMet(workflowId, stepId), "Dependencies not met");

        // Verify caller owns the agent
        require(agentRegistry.getAgentOwner(agentId) == msg.sender, "Not agent owner");
        
        // Verify agent is active
        require(agentRegistry.isAgentActive(agentId), "Agent not active");
        
        // Verify agent has required capability
        require(agentRegistry.hasCapability(agentId, step.capability), "Agent lacks capability");

        step.status = StepStatus.Running;
        step.assignedAgent = agentId;
        step.startedAt = block.timestamp;

        emit StepStarted(workflowId, stepId, agentId);
    }

    /**
     * @dev Complete a workflow step (agent submits result)
     */
    function completeStep(
        bytes32 workflowId,
        bytes32 stepId,
        string calldata outputURI
    ) external nonReentrant {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.status == WorkflowStatus.Active, "Workflow not active");

        WorkflowStep storage step = workflowSteps[workflowId][stepId];
        require(step.status == StepStatus.Running, "Step not running");
        
        // Verify caller owns the assigned agent
        address agentOwner = agentRegistry.getAgentOwner(step.assignedAgent);
        require(agentOwner == msg.sender, "Not assigned agent owner");

        step.status = StepStatus.Completed;
        step.outputURI = outputURI;
        step.completedAt = block.timestamp;

        // Pay the agent owner
        agntToken.safeTransfer(agentOwner, step.reward);

        emit StepCompleted(workflowId, stepId, outputURI);

        // Check if workflow is complete or trigger next steps
        _checkWorkflowProgress(workflowId);
    }

    /**
     * @dev Mark a step as failed
     */
    function failStep(
        bytes32 workflowId,
        bytes32 stepId,
        string calldata reason
    ) external {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.status == WorkflowStatus.Active, "Workflow not active");
        require(workflow.creator == msg.sender, "Not workflow creator");

        WorkflowStep storage step = workflowSteps[workflowId][stepId];
        require(step.status == StepStatus.Running, "Step not running");

        step.status = StepStatus.Failed;

        // Mark workflow as failed
        workflow.status = WorkflowStatus.Failed;

        emit StepFailed(workflowId, stepId, reason);
        emit WorkflowFailed(workflowId, stepId);

        // Refund remaining budget to creator
        uint256 refund = workflow.totalBudget - _getSpentAmount(workflowId);
        if (refund > 0) {
            agntToken.safeTransfer(workflow.creator, refund);
        }
    }

    /**
     * @dev Cancel a workflow (creator only, refunds remaining budget)
     */
    function cancelWorkflow(bytes32 workflowId) external nonReentrant {
        Workflow storage workflow = workflows[workflowId];
        require(workflow.creator == msg.sender, "Not workflow creator");
        require(
            workflow.status == WorkflowStatus.Draft ||
            workflow.status == WorkflowStatus.Active ||
            workflow.status == WorkflowStatus.Paused,
            "Cannot cancel"
        );

        workflow.status = WorkflowStatus.Cancelled;

        // Refund unspent budget
        uint256 refund = workflow.totalBudget - _getSpentAmount(workflowId);
        if (refund > 0) {
            agntToken.safeTransfer(workflow.creator, refund);
        }
    }

    // ========== View Functions ==========

    function getWorkflowSteps(bytes32 workflowId) external view returns (bytes32[] memory) {
        return workflows[workflowId].stepIds;
    }

    function getWorkflowCount() external view returns (uint256) {
        return allWorkflowIds.length;
    }

    function getReadySteps(bytes32 workflowId) external view returns (bytes32[] memory) {
        Workflow storage workflow = workflows[workflowId];
        bytes32[] memory ready = new bytes32[](workflow.stepIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < workflow.stepIds.length; i++) {
            bytes32 stepId = workflow.stepIds[i];
            WorkflowStep storage step = workflowSteps[workflowId][stepId];
            
            if (step.status == StepStatus.Pending && _areDependenciesMet(workflowId, stepId)) {
                ready[count] = stepId;
                count++;
            }
        }

        // Resize array
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = ready[i];
        }
        return result;
    }

    // ========== Internal Functions ==========

    function _areDependenciesMet(bytes32 workflowId, bytes32 stepId) internal view returns (bool) {
        WorkflowStep storage step = workflowSteps[workflowId][stepId];
        
        for (uint256 i = 0; i < step.dependencies.length; i++) {
            WorkflowStep storage dep = workflowSteps[workflowId][step.dependencies[i]];
            if (dep.status != StepStatus.Completed) {
                return false;
            }
        }
        return true;
    }

    function _triggerReadySteps(bytes32 workflowId) internal {
        // This is called after workflow starts or step completes
        // In a real implementation, this would emit events for agents to pick up
    }

    function _checkWorkflowProgress(bytes32 workflowId) internal {
        Workflow storage workflow = workflows[workflowId];
        
        bool allComplete = true;
        for (uint256 i = 0; i < workflow.stepIds.length; i++) {
            WorkflowStep storage step = workflowSteps[workflowId][workflow.stepIds[i]];
            if (step.status != StepStatus.Completed && step.status != StepStatus.Skipped) {
                allComplete = false;
                break;
            }
        }

        if (allComplete) {
            workflow.status = WorkflowStatus.Completed;
            emit WorkflowCompleted(workflowId, _getSpentAmount(workflowId));
        } else {
            _triggerReadySteps(workflowId);
        }
    }

    function _getSpentAmount(bytes32 workflowId) internal view returns (uint256) {
        Workflow storage workflow = workflows[workflowId];
        uint256 spent = 0;
        
        for (uint256 i = 0; i < workflow.stepIds.length; i++) {
            WorkflowStep storage step = workflowSteps[workflowId][workflow.stepIds[i]];
            if (step.status == StepStatus.Completed) {
                spent += step.reward;
            }
        }
        return spent;
    }
}
