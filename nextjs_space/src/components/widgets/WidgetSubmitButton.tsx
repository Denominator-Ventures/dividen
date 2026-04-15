'use client';

import { cn } from '@/lib/utils';

export interface WidgetSubmitButtonProps {
  label?: string;
  loading?: boolean;
  loadingLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetSubmitButton({
  label = 'Continue →', loading, loadingLabel = 'Processing...', onClick, disabled, className,
}: WidgetSubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full py-2.5 px-4 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
        className,
      )}
      style={{ background: 'var(--widget-accent)' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--widget-accent-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--widget-accent)'; }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
