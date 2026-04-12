'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TriageButtonProps {
  signalName: string;
  signalIcon: string;
  onTriage: () => void;
  variant?: 'inline' | 'compact';
  className?: string;
}

/**
 * Triage button — appears on signal views (Inbox, Calendar, Recordings, etc.)
 * Kicks off a review session with Divi to process incoming information.
 */
export function TriageButton({ signalName, signalIcon, onTriage, variant = 'inline', className }: TriageButtonProps) {
  const [pulsing, setPulsing] = useState(false);

  function handleClick() {
    setPulsing(true);
    onTriage();
    setTimeout(() => setPulsing(false), 1500);
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
          'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20',
          pulsing && 'animate-pulse',
          className
        )}
        title={`Triage ${signalName} with Divi`}
      >
        ⚡ Triage
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/30',
        pulsing && 'animate-pulse',
        className
      )}
      title={`Have Divi triage your ${signalName}`}
    >
      <span className="text-sm">{signalIcon}</span>
      <span>⚡ Triage {signalName}</span>
    </button>
  );
}
