#!/bin/bash
# Project Status Summary
# Run this to get a quick overview of the project state

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        BLOCKCHAIN AGENT HUB - PROJECT STATUS               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd "$(dirname "$0")/.."

echo "📁 Project Root: $(pwd)"
echo ""

# Git status
echo "═══ Git Status ═══"
BRANCH=$(git branch --show-current)
COMMIT=$(git rev-parse --short HEAD)
echo "   Branch: $BRANCH"
echo "   Commit: $COMMIT"
echo "   Status: $(git status --porcelain | wc -l) uncommitted changes"
echo ""

# Contract tests
echo "═══ Contract Tests ═══"
cd packages/contracts
TEST_OUTPUT=$(npx hardhat test 2>&1 | tail -5)
PASSING=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passing)' | head -1)
if [ -n "$PASSING" ]; then
    echo -e "   ${GREEN}✓ $PASSING tests passing${NC}"
else
    echo -e "   ${RED}✗ Tests failed${NC}"
fi
cd ../..
echo ""

# SDK tests
echo "═══ SDK Tests ═══"
cd packages/sdk
TEST_OUTPUT=$(npm run test 2>&1 | tail -10)
PASSING=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1)
if [ -n "$PASSING" ]; then
    echo -e "   ${GREEN}✓ $PASSING unit tests passing${NC}"
else
    echo -e "   ${YELLOW}⚠ Could not determine test status${NC}"
fi
cd ../..
echo ""

# CLI tests
echo "═══ CLI Tests ═══"
cd packages/cli
TEST_OUTPUT=$(npm run test 2>&1 | tail -5)
PASSING=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1)
if [ -n "$PASSING" ]; then
    echo -e "   ${GREEN}✓ $PASSING tests passing${NC}"
else
    echo -e "   ${YELLOW}⚠ Could not determine test status${NC}"
fi
cd ../..
echo ""

# Deployed contracts
echo "═══ Deployed Contracts (HashKey Testnet) ═══"
echo "   AGNT Token:       0x7379C9d687F8c22d41be43fE510F8225afF253f6"
echo "   Agent Registry:   0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49"
echo "   Task Marketplace: 0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061"
echo "   Agent NFT:        0x4476e726B4030923bD29C98F8881Da2727B6a0B6"
echo "   Workflow Engine:  0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd"
echo "   Dynamic Pricing:  0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3"
echo "   Cross-Chain Hub:  0x6349F97FEeb19D9646a34f81904b50bB704FAD08"
echo "   Batch Operations: 0x17a6c455AF4b8f79c26aBAF4b7F3F5a39ab0B1B5"
echo ""

# Webapp
echo "═══ Webapp ═══"
echo "   Live URL: https://webapp-nine-flax.vercel.app"
echo ""

# Summary
echo "═══ Roadmap Progress ═══"
echo "   V1: ✅ Complete"
echo "   V2: ✅ Complete"
echo "   V3: 🔄 In Progress (mainnet deployment pending)"
echo ""

echo "═══ Next Steps ═══"
echo "   1. Run pre-deploy check:   cd packages/contracts && npx hardhat run scripts/pre-deploy-check.ts --network hashkey-mainnet"
echo "   2. Fund deployment wallet with HSK"
echo "   3. Deploy to mainnet:      npx hardhat run scripts/deploy-all.ts --network hashkey-mainnet"
echo "   4. Update SDK addresses and publish"
echo "   5. Update webapp and redeploy"
echo ""
