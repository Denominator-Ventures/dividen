'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SignalItem {
  signalId: string;
  name: string;
  icon: string;
  priority: number;
  catchUpEnabled: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CatchUpQuickMenu({ open, onClose, anchorRef }: Props) {
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/config');
      const json = await res.json();
      if (json.success) {
        setSignals(json.data.map((s: any) => ({
          signalId: s.signalId,
          name: s.name,
          icon: s.icon,
          priority: s.priority,
          catchUpEnabled: s.catchUpEnabled,
        })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) { setLoading(true); fetchSignals(); }
  }, [open, fetchSignals]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef?.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  const save = useCallback(async (updated: SignalItem[]) => {
    setSaving(true);
    try {
      await fetch('/api/signals/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: updated.map((s, i) => ({
            signalId: s.signalId,
            priority: i + 1,
            catchUpEnabled: s.catchUpEnabled,
          })),
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
  }, []);

  const toggleSignal = (signalId: string) => {
    const updated = signals.map(s =>
      s.signalId === signalId ? { ...s, catchUpEnabled: !s.catchUpEnabled } : s
    );
    setSignals(updated);
    save(updated);
  };

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...signals];
    const [dragged] = items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    setSignals(items);
    save(items);
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-1.5 z-50 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-primary)]">Catch Up Signals</span>
        {saving && <span className="text-[9px] text-[var(--text-muted)] animate-pulse">saving…</span>}
      </div>

      {loading ? (
        <div className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)] animate-pulse">Loading…</div>
      ) : signals.length === 0 ? (
        <div className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">No signals configured</div>
      ) : (
        <div className="py-1 max-h-72 overflow-y-auto">
          {signals.map((s, idx) => (
            <div
              key={s.signalId}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-surface)] transition-colors',
                !s.catchUpEnabled && 'opacity-50'
              )}
            >
              <span className="text-[var(--text-muted)] text-[10px] cursor-grab select-none">⠿</span>
              <button
                onClick={() => toggleSignal(s.signalId)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                  s.catchUpEnabled
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                    : 'border-[var(--border-color)] bg-transparent'
                )}
              >
                {s.catchUpEnabled && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="text-sm flex-shrink-0">{s.icon}</span>
              <span className="text-[11px] text-[var(--text-primary)] truncate flex-1">{s.name}</span>
              <span className="text-[9px] text-[var(--text-muted)] font-mono flex-shrink-0">#{idx + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-t border-[var(--border-color)]">
        <p className="text-[9px] text-[var(--text-muted)]">Drag to reorder priority. Uncheck to exclude from catch-up.</p>
      </div>
    </div>
  );
}
