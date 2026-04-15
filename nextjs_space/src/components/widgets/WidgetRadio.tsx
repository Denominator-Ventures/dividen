'use client';

import { cn } from '@/lib/utils';

export interface WidgetRadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface WidgetRadioProps {
  id: string;
  label: string;
  description?: string;
  options: WidgetRadioOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetRadio({
  id, label, description, options = [], value, onChange, disabled, className,
}: WidgetRadioProps) {
  return (
    <div className={cn('rounded-[var(--widget-radius)] p-3', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--widget-text)' }}>{label}</span>
      {description && (
        <p className="text-[10px] mt-0.5 mb-2" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
      )}
      <div className="space-y-1.5 mt-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg border transition-all text-xs',
            )}
            style={{
              borderColor: value === opt.value ? 'var(--widget-accent-text)' : 'var(--widget-border)',
              background: value === opt.value ? 'var(--widget-accent-soft)' : 'transparent',
              color: value === opt.value ? 'var(--widget-text)' : 'var(--widget-text-secondary)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: value === opt.value ? 'var(--widget-accent-text)' : 'var(--widget-border)' }}>
                {value === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--widget-accent-text)' }} />
                )}
              </div>
              <div>
                <span className="font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="ml-1.5" style={{ color: 'var(--widget-text-muted)' }}>— {opt.description}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
