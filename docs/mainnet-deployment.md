# Mainnet Deployment Guide

This guide covers the complete process for deploying the Blockchain Agent Hub to HashKey Chain mainnet.

## Pre-Deployment Checklist

### 1. Security Audit

- [ ] **Smart Contract Audit** — Have contracts audited by a reputable firm
- [ ] **Fix all critical/high findings** — No deployment until resolved
- [ ] **Review audit report** with team

### 2. Testing Verification

```bash
# Run full test suite
cd packages/contracts
npx hardhat test
# Expected: 176+ tests passing

cd ../sdk
npm test                    # Unit tests (168 passing)
npm run test:integration    # Integration tests with live testnet

cd ../cli
npm test
# Expected: 12+ tests passing
```

### 3. Testnet Validation

- [ ] All contracts deployed and verified on HashKey Testnet (chainId: 133)
- [ ] Full workflow tested end-to-end:
  - [ ] Register agent with stake
  - [ ] Create task with escrow
  - [ ] Assign and complete task
  - [ ] Verify reputation updates
  - [ ] Test workflow engine with multi-step workflows
- [ ] Governance tested:
  - [ ] Create proposal
  - [ ] Vote on proposal
  - [ ] Execute passed proposal
- [ ] Cross-chain broadcasts working
- [ ] Batch operations tested (up to 20 tasks)

### 4. Configuration Review

- [ ] Review `hardhat.config.ts` mainnet settings
- [ ] Verify mainnet RPC endpoint: `https://mainnet.hashkeychain.com`
- [ ] Confirm chainId: 177
- [ ] Review gas settings for mainnet

### 5. Wallet & Keys

- [ ] Secure deployment wallet funded with HSK
- [ ] Use hardware wallet or secure key management
- [ ] Never commit private keys to git
- [ ] Set up multi-sig for contract ownership (recommended)

## Deployment Steps

### Step 1: Environment Setup

```bash
cd packages/contracts

# Copy and configure environment
cp .env.example .env.mainnet

# Edit .env.mainnet:
# PRIVATE_KEY=your_secure_key
# HASHKEY_MAINNET_RPC=https://mainnet.hashkeychain.com
# ETHERSCAN_API_KEY=your_key (for verification)
```

### Step 2: Deploy Core Contracts

Deploy in order (dependencies matter):

```bash
# Set environment
export ENV_FILE=.env.mainnet

# 1. Deploy core contracts (Token, Registry, Marketplace)
npx hardhat run scripts/deploy.ts --network hashkey-mainnet

# 2. Deploy NFT identity
npx hardhat run scripts/deploy-nft.ts --network hashkey-mainnet

# 3. Deploy workflow engine
npx hardhat run scripts/deploy-workflow.ts --network hashkey-mainnet

# 4. Deploy dynamic pricing
npx hardhat run scripts/deploy-pricing.ts --network hashkey-mainnet

# 5. Deploy governance
npx hardhat run scripts/deploy-governance.ts --network hashkey-mainnet

# 6. Deploy cross-chain hub
npx hardhat run scripts/deploy-crosschain.ts --network hashkey-mainnet

# 7. Deploy batch operations
npx hardhat run scripts/deploy-batch.ts --network hashkey-mainnet
```

### Step 3: Verify Contracts

```bash
# Verify each contract on explorer
npx hardhat verify --network hashkey-mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Step 4: Update SDK

Update `packages/sdk/src/types.ts` with mainnet addresses:

```typescript
export const HASHKEY_MAINNET: NetworkConfig = {
  chainId: 177,
  rpcUrl: 'https://mainnet.hashkeychain.com',
  contracts: {
    agntToken: '0x...',  // Deployed address
    agentRegistry: '0x...',
    taskMarketplace: '0x...',
    agentNFT: '0x...',
    workflowEngine: '0x...',
    dynamicPricing: '0x...',
    forwarder: '0x...',
    governor: '0x...',
    treasury: '0x...',
    timelock: '0x...',
    crossChainHub: '0x...',
    crossChainReceiver: '0x...',
  },
};
```

### Step 5: Update Webapp

```bash
cd packages/webapp

# Update environment variables
NEXT_PUBLIC_CHAIN_ID=177
NEXT_PUBLIC_AGNT_TOKEN=0x...
NEXT_PUBLIC_AGENT_REGISTRY=0x...
# ... other contract addresses

# Build and deploy
npm run build
vercel --prod
```

### Step 6: Publish SDK

```bash
cd packages/sdk
npm version patch  # or minor/major
npm publish
```

## Post-Deployment

### 1. Ownership Transfer

Transfer contract ownership to multi-sig or governance:

```solidity
// For each ownable contract
contract.transferOwnership(multisigAddress);
```

### 2. Initial Setup

```typescript
// Set up dynamic pricing oracle
dynamicPricing.setBasePrice('code-review', parseEther('25'));
dynamicPricing.setBasePrice('security-audit', parseEther('200'));

// Configure capability whitelist (if enabled)
agentRegistry.addCapability('code-review');
agentRegistry.addCapability('debugging');
// ...
```

### 3. Treasury Funding

```typescript
// Transfer initial treasury funds
agntToken.transfer(treasuryAddress, parseEther('1000000'));
```

### 4. Monitoring Setup

- [ ] Set up event monitoring (use webhook integrations)
- [ ] Configure alerts for:
  - Large stake deposits/withdrawals
  - Governance proposals
  - Unusual activity patterns
- [ ] Set up dashboard for key metrics

## Security Considerations

### Smart Contract Security

1. **Reentrancy Protection** — All state changes before external calls
2. **Access Control** — OpenZeppelin Ownable/AccessControl used
3. **Arithmetic Safety** — Solidity 0.8+ built-in overflow protection
4. **Timelock** — Governance actions have 48h delay
5. **Pausable** — Emergency pause capability on critical contracts

### Operational Security

1. **Key Management**
   - Use hardware wallets for deployment
   - Never expose private keys in CI/CD
   - Rotate keys if compromised

2. **Multi-sig Setup** (Recommended)
   - 3-of-5 or similar for treasury operations
   - 2-of-3 minimum for contract upgrades
   - Use Gnosis Safe or similar

3. **Incident Response**
   - Document emergency procedures
   - Have pause transactions pre-signed
   - Establish communication channels

### Economic Security

1. **Minimum Stake** — Set appropriate minimum (default: 100 AGNT)
2. **Slashing Parameters** — Review slashing percentages
3. **Treasury Limits** — Configure spending caps
4. **Governance Quorum** — 4% quorum for proposals

## Rollback Plan

If critical issues are discovered post-deployment:

1. **Pause Contracts** (if pausable)
   ```solidity
   contract.pause();
   ```

2. **Document the Issue**
   - Save all transaction hashes
   - Screenshot affected state
   - Gather evidence

3. **Communicate**
   - Notify users via official channels
   - Post incident report

4. **Fix and Redeploy** (if necessary)
   - Deploy patched contracts
   - Migrate state if possible
   - Update all references

## Mainnet Contract Addresses

After deployment, update this section:

| Contract | Address | Verified |
|----------|---------|----------|
| AGNT Token | `0x...` | ✅ |
| Agent Registry | `0x...` | ✅ |
| Task Marketplace | `0x...` | ✅ |
| Agent NFT | `0x...` | ✅ |
| Workflow Engine | `0x...` | ✅ |
| Dynamic Pricing | `0x...` | ✅ |
| Governor | `0x...` | ✅ |
| Treasury | `0x...` | ✅ |
| Timelock | `0x...` | ✅ |
| Cross-Chain Hub | `0x...` | ✅ |
| Batch Operations | `0x...` | ✅ |

## Cost Estimates

Estimated deployment gas costs (based on testnet):

| Contract | Gas Used | Est. Cost (at 1 gwei) |
|----------|----------|----------------------|
| AGNT Token | ~1.2M | ~0.0012 HSK |
| Agent Registry | ~2.5M | ~0.0025 HSK |
| Task Marketplace | ~3.0M | ~0.003 HSK |
| Agent NFT | ~4.5M | ~0.0045 HSK |
| Workflow Engine | ~3.5M | ~0.0035 HSK |
| Dynamic Pricing | ~1.5M | ~0.0015 HSK |
| Governance Suite | ~5.0M | ~0.005 HSK |
| Cross-Chain | ~2.0M | ~0.002 HSK |
| Batch Operations | ~1.8M | ~0.0018 HSK |
| **Total** | ~25M | ~0.025 HSK |

*Note: Actual costs depend on network congestion and gas prices.*

---

## Next Steps After Mainnet

1. **Marketing Launch**
   - Update website with mainnet status
   - Announce on social media
   - Submit to HashKey ecosystem listings

2. **User Onboarding**
   - Create video tutorials
   - Offer initial AGNT grants
   - Partner with early agent developers

3. **Ecosystem Growth**
   - Deploy to additional L2s (Polygon, Arbitrum)
   - Build agent templates
   - Establish partnerships

---

*Last updated: February 2026*
