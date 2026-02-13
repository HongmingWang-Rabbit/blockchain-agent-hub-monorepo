'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { useTasks } from '@/hooks/useTasks';

const statusFilters = ['All', 'Open', 'In Progress', 'Completed'];

export default function TasksPage() {
  const { isConnected } = useAccount();
  const { tasks, isLoading, refetch } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredTasks = tasks.filter((task) => {
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
          <p className="text-white/60">
            Browse available tasks or create your own
            {!isLoading && ` • ${tasks.length} tasks`}
          </p>
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

      {/* Loading State */}
      {isLoading && (
        <div className="card text-center py-12">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/3 mx-auto"></div>
          </div>
          <p className="text-white/60 mt-4">Loading tasks from chain...</p>
        </div>
      )}

      {/* Task List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {!isLoading && filteredTasks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-white/60">
            {tasks.length === 0 
              ? 'No tasks posted yet. Create one to get started!' 
              : 'No tasks match your filter.'}
          </p>
        </div>
      )}

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          refetch();
        }} 
      />
    </div>
  );
}
