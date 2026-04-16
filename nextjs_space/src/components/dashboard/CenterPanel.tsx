'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import type { CenterTab } from '@/types';
import { cn } from '@/lib/utils';
import { DragScrollContainer } from '@/components/ui/DragScrollContainer';
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
import { MarketplaceView } from './MarketplaceView';
import FederationIntelligenceView from './FederationIntelligenceView';
import DiscoverView from './DiscoverView';
import ProfileView from './ProfileView';
import { CapabilitiesMarketplace } from './CapabilitiesMarketplace';
import { TriageButton } from './TriageButton';
import { TAB_TO_SIGNAL, getSignalById } from '@/lib/signals';
import { TabErrorBoundary } from './TabErrorBoundary';

interface CenterPanelProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  marketplacePrefill?: any;
  onMarketplacePrefillConsumed?: () => void;
  chatPrefill?: string | null;
  onChatPrefillConsumed?: () => void;
  onTriage?: (signalId: string) => void;
  onChatWithPrefill?: (msg: string) => void;
  onOpenCatchUpSettings?: () => void;
  chatRefreshKey?: number;
}

/* ── Tab Organization ──────────────────────────────────────── */
/*  Primary row:  Chat · CRM · Calendar · Inbox · Recordings   */
/*                | Network ▾ | Drive                           */
/*  Sub-row:      Network  → Discover · Connections · Teams ·   */
/*                            Tasks · Marketplace · Fed Intel    */

const primaryTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'inbox', label: 'Email', icon: '📧' },
  { id: 'recordings', label: 'Recordings', icon: '🎙️' },
];

const networkTabs: { id: CenterTab; label: string; icon: string }[] = [
  { id: 'discover', label: 'Discover', icon: '🌍' },
  { id: 'connections', label: 'Connections', icon: '🔗' },
  { id: 'teams', label: 'Teams', icon: '🏢' },
  { id: 'jobs', label: 'Tasks', icon: '📋' },
  { id: 'marketplace', label: 'Bubble Store', icon: '🫧' },
  { id: 'capabilities', label: 'Capabilities', icon: '⚡' },
  { id: 'federation', label: 'Federation Intel', icon: '🧠' },
];

const networkTabIds = new Set(networkTabs.map((t) => t.id));

/* ── Component ─────────────────────────────────────────────── */

export function CenterPanel({ activeTab, onTabChange, marketplacePrefill, onMarketplacePrefillConsumed, chatPrefill, onChatPrefillConsumed, onTriage, onChatWithPrefill, onOpenCatchUpSettings, chatRefreshKey }: CenterPanelProps) {
  const isNetworkActive = networkTabIds.has(activeTab);

  // ── Tab badge counts ──────────────────────────────────────────────
  const [badges, setBadges] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        // Fetch inbox unread count
        const inboxRes = await fetch('/api/inbox?limit=1').then(r => r.json()).catch(() => null);
        const unreadEmails = inboxRes?.data?.unreadCount ?? inboxRes?.data?.total ?? 0;

        // Fetch calendar events remaining today
        const calRes = await fetch('/api/calendar?view=day').then(r => r.json()).catch(() => null);
        const eventsToday = calRes?.data?.length ?? 0;

        // Fetch drive file count
        const driveRes = await fetch('/api/drive?limit=1').then(r => r.json()).catch(() => null);
        const driveFiles = driveRes?.data?.total ?? driveRes?.data?.length ?? 0;

        setBadges({ inbox: unreadEmails, calendar: eventsToday, drive: driveFiles });
      } catch { /* non-critical */ }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, []);
  const hasSubRow = isNetworkActive;
  const activeSubTabs = isNetworkActive ? networkTabs : [];

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
        <div className="relative w-full">
          {/* Fade gradients to hint at scrollable content */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent z-10 opacity-0 md:hidden" id="tab-fade-left" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent z-10 md:hidden" />
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
          {primaryTabs.map((tab) => {
            const badge = badges[tab.id] ?? 0;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} className={cn(tabClass(activeTab === tab.id), 'relative')}>
                {tab.icon} {tab.label}
                {badge > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-[var(--brand-primary)] text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

          {/* Network group */}
          <button
            onClick={() => onTabChange(isNetworkActive ? activeTab : 'discover')}
            className={tabClass(isNetworkActive)}
          >
            🌐 Network
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

          {/* Drive — standalone */}
          <button onClick={() => onTabChange('drive')} className={cn(tabClass(activeTab === 'drive'), 'relative')}>
            📁 Drive
            {(badges.drive ?? 0) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-[var(--brand-primary)] text-white">
                {badges.drive > 99 ? '99+' : badges.drive}
              </span>
            )}
          </button>
        </div>
        </div>

        {/* ── Sub-tabs (Network or Messages) ── */}
        {hasSubRow && (
          <DragScrollContainer className="border-t border-[var(--border-color)] pt-1.5 pb-1.5 px-1">
            <div className="flex gap-1 w-full">
              {activeSubTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap flex-shrink-0',
                    activeTab === tab.id
                      ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </DragScrollContainer>
        )}
      </div>

      {/* ── Signal Triage Bar (shows on signal views) ── */}
      {(() => {
        const signalId = TAB_TO_SIGNAL[activeTab];
        const signal = signalId ? getSignalById(signalId) : null;
        if (!signal || !onTriage) return null;
        return (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/50">
            <span className="text-[10px] text-[var(--text-muted)]">
              {signal.icon} Signal: {signal.name}
            </span>
            <TriageButton
              signalName={signal.name}
              signalIcon={signal.icon}
              onTriage={() => onTriage(signalId)}
              variant="compact"
            />
          </div>
        );
      })()}

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' && <TabErrorBoundary tabName="Chat"><ChatView key={chatRefreshKey} prefill={chatPrefill} onPrefillConsumed={onChatPrefillConsumed} /></TabErrorBoundary>}
        {activeTab === 'kanban' && <TabErrorBoundary tabName="Board"><KanbanView onDiscuss={onChatWithPrefill} /></TabErrorBoundary>}
        {activeTab === 'crm' && <TabErrorBoundary tabName="CRM"><CrmView /></TabErrorBoundary>}
        {activeTab === 'calendar' && <TabErrorBoundary tabName="Calendar"><CalendarView onDiscuss={onChatWithPrefill} /></TabErrorBoundary>}
        {activeTab === 'inbox' && <TabErrorBoundary tabName="Email"><InboxView onDiscuss={onChatWithPrefill} /></TabErrorBoundary>}
        {activeTab === 'recordings' && <TabErrorBoundary tabName="Recordings"><RecordingsView /></TabErrorBoundary>}
        {activeTab === 'drive' && <TabErrorBoundary tabName="Drive"><DriveView onDiscuss={onChatWithPrefill} /></TabErrorBoundary>}
        {activeTab === 'discover' && <TabErrorBoundary tabName="Discover"><DiscoverView /></TabErrorBoundary>}
        {activeTab === 'connections' && <TabErrorBoundary tabName="Connections"><ConnectionsView /></TabErrorBoundary>}
        {activeTab === 'teams' && <TabErrorBoundary tabName="Teams"><TeamsView /></TabErrorBoundary>}
        {activeTab === 'goals' && <TabErrorBoundary tabName="Goals"><GoalsView /></TabErrorBoundary>}
        {activeTab === 'jobs' && <TabErrorBoundary tabName="Jobs"><JobBoardView /></TabErrorBoundary>}
        {activeTab === 'marketplace' && <TabErrorBoundary tabName="Bubble Store"><MarketplaceView prefillAgent={marketplacePrefill} onPrefillConsumed={onMarketplacePrefillConsumed} /></TabErrorBoundary>}
        {activeTab === 'earnings' && <TabErrorBoundary tabName="Earnings"><MarketplaceView initialView="earnings" /></TabErrorBoundary>}
        {activeTab === 'capabilities' && <TabErrorBoundary tabName="Capabilities"><CapabilitiesMarketplace onStartGuidedChat={(msg) => { if (onChatWithPrefill) onChatWithPrefill(msg); else onTabChange('chat'); }} /></TabErrorBoundary>}
        {activeTab === 'federation' && <TabErrorBoundary tabName="Federation Intel"><FederationIntelligenceView /></TabErrorBoundary>}
        {activeTab === 'profile' && <TabErrorBoundary tabName="Profile"><ProfileView onClose={() => onTabChange('chat')} /></TabErrorBoundary>}
      </div>
    </div>
  );
}