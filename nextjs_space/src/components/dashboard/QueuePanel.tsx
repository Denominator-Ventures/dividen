'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import { CommsTab } from './CommsTab';
import { AgentWidgetContainer, parseWidgetPayload } from './AgentWidget';
import { emitSignal } from '@/lib/behavior-signals';
import {
  QUEUE_SECTIONS,
  type QueueItemData,
  type QueueItemStatus,
  type CardPriority,
} from '@/types';

interface QueuePanelProps {
  onNavigateToMarketplace?: () => void;
  onNavigateToComms?: () => void;
  onDiscuss?: (context: string) => void;
  mode?: 'cockpit' | 'chief_of_staff';
  onToggleMode?: () => void;
  modeLoading?: boolean;
}

// ─── Priority indicator ─────────────────────────────────────────────────────

const priorityIndicator: Record<CardPriority, { dot: string; label: string }> = {
  urgent: { dot: 'bg-red-500', label: 'Urgent' },
  high: { dot: 'bg-orange-500', label: 'High' },
  medium: { dot: 'bg-blue-500', label: 'Medium' },
  low: { dot: 'bg-gray-500', label: 'Low' },
};

// ─── Capability metadata parser ──────────────────────────────────────────────

function parseCapabilityMeta(metadata?: string | null): { capabilityType?: string; action?: string; identity?: string; draft?: string; recipient?: string; subject?: string; meetingWith?: string; proposedTime?: string } | null {
  if (!metadata) return null;
  try {
    const m = JSON.parse(metadata);
    if (m.capabilityType) return m;
    return null;
  } catch { return null; }
}

const capabilityIcons: Record<string, string> = {
  email: '✉️',
  meetings: '📅',
};

// ─── Queue Item Card ────────────────────────────────────────────────────────

function QueueItemCard({
  item,
  onStatusChange,
  onDelete,
  onSendToComms,
  onDiscuss,
}: {
  item: QueueItemData;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
  onDelete: (id: string) => void;
  onSendToComms?: (id: string, title: string) => void;
  onDiscuss?: (context: string) => void;
}) {
  const pi = priorityIndicator[item.priority] || priorityIndicator.medium;
  const capMeta = parseCapabilityMeta(item.metadata);
  const isCapabilityAction = !!capMeta?.capabilityType;
  const capIcon = capMeta ? (capabilityIcons[capMeta.capabilityType || ''] || '⚡') : '';

  return (
    <div className={cn(
      "bg-[var(--bg-secondary)] border rounded-lg p-3 group transition-all",
      isCapabilityAction
        ? "border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/40"
        : "border-[var(--border-color)] hover:border-brand-500/30"
    )}>
      <div className="flex items-start gap-2">
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', pi.dot)} title={pi.label} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isCapabilityAction && <span className="text-sm">{capIcon}</span>}
            <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
              {item.title}
            </h4>
          </div>
          {item.description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-1">
              {item.description}
            </p>
          )}

          {/* Capability-specific details */}
          {capMeta?.capabilityType === 'email' && capMeta.recipient && (
            <div className="mt-1.5 text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <span>To: {capMeta.recipient}</span>
              {capMeta.subject && <span>· {capMeta.subject}</span>}
            </div>
          )}
          {capMeta?.capabilityType === 'meetings' && capMeta.meetingWith && (
            <div className="mt-1.5 text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <span>With: {capMeta.meetingWith}</span>
              {capMeta.proposedTime && <span>· {capMeta.proposedTime}</span>}
            </div>
          )}

          {/* Agent Widget (if metadata contains widgets) */}
          {(() => {
            const widgetPayload = parseWidgetPayload(item.metadata);
            if (!widgetPayload) return null;
            return <AgentWidgetContainer payload={widgetPayload} className="mt-2" />;
          })()}

          {/* Capability action buttons (approve / edit) */}
          {isCapabilityAction && item.status === 'ready' && (
            <div className="flex items-center gap-1.5 mt-2">
              <button
                onClick={() => onStatusChange(item.id, 'done_today')}
                className="text-[10px] px-2 py-0.5 rounded-md bg-green-600/15 text-green-400 hover:bg-green-600/25 font-medium"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => onStatusChange(item.id, 'in_progress')}
                className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 font-medium"
              >
                ✏️ Review
              </button>
              <button
                onClick={() => onStatusChange(item.id, 'blocked')}
                className="text-[10px] px-2 py-0.5 rounded-md bg-red-600/10 text-red-400/70 hover:bg-red-600/20 font-medium"
              >
                ✕ Skip
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              {timeAgo(item.createdAt)}
            </span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              isCapabilityAction
                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
            )}>
              {isCapabilityAction ? `${capMeta.capabilityType} · ${capMeta.action || 'outbound'}` : item.type}
            </span>
          </div>
        </div>
        {/* Quick actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          {item.status === 'ready' && (
            <button
              onClick={() => onStatusChange(item.id, 'in_progress')}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              title="Start"
            >
              ▶
            </button>
          )}
          {item.status === 'in_progress' && (
            <>
              <button
                onClick={() => onStatusChange(item.id, 'done_today')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
                title="Done"
              >
                ✓
              </button>
              <button
                onClick={() => onStatusChange(item.id, 'blocked')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                title="Block"
              >
                ✕
              </button>
            </>
          )}
          {item.status === 'blocked' && (
            <button
              onClick={() => onStatusChange(item.id, 'ready')}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
              title="Unblock"
            >
              ↩
            </button>
          )}
          {onDiscuss && (
            <button
              onClick={() => onDiscuss(`Let's discuss this task: "${item.title}". ${item.description ? `Description: ${item.description}` : ''} Status: ${item.status}, Priority: ${item.priority}. Help me work through this.`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20"
              title="Discuss with Divi"
            >
              💬
            </button>
          )}
          {onSendToComms && (
            <button
              onClick={() => onSendToComms(item.id, item.title)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
              title="Send to Comms"
            >
              📡
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="text-[10px] px-1.5 py-0.5 rounded text-[var(--text-muted)] hover:bg-red-600/20 hover:text-red-400"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Item Form ──────────────────────────────────────────────────────────

function NewQueueItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, priority: CardPriority) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<CardPriority>('medium');

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg p-3 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New queue item..."
        className="input-field text-sm py-1.5"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) onAdd(title.trim(), priority);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center justify-between">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as CardPriority)}
          className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-secondary)]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <div className="flex gap-1">
          <button onClick={onCancel} className="text-xs text-[var(--text-muted)] px-2 py-1">
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onAdd(title.trim(), priority)}
            disabled={!title.trim()}
            className="text-xs btn-primary px-2 py-1"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Queue Panel ───────────────────────────────────────────────────────

export function QueuePanel({ onNavigateToMarketplace, onNavigateToComms, onDiscuss, mode, onToggleMode, modeLoading }: QueuePanelProps = {}) {
  const [items, setItems] = useState<QueueItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ─── Group by status ──────────────────────────────────────────────────

  const grouped = QUEUE_SECTIONS.reduce(
    (acc, sec) => {
      acc[sec.id] = items.filter((i) => i.status === sec.id);
      return acc;
    },
    {} as Record<QueueItemStatus, QueueItemData[]>
  );

  const readyCount = grouped.ready?.length ?? 0;
  const totalCount = items.length;

  // ─── Actions ──────────────────────────────────────────────────────────

  async function handleAdd(title: string, priority: CardPriority) {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => [data.data, ...prev]);
      }
    } catch {
      // ignore
    }
    setShowAddForm(false);
  }

  async function handleStatusChange(id: string, status: QueueItemStatus) {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? data.data : i)));
        emitSignal(`queue_${status}`, { itemId: id, status });
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
      emitSignal('queue_delete', { itemId: id });
    } catch {
      // ignore
    }
  }

  async function handleSendToComms(id: string, title: string) {
    try {
      await fetch('/api/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Queue item forwarded to comms: ${title}`,
          sender: 'divi',
          priority: 'normal',
          metadata: { source: 'queue', queueItemId: id },
        }),
      });
      // Mark the queue item as done since it's been sent to comms
      await handleStatusChange(id, 'done_today');
    } catch (e) {
      console.error('Failed to send to comms:', e);
    }
  }

  async function handleDispatch() {
    setDispatching(true);
    try {
      const res = await fetch('/api/queue/dispatch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === data.data.id ? data.data : i))
        );
      } else {
        // Could show error toast here
        console.warn('Dispatch failed:', data.error);
      }
    } catch {
      // ignore
    }
    setDispatching(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<'queue' | 'comms'>('queue');

  return (
    <div className="panel h-full flex flex-col">
      {/* Header with tabs */}
      <div className="panel-header flex-col items-start gap-1.5">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <h2 className="label-mono-accent">📥 Workspace</h2>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex gap-1 w-full">
          <button
            onClick={() => setActiveView('queue')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              activeView === 'queue'
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            Divi&apos;s Queue ({totalCount})
          </button>
          <button
            onClick={() => setActiveView('comms')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              activeView === 'comms'
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            📡 Comms
          </button>
        </div>
      </div>

      {activeView === 'queue' ? (
        <>
          {/* Dispatch Button */}
          {readyCount > 0 && (
            <div className="px-4 pt-3">
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
              >
                {dispatching ? (
                  <>⏳ Dispatching...</>
                ) : (
                  <>🚀 Dispatch Next ({readyCount} ready)</>
                )}
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm text-[var(--text-muted)]">Loading...</span>
              </div>
            ) : totalCount === 0 && !showAddForm ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-3 opacity-30">📥</div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Queue is empty
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Divi&apos;s suggestions, tasks, and notifications will appear here.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  + Add Item
                </button>
              </div>
            ) : (
              <>
                {showAddForm && (
                  <NewQueueItemForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
                )}
                {QUEUE_SECTIONS.map((section) => {
                  const sectionItems = grouped[section.id] || [];
                  if (sectionItems.length === 0) return null;
                  return (
                    <div key={section.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{section.icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
                        <span className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">{sectionItems.length}</span>
                      </div>
                      <div className="space-y-2">
                        {sectionItems.map((item) => (
                          <QueueItemCard key={item.id} item={item} onStatusChange={handleStatusChange} onDelete={handleDelete} onSendToComms={handleSendToComms} onDiscuss={onDiscuss} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Queue filters */}
          <div className="border-t border-[var(--border-color)] p-3">
            <div className="flex gap-2 text-xs">
              <span className="text-[var(--text-muted)]">
                {readyCount} ready · {grouped.in_progress?.length ?? 0} active · {grouped.done_today?.length ?? 0} done · {grouped.blocked?.length ?? 0} blocked
              </span>
            </div>
          </div>
        </>
      ) : (
        /* Comms — Agent Relay Channel */
        <div className="flex-1 min-h-0">
          <CommsTab />
        </div>
      )}

      {/* ── Bottom CTA: Comms (when on comms tab) or Marketplace (when on queue tab) ── */}
      {activeView === 'comms' && onNavigateToComms ? (
        <div className="flex-shrink-0 p-3 border-t border-[var(--border-color)]">
          <button
            onClick={onNavigateToComms}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500/20 via-brand-500/15 to-purple-500/20 hover:from-purple-500/30 hover:via-brand-500/25 hover:to-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-sm font-semibold text-purple-400 transition-all group"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg group-hover:scale-110 transition-transform">📡</span>
              <span>Open Full Comms</span>
              <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded-full text-purple-400/80">Expand</span>
            </span>
          </button>
        </div>
      ) : activeView === 'queue' && onNavigateToMarketplace ? (
        <div className="flex-shrink-0 p-3 border-t border-[var(--border-color)]">
          <button
            onClick={onNavigateToMarketplace}
            className="w-full py-3 px-4 bg-gradient-to-r from-brand-500/20 via-purple-500/15 to-brand-500/20 hover:from-brand-500/30 hover:via-purple-500/25 hover:to-brand-500/30 border border-brand-500/30 hover:border-brand-500/50 rounded-xl text-sm font-semibold text-brand-400 transition-all group"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg group-hover:scale-110 transition-transform">🏪</span>
              <span>Agent Marketplace</span>
              <span className="text-[10px] bg-brand-500/20 px-1.5 py-0.5 rounded-full text-brand-400/80">Explore</span>
            </span>
          </button>
        </div>
      ) : null}

      {/* ── Cockpit / Chief of Staff Toggle ── */}
      {mode && onToggleMode && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-[var(--border-color)] flex items-center justify-between">
          <button
            onClick={onToggleMode}
            disabled={modeLoading}
            className="flex items-center gap-2 group"
            title={mode === 'cockpit' ? 'Cockpit: You drive, AI assists' : 'Chief of Staff: AI drives, you approve'}
          >
            <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
              mode === 'chief_of_staff' ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-surface-hover)]'
            }`}>
              <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                mode === 'chief_of_staff' ? 'translate-x-[16px]' : 'translate-x-[2px]'
              }`} />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
              {mode === 'cockpit' ? '🎛️ Cockpit' : '🔭 CoS'}
            </span>
          </button>
          <span className="text-[9px] text-[var(--text-muted)]">
            {mode === 'cockpit' ? 'You drive' : 'AI drives'}
          </span>
        </div>
      )}
    </div>
  );
}
