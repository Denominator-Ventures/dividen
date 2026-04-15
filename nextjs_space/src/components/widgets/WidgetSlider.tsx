'use client';

import { cn } from '@/lib/utils';

export interface WidgetSliderProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}

export function WidgetSlider({
  id, label, description, value, min = 1, max = 5,
  lowLabel, highLabel, onChange, disabled, className,
}: WidgetSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('rounded-[var(--widget-radius)] p-3', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--widget-text)' }}>{label}</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--widget-accent-text)' }}>{value}/{max}</span>
      </div>
      {description && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
      )}
      <div className="relative">
        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-runnable-track]:rounded-full
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:-mt-[5px]
            [&::-moz-range-track]:rounded-full
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full"
          style={{
            background: `linear-gradient(to right, var(--widget-track-fill) 0%, var(--widget-track-fill) ${pct}%, var(--widget-track) ${pct}%, var(--widget-track) 100%)`,
            // Thumb colors via CSS vars — applied via inline for cross-browser
            // @ts-ignore
            '--thumb-bg': 'var(--widget-accent)',
            '--thumb-border': 'var(--widget-accent-text)',
            '--track-bg': 'var(--widget-track)',
          } as React.CSSProperties}
        />
        {/* Thumb styling that can't use inline easily — handled via global CSS */}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px]" style={{ color: 'var(--widget-text-muted)' }}>{lowLabel || min}</span>
        <span className="text-[9px]" style={{ color: 'var(--widget-text-muted)' }}>{highLabel || max}</span>
      </div>
    </div>
  );
}
