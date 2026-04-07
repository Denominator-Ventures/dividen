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
                'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                activeTab === tab.id
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
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
