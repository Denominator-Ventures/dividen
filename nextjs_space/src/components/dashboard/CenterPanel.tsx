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
import { JobBoardView } from './JobBoardView';
import { ExtensionsView } from './ExtensionsView';

interface CenterPanelProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
}

/* ── Tab Organization ──────────────────────────────────────── */
/*  Primary row:  Chat · Board · CRM · Calendar · Goals        */
/*                | Network ▾ | Messages ▾ | Drive | Extensions */
/*  Sub-row:      Network  → Connections · Teams · Jobs         */
/*                Messages → Inbox · Recordings                 */

const primaryTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'kanban', label: 'Board', icon: '📋' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
];

const networkTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'connections', label: 'Connections', icon: '🔗' },
  { id: 'teams', label: 'Teams', icon: '🏢' },
  { id: 'jobs', label: 'Jobs', icon: '💼' },
];

const messagesTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: '📧' },
  { id: 'recordings', label: 'Recordings', icon: '🎙️' },
];

const networkTabIds = new Set(networkTabs.map((t) => t.id));
const messagesTabIds = new Set(messagesTabs.map((t) => t.id));

/* ── Component ─────────────────────────────────────────────── */

export function CenterPanel({ activeTab, onTabChange }: CenterPanelProps) {
  const isNetworkActive = networkTabIds.has(activeTab);
  const isMessagesActive = messagesTabIds.has(activeTab);
  const hasSubRow = isNetworkActive || isMessagesActive;
  const activeSubTabs = isNetworkActive ? networkTabs : isMessagesActive ? messagesTabs : [];

  const tabClass = (active: boolean) =>
    cn(
      'px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0',
      active
        ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
    );

  return (
    <div className="panel h-full flex flex-col">
      {/* ── Primary Tab Bar ── */}
      <div className="panel-header flex-col !gap-0 !pb-0">
        <div className="flex items-center gap-1 w-full overflow-x-auto pb-2">
          {/* Core tabs */}
          {primaryTabs.map((tab) => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={tabClass(activeTab === tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

          {/* Network group */}
          <button
            onClick={() => onTabChange(isNetworkActive ? activeTab : 'connections')}
            className={tabClass(isNetworkActive)}
          >
            🌐 Network
          </button>

          {/* Messages group (Inbox + Recordings) */}
          <button
            onClick={() => onTabChange(isMessagesActive ? activeTab : 'inbox')}
            className={tabClass(isMessagesActive)}
          >
            📨 Messages
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

          {/* Drive — standalone */}
          <button onClick={() => onTabChange('drive')} className={tabClass(activeTab === 'drive')}>
            📁 Drive
          </button>

          {/* Extensions — standalone */}
          <button onClick={() => onTabChange('extensions')} className={tabClass(activeTab === 'extensions')}>
            🧩 Extensions
          </button>
        </div>

        {/* ── Sub-tabs (Network or Messages) ── */}
        {hasSubRow && (
          <div className="flex gap-1 w-full border-t border-[var(--border-color)] pt-1.5 pb-1.5 px-1">
            {activeSubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded transition-all',
                  activeTab === tab.id
                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab Content ── */}
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
        {activeTab === 'jobs' && <JobBoardView />}
        {activeTab === 'extensions' && <ExtensionsView />}
      </div>
    </div>
  );
}
