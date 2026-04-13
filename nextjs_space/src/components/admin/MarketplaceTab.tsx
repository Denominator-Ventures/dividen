'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, StatusBadge, EmptyState, timeAgo, useAdminFetch } from './shared';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MarketplaceAgentRow {
  id: string; name: string; slug: string; description: string; category: string;
  status: string; featured: boolean; pricingModel: string; pricePerTask: number | null;
  totalExecutions: number; avgRating: number; totalRatings: number; successRate: number | null;
  totalGrossRevenue: number; totalPlatformFees: number; developerName: string;
  developerUrl: string | null; endpointUrl: string; supportsA2A: boolean; supportsMCP: boolean;
  version: string; createdAt: string; updatedAt: string;
  _count: { subscriptions: number; executions: number };
}

interface CapabilityRow {
  id: string; name: string; slug: string; description: string; icon: string; category: string;
  status: string; featured: boolean; pricingModel: string; price: number | null;
  prompt: string; longDescription: string | null; tags: string | null;
  integrationType: string | null; editableFields: string | null;
  publisherName: string; publisherType: string; publisherUrl: string | null;
  approvalStatus: string; rejectionReason: string | null;
  skillFormat: boolean; skillBody: string | null; skillSource: string | null;
  installCount: number; createdAt: string; updatedAt: string;
  createdByUser: { id: string; name: string; email: string } | null;
}

interface UserOption { id: string; name: string; email: string; role: string }

/* ─── Sub-tab types ──────────────────────────────────────────────────────── */
type SubTab = 'agents' | 'capabilities' | 'create-cap' | 'create-agent';

const CATEGORY_ICONS: Record<string, string> = {
  research: '🔬', coding: '💻', writing: '✍️', analysis: '📊',
  operations: '⚙️', creative: '🎨', general: '🤖', productivity: '📋',
  communication: '💬', security: '🔒',
};

const CAP_CATEGORIES = ['operations', 'research', 'coding', 'writing', 'analysis', 'creative', 'productivity', 'communication', 'security', 'general'];

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MarketplaceTab({ token }: { token: string }) {
  const adminFetch = useAdminFetch(token);
  const [subTab, setSubTab] = useState<SubTab>('agents');

  /* shared state */
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then((stats: any) => {
        const list = stats?.users?.list || [];
        setUsers(list.map((u: any) => ({ id: u.id, name: u.name || u.email, email: u.email, role: u.role })));
      })
      .catch(() => {});
  }, [adminFetch]);

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2">
        {([
          { key: 'agents' as SubTab, label: '🤖 Agents' },
          { key: 'capabilities' as SubTab, label: '⚡ Capabilities' },
          { key: 'create-cap' as SubTab, label: '+ Capability' },
          { key: 'create-agent' as SubTab, label: '+ Agent' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === key
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'agents' && <AgentsSubTab token={token} adminFetch={adminFetch} users={users} />}
      {subTab === 'capabilities' && <CapabilitiesSubTab token={token} adminFetch={adminFetch} />}
      {subTab === 'create-cap' && <CreateCapabilityForm adminFetch={adminFetch} users={users} onCreated={() => setSubTab('capabilities')} />}
      {subTab === 'create-agent' && <CreateAgentForm adminFetch={adminFetch} users={users} onCreated={() => setSubTab('agents')} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Agents Sub-Tab (mostly preserved from original)
   ═══════════════════════════════════════════════════════════════════════════ */
function AgentsSubTab({ token, adminFetch, users }: { token: string; adminFetch: any; users: UserOption[] }) {
  const [agents, setAgents] = useState<MarketplaceAgentRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const result = await adminFetch('/api/admin/marketplace');
      setAgents(result.agents || []);
      setTotals(result.totals || {});
    } catch (err) { console.error('Failed to fetch agents:', err); }
    finally { setLoading(false); }
  }, [adminFetch]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const updateAgent = async (id: string, updates: Record<string, any>) => {
    setActionLoading(id);
    try {
      await adminFetch('/api/admin/marketplace', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) });
      await fetchAgents();
    } catch (err) { console.error('Update failed:', err); }
    finally { setActionLoading(null); }
  };

  const deleteAgent = async (id: string, name: string) => {
    if (!confirm(`Permanently delete agent "${name}"? This removes all subscriptions and executions.`)) return;
    setActionLoading(id);
    try {
      await adminFetch(`/api/admin/marketplace?id=${id}`, { method: 'DELETE' });
      await fetchAgents();
    } catch (err) { console.error('Delete failed:', err); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="text-center text-[var(--text-secondary)] py-8">Loading agents…</div>;
  if (!totals) return <EmptyState icon="🤖" title="No Data" description="Could not load agent data." />;

  const filtered = agents.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'featured') return a.featured;
    return a.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Agents" value={totals.total ?? 0} icon="🤖" />
        <MetricCard label="Active" value={totals.active ?? 0} icon="✅" accent />
        <MetricCard label="Pending Review" value={totals.pending ?? 0} icon="⏳" accent={(totals.pending ?? 0) > 0} />
        <MetricCard label="Featured" value={totals.featured ?? 0} icon="⭐" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'active', 'featured', 'disabled', 'suspended'].map((f) => {
          const count = f === 'all' ? agents.length : f === 'featured' ? agents.filter(a => a.featured).length : agents.filter(a => a.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
        <button onClick={fetchAgents} className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
      </div>

      {/* Agent list */}
      {filtered.length === 0 ? <EmptyState icon="🤖" title="No agents match" description="No agents match the current filter." /> : (
        <div className="space-y-2">
          {filtered.map((agent) => (
            <div key={agent.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors">
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{CATEGORY_ICONS[agent.category] || '🤖'}</span>
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <StatusBadge status={agent.status} />
                      {agent.featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">⭐ Featured</span>}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mb-2">{agent.description}</div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-secondary)]">
                      <span>by {agent.developerName}</span>
                      <span>v{agent.version}</span>
                      <span>{agent.pricingModel === 'free' ? '🆓 Free' : `💰 $${agent.pricePerTask?.toFixed(2) || '?'}/task`}</span>
                      <span>▶️ {agent.totalExecutions.toLocaleString()} runs</span>
                      {agent.supportsA2A && <span>🔄 A2A</span>}
                      {agent.supportsMCP && <span>🔌 MCP</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {agent.status === 'pending' && (
                      <>
                        <button onClick={() => updateAgent(agent.id, { status: 'active' })} disabled={actionLoading === agent.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors">✅ Approve</button>
                        <button onClick={() => updateAgent(agent.id, { status: 'disabled' })} disabled={actionLoading === agent.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">✖ Reject</button>
                      </>
                    )}
                    {agent.status === 'active' && (
                      <button onClick={() => updateAgent(agent.id, { status: 'suspended' })} disabled={actionLoading === agent.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">Suspend</button>
                    )}
                    {(agent.status === 'suspended' || agent.status === 'disabled') && (
                      <button onClick={() => updateAgent(agent.id, { status: 'active' })} disabled={actionLoading === agent.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors">Reactivate</button>
                    )}
                    <button onClick={() => updateAgent(agent.id, { featured: !agent.featured })} disabled={actionLoading === agent.id}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${agent.featured ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'}`}>
                      {agent.featured ? '⭐ Unfeat.' : '☆ Feature'}
                    </button>
                    <button onClick={() => deleteAgent(agent.id, agent.name)} disabled={actionLoading === agent.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">🗑</button>
                  </div>
                </div>
              </div>
              {expanded === agent.id && (
                <div className="border-t border-white/[0.06] p-4 bg-white/[0.01] space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Endpoint</div>
                      <div className="text-[11px] font-mono text-white break-all">{agent.endpointUrl}</div>
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Developer</div>
                      <div className="text-[11px] text-white">{agent.developerName}</div>
                      {agent.developerUrl && <div className="text-[10px] text-brand-400 font-mono truncate">{agent.developerUrl}</div>}
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Revenue</div>
                      <div className="text-[11px] text-white">Gross: ${agent.totalGrossRevenue.toFixed(2)}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Platform: ${agent.totalPlatformFees.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Subscribers</div>
                      <div className="text-[11px] text-white">{agent._count.subscriptions} subs · {agent._count.executions} execs</div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
                    <span>Slug: {agent.slug}</span>
                    <span>Created: {timeAgo(agent.createdAt)}</span>
                    <span>Updated: {timeAgo(agent.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Capabilities Sub-Tab
   ═══════════════════════════════════════════════════════════════════════════ */
function CapabilitiesSubTab({ token, adminFetch }: { token: string; adminFetch: any }) {
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchCapabilities = useCallback(async () => {
    try {
      const result = await adminFetch('/api/admin/capabilities');
      setCapabilities(result.data || []);
    } catch (err) { console.error('Failed to fetch capabilities:', err); }
    finally { setLoading(false); }
  }, [adminFetch]);

  useEffect(() => { fetchCapabilities(); }, [fetchCapabilities]);

  const updateCap = async (id: string, updates: Record<string, any>) => {
    setActionLoading(id);
    try {
      await adminFetch('/api/admin/capabilities', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) });
      await fetchCapabilities();
    } catch (err) { console.error('Update failed:', err); }
    finally { setActionLoading(null); }
  };

  const deleteCap = async (id: string, name: string) => {
    if (!confirm(`Permanently delete capability "${name}"? This removes all user installs.`)) return;
    setActionLoading(id);
    try {
      await adminFetch(`/api/admin/capabilities?id=${id}`, { method: 'DELETE' });
      await fetchCapabilities();
    } catch (err) { console.error('Delete failed:', err); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await updateCap(rejectId, { approvalStatus: 'rejected', rejectionReason: rejectReason || 'Rejected by admin' });
    setRejectId(null);
    setRejectReason('');
  };

  if (loading) return <div className="text-center text-[var(--text-secondary)] py-8">Loading capabilities…</div>;

  const pendingCount = capabilities.filter(c => c.approvalStatus === 'pending_review').length;
  const approvedCount = capabilities.filter(c => c.approvalStatus === 'approved').length;
  const rejectedCount = capabilities.filter(c => c.approvalStatus === 'rejected').length;
  const skillCount = capabilities.filter(c => c.skillFormat).length;

  const filtered = capabilities.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pending_review') return c.approvalStatus === 'pending_review';
    if (filter === 'approved') return c.approvalStatus === 'approved';
    if (filter === 'rejected') return c.approvalStatus === 'rejected';
    if (filter === 'featured') return c.featured;
    if (filter === 'skills') return c.skillFormat;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total" value={capabilities.length} icon="⚡" />
        <MetricCard label="Approved" value={approvedCount} icon="✅" />
        <MetricCard label="Pending Review" value={pendingCount} icon="⏳" accent={pendingCount > 0} />
        <MetricCard label="Rejected" value={rejectedCount} icon="❌" />
        <MetricCard label="Agent Skills" value={skillCount} icon="🧩" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: `All (${capabilities.length})` },
          { key: 'pending_review', label: `Pending (${pendingCount})` },
          { key: 'approved', label: `Approved (${approvedCount})` },
          { key: 'rejected', label: `Rejected (${rejectedCount})` },
          { key: 'featured', label: `Featured (${capabilities.filter(c => c.featured).length})` },
          { key: 'skills', label: `Skills (${skillCount})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === key ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'}`}>
            {label}
          </button>
        ))}
        <button onClick={fetchCapabilities} className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-red-400">Reject Capability</div>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-sm text-white placeholder:text-[var(--text-secondary)] resize-none h-20" />
          <div className="flex gap-2">
            <button onClick={handleReject}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-400/20 text-red-400 hover:bg-red-400/30 transition-colors">Confirm Reject</button>
            <button onClick={() => { setRejectId(null); setRejectReason(''); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.04]">Cancel</button>
          </div>
        </div>
      )}

      {/* Capability list */}
      {filtered.length === 0 ? <EmptyState icon="⚡" title="No capabilities match" description="No capabilities match the current filter." /> : (
        <div className="space-y-2">
          {filtered.map((cap) => (
            <div key={cap.id}
              className={`bg-white/[0.02] border rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors ${
                cap.approvalStatus === 'pending_review' ? 'border-amber-400/30' : cap.approvalStatus === 'rejected' ? 'border-red-400/20' : 'border-white/[0.06]'
              }`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === cap.id ? null : cap.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{cap.icon || '⚡'}</span>
                      <span className="text-sm font-medium text-white">{cap.name}</span>
                      <StatusBadge status={cap.approvalStatus} />
                      {cap.featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">⭐ Featured</span>}
                      {cap.skillFormat && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">🧩 Agent Skill</span>}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)]">
                        {cap.publisherType === 'platform' ? '🏢' : '👤'} {cap.publisherName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mb-2">{cap.description}</div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-secondary)]">
                      <span>{CATEGORY_ICONS[cap.category] || '⚡'} {cap.category}</span>
                      <span>{cap.pricingModel === 'free' ? '🆓 Free' : `💰 $${cap.price?.toFixed(2) || '?'}`}</span>
                      <span>📥 {cap.installCount} installs</span>
                      {cap.skillSource && <span>📎 {cap.skillSource}</span>}
                      {cap.createdByUser && <span>👤 {cap.createdByUser.name || cap.createdByUser.email}</span>}
                    </div>
                    {cap.rejectionReason && (
                      <div className="mt-2 text-[10px] text-red-400 bg-red-400/5 rounded px-2 py-1">
                        Rejection reason: {cap.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {cap.approvalStatus === 'pending_review' && (
                      <>
                        <button onClick={() => updateCap(cap.id, { approvalStatus: 'approved' })} disabled={actionLoading === cap.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors">✅ Approve</button>
                        <button onClick={() => setRejectId(cap.id)} disabled={actionLoading === cap.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">✖ Reject</button>
                      </>
                    )}
                    {cap.approvalStatus === 'approved' && (
                      <button onClick={() => updateCap(cap.id, { approvalStatus: 'rejected', rejectionReason: 'Unpublished by admin' })} disabled={actionLoading === cap.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 transition-colors">Unpublish</button>
                    )}
                    {cap.approvalStatus === 'rejected' && (
                      <button onClick={() => updateCap(cap.id, { approvalStatus: 'approved', rejectionReason: null })} disabled={actionLoading === cap.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors">Re-approve</button>
                    )}
                    <button onClick={() => updateCap(cap.id, { featured: !cap.featured })} disabled={actionLoading === cap.id}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${cap.featured ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'}`}>
                      {cap.featured ? '⭐ Unfeat.' : '☆ Feature'}
                    </button>
                    <button onClick={() => deleteCap(cap.id, cap.name)} disabled={actionLoading === cap.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">🗑</button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === cap.id && (
                <div className="border-t border-white/[0.06] p-4 bg-white/[0.01] space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Publisher</div>
                      <div className="text-[11px] text-white">{cap.publisherType === 'platform' ? '🏢' : '👤'} {cap.publisherName}</div>
                      {cap.publisherUrl && <div className="text-[10px] text-brand-400 font-mono truncate">{cap.publisherUrl}</div>}
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Pricing</div>
                      <div className="text-[11px] text-white">{cap.pricingModel} {cap.price ? `— $${cap.price}` : ''}</div>
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Integration</div>
                      <div className="text-[11px] text-white">{cap.integrationType || 'standalone'}</div>
                    </div>
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Created</div>
                      <div className="text-[11px] text-white">{timeAgo(cap.createdAt)}</div>
                    </div>
                  </div>
                  {cap.skillFormat && cap.skillBody && (
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Skill Body</div>
                      <pre className="text-[10px] text-[var(--text-secondary)] bg-white/[0.02] rounded p-2 overflow-auto max-h-32 font-mono">{cap.skillBody}</pre>
                    </div>
                  )}
                  {cap.longDescription && (
                    <div>
                      <div className="label-mono text-[9px] text-[var(--text-secondary)] mb-1">Long Description</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{cap.longDescription}</div>
                    </div>
                  )}
                  <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
                    <span>Slug: {cap.slug}</span>
                    <span>Tags: {cap.tags || '—'}</span>
                    <span>Updated: {timeAgo(cap.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Create Capability Form
   ═══════════════════════════════════════════════════════════════════════════ */
function CreateCapabilityForm({ adminFetch, users, onCreated }: { adminFetch: any; users: UserOption[]; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', slug: '', description: '', longDescription: '', icon: '⚡', category: 'operations',
    prompt: '', pricingModel: 'free', price: '', editableFields: '', tags: '', integrationType: '',
    featured: false, publishAsUserId: '', skillFormat: false, skillBody: '', skillSource: 'agentskills.io',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'name' && !form.slug) {
      setForm(prev => ({ ...prev, [key]: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.description || !form.prompt) {
      setError('Name, slug, description, and prompt are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminFetch('/api/admin/capabilities', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : null,
          editableFields: form.editableFields || null,
          tags: form.tags || null,
          integrationType: form.integrationType || null,
          publishAsUserId: form.publishAsUserId || undefined,
        }),
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create capability');
    } finally { setSaving(false); }
  };

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-2.5 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-brand-500/50';

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-white">Create New Capability</h3>
      {error && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg p-2">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Name *</label>
          <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="My Capability" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Slug *</label>
          <input value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} className={inputClass} placeholder="my-capability" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Description *</label>
        <input value={form.description} onChange={(e) => handleChange('description', e.target.value)} className={inputClass} placeholder="Short description…" />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Prompt *</label>
        <textarea value={form.prompt} onChange={(e) => handleChange('prompt', e.target.value)}
          className={`${inputClass} h-24 resize-none`} placeholder="Capability system prompt…" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Icon</label>
          <input value={form.icon} onChange={(e) => handleChange('icon', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Category</label>
          <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className={inputClass}>
            {CAP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Pricing</label>
          <select value={form.pricingModel} onChange={(e) => handleChange('pricingModel', e.target.value)} className={inputClass}>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
            <option value="freemium">Freemium</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Tags (comma-separated)</label>
          <input value={form.tags} onChange={(e) => handleChange('tags', e.target.value)} className={inputClass} placeholder="ai, research, tools" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Publish As</label>
          <select value={form.publishAsUserId} onChange={(e) => handleChange('publishAsUserId', e.target.value)} className={inputClass}>
            <option value="">DiviDen (Platform)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </div>
      </div>

      {/* Agent Skill toggle */}
      <div className="flex items-center gap-3 bg-purple-400/5 border border-purple-400/20 rounded-lg p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.skillFormat} onChange={(e) => handleChange('skillFormat', e.target.checked)}
            className="rounded border-white/20 bg-white/[0.04]" />
          <span className="text-xs text-white">🧩 Agent Skill Format</span>
        </label>
        {form.skillFormat && (
          <div className="flex-1 ml-4">
            <input value={form.skillSource} onChange={(e) => handleChange('skillSource', e.target.value)} className={`${inputClass} text-xs`} placeholder="agentskills.io" />
          </div>
        )}
      </div>
      {form.skillFormat && (
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Skill Body</label>
          <textarea value={form.skillBody} onChange={(e) => handleChange('skillBody', e.target.value)}
            className={`${inputClass} h-24 resize-none font-mono text-xs`} placeholder="Skill definition body…" />
        </div>
      )}

      <div>
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Long Description (optional)</label>
        <textarea value={form.longDescription} onChange={(e) => handleChange('longDescription', e.target.value)}
          className={`${inputClass} h-16 resize-none`} placeholder="Detailed description…" />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => handleChange('featured', e.target.checked)}
            className="rounded border-white/20 bg-white/[0.04]" />
          <span className="text-xs text-white">⭐ Featured</span>
        </label>
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">
        {saving ? 'Creating…' : 'Create Capability'}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Create Agent Form
   ═══════════════════════════════════════════════════════════════════════════ */
function CreateAgentForm({ adminFetch, users, onCreated }: { adminFetch: any; users: UserOption[]; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', slug: '', description: '', category: 'general', endpointUrl: '', pricingModel: 'free',
    pricePerTask: '', version: '1.0.0', supportsA2A: false, supportsMCP: false, publishAsUserId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'name' && !form.slug) {
      setForm(prev => ({ ...prev, [key]: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.description || !form.endpointUrl) {
      setError('Name, slug, description, and endpoint URL are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminFetch('/api/admin/marketplace', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          pricePerTask: form.pricePerTask ? parseFloat(form.pricePerTask) : null,
          publishAsUserId: form.publishAsUserId || undefined,
        }),
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally { setSaving(false); }
  };

  const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-2.5 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-brand-500/50';

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-white">Create New Agent</h3>
      {error && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg p-2">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Name *</label>
          <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="My Agent" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Slug *</label>
          <input value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} className={inputClass} placeholder="my-agent" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Description *</label>
        <input value={form.description} onChange={(e) => handleChange('description', e.target.value)} className={inputClass} placeholder="What this agent does…" />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Endpoint URL *</label>
        <input value={form.endpointUrl} onChange={(e) => handleChange('endpointUrl', e.target.value)} className={inputClass} placeholder="https://agent.example.com/a2a" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Category</label>
          <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className={inputClass}>
            {CAP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Pricing</label>
          <select value={form.pricingModel} onChange={(e) => handleChange('pricingModel', e.target.value)} className={inputClass}>
            <option value="free">Free</option>
            <option value="per_task">Per Task</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Version</label>
          <input value={form.version} onChange={(e) => handleChange('version', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Price Per Task</label>
          <input value={form.pricePerTask} onChange={(e) => handleChange('pricePerTask', e.target.value)} className={inputClass} placeholder="0.00" type="number" step="0.01" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">Publish As</label>
          <select value={form.publishAsUserId} onChange={(e) => handleChange('publishAsUserId', e.target.value)} className={inputClass}>
            <option value="">DiviDen (Platform)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.supportsA2A} onChange={(e) => handleChange('supportsA2A', e.target.checked)}
            className="rounded border-white/20 bg-white/[0.04]" />
          <span className="text-xs text-white">🔄 Supports A2A</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.supportsMCP} onChange={(e) => handleChange('supportsMCP', e.target.checked)}
            className="rounded border-white/20 bg-white/[0.04]" />
          <span className="text-xs text-white">🔌 Supports MCP</span>
        </label>
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">
        {saving ? 'Creating…' : 'Create Agent'}
      </button>
    </div>
  );
}