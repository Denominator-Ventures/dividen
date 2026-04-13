'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TRUST_LEVELS, TrustLevel } from '@/types';

interface AcceptConnectionModalProps {
  connectionId: string;
  peerName: string;
  peerEmail: string;
  isFederated?: boolean;
  peerInstance?: string | null;
  onAccept: (data: {
    connectionId: string;
    peerNickname: string;
    trustLevel: TrustLevel;
    context: string;
    relationshipType: string;
  }) => Promise<void>;
  onDecline: (connectionId: string) => void;
  onClose: () => void;
}

const RELATIONSHIP_TYPES = [
  { id: '', label: 'Not specified' },
  { id: 'colleague', label: 'Colleague' },
  { id: 'client', label: 'Client' },
  { id: 'collaborator', label: 'Collaborator' },
  { id: 'friend', label: 'Friend' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'partner', label: 'Business Partner' },
  { id: 'other', label: 'Other' },
];

export default function AcceptConnectionModal({
  connectionId,
  peerName,
  peerEmail,
  isFederated,
  peerInstance,
  onAccept,
  onDecline,
  onClose,
}: AcceptConnectionModalProps) {
  const [nickname, setNickname] = useState(peerName || '');
  const [trustLevel, setTrustLevel] = useState<TrustLevel>('supervised');
  const [context, setContext] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept({
        connectionId,
        peerNickname: nickname || peerName,
        trustLevel,
        context,
        relationshipType,
      });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center text-[var(--brand-primary)] text-lg font-semibold">
              {(peerName || peerEmail || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{peerName || 'Someone'}</h3>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {peerEmail}
                {isFederated && peerInstance && <span className="ml-1 text-blue-400">• 🌐 {peerInstance}</span>}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-3">
            wants to connect. Once accepted, your agents can communicate via relay.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">What should you call them?</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={peerName || 'Nickname'}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
            />
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">How do you know them?</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIP_TYPES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRelationshipType(r.id)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg border transition-all',
                    relationshipType === r.id
                      ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.1)]'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Level */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Initial trust level</label>
            <p className="text-[10px] text-[var(--text-muted)] mb-2">
              Controls what their agent can do when communicating with yours. You can change this anytime.
            </p>
            <div className="space-y-1.5">
              {TRUST_LEVELS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTrustLevel(t.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border transition-all',
                    trustLevel === t.id
                      ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/8'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[rgba(255,255,255,0.1)]'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    trustLevel === t.id ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
                  )}>
                    {t.icon} {t.label}
                  </span>
                  {t.description && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Met at Web Summit, works on AI tooling…"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
          <button
            onClick={() => onDecline(connectionId)}
            className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Decline
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50"
            >
              {accepting ? 'Connecting…' : '🔗 Accept & Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
