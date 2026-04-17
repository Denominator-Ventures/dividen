'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MentionText } from '@/components/MentionText';

// ─── Types ───

interface RelayUser {
  id: string;
  name: string | null;
  email: string;
}

interface Relay {
  id: string;
  connectionId: string;
  fromUserId: string;
  toUserId: string | null;
  direction: string;
  type: string;
  intent: string;
  subject: string;
  payload: string | null;
  status: string;
  priority: string;
  responsePayload: string | null;
  threadId: string | null;
  createdAt: string;
  connection: {
    id: string;
    requester: RelayUser;
    accepter: RelayUser | null;
    peerUserName?: string | null;
  };
  fromUser: RelayUser;
  toUser: RelayUser | null;
}

// Resolved statuses — these relays are "done"
const RESOLVED_STATUSES = new Set(['completed', 'declined', 'expired']);

// ─── Helpers ───

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'pending', color: 'text-amber-400 bg-amber-500/10' },
  delivered: { label: 'delivered', color: 'text-blue-400 bg-blue-500/10' },
  agent_handling: { label: 'handling', color: 'text-purple-400 bg-purple-500/10' },
  user_review: { label: 'review', color: 'text-pink-400 bg-pink-500/10' },
  completed: { label: 'done', color: 'text-emerald-400 bg-emerald-500/10' },
  declined: { label: 'declined', color: 'text-red-400 bg-red-500/10' },
  expired: { label: 'expired', color: 'text-gray-400 bg-gray-500/10' },
};

const INTENT_ICONS: Record<string, string> = {
  get_info: '\uD83D\uDD0D',
  assign_task: '\uD83D\uDCCB',
  request_approval: '\u270B',
  share_update: '\uD83D\uDCE2',
  schedule: '\uD83D\uDCC5',
  introduce: '\uD83E\uDD1D',
  custom: '\uD83D\uDCAC',
};

// ─── Component ───

export function CommsTab() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/relays?limit=50');
      const data = await res.json();
      if (Array.isArray(data)) setRelays(data);
    } catch (e) {
      console.error('Comms fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('dividen:comms-refresh', handler);
    window.addEventListener('dividen:now-refresh', handler);
    return () => {
      window.removeEventListener('dividen:comms-refresh', handler);
      window.removeEventListener('dividen:now-refresh', handler);
    };
  }, [fetchData]);

  // Dismiss a relay (mark as expired)
  const dismissRelay = useCallback(async (relayId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/relays/${relayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'expired' }),
      });
      setRelays(prev => prev.map(r => r.id === relayId ? { ...r, status: 'expired' } : r));
    } catch (err) {
      console.error('Failed to dismiss relay:', err);
    }
  }, []);

  // Split relays into active vs resolved, sorted by time
  const { active, resolved } = useMemo(() => {
    const sorted = [...relays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const active: Relay[] = [];
    const resolved: Relay[] = [];
    for (const r of sorted) {
      if (RESOLVED_STATUSES.has(r.status)) resolved.push(r);
      else active.push(r);
    }
    return { active, resolved };
  }, [relays]);

  // Get peer name for a relay
  function getPeerName(r: Relay): string {
    if (!userId) return 'Unknown';
    const isOutbound = r.fromUserId === userId;
    if (isOutbound) {
      return r.toUser?.name || r.connection?.accepter?.name || r.connection?.peerUserName || 'Agent';
    }
    return r.fromUser?.name || r.connection?.requester?.name || r.connection?.peerUserName || 'Agent';
  }

  // Render a single relay card
  function renderRelay(r: Relay) {
    const isOutbound = r.fromUserId === userId;
    const isResolved = RESOLVED_STATUSES.has(r.status);
    const isExpanded = expandedId === r.id;
    const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
    const peerName = getPeerName(r);
    const icon = INTENT_ICONS[r.intent] || '\uD83D\uDCAC';

    // Parse payload for details
    let payloadText = '';
    try {
      if (r.payload) {
        const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
        payloadText = p.message || p.description || p.details || p.body || '';
      }
    } catch { /* not json */ payloadText = typeof r.payload === 'string' ? r.payload : ''; }

    let responseText = '';
    try {
      if (r.responsePayload) {
        const p = typeof r.responsePayload === 'string' ? JSON.parse(r.responsePayload) : r.responsePayload;
        responseText = typeof p === 'string' ? p : (p.message || p.response || p.text || JSON.stringify(p));
      }
    } catch { responseText = typeof r.responsePayload === 'string' ? r.responsePayload : ''; }

    // Direction colors
    const borderColor = isOutbound ? 'border-l-emerald-500/70' : 'border-l-purple-500/70';
    const bgHover = isOutbound ? 'hover:bg-emerald-500/[0.03]' : 'hover:bg-purple-500/[0.03]';
    const dirArrow = isOutbound ? '↗' : '↙';
    const dirColor = isOutbound ? 'text-emerald-400' : 'text-purple-400';
    const dirLabel = isOutbound ? 'sent' : 'received';

    return (
      <div
        key={r.id}
        className={`group relative border-l-2 ${borderColor} ${bgHover} transition-colors cursor-pointer ${
          isResolved ? 'opacity-40' : ''
        }`}
        onClick={() => setExpandedId(isExpanded ? null : r.id)}
      >
        {/* Dismiss button */}
        {!isResolved && (
          <button
            onClick={(e) => dismissRelay(r.id, e)}
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Dismiss"
          >
            <span className="text-[8px] font-bold">\u2715</span>
          </button>
        )}

        {/* Compact row */}
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Direction arrow */}
            <span className={`text-[10px] font-bold flex-shrink-0 ${dirColor}`}>{dirArrow}</span>
            {/* Peer name */}
            <span className={`text-[11px] font-medium truncate flex-1 min-w-0 ${
              isResolved ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
            }`}>
              <MentionText text={peerName} />
            </span>
            {/* Status pill */}
            <span className={`text-[8px] px-1 py-px rounded font-medium flex-shrink-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {/* Time */}
            <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0">{timeAgo(r.createdAt)}</span>
          </div>
          {/* Subject line */}
          <p className={`text-[10px] line-clamp-1 mt-0.5 pl-4 ${
            isResolved ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
          }`}>
            {icon} <MentionText text={r.subject} />
          </p>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-2.5 pb-2 space-y-1.5">
            <div className="ml-4 text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-3 gap-y-0.5">
              <span>{dirLabel} · {r.type} · {r.intent}</span>
              <span>priority: {r.priority}</span>
              {r.threadId && <span>thread: {r.threadId.slice(0, 8)}…</span>}
            </div>
            {payloadText && (
              <div className="ml-4 p-1.5 rounded bg-[var(--bg-surface)] text-[10px] text-[var(--text-secondary)] leading-relaxed max-h-20 overflow-y-auto">
                <MentionText text={payloadText.slice(0, 400)} />
                {payloadText.length > 400 && <span className="text-[var(--text-muted)]">…</span>}
              </div>
            )}
            {responseText && (
              <div className={`ml-4 p-1.5 rounded text-[10px] leading-relaxed max-h-20 overflow-y-auto ${
                isOutbound ? 'bg-purple-500/5 text-purple-300' : 'bg-emerald-500/5 text-emerald-300'
              }`}>
                <span className="font-medium">Response: </span>
                <MentionText text={responseText.slice(0, 400)} />
                {responseText.length > 400 && <span className="opacity-50">…</span>}
              </div>
            )}
            <div className="ml-4 flex items-center gap-2">
              <Link
                href="/dashboard/comms"
                className="text-[9px] text-brand-400 hover:text-brand-300"
                onClick={(e) => e.stopPropagation()}
              >
                Open full thread →
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeCount = active.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">\uD83D\uDCE1 Comms</span>
          {activeCount > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
              {activeCount}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/comms"
          className="text-[10px] text-[var(--text-muted)] hover:text-brand-400 transition-colors"
        >
          Expand \u2197
        </Link>
      </div>

      {/* Relay list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : relays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <span className="text-2xl mb-2">\uD83D\uDCE1</span>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Agent relay conversations appear here. Your Divi&apos;s exchanges with other agents are logged as they happen.
            </p>
          </div>
        ) : (
          <>
            {/* Active relays — each renders individually */}
            {active.length > 0 && (
              <div>
                {active.map(renderRelay)}
              </div>
            )}

            {/* Resolved — collapsible */}
            {resolved.length > 0 && (
              <>
                <button
                  onClick={() => setShowResolved(prev => !prev)}
                  className="w-full px-3 py-1.5 text-[9px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors border-t border-[var(--border-color)]"
                >
                  <span className="text-[8px]">{showResolved ? '\u25BC' : '\u25B6'}</span>
                  {resolved.length} resolved
                </button>
                {showResolved && resolved.map(renderRelay)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
