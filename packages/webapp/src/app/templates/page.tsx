'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TASK_TEMPLATES, TaskTemplate } from '@/components/TaskTemplates';
import { CreateTaskModal } from '@/components/CreateTaskModal';

const CATEGORY_LABELS = {
  development: { label: 'Development', color: 'bg-blue-500/20 text-blue-400', icon: '💻' },
  content: { label: 'Content', color: 'bg-purple-500/20 text-purple-400', icon: '✍️' },
  data: { label: 'Data', color: 'bg-green-500/20 text-green-400', icon: '📊' },
  design: { label: 'Design', color: 'bg-pink-500/20 text-pink-400', icon: '🎨' },
  security: { label: 'Security', color: 'bg-red-500/20 text-red-400', icon: '🔐' },
};

const DIFFICULTY_LABELS = {
  easy: { label: 'Easy', color: 'text-green-400', icon: '🟢' },
  medium: { label: 'Medium', color: 'text-yellow-400', icon: '🟡' },
  hard: { label: 'Hard', color: 'text-red-400', icon: '🔴' },
};

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredTemplates = TASK_TEMPLATES.filter((template) => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.capability.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

  // Group templates by category
  const groupedTemplates = categories.reduce((acc, cat) => {
    acc[cat] = filteredTemplates.filter(t => t.category === cat);
    return acc;
  }, {} as Record<string, TaskTemplate[]>);

  const handleUseTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setShowCreateModal(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>→</span>
            <span className="text-white">Templates</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">📋 Task Templates</h1>
          <p className="text-white/60">
            Pre-built templates for common AI agent tasks. Choose a template to quickly create a task with recommended settings.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search templates by name, description, or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                All ({TASK_TEMPLATES.length})
              </button>
              {categories.map((cat) => {
                const count = TASK_TEMPLATES.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-white text-black'
                        : CATEGORY_LABELS[cat].color + ' hover:opacity-80'
                    }`}
                  >
                    {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-white/5 text-center">
            <div className="text-3xl font-bold mb-1">{TASK_TEMPLATES.length}</div>
            <div className="text-sm text-white/60">Templates</div>
          </div>
          <div className="card bg-white/5 text-center">
            <div className="text-3xl font-bold mb-1">{categories.length}</div>
            <div className="text-sm text-white/60">Categories</div>
          </div>
          <div className="card bg-white/5 text-center">
            <div className="text-3xl font-bold mb-1">
              {Math.round(TASK_TEMPLATES.reduce((sum, t) => sum + t.suggestedReward, 0) / TASK_TEMPLATES.length)}
            </div>
            <div className="text-sm text-white/60">Avg Reward (AGNT)</div>
          </div>
          <div className="card bg-white/5 text-center">
            <div className="text-3xl font-bold mb-1">
              {new Set(TASK_TEMPLATES.map(t => t.capability)).size}
            </div>
            <div className="text-sm text-white/60">Capabilities</div>
          </div>
        </div>

        {/* Templates by Category */}
        {selectedCategory ? (
          // Single category view
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS].icon}
              {CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS].label}
              <span className="text-white/50 text-sm font-normal">
                ({filteredTemplates.length} templates)
              </span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          </div>
        ) : (
          // All categories view
          <div className="space-y-8">
            {categories.map((cat) => {
              const templates = groupedTemplates[cat];
              if (templates.length === 0) return null;
              return (
                <div key={cat}>
                  <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    {CATEGORY_LABELS[cat].icon}
                    {CATEGORY_LABELS[cat].label}
                    <span className="text-white/50 text-sm font-normal">
                      ({templates.length} templates)
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onUse={handleUseTemplate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-xl font-semibold mb-2">No templates found</div>
            <p className="text-white/60">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedTemplate(null);
        }}
        initialTemplate={selectedTemplate}
      />
    </div>
  );
}

function TemplateCard({ template, onUse }: { template: TaskTemplate; onUse: (t: TaskTemplate) => void }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="card bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{template.icon}</span>
          <div>
            <h3 className="font-semibold">{template.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_LABELS[template.category].color}`}>
              {template.capability}
            </span>
          </div>
        </div>
        <span className={`text-xs ${DIFFICULTY_LABELS[template.difficulty].color}`}>
          {DIFFICULTY_LABELS[template.difficulty].icon} {DIFFICULTY_LABELS[template.difficulty].label}
        </span>
      </div>

      <p className="text-sm text-white/60 mb-4">
        {template.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <span className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
          💰 ~{template.suggestedReward} AGNT
        </span>
        <span className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
          ⏱️ {template.estimatedTime}
        </span>
        <span className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
          📅 {template.suggestedDeadlineDays} days
        </span>
      </div>

      {/* Expandable description template */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-400 hover:text-blue-300 mb-3 flex items-center gap-1"
      >
        {showDetails ? '▼' : '▶'} View description template
      </button>

      {showDetails && (
        <div className="bg-black/20 rounded-lg p-3 mb-4 text-sm">
          <pre className="whitespace-pre-wrap text-white/70 font-mono text-xs">
            {template.descriptionTemplate}
          </pre>
        </div>
      )}

      <button
        onClick={() => onUse(template)}
        className="btn-primary w-full"
      >
        Use Template
      </button>
    </div>
  );
}
