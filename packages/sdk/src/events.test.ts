import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPublicClient, http, type Address } from 'viem';
import { AgentHubEventWatcher, createEventWatcher } from './events';
import type { NetworkConfig } from './types';

// Mock network config
const mockNetwork: NetworkConfig = {
  chainId: 133,
  name: 'HashKey Testnet',
  rpcUrl: 'https://hashkeychain-testnet.alt.technology',
  contracts: {
    agntToken: '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as Address,
    agentRegistry: '0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49' as Address,
    taskMarketplace: '0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061' as Address,
    agentNFT: '0x4476e726B4030923bD29C98F8881Da2727B6a0B6' as Address,
    workflowEngine: '0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd' as Address,
    dynamicPricing: '0x418e9aD294fDCfF5dC927a942CFf431ee8e55ad3' as Address,
    governor: '0x626496716673bb5E7F2634d2eBc96ae0697713a4' as Address,
    treasury: '0xdc454EfAa5eEBF4D6786750f664bCff461C68b33' as Address,
    crossChainHub: '0x6349F97FEeb19D9646a34f81904b50bB704FAD08' as Address,
    crossChainReceiver: '0x5Ae42BA8EDcB98deFF361E088AF09F9880e5C2b9' as Address,
  },
};

describe('AgentHubEventWatcher', () => {
  let publicClient: ReturnType<typeof createPublicClient>;
  let watcher: AgentHubEventWatcher;

  beforeEach(() => {
    publicClient = createPublicClient({
      chain: {
        id: mockNetwork.chainId,
        name: mockNetwork.name,
        nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
        rpcUrls: { default: { http: [mockNetwork.rpcUrl] } },
      },
      transport: http(mockNetwork.rpcUrl),
    });
    
    watcher = new AgentHubEventWatcher(publicClient, mockNetwork);
  });

  describe('createEventWatcher', () => {
    it('should create a watcher instance', () => {
      const newWatcher = createEventWatcher(publicClient, mockNetwork);
      expect(newWatcher).toBeInstanceOf(AgentHubEventWatcher);
    });
  });

  describe('activeWatcherCount', () => {
    it('should start with 0 active watchers', () => {
      expect(watcher.activeWatcherCount).toBe(0);
    });
  });

  describe('watchAgentRegistry', () => {
    it('should return a subscription object', () => {
      const callback = vi.fn();
      const subscription = watcher.watchAgentRegistry(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
      
      // Cleanup
      subscription.unsubscribe();
    });

    it('should add watchers and remove them on unsubscribe', () => {
      const callback = vi.fn();
      
      // Watch adds watchers
      const subscription = watcher.watchAgentRegistry(callback);
      expect(watcher.activeWatcherCount).toBeGreaterThan(0);
      
      // Unsubscribe removes them
      subscription.unsubscribe();
      expect(watcher.activeWatcherCount).toBe(0);
    });
  });

  describe('watchTaskMarketplace', () => {
    it('should return a subscription object', () => {
      const callback = vi.fn();
      const subscription = watcher.watchTaskMarketplace(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });
  });

  describe('watchWorkflowEngine', () => {
    it('should return a subscription object when configured', () => {
      const callback = vi.fn();
      const subscription = watcher.watchWorkflowEngine(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });

    it('should throw when not configured', () => {
      const noWorkflowNetwork = {
        ...mockNetwork,
        contracts: { ...mockNetwork.contracts, workflowEngine: undefined },
      };
      const noWorkflowWatcher = new AgentHubEventWatcher(publicClient, noWorkflowNetwork);
      
      expect(() => noWorkflowWatcher.watchWorkflowEngine(vi.fn())).toThrow(
        'WorkflowEngine contract not configured'
      );
    });
  });

  describe('watchBadges', () => {
    it('should return a subscription object when configured', () => {
      const callback = vi.fn();
      const subscription = watcher.watchBadges(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });

    it('should throw when not configured', () => {
      const noNFTNetwork = {
        ...mockNetwork,
        contracts: { ...mockNetwork.contracts, agentNFT: undefined },
      };
      const noNFTWatcher = new AgentHubEventWatcher(publicClient, noNFTNetwork);
      
      expect(() => noNFTWatcher.watchBadges(vi.fn())).toThrow(
        'AgentNFT contract not configured'
      );
    });
  });

  describe('watchGovernance', () => {
    it('should return a subscription object when configured', () => {
      const callback = vi.fn();
      const subscription = watcher.watchGovernance(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });

    it('should throw when not configured', () => {
      const noGovNetwork = {
        ...mockNetwork,
        contracts: { ...mockNetwork.contracts, governor: undefined },
      };
      const noGovWatcher = new AgentHubEventWatcher(publicClient, noGovNetwork);
      
      expect(() => noGovWatcher.watchGovernance(vi.fn())).toThrow(
        'Governor contract not configured'
      );
    });
  });

  describe('watchCrossChainBroadcasts', () => {
    it('should return a subscription object when configured', () => {
      const callback = vi.fn();
      const subscription = watcher.watchCrossChainBroadcasts(callback);
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });

    it('should throw when not configured', () => {
      const noCCNetwork = {
        ...mockNetwork,
        contracts: { ...mockNetwork.contracts, crossChainHub: undefined },
      };
      const noCCWatcher = new AgentHubEventWatcher(publicClient, noCCNetwork);
      
      expect(() => noCCWatcher.watchCrossChainBroadcasts(vi.fn())).toThrow(
        'CrossChainHub contract not configured'
      );
    });
  });

  describe('watchAll', () => {
    it('should create subscriptions for all available contracts', () => {
      const callback = vi.fn();
      const subscription = watcher.watchAll(callback);
      
      // Should have watchers for all contracts
      expect(watcher.activeWatcherCount).toBeGreaterThan(0);
      
      subscription.unsubscribe();
      expect(watcher.activeWatcherCount).toBe(0);
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all active watchers', () => {
      const callback = vi.fn();
      
      // Create multiple subscriptions
      watcher.watchAgentRegistry(callback);
      watcher.watchTaskMarketplace(callback);
      
      expect(watcher.activeWatcherCount).toBeGreaterThan(0);
      
      // Unsubscribe all
      watcher.unsubscribeAll();
      expect(watcher.activeWatcherCount).toBe(0);
    });
  });

  describe('options', () => {
    it('should accept polling interval option', () => {
      const callback = vi.fn();
      const subscription = watcher.watchAgentRegistry(callback, {
        pollingInterval: 10000,
      });
      
      expect(subscription).toHaveProperty('unsubscribe');
      subscription.unsubscribe();
    });
  });
});
