'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  urgency: string;
  status: string;
  compensationType?: string | null;
  compensationAmount?: number | null;
  compensation?: string;
  isPaid: boolean;
  visibility: string;
  createdAt: string;
  poster: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
  _count?: { applications: number };
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-zinc-500/20 text-zinc-400',
  cancelled: 'bg-red-500/20 text-red-400',
  expired: 'bg-zinc-700/20 text-zinc-500',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-blue-400',
  low: 'text-zinc-400',
};

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/tasks')
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.poster.name.toLowerCase().includes(q) ||
        t.poster.email.toLowerCase().includes(q) ||
        (t.assignee?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const stats = {
    total: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    paid: tasks.filter(t => t.isPaid).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'text-white' },
          { label: 'Open', value: stats.open, color: 'text-emerald-400' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-zinc-400' },
          { label: 'Paid Tasks', value: stats.paid, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            <div className="text-[10px] text-zinc-500 mb-1">{s.label}</div>
            <div className={cn('text-lg font-semibold', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'open', 'in_progress', 'completed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, poster, or assignee..."
          className="flex-1 min-w-[200px] px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-xs text-white placeholder-zinc-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Task</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Poster</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Contributor</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Status</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Type</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Comp</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Interest</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  {search || filter !== 'all' ? 'No tasks match filters' : 'No tasks posted yet'}
                </td>
              </tr>
            ) : (
              filtered.map(task => (
                <tr key={task.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-white max-w-[200px] truncate">{task.title}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{task.id.slice(0, 8)}...</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-white">{task.poster.name}</div>
                    <div className="text-[10px] text-zinc-600">{task.poster.email}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    {task.assignee ? (
                      <>
                        <div className="text-white">{task.assignee.name}</div>
                        <div className="text-[10px] text-zinc-600">{task.assignee.email}</div>
                      </>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full', STATUS_COLORS[task.status] || STATUS_COLORS.open)}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-zinc-400">{task.taskType}</span>
                    <span className={cn('ml-1.5', URGENCY_COLORS[task.urgency])}>●</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {task.compensationType && task.compensationAmount ? (
                      <span className="text-emerald-400">
                        ${task.compensationAmount}{task.compensationType === 'flat' ? '' : `/${task.compensationType.slice(0, 2)}`}
                      </span>
                    ) : task.compensation ? (
                      <span className="text-zinc-400">{task.compensation}</span>
                    ) : (
                      <span className="text-zinc-600">Volunteer</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-zinc-400">{task._count?.applications ?? 0}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-zinc-600 text-right">
        Showing {filtered.length} of {tasks.length} tasks
      </div>
    </div>
  );
}
