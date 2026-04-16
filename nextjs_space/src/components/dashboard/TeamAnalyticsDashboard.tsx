'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────── */

interface AnalyticsData {
  overview: {
    teamName: string;
    isSelfHosted: boolean;
    agentEnabled: boolean;
    createdAt: string;
    memberCount: number;
    projectCount: number;
    activeProjectCount: number;
    followerCount: number;
    agentAccessCount: number;
  };
  queue: {
    total: number;
    completed: number;
    pending: number;
    blocked: number;
    recentWeek: number;
    completionRate: number;
    statusDistribution: Record<string, number>;
  };
  relays: { total: number; recentWeek: number };
  goals: { total: number; completed: number; completionRate: number };
  invites: { pending: number; accepted: number };
  members: MemberActivity[];
  projects: ProjectSummary[];
  billing: BillingSummary;
  recentActivity: RecentItem[];
}

interface MemberActivity {
  id: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string | null;
  isFederated: boolean;
  federatedInstance: string | null;
  activity: { chatMessages: number; kanbanCards: number };
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  color: string | null;
  updatedAt: string;
  _count: { kanbanCards: number; queueItems: number; members: number };
}

interface BillingSummary {
  subscription: {
    tier: string;
    status: string;
    memberLimit: number;
    monthlyPrice: number;
    perSeatPrice: number | null;
    trialEndsAt: string | null;
    canceledAt: string | null;
    billingCycleStart: string;
  } | null;
  billing: {
    monthlyBudget: number | null;
    currentSpend: number;
    billingCycleStart: string;
    isActive: boolean;
    budgetUtilization: number | null;
  } | null;
  spendingPolicies: SpendingPolicy[];
  isSelfHosted: boolean;
}

interface SpendingPolicy {
  id: string;
  type: string;
  targetId: string | null;
  limit: number;
  currentSpend: number;
  period: string;
  utilization: number;
}

interface RecentItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  teamId: string;
  userRole: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const STATUS_COLORS: Record<string, string> = {
  ready: '#4f7cff',
  in_progress: '#f59e0b',
  done_today: '#22c55e',
  blocked: '#ef4444',
  pending_confirmation: '#facc15',
  canceled: '#6b7280',
};

const PRIORITY_ICONS: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

/* ── Stat Card ──────────────────────────────────────────────────── */

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string; icon: string; accent?: string;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {accent && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${accent}15`, color: accent }}>{sub}</span>}
      </div>
      <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

/* ── Progress Bar ───────────────────────────────────────────────── */

function ProgressBar({ value, max, color, label }: {
  value: number; max: number; color: string; label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-secondary)]">{label}</span>
          <span className="text-[var(--text-primary)] font-medium">{pct}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Status Bar Chart ───────────────────────────────────────────── */

function StatusBarChart({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-[var(--text-muted)] text-center py-4">No queue data yet</p>;

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...entries.map(([, v]) => v));

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] w-28 truncate capitalize">
            {status.replace(/_/g, ' ')}
          </span>
          <div className="flex-1 h-5 rounded bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(count / maxVal) * 100}%`,
                background: STATUS_COLORS[status] || '#6b7280',
              }}
            />
          </div>
          <span className="text-xs text-[var(--text-primary)] font-medium w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */

export function TeamAnalyticsDashboard({ teamId, userRole }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'members' | 'projects' | 'billing'>('overview');

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teams/${teamId}/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">{error || 'No data available'}</p>
        <button onClick={fetchAnalytics} className="btn-secondary mt-4 text-sm">Retry</button>
      </div>
    );
  }

  const sections = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'members' as const, label: 'Members', icon: '👥' },
    { id: 'projects' as const, label: 'Projects', icon: '📁' },
    ...(isAdmin ? [{ id: 'billing' as const, label: 'Billing', icon: '💳' }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Section tabs ── */}
      <div className="flex items-center gap-1 border-b border-[var(--border-color)] pb-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              activeSection === s.id
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]',
            )}
          >
            {s.icon} {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={fetchAnalytics} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" title="Refresh">
          🔄
        </button>
      </div>

      {/* ── Content ── */}
      {activeSection === 'overview' && <OverviewSection data={data} />}
      {activeSection === 'members' && <MembersSection members={data.members} />}
      {activeSection === 'projects' && <ProjectsSection projects={data.projects} />}
      {activeSection === 'billing' && isAdmin && <BillingSection billing={data.billing} teamId={teamId} onRefresh={fetchAnalytics} overview={data.overview} />}
    </div>
  );
}

/* ── Overview Section ───────────────────────────────────────────── */

function OverviewSection({ data }: { data: AnalyticsData }) {
  const { overview, queue, relays, goals, invites } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Members" value={overview.memberCount} />
        <StatCard icon="📁" label="Active Projects" value={overview.activeProjectCount} sub={`${overview.projectCount} total`} accent="#4f7cff" />
        <StatCard icon="📋" label="Queue Items" value={queue.total} sub={`${queue.recentWeek} this week`} accent="#f59e0b" />
        <StatCard icon="✅" label="Completion Rate" value={`${queue.completionRate}%`} sub={`${queue.completed} completed`} accent="#22c55e" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="🔗" label="Agent Relays" value={relays.total} sub={`${relays.recentWeek} this week`} accent="#8b5cf6" />
        <StatCard icon="🎯" label="Goals" value={goals.total} sub={`${goals.completionRate}% done`} accent="#22c55e" />
        <StatCard icon="🫧" label="Agents Installed" value={overview.agentAccessCount} />
        <StatCard icon="📨" label="Invites" value={invites.pending} sub={`${invites.accepted} accepted`} accent="#4f7cff" />
      </div>

      {/* Queue status chart + recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Queue Distribution</h4>
          <StatusBarChart distribution={queue.statusDistribution} />
        </div>

        <div className="card p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Recent Activity</h4>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
            {data.recentActivity.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No activity yet</p>
            )}
            {data.recentActivity.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span>{PRIORITY_ICONS[item.priority] || '⚪'}</span>
                <span className="flex-1 truncate text-[var(--text-primary)]">{item.title}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                  style={{
                    background: `${STATUS_COLORS[item.status] || '#6b7280'}20`,
                    color: STATUS_COLORS[item.status] || '#6b7280',
                  }}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[var(--text-muted)] whitespace-nowrap">{timeAgo(item.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>👁 {overview.followerCount} followers</span>
        {overview.isSelfHosted && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Self-Hosted</span>}
        {overview.agentEnabled && <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Team Agent Active</span>}
        <span>Created {new Date(overview.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ── Members Section ────────────────────────────────────────────── */

function MembersSection({ members }: { members: MemberActivity[] }) {
  const sorted = [...members].sort((a, b) => {
    // Sort by role priority then activity
    const rolePriority: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    const roleA = rolePriority[a.role] ?? 3;
    const roleB = rolePriority[b.role] ?? 3;
    if (roleA !== roleB) return roleA - roleB;
    const actA = a.activity.chatMessages + a.activity.kanbanCards;
    const actB = b.activity.chatMessages + b.activity.kanbanCards;
    return actB - actA;
  });

  const totalChat = members.reduce((s, m) => s + m.activity.chatMessages, 0);
  const totalCards = members.reduce((s, m) => s + m.activity.kanbanCards, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="👥" label="Total Members" value={members.length} />
        <StatCard icon="💬" label="Total Chat Messages" value={totalChat} />
        <StatCard icon="📝" label="Total Cards" value={totalCards} />
      </div>

      {/* Member list */}
      <div className="card">
        <div className="card-header px-4 py-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Member Activity</h4>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {sorted.map((m) => {
            const totalActivity = m.activity.chatMessages + m.activity.kanbanCards;
            const maxActivity = Math.max(...members.map((x) => x.activity.chatMessages + x.activity.kanbanCards), 1);
            return (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center text-xs font-medium text-[var(--brand-primary)] shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>

                {/* Name & meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)] font-medium truncate">{m.name}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded capitalize',
                      m.role === 'owner' ? 'bg-amber-500/10 text-amber-400' :
                      m.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-white/[0.06] text-[var(--text-muted)]'
                    )}>
                      {m.role}
                    </span>
                    {m.isFederated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Federated</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {m.email || m.federatedInstance || 'No email'}
                    {' · Joined '}{timeAgo(m.joinedAt)}
                  </p>
                </div>

                {/* Activity bar */}
                <div className="w-32 hidden sm:block">
                  <ProgressBar value={totalActivity} max={maxActivity} color="var(--brand-primary)" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] shrink-0">
                  <span title="Chat messages">💬 {m.activity.chatMessages}</span>
                  <span title="Kanban cards">📝 {m.activity.kanbanCards}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Projects Section ───────────────────────────────────────────── */

function ProjectsSection({ projects }: { projects: ProjectSummary[] }) {
  const active = projects.filter((p) => p.status !== 'archived');
  const archived = projects.filter((p) => p.status === 'archived');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📁" label="Total Projects" value={projects.length} />
        <StatCard icon="🟢" label="Active" value={active.length} />
        <StatCard icon="📦" label="Archived" value={archived.length} />
      </div>

      <div className="card">
        <div className="card-header px-4 py-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Project Breakdown</h4>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {projects.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No projects yet</p>
          )}
          {projects.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: p.color || 'var(--brand-primary)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-primary)] font-medium truncate">{p.name}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded capitalize',
                    p.status === 'active' ? 'bg-green-500/10 text-green-400' :
                    p.status === 'archived' ? 'bg-white/[0.06] text-[var(--text-muted)]' :
                    'bg-amber-500/10 text-amber-400'
                  )}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Updated {timeAgo(p.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] shrink-0">
                <span title="Members">👥 {p._count.members}</span>
                <span title="Cards">📝 {p._count.kanbanCards}</span>
                <span title="Queue items">📋 {p._count.queueItems}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Billing Section ────────────────────────────────────────────── */

function BillingSection({ billing, teamId, onRefresh, overview }: {
  billing: BillingSummary; teamId: string; onRefresh: () => void; overview: AnalyticsData['overview'];
}) {
  const [editBudget, setEditBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(billing.billing?.monthlyBudget?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [policyForm, setPolicyForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ type: 'per_member', limit: '', period: 'monthly' });

  const saveBudget = async () => {
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budgetValue ? parseFloat(budgetValue) : null }),
      });
      setEditBudget(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const createPolicy = async () => {
    if (!newPolicy.limit) return;
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newPolicy.type, limit: parseFloat(newPolicy.limit), period: newPolicy.period }),
      });
      setPolicyForm(false);
      setNewPolicy({ type: 'per_member', limit: '', period: 'monthly' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const deletePolicy = async (policyId: string) => {
    await fetch(`/api/teams/${teamId}/billing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', policyId }),
    });
    onRefresh();
  };

  if (billing.isSelfHosted) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl mb-3">🏠</div>
        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Self-Hosted Instance</h4>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          This team originates from a self-hosted DiviDen instance. All premium features are unlocked with no billing required.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          ✓ All features unlocked · No billing gates
        </div>
      </div>
    );
  }

  const sub = billing.subscription;
  const bill = billing.billing;

  return (
    <div className="flex flex-col gap-4">
      {/* Subscription card */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Subscription</h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {sub ? `${sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} Plan` : 'No subscription'}
            </p>
          </div>
          {sub && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full capitalize',
              sub.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              sub.status === 'trialing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              sub.status === 'past_due' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              'bg-white/[0.06] text-[var(--text-muted)]'
            )}>
              {sub.status}
            </span>
          )}
        </div>

        {sub ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Monthly Price</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">${sub.monthlyPrice}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Members</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {overview.memberCount}
                <span className="text-sm text-[var(--text-secondary)] font-normal"> / {sub.memberLimit}</span>
              </p>
            </div>
            {sub.perSeatPrice && (
              <div>
                <p className="text-xs text-[var(--text-muted)]">Per Seat (extra)</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">${sub.perSeatPrice}/mo</p>
              </div>
            )}
            {sub.trialEndsAt && (
              <div>
                <p className="text-xs text-[var(--text-muted)]">Trial Ends</p>
                <p className="text-sm font-medium text-amber-400">
                  {new Date(sub.trialEndsAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">No active subscription. Team features require a subscription to use on the hosted platform.</p>
        )}

        {sub && (
          <div className="mt-4">
            <ProgressBar
              value={overview.memberCount}
              max={sub.memberLimit}
              color={overview.memberCount >= sub.memberLimit ? '#ef4444' : 'var(--brand-primary)'}
              label={`Seat usage (${overview.memberCount}/${sub.memberLimit})`}
            />
          </div>
        )}
      </div>

      {/* Budget card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Monthly Budget</h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Control team-wide spending</p>
          </div>
          <button onClick={() => setEditBudget(!editBudget)} className="text-xs text-[var(--brand-primary)] hover:underline">
            {editBudget ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editBudget ? (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">$</span>
            <input
              type="number"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="input-base flex-1"
              placeholder="No limit"
              min={0}
              step={10}
            />
            <button onClick={saveBudget} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <div>
            {bill ? (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    ${bill.currentSpend.toFixed(2)}
                  </p>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {bill.monthlyBudget ? `/ $${bill.monthlyBudget}` : '(no limit)'}
                  </span>
                </div>
                {bill.monthlyBudget && bill.budgetUtilization !== null && (
                  <ProgressBar
                    value={bill.currentSpend}
                    max={bill.monthlyBudget}
                    color={bill.budgetUtilization > 90 ? '#ef4444' : bill.budgetUtilization > 70 ? '#f59e0b' : '#22c55e'}
                    label={`Budget utilization`}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No budget configured. Click Edit to set one.</p>
            )}
          </div>
        )}
      </div>

      {/* Spending policies */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Spending Policies</h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Per-member, per-project, or per-agent limits</p>
          </div>
          <button onClick={() => setPolicyForm(!policyForm)} className="text-xs text-[var(--brand-primary)] hover:underline">
            {policyForm ? 'Cancel' : '+ Add Policy'}
          </button>
        </div>

        {policyForm && (
          <div className="flex flex-wrap items-end gap-2 mb-4 p-3 rounded-lg bg-white/[0.02] border border-[var(--border-color)]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Type</label>
              <select
                value={newPolicy.type}
                onChange={(e) => setNewPolicy({ ...newPolicy, type: e.target.value })}
                className="input-base text-xs py-1.5"
              >
                <option value="per_member">Per Member</option>
                <option value="per_project">Per Project</option>
                <option value="per_agent">Per Agent</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Limit ($)</label>
              <input
                type="number"
                value={newPolicy.limit}
                onChange={(e) => setNewPolicy({ ...newPolicy, limit: e.target.value })}
                className="input-base text-xs py-1.5 w-24"
                placeholder="100"
                min={0}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Period</label>
              <select
                value={newPolicy.period}
                onChange={(e) => setNewPolicy({ ...newPolicy, period: e.target.value })}
                className="input-base text-xs py-1.5"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button onClick={createPolicy} disabled={saving || !newPolicy.limit} className="btn-primary text-xs px-3 py-1.5">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}

        {billing.spendingPolicies.length === 0 && !policyForm ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">No spending policies configured</p>
        ) : (
          <div className="flex flex-col gap-2">
            {billing.spendingPolicies.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-[var(--border-color)]">
                <span className="text-sm">
                  {p.type === 'per_member' ? '👤' : p.type === 'per_project' ? '📁' : '🤖'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-primary)] font-medium capitalize">
                      {p.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] capitalize">{p.period}</span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar
                      value={p.currentSpend}
                      max={p.limit}
                      color={p.utilization > 90 ? '#ef4444' : p.utilization > 70 ? '#f59e0b' : '#22c55e'}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    ${p.currentSpend.toFixed(2)} / ${p.limit.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => deletePolicy(p.id)}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0"
                  title="Remove policy"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
