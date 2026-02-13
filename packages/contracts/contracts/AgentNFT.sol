// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AgentNFT
 * @dev Soulbound NFT for AI Agent Identity on Blockchain Agent Hub
 * 
 * Features:
 * - Non-transferable (soulbound) - represents agent identity
 * - Dynamic metadata that updates with reputation
 * - Achievement badges stored on-chain
 * - SVG artwork generated on-chain
 * - One NFT per agent (1:1 with AgentRegistry)
 */
contract AgentNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Strings for uint256;

    // Counter for token IDs
    uint256 private _nextTokenId;

    // Reference to AgentRegistry (can mint NFTs)
    address public agentRegistry;

    // Agent data stored per NFT
    struct AgentIdentity {
        string name;
        string[] capabilities;
        uint256 registeredAt;
        uint256 reputationScore; // 0-10000 (100.00%)
        uint256 tasksCompleted;
        Badge[] badges;
    }

    struct Badge {
        string name;
        string description;
        uint256 awardedAt;
        BadgeType badgeType;
    }

    enum BadgeType {
        NEWCOMER,      // First registration
        FIRST_TASK,    // Completed first task
        RELIABLE,      // 10+ tasks completed
        EXPERT,        // 50+ tasks completed
        LEGENDARY,     // 100+ tasks completed
        HIGH_REP,      // 90%+ reputation
        PERFECT_REP,   // 100% reputation
        STAKER,        // Staked 1000+ AGNT
        WHALE          // Staked 10000+ AGNT
    }

    // Mapping from token ID to agent identity
    mapping(uint256 => AgentIdentity) public agentIdentities;
    
    // Mapping from agent address to token ID (for lookup)
    mapping(address => uint256) public agentToToken;
    
    // Mapping from agent address to whether they have an NFT
    mapping(address => bool) public hasNFT;

    // Events
    event AgentNFTMinted(address indexed agent, uint256 indexed tokenId, string name);
    event ReputationUpdated(uint256 indexed tokenId, uint256 newReputation);
    event BadgeAwarded(uint256 indexed tokenId, BadgeType badgeType, string name);
    event AgentRegistryUpdated(address indexed newRegistry);

    // Errors
    error TransferNotAllowed();
    error OnlyAgentRegistry();
    error AlreadyHasNFT();
    error NoNFTFound();

    constructor(address initialOwner) 
        ERC721("Agent Identity", "AGENT-ID") 
        Ownable(initialOwner) 
    {}

    modifier onlyAgentRegistry() {
        if (msg.sender != agentRegistry && msg.sender != owner()) {
            revert OnlyAgentRegistry();
        }
        _;
    }

    /**
     * @dev Set the AgentRegistry contract address
     */
    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
        emit AgentRegistryUpdated(_registry);
    }

    /**
     * @dev Mint a new Agent NFT (called by AgentRegistry on registration)
     */
    function mintAgentNFT(
        address agent,
        string memory name,
        string[] memory capabilities
    ) external onlyAgentRegistry returns (uint256) {
        if (hasNFT[agent]) revert AlreadyHasNFT();

        uint256 tokenId = _nextTokenId++;
        _safeMint(agent, tokenId);

        // Initialize identity
        AgentIdentity storage identity = agentIdentities[tokenId];
        identity.name = name;
        identity.capabilities = capabilities;
        identity.registeredAt = block.timestamp;
        identity.reputationScore = 5000; // Start at 50%

        // Award newcomer badge
        identity.badges.push(Badge({
            name: "Newcomer",
            description: "Welcome to the Agent Hub!",
            awardedAt: block.timestamp,
            badgeType: BadgeType.NEWCOMER
        }));

        agentToToken[agent] = tokenId;
        hasNFT[agent] = true;

        emit AgentNFTMinted(agent, tokenId, name);
        emit BadgeAwarded(tokenId, BadgeType.NEWCOMER, "Newcomer");

        return tokenId;
    }

    /**
     * @dev Update agent's reputation (called after task completion)
     */
    function updateReputation(
        address agent,
        uint256 newReputation,
        uint256 tasksCompleted
    ) external onlyAgentRegistry {
        if (!hasNFT[agent]) revert NoNFTFound();
        
        uint256 tokenId = agentToToken[agent];
        AgentIdentity storage identity = agentIdentities[tokenId];
        
        uint256 oldTasks = identity.tasksCompleted;
        identity.reputationScore = newReputation;
        identity.tasksCompleted = tasksCompleted;

        emit ReputationUpdated(tokenId, newReputation);

        // Check for badge awards
        _checkAndAwardBadges(tokenId, oldTasks, tasksCompleted, newReputation);
    }

    /**
     * @dev Award a staking badge
     */
    function awardStakingBadge(address agent, uint256 stakedAmount) external onlyAgentRegistry {
        if (!hasNFT[agent]) revert NoNFTFound();
        
        uint256 tokenId = agentToToken[agent];
        AgentIdentity storage identity = agentIdentities[tokenId];

        if (stakedAmount >= 10000 * 10**18 && !_hasBadge(tokenId, BadgeType.WHALE)) {
            identity.badges.push(Badge({
                name: "Whale",
                description: "Staked 10,000+ AGNT",
                awardedAt: block.timestamp,
                badgeType: BadgeType.WHALE
            }));
            emit BadgeAwarded(tokenId, BadgeType.WHALE, "Whale");
        } else if (stakedAmount >= 1000 * 10**18 && !_hasBadge(tokenId, BadgeType.STAKER)) {
            identity.badges.push(Badge({
                name: "Staker",
                description: "Staked 1,000+ AGNT",
                awardedAt: block.timestamp,
                badgeType: BadgeType.STAKER
            }));
            emit BadgeAwarded(tokenId, BadgeType.STAKER, "Staker");
        }
    }

    /**
     * @dev Internal function to check and award badges based on milestones
     */
    function _checkAndAwardBadges(
        uint256 tokenId,
        uint256 oldTasks,
        uint256 newTasks,
        uint256 reputation
    ) internal {
        AgentIdentity storage identity = agentIdentities[tokenId];

        // First task badge
        if (oldTasks == 0 && newTasks >= 1 && !_hasBadge(tokenId, BadgeType.FIRST_TASK)) {
            identity.badges.push(Badge({
                name: "First Steps",
                description: "Completed your first task",
                awardedAt: block.timestamp,
                badgeType: BadgeType.FIRST_TASK
            }));
            emit BadgeAwarded(tokenId, BadgeType.FIRST_TASK, "First Steps");
        }

        // Reliable badge (10+ tasks)
        if (newTasks >= 10 && !_hasBadge(tokenId, BadgeType.RELIABLE)) {
            identity.badges.push(Badge({
                name: "Reliable",
                description: "Completed 10+ tasks",
                awardedAt: block.timestamp,
                badgeType: BadgeType.RELIABLE
            }));
            emit BadgeAwarded(tokenId, BadgeType.RELIABLE, "Reliable");
        }

        // Expert badge (50+ tasks)
        if (newTasks >= 50 && !_hasBadge(tokenId, BadgeType.EXPERT)) {
            identity.badges.push(Badge({
                name: "Expert",
                description: "Completed 50+ tasks",
                awardedAt: block.timestamp,
                badgeType: BadgeType.EXPERT
            }));
            emit BadgeAwarded(tokenId, BadgeType.EXPERT, "Expert");
        }

        // Legendary badge (100+ tasks)
        if (newTasks >= 100 && !_hasBadge(tokenId, BadgeType.LEGENDARY)) {
            identity.badges.push(Badge({
                name: "Legendary",
                description: "Completed 100+ tasks",
                awardedAt: block.timestamp,
                badgeType: BadgeType.LEGENDARY
            }));
            emit BadgeAwarded(tokenId, BadgeType.LEGENDARY, "Legendary");
        }

        // High reputation badge (90%+)
        if (reputation >= 9000 && !_hasBadge(tokenId, BadgeType.HIGH_REP)) {
            identity.badges.push(Badge({
                name: "Highly Rated",
                description: "Achieved 90%+ reputation",
                awardedAt: block.timestamp,
                badgeType: BadgeType.HIGH_REP
            }));
            emit BadgeAwarded(tokenId, BadgeType.HIGH_REP, "Highly Rated");
        }

        // Perfect reputation badge (100%)
        if (reputation == 10000 && !_hasBadge(tokenId, BadgeType.PERFECT_REP)) {
            identity.badges.push(Badge({
                name: "Perfect",
                description: "Achieved perfect reputation",
                awardedAt: block.timestamp,
                badgeType: BadgeType.PERFECT_REP
            }));
            emit BadgeAwarded(tokenId, BadgeType.PERFECT_REP, "Perfect");
        }
    }

    /**
     * @dev Check if agent has a specific badge
     */
    function _hasBadge(uint256 tokenId, BadgeType badgeType) internal view returns (bool) {
        Badge[] storage badges = agentIdentities[tokenId].badges;
        for (uint256 i = 0; i < badges.length; i++) {
            if (badges[i].badgeType == badgeType) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get all badges for an agent
     */
    function getBadges(uint256 tokenId) external view returns (Badge[] memory) {
        return agentIdentities[tokenId].badges;
    }

    /**
     * @dev Get badge count for an agent
     */
    function getBadgeCount(uint256 tokenId) external view returns (uint256) {
        return agentIdentities[tokenId].badges.length;
    }

    /**
     * @dev Generate on-chain SVG for the NFT
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        AgentIdentity storage identity = agentIdentities[tokenId];
        
        // Determine color based on reputation
        string memory gradientStart;
        string memory gradientEnd;
        if (identity.reputationScore >= 9000) {
            gradientStart = "#FFD700"; // Gold
            gradientEnd = "#FFA500";
        } else if (identity.reputationScore >= 7000) {
            gradientStart = "#9B59B6"; // Purple
            gradientEnd = "#8E44AD";
        } else if (identity.reputationScore >= 5000) {
            gradientStart = "#3498DB"; // Blue
            gradientEnd = "#2980B9";
        } else {
            gradientStart = "#95A5A6"; // Gray
            gradientEnd = "#7F8C8D";
        }

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', gradientStart, '"/>',
            '<stop offset="100%" style="stop-color:', gradientEnd, '"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="500" rx="20" fill="url(#bg)"/>',
            '<rect x="20" y="20" width="360" height="460" rx="15" fill="#1a1a2e" opacity="0.9"/>',
            '<text x="200" y="80" text-anchor="middle" fill="white" font-size="24" font-weight="bold">',
            identity.name,
            '</text>',
            '<text x="200" y="120" text-anchor="middle" fill="#888" font-size="14">Agent Identity #',
            tokenId.toString(),
            '</text>',
            '<circle cx="200" cy="200" r="60" fill="', gradientStart, '" opacity="0.3"/>',
            unicode'<text x="200" y="210" text-anchor="middle" fill="white" font-size="32">🤖</text>',
            '<text x="200" y="300" text-anchor="middle" fill="white" font-size="18">Reputation: ',
            (identity.reputationScore / 100).toString(), '%</text>',
            '<text x="200" y="330" text-anchor="middle" fill="#888" font-size="14">Tasks: ',
            identity.tasksCompleted.toString(),
            '</text>',
            '<text x="200" y="360" text-anchor="middle" fill="#888" font-size="14">Badges: ',
            identity.badges.length.toString(),
            '</text>',
            '<text x="200" y="450" text-anchor="middle" fill="#666" font-size="12">Blockchain Agent Hub</text>',
            '</svg>'
        ));
    }

    /**
     * @dev Generate token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        
        AgentIdentity storage identity = agentIdentities[tokenId];
        
        string memory svg = generateSVG(tokenId);
        string memory svgBase64 = Base64.encode(bytes(svg));
        
        // Build capabilities array for JSON
        string memory caps = "[";
        for (uint256 i = 0; i < identity.capabilities.length; i++) {
            caps = string(abi.encodePacked(caps, '"', identity.capabilities[i], '"'));
            if (i < identity.capabilities.length - 1) {
                caps = string(abi.encodePacked(caps, ","));
            }
        }
        caps = string(abi.encodePacked(caps, "]"));

        string memory json = string(abi.encodePacked(
            '{"name":"', identity.name, ' #', tokenId.toString(), '",',
            '"description":"Soulbound AI Agent Identity on Blockchain Agent Hub",',
            '"image":"data:image/svg+xml;base64,', svgBase64, '",',
            '"attributes":[',
            '{"trait_type":"Reputation","value":', (identity.reputationScore / 100).toString(), '},',
            '{"trait_type":"Tasks Completed","value":', identity.tasksCompleted.toString(), '},',
            '{"trait_type":"Badges","value":', identity.badges.length.toString(), '},',
            '{"trait_type":"Capabilities","value":', caps, '}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ============ Soulbound Implementation (No Transfers) ============

    /**
     * @dev Override to prevent transfers (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // Prevent transfers between addresses
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override to prevent approvals (soulbound)
     */
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert TransferNotAllowed();
    }

    /**
     * @dev Override to prevent approvals (soulbound)
     */
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert TransferNotAllowed();
    }

    // ============ Required Overrides ============

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) 
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
