// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAgentRegistry
 * @dev Interface for AgentRegistry contract
 */
interface IAgentRegistry {
    struct Agent {
        address owner;
        string name;
        string metadataURI;
        string[] capabilities;
        uint256 stakedAmount;
        uint256 reputationScore;
        uint256 tasksCompleted;
        uint256 tasksFailed;
        uint256 totalEarned;
        uint256 registeredAt;
        bool isActive;
    }

    /**
     * @dev Get agent data
     */
    function agents(bytes32 agentId) external view returns (
        address owner,
        string memory name,
        string memory metadataURI,
        uint256 stakedAmount,
        uint256 reputationScore,
        uint256 tasksCompleted,
        uint256 tasksFailed,
        uint256 totalEarned,
        uint256 registeredAt,
        bool isActive
    );

    /**
     * @dev Get agent owner address
     */
    function getAgentOwner(bytes32 agentId) external view returns (address);

    /**
     * @dev Check if agent has a specific capability
     */
    function hasCapability(bytes32 agentId, string calldata capability) external view returns (bool);

    /**
     * @dev Check if agent is active
     */
    function isAgentActive(bytes32 agentId) external view returns (bool);

    /**
     * @dev Get agent capabilities
     */
    function getAgentCapabilities(bytes32 agentId) external view returns (string[] memory);

    /**
     * @dev Get agents by capability
     */
    function getAgentsByCapability(string calldata capability) external view returns (bytes32[] memory);

    /**
     * @dev Record task completion
     */
    function recordTask(bytes32 agentId, bool success, uint256 earned) external;

    /**
     * @dev Slash agent for bad behavior
     */
    function slashAgent(bytes32 agentId, string calldata reason) external;
}
