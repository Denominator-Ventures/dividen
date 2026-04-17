'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import {
  QUEUE_SECTIONS,
  type QueueItemData,
  type QueueItemStatus,
  type CardPriority,
} from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RelayItem {
  id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  fromUserId: string;
  toUserId: string;
  connectionId: string | null;
  response: string | null;
  createdAt: string;
  updatedAt: string;
  connection?: { displayName: string } | null;
}

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  summary: string;
  createdAt: string;
}

interface NowData {
  items: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    score: number;
    urgency: string;
    sourceId: string;
    meta?: Record<string, any>;
  }>;
  focusSuggestion: string | null;
  activeGoalsSummary: { total: number; critical: number; approaching: number; onTrack: number };
}

// ─── Priority indicator ──────────────────────────────────────────────────────

const priorityIndicator: Record<CardPriority, { dot: string; label: string }> = {
  urgent: { dot: 'bg-red-500', label: 'Urgent' },
  high: { dot: 'bg-orange-500', label: 'High' },
  medium: { dot: 'bg-blue-500', label: 'Medium' },
  low: { dot: 'bg-gray-500', label: 'Low' },
};

const RELAY_STATUS_MAP: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: 'text-yellow-400', label: 'Pending', icon: '⏳' },
  delivered: { color: 'text-blue-400', label: 'Delivered', icon: '📨' },
  responded: { color: 'text-green-400', label: 'Responded', icon: '✅' },
  failed: { color: 'text-red-400', label: 'Failed', icon: '❌' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChiefOfStaffView({ onIntervene, onExitMode, modeLoading }: { onIntervene?: () => void; onExitMode?: () => void; modeLoading?: boolean }) {
  const [queue, setQueue] = useState<QueueItemData[]>([]);
  const [relays, setRelays] = useState<RelayItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [nowData, setNowData] = useState<NowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [interveneMsg, setInterveneMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'queue' | 'relays' | 'activity'>('overview');
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [qRes, rRes, aRes, nRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/relays?limit=20'),
        fetch('/api/activity'),
        fetch('/api/now'),
      ]);
      const [qData, rData, aData, nData] = await Promise.all([
        qRes.json(),
        rRes.json(),
        aRes.json(),
        nRes.json(),
      ]);
      if (qData.success) setQueue(qData.data);
      if (rData.success) setRelays(rData.data || []);
      if (aData.success) setActivities(aData.data || []);
      if (nData.success) setNowData(nData.data);
    } catch (e) {
      console.error('CoS fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    refreshRef.current = setInterval(fetchAll, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchAll]);

  // ── Queue stats ─────────────────────────────────────────────────────────
  const queueGrouped = QUEUE_SECTIONS.reduce(
    (acc, sec) => { acc[sec.id] = queue.filter(i => i.status === sec.id); return acc; },
    {} as Record<QueueItemStatus, QueueItemData[]>
  );
  const pendingApprovalCount = queueGrouped.pending_confirmation?.length ?? 0;
  const readyCount = queueGrouped.ready?.length ?? 0;
  const activeCount = queueGrouped.in_progress?.length ?? 0;
  const doneCount = queueGrouped.done_today?.length ?? 0;
  const blockedCount = queueGrouped.blocked?.length ?? 0;

  // ── Relay stats ─────────────────────────────────────────────────────────
  const pendingRelays = relays.filter(r => r.status === 'pending' || r.status === 'delivered');
  const respondedRelays = relays.filter(r => r.status === 'responded');

  // ── Queue actions ───────────────────────────────────────────────────────
  async function handleStatusChange(id: string, status: QueueItemStatus) {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) setQueue(prev => prev.map(i => i.id === id ? data.data : i));
    } catch { /* silent */ }
  }

  // ── Intervene: send a quick message to Divi ─────────────────────────────
  async function handleIntervene() {
    if (!interveneMsg.trim()) return;
    setSending(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `[CoS Intervention] ${interveneMsg.trim()}` }),
      });
      setInterveneMsg('');
      onIntervene?.();
    } catch { /* silent */ }
    setSending(false);
  }

  // ── Pause all in-progress items ────────────────────────────────────────
  async function handlePauseAll() {
    setPaused(true);
    const inProgress = queue.filter(i => i.status === 'in_progress');
    for (const item of inProgress) {
      await handleStatusChange(item.id, 'ready');
    }
    fetchAll();
  }

  async function handleResumeAll() {
    setPaused(false);
    // Just refresh — user can manually dispatch
    fetchAll();
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⚡</div>
          <p className="text-sm text-[var(--text-muted)]">Loading Chief of Staff view...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── CoS Header ── */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Chief of Staff</h2>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                {activeCount > 0 ? 'Executing Queue' : readyCount > 0 ? 'Ready to Execute' : 'Queue Clear'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'px-2 py-1 rounded-full text-[10px] font-medium',
              paused
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/15 text-green-400 border border-green-500/30'
            )}>
              {paused ? '⏸ Paused' : '● Running'}
            </div>
            <button
              onClick={paused ? handleResumeAll : handlePauseAll}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                paused
                  ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                  : 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
              )}
            >
              {paused ? '▶ Resume' : '⏸ Pause All'}
            </button>
            {onExitMode && (
              <button
                onClick={onExitMode}
                disabled={modeLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors disabled:opacity-50 whitespace-nowrap"
                title="Return to Cockpit mode"
              >
                {modeLoading ? '...' : '🎮 Cockpit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section tabs (mobile-friendly) ── */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--border-color)] overflow-x-auto">
        <div className="flex gap-1">
          {([
            { id: 'overview' as const, label: 'Overview', icon: '📊' },
            { id: 'queue' as const, label: `Queue (${queue.length})`, icon: '📋' },
            { id: 'relays' as const, label: `Relays (${relays.length})`, icon: '🔗' },
            { id: 'activity' as const, label: 'Activity', icon: '📡' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                activeSection === tab.id
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeSection === 'overview' && (
          <OverviewSection
            queue={queue}
            queueGrouped={queueGrouped}
            pendingApprovalCount={pendingApprovalCount}
            readyCount={readyCount}
            activeCount={activeCount}
            doneCount={doneCount}
            blockedCount={blockedCount}
            pendingRelays={pendingRelays}
            respondedRelays={respondedRelays}
            activities={activities}
            nowData={nowData}
            onStatusChange={handleStatusChange}
          />
        )}
        {activeSection === 'queue' && (
          <QueueSection
            queue={queue}
            queueGrouped={queueGrouped}
            onStatusChange={handleStatusChange}
          />
        )}
        {activeSection === 'relays' && (
          <RelaysSection relays={relays} />
        )}
        {activeSection === 'activity' && (
          <ActivitySection activities={activities} />
        )}
      </div>

      {/* ── Intervention bar ── */}
      <div className="flex-shrink-0 border-t border-[var(--border-color)] p-3 bg-[var(--bg-primary)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={interveneMsg}
            onChange={e => setInterveneMsg(e.target.value)}
            placeholder="Quick message to Divi (intervention)..."
            className="input-field flex-1 text-sm"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleIntervene(); } }}
          />
          <button
            onClick={handleIntervene}
            disabled={sending || !interveneMsg.trim()}
            className={cn(
              'btn-primary px-4 text-sm',
              (sending || !interveneMsg.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {sending ? '...' : '⚡ Intervene'}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Send a direct instruction to Divi while you&apos;re away. She&apos;ll act on it immediately.
        </p>
      </div>
    </div>
  );
}

// ─── Overview Section ────────────────────────────────────────────────────────

function OverviewSection({
  queue,
  queueGrouped,
  pendingApprovalCount,
  readyCount,
  activeCount,
  doneCount,
  blockedCount,
  pendingRelays,
  respondedRelays,
  activities,
  nowData,
  onStatusChange,
}: {
  queue: QueueItemData[];
  queueGrouped: Record<QueueItemStatus, QueueItemData[]>;
  pendingApprovalCount: number;
  readyCount: number;
  activeCount: number;
  doneCount: number;
  blockedCount: number;
  pendingRelays: RelayItem[];
  respondedRelays: RelayItem[];
  activities: ActivityItem[];
  nowData: NowData | null;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
}) {
  const totalTasks = queue.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="p-4 space-y-5">
      {/* Focus suggestion */}
      {nowData?.focusSuggestion && (
        <div className="px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <p className="text-xs font-medium text-brand-400">🧠 Divi&apos;s Focus</p>
          <p className="text-sm text-[var(--text-primary)] mt-1">{nowData.focusSuggestion}</p>
        </div>
      )}

      {/* Progress overview */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Execution Progress</h3>
        
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">{doneCount} of {totalTasks} tasks complete</span>
            <span className="font-mono text-[var(--text-secondary)]">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {pendingApprovalCount > 0 && (
            <StatCard label="Awaiting Approval" value={pendingApprovalCount} color="text-yellow-400" bg="bg-yellow-500/10" icon="🟡" />
          )}
          <StatCard label="Ready" value={readyCount} color="text-green-400" bg="bg-green-500/10" icon="🟢" />
          <StatCard label="Active" value={activeCount} color="text-blue-400" bg="bg-blue-500/10" icon="🔵" />
          <StatCard label="Done" value={doneCount} color="text-purple-400" bg="bg-purple-500/10" icon="✅" />
          <StatCard label="Blocked" value={blockedCount} color="text-red-400" bg="bg-red-500/10" icon="🔴" />
        </div>
      </div>

      {/* Active tasks — what's happening RIGHT NOW */}
      {activeCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">🔵 Active Now</h3>
          {queueGrouped.in_progress?.map(item => (
            <ActiveTaskCard key={item.id} item={item} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}

      {/* Blocked items — need attention */}
      {blockedCount > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">🔴 Blocked — Needs Attention</h3>
          {queueGrouped.blocked?.map(item => (
            <ActiveTaskCard key={item.id} item={item} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}

      {/* Pending relays */}
      {pendingRelays.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">⏳ Waiting for Responses ({pendingRelays.length})</h3>
          {pendingRelays.slice(0, 5).map(relay => (
            <RelayCard key={relay.id} relay={relay} />
          ))}
          {pendingRelays.length > 5 && (
            <p className="text-[10px] text-[var(--text-muted)] text-center">+{pendingRelays.length - 5} more pending</p>
          )}
        </div>
      )}

      {/* Recent responses */}
      {respondedRelays.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider">✅ Recent Responses</h3>
          {respondedRelays.slice(0, 3).map(relay => (
            <RelayCard key={relay.id} relay={relay} />
          ))}
        </div>
      )}

      {/* Recent activity */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">📡 Recent Activity</h3>
          {activities.slice(0, 8).map(a => (
            <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="text-xs flex-shrink-0 mt-0.5">{getActivityIcon(a.action, a.actor)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{a.summary}</p>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Queue Section ───────────────────────────────────────────────────────────

function QueueSection({
  queue,
  queueGrouped,
  onStatusChange,
}: {
  queue: QueueItemData[];
  queueGrouped: Record<QueueItemStatus, QueueItemData[]>;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
}) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Queue is empty</h3>
        <p className="text-xs text-[var(--text-muted)]">Nothing in the pipeline right now.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {QUEUE_SECTIONS.map(section => {
        const items = queueGrouped[section.id] || [];
        if (items.length === 0) return null;
        return (
          <div key={section.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{section.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>
                {section.label}
              </span>
              <span className="text-[10px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map(item => (
                <ActiveTaskCard key={item.id} item={item} onStatusChange={onStatusChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Relays Section ──────────────────────────────────────────────────────────

function RelaysSection({ relays }: { relays: RelayItem[] }) {
  if (relays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-3 opacity-30">🔗</div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No relays</h3>
        <p className="text-xs text-[var(--text-muted)]">No relay activity to show.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {relays.map(relay => (
        <RelayCard key={relay.id} relay={relay} />
      ))}
    </div>
  );
}

// ─── Activity Section ────────────────────────────────────────────────────────

function ActivitySection({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-3 opacity-30">📡</div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No activity</h3>
        <p className="text-xs text-[var(--text-muted)]">System activity will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-1.5">
      {activities.map(a => (
        <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors">
          <span className="text-xs flex-shrink-0 mt-0.5">{getActivityIcon(a.action, a.actor)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{a.summary}</p>
            <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(a.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon: string;
}) {
  return (
    <div className={cn('rounded-xl p-3 border border-[var(--border-color)]', bg)}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className={cn('text-xl font-bold', color)}>{value}</span>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

// ─── Active Task Card ────────────────────────────────────────────────────────

function ActiveTaskCard({ item, onStatusChange }: {
  item: QueueItemData;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
}) {
  const pi = priorityIndicator[item.priority] || priorityIndicator.medium;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 group hover:border-brand-500/30 transition-all">
      <div className="flex items-start gap-2.5">
        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', pi.dot)} title={pi.label} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{item.title}</h4>
          {item.description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(item.createdAt)}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{item.type}</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              item.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
              item.status === 'blocked' ? 'bg-red-500/15 text-red-400' :
              item.status === 'ready' ? 'bg-green-500/15 text-green-400' :
              item.status === 'done_today' ? 'bg-purple-500/15 text-purple-400' :
              'bg-gray-500/15 text-gray-400'
            )}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {/* Quick CoS actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.status === 'in_progress' && (
            <>
              <button
                onClick={() => onStatusChange(item.id, 'done_today')}
                className="text-[10px] px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
                title="Mark done"
              >
                ✓ Done
              </button>
              <button
                onClick={() => onStatusChange(item.id, 'blocked')}
                className="text-[10px] px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                title="Block"
              >
                ✕ Block
              </button>
            </>
          )}
          {item.status === 'blocked' && (
            <button
              onClick={() => onStatusChange(item.id, 'ready')}
              className="text-[10px] px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
              title="Unblock"
            >
              ↩ Unblock
            </button>
          )}
          {item.status === 'ready' && (
            <button
              onClick={() => onStatusChange(item.id, 'in_progress')}
              className="text-[10px] px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              title="Start"
            >
              ▶ Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Relay Card ──────────────────────────────────────────────────────────────

function RelayCard({ relay }: { relay: RelayItem }) {
  const statusInfo = RELAY_STATUS_MAP[relay.status] || RELAY_STATUS_MAP.pending;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">{statusInfo.icon}</span>
            <span className={cn('text-[10px] font-medium', statusInfo.color)}>{statusInfo.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
              {relay.type}
            </span>
          </div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{relay.subject}</h4>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{relay.message}</p>
          {relay.connection?.displayName && (
            <p className="text-[10px] text-brand-400 mt-1">→ {relay.connection.displayName}</p>
          )}
          {relay.response && (
            <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-green-500/5 border border-green-500/15">
              <p className="text-xs text-green-400 font-medium">Response:</p>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mt-0.5">{relay.response}</p>
            </div>
          )}
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">{timeAgo(relay.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  card_created: '📋', card_moved: '↗️', task_dispatched: '🚀', contact_added: '👥',
  mode_changed: '🔄', recording_created: '🎙️', recording_processed: '✅',
  document_created: '📝', queue_dispatched: '🚀',
};
const ACTOR_ICONS: Record<string, string> = { user: '👤', divi: '🤖', system: '⚙️' };

function getActivityIcon(action: string, actor: string): string {
  return ACTION_ICONS[action] || ACTOR_ICONS[actor] || '📌';
}
