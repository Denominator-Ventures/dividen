'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmailMessageData } from '@/types';

type InboxFilter = 'all' | 'unread' | 'starred';

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

  const fetchEmails = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?filter=${filter}` : '';
      const res = await fetch(`/api/emails${params}`);
      const data = await res.json();
      if (data.success) setEmails(data.data);
    } catch (e) {
      console.error('Failed to fetch emails:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchEmails();
  }, [fetchEmails]);

  // Mark as read when selecting
  const handleSelect = useCallback(async (email: EmailMessageData) => {
    setSelected(email);
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

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <div className="h-full flex">
      {/* Left: Email list */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(['all', 'unread', 'starred'] as InboxFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`label-mono px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-[var(--brand-primary)]/15 text-brand-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f === 'all' ? `All${emails.length ? ` (${emails.length})` : ''}` : f === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : 'Starred'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <div className="text-3xl mb-3">📧</div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">No emails yet</p>
              <p className="text-xs text-[var(--text-muted)]">Connect Gmail or another email service via webhooks to see your inbox here.</p>
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
                  {/* Star */}
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
                        {email.fromName || email.fromEmail || 'Unknown'}
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
                    {/* Linked entities */}
                    <div className="flex items-center gap-2 mt-1">
                      {email.linkedCard && (
                        <span className="text-[9px] bg-[var(--bg-surface)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">🗂 {email.linkedCard.title}</span>
                      )}
                      {email.linkedContact && (
                        <span className="text-[9px] bg-[var(--bg-surface)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">👤 {email.linkedContact.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="hidden md:flex flex-1 flex-col min-h-0">
        {selected ? (
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
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Inbox</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              Emails from connected services appear here. Star important ones, link them to deals or contacts, and let Divi help triage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
