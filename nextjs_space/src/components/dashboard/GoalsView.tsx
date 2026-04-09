'use client';

import { useState, useEffect, useCallback } from 'react';

interface GoalData {
  id: string;
  title: string;
  description: string | null;
  timeframe: string;
  deadline: string | null;
  impact: string;
  status: string;
  progress: number;
  parentGoalId: string | null;
  projectId: string | null;
  teamId: string | null;
  metadata: string | null;
  createdAt: string;
  subGoals?: { id: string; title: string; status: string; progress: number; impact: string }[];
  project?: { id: string; name: string; color: string | null } | null;
  team?: { id: string; name: string; avatar: string | null } | null;
}

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  low: 'text-[var(--text-muted)] bg-[var(--bg-surface)] border-[var(--border-color)]',
};

const IMPACT_DOT: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-blue-400',
  low: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-green-400' },
  paused: { label: 'Paused', color: 'text-yellow-400' },
  completed: { label: 'Done', color: 'text-brand-400' },
  abandoned: { label: 'Abandoned', color: 'text-[var(--text-muted)]' },
};

const TIMEFRAME_LABELS: Record<string, string> = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

export function GoalsView() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalData | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTimeframe, setFormTimeframe] = useState('quarter');
  const [formDeadline, setFormDeadline] = useState('');
  const [formImpact, setFormImpact] = useState('medium');
  const [formSaving, setFormSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter === 'completed' ? 'completed' : 'active'}`;
      const res = await fetch(`/api/goals?parentGoalId=null${statusParam}`);
      const data = await res.json();
      if (data?.success) setGoals(data.data);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormTimeframe('quarter');
    setFormDeadline('');
    setFormImpact('medium');
    setEditingGoal(null);
    setShowForm(false);
  };

  const openEdit = (g: GoalData) => {
    setEditingGoal(g);
    setFormTitle(g.title);
    setFormDescription(g.description || '');
    setFormTimeframe(g.timeframe);
    setFormDeadline(g.deadline ? g.deadline.slice(0, 10) : '');
    setFormImpact(g.impact);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setFormSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        timeframe: formTimeframe,
        deadline: formDeadline || null,
        impact: formImpact,
      };

      if (editingGoal) {
        await fetch(`/api/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      fetchGoals();
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    try {
      const updates: any = { progress };
      if (progress >= 100) updates.status = 'completed';
      await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchGoals();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      fetchGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleStatusToggle = async (goal: GoalData) => {
    const newStatus = goal.status === 'active' ? 'completed' : 'active';
    const newProgress = newStatus === 'completed' ? 100 : goal.progress >= 100 ? 80 : goal.progress;
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progress: newProgress }),
      });
      fetchGoals();
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  // Group goals by timeframe
  const grouped = goals.reduce((acc, g) => {
    const key = g.timeframe;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {} as Record<string, GoalData[]>);

  const timeframeOrder = ['week', 'month', 'quarter', 'year'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-sm">Goals</h2>
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-md p-0.5">
            {(['active', 'completed', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded transition-colors capitalize ${
                  filter === f
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-xs px-3 py-1.5"
        >
          + New Goal
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2.5">
          <input
            type="text"
            className="input-field text-sm w-full"
            placeholder="Goal title..."
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <textarea
            className="input-field text-sm w-full resize-none"
            rows={2}
            placeholder="Description (optional)..."
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <select className="input-field text-xs flex-1" value={formTimeframe} onChange={e => setFormTimeframe(e.target.value)}>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <select className="input-field text-xs flex-1" value={formImpact} onChange={e => setFormImpact(e.target.value)}>
              <option value="low">Low Impact</option>
              <option value="medium">Medium Impact</option>
              <option value="high">High Impact</option>
              <option value="critical">Critical Impact</option>
            </select>
            <input
              type="date"
              className="input-field text-xs flex-1"
              value={formDeadline}
              onChange={e => setFormDeadline(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={formSaving || !formTitle.trim()} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
              {formSaving ? 'Saving...' : editingGoal ? 'Update' : 'Create Goal'}
            </button>
            <button onClick={resetForm} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="text-center text-[var(--text-muted)] text-sm py-12">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm text-[var(--text-muted)]">
              {filter === 'completed' ? 'No completed goals yet.' : 'No active goals. Set a goal to focus your work.'}
            </div>
          </div>
        ) : (
          timeframeOrder.filter(tf => grouped[tf]?.length).map(tf => (
            <div key={tf}>
              <h3 className="label-mono mb-2" style={{ fontSize: '10px' }}>{TIMEFRAME_LABELS[tf] || tf}</h3>
              <div className="space-y-1.5">
                {grouped[tf].map(goal => (
                  <div
                    key={goal.id}
                    className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg overflow-hidden"
                  >
                    {/* Goal Row */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      {/* Completion toggle */}
                      <button
                        onClick={() => handleStatusToggle(goal)}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          goal.status === 'completed'
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-[var(--text-muted)] hover:border-brand-400'
                        }`}
                      >
                        {goal.status === 'completed' && <span className="text-[8px] text-white">✓</span>}
                      </button>

                      {/* Impact dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${IMPACT_DOT[goal.impact] || 'bg-gray-500'}`} />

                      {/* Title & meta */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}>
                        <div className={`text-sm font-medium truncate ${goal.status === 'completed' ? 'line-through text-[var(--text-muted)]' : ''}`}>
                          {goal.title}
                        </div>
                      </div>

                      {/* Impact badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${IMPACT_COLORS[goal.impact]}`}>
                        {goal.impact}
                      </span>

                      {/* Progress */}
                      <div className="w-12 flex items-center gap-1">
                        <div className="flex-1 h-1 bg-[var(--border-color)] rounded-full">
                          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                        </div>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono w-6 text-right">{goal.progress}%</span>
                      </div>

                      {/* Deadline */}
                      {goal.deadline && (
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">
                          {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    {expandedGoal === goal.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-[var(--border-color)] space-y-2">
                        {goal.description && (
                          <p className="text-xs text-[var(--text-secondary)] pt-2">{goal.description}</p>
                        )}

                        {/* Progress Slider */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">Progress</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={goal.progress}
                            onChange={e => handleUpdateProgress(goal.id, Number(e.target.value))}
                            className="flex-1 h-1 accent-[var(--brand-blue)]"
                          />
                          <span className="text-[10px] text-[var(--text-muted)] font-mono w-8 text-right">{goal.progress}%</span>
                        </div>

                        {/* Sub-goals */}
                        {goal.subGoals && goal.subGoals.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">Sub-goals</span>
                            <div className="space-y-0.5 mt-1">
                              {goal.subGoals.map(sg => (
                                <div key={sg.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                  <span className={`w-1.5 h-1.5 rounded-full ${sg.status === 'completed' ? 'bg-green-400' : 'bg-gray-500'}`} />
                                  <span className={sg.status === 'completed' ? 'line-through text-[var(--text-muted)]' : ''}>{sg.title}</span>
                                  <span className="text-[9px] text-[var(--text-muted)] ml-auto">{sg.progress}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Linked project / team */}
                        <div className="flex items-center gap-2 pt-1">
                          {goal.project && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                              📋 {goal.project.name}
                            </span>
                          )}
                          {goal.team && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                              {goal.team.avatar || '👥'} {goal.team.name}
                            </span>
                          )}
                          <span className={`text-[9px] ${STATUS_LABELS[goal.status]?.color || ''}`}>
                            {STATUS_LABELS[goal.status]?.label || goal.status}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => openEdit(goal)} className="btn-secondary text-[10px] px-2 py-1">Edit</button>
                          <button onClick={() => handleDelete(goal.id)} className="text-[10px] px-2 py-1 text-red-400 hover:text-red-300 transition-colors">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
