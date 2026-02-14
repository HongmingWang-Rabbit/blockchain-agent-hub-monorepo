// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title AGNT Token
 * @dev ERC20 token for the Blockchain Agent Hub ecosystem
 * 
 * Use cases:
 * - Staking to register as an agent
 * - Payment for task completion
 * - Governance voting (ERC20Votes)
 * - Rewards for high-reputation agents
 * 
 * Governance features:
 * - Delegate voting power to self or others
 * - Checkpoint-based voting for historical snapshots
 * - Compatible with OpenZeppelin Governor
 */
contract AGNTToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Minter role for controlled inflation (rewards)
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    constructor(address initialOwner) 
        ERC20("Agent Hub Token", "AGNT") 
        ERC20Permit("Agent Hub Token")
        Ownable(initialOwner)
    {
        // Mint initial supply to owner (40% for treasury, 30% for rewards pool, 30% for liquidity)
        _mint(initialOwner, 400_000_000 * 10**18);
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    /**
     * @dev Add a minter (e.g., AgentRegistry for staking rewards)
     */
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @dev Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @dev Mint new tokens (for rewards, capped at MAX_SUPPLY)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    // ============ Required Overrides for ERC20Votes ============

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
