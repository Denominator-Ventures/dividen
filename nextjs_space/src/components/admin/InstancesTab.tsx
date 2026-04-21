'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, StatusBadge, EmptyState, timeAgo, useAdminFetch } from './shared';

interface Instance {
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

interface InstancesData {
  instances: Instance[];
  totals: {
    total: number;
    active: number;
    trusted: number;
    platformLinked: number;
    totalUsers: number;
    totalAgents: number;
  };
}

export default function InstancesTab() {
  const adminFetch = useAdminFetch();
  const [data, setData] = useState<InstancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'trusted' | 'linked'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetKeyInput, setResetKeyInput] = useState<{ id: string; key: string } | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      const result = await adminFetch('/api/admin/instances');
      setData(result);
    } catch (err) {
      console.error('Failed to fetch instances:', err);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const toggleField = async (id: string, field: string, value: boolean) => {
    setActionLoading(id);
    try {
      await adminFetch('/api/admin/instances', {
        method: 'PATCH',
        body: JSON.stringify({ id, [field]: value }),
      });
      await fetchInstances();
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const resetApiKey = async (id: string, newKey: string) => {
    if (!newKey.trim()) return;
    setActionLoading(id);
    try {
      await adminFetch('/api/admin/instances', {
        method: 'PATCH',
        body: JSON.stringify({ id, apiKey: newKey.trim() }),
      });
      setResetKeyInput(null);
      await fetchInstances();
    } catch (err) {
      console.error('Reset API key failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteInstance = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/admin/instances?id=${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      await fetchInstances();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-center text-[var(--text-secondary)] py-8">Loading instances…</div>;
  if (!data) return <EmptyState icon="🏢" title="No Data" description="Could not load instance registry." />;

  const filtered = data.instances.filter((inst) => {
    if (filter === 'active') return inst.isActive;
    if (filter === 'trusted') return inst.isTrusted;
    if (filter === 'linked') return inst.platformLinked;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <MetricCard label="Total Instances" value={data.totals.total} icon="🏢" />
        <MetricCard label="Active" value={data.totals.active} icon="✅" accent />
        <MetricCard label="Trusted" value={data.totals.trusted} icon="🛡️" />
        <MetricCard label="Platform Linked" value={data.totals.platformLinked} icon="🔗" />
        <MetricCard label="Network Users" value={data.totals.totalUsers} icon="👥" />
        <MetricCard label="Network Agents" value={data.totals.totalAgents} icon="🤖" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'trusted', 'linked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
            }`}
          >
            {f === 'all' ? `All (${data.instances.length})` : f === 'linked' ? `Linked (${data.totals.platformLinked})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${data.totals[f as 'active' | 'trusted']})`}
          </button>
        ))}
        <button
          onClick={fetchInstances}
          className="ml-auto px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]"
        >
          ↻
        </button>
      </div>

      {/* Instance list */}
      {filtered.length === 0 ? (
        <EmptyState icon="🏢" title="No instances match" description="No instances match the current filter." />
      ) : (
        <div className="space-y-2">
          {filtered.map((inst) => (
            <div
              key={inst.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{inst.name}</span>
                    <StatusBadge status={inst.isActive ? 'active' : 'inactive'} />
                    {inst.isTrusted && <StatusBadge status="trusted" />}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate mb-2">{inst.baseUrl}</div>
                  
                  {/* Flags row */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {inst.platformLinked && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">🔗 Platform Linked</span>
                    )}
                    {inst.marketplaceEnabled && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">🛒 Marketplace</span>
                    )}
                    {inst.discoveryEnabled && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">🔍 Discovery</span>
                    )}
                    {inst.updatesEnabled && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">📦 Updates</span>
                    )}
                    {inst.version && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)] font-mono">v{inst.version}</span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-4 text-[10px] text-[var(--text-secondary)]">
                    <span>👥 {inst.userCount ?? '—'} users</span>
                    <span>🤖 {inst.agentCount ?? '—'} agents</span>
                    <span>Last seen: {inst.lastSeenAt ? timeAgo(inst.lastSeenAt) : 'never'}</span>
                    <span>Synced: {inst.lastSyncAt ? timeAgo(inst.lastSyncAt) : 'never'}</span>
                    <span>Registered: {timeAgo(inst.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleField(inst.id, 'isTrusted', !inst.isTrusted)}
                    disabled={actionLoading === inst.id}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                      inst.isTrusted
                        ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                        : 'bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]'
                    }`}
                  >
                    {inst.isTrusted ? '🛡️ Trusted' : 'Trust'}
                  </button>
                  <button
                    onClick={() => toggleField(inst.id, 'isActive', !inst.isActive)}
                    disabled={actionLoading === inst.id}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                      inst.isActive
                        ? 'bg-emerald-400/10 text-emerald-400 hover:bg-red-400/10 hover:text-red-400'
                        : 'bg-red-400/10 text-red-400 hover:bg-emerald-400/10 hover:text-emerald-400'
                    }`}
                  >
                    {inst.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {/* Reset API Key */}
                  {resetKeyInput?.id === inst.id ? (
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={resetKeyInput.key}
                        onChange={e => setResetKeyInput({ id: inst.id, key: e.target.value })}
                        placeholder="New API key..."
                        className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/80 w-36"
                      />
                      <button
                        onClick={() => resetApiKey(inst.id, resetKeyInput.key)}
                        disabled={actionLoading === inst.id}
                        className="px-2 py-1 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
                      >Set</button>
                      <button
                        onClick={() => setResetKeyInput(null)}
                        className="px-2 py-1 text-[10px] font-medium bg-white/[0.04] text-white/40 rounded"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResetKeyInput({ id: inst.id, key: '' })}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.04] text-amber-400/60 hover:bg-amber-400/10 hover:text-amber-400 transition-colors"
                      title="Reset API key for re-registration"
                    >🔑</button>
                  )}
                  {deleteConfirm === inst.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteInstance(inst.id)}
                        disabled={actionLoading === inst.id}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                      >
                        {actionLoading === inst.id ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(inst.id)}
                      disabled={actionLoading === inst.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.04] text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                      title="Delete instance"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
