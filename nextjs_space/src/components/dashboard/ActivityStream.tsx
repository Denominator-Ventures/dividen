'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

interface Activity {
  id: string;
  action: string;
  actor: string;
  summary: string;
  createdAt: string;
}

interface ActivityStreamProps {
  expanded: boolean;
  onToggleExpand: () => void;
}

const ACTOR_ICONS: Record<string, string> = { user: '👤', divi: '🤖', system: '⚙️' };
const ACTION_ICONS: Record<string, string> = {
  card_created: '📋', card_moved: '↗️', card_updated: '✏️', card_deleted: '🗑️',
  task_dispatched: '🚀', queue_added: '📥', queue_status_changed: '🔄', queue_updated: '✏️', queue_deleted: '🗑️', queue_dispatched: '🚀',
  contact_added: '👥', contact_updated: '✏️', contact_deleted: '🗑️',
  event_created: '📅', event_updated: '✏️', event_deleted: '🗑️',
  goal_created: '🎯', goal_updated: '✏️', goal_deleted: '🗑️',
  connection_created: '🔗', connection_accepted: '🤝', connection_removed: '❌',
  mode_changed: '🔄', recording_created: '🎙️', recording_processed: '✅',
  document_created: '📝', relay_sent: '📡', relay_responded: '📨', relay_broadcast: '📢',
  comms_replied: '💬', comms_created: '💬',
};

const ACTIVITY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'queue', label: 'Queue' },
  { id: 'board', label: 'Board' },
  { id: 'crm', label: 'CRM' },
  { id: 'calendar', label: 'Cal' },
  { id: 'goals', label: 'Goals' },
  { id: 'comms', label: 'Comms' },
  { id: 'connections', label: 'Network' },
];

export function ActivityStream({ expanded, onToggleExpand }: ActivityStreamProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: expanded ? '100' : '10' });
      if (filter !== 'all') params.set('category', filter);
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      if (data.success) setActivities(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, expanded]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchActivities, 30000);
    return () => clearInterval(iv);
  }, [fetchActivities]);

  const displayItems = expanded ? activities : activities.slice(0, 5);

  return (
    <div className={cn(
      'border-t border-[var(--border-color)] flex flex-col transition-all duration-300',
      expanded ? 'flex-1 min-h-0' : 'flex-shrink-0'
    )}>
      {/* Header — always visible */}
      <button
        onClick={onToggleExpand}
        className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-surface)] transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">📊</span>
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Activity</span>
          {activities.length > 0 && (
            <span className="text-[9px] text-[var(--text-muted)]">{activities.length}</span>
          )}
        </div>
        <span className={cn(
          'text-[10px] text-[var(--text-muted)] transition-transform',
          expanded ? 'rotate-180' : ''
        )}>
          ▲
        </span>
      </button>

      {/* Expanded: category filters */}
      {expanded && (
        <div className="flex items-center gap-1 px-3 pb-1 overflow-x-auto scrollbar-hide flex-shrink-0">
          {ACTIVITY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={cn(
                'px-2 py-0.5 text-[9px] font-medium rounded-full transition-colors whitespace-nowrap flex-shrink-0',
                filter === cat.id
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Activity items */}
      <div className={cn(
        'overflow-y-auto px-2',
        expanded ? 'flex-1' : 'max-h-[180px]'
      )}>
        {loading && activities.length === 0 ? (
          <div className="text-center text-[10px] text-[var(--text-muted)] py-3">Loading...</div>
        ) : displayItems.length === 0 ? (
          <div className="text-center text-[10px] text-[var(--text-muted)] py-3">
            No activity yet
          </div>
        ) : (
          <div className="space-y-0">
            {displayItems.map(a => (
              <div key={a.id} className="flex items-start gap-1.5 py-1 px-1.5 rounded hover:bg-[var(--bg-surface)] transition-colors">
                <span className="text-[10px] flex-shrink-0 mt-0.5">{ACTION_ICONS[a.action] || ACTOR_ICONS[a.actor] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-1">{a.summary}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-[9px] font-medium',
                      a.actor === 'divi' ? 'text-brand-400' : 'text-[var(--text-muted)]'
                    )}>
                      {a.actor === 'divi' ? 'Divi' : a.actor === 'system' ? 'Sys' : 'You'}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapsed hint */}
      {!expanded && activities.length > 5 && (
        <button
          onClick={onToggleExpand}
          className="text-center text-[9px] text-[var(--text-muted)] hover:text-brand-400 py-1 transition-colors"
        >
          +{activities.length - 5} more • Click to expand
        </button>
      )}
    </div>
  );
}
