'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import { CommsTab } from './CommsTab';
import { AgentWidgetContainer, parseWidgetPayload } from '@/components/widgets';
import { emitSignal } from '@/lib/behavior-signals';
import { MentionText } from '@/components/MentionText';
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

// ─── Auto-categorization ────────────────────────────────────────────────────

type QueueCategory = 'action' | 'notification' | 'relay' | 'fyi' | 'task';

function categorizeItem(item: QueueItemData): { category: QueueCategory; label: string; color: string } {
  // Parse metadata for source hints
  let meta: any = null;
  try { if (item.metadata) meta = JSON.parse(item.metadata); } catch {}

  if (item.type === 'notification' || meta?.type === 'notification') {
    return { category: 'notification', label: 'Notification', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  }
  if (meta?.relayId || meta?.source === 'relay' || item.source === 'relay') {
    return { category: 'relay', label: 'Relay', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  }
  if (item.type === 'agent_suggestion') {
    return { category: 'fyi', label: 'Suggestion', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  }
  if (item.type === 'reminder') {
    return { category: 'notification', label: 'Reminder', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  if (item.priority === 'urgent' || item.priority === 'high') {
    return { category: 'action', label: 'Action Required', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  }
  return { category: 'task', label: 'Task', color: 'text-white/40 bg-white/5 border-white/10' };
}

// ─── Queue Item Card ────────────────────────────────────────────────────────

function QueueItemCard({
  item,
  onStatusChange,
  onDelete,
  onSendToComms,
  onDiscuss,
  onEdit,
}: {
  item: QueueItemData;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
  onDelete: (id: string) => void;
  onSendToComms?: (id: string, title: string) => void;
  onDiscuss?: (context: string) => void;
  onEdit?: (id: string, data: { title?: string; description?: string; priority?: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description || '');
  const [editPriority, setEditPriority] = useState(item.priority);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const pi = priorityIndicator[item.priority] || priorityIndicator.medium;
  const cat = categorizeItem(item);
  const capMeta = parseCapabilityMeta(item.metadata);
  const isCapabilityAction = !!capMeta?.capabilityType;
  const capIcon = capMeta ? (capabilityIcons[capMeta.capabilityType || ''] || '⚡') : '';

  // Parse smart prompter metadata
  const parsedMeta = (() => {
    if (!item.metadata) return null;
    try { return JSON.parse(item.metadata); } catch { return null; }
  })();
  const displaySummary: string | null = parsedMeta?.displaySummary || null;
  const hasOptimizedPayload = !!parsedMeta?.optimizedPayload;
  const optimizedForAgent: string | null = parsedMeta?._optimizedForAgent || null;

  async function handleSaveEdit() {
    if (!onEdit) return;
    setSaving(true);
    const changes: any = {};
    if (editTitle !== item.title) changes.title = editTitle;
    if (editDesc !== (item.description || '')) changes.description = editDesc;
    if (editPriority !== item.priority) changes.priority = editPriority;
    if (Object.keys(changes).length === 0) { setEditing(false); setSaving(false); return; }
    await onEdit(item.id, changes);
    setSaving(false);
    setEditing(false);
    // Trigger smart optimization in background
    setOptimizing(true);
    fetch(`/api/queue/${item.id}/optimize`, { method: 'POST' })
      .then(r => r.json())
      .then(() => setOptimizing(false))
      .catch(() => setOptimizing(false));
  }

  // If editing, show inline edit form
  if (editing) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--brand-primary)]/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[var(--brand-primary)] uppercase tracking-wider">Edit Task</span>
          <button onClick={() => { setEditing(false); setEditTitle(item.title); setEditDesc(item.description || ''); setEditPriority(item.priority); }} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Cancel</button>
        </div>
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full text-sm bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[var(--text-primary)] focus:border-[var(--brand-primary)]/50 outline-none"
          placeholder="Task title"
        />
        <textarea
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[var(--text-secondary)] resize-none focus:border-[var(--brand-primary)]/50 outline-none"
          rows={2}
          placeholder="Description (optional)"
        />
        <div className="flex items-center gap-2">
          <select value={editPriority} onChange={e => setEditPriority(e.target.value as CardPriority)} className="text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-secondary)]">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={handleSaveEdit}
            disabled={saving || !editTitle.trim()}
            className="text-[11px] px-3 py-1 rounded-md bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/25 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Optimize'}
          </button>
        </div>
      </div>
    );
  }

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
            <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight" title={item.title}>
              <MentionText text={displaySummary || item.title} />
            </h4>
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium', cat.color)}>{cat.label}</span>
            {optimizing && <span className="text-[9px] text-[var(--brand-primary)] animate-pulse">✨ optimizing...</span>}
            {hasOptimizedPayload && !optimizing && <span className="text-[9px] text-green-400" title={`Optimized for ${optimizedForAgent || 'agent'}`}>⚡</span>}
          </div>
          {/* Show full title if summary is truncated */}
          {displaySummary && displaySummary !== item.title && (
            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5 leading-tight">
              <MentionText text={item.title} />
            </p>
          )}
          {item.description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
              <MentionText text={item.description} />
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
            // Check if this widget came from a comm relay (stored in raw metadata JSON)
            let relayId: string | undefined;
            try {
              const rawMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
              relayId = rawMeta?.widgets?.[0]?.metadata?.relayId;
            } catch {}
            return (
              <AgentWidgetContainer
                payload={widgetPayload}
                onAction={relayId ? async (wi, action, widget) => {
                  try {
                    await fetch('/api/relays/widget-response', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        relayId,
                        widgetId: widget.title,
                        itemId: wi.id,
                        action: action.action,
                        payload: action.payload,
                      }),
                    });
                    window.dispatchEvent(new CustomEvent('dividen:queue-refresh'));
                    window.dispatchEvent(new CustomEvent('dividen:comms-refresh'));
                  } catch (err) {
                    console.error('[QueueWidget] Response failed:', err);
                  }
                } : undefined}
                className="mt-2"
              />
            );
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
          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/15 text-amber-400 hover:bg-amber-600/25"
              title="Edit task"
            >
              ✏️
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

// ─── Smart Task Assembly ────────────────────────────────────────────────────

type AssemblyStep = 'type' | 'details' | 'context' | 'review';

const TASK_TYPE_OPTIONS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'review', label: 'Review & Feedback', icon: '📝' },
  { id: 'technical', label: 'Technical', icon: '⚙️' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'strategy', label: 'Strategy', icon: '♟️' },
  { id: 'operations', label: 'Operations', icon: '📋' },
  { id: 'sales', label: 'Sales & BD', icon: '💼' },
  { id: 'finance', label: 'Finance', icon: '📊' },
  { id: 'introductions', label: 'Introductions', icon: '🤝' },
  { id: 'mentoring', label: 'Mentoring', icon: '🌱' },
  { id: 'custom', label: 'Other', icon: '✨' },
];

const PRIORITY_OPTIONS: Array<{ id: CardPriority; label: string; icon: string; color: string }> = [
  { id: 'low', label: 'Low', icon: '○', color: 'text-gray-400' },
  { id: 'medium', label: 'Medium', icon: '◐', color: 'text-blue-400' },
  { id: 'high', label: 'High', icon: '●', color: 'text-orange-400' },
  { id: 'urgent', label: 'Urgent', icon: '⚠', color: 'text-red-400' },
];

interface TaskDraft {
  taskType: string;
  objective: string;
  context: string;
  expectedOutcome: string;
  priority: CardPriority;
}

function SmartTaskAssembly({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, priority: CardPriority, metadata?: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<AssemblyStep>('type');
  const [draft, setDraft] = useState<TaskDraft>({
    taskType: '',
    objective: '',
    context: '',
    expectedOutcome: '',
    priority: 'medium',
  });

  const selectedType = TASK_TYPE_OPTIONS.find(t => t.id === draft.taskType);

  const canProceedFromType = draft.taskType !== '';
  const canProceedFromDetails = draft.objective.trim().length >= 5;
  const canSubmit = canProceedFromType && canProceedFromDetails;

  function handleSubmit() {
    const title = draft.objective.trim();
    const metadata: Record<string, any> = {
      taskType: draft.taskType,
      assembledTask: true,
    };
    if (draft.context.trim()) metadata.context = draft.context.trim();
    if (draft.expectedOutcome.trim()) metadata.expectedOutcome = draft.expectedOutcome.trim();
    onAdd(title, draft.priority, metadata);
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--brand-primary)]/20 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-[var(--brand-primary)]/10 border-b border-[var(--brand-primary)]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs">🧩</span>
          <span className="text-[11px] font-semibold text-[var(--brand-primary)]">Smart Task Assembly</span>
        </div>
        <div className="flex items-center gap-1">
          {(['type', 'details', 'context', 'review'] as AssemblyStep[]).map((s, i) => (
            <div key={s} className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              step === s ? 'bg-[var(--brand-primary)]' :
              (['type', 'details', 'context', 'review'].indexOf(step) > i) ? 'bg-[var(--brand-primary)]/50' : 'bg-[var(--text-muted)]/30'
            )} />
          ))}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Step 1: Task Type */}
        {step === 'type' && (
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">What kind of task?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TASK_TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setDraft(d => ({ ...d, taskType: t.id })); setStep('details'); }}
                  className={cn(
                    'px-2 py-2 rounded-md text-[11px] font-medium transition-all text-center border',
                    draft.taskType === t.id
                      ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)]/40 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--bg-surface-hover)]'
                  )}
                >
                  <div className="text-base mb-0.5">{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Objective + Priority */}
        {step === 'details' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{selectedType?.icon}</span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">{selectedType?.label}</span>
              <button onClick={() => setStep('type')} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← change</button>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Objective <span className="text-red-400">*</span></label>
              <textarea
                value={draft.objective}
                onChange={e => setDraft(d => ({ ...d, objective: e.target.value }))}
                placeholder="What needs to be accomplished? Be specific about the desired result..."
                className="input-field text-sm py-1.5 mt-1 resize-none"
                rows={2}
                autoFocus
                onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Priority</label>
              <div className="flex gap-1 mt-1">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDraft(d => ({ ...d, priority: p.id }))}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition-all border text-center',
                      draft.priority === p.id
                        ? 'bg-[var(--brand-primary)]/15 border-[var(--brand-primary)]/40 text-[var(--brand-primary)]'
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    <span className={p.color}>{p.icon}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setStep('type')} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← Back</button>
              <button
                onClick={() => setStep('context')}
                disabled={!canProceedFromDetails}
                className="text-[11px] btn-primary px-3 py-1 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Context & Expected Outcome (optional) */}
        {step === 'context' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{selectedType?.icon}</span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">{draft.objective}</span>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Context <span className="text-[var(--text-muted)]">(optional)</span></label>
              <textarea
                value={draft.context}
                onChange={e => setDraft(d => ({ ...d, context: e.target.value }))}
                placeholder="Background info, links, constraints, dependencies..."
                className="input-field text-sm py-1.5 mt-1 resize-none"
                rows={2}
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Expected Outcome <span className="text-[var(--text-muted)]">(optional)</span></label>
              <textarea
                value={draft.expectedOutcome}
                onChange={e => setDraft(d => ({ ...d, expectedOutcome: e.target.value }))}
                placeholder="What does 'done' look like? Deliverables, format, success criteria..."
                className="input-field text-sm py-1.5 mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setStep('details')} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← Back</button>
              <button onClick={() => setStep('review')} className="text-[11px] btn-primary px-3 py-1">Review →</button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 'review' && (
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Task Summary</label>
            <div className="bg-[var(--bg-secondary)] rounded-md p-2.5 space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span>{selectedType?.icon}</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedType?.label}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                  draft.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  draft.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  draft.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                )}>{draft.priority}</span>
              </div>
              <p className="text-[var(--text-primary)] font-medium">{draft.objective}</p>
              {draft.context && <p className="text-[var(--text-muted)] text-[11px]">📎 {draft.context}</p>}
              {draft.expectedOutcome && <p className="text-[var(--text-muted)] text-[11px]">🎯 {draft.expectedOutcome}</p>}
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setStep('context')} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← Edit</button>
              <div className="flex gap-1.5">
                <button onClick={onCancel} className="text-[11px] text-[var(--text-muted)] px-2 py-1">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="text-[11px] btn-primary px-3 py-1 disabled:opacity-40"
                >
                  ✓ Add to Queue
                </button>
              </div>
            </div>
          </div>
        )}
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
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

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

  // Listen for custom refresh events (from chat actions, sync, etc.)
  useEffect(() => {
    const handler = () => fetchItems();
    window.addEventListener('dividen:queue-refresh', handler);
    window.addEventListener('dividen:now-refresh', handler);
    return () => {
      window.removeEventListener('dividen:queue-refresh', handler);
      window.removeEventListener('dividen:now-refresh', handler);
    };
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

  async function handleAdd(title: string, priority: CardPriority, metadata?: Record<string, any>) {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, type: metadata?.taskType ? 'task' : 'task', metadata }),
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

  async function handleConfirmAction(id: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch('/api/queue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'approve') {
          // Item moves to ready
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'ready' as QueueItemStatus } : i)));
        } else {
          // Item removed
          setItems((prev) => prev.filter((i) => i.id !== id));
        }
        emitSignal(`queue_${action}`, { itemId: id });
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

  async function handleEdit(id: string, data: { title?: string; description?: string; priority?: string }) {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...result.data } : i)));
        emitSignal('queue_edit', { itemId: id, changes: data });
      }
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

  // ─── Batch Actions ──────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllInCategory(category: QueueCategory) {
    const ids = items.filter(i => categorizeItem(i).category === category && i.status !== 'done_today').map(i => i.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }

  async function handleBatchComplete() {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    await Promise.allSettled(ids.map(id =>
      fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done_today' }),
      })
    ));
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, status: 'done_today' as QueueItemStatus } : i));
    setSelectedIds(new Set());
    setBatchMode(false);
    setBatchProcessing(false);
    window.dispatchEvent(new CustomEvent('dividen:now-refresh'));
  }

  async function handleBatchSnooze() {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    await Promise.allSettled(ids.map(id =>
      fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'later' }),
      })
    ));
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, status: 'later' as QueueItemStatus } : i));
    setSelectedIds(new Set());
    setBatchMode(false);
    setBatchProcessing(false);
  }

  // Count notifications for quick-clear
  const notificationItems = items.filter(i => {
    const c = categorizeItem(i);
    return (c.category === 'notification' || c.category === 'fyi') && i.status !== 'done_today';
  });

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
          <div className="flex items-center gap-1">
            {totalCount > 1 && (
              <button
                onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded transition-colors',
                  batchMode
                    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                )}
                title={batchMode ? 'Exit batch mode' : 'Select multiple items'}
              >
                {batchMode ? '✕ Cancel' : '☑️'}
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-surface-hover)] transition-colors"
              title="Assemble new task"
            >
              +
            </button>
          </div>
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
          {/* Batch Action Bar */}
          {batchMode && selectedIds.size > 0 && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-lg p-2">
                <span className="text-[11px] text-[var(--brand-primary)] font-medium">{selectedIds.size} selected</span>
                <div className="flex-1" />
                <button
                  onClick={handleBatchComplete}
                  disabled={batchProcessing}
                  className="text-[10px] px-2.5 py-1 rounded bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors font-medium"
                >
                  {batchProcessing ? '...' : '✓ Complete All'}
                </button>
                <button
                  onClick={handleBatchSnooze}
                  disabled={batchProcessing}
                  className="text-[10px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-colors font-medium"
                >
                  {batchProcessing ? '...' : '⏳ Snooze All'}
                </button>
              </div>
            </div>
          )}

          {/* Quick-clear notifications */}
          {!batchMode && notificationItems.length >= 2 && (
            <div className="px-4 pt-2">
              <button
                onClick={() => { selectAllInCategory('notification'); selectAllInCategory('fyi'); setBatchMode(true); }}
                className="w-full text-[10px] py-1.5 px-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15 hover:bg-blue-500/15 transition-colors"
              >
                ✓ Clear {notificationItems.length} notification{notificationItems.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Dispatch Button */}
          {!batchMode && readyCount > 0 && (
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
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Inbox Zero
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-1">
                  Nothing pending. You&apos;re completely caught up.
                </p>
                <p className="text-[10px] text-[var(--text-muted)]/60 mb-4">
                  Divi will surface tasks, suggestions, and notifications here as they come in.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  🧩 Assemble Task
                </button>
              </div>
            ) : (
              <>
                {showAddForm && (
                  <SmartTaskAssembly onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
                )}
                {QUEUE_SECTIONS.map((section) => {
                  const sectionItems = grouped[section.id] || [];
                  if (sectionItems.length === 0) return null;

                  // Special rendering for pending_confirmation items
                  if (section.id === 'pending_confirmation') {
                    return (
                      <div key={section.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{section.icon}</span>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
                          <span className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">{sectionItems.length}</span>
                        </div>
                        <div className="space-y-2">
                          {sectionItems.map((item) => (
                            <div key={item.id} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-[var(--text-primary)] truncate"><MentionText text={item.title} /></h4>
                                  {item.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2"><MentionText text={item.description} /></p>}
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 flex-shrink-0">
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-[10px] text-yellow-400/80 mb-2">Divi suggests adding this to your queue. Approve?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleConfirmAction(item.id, 'approve')}
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleConfirmAction(item.id, 'reject')}
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={section.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{section.icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
                        <span className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">{sectionItems.length}</span>
                      </div>
                      <div className="space-y-2">
                        {sectionItems.map((item) => (
                          <div key={item.id} className="relative">
                            {batchMode && (
                              <button
                                onClick={() => toggleSelect(item.id)}
                                className={cn(
                                  'absolute -left-1 top-3 w-4 h-4 rounded border flex items-center justify-center text-[9px] z-10 transition-all',
                                  selectedIds.has(item.id)
                                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                                    : 'border-[var(--border-color)] hover:border-[var(--brand-primary)]/50 text-transparent'
                                )}
                              >
                                ✓
                              </button>
                            )}
                            <div className={batchMode ? 'ml-5' : ''}>
                              <QueueItemCard item={item} onStatusChange={handleStatusChange} onDelete={handleDelete} onSendToComms={handleSendToComms} onDiscuss={onDiscuss} onEdit={handleEdit} />
                            </div>
                          </div>
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
                {(grouped.pending_confirmation?.length ?? 0) > 0 ? `${grouped.pending_confirmation.length} pending · ` : ''}{readyCount} ready · {grouped.in_progress?.length ?? 0} active · {grouped.done_today?.length ?? 0} done · {grouped.blocked?.length ?? 0} blocked
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
              <span className="text-lg group-hover:scale-110 transition-transform">🫧</span>
              <span>Bubble Store</span>
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
