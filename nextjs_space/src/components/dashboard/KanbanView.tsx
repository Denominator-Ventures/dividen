'use client';

import { useState, useEffect, useCallback } from 'react';
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

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 cursor-pointer',
        'hover:border-brand-500/50 transition-all duration-150 group',
        isDragging && 'opacity-50 ring-2 ring-brand-500'
      )}
    >
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
      {card.project && card.project.members && card.project.members.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-brand-400/70">📁 {card.project.name}</span>
          </div>
          <div className="flex items-center -space-x-1.5">
            {card.project.members.slice(0, 5).map((m) => {
              const name = m.user?.name || m.connection?.peerUserName || '?';
              const initial = name.charAt(0).toUpperCase();
              const roleColors: Record<string, string> = {
                lead: 'ring-amber-500/60',
                contributor: 'ring-brand-500/40',
                reviewer: 'ring-purple-500/40',
                observer: 'ring-white/20',
              };
              return (
                <div
                  key={m.id}
                  title={`${name} (${m.role})`}
                  className={cn(
                    'w-5 h-5 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[9px] font-medium text-[var(--text-secondary)] ring-1 cursor-pointer hover:ring-2 transition-all',
                    roleColors[m.role] || 'ring-white/20'
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
          </div>
        </div>
      )}

      {/* Contacts count */}
      {card.contacts && card.contacts.length > 0 && !card.project?.members?.length && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <span>👥</span>
          <span>{card.contacts.length} contact{card.contacts.length > 1 ? 's' : ''}</span>
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
    <div className="flex-1 min-w-[200px] bg-[var(--bg-surface)]/30 rounded-lg flex flex-col">
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {column.label}
          </span>
          <span className="text-xs bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
            {cards.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
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

// ─── Main KanbanView ────────────────────────────────────────────────────────

export function KanbanView() {
  const [cards, setCards] = useState<KanbanCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
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
      <div className="h-full p-4 overflow-x-auto">
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

          <DragOverlay>
            {activeCard ? (
              <div className="rotate-2 scale-105">
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
        />
      )}
    </>
  );
}
