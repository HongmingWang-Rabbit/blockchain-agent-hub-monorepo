import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationManager,
  createNotificationManager,
  eventToNotification,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_ICONS,
  PRIORITY_COLORS,
  type Notification,
  type NotificationType,
  type NotificationPriority,
  type EventToNotificationOptions,
} from './notifications';
import type { AgentHubEvent } from './events';

// Mock window and localStorage with resettable store
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
};

// Mock window to enable localStorage in tests
Object.defineProperty(global, 'window', { value: global, writable: true });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('NotificationManager', () => {
  let manager: NotificationManager;
  
  beforeEach(() => {
    // Reset the store
    localStorageStore = {};
    vi.clearAllMocks();
    manager = createNotificationManager();
  });
  
  describe('add()', () => {
    it('should add a notification with generated id and timestamp', () => {
      const notification = manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Test Task',
        message: 'A test task was assigned',
      });
      
      expect(notification.id).toMatch(/^notif_/);
      expect(notification.timestamp).toBeGreaterThan(0);
      expect(notification.read).toBe(false);
      expect(notification.dismissed).toBe(false);
      expect(notification.title).toBe('Test Task');
    });
    
    it('should store notification with optional data', () => {
      const notification = manager.add({
        type: 'payment_received',
        priority: 'high',
        title: 'Payment!',
        message: 'You received 50 AGNT',
        data: {
          taskId: '0x123',
          amount: '50000000000000000000',
          transactionHash: '0xabc',
        },
        actionUrl: '/tasks',
        actionLabel: 'View Task',
      });
      
      expect(notification.data?.taskId).toBe('0x123');
      expect(notification.data?.amount).toBe('50000000000000000000');
      expect(notification.actionUrl).toBe('/tasks');
    });
    
    it('should ignore disabled notification types', () => {
      manager.setTypeEnabled('agent_registered', false);
      
      const before = manager.getAll().length;
      manager.add({
        type: 'agent_registered',
        priority: 'normal',
        title: 'New Agent',
        message: 'Agent registered',
      });
      
      expect(manager.getAll().length).toBe(before);
    });
    
    it('should call onNotification callback', () => {
      const onNotification = vi.fn();
      const mgr = createNotificationManager({ onNotification });
      
      const notification = mgr.add({
        type: 'badge_earned',
        priority: 'normal',
        title: 'Badge!',
        message: 'You earned a badge',
      });
      
      expect(onNotification).toHaveBeenCalledWith(notification);
    });
    
    it('should save to localStorage', () => {
      manager.add({
        type: 'task_completed',
        priority: 'normal',
        title: 'Done',
        message: 'Task done',
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
    
    it('should trim old notifications when exceeding maxNotifications', () => {
      const smallManager = createNotificationManager({ maxNotifications: 3 });
      
      for (let i = 0; i < 5; i++) {
        smallManager.add({
          type: 'task_assigned',
          priority: 'normal',
          title: `Task ${i}`,
          message: `Task ${i} message`,
        });
      }
      
      expect(smallManager.getAll().length).toBe(3);
    });
  });
  
  describe('markAsRead()', () => {
    it('should mark notification as read', () => {
      const notification = manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Test',
        message: 'Test',
      });
      
      expect(notification.read).toBe(false);
      
      const result = manager.markAsRead(notification.id);
      expect(result).toBe(true);
      
      const updated = manager.get(notification.id);
      expect(updated?.read).toBe(true);
    });
    
    it('should return false for non-existent notification', () => {
      const result = manager.markAsRead('non_existent');
      expect(result).toBe(false);
    });
  });
  
  describe('markAllAsRead()', () => {
    it('should mark all notifications as read', () => {
      manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      manager.add({ type: 'task_completed', priority: 'normal', title: '2', message: '2' });
      manager.add({ type: 'badge_earned', priority: 'normal', title: '3', message: '3' });
      
      expect(manager.countUnread()).toBe(3);
      
      const count = manager.markAllAsRead();
      expect(count).toBe(3);
      expect(manager.countUnread()).toBe(0);
    });
    
    it('should return 0 when no unread notifications', () => {
      const count = manager.markAllAsRead();
      expect(count).toBe(0);
    });
  });
  
  describe('dismiss()', () => {
    it('should dismiss notification', () => {
      const notification = manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Test',
        message: 'Test',
      });
      
      const result = manager.dismiss(notification.id);
      expect(result).toBe(true);
      
      const updated = manager.get(notification.id);
      expect(updated?.dismissed).toBe(true);
      expect(updated?.read).toBe(true);
    });
    
    it('should exclude dismissed from default getAll', () => {
      const notification = manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Test',
        message: 'Test',
      });
      
      manager.dismiss(notification.id);
      
      const active = manager.getAll({ dismissed: false });
      expect(active.length).toBe(0);
      
      // But still accessible when including dismissed
      const all = manager.getAll({ dismissed: true });
      expect(all.length).toBe(1);
    });
  });
  
  describe('delete()', () => {
    it('should permanently delete notification', () => {
      const notification = manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Test',
        message: 'Test',
      });
      
      const result = manager.delete(notification.id);
      expect(result).toBe(true);
      expect(manager.get(notification.id)).toBeUndefined();
    });
    
    it('should return false for non-existent notification', () => {
      const result = manager.delete('non_existent');
      expect(result).toBe(false);
    });
  });
  
  describe('clear()', () => {
    it('should remove all notifications', () => {
      manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      manager.add({ type: 'task_completed', priority: 'normal', title: '2', message: '2' });
      
      const count = manager.clear();
      expect(count).toBe(2);
      expect(manager.getAll().length).toBe(0);
    });
  });
  
  describe('getAll() filtering', () => {
    beforeEach(() => {
      manager.add({ type: 'task_assigned', priority: 'high', title: '1', message: '1' });
      manager.add({ type: 'task_completed', priority: 'normal', title: '2', message: '2' });
      manager.add({ type: 'badge_earned', priority: 'low', title: '3', message: '3' });
    });
    
    it('should filter by type', () => {
      const results = manager.getAll({ types: ['task_assigned', 'badge_earned'] });
      expect(results.length).toBe(2);
    });
    
    it('should filter by priority', () => {
      const results = manager.getAll({ priorities: ['high'] });
      expect(results.length).toBe(1);
      expect(results[0].priority).toBe('high');
    });
    
    it('should filter by read status', () => {
      manager.markAsRead(manager.getAll()[0].id);
      
      const unread = manager.getAll({ read: false });
      expect(unread.length).toBe(2);
      
      const read = manager.getAll({ read: true });
      expect(read.length).toBe(1);
    });
    
    it('should limit results', () => {
      const results = manager.getAll({ limit: 2 });
      expect(results.length).toBe(2);
    });
    
    it('should sort by timestamp descending', () => {
      const results = manager.getAll();
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp).toBeGreaterThanOrEqual(results[i].timestamp);
      }
    });
  });
  
  describe('getUnread()', () => {
    it('should return only unread and non-dismissed notifications', () => {
      const n1 = manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      const n2 = manager.add({ type: 'task_completed', priority: 'normal', title: '2', message: '2' });
      manager.add({ type: 'badge_earned', priority: 'normal', title: '3', message: '3' });
      
      manager.markAsRead(n1.id);
      manager.dismiss(n2.id);
      
      const unread = manager.getUnread();
      expect(unread.length).toBe(1);
    });
  });
  
  describe('getStats()', () => {
    it('should return accurate statistics', () => {
      manager.add({ type: 'task_assigned', priority: 'high', title: '1', message: '1' });
      manager.add({ type: 'task_assigned', priority: 'normal', title: '2', message: '2' });
      manager.add({ type: 'badge_earned', priority: 'low', title: '3', message: '3' });
      manager.markAsRead(manager.getAll()[0].id);
      
      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.unread).toBe(2);
      expect(stats.byType['task_assigned']).toBe(2);
      expect(stats.byType['badge_earned']).toBe(1);
      expect(stats.byPriority['high']).toBe(1);
    });
  });
  
  describe('subscribe()', () => {
    it('should call listener immediately with current notifications', () => {
      manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      
      const listener = vi.fn();
      manager.subscribe(listener);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].length).toBe(1);
    });
    
    it('should call listener when notifications change', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      
      expect(listener).toHaveBeenCalledTimes(2); // Initial + add
    });
    
    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      
      unsubscribe();
      
      manager.add({ type: 'task_assigned', priority: 'normal', title: '1', message: '1' });
      
      expect(listener).toHaveBeenCalledTimes(1); // Only initial call
    });
  });
  
  describe('preferences', () => {
    it('should get preferences', () => {
      const prefs = manager.getPreferences();
      expect(prefs.soundEnabled).toBe(true);
      expect(prefs.enabledTypes).toBeInstanceOf(Set);
    });
    
    it('should update preferences', () => {
      manager.updatePreferences({ soundEnabled: false });
      
      const prefs = manager.getPreferences();
      expect(prefs.soundEnabled).toBe(false);
    });
    
    it('should enable/disable notification types', () => {
      manager.setTypeEnabled('task_assigned', false);
      expect(manager.getPreferences().enabledTypes.has('task_assigned')).toBe(false);
      
      manager.setTypeEnabled('task_assigned', true);
      expect(manager.getPreferences().enabledTypes.has('task_assigned')).toBe(true);
    });
  });
  
  describe('persistence', () => {
    it('should save notifications to storage', () => {
      manager.add({
        type: 'task_assigned',
        priority: 'normal',
        title: 'Persisted',
        message: 'This should persist',
      });
      
      // Verify setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Get the saved data
      const savedData = localStorageMock.setItem.mock.calls[0];
      expect(savedData[0]).toBe('agent-hub-notifications');
      
      const parsed = JSON.parse(savedData[1]);
      expect(parsed.notifications.length).toBe(1);
      expect(parsed.notifications[0].title).toBe('Persisted');
    });
    
    it('should save preferences to storage', () => {
      manager.updatePreferences({ soundEnabled: false });
      
      // Verify setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Get the most recent call
      const lastCall = localStorageMock.setItem.mock.calls.at(-1);
      const parsed = JSON.parse(lastCall[1]);
      expect(parsed.preferences.soundEnabled).toBe(false);
    });
  });
});

describe('eventToNotification()', () => {
  const defaultOptions: EventToNotificationOptions = {
    userAddress: '0xUser123',
    agentIds: ['0xAgent456'],
    watchedTaskIds: new Set(['0xTask789']),
  };
  
  describe('TaskCreated', () => {
    it('should create notification for own task', () => {
      const event: AgentHubEvent = {
        type: 'TaskCreated',
        taskId: '0xTask1',
        requester: '0xUser123',
        reward: 100000000000000000000n,
        requiredCapability: 'code-review',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      
      expect(notification).not.toBeNull();
      expect(notification?.title).toBe('Task Created');
      expect(notification?.message).toContain('100 AGNT');
      expect(notification?.data?.taskId).toBe('0xTask1');
    });
    
    it('should not create notification for others task without includeAll', () => {
      const event: AgentHubEvent = {
        type: 'TaskCreated',
        taskId: '0xTask1',
        requester: '0xOtherUser',
        reward: 100000000000000000000n,
        requiredCapability: 'code-review',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      expect(notification).toBeNull();
    });
    
    it('should create notification with includeAll', () => {
      const event: AgentHubEvent = {
        type: 'TaskCreated',
        taskId: '0xTask1',
        requester: '0xOtherUser',
        reward: 100000000000000000000n,
        requiredCapability: 'code-review',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, { ...defaultOptions, includeAll: true });
      expect(notification).not.toBeNull();
    });
  });
  
  describe('TaskAssigned', () => {
    it('should notify task owner', () => {
      const event: AgentHubEvent = {
        type: 'TaskAssigned',
        taskId: '0xTask789',
        agentId: '0xOtherAgent',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      
      expect(notification).not.toBeNull();
      expect(notification?.title).toBe('Agent Picked Up Task');
    });
    
    it('should notify assigned agent differently', () => {
      const event: AgentHubEvent = {
        type: 'TaskAssigned',
        taskId: '0xOtherTask',
        agentId: '0xAgent456',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      
      expect(notification).not.toBeNull();
      expect(notification?.title).toBe('Task Assigned to You');
    });
  });
  
  describe('TaskCompleted', () => {
    it('should notify when watching the task', () => {
      const event: AgentHubEvent = {
        type: 'TaskCompleted',
        taskId: '0xTask789', // This is in watchedTaskIds
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('task_completed');
      expect(notification?.title).toBe('Task Completed');
    });
    
    it('should not notify for unwatched tasks without includeAll', () => {
      const event: AgentHubEvent = {
        type: 'TaskCompleted',
        taskId: '0xOtherTask',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      expect(notification).toBeNull();
    });
    
    it('should notify with includeAll', () => {
      const event: AgentHubEvent = {
        type: 'TaskCompleted',
        taskId: '0xOtherTask',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, { ...defaultOptions, includeAll: true });
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('task_completed');
      expect(notification?.title).toBe('Task Completed');
    });
  });
  
  describe('AgentSlashed', () => {
    it('should create urgent notification for own agent', () => {
      const event: AgentHubEvent = {
        type: 'AgentSlashed',
        agentId: '0xAgent456',
        amount: 10000000000000000000n,
        reason: 'Missed deadline',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      
      expect(notification).not.toBeNull();
      expect(notification?.priority).toBe('urgent');
      expect(notification?.title).toContain('Slashed');
    });
  });
  
  describe('BadgeAwarded', () => {
    it('should not create notification without includeAll', () => {
      const event: AgentHubEvent = {
        type: 'BadgeAwarded',
        tokenId: 1n,
        badgeType: 2,
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      expect(notification).toBeNull();
    });
    
    it('should create badge notification with includeAll', () => {
      const event: AgentHubEvent = {
        type: 'BadgeAwarded',
        tokenId: 1n,
        badgeType: 2,
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, { ...defaultOptions, includeAll: true });
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('badge_earned');
      expect(notification?.title).toContain('Badge');
    });
  });
  
  describe('ProposalCreated', () => {
    it('should always create governance notification', () => {
      const event: AgentHubEvent = {
        type: 'ProposalCreated',
        proposalId: 1n,
        proposer: '0xOtherUser',
        description: 'Test proposal',
        transactionHash: '0xTx1',
        blockNumber: 12345n,
      } as AgentHubEvent;
      
      const notification = eventToNotification(event, {});
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('governance_proposal');
      expect(notification?.title).toContain('Governance');
    });
  });
  
  describe('unknown events', () => {
    it('should return null for unknown event types', () => {
      const event = {
        type: 'UnknownEvent',
        transactionHash: '0xTx1',
        blockNumber: '12345',
      } as unknown as AgentHubEvent;
      
      const notification = eventToNotification(event, defaultOptions);
      expect(notification).toBeNull();
    });
  });
});

describe('constants', () => {
  describe('NOTIFICATION_TYPE_LABELS', () => {
    it('should have labels for all notification types', () => {
      const types: NotificationType[] = [
        'task_assigned', 'task_submitted', 'task_completed', 'task_cancelled',
        'task_expired', 'agent_registered', 'agent_slashed', 'badge_earned',
        'reputation_changed', 'payment_received', 'workflow_update',
        'governance_proposal', 'governance_result', 'mention', 'system',
      ];
      
      for (const type of types) {
        expect(NOTIFICATION_TYPE_LABELS[type]).toBeDefined();
        expect(typeof NOTIFICATION_TYPE_LABELS[type]).toBe('string');
      }
    });
  });
  
  describe('NOTIFICATION_TYPE_ICONS', () => {
    it('should have icons for all notification types', () => {
      const types: NotificationType[] = [
        'task_assigned', 'task_submitted', 'task_completed', 'task_cancelled',
        'task_expired', 'agent_registered', 'agent_slashed', 'badge_earned',
        'reputation_changed', 'payment_received', 'workflow_update',
        'governance_proposal', 'governance_result', 'mention', 'system',
      ];
      
      for (const type of types) {
        expect(NOTIFICATION_TYPE_ICONS[type]).toBeDefined();
      }
    });
  });
  
  describe('PRIORITY_COLORS', () => {
    it('should have colors for all priorities', () => {
      const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];
      
      for (const priority of priorities) {
        expect(PRIORITY_COLORS[priority]).toBeDefined();
        expect(PRIORITY_COLORS[priority]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });
});
