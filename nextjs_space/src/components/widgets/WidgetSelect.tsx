'use client';

import { cn } from '@/lib/utils';

export interface WidgetSelectOption {
  value: string;
  label: string;
}

export interface WidgetSelectProps {
  id: string;
  label: string;
  description?: string;
  options: WidgetSelectOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetSelect({
  id, label, description, options = [], value, onChange, disabled, className,
}: WidgetSelectProps) {
  return (
    <div className={cn('rounded-[var(--widget-radius)] p-3', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--widget-text)' }}>{label}</span>
      {description && (
        <p className="text-[10px] mt-0.5 mb-2" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full mt-1 px-3 py-2 rounded-lg text-xs focus:outline-none"
        style={{
          background: 'var(--widget-input-bg)',
          border: '1px solid var(--widget-input-border)',
          color: 'var(--widget-text)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
