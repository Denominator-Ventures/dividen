'use client';

import { cn } from '@/lib/utils';

export interface WidgetInfoProps {
  icon?: string;
  text?: string;
  className?: string;
}

export function WidgetInfo({ icon, text, className }: WidgetInfoProps) {
  return (
    <div className={cn('rounded-[var(--widget-radius)] px-3 py-2 flex items-center gap-2', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-xs" style={{ color: 'var(--widget-text-secondary)' }}>{text}</span>
    </div>
  );
}
