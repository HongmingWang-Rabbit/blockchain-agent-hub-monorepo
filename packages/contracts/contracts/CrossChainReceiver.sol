// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainReceiver
 * @notice Receives and stores agent information from other chains
 * @dev Deployed on destination chains to enable cross-chain agent discovery
 * 
 * Architecture:
 * - Receives agent sync calls from authorized relayers
 * - Stores remote agent info for local discovery
 * - Allows querying agents from any registered source chain
 * - Future: Integrate LayerZero/Chainlink CCIP for trustless receiving
 */
contract CrossChainReceiver is Ownable, ReentrancyGuard {
    // ============ Structs ============

    struct RemoteAgent {
        uint256 sourceChainId;
        address owner;
        string name;
        string metadataURI;
        string[] capabilities;
        uint256 reputationScore;
        uint256 totalTasksCompleted;
        uint256 lastSyncTimestamp;
        bool isActive;
    }

    struct SourceChain {
        uint256 chainId;
        string name;
        address hubContract;
        bool isActive;
    }

    // ============ State Variables ============

    /// @notice Mapping of (sourceChainId => agentAddress) => RemoteAgent
    mapping(uint256 => mapping(address => RemoteAgent)) public remoteAgents;

    /// @notice List of agent addresses per source chain
    mapping(uint256 => address[]) public agentsByChain;

    /// @notice Index tracking for efficient removal
    mapping(uint256 => mapping(address => uint256)) public agentIndex;

    /// @notice Capability index: capability => sourceChainId => agent addresses
    mapping(string => mapping(uint256 => address[])) public capabilityIndex;

    /// @notice Registered source chains
    mapping(uint256 => SourceChain) public sourceChains;

    /// @notice List of source chain IDs
    uint256[] public sourceChainIds;

    /// @notice Authorized relayers for receiving sync data
    mapping(address => bool) public authorizedRelayers;

    /// @notice Total agents across all chains
    uint256 public totalRemoteAgents;

    /// @notice Stale threshold - agents not synced within this period are marked stale
    uint256 public staleThreshold = 7 days;

    // ============ Events ============

    event AgentSynced(
        uint256 indexed sourceChainId,
        address indexed agentOwner,
        string name,
        uint256 reputationScore,
        uint256 timestamp
    );

    event AgentRemoved(
        uint256 indexed sourceChainId,
        address indexed agentOwner,
        uint256 timestamp
    );

    event SourceChainAdded(
        uint256 indexed chainId,
        string name,
        address hubContract
    );

    event SourceChainRemoved(uint256 indexed chainId);

    event RelayerUpdated(address indexed relayer, bool authorized);

    event StaleThresholdUpdated(uint256 newThreshold);

    // ============ Errors ============

    error NotAuthorizedRelayer();
    error SourceChainNotRegistered();
    error SourceChainAlreadyExists();
    error AgentNotFound();
    error InvalidChainId();
    error InvalidAddress();

    // ============ Modifiers ============

    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender]) revert NotAuthorizedRelayer();
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Relayer Functions ============

    /**
     * @notice Sync an agent from a source chain
     * @dev Called by authorized relayers when AgentBroadcast event is detected
     */
    function syncAgent(
        uint256 sourceChainId,
        address agentOwner,
        string calldata name,
        string calldata metadataURI,
        string[] calldata capabilities,
        uint256 reputationScore,
        uint256 totalTasksCompleted
    ) external onlyRelayer nonReentrant {
        if (!sourceChains[sourceChainId].isActive) revert SourceChainNotRegistered();

        RemoteAgent storage agent = remoteAgents[sourceChainId][agentOwner];
        
        bool isNew = !agent.isActive;
        
        // Update or create agent
        agent.sourceChainId = sourceChainId;
        agent.owner = agentOwner;
        agent.name = name;
        agent.metadataURI = metadataURI;
        agent.capabilities = capabilities;
        agent.reputationScore = reputationScore;
        agent.totalTasksCompleted = totalTasksCompleted;
        agent.lastSyncTimestamp = block.timestamp;
        agent.isActive = true;

        if (isNew) {
            // Add to chain list
            agentsByChain[sourceChainId].push(agentOwner);
            agentIndex[sourceChainId][agentOwner] = agentsByChain[sourceChainId].length;
            totalRemoteAgents++;

            // Index capabilities
            for (uint256 i = 0; i < capabilities.length; i++) {
                capabilityIndex[capabilities[i]][sourceChainId].push(agentOwner);
            }
        }

        emit AgentSynced(
            sourceChainId,
            agentOwner,
            name,
            reputationScore,
            block.timestamp
        );
    }

    /**
     * @notice Batch sync multiple agents
     */
    function batchSyncAgents(
        uint256 sourceChainId,
        address[] calldata agentOwners,
        string[] calldata names,
        string[] calldata metadataURIs,
        string[][] calldata capabilities,
        uint256[] calldata reputationScores,
        uint256[] calldata totalTasksCompleted
    ) external onlyRelayer nonReentrant {
        if (!sourceChains[sourceChainId].isActive) revert SourceChainNotRegistered();
        
        uint256 length = agentOwners.length;
        require(
            names.length == length &&
            metadataURIs.length == length &&
            capabilities.length == length &&
            reputationScores.length == length &&
            totalTasksCompleted.length == length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            RemoteAgent storage agent = remoteAgents[sourceChainId][agentOwners[i]];
            
            bool isNew = !agent.isActive;
            
            agent.sourceChainId = sourceChainId;
            agent.owner = agentOwners[i];
            agent.name = names[i];
            agent.metadataURI = metadataURIs[i];
            agent.capabilities = capabilities[i];
            agent.reputationScore = reputationScores[i];
            agent.totalTasksCompleted = totalTasksCompleted[i];
            agent.lastSyncTimestamp = block.timestamp;
            agent.isActive = true;

            if (isNew) {
                agentsByChain[sourceChainId].push(agentOwners[i]);
                agentIndex[sourceChainId][agentOwners[i]] = agentsByChain[sourceChainId].length;
                totalRemoteAgents++;

                for (uint256 j = 0; j < capabilities[i].length; j++) {
                    capabilityIndex[capabilities[i][j]][sourceChainId].push(agentOwners[i]);
                }
            }

            emit AgentSynced(
                sourceChainId,
                agentOwners[i],
                names[i],
                reputationScores[i],
                block.timestamp
            );
        }
    }

    /**
     * @notice Remove an agent (when revoked on source chain)
     */
    function removeAgent(
        uint256 sourceChainId,
        address agentOwner
    ) external onlyRelayer {
        RemoteAgent storage agent = remoteAgents[sourceChainId][agentOwner];
        if (!agent.isActive) revert AgentNotFound();

        agent.isActive = false;

        // Remove from chain list (swap and pop)
        uint256 idx = agentIndex[sourceChainId][agentOwner] - 1;
        uint256 lastIdx = agentsByChain[sourceChainId].length - 1;
        
        if (idx != lastIdx) {
            address lastAgent = agentsByChain[sourceChainId][lastIdx];
            agentsByChain[sourceChainId][idx] = lastAgent;
            agentIndex[sourceChainId][lastAgent] = idx + 1;
        }
        
        agentsByChain[sourceChainId].pop();
        agentIndex[sourceChainId][agentOwner] = 0;
        totalRemoteAgents--;

        emit AgentRemoved(sourceChainId, agentOwner, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get a remote agent's info
     */
    function getAgent(
        uint256 sourceChainId,
        address agentOwner
    ) external view returns (RemoteAgent memory) {
        return remoteAgents[sourceChainId][agentOwner];
    }

    /**
     * @notice Get all agents from a specific source chain
     */
    function getAgentsBySourceChain(uint256 sourceChainId) external view returns (RemoteAgent[] memory) {
        address[] storage agentAddrs = agentsByChain[sourceChainId];
        RemoteAgent[] memory agents = new RemoteAgent[](agentAddrs.length);
        
        for (uint256 i = 0; i < agentAddrs.length; i++) {
            agents[i] = remoteAgents[sourceChainId][agentAddrs[i]];
        }
        
        return agents;
    }

    /**
     * @notice Get agents with a specific capability from a source chain
     */
    function getAgentsByCapability(
        string calldata capability,
        uint256 sourceChainId
    ) external view returns (RemoteAgent[] memory) {
        address[] storage agentAddrs = capabilityIndex[capability][sourceChainId];
        RemoteAgent[] memory agents = new RemoteAgent[](agentAddrs.length);
        
        for (uint256 i = 0; i < agentAddrs.length; i++) {
            RemoteAgent storage agent = remoteAgents[sourceChainId][agentAddrs[i]];
            if (agent.isActive) {
                agents[i] = agent;
            }
        }
        
        return agents;
    }

    /**
     * @notice Get all remote agents across all chains
     */
    function getAllRemoteAgents() external view returns (RemoteAgent[] memory) {
        RemoteAgent[] memory allAgents = new RemoteAgent[](totalRemoteAgents);
        uint256 idx = 0;
        
        for (uint256 i = 0; i < sourceChainIds.length; i++) {
            uint256 chainId = sourceChainIds[i];
            address[] storage agentAddrs = agentsByChain[chainId];
            
            for (uint256 j = 0; j < agentAddrs.length; j++) {
                allAgents[idx] = remoteAgents[chainId][agentAddrs[j]];
                idx++;
            }
        }
        
        return allAgents;
    }

    /**
     * @notice Get agent count from a source chain
     */
    function getAgentCountByChain(uint256 sourceChainId) external view returns (uint256) {
        return agentsByChain[sourceChainId].length;
    }

    /**
     * @notice Check if an agent is registered and active
     */
    function isAgentActive(
        uint256 sourceChainId,
        address agentOwner
    ) external view returns (bool) {
        return remoteAgents[sourceChainId][agentOwner].isActive;
    }

    /**
     * @notice Check if an agent's data is stale
     */
    function isAgentStale(
        uint256 sourceChainId,
        address agentOwner
    ) external view returns (bool) {
        RemoteAgent storage agent = remoteAgents[sourceChainId][agentOwner];
        return agent.isActive && (block.timestamp - agent.lastSyncTimestamp > staleThreshold);
    }

    /**
     * @notice Get all registered source chains
     */
    function getSourceChains() external view returns (SourceChain[] memory) {
        SourceChain[] memory chains = new SourceChain[](sourceChainIds.length);
        for (uint256 i = 0; i < sourceChainIds.length; i++) {
            chains[i] = sourceChains[sourceChainIds[i]];
        }
        return chains;
    }

    /**
     * @notice Get agent capabilities
     */
    function getAgentCapabilities(
        uint256 sourceChainId,
        address agentOwner
    ) external view returns (string[] memory) {
        return remoteAgents[sourceChainId][agentOwner].capabilities;
    }

    // ============ Admin Functions ============

    /**
     * @notice Register a source chain
     */
    function addSourceChain(
        uint256 chainId,
        string calldata name,
        address hubContract
    ) external onlyOwner {
        if (chainId == 0) revert InvalidChainId();
        if (sourceChains[chainId].chainId != 0) revert SourceChainAlreadyExists();
        
        sourceChains[chainId] = SourceChain({
            chainId: chainId,
            name: name,
            hubContract: hubContract,
            isActive: true
        });
        sourceChainIds.push(chainId);

        emit SourceChainAdded(chainId, name, hubContract);
    }

    /**
     * @notice Deactivate a source chain
     */
    function removeSourceChain(uint256 chainId) external onlyOwner {
        if (sourceChains[chainId].chainId == 0) revert SourceChainNotRegistered();
        sourceChains[chainId].isActive = false;
        emit SourceChainRemoved(chainId);
    }

    /**
     * @notice Update hub contract address for a source chain
     */
    function updateSourceChainHub(uint256 chainId, address hubContract) external onlyOwner {
        if (sourceChains[chainId].chainId == 0) revert SourceChainNotRegistered();
        sourceChains[chainId].hubContract = hubContract;
    }

    /**
     * @notice Authorize or revoke a relayer
     */
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        if (relayer == address(0)) revert InvalidAddress();
        authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }

    /**
     * @notice Update stale threshold
     */
    function setStaleThreshold(uint256 threshold) external onlyOwner {
        staleThreshold = threshold;
        emit StaleThresholdUpdated(threshold);
    }
}
