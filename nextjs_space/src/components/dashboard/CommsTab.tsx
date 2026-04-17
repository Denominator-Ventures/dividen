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
    peerAgentName?: string | null;
    peerUserName?: string | null;
  };
  fromUser: RelayUser;
  toUser: RelayUser | null;
}

/** Comms message that tracks relay lifecycle events */
interface CommsEvent {
  id: string;
  content: string;
  createdAt: string;
  metadata: string | null;
  _type: string;
  _relayId?: string;
}

interface RelayThread {
  threadId: string;
  peerName: string;
  latestRelay: Relay;
  count: number;
  unresolved: number;
  events: CommsEvent[];
}

// Comms metadata types that represent relay lifecycle events
const RELAY_COMMS_TYPES = new Set([
  'task_route_sent',
  'federation_relay_acked',
  'federation_relay_completed',
  'relay_response',
  'agent_relay',
  'federated_relay',
]);

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
  get_info: '\uD83D\uDD0D',
  assign_task: '\uD83D\uDCCB',
  request_approval: '\u270B',
  share_update: '\uD83D\uDCE2',
  schedule: '\uD83D\uDCC5',
  introduce: '\uD83E\uDD1D',
  custom: '\uD83D\uDCAC',
};

const EVENT_LABELS: Record<string, string> = {
  task_route_sent: '\uD83D\uDCE4 Dispatched',
  federation_relay_acked: '\u2713 Delivery confirmed',
  federation_relay_completed: '\u2705 Completed by remote',
  relay_response: '\u21A9 Response received',
  agent_relay: '\uD83D\uDCE1 Relay received',
  federated_relay: '\uD83C\uDF10 Federation relay',
};

// ─── Component ───

export function CommsTab() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;
  const [relays, setRelays] = useState<Relay[]>([]);
  const [commsEvents, setCommsEvents] = useState<CommsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [relayRes, commsRes] = await Promise.all([
        fetch('/api/relays?limit=50'),
        fetch('/api/comms?limit=80&state=all'),
      ]);
      const relayData = await relayRes.json();
      if (Array.isArray(relayData)) setRelays(relayData);

      // Parse comms messages and filter to relay lifecycle events
      const commsData = await commsRes.json();
      const messages = Array.isArray(commsData) ? commsData : commsData?.data || commsData?.messages || [];
      const events: CommsEvent[] = [];
      for (const msg of messages) {
        try {
          const meta = msg.metadata ? JSON.parse(msg.metadata) : null;
          if (meta?.type && RELAY_COMMS_TYPES.has(meta.type)) {
            events.push({
              id: msg.id,
              content: msg.content,
              createdAt: msg.createdAt,
              metadata: msg.metadata,
              _type: meta.type,
              _relayId: meta.relayId,
            });
          }
        } catch {}
      }
      setCommsEvents(events);
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

  // Listen for custom refresh events
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('dividen:comms-refresh', handler);
    window.addEventListener('dividen:now-refresh', handler);
    return () => {
      window.removeEventListener('dividen:comms-refresh', handler);
      window.removeEventListener('dividen:now-refresh', handler);
    };
  }, [fetchData]);

  const threads = useMemo(() => {
    // Index comms events by relayId for quick lookup
    const eventsByRelay = new Map<string, CommsEvent[]>();
    for (const ev of commsEvents) {
      if (ev._relayId) {
        if (!eventsByRelay.has(ev._relayId)) eventsByRelay.set(ev._relayId, []);
        eventsByRelay.get(ev._relayId)!.push(ev);
      }
    }

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

      // Collect all lifecycle events for relays in this thread
      const threadEvents: CommsEvent[] = [];
      for (const r of items) {
        const evs = eventsByRelay.get(r.id) || [];
        threadEvents.push(...evs);
      }
      threadEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const unresolved = items.filter(r => !['completed', 'declined', 'expired'].includes(r.status)).length;
      result.push({ threadId, peerName, latestRelay: latest, count: items.length, unresolved, events: threadEvents });
    }

    result.sort((a, b) => new Date(b.latestRelay.createdAt).getTime() - new Date(a.latestRelay.createdAt).getTime());
    return result;
  }, [relays, commsEvents, userId]);

  const pendingCount = threads.filter(t => t.unresolved > 0).length;

  // Latest event label for a thread
  function latestEventLabel(thread: RelayThread): string | null {
    if (thread.events.length === 0) return null;
    const last = thread.events[thread.events.length - 1];
    return EVENT_LABELS[last._type] || null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-primary)]">\uD83D\uDCE1 Comms</span>
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
              Agent relay conversations appear here. Your Divi&apos;s exchanges with other agents are logged as they happen.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const latest = thread.latestRelay;
            const dotColor = STATUS_DOT[latest.status] || 'bg-gray-400';
            const isOutbound = latest.fromUserId === userId;
            const eventLabel = latestEventLabel(thread);

            // Most recent timestamp across relay + events
            const latestTime = thread.events.length > 0
              ? new Date(Math.max(
                  new Date(latest.createdAt).getTime(),
                  ...thread.events.map(e => new Date(e.createdAt).getTime())
                )).toISOString()
              : latest.createdAt;

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
                      <MentionText text={thread.peerName} />
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {isOutbound ? '\u2197' : '\u2199'}
                    </span>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0">
                    {timeAgo(latestTime)}
                  </span>
                </div>

                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 pl-3">
                  {INTENT_ICONS[latest.intent] || '\uD83D\uDCAC'} <MentionText text={latest.subject} />
                </p>

                {/* Latest lifecycle event — delivery/ack/completion status */}
                {eventLabel && (
                  <p className="text-[9px] text-[var(--text-muted)] line-clamp-1 pl-3 mt-0.5">
                    {eventLabel}
                  </p>
                )}

                {thread.count > 1 && (
                  <span className="text-[9px] text-[var(--text-muted)] pl-3">
                    {thread.count} messages{thread.events.length > 0 ? ` \u00B7 ${thread.events.length} events` : ''}
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
