'use client';

import { useCallback } from 'react';

// ─── Time Ago Helper ─────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
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

// ─── Metric Card ─────────────────────────────────────────────────────────────
export function MetricCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {accent && <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
      </div>
      <div className="text-2xl font-heading font-semibold">{value}</div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{label}</div>
      {subtitle && <div className="text-[9px] text-[var(--text-secondary)] mt-0.5 opacity-70">{subtitle}</div>}
    </div>
  );
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────
export function MiniBarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
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

// ─── Admin Fetch Hook ────────────────────────────────────────────────────────
export function useAdminFetch(token: string) {
  const adminFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      return res.json();
    },
    [token]
  );
  return adminFetch;
}

// ─── Status Badge ────────────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400/10 text-emerald-400',
    pending: 'bg-amber-400/10 text-amber-400',
    disabled: 'bg-gray-400/10 text-gray-400',
    suspended: 'bg-red-400/10 text-red-400',
    approved: 'bg-emerald-400/10 text-emerald-400',
    rejected: 'bg-red-400/10 text-red-400',
    trusted: 'bg-brand-500/10 text-brand-400',
    connected: 'bg-emerald-400/10 text-emerald-400',
    inactive: 'bg-gray-400/10 text-gray-400',
  };
  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={`${sizeClass} rounded font-medium ${colors[status] || 'bg-gray-400/10 text-gray-400'}`}>
      {status}
    </span>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-sm font-medium text-white mb-1">{title}</div>
      <div className="text-[11px] text-[var(--text-secondary)]">{description}</div>
    </div>
  );
}
