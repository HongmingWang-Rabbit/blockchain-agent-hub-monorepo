'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import Link from 'next/link';

interface UserStats {
  agentsOwned: number;
  tasksCreated: number;
  tasksCompleted: number;
  totalEarnings: bigint;
  totalSpent: bigint;
  reputation: number;
}

interface NotificationPreferences {
  taskAssigned: boolean;
  taskCompleted: boolean;
  badgeEarned: boolean;
  governanceProposals: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
}

export default function SettingsPage() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: nativeBalance } = useBalance({ address });
  
  const [agntBalance, setAgntBalance] = useState<bigint>(0n);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification preferences (persisted in localStorage)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification-preferences');
      if (saved) return JSON.parse(saved);
    }
    return {
      taskAssigned: true,
      taskCompleted: true,
      badgeEarned: true,
      governanceProposals: false,
      browserNotifications: false,
      soundEnabled: true,
    };
  });

  // Theme preference
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Network info
  const networks = [
    { id: 133, name: 'HashKey Testnet', rpc: 'https://hashkeychain-testnet.alt.technology' },
    { id: 177, name: 'HashKey Mainnet', rpc: 'https://mainnet.hashkeychain.com' },
  ];

  const currentNetwork = networks.find(n => n.id === chainId) || networks[0];
  const isTestnet = chainId === 133;

  // Save notification preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-preferences', JSON.stringify(notifPrefs));
    }
  }, [notifPrefs]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifPrefs(prev => ({ ...prev, browserNotifications: true }));
        // Show test notification
        new Notification('Agent Hub', {
          body: 'Browser notifications enabled!',
          icon: '/favicon.ico',
        });
      }
    }
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      // Could show toast here
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Update notification preference
  const updateNotifPref = (key: keyof NotificationPreferences, value: boolean) => {
    setNotifPrefs(prev => ({ ...prev, [key]: value }));
  };

  // Clear all local data
  const clearLocalData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notification-preferences');
      localStorage.removeItem('notifications-storage');
      localStorage.removeItem('agent-hub-theme');
      window.location.reload();
    }
  };

  // Export settings
  const exportSettings = () => {
    const data = {
      notificationPreferences: notifPrefs,
      theme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-hub-settings.json';
    a.click();
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">⚙️ Settings</h1>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to access settings</p>
            <p className="text-sm text-gray-500">
              Your wallet connection allows you to manage your agents, tasks, and preferences.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">⚙️ Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account and preferences</p>

        {/* Account Section */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>👤</span> Account
          </h2>
          
          <div className="space-y-4">
            {/* Wallet Address */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Connected Wallet</p>
                <p className="font-mono text-lg">{formatAddress(address!)}</p>
              </div>
              <button 
                onClick={copyAddress}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition"
              >
                📋 Copy
              </button>
            </div>

            {/* Connector Info */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Wallet Provider</p>
                <p className="text-lg">{connector?.name || 'Unknown'}</p>
              </div>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
                Connected
              </span>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">HSK Balance</p>
                <p className="text-xl font-semibold">
                  {nativeBalance ? formatEther(nativeBalance.value).slice(0, 8) : '0.00'} HSK
                </p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">AGNT Balance</p>
                <p className="text-xl font-semibold">
                  {formatEther(agntBalance).slice(0, 8)} AGNT
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Network Section */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🌐</span> Network
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Current Network</p>
                <p className="text-lg flex items-center gap-2">
                  {currentNetwork.name}
                  {isTestnet ? (
                    <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                      Testnet
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">
                      Mainnet
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm text-gray-400 font-mono">Chain ID: {chainId}</p>
            </div>

            {/* Network Switcher */}
            <div className="grid grid-cols-2 gap-4">
              {networks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => switchChain?.({ chainId: network.id })}
                  disabled={chainId === network.id || isSwitching}
                  className={`p-4 rounded-lg transition ${
                    chainId === network.id
                      ? 'bg-purple-600/30 border-2 border-purple-500'
                      : 'bg-gray-700/50 hover:bg-gray-600/50 border-2 border-transparent'
                  } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className="font-semibold">{network.name}</p>
                  <p className="text-sm text-gray-400">Chain ID: {network.id}</p>
                </button>
              ))}
            </div>

            {isTestnet && (
              <div className="p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ You&apos;re on testnet. Tokens have no real value. 
                  <Link href="https://faucet.hashkey.cloud" target="_blank" className="underline ml-1">
                    Get testnet HSK →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🔔</span> Notifications
          </h2>
          
          <div className="space-y-3">
            {/* Browser Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium">Browser Notifications</p>
                <p className="text-sm text-gray-400">Receive alerts even when tab is inactive</p>
              </div>
              {notifPrefs.browserNotifications ? (
                <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
                  Enabled
                </span>
              ) : (
                <button
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Notification Types */}
            {[
              { key: 'taskAssigned', label: 'Task Assigned', desc: 'When your agent is assigned a task' },
              { key: 'taskCompleted', label: 'Task Completed', desc: 'When a task you created is completed' },
              { key: 'badgeEarned', label: 'Badge Earned', desc: 'When your agent earns a new badge' },
              { key: 'governanceProposals', label: 'Governance', desc: 'New proposals and voting results' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => updateNotifPref(key as keyof NotificationPreferences, !notifPrefs[key as keyof NotificationPreferences])}
                  className={`w-12 h-6 rounded-full transition relative ${
                    notifPrefs[key as keyof NotificationPreferences] ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notifPrefs[key as keyof NotificationPreferences] ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium">Notification Sounds</p>
                <p className="text-sm text-gray-400">Play sound for new notifications</p>
              </div>
              <button
                onClick={() => updateNotifPref('soundEnabled', !notifPrefs.soundEnabled)}
                className={`w-12 h-6 rounded-full transition relative ${
                  notifPrefs.soundEnabled ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifPrefs.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🔗</span> Quick Links
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/agents" 
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-center transition"
            >
              <p className="text-2xl mb-1">🤖</p>
              <p className="text-sm">My Agents</p>
            </Link>
            <Link 
              href="/tasks" 
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-center transition"
            >
              <p className="text-2xl mb-1">📋</p>
              <p className="text-sm">My Tasks</p>
            </Link>
            <Link 
              href="/notifications" 
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-center transition"
            >
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-sm">Notifications</p>
            </Link>
            <Link 
              href="/webhooks" 
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-center transition"
            >
              <p className="text-2xl mb-1">🪝</p>
              <p className="text-sm">Webhooks</p>
            </Link>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💾</span> Data Management
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
            >
              📥 Export Settings
            </button>
            <button
              onClick={clearLocalData}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition"
            >
              🗑️ Clear Local Data
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Local data includes notification preferences and cached notifications.
            Blockchain data (agents, tasks, etc.) is stored on-chain and unaffected.
          </p>
        </section>

        {/* Contract Addresses */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📜</span> Contract Addresses
          </h2>
          
          <p className="text-sm text-gray-400 mb-4">
            {isTestnet ? 'HashKey Testnet (chainId: 133)' : 'HashKey Mainnet (chainId: 177)'}
          </p>
          
          <div className="space-y-2 font-mono text-sm">
            {[
              { name: 'AGNT Token', address: '0x7379C9d687F8c22d41be43fE510F8225afF253f6' },
              { name: 'Agent Registry', address: '0xb044E947E8eCf2d954E9C1e26970bEe128e9EB49' },
              { name: 'Task Marketplace', address: '0x7907ec09f1d1854Fd4dA26E1a9e357Fd0d797061' },
              { name: 'Agent NFT', address: '0x4476e726B4030923bD29C98F8881Da2727B6a0B6' },
              { name: 'Workflow Engine', address: '0x1c3e038fE4491d5e76673FFC9a02f90F85e3AEEd' },
            ].map(({ name, address }) => (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-700/30 rounded">
                <span className="text-gray-400">{name}</span>
                <span className="text-gray-300">{formatAddress(address)}</span>
              </div>
            ))}
          </div>
          
          <Link 
            href="/about"
            className="inline-block mt-4 text-purple-400 hover:text-purple-300 text-sm"
          >
            View all contracts →
          </Link>
        </section>
      </div>
    </main>
  );
}
