'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  onActivityCountChange?: (count: number) => void;
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
  settings_updated: '⚙️', onboarding_progress: '🏁', onboarding_completed: '🎉',
  setup_action: '🔧', sync_completed: '🔄', google_connected: '🔗',
  checklist_completed: '✅', checklist_unchecked: '⬜',
};

const ACTIVITY_CATEGORIES = [
  { id: 'board', label: 'Board', icon: '📋' },
  { id: 'queue', label: 'Queue', icon: '📥' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'comms', label: 'Comms', icon: '💬' },
  { id: 'connections', label: 'Network', icon: '🔗' },
  { id: 'drive', label: 'Drive', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'sync', label: 'Sync', icon: '🔄' },
];

export function ActivityStream({ expanded, onToggleExpand, onActivityCountChange }: ActivityStreamProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set(ACTIVITY_CATEGORIES.map(c => c.id)));
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: expanded ? '100' : '10', _t: String(Date.now()) });
      // If not all categories are selected, pass the filter
      if (enabledCategories.size < ACTIVITY_CATEGORIES.length && enabledCategories.size > 0) {
        params.set('categories', Array.from(enabledCategories).join(','));
      }
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.data);
        onActivityCountChange?.(data.data.length);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [enabledCategories, expanded, onActivityCountChange]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchActivities, 30000);
    return () => clearInterval(iv);
  }, [fetchActivities]);

  // Listen for custom refresh event
  useEffect(() => {
    const handler = () => fetchActivities();
    window.addEventListener('dividen:activity-refresh', handler);
    return () => window.removeEventListener('dividen:activity-refresh', handler);
  }, [fetchActivities]);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        filterRef.current && !filterRef.current.contains(e.target as Node) &&
        filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const toggleCategory = (id: string) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allEnabled = enabledCategories.size === ACTIVITY_CATEGORIES.length;
  const toggleAll = () => {
    if (allEnabled) {
      setEnabledCategories(new Set());
    } else {
      setEnabledCategories(new Set(ACTIVITY_CATEGORIES.map(c => c.id)));
    }
  };

  const displayItems = expanded ? activities : activities.slice(0, 5);
  const activeFilterCount = ACTIVITY_CATEGORIES.length - enabledCategories.size;

  return (
    <div className={cn(
      'border-t border-[var(--border-color)] flex flex-col transition-all duration-300',
      expanded ? 'flex-1 min-h-0' : 'flex-shrink-0'
    )}>
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 hover:bg-[var(--bg-surface)] transition-colors rounded px-1 py-0.5 group"
        >
          <span className="text-[10px]">📊</span>
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Activity</span>
          {activities.length > 0 && (
            <span className="text-[9px] text-[var(--text-muted)]">{activities.length}</span>
          )}
          <span className={cn(
            'text-[10px] text-[var(--text-muted)] transition-transform',
            expanded ? 'rotate-180' : ''
          )}>
            ▲
          </span>
        </button>

        {/* Filter dropdown trigger — only when expanded */}
        {expanded && (
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => setFilterOpen(p => !p)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors',
                filterOpen || activeFilterCount > 0
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              )}
            >
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-[var(--brand-primary)] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <span className={cn('transition-transform text-[8px]', filterOpen ? 'rotate-180' : '')}>▼</span>
            </button>

            {/* Dropdown menu */}
            {filterOpen && (
              <div
                ref={filterRef}
                className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-xl py-1"
              >
                {/* Select All / None */}
                <button
                  onClick={toggleAll}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <span className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] flex-shrink-0',
                    allEnabled
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                      : 'border-[var(--border-color)]'
                  )}>
                    {allEnabled && '✓'}
                  </span>
                  <span>{allEnabled ? 'Deselect All' : 'Select All'}</span>
                </button>
                <div className="border-t border-[var(--border-color)] my-0.5" />

                {ACTIVITY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <span className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] flex-shrink-0',
                      enabledCategories.has(cat.id)
                        ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                        : 'border-[var(--border-color)]'
                    )}>
                      {enabledCategories.has(cat.id) && '✓'}
                    </span>
                    <span className="text-[10px]">{cat.icon}</span>
                    <span className={cn(
                      'text-[10px]',
                      enabledCategories.has(cat.id) ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                    )}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity items */}
      <div className={cn(
        'overflow-y-auto px-2',
        expanded ? 'flex-1' : 'max-h-[140px]'
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
