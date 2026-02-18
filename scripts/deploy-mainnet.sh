#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Blockchain Agent Hub - Mainnet Deployment Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script guides you through a safe mainnet deployment process.
# Run from the repository root: ./scripts/deploy-mainnet.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      BLOCKCHAIN AGENT HUB - MAINNET DEPLOYMENT             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages/contracts" ]; then
    echo -e "${RED}Error: Run this script from the repository root${NC}"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1: Pre-flight checks
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}═══ PHASE 1: Pre-flight Checks ═══${NC}"
echo ""

# Check for required environment
if [ ! -f "packages/contracts/.env" ]; then
    echo -e "${RED}Missing packages/contracts/.env${NC}"
    echo "Create it from .env.example and add your PRIVATE_KEY"
    exit 1
fi

# Check for PRIVATE_KEY in env
if ! grep -q "PRIVATE_KEY=" packages/contracts/.env; then
    echo -e "${RED}PRIVATE_KEY not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment file found${NC}"

# Run tests
echo ""
echo "Running contract tests..."
cd packages/contracts
TEST_OUTPUT=$(npx hardhat test 2>&1 | tail -5)
if echo "$TEST_OUTPUT" | grep -q "passing"; then
    PASSING=$(echo "$TEST_OUTPUT" | grep -o '[0-9]* passing' | head -1)
    echo -e "${GREEN}✓ Tests: $PASSING${NC}"
else
    echo -e "${RED}Tests failed. Fix issues before deploying.${NC}"
    exit 1
fi
cd ../..

# Run pre-deploy checks
echo ""
echo "Running pre-deployment checks..."
cd packages/contracts
npx hardhat run scripts/pre-deploy-check.ts --network hashkeyMainnet 2>&1 | grep -E "(✓|✗|⚠)"
cd ../..

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    CONFIRMATION REQUIRED                    ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "You are about to deploy to HashKey Chain MAINNET (chainId: 177)"
echo ""
echo "This will:"
echo "  1. Deploy all contracts (~0.025 HSK gas cost)"
echo "  2. Set up cross-contract permissions"
echo "  3. Initialize default configuration"
echo "  4. Update SDK with mainnet addresses"
echo ""
read -p "Type 'DEPLOY' to proceed: " CONFIRM

if [ "$CONFIRM" != "DEPLOY" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2: Deploy contracts
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══ PHASE 2: Deploying Contracts ═══${NC}"
echo ""

cd packages/contracts
npx hardhat run scripts/deploy-all.ts --network hashkeyMainnet

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3: Verify contracts
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══ PHASE 3: Verifying Contracts ═══${NC}"
echo ""

npx hardhat run scripts/verify-all.ts --network hashkeyMainnet || echo -e "${YELLOW}Verification failed - run manually later${NC}"

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4: Update SDK & Webapp
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══ PHASE 4: Updating SDK & Webapp ═══${NC}"
echo ""

npx hardhat run scripts/update-sdk-addresses.ts --network hashkeyMainnet
cd ../..

# Rebuild SDK
echo ""
echo "Rebuilding SDK..."
cd packages/sdk
npm run build
cd ../..

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 5: Health check
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══ PHASE 5: Post-Deployment Health Check ═══${NC}"
echo ""

cd packages/contracts
npx hardhat run scripts/health-check.ts --network hashkeyMainnet
cd ../..

# ═══════════════════════════════════════════════════════════════════════════════
# Done!
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            🎉 MAINNET DEPLOYMENT COMPLETE! 🎉              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Update README.md with mainnet addresses"
echo "  2. Deploy webapp: cd packages/webapp && vercel --prod"
echo "  3. Transfer ownership to multi-sig (recommended)"
echo "  4. Fund treasury with initial AGNT tokens"
echo "  5. Set up monitoring webhooks"
echo ""
echo "Deployment logs saved in: packages/contracts/deployments/"
echo ""
