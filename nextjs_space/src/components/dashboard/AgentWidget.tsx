'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Widget Types ─────────────────────────────────────────────────────────────

export type WidgetItemAction = {
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: 'select' | 'purchase' | 'open_url' | 'custom';
  url?: string;
  price?: number;
  currency?: string;
  payload?: Record<string, any>;
};

export type WidgetItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  actions: WidgetItemAction[];
};

export type AgentWidgetData = {
  type: 'choice_card' | 'action_list' | 'info_card' | 'payment_prompt';
  title: string;
  subtitle?: string;
  agentName?: string;
  agentIcon?: string;
  items: WidgetItem[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  allowMultiple?: boolean;
};

export type WidgetPayload = {
  widgets: AgentWidgetData[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseWidgetPayload(metadata?: string | any): WidgetPayload | null {
  if (!metadata) return null;
  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    if (parsed?.widgets && Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
      // Defensively ensure items and actions arrays exist on each widget/item
      const safeWidgets = parsed.widgets.map((w: any) => ({
        ...w,
        items: Array.isArray(w.items) ? w.items.map((item: any) => ({
          ...item,
          actions: Array.isArray(item.actions) ? item.actions : [],
          tags: Array.isArray(item.tags) ? item.tags : [],
        })) : [],
      }));
      return { widgets: safeWidgets } as WidgetPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Action Button Styles ─────────────────────────────────────────────────────

const actionStyles: Record<string, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-white/[0.06]',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
};

// ─── WidgetItemCard Component ─────────────────────────────────────────────────

function WidgetItemCard({ item, onAction, compact }: {
  item: WidgetItem;
  onAction: (item: WidgetItem, action: WidgetItemAction) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 transition-all hover:border-brand-500/30',
      compact ? 'flex items-center gap-3' : 'flex flex-col gap-2'
    )}>
      {/* Image/Icon */}
      {item.imageUrl && (
        <div className={cn(
          'rounded-md overflow-hidden bg-[var(--bg-surface)] flex-shrink-0',
          compact ? 'w-12 h-12' : 'w-full aspect-video'
        )}>
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {!item.imageUrl && item.icon && (
        <span className={cn('flex-shrink-0', compact ? 'text-xl' : 'text-2xl')}>{item.icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</h5>
        {item.subtitle && (
          <p className="text-[11px] text-[var(--text-secondary)] truncate">{item.subtitle}</p>
        )}
        {!compact && item.description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
        )}
        {!compact && item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.map((tag, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {item.actions && item.actions.length > 0 && (
        <div className={cn(
          'flex gap-1.5 flex-shrink-0',
          compact ? 'flex-col' : 'flex-row mt-2'
        )}>
          {item.actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onAction(item, action); }}
              className={cn(
                'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                actionStyles[action.type] || actionStyles.secondary
              )}
            >
              {action.price != null ? (
                <>{action.label} · {action.currency || '$'}{action.price.toFixed(2)}</>
              ) : (
                action.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AgentWidget Component ───────────────────────────────────────────────

export function AgentWidget({ widget, onAction, className }: {
  widget: AgentWidgetData;
  onAction?: (item: WidgetItem, action: WidgetItemAction, widget: AgentWidgetData) => void;
  className?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleAction = (item: WidgetItem, action: WidgetItemAction) => {
    if (action.action === 'select') {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          if (!widget.allowMultiple) next.clear();
          next.add(item.id);
        }
        return next;
      });
    }
    if (action.action === 'open_url' && action.url) {
      window.open(action.url, '_blank', 'noopener');
    }
    onAction?.(item, action, widget);
  };

  const isCompact = widget.layout === 'horizontal';

  return (
    <div className={cn('mt-2 mb-1', className)}>
      {/* Widget Header */}
      <div className="flex items-center gap-2 mb-2">
        {widget.agentIcon && <span className="text-sm">{widget.agentIcon}</span>}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-[var(--text-primary)]">{widget.title}</h4>
          {widget.subtitle && (
            <p className="text-[10px] text-[var(--text-muted)]">{widget.subtitle}</p>
          )}
        </div>
        {widget.agentName && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            via {widget.agentName}
          </span>
        )}
      </div>

      {/* Items */}
      <div className={cn(
        widget.layout === 'grid' ? 'grid grid-cols-2 gap-2' :
        widget.layout === 'horizontal' ? 'flex gap-2 overflow-x-auto scrollbar-hide pb-1' :
        'space-y-2'
      )}>
        {(widget.items || []).map((item) => (
          <div
            key={item.id}
            className={cn(
              widget.layout === 'horizontal' && 'flex-shrink-0 w-64',
              selectedIds.has(item.id) && 'ring-1 ring-brand-500/50 rounded-lg'
            )}
          >
            <WidgetItemCard
              item={item}
              onAction={handleAction}
              compact={isCompact}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Widget Container (renders all widgets in a payload) ──────────────────────

export function AgentWidgetContainer({ payload, onAction, className }: {
  payload: WidgetPayload;
  onAction?: (item: WidgetItem, action: WidgetItemAction, widget: AgentWidgetData) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {(payload.widgets || []).map((widget, i) => (
        <AgentWidget key={i} widget={widget} onAction={onAction} />
      ))}
    </div>
  );
}
