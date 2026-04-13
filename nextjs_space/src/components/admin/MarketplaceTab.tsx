'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, StatusBadge, EmptyState, timeAgo, useAdminFetch } from './shared';

interface MarketplaceAgentRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  featured: boolean;
  pricingModel: string;
  pricePerTask: number | null;
  totalExecutions: number;
  avgRating: number;
  totalRatings: number;
  successRate: number | null;
  totalGrossRevenue: number;
  totalPlatformFees: number;
  developerName: string;
  developerUrl: string | null;
  endpointUrl: string;
  supportsA2A: boolean;
  supportsMCP: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  _count: { subscriptions: number; executions: number };
}

interface MarketplaceData {
  agents: MarketplaceAgentRow[];
  totals: {
    total: number;
    active: number;
    pending: number;
    featured: number;
    totalExecutions: number;
    totalRevenue: number;
    totalPlatformFees: number;
  };
}

export default function MarketplaceTab({ token }: { token: string }) {
  const adminFetch = useAdminFetch(token);
  const [data, setData] = useState<MarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'featured' | 'disabled' | 'suspended'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const result = await adminFetch('/api/admin/marketplace');
      setData(result);
    } catch (err) {
      console.error('Failed to fetch marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const updateAgent = async (id: string, updates: Record<string, any>) => {
    setActionLoading(id);
    try {
      await adminFetch('/api/admin/marketplace', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates }),
      });
      await fetchAgents();
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-center text-[var(--text-secondary)] py-8">Loading marketplace…</div>;
  if (!data) return <EmptyState icon="🤖" title="No Data" description="Could not load marketplace data." />;

  const filtered = data.agents.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'featured') return a.featured;
    return a.status === filter;
  });

  const CATEGORY_ICONS: Record<string, string> = {
    research: '🔬', coding: '💻', writing: '✍️', analysis: '📊',
    operations: '⚙️', creative: '🎨', general: '🤖',
  };

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <MetricCard label="Total Agents" value={data.totals.total} icon="🤖" />
        <MetricCard label="Active" value={data.totals.active} icon="✅" accent />
        <MetricCard label="Pending Review" value={data.totals.pending} icon="⏳" accent={data.totals.pending > 0} />
        <MetricCard label="Featured" value={data.totals.featured} icon="⭐" />
        <MetricCard label="Total Executions" value={data.totals.totalExecutions.toLocaleString()} icon="▶️" />
        <MetricCard label="Gross Revenue" value={`$${data.totals.totalRevenue.toFixed(2)}`} icon="💰" />
        <MetricCard label="Platform Fees" value={`$${data.totals.totalPlatformFees.toFixed(2)}`} icon="🏦" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'pending', 'active', 'featured', 'disabled', 'suspended'] as const).map((f) => {
          const count = f === 'all' ? data.agents.length
            : f === 'featured' ? data.totals.featured
            : data.agents.filter((a) => a.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
        <button onClick={fetchAgents} className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
      </div>

      {/* Agent list */}
      {filtered.length === 0 ? (
        <EmptyState icon="🤖" title="No agents match" description="No agents match the current filter." />
      ) : (
        <div className="space-y-2">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors"
            >
              {/* Main row */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}
              >
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
                      {agent.totalRatings > 0 && <span>⭐ {agent.avgRating.toFixed(1)} ({agent.totalRatings})</span>}
                      <span>📊 {agent.successRate != null ? `${(agent.successRate * 100).toFixed(0)}%` : '—'} success</span>
                      <span>{agent.supportsA2A ? '🔄 A2A' : ''}{agent.supportsMCP ? ' 🔌 MCP' : ''}</span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {agent.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateAgent(agent.id, { status: 'active' })}
                          disabled={actionLoading === agent.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => updateAgent(agent.id, { status: 'disabled' })}
                          disabled={actionLoading === agent.id}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                        >
                          ✖ Reject
                        </button>
                      </>
                    )}
                    {agent.status === 'active' && (
                      <button
                        onClick={() => updateAgent(agent.id, { status: 'suspended' })}
                        disabled={actionLoading === agent.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {(agent.status === 'suspended' || agent.status === 'disabled') && (
                      <button
                        onClick={() => updateAgent(agent.id, { status: 'active' })}
                        disabled={actionLoading === agent.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      onClick={() => updateAgent(agent.id, { featured: !agent.featured })}
                      disabled={actionLoading === agent.id}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                        agent.featured ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
                      }`}
                    >
                      {agent.featured ? '⭐ Unfeat.' : '☆ Feature'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
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
