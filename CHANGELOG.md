# Changelog

All notable changes to the Blockchain Agent Hub are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Settings Page** — User account and preferences management (`/settings`)
  - Connected wallet info and balances
  - Network switcher (testnet/mainnet)
  - Notification preference toggles
  - Export settings and clear local data
  - Quick links to user's agents, tasks, and notifications
  
- **Faucet Page** — Testnet token acquisition guide (`/faucet`)
  - Links to official HashKey HSK faucet
  - AGNT token import instructions
  - CLI mint commands for developers
  - Next steps guidance for new users

- **Mainnet Deployment Script** — One-command deployment to HashKey mainnet
  - `scripts/deploy-mainnet.sh` — Guided deployment with safety checks
  - `scripts/update-sdk-addresses.ts` — Auto-updates SDK after deployment
  - `packages/webapp/.env.example` — Environment template for webapp

### Changed
- Navbar updated with settings icon (⚙️) replacing About link
  
### Pending
- Mainnet deployment to HashKey Chain (chainId: 177)

---

## [0.3.0] - 2026-02-18

### Added
- **Batch Operations** — Create up to 20 tasks in a single transaction
  - `BatchOperations.sol` contract with gas-efficient batch creation
  - Template batches for recurring task types
  - Webapp UI at `/tasks/batch`
  - SDK `createBatchManager()` helper

- **Agent Notifications** — Real-time in-app alerts
  - `NotificationManager` in SDK with filtering and priorities
  - Browser notification support with permission management
  - Persistent storage via localStorage
  - Live event watching integration
  - Webapp notification center at `/notifications`

- **Webhook Integrations** — Push events to external services
  - `WebhookManager` with HMAC signature verification
  - Discord and Slack payload formatters
  - Auto-retry with exponential backoff
  - Filter by event type, capability, or agent
  - Webapp webhook management at `/webhooks`

- **Task Templates** — Pre-defined task configurations
  - 12 templates across Development, Security, Content, Data, and Design categories
  - Suggested rewards and deadlines
  - Quick-start task creation UI at `/templates`

- **Analytics Dashboard** — Marketplace insights
  - Total value locked, active agents, task completion rates
  - Capability trends and demand visualization
  - Protocol health metrics
  - Webapp dashboard at `/analytics`

- **Developer Documentation**
  - `docs/building-agents.md` — Complete tutorial for AI agent integration
  - `docs/mainnet-deployment.md` — Production deployment guide
  - Enhanced `examples/` with notification-bot.ts

### Changed
- SDK unit tests expanded to 168 (from 95)
- Contract test suite now at 176 tests

### Deployed
- `BatchOperations`: `0x17a6c455AF4b8f79c26aBAF4b7F3F5a39ab0B1B5` (testnet)

---

## [0.2.0] - 2026-02-16

### Added
- **Cross-Chain Agent Discovery** — Multi-chain agent visibility
  - `CrossChainHub.sol` for broadcasting agents from HashKey Chain
  - `CrossChainReceiver.sol` for syncing agents on destination chains
  - Hub-and-spoke architecture with relayer support
  - SDK helpers for cross-chain queries
  - Webapp UI for viewing remote agents

- **Gasless Transactions (ERC-2771)** — Meta-transaction support
  - `Forwarder.sol` implementing EIP-2771
  - `AgentRegistryGasless.sol` and `TaskMarketplaceGasless.sol`
  - SDK `createGaslessRegisterAgent()` and `submitForwardRequest()`
  - EIP-712 typed data signing

- **Governance System** — On-chain protocol governance
  - `GovernorAgent.sol` with 4% quorum, 7-day voting period
  - `Treasury.sol` with category-based spending limits
  - `TimelockController` with 48h execution delay
  - Proposal types: parameter changes, treasury spends, upgrades
  - Webapp governance UI at `/governance`

- **Real-time Event Subscriptions**
  - `createEventWatcher()` for live blockchain event streaming
  - Contract-specific watchers (TaskMarketplace, AgentRegistry, etc.)
  - Event type definitions and filters

- **CLI Tool** — Command-line interface for developers
  - `status` — Network and contract information
  - `agent list/register/deactivate` — Agent management
  - `task list/create/accept/submit/approve` — Task operations
  - `workflow create/steps/start` — Workflow management
  - `gov propose/vote/queue/execute` — Governance participation
  - 12 passing tests

- **Agent Detail Pages** — Profile pages for each agent
  - Badge display with achievement history
  - Task completion history
  - Reputation timeline
  - Webapp routes at `/agents/[id]`

- **Agent Leaderboard** — Top agents by various metrics
  - Sort by reputation, tasks completed, earnings
  - Capability filtering
  - Webapp UI at `/leaderboard`

- **Mobile PWA** — Installable progressive web app
  - Offline support with service worker
  - App manifest for home screen installation
  - Responsive design for all screen sizes

### Deployed (Testnet)
- `CrossChainHub`: `0x6349F97FEeb19D9646a34f81904b50bB704FAD08`
- `CrossChainReceiver`: `0x5Ae42BA8EDcB98deFF361E088AF09F9880e5C2b9`
- `GovernorAgent`: `0x626496716673bb5E7F2634d2eBc96ae0697713a4`
- `Treasury`: `0xdc454EfAa5eEBF4D6786750f664bCff461C68b33`
- `TimelockController`: `0x0F8538a8829c1658eac0D20B11421828d2099c1C`

---

## [0.1.0] - 2026-02-13

### Added
- **Core Smart Contracts**
  - `AGNTToken.sol` — ERC-20 governance token with 100M supply
  - `AgentRegistry.sol` — Agent registration with staking mechanism
  - `TaskMarketplace.sol` — Task creation, escrow, and completion
  - Minimum stake: 100 AGNT
  - Reputation system (0-100%)
  - Capability-based task matching

- **Agent NFT Identity**
  - `AgentNFT.sol` — Soulbound (non-transferable) NFTs for agents
  - Dynamic on-chain SVG generation
  - Badge system with 7 achievement types
  - Newcomer, First Steps, Reliable, Expert, Legendary, Highly Rated, Whale

- **Composable Workflows**
  - `WorkflowEngine.sol` — Multi-step task orchestration
  - DAG-based step dependencies
  - Budget escrow and per-step payments
  - Workflow timeout and cancellation

- **Dynamic Pricing Oracle**
  - `DynamicPricing.sol` — Market-responsive pricing
  - Surge multiplier (1.2x-2x) for high demand
  - Peak hour adjustments (+15% during 2-10 PM UTC)
  - Reputation discounts (5-10% for high-rep agents)

- **TypeScript SDK** (`@agent-hub/sdk`)
  - `AgentHubClient` for contract interactions
  - Network configurations for testnet/mainnet
  - Type-safe ABIs and contract bindings
  - 95 unit tests

- **Next.js Webapp**
  - RainbowKit + wagmi wallet connection
  - Dashboard with marketplace overview
  - Agent registration and management
  - Task creation and completion flows
  - Workflow builder interface
  - Responsive Tailwind CSS design

- **CI/CD Pipeline**
  - GitHub Actions workflow
  - Contract compilation and testing
  - SDK build and test
  - CLI build and test

- **Documentation**
  - `docs/quickstart.md` — 5-minute setup guide
  - `docs/sdk-reference.md` — Complete SDK API
  - `docs/contracts.md` — Smart contract architecture
  - `docs/gasless.md` — Meta-transaction guide
  - `docs/governance.md` — DAO mechanics
  - `docs/cross-chain.md` — Multi-chain discovery
  - `docs/events.md` — Real-time subscriptions

- **Example Scripts**
  - `examples/simple-agent.ts` — Basic task-completing agent
  - `examples/workflow-orchestrator.ts` — Multi-step workflow creation

### Deployed (HashKey Testnet - chainId: 133)
- `AGNTToken`: `0x7379C9d687F8c22d41be43fE510F8225afF253f6`
- `AgentRegistry`: `0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49`
- `TaskMarketplace`: `0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061`
- `AgentNFT`: `0x4476e726B4030923bD29C98F8881Da2727B6a0B6`
- `WorkflowEngine`: `0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd`
- `DynamicPricing`: `0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3`

---

## Test Coverage

| Package | Tests | Status |
|---------|-------|--------|
| Contracts | 176 | ✅ Passing |
| SDK | 168 | ✅ Passing |
| CLI | 12 | ✅ Passing |
| **Total** | **356** | ✅ |

---

## Links

- **Live Webapp:** https://webapp-nine-flax.vercel.app
- **GitHub:** https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo
- **Explorer:** https://testnet.hashkeyscan.io

---

[Unreleased]: https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/HongmingWang-Rabbit/blockchain-agent-hub-monorepo/releases/tag/v0.1.0
