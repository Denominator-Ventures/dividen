'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
    peerAgentName?: string | null;
    peerUserName?: string | null;
  };
  fromUser: RelayUser;
  toUser: RelayUser | null;
}

interface RelayThread {
  threadId: string;
  peerName: string;
  latestRelay: Relay;
  count: number;
  unresolved: number;
}

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

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  delivered: 'bg-blue-400',
  agent_handling: 'bg-purple-400',
  user_review: 'bg-pink-400',
  completed: 'bg-emerald-400',
  declined: 'bg-red-400',
  expired: 'bg-gray-400',
};

const INTENT_ICONS: Record<string, string> = {
  get_info: '🔍',
  assign_task: '📋',
  request_approval: '✋',
  share_update: '📢',
  schedule: '📅',
  introduce: '🤝',
  custom: '💬',
};

// ─── Component ───

export function CommsTab() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelays = useCallback(async () => {
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
    fetchRelays();
    const interval = setInterval(fetchRelays, 30000);
    return () => clearInterval(interval);
  }, [fetchRelays]);

  const threads = useMemo(() => {
    const map = new Map<string, Relay[]>();
    for (const r of relays) {
      const tid = r.threadId || r.id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(r);
    }

    const result: RelayThread[] = [];
    for (const [threadId, items] of map) {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const latest = items[items.length - 1];
      const first = items[0];
      const conn = first.connection;

      let peerName = 'Unknown';
      if (userId && first.fromUserId === userId) {
        peerName = conn?.accepter?.name || conn?.peerUserName || first.toUser?.name || 'Agent';
      } else {
        peerName = conn?.requester?.name || first.fromUser?.name || 'Agent';
      }

      const unresolved = items.filter(r => !['completed', 'declined', 'expired'].includes(r.status)).length;
      result.push({ threadId, peerName, latestRelay: latest, count: items.length, unresolved });
    }

    result.sort((a, b) => new Date(b.latestRelay.createdAt).getTime() - new Date(a.latestRelay.createdAt).getTime());
    return result;
  }, [relays, userId]);

  const pendingCount = threads.filter(t => t.unresolved > 0).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">📡 Comms</span>
          {pendingCount > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
              {pendingCount}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/comms"
          className="text-[10px] text-[var(--text-muted)] hover:text-brand-400 transition-colors"
        >
          Expand ↗
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
            <span className="text-2xl mb-2">📡</span>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Agent relay conversations appear here. Your Divi’s exchanges with other agents are logged as they happen.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const latest = thread.latestRelay;
            const dotColor = STATUS_DOT[latest.status] || 'bg-gray-400';
            const isOutbound = latest.fromUserId === userId;

            return (
              <Link
                key={thread.threadId}
                href="/dashboard/comms"
                className={`block px-3 py-2.5 border-b border-[var(--border-color)] hover:bg-[var(--bg-surface)] transition-colors ${
                  thread.unresolved > 0 ? 'border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                      {thread.peerName}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {isOutbound ? '↗' : '↙'}
                    </span>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0">
                    {timeAgo(latest.createdAt)}
                  </span>
                </div>

                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 pl-3">
                  {INTENT_ICONS[latest.intent] || '💬'} {latest.subject}
                </p>

                {thread.count > 1 && (
                  <span className="text-[9px] text-[var(--text-muted)] pl-3">
                    {thread.count} messages
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
