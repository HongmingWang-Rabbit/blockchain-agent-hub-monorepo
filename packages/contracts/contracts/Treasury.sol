// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Protocol treasury controlled by governance
 * @dev Holds accumulated platform fees and funds for grants/rewards
 * 
 * Governance can:
 * - Transfer tokens to recipients (grants, rewards)
 * - Set spending limits per category
 * - Emergency pause withdrawals
 */
contract Treasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");

    /// @notice AGNT token
    IERC20 public immutable agntToken;

    /// @notice Spending categories and limits
    enum SpendingCategory {
        GRANTS,          // Developer/agent grants
        REWARDS,         // Agent performance rewards  
        OPERATIONS,      // Operational expenses
        LIQUIDITY,       // Liquidity provisioning
        EMERGENCY        // Emergency fund
    }

    /// @notice Spending limits per category (per period)
    mapping(SpendingCategory => uint256) public categoryLimits;
    
    /// @notice Amount spent per category in current period
    mapping(SpendingCategory => uint256) public categorySpent;
    
    /// @notice Period start timestamp
    uint256 public periodStart;
    
    /// @notice Period duration (default: 30 days)
    uint256 public periodDuration = 30 days;

    /// @notice Emergency pause flag
    bool public paused;

    /// @notice Events
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount, SpendingCategory category, string reason);
    event CategoryLimitUpdated(SpendingCategory category, uint256 newLimit);
    event PeriodReset(uint256 newPeriodStart);
    event EmergencyPause(bool paused);

    constructor(address _agntToken, address _admin) {
        agntToken = IERC20(_agntToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNOR_ROLE, _admin);
        
        periodStart = block.timestamp;

        // Default limits (can be changed by governance)
        categoryLimits[SpendingCategory.GRANTS] = 100_000 * 10**18;
        categoryLimits[SpendingCategory.REWARDS] = 200_000 * 10**18;
        categoryLimits[SpendingCategory.OPERATIONS] = 50_000 * 10**18;
        categoryLimits[SpendingCategory.LIQUIDITY] = 500_000 * 10**18;
        categoryLimits[SpendingCategory.EMERGENCY] = 100_000 * 10**18;
    }

    // ============ Deposit ============

    /**
     * @notice Deposit tokens to treasury
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external {
        agntToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Receive platform fees from TaskMarketplace
     * @dev Called automatically when fees are collected
     */
    function receiveFees(uint256 amount) external {
        agntToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    // ============ Withdrawals ============

    /**
     * @notice Withdraw tokens (governance controlled)
     * @param to Recipient address
     * @param amount Amount to withdraw
     * @param category Spending category
     * @param reason Reason for withdrawal
     */
    function withdraw(
        address to,
        uint256 amount,
        SpendingCategory category,
        string calldata reason
    ) external onlyRole(GOVERNOR_ROLE) nonReentrant {
        require(!paused, "Treasury: paused");
        require(to != address(0), "Treasury: zero address");
        
        // Reset period if needed
        _checkAndResetPeriod();
        
        // Check category limit
        require(
            categorySpent[category] + amount <= categoryLimits[category],
            "Treasury: exceeds category limit"
        );
        
        categorySpent[category] += amount;
        agntToken.safeTransfer(to, amount);
        
        emit Withdrawal(to, amount, category, reason);
    }

    /**
     * @notice Spend with SPENDER_ROLE (limited operations)
     */
    function spend(
        address to,
        uint256 amount,
        SpendingCategory category,
        string calldata reason
    ) external onlyRole(SPENDER_ROLE) nonReentrant {
        require(!paused, "Treasury: paused");
        require(category == SpendingCategory.OPERATIONS, "Spender: only operations");
        require(amount <= categoryLimits[category] / 10, "Spender: max 10% per tx");
        
        _checkAndResetPeriod();
        
        require(
            categorySpent[category] + amount <= categoryLimits[category],
            "Treasury: exceeds category limit"
        );
        
        categorySpent[category] += amount;
        agntToken.safeTransfer(to, amount);
        
        emit Withdrawal(to, amount, category, reason);
    }

    // ============ Governance Functions ============

    /**
     * @notice Update category spending limit
     */
    function setCategoryLimit(SpendingCategory category, uint256 limit) 
        external 
        onlyRole(GOVERNOR_ROLE) 
    {
        categoryLimits[category] = limit;
        emit CategoryLimitUpdated(category, limit);
    }

    /**
     * @notice Emergency pause/unpause
     */
    function setEmergencyPause(bool _paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = _paused;
        emit EmergencyPause(_paused);
    }

    /**
     * @notice Set period duration
     */
    function setPeriodDuration(uint256 duration) external onlyRole(GOVERNOR_ROLE) {
        require(duration >= 1 days, "Treasury: min 1 day");
        periodDuration = duration;
    }

    /**
     * @notice Grant governor role (for timelock)
     */
    function setGovernor(address governor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(GOVERNOR_ROLE, governor);
    }

    // ============ View Functions ============

    /**
     * @notice Get treasury balance
     */
    function balance() external view returns (uint256) {
        return agntToken.balanceOf(address(this));
    }

    /**
     * @notice Get remaining budget for category
     */
    function remainingBudget(SpendingCategory category) external view returns (uint256) {
        if (block.timestamp >= periodStart + periodDuration) {
            return categoryLimits[category];
        }
        return categoryLimits[category] - categorySpent[category];
    }

    /**
     * @notice Time until period reset
     */
    function timeUntilPeriodReset() external view returns (uint256) {
        uint256 periodEnd = periodStart + periodDuration;
        if (block.timestamp >= periodEnd) return 0;
        return periodEnd - block.timestamp;
    }

    // ============ Internal ============

    function _checkAndResetPeriod() internal {
        if (block.timestamp >= periodStart + periodDuration) {
            periodStart = block.timestamp;
            
            // Reset all category spending
            categorySpent[SpendingCategory.GRANTS] = 0;
            categorySpent[SpendingCategory.REWARDS] = 0;
            categorySpent[SpendingCategory.OPERATIONS] = 0;
            categorySpent[SpendingCategory.LIQUIDITY] = 0;
            categorySpent[SpendingCategory.EMERGENCY] = 0;
            
            emit PeriodReset(periodStart);
        }
    }
}
