'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  KANBAN_COLUMNS,
  type KanbanCardData,
  type CardStatus,
  type CardPriority,
  type CardAssignee,
  type ChecklistItemData,
} from '@/types';

interface CardDetailModalProps {
  card: KanbanCardData;
  onClose: () => void;
  onUpdated: (card: KanbanCardData) => void;
  onDeleted: (cardId: string) => void;
}

const priorities: { id: CardPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'bg-gray-600/30 text-gray-400' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-600/30 text-blue-400' },
  { id: 'high', label: 'High', color: 'bg-orange-600/30 text-orange-400' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-600/30 text-red-400' },
];

export function CardDetailModal({ card, onClose, onUpdated, onDeleted }: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [status, setStatus] = useState<CardStatus>(card.status);
  const [priority, setPriority] = useState<CardPriority>(card.priority);
  const [assignee, setAssignee] = useState<CardAssignee>(card.assignee);
  const [checklist, setChecklist] = useState<ChecklistItemData[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ─── Save card ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kanban/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, status, priority, assignee }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated(data.data);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  }

  // ─── Delete card ────────────────────────────────────────────────────────

  async function handleDelete() {
    try {
      await fetch(`/api/kanban/${card.id}`, { method: 'DELETE' });
      onDeleted(card.id);
    } catch {
      // ignore
    }
  }

  // ─── Checklist operations ──────────────────────────────────────────────

  async function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    try {
      const res = await fetch(`/api/kanban/${card.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newChecklistItem.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setChecklist((prev) => [...prev, data.data]);
        setNewChecklistItem('');
        // Update parent
        onUpdated({ ...card, checklist: [...checklist, data.data] });
      }
    } catch {
      // ignore
    }
  }

  async function toggleChecklistItem(item: ChecklistItemData) {
    try {
      const res = await fetch(`/api/kanban/${card.id}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = checklist.map((c) =>
          c.id === item.id ? { ...c, completed: !c.completed } : c
        );
        setChecklist(updated);
        onUpdated({ ...card, checklist: updated });
      }
    } catch {
      // ignore
    }
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      await fetch(`/api/kanban/${card.id}/checklist/${itemId}`, { method: 'DELETE' });
      const updated = checklist.filter((c) => c.id !== itemId);
      setChecklist(updated);
      onUpdated({ ...card, checklist: updated });
    } catch {
      // ignore
    }
  }

  // ─── Checklist progress ────────────────────────────────────────────────

  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-start justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold bg-transparent border-none outline-none text-[var(--text-primary)] w-full mr-4 focus:ring-1 focus:ring-brand-500 rounded px-1 -ml-1"
            />
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Priority & Assignee Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CardStatus)}
                className="input-field text-sm py-2"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CardPriority)}
                className="input-field text-sm py-2"
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Toggle */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                Assignee
              </label>
              <button
                onClick={() => setAssignee(assignee === 'human' ? 'agent' : 'human')}
                className={cn(
                  'w-full py-2 px-3 rounded-lg text-sm font-medium transition-all border',
                  assignee === 'agent'
                    ? 'bg-brand-500/20 border-brand-500/30 text-brand-400'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'
                )}
              >
                {assignee === 'agent' ? '🤖 Agent' : '👤 Human'}
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="input-field text-sm resize-none"
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Checklist
              </label>
              {totalCount > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {completedCount}/{totalCount} ({progress}%)
                </span>
              )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Items */}
            <div className="space-y-1.5 mb-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleChecklistItem(item)}
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                      item.completed
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-[var(--border-color)] hover:border-brand-400'
                    )}
                  >
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={cn(
                      'text-sm flex-1',
                      item.completed
                        ? 'text-[var(--text-muted)] line-through'
                        : 'text-[var(--text-primary)]'
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 text-xs transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add item */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add checklist item..."
                className="input-field text-sm py-1.5 flex-1"
              />
              <button
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="btn-primary text-sm px-3 py-1.5"
              >
                Add
              </button>
            </div>
          </div>

          {/* Linked Contacts */}
          {card.contacts && card.contacts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                Linked Contacts
              </label>
              <div className="space-y-2">
                {card.contacts.map((cc) => (
                  <div
                    key={cc.id}
                    className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-lg p-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center text-brand-400 text-sm font-semibold">
                      {cc.contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {cc.contact.name}
                      </div>
                      {cc.contact.email && (
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {cc.contact.email}
                        </div>
                      )}
                    </div>
                    {cc.contact.company && (
                      <span className="text-xs text-[var(--text-muted)] shrink-0">
                        {cc.contact.company}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-[var(--text-muted)] flex gap-4">
            <span>Created: {new Date(card.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(card.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-between">
          <div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete Card
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  className="text-sm bg-red-600/20 text-red-400 px-3 py-1 rounded hover:bg-red-600/30 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-1.5">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="btn-primary text-sm px-4 py-1.5"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
