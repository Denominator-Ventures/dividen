'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MentionText } from '@/components/MentionText';
import { RelayFootnote } from './RelayFootnote';

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
    peerAgentName?: string | null;
  };
  fromUser: RelayUser;
  toUser: RelayUser | null;
}

interface Thread {
  connectionId: string;
  peerName: string;
  peerEmail: string | null;
  latestRelay: Relay;
  totalCount: number;
  activeCount: number;
  isOutbound: boolean; // direction of latest
  isAmbient: boolean;  // detected from latest payload._ambient
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

const INTENT_ICONS: Record<string, string> = {
  get_info: '\uD83D\uDD0D',
  assign_task: '\uD83D\uDCCB',
  request_approval: '\u270B',
  share_update: '\uD83D\uDCE2',
  schedule: '\uD83D\uDCC5',
  introduce: '\uD83E\uDD1D',
  delegate: '\uD83D\uDCCB',
  escalate: '\uD83D\uDEA8',
  ask: '\u2753',
  custom: '\uD83D\uDCAC',
};

function isAmbientPayload(payloadStr: string | null): boolean {
  if (!payloadStr) return false;
  try {
    const p = JSON.parse(payloadStr);
    return !!p?._ambient;
  } catch {
    return false;
  }
}

// Derive the subject preview used in the thread row.
// For outbound relay_respond, prefer the response text over the original subject
// so the thread row shows what *we sent*, not what we received.
function getPreviewText(r: Relay, isOutbound: boolean): string {
  // Outbound response — try to pull response text first
  if (isOutbound && r.type === 'response' && r.responsePayload) {
    try {
      const p = typeof r.responsePayload === 'string' ? JSON.parse(r.responsePayload) : r.responsePayload;
      const txt = typeof p === 'string' ? p : (p?.message || p?.response || p?.text || '');
      if (txt) return String(txt).slice(0, 140);
    } catch {
      if (typeof r.responsePayload === 'string' && r.responsePayload.trim()) {
        return r.responsePayload.trim().slice(0, 140);
      }
    }
  }
  return r.subject || '';
}

// ─── Component ───

export function CommsTab() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/relays?limit=100');
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

  // Group relays by connectionId (peer) — matches the expanded comms page layout.
  const threads = useMemo((): Thread[] => {
    if (!userId) return [];
    const byConn = new Map<string, Relay[]>();
    for (const r of relays) {
      if (!byConn.has(r.connectionId)) byConn.set(r.connectionId, []);
      byConn.get(r.connectionId)!.push(r);
    }

    const result: Thread[] = [];
    for (const [connectionId, items] of byConn) {
      // Sort chronologically — latest last
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const latest = items[items.length - 1];
      const conn = latest.connection;

      // Resolve peer name (the OTHER party, not the current user)
      let peerName = 'Unknown';
      let peerEmail: string | null = null;
      if (conn) {
        const requesterIsMe = conn.requester?.id === userId;
        const accepterIsMe = conn.accepter?.id === userId;
        if (requesterIsMe && conn.accepter) {
          peerName = conn.accepter.name || conn.accepter.email || 'External Agent';
          peerEmail = conn.accepter.email || null;
        } else if (accepterIsMe && conn.requester) {
          peerName = conn.requester.name || conn.requester.email || 'External Agent';
          peerEmail = conn.requester.email || null;
        } else if (conn.peerUserName) {
          peerName = conn.peerUserName;
        } else {
          // Federated fallback — use the first outbound/inbound user on the wire
          const isOutbound = latest.fromUserId === userId;
          peerName = isOutbound
            ? (latest.toUser?.name || latest.toUser?.email || 'External Agent')
            : (latest.fromUser?.name || latest.fromUser?.email || 'External Agent');
          peerEmail = (isOutbound ? latest.toUser?.email : latest.fromUser?.email) || null;
        }
      }

      const activeCount = items.filter((r) => !RESOLVED_STATUSES.has(r.status)).length;
      const isOutbound = latest.fromUserId === userId;
      const isAmbient = isAmbientPayload(latest.payload);
      result.push({ connectionId, peerName, peerEmail, latestRelay: latest, totalCount: items.length, activeCount, isOutbound, isAmbient });
    }

    // Sort threads by latest activity — newest first
    result.sort((a, b) => new Date(b.latestRelay.createdAt).getTime() - new Date(a.latestRelay.createdAt).getTime());
    return result;
  }, [relays, userId]);

  const { activeThreads, resolvedThreads } = useMemo(() => {
    const active: Thread[] = [];
    const resolved: Thread[] = [];
    for (const t of threads) {
      if (t.activeCount > 0) active.push(t);
      else resolved.push(t);
    }
    return { activeThreads: active, resolvedThreads: resolved };
  }, [threads]);

  function renderThread(t: Thread) {
    const r = t.latestRelay;
    const isResolved = t.activeCount === 0;
    const dirArrow = t.isOutbound ? '\u2197' : '\u2199';
    const dirColor = t.isOutbound ? 'text-emerald-400' : 'text-purple-400';
    const borderColor = t.isOutbound ? 'border-l-emerald-500/70' : 'border-l-purple-500/70';
    const bgHover = t.isOutbound ? 'hover:bg-emerald-500/[0.03]' : 'hover:bg-purple-500/[0.03]';
    const icon = INTENT_ICONS[r.intent] || '\uD83D\uDCAC';
    const preview = getPreviewText(r, t.isOutbound);
    const tone: 'emerald' | 'purple' = t.isOutbound ? 'emerald' : 'purple';

    return (
      <Link
        key={t.connectionId}
        href={`/dashboard/comms?thread=${t.connectionId}`}
        className={`block border-l-2 ${borderColor} ${bgHover} transition-colors ${
          isResolved ? 'opacity-50' : ''
        }`}
      >
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[10px] font-bold flex-shrink-0 ${dirColor}`}>{dirArrow}</span>
            <span className={`text-[11px] font-medium truncate flex-1 min-w-0 ${
              isResolved ? 'text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/40' : 'text-[var(--text-primary)]'
            }`}>
              <MentionText text={t.peerName} />
            </span>
            {t.activeCount > 0 && (
              <span className="text-[8px] px-1 py-px rounded font-medium text-amber-400 bg-amber-500/10 flex-shrink-0">
                {t.activeCount} active
              </span>
            )}
            <span className="text-[8px] text-[var(--text-muted)] flex-shrink-0">
              {t.totalCount}
            </span>
          </div>
          <p className={`text-[10px] line-clamp-1 mt-0.5 pl-4 ${
            isResolved ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
          }`}>
            {icon} <MentionText text={preview} />
          </p>
          <div className="pl-4 mt-1">
            <RelayFootnote
              relayId={r.id}
              sender={t.peerName}
              senderHandle={t.peerEmail}
              type={t.isAmbient ? 'ambient' : 'direct'}
              timestamp={r.createdAt}
              status={r.status as any}
              tone={tone}
              dismissible={!isResolved}
            />
          </div>
        </div>
      </Link>
    );
  }

  const totalActive = activeThreads.reduce((acc, t) => acc + t.activeCount, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">\uD83D\uDCE1 Comms</span>
          {totalActive > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
              {totalActive}
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

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <span className="text-2xl mb-2">\uD83D\uDCE1</span>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Agent relay conversations appear here. One row per peer — tap to open the full thread.
            </p>
          </div>
        ) : (
          <>
            {activeThreads.length > 0 && (
              <div>
                {activeThreads.map(renderThread)}
              </div>
            )}

            {resolvedThreads.length > 0 && (
              <>
                <button
                  onClick={() => setShowResolved((prev) => !prev)}
                  className="w-full px-3 py-1.5 text-[9px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors border-t border-[var(--border-color)]"
                >
                  <span className="text-[8px]">{showResolved ? '\u25BC' : '\u25B6'}</span>
                  {resolvedThreads.length} resolved thread{resolvedThreads.length !== 1 ? 's' : ''}
                </button>
                {showResolved && resolvedThreads.map(renderThread)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
