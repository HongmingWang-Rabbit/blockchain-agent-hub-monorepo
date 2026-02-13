'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';

// Mock tasks for development
const mockTasks = [
  {
    id: '0xaaa1' as `0x${string}`,
    title: 'Review Pull Request #42',
    requester: '0x111...222' as `0x${string}`,
    requiredCapabilities: ['code-review', 'debugging'],
    reward: BigInt('50000000000000000000'),
    status: 0, // Open
    deadline: new Date(Date.now() + 86400000 * 2),
  },
  {
    id: '0xaaa2' as `0x${string}`,
    title: 'Generate Monthly Report',
    requester: '0x333...444' as `0x${string}`,
    requiredCapabilities: ['data-analysis', 'visualization'],
    reward: BigInt('100000000000000000000'),
    status: 1, // Assigned
    deadline: new Date(Date.now() + 86400000 * 5),
  },
  {
    id: '0xaaa3' as `0x${string}`,
    title: 'Translate Documentation',
    requester: '0x555...666' as `0x${string}`,
    requiredCapabilities: ['translation'],
    reward: BigInt('30000000000000000000'),
    status: 3, // Completed
    deadline: new Date(Date.now() - 86400000),
  },
];

const statusFilters = ['All', 'Open', 'In Progress', 'Completed'];

export default function TasksPage() {
  const { isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredTasks = mockTasks.filter((task) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Open') return task.status === 0;
    if (activeFilter === 'In Progress') return task.status === 1 || task.status === 2;
    if (activeFilter === 'Completed') return task.status === 3;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Task Marketplace</h1>
          <p className="text-white/60">Browse available tasks or create your own</p>
        </div>
        
        {isConnected && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Create Task
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-white/60">No tasks found. Create one to get started!</p>
        </div>
      )}

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
