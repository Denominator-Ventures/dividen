'use client';

import { useRef, useCallback } from 'react';
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
import { MarketplaceView } from './MarketplaceView';
import FederationIntelligenceView from './FederationIntelligenceView';
import DiscoverView from './DiscoverView';
import { TabErrorBoundary } from './TabErrorBoundary';

interface CenterPanelProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  marketplacePrefill?: any;
  onMarketplacePrefillConsumed?: () => void;
  chatPrefill?: string | null;
  onChatPrefillConsumed?: () => void;
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
  { id: 'discover', label: 'Discover', icon: '🌍' },
  { id: 'connections', label: 'Connections', icon: '🔗' },
  { id: 'teams', label: 'Teams', icon: '🏢' },
  { id: 'jobs', label: 'Jobs', icon: '💼' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
  { id: 'federation', label: 'Federation Intel', icon: '🧠' },
];

const messagesTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: '📧' },
  { id: 'recordings', label: 'Recordings', icon: '🎙️' },
];

const networkTabIds = new Set(networkTabs.map((t) => t.id));
const messagesTabIds = new Set(messagesTabs.map((t) => t.id));

/* ── Component ─────────────────────────────────────────────── */

export function CenterPanel({ activeTab, onTabChange, marketplacePrefill, onMarketplacePrefillConsumed, chatPrefill, onChatPrefillConsumed }: CenterPanelProps) {
  const isNetworkActive = networkTabIds.has(activeTab);
  const isMessagesActive = messagesTabIds.has(activeTab);
  const hasSubRow = isNetworkActive || isMessagesActive;
  const activeSubTabs = isNetworkActive ? networkTabs : isMessagesActive ? messagesTabs : [];

  /* ── Drag-to-scroll for touch & mouse (with threshold to allow clicks) ── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, isDragging: false, startX: 0, scrollLeft: 0, pointerId: -1 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { isDown: true, isDragging: false, startX: e.clientX, scrollLeft: el.scrollLeft, pointerId: e.pointerId };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.isDown) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    // Only start dragging after 5px threshold
    if (!dragState.current.isDragging && Math.abs(dx) > 5) {
      dragState.current.isDragging = true;
      el.setPointerCapture(dragState.current.pointerId);
      el.style.cursor = 'grabbing';
    }
    if (dragState.current.isDragging) {
      e.preventDefault();
      el.scrollLeft = dragState.current.scrollLeft - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (el && dragState.current.isDragging) {
      try { el.releasePointerCapture(e.pointerId); } catch {}
      el.style.cursor = '';
    }
    dragState.current = { isDown: false, isDragging: false, startX: 0, scrollLeft: 0, pointerId: -1 };
  }, []);

  const tabClass = (active: boolean) =>
    cn(
      'px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 select-none',
      active
        ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
    );

  return (
    <div className="panel h-full flex flex-col">
      {/* ── Primary Tab Bar — z-20 keeps dropdowns/sub-rows above content ── */}
      <div className="panel-header flex-col !gap-0 !pb-0 relative z-20">
        <div
          ref={scrollRef}
          className="flex items-center gap-1 w-full overflow-x-auto pb-2 scrollbar-hide touch-pan-x"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
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
            onClick={() => onTabChange(isNetworkActive ? activeTab : 'discover')}
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

          {/* Earnings — standalone */}
          <button onClick={() => onTabChange('earnings')} className={tabClass(activeTab === 'earnings')}>
            💰 Earnings
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
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' && <TabErrorBoundary tabName="Chat"><ChatView prefill={chatPrefill} onPrefillConsumed={onChatPrefillConsumed} /></TabErrorBoundary>}
        {activeTab === 'kanban' && <TabErrorBoundary tabName="Board"><KanbanView /></TabErrorBoundary>}
        {activeTab === 'crm' && <TabErrorBoundary tabName="CRM"><CrmView /></TabErrorBoundary>}
        {activeTab === 'calendar' && <TabErrorBoundary tabName="Calendar"><CalendarView /></TabErrorBoundary>}
        {activeTab === 'inbox' && <TabErrorBoundary tabName="Inbox"><InboxView /></TabErrorBoundary>}
        {activeTab === 'recordings' && <TabErrorBoundary tabName="Recordings"><RecordingsView /></TabErrorBoundary>}
        {activeTab === 'drive' && <TabErrorBoundary tabName="Drive"><DriveView /></TabErrorBoundary>}
        {activeTab === 'discover' && <TabErrorBoundary tabName="Discover"><DiscoverView /></TabErrorBoundary>}
        {activeTab === 'connections' && <TabErrorBoundary tabName="Connections"><ConnectionsView /></TabErrorBoundary>}
        {activeTab === 'teams' && <TabErrorBoundary tabName="Teams"><TeamsView /></TabErrorBoundary>}
        {activeTab === 'goals' && <TabErrorBoundary tabName="Goals"><GoalsView /></TabErrorBoundary>}
        {activeTab === 'jobs' && <TabErrorBoundary tabName="Jobs"><JobBoardView /></TabErrorBoundary>}
        {activeTab === 'marketplace' && <TabErrorBoundary tabName="Marketplace"><MarketplaceView prefillAgent={marketplacePrefill} onPrefillConsumed={onMarketplacePrefillConsumed} /></TabErrorBoundary>}
        {activeTab === 'extensions' && <TabErrorBoundary tabName="Extensions"><ExtensionsView /></TabErrorBoundary>}
        {activeTab === 'earnings' && <TabErrorBoundary tabName="Earnings"><MarketplaceView initialView="earnings" /></TabErrorBoundary>}
        {activeTab === 'federation' && <TabErrorBoundary tabName="Federation Intel"><FederationIntelligenceView /></TabErrorBoundary>}
      </div>
    </div>
  );
}
