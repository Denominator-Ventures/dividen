'use client';

import { cn } from '@/lib/utils';
import type { DividenMode } from '@/types';

interface ModeToggleProps {
  currentMode: DividenMode;
  onModeChange: (mode: DividenMode) => void;
}

const modes: { id: DividenMode; label: string; description: string; icon: string }[] = [
  {
    id: 'cockpit',
    label: 'Cockpit',
    description: 'You\'re in control. AI assists and suggests, you approve and execute.',
    icon: '🎮',
  },
  {
    id: 'chief_of_staff',
    label: 'Chief of Staff',
    description: 'AI takes the lead. It executes autonomously, you review and guide.',
    icon: '🤖',
  },
];

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={cn(
            'p-4 rounded-lg border text-left transition-all',
            currentMode === mode.id
              ? 'border-brand-500 bg-[var(--brand-primary)]/10'
              : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
          )}
        >
          <div className="text-2xl mb-2">{mode.icon}</div>
          <div className="font-medium mb-1">{mode.label}</div>
          <div className="text-xs text-[var(--text-secondary)]">
            {mode.description}
          </div>
        </button>
      ))}
    </div>
  );
}
