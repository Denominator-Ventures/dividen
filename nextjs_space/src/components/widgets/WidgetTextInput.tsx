'use client';

import { cn } from '@/lib/utils';

export interface WidgetTextInputProps {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetTextInput({
  id, label, description, placeholder, value, onChange, disabled, className,
}: WidgetTextInputProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-medium" style={{ color: 'var(--widget-text-secondary)' }}>
        {label}
      </label>
      {description && (
        <p className="text-[10px]" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || ''}
        className="w-full px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors focus:outline-none"
        style={{
          background: 'var(--widget-bg)',
          border: '1px solid var(--widget-input-border)',
          color: 'var(--widget-text)',
        }}
      />
    </div>
  );
}
