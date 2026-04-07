'use client';

import type { CenterTab } from '@/types';
import { cn } from '@/lib/utils';
import { ChatView } from './ChatView';
import { KanbanView } from './KanbanView';
import { CrmView } from './CrmView';

interface CenterPanelProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
}

const tabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'kanban', label: 'Kanban', icon: '📋' },
  { id: 'crm', label: 'CRM', icon: '👥' },
];

export function CenterPanel({ activeTab, onTabChange }: CenterPanelProps) {
  return (
    <div className="panel h-full flex flex-col">
      {/* Tab Bar */}
      <div className="panel-header">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'kanban' && <KanbanView />}
        {activeTab === 'crm' && <CrmView />}
      </div>
    </div>
  );
}
