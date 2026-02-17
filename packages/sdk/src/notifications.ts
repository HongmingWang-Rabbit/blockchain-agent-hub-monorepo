/**
 * Agent Notifications System
 * 
 * In-app notifications for tracking agent activity, task updates, and marketplace events.
 * Integrates with the event watcher for real-time updates.
 */

import type { AgentHubEvent } from './events';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'task_assigned'      // Your task was picked up by an agent
  | 'task_submitted'     // Agent submitted work for your task
  | 'task_completed'     // Task was completed and paid
  | 'task_cancelled'     // Task was cancelled
  | 'task_expired'       // Task deadline passed
  | 'agent_registered'   // New agent registered (for admins/watchers)
  | 'agent_slashed'      // Agent was slashed (warning for agents)
  | 'badge_earned'       // You earned a new badge
  | 'reputation_changed' // Your reputation changed
  | 'payment_received'   // You received payment
  | 'workflow_update'    // Workflow step completed
  | 'governance_proposal'// New governance proposal
  | 'governance_result'  // Proposal voting ended
  | 'mention'            // Someone mentioned you
  | 'system'             // System announcement

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
  
  // Optional context
  data?: {
    taskId?: string;
    agentId?: string;
    workflowId?: string;
    proposalId?: string;
    badgeType?: number;
    amount?: string;
    transactionHash?: string;
    blockNumber?: string;
  };
  
  // Action URL (optional)
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  read?: boolean;
  dismissed?: boolean;
  since?: number;
  until?: number;
  limit?: number;
}

export interface NotificationPreferences {
  // Which notification types are enabled
  enabledTypes: Set<NotificationType>;
  
  // Sound preferences
  soundEnabled: boolean;
  soundUrl?: string;
  
  // Browser notification preferences
  browserNotificationsEnabled: boolean;
  
  // Auto-dismiss after reading (ms), 0 = never
  autoDismissDelay: number;
  
  // Max notifications to keep
  maxNotifications: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// ============================================================================
// Notification Manager
// ============================================================================

export interface NotificationManagerConfig {
  /** Storage key for localStorage persistence */
  storageKey?: string;
  
  /** Max notifications to keep (default: 100) */
  maxNotifications?: number;
  
  /** Default preferences */
  defaultPreferences?: Partial<NotificationPreferences>;
  
  /** Callback when notification is added */
  onNotification?: (notification: Notification) => void;
  
  /** Custom ID generator */
  generateId?: () => string;
}

export class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private preferences: NotificationPreferences;
  private config: Required<NotificationManagerConfig>;
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  
  constructor(config: NotificationManagerConfig = {}) {
    this.config = {
      storageKey: config.storageKey ?? 'agent-hub-notifications',
      maxNotifications: config.maxNotifications ?? 100,
      defaultPreferences: config.defaultPreferences ?? {},
      onNotification: config.onNotification ?? (() => {}),
      generateId: config.generateId ?? (() => `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    };
    
    // Initialize preferences with defaults
    this.preferences = {
      enabledTypes: new Set([
        'task_assigned',
        'task_submitted', 
        'task_completed',
        'task_cancelled',
        'badge_earned',
        'payment_received',
        'workflow_update',
        'governance_proposal',
      ]),
      soundEnabled: true,
      browserNotificationsEnabled: false,
      autoDismissDelay: 0,
      maxNotifications: this.config.maxNotifications,
      ...this.config.defaultPreferences,
    };
    
    // Load from storage if available
    this.loadFromStorage();
  }
  
  // -------------------------------------------------------------------------
  // Core Operations
  // -------------------------------------------------------------------------
  
  /**
   * Add a new notification
   */
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>): Notification {
    const fullNotification: Notification = {
      ...notification,
      id: this.config.generateId(),
      timestamp: Date.now(),
      read: false,
      dismissed: false,
    };
    
    // Check if type is enabled
    if (!this.preferences.enabledTypes.has(notification.type)) {
      return fullNotification; // Don't store but return for reference
    }
    
    this.notifications.set(fullNotification.id, fullNotification);
    
    // Trim old notifications
    this.trimNotifications();
    
    // Persist
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners();
    
    // Callback
    this.config.onNotification(fullNotification);
    
    return fullNotification;
  }
  
  /**
   * Mark notification as read
   */
  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.read = true;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead(): number {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    }
    
    if (count > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }
    
    return count;
  }
  
  /**
   * Dismiss a notification (hide from UI but keep in history)
   */
  dismiss(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.dismissed = true;
    notification.read = true;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }
  
  /**
   * Delete a notification permanently
   */
  delete(id: string): boolean {
    const result = this.notifications.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }
  
  /**
   * Clear all notifications
   */
  clear(): number {
    const count = this.notifications.size;
    this.notifications.clear();
    this.saveToStorage();
    this.notifyListeners();
    return count;
  }
  
  // -------------------------------------------------------------------------
  // Querying
  // -------------------------------------------------------------------------
  
  /**
   * Get a notification by ID
   */
  get(id: string): Notification | undefined {
    return this.notifications.get(id);
  }
  
  /**
   * Get all notifications (newest first)
   */
  getAll(filter?: NotificationFilter): Notification[] {
    let results = Array.from(this.notifications.values());
    
    if (filter) {
      if (filter.types?.length) {
        results = results.filter(n => filter.types!.includes(n.type));
      }
      if (filter.priorities?.length) {
        results = results.filter(n => filter.priorities!.includes(n.priority));
      }
      if (filter.read !== undefined) {
        results = results.filter(n => n.read === filter.read);
      }
      if (filter.dismissed !== undefined) {
        results = results.filter(n => n.dismissed === filter.dismissed);
      }
      if (filter.since) {
        results = results.filter(n => n.timestamp >= filter.since!);
      }
      if (filter.until) {
        results = results.filter(n => n.timestamp <= filter.until!);
      }
    }
    
    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }
    
    return results;
  }
  
  /**
   * Get unread notifications
   */
  getUnread(): Notification[] {
    return this.getAll({ read: false, dismissed: false });
  }
  
  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const stats: NotificationStats = {
      total: this.notifications.size,
      unread: 0,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
    };
    
    for (const notification of this.notifications.values()) {
      if (!notification.read) {
        stats.unread++;
      }
      
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
    }
    
    return stats;
  }
  
  /**
   * Count unread notifications
   */
  countUnread(): number {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (!notification.read && !notification.dismissed) {
        count++;
      }
    }
    return count;
  }
  
  // -------------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------------
  
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }
  
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    Object.assign(this.preferences, updates);
    this.saveToStorage();
  }
  
  setTypeEnabled(type: NotificationType, enabled: boolean): void {
    if (enabled) {
      this.preferences.enabledTypes.add(type);
    } else {
      this.preferences.enabledTypes.delete(type);
    }
    this.saveToStorage();
  }
  
  // -------------------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------------------
  
  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current notifications
    listener(this.getAll({ dismissed: false }));
    
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notifyListeners(): void {
    const notifications = this.getAll({ dismissed: false });
    for (const listener of this.listeners) {
      listener(notifications);
    }
  }
  
  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------
  
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = {
        notifications: Array.from(this.notifications.values()),
        preferences: {
          ...this.preferences,
          enabledTypes: Array.from(this.preferences.enabledTypes),
        },
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save notifications to storage:', e);
    }
  }
  
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (!raw) return;
      
      const data = JSON.parse(raw);
      
      // Load notifications
      if (Array.isArray(data.notifications)) {
        for (const notification of data.notifications) {
          this.notifications.set(notification.id, notification);
        }
      }
      
      // Load preferences
      if (data.preferences) {
        Object.assign(this.preferences, data.preferences);
        if (Array.isArray(data.preferences.enabledTypes)) {
          this.preferences.enabledTypes = new Set(data.preferences.enabledTypes);
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications from storage:', e);
    }
  }
  
  private trimNotifications(): void {
    if (this.notifications.size <= this.preferences.maxNotifications) return;
    
    // Get all notifications sorted by timestamp
    const sorted = Array.from(this.notifications.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest until we're under the limit
    const toRemove = sorted.slice(0, sorted.length - this.preferences.maxNotifications);
    for (const notification of toRemove) {
      this.notifications.delete(notification.id);
    }
  }
}

// ============================================================================
// Event to Notification Converter
// ============================================================================

export interface EventToNotificationOptions {
  /** Your agent address (to identify relevant events) */
  userAddress?: string;
  
  /** Agent IDs you own/manage */
  agentIds?: string[];
  
  /** Task IDs you're watching */
  watchedTaskIds?: Set<string>;
  
  /** Include all events (not just your own) */
  includeAll?: boolean;
}

/**
 * Convert a blockchain event to a notification
 */
export function eventToNotification(
  event: AgentHubEvent,
  options: EventToNotificationOptions = {}
): Notification | null {
  const { userAddress, agentIds = [], watchedTaskIds, includeAll = false } = options;
  const userAddressLower = userAddress?.toLowerCase();
  const agentIdSet = new Set(agentIds.map(id => id.toLowerCase()));
  
  switch (event.type) {
    case 'TaskCreated': {
      // Only notify if watching all or if user is the requester
      const isOwn = event.requester?.toLowerCase() === userAddressLower;
      if (!isOwn && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'task_assigned',
        priority: 'normal',
        title: 'Task Created',
        message: `Your task is now live with ${formatAmount(String(event.reward))} AGNT reward`,
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          taskId: event.taskId,
          amount: String(event.reward),
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/tasks`,
        actionLabel: 'View Tasks',
      };
    }
    
    case 'TaskAssigned': {
      // Notify task owner or assigned agent
      const isOwner = watchedTaskIds?.has(event.taskId);
      const isAgent = agentIdSet.has(event.agentId.toLowerCase());
      
      if (!isOwner && !isAgent && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'task_assigned',
        priority: 'high',
        title: isAgent ? 'Task Assigned to You' : 'Agent Picked Up Task',
        message: isAgent 
          ? 'You have been assigned a new task. Check the details and start working!'
          : `An agent has started working on your task`,
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          taskId: event.taskId,
          agentId: event.agentId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/tasks`,
        actionLabel: 'View Task',
      };
    }
    
    case 'TaskSubmitted': {
      const isWatching = watchedTaskIds?.has(event.taskId);
      if (!isWatching && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'task_submitted',
        priority: 'high',
        title: 'Work Submitted',
        message: 'An agent has submitted their work. Review and approve to release payment.',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          taskId: event.taskId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/tasks`,
        actionLabel: 'Review Submission',
      };
    }
    
    case 'TaskCompleted': {
      // TaskCompleted event only has taskId - no agentId or reward
      const isWatching = watchedTaskIds?.has(event.taskId);
      
      if (!isWatching && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'task_completed',
        priority: 'normal',
        title: 'Task Completed',
        message: 'Task has been completed successfully. Payment released to agent.',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          taskId: event.taskId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/tasks`,
        actionLabel: 'View Details',
      };
    }
    
    case 'TaskCancelled': {
      const isWatching = watchedTaskIds?.has(event.taskId);
      if (!isWatching && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'task_cancelled',
        priority: 'normal',
        title: 'Task Cancelled',
        message: 'A task has been cancelled. Escrowed funds have been returned.',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          taskId: event.taskId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
      };
    }
    
    case 'AgentSlashed': {
      const isAgent = agentIdSet.has(event.agentId.toLowerCase());
      if (!isAgent && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'agent_slashed',
        priority: 'urgent',
        title: '⚠️ Agent Slashed',
        message: `Your agent was slashed ${formatAmount(String(event.amount))} AGNT. Review your performance.`,
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          agentId: event.agentId,
          amount: String(event.amount),
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/agents/${event.agentId}`,
        actionLabel: 'View Agent',
      };
    }
    
    case 'BadgeAwarded': {
      // BadgeAwarded uses tokenId, not agentId - include if watching all
      if (!includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'badge_earned',
        priority: 'normal',
        title: '🎖️ New Badge Earned!',
        message: `An agent earned a new achievement badge.`,
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          badgeType: Number(event.badgeType),
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
      };
    }
    
    case 'WorkflowCompleted': {
      if (!includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'workflow_update',
        priority: 'normal',
        title: 'Workflow Completed',
        message: 'Your workflow has finished.',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          workflowId: event.workflowId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/workflows`,
        actionLabel: 'View Workflow',
      };
    }
    
    case 'StepCompleted': {
      if (!includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'workflow_update',
        priority: 'low',
        title: 'Workflow Step Completed',
        message: `A workflow step has been completed.`,
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          workflowId: event.workflowId,
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
      };
    }
    
    case 'ProposalCreated': {
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'governance_proposal',
        priority: 'normal',
        title: '🗳️ New Governance Proposal',
        message: 'A new proposal has been submitted. Cast your vote!',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          proposalId: String(event.proposalId),
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
        actionUrl: `/governance`,
        actionLabel: 'Vote Now',
      };
    }
    
    case 'VoteCast': {
      // Only notify if it's your vote
      if (event.voter?.toLowerCase() !== userAddressLower && !includeAll) return null;
      
      return {
        id: `notif_${event.transactionHash}_${event.type}`,
        type: 'governance_proposal',
        priority: 'low',
        title: 'Vote Recorded',
        message: 'Your vote has been recorded on-chain.',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        data: {
          proposalId: String(event.proposalId),
          transactionHash: event.transactionHash,
          blockNumber: String(event.blockNumber),
        },
      };
    }
    
    default:
      return null;
  }
}

/**
 * Format token amount for display
 */
function formatAmount(amount: string | undefined): string {
  if (!amount) return '0';
  
  try {
    const value = BigInt(amount);
    const decimals = 18n;
    const divisor = 10n ** decimals;
    const whole = value / divisor;
    const fraction = value % divisor;
    
    if (fraction === 0n) {
      return whole.toString();
    }
    
    // Show up to 2 decimal places
    const fractionStr = fraction.toString().padStart(18, '0').slice(0, 2);
    return `${whole}.${fractionStr}`.replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new NotificationManager instance
 */
export function createNotificationManager(config?: NotificationManagerConfig): NotificationManager {
  return new NotificationManager(config);
}

// ============================================================================
// Browser Notification Helpers
// ============================================================================

// Browser notification permission type
type BrowserNotificationPermission = 'default' | 'denied' | 'granted';

/**
 * Request browser notification permission
 * Only works in browser environment
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined') {
    return 'denied';
  }
  
  // Access Notification from window to avoid type conflicts
  const BrowserNotification = window.Notification;
  if (!BrowserNotification) {
    return 'denied';
  }
  
  return BrowserNotification.requestPermission() as Promise<BrowserNotificationPermission>;
}

/**
 * Show a browser notification
 * Only works in browser environment with granted permission
 */
export function showBrowserNotification(
  agentNotification: Notification,
  options?: { icon?: string; badge?: string; tag?: string }
): globalThis.Notification | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Access Notification from window to avoid type conflicts
  const BrowserNotification = window.Notification;
  if (!BrowserNotification) {
    return null;
  }
  
  if (BrowserNotification.permission !== 'granted') {
    return null;
  }
  
  const browserNotification = new BrowserNotification(agentNotification.title, {
    body: agentNotification.message,
    icon: options?.icon ?? '/icons/icon-192x192.png',
    badge: options?.badge ?? '/icons/icon-96x96.png',
    tag: options?.tag ?? agentNotification.id,
  });
  
  // Handle click
  browserNotification.onclick = () => {
    window.focus();
    if (agentNotification.actionUrl) {
      window.location.href = agentNotification.actionUrl;
    }
    browserNotification.close();
  };
  
  return browserNotification;
}

// ============================================================================
// Notification Type Labels
// ============================================================================

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_submitted: 'Work Submitted',
  task_completed: 'Task Completed',
  task_cancelled: 'Task Cancelled',
  task_expired: 'Task Expired',
  agent_registered: 'Agent Registered',
  agent_slashed: 'Agent Slashed',
  badge_earned: 'Badge Earned',
  reputation_changed: 'Reputation Changed',
  payment_received: 'Payment Received',
  workflow_update: 'Workflow Update',
  governance_proposal: 'Governance',
  governance_result: 'Governance Result',
  mention: 'Mention',
  system: 'System',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  task_assigned: '📋',
  task_submitted: '📤',
  task_completed: '✅',
  task_cancelled: '❌',
  task_expired: '⏰',
  agent_registered: '🤖',
  agent_slashed: '⚠️',
  badge_earned: '🎖️',
  reputation_changed: '📊',
  payment_received: '💰',
  workflow_update: '🔄',
  governance_proposal: '🗳️',
  governance_result: '📢',
  mention: '💬',
  system: 'ℹ️',
};

export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: '#6b7280',    // gray-500
  normal: '#3b82f6', // blue-500
  high: '#f59e0b',   // amber-500
  urgent: '#ef4444', // red-500
};
