'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Widget Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────────────

export function parseWidgetPayload(metadata?: string | any): WidgetPayload | null {
  if (!metadata) return null;
  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    if (parsed?.widgets && Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
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

// ─── WidgetItemCard Component ─────────────────────────────────────────────────────

function WidgetItemCard({ item, onAction, compact }: {
  item: WidgetItem;
  onAction: (item: WidgetItem, action: WidgetItemAction) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-3 transition-all',
        compact ? 'flex items-center gap-3' : 'flex flex-col gap-2'
      )}
      style={{
        background: 'var(--widget-bg)',
        border: '1px solid var(--widget-border)',
      }}
    >
      {/* Image/Icon */}
      {item.imageUrl && (
        <div className={cn(
          'rounded-md overflow-hidden flex-shrink-0',
          compact ? 'w-12 h-12' : 'w-full aspect-video'
        )} style={{ background: 'var(--widget-input-bg)' }}>
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
        <h5 className="text-sm font-medium truncate" style={{ color: 'var(--widget-text)' }}>{item.title}</h5>
        {item.subtitle && (
          <p className="text-[11px] truncate" style={{ color: 'var(--widget-text-secondary)' }}>{item.subtitle}</p>
        )}
        {!compact && item.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--widget-text-muted)' }}>{item.description}</p>
        )}
        {!compact && item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.map((tag, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--widget-bg-hover)', color: 'var(--widget-text-muted)' }}>
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
              className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
              style={{
                ...(action.type === 'primary' ? {
                  background: 'var(--widget-accent)',
                  color: '#fff',
                } : action.type === 'danger' ? {
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                } : {
                  background: 'var(--widget-bg)',
                  color: 'var(--widget-text-secondary)',
                  border: '1px solid var(--widget-border)',
                }),
              }}
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

// ─── Main AgentWidget Component ───────────────────────────────────────────────────

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
          <h4 className="text-xs font-semibold" style={{ color: 'var(--widget-text)' }}>{widget.title}</h4>
          {widget.subtitle && (
            <p className="text-[10px]" style={{ color: 'var(--widget-text-muted)' }}>{widget.subtitle}</p>
          )}
        </div>
        {widget.agentName && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--widget-accent-soft)', color: 'var(--widget-accent-text)', border: '1px solid var(--widget-accent-border)' }}>
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
            )}
            style={selectedIds.has(item.id) ? {
              boxShadow: '0 0 0 1px var(--widget-accent)',
              borderRadius: 'var(--widget-radius)',
            } : undefined}
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

// ─── Widget Container (renders all widgets in a payload) ────────────────────

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
