'use client';

import type { CenterTab } from '@/types';
import { cn } from '@/lib/utils';
import { ChatView } from './ChatView';
import { KanbanView } from './KanbanView';
import { CrmView } from './CrmView';
import { RecordingsView } from './RecordingsView';
import { DriveView } from './DriveView';
import { CalendarView } from './CalendarView';
import { InboxView } from './InboxView';
import { ConnectionsView } from './ConnectionsView';
import { TeamsView } from './TeamsView';
import { GoalsView } from './GoalsView';
import { ExtensionsView } from './ExtensionsView';

interface CenterPanelProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
}

const tabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'kanban', label: 'Board', icon: '📋' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'inbox', label: 'Inbox', icon: '📧' },
  { id: 'recordings', label: 'Recordings', icon: '🎙️' },
  { id: 'drive', label: 'Drive', icon: '📁' },
  { id: 'connections', label: 'Connections', icon: '🔗' },
  { id: 'teams', label: 'Teams', icon: '👥' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'extensions', label: 'Extensions', icon: '🧩' },
];

export function CenterPanel({ activeTab, onTabChange }: CenterPanelProps) {
  return (
    <div className="panel h-full flex flex-col">
      {/* Tab Bar */}
      <div className="panel-header">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0',
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
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'inbox' && <InboxView />}
        {activeTab === 'recordings' && <RecordingsView />}
        {activeTab === 'drive' && <DriveView />}
        {activeTab === 'connections' && <ConnectionsView />}
        {activeTab === 'teams' && <TeamsView />}
        {activeTab === 'goals' && <GoalsView />}
        {activeTab === 'extensions' && <ExtensionsView />}
      </div>
    </div>
  );
}
