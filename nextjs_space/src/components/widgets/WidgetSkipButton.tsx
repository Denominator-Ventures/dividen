'use client';

import { cn } from '@/lib/utils';

export interface WidgetSkipButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetSkipButton({
  label = 'Skip this step', onClick, disabled, className,
}: WidgetSkipButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full py-2 text-xs transition-colors disabled:opacity-50',
        className,
      )}
      style={{ color: 'var(--widget-text-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--widget-text-secondary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--widget-text-muted)'; }}
    >
      {label}
    </button>
  );
}
