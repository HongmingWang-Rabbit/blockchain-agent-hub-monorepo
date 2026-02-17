'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_ICONS,
  PRIORITY_COLORS,
  type NotificationType,
  type NotificationPriority,
  type Notification,
} from '@agent-hub/sdk';

const ALL_TYPES: NotificationType[] = [
  'task_assigned', 'task_submitted', 'task_completed', 'task_cancelled',
  'badge_earned', 'payment_received', 'workflow_update',
  'governance_proposal', 'agent_slashed', 'system',
];

const ALL_PRIORITIES: NotificationPriority[] = ['urgent', 'high', 'normal', 'low'];

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function NotificationCard({
  notification,
  onRead,
  onDismiss,
  onDelete,
}: {
  notification: Notification;
  onRead: () => void;
  onDismiss: () => void;
  onDelete: () => void;
}) {
  const icon = NOTIFICATION_TYPE_ICONS[notification.type] || 'ℹ️';
  const typeLabel = NOTIFICATION_TYPE_LABELS[notification.type] || notification.type;
  
  const priorityStyles = {
    low: 'border-gray-500/50 bg-gray-500/10',
    normal: 'border-blue-500/50 bg-blue-500/10',
    high: 'border-amber-500/50 bg-amber-500/10',
    urgent: 'border-red-500/50 bg-red-500/10 animate-pulse',
  };
  
  return (
    <div
      className={`
        rounded-xl border-2 p-4 transition-all
        ${notification.read ? 'opacity-70' : ''}
        ${priorityStyles[notification.priority]}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0">{icon}</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={`font-semibold ${notification.read ? 'text-white/70' : 'text-white'}`}>
              {notification.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {typeLabel}
            </span>
            {!notification.read && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                New
              </span>
            )}
          </div>
          
          <p className="text-white/70 text-sm mb-2">{notification.message}</p>
          
          {/* Data */}
          {notification.data && (
            <div className="flex flex-wrap gap-2 text-xs text-white/50 mb-2">
              {notification.data.taskId && (
                <span>Task: {notification.data.taskId.slice(0, 10)}...</span>
              )}
              {notification.data.agentId && (
                <span>Agent: {notification.data.agentId.slice(0, 10)}...</span>
              )}
              {notification.data.amount && (
                <span className="text-green-400">
                  {(Number(notification.data.amount) / 1e18).toFixed(2)} AGNT
                </span>
              )}
              {notification.data.transactionHash && (
                <a
                  href={`https://hashkeyscan-testnet.hk/tx/${notification.data.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  View Tx ↗
                </a>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40" title={formatDate(notification.timestamp)}>
              {formatTimeAgo(notification.timestamp)}
            </span>
            
            <div className="flex items-center gap-2">
              {notification.actionUrl && (
                <Link
                  href={notification.actionUrl}
                  className="text-xs px-3 py-1 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg text-purple-300 transition-colors"
                >
                  {notification.actionLabel || 'View'} →
                </Link>
              )}
              {!notification.read && (
                <button
                  onClick={onRead}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
                >
                  Mark Read
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm transition-colors
        ${selected
          ? 'bg-purple-500 text-white'
          : 'bg-white/10 text-white/70 hover:bg-white/20'
        }
      `}
    >
      {label}
    </button>
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    stats,
    markAsRead,
    markAllAsRead,
    dismiss,
    clear,
    preferences,
    updatePreferences,
    filter,
    setFilter,
    isWatching,
    error,
  } = useNotifications();
  
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<NotificationType>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<NotificationPriority>>(new Set());
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  
  // Apply filters
  const filteredNotifications = notifications.filter((n) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(n.type)) return false;
    if (selectedPriorities.size > 0 && !selectedPriorities.has(n.priority)) return false;
    if (showUnreadOnly && n.read) return false;
    return true;
  });
  
  const toggleType = (type: NotificationType) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };
  
  const togglePriority = (priority: NotificationPriority) => {
    const newPriorities = new Set(selectedPriorities);
    if (newPriorities.has(priority)) {
      newPriorities.delete(priority);
    } else {
      newPriorities.add(priority);
    }
    setSelectedPriorities(newPriorities);
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🔔 Notifications
            {isWatching && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-normal">
                ● Live
              </span>
            )}
          </h1>
          <p className="text-white/60 mt-1">
            {stats.total} total • {unreadCount} unread
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
            >
              Mark All Read
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`
              px-4 py-2 rounded-lg text-sm transition-colors
              ${showSettings ? 'bg-purple-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80'}
            `}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
          <h3 className="font-semibold text-white">Notification Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-white/80">🔊 Sound notifications</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.browserNotificationsEnabled}
                onChange={(e) => {
                  if (e.target.checked && Notification.permission !== 'granted') {
                    Notification.requestPermission().then((permission) => {
                      updatePreferences({ browserNotificationsEnabled: permission === 'granted' });
                    });
                  } else {
                    updatePreferences({ browserNotificationsEnabled: e.target.checked });
                  }
                }}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-white/80">🌐 Browser notifications</span>
            </label>
          </div>
          
          <div>
            <p className="text-white/60 text-sm mb-2">Enabled notification types:</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.enabledTypes.has(type)}
                    onChange={(e) => {
                      const newTypes = new Set(preferences.enabledTypes);
                      if (e.target.checked) {
                        newTypes.add(type);
                      } else {
                        newTypes.delete(type);
                      }
                      updatePreferences({ enabledTypes: newTypes });
                    }}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-white/70 text-sm">
                    {NOTIFICATION_TYPE_ICONS[type]} {NOTIFICATION_TYPE_LABELS[type]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => {
                if (confirm('Clear all notifications? This cannot be undone.')) {
                  clear();
                }
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
            >
              🗑️ Clear All Notifications
            </button>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/60 text-sm">Filter by type:</span>
          <FilterChip
            label="All"
            selected={selectedTypes.size === 0}
            onClick={() => setSelectedTypes(new Set())}
          />
          {ALL_TYPES.slice(0, 6).map((type) => (
            <FilterChip
              key={type}
              label={`${NOTIFICATION_TYPE_ICONS[type]} ${NOTIFICATION_TYPE_LABELS[type]}`}
              selected={selectedTypes.has(type)}
              onClick={() => toggleType(type)}
            />
          ))}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/60 text-sm">Priority:</span>
          <FilterChip
            label="All"
            selected={selectedPriorities.size === 0}
            onClick={() => setSelectedPriorities(new Set())}
          />
          {ALL_PRIORITIES.map((priority) => (
            <FilterChip
              key={priority}
              label={priority.charAt(0).toUpperCase() + priority.slice(1)}
              selected={selectedPriorities.has(priority)}
              onClick={() => togglePriority(priority)}
            />
          ))}
          <span className="mx-2 text-white/30">|</span>
          <FilterChip
            label="Unread only"
            selected={showUnreadOnly}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          />
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats.byPriority || {}).map(([priority, count]) => (
          <div
            key={priority}
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <div className="text-2xl font-bold text-white">{count}</div>
            <div className="text-sm text-white/60 capitalize">{priority} Priority</div>
          </div>
        ))}
      </div>
      
      {/* Notification List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead(notification.id)}
              onDismiss={() => dismiss(notification.id)}
              onDelete={() => dismiss(notification.id)}
            />
          ))
        ) : (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <span className="text-6xl block mb-4">🔔</span>
            <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
            <p className="text-white/60">
              {selectedTypes.size > 0 || selectedPriorities.size > 0 || showUnreadOnly
                ? 'No notifications match your filters'
                : isWatching
                ? 'Watching for new events...'
                : 'Connect your wallet to receive notifications'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
