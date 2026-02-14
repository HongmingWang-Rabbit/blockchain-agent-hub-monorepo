// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title AgentRegistryGasless
 * @dev Registry for AI agents with staking, reputation, and meta-transaction support
 * 
 * Features:
 * - Agents stake AGNT to register
 * - Declare capabilities on-chain
 * - Build reputation through task completion
 * - Get slashed for bad behavior
 * - ERC-2771 meta-transaction support for gasless UX
 */
contract AgentRegistryGasless is Ownable, ReentrancyGuard, ERC2771Context {
    using SafeERC20 for IERC20;

    IERC20 public agntToken;
    
    uint256 public minStake = 100 * 10**18; // 100 AGNT minimum stake
    uint256 public slashPercentage = 10; // 10% slash for bad behavior

    struct Agent {
        address owner;
        string name;
        string metadataURI; // IPFS URI for extended metadata
        string[] capabilities; // e.g., ["text-generation", "image-analysis", "code-review"]
        uint256 stakedAmount;
        uint256 reputationScore; // 0-10000 (100.00%)
        uint256 tasksCompleted;
        uint256 tasksFailed;
        uint256 totalEarned;
        uint256 registeredAt;
        bool isActive;
    }

    // Agent ID => Agent data
    mapping(bytes32 => Agent) public agents;
    
    // Owner address => Agent IDs
    mapping(address => bytes32[]) public ownerAgents;
    
    // Capability => Agent IDs (for task routing)
    mapping(string => bytes32[]) public capabilityAgents;
    
    // All agent IDs
    bytes32[] public allAgentIds;

    // Authorized slashers (TaskMarketplace)
    mapping(address => bool) public slashers;

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentReactivated(bytes32 indexed agentId);
    event StakeAdded(bytes32 indexed agentId, uint256 amount);
    event StakeWithdrawn(bytes32 indexed agentId, uint256 amount);
    event AgentSlashed(bytes32 indexed agentId, uint256 amount, string reason);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newScore);
    event TaskRecorded(bytes32 indexed agentId, bool success, uint256 earned);

    constructor(
        address _agntToken, 
        address _owner,
        address _trustedForwarder
    ) Ownable(_owner) ERC2771Context(_trustedForwarder) {
        agntToken = IERC20(_agntToken);
    }

    modifier onlyAgentOwner(bytes32 agentId) {
        require(agents[agentId].owner == _msgSender(), "Not agent owner");
        _;
    }

    modifier onlySlasher() {
        require(slashers[_msgSender()] || _msgSender() == owner(), "Not authorized to slash");
        _;
    }

    // Override Context to use ERC2771Context
    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    /**
     * @dev Register a new agent
     */
    function registerAgent(
        string calldata name,
        string calldata metadataURI,
        string[] calldata capabilities,
        uint256 stakeAmount
    ) external nonReentrant returns (bytes32 agentId) {
        address sender = _msgSender();
        require(bytes(name).length > 0, "Name required");
        require(stakeAmount >= minStake, "Insufficient stake");
        require(capabilities.length > 0, "At least one capability required");

        // Generate unique agent ID
        agentId = keccak256(abi.encodePacked(sender, name, block.timestamp));
        require(agents[agentId].owner == address(0), "Agent ID collision");

        // Transfer stake (user must approve tokens first)
        agntToken.safeTransferFrom(sender, address(this), stakeAmount);

        // Create agent
        agents[agentId] = Agent({
            owner: sender,
            name: name,
            metadataURI: metadataURI,
            capabilities: capabilities,
            stakedAmount: stakeAmount,
            reputationScore: 5000, // Start at 50%
            tasksCompleted: 0,
            tasksFailed: 0,
            totalEarned: 0,
            registeredAt: block.timestamp,
            isActive: true
        });

        // Index by owner
        ownerAgents[sender].push(agentId);

        // Index by capabilities
        for (uint i = 0; i < capabilities.length; i++) {
            capabilityAgents[capabilities[i]].push(agentId);
        }

        allAgentIds.push(agentId);

        emit AgentRegistered(agentId, sender, name);
    }

    /**
     * @dev Update agent metadata
     */
    function updateAgent(
        bytes32 agentId,
        string calldata metadataURI
    ) external onlyAgentOwner(agentId) {
        agents[agentId].metadataURI = metadataURI;
        emit AgentUpdated(agentId, metadataURI);
    }

    /**
     * @dev Add more stake
     */
    function addStake(bytes32 agentId, uint256 amount) external nonReentrant onlyAgentOwner(agentId) {
        agntToken.safeTransferFrom(_msgSender(), address(this), amount);
        agents[agentId].stakedAmount += amount;
        emit StakeAdded(agentId, amount);
    }

    /**
     * @dev Withdraw stake (must maintain minimum)
     */
    function withdrawStake(bytes32 agentId, uint256 amount) external nonReentrant onlyAgentOwner(agentId) {
        Agent storage agent = agents[agentId];
        require(agent.stakedAmount - amount >= minStake, "Must maintain minimum stake");
        
        agent.stakedAmount -= amount;
        agntToken.safeTransfer(_msgSender(), amount);
        
        emit StakeWithdrawn(agentId, amount);
    }

    /**
     * @dev Deactivate agent
     */
    function deactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @dev Reactivate agent
     */
    function reactivateAgent(bytes32 agentId) external onlyAgentOwner(agentId) {
        require(agents[agentId].stakedAmount >= minStake, "Insufficient stake");
        agents[agentId].isActive = true;
        emit AgentReactivated(agentId);
    }

    /**
     * @dev Slash agent for bad behavior (called by TaskMarketplace)
     */
    function slashAgent(bytes32 agentId, string calldata reason) external onlySlasher {
        Agent storage agent = agents[agentId];
        uint256 slashAmount = (agent.stakedAmount * slashPercentage) / 100;
        
        agent.stakedAmount -= slashAmount;
        
        // Burn slashed tokens or send to treasury
        agntToken.safeTransfer(owner(), slashAmount);
        
        // Decrease reputation
        if (agent.reputationScore > 500) {
            agent.reputationScore -= 500;
        } else {
            agent.reputationScore = 0;
        }
        
        // Auto-deactivate if below minimum stake
        if (agent.stakedAmount < minStake) {
            agent.isActive = false;
        }
        
        emit AgentSlashed(agentId, slashAmount, reason);
    }

    /**
     * @dev Record task completion (called by TaskMarketplace)
     */
    function recordTask(bytes32 agentId, bool success, uint256 earned) external onlySlasher {
        Agent storage agent = agents[agentId];
        
        if (success) {
            agent.tasksCompleted++;
            agent.totalEarned += earned;
            
            // Increase reputation (max 10000)
            if (agent.reputationScore < 9900) {
                agent.reputationScore += 100;
            } else {
                agent.reputationScore = 10000;
            }
        } else {
            agent.tasksFailed++;
            
            // Decrease reputation
            if (agent.reputationScore > 200) {
                agent.reputationScore -= 200;
            } else {
                agent.reputationScore = 0;
            }
        }
        
        emit TaskRecorded(agentId, success, earned);
        emit ReputationUpdated(agentId, agent.reputationScore);
    }

    /**
     * @dev Get agents by capability
     */
    function getAgentsByCapability(string calldata capability) external view returns (bytes32[] memory) {
        return capabilityAgents[capability];
    }

    /**
     * @dev Get agent count
     */
    function getAgentCount() external view returns (uint256) {
        return allAgentIds.length;
    }

    /**
     * @dev Get agent capabilities
     */
    function getAgentCapabilities(bytes32 agentId) external view returns (string[] memory) {
        return agents[agentId].capabilities;
    }

    /**
     * @dev Add slasher (TaskMarketplace)
     */
    function addSlasher(address slasher) external onlyOwner {
        slashers[slasher] = true;
    }

    /**
     * @dev Remove slasher
     */
    function removeSlasher(address slasher) external onlyOwner {
        slashers[slasher] = false;
    }

    /**
     * @dev Update minimum stake
     */
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }

    /**
     * @dev Update slash percentage
     */
    function setSlashPercentage(uint256 _slashPercentage) external onlyOwner {
        require(_slashPercentage <= 50, "Slash too high");
        slashPercentage = _slashPercentage;
    }

    /**
     * @dev Check if forwarder is trusted
     */
    function isTrustedForwarder(address forwarder) public view virtual override returns (bool) {
        return super.isTrustedForwarder(forwarder);
    }
}
