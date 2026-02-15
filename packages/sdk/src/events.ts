import type { Address, Hex, PublicClient, WatchContractEventReturnType, Log } from 'viem';
import { 
  AGNTTokenABI, 
  AgentRegistryABI, 
  TaskMarketplaceABI, 
  AgentNFTABI,
  WorkflowEngineABI,
  GovernorAgentABI,
  CrossChainHubABI,
} from './abis';
import type { NetworkConfig } from './types';

// ========== Event Types ==========

export interface AgentRegisteredEvent {
  type: 'AgentRegistered';
  agentId: Hex;
  owner: Address;
  name: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface AgentDeactivatedEvent {
  type: 'AgentDeactivated';
  agentId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface AgentSlashedEvent {
  type: 'AgentSlashed';
  agentId: Hex;
  amount: bigint;
  reason: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface TaskCreatedEvent {
  type: 'TaskCreated';
  taskId: Hex;
  requester: Address;
  reward: bigint;
  requiredCapability: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface TaskAssignedEvent {
  type: 'TaskAssigned';
  taskId: Hex;
  agentId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface TaskCompletedEvent {
  type: 'TaskCompleted';
  taskId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface TaskSubmittedEvent {
  type: 'TaskSubmitted';
  taskId: Hex;
  resultURI: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface TaskCancelledEvent {
  type: 'TaskCancelled';
  taskId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface WorkflowCreatedEvent {
  type: 'WorkflowCreated';
  workflowId: Hex;
  creator: Address;
  name: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface WorkflowStartedEvent {
  type: 'WorkflowStarted';
  workflowId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface WorkflowCompletedEvent {
  type: 'WorkflowCompleted';
  workflowId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface StepCompletedEvent {
  type: 'StepCompleted';
  workflowId: Hex;
  stepId: Hex;
  agentId: Hex;
  outputURI: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface BadgeAwardedEvent {
  type: 'BadgeAwarded';
  tokenId: bigint;
  badgeType: number;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface ProposalCreatedEvent {
  type: 'ProposalCreated';
  proposalId: bigint;
  proposer: Address;
  description: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface VoteCastEvent {
  type: 'VoteCast';
  proposalId: bigint;
  voter: Address;
  support: number;
  weight: bigint;
  reason: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface AgentBroadcastEvent {
  type: 'AgentBroadcast';
  owner: Address;
  name: string;
  capabilities: string[];
  reputationScore: bigint;
  blockNumber: bigint;
  transactionHash: Hex;
}

export type AgentHubEvent =
  | AgentRegisteredEvent
  | AgentDeactivatedEvent
  | AgentSlashedEvent
  | TaskCreatedEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | TaskSubmittedEvent
  | TaskCancelledEvent
  | WorkflowCreatedEvent
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | StepCompletedEvent
  | BadgeAwardedEvent
  | ProposalCreatedEvent
  | VoteCastEvent
  | AgentBroadcastEvent;

// ========== Event Watcher Options ==========

export interface WatchEventOptions {
  /**
   * Only watch events from a specific address (e.g., specific agent owner)
   */
  fromAddress?: Address;
  /**
   * Poll interval in ms (default: 4000)
   */
  pollingInterval?: number;
}

// ========== Event Subscription Manager ==========

export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Event watcher for Agent Hub contracts
 * Provides real-time event streaming from on-chain activity
 */
export class AgentHubEventWatcher {
  private readonly publicClient: PublicClient;
  private readonly network: NetworkConfig;
  private activeWatchers: WatchContractEventReturnType[] = [];

  constructor(publicClient: PublicClient, network: NetworkConfig) {
    this.publicClient = publicClient;
    this.network = network;
  }

  /**
   * Watch all Agent Registry events
   */
  watchAgentRegistry(
    callback: (event: AgentRegisteredEvent | AgentDeactivatedEvent | AgentSlashedEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    const watchers: WatchContractEventReturnType[] = [];

    // Watch AgentRegistered
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.agentRegistry,
        abi: AgentRegistryABI,
        eventName: 'AgentRegistered',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { agentId: Hex; owner: Address; name: string };
            callback({
              type: 'AgentRegistered',
              agentId: args.agentId,
              owner: args.owner,
              name: args.name,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch AgentDeactivated
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.agentRegistry,
        abi: AgentRegistryABI,
        eventName: 'AgentDeactivated',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { agentId: Hex };
            callback({
              type: 'AgentDeactivated',
              agentId: args.agentId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch AgentSlashed
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.agentRegistry,
        abi: AgentRegistryABI,
        eventName: 'AgentSlashed',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { agentId: Hex; amount: bigint; reason: string };
            callback({
              type: 'AgentSlashed',
              agentId: args.agentId,
              amount: args.amount,
              reason: args.reason,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    this.activeWatchers.push(...watchers);

    return {
      unsubscribe: () => {
        for (const watcher of watchers) {
          watcher();
        }
        this.activeWatchers = this.activeWatchers.filter(w => !watchers.includes(w));
      },
    };
  }

  /**
   * Watch all Task Marketplace events
   */
  watchTaskMarketplace(
    callback: (event: TaskCreatedEvent | TaskAssignedEvent | TaskCompletedEvent | TaskSubmittedEvent | TaskCancelledEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    const watchers: WatchContractEventReturnType[] = [];

    // Watch TaskCreated
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.taskMarketplace,
        abi: TaskMarketplaceABI,
        eventName: 'TaskCreated',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { taskId: Hex; requester: Address; reward: bigint; requiredCapability: string };
            callback({
              type: 'TaskCreated',
              taskId: args.taskId,
              requester: args.requester,
              reward: args.reward,
              requiredCapability: args.requiredCapability,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch TaskAssigned
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.taskMarketplace,
        abi: TaskMarketplaceABI,
        eventName: 'TaskAssigned',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { taskId: Hex; agentId: Hex };
            callback({
              type: 'TaskAssigned',
              taskId: args.taskId,
              agentId: args.agentId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch TaskCompleted
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.taskMarketplace,
        abi: TaskMarketplaceABI,
        eventName: 'TaskCompleted',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { taskId: Hex };
            callback({
              type: 'TaskCompleted',
              taskId: args.taskId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch TaskSubmitted
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.taskMarketplace,
        abi: TaskMarketplaceABI,
        eventName: 'TaskSubmitted',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { taskId: Hex; resultURI: string };
            callback({
              type: 'TaskSubmitted',
              taskId: args.taskId,
              resultURI: args.resultURI,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch TaskCancelled
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.taskMarketplace,
        abi: TaskMarketplaceABI,
        eventName: 'TaskCancelled',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { taskId: Hex };
            callback({
              type: 'TaskCancelled',
              taskId: args.taskId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    this.activeWatchers.push(...watchers);

    return {
      unsubscribe: () => {
        for (const watcher of watchers) {
          watcher();
        }
        this.activeWatchers = this.activeWatchers.filter(w => !watchers.includes(w));
      },
    };
  }

  /**
   * Watch Workflow Engine events
   */
  watchWorkflowEngine(
    callback: (event: WorkflowCreatedEvent | WorkflowStartedEvent | WorkflowCompletedEvent | StepCompletedEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    if (!this.network.contracts.workflowEngine) {
      throw new Error('WorkflowEngine contract not configured');
    }

    const watchers: WatchContractEventReturnType[] = [];

    // Watch WorkflowCreated
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.workflowEngine,
        abi: WorkflowEngineABI,
        eventName: 'WorkflowCreated',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { workflowId: Hex; creator: Address; name: string };
            callback({
              type: 'WorkflowCreated',
              workflowId: args.workflowId,
              creator: args.creator,
              name: args.name,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch WorkflowStarted
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.workflowEngine,
        abi: WorkflowEngineABI,
        eventName: 'WorkflowStarted',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { workflowId: Hex };
            callback({
              type: 'WorkflowStarted',
              workflowId: args.workflowId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch WorkflowCompleted
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.workflowEngine,
        abi: WorkflowEngineABI,
        eventName: 'WorkflowCompleted',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { workflowId: Hex };
            callback({
              type: 'WorkflowCompleted',
              workflowId: args.workflowId,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch StepCompleted
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.workflowEngine,
        abi: WorkflowEngineABI,
        eventName: 'StepCompleted',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { workflowId: Hex; stepId: Hex; agentId: Hex; outputURI: string };
            callback({
              type: 'StepCompleted',
              workflowId: args.workflowId,
              stepId: args.stepId,
              agentId: args.agentId,
              outputURI: args.outputURI,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    this.activeWatchers.push(...watchers);

    return {
      unsubscribe: () => {
        for (const watcher of watchers) {
          watcher();
        }
        this.activeWatchers = this.activeWatchers.filter(w => !watchers.includes(w));
      },
    };
  }

  /**
   * Watch Agent NFT badge events
   */
  watchBadges(
    callback: (event: BadgeAwardedEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    if (!this.network.contracts.agentNFT) {
      throw new Error('AgentNFT contract not configured');
    }

    const watcher = this.publicClient.watchContractEvent({
      address: this.network.contracts.agentNFT,
      abi: AgentNFTABI,
      eventName: 'BadgeAwarded',
      pollingInterval: options?.pollingInterval ?? 4000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as { tokenId: bigint; badgeType: number };
          callback({
            type: 'BadgeAwarded',
            tokenId: args.tokenId,
            badgeType: args.badgeType,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
        }
      },
    });

    this.activeWatchers.push(watcher);

    return {
      unsubscribe: () => {
        watcher();
        this.activeWatchers = this.activeWatchers.filter(w => w !== watcher);
      },
    };
  }

  /**
   * Watch Governance proposal events
   */
  watchGovernance(
    callback: (event: ProposalCreatedEvent | VoteCastEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    if (!this.network.contracts.governor) {
      throw new Error('Governor contract not configured');
    }

    const watchers: WatchContractEventReturnType[] = [];

    // Watch ProposalCreated
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.governor,
        abi: GovernorAgentABI,
        eventName: 'ProposalCreated',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { proposalId: bigint; proposer: Address; description: string };
            callback({
              type: 'ProposalCreated',
              proposalId: args.proposalId,
              proposer: args.proposer,
              description: args.description,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    // Watch VoteCast
    watchers.push(
      this.publicClient.watchContractEvent({
        address: this.network.contracts.governor,
        abi: GovernorAgentABI,
        eventName: 'VoteCast',
        pollingInterval: options?.pollingInterval ?? 4000,
        onLogs: (logs) => {
          for (const log of logs) {
            const args = log.args as { voter: Address; proposalId: bigint; support: number; weight: bigint; reason: string };
            callback({
              type: 'VoteCast',
              proposalId: args.proposalId,
              voter: args.voter,
              support: args.support,
              weight: args.weight,
              reason: args.reason,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        },
      })
    );

    this.activeWatchers.push(...watchers);

    return {
      unsubscribe: () => {
        for (const watcher of watchers) {
          watcher();
        }
        this.activeWatchers = this.activeWatchers.filter(w => !watchers.includes(w));
      },
    };
  }

  /**
   * Watch Cross-Chain Hub broadcast events
   */
  watchCrossChainBroadcasts(
    callback: (event: AgentBroadcastEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    if (!this.network.contracts.crossChainHub) {
      throw new Error('CrossChainHub contract not configured');
    }

    const watcher = this.publicClient.watchContractEvent({
      address: this.network.contracts.crossChainHub,
      abi: CrossChainHubABI,
      eventName: 'AgentBroadcast',
      pollingInterval: options?.pollingInterval ?? 4000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as { owner: Address; name: string; capabilities: string[]; reputationScore: bigint };
          callback({
            type: 'AgentBroadcast',
            owner: args.owner,
            name: args.name,
            capabilities: args.capabilities,
            reputationScore: args.reputationScore,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
        }
      },
    });

    this.activeWatchers.push(watcher);

    return {
      unsubscribe: () => {
        watcher();
        this.activeWatchers = this.activeWatchers.filter(w => w !== watcher);
      },
    };
  }

  /**
   * Watch all events from all contracts
   * Useful for activity feeds or dashboards
   */
  watchAll(
    callback: (event: AgentHubEvent) => void,
    options?: WatchEventOptions
  ): EventSubscription {
    const subscriptions: EventSubscription[] = [];

    subscriptions.push(this.watchAgentRegistry(callback, options));
    subscriptions.push(this.watchTaskMarketplace(callback, options));

    if (this.network.contracts.workflowEngine) {
      subscriptions.push(this.watchWorkflowEngine(callback, options));
    }
    if (this.network.contracts.agentNFT) {
      subscriptions.push(this.watchBadges(callback, options));
    }
    if (this.network.contracts.governor) {
      subscriptions.push(this.watchGovernance(callback, options));
    }
    if (this.network.contracts.crossChainHub) {
      subscriptions.push(this.watchCrossChainBroadcasts(callback, options));
    }

    return {
      unsubscribe: () => {
        for (const sub of subscriptions) {
          sub.unsubscribe();
        }
      },
    };
  }

  /**
   * Unsubscribe from all active watchers
   */
  unsubscribeAll(): void {
    for (const watcher of this.activeWatchers) {
      watcher();
    }
    this.activeWatchers = [];
  }

  /**
   * Get count of active watchers
   */
  get activeWatcherCount(): number {
    return this.activeWatchers.length;
  }
}

/**
 * Create an event watcher for Agent Hub contracts
 */
export function createEventWatcher(
  publicClient: PublicClient,
  network: NetworkConfig
): AgentHubEventWatcher {
  return new AgentHubEventWatcher(publicClient, network);
}
