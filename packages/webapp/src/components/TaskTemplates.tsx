'use client';

import { useState } from 'react';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  capability: string;
  suggestedReward: number;
  suggestedDeadlineDays: number;
  descriptionTemplate: string;
  icon: string;
  category: 'development' | 'content' | 'data' | 'design' | 'security';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // Development
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for bugs, best practices, and improvements',
    capability: 'code-review',
    suggestedReward: 25,
    suggestedDeadlineDays: 3,
    descriptionTemplate: 'Review the following code/PR for:\n- Bugs and potential issues\n- Best practices adherence\n- Performance optimizations\n- Security vulnerabilities\n- Code style consistency',
    icon: '🔍',
    category: 'development',
    difficulty: 'medium',
    estimatedTime: '2-4 hours',
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Identify and fix bugs in existing code',
    capability: 'debugging',
    suggestedReward: 50,
    suggestedDeadlineDays: 5,
    descriptionTemplate: 'Bug Description:\n[Describe the bug]\n\nExpected Behavior:\n[What should happen]\n\nActual Behavior:\n[What currently happens]\n\nSteps to Reproduce:\n1. \n2. \n3. \n\nEnvironment:\n- OS: \n- Version: ',
    icon: '🐛',
    category: 'development',
    difficulty: 'medium',
    estimatedTime: '4-8 hours',
  },
  {
    id: 'smart-contract-audit',
    name: 'Smart Contract Audit',
    description: 'Security audit for Solidity smart contracts',
    capability: 'security-audit',
    suggestedReward: 200,
    suggestedDeadlineDays: 7,
    descriptionTemplate: 'Audit the following smart contract(s) for:\n- Reentrancy vulnerabilities\n- Integer overflow/underflow\n- Access control issues\n- Gas optimization opportunities\n- Logic errors\n- Centralization risks\n\nContract Address/Repo:\n[Link here]\n\nDeliverables:\n- Detailed audit report\n- Severity classifications\n- Remediation recommendations',
    icon: '🔐',
    category: 'security',
    difficulty: 'hard',
    estimatedTime: '1-3 days',
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    description: 'Integrate with external APIs or services',
    capability: 'api-integration',
    suggestedReward: 75,
    suggestedDeadlineDays: 5,
    descriptionTemplate: 'API Integration Requirements:\n\nAPI to integrate:\n[API name/documentation link]\n\nRequired endpoints:\n- \n- \n\nExpected functionality:\n- \n\nAuthentication method:\n[OAuth, API Key, etc.]\n\nError handling requirements:\n- ',
    icon: '🔌',
    category: 'development',
    difficulty: 'medium',
    estimatedTime: '4-8 hours',
  },
  {
    id: 'testing',
    name: 'Write Tests',
    description: 'Write unit tests, integration tests, or E2E tests',
    capability: 'testing',
    suggestedReward: 40,
    suggestedDeadlineDays: 4,
    descriptionTemplate: 'Testing Requirements:\n\nCode/Module to test:\n[Link/description]\n\nTest type: [ ] Unit [ ] Integration [ ] E2E\n\nTest framework: \n\nCoverage target: %\n\nSpecific scenarios to cover:\n- \n- \n- \n\nEdge cases:\n- ',
    icon: '🧪',
    category: 'development',
    difficulty: 'medium',
    estimatedTime: '4-6 hours',
  },
  // Content
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Write technical documentation or guides',
    capability: 'documentation',
    suggestedReward: 30,
    suggestedDeadlineDays: 5,
    descriptionTemplate: 'Documentation Type:\n[ ] API Reference\n[ ] User Guide\n[ ] README\n[ ] Architecture Docs\n[ ] Tutorial\n\nSubject:\n[What needs documenting]\n\nTarget audience:\n[ ] Developers [ ] End users [ ] Both\n\nFormat requirements:\n- \n\nExisting resources:\n[Links to related docs/code]',
    icon: '📚',
    category: 'content',
    difficulty: 'easy',
    estimatedTime: '2-4 hours',
  },
  {
    id: 'content-writing',
    name: 'Content Writing',
    description: 'Write blog posts, articles, or marketing content',
    capability: 'content-writing',
    suggestedReward: 35,
    suggestedDeadlineDays: 4,
    descriptionTemplate: 'Content Type:\n[ ] Blog post [ ] Article [ ] Thread [ ] Newsletter\n\nTopic:\n[Main subject]\n\nTarget audience:\n[Who is this for]\n\nTone:\n[ ] Professional [ ] Casual [ ] Technical [ ] Educational\n\nWord count: approximately\n\nKey points to cover:\n- \n- \n\nSEO keywords (if applicable):\n- ',
    icon: '✍️',
    category: 'content',
    difficulty: 'easy',
    estimatedTime: '2-3 hours',
  },
  {
    id: 'translation',
    name: 'Translation',
    description: 'Translate content between languages',
    capability: 'translation',
    suggestedReward: 25,
    suggestedDeadlineDays: 3,
    descriptionTemplate: 'Translation Request:\n\nSource language:\nTarget language:\n\nContent type:\n[ ] Technical [ ] Marketing [ ] Legal [ ] General\n\nWord count: approximately\n\nSource material:\n[Text or link]\n\nGlossary/terminology requirements:\n[Any specific terms to use]',
    icon: '🌐',
    category: 'content',
    difficulty: 'easy',
    estimatedTime: '1-4 hours',
  },
  // Data
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Analyze datasets and provide insights',
    capability: 'data-analysis',
    suggestedReward: 60,
    suggestedDeadlineDays: 5,
    descriptionTemplate: 'Data Analysis Request:\n\nDataset description:\n[What data, size, format]\n\nAnalysis objectives:\n- \n- \n\nKey questions to answer:\n1. \n2. \n3. \n\nVisualization requirements:\n[ ] Charts [ ] Dashboards [ ] Reports\n\nDeliverables:\n- Summary findings\n- Supporting visualizations\n- Raw analysis data',
    icon: '📊',
    category: 'data',
    difficulty: 'medium',
    estimatedTime: '4-8 hours',
  },
  {
    id: 'data-extraction',
    name: 'Data Extraction',
    description: 'Extract and structure data from various sources',
    capability: 'data-extraction',
    suggestedReward: 45,
    suggestedDeadlineDays: 4,
    descriptionTemplate: 'Data Extraction Request:\n\nSource(s):\n[URLs, files, APIs]\n\nData points to extract:\n- \n- \n- \n\nOutput format:\n[ ] JSON [ ] CSV [ ] Database [ ] Other: \n\nVolume: approximately records\n\nFrequency:\n[ ] One-time [ ] Recurring',
    icon: '⛏️',
    category: 'data',
    difficulty: 'medium',
    estimatedTime: '2-6 hours',
  },
  // Design
  {
    id: 'ui-design',
    name: 'UI Design',
    description: 'Design user interfaces and mockups',
    capability: 'ui-design',
    suggestedReward: 80,
    suggestedDeadlineDays: 7,
    descriptionTemplate: 'UI Design Request:\n\nProject type:\n[ ] Web app [ ] Mobile app [ ] Dashboard [ ] Landing page\n\nDesign scope:\n[ ] Wireframes [ ] High-fidelity mockups [ ] Prototypes\n\nScreens needed:\n- \n- \n\nBrand guidelines:\n[Link or describe]\n\nInspiration/references:\n- \n\nDeliverables:\n[ ] Figma [ ] Sketch [ ] Adobe XD',
    icon: '🎨',
    category: 'design',
    difficulty: 'medium',
    estimatedTime: '1-2 days',
  },
  {
    id: 'research',
    name: 'Research Task',
    description: 'Research topics and compile findings',
    capability: 'research',
    suggestedReward: 35,
    suggestedDeadlineDays: 5,
    descriptionTemplate: 'Research Request:\n\nTopic:\n[Main subject]\n\nResearch questions:\n1. \n2. \n3. \n\nScope:\n[ ] Market research [ ] Technical research [ ] Competitive analysis [ ] Academic\n\nDeliverables:\n- Executive summary\n- Detailed findings\n- Sources/citations\n\nFormat: [ ] Report [ ] Presentation [ ] Spreadsheet',
    icon: '🔬',
    category: 'content',
    difficulty: 'easy',
    estimatedTime: '3-6 hours',
  },
];

const CATEGORY_LABELS = {
  development: { label: 'Development', color: 'bg-blue-500/20 text-blue-400' },
  content: { label: 'Content', color: 'bg-purple-500/20 text-purple-400' },
  data: { label: 'Data', color: 'bg-green-500/20 text-green-400' },
  design: { label: 'Design', color: 'bg-pink-500/20 text-pink-400' },
  security: { label: 'Security', color: 'bg-red-500/20 text-red-400' },
};

const DIFFICULTY_LABELS = {
  easy: { label: 'Easy', color: 'text-green-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  hard: { label: 'Hard', color: 'text-red-400' },
};

interface TaskTemplatesProps {
  onSelect: (template: TaskTemplate) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskTemplates({ onSelect, isOpen, onClose }: TaskTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = TASK_TEMPLATES.filter((template) => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.capability.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative card max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📋 Task Templates</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        <p className="text-white/60 mb-4">
          Choose a template to quickly create a task with pre-filled details.
        </p>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedCategory === null
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === cat
                  ? CATEGORY_LABELS[cat].color.replace('/20', '').replace('text-', 'bg-') + ' text-white'
                  : CATEGORY_LABELS[cat].color + ' hover:opacity-80'
              }`}
            >
              {CATEGORY_LABELS[cat].label}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
                className="card bg-white/5 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{template.icon}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_LABELS[template.category].color}`}>
                    {CATEGORY_LABELS[template.category].label}
                  </span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-white/60 mb-3 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-white/10 px-2 py-0.5 rounded">
                    💰 ~{template.suggestedReward} AGNT
                  </span>
                  <span className="bg-white/10 px-2 py-0.5 rounded">
                    ⏱️ {template.estimatedTime}
                  </span>
                  <span className={DIFFICULTY_LABELS[template.difficulty].color}>
                    {DIFFICULTY_LABELS[template.difficulty].label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-white/40">
              No templates found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact inline template picker
export function TaskTemplatesPicker({ onSelect }: { onSelect: (template: TaskTemplate) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TASK_TEMPLATES.slice(0, 6).map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
          title={template.description}
        >
          <span>{template.icon}</span>
          <span>{template.name}</span>
        </button>
      ))}
    </div>
  );
}
