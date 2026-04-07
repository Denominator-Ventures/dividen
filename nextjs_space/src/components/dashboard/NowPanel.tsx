'use client';

import { useState, useEffect, useCallback } from 'react';

interface NowPanelProps {
  onNewTask?: () => void;
  onQuickChat?: () => void;
  onCollapse?: () => void;
}

interface QueueItemData {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: string;
}

export function NowPanel({ onNewTask, onQuickChat, onCollapse }: NowPanelProps) {
  const [inProgress, setInProgress] = useState<QueueItemData[]>([]);
  const [doneToday, setDoneToday] = useState<QueueItemData[]>([]);
  const [totalReady, setTotalReady] = useState(0);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data?.success) {
        const items = data?.data ?? [];
        setInProgress(items?.filter((i: QueueItemData) => i?.status === 'in_progress') ?? []);
        setDoneToday(items?.filter((i: QueueItemData) => i?.status === 'done_today') ?? []);
        setTotalReady(items?.filter((i: QueueItemData) => i?.status === 'ready')?.length ?? 0);
      }
    } catch (e: any) {
      console.error('Failed to fetch queue:', e);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

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
    } catch (e: any) {
      console.error('Failed to create task:', e);
    } finally {
      setCreating(false);
    }
  };

  const activeTask = inProgress?.[0];
  const completedCount = doneToday?.length ?? 0;
  const totalCount = completedCount + (inProgress?.length ?? 0) + totalReady;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <h2 className="label-mono-accent">
          ⚡ NOW
        </h2>
        <div className="flex items-center gap-2">
          <span className="label-mono" style={{ fontSize: '10px' }}>Focus</span>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
              title="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="panel-body flex-1 flex flex-col">
        {/* Current Focus Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${activeTask ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className={`text-xs font-medium ${activeTask ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
              {activeTask ? 'Active' : 'Idle'}
            </span>
          </div>
          <h3 className="font-medium mb-1">{activeTask?.title ?? 'No active task'}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {activeTask ? `Priority: ${activeTask.priority}` : 'Create a task or start one from your queue.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="label-mono mb-1">Quick Actions</h4>
          
          {showNewTask ? (
            <div className="space-y-2">
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
                <button
                  onClick={handleNewTask}
                  disabled={creating || !newTaskTitle?.trim()}
                  className="flex-1 btn-primary text-sm disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }}
                  className="btn-secondary text-sm px-3"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full btn-secondary text-sm text-left"
            >
              + New Task
            </button>
          )}
          
          <button
            onClick={() => onQuickChat?.()}
            className="w-full btn-secondary text-sm text-left"
          >
            💬 Quick Chat
          </button>
        </div>

        {/* Today's Progress */}
        <div className="mt-auto pt-4">
          <h4 className="label-mono mb-2">Today&apos;s Progress</h4>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--text-secondary)]">Completed</span>
              <span className="font-medium">{completedCount} / {totalCount}</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
