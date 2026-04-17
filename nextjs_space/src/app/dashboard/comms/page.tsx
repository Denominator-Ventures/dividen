'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { AgentWidgetContainer, parseWidgetPayload } from '@/components/widgets';
import type { WidgetItem, WidgetItemAction, AgentWidgetData } from '@/components/widgets';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RelayUser {
  id: string;
  name: string | null;
  email: string;
}

interface RelayConnection {
  id: string;
  requester: RelayUser;
  accepter: RelayUser | null;
  peerAgentName?: string | null;
  peerUserName?: string | null;
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
  dueDate: string | null;
  resolvedAt: string | null;
  responsePayload: string | null;
  threadId: string | null;
  parentRelayId: string | null;
  artifactType: string | null;
  artifacts: string | null;
  peerInstanceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  connection: RelayConnection;
  fromUser: RelayUser;
  toUser: RelayUser | null;
}

interface RelayThread {
  threadId: string;
  peerName: string;
  peerAgentName: string | null;
  latestRelay: Relay;
  relays: Relay[];
  unresolved: number;
}

type FilterType = 'all' | 'pending' | 'completed' | 'declined';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: '#f59e0b', label: 'Pending' },
  delivered: { color: '#3b82f6', label: 'Delivered' },
  agent_handling: { color: '#8b5cf6', label: 'Agent Handling' },
  user_review: { color: '#ec4899', label: 'Needs Review' },
  completed: { color: '#22c55e', label: 'Completed' },
  declined: { color: '#ef4444', label: 'Declined' },
  expired: { color: '#6b7280', label: 'Expired' },
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

const DIRECTION_ICONS = {
  outbound: '↗',
  inbound: '↙',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CommsPage() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const fetchRelays = useCallback(async () => {
    try {
      const res = await fetch('/api/relays?limit=100');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRelays(data);
      }
    } catch (e) {
      console.error('Failed to fetch relays:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelays();
  }, [fetchRelays]);

  // Group relays into threads
  const threads = useMemo(() => {
    const threadMap = new Map<string, Relay[]>();

    for (const r of relays) {
      const tid = r.threadId || r.id; // solo relays get their own thread
      if (!threadMap.has(tid)) threadMap.set(tid, []);
      threadMap.get(tid)!.push(r);
    }

    const result: RelayThread[] = [];
    for (const [threadId, items] of threadMap) {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const latest = items[items.length - 1];

      // Determine peer name — the other party in this conversation, not the current user
      const firstRelay = items[0];
      const conn = firstRelay.connection;
      let peerName = 'Unknown Agent';
      let peerAgentName = conn?.peerAgentName || null;

      if (conn && userId) {
        // Pick whichever side of the connection is NOT the current user
        const requesterIsMe = conn.requester?.id === userId;
        const accepterIsMe = conn.accepter?.id === userId;

        if (requesterIsMe && conn.accepter?.name) {
          peerName = conn.accepter.name;
        } else if (accepterIsMe && conn.requester?.name) {
          peerName = conn.requester.name;
        } else if (conn.peerUserName) {
          peerName = conn.peerUserName;
        } else {
          // Fallback: look at the relay users themselves
          const isOutbound = firstRelay.fromUserId === userId;
          peerName = isOutbound
            ? (firstRelay.toUser?.name || firstRelay.toUser?.email || 'External Agent')
            : (firstRelay.fromUser?.name || firstRelay.fromUser?.email || 'External Agent');
        }
      } else if (firstRelay.fromUserId === userId) {
        peerName = firstRelay.toUser?.name || 'External Agent';
      } else {
        peerName = firstRelay.fromUser?.name || 'External Agent';
      }

      const unresolved = items.filter(r => !['completed', 'declined', 'expired'].includes(r.status)).length;

      result.push({ threadId, peerName, peerAgentName, latestRelay: latest, relays: items, unresolved });
    }

    // Sort by latest activity
    result.sort((a, b) => new Date(b.latestRelay.createdAt).getTime() - new Date(a.latestRelay.createdAt).getTime());
    return result;
  }, [relays, userId]);

  // Filter threads
  const filteredThreads = useMemo(() => {
    if (filter === 'all') return threads;
    if (filter === 'pending') return threads.filter(t => t.unresolved > 0);
    if (filter === 'completed') return threads.filter(t => t.latestRelay.status === 'completed');
    if (filter === 'declined') return threads.filter(t => t.latestRelay.status === 'declined');
    return threads;
  }, [threads, filter]);

  const activeThread = threads.find(t => t.threadId === selectedThread);
  const pendingCount = threads.filter(t => t.unresolved > 0).length;

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <header className="flex-shrink-0 px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between border-b border-[var(--border-color)] gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 md:gap-2">
            <span className="text-lg md:text-xl text-brand-400">⬡</span>
            <span className="font-bold text-brand-400 text-base md:text-lg tracking-tight">DiviDen</span>
          </Link>
          <div className="w-px h-5 bg-[var(--border-color)]" />
          <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Comms — Agent Relay Channel</span>
          {pendingCount > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
            title="Sign Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 flex min-h-0">
        {/* ── Left: Thread list ── */}
        <div className="w-full md:w-96 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col">
          {/* Toolbar */}
          <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center gap-1 overflow-x-auto">
            {([{ id: 'all' as FilterType, label: 'All' }, { id: 'pending' as FilterType, label: 'Active' }, { id: 'completed' as FilterType, label: 'Completed' }, { id: 'declined' as FilterType, label: 'Declined' }]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`label-mono px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-[var(--brand-primary)]/15 text-brand-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                <div className="text-3xl mb-3">📡</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">No agent relays yet</p>
                <p className="text-xs text-[var(--text-muted)]">
                  When your Divi communicates with other agents — relays, marketplace dispatches, and cross-agent coordination — the conversation log appears here.
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread === thread.threadId;
                const latest = thread.latestRelay;
                const statusInfo = STATUS_CONFIG[latest.status] || STATUS_CONFIG.pending;
                const isOutbound = latest.fromUserId === userId;

                return (
                  <button
                    key={thread.threadId}
                    onClick={() => setSelectedThread(thread.threadId)}
                    className={`w-full text-left px-3 py-3 border-b border-[var(--border-color)] transition-colors ${
                      isSelected ? 'bg-[var(--brand-primary)]/8' : 'hover:bg-[var(--bg-surface)]'
                    } ${thread.unresolved > 0 ? 'border-l-2 border-l-[var(--brand-primary)]' : 'border-l-2 border-l-transparent'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5 text-brand-400">⬡</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {thread.peerName}
                              {thread.peerAgentName && <span className="text-[var(--text-muted)] font-normal"> · {thread.peerAgentName}</span>}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {isOutbound ? DIRECTION_ICONS.outbound : DIRECTION_ICONS.inbound}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                            {timeAgo(latest.createdAt)}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed line-clamp-2 ${
                          thread.unresolved > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                        }`}>
                          {INTENT_ICONS[latest.intent] || '💬'} {latest.subject}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {thread.relays.length} message{thread.relays.length !== 1 ? 's' : ''}
                          </span>
                          {thread.unresolved > 0 && (
                            <span className="text-[10px] text-amber-400">
                              {thread.unresolved} active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Thread detail ── */}
        <div className="hidden md:flex flex-1 flex-col min-h-0">
          {activeThread ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Thread header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-brand-400">⬡</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Divi ↔ {activeThread.peerName}
                      {activeThread.peerAgentName && ` (${activeThread.peerAgentName})`}
                    </span>
                  </div>
                  <span
                    className="text-[10px] uppercase font-bold px-2 py-1 rounded"
                    style={{
                      background: `${(STATUS_CONFIG[activeThread.latestRelay.status] || STATUS_CONFIG.pending).color}20`,
                      color: (STATUS_CONFIG[activeThread.latestRelay.status] || STATUS_CONFIG.pending).color,
                    }}
                  >
                    {(STATUS_CONFIG[activeThread.latestRelay.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {activeThread.relays.length} relay{activeThread.relays.length !== 1 ? 's' : ''} in this thread
                  {activeThread.latestRelay.peerInstanceUrl && ` · Federated: ${activeThread.latestRelay.peerInstanceUrl}`}
                </p>
              </div>

              {/* Conversation view */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {activeThread.relays.map((relay) => {
                  const isFromMe = relay.fromUserId === userId;
                  const statusInfo = STATUS_CONFIG[relay.status] || STATUS_CONFIG.pending;
                  let payloadObj: any = null;
                  try { if (relay.payload) payloadObj = JSON.parse(relay.payload); } catch {}
                  let responseObj: any = null;
                  try { if (relay.responsePayload) responseObj = JSON.parse(relay.responsePayload); } catch {}

                  return (
                    <div
                      key={relay.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-xl p-3 ${
                        isFromMe
                          ? 'bg-[var(--brand-primary)]/10 border border-brand-500/20'
                          : 'bg-[var(--bg-surface)] border border-[var(--border-color)]'
                      }`}>
                        {/* Sender line */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold uppercase ${
                            isFromMe ? 'text-brand-400' : 'text-purple-400'
                          }`}>
                            {isFromMe ? 'Your Divi' : `${activeThread.peerName}'s Agent`}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)]">
                            {isFromMe ? DIRECTION_ICONS.outbound : DIRECTION_ICONS.inbound} {relay.type}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)]">
                            {timeAgo(relay.createdAt)}
                          </span>
                        </div>

                        {/* Intent badge + subject */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-sm">{INTENT_ICONS[relay.intent] || '💬'}</span>
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {relay.subject}
                          </span>
                        </div>

                        {/* Payload text */}
                        {payloadObj && (
                          <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                            {typeof payloadObj === 'string' ? payloadObj : (
                              payloadObj.message || payloadObj.body || payloadObj.text ||
                              (payloadObj.description && !payloadObj.widgets ? payloadObj.description : null) ||
                              (!payloadObj.widgets ? JSON.stringify(payloadObj, null, 2) : null)
                            )}
                          </div>
                        )}

                        {/* Interactive widgets from relay payload */}
                        {(() => {
                          // Widgets can be in payload.widgets or in the top-level payload as AgentWidgetData format
                          const wp = payloadObj?.widgets ? parseWidgetPayload(JSON.stringify({ widgets: payloadObj.widgets })) : null;
                          if (!wp) return null;
                          return (
                            <div className="mt-2 mb-2">
                              <AgentWidgetContainer
                                payload={wp}
                                onAction={async (item: WidgetItem, action: WidgetItemAction, widget: AgentWidgetData) => {
                                  console.log('[Comms Widget] Action:', { relayId: relay.id, item: item.id, action: action.action });
                                  // Submit widget response back to the relay
                                  try {
                                    await fetch('/api/relays/widget-response', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        relayId: relay.id,
                                        widgetId: widget.title,
                                        itemId: item.id,
                                        action: action.action,
                                        payload: action.payload,
                                      }),
                                    });
                                    // Refresh relay data
                                    fetchRelays();
                                  } catch (err) {
                                    console.error('[Comms Widget] Response failed:', err);
                                  }
                                }}
                                className="mt-2"
                              />
                            </div>
                          );
                        })()}

                        {/* Response payload (for completed relays) */}
                        {responseObj && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                            <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-1">Response</span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {typeof responseObj === 'string' ? responseObj : (
                                responseObj.message || responseObj.result || JSON.stringify(responseObj, null, 2)
                              )}
                            </p>
                          </div>
                        )}

                        {/* Status + priority */}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                          {relay.priority === 'urgent' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                              Urgent
                            </span>
                          )}
                          {relay.dueDate && (
                            <span className="text-[9px] text-[var(--text-muted)]">
                              Due: {new Date(relay.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Agent Relay Channel</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                This is where your Divi communicates with other agents — connected Divis, marketplace agents, and federated instances.
                You can observe the conversation, see tasks dispatched and responses received, and Divi&apos;s acknowledgment of each exchange.
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed mt-2">
                Tasks your Divi can handle internally never appear here — only cross-agent communication.
              </p>
            </div>
          )}
        </div>

        {/* ── Mobile: show detail as overlay when thread selected ── */}
        {activeThread && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col md:hidden">
            <div className="flex-shrink-0 px-3 py-2.5 flex items-center justify-between border-b border-[var(--border-color)]">
              <button
                onClick={() => setSelectedThread(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>
                Divi ↔ {activeThread.peerName}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeThread.relays.map((relay) => {
                const isFromMe = relay.fromUserId === userId;
                const statusInfo = STATUS_CONFIG[relay.status] || STATUS_CONFIG.pending;
                return (
                  <div key={relay.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-xl p-3 ${
                      isFromMe ? 'bg-[var(--brand-primary)]/10 border border-brand-500/20' : 'bg-[var(--bg-surface)] border border-[var(--border-color)]'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase ${
                          isFromMe ? 'text-brand-400' : 'text-purple-400'
                        }`}>
                          {isFromMe ? 'Your Divi' : `${activeThread.peerName}`}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)]">{timeAgo(relay.createdAt)}</span>
                      </div>
                      <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                        {INTENT_ICONS[relay.intent] || '💬'} {relay.subject}
                      </p>
                      <span
                        className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
