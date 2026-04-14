'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActivityStream } from './ActivityStream';

interface NowItem {
  id: string;
  type: 'queue' | 'goal_deadline' | 'kanban_due' | 'relay_response' | 'calendar_prep' | 'goal_check';
  title: string;
  subtitle?: string;
  score: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  sourceId: string;
  meta?: Record<string, any>;
}

// Track onboarding task action in progress
interface OnboardingActionState {
  [taskId: string]: 'completing' | 'skipping';
}

interface CalendarGap {
  start: string;
  end: string;
  minutes: number;
}

interface GoalsSummary {
  total: number;
  critical: number;
  approaching: number;
  onTrack: number;
}

interface NowData {
  items: NowItem[];
  calendarGaps: CalendarGap[];
  activeGoalsSummary: GoalsSummary;
  focusSuggestion: string | null;
}

interface EarningsData {
  jobEarnings: number;
  agentEarnings: number;
  visible: boolean; // only show if user has marketplace agents or is listed for jobs
}

interface NowPanelProps {
  onNewTask?: () => void;
  onQuickChat?: () => void;
  onItemClick?: (title: string) => void;
  onOpenBoard?: () => void;
  onOpenEarnings?: () => void;
  onDiscuss?: (context: string) => void;
}

const URGENCY_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  critical: { dot: 'bg-red-400 animate-pulse', text: 'text-red-400', bg: 'bg-red-400/5 border-red-400/20' },
  high: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/5 border-orange-400/20' },
  medium: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/5 border-blue-400/15' },
  low: { dot: 'bg-gray-500', text: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)] border-[var(--border-color)]' },
};

const TYPE_ICONS: Record<string, string> = {
  queue: '📋',
  goal_deadline: '🎯',
  kanban_due: '📌',
  relay_response: '🔗',
  calendar_prep: '📅',
  goal_check: '⚡',
};

export function NowPanel({ onNewTask, onQuickChat, onItemClick, onOpenBoard, onOpenEarnings, onDiscuss }: NowPanelProps) {
  const [data, setData] = useState<NowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [onboardingActions, setOnboardingActions] = useState<OnboardingActionState>({});
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({ jobEarnings: 0, agentEarnings: 0, visible: false });

  const fetchNow = useCallback(async () => {
    try {
      const res = await fetch('/api/now');
      const json = await res.json();
      if (json?.success) setData(json.data);
    } catch (e) {
      console.error('Failed to fetch NOW data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch('/api/earnings/summary');
      if (res.ok) {
        const json = await res.json();
        if (json?.success) setEarnings(json.data);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchNow();
    fetchEarnings();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNow, 120000);
    return () => clearInterval(interval);
  }, [fetchNow, fetchEarnings]);

  const handleNewTask = async () => {
    if (!newTaskTitle?.trim()) return;
    setCreating(true);
    try {
      // Create a kanban card (operator-assigned) so it appears in Now Panel
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: 'medium',
          status: 'active',
          assignee: 'human',
          dueDate: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (json?.success) {
        setNewTaskTitle('');
        setShowNewTask(false);
        fetchNow();
        onNewTask?.();
      }
    } catch (e) {
      console.error('Failed to create task:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkComplete = useCallback(async (item: NowItem) => {
    setOnboardingActions((prev) => ({ ...prev, [item.sourceId]: 'completing' }));
    try {
      if (item.type === 'queue') {
        // Legacy: complete a queue item
        await fetch(`/api/queue/${item.sourceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done_today' }),
        });
      } else if (item.type === 'kanban_due') {
        // Complete a kanban card
        await fetch(`/api/kanban/${item.sourceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        });
      }
      fetchNow();
    } catch (e) {
      console.error('Failed to mark complete:', e);
    } finally {
      setOnboardingActions((prev) => {
        const next = { ...prev };
        delete next[item.sourceId];
        return next;
      });
    }
  }, [fetchNow]);

  const handleOnboardingAction = useCallback(async (sourceId: string, action: 'complete' | 'skip') => {
    setOnboardingActions((prev) => ({ ...prev, [sourceId]: action === 'complete' ? 'completing' : 'skipping' }));
    try {
      await fetch('/api/onboarding/task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: sourceId, action }),
      });
      fetchNow();
    } catch (e) {
      console.error('Failed to update onboarding task:', e);
    } finally {
      setOnboardingActions((prev) => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
    }
  }, [fetchNow]);

  const items = data?.items ?? [];
  const summary = data?.activeGoalsSummary ?? { total: 0, critical: 0, approaching: 0, onTrack: 0 };
  const nextGap = data?.calendarGaps?.[0];
  const inProgressCount = items.filter(i => i.meta?.status === 'in_progress').length;
  const doneItems = items.filter(i => i.meta?.status === 'done_today');

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header flex-col items-start gap-1">
        <div className="flex items-center justify-between w-full">
          <h2 className="label-mono-accent">⚡ NOW</h2>
          <span className="label-mono" style={{ fontSize: '10px' }}>Dynamic</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {items.length} ranked items • {summary.total} goals • {inProgressCount} active
        </div>
      </div>

      {/* NOW content — hidden when activity stream is expanded */}
      {!activityExpanded && (
        <div className="panel-body flex-1 flex flex-col overflow-y-auto">
          {/* Focus Suggestion */}
          {data?.focusSuggestion && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
              <p className="text-xs text-brand-400 font-medium">{data.focusSuggestion}</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { label: 'Goals', value: summary.total, color: 'text-brand-400' },
              { label: 'Critical', value: summary.critical, color: summary.critical > 0 ? 'text-red-400' : 'text-[var(--text-muted)]' },
              { label: 'Due Soon', value: summary.approaching, color: summary.approaching > 0 ? 'text-orange-400' : 'text-[var(--text-muted)]' },
              { label: 'On Track', value: summary.onTrack, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="text-center py-1.5 bg-[var(--bg-surface)] rounded-md">
                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Calendar Gap Indicator */}
          {nextGap && nextGap.minutes > 0 && (
            <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="text-[10px]">🕐</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {nextGap.minutes >= 60
                  ? `${Math.round(nextGap.minutes / 60)}h ${nextGap.minutes % 60}min available`
                  : `${nextGap.minutes}min gap`}
              </span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-1.5 mb-3">
            {showNewTask ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNewTask()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleNewTask} disabled={creating || !newTaskTitle.trim()} className="flex-1 btn-primary text-sm disabled:opacity-50">
                    {creating ? 'Creating...' : 'Add'}
                  </button>
                  <button onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }} className="btn-secondary text-sm px-3">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={() => setShowNewTask(true)} className="flex-1 btn-secondary text-xs text-left py-1.5">+ Task</button>
                <button onClick={() => onQuickChat?.()} className="flex-1 btn-secondary text-xs text-left py-1.5">💬 Chat</button>
                <button onClick={() => onOpenBoard?.()} className="flex-1 btn-secondary text-xs text-left py-1.5">📋 Board</button>
              </div>
            )}
          </div>

          {/* Ranked Items */}
          {loading ? (
            <div className="text-center text-[var(--text-muted)] text-xs py-8">Scoring priorities...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] text-xs py-8">Clear slate. Add a task or set a goal.</div>
          ) : (
            <div className="space-y-1 mb-3">
              <h4 className="label-mono mb-1" style={{ fontSize: '10px' }}>Priority Stack</h4>
              {items.slice(0, 10).map((item, idx) => {
                const colors = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.low;
                const isOnboarding = item.meta?.onboarding === true;
                const actionInProgress = onboardingActions[item.sourceId];

                return (
                  <div key={item.id} className={`rounded-lg border ${colors.bg} transition-colors`}>
                    <button
                      onClick={() => onItemClick?.(item.title)}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-2 hover:brightness-125 cursor-pointer"
                    >
                      <span className="text-[9px] text-[var(--text-muted)] font-mono w-3">{idx + 1}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <span className="text-[10px] flex-shrink-0">{isOnboarding ? '🚀' : (TYPE_ICONS[item.type] || '📋')}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{item.title}</div>
                        {item.subtitle && <div className={`text-[9px] ${colors.text} truncate`}>{item.subtitle}</div>}
                      </div>
                      <span className="text-[8px] text-[var(--text-muted)] font-mono flex-shrink-0">{item.score}</span>
                    </button>

                    {/* Item action buttons */}
                    <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-0">
                      {isOnboarding ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOnboardingAction(item.sourceId, 'complete'); }}
                            disabled={!!actionInProgress}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionInProgress === 'completing' ? '...' : '✓ Done'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOnboardingAction(item.sourceId, 'skip'); }}
                            disabled={!!actionInProgress}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                          >
                            {actionInProgress === 'skipping' ? '...' : 'Skip'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkComplete(item); }}
                            disabled={!!actionInProgress}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionInProgress === 'completing' ? '...' : '✓ Complete'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDiscuss?.(`Let's discuss this task: "${item.title}". ${item.subtitle ? `Context: ${item.subtitle}` : ''} Priority: ${item.urgency}. Help me work through this and close it out.`); }}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
                          >
                            💬 Discuss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.length > 10 && (
                <div className="text-center text-[9px] text-[var(--text-muted)] py-1">
                  +{items.length - 10} more items
                </div>
              )}
            </div>
          )}

          {/* Done Today */}
          {doneItems.length > 0 && (
            <div className="mt-auto pt-3">
              <h4 className="label-mono mb-1" style={{ fontSize: '10px' }}>Done Today</h4>
              <div className="text-xs text-[var(--text-muted)]">{doneItems.length} tasks completed</div>
            </div>
          )}
        </div>
      )}

      {/* Earnings Widget — only visible if user has marketplace agents or is listed for jobs */}
      {earnings.visible && !activityExpanded && (
        <button
          onClick={() => onOpenEarnings?.()}
          className="mx-3 mb-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--brand-primary)]/30 transition-colors cursor-pointer flex items-center justify-between group"
        >
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">💰 Earnings</span>
          <div className="flex gap-3 text-xs">
            <span className="text-[var(--text-secondary)]">
              Jobs: <span className="font-semibold text-green-400">${earnings.jobEarnings.toLocaleString()}</span>
            </span>
            <span className="text-[var(--text-secondary)]">
              Agents: <span className="font-semibold text-green-400">${earnings.agentEarnings.toLocaleString()}</span>
            </span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors">→</span>
        </button>
      )}

      {/* Activity Stream — expands upward to take over panel */}
      <ActivityStream
        expanded={activityExpanded}
        onToggleExpand={() => setActivityExpanded(prev => !prev)}
      />
    </div>
  );
}