'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'activity' | 'federation'>('overview');

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
    { id: 'federation' as const, label: 'Federation', icon: '🌐' },
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
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'users' && <UsersTab stats={stats} />}
        {activeTab === 'content' && <ContentTab stats={stats} />}
        {activeTab === 'activity' && <ActivityTab stats={stats} />}
        {activeTab === 'federation' && <FederationTab token={token} />}
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
function UsersTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Users" value={stats.users.total} icon="👥" />
        <MetricCard label="New (7d)" value={stats.users.last7d} icon="📈" accent />
        <MetricCard label="New (30d)" value={stats.users.last30d} icon="📅" />
      </div>

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

function FederationTab({ token }: { token: string | null }) {
  const [remoteUrl, setRemoteUrl] = useState('');
  const [selfResult, setSelfResult] = useState<FedResult | null>(null);
  const [remoteResult, setRemoteResult] = useState<FedResult | null>(null);
  const [loadingSelf, setLoadingSelf] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const runCheck = async (url?: string) => {
    const isRemote = !!url;
    if (isRemote) setLoadingRemote(true);
    else setLoadingSelf(true);

    try {
      const res = await fetch('/api/admin/federation-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url || '' }),
      });
      const data = await res.json();
      if (isRemote) setRemoteResult(data);
      else setSelfResult(data);
    } catch {
      // Error handling via result
    } finally {
      if (isRemote) setLoadingRemote(false);
      else setLoadingSelf(false);
    }
  };

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
          <div
            key={check.id}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg ${style.bg}`}
          >
            <span className={`text-sm font-mono font-bold w-5 shrink-0 ${style.text}`}>
              {style.icon}
            </span>
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
        <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-white transition-colors">
          View Raw Agent Card JSON
        </summary>
        <pre className="mt-2 p-3 bg-black/50 border border-white/[0.06] rounded-lg text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-80 overflow-y-auto">
          {JSON.stringify(card, null, 2)}
        </pre>
      </details>
    );
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🌐</span>
          <div>
            <h3 className="text-base font-heading font-semibold">Federation Health Checker</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Validate DAWP compliance, agent card structure, relay intents, and federation readiness.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Every DiviDen instance publishes an agent card at <code className="text-brand-400 font-mono">/.well-known/agent-card.json</code>.
          This checker validates that the card is publicly reachable, CORS-open, and contains all required DAWP/0.1 metadata
          for discovery, relay routing, and cross-instance federation.
        </p>
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
          <div className="text-center py-6 text-sm text-[var(--text-secondary)]">
            Click &quot;Run Self-Check&quot; to validate this instance&apos;s agent card
          </div>
        )}
      </div>

      {/* Remote Check */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <div className="mb-4">
          <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-1">Remote Instance</div>
          <h4 className="text-sm font-heading font-semibold mb-3">Probe Another Instance</h4>
          <p className="text-[11px] text-[var(--text-secondary)] mb-3">
            Enter the base URL of another DiviDen instance to verify it can be discovered and is ready for federation.
          </p>
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
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
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
