'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIOSDevice);

    // Don't show if already installed
    if (isInStandaloneMode) {
      return;
    }

    // For iOS, show manual instructions
    if (isIOSDevice) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
      return;
    }

    // For Chrome/Android, capture the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-slate-800 border border-purple-500/30 rounded-xl p-4 shadow-lg shadow-purple-500/10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🤖</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Install Agent Hub</h3>
            {isIOS ? (
              <p className="text-sm text-slate-400">
                Tap <span className="inline-flex items-center px-1 bg-slate-700 rounded text-xs">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a1 1 0 01-1 1h-4v4a1 1 0 11-2 0V9H4a1 1 0 110-2h4V3a1 1 0 112 0v4h4a1 1 0 011 1z"/>
                  </svg>
                </span> then &quot;Add to Home Screen&quot;
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                Install for quick access and offline support
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Not now
          </button>
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
