'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initial fetch + polling
  useEffect(() => {
    fetchFeed();
    pollRef.current = setInterval(fetchFeed, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

  const markSeen = async () => {
    if (unseenCount === 0) return;
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
  };

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setLoading(true);
      fetchFeed().finally(() => setLoading(false));
      // Mark seen after a short delay so user can see the dots
      setTimeout(markSeen, 1500);
    }
  };

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
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
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

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-muted)] text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-2xl mb-2">🔔</div>
                <div className="text-sm text-[var(--text-muted)]">No notifications yet</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Activity from your workspace will appear here</div>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-0 transition-colors ${
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-color)] text-center">
              <span className="text-[10px] text-[var(--text-muted)]">
                Showing last {items.length} events
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
