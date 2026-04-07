'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import {
  QUEUE_SECTIONS,
  type QueueItemData,
  type QueueItemStatus,
  type CardPriority,
} from '@/types';

// ─── Priority indicator ─────────────────────────────────────────────────────

const priorityIndicator: Record<CardPriority, { dot: string; label: string }> = {
  urgent: { dot: 'bg-red-500', label: 'Urgent' },
  high: { dot: 'bg-orange-500', label: 'High' },
  medium: { dot: 'bg-blue-500', label: 'Medium' },
  low: { dot: 'bg-gray-500', label: 'Low' },
};

// ─── Queue Item Card ────────────────────────────────────────────────────────

function QueueItemCard({
  item,
  onStatusChange,
  onDelete,
}: {
  item: QueueItemData;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
  onDelete: (id: string) => void;
}) {
  const pi = priorityIndicator[item.priority] || priorityIndicator.medium;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 group hover:border-brand-500/30 transition-all">
      <div className="flex items-start gap-2">
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', pi.dot)} title={pi.label} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-1">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              {timeAgo(item.createdAt)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
              {item.type}
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

export function QueuePanel() {
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
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
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

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h2 className="label-mono-accent">
            📥 Queue
          </h2>
          <span className="text-xs bg-[var(--bg-surface)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">
            {totalCount}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-surface-hover)] transition-colors"
        >
          +
        </button>
      </div>

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
              Agent suggestions, tasks, and notifications will appear here.
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
            {/* Add Form */}
            {showAddForm && (
              <NewQueueItemForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
            )}

            {/* Sections */}
            {QUEUE_SECTIONS.map((section) => {
              const sectionItems = grouped[section.id] || [];
              if (sectionItems.length === 0) return null;

              return (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{section.icon}</span>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: section.color }}
                    >
                      {section.label}
                    </span>
                    <span className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                      {sectionItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sectionItems.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
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
    </div>
  );
}
