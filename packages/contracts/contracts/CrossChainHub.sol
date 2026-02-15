// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainHub
 * @notice Hub contract for cross-chain agent discovery on the primary chain (HashKey)
 * @dev Broadcasts agent registrations to be relayed to other chains
 * 
 * Architecture:
 * - Agents register on HashKey Chain (primary)
 * - This contract tracks which agents are "broadcast" for cross-chain discovery
 * - Off-chain relayers pick up AgentBroadcast events and sync to destination chains
 * - Future: Integrate LayerZero/Chainlink CCIP for trustless cross-chain messaging
 */
contract CrossChainHub is Ownable, ReentrancyGuard {
    // ============ Structs ============

    struct BroadcastedAgent {
        address owner;
        string name;
        string metadataURI;
        string[] capabilities;
        uint256 reputationScore;
        uint256 totalTasksCompleted;
        uint256 broadcastTimestamp;
        bool isActive;
    }

    struct ChainConfig {
        uint256 chainId;
        string name;
        address receiverContract;
        bool isActive;
    }

    // ============ State Variables ============

    /// @notice Registry contract address
    address public agentRegistry;

    /// @notice Mapping of agent address to broadcast info
    mapping(address => BroadcastedAgent) public broadcastedAgents;

    /// @notice List of all broadcasted agent addresses
    address[] public broadcastedAgentList;

    /// @notice Mapping of agent address to list index + 1 (0 means not in list)
    mapping(address => uint256) public agentListIndex;

    /// @notice Supported destination chains
    mapping(uint256 => ChainConfig) public supportedChains;

    /// @notice List of supported chain IDs
    uint256[] public chainIds;

    /// @notice Authorized relayers
    mapping(address => bool) public authorizedRelayers;

    /// @notice Fee for broadcasting (optional, can be 0)
    uint256 public broadcastFee;

    /// @notice Minimum reputation score to broadcast
    uint256 public minReputationToBroadcast;

    // ============ Events ============

    event AgentBroadcast(
        address indexed agentOwner,
        uint256 indexed toChainId,
        string name,
        string metadataURI,
        string[] capabilities,
        uint256 reputationScore,
        uint256 totalTasksCompleted,
        uint256 timestamp
    );

    event AgentBroadcastRevoked(
        address indexed agentOwner,
        uint256 timestamp
    );

    event AgentSynced(
        address indexed agentOwner,
        uint256 indexed fromChainId,
        uint256 timestamp
    );

    event ChainAdded(
        uint256 indexed chainId,
        string name,
        address receiverContract
    );

    event ChainRemoved(uint256 indexed chainId);

    event RelayerUpdated(address indexed relayer, bool authorized);

    event BroadcastFeeUpdated(uint256 newFee);

    event ReputationRequirementUpdated(uint256 minReputation);

    // ============ Errors ============

    error NotAgentOwner();
    error AgentNotRegistered();
    error AlreadyBroadcasted();
    error NotBroadcasted();
    error InsufficientFee();
    error ChainNotSupported();
    error ChainAlreadyExists();
    error ReputationTooLow();
    error NotAuthorizedRelayer();
    error InvalidAddress();

    // ============ Constructor ============

    constructor(address _agentRegistry) Ownable(msg.sender) {
        if (_agentRegistry == address(0)) revert InvalidAddress();
        agentRegistry = _agentRegistry;
        minReputationToBroadcast = 5000; // 50% reputation minimum
    }

    // ============ Agent Functions ============

    /**
     * @notice Broadcast an agent for cross-chain discovery
     * @param name Agent name
     * @param metadataURI IPFS URI for agent metadata
     * @param capabilities Array of capability strings
     * @param reputationScore Current reputation (0-10000)
     * @param totalTasksCompleted Total tasks completed on-chain
     */
    function broadcastAgent(
        string calldata name,
        string calldata metadataURI,
        string[] calldata capabilities,
        uint256 reputationScore,
        uint256 totalTasksCompleted
    ) external payable nonReentrant {
        if (msg.value < broadcastFee) revert InsufficientFee();
        if (reputationScore < minReputationToBroadcast) revert ReputationTooLow();
        if (broadcastedAgents[msg.sender].isActive) revert AlreadyBroadcasted();

        // Store broadcast info
        broadcastedAgents[msg.sender] = BroadcastedAgent({
            owner: msg.sender,
            name: name,
            metadataURI: metadataURI,
            capabilities: capabilities,
            reputationScore: reputationScore,
            totalTasksCompleted: totalTasksCompleted,
            broadcastTimestamp: block.timestamp,
            isActive: true
        });

        // Add to list
        broadcastedAgentList.push(msg.sender);
        agentListIndex[msg.sender] = broadcastedAgentList.length;

        // Emit event for each supported chain (relayers will pick up)
        for (uint256 i = 0; i < chainIds.length; i++) {
            if (supportedChains[chainIds[i]].isActive) {
                emit AgentBroadcast(
                    msg.sender,
                    chainIds[i],
                    name,
                    metadataURI,
                    capabilities,
                    reputationScore,
                    totalTasksCompleted,
                    block.timestamp
                );
            }
        }
    }

    /**
     * @notice Update broadcasted agent info
     */
    function updateBroadcast(
        string calldata name,
        string calldata metadataURI,
        string[] calldata capabilities,
        uint256 reputationScore,
        uint256 totalTasksCompleted
    ) external {
        if (!broadcastedAgents[msg.sender].isActive) revert NotBroadcasted();

        BroadcastedAgent storage agent = broadcastedAgents[msg.sender];
        agent.name = name;
        agent.metadataURI = metadataURI;
        agent.capabilities = capabilities;
        agent.reputationScore = reputationScore;
        agent.totalTasksCompleted = totalTasksCompleted;
        agent.broadcastTimestamp = block.timestamp;

        // Emit update for all chains
        for (uint256 i = 0; i < chainIds.length; i++) {
            if (supportedChains[chainIds[i]].isActive) {
                emit AgentBroadcast(
                    msg.sender,
                    chainIds[i],
                    name,
                    metadataURI,
                    capabilities,
                    reputationScore,
                    totalTasksCompleted,
                    block.timestamp
                );
            }
        }
    }

    /**
     * @notice Revoke cross-chain broadcast
     */
    function revokeBroadcast() external {
        if (!broadcastedAgents[msg.sender].isActive) revert NotBroadcasted();

        // Mark as inactive
        broadcastedAgents[msg.sender].isActive = false;

        // Remove from list (swap with last, then pop)
        uint256 index = agentListIndex[msg.sender] - 1;
        uint256 lastIndex = broadcastedAgentList.length - 1;
        
        if (index != lastIndex) {
            address lastAgent = broadcastedAgentList[lastIndex];
            broadcastedAgentList[index] = lastAgent;
            agentListIndex[lastAgent] = index + 1;
        }
        
        broadcastedAgentList.pop();
        agentListIndex[msg.sender] = 0;

        emit AgentBroadcastRevoked(msg.sender, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get all broadcasted agents
     */
    function getBroadcastedAgents() external view returns (BroadcastedAgent[] memory) {
        BroadcastedAgent[] memory agents = new BroadcastedAgent[](broadcastedAgentList.length);
        for (uint256 i = 0; i < broadcastedAgentList.length; i++) {
            agents[i] = broadcastedAgents[broadcastedAgentList[i]];
        }
        return agents;
    }

    /**
     * @notice Get broadcasted agents count
     */
    function getBroadcastedAgentCount() external view returns (uint256) {
        return broadcastedAgentList.length;
    }

    /**
     * @notice Get supported chains
     */
    function getSupportedChains() external view returns (ChainConfig[] memory) {
        ChainConfig[] memory configs = new ChainConfig[](chainIds.length);
        for (uint256 i = 0; i < chainIds.length; i++) {
            configs[i] = supportedChains[chainIds[i]];
        }
        return configs;
    }

    /**
     * @notice Check if agent is broadcasted
     */
    function isBroadcasted(address agent) external view returns (bool) {
        return broadcastedAgents[agent].isActive;
    }

    /**
     * @notice Get agent capabilities
     */
    function getAgentCapabilities(address agent) external view returns (string[] memory) {
        return broadcastedAgents[agent].capabilities;
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a supported destination chain
     */
    function addChain(
        uint256 chainId,
        string calldata name,
        address receiverContract
    ) external onlyOwner {
        if (supportedChains[chainId].chainId != 0) revert ChainAlreadyExists();
        
        supportedChains[chainId] = ChainConfig({
            chainId: chainId,
            name: name,
            receiverContract: receiverContract,
            isActive: true
        });
        chainIds.push(chainId);

        emit ChainAdded(chainId, name, receiverContract);
    }

    /**
     * @notice Remove a supported chain
     */
    function removeChain(uint256 chainId) external onlyOwner {
        if (supportedChains[chainId].chainId == 0) revert ChainNotSupported();
        
        supportedChains[chainId].isActive = false;
        emit ChainRemoved(chainId);
    }

    /**
     * @notice Update receiver contract for a chain
     */
    function updateChainReceiver(uint256 chainId, address receiverContract) external onlyOwner {
        if (supportedChains[chainId].chainId == 0) revert ChainNotSupported();
        supportedChains[chainId].receiverContract = receiverContract;
    }

    /**
     * @notice Authorize or revoke a relayer
     */
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }

    /**
     * @notice Set broadcast fee
     */
    function setBroadcastFee(uint256 fee) external onlyOwner {
        broadcastFee = fee;
        emit BroadcastFeeUpdated(fee);
    }

    /**
     * @notice Set minimum reputation requirement
     */
    function setMinReputationToBroadcast(uint256 minReputation) external onlyOwner {
        minReputationToBroadcast = minReputation;
        emit ReputationRequirementUpdated(minReputation);
    }

    /**
     * @notice Update agent registry address
     */
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        if (_agentRegistry == address(0)) revert InvalidAddress();
        agentRegistry = _agentRegistry;
    }

    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = to.call{value: balance}("");
        require(success, "Transfer failed");
    }
}
