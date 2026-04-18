'use client';

import { useState } from 'react';

/**
 * v2.3.0 — Standard relay component footnote.
 *
 * Every relay surface (green outgoing card, purple inbound badge, Comms thread row,
 * Comms bubble) now carries a consistent metadata strip:
 *   sender · type (direct/ambient) · timestamp · status · optional dismiss (×)
 *
 * The dismiss button POSTs to /api/relays/[id]/dismiss and emits a refresh event
 * for Comms/Now panels to reload.
 */

export type RelayType = 'direct' | 'ambient';

export type RelayStatus =
  | 'pending'
  | 'delivered'
  | 'agent_handling'
  | 'user_review'
  | 'completed'
  | 'declined'
  | 'expired';

export interface RelayFootnoteProps {
  relayId?: string | null;
  sender: string;                     // display name of the OTHER party (sender or recipient depending on direction)
  senderHandle?: string | null;       // optional @username or instance hint
  type: RelayType;                    // 'direct' (relay_request/broadcast) or 'ambient' (relay_ambient)
  timestamp: string | Date | null;    // ISO string or Date
  status: RelayStatus | string | null;
  tone?: 'emerald' | 'purple' | 'neutral'; // color family for the row
  dismissible?: boolean;              // shows × button; disables automatically when already resolved
  onDismissed?: () => void;           // callback after successful dismiss
  className?: string;
}

const RESOLVED: string[] = ['completed', 'declined', 'expired'];

function formatTimeAgo(ts: string | Date | null): string {
  if (!ts) return '';
  const t = typeof ts === 'string' ? new Date(ts) : ts;
  const sec = Math.floor((Date.now() - t.getTime()) / 1000);
  if (sec < 60) return 'now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return t.toLocaleDateString();
}

function statusLabel(s: string | null | undefined): string {
  if (!s) return 'pending';
  switch (s) {
    case 'pending': return 'pending';
    case 'delivered': return 'delivered';
    case 'agent_handling': return 'agent handling';
    case 'user_review': return 'awaiting review';
    case 'completed': return 'responded';
    case 'declined': return 'dismissed';
    case 'expired': return 'expired';
    default: return s;
  }
}

function statusColor(s: string | null | undefined, tone: 'emerald' | 'purple' | 'neutral'): string {
  if (!s) return 'text-amber-400';
  if (s === 'completed') return tone === 'emerald' ? 'text-emerald-400' : 'text-emerald-400';
  if (s === 'declined' || s === 'expired') return 'text-[var(--text-muted)]';
  if (s === 'delivered' || s === 'user_review' || s === 'agent_handling') return tone === 'purple' ? 'text-purple-300' : 'text-sky-400';
  return 'text-amber-400';
}

export function RelayFootnote(props: RelayFootnoteProps) {
  const {
    relayId,
    sender,
    senderHandle,
    type,
    timestamp,
    status,
    tone = 'neutral',
    dismissible = false,
    onDismissed,
    className = '',
  } = props;

  const [busy, setBusy] = useState(false);
  const isResolved = typeof status === 'string' && RESOLVED.includes(status);
  const canDismiss = dismissible && !!relayId && !isResolved;

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!relayId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/relays/${relayId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'cleared from comms' }),
      });
      if (!res.ok) {
        console.warn('[RelayFootnote] dismiss failed:', await res.text().catch(() => ''));
      } else {
        // Notify the rest of the app so Comms + Now reload
        try { window.dispatchEvent(new CustomEvent('dividen:comms-refresh')); } catch {}
        try { window.dispatchEvent(new CustomEvent('dividen:now-refresh')); } catch {}
      }
      onDismissed?.();
    } catch (err) {
      console.warn('[RelayFootnote] dismiss error:', err);
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = type === 'ambient' ? 'ambient' : 'direct';
  const dotColor = tone === 'emerald' ? 'text-emerald-500/40' : tone === 'purple' ? 'text-purple-400/40' : 'text-[var(--text-muted)]/50';
  const labelBase = tone === 'emerald' ? 'text-emerald-300/70' : tone === 'purple' ? 'text-purple-300/70' : 'text-[var(--text-muted)]';

  return (
    <div className={`flex items-center gap-1 text-[9px] ${labelBase} ${className}`}>
      <span className="font-semibold">{sender}</span>
      {senderHandle && <span className="opacity-70">({senderHandle})</span>}
      <span className={dotColor}>·</span>
      <span className="uppercase tracking-wide opacity-80">{typeLabel}</span>
      {timestamp && (
        <>
          <span className={dotColor}>·</span>
          <span className="opacity-80">{formatTimeAgo(timestamp)}</span>
        </>
      )}
      {status && (
        <>
          <span className={dotColor}>·</span>
          <span className={`font-medium ${statusColor(status, tone)}`}>{statusLabel(status as string)}</span>
        </>
      )}
      {canDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          disabled={busy}
          title="Dismiss relay"
          className="ml-auto text-[10px] opacity-50 hover:opacity-100 hover:text-red-400 transition disabled:opacity-30 leading-none px-1"
        >
          {busy ? '…' : '×'}
        </button>
      )}
    </div>
  );
}
