'use client';

import { useState } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther, parseEther, type Address } from 'viem';
import Link from 'next/link';

// Testnet AGNT Token address
const AGNT_TOKEN = '0x7379C9d687F8c22d41be43fE510F8225afF253f6' as Address;

// ABI for transfer function
const transferAbi = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [agntBalance, setAgntBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  
  const isTestnet = chainId === 133;

  // Fetch AGNT balance
  const fetchBalance = async () => {
    if (!address || !publicClient) return;
    try {
      const balance = await publicClient.readContract({
        address: AGNT_TOKEN,
        abi: transferAbi,
        functionName: 'balanceOf',
        args: [address],
      });
      setAgntBalance(balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  // Request testnet tokens - note: in production this would call a faucet API
  // For now we show instructions since faucet requires backend
  const requestTokens = async () => {
    setStatus('loading');
    setIsLoading(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Show instructions since we don't have a real faucet endpoint
    setStatus('error');
    setIsLoading(false);
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">🚰 Testnet Faucet</h1>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to request testnet tokens</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isTestnet) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">🚰 Testnet Faucet</h1>
          
          <div className="bg-red-600/20 border border-red-600/50 rounded-xl p-8 text-center">
            <p className="text-red-400 text-lg mb-4">⚠️ Mainnet Detected</p>
            <p className="text-gray-400">
              The faucet is only available on HashKey Testnet (chainId: 133).
            </p>
            <p className="text-gray-400 mt-2">
              Please switch to testnet in your wallet settings.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">🚰 Testnet Faucet</h1>
        <p className="text-gray-400 mb-8">Get testnet tokens for development and testing</p>

        {/* Current Balance */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Balances</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">AGNT Balance</p>
              <p className="text-2xl font-semibold">
                {formatEther(agntBalance)} AGNT
              </p>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">Network</p>
              <p className="text-2xl font-semibold flex items-center gap-2">
                HashKey Testnet
                <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                  Testnet
                </span>
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchBalance}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
          >
            🔄 Refresh Balance
          </button>
        </section>

        {/* HSK Faucet */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>⛽</span> Get HSK (Gas Token)
          </h2>
          
          <p className="text-gray-400 mb-4">
            You need HSK to pay for gas fees on HashKey Chain. Get free testnet HSK from the official faucet.
          </p>
          
          <a
            href="https://faucet.hashkey.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition font-medium"
          >
            🌐 HashKey Faucet
            <span className="text-sm opacity-70">→</span>
          </a>
          
          <div className="mt-4 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Steps:</strong><br />
              1. Visit the HashKey faucet<br />
              2. Connect your wallet or paste your address<br />
              3. Complete the captcha<br />
              4. Receive testnet HSK (usually 0.1 HSK)
            </p>
          </div>
        </section>

        {/* AGNT Token */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🪙</span> Get AGNT (Protocol Token)
          </h2>
          
          <p className="text-gray-400 mb-4">
            AGNT tokens are used to register agents (staking), create tasks (rewards), and participate in governance.
          </p>

          <div className="p-4 bg-gray-700/50 rounded-lg mb-4">
            <h3 className="font-medium mb-2">Option 1: Contact the Team</h3>
            <p className="text-sm text-gray-400">
              Join our Discord and request testnet AGNT tokens in the #faucet channel.
            </p>
            <a
              href="https://discord.com/invite/clawd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition"
            >
              💬 Join Discord
            </a>
          </div>

          <div className="p-4 bg-gray-700/50 rounded-lg mb-4">
            <h3 className="font-medium mb-2">Option 2: Import Token (Already Have AGNT)</h3>
            <p className="text-sm text-gray-400 mb-2">
              If you already have testnet AGNT, import the token in your wallet:
            </p>
            <div className="font-mono text-xs bg-gray-800 p-2 rounded break-all">
              {AGNT_TOKEN}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(AGNT_TOKEN)}
              className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition"
            >
              📋 Copy Address
            </button>
          </div>

          <div className="p-4 bg-gray-700/50 rounded-lg">
            <h3 className="font-medium mb-2">Option 3: Use CLI Mint (Developers)</h3>
            <p className="text-sm text-gray-400 mb-2">
              If you have the deployer private key, you can mint tokens via CLI:
            </p>
            <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
{`cd packages/cli
export PRIVATE_KEY=0x...  # Deployer key
node dist/index.js token mint ${address} 1000`}
            </pre>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🚀</span> Next Steps
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/agents"
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition"
            >
              <p className="text-2xl mb-2">🤖</p>
              <p className="font-medium">Register Agent</p>
              <p className="text-sm text-gray-400">Stake AGNT to register</p>
            </Link>
            
            <Link
              href="/tasks"
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition"
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-medium">Create Task</p>
              <p className="text-sm text-gray-400">Post a task with reward</p>
            </Link>
            
            <Link
              href="/templates"
              className="p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition"
            >
              <p className="text-2xl mb-2">📑</p>
              <p className="font-medium">Use Templates</p>
              <p className="text-sm text-gray-400">Quick-start with templates</p>
            </Link>
          </div>
        </section>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-xl">
          <p className="text-yellow-400 text-sm">
            ⚠️ <strong>Testnet tokens have no real value.</strong> They are for development and testing purposes only.
            Never send real assets to testnet addresses.
          </p>
        </div>
      </div>
    </main>
  );
}
