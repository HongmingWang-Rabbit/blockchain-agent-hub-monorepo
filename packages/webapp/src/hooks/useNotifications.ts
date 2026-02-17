'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import {
  createNotificationManager,
  createEventWatcher,
  eventToNotification,
  HASHKEY_TESTNET,
  type NotificationManager,
  type Notification,
  type NotificationStats,
  type NotificationFilter,
  type NotificationPreferences,
  type AgentHubEvent,
} from '@agent-hub/sdk';
import type { PublicClient } from 'viem';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats;
  
  // Actions
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
  
  // Preferences
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  
  // Filtering
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  
  // Event watching state
  isWatching: boolean;
  error: string | null;
}

let globalManager: NotificationManager | null = null;

function getNotificationManager(): NotificationManager {
  if (!globalManager) {
    globalManager = createNotificationManager({
      storageKey: 'agent-hub-notifications',
      maxNotifications: 100,
      onNotification: (notification) => {
        // Play sound if enabled
        const prefs = globalManager?.getPreferences();
        if (prefs?.soundEnabled && typeof window !== 'undefined') {
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore autoplay errors
          } catch {}
        }
      },
    });
  }
  return globalManager;
}

export function useNotifications(): UseNotificationsReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>({ dismissed: false });
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const managerRef = useRef<NotificationManager | null>(null);
  const watcherUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = getNotificationManager();
    setPreferences(managerRef.current.getPreferences());
    
    // Subscribe to changes
    const unsubscribe = managerRef.current.subscribe((notifs) => {
      setNotifications(notifs);
      setStats(managerRef.current!.getStats());
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Set up event watching when connected
  useEffect(() => {
    if (!publicClient || !address) {
      if (watcherUnsubscribeRef.current) {
        watcherUnsubscribeRef.current();
        watcherUnsubscribeRef.current = null;
      }
      setIsWatching(false);
      return;
    }
    
    try {
      const watcher = createEventWatcher(publicClient as PublicClient, HASHKEY_TESTNET);
      
      const handleEvent = (event: AgentHubEvent) => {
        const notification = eventToNotification(event, {
          userAddress: address,
          agentIds: [], // TODO: Get user's agent IDs
          watchedTaskIds: new Set(), // TODO: Get user's task IDs
          includeAll: false,
        });
        
        if (notification && managerRef.current) {
          managerRef.current.add({
            type: notification.type,
            priority: notification.priority,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            actionUrl: notification.actionUrl,
            actionLabel: notification.actionLabel,
          });
        }
      };
      
      watcher.watchAll(handleEvent);
      watcherUnsubscribeRef.current = () => watcher.unsubscribeAll();
      setIsWatching(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start event watcher');
      setIsWatching(false);
    }
    
    return () => {
      if (watcherUnsubscribeRef.current) {
        watcherUnsubscribeRef.current();
        watcherUnsubscribeRef.current = null;
      }
    };
  }, [publicClient, address]);
  
  // Actions
  const markAsRead = useCallback((id: string) => {
    managerRef.current?.markAsRead(id);
  }, []);
  
  const markAllAsRead = useCallback(() => {
    managerRef.current?.markAllAsRead();
  }, []);
  
  const dismiss = useCallback((id: string) => {
    managerRef.current?.dismiss(id);
  }, []);
  
  const clear = useCallback(() => {
    managerRef.current?.clear();
  }, []);
  
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    if (managerRef.current) {
      managerRef.current.updatePreferences(updates);
      setPreferences(managerRef.current.getPreferences());
    }
  }, []);
  
  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return managerRef.current?.getAll(filter) ?? notifications;
  }, [notifications, filter]);
  
  const unreadCount = stats.unread;
  
  return {
    notifications: filteredNotifications,
    unreadCount,
    stats,
    markAsRead,
    markAllAsRead,
    dismiss,
    clear,
    preferences: preferences ?? {
      enabledTypes: new Set(),
      soundEnabled: true,
      browserNotificationsEnabled: false,
      autoDismissDelay: 0,
      maxNotifications: 100,
    },
    updatePreferences,
    filter,
    setFilter,
    isWatching,
    error,
  };
}

// For adding manual notifications (e.g., from user actions)
export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>) {
  const manager = getNotificationManager();
  return manager.add(notification);
}
