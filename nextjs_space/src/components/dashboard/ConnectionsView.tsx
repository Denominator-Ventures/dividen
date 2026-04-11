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

type SubTab = 'connections' | 'relays' | 'directory';

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
  const [peerProfile, setPeerProfile] = useState<any>(null);
  const [peerProfileLoading, setPeerProfileLoading] = useState(false);
  const [relayConnectionId, setRelayConnectionId] = useState('');
  const [relayIntent, setRelayIntent] = useState<RelayIntent>('custom');
  const [relaySubject, setRelaySubject] = useState('');
  const [relayPayload, setRelayPayload] = useState('');
  const [relayPriority, setRelayPriority] = useState('normal');

  // Directory state
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [justAccepted, setJustAccepted] = useState<ConnectionData | null>(null);
  const [directorySearched, setDirectorySearched] = useState(false);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);

  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [showSentInvites, setShowSentInvites] = useState(false);

  const fetchDirectory = useCallback(async (query = '') => {
    setDirectoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      const res = await fetch(`/api/directory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDirectoryUsers(data.users);
      }
    } catch (e) { console.error(e); }
    setDirectoryLoading(false);
    setDirectorySearched(true);
  }, []);

  const handleDirectoryConnect = async (targetEmail: string, targetName: string) => {
    setConnectingUserId(targetEmail);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, nickname: targetName }),
      });
      if (res.ok) {
        fetchConnections();
        fetchDirectory(directoryQuery);
      }
    } catch (e) { console.error(e); }
    setConnectingUserId(null);
  };

  const fetchSentInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/invites');
      if (res.ok) {
        const data = await res.json();
        setSentInvites(data.invites || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const handleSendInvite = async () => {
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return; }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          message: inviteMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.existingUser || data.existing) {
          setInviteSuccess('User exists — a connection request was sent instead!');
          fetchConnections();
        } else {
          setInviteError(data.error || 'Failed to send invite');
        }
      } else {
        setInviteSuccess(data.emailSent
          ? 'Invitation sent! They\'ll receive an email with a link to join.'
          : 'Invitation created but email delivery may be delayed.');
        setInviteEmail('');
        setInviteName('');
        setInviteMessage('');
        fetchSentInvites();
      }
    } catch (e) {
      console.error(e);
      setInviteError('Failed to send invitation');
    }
    setInviteLoading(false);
  };

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

  // Load directory and invites when tab is selected
  useEffect(() => {
    if (subTab === 'directory') {
      if (!directorySearched) fetchDirectory();
      fetchSentInvites();
    }
  }, [subTab, directorySearched, fetchDirectory, fetchSentInvites]);

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
    const res = await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    await fetchConnections();
    // Show marketplace monetization prompt
    const accepted = connections.find(c => c.id === id);
    if (accepted) setJustAccepted(accepted);
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

  const fetchPeerProfile = async (peerId: string) => {
    setPeerProfile(null);
    setPeerProfileLoading(true);
    try {
      const res = await fetch(`/api/profile/${peerId}`);
      const data = await res.json();
      if (data.success) setPeerProfile(data.profile);
    } catch { /* profile not available */ }
    setPeerProfileLoading(false);
  };

  const getPeerId = (c: ConnectionData): string | null => {
    const peerId = c.requesterId === userId ? c.accepterId : c.requesterId;
    return peerId || null;
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
          <button
            onClick={() => setSubTab('directory')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              subTab === 'directory'
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            🧭 Directory
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

      {/* ─── Marketplace monetization prompt ─── */}
      {justAccepted && (
        <div className="mx-4 mt-3 bg-gradient-to-r from-brand-500/10 via-purple-500/5 to-emerald-500/10 border border-brand-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏪</span>
                <h4 className="text-sm font-semibold text-white/90">Monetize this agent?</h4>
              </div>
              <p className="text-xs text-white/50">
                Connected to {justAccepted.isFederated ? justAccepted.peerUserName || 'remote agent' : justAccepted.nickname || 'agent'}. List it on the marketplace so others can use it — charge per task, offer subscriptions, or share for free.
              </p>
            </div>
            <button onClick={() => setJustAccepted(null)} className="text-white/30 hover:text-white/60 text-sm ml-2">✕</button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('marketplacePrefill', JSON.stringify({
                    name: justAccepted.nickname || justAccepted.peerUserName || 'Connected Agent',
                    description: `Agent connected via ${justAccepted.isFederated ? 'federation from ' + justAccepted.peerInstanceUrl : 'local connection'}`,
                    endpointUrl: justAccepted.isFederated ? justAccepted.peerInstanceUrl + '/api/a2a' : '',
                  }));
                  sessionStorage.setItem('openTab', 'marketplace');
                }
                setJustAccepted(null);
                window.location.href = '/dashboard';
              }}
              className="px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-xs font-medium hover:bg-brand-500/30 transition-all"
            >
              🚀 List on Marketplace
            </button>
            <button
              onClick={() => setJustAccepted(null)}
              className="px-4 py-2 bg-white/5 text-white/50 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-all"
            >
              Not now
            </button>
          </div>
        </div>
      )}

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

                            {/* Profile Peek */}
                            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                              {!peerProfile && !peerProfileLoading && !c.isFederated && getPeerId(c) && (
                                <button
                                  onClick={() => fetchPeerProfile(getPeerId(c)!)}
                                  className="text-[10px] text-brand-400 hover:text-brand-300 mb-2"
                                >
                                  👤 View Profile
                                </button>
                              )}
                              {peerProfileLoading && <div className="text-[10px] text-white/30 mb-2">Loading profile...</div>}
                              {peerProfile && peerProfile.userId === getPeerId(c) && (
                                <div className="mb-2 space-y-1.5">
                                  {peerProfile.headline && (
                                    <div className="text-[11px] text-white/70 italic">{peerProfile.headline}</div>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className={cn(
                                      peerProfile.capacityStatus === 'available' ? 'text-green-400' :
                                      peerProfile.capacityStatus === 'limited' ? 'text-yellow-400' :
                                      peerProfile.capacityStatus === 'busy' ? 'text-orange-400' : 'text-red-400'
                                    )}>
                                      {peerProfile.capacityStatus === 'available' ? '🟢' : peerProfile.capacityStatus === 'limited' ? '🟡' : peerProfile.capacityStatus === 'busy' ? '🟠' : '🔴'}{' '}
                                      {peerProfile.capacityStatus}
                                    </span>
                                    {peerProfile.timezone && <span className="text-white/30">🕐 {peerProfile.timezone}</span>}
                                  </div>
                                  {peerProfile.skills?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {peerProfile.skills.slice(0, 5).map((s: string, i: number) => (
                                        <span key={i} className="px-1.5 py-0.5 text-[9px] bg-white/5 text-white/50 rounded">{s}</span>
                                      ))}
                                      {peerProfile.skills.length > 5 && <span className="text-[9px] text-white/30">+{peerProfile.skills.length - 5}</span>}
                                    </div>
                                  )}
                                  {peerProfile.languages?.length > 0 && (
                                    <div className="text-[9px] text-white/40">
                                      🗣️ {peerProfile.languages.map((l: any) => l.language).join(', ')}
                                    </div>
                                  )}
                                  {peerProfile.superpowers?.length > 0 && (
                                    <div className="text-[9px] text-white/40">
                                      ⚡ {peerProfile.superpowers.slice(0, 3).join(' · ')}
                                    </div>
                                  )}
                                  {peerProfile.taskTypes?.length > 0 && (
                                    <div className="text-[9px] text-white/40">
                                      📋 Accepts: {peerProfile.taskTypes.slice(0, 4).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
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

        {/* ─── Directory Tab ─── */}
        {subTab === 'directory' && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <input
                value={directoryQuery}
                onChange={(e) => setDirectoryQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchDirectory(directoryQuery); }}
                placeholder="Search by name, skill, company, or keyword…"
                className="w-full px-3 py-2.5 pl-9 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {directoryQuery && (
                <button
                  onClick={() => { setDirectoryQuery(''); fetchDirectory(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {directoryLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-[var(--text-muted)] text-sm">Searching…</div>
              </div>
            ) : directoryUsers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">🧭</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  {directorySearched ? 'No users found' : 'Discover people on DiviDen'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                  {directorySearched
                    ? 'Can\'t find who you\'re looking for? Invite them below.'
                    : 'Browse the directory to find and connect with other users. Your agents can then communicate.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="label-mono text-[var(--text-muted)] text-[10px]">
                  {directoryUsers.length} user{directoryUsers.length !== 1 ? 's' : ''} found
                </span>
                {directoryUsers.map((u) => {
                  const isConnected = u.connectionStatus === 'active';
                  const isPending = u.connectionStatus === 'pending';
                  const skills = u.skills?.slice(0, 4) || [];
                  const taskTypes = u.taskTypes?.slice(0, 3) || [];

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center text-[var(--brand-primary)] text-sm font-medium shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{u.name || 'Anonymous'}</span>
                              {u.capacity && u.capacity !== 'available' && (
                                <span className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                  u.capacity === 'busy' ? 'bg-red-500/15 text-red-400' :
                                  u.capacity === 'limited' ? 'bg-yellow-500/15 text-yellow-400' :
                                  'bg-gray-500/15 text-gray-400'
                                )}>
                                  {u.capacity}
                                </span>
                              )}
                            </div>
                            {u.headline && (
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">{u.headline}</p>
                            )}
                            {!u.headline && u.currentTitle && (
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                {u.currentTitle}{u.currentCompany ? ` at ${u.currentCompany}` : ''}
                              </p>
                            )}
                            {!u.headline && !u.currentTitle && (
                              <p className="text-[11px] text-[var(--text-muted)]">{u.email}</p>
                            )}

                            {/* Skills pills */}
                            {skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {skills.map((s: string, i: number) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)] border border-white/[0.06]">
                                    {s}
                                  </span>
                                ))}
                                {(u.skills?.length || 0) > 4 && (
                                  <span className="text-[9px] text-[var(--text-muted)]">+{u.skills.length - 4}</span>
                                )}
                              </div>
                            )}

                            {/* Task types */}
                            {taskTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {taskTypes.map((t: string, i: number) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] capitalize">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
                              {u.timezone && <span>🕐 {u.timezone.replace('_', ' ').split('/').pop()}</span>}
                              {u.industry && <span>• {u.industry}</span>}
                              {u.languages?.length > 0 && (
                                <span>• {u.languages.map((l: any) => typeof l === 'string' ? l : l.language).slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Connect button */}
                        <div className="shrink-0">
                          {isConnected ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 font-medium">
                              ✓ Connected
                            </span>
                          ) : isPending ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-md bg-yellow-500/15 text-yellow-400 font-medium">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDirectoryConnect(u.email, u.name)}
                              disabled={connectingUserId === u.email}
                              className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 font-medium transition-colors disabled:opacity-50"
                            >
                              {connectingUserId === u.email ? '…' : '+ Connect'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Invite Section ─── */}
            <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">Invite to DiviDen</span>
                </div>
                <div className="flex items-center gap-2">
                  {sentInvites.length > 0 && (
                    <button
                      onClick={() => setShowSentInvites(!showSentInvites)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {showSentInvites ? 'Hide' : 'View'} sent ({sentInvites.length})
                    </button>
                  )}
                  <button
                    onClick={() => { setShowInviteForm(!showInviteForm); setInviteError(''); setInviteSuccess(''); }}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors font-medium"
                  >
                    {showInviteForm ? '✕ Close' : '+ Invite Someone'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Know someone who should be on DiviDen? Send them an email invite — they&apos;ll auto-connect with you when they join.
              </p>

              {inviteSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-lg text-[11px] mb-3">
                  {inviteSuccess}
                </div>
              )}

              {showInviteForm && (
                <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3 mb-3">
                  {inviteError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-[11px]">
                      {inviteError}
                    </div>
                  )}
                  <div>
                    <label className="label-mono text-[9px] text-[var(--text-muted)] block mb-1">Email *</label>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40"
                    />
                  </div>
                  <div>
                    <label className="label-mono text-[9px] text-[var(--text-muted)] block mb-1">Name (optional)</label>
                    <input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Their name"
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40"
                    />
                  </div>
                  <div>
                    <label className="label-mono text-[9px] text-[var(--text-muted)] block mb-1">Personal message (optional)</label>
                    <textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Hey, I'm using DiviDen to coordinate AI agents between us..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSendInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:bg-[var(--brand-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              )}

              {/* Sent invites list */}
              {showSentInvites && sentInvites.length > 0 && (
                <div className="space-y-1.5">
                  {sentInvites.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[var(--text-primary)] font-medium truncate block">
                          {inv.inviteeName || inv.inviteeEmail}
                        </span>
                        {inv.inviteeName && (
                          <span className="text-[var(--text-muted)] text-[10px]">{inv.inviteeEmail}</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2',
                          inv.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
                          inv.status === 'accepted' ? 'bg-green-500/15 text-green-400' :
                          'bg-gray-500/15 text-gray-400'
                        )}
                      >
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}