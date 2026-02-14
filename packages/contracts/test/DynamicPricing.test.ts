import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DynamicPricing", function () {
  let dynamicPricing: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
    dynamicPricing = await DynamicPricing.deploy(owner.address);
  });

  describe("Base Prices", function () {
    it("Should have default prices set", async function () {
      const codeReviewPrice = await dynamicPricing.basePrices("code-review");
      expect(codeReviewPrice).to.equal(ethers.parseEther("25"));

      const textGenPrice = await dynamicPricing.basePrices("text-generation");
      expect(textGenPrice).to.equal(ethers.parseEther("10"));
    });

    it("Should allow owner to set base price", async function () {
      await dynamicPricing.setBasePrice("custom-task", ethers.parseEther("50"));
      
      const price = await dynamicPricing.basePrices("custom-task");
      expect(price).to.equal(ethers.parseEther("50"));
    });

    it("Should use default price for unknown capability", async function () {
      const [min, max, current] = await dynamicPricing.getPriceRange("unknown-capability");
      const defaultPrice = await dynamicPricing.basePrices("default");
      // Current price may include peak hours multiplier (1.15x), so check range
      // Min should be base price with max discount, max should be base price with max surge
      expect(min).to.equal(defaultPrice * 90n / 100n); // 10% discount
      expect(current).to.be.gte(defaultPrice * 90n / 100n);
      expect(current).to.be.lte(defaultPrice * 230n / 100n); // 2x surge + 15% peak
    });
  });

  describe("Surge Pricing", function () {
    it("Should start with no surge", async function () {
      const multiplier = await dynamicPricing.getSurgeMultiplier();
      expect(multiplier).to.equal(100); // 1x
    });

    it("Should increase surge with demand", async function () {
      // Record 10 tasks to trigger low surge
      for (let i = 0; i < 10; i++) {
        await dynamicPricing.recordTask();
      }
      
      let multiplier = await dynamicPricing.getSurgeMultiplier();
      expect(multiplier).to.equal(120); // 1.2x

      // Record more tasks to trigger medium surge
      for (let i = 0; i < 15; i++) {
        await dynamicPricing.recordTask();
      }
      
      multiplier = await dynamicPricing.getSurgeMultiplier();
      expect(multiplier).to.equal(150); // 1.5x
    });

    it("Should reset surge after 1 hour", async function () {
      // Record tasks
      for (let i = 0; i < 15; i++) {
        await dynamicPricing.recordTask();
      }
      
      let multiplier = await dynamicPricing.getSurgeMultiplier();
      expect(multiplier).to.be.gt(100);

      // Fast forward 1 hour
      await time.increase(3601);

      multiplier = await dynamicPricing.getSurgeMultiplier();
      expect(multiplier).to.equal(100); // Reset to 1x
    });
  });

  describe("Reputation Discounts", function () {
    it("Should give no discount for low reputation", async function () {
      const discount = await dynamicPricing.getReputationDiscount(5000);
      expect(discount).to.equal(0);
    });

    it("Should give 5% discount for 90%+ reputation", async function () {
      const discount = await dynamicPricing.getReputationDiscount(9000);
      expect(discount).to.equal(500); // 500 basis points = 5%
    });

    it("Should give 10% discount for perfect reputation", async function () {
      const discount = await dynamicPricing.getReputationDiscount(10000);
      expect(discount).to.equal(1000); // 1000 basis points = 10%
    });
  });

  describe("Price Calculation", function () {
    it("Should calculate price with no modifiers", async function () {
      const basePrice = await dynamicPricing.basePrices("text-generation");
      const calculatedPrice = await dynamicPricing.calculatePrice("text-generation", 5000);
      
      // Should be base price (no surge, assuming not peak hours, no discount)
      // Peak hours multiplier may apply depending on test time
      expect(calculatedPrice).to.be.gte(basePrice);
    });

    it("Should apply reputation discount", async function () {
      const basePrice = await dynamicPricing.basePrices("text-generation");
      
      const normalPrice = await dynamicPricing.calculatePrice("text-generation", 5000);
      const discountedPrice = await dynamicPricing.calculatePrice("text-generation", 10000);
      
      // Perfect rep should give 10% discount
      expect(discountedPrice).to.be.lt(normalPrice);
    });
  });

  describe("Price Range", function () {
    it("Should return valid price range", async function () {
      const [minPrice, maxPrice, currentPrice] = await dynamicPricing.getPriceRange("code-review");
      
      expect(minPrice).to.be.gt(0);
      expect(maxPrice).to.be.gt(minPrice);
      expect(currentPrice).to.be.gte(minPrice);
      expect(currentPrice).to.be.lte(maxPrice);
    });
  });

  describe("Pricing Info", function () {
    it("Should return pricing info", async function () {
      const [currentSurge, isPeak, tasksLastHour, nextSurgeAt] = await dynamicPricing.getPricingInfo();
      
      expect(currentSurge).to.equal(100); // No surge initially
      expect(tasksLastHour).to.equal(0);
      expect(nextSurgeAt).to.equal(10); // First surge at 10 tasks
    });
  });
});
