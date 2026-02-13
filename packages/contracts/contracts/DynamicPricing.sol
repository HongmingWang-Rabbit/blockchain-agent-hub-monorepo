// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DynamicPricing
 * @dev Dynamic pricing oracle for Blockchain Agent Hub
 * 
 * Features:
 * - Surge pricing based on demand
 * - Agent reputation-based discounts
 * - Time-of-day pricing
 * - Capability-based pricing tiers
 */
contract DynamicPricing is Ownable {
    // Base prices per capability (in wei)
    mapping(string => uint256) public basePrices;
    
    // Demand tracking (tasks created in last hour)
    uint256 public recentTaskCount;
    uint256 public lastDemandUpdate;
    
    // Surge pricing thresholds
    uint256 public constant SURGE_THRESHOLD_LOW = 10;   // 10 tasks/hour = 1.2x
    uint256 public constant SURGE_THRESHOLD_MED = 25;   // 25 tasks/hour = 1.5x
    uint256 public constant SURGE_THRESHOLD_HIGH = 50;  // 50 tasks/hour = 2.0x
    
    // Reputation discount tiers (in basis points, 10000 = 100%)
    uint256 public constant DISCOUNT_HIGH_REP = 500;    // 5% discount for 90%+ rep
    uint256 public constant DISCOUNT_PERFECT_REP = 1000; // 10% discount for 100% rep
    
    // Time-based pricing (UTC hours)
    uint256 public constant PEAK_START = 14;  // 2 PM UTC
    uint256 public constant PEAK_END = 22;    // 10 PM UTC
    uint256 public constant PEAK_MULTIPLIER = 115; // 1.15x during peak (115/100)
    
    // Events
    event BasePriceSet(string capability, uint256 price);
    event DemandUpdated(uint256 taskCount, uint256 timestamp);
    event PriceCalculated(string capability, uint256 basePrice, uint256 finalPrice, uint256 surgeMultiplier);

    constructor(address _owner) Ownable(_owner) {
        // Set default base prices (in AGNT wei, 18 decimals)
        basePrices["text-generation"] = 10 * 10**18;      // 10 AGNT
        basePrices["code-review"] = 25 * 10**18;          // 25 AGNT
        basePrices["data-analysis"] = 20 * 10**18;        // 20 AGNT
        basePrices["image-generation"] = 15 * 10**18;     // 15 AGNT
        basePrices["translation"] = 8 * 10**18;           // 8 AGNT
        basePrices["summarization"] = 5 * 10**18;         // 5 AGNT
        basePrices["research"] = 30 * 10**18;             // 30 AGNT
        basePrices["debugging"] = 35 * 10**18;            // 35 AGNT
        basePrices["documentation"] = 12 * 10**18;        // 12 AGNT
        basePrices["default"] = 15 * 10**18;              // 15 AGNT fallback
        
        lastDemandUpdate = block.timestamp;
    }

    /**
     * @dev Set base price for a capability
     */
    function setBasePrice(string calldata capability, uint256 price) external onlyOwner {
        basePrices[capability] = price;
        emit BasePriceSet(capability, price);
    }

    /**
     * @dev Record a new task (called by TaskMarketplace)
     */
    function recordTask() external {
        // Reset counter if more than 1 hour has passed
        if (block.timestamp - lastDemandUpdate > 3600) {
            recentTaskCount = 1;
            lastDemandUpdate = block.timestamp;
        } else {
            recentTaskCount++;
        }
        emit DemandUpdated(recentTaskCount, block.timestamp);
    }

    /**
     * @dev Calculate dynamic price for a task
     * @param capability Required capability
     * @param agentReputation Agent's reputation score (0-10000)
     * @return finalPrice The calculated price
     */
    function calculatePrice(
        string calldata capability,
        uint256 agentReputation
    ) external view returns (uint256 finalPrice) {
        // Get base price (use default if not set)
        uint256 basePrice = basePrices[capability];
        if (basePrice == 0) {
            basePrice = basePrices["default"];
        }

        // Apply surge multiplier
        uint256 surgeMultiplier = getSurgeMultiplier();
        uint256 price = (basePrice * surgeMultiplier) / 100;

        // Apply time-of-day pricing
        if (isPeakHours()) {
            price = (price * PEAK_MULTIPLIER) / 100;
        }

        // Apply reputation discount
        uint256 discount = getReputationDiscount(agentReputation);
        if (discount > 0) {
            price = (price * (10000 - discount)) / 10000;
        }

        return price;
    }

    /**
     * @dev Get suggested price range for a capability
     */
    function getPriceRange(string calldata capability) external view returns (
        uint256 minPrice,
        uint256 maxPrice,
        uint256 currentPrice
    ) {
        uint256 basePrice = basePrices[capability];
        if (basePrice == 0) {
            basePrice = basePrices["default"];
        }

        // Min: base price with max discount during off-peak
        minPrice = (basePrice * (10000 - DISCOUNT_PERFECT_REP)) / 10000;
        
        // Max: base price with max surge during peak
        maxPrice = (basePrice * 200 * PEAK_MULTIPLIER) / 10000; // 2x surge * 1.15x peak
        
        // Current: base with current surge
        currentPrice = (basePrice * getSurgeMultiplier()) / 100;
        if (isPeakHours()) {
            currentPrice = (currentPrice * PEAK_MULTIPLIER) / 100;
        }
    }

    /**
     * @dev Get current surge multiplier (100 = 1x, 200 = 2x)
     */
    function getSurgeMultiplier() public view returns (uint256) {
        // Decay task count if stale
        uint256 effectiveCount = recentTaskCount;
        if (block.timestamp - lastDemandUpdate > 3600) {
            effectiveCount = 0;
        }

        if (effectiveCount >= SURGE_THRESHOLD_HIGH) {
            return 200; // 2x
        } else if (effectiveCount >= SURGE_THRESHOLD_MED) {
            return 150; // 1.5x
        } else if (effectiveCount >= SURGE_THRESHOLD_LOW) {
            return 120; // 1.2x
        }
        return 100; // 1x (no surge)
    }

    /**
     * @dev Check if current time is peak hours
     */
    function isPeakHours() public view returns (bool) {
        uint256 hour = (block.timestamp / 3600) % 24;
        return hour >= PEAK_START && hour < PEAK_END;
    }

    /**
     * @dev Get reputation discount in basis points
     */
    function getReputationDiscount(uint256 reputation) public pure returns (uint256) {
        if (reputation >= 10000) {
            return DISCOUNT_PERFECT_REP; // 10% for perfect
        } else if (reputation >= 9000) {
            return DISCOUNT_HIGH_REP; // 5% for 90%+
        }
        return 0;
    }

    /**
     * @dev Get pricing info for display
     */
    function getPricingInfo() external view returns (
        uint256 currentSurge,
        bool isPeak,
        uint256 tasksLastHour,
        uint256 nextSurgeAt
    ) {
        currentSurge = getSurgeMultiplier();
        isPeak = isPeakHours();
        tasksLastHour = block.timestamp - lastDemandUpdate > 3600 ? 0 : recentTaskCount;
        
        // Calculate tasks needed for next surge tier
        if (tasksLastHour < SURGE_THRESHOLD_LOW) {
            nextSurgeAt = SURGE_THRESHOLD_LOW;
        } else if (tasksLastHour < SURGE_THRESHOLD_MED) {
            nextSurgeAt = SURGE_THRESHOLD_MED;
        } else if (tasksLastHour < SURGE_THRESHOLD_HIGH) {
            nextSurgeAt = SURGE_THRESHOLD_HIGH;
        } else {
            nextSurgeAt = 0; // Already at max surge
        }
    }
}
