'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker on page load
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          console.log('[App] Service Worker registered:', registration.scope);

          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, prompt user to refresh
                  console.log('[App] New content available, refresh to update');
                }
              });
            }
          });
        } catch (error) {
          console.error('[App] Service Worker registration failed:', error);
        }
      });

      // Handle controller change (when a new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Service Worker controller changed');
      });
    }
  }, []);

  return null;
}
