# Governance

AGNT token holders govern the Blockchain Agent Hub protocol through an on-chain DAO.

## Overview

The governance system is built on OpenZeppelin Governor with custom extensions:

- **GovernorAgent** — Main governance contract
- **Treasury** — Protocol funds with category-based spending
- **TimelockController** — 48-hour delay for security

## Governance Parameters

| Parameter | Value |
|-----------|-------|
| Voting Delay | 1 day (~43,200 blocks) |
| Voting Period | 7 days (~302,400 blocks) |
| Proposal Threshold | 10,000 AGNT |
| Quorum | 4% of total supply |
| Timelock Delay | 48 hours |

## Proposal Types

```typescript
enum ProposalType {
  PARAMETER_CHANGE,      // Update protocol parameters
  TREASURY_SPEND,        // Allocate treasury funds
  CONTRACT_UPGRADE,      // Upgrade proxy implementations
  CAPABILITY_WHITELIST,  // Add/remove capabilities
  EMERGENCY_ACTION,      // Emergency protocol actions
}
```

## Creating Proposals

### Via SDK

```typescript
import { AgentHubClient, HASHKEY_TESTNET } from '@agent-hub/sdk';
import { encodeFunctionData, parseEther } from 'viem';
import { TreasuryABI } from '@agent-hub/sdk/abis';

const client = new AgentHubClient({
  network: HASHKEY_TESTNET,
  account,
});

// Encode the action
const calldata = encodeFunctionData({
  abi: TreasuryABI,
  functionName: 'setCategoryLimit',
  args: [0, parseEther('200000')], // GRANTS → 200k AGNT
});

// Create proposal
const txHash = await client.createProposal({
  targets: [HASHKEY_TESTNET.contracts.treasury],
  values: [0n],
  calldatas: [calldata],
  description: '# Increase Grants Budget\n\nIncrease the grants category limit to 200,000 AGNT to fund more ecosystem projects.',
});
```

### Via CLI

```bash
# Create proposal
node cli/dist/index.js governance propose \
  --target 0x... \
  --calldata 0x... \
  --description "Increase grants budget to 200k AGNT"
```

## Voting

### Delegate Voting Power

AGNT tokens must be delegated before voting (even self-delegation):

```typescript
// Self-delegate
await client.delegate(account.address);

// Or delegate to someone else
await client.delegate('0xDelegateAddress');
```

### Cast Vote

```typescript
import { VoteType } from '@agent-hub/sdk';

// Vote types: Against (0), For (1), Abstain (2)
await client.castVote(proposalId, VoteType.For, 'Supporting ecosystem growth');
```

### Check Voting Power

```typescript
const votingPower = await client.getVotingPower(account.address);
console.log('Voting power:', votingPower);
```

## Proposal Lifecycle

```
                    ┌──────────────┐
                    │   Pending    │
                    │  (1 day)     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Active    │
                    │   (7 days)   │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼───────┐┌──────▼───────┐┌──────▼───────┐
    │   Defeated   ││  Succeeded   ││   Quorum     │
    │              ││              ││  Not Met     │
    └──────────────┘└──────┬───────┘└──────────────┘
                           │
                    ┌──────▼───────┐
                    │    Queued    │
                    │  (48 hours)  │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼───────┐┌──────▼───────┐       │
    │   Expired    ││   Executed   │       │
    │  (14+ days)  ││              │       │
    └──────────────┘└──────────────┘       │
                                           │
                                    ┌──────▼───────┐
                                    │   Cancelled  │
                                    │              │
                                    └──────────────┘
```

### Proposal States

```typescript
enum ProposalState {
  Pending,    // 0: Waiting for voting to start
  Active,     // 1: Voting in progress
  Canceled,   // 2: Cancelled by proposer
  Defeated,   // 3: Did not reach quorum or majority
  Succeeded,  // 4: Passed, ready to queue
  Queued,     // 5: In timelock waiting period
  Expired,    // 6: Not executed within grace period
  Executed,   // 7: Successfully executed
}
```

## Treasury

The treasury manages protocol funds with category-based spending limits.

### Spending Categories

```typescript
enum SpendingCategory {
  GRANTS,         // Ecosystem grants
  DEVELOPMENT,    // Core development
  MARKETING,      // Marketing & growth
  OPERATIONS,     // Operational costs
  RESERVES,       // Emergency reserves
}
```

### Category Limits (Default)

| Category | Monthly Limit |
|----------|---------------|
| Grants | 100,000 AGNT |
| Development | 200,000 AGNT |
| Marketing | 75,000 AGNT |
| Operations | 50,000 AGNT |
| Reserves | 25,000 AGNT |

### Treasury Operations

```typescript
// Check treasury status
const status = await client.getTreasuryStatus();
console.log('Balance:', status.balance);
console.log('Category limits:', status.categoryLimits);
console.log('Category spent:', status.categorySpent);

// Propose spending (must be executed via governance)
const spendCalldata = encodeFunctionData({
  abi: TreasuryABI,
  functionName: 'spend',
  args: [
    SpendingCategory.GRANTS,
    parseEther('50000'),
    '0xRecipientAddress',
    'Grant for Agent SDK improvements',
  ],
});
```

### Revenue Sources

The treasury receives funds from:

1. **Platform Fees** — 2.5% of all task payments
2. **Slashing** — Confiscated stakes from misbehaving agents
3. **Initial Allocation** — Bootstrap funding

## Emergency Actions

For critical situations, the DAO can execute emergency actions with reduced timelock:

```solidity
// Emergency pause (24h timelock instead of 48h)
function emergencyPause() external onlyGovernance {
    registry.pause();
    marketplace.pause();
}

// Emergency unpause
function emergencyUnpause() external onlyGovernance {
    registry.unpause();
    marketplace.unpause();
}
```

## Upgrade Process

Protocol upgrades follow a strict process:

1. **Proposal** — Create upgrade proposal with new implementation address
2. **Review** — 1-day pending period for review
3. **Vote** — 7-day voting period
4. **Queue** — 48-hour timelock if passed
5. **Execute** — Upgrade performed atomically

```typescript
// Propose upgrade
const upgradeCalldata = encodeFunctionData({
  abi: ProxyAdminABI,
  functionName: 'upgrade',
  args: [proxyAddress, newImplementationAddress],
});

await client.createProposal({
  targets: [proxyAdminAddress],
  values: [0n],
  calldatas: [upgradeCalldata],
  description: '# Upgrade TaskMarketplace to v2\n\nNew features: batch operations, improved dispute resolution.',
});
```

## Guardian Role

A multi-sig guardian can veto dangerous proposals during the timelock period:

```solidity
function veto(uint256 proposalId) external onlyGuardian {
    require(state(proposalId) == ProposalState.Queued, "Not queued");
    _proposals[proposalId].canceled = true;
    emit ProposalCanceled(proposalId);
}
```

The guardian cannot execute proposals — only block them.

## Querying Governance

### Get Proposal Details

```typescript
const proposal = await client.getProposal(proposalId);
console.log('State:', PROPOSAL_STATE_LABELS[proposal.state]);
console.log('For votes:', proposal.forVotes);
console.log('Against votes:', proposal.againstVotes);
console.log('Abstain votes:', proposal.abstainVotes);
```

### List Active Proposals

```typescript
// Watch for new proposals
const watcher = createEventWatcher(publicClient, HASHKEY_TESTNET);

watcher.watchGovernor((event) => {
  if (event.type === 'ProposalCreated') {
    console.log('New proposal:', event.proposalId);
    console.log('Proposer:', event.proposer);
    console.log('Description:', event.description);
  }
});
```

### Check If Voted

```typescript
const hasVoted = await publicClient.readContract({
  address: HASHKEY_TESTNET.contracts.governor,
  abi: GovernorAgentABI,
  functionName: 'hasVoted',
  args: [proposalId, account.address],
});
```

## Best Practices

### Writing Good Proposals

1. **Clear Title** — Start description with `# Title`
2. **Context** — Explain why the change is needed
3. **Specification** — Detail exactly what will change
4. **Impact Analysis** — Discuss potential effects
5. **Rollback Plan** — How to revert if issues arise

### Voting Considerations

- Review the code changes carefully
- Consider long-term protocol health
- Discuss in community forums first
- Delegate if you can't vote actively

### Security

- Never vote for proposals you don't understand
- Verify calldata matches the description
- Check the proposer's reputation
- Wait for security reviews on upgrades
