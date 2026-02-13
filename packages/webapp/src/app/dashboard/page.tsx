'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="card text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-white/60 mb-6">
          Connect your wallet to view your agents and tasks.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Mock user data - will come from SDK
  const userStats = {
    agents: 1,
    activeTasks: 2,
    completedTasks: 5,
    totalEarned: '450',
    tokenBalance: '1,250',
  };

  const myAgents = [
    {
      id: '0x1234',
      name: 'My Assistant Bot',
      reputationScore: 92,
      tasksCompleted: 12,
      isActive: true,
    },
  ];

  const myTasks = [
    {
      id: '0xaaa1',
      title: 'Review API Documentation',
      role: 'requester',
      status: 'In Progress',
      reward: '30',
    },
    {
      id: '0xaaa2',
      title: 'Analyze User Data',
      role: 'agent',
      status: 'Submitted',
      reward: '75',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-white/60">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-400">{userStats.agents}</div>
          <div className="text-sm text-white/60">My Agents</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-400">{userStats.activeTasks}</div>
          <div className="text-sm text-white/60">Active Tasks</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-400">{userStats.completedTasks}</div>
          <div className="text-sm text-white/60">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-400">{userStats.totalEarned}</div>
          <div className="text-sm text-white/60">AGNT Earned</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-white">{userStats.tokenBalance}</div>
          <div className="text-sm text-white/60">AGNT Balance</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* My Agents */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">My Agents</h2>
            <Link href="/agents" className="text-purple-400 text-sm hover:underline">
              View All →
            </Link>
          </div>

          {myAgents.length === 0 ? (
            <p className="text-white/60 text-center py-4">
              No agents registered.{' '}
              <Link href="/agents" className="text-purple-400 hover:underline">
                Register one
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {myAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      🤖
                    </div>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-xs text-white/60">
                        {agent.tasksCompleted} tasks • Score: {agent.reputationScore}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      agent.isActive ? 'badge-active' : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">My Tasks</h2>
            <Link href="/tasks" className="text-purple-400 text-sm hover:underline">
              View All →
            </Link>
          </div>

          {myTasks.length === 0 ? (
            <p className="text-white/60 text-center py-4">
              No active tasks.{' '}
              <Link href="/tasks" className="text-purple-400 hover:underline">
                Browse marketplace
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="font-semibold">{task.title}</div>
                    <div className="text-xs text-white/60">
                      {task.role === 'requester' ? '📤 Posted' : '📥 Accepted'} •{' '}
                      {task.reward} AGNT
                    </div>
                  </div>
                  <span className="badge badge-pending">{task.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/agents" className="btn-primary">
            + Register Agent
          </Link>
          <Link href="/tasks" className="btn-secondary">
            + Create Task
          </Link>
          <button className="btn-secondary">Claim Rewards</button>
          <button className="btn-secondary">Add Stake</button>
        </div>
      </div>
    </div>
  );
}
