'use client';

import { useState } from 'react';

/** Yes / Skip buttons rendered below auto-continue "Next up is X" messages */
export function SetupNextTaskButtons({ nextTaskText, nextTaskAction, onConfirm, onSkip }: {
  nextTaskText: string;
  nextTaskAction: any;
  onConfirm: (taskText: string, action: any) => void;
  onSkip: (taskText: string) => void;
}) {
  const [chosen, setChosen] = useState<'yes' | 'skip' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'yes' ? `⚡ Loading ${nextTaskText}...` : '⏭️ Skipped.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => { setChosen('yes'); onConfirm(nextTaskText, nextTaskAction); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ⚡ Yes, let&apos;s go
      </button>
      <button
        onClick={() => { setChosen('skip'); onSkip(nextTaskText); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        ⏭️ Skip for now
      </button>
    </div>
  );
}

/** Now / Later buttons rendered below the setup intro message */
export function SetupNowLaterButtons({ onChoice }: { onChoice: (mode: 'together' | 'solo') => void }) {
  const [chosen, setChosen] = useState<'together' | 'solo' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'together' ? '⚡ Let\u2019s go — tasks due today.' : '📅 No rush — tasks due in a week.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => { setChosen('together'); onChoice('together'); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ⚡ Let&apos;s do it now
      </button>
      <button
        onClick={() => { setChosen('solo'); onChoice('solo'); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        📅 I&apos;ll do it later
      </button>
    </div>
  );
}

/** Open Settings + Done / Skip buttons for the signals onboarding step */
export function SignalsSetupButtons({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [chosen, setChosen] = useState<'done' | 'skip' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'done' ? '✅ Checking your signal setup...' : '⏭️ Skipped — you can set up signals anytime.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      <button
        onClick={() => { window.location.href = '/settings?tab=integrations'; }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
      >
        📡 Open Signal Settings
      </button>
      <button
        onClick={() => { setChosen('done'); onDone(); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ✅ Done — I&apos;ve set them up
      </button>
      <button
        onClick={() => { setChosen('skip'); onSkip(); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        ⏭️ Skip for now
      </button>
    </div>
  );
}
