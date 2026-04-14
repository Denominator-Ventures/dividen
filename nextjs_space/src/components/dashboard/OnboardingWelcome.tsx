'use client';

import { useState, useCallback } from 'react';

interface OnboardingWelcomeProps {
  userName?: string;
  onStart: () => void;
  onDismiss: () => void;
}

/**
 * Simple welcome popup that replaces the old wizard walkthrough.
 * Shows a brief intro and a single "Start Chat with Divi" button.
 * No API key entry, no multi-step form — just opens the chat.
 */
export function OnboardingWelcome({ userName, onStart, onDismiss }: OnboardingWelcomeProps) {
  const [starting, setStarting] = useState(false);
  const firstName = userName?.split(' ')[0];

  const handleStart = useCallback(() => {
    setStarting(true);
    onStart();
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--brand-primary)]/15 flex items-center justify-center">
            <span className="text-3xl">⬡</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            {firstName ? `Welcome, ${firstName}` : 'Welcome to DiviDen'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Meet Divi — your personal AI command center
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          <div className="space-y-3 mb-5">
            {[
              { icon: '🧠', text: 'Divi reads your signals — email, calendar, files — and sorts what matters' },
              { icon: '📋', text: 'Tasks appear on your board, organized and prioritized automatically' },
              { icon: '⚡', text: 'Approve, adjust, or let Divi handle it — you stay in control' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--text-muted)] text-center mb-4">
            Divi will walk you through everything in chat — one step at a time.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full btn-primary py-3 text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              '💬 Start Chat with Divi →'
            )}
          </button>
          <button
            onClick={onDismiss}
            className="w-full mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-2"
          >
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
