'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Recording {
  id: string;
  title: string;
  source: string;
  transcript: string | null;
  summary: string | null;
  duration: number | null;
  status: string;
  metadata: string | null;
  cardId: string | null;
  createdAt: string;
}

const SOURCE_ICONS: Record<string, string> = {
  plaud: '🎙️',
  otter: '🦦',
  fireflies: '🔥',
  generic: '📝',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  processed: '#60a5fa',
  reviewed: '#34d399',
};

export function RecordingsView() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Recording | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      if (data.success) setRecordings(data.data);
    } catch (e) {
      console.error('Failed to fetch recordings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/recordings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setRecordings(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    } catch (e) {
      console.error('Failed to update recording:', e);
    }
  };

  const filtered = filter === 'all' ? recordings : recordings.filter(r => r.status === filter);

  const formatDuration = (s: number | null) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)] text-sm">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Recordings</span>
          <span className="text-xs text-[var(--text-muted)]">{recordings.length}</span>
        </div>
        <div className="flex gap-1">
          {['all', 'pending', 'processed', 'reviewed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-2 py-0.5 text-xs rounded-md transition-colors capitalize',
                filter === s
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className={cn('overflow-y-auto', selected ? 'w-1/2 border-r border-[var(--border-color)]' : 'w-full')}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-3">🎙️</div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No recordings yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Connect your note-taker (Otter, Fireflies, Plaud, etc.) via webhooks to automatically capture meeting recordings and transcripts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {filtered.map(rec => (
                <button
                  key={rec.id}
                  onClick={() => setSelected(rec)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-[var(--bg-surface)] transition-colors',
                    selected?.id === rec.id && 'bg-[var(--bg-surface)]'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{SOURCE_ICONS[rec.source] || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{rec.title}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium flex-shrink-0"
                          style={{ color: STATUS_COLORS[rec.status] || '#94a3b8', backgroundColor: `${STATUS_COLORS[rec.status] || '#94a3b8'}15` }}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)] capitalize">{rec.source}</span>
                        {rec.duration && <span className="text-xs text-[var(--text-muted)]">{formatDuration(rec.duration)}</span>}
                        <span className="text-xs text-[var(--text-muted)]">{new Date(rec.createdAt).toLocaleDateString()}</span>
                      </div>
                      {rec.summary && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{rec.summary}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-[var(--text-muted)] capitalize">{SOURCE_ICONS[selected.source]} {selected.source}</span>
              <span className="text-xs text-[var(--text-muted)]">{formatDuration(selected.duration)}</span>
              <span className="text-xs text-[var(--text-muted)]">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            {/* Status Actions */}
            <div className="flex gap-2 mb-4">
              {selected.status === 'pending' && (
                <button onClick={() => updateStatus(selected.id, 'processed')} className="btn-primary text-xs px-3 py-1">Mark Processed</button>
              )}
              {selected.status === 'processed' && (
                <button onClick={() => updateStatus(selected.id, 'reviewed')} className="btn-primary text-xs px-3 py-1">Mark Reviewed</button>
              )}
              {selected.status === 'reviewed' && (
                <span className="text-xs text-[#34d399]">✓ Reviewed</span>
              )}
            </div>
            {/* Summary */}
            {selected.summary && (
              <div className="mb-4">
                <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Summary</span>
                <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{selected.summary}</p>
              </div>
            )}
            {/* Transcript */}
            {selected.transcript && (
              <div>
                <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Transcript</span>
                <div className="mt-1 p-3 bg-[var(--bg-surface)] rounded-lg text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                  {selected.transcript}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
