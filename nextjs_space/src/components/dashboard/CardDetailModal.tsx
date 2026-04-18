'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  allCards?: KanbanCardData[];
  onMerged?: (targetCardId: string, deletedCardId: string) => void;
  onDiscuss?: (context: string) => void;
}

const priorities: { id: CardPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'bg-gray-600/30 text-gray-400' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-600/30 text-blue-400' },
  { id: 'high', label: 'High', color: 'bg-orange-600/30 text-orange-400' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-600/30 text-red-400' },
];

// ─── Members Section (project-linked cards) ─────────────────────────────────
type MemberData = {
  id: string;
  role: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
  connection: { id: string; peerUserName: string | null; peerUserEmail: string | null } | null;
};

type PendingInvite = {
  id: string;
  role: string;
  inviteeEmail?: string | null;
  invitee?: { id?: string; name?: string | null; email?: string | null; username?: string | null } | null;
  connection?: { id?: string; peerUserName?: string | null; peerUserEmail?: string | null } | null;
};

type ConnectionOption = {
  id: string;
  peerUserName: string | null;
  peerUserEmail: string | null;
};

function MembersSection({ projectId, projectName, initialMembers, initialInvites }: {
  projectId: string;
  projectName: string;
  initialMembers: MemberData[];
  initialInvites?: PendingInvite[];
}) {
  const [members, setMembers] = useState<MemberData[]>(initialMembers);
  const [invites] = useState<PendingInvite[]>(initialInvites || []);
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [loadingConn, setLoadingConn] = useState(false);
  const [selectedConnId, setSelectedConnId] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('contributor');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Fetch connections when add form opens
  const loadConnections = useCallback(async () => {
    if (connections.length > 0) return;
    setLoadingConn(true);
    try {
      const res = await fetch('/api/connections?status=active');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter out connections already in members
        const existingConnIds = new Set(members.filter(m => m.connection).map(m => m.connection!.id));
        setConnections(data.filter((c: any) => !existingConnIds.has(c.id)).map((c: any) => ({
          id: c.id,
          peerUserName: c.peerUserName,
          peerUserEmail: c.peerUserEmail,
        })));
      }
    } catch { /* ignore */ }
    setLoadingConn(false);
  }, [connections.length, members]);

  const handleAdd = async () => {
    setError('');
    if (!selectedConnId && !addEmail.trim()) {
      setError('Select a connection or enter an email');
      return;
    }
    setAdding(true);
    try {
      const body: any = { role: addRole };
      if (selectedConnId) body.connectionId = selectedConnId;
      else body.email = addEmail.trim();

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add member');
      } else {
        setMembers(prev => [...prev, data]);
        setShowAdd(false);
        setSelectedConnId('');
        setAddEmail('');
        // Remove from available connections
        if (selectedConnId) {
          setConnections(prev => prev.filter(c => c.id !== selectedConnId));
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
    setAdding(false);
  };

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members?memberId=${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } catch { /* ignore */ }
    setRemoving(null);
  };

  const getMemberLabel = (m: MemberData) => {
    if (m.user) return m.user.name || m.user.email;
    if (m.connection) return m.connection.peerUserName || m.connection.peerUserEmail || 'Federated';
    return 'Unknown';
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-amber-600/30 text-amber-400',
      contributor: 'bg-blue-600/30 text-blue-400',
      observer: 'bg-gray-600/30 text-gray-400',
    };
    return colors[role] || colors.contributor;
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className={cn('w-3 h-3 text-[var(--text-muted)] transition-transform', open && 'rotate-90')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer">
          Members
        </label>
        <span className="text-xs text-[var(--text-muted)]">
          ({members.length}{invites.length > 0 ? ` + ${invites.length} pending` : ''})
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-5">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)] shrink-0">
                  {(getMemberLabel(m) || '?')[0].toUpperCase()}
                </div>
                <span className="truncate text-[var(--text-primary)]">{getMemberLabel(m)}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getRoleBadge(m.role))}>
                  {m.role}
                </span>
                {m.connection && (
                  <span className="text-[10px] text-purple-400">federated</span>
                )}
              </div>
              {m.role !== 'lead' && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removing === m.id}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0 disabled:opacity-50"
                >
                  {removing === m.id ? '...' : 'Remove'}
                </button>
              )}
            </div>
          ))}

          {invites.length > 0 && (
            <div className="pt-2 mt-2 border-t border-dashed border-[var(--border-primary)] space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-amber-400/70">Pending invites</div>
              {invites.map(inv => {
                const label = inv.invitee?.name
                  || inv.connection?.peerUserName
                  || inv.inviteeEmail
                  || inv.invitee?.email
                  || 'Unknown';
                const initial = (label || '?')[0].toUpperCase();
                return (
                  <div key={inv.id} className="flex items-center gap-2 text-sm opacity-80">
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-medium text-amber-300 shrink-0 ring-1 ring-amber-400/50"
                      style={{ borderStyle: 'dashed' }}>
                      {initial}
                    </div>
                    <span className="truncate text-[var(--text-primary)]">{label}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', getRoleBadge(inv.role))}>
                      {inv.role}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-600/20 text-amber-400">
                      pending
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!showAdd ? (
            <button
              onClick={() => { setShowAdd(true); loadConnections(); }}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + Add member
            </button>
          ) : (
            <div className="space-y-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Connection dropdown */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">From connections</label>
                <select
                  value={selectedConnId}
                  onChange={e => { setSelectedConnId(e.target.value); if (e.target.value) setAddEmail(''); }}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                >
                  <option value="">— select connection —</option>
                  {loadingConn && <option disabled>Loading...</option>}
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.peerUserName || c.peerUserEmail || c.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Or by email */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">Or by email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={addEmail}
                  onChange={e => { setAddEmail(e.target.value); if (e.target.value) setSelectedConnId(''); }}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">Role</label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                >
                  <option value="contributor">Contributor</option>
                  <option value="observer">Observer</option>
                  <option value="lead">Lead</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="px-3 py-1 text-xs rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setError(''); }}
                  className="px-3 py-1 text-xs rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CardDetailModal({ card, onClose, onUpdated, onDeleted, allCards, onMerged, onDiscuss }: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [status, setStatus] = useState<CardStatus>(card.status);
  const [priority, setPriority] = useState<CardPriority>(card.priority);
  const [assignee, setAssignee] = useState<CardAssignee>(card.assignee);
  const [checklist, setChecklist] = useState<ChecklistItemData[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // ─── Activity feed state ───────────────────────────────────────────────
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEntries, setActivityEntries] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (activityLoaded) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/kanban/${card.id}/activity?limit=30`);
      const data = await res.json();
      if (data.success) {
        setActivityEntries(data.data || []);
      }
    } catch {
      // ignore
    }
    setActivityLoading(false);
    setActivityLoaded(true);
  }, [card.id, activityLoaded]);

  useEffect(() => {
    if (activityOpen && !activityLoaded) {
      fetchActivity();
    }
  }, [activityOpen, activityLoaded, fetchActivity]);

  // Available merge targets (other cards)
  const mergeTargets = (allCards || []).filter(c => c.id !== card.id);

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

  // ─── Merge card ─────────────────────────────────────────────────────────

  async function handleMerge() {
    if (!mergeTargetId) return;
    setMerging(true);
    try {
      const res = await fetch('/api/kanban/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCardId: mergeTargetId, sourceCardId: card.id }),
      });
      const data = await res.json();
      if (data.success) {
        onMerged?.(mergeTargetId, card.id);
        onClose();
      }
    } catch {
      // ignore
    } finally {
      setMerging(false);
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

  function formatRelative(dateStr: string): string {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const diff = Math.max(0, now - d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

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
                <div key={item.id} className="group">
                  <div className="flex items-center gap-2">
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
                    {onDiscuss && !item.completed && (
                      <button
                        onClick={() => onDiscuss(`Let's work on this task: "${item.text}" from card "${card.title}". Help me complete it.`)}
                        className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all"
                      >
                        💬
                      </button>
                    )}
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 text-xs transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Assignee + Due Date row */}
                  {(item.assigneeName || item.dueDate) && (
                    <div className="flex items-center gap-3 ml-6 mt-0.5">
                      {item.assigneeName && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          item.assigneeType === 'delegated'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                            : item.assigneeType === 'divi'
                            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                        )}>
                          {item.assigneeType === 'delegated' ? '👤 ' : item.assigneeType === 'divi' ? '🤖 ' : ''}
                          {item.assigneeName}
                          {item.delegationStatus && item.delegationStatus !== 'completed' && (
                            <span className="ml-1 opacity-60">· {item.delegationStatus}</span>
                          )}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className={cn(
                          'text-[10px]',
                          new Date(item.dueDate) < new Date() && !item.completed
                            ? 'text-red-400'
                            : 'text-[var(--text-muted)]'
                        )}>
                          📅 {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
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

          {/* Members (only for project-linked cards) */}
          {card.project && (
            <MembersSection
              projectId={card.project.id}
              projectName={card.project.name}
              initialMembers={card.project.members}
              initialInvites={(card.project as any).projectInvites || []}
            />
          )}

          {/* Metadata */}
          <div className="text-xs text-[var(--text-muted)] flex gap-4">
            <span>Created: {new Date(card.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(card.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Activity Feed (collapsible) */}
          <div>
            <button
              onClick={() => setActivityOpen(!activityOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <svg
                className={cn('w-3 h-3 text-[var(--text-muted)] transition-transform', activityOpen && 'rotate-90')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer">
                Activity
              </label>
              {activityEntries.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">({activityEntries.length})</span>
              )}
            </button>

            {activityOpen && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {activityLoading && (
                  <div className="text-xs text-[var(--text-muted)] animate-pulse">Loading activity…</div>
                )}
                {!activityLoading && activityEntries.length === 0 && (
                  <div className="text-xs text-[var(--text-muted)]">No activity yet</div>
                )}
                {activityEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-start gap-2 text-xs py-1.5 px-2 rounded-md',
                      entry.isCrossUser
                        ? 'bg-brand-500/5 border border-brand-500/10'
                        : 'bg-[var(--bg-surface)]'
                    )}
                  >
                    <span className="shrink-0 mt-0.5">
                      {entry.isCrossUser ? '🔗' : entry.actor === 'divi' ? '🤖' : '👤'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[var(--text-secondary)]">{entry.summary}</span>
                    </div>
                    <span className="text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Merge Panel */}
        {showMerge && mergeTargets.length > 0 && (
          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">🔀 Merge into another project</span>
              <span className="text-xs text-[var(--text-muted)]">All tasks, people, and artifacts move to the target</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={mergeTargetId}
                onChange={(e) => { setMergeTargetId(e.target.value); setMergeConfirm(false); }}
                className="flex-1 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2"
              >
                <option value="">Select target project…</option>
                {mergeTargets.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.checklist?.length || 0} tasks)</option>
                ))}
              </select>
              {!mergeConfirm ? (
                <button
                  onClick={() => setMergeConfirm(true)}
                  disabled={!mergeTargetId || merging}
                  className="text-sm px-3 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-40"
                >
                  Merge
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400">This card will be deleted</span>
                  <button
                    onClick={handleMerge}
                    disabled={merging}
                    className="text-sm px-3 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
                  >
                    {merging ? 'Merging…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setMergeConfirm(false)}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">Sure?</span>
                <button
                  onClick={handleDelete}
                  className="text-sm bg-red-600/20 text-red-400 px-3 py-1 rounded hover:bg-red-600/30 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1"
                >
                  No
                </button>
              </div>
            )}
            {mergeTargets.length > 0 && (
              <button
                onClick={() => setShowMerge(!showMerge)}
                className={cn('text-sm transition-colors', showMerge ? 'text-brand-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
              >
                🔀 Merge
              </button>
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