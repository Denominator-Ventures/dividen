'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useActivityStream } from '@/hooks/use-activity-stream';

interface FeedItem {
  id: string;
  icon: string;
  category: string;
  action: string;
  actor: string;
  summary: string;
  time: string;
  isNew: boolean;
}

// Maps notification categories to dashboard tabs
const CATEGORY_TAB_MAP: Record<string, string> = {
  board: 'kanban',
  queue: 'chat',       // queue panel is alongside chat
  crm: 'crm',
  calendar: 'calendar',
  goals: 'goals',
  comms: 'chat',       // comms is in the queue/chat sidebar
  connections: 'connections',
  drive: 'drive',
  marketplace: 'marketplace',
  federation: 'federation',
  teams: 'teams',
  projects: 'kanban',  // projects are board-centric
  intelligence: 'chat', // learnings surface in settings, but chat is the entry
};

// Special route overrides for specific action types
const ACTION_ROUTE_MAP: Record<string, string> = {
  learning_generated: '/settings?tab=learnings',
};

const FILTER_PILLS: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'connections', label: 'Connections', icon: '🤝' },
  { id: 'teams', label: 'Teams', icon: '👥' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'federation', label: 'Federation', icon: '🌐' },
  { id: 'board', label: 'Board', icon: '🗂️' },
  { id: 'queue', label: 'Queue', icon: '⚡' },
  { id: 'comms', label: 'Comms', icon: '📡' },
  { id: 'crm', label: 'CRM', icon: '👤' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'marketplace', label: 'Bubble Store', icon: '🫧' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const ref = useRef<HTMLDivElement>(null);

  const handleNotificationClick = useCallback((item: FeedItem) => {
    // Check for special action-specific routes first
    const specialRoute = ACTION_ROUTE_MAP[item.action];
    if (specialRoute) {
      setOpen(false);
      window.location.href = specialRoute;
      return;
    }

    // Navigate to the corresponding dashboard tab
    const targetTab = CATEGORY_TAB_MAP[item.category];
    if (targetTab) {
      setOpen(false);
      window.dispatchEvent(new CustomEvent('dividen:navigate-tab', { detail: { tab: targetTab } }));
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/feed?limit=30');
      const d = await res.json();
      if (d.success) {
        setItems(d.data.items);
        setUnseenCount(d.data.unseenCount);
      }
    } catch {
      // silent
    }
  }, []);

  // SSE stream for real-time updates — no HTTP polling needed
  const { newCount: sseNewCount, resetCount: resetSseCount } = useActivityStream(true);

  // Bump unseen count when SSE delivers new events
  useEffect(() => {
    if (sseNewCount > 0 && !open) {
      setUnseenCount((c) => c + sseNewCount);
      resetSseCount();
    }
  }, [sseNewCount, open, resetSseCount]);

  // Initial fetch only — SSE handles ongoing updates (no polling interval)
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markSeen = useCallback(async () => {
    try {
      await fetch('/api/notifications/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSeen: new Date().toISOString() }),
      });
      setUnseenCount(0);
      setItems((prev) => prev.map((i) => ({ ...i, isNew: false })));
    } catch {
      // silent
    }
  }, []);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setUnseenCount(0);
      setActiveFilter('all');
      setLoading(true);
      fetchFeed().finally(() => setLoading(false));
      setTimeout(() => markSeen(), 1500);
    }
  };

  // Filtered items
  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter((i) => i.category === activeFilter);

  // Count items per category for pill badges
  const categoryCounts: Record<string, number> = {};
  items.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });

  // Only show filter pills that have items
  const visiblePills = FILTER_PILLS.filter(
    (p) => p.id === 'all' || categoryCounts[p.id]
  );

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative text-[var(--text-muted)] hover:text-brand-400 transition-colors p-1"
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--brand-primary)] text-white text-[8px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-[#141419] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
            {unseenCount > 0 && (
              <button
                onClick={markSeen}
                className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          {visiblePills.length > 2 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-color)] overflow-x-auto scrollbar-none">
              {visiblePills.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setActiveFilter(pill.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                    activeFilter === pill.id
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  {pill.icon && <span className="text-[10px]">{pill.icon}</span>}
                  <span>{pill.label}</span>
                  {pill.id !== 'all' && categoryCounts[pill.id] && (
                    <span className="text-[9px] opacity-60">{categoryCounts[pill.id]}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-muted)] text-sm">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-2xl mb-2">{activeFilter === 'all' ? '🔔' : FILTER_PILLS.find(p => p.id === activeFilter)?.icon || '📋'}</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {activeFilter === 'all' ? 'Activity from your workspace will appear here' : 'Try selecting "All" to see everything'}
                </div>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isClickable = !!(ACTION_ROUTE_MAP[item.action] || CATEGORY_TAB_MAP[item.category]);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-0 transition-colors group ${
                      isClickable ? 'cursor-pointer' : ''
                    } ${
                      item.isNew
                        ? 'bg-[var(--brand-primary)]/5'
                        : 'hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '9px' }}>
                          {item.category}
                        </span>
                        <span className="text-[var(--text-muted)]" style={{ fontSize: '9px' }}>·</span>
                        <span className="text-[var(--text-muted)]" style={{ fontSize: '9px' }}>
                          {timeAgo(item.time)}
                        </span>
                        {item.isNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                        )}
                        {isClickable && (
                          <span className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: '9px' }}>
                            →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-color)] text-center">
              <span className="text-[10px] text-[var(--text-muted)]">
                {activeFilter === 'all'
                  ? `Showing last ${items.length} events`
                  : `${filteredItems.length} of ${items.length} events`
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}