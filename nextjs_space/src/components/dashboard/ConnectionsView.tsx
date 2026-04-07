'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import {
  ConnectionData,
  AgentRelayData,
  TRUST_LEVELS,
  CONNECTION_SCOPES,
  RELAY_STATUSES,
  RELAY_INTENTS,
  TrustLevel,
  ConnectionScope,
  RelayIntent,
} from '@/types';

type SubTab = 'connections' | 'relays';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ConnectionsView() {
  const { data: session } = useSession() || {};
  const userId = (session?.user as any)?.id;

  const [subTab, setSubTab] = useState<SubTab>('connections');
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [relays, setRelays] = useState<AgentRelayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewConnection, setShowNewConnection] = useState(false);
  const [showNewRelay, setShowNewRelay] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionData | null>(null);
  const [selectedRelay, setSelectedRelay] = useState<AgentRelayData | null>(null);
  const [relayCounts, setRelayCounts] = useState({ pendingInbound: 0, totalActive: 0 });

  // New connection form
  const [newEmail, setNewEmail] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [isFederated, setIsFederated] = useState(false);
  const [peerInstanceUrl, setPeerInstanceUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // New relay form
  const [relayConnectionId, setRelayConnectionId] = useState('');
  const [relayIntent, setRelayIntent] = useState<RelayIntent>('custom');
  const [relaySubject, setRelaySubject] = useState('');
  const [relayPayload, setRelayPayload] = useState('');
  const [relayPriority, setRelayPriority] = useState('normal');

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchRelays = useCallback(async () => {
    try {
      const res = await fetch('/api/relays?limit=50');
      if (res.ok) setRelays(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchRelayCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/relays/counts');
      if (res.ok) setRelayCounts(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchConnections(), fetchRelays(), fetchRelayCounts()]).finally(() => setLoading(false));
  }, [fetchConnections, fetchRelays, fetchRelayCounts]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleCreateConnection = async () => {
    setFormError('');
    if (!newEmail.trim()) { setFormError('Email is required'); return; }
    setFormLoading(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isFederated ? undefined : newEmail,
          nickname: newNickname || undefined,
          isFederated,
          peerInstanceUrl: isFederated ? peerInstanceUrl : undefined,
          peerUserEmail: isFederated ? newEmail : undefined,
          peerUserName: isFederated ? newNickname : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || 'Failed to create connection');
        return;
      }
      setShowNewConnection(false);
      setNewEmail('');
      setNewNickname('');
      setIsFederated(false);
      setPeerInstanceUrl('');
      fetchConnections();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    fetchConnections();
  };

  const handleDecline = async (id: string) => {
    await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'declined' }),
    });
    fetchConnections();
  };

  const handleBlock = async (id: string) => {
    await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'blocked' }),
    });
    fetchConnections();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    fetchConnections();
    if (selectedConnection?.id === id) setSelectedConnection(null);
  };

  const handleUpdatePermissions = async (id: string, trustLevel: TrustLevel, scopes: ConnectionScope[]) => {
    await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: { trustLevel, scopes } }),
    });
    fetchConnections();
  };

  const handleCreateRelay = async () => {
    if (!relayConnectionId || !relaySubject.trim()) return;
    setFormLoading(true);
    try {
      await fetch('/api/relays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: relayConnectionId,
          type: 'request',
          intent: relayIntent,
          subject: relaySubject,
          payload: relayPayload || undefined,
          priority: relayPriority,
        }),
      });
      setShowNewRelay(false);
      setRelaySubject('');
      setRelayPayload('');
      setRelayConnectionId('');
      fetchRelays();
      fetchRelayCounts();
    } catch (e) { console.error(e); }
    finally { setFormLoading(false); }
  };

  const handleRelayAction = async (relayId: string, status: string, responsePayload?: string) => {
    await fetch(`/api/relays/${relayId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, responsePayload }),
    });
    fetchRelays();
    fetchRelayCounts();
    if (selectedRelay?.id === relayId) setSelectedRelay(null);
  };

  // ─── Helpers ───────────────────────────────────────────────────

  const activeConnections = connections.filter(c => c.status === 'active');
  const pendingConnections = connections.filter(c => c.status === 'pending');
  const inboundPending = pendingConnections.filter(c => c.accepterId === userId);
  const outboundPending = pendingConnections.filter(c => c.requesterId === userId && c.accepterId !== userId);

  const getConnectionPeer = (c: ConnectionData) => {
    if (c.isFederated) return { name: c.peerUserName || c.peerUserEmail || 'Remote User', email: c.peerUserEmail || '', instance: c.peerInstanceUrl };
    const peer = c.requesterId === userId ? c.accepter : c.requester;
    return { name: peer?.name || peer?.email || 'Unknown', email: peer?.email || '', instance: null };
  };

  const getNickname = (c: ConnectionData) => {
    return c.requesterId === userId ? c.nickname : c.peerNickname;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)] text-sm">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('connections')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              subTab === 'connections'
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            🔗 Connections {activeConnections.length > 0 && <span className="ml-1 text-[10px] opacity-70">({activeConnections.length})</span>}
          </button>
          <button
            onClick={() => setSubTab('relays')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all relative',
              subTab === 'relays'
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            📡 Relays
            {relayCounts.pendingInbound > 0 && (
              <span className="ml-1 bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                {relayCounts.pendingInbound}
              </span>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          {subTab === 'connections' && (
            <button
              onClick={() => setShowNewConnection(true)}
              className="text-[10px] label-mono px-2 py-1 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors"
            >
              + Connect
            </button>
          )}
          {subTab === 'relays' && activeConnections.length > 0 && (
            <button
              onClick={() => { setShowNewRelay(true); setRelayConnectionId(activeConnections[0]?.id || ''); }}
              className="text-[10px] label-mono px-2 py-1 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors"
            >
              + New Relay
            </button>
          )}
        </div>
      </div>

      {/* ─── New Connection Form ─── */}
      {showNewConnection && (
        <div className="mx-4 mt-3 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3">
            <span className="label-mono text-[var(--text-secondary)] text-[10px]">New Connection</span>
            <button onClick={() => setShowNewConnection(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
          </div>

          {/* Local / Federated toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsFederated(false)}
              className={cn('px-3 py-1 text-[11px] rounded-md transition-all', !isFederated ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
            >
              👤 Local User
            </button>
            <button
              onClick={() => setIsFederated(true)}
              className={cn('px-3 py-1 text-[11px] rounded-md transition-all', isFederated ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
            >
              🌐 Federated
            </button>
          </div>

          {isFederated && (
            <input
              value={peerInstanceUrl}
              onChange={(e) => setPeerInstanceUrl(e.target.value)}
              placeholder="Instance URL (e.g. https://team.dividen.ai)"
              className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
            />
          )}
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={isFederated ? 'User email on remote instance' : 'User email on this instance'}
            className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          />
          <input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="Nickname (optional)"
            className="w-full px-3 py-2 mb-3 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          />
          {formError && <p className="text-red-400 text-[11px] mb-2">{formError}</p>}
          <button
            onClick={handleCreateConnection}
            disabled={formLoading}
            className="w-full py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
          >
            {formLoading ? 'Sending...' : isFederated ? '🌐 Send Federated Request' : '🔗 Send Connection Request'}
          </button>
        </div>
      )}

      {/* ─── New Relay Form ─── */}
      {showNewRelay && (
        <div className="mx-4 mt-3 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3">
            <span className="label-mono text-[var(--text-secondary)] text-[10px]">New Relay</span>
            <button onClick={() => setShowNewRelay(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
          </div>
          <select
            value={relayConnectionId}
            onChange={(e) => setRelayConnectionId(e.target.value)}
            className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          >
            {activeConnections.map(c => {
              const peer = getConnectionPeer(c);
              return <option key={c.id} value={c.id}>{getNickname(c) || peer.name} {c.isFederated ? '🌐' : ''}</option>;
            })}
          </select>
          <select
            value={relayIntent}
            onChange={(e) => setRelayIntent(e.target.value as RelayIntent)}
            className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          >
            {RELAY_INTENTS.map(i => (
              <option key={i.id} value={i.id}>{i.icon} {i.label}</option>
            ))}
          </select>
          <input
            value={relaySubject}
            onChange={(e) => setRelaySubject(e.target.value)}
            placeholder="What do you need? (subject)"
            className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          />
          <textarea
            value={relayPayload}
            onChange={(e) => setRelayPayload(e.target.value)}
            placeholder="Details (optional)"
            rows={3}
            className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50 resize-none"
          />
          <div className="flex gap-2 mb-3">
            {['low', 'normal', 'urgent'].map(p => (
              <button
                key={p}
                onClick={() => setRelayPriority(p)}
                className={cn(
                  'px-3 py-1 text-[11px] rounded-md transition-all capitalize',
                  relayPriority === p
                    ? p === 'urgent' ? 'bg-red-500/20 text-red-400' : p === 'low' ? 'bg-gray-500/20 text-gray-400' : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreateRelay}
            disabled={formLoading || !relaySubject.trim()}
            className="w-full py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
          >
            {formLoading ? 'Sending...' : '📡 Send Relay'}
          </button>
        </div>
      )}

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {subTab === 'connections' && (
          <div className="space-y-4">
            {/* Inbound Pending */}
            {inboundPending.length > 0 && (
              <div>
                <span className="label-mono text-[var(--text-muted)] text-[10px]">Incoming Requests</span>
                <div className="mt-2 space-y-2">
                  {inboundPending.map(c => {
                    const peer = getConnectionPeer(c);
                    return (
                      <div key={c.id} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-yellow-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{peer.name}</span>
                            {c.isFederated && <span className="ml-2 text-[10px] text-yellow-400">🌐 {peer.instance}</span>}
                            <p className="text-[11px] text-[var(--text-muted)]">{peer.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAccept(c.id)} className="px-3 py-1 text-[11px] rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">Accept</button>
                            <button onClick={() => handleDecline(c.id)} className="px-3 py-1 text-[11px] rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Decline</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outbound Pending */}
            {outboundPending.length > 0 && (
              <div>
                <span className="label-mono text-[var(--text-muted)] text-[10px]">Pending Requests</span>
                <div className="mt-2 space-y-2">
                  {outboundPending.map(c => {
                    const peer = getConnectionPeer(c);
                    return (
                      <div key={c.id} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-[var(--text-secondary)]">{getNickname(c) || peer.name}</span>
                            {c.isFederated && <span className="ml-2 text-[10px] text-blue-400">🌐</span>}
                            <p className="text-[11px] text-[var(--text-muted)]">{peer.email} • Waiting for response</p>
                          </div>
                          <button onClick={() => handleDelete(c.id)} className="text-[var(--text-muted)] hover:text-red-400 text-xs">Cancel</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Connections */}
            <div>
              <span className="label-mono text-[var(--text-muted)] text-[10px]">Active Connections</span>
              {activeConnections.length === 0 ? (
                <div className="mt-3 text-center py-8">
                  <div className="text-3xl mb-3">🔗</div>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">No connections yet</p>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                    Connect with other DiviDen users to enable agent-to-agent communication. Your Divi talks to their Divi.
                  </p>
                  <button
                    onClick={() => setShowNewConnection(true)}
                    className="mt-4 px-4 py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors"
                  >
                    + Connect with someone
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {activeConnections.map(c => {
                    const peer = getConnectionPeer(c);
                    const isSelected = selectedConnection?.id === c.id;
                    let perms: { trustLevel: TrustLevel; scopes: ConnectionScope[] } = { trustLevel: 'supervised', scopes: [] };
                    try { perms = JSON.parse(c.permissions); } catch {}
                    const trustDef = TRUST_LEVELS.find(t => t.id === perms.trustLevel);

                    return (
                      <div key={c.id}>
                        <button
                          onClick={() => setSelectedConnection(isSelected ? null : c)}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            isSelected
                              ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                              : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)]'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center text-[var(--brand-primary)] text-sm font-medium">
                                {(getNickname(c) || peer.name).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-[var(--text-primary)]">{getNickname(c) || peer.name}</span>
                                {c.isFederated && <span className="ml-2 text-[10px] text-blue-400">🌐</span>}
                                <p className="text-[11px] text-[var(--text-muted)]">{peer.email}{peer.instance ? ` • ${peer.instance}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)]">{trustDef?.icon} {trustDef?.label}</span>
                              {c._count && c._count.relays > 0 && (
                                <span className="text-[10px] text-[var(--text-muted)]">📡 {c._count.relays}</span>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded connection detail */}
                        {isSelected && (
                          <div className="mt-2 ml-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                            <span className="label-mono text-[var(--text-muted)] text-[9px]">Trust Level</span>
                            <div className="flex gap-2 mt-1 mb-3">
                              {TRUST_LEVELS.map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => handleUpdatePermissions(c.id, t.id, perms.scopes)}
                                  className={cn(
                                    'px-2 py-1 text-[10px] rounded transition-all',
                                    perms.trustLevel === t.id
                                      ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                                  )}
                                >
                                  {t.icon} {t.label}
                                </button>
                              ))}
                            </div>

                            <span className="label-mono text-[var(--text-muted)] text-[9px]">Allowed Scopes</span>
                            <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                              {CONNECTION_SCOPES.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    const newScopes = perms.scopes.includes(s.id)
                                      ? perms.scopes.filter(x => x !== s.id)
                                      : [...perms.scopes, s.id];
                                    handleUpdatePermissions(c.id, perms.trustLevel, newScopes);
                                  }}
                                  className={cn(
                                    'px-2 py-1 text-[10px] rounded transition-all',
                                    perms.scopes.includes(s.id)
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                                  )}
                                >
                                  {s.icon} {s.label}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--border-color)]">
                              <button
                                onClick={() => { setShowNewRelay(true); setRelayConnectionId(c.id); setSubTab('relays'); }}
                                className="px-3 py-1 text-[10px] rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors"
                              >
                                📡 Send Relay
                              </button>
                              <button onClick={() => handleBlock(c.id)} className="px-3 py-1 text-[10px] rounded text-yellow-400 hover:bg-yellow-500/10 transition-colors">Block</button>
                              <button onClick={() => handleDelete(c.id)} className="px-3 py-1 text-[10px] rounded text-red-400 hover:bg-red-500/10 transition-colors">Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'relays' && (
          <div className="space-y-2">
            {relays.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">📡</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">No relays yet</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                  Relays are structured requests between connected agents. Ask Divi to get something from a connection, or send one manually.
                </p>
              </div>
            ) : (
              relays.map(r => {
                const isInbound = r.toUserId === userId;
                const peerName = isInbound
                  ? (r.fromUser?.name || r.fromUser?.email || 'Unknown')
                  : (r.toUser?.name || r.toUser?.email || r.connection?.accepter?.name || 'Remote');
                const statusDef = RELAY_STATUSES.find(s => s.id === r.status);
                const intentDef = RELAY_INTENTS.find(i => i.id === r.intent);
                const isSelected = selectedRelay?.id === r.id;
                const needsAction = isInbound && ['delivered', 'user_review'].includes(r.status);

                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setSelectedRelay(isSelected ? null : r)}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-all',
                        needsAction
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : isSelected
                            ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                            : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm flex-shrink-0">{isInbound ? '📥' : '📤'}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[var(--text-primary)] truncate">{r.subject}</span>
                              {r.priority === 'urgent' && <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-400">URGENT</span>}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {isInbound ? `From ${peerName}` : `To ${peerName}`} • {intentDef?.icon} {intentDef?.label} • {timeAgo(r.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${statusDef?.color}20`, color: statusDef?.color }}
                        >
                          {statusDef?.label}
                        </span>
                      </div>
                    </button>

                    {/* Relay detail */}
                    {isSelected && (
                      <div className="mt-2 ml-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                        {r.payload && (
                          <div className="mb-3">
                            <span className="label-mono text-[var(--text-muted)] text-[9px]">Payload</span>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                              {(() => { try { return JSON.stringify(JSON.parse(r.payload), null, 2); } catch { return r.payload; } })()}
                            </p>
                          </div>
                        )}
                        {r.responsePayload && (
                          <div className="mb-3">
                            <span className="label-mono text-[var(--text-muted)] text-[9px]">Response</span>
                            <p className="text-xs text-green-400 mt-1 whitespace-pre-wrap">
                              {(() => { try { return JSON.stringify(JSON.parse(r.responsePayload), null, 2); } catch { return r.responsePayload; } })()}
                            </p>
                          </div>
                        )}
                        {r.peerInstanceUrl && (
                          <p className="text-[10px] text-[var(--text-muted)] mb-3">🌐 {r.peerInstanceUrl}</p>
                        )}

                        {/* Actions */}
                        {needsAction && (
                          <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
                            <button
                              onClick={() => handleRelayAction(r.id, 'completed', 'Acknowledged and completed.')}
                              className="px-3 py-1 text-[10px] rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                            >
                              ✅ Complete
                            </button>
                            <button
                              onClick={() => handleRelayAction(r.id, 'agent_handling')}
                              className="px-3 py-1 text-[10px] rounded bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-colors"
                            >
                              🤖 Let Divi Handle
                            </button>
                            <button
                              onClick={() => handleRelayAction(r.id, 'declined', 'Declined by user.')}
                              className="px-3 py-1 text-[10px] rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                        {!needsAction && !['completed', 'declined', 'expired'].includes(r.status) && !isInbound && (
                          <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
                            <span className="text-[10px] text-[var(--text-muted)]">Waiting for response...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
