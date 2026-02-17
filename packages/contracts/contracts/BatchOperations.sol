// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TaskMarketplace.sol";
import "./AgentRegistry.sol";

/**
 * @title BatchOperations
 * @dev Batch operations for the Agent Hub marketplace
 * 
 * Features:
 * - Create multiple tasks in a single transaction
 * - Batch cancel open tasks
 * - Batch accept tasks (for agents)
 * - Gas-efficient bulk operations
 */
contract BatchOperations is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public agntToken;
    TaskMarketplace public taskMarketplace;
    AgentRegistry public agentRegistry;

    uint256 public maxBatchSize = 20; // Max tasks per batch
    uint256 public batchDiscount = 500; // 5% discount on platform fees for batch operations

    struct TaskInput {
        string title;
        string descriptionURI;
        string[] requiredCapabilities;
        uint256 reward;
        uint256 deadline;
        bool requiresHumanVerification;
    }

    struct BatchResult {
        bytes32[] taskIds;
        uint256 totalCost;
        uint256 successCount;
        uint256 failedCount;
    }

    // Batch ID => Task IDs
    mapping(bytes32 => bytes32[]) public batchTasks;
    
    // User => Batch IDs
    mapping(address => bytes32[]) public userBatches;

    // All batch IDs
    bytes32[] public allBatchIds;

    event BatchCreated(
        bytes32 indexed batchId,
        address indexed creator,
        uint256 taskCount,
        uint256 totalReward
    );
    event BatchTaskCreated(
        bytes32 indexed batchId,
        bytes32 indexed taskId,
        uint256 index
    );
    event BatchCancelled(
        bytes32 indexed batchId,
        uint256 cancelledCount,
        uint256 refundedAmount
    );
    event MaxBatchSizeUpdated(uint256 oldSize, uint256 newSize);

    constructor(
        address _agntToken,
        address _taskMarketplace,
        address _agentRegistry,
        address _owner
    ) Ownable(_owner) {
        agntToken = IERC20(_agntToken);
        taskMarketplace = TaskMarketplace(_taskMarketplace);
        agentRegistry = AgentRegistry(_agentRegistry);
    }

    /**
     * @dev Create multiple tasks in a single transaction
     * @param tasks Array of task inputs
     * @return result BatchResult with task IDs and stats
     */
    function createTaskBatch(TaskInput[] calldata tasks) 
        external 
        nonReentrant 
        returns (BatchResult memory result) 
    {
        require(tasks.length > 0, "Empty batch");
        require(tasks.length <= maxBatchSize, "Batch too large");

        // Calculate total reward needed
        uint256 totalReward = 0;
        for (uint256 i = 0; i < tasks.length; i++) {
            totalReward += tasks[i].reward;
        }

        // Transfer total reward from user
        agntToken.safeTransferFrom(msg.sender, address(this), totalReward);

        // Approve marketplace to spend tokens
        agntToken.approve(address(taskMarketplace), totalReward);

        // Generate batch ID
        bytes32 batchId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, tasks.length)
        );

        result.taskIds = new bytes32[](tasks.length);
        result.totalCost = totalReward;

        // Create each task
        for (uint256 i = 0; i < tasks.length; i++) {
            try taskMarketplace.createTask(
                tasks[i].title,
                tasks[i].descriptionURI,
                tasks[i].requiredCapabilities,
                tasks[i].reward,
                tasks[i].deadline,
                tasks[i].requiresHumanVerification
            ) returns (bytes32 taskId) {
                result.taskIds[i] = taskId;
                batchTasks[batchId].push(taskId);
                result.successCount++;
                emit BatchTaskCreated(batchId, taskId, i);
            } catch {
                result.failedCount++;
                // Refund failed task reward
                agntToken.safeTransfer(msg.sender, tasks[i].reward);
            }
        }

        userBatches[msg.sender].push(batchId);
        allBatchIds.push(batchId);

        emit BatchCreated(batchId, msg.sender, result.successCount, totalReward);
    }

    /**
     * @dev Create multiple identical tasks (same template, different titles)
     * Useful for recurring tasks or bounties
     */
    function createTaskBatchFromTemplate(
        string[] calldata titles,
        string calldata descriptionURI,
        string[] calldata requiredCapabilities,
        uint256 rewardPerTask,
        uint256 deadline,
        bool requiresHumanVerification
    ) external nonReentrant returns (BatchResult memory result) {
        require(titles.length > 0, "No titles provided");
        require(titles.length <= maxBatchSize, "Batch too large");

        uint256 totalReward = rewardPerTask * titles.length;

        // Transfer total reward
        agntToken.safeTransferFrom(msg.sender, address(this), totalReward);
        agntToken.approve(address(taskMarketplace), totalReward);

        bytes32 batchId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, "template", titles.length)
        );

        result.taskIds = new bytes32[](titles.length);
        result.totalCost = totalReward;

        for (uint256 i = 0; i < titles.length; i++) {
            try taskMarketplace.createTask(
                titles[i],
                descriptionURI,
                requiredCapabilities,
                rewardPerTask,
                deadline,
                requiresHumanVerification
            ) returns (bytes32 taskId) {
                result.taskIds[i] = taskId;
                batchTasks[batchId].push(taskId);
                result.successCount++;
                emit BatchTaskCreated(batchId, taskId, i);
            } catch {
                result.failedCount++;
                agntToken.safeTransfer(msg.sender, rewardPerTask);
            }
        }

        userBatches[msg.sender].push(batchId);
        allBatchIds.push(batchId);

        emit BatchCreated(batchId, msg.sender, result.successCount, totalReward);
    }

    /**
     * @dev Cancel multiple open tasks
     * Note: Tasks must be cancelled directly through TaskMarketplace for proper refunds
     * This function returns task IDs that are eligible for cancellation
     */
    function getTasksEligibleForCancel(bytes32[] calldata taskIds, address user) 
        external 
        view
        returns (bytes32[] memory eligibleTasks) 
    {
        uint256 count = 0;
        bytes32[] memory temp = new bytes32[](taskIds.length);
        
        for (uint256 i = 0; i < taskIds.length; i++) {
            // Get task details (auto-generated getter skips dynamic arrays)
            // Returns: id, requester, assignedAgent, title, descriptionURI, reward, createdAt, deadline, submittedAt, resultURI, status, requiresHumanVerification
            (,address requester,,,,uint256 reward,,,,, TaskMarketplace.TaskStatus status,) = 
                taskMarketplace.tasks(taskIds[i]);
            
            if (requester == user && status == TaskMarketplace.TaskStatus.Open && reward > 0) {
                temp[count] = taskIds[i];
                count++;
            }
        }
        
        // Copy to properly sized array
        eligibleTasks = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            eligibleTasks[i] = temp[i];
        }
    }

    /**
     * @dev Agent accepts multiple tasks
     */
    function acceptTaskBatch(bytes32[] calldata taskIds, bytes32 agentId) 
        external 
        nonReentrant 
        returns (uint256 acceptedCount) 
    {
        // Verify agent ownership
        // Agent struct getter returns: owner, name, metadataURI, stakedAmount, reputationScore, tasksCompleted, tasksFailed, totalEarned, registeredAt, isActive
        (address agentOwner,,,,,,,, ,bool isActive) = agentRegistry.agents(agentId);
        require(agentOwner == msg.sender, "Not agent owner");
        require(isActive, "Agent not active");

        for (uint256 i = 0; i < taskIds.length; i++) {
            try taskMarketplace.acceptTask(taskIds[i], agentId) {
                acceptedCount++;
            } catch {
                // Task couldn't be accepted, skip
            }
        }
    }

    /**
     * @dev Get tasks in a batch
     */
    function getBatchTasks(bytes32 batchId) external view returns (bytes32[] memory) {
        return batchTasks[batchId];
    }

    /**
     * @dev Get user's batches
     */
    function getUserBatches(address user) external view returns (bytes32[] memory) {
        return userBatches[user];
    }

    /**
     * @dev Get total batch count
     */
    function getBatchCount() external view returns (uint256) {
        return allBatchIds.length;
    }

    /**
     * @dev Calculate total cost for a batch
     */
    function calculateBatchCost(TaskInput[] calldata tasks) 
        external 
        pure 
        returns (uint256 totalReward) 
    {
        for (uint256 i = 0; i < tasks.length; i++) {
            totalReward += tasks[i].reward;
        }
    }

    /**
     * @dev Update max batch size
     */
    function setMaxBatchSize(uint256 _maxBatchSize) external onlyOwner {
        require(_maxBatchSize > 0 && _maxBatchSize <= 50, "Invalid batch size");
        emit MaxBatchSizeUpdated(maxBatchSize, _maxBatchSize);
        maxBatchSize = _maxBatchSize;
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
