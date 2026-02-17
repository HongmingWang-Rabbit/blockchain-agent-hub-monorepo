'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { NOTIFICATION_TYPE_ICONS, type Notification } from '@agent-hub/sdk';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function NotificationItem({ 
  notification, 
  onRead, 
  onDismiss,
  onClose,
}: { 
  notification: Notification; 
  onRead: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const icon = NOTIFICATION_TYPE_ICONS[notification.type] || 'ℹ️';
  
  const priorityColors = {
    low: 'border-l-gray-500',
    normal: 'border-l-blue-500',
    high: 'border-l-amber-500',
    urgent: 'border-l-red-500',
  };
  
  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    if (notification.actionUrl) {
      onClose();
    }
  };
  
  const content = (
    <div
      className={`
        p-3 border-l-4 ${priorityColors[notification.priority]}
        ${notification.read ? 'bg-white/5' : 'bg-white/10'}
        hover:bg-white/15 transition-colors cursor-pointer
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium truncate ${notification.read ? 'text-white/70' : 'text-white'}`}>
              {notification.title}
            </p>
            <span className="text-xs text-white/50 flex-shrink-0">
              {formatTimeAgo(notification.timestamp)}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          {notification.actionLabel && (
            <span className="text-xs text-purple-400 mt-1 inline-block">
              {notification.actionLabel} →
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="text-white/40 hover:text-white/70 p-1 -mr-1"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
  
  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl}>
        {content}
      </Link>
    );
  }
  
  return content;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    isWatching,
  } = useNotifications();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  
  const recentNotifications = notifications.slice(0, 5);
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${isOpen ? 'bg-white/20' : 'hover:bg-white/10'}
        `}
        title={`${unreadCount} unread notifications`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Live indicator */}
        {isWatching && (
          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          
          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="divide-y divide-white/5">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={() => markAsRead(notification.id)}
                    onDismiss={() => dismiss(notification.id)}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <span className="text-4xl block mb-2">🔔</span>
                <p className="text-white/60 text-sm">No notifications yet</p>
                <p className="text-white/40 text-xs mt-1">
                  {isWatching ? 'Watching for events...' : 'Connect wallet to receive updates'}
                </p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block p-3 text-center text-sm text-purple-400 hover:bg-white/5 border-t border-white/10"
            >
              View all notifications →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
