'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmailMessageData } from '@/types';

type InboxFilter = 'all' | 'unread' | 'starred' | 'sent' | 'drafts';
type ComposeMode = 'new' | 'reply' | null;

interface IntegrationBrief {
  id: string;
  identity: string;
  label: string | null;
  emailAddress: string | null;
  service: string;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function InboxView() {
  const [emails, setEmails] = useState<EmailMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailMessageData | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');

  // Compose state
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeIdentity, setComposeIdentity] = useState<string>('operator');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Integration accounts for sending
  const [emailIntegrations, setEmailIntegrations] = useState<IntegrationBrief[]>([]);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('filter', 'unread');
      if (filter === 'starred') params.set('filter', 'starred');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/emails${qs}`);
      const data = await res.json();
      if (data.success) {
        let filtered = data.data as EmailMessageData[];
        if (filter === 'sent') {
          filtered = filtered.filter((e: EmailMessageData) => e.source === 'sent');
        } else if (filter === 'drafts') {
          filtered = filtered.filter((e: EmailMessageData) => (e as any).labels?.includes('draft'));
        }
        setEmails(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch emails:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      if (data.success) {
        setEmailIntegrations(
          (data.data as IntegrationBrief[]).filter((a) => a.service === 'email')
        );
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Mark as read when selecting
  const handleSelect = useCallback(async (email: EmailMessageData) => {
    setSelected(email);
    setComposeMode(null);
    if (!email.isRead) {
      try {
        await fetch(`/api/emails/${email.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
        setSelected((prev) => (prev && prev.id === email.id ? { ...prev, isRead: true } : prev));
      } catch { /* silent */ }
    }
  }, []);

  const handleStar = useCallback(async (emailId: string, starred: boolean) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: starred }),
      });
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, isStarred: starred } : e)));
      setSelected((prev) => (prev && prev.id === emailId ? { ...prev, isStarred: starred } : prev));
    } catch { /* silent */ }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEmails((prev) => prev.filter((e) => e.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    } catch { /* silent */ }
  }, [selected]);

  // Compose handlers
  const openCompose = (mode: 'new' | 'reply', email?: EmailMessageData) => {
    setComposeMode(mode);
    setSendError('');
    if (mode === 'reply' && email) {
      setComposeTo(email.fromEmail || '');
      setComposeSubject(`Re: ${email.subject}`);
      setComposeBody(`\n\n---\nOn ${new Date(email.receivedAt).toLocaleDateString()}, ${email.fromName || email.fromEmail} wrote:\n> ${(email.body || email.snippet || '').split('\n').join('\n> ')}`);
    } else {
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody.trim()) {
      setSendError('Fill in all fields');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/integrations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: composeIdentity,
          to: composeTo,
          subject: composeSubject,
          body: composeBody.trim(),
          replyToMessageId: composeMode === 'reply' && selected?.externalId ? selected.externalId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComposeMode(null);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        fetchEmails();
      } else {
        setSendError(data.error || 'Send failed');
      }
    } catch {
      setSendError('Network error');
    } finally {
      setSending(false);
    }
  };

  // Sync handler
  const handleSync = async () => {
    const emailAcct = emailIntegrations[0];
    if (!emailAcct) {
      setSyncMsg('No email integration configured. Go to Settings \u2192 Integrations.');
      setTimeout(() => setSyncMsg(''), 4000);
      return;
    }
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: emailAcct.id }),
      });
      const data = await res.json();
      setSyncMsg(data.success ? data.message : (data.error || 'Sync failed'));
      if (data.success) fetchEmails();
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const hasEmailIntegration = emailIntegrations.length > 0;

  return (
    <div className="h-full flex">
      {/* Left: Email list */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'unread', 'starred', 'sent', 'drafts'] as InboxFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`label-mono px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-[var(--brand-primary)]/15 text-brand-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f === 'all' ? `All${emails.length ? ` (${emails.length})` : ''}` : f === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : f === 'sent' ? 'Sent' : f === 'drafts' ? 'Drafts' : 'Starred'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => openCompose('new')}
              className="px-2 py-1 text-[10px] rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors whitespace-nowrap"
              title="Compose new email"
            >
              ✏ Compose
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-2 py-1 text-[10px] rounded bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Sync emails from server"
            >
              {syncing ? '↻...' : '↻ Sync'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="px-3 py-1.5 text-[10px] bg-brand-500/10 text-brand-400 border-b border-[var(--border-color)]">
            {syncMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <div className="text-3xl mb-3">📧</div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">
                {filter === 'sent' ? 'No sent emails' : 'No emails yet'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {hasEmailIntegration
                  ? 'Click Sync to fetch emails, or compose a new one.'
                  : 'Go to Settings \u2192 Integrations to connect your email.'}
              </p>
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => handleSelect(email)}
                className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-color)] transition-colors ${
                  selected?.id === email.id ? 'bg-[var(--brand-primary)]/8' : 'hover:bg-[var(--bg-surface)]'
                } ${!email.isRead ? 'border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStar(email.id, !email.isStarred); }}
                    className={`flex-shrink-0 mt-0.5 text-sm transition-colors ${
                      email.isStarred ? 'text-yellow-400' : 'text-[var(--text-muted)] hover:text-yellow-400'
                    }`}
                  >
                    {email.isStarred ? '★' : '☆'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-xs truncate ${
                        !email.isRead ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {(email as any).source === 'sent'
                          ? `To: ${email.toEmail || 'Unknown'}`
                          : (email.fromName || email.fromEmail || 'Unknown')}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{timeAgo(email.receivedAt)}</span>
                    </div>
                    <p className={`text-xs truncate ${
                      !email.isRead ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}>
                      {email.subject}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                      {email.snippet || email.body?.substring(0, 100) || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {email.linkedCard && (
                        <span className="text-[9px] bg-[var(--bg-surface)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">🗂 {email.linkedCard.title}</span>
                      )}
                      {email.linkedContact && (
                        <span className="text-[9px] bg-[var(--bg-surface)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">👤 {email.linkedContact.name}</span>
                      )}
                      {(email as any).source === 'sent' && (
                        <span className="text-[9px] bg-brand-500/10 rounded px-1.5 py-0.5 text-brand-400">↗ Sent</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail or Compose */}
      <div className="hidden md:flex flex-1 flex-col min-h-0">
        {composeMode ? (
          /* ── Compose view ── */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {composeMode === 'reply' ? 'Reply' : 'New Email'}
              </h3>
              <button
                onClick={() => setComposeMode(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {/* Send as identity */}
              {emailIntegrations.length > 0 && (
                <div>
                  <label className="label-mono text-[10px] mb-1 block">Send As</label>
                  <div className="flex gap-2">
                    {emailIntegrations.map((acct) => (
                      <button
                        key={acct.id}
                        onClick={() => setComposeIdentity(acct.identity)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          composeIdentity === acct.identity
                            ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                            : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        {acct.identity === 'agent' ? '🤖' : '👤'} {acct.label || acct.emailAddress || acct.identity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label-mono text-[10px] mb-1 block">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="label-mono text-[10px] mb-1 block">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="flex-1">
                <label className="label-mono text-[10px] mb-1 block">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={12}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none font-mono"
                />
              </div>

              {sendError && (
                <div className="text-xs text-red-400 px-3 py-2 bg-red-500/10 rounded-lg">
                  {sendError}
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
              <div className="text-[10px] text-[var(--text-muted)]">
                {emailIntegrations.length === 0
                  ? '⚠ No email integration configured. Go to Settings \u2192 Integrations.'
                  : `Sending as ${composeIdentity === 'agent' ? 'Divi' : 'you'}`}
              </div>
              <button
                onClick={handleSend}
                disabled={sending || emailIntegrations.length === 0}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : selected ? (
          /* ── Detail view ── */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.subject}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleStar(selected.id, !selected.isStarred)}
                    className={`text-lg ${selected.isStarred ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                    {selected.isStarred ? '★' : '☆'}
                  </button>
                  <button onClick={() => handleDelete(selected.id)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[var(--border-color)] text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors">Delete</button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>👤 {selected.fromName || 'Unknown'} {selected.fromEmail ? `<${selected.fromEmail}>` : ''}</span>
                <span>• {new Date(selected.receivedAt).toLocaleString()}</span>
              </div>
              {selected.toEmail && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1">To: {selected.toEmail}</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {selected.body || selected.snippet || 'No content'}
              </div>
              {(selected.linkedCard || selected.linkedContact) && (
                <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
                  <span className="label-mono text-[var(--text-muted)] text-[10px] block mb-2">Linked</span>
                  <div className="flex flex-wrap gap-2">
                    {selected.linkedCard && (
                      <span className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2.5 py-1 text-[var(--text-secondary)]">
                        🗂 {selected.linkedCard.title}
                      </span>
                    )}
                    {selected.linkedContact && (
                      <span className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2.5 py-1 text-[var(--text-secondary)]">
                        👤 {selected.linkedContact.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Inline reply bar */}
            {(selected as any).source !== 'sent' && selected.fromEmail && (
              <div className="px-6 py-3 border-t border-[var(--border-color)] space-y-2">
                <div
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] cursor-text hover:border-brand-500/30 transition-colors"
                  onClick={() => openCompose('reply', selected)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openCompose('reply', selected); }}
                >
                  ↩ Click to reply to {selected.fromName || selected.fromEmail}...
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Inbox</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed mb-4">
              {hasEmailIntegration
                ? 'Click Sync to pull in your latest emails. Compose new ones, reply, and let Divi help triage.'
                : 'Connect your email in Settings \u2192 Integrations to sync your inbox, compose, and reply.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => openCompose('new')}
                className="px-3 py-1.5 text-xs rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
              >
                ✏ Compose
              </button>
              <button
                onClick={handleSync}
                disabled={syncing || !hasEmailIntegration}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : '↻ Sync Inbox'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
