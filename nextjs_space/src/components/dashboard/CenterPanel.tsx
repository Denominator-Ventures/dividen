'use client';

import { useState, useRef, useEffect } from 'react';
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

const moreTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: '📧' },
  { id: 'recordings', label: 'Recordings', icon: '🎙️' },
  { id: 'drive', label: 'Drive', icon: '📁' },
  { id: 'extensions', label: 'Extensions', icon: '🧩' },
];

const networkTabIds = new Set(networkTabs.map((t) => t.id));
const moreTabIds = new Set(moreTabs.map((t) => t.id));

/* ── Component ─────────────────────────────────────────────── */

export function CenterPanel({ activeTab, onTabChange }: CenterPanelProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isNetworkActive = networkTabIds.has(activeTab);
  const isMoreActive = moreTabIds.has(activeTab);

  // Find label for active "more" tab to show in the button
  const activeMoreTab = moreTabs.find((t) => t.id === activeTab);

  // Close dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

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
          {/* Primary tabs */}
          {primaryTabs.map((tab) => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={tabClass(activeTab === tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

          {/* Network group toggle */}
          <button
            onClick={() => onTabChange(isNetworkActive ? activeTab : 'connections')}
            className={tabClass(isNetworkActive)}
          >
            🌐 Network
          </button>

          {/* More dropdown */}
          <div className="relative flex-shrink-0" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((p) => !p)}
              className={cn(
                tabClass(isMoreActive),
                'flex items-center gap-1'
              )}
            >
              {isMoreActive ? (
                <>{activeMoreTab?.icon} {activeMoreTab?.label}</>
              ) : (
                <>⋯ More</>
              )}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn('transition-transform', moreOpen && 'rotate-180')}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 min-w-[160px]">
                {moreTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
                      activeTab === tab.id
                        ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Network Sub-tabs (only when a network tab is active) ── */}
        {isNetworkActive && (
          <div className="flex gap-1 w-full border-t border-[var(--border-color)] pt-1.5 pb-1.5 px-1">
            {networkTabs.map((tab) => (
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
