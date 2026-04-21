'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, MiniBarChart, EmptyState, useAdminFetch } from './shared';

interface UsageData {
  featureAdoption: Record<string, { users: number; total: number; label: string }>;
  topUsers: {
    id: string;
    email: string;
    name: string | null;
    totalActions: number;
    chatMessages: number;
    kanbanCards: number;
    contacts: number;
    documents: number;
    connections: number;
  }[];
  dailyChat: { date: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  marketplaceExecs: { date: string; count: number }[];
  summary: {
    totalUsers: number;
    activeUsers7d: number;
    totalChatMessages: number;
    avgMessagesPerUser: number;
    totalMarketplaceExecs: number;
  };
}

export default function UsageTab() {
  const adminFetch = useAdminFetch();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d'>('30d');

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetch(`/api/admin/usage?range=${range}`);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, range]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  if (loading && !data) return <div className="text-center text-[var(--text-secondary)] py-8">Loading usage analytics…</div>;
  if (!data) return <EmptyState icon="📊" title="No Data" description="Could not load usage data." />;

  const adoptionEntries = Object.entries(data.featureAdoption).sort((a, b) => b[1].users - a[1].users);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total Users" value={data.summary.totalUsers} icon="👥" />
        <MetricCard label="Active (7d)" value={data.summary.activeUsers7d} icon="🟢" accent />
        <MetricCard label="Chat Messages" value={data.summary.totalChatMessages.toLocaleString()} icon="💬" />
        <MetricCard label="Avg Msgs/User" value={data.summary.avgMessagesPerUser.toFixed(1)} icon="📈" />
        <MetricCard label="Marketplace Execs" value={data.summary.totalMarketplaceExecs.toLocaleString()} icon="▶️" />
      </div>

      {/* Range toggle + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
              }`}
            >
              Last {r}
            </button>
          ))}
        </div>
        <button onClick={fetchUsage} className="px-2.5 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.dailyChat.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <MiniBarChart data={data.dailyChat} label={`Chat Volume — ${range}`} />
          </div>
        )}
        {data.dailyActivity.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <MiniBarChart data={data.dailyActivity} label={`Activity Logs — ${range}`} />
          </div>
        )}
        {data.marketplaceExecs.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <MiniBarChart data={data.marketplaceExecs} label={`Marketplace Executions — ${range}`} />
          </div>
        )}
      </div>

      {/* Feature Adoption */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="label-mono text-[10px] text-[var(--text-secondary)] mb-3">Feature Adoption</div>
        <div className="space-y-2">
          {adoptionEntries.map(([key, val]) => {
            const pct = data.summary.totalUsers > 0 ? (val.users / data.summary.totalUsers) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="text-[11px] text-[var(--text-secondary)] w-32 truncate">{val.label}</div>
                <div className="flex-1 h-5 bg-white/[0.04] rounded overflow-hidden relative">
                  <div
                    className="h-full bg-brand-500/40 rounded"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-white">
                    {val.users} users · {val.total.toLocaleString()} items
                  </span>
                </div>
                <div className="text-[10px] font-mono w-10 text-right text-[var(--text-secondary)]">{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Users */}
      {data.topUsers.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="label-mono text-[10px] text-[var(--text-secondary)] px-4 pt-3 pb-2">Top Users by Activity</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left label-mono text-[10px] px-4 py-2">User</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Total</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Chat</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Cards</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Contacts</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Docs</th>
                  <th className="text-right label-mono text-[10px] px-4 py-2">Conns</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2">
                      <div className="text-[11px] text-white">{u.name || 'Unnamed'}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-mono">{u.email}</div>
                    </td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-white font-semibold">{u.totalActions}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-[var(--text-secondary)]">{u.chatMessages}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-[var(--text-secondary)]">{u.kanbanCards}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-[var(--text-secondary)]">{u.contacts}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-[var(--text-secondary)]">{u.documents}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-right text-[var(--text-secondary)]">{u.connections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
