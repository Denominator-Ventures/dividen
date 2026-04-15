'use client';

import { cn } from '@/lib/utils';

export interface WidgetToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetToggle({
  id, label, description, checked, onChange, disabled, className,
}: WidgetToggleProps) {
  return (
    <div className={cn('rounded-[var(--widget-radius)] p-3 flex items-center justify-between', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      <div>
        <span className="text-xs font-medium" style={{ color: 'var(--widget-text)' }}>{label}</span>
        {description && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3"
        style={{ background: checked ? 'var(--widget-accent)' : 'var(--widget-track)' }}>
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          )}
        />
      </button>
    </div>
  );
}
