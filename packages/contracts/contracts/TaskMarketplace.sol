// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentRegistry.sol";

/**
 * @title TaskMarketplace
 * @dev Marketplace for posting and completing AI agent tasks
 * 
 * Features:
 * - Post tasks with AGNT payment
 * - Auto-match tasks to agents based on capabilities
 * - Escrow payments until completion
 * - Human verification option
 * - Dispute resolution
 */
contract TaskMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public agntToken;
    AgentRegistry public agentRegistry;

    uint256 public platformFeePercent = 250; // 2.5%
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public autoReleaseTimeout = 7 days;
    uint256 public minTaskReward = 1 * 10**18; // 1 AGNT minimum

    enum TaskStatus {
        Open,           // Task posted, waiting for agent
        Assigned,       // Agent accepted
        Submitted,      // Agent submitted result
        PendingReview,  // Awaiting human verification
        Completed,      // Task completed successfully
        Disputed,       // In dispute
        Cancelled,      // Cancelled by requester
        Failed          // Task failed
    }

    struct Task {
        bytes32 id;
        address requester;
        bytes32 assignedAgent;
        string title;
        string descriptionURI; // IPFS URI for full task details
        string[] requiredCapabilities;
        uint256 reward;
        uint256 createdAt;
        uint256 deadline;
        uint256 submittedAt;
        string resultURI; // IPFS URI for agent's result
        TaskStatus status;
        bool requiresHumanVerification;
    }

    // Task ID => Task
    mapping(bytes32 => Task) public tasks;
    
    // Requester => Task IDs
    mapping(address => bytes32[]) public requesterTasks;
    
    // Agent ID => Task IDs
    mapping(bytes32 => bytes32[]) public agentTasks;
    
    // All task IDs
    bytes32[] public allTaskIds;

    // Open tasks by capability (for auto-routing)
    mapping(string => bytes32[]) public openTasksByCapability;

    event TaskCreated(bytes32 indexed taskId, address indexed requester, uint256 reward);
    event TaskAssigned(bytes32 indexed taskId, bytes32 indexed agentId);
    event TaskSubmitted(bytes32 indexed taskId, bytes32 indexed agentId, string resultURI);
    event TaskCompleted(bytes32 indexed taskId, bytes32 indexed agentId, uint256 payout);
    event TaskDisputed(bytes32 indexed taskId, string reason);
    event TaskCancelled(bytes32 indexed taskId);
    event TaskFailed(bytes32 indexed taskId, bytes32 indexed agentId, string reason);
    event DisputeResolved(bytes32 indexed taskId, bool inFavorOfAgent);

    constructor(
        address _agntToken,
        address _agentRegistry,
        address _owner
    ) Ownable(_owner) {
        agntToken = IERC20(_agntToken);
        agentRegistry = AgentRegistry(_agentRegistry);
    }

    /**
     * @dev Create a new task
     */
    function createTask(
        string calldata title,
        string calldata descriptionURI,
        string[] calldata requiredCapabilities,
        uint256 reward,
        uint256 deadline,
        bool requiresHumanVerification
    ) external nonReentrant returns (bytes32 taskId) {
        require(bytes(title).length > 0, "Title required");
        require(reward >= minTaskReward, "Reward too low");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(requiredCapabilities.length > 0, "At least one capability required");

        // Generate task ID
        taskId = keccak256(abi.encodePacked(msg.sender, title, block.timestamp));

        // Transfer reward to escrow
        agntToken.safeTransferFrom(msg.sender, address(this), reward);

        // Create task
        tasks[taskId] = Task({
            id: taskId,
            requester: msg.sender,
            assignedAgent: bytes32(0),
            title: title,
            descriptionURI: descriptionURI,
            requiredCapabilities: requiredCapabilities,
            reward: reward,
            createdAt: block.timestamp,
            deadline: deadline,
            submittedAt: 0,
            resultURI: "",
            status: TaskStatus.Open,
            requiresHumanVerification: requiresHumanVerification
        });

        requesterTasks[msg.sender].push(taskId);
        allTaskIds.push(taskId);

        // Index by capabilities for auto-routing
        for (uint i = 0; i < requiredCapabilities.length; i++) {
            openTasksByCapability[requiredCapabilities[i]].push(taskId);
        }

        emit TaskCreated(taskId, msg.sender, reward);
    }

    /**
     * @dev Agent accepts a task
     */
    function acceptTask(bytes32 taskId, bytes32 agentId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(block.timestamp < task.deadline, "Task expired");

        // Verify agent
        (address agentOwner,,,,,,,,, bool isActive) = agentRegistry.agents(agentId);
        require(agentOwner == msg.sender, "Not agent owner");
        require(isActive, "Agent not active");

        // Verify agent has at least one of the required capabilities
        require(
            _agentHasRequiredCapability(agentId, task.requiredCapabilities),
            "Agent lacks required capability"
        );

        task.assignedAgent = agentId;
        task.status = TaskStatus.Assigned;
        
        agentTasks[agentId].push(taskId);

        emit TaskAssigned(taskId, agentId);
    }

    /**
     * @dev Check if agent has at least one of the required capabilities
     */
    function _agentHasRequiredCapability(
        bytes32 agentId,
        string[] storage requiredCapabilities
    ) internal view returns (bool) {
        for (uint i = 0; i < requiredCapabilities.length; i++) {
            if (agentRegistry.hasCapability(agentId, requiredCapabilities[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Agent submits task result
     */
    function submitResult(bytes32 taskId, string calldata resultURI) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Assigned, "Task not assigned");
        
        // Verify caller owns the assigned agent
        (address agentOwner,,,,,,,,,) = agentRegistry.agents(task.assignedAgent);
        require(agentOwner == msg.sender, "Not assigned agent owner");

        task.resultURI = resultURI;
        task.submittedAt = block.timestamp;
        
        if (task.requiresHumanVerification) {
            task.status = TaskStatus.PendingReview;
        } else {
            task.status = TaskStatus.Submitted;
        }

        emit TaskSubmitted(taskId, task.assignedAgent, resultURI);
    }

    /**
     * @dev Requester approves submitted result
     */
    function approveResult(bytes32 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Submitted || task.status == TaskStatus.PendingReview,
            "Task not submitted"
        );
        require(task.requester == msg.sender, "Not requester");

        _completeTask(taskId);
    }

    /**
     * @dev Auto-release after timeout (if no human verification required)
     */
    function autoRelease(bytes32 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(!task.requiresHumanVerification, "Requires human verification");
        require(
            block.timestamp >= task.submittedAt + autoReleaseTimeout,
            "Timeout not reached"
        );

        _completeTask(taskId);
    }

    /**
     * @dev Complete task and pay agent
     */
    function _completeTask(bytes32 taskId) internal {
        Task storage task = tasks[taskId];
        
        // Calculate fees
        uint256 platformFee = (task.reward * platformFeePercent) / FEE_DENOMINATOR;
        uint256 agentPayout = task.reward - platformFee;

        // Get agent owner
        (address agentOwner,,,,,,,,,) = agentRegistry.agents(task.assignedAgent);

        // Transfer payout to agent owner
        agntToken.safeTransfer(agentOwner, agentPayout);
        
        // Transfer fee to platform
        agntToken.safeTransfer(owner(), platformFee);

        // Update task status
        task.status = TaskStatus.Completed;

        // Record task completion in registry
        agentRegistry.recordTask(task.assignedAgent, true, agentPayout);

        emit TaskCompleted(taskId, task.assignedAgent, agentPayout);
    }

    /**
     * @dev Requester rejects result
     */
    function rejectResult(bytes32 taskId, string calldata reason) external nonReentrant {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Submitted || task.status == TaskStatus.PendingReview,
            "Task not submitted"
        );
        require(task.requester == msg.sender, "Not requester");

        task.status = TaskStatus.Disputed;
        emit TaskDisputed(taskId, reason);
    }

    /**
     * @dev Resolve dispute (owner/arbitrator only)
     */
    function resolveDispute(bytes32 taskId, bool inFavorOfAgent) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Disputed, "Task not disputed");

        if (inFavorOfAgent) {
            _completeTask(taskId);
        } else {
            // Refund requester
            agntToken.safeTransfer(task.requester, task.reward);
            task.status = TaskStatus.Failed;
            
            // Slash agent
            agentRegistry.slashAgent(task.assignedAgent, "Failed dispute");
            agentRegistry.recordTask(task.assignedAgent, false, 0);
            
            emit TaskFailed(taskId, task.assignedAgent, "Dispute lost");
        }

        emit DisputeResolved(taskId, inFavorOfAgent);
    }

    /**
     * @dev Cancel task (only if still open)
     */
    function cancelTask(bytes32 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(task.requester == msg.sender, "Not requester");

        // Refund
        agntToken.safeTransfer(msg.sender, task.reward);
        task.status = TaskStatus.Cancelled;

        emit TaskCancelled(taskId);
    }

    /**
     * @dev Get best agent for a task (simple matching)
     */
    function getBestAgentForTask(bytes32 taskId) external view returns (bytes32 bestAgent, uint256 bestScore) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");

        string[] memory capabilities = task.requiredCapabilities;
        
        // Simple scoring: reputation * tasks completed
        for (uint i = 0; i < capabilities.length; i++) {
            bytes32[] memory agentIds = agentRegistry.getAgentsByCapability(capabilities[i]);
            
            for (uint j = 0; j < agentIds.length; j++) {
                (,,,, uint256 stakedAmount, uint256 reputationScore, uint256 tasksCompleted,,, bool isActive) = 
                    agentRegistry.agents(agentIds[j]);
                
                if (!isActive) continue;
                
                uint256 score = reputationScore * (tasksCompleted + 1) * stakedAmount / 10**18;
                if (score > bestScore) {
                    bestScore = score;
                    bestAgent = agentIds[j];
                }
            }
        }
    }

    /**
     * @dev Get task count
     */
    function getTaskCount() external view returns (uint256) {
        return allTaskIds.length;
    }

    /**
     * @dev Get task capabilities
     */
    function getTaskCapabilities(bytes32 taskId) external view returns (string[] memory) {
        return tasks[taskId].requiredCapabilities;
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = _feePercent;
    }

    /**
     * @dev Update auto-release timeout
     */
    function setAutoReleaseTimeout(uint256 _timeout) external onlyOwner {
        autoReleaseTimeout = _timeout;
    }
}
