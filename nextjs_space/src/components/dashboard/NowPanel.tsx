'use client';

import { useState, useEffect, useCallback } from 'react';

interface NowPanelProps {
  onNewTask?: () => void;
  onQuickChat?: () => void;
}

interface QueueItemData {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: string;
}

interface PulseStats {
  pipeline: number;
  diviTasks: number;
  portfolio: number;
  blocked: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  status: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
}

export function NowPanel({ onNewTask, onQuickChat }: NowPanelProps) {
  const [inProgress, setInProgress] = useState<QueueItemData[]>([]);
  const [doneToday, setDoneToday] = useState<QueueItemData[]>([]);
  const [totalReady, setTotalReady] = useState(0);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [pulse, setPulse] = useState<PulseStats>({ pipeline: 0, diviTasks: 0, portfolio: 0, blocked: 0 });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data?.success) {
        const items = data?.data ?? [];
        setInProgress(items?.filter((i: QueueItemData) => i?.status === 'in_progress') ?? []);
        setDoneToday(items?.filter((i: QueueItemData) => i?.status === 'done_today') ?? []);
        const ready = items?.filter((i: QueueItemData) => i?.status === 'ready') ?? [];
        setTotalReady(ready.length);
        const blocked = items?.filter((i: QueueItemData) => i?.status === 'blocked')?.length ?? 0;
        setPulse(prev => ({ ...prev, diviTasks: ready.length + (items?.filter((i: QueueItemData) => i?.status === 'in_progress')?.length ?? 0), blocked }));
      }
    } catch (e: unknown) {
      console.error('Failed to fetch queue:', e);
    }
  }, []);

  const fetchKanban = useCallback(async () => {
    try {
      const res = await fetch('/api/kanban');
      const data = await res.json();
      if (data?.success) {
        const cards = data?.data ?? [];
        const activeStatuses = ['active', 'development', 'planning'];
        const pipelineStatuses = ['leads', 'qualifying', 'proposal', 'negotiation', 'contracted'];
        const activeCards = cards.filter((c: PortfolioItem) => activeStatuses.includes(c.status));
        const pipelineCards = cards.filter((c: PortfolioItem) => pipelineStatuses.includes(c.status));
        setPortfolio(activeCards.slice(0, 8));
        setPulse(prev => ({ ...prev, pipeline: pipelineCards.length, portfolio: activeCards.length }));
      }
    } catch (e: unknown) {
      console.error('Failed to fetch kanban:', e);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 2); // Today + tomorrow
      const res = await fetch(`/api/calendar?startDate=${now.toISOString()}&endDate=${end.toISOString()}`);
      const data = await res.json();
      if (data?.success) {
        setUpcomingEvents((data?.data ?? []).slice(0, 4));
      }
    } catch (e: unknown) {
      console.error('Failed to fetch calendar:', e);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchKanban();
    fetchCalendar();
  }, [fetchQueue, fetchKanban, fetchCalendar]);

  const handleNewTask = async () => {
    if (!newTaskTitle?.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          title: newTaskTitle.trim(),
          priority: 'medium',
          status: 'ready',
          source: 'user',
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setNewTaskTitle('');
        setShowNewTask(false);
        fetchQueue();
        onNewTask?.();
      }
    } catch (e: unknown) {
      console.error('Failed to create task:', e);
    } finally {
      setCreating(false);
    }
  };

  const activeTask = inProgress?.[0];
  const completedCount = doneToday?.length ?? 0;
  const totalCount = completedCount + (inProgress?.length ?? 0) + totalReady;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const STATUS_DOT: Record<string, string> = {
    active: 'bg-green-400',
    development: 'bg-cyan-400',
    planning: 'bg-indigo-400',
  };

  return (
    <div className="panel h-full flex flex-col">
      {/* Today's Pulse Header */}
      <div className="panel-header flex-col items-start gap-1">
        <div className="flex items-center justify-between w-full">
          <h2 className="label-mono-accent">⚡ NOW</h2>
          <span className="label-mono" style={{ fontSize: '10px' }}>Focus</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {completedCount}/{totalCount} tasks • {pulse.pipeline} pipeline • {pulse.portfolio} active
        </div>
      </div>

      <div className="panel-body flex-1 flex flex-col overflow-y-auto">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { label: 'Pipeline', value: pulse.pipeline, color: 'text-blue-400' },
            { label: 'Divi', value: pulse.diviTasks, color: 'text-brand-400' },
            { label: 'Active', value: pulse.portfolio, color: 'text-green-400' },
            { label: 'Blocked', value: pulse.blocked, color: pulse.blocked > 0 ? 'text-red-400' : 'text-[var(--text-muted)]' },
          ].map(s => (
            <div key={s.label} className="text-center py-1.5 bg-[var(--bg-surface)] rounded-md">
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Current Focus Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${activeTask ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className={`text-xs font-medium ${activeTask ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
              {activeTask ? 'Active' : 'Idle'}
            </span>
          </div>
          <h3 className="font-medium text-sm mb-0.5">{activeTask?.title ?? 'No active task'}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {activeTask ? `Priority: ${activeTask.priority}` : 'Create a task or start one from your queue.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5 mb-3">
          {showNewTask ? (
            <div className="space-y-1.5">
              <input
                type="text"
                className="input-field text-sm"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskTitle(e?.target?.value ?? '')}
                onKeyDown={(e: React.KeyboardEvent) => e?.key === 'Enter' && handleNewTask()}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleNewTask} disabled={creating || !newTaskTitle?.trim()} className="flex-1 btn-primary text-sm disabled:opacity-50">
                  {creating ? 'Creating...' : 'Add'}
                </button>
                <button onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }} className="btn-secondary text-sm px-3">✕</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setShowNewTask(true)} className="flex-1 btn-secondary text-xs text-left py-1.5">+ Task</button>
              <button onClick={() => onQuickChat?.()} className="flex-1 btn-secondary text-xs text-left py-1.5">💬 Chat</button>
            </div>
          )}
        </div>

        {/* Coming Up — Calendar Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-3">
            <h4 className="label-mono mb-1.5" style={{ fontSize: '10px' }}>Coming Up</h4>
            <div className="space-y-1">
              {upcomingEvents.map(ev => {
                const start = new Date(ev.startTime);
                const isToday = start.toDateString() === new Date().toDateString();
                const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const dayLabel = isToday ? 'Today' : start.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div key={ev.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-brand-400 font-mono w-16 flex-shrink-0">{dayLabel} {timeStr}</span>
                    <span className="text-xs text-[var(--text-secondary)] truncate">{ev.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Portfolio Section */}
        {portfolio.length > 0 && (
          <div className="mb-3">
            <h4 className="label-mono mb-1.5" style={{ fontSize: '10px' }}>Portfolio</h4>
            <div className="space-y-1">
              {portfolio.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-[var(--bg-surface)] transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] || 'bg-gray-500'}`} />
                  <span className="text-xs text-[var(--text-secondary)] truncate">{item.title}</span>
                  <span className="text-[9px] text-[var(--text-muted)] capitalize ml-auto flex-shrink-0">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Progress */}
        <div className="mt-auto pt-3">
          <h4 className="label-mono mb-1.5" style={{ fontSize: '10px' }}>Today&apos;s Progress</h4>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-2.5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">Completed</span>
              <span className="font-medium">{completedCount} / {totalCount}</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
