'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragScrollContainer } from '@/components/ui/DragScrollContainer';
import InstancesTab from '@/components/admin/InstancesTab';
import MarketplaceTab from '@/components/admin/MarketplaceTab';
import SystemPromptTab from '@/components/admin/SystemPromptTab';
import UsageTab from '@/components/admin/UsageTab';
import TasksTab from '@/components/admin/TasksTab';

// ─── Types ──────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  _count: Record<string, number>;
}

interface AdminStats {
  users: {
    total: number;
    last7d: number;
    last30d: number;
    list: UserRow[];
    signupTrend: { date: string; count: number }[];
  };
  content: Record<string, number>;
  recent: Record<string, number>;
  chatTrend: { date: string; count: number }[];
  kanbanByStatus: { status: string; count: number }[];
  webhookHealth: {
    totalLogs: number;
    errorsLast7d: number;
    successRate: string;
  };
  recentActivity: {
    id: string;
    action: string;
    actor: string;
    summary: string;
    createdAt: string;
  }[];
  generatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const CONTENT_LABELS: Record<string, string> = {
  chatMessages: 'Chat Messages',
  kanbanCards: 'Kanban Cards',
  contacts: 'Contacts',
  documents: 'Documents',
  recordings: 'Recordings',
  calendarEvents: 'Calendar Events',
  emails: 'Emails',
  commsMessages: 'Comms Messages',
  queueItems: 'Queue Items',
  activityLogs: 'Activity Logs',
  memoryItems: 'Memory Items',
  webhooks: 'Webhooks',
  webhookLogs: 'Webhook Logs',
  connections: 'Connections',
  relays: 'Agent Relays',
  externalApiKeys: 'API Keys (External)',
};

const CONTENT_ICONS: Record<string, string> = {
  chatMessages: '💬',
  kanbanCards: '📋',
  contacts: '👤',
  documents: '📄',
  recordings: '🎙️',
  calendarEvents: '📅',
  emails: '✉️',
  commsMessages: '📡',
  queueItems: '📥',
  activityLogs: '📊',
  memoryItems: '🧠',
  webhooks: '🔗',
  webhookLogs: '📝',
  connections: '🤝',
  relays: '🔄',
  externalApiKeys: '🔑',
};

const ACTOR_COLORS: Record<string, string> = {
  user: 'text-blue-400',
  divi: 'text-emerald-400',
  system: 'text-amber-400',
};

// ─── Mini Bar Chart (pure CSS) ──────────────────────────────────────────────
function MiniBarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-2">{label}</div>
      <div className="flex items-end gap-[2px] h-20">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-sm bg-brand-500/60 hover:bg-brand-500 transition-colors relative group"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#1a1a1a] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap z-10">
              {d.date.slice(5)}: {d.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Login Screen ───────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        onLogin(password);
      } else {
        setError('Invalid admin password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <svg width="32" height="32" viewBox="0 0 91 35" fill="none">
              <rect x="0.5" y="0.5" width="90" height="34" rx="8" fill="#0a0a0a" stroke="rgba(255,255,255,0.08)" />
              <rect x="6" y="28" width="79" height="2" rx="1" fill="#4F7CFF" />
            </svg>
            <span className="text-white font-heading text-xl font-semibold">Admin</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">DiviDen Command Center Admin</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-mono text-[10px] mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/40"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-500/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ───────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'activity' | 'federation' | 'telemetry' | 'instances' | 'marketplace' | 'prompt' | 'usage' | 'tasks' | 'workflows' | 'feedback'>('overview');

  const fetchStats = useCallback(async (t: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (password: string) => {
    setToken(password);
    fetchStats(password);
  };

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => fetchStats(token), 60000);
    return () => clearInterval(interval);
  }, [token, fetchStats]);

  if (!token) return <AdminLogin onLogin={handleLogin} />;

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[var(--text-secondary)] text-sm">Loading stats…</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'users' as const, label: 'Users', icon: '👥' },
    { id: 'content' as const, label: 'Content', icon: '📦' },
    { id: 'activity' as const, label: 'Activity', icon: '⚡' },
    { id: 'instances' as const, label: 'Instances', icon: '🏢' },
    { id: 'marketplace' as const, label: 'Marketplace', icon: '🤖' },
    { id: 'usage' as const, label: 'Usage', icon: '📈' },
    { id: 'prompt' as const, label: 'System Prompt', icon: '📝' },
    { id: 'tasks' as const, label: 'Tasks', icon: '📋' },
    { id: 'federation' as const, label: 'Federation', icon: '🌐' },
    { id: 'telemetry' as const, label: 'Telemetry', icon: '📡' },
    { id: 'workflows' as const, label: 'Workflows', icon: '🔄' },
    { id: 'feedback' as const, label: 'Feedback', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 91 35" fill="none">
            <rect x="0.5" y="0.5" width="90" height="34" rx="8" fill="#0a0a0a" stroke="rgba(255,255,255,0.08)" />
            <rect x="6" y="28" width="79" height="2" rx="1" fill="#4F7CFF" />
          </svg>
          <span className="font-heading text-base font-semibold">DiviDen Admin</span>
          <span className="label-mono text-[9px] text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">LIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Updated {timeAgo(stats.generatedAt)}
          </span>
          <button
            onClick={() => token && fetchStats(token)}
            className="text-xs px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => { setToken(null); setStats(null); }}
            className="text-xs px-3 py-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] px-4 md:px-6">
        <DragScrollContainer showFadeEdges={false}>
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-white'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </DragScrollContainer>
      </div>

      {/* Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'users' && <UsersTab stats={stats} token={token} onRefresh={() => fetchStats(token)} />}
        {activeTab === 'content' && <ContentTab stats={stats} />}
        {activeTab === 'activity' && <ActivityTab stats={stats} />}
        {activeTab === 'instances' && <InstancesTab token={token} />}
        {activeTab === 'marketplace' && <MarketplaceTab token={token} />}
        {activeTab === 'usage' && <UsageTab token={token} />}
        {activeTab === 'prompt' && <SystemPromptTab token={token} />}
        {activeTab === 'tasks' && <TasksTab token={token} />}
        {activeTab === 'federation' && <FederationTab token={token} />}
        {activeTab === 'telemetry' && <TelemetryTab token={token} />}
        {activeTab === 'workflows' && <WorkflowsTab token={token} />}
        {activeTab === 'feedback' && <FeedbackAdminTab token={token} />}
      </main>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Users" value={stats.users.total} icon="👥" />
        <MetricCard label="Signups (7d)" value={stats.users.last7d} icon="📈" accent />
        <MetricCard label="Chat Messages" value={stats.content.chatMessages} icon="💬" />
        <MetricCard label="Webhook Success" value={`${stats.webhookHealth.successRate}%`} icon="🔗" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <MiniBarChart data={stats.users.signupTrend} label="Signups — Last 30 Days" />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <MiniBarChart data={stats.chatTrend} label="Chat Activity — Last 14 Days" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Kanban Cards" value={stats.content.kanbanCards} icon="📋" />
        <MetricCard label="Contacts" value={stats.content.contacts} icon="👤" />
        <MetricCard label="Documents" value={stats.content.documents} icon="📄" />
        <MetricCard label="Connections" value={stats.content.connections} icon="🤝" />
      </div>

      {/* Kanban pipeline */}
      {stats.kanbanByStatus.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Kanban Pipeline Distribution</div>
          <div className="flex flex-wrap gap-2">
            {stats.kanbanByStatus.map((s) => (
              <div
                key={s.status}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-center"
              >
                <div className="text-lg font-semibold font-heading">{s.count}</div>
                <div className="text-[10px] text-[var(--text-secondary)] capitalize">{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day activity summary */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Last 7 Days Activity</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.recent).map(([key, value]) => {
            const labels: Record<string, string> = {
              chatLast7d: 'Chat Messages',
              cardsLast7d: 'Cards Created',
              contactsLast7d: 'Contacts Added',
              docsLast7d: 'Documents',
              emailsLast7d: 'Emails',
              commsLast7d: 'Comms',
              activityLast7d: 'Activities',
              webhookLogsLast7d: 'Webhook Calls',
            };
            return (
              <div key={key} className="text-center">
                <div className="text-xl font-heading font-semibold">{value}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{labels[key] || key}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────────────────
function UsersTab({ stats, token, onRefresh }: { stats: AdminStats; token: string; onRefresh: () => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleDelete = async (userId: string, email: string) => {
    if (confirmId !== userId) {
      setConfirmId(userId);
      return;
    }
    setDeletingId(userId);
    setDeleteResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setDeleteResult(`Deleted ${email}. Transferred ${data.transferred?.projects || 0} projects, ${data.transferred?.teams || 0} teams.`);
      setConfirmId(null);
      onRefresh();
    } catch (err: any) {
      setDeleteResult(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Users" value={stats.users.total} icon="👥" />
        <MetricCard label="New (7d)" value={stats.users.last7d} icon="📈" accent />
        <MetricCard label="New (30d)" value={stats.users.last30d} icon="📅" />
      </div>

      {deleteResult && (
        <div className={`text-xs px-4 py-2 rounded-lg ${deleteResult.startsWith('Error') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {deleteResult}
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left label-mono text-[10px] px-4 py-3">User</th>
                <th className="text-left label-mono text-[10px] px-4 py-3">Role</th>
                <th className="text-left label-mono text-[10px] px-4 py-3">Mode</th>
                <th className="text-center label-mono text-[10px] px-4 py-3">Chats</th>
                <th className="text-center label-mono text-[10px] px-4 py-3">Cards</th>
                <th className="text-center label-mono text-[10px] px-4 py-3">Contacts</th>
                <th className="text-center label-mono text-[10px] px-4 py-3">Docs</th>
                <th className="text-left label-mono text-[10px] px-4 py-3">Signed Up</th>
                <th className="text-left label-mono text-[10px] px-4 py-3">Last Active</th>
                <th className="text-center label-mono text-[10px] px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stats.users.list.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-sm">{user.name || '—'}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${
                      user.role === 'admin'
                        ? 'bg-brand-500/10 text-brand-400'
                        : 'bg-white/[0.04] text-[var(--text-secondary)]'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)] capitalize">{user.mode}</td>
                  <td className="px-4 py-3 text-center text-[11px]">{user._count.chatMessages}</td>
                  <td className="px-4 py-3 text-center text-[11px]">{user._count.kanbanCards}</td>
                  <td className="px-4 py-3 text-center text-[11px]">{user._count.contacts}</td>
                  <td className="px-4 py-3 text-center text-[11px]">{user._count.documents}</td>
                  <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">{timeAgo(user.createdAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">{timeAgo(user.updatedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {confirmId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          disabled={deletingId === user.id}
                          className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          {deletingId === user.id ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Content Tab ────────────────────────────────────────────────────────────
function ContentTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(stats.content).map(([key, value]) => (
          <div
            key={key}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
          >
            <div className="text-lg mb-1">{CONTENT_ICONS[key] || '📦'}</div>
            <div className="text-2xl font-heading font-semibold">{value}</div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {CONTENT_LABELS[key] || key}
            </div>
          </div>
        ))}
      </div>

      {/* Webhook health */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Webhook Health</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-heading font-semibold">{stats.webhookHealth.totalLogs}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Total Calls</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-semibold text-red-400">{stats.webhookHealth.errorsLast7d}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Errors (7d)</div>
          </div>
          <div>
            <div className={`text-2xl font-heading font-semibold ${
              parseFloat(stats.webhookHealth.successRate) >= 95 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {stats.webhookHealth.successRate}%
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Tab ───────────────────────────────────────────────────────────
function ActivityTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Recent Activity (Last 30)</div>
        <div className="space-y-1">
          {stats.recentActivity.length === 0 && (
            <div className="text-sm text-[var(--text-secondary)] text-center py-6">No activity recorded yet</div>
          )}
          {stats.recentActivity.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <div className={`text-[11px] font-mono font-medium w-12 shrink-0 mt-0.5 ${ACTOR_COLORS[a.actor] || 'text-gray-400'}`}>
                {a.actor}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{a.summary}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{a.action}</div>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] shrink-0">{timeAgo(a.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Federation Tab ─────────────────────────────────────────────────────────

interface FedCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
}

interface FedResult {
  url: string;
  agentCardUrl: string;
  isSelfCheck: boolean;
  httpStatus: number | null;
  responseTime: number | null;
  checks: FedCheck[];
  agentCard: any;
  score: { passed: number; failed: number; warned: number; total: number };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  pass: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✓' },
  fail: { bg: 'bg-red-500/10', text: 'text-red-400', icon: '✗' },
  warn: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '!' },
  skip: { bg: 'bg-white/[0.04]', text: 'text-[var(--text-secondary)]', icon: '—' },
};

// ─── Federation Activity Types ──────────────────────────────────────────────

interface FedActivity {
  generatedAt: string;
  apiKeys: {
    total: number;
    active: number;
    totalUsage: number;
    usedLast7d: number;
    keys: {
      id: string; name: string; keyPrefix: string; permissions: string;
      isActive: boolean; usageCount: number; lastUsedAt: string | null;
      createdAt: string; expiresAt: string | null;
      user: { name: string | null; email: string } | null;
    }[];
  };
  connections: {
    total: number; active: number; pending: number; federated: number; local: number;
    connections: {
      id: string; status: string; isFederated: boolean; peerInstanceUrl: string | null;
      peerUserName: string | null; peerUserEmail: string | null;
      trustLevel: string; scopes: string[]; relayCount: number;
      requester: { name: string | null; email: string } | null;
      accepter: { name: string | null; email: string } | null;
      createdAt: string; updatedAt: string;
    }[];
  };
  relays: {
    total: number; last7d: number; federated: number;
    byDirection: Record<string, number>;
    byIntent: Record<string, number>;
    byStatus: Record<string, number>;
    recent: {
      id: string; direction: string; type: string; intent: string; subject: string;
      status: string; priority: string; isFederated: boolean; peerInstanceUrl: string | null;
      from: { name: string | null; email: string } | null;
      to: { name: string | null; email: string } | null;
      connectionPeer: string | null;
      createdAt: string; resolvedAt: string | null;
    }[];
  };
  externalQueue: {
    totalExternal: number; last7d: number;
    bySource: Record<string, number>;
    recent: {
      id: string; type: string; title: string; status: string; priority: string;
      source: string; userId: string | null;
      createdAt: string;
    }[];
  };
  federation: {
    instanceName: string; instanceUrl: string | null; mode: string;
    allowInbound: boolean; allowOutbound: boolean; requireApproval: boolean;
  } | null;
}

// ─── Sub-tab type ──────────────────────────────────────────────────────────

type FedSubTab = 'instances' | 'activity' | 'health';

interface FedInstance {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  isTrusted: boolean;
  lastSeenAt: string | null;
  platformLinked: boolean;
  marketplaceEnabled: boolean;
  discoveryEnabled: boolean;
  updatesEnabled: boolean;
  version: string | null;
  userCount: number | null;
  agentCount: number | null;
  lastSyncAt: string | null;
  createdAt: string;
}

function FederationTab({ token }: { token: string | null }) {
  const [subTab, setSubTab] = useState<FedSubTab>('instances');
  const [activity, setActivity] = useState<FedActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Instances state
  const [instances, setInstances] = useState<FedInstance[]>([]);
  const [instanceTotals, setInstanceTotals] = useState<any>(null);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', baseUrl: '', apiKey: '' });
  const [addingInstance, setAddingInstance] = useState(false);
  const [instanceActionLoading, setInstanceActionLoading] = useState<string | null>(null);

  // Health checker state
  const [remoteUrl, setRemoteUrl] = useState('');
  const [selfResult, setSelfResult] = useState<FedResult | null>(null);
  const [remoteResult, setRemoteResult] = useState<FedResult | null>(null);
  const [loadingSelf, setLoadingSelf] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/admin/federation-activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setActivity(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingActivity(false); }
  }, [token]);

  const fetchInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const res = await fetch('/api/admin/instances', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances || []);
        setInstanceTotals(data.totals || null);
      }
    } catch { /* ignore */ }
    finally { setLoadingInstances(false); }
  }, [token]);

  useEffect(() => {
    if (token) {
      if (!activity) fetchActivity();
      if (instances.length === 0 && !loadingInstances) fetchInstances();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activity, fetchActivity, fetchInstances]);

  const handleAddInstance = async () => {
    if (!addForm.name.trim() || !addForm.baseUrl.trim()) return;
    setAddingInstance(true);
    try {
      const res = await fetch('/api/admin/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: addForm.name.trim(),
          baseUrl: addForm.baseUrl.trim().replace(/\/$/, ''),
          apiKey: addForm.apiKey.trim() || `admin-registered-${Date.now()}`,
        }),
      });
      if (res.ok) {
        setAddForm({ name: '', baseUrl: '', apiKey: '' });
        setShowAddInstance(false);
        fetchInstances();
      }
    } catch { /* ignore */ }
    finally { setAddingInstance(false); }
  };

  const toggleInstanceField = async (id: string, field: string, value: boolean) => {
    setInstanceActionLoading(id);
    try {
      await fetch('/api/admin/instances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, [field]: value }),
      });
      await fetchInstances();
    } catch { /* ignore */ }
    finally { setInstanceActionLoading(null); }
  };

  const runCheck = async (url?: string) => {
    const isRemote = !!url;
    if (isRemote) setLoadingRemote(true);
    else setLoadingSelf(true);
    try {
      const res = await fetch('/api/admin/federation-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url || '' }),
      });
      const data = await res.json();
      if (isRemote) setRemoteResult(data);
      else setSelfResult(data);
    } catch { /* ignore */ }
    finally {
      if (isRemote) setLoadingRemote(false);
      else setLoadingSelf(false);
    }
  };

  // ── Rendering helpers ─────────────────────────────────────────────────

  const renderScore = (result: FedResult) => {
    const { passed, failed, warned, total } = result.score;
    const pct = Math.round((passed / total) * 100);
    const color = failed > 0 ? 'text-red-400' : warned > 0 ? 'text-amber-400' : 'text-emerald-400';
    return (
      <div className="flex items-center gap-4">
        <div className={`text-3xl font-heading font-bold ${color}`}>{pct}%</div>
        <div className="text-xs space-y-0.5">
          <div className="text-emerald-400">{passed} passed</div>
          {failed > 0 && <div className="text-red-400">{failed} failed</div>}
          {warned > 0 && <div className="text-amber-400">{warned} warnings</div>}
          <div className="text-[var(--text-secondary)]">{total} checks</div>
        </div>
        {result.responseTime && (
          <div className="ml-auto text-right">
            <div className="text-xs text-[var(--text-secondary)]">Response</div>
            <div className="text-sm font-mono">{result.responseTime}ms</div>
          </div>
        )}
      </div>
    );
  };

  const renderChecks = (checks: FedCheck[]) => (
    <div className="space-y-1 mt-4">
      {checks.map((check) => {
        const style = STATUS_STYLES[check.status];
        return (
          <div key={check.id} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${style.bg}`}>
            <span className={`text-sm font-mono font-bold w-5 shrink-0 ${style.text}`}>{style.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white">{check.label}</div>
              <div className="text-[11px] text-[var(--text-secondary)] break-all">{check.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAgentCardPreview = (card: any) => {
    if (!card) return null;
    return (
      <details className="mt-4">
        <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-white transition-colors">View Raw Agent Card JSON</summary>
        <pre className="mt-2 p-3 bg-black/50 border border-white/[0.06] rounded-lg text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-80 overflow-y-auto">
          {JSON.stringify(card, null, 2)}
        </pre>
      </details>
    );
  };

  // ── Intent / status pill colors ───────────────────────────────────────

  const INTENT_COLORS: Record<string, string> = {
    get_info: 'bg-blue-500/10 text-blue-400',
    assign_task: 'bg-purple-500/10 text-purple-400',
    request_approval: 'bg-amber-500/10 text-amber-400',
    share_update: 'bg-emerald-500/10 text-emerald-400',
    schedule: 'bg-cyan-500/10 text-cyan-400',
    introduce: 'bg-pink-500/10 text-pink-400',
    custom: 'bg-white/[0.06] text-white/60',
  };

  const RELAY_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    delivered: 'bg-blue-500/10 text-blue-400',
    agent_handling: 'bg-purple-500/10 text-purple-400',
    user_review: 'bg-cyan-500/10 text-cyan-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    declined: 'bg-red-500/10 text-red-400',
    expired: 'bg-white/[0.06] text-white/30',
  };

  const SOURCE_ICONS: Record<string, string> = {
    api: '🔌',
    webhook: '🔗',
    federation: '🌐',
  };

  // ── Sub-tabs ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
        <button
          onClick={() => { setSubTab('instances'); if (instances.length === 0) fetchInstances(); }}
          className={`flex-1 px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'instances' ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          🏢 Connected Instances ({instances.length})
        </button>
        <button
          onClick={() => setSubTab('activity')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'activity' ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          📡 Activity
        </button>
        <button
          onClick={() => setSubTab('health')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ${
            subTab === 'health' ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          🔍 Health
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  INSTANCES SUB-TAB                                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {subTab === 'instances' && (
        <>
          {loadingInstances && instances.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">Loading instances…</div>
          )}

          {/* Add Instance Button + Form */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--text-secondary)]">
              {instanceTotals && (
                <span>{instanceTotals.total} total · {instanceTotals.active} active · {instanceTotals.platformLinked} linked</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchInstances}
                className="px-2.5 py-1.5 rounded-lg text-[10px] text-[var(--text-secondary)] hover:bg-white/[0.04] transition-colors"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setShowAddInstance(!showAddInstance)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
              >
                + Register Instance
              </button>
            </div>
          </div>

          {showAddInstance && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-white">Manually Register a Federated Instance</h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Use this to manually add an instance that has connected to the network. This creates a record in the instance registry with platform-linked status.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Instance name (e.g. Fractional Venture Partners)"
                  className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-white/[0.06] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                />
                <input
                  value={addForm.baseUrl}
                  onChange={e => setAddForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="Base URL (e.g. https://cc.fractionalventure.partners)"
                  className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-white/[0.06] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                />
                <input
                  value={addForm.apiKey}
                  onChange={e => setAddForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="API key (optional, auto-generated if empty)"
                  className="px-3 py-2 text-xs bg-[var(--bg-primary)] border border-white/[0.06] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddInstance(false)}
                  className="px-4 py-2 text-xs rounded-md bg-white/[0.04] text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddInstance}
                  disabled={addingInstance || !addForm.name.trim() || !addForm.baseUrl.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-md bg-brand-500 text-white hover:bg-brand-500/80 transition-colors disabled:opacity-50"
                >
                  {addingInstance ? 'Registering…' : 'Register Instance'}
                </button>
              </div>
            </div>
          )}

          {instances.length === 0 && !loadingInstances ? (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">🏢</div>
              <h4 className="text-sm font-medium text-white mb-1">No Connected Instances</h4>
              <p className="text-[11px] text-[var(--text-secondary)] max-w-md mx-auto mb-4">
                Self-hosted DiviDen instances appear here after they register via <code className="code-inline">/api/v2/federation/register</code> or when you manually add them.
              </p>
              <button
                onClick={() => setShowAddInstance(true)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
              >
                + Register First Instance
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {instances.map(inst => (
                <div key={inst.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${inst.isActive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="text-sm font-medium text-white">{inst.name}</span>
                        {!inst.isActive && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-medium">⏳ Pending Approval</span>}
                        {inst.isTrusted && <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[9px] font-medium">🛡️ Trusted</span>}
                        {inst.platformLinked && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-medium">🔗 Linked</span>}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate mb-2">{inst.baseUrl}</div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {inst.marketplaceEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">🛒 Marketplace</span>}
                        {inst.discoveryEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">🔍 Discovery</span>}
                        {inst.updatesEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">📦 Updates</span>}
                        {inst.version && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)] font-mono">v{inst.version}</span>}
                      </div>

                      <div className="flex gap-4 text-[10px] text-[var(--text-secondary)]">
                        <span>👥 {inst.userCount ?? '—'} users</span>
                        <span>🤖 {inst.agentCount ?? '—'} agents</span>
                        <span>Seen: {inst.lastSeenAt ? timeAgo(inst.lastSeenAt) : 'never'}</span>
                        <span>Synced: {inst.lastSyncAt ? timeAgo(inst.lastSyncAt) : 'never'}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleInstanceField(inst.id, 'isTrusted', !inst.isTrusted)}
                        disabled={instanceActionLoading === inst.id}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          inst.isTrusted ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
                        }`}
                      >
                        {inst.isTrusted ? '🛡️ Trusted' : 'Trust'}
                      </button>
                      <button
                        onClick={() => toggleInstanceField(inst.id, 'marketplaceEnabled', !inst.marketplaceEnabled)}
                        disabled={instanceActionLoading === inst.id}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          inst.marketplaceEnabled ? 'bg-emerald-400/10 text-emerald-400 hover:bg-red-400/10 hover:text-red-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
                        }`}
                      >
                        {inst.marketplaceEnabled ? '🛒 On' : '🛒 Off'}
                      </button>
                      <button
                        onClick={() => toggleInstanceField(inst.id, 'isActive', !inst.isActive)}
                        disabled={instanceActionLoading === inst.id}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                          inst.isActive ? 'bg-emerald-400/10 text-emerald-400 hover:bg-red-400/10 hover:text-red-400' : 'bg-amber-400/10 text-amber-400 hover:bg-emerald-400/10 hover:text-emerald-400'
                        }`}
                      >
                        {inst.isActive ? '✓ Active' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => { setRemoteUrl(inst.baseUrl); setSubTab('health'); }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] transition-colors"
                      >
                        🔍 Check
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  ACTIVITY SUB-TAB                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {subTab === 'activity' && (
        <>
          {loadingActivity && !activity && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">Loading federation activity…</div>
          )}

          {activity && (
            <>
              {/* Federation status bar */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🌐</span>
                    <div>
                      <h3 className="text-sm font-heading font-semibold">{activity.federation?.instanceName || 'DiviDen'}</h3>
                      <p className="text-[10px] text-[var(--text-secondary)] font-mono">{activity.federation?.instanceUrl || 'Not configured'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activity.federation && (
                      <div className="flex gap-1.5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${activity.federation.mode === 'open' ? 'bg-emerald-500/10 text-emerald-400' : activity.federation.mode === 'allowlist' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.06] text-white/40'}`}>
                          {activity.federation.mode}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${activity.federation.allowInbound ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.06] text-white/40'}`}>
                          {activity.federation.allowInbound ? '↓ inbound' : '↓ closed'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${activity.federation.allowOutbound ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.06] text-white/40'}`}>
                          {activity.federation.allowOutbound ? '↑ outbound' : '↑ closed'}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={fetchActivity}
                      disabled={loadingActivity}
                      className="text-xs px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {/* Hero metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-heading font-semibold">{activity.apiKeys.active}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">API Keys Active</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-heading font-semibold">{activity.apiKeys.totalUsage}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Total API Calls</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-heading font-semibold">{activity.connections.active}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Active Connections</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-heading font-semibold">{activity.relays.total}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Total Relays</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-xl font-heading font-semibold">{activity.externalQueue.totalExternal}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">External Queue Items</div>
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-mono text-[10px] text-[var(--text-secondary)]">🔑 API Keys — Who&apos;s Connecting</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{activity.apiKeys.usedLast7d} used in last 7d</div>
                </div>

                {activity.apiKeys.keys.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-secondary)]">No API keys created yet. OS users need to generate keys in Settings → API Keys.</div>
                ) : (
                  <div className="space-y-1.5">
                    {activity.apiKeys.keys.map(k => (
                      <div key={k.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${k.isActive ? (k.lastUsedAt ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-white/20'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate">{k.name}</span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">{k.keyPrefix}…</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            {k.user?.name || k.user?.email || 'Unknown user'} · {k.permissions}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono font-semibold text-white">{k.usageCount}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            {k.lastUsedAt ? `Last: ${timeAgo(k.lastUsedAt)}` : 'Never used'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connections */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-mono text-[10px] text-[var(--text-secondary)]">🤝 Connections</div>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--text-secondary)]">{activity.connections.local} local</span>
                    <span className="text-brand-400">{activity.connections.federated} federated</span>
                    {activity.connections.pending > 0 && <span className="text-amber-400">{activity.connections.pending} pending</span>}
                  </div>
                </div>

                {activity.connections.connections.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-secondary)]">No connections yet. Users can connect via the Connections tab in the dashboard.</div>
                ) : (
                  <div className="space-y-1.5">
                    {activity.connections.connections.map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'active' ? 'bg-emerald-400' : c.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium">
                              {c.isFederated ? (c.peerUserName || c.peerUserEmail || 'Remote User') : (c.accepter?.name || c.accepter?.email || 'Local User')}
                            </span>
                            {c.isFederated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono">FEDERATED</span>}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.trustLevel === 'full_auto' ? 'bg-emerald-500/10 text-emerald-400' : c.trustLevel === 'supervised' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                              {c.trustLevel}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            {c.isFederated && c.peerInstanceUrl ? c.peerInstanceUrl : `${c.requester?.name || c.requester?.email} ↔ ${c.accepter?.name || c.accepter?.email || '?'}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono font-semibold text-white">{c.relayCount}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">relays</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Relay Traffic */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-mono text-[10px] text-[var(--text-secondary)]">🔄 Relay Traffic</div>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--text-secondary)]">{activity.relays.last7d} last 7d</span>
                    <span className="text-brand-400">{activity.relays.federated} cross-instance</span>
                  </div>
                </div>

                {activity.relays.total === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-secondary)]">No relay traffic yet. Relays flow when connections communicate via their agents.</div>
                ) : (
                  <>
                    {/* Intent breakdown */}
                    <div className="mb-4">
                      <div className="text-[10px] text-[var(--text-secondary)] mb-2">By Intent</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(activity.relays.byIntent).map(([intent, count]) => (
                          <span key={intent} className={`text-[10px] px-2 py-1 rounded ${INTENT_COLORS[intent] || 'bg-white/[0.06] text-white/60'}`}>
                            {intent}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status breakdown */}
                    <div className="mb-4">
                      <div className="text-[10px] text-[var(--text-secondary)] mb-2">By Status</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(activity.relays.byStatus).map(([status, count]) => (
                          <span key={status} className={`text-[10px] px-2 py-1 rounded ${RELAY_STATUS_COLORS[status] || 'bg-white/[0.06] text-white/60'}`}>
                            {status}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recent relays */}
                    <div className="text-[10px] text-[var(--text-secondary)] mb-2">Recent Relays</div>
                    <div className="space-y-1">
                      {activity.relays.recent.slice(0, 15).map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <span className="text-sm shrink-0">{r.direction === 'outbound' ? '↑' : '↓'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white truncate">{r.subject}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${INTENT_COLORS[r.intent] || ''}`}>{r.intent}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${RELAY_STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                              {r.isFederated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">federated</span>}
                            </div>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] shrink-0">{timeAgo(r.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* External Queue Items */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-mono text-[10px] text-[var(--text-secondary)]">📥 External Queue Items</div>
                  <div className="flex gap-2 text-[10px]">
                    {Object.entries(activity.externalQueue.bySource).map(([src, count]) => (
                      <span key={src} className="text-[var(--text-secondary)]">{SOURCE_ICONS[src] || '📦'} {src}: {count}</span>
                    ))}
                  </div>
                </div>

                {activity.externalQueue.recent.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-secondary)]">
                    No queue items from external sources yet. These appear when the v2 API, webhooks, or federation creates queue items.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activity.externalQueue.recent.map(q => (
                      <div key={q.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <span className="text-sm shrink-0">{SOURCE_ICONS[q.source] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{q.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">{q.source}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              q.status === 'done_today' ? 'bg-emerald-500/10 text-emerald-400' :
                              q.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                              q.status === 'ready' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.06] text-white/40'
                            }`}>{q.status}</span>
                            <span className="text-[9px] text-[var(--text-secondary)]">{q.userId || '?'}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] shrink-0">{timeAgo(q.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  HEALTH CHECKER SUB-TAB                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {subTab === 'health' && (
        <>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔍</span>
              <div>
                <h3 className="text-base font-heading font-semibold">Agent Card Validator</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Validate DAWP compliance, agent card structure, relay intents, and federation readiness for any instance.
                </p>
              </div>
            </div>
          </div>

          {/* Self Check */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-1">Self Check</div>
                <h4 className="text-sm font-heading font-semibold">This Instance</h4>
              </div>
              <button
                onClick={() => runCheck()}
                disabled={loadingSelf}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-500/90 disabled:opacity-50 transition-colors"
              >
                {loadingSelf ? 'Checking…' : selfResult ? '↻ Re-check' : 'Run Self-Check'}
              </button>
            </div>
            {selfResult && (
              <div>
                <div className="text-[11px] text-[var(--text-secondary)] mb-3 font-mono">{selfResult.agentCardUrl}</div>
                {renderScore(selfResult)}
                {renderChecks(selfResult.checks)}
                {renderAgentCardPreview(selfResult.agentCard)}
              </div>
            )}
            {!selfResult && !loadingSelf && (
              <div className="text-center py-6 text-sm text-[var(--text-secondary)]">Click &quot;Run Self-Check&quot; to validate this instance&apos;s agent card</div>
            )}
          </div>

          {/* Remote Check */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="mb-4">
              <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-1">Remote Instance</div>
              <h4 className="text-sm font-heading font-semibold mb-3">Probe Another Instance</h4>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://their-instance.example.com"
                  className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/40 placeholder:text-white/20"
                />
                <button
                  onClick={() => runCheck(remoteUrl)}
                  disabled={loadingRemote || !remoteUrl}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-white/[0.06] border border-white/[0.06] text-white hover:bg-white/[0.1] disabled:opacity-50 transition-colors shrink-0"
                >
                  {loadingRemote ? 'Probing…' : 'Probe'}
                </button>
              </div>
            </div>
            {remoteResult && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-[11px] text-[var(--text-secondary)] mb-3 font-mono">{remoteResult.agentCardUrl}</div>
                {renderScore(remoteResult)}
                {renderChecks(remoteResult.checks)}
                {renderAgentCardPreview(remoteResult.agentCard)}
              </div>
            )}
          </div>

          {/* Quick Reference */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Quick Reference</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <h5 className="font-semibold text-white mb-2">Required for Discovery</h5>
                <ul className="space-y-1 text-[var(--text-secondary)]">
                  <li>• Public <code className="text-brand-400 font-mono text-[10px]">/.well-known/agent-card.json</code></li>
                  <li>• CORS: <code className="text-brand-400 font-mono text-[10px]">Access-Control-Allow-Origin: *</code></li>
                  <li>• A2A fields: name, url, version, protocol</li>
                  <li>• Authentication scheme declared</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-white mb-2">Required for DAWP</h5>
                <ul className="space-y-1 text-[var(--text-secondary)]">
                  <li>• <code className="text-brand-400 font-mono text-[10px]">dividen.protocolVersion: &quot;DAWP/0.1&quot;</code></li>
                  <li>• Relay intents array (7 standard)</li>
                  <li>• Trust levels declared</li>
                  <li>• Task types for routing</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-white mb-2">Required for Federation</h5>
                <ul className="space-y-1 text-[var(--text-secondary)]">
                  <li>• Federation config (mode, inbound, outbound)</li>
                  <li>• <code className="text-brand-400 font-mono text-[10px]">allowInbound: true</code> to receive relays</li>
                  <li>• Federation endpoints (connect, relay)</li>
                  <li>• Relay skill declared in skills array</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
// ─── Telemetry Tab ──────────────────────────────────────────────────────────
interface TelemetryData {
  range: string;
  since: string;
  totals: { requests: number; errors: number; dbQueryBatches: number };
  uniqueIps: string[];
  avgResponseTime: number;
  topPaths: { path: string; count: number }[];
  statusCounts: Record<string, number>;
  dbActionCounts: Record<string, number>;
  dbModelCounts: Record<string, number>;
  userRequestCounts: Record<string, number>;
  requestTimeline: { hour: string; count: number }[];
  recentErrors: {
    message: string;
    stack?: string;
    path?: string;
    method?: string;
    userId?: string;
    ip?: string;
    createdAt: string;
  }[];
  recentRequests: {
    ip: string | null;
    method: string | null;
    path: string | null;
    statusCode: number | null;
    duration: number | null;
    userId: string | null;
    createdAt: string;
  }[];
  schemaChanges: {
    name: string;
    appliedAt: string;
    finishedAt: string | null;
    steps: number;
  }[];
  generatedAt: string;
}

function TelemetryTab({ token }: { token: string | null }) {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [subTab, setSubTab] = useState<'overview' | 'requests' | 'database' | 'errors' | 'schema'>('overview');

  const fetchTelemetry = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/telemetry?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  if (loading && !data) {
    return <div className="text-center text-[var(--text-secondary)] py-8">Loading telemetry…</div>;
  }
  if (!data) {
    return <div className="text-center text-[var(--text-secondary)] py-8">No telemetry data yet. Data will appear as requests flow through the system.</div>;
  }

  const DB_ACTION_COLORS: Record<string, string> = {
    SELECT: 'text-blue-400 bg-blue-400/10',
    INSERT: 'text-emerald-400 bg-emerald-400/10',
    UPDATE: 'text-amber-400 bg-amber-400/10',
    DELETE: 'text-red-400 bg-red-400/10',
    OTHER: 'text-gray-400 bg-gray-400/10',
  };

  const subTabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'requests' as const, label: 'Requests', icon: '🌐' },
    { id: 'database' as const, label: 'Database', icon: '🗄️' },
    { id: 'errors' as const, label: 'Errors', icon: '🚨' },
    { id: 'schema' as const, label: 'Schema', icon: '📐' },
  ];

  return (
    <div className="space-y-4">
      {/* Range selector + sub-tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {subTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                range === r
                  ? 'bg-white/10 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={fetchTelemetry}
            className="ml-2 px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Overview Sub-Tab */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="Total Requests" value={data.totals.requests} icon="🌐" />
            <MetricCard label="Unique IPs" value={data.uniqueIps.length} icon="📍" accent />
            <MetricCard label="Avg Response" value={`${data.avgResponseTime}ms`} icon="⚡" />
            <MetricCard label="Errors" value={data.totals.errors} icon="🚨" accent={data.totals.errors > 0} />
            <MetricCard label="DB Batches" value={data.totals.dbQueryBatches} icon="🗄️" />
          </div>

          {/* Request timeline */}
          {data.requestTimeline.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <MiniBarChart data={data.requestTimeline.map(t => ({ date: t.hour, count: t.count }))} label={`Request Volume — ${range}`} />
            </div>
          )}

          {/* IP addresses */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">🔍 Active IP Addresses</div>
            <div className="flex flex-wrap gap-2">
              {data.uniqueIps.length === 0 ? (
                <span className="text-xs text-[var(--text-secondary)]">No IPs recorded yet</span>
              ) : (
                data.uniqueIps.map((ip) => (
                  <span key={ip} className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] font-mono">
                    {ip}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Status codes */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">HTTP Status Codes</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.statusCounts).map(([code, count]) => {
                const color = code.startsWith('2') ? 'text-emerald-400 bg-emerald-400/10' :
                              code.startsWith('4') ? 'text-amber-400 bg-amber-400/10' :
                              code.startsWith('5') ? 'text-red-400 bg-red-400/10' :
                              'text-gray-400 bg-gray-400/10';
                return (
                  <div key={code} className={`px-3 py-2 rounded-lg ${color} text-center`}>
                    <div className="text-lg font-heading font-semibold">{count}</div>
                    <div className="text-[10px] opacity-80">{code}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DB query breakdown */}
          {Object.keys(data.dbActionCounts).length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">SQL Query Breakdown</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(data.dbActionCounts).map(([action, count]) => (
                  <div key={action} className={`px-3 py-2 rounded-lg ${DB_ACTION_COLORS[action] || DB_ACTION_COLORS.OTHER} text-center`}>
                    <div className="text-xl font-heading font-semibold">{count.toLocaleString()}</div>
                    <div className="text-[10px] opacity-80 font-mono">{action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Sub-Tab */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {/* Top paths */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Top Endpoints</div>
            <div className="space-y-1">
              {data.topPaths.map((p) => {
                const maxCount = data.topPaths[0]?.count || 1;
                return (
                  <div key={p.path} className="flex items-center gap-3">
                    <div className="text-[11px] font-mono text-[var(--text-secondary)] w-48 truncate">{p.path}</div>
                    <div className="flex-1 h-4 bg-white/[0.04] rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500/40 rounded"
                        style={{ width: `${(p.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono w-12 text-right">{p.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User activity */}
          {Object.keys(data.userRequestCounts).length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Requests by User</div>
              <div className="space-y-1">
                {Object.entries(data.userRequestCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([uid, count]) => (
                    <div key={uid} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                      <span className="text-[11px] font-mono text-[var(--text-secondary)] truncate max-w-[200px]">
                        {uid === 'anonymous' ? '🔓 anonymous' : uid}
                      </span>
                      <span className="text-[11px] font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent requests table */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] px-4 pt-3 pb-2">Recent Requests (last 100)</div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0a0a0a]">
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left label-mono text-[10px] px-4 py-2">Time</th>
                    <th className="text-left label-mono text-[10px] px-4 py-2">Method</th>
                    <th className="text-left label-mono text-[10px] px-4 py-2">Path</th>
                    <th className="text-center label-mono text-[10px] px-4 py-2">Status</th>
                    <th className="text-right label-mono text-[10px] px-4 py-2">Duration</th>
                    <th className="text-left label-mono text-[10px] px-4 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.map((r, i) => {
                    const statusColor = (r.statusCode || 0) < 400 ? 'text-emerald-400' :
                                        (r.statusCode || 0) < 500 ? 'text-amber-400' : 'text-red-400';
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-1.5 text-[11px] text-[var(--text-secondary)]">{timeAgo(r.createdAt)}</td>
                        <td className="px-4 py-1.5 text-[11px] font-mono">{r.method}</td>
                        <td className="px-4 py-1.5 text-[11px] font-mono text-[var(--text-secondary)] max-w-[250px] truncate">{r.path}</td>
                        <td className={`px-4 py-1.5 text-[11px] font-mono text-center ${statusColor}`}>{r.statusCode}</td>
                        <td className="px-4 py-1.5 text-[11px] font-mono text-right">{r.duration ? `${r.duration}ms` : '—'}</td>
                        <td className="px-4 py-1.5 text-[11px] font-mono text-[var(--text-secondary)]">{r.ip || '—'}</td>
                      </tr>
                    );
                  })}
                  {data.recentRequests.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">No requests recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Database Sub-Tab */}
      {subTab === 'database' && (
        <div className="space-y-4">
          {/* Query type breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OTHER'] as const).map((action) => (
              <div key={action} className={`rounded-xl p-4 ${DB_ACTION_COLORS[action]}`}>
                <div className="text-2xl font-heading font-semibold">{(data.dbActionCounts[action] || 0).toLocaleString()}</div>
                <div className="text-[10px] opacity-80 font-mono mt-1">{action}</div>
              </div>
            ))}
          </div>

          {/* Queries by model/table */}
          {Object.keys(data.dbModelCounts).length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Queries by Table</div>
              <div className="space-y-1">
                {Object.entries(data.dbModelCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([model, count]) => {
                    const maxCount = Object.values(data.dbModelCounts)[0] || 1;
                    return (
                      <div key={model} className="flex items-center gap-3">
                        <div className="text-[11px] font-mono text-[var(--text-secondary)] w-40 truncate">{model}</div>
                        <div className="flex-1 h-4 bg-white/[0.04] rounded overflow-hidden">
                          <div
                            className="h-full bg-brand-500/30 rounded"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <div className="text-[11px] font-mono w-16 text-right">{count.toLocaleString()}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {Object.keys(data.dbModelCounts).length === 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center py-8">
              <div className="text-2xl mb-2">🗄️</div>
              <div className="text-sm text-[var(--text-secondary)]">DB query telemetry will appear here as database operations occur.</div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1">Queries are buffered and flushed every 30s to minimize overhead.</div>
            </div>
          )}
        </div>
      )}

      {/* Errors Sub-Tab */}
      {subTab === 'errors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total Errors" value={data.totals.errors} icon="🚨" accent={data.totals.errors > 0} />
            <MetricCard label="Error Rate" value={data.totals.requests > 0 ? `${((data.totals.errors / data.totals.requests) * 100).toFixed(1)}%` : '0%'} icon="📉" />
          </div>

          {data.recentErrors.length > 0 ? (
            <div className="space-y-2">
              {data.recentErrors.map((err, i) => (
                <div key={i} className="bg-red-500/[0.05] border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs font-mono">{err.method} {err.path}</span>
                      {err.ip && <span className="text-[10px] text-[var(--text-secondary)] font-mono">{err.ip}</span>}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">{timeAgo(err.createdAt)}</span>
                  </div>
                  <div className="text-sm text-red-300 mb-1">{err.message}</div>
                  {err.stack && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-white">Stack trace</summary>
                      <pre className="text-[10px] text-[var(--text-secondary)] mt-1 p-2 bg-black/30 rounded overflow-x-auto">{err.stack}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center py-8">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm text-[var(--text-secondary)]">No errors recorded in the last {range}.</div>
            </div>
          )}
        </div>
      )}

      {/* Schema Sub-Tab */}
      {subTab === 'schema' && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">📐 Prisma Migration History</div>
            {data.schemaChanges.length > 0 ? (
              <div className="space-y-2">
                {data.schemaChanges.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                    <div className={`w-2 h-2 rounded-full ${m.finishedAt ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-white truncate">{m.name}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        Applied {timeAgo(m.appliedAt)} · {m.steps} step{m.steps !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className={`text-[10px] px-2 py-0.5 rounded ${m.finishedAt ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                      {m.finishedAt ? 'Applied' : 'Running'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-[var(--text-secondary)]">No migrations found.</div>
            )}
          </div>
        </div>
      )}

      <div className="text-[10px] text-[var(--text-secondary)] text-right">
        Generated {timeAgo(data.generatedAt)} · Showing {range} window
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {accent && <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
      </div>
      <div className="text-2xl font-heading font-semibold">{value}</div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{label}</div>
    </div>
  );
}

// ─── Workflow Discovery Tab ───────────────────────────────────────────────────
function WorkflowsTab({ token }: { token: string }) {
  const [patterns, setPatterns] = useState<Array<{
    id: string;
    description: string;
    userCount: number;
    suggestedName: string | null;
    suggestedAsCapability: boolean;
    adminReviewed: boolean;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const res = await fetch('/api/admin/workflows', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPatterns(data.patterns || []);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    fetchPatterns();
  }, [token]);

  const handleReview = async (id: string) => {
    try {
      await fetch('/api/admin/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, adminReviewed: true }),
      });
      setPatterns(prev => prev.map(p => p.id === id ? { ...p, adminReviewed: true } : p));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-center py-8 text-[var(--text-muted)]">Loading workflow patterns...</div>;

  const suggested = patterns.filter(p => p.suggestedAsCapability && !p.adminReviewed);
  const reviewed = patterns.filter(p => p.adminReviewed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">🔄 Cross-User Workflow Discovery</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Patterns detected across users that could become new capabilities
        </p>
      </div>

      {/* Suggested Capabilities */}
      {suggested.length > 0 && (
        <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-[var(--brand-primary)]">
            💡 Suggested New Capabilities ({suggested.length})
          </h3>
          <div className="space-y-3">
            {suggested.map(p => (
              <div key={p.id} className="bg-black/20 rounded-lg p-3 flex items-start justify-between gap-3">
                <div>
                  {p.suggestedName && (
                    <div className="text-sm font-medium mb-1">{p.suggestedName}</div>
                  )}
                  <p className="text-xs text-[var(--text-secondary)]">{p.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">{p.userCount} users</span>
                    <span className="text-[10px] text-[var(--text-muted)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleReview(p.id)}
                  className="px-2 py-1 text-xs rounded bg-[var(--brand-primary)] text-white shrink-0"
                >
                  Mark Reviewed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggested.length === 0 && (
        <div className="text-center py-8 bg-white/[0.02] rounded-lg">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-sm text-[var(--text-muted)]">No pending workflow suggestions</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Patterns will appear as users interact with the system</p>
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-[var(--text-secondary)]">✅ Reviewed Patterns</h3>
          <div className="space-y-2">
            {reviewed.map(p => (
              <div key={p.id} className="bg-white/[0.02] rounded-lg p-3 opacity-60">
                <div className="text-xs">{p.suggestedName || p.description}</div>
                <span className="text-[10px] text-[var(--text-muted)]">{p.userCount} users</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Admin Tab ──────────────────────────────────────────────────────

function FeedbackAdminTab({ token }: { token: string }) {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback?status=${filter}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(data.data.feedback);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const updateFeedback = async (id: string, status: string, adminNote?: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status, ...(adminNote !== undefined ? { adminNote } : {}) }),
      });
      fetchFeedback();
    } catch (err) {
      console.error('Failed to update feedback:', err);
    }
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-400',
    reviewed: 'bg-yellow-500/20 text-yellow-400',
    resolved: 'bg-green-500/20 text-green-400',
    archived: 'bg-white/[0.06] text-[var(--text-muted)]',
  };

  const categoryIcons: Record<string, string> = {
    general: '\ud83d\udcac',
    bug: '\ud83d\udc1b',
    feature: '\ud83d\udca1',
    ux: '\ud83c\udfa8',
    onboarding: '\ud83d\ude80',
  };

  const ratingEmojis = ['', '\ud83d\ude1f', '\ud83d\ude10', '\ud83d\ude42', '\ud83d\ude0a', '\ud83e\udd29'];

  const statusFilters = ['all', 'new', 'reviewed', 'resolved', 'archived'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">User Feedback</h2>
          <p className="text-xs text-[var(--text-muted)]">{total} submissions total</p>
        </div>
        <div className="flex gap-1">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === s
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <div className="text-3xl mb-2">{filter === 'all' ? '\ud83d\udcec' : '\u2705'}</div>
          <p className="text-sm">{filter === 'all' ? 'No feedback yet' : `No ${filter} feedback`}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feedback.map((item: any) => (
            <div
              key={item.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm">{categoryIcons[item.category] || '\ud83d\udcac'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{item.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {item.user?.name || item.user?.email || 'Unknown'} &middot; {new Date(item.createdAt).toLocaleDateString()} &middot; {item.page || 'unknown page'}
                  </p>
                </div>
                {item.rating && <span className="text-sm">{ratingEmojis[item.rating]}</span>}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status] || ''}`}>
                  {item.status}
                </span>
                <span className="text-[var(--text-muted)] text-xs">{expandedId === item.id ? '\u25b2' : '\u25bc'}</span>
              </button>

              {/* Expanded detail */}
              {expandedId === item.id && (
                <div className="px-4 pb-3 pt-1 border-t border-white/[0.04] space-y-3">
                  <div className="bg-white/[0.02] rounded-lg p-3">
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{item.message}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[var(--text-muted)]">Set status:</span>
                    {['new', 'reviewed', 'resolved', 'archived'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateFeedback(item.id, s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          item.status === s
                            ? 'bg-[var(--brand-primary)] text-white'
                            : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Admin note */}
                  <AdminNoteEditor
                    initialNote={item.adminNote || ''}
                    onSave={(note: string) => updateFeedback(item.id, item.status, note)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminNoteEditor({ initialNote, onSave }: { initialNote: string; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Admin note:</span>
        {initialNote ? (
          <span className="text-xs text-[var(--text-secondary)] flex-1">{initialNote}</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">None</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-[10px] text-[var(--brand-primary)] hover:underline"
        >
          {initialNote ? 'Edit' : 'Add note'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40 resize-none"
        placeholder="Add admin note..."
      />
      <div className="flex gap-2">
        <button
          onClick={() => { onSave(note); setEditing(false); }}
          className="px-3 py-1 bg-[var(--brand-primary)] text-white text-[10px] rounded font-medium"
        >
          Save
        </button>
        <button
          onClick={() => { setNote(initialNote); setEditing(false); }}
          className="px-3 py-1 bg-white/[0.04] text-[var(--text-secondary)] text-[10px] rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}