'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { CommsMessageData, CommsState, CommsPriority } from '@/types';
import { COMMS_STATES } from '@/types';

type FilterState = 'all' | CommsState;

const SENDER_ICONS: Record<string, string> = {
  user: '👤',
  divi: '⬡',
  system: '⚙️',
};

const SENDER_LABELS: Record<string, string> = {
  user: 'You',
  divi: 'Divi',
  system: 'System',
};

const PRIORITY_INDICATORS: Record<string, { color: string; label: string }> = {
  urgent: { color: '#f87171', label: 'Urgent' },
  normal: { color: '#94a3b8', label: 'Normal' },
  low: { color: '#6b7280', label: 'Low' },
};

const STATE_ACTIONS: { from: CommsState[]; to: CommsState; label: string; icon: string }[] = [
  { from: ['new'], to: 'read', label: 'Mark Read', icon: '👁' },
  { from: ['new', 'read'], to: 'acknowledged', label: 'Acknowledge', icon: '✓' },
  { from: ['new', 'read', 'acknowledged'], to: 'resolved', label: 'Resolve', icon: '✔' },
  { from: ['new', 'read', 'acknowledged'], to: 'dismissed', label: 'Dismiss', icon: '✕' },
];

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

export default function CommsPage() {
  const [messages, setMessages] = useState<CommsMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>('all');
  const [selected, setSelected] = useState<CommsMessageData | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composePriority, setComposePriority] = useState<CommsPriority>('normal');
  const [sending, setSending] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?state=${filter}` : '';
      const res = await fetch(`/api/comms${params}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch comms:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Auto-mark as read when selecting a 'new' message
  const handleSelect = useCallback(async (msg: CommsMessageData) => {
    setSelected(msg);
    if (msg.state === 'new') {
      try {
        const res = await fetch(`/api/comms/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: 'read' }),
        });
        const data = await res.json();
        if (data.success) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, state: 'read' as CommsState } : m))
          );
          setSelected((prev) => (prev && prev.id === msg.id ? { ...prev, state: 'read' as CommsState } : prev));
        }
      } catch { /* silent */ }
    }
  }, []);

  const handleStateChange = useCallback(async (msgId: string, newState: CommsState) => {
    try {
      const res = await fetch(`/api/comms/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, state: newState } : m))
        );
        setSelected((prev) => (prev && prev.id === msgId ? { ...prev, state: newState } : prev));
      }
    } catch (e) {
      console.error('Failed to update state:', e);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!composeText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composeText.trim(),
          sender: 'user',
          priority: composePriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [data.data, ...prev]);
        setComposeText('');
        setComposePriority('normal');
        setComposing(false);
        setSelected(data.data);
      }
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
    }
  }, [composeText, composePriority]);

  const handleDelete = useCallback(async (msgId: string) => {
    try {
      const res = await fetch(`/api/comms/${msgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        if (selected?.id === msgId) setSelected(null);
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }, [selected]);

  useEffect(() => {
    if (composing && composeRef.current) {
      composeRef.current.focus();
    }
  }, [composing]);

  const unreadCount = messages.filter((m) => m.state === 'new').length;
  const stateConfig = selected ? COMMS_STATES.find((s) => s.id === selected.state) : null;
  const availableActions = selected
    ? STATE_ACTIONS.filter((a) => a.from.includes(selected.state as CommsState))
    : [];

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
          {unreadCount > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unreadCount}
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
          <Link
            href="/settings"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
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
        {/* ── Left: Message list ── */}
        <div className="w-full md:w-96 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col">
          {/* Toolbar */}
          <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[{ id: 'all' as FilterState, label: 'All' }, ...COMMS_STATES.slice(0, 4)].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilter(s.id)}
                  className={`label-mono px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                    filter === s.id
                      ? 'bg-[var(--brand-primary)]/15 text-brand-400'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setComposing(true)}
              className="flex-shrink-0 bg-[var(--brand-primary)] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-brand-600 transition-colors flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                <div className="text-3xl mb-3">📡</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">No relay messages yet</p>
                <p className="text-xs text-[var(--text-muted)]">
                  This is where Divi communicates with other agents — relays, marketplace dispatches, and cross-agent coordination appear here.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selected?.id === msg.id;
                const stateInfo = COMMS_STATES.find((s) => s.id === msg.state);
                const priorityInfo = PRIORITY_INDICATORS[msg.priority];
                const isNew = msg.state === 'new';

                return (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className={`w-full text-left px-3 py-3 border-b border-[var(--border-color)] transition-colors ${
                      isSelected
                        ? 'bg-[var(--brand-primary)]/8'
                        : 'hover:bg-[var(--bg-surface)]'
                    } ${isNew ? 'border-l-2 border-l-[var(--brand-primary)]' : 'border-l-2 border-l-transparent'}`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Sender icon */}
                      <span className={`text-base flex-shrink-0 mt-0.5 ${msg.sender === 'divi' ? 'text-brand-400' : ''}`}>
                        {SENDER_ICONS[msg.sender] || '💬'}
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* Top row: sender + time */}
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${
                              msg.sender === 'divi' ? 'text-brand-400' : 'text-[var(--text-primary)]'
                            }`}>
                              {SENDER_LABELS[msg.sender] || msg.sender}
                            </span>
                            {msg.priority === 'urgent' && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${priorityInfo.color}20`, color: priorityInfo.color }}>
                                Urgent
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                            {timeAgo(msg.createdAt)}
                          </span>
                        </div>

                        {/* Content preview */}
                        <p className={`text-xs leading-relaxed line-clamp-2 ${
                          isNew ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                        }`}>
                          {msg.content}
                        </p>

                        {/* Bottom row: state + linked entities */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${stateInfo?.color}20`, color: stateInfo?.color }}
                          >
                            {stateInfo?.label}
                          </span>
                          {msg.linkedCard && (
                            <span className="text-[10px] text-[var(--text-muted)] truncate">🗂 {msg.linkedCard.title}</span>
                          )}
                          {msg.linkedContact && (
                            <span className="text-[10px] text-[var(--text-muted)] truncate">👤 {msg.linkedContact.name}</span>
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

        {/* ── Right: Detail / Compose pane ── */}
        <div className="hidden md:flex flex-1 flex-col min-h-0">
          {composing ? (
            /* Compose view */
            <div className="flex-1 flex flex-col p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Message to Divi</h3>
                <button
                  onClick={() => { setComposing(false); setComposeText(''); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Priority</span>
                {(['low', 'normal', 'urgent'] as CommsPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setComposePriority(p)}
                    className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
                      composePriority === p
                        ? 'text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={
                      composePriority === p
                        ? { background: PRIORITY_INDICATORS[p].color }
                        : { background: `${PRIORITY_INDICATORS[p].color}15` }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Text area */}
              <textarea
                ref={composeRef}
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                placeholder="Describe a task, ask a question, or give Divi instructions..."
                className="flex-1 w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/40 resize-none font-[Inter]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSend();
                  }
                }}
              />

              {/* Send button */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[var(--text-muted)]">⌘+Enter to send</span>
                <button
                  onClick={handleSend}
                  disabled={sending || !composeText.trim()}
                  className="bg-[var(--brand-primary)] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send to Divi'}
                </button>
              </div>
            </div>
          ) : selected ? (
            /* Detail view */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${selected.sender === 'divi' ? 'text-brand-400' : ''}`}>
                      {SENDER_ICONS[selected.sender]}
                    </span>
                    <span className={`text-sm font-semibold ${
                      selected.sender === 'divi' ? 'text-brand-400' : 'text-[var(--text-primary)]'
                    }`}>
                      {SENDER_LABELS[selected.sender]}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(selected.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] uppercase font-bold px-2 py-1 rounded"
                      style={{ background: `${stateConfig?.color}20`, color: stateConfig?.color }}
                    >
                      {stateConfig?.label}
                    </span>
                    {selected.priority !== 'normal' && (
                      <span
                        className="text-[10px] uppercase font-bold px-2 py-1 rounded"
                        style={{
                          background: `${PRIORITY_INDICATORS[selected.priority].color}20`,
                          color: PRIORITY_INDICATORS[selected.priority].color,
                        }}
                      >
                        {selected.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {availableActions.map((action) => (
                    <button
                      key={action.to}
                      onClick={() => handleStateChange(selected.id, action.to)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[var(--border-color)] text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>

                {/* Linked entities */}
                {(selected.linkedCard || selected.linkedContact || selected.linkedRecording || selected.linkedDocument) && (
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
                          {selected.linkedContact.company && ` — ${selected.linkedContact.company}`}
                        </span>
                      )}
                      {selected.linkedRecording && (
                        <span className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2.5 py-1 text-[var(--text-secondary)]">
                          🎙 {selected.linkedRecording.title}
                        </span>
                      )}
                      {selected.linkedDocument && (
                        <span className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2.5 py-1 text-[var(--text-secondary)]">
                          📄 {selected.linkedDocument.title}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply quick-action */}
              <div className="px-6 py-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => { setComposing(true); setComposeText(`Re: ${selected.content.slice(0, 80)}...\n\n`); }}
                  className="w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] transition-colors"
                >
                  Reply to this message...
                </button>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Comms Channel</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                This is where you and Divi exchange structured tasks and updates.
                Unlike chat, every message here has a state lifecycle — new → read → acknowledged → resolved.
              </p>
              <button
                onClick={() => setComposing(true)}
                className="mt-4 bg-[var(--brand-primary)] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-brand-600 transition-colors"
              >
                Send Divi a Task
              </button>
            </div>
          )}
        </div>

        {/* ── Mobile: show detail as overlay when selected ── */}
        {(selected || composing) && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col md:hidden">
            {/* Mobile header */}
            <div className="flex-shrink-0 px-3 py-2.5 flex items-center justify-between border-b border-[var(--border-color)]">
              <button
                onClick={() => { setSelected(null); setComposing(false); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>
                {composing ? 'Compose' : stateConfig?.label}
              </span>
            </div>

            {composing ? (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Priority</span>
                  {(['low', 'normal', 'urgent'] as CommsPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setComposePriority(p)}
                      className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
                        composePriority === p ? 'text-white' : 'text-[var(--text-muted)]'
                      }`}
                      style={
                        composePriority === p
                          ? { background: PRIORITY_INDICATORS[p].color }
                          : { background: `${PRIORITY_INDICATORS[p].color}15` }
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={composeRef}
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  placeholder="Describe a task for Divi..."
                  className="flex-1 w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !composeText.trim()}
                  className="mt-3 bg-[var(--brand-primary)] text-white text-sm font-medium py-2.5 rounded-md disabled:opacity-40"
                >
                  {sending ? 'Sending...' : 'Send to Divi'}
                </button>
              </div>
            ) : selected ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={selected.sender === 'divi' ? 'text-brand-400' : ''}>
                      {SENDER_ICONS[selected.sender]}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {SENDER_LABELS[selected.sender]}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(selected.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availableActions.map((action) => (
                      <button
                        key={action.to}
                        onClick={() => handleStateChange(selected.id, action.to)}
                        className="text-[10px] font-medium px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-secondary)]"
                      >
                        {action.icon} {action.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selected.content}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Marketplace CTA */}
      <div className="flex-shrink-0 p-3 border-t border-[var(--border-color)]">
        <Link
          href="/dashboard"
          onClick={(e) => {
            // Store a flag so the dashboard knows to open marketplace
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('openTab', 'marketplace');
            }
          }}
          className="block w-full py-3 px-4 bg-gradient-to-r from-brand-500/20 via-purple-500/15 to-brand-500/20 hover:from-brand-500/30 hover:via-purple-500/25 hover:to-brand-500/30 border border-brand-500/30 hover:border-brand-500/50 rounded-xl text-sm font-semibold text-brand-400 transition-all text-center group"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg group-hover:scale-110 transition-transform">🏪</span>
            <span>Agent Marketplace</span>
            <span className="text-[10px] bg-brand-500/20 px-1.5 py-0.5 rounded-full text-brand-400/80">Explore</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
