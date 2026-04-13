'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, StatusBadge, EmptyState, timeAgo, useAdminFetch } from './shared';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface AgentRow {
  id: string; name: string; slug: string; description: string; category: string;
  status: string; featured: boolean; pricingModel: string; pricePerTask: number | null;
  totalExecutions: number; avgRating: number; totalRatings: number; successRate: number | null;
  totalGrossRevenue: number; totalPlatformFees: number; developerName: string; developerUrl: string | null;
  endpointUrl: string; supportsA2A: boolean; supportsMCP: boolean; version: string;
  createdAt: string; updatedAt: string;
  _count: { subscriptions: number; executions: number };
}

interface CapRow {
  id: string; name: string; slug: string; description: string; icon: string; category: string;
  status: string; approvalStatus: string; rejectionReason: string | null;
  featured: boolean; pricingModel: string; price: number | null;
  publisherName: string; publisherType: string; publisherUrl: string | null;
  skillFormat: boolean; skillSource: string | null; isSystemSeed: boolean;
  totalPurchases: number; avgRating: number; totalRatings: number;
  installs: number; createdByUser: { id: string; name: string; email: string } | null;
  createdAt: string; updatedAt: string;
}

interface UserOption { id: string; name: string; email: string }

/* ── Component ────────────────────────────────────────────────────────────── */

export default function MarketplaceTab({ token }: { token: string }) {
  const adminFetch = useAdminFetch(token);

  // Sub-tabs
  const [subTab, setSubTab] = useState<'agents' | 'capabilities' | 'create-cap' | 'create-agent'>('agents');

  // Agents state
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentTotals, setAgentTotals] = useState<any>({});
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [agentLoading, setAgentLoading] = useState(true);

  // Capabilities state
  const [caps, setCaps] = useState<CapRow[]>([]);
  const [capTotals, setCapTotals] = useState<any>({});
  const [capFilter, setCapFilter] = useState<string>('all');
  const [capLoading, setCapLoading] = useState(true);

  // Users for assignment
  const [users, setUsers] = useState<UserOption[]>([]);

  // Shared
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create forms
  const [capForm, setCapForm] = useState({ name: '', slug: '', description: '', longDescription: '', icon: '⚡', category: 'operations', prompt: '', pricingModel: 'free', price: '', editableFields: '', tags: '', integrationType: '', publisherName: 'DiviDen', publisherType: 'platform', publishAsUserId: '', skillFormat: false, commands: '' });
  const [agentForm, setAgentForm] = useState({ name: '', slug: '', description: '', endpointUrl: '', category: 'general', pricingModel: 'free', pricePerTask: '', developerName: 'DiviDen', developerUrl: '', publishAsUserId: '', tags: '', supportsA2A: false, supportsMCP: false });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/marketplace');
      setAgents(r.agents); setAgentTotals(r.totals);
    } catch { } finally { setAgentLoading(false); }
  }, [adminFetch]);

  const fetchCaps = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/capabilities');
      setCaps(r.capabilities); setCapTotals(r.totals);
    } catch { } finally { setCapLoading(false); }
  }, [adminFetch]);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/stats');
      if (r.recentUsers) setUsers(r.recentUsers.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
    } catch { }
  }, [adminFetch]);

  useEffect(() => { fetchAgents(); fetchCaps(); fetchUsers(); }, [fetchAgents, fetchCaps, fetchUsers]);

  const updateAgent = async (id: string, updates: Record<string, any>) => {
    setActionLoading(id);
    try { await adminFetch('/api/admin/marketplace', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) }); await fetchAgents(); }
    catch { } finally { setActionLoading(null); }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Permanently delete this agent? This cannot be undone.')) return;
    setActionLoading(id);
    try { await adminFetch(`/api/admin/marketplace?id=${id}`, { method: 'DELETE' }); await fetchAgents(); }
    catch { } finally { setActionLoading(null); }
  };

  const updateCap = async (id: string, updates: Record<string, any>) => {
    setActionLoading(id);
    try { await adminFetch('/api/admin/capabilities', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) }); await fetchCaps(); }
    catch { } finally { setActionLoading(null); }
  };

  const deleteCap = async (id: string) => {
    if (!confirm('Permanently delete this capability and all user installs? This cannot be undone.')) return;
    setActionLoading(id);
    try { await adminFetch(`/api/admin/capabilities?id=${id}`, { method: 'DELETE' }); await fetchCaps(); }
    catch { } finally { setActionLoading(null); }
  };

  const createCapability = async () => {
    setCreating(true); setCreateError('');
    try {
      const payload: any = { ...capForm, price: capForm.price ? parseFloat(capForm.price) : null };
      if (!payload.publishAsUserId) delete payload.publishAsUserId;
      const r = await adminFetch('/api/admin/capabilities', { method: 'POST', body: JSON.stringify(payload) });
      if (r.error) { setCreateError(r.error); return; }
      setCapForm({ name: '', slug: '', description: '', longDescription: '', icon: '⚡', category: 'operations', prompt: '', pricingModel: 'free', price: '', editableFields: '', tags: '', integrationType: '', publisherName: 'DiviDen', publisherType: 'platform', publishAsUserId: '', skillFormat: false, commands: '' });
      await fetchCaps(); setSubTab('capabilities');
    } catch { setCreateError('Failed to create'); } finally { setCreating(false); }
  };

  const createAgent = async () => {
    setCreating(true); setCreateError('');
    try {
      const payload: any = { ...agentForm, pricePerTask: agentForm.pricePerTask ? parseFloat(agentForm.pricePerTask) : null };
      if (!payload.publishAsUserId) delete payload.publishAsUserId;
      const r = await adminFetch('/api/admin/marketplace', { method: 'POST', body: JSON.stringify(payload) });
      if (r.error) { setCreateError(r.error); return; }
      setAgentForm({ name: '', slug: '', description: '', endpointUrl: '', category: 'general', pricingModel: 'free', pricePerTask: '', developerName: 'DiviDen', developerUrl: '', publishAsUserId: '', tags: '', supportsA2A: false, supportsMCP: false });
      await fetchAgents(); setSubTab('agents');
    } catch { setCreateError('Failed to create'); } finally { setCreating(false); }
  };

  const CATS: Record<string, string> = {
    research: '🔬', coding: '💻', writing: '✍️', analysis: '📊',
    operations: '⚙️', creative: '🎨', general: '🤖', communications: '💬',
    finance: '💰', hr: '👥', sales: '📈', engineering: '🔧', legal: '⚖️',
  };

  // ── Sub-tab nav ────────────────────────────
  const SUB_TABS = [
    { id: 'agents' as const, label: '🤖 Agents', count: agentTotals.total || 0 },
    { id: 'capabilities' as const, label: '⚡ Capabilities', count: capTotals.total || 0 },
    { id: 'create-cap' as const, label: '+ Capability' },
    { id: 'create-agent' as const, label: '+ Agent' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex items-center gap-2 flex-wrap border-b border-white/[0.06] pb-3">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === t.id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}>
            {t.label} {'count' in t ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* ═══ AGENTS TAB ═══════════════════════════════════════════════ */}
      {subTab === 'agents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="Total" value={agentTotals.total || 0} icon="🤖" />
            <MetricCard label="Active" value={agentTotals.active || 0} icon="✅" accent />
            <MetricCard label="Pending" value={agentTotals.pending || 0} icon="⏳" accent={(agentTotals.pending || 0) > 0} />
            <MetricCard label="Executions" value={(agentTotals.totalExecutions || 0).toLocaleString()} icon="▶️" />
            <MetricCard label="Revenue" value={`$${(agentTotals.totalRevenue || 0).toFixed(2)}`} icon="💰" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'active', 'featured', 'disabled', 'suspended'].map(f => (
              <button key={f} onClick={() => setAgentFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  agentFilter === f ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? agents.length : f === 'featured' ? agents.filter(a => a.featured).length : agents.filter(a => a.status === f).length})
              </button>
            ))}
            <button onClick={fetchAgents} className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
          </div>

          {agentLoading ? <p className="text-center text-[var(--text-secondary)] py-4">Loading...</p> :
            agents.filter(a => agentFilter === 'all' ? true : agentFilter === 'featured' ? a.featured : a.status === agentFilter).length === 0
              ? <EmptyState icon="🤖" title="No agents" description="No agents match." />
              : <div className="space-y-2">
                  {agents.filter(a => agentFilter === 'all' ? true : agentFilter === 'featured' ? a.featured : a.status === agentFilter).map(agent => (
                    <div key={agent.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors">
                      <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{CATS[agent.category] || '🤖'}</span>
                              <span className="text-sm font-medium text-white">{agent.name}</span>
                              <StatusBadge status={agent.status} />
                              {agent.featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">⭐ Featured</span>}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mb-2">{agent.description}</div>
                            <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-secondary)]">
                              <span className="font-medium text-brand-400">by {agent.developerName}</span>
                              <span>v{agent.version}</span>
                              <span>{agent.pricingModel === 'free' ? '🆓 Free' : `💰 $${agent.pricePerTask?.toFixed(2) || '?'}/task`}</span>
                              <span>▶️ {agent.totalExecutions.toLocaleString()} runs</span>
                              {agent.totalRatings > 0 && <span>⭐ {agent.avgRating.toFixed(1)} ({agent.totalRatings})</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            {agent.status === 'pending' && <><button onClick={() => updateAgent(agent.id, { status: 'active' })} disabled={actionLoading === agent.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">✅ Approve</button><button onClick={() => updateAgent(agent.id, { status: 'disabled' })} disabled={actionLoading === agent.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20">✖ Reject</button></>}
                            {agent.status === 'active' && <button onClick={() => updateAgent(agent.id, { status: 'suspended' })} disabled={actionLoading === agent.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20">Suspend</button>}
                            {(agent.status === 'suspended' || agent.status === 'disabled') && <button onClick={() => updateAgent(agent.id, { status: 'active' })} disabled={actionLoading === agent.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">Reactivate</button>}
                            <button onClick={() => updateAgent(agent.id, { featured: !agent.featured })} disabled={actionLoading === agent.id} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${agent.featured ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'}`}>{agent.featured ? '⭐ Unfeat.' : '☆ Feature'}</button>
                            <button onClick={() => deleteAgent(agent.id)} disabled={actionLoading === agent.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20">🗑</button>
                          </div>
                        </div>
                      </div>
                      {expanded === agent.id && (
                        <div className="border-t border-white/[0.06] p-4 bg-white/[0.01] space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                            <div><span className="text-[var(--text-muted)] text-[9px] block">Endpoint</span><span className="font-mono text-white break-all">{agent.endpointUrl}</span></div>
                            <div><span className="text-[var(--text-muted)] text-[9px] block">Developer</span><span className="text-white">{agent.developerName}</span>{agent.developerUrl && <span className="text-brand-400 font-mono text-[10px] block truncate">{agent.developerUrl}</span>}</div>
                            <div><span className="text-[var(--text-muted)] text-[9px] block">Revenue</span><span className="text-white">Gross: ${agent.totalGrossRevenue.toFixed(2)}</span></div>
                            <div><span className="text-[var(--text-muted)] text-[9px] block">Subs</span><span className="text-white">{agent._count.subscriptions} subs · {agent._count.executions} execs</span></div>
                          </div>
                          <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
                            <span>Slug: {agent.slug}</span><span>Created: {timeAgo(agent.createdAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
          }
        </div>
      )}

      {/* ═══ CAPABILITIES TAB ═══════════════════════════════════════════ */}
      {subTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <MetricCard label="Total" value={capTotals.total || 0} icon="⚡" />
            <MetricCard label="Active" value={capTotals.active || 0} icon="✅" accent />
            <MetricCard label="Pending Review" value={capTotals.pendingReview || 0} icon="⏳" accent={(capTotals.pendingReview || 0) > 0} />
            <MetricCard label="Rejected" value={capTotals.rejected || 0} icon="❌" />
            <MetricCard label="Agent Skills" value={capTotals.skills || 0} icon="🧩" />
            <MetricCard label="Installs" value={capTotals.totalInstalls || 0} icon="📥" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending_review', 'approved', 'rejected', 'disabled', 'skills'].map(f => {
              const count = f === 'all' ? caps.length
                : f === 'skills' ? caps.filter(c => c.skillFormat).length
                : f === 'disabled' ? caps.filter(c => c.status === 'disabled').length
                : caps.filter(c => c.approvalStatus === f).length;
              return (
                <button key={f} onClick={() => setCapFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    capFilter === f ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
                  }`}>
                  {f === 'pending_review' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </button>
              );
            })}
            <button onClick={fetchCaps} className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
          </div>

          {capLoading ? <p className="text-center text-[var(--text-secondary)] py-4">Loading...</p> : (() => {
            const filtered = caps.filter(c => {
              if (capFilter === 'all') return true;
              if (capFilter === 'skills') return c.skillFormat;
              if (capFilter === 'disabled') return c.status === 'disabled';
              return c.approvalStatus === capFilter;
            });
            if (filtered.length === 0) return <EmptyState icon="⚡" title="No capabilities" description="No capabilities match." />;
            return (
              <div className="space-y-2">
                {filtered.map(cap => (
                  <div key={cap.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors">
                    <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === cap.id ? null : cap.id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-lg">{cap.icon}</span>
                            <span className="text-sm font-medium text-white">{cap.name}</span>
                            <StatusBadge status={cap.status} />
                            {cap.approvalStatus === 'pending_review' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 animate-pulse">⏳ Needs Review</span>}
                            {cap.approvalStatus === 'rejected' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">❌ Rejected</span>}
                            {cap.featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">⭐</span>}
                            {cap.skillFormat && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">🧩 Agent Skill</span>}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mb-2">{cap.description}</div>
                          <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-secondary)]">
                            <span className="font-medium text-brand-400">by {cap.publisherName}</span>
                            <span className={`px-1.5 py-0.5 rounded ${cap.publisherType === 'platform' ? 'bg-brand-500/10 text-brand-400' : cap.publisherType === 'user' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{cap.publisherType}</span>
                            <span>{cap.pricingModel === 'free' ? '🆓 Free' : `💰 $${cap.price?.toFixed(2) || '?'}`}</span>
                            <span>📥 {cap.installs} installs</span>
                            {cap.totalRatings > 0 && <span>⭐ {cap.avgRating.toFixed(1)} ({cap.totalRatings})</span>}
                            {cap.skillSource && <span className="text-purple-400">{cap.skillSource}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
                          {cap.approvalStatus === 'pending_review' && (
                            <>
                              <button onClick={() => updateCap(cap.id, { approvalStatus: 'approved' })} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">✅ Approve</button>
                              <button onClick={() => { const reason = prompt('Rejection reason:'); if (reason) updateCap(cap.id, { approvalStatus: 'rejected', rejectionReason: reason }); }} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20">✖ Reject</button>
                            </>
                          )}
                          {cap.approvalStatus === 'rejected' && <button onClick={() => updateCap(cap.id, { approvalStatus: 'approved' })} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">✅ Approve</button>}
                          {cap.status === 'active' ? (
                            <button onClick={() => updateCap(cap.id, { status: 'disabled' })} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20">Unpublish</button>
                          ) : (
                            <button onClick={() => updateCap(cap.id, { status: 'active' })} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20">Publish</button>
                          )}
                          <button onClick={() => updateCap(cap.id, { featured: !cap.featured })} disabled={actionLoading === cap.id} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${cap.featured ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'}`}>{cap.featured ? '⭐ Unfeat.' : '☆ Feature'}</button>
                          <button onClick={() => deleteCap(cap.id)} disabled={actionLoading === cap.id} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20">🗑</button>
                        </div>
                      </div>
                    </div>
                    {expanded === cap.id && (
                      <div className="border-t border-white/[0.06] p-4 bg-white/[0.01] space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                          <div><span className="text-[var(--text-muted)] text-[9px] block">Slug</span><span className="font-mono text-white">{cap.slug}</span></div>
                          <div><span className="text-[var(--text-muted)] text-[9px] block">Category</span><span className="text-white">{cap.category}</span></div>
                          <div><span className="text-[var(--text-muted)] text-[9px] block">Publisher</span><span className="text-white">{cap.publisherName}</span>{cap.publisherUrl && <a href={cap.publisherUrl} target="_blank" rel="noopener" className="text-brand-400 text-[10px] block">{cap.publisherUrl}</a>}</div>
                          <div><span className="text-[var(--text-muted)] text-[9px] block">Created By</span><span className="text-white">{cap.createdByUser ? `${cap.createdByUser.name} (${cap.createdByUser.email})` : cap.isSystemSeed ? 'System Seed' : '—'}</span></div>
                        </div>
                        {cap.rejectionReason && <div className="text-[11px] text-red-400 bg-red-400/10 rounded p-2">Rejection: {cap.rejectionReason}</div>}
                        <div className="flex gap-3 text-[10px] text-[var(--text-secondary)]">
                          <span>Created: {timeAgo(cap.createdAt)}</span><span>Updated: {timeAgo(cap.updatedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ CREATE CAPABILITY ═══════════════════════════════════════ */}
      {subTab === 'create-cap' && (
        <div className="max-w-2xl space-y-4">
          <h3 className="text-lg font-bold text-white">Create & Publish Capability</h3>
          {createError && <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3">{createError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" value={capForm.name} onChange={v => setCapForm(p => ({ ...p, name: v, slug: p.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} />
            <Input label="Slug *" value={capForm.slug} onChange={v => setCapForm(p => ({ ...p, slug: v }))} />
          </div>
          <Input label="Description *" value={capForm.description} onChange={v => setCapForm(p => ({ ...p, description: v }))} textarea />
          <Input label="Long Description (Markdown)" value={capForm.longDescription} onChange={v => setCapForm(p => ({ ...p, longDescription: v }))} textarea />
          <Input label="System Prompt *" value={capForm.prompt} onChange={v => setCapForm(p => ({ ...p, prompt: v }))} textarea />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Icon" value={capForm.icon} onChange={v => setCapForm(p => ({ ...p, icon: v }))} />
            <Select label="Category" value={capForm.category} options={['operations','communications','research','finance','hr','sales','engineering','creative','legal','custom']} onChange={v => setCapForm(p => ({ ...p, category: v }))} />
            <Select label="Pricing" value={capForm.pricingModel} options={['free','one_time','subscription']} onChange={v => setCapForm(p => ({ ...p, pricingModel: v }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Publisher Name" value={capForm.publisherName} onChange={v => setCapForm(p => ({ ...p, publisherName: v }))} />
            <Select label="Publisher Type" value={capForm.publisherType} options={['platform','user','community']} onChange={v => setCapForm(p => ({ ...p, publisherType: v }))} />
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Publish As User</label>
              <select value={capForm.publishAsUserId} onChange={e => setCapForm(p => ({ ...p, publishAsUserId: e.target.value }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white">
                <option value="">— DiviDen (platform) —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tags (JSON array)" value={capForm.tags} onChange={v => setCapForm(p => ({ ...p, tags: v }))} placeholder='["tag1","tag2"]' />
            <Input label="Editable Fields (JSON array)" value={capForm.editableFields} onChange={v => setCapForm(p => ({ ...p, editableFields: v }))} placeholder='["field1"]' />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={capForm.skillFormat} onChange={e => setCapForm(p => ({ ...p, skillFormat: e.target.checked }))} className="rounded" />
            Agent Skills format (agentskills.io)
          </label>
          <button onClick={createCapability} disabled={creating || !capForm.name || !capForm.slug || !capForm.prompt}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
            {creating ? 'Publishing...' : 'Publish Capability'}
          </button>
        </div>
      )}

      {/* ═══ CREATE AGENT ═══════════════════════════════════════ */}
      {subTab === 'create-agent' && (
        <div className="max-w-2xl space-y-4">
          <h3 className="text-lg font-bold text-white">Create & Publish Agent</h3>
          {createError && <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3">{createError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" value={agentForm.name} onChange={v => setAgentForm(p => ({ ...p, name: v, slug: p.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} />
            <Input label="Slug *" value={agentForm.slug} onChange={v => setAgentForm(p => ({ ...p, slug: v }))} />
          </div>
          <Input label="Description *" value={agentForm.description} onChange={v => setAgentForm(p => ({ ...p, description: v }))} textarea />
          <Input label="Endpoint URL *" value={agentForm.endpointUrl} onChange={v => setAgentForm(p => ({ ...p, endpointUrl: v }))} placeholder="https://" />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Category" value={agentForm.category} options={['general','research','coding','writing','analysis','operations','creative']} onChange={v => setAgentForm(p => ({ ...p, category: v }))} />
            <Select label="Pricing" value={agentForm.pricingModel} options={['free','per_task','subscription']} onChange={v => setAgentForm(p => ({ ...p, pricingModel: v }))} />
            {agentForm.pricingModel === 'per_task' && <Input label="Price/Task ($)" value={agentForm.pricePerTask} onChange={v => setAgentForm(p => ({ ...p, pricePerTask: v }))} />}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Developer Name" value={agentForm.developerName} onChange={v => setAgentForm(p => ({ ...p, developerName: v }))} />
            <Input label="Developer URL" value={agentForm.developerUrl} onChange={v => setAgentForm(p => ({ ...p, developerUrl: v }))} />
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Publish As User</label>
              <select value={agentForm.publishAsUserId} onChange={e => setAgentForm(p => ({ ...p, publishAsUserId: e.target.value }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white">
                <option value="">— DiviDen (admin) —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={agentForm.supportsA2A} onChange={e => setAgentForm(p => ({ ...p, supportsA2A: e.target.checked }))} className="rounded" /> A2A
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={agentForm.supportsMCP} onChange={e => setAgentForm(p => ({ ...p, supportsMCP: e.target.checked }))} className="rounded" /> MCP
            </label>
          </div>
          <button onClick={createAgent} disabled={creating || !agentForm.name || !agentForm.slug || !agentForm.endpointUrl}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
            {creating ? 'Publishing...' : 'Publish Agent'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tiny form helpers ────────────────────────────────────────────────────── */

function Input({ label, value, onChange, textarea, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string }) {
  const cls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-brand-500/50 focus:outline-none";
  return (
    <div>
      <label className="text-[11px] text-[var(--text-muted)] block mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} placeholder={placeholder} className={cls} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[var(--text-muted)] block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
