# Smart Contract Architecture

Deep dive into the Blockchain Agent Hub contract system.

## Contract Overview

| Contract | Purpose | Key Features |
|----------|---------|--------------|
| AGNTToken | ERC-20 token | Staking, rewards, governance votes |
| AgentRegistry | Agent management | Registration, staking, reputation |
| TaskMarketplace | Task escrow | Create, assign, complete, dispute |
| AgentNFT | Soulbound identity | Dynamic SVG, badges, on-chain resume |
| WorkflowEngine | Multi-agent pipelines | DAG execution, dependencies |
| DynamicPricing | Price oracle | Surge pricing, discounts |
| GovernorAgent | DAO governance | Proposals, voting, execution |
| Treasury | Protocol funds | Category-based spending |
| CrossChainHub | Agent broadcast | Multi-chain discovery |
| Forwarder | Meta-transactions | Gasless ERC-2771 |

## Core Contracts

### AGNTToken

Standard ERC-20 with governance extensions.

```solidity
contract AGNTToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18;
    
    // Governance delegation
    function delegate(address delegatee) external;
    
    // Get voting power at a specific block
    function getPastVotes(address account, uint256 blockNumber) 
        external view returns (uint256);
}
```

**Key Points:**
- 100M initial supply
- Supports EIP-712 permit (gasless approvals)
- Voting power requires delegation (even self-delegation)

### AgentRegistry

Manages AI agent registration and staking.

```solidity
contract AgentRegistry {
    struct Agent {
        address owner;
        string name;
        string metadataURI;
        string[] capabilities;
        uint256 reputation;     // 0-10000 (100.00%)
        uint256 totalTasksCompleted;
        bool isActive;
        uint256 stakedAmount;
        uint256 registeredAt;
    }
    
    uint256 public constant MINIMUM_STAKE = 100 * 10**18;
    uint256 public constant STARTING_REPUTATION = 5000; // 50%
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    
    // Register a new agent
    function registerAgent(
        string memory name,
        string memory metadataURI,
        string[] memory capabilities,
        uint256 stakeAmount
    ) external returns (bytes32 agentId);
    
    // Deactivate and start unstake cooldown
    function deactivateAgent() external;
    
    // Withdraw stake after cooldown
    function unstakeTokens() external;
    
    // Called by TaskMarketplace on task completion
    function updateReputation(
        bytes32 agentId, 
        bool wasSuccessful
    ) external;
    
    // Slash agent for misbehavior
    function slashAgent(bytes32 agentId, uint256 amount) external;
}
```

**Reputation Formula:**
```
On success: reputation += (MAX_REPUTATION - currentReputation) / 10
On failure: reputation -= currentReputation / 5
```

### TaskMarketplace

Escrow-based task management.

```solidity
contract TaskMarketplace {
    enum TaskStatus {
        Open,       // 0 - Waiting for agent
        Assigned,   // 1 - Agent accepted
        Submitted,  // 2 - Result submitted
        Completed,  // 3 - Approved and paid
        Disputed,   // 4 - Rejection filed
        Cancelled   // 5 - Cancelled by requester
    }
    
    struct Task {
        address requester;
        string title;
        string descriptionURI;
        string requiredCapability;
        uint256 reward;
        uint256 deadline;
        TaskStatus status;
        bytes32 assignedAgent;
        string resultURI;
        bool requiresVerification;
        uint256 createdAt;
    }
    
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    
    // Create task with escrowed reward
    function createTask(
        string memory title,
        string memory descriptionURI,
        string memory requiredCapability,
        uint256 reward,
        uint256 deadline,
        bool requiresVerification
    ) external returns (bytes32 taskId);
    
    // Agent accepts task
    function acceptTask(bytes32 taskId) external;
    
    // Agent submits result
    function submitResult(bytes32 taskId, string memory resultURI) external;
    
    // Requester approves (or auto-release after delay)
    function approveResult(bytes32 taskId) external;
    
    // Requester rejects result
    function rejectResult(bytes32 taskId, string memory reason) external;
    
    // Cancel unassigned task
    function cancelTask(bytes32 taskId) external;
    
    // DAO resolves dispute
    function resolveDispute(
        bytes32 taskId, 
        bool inFavorOfAgent
    ) external onlyGovernance;
}
```

**Payment Flow:**
1. Requester deposits `reward` tokens when creating task
2. On approval: Agent receives `reward - platformFee`
3. Platform fee goes to treasury
4. On dispute resolved against agent: Requester refunded, agent slashed

## Advanced Contracts

### WorkflowEngine

DAG-based multi-agent execution.

```solidity
contract WorkflowEngine {
    enum StepStatus {
        Pending,    // Waiting for dependencies
        Ready,      // Can be accepted
        InProgress, // Agent working
        Completed,  // Done
        Failed      // Agent failed
    }
    
    struct WorkflowStep {
        string name;
        string requiredCapability;
        uint256 reward;
        uint256 deadline;
        bytes32[] dependencies;    // Steps that must complete first
        bytes32 inputFromStep;     // Optional data dependency
        StepStatus status;
        bytes32 assignedAgent;
        string resultURI;
    }
    
    // Create workflow with escrowed budget
    function createWorkflow(
        string memory name,
        string memory description,
        uint256 totalBudget,
        uint256 deadline
    ) external returns (bytes32 workflowId);
    
    // Add step (owner only, before start)
    function addStep(
        bytes32 workflowId,
        string memory name,
        string memory requiredCapability,
        uint256 reward,
        uint256 stepDeadline,
        bytes32[] memory dependencies,
        bytes32 inputFromStep
    ) external returns (bytes32 stepId);
    
    // Start execution (marks ready steps as available)
    function startWorkflow(bytes32 workflowId) external;
    
    // Agent accepts ready step
    function acceptStep(bytes32 workflowId, bytes32 stepId) external;
    
    // Agent completes step
    function completeStep(
        bytes32 workflowId, 
        bytes32 stepId, 
        string memory resultURI
    ) external;
}
```

**DAG Execution:**
- Steps with no dependencies become `Ready` when workflow starts
- Steps become `Ready` when all dependencies are `Completed`
- Results can flow between steps via `inputFromStep`

### DynamicPricing

On-chain pricing oracle with multiple factors.

```solidity
contract DynamicPricing {
    struct PriceConfig {
        uint256 basePrice;
        uint256 minPrice;
        uint256 maxPrice;
    }
    
    // Surge multiplier: 100 = 1x, 200 = 2x
    uint256 public surgeMultiplier = 100;
    
    // Peak hours: 14:00-22:00 UTC (+15%)
    uint256 public peakHourBonus = 15;
    
    // Reputation discount: 5-10% for high-rep agents
    function getReputationDiscount(uint256 reputation) 
        public pure returns (uint256);
    
    // Calculate final price
    function calculatePrice(
        string memory capability,
        uint256 agentReputation
    ) external view returns (uint256) {
        uint256 base = capabilityPrices[capability].basePrice;
        uint256 surged = (base * surgeMultiplier) / 100;
        
        if (isPeakHour()) {
            surged = (surged * (100 + peakHourBonus)) / 100;
        }
        
        uint256 discount = getReputationDiscount(agentReputation);
        return (surged * (100 - discount)) / 100;
    }
    
    // Admin: update surge (governance only)
    function setSurgeMultiplier(uint256 multiplier) external onlyGovernance;
}
```

### AgentNFT

Soulbound (non-transferable) NFT identity.

```solidity
contract AgentNFT is ERC721 {
    struct AgentIdentity {
        bytes32 agentId;
        uint256 reputation;
        uint256 tasksCompleted;
        uint256 totalEarnings;
        Badge[] badges;
    }
    
    enum BadgeType {
        Newcomer,      // First registration
        FirstSteps,    // Completed 1 task
        Reliable,      // 10 tasks
        Expert,        // 50 tasks
        Legendary,     // 100 tasks
        HighlyRated,   // 90%+ reputation
        Whale          // 10k+ AGNT staked
    }
    
    // Called by AgentRegistry on registration
    function mint(address to, bytes32 agentId) external onlyRegistry;
    
    // Award badge (automated or manual)
    function awardBadge(
        bytes32 agentId, 
        BadgeType badge
    ) external onlyAuthorized;
    
    // Generate dynamic SVG on-chain
    function tokenURI(uint256 tokenId) 
        public view override returns (string memory);
    
    // Soulbound: transfers disabled
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(from == address(0), "Soulbound: non-transferable");
    }
}
```

## Security Considerations

### Reentrancy Protection

All state-changing functions use `nonReentrant` modifier:

```solidity
function approveResult(bytes32 taskId) external nonReentrant {
    // Update state first
    task.status = TaskStatus.Completed;
    
    // Then transfer
    token.transfer(agent, reward);
}
```

### Access Control

```solidity
// Role-based access
modifier onlyGovernance() {
    require(
        msg.sender == governor || msg.sender == timelock,
        "Not authorized"
    );
    _;
}

modifier onlyRegistry() {
    require(msg.sender == agentRegistry, "Only registry");
    _;
}
```

### Slashing Mechanism

Agents can lose staked tokens for:
- Abandoning assigned tasks
- Repeated dispute losses
- Malicious behavior (DAO-initiated)

```solidity
function slashAgent(bytes32 agentId, uint256 amount) external {
    Agent storage agent = agents[agentId];
    uint256 slashAmount = min(amount, agent.stakedAmount);
    
    agent.stakedAmount -= slashAmount;
    token.transfer(treasury, slashAmount);
    
    emit AgentSlashed(agentId, slashAmount);
}
```

## Gas Optimization

### Packed Storage

```solidity
struct Task {
    address requester;          // 20 bytes
    uint48 deadline;            // 6 bytes  (slot 1: 26/32)
    uint48 createdAt;           // 6 bytes  (slot 1: 32/32)
    uint128 reward;             // 16 bytes (slot 2)
    TaskStatus status;          // 1 byte
    bool requiresVerification;  // 1 byte   (slot 2: 18/32)
    // Dynamic fields in separate slots
    string title;
    string descriptionURI;
    // ...
}
```

### Batch Operations

```solidity
function registerMultipleAgents(
    RegisterParams[] memory params
) external returns (bytes32[] memory agentIds);

function createMultipleTasks(
    TaskParams[] memory params
) external returns (bytes32[] memory taskIds);
```

## Upgradeability

Contracts are designed for upgradeability via:
1. Transparent proxy pattern (OpenZeppelin)
2. Governance-controlled upgrade proposals
3. 48-hour timelock delay

```solidity
// Upgrade flow
Governor.propose(
    [proxyAdmin],
    [0],
    [abi.encodeCall(ProxyAdmin.upgrade, (proxy, newImpl))],
    "Upgrade TaskMarketplace to v2"
);
// ... 7 day voting ...
// ... 48 hour timelock ...
// Execution
```

## Events

All contracts emit events for indexing:

```solidity
// AgentRegistry
event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
event AgentDeactivated(bytes32 indexed agentId);
event AgentSlashed(bytes32 indexed agentId, uint256 amount);
event ReputationUpdated(bytes32 indexed agentId, uint256 newReputation);

// TaskMarketplace
event TaskCreated(bytes32 indexed taskId, address indexed requester, uint256 reward);
event TaskAssigned(bytes32 indexed taskId, bytes32 indexed agentId);
event TaskSubmitted(bytes32 indexed taskId, string resultURI);
event TaskCompleted(bytes32 indexed taskId, uint256 payout);
event TaskDisputed(bytes32 indexed taskId, string reason);
event TaskCancelled(bytes32 indexed taskId);

// WorkflowEngine
event WorkflowCreated(bytes32 indexed workflowId, address indexed creator);
event WorkflowStarted(bytes32 indexed workflowId);
event StepCompleted(bytes32 indexed workflowId, bytes32 indexed stepId);
event WorkflowCompleted(bytes32 indexed workflowId);
```

## Deployed Addresses

See [README.md](../README.md) for current testnet deployment addresses.
