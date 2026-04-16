'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  KANBAN_COLUMNS,
  type KanbanCardData,
  type CardStatus,
  type CardPriority,
} from '@/types';
import { CardDetailModal } from './CardDetailModal';

// ─── Priority badge ─────────────────────────────────────────────────────────

const priorityConfig: Record<CardPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-600/30 text-gray-400' },
  medium: { label: 'Med', color: 'bg-blue-600/30 text-blue-400' },
  high: { label: 'High', color: 'bg-orange-600/30 text-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-600/30 text-red-400' },
};

// ─── Smart Tag Helpers ───────────────────────────────────────────────────────

function getSmartTags(card: KanbanCardData): { label: string; color: string; icon: string }[] {
  const tags: { label: string; color: string; icon: string }[] = [];

  // Connected user tags — members from connections (same instance or federated)
  if (card.project?.members) {
    for (const m of card.project.members) {
      if (m.connection) {
        const name = m.connection.peerUserName || m.connection.peerUserEmail || 'Peer';
        // Federation tag if connection has peerInstanceUrl-like indicators
        tags.push({
          label: name,
          color: 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30',
          icon: '🔗',
        });
      } else if (m.user && m.userId !== card.userId) {
        // Same-instance connected user
        tags.push({
          label: m.user.name || m.user.email,
          color: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
          icon: '👤',
        });
      }
    }
  }

  // Due date urgency tag
  if (card.dueDate) {
    const hoursLeft = (new Date(card.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 0) {
      tags.push({ label: 'Overdue', color: 'bg-red-500/20 text-red-400', icon: '🔴' });
    } else if (hoursLeft < 24) {
      tags.push({ label: 'Due Today', color: 'bg-orange-500/20 text-orange-400', icon: '⏰' });
    }
  }

  return tags;
}

// ─── Kanban Card Component ──────────────────────────────────────────────────

function KanbanCard({
  card,
  onClick,
  isDragging,
}: {
  card: KanbanCardData;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const completedCount = card.checklist?.filter((c) => c.completed).length ?? 0;
  const totalCount = card.checklist?.length ?? 0;
  const priority = priorityConfig[card.priority] || priorityConfig.medium;
  const smartTags = getSmartTags(card);

  return (
    <div
      data-kanban-card="true"
      onClick={onClick}
      className={cn(
        'bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-brand-500/50 transition-all duration-150 group',
        isDragging && 'opacity-50 ring-2 ring-brand-500 shadow-xl rotate-2'
      )}
    >
      {/* Smart Tags Row */}
      {smartTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {smartTags.map((tag, i) => (
            <span key={i} className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5', tag.color)}>
              {tag.icon} {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Title & Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
          {card.title}
        </h4>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0', priority.color)}>
          {priority.label}
        </span>
      </div>

      {/* Description preview */}
      {card.description && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">
          {card.description}
        </p>
      )}

      {/* Footer: Checklist + Assignee */}
      <div className="flex items-center justify-between mt-1">
        {totalCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {completedCount}/{totalCount}
            </span>
          </div>
        ) : (
          <span />
        )}
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            card.assignee === 'agent'
              ? 'bg-brand-500/20 text-brand-400'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
          )}
        >
          {card.assignee === 'agent' ? '🤖 Agent' : '👤 Human'}
        </span>
      </div>

      {/* Project members */}
      {card.project && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] text-brand-400/70">📁 {card.project.name}</span>
            <AssignTeamDropdown
              projectId={card.project.id}
              projectName={card.project.name}
              currentTeam={(card.project as any).team}
              onAssigned={() => window.dispatchEvent(new Event('dividen:board-refresh'))}
            />
          </div>
          {card.project.members && card.project.members.length > 0 && <div className="flex items-center -space-x-1.5">
            {card.project.members.slice(0, 5).map((m) => {
              const name = m.user?.name || m.connection?.peerUserName || '?';
              const initial = name.charAt(0).toUpperCase();
              const isFederated = !!m.connection;
              const roleColors: Record<string, string> = {
                lead: 'ring-amber-500/60',
                contributor: 'ring-brand-500/40',
                reviewer: 'ring-purple-500/40',
                observer: 'ring-white/20',
              };
              return (
                <div
                  key={m.id}
                  title={`${name} (${m.role})${isFederated ? ' — federated' : ''}`}
                  className={cn(
                    'w-5 h-5 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[9px] font-medium text-[var(--text-secondary)] ring-1 cursor-pointer hover:ring-2 transition-all',
                    isFederated ? 'ring-purple-500/60' : (roleColors[m.role] || 'ring-white/20')
                  )}
                >
                  {initial}
                </div>
              );
            })}
            {card.project.members.length > 5 && (
              <div className="w-5 h-5 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[8px] text-[var(--text-muted)] ring-1 ring-white/10">
                +{card.project.members.length - 5}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* Contacts count */}
      {card.contacts && card.contacts.length > 0 && !card.project?.members?.length && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <span>👥</span>
          <span>{card.contacts.length} contact{card.contacts.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* v2: Delegation provenance badge */}
      {card.originUserId && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-400">
          <span>⬅️</span>
          <span className="px-1 py-0.5 rounded bg-purple-500/15 font-medium">delegated</span>
          <span className="text-[var(--text-secondary)] truncate">
            from {card.originUserName || 'another user'}
          </span>
        </div>
      )}

      {/* Linked Kards indicator */}
      {card.linkedCards && card.linkedCards.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          {card.linkedCards.map((link) => (
            <div key={link.linkId} className="flex items-center gap-1.5 text-[10px] mb-0.5">
              <span className={cn(
                'px-1 py-0.5 rounded font-medium',
                link.direction === 'outbound'
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'bg-purple-500/15 text-purple-400'
              )}>
                {link.direction === 'outbound' ? '→' : '←'} {link.linkType}
              </span>
              <span className="text-[var(--text-secondary)] truncate flex-1" title={link.linkedCardTitle}>
                {link.linkedCardTitle}
              </span>
              <span className="text-[var(--text-muted)] shrink-0">
                {link.linkedUserName || '?'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Card Wrapper ──────────────────────────────────────────────────

function SortableCard({
  card,
  onClick,
}: {
  card: KanbanCardData;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard card={card} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

// ─── Column Component ───────────────────────────────────────────────────────

function KanbanColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
}: {
  column: (typeof KANBAN_COLUMNS)[0];
  cards: KanbanCardData[];
  onCardClick: (card: KanbanCardData) => void;
  onAddCard: (status: CardStatus) => void;
}) {
  const cardIds = cards.map((c) => c.id);

  return (
    <div role="region" aria-label={`${column.label} column, ${cards.length} cards`} className="flex-1 min-w-[200px] bg-[var(--bg-surface)]/30 rounded-lg flex flex-col">
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {column.label}
          </span>
          <span className="text-xs bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
            {cards.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
          aria-label={`Add card to ${column.label}`}
          className="text-[var(--text-muted)] hover:text-brand-400 text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-surface)]"
        >
          +
        </button>
      </div>

      {/* Cards Area */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[60px]">
          {cards.length === 0 ? (
            <div className="border border-dashed border-[var(--border-color)]/50 rounded-lg p-4 text-center">
              <p className="text-xs text-[var(--text-muted)]">No cards</p>
            </div>
          ) : (
            cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── New Card Form ──────────────────────────────────────────────────────────

function NewCardForm({
  status,
  onSave,
  onCancel,
}: {
  status: CardStatus;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-semibold mb-4">
          Add Card to {KANBAN_COLUMNS.find((c) => c.id === status)?.label}
        </h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title..."
          className="input-field mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm px-3 py-1.5">
            Cancel
          </button>
          <button type="submit" disabled={!title.trim()} className="btn-primary text-sm px-3 py-1.5">
            Add Card
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Assign Team to Project Dropdown ─────────────────────────────────────────

function AssignTeamDropdown({ projectId, projectName, currentTeam, onAssigned }: {
  projectId: string;
  projectName: string;
  currentTeam?: { id: string; name: string; avatar?: string | null } | null;
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTeams = useCallback(async () => {
    if (teams.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeams(data.map((t: any) => ({ id: t.id, name: t.name, avatar: t.avatar })));
      }
    } catch {}
    setLoading(false);
  }, [teams.length]);

  const assign = async (teamId: string | null) => {
    setSaving(true);
    try {
      const body: any = { teamId: teamId || null };
      if (teamId) body.visibility = 'team';
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onAssigned();
    } catch {}
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); if (!open) fetchTeams(); }}
        className={cn(
          'text-[9px] px-1.5 py-0.5 rounded transition-all',
          currentTeam
            ? 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25'
            : 'bg-brand-500/10 text-brand-400/60 hover:text-brand-400 hover:bg-brand-500/20'
        )}
        title={currentTeam ? `Team: ${currentTeam.name} — click to change` : `Assign ${projectName} to a team`}
      >
        {currentTeam ? `${currentTeam.avatar || '👥'} ${currentTeam.name}` : '+ Assign Team'}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-50 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] text-[var(--text-muted)] px-2 py-1 mb-1">
            {currentTeam ? 'Change team for' : 'Assign team to'} <strong className="text-white">{projectName}</strong>
          </p>
          {loading ? (
            <p className="text-[10px] text-[var(--text-muted)] px-2 py-2">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)] px-2 py-2">No teams yet. Create one in Teams tab.</p>
          ) : (
            <div className="space-y-0.5">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => assign(t.id)}
                  disabled={saving || t.id === currentTeam?.id}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-all',
                    t.id === currentTeam?.id
                      ? 'bg-purple-500/15 text-purple-400'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  {t.avatar || '👥'} {t.name}
                  {t.id === currentTeam?.id && <span className="text-[9px] ml-1 text-[var(--text-muted)]">(current)</span>}
                </button>
              ))}
              {currentTeam && (
                <button
                  onClick={() => assign(null)}
                  disabled={saving}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  ✕ Remove from team
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main KanbanView ────────────────────────────────────────────────────────

interface KanbanViewProps {
  onDiscuss?: (context: string) => void;
}

export function KanbanView({ onDiscuss }: KanbanViewProps = {}) {
  const [cards, setCards] = useState<KanbanCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cortexScanning, setCortexScanning] = useState(false);
  const [cortexResult, setCortexResult] = useState<{ duplicates: number; stale: number; escalations: number; archives: number; autoActions: string[] } | null>(null);
  const [showCortexTooltip, setShowCortexTooltip] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState<CardStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ─── Fetch cards ────────────────────────────────────────────────────────

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/kanban');
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
      } else {
        setError(data.error || 'Failed to fetch cards');
      }
    } catch (err) {
      setError('Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Listen for custom refresh events (from chat actions, settings saves, etc.)
  useEffect(() => {
    const handler = () => fetchCards();
    window.addEventListener('dividen:board-refresh', handler);
    window.addEventListener('dividen:now-refresh', handler);
    return () => {
      window.removeEventListener('dividen:board-refresh', handler);
      window.removeEventListener('dividen:now-refresh', handler);
    };
  }, [fetchCards]);

  // ─── Card grouping ─────────────────────────────────────────────────────

  const cardsByColumn = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = cards
        .filter((c) => c.status === col.id)
        .sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<CardStatus, KanbanCardData[]>
  );

  // ─── Drag handlers ─────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Find which column the "over" element belongs to
    const overCard = cards.find((c) => c.id === over.id);
    let targetStatus: CardStatus | undefined;

    if (overCard) {
      targetStatus = overCard.status;
    } else {
      // Could be over an empty column droppable
      const columnId = KANBAN_COLUMNS.find((col) => col.id === over.id)?.id;
      if (columnId) targetStatus = columnId;
    }

    if (targetStatus && activeCard.status !== targetStatus) {
      // Optimistically move card to new column
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeCard.id ? { ...c, status: targetStatus! } : c
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Determine the target column
    const overCard = cards.find((c) => c.id === over.id);
    let targetStatus = activeCard.status;
    if (overCard) {
      targetStatus = overCard.status;
    } else {
      const columnId = KANBAN_COLUMNS.find((col) => col.id === over.id)?.id;
      if (columnId) targetStatus = columnId;
    }

    // Persist move to API
    try {
      const res = await fetch(`/api/kanban/${activeCard.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh to get correct ordering
        await fetchCards();
      }
    } catch {
      // Revert on error
      await fetchCards();
    }
  }

  // ─── Add Card ───────────────────────────────────────────────────────────

  async function handleAddCard(title: string) {
    if (!addingToColumn) return;
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, status: addingToColumn }),
      });
      const data = await res.json();
      if (data.success) {
        setCards((prev) => [...prev, data.data]);
      }
    } catch {
      // ignore
    }
    setAddingToColumn(null);
  }

  // ─── Card detail handler ──────────────────────────────────────────────

  function handleCardUpdated(updatedCard: KanbanCardData) {
    setCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
    setSelectedCard(updatedCard);
  }

  function handleCardDeleted(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setSelectedCard(null);
  }

  // ─── Active drag card ─────────────────────────────────────────────────

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  // ─── Board drag-scroll (Trello-like) ──────────────────────────────────
  // Enables horizontal scrolling by dragging empty areas of the board.
  // Only activates when mouse isn't over a card (cards use dnd-kit instead).
  const boardRef = useRef<HTMLDivElement>(null);
  const boardDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onBoardPointerDown = useCallback((e: React.PointerEvent) => {
    // Only initiate board scroll if NOT clicking on a card
    const target = e.target as HTMLElement;
    if (target.closest('[data-kanban-card]')) return;
    const el = boardRef.current;
    if (!el) return;
    boardDrag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.setPointerCapture(e.pointerId);
  }, []);

  const onBoardPointerMove = useCallback((e: React.PointerEvent) => {
    if (!boardDrag.current.active) return;
    const el = boardRef.current;
    if (!el) return;
    const dx = e.clientX - boardDrag.current.startX;
    el.scrollLeft = boardDrag.current.scrollLeft - dx;
  }, []);

  const onBoardPointerUp = useCallback((e: React.PointerEvent) => {
    if (!boardDrag.current.active) return;
    boardDrag.current.active = false;
    const el = boardRef.current;
    if (el) {
      el.style.cursor = '';
      try { el.releasePointerCapture(e.pointerId); } catch {}
    }
  }, []);

  // ─── Cortex Scan ─────────────────────────────────────────────────────
  const handleCortexScan = useCallback(async () => {
    setCortexScanning(true);
    setCortexResult(null);
    try {
      const res = await fetch('/api/board/cortex', { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      const json = await res.json();
      const data = json.data;
      setCortexResult({
        duplicates: data.duplicates?.length || 0,
        stale: data.stale?.length || 0,
        escalations: data.escalations?.length || 0,
        archives: data.archives?.length || 0,
        autoActions: data.autoActions || [],
      });
      // Refresh cards if any auto-actions were taken
      if (data.autoActions?.length > 0) {
        fetchCards();
      }
      // Auto-dismiss result after 8 seconds
      setTimeout(() => setCortexResult(null), 8000);
    } catch (err) {
      console.error('Cortex scan error:', err);
    } finally {
      setCortexScanning(false);
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--text-muted)] text-sm">Loading kanban board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <>
      {/* ─── Board Toolbar ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Cortex Scan Result Badge */}
          {cortexResult && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-lg border border-white/5 animate-in fade-in slide-in-from-right-2 duration-300">
              {cortexResult.duplicates + cortexResult.stale + cortexResult.escalations + cortexResult.archives === 0 ? (
                <span className="text-green-400">✓ Board looks clean</span>
              ) : (
                <>
                  {cortexResult.duplicates > 0 && <span className="text-yellow-400">{cortexResult.duplicates} dupes</span>}
                  {cortexResult.stale > 0 && <span className="text-orange-400">{cortexResult.stale} stale</span>}
                  {cortexResult.escalations > 0 && <span className="text-red-400">{cortexResult.escalations} escalated</span>}
                  {cortexResult.archives > 0 && <span className="text-[var(--text-muted)]">{cortexResult.archives} archivable</span>}
                  {cortexResult.autoActions.length > 0 && (
                    <span className="text-purple-400 ml-1">· {cortexResult.autoActions.length} auto-action{cortexResult.autoActions.length !== 1 ? 's' : ''}</span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Cortex Scan Button */}
          <div className="relative">
            <button
              onClick={handleCortexScan}
              disabled={cortexScanning}
              onMouseEnter={() => setShowCortexTooltip(true)}
              onMouseLeave={() => setShowCortexTooltip(false)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                'bg-[var(--bg-surface)] border border-white/5 hover:border-white/10',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                cortexScanning && 'opacity-70 cursor-wait'
              )}
            >
              <span className={cn('text-sm', cortexScanning && 'animate-spin')}>
                {cortexScanning ? '⟳' : '🧠'}
              </span>
              <span className="hidden sm:inline">
                {cortexScanning ? 'Scanning...' : 'Cortex Scan'}
              </span>
            </button>

            {/* Tooltip */}
            {showCortexTooltip && !cortexScanning && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-50 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                <div className="font-medium text-[var(--text-primary)] mb-1">Board Cortex Scan</div>
                <p>AI-powered board intelligence that detects duplicate cards, stale items, overdue escalations, and archive candidates. Auto-takes housekeeping actions when safe.</p>
                <p className="mt-1.5 text-[var(--text-muted)]">Also runs automatically every 6 hours.</p>
                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#1a1a2e] border-l border-t border-white/10 rotate-45" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={boardRef}
        className="flex-1 p-4 pt-1 overflow-x-auto cursor-default select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onPointerDown={onBoardPointerDown}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerCancel={onBoardPointerUp}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full min-w-[1000px]">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={cardsByColumn[col.id] || []}
                onCardClick={setSelectedCard}
                onAddCard={setAddingToColumn}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="rotate-2 scale-105 shadow-2xl">
                <KanbanCard card={activeCard} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* New Card Form */}
      {addingToColumn && (
        <NewCardForm
          status={addingToColumn}
          onSave={handleAddCard}
          onCancel={() => setAddingToColumn(null)}
        />
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
          allCards={cards}
          onMerged={(targetId, deletedId) => {
            setCards(prev => prev.filter(c => c.id !== deletedId));
            setSelectedCard(null);
            fetchCards();
          }}
          onDiscuss={onDiscuss}
        />
      )}
    </>
  );
}
