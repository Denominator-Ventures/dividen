'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SignalConfigItem {
  signalId: string;
  name: string;
  icon: string;
  category: string;
  isCustom: boolean;
  priority: number;
  catchUpEnabled: boolean;
  triageEnabled: boolean;
  triagePrompt: string | null;        // user override
  defaultTriagePrompt: string;         // smart default
}

interface CatchUpSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function CatchUpSettings({ open, onClose }: CatchUpSettingsProps) {
  const [configs, setConfigs] = useState<SignalConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/config');
      const json = await res.json();
      if (json.success) {
        setConfigs(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setDirty(false);
      fetchConfigs();
    }
  }, [open, fetchConfigs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const toggleCatchUp = (index: number) => {
    setConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], catchUpEnabled: !next[index].catchUpEnabled };
      return next;
    });
    setDirty(true);
  };

  const toggleTriage = (index: number) => {
    setConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], triageEnabled: !next[index].triageEnabled };
      return next;
    });
    setDirty(true);
  };

  const updateTriagePrompt = (index: number, prompt: string) => {
    setConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], triagePrompt: prompt || null };
      return next;
    });
    setDirty(true);
  };

  const resetTriagePrompt = (index: number) => {
    setConfigs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], triagePrompt: null };
      return next;
    });
    setDirty(true);
  };

  // Move signal up/down in priority
  const moveSignal = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= configs.length) return;
    setConfigs(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      // Reassign priorities based on new positions
      return next.map((c, i) => ({ ...c, priority: (i + 1) * 10 }));
    });
    setDirty(true);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    setConfigs(prev => {
      const next = [...prev];
      const dragged = next.splice(dragItem.current!, 1)[0];
      next.splice(dragOverItem.current!, 0, dragged);
      return next.map((c, i) => ({ ...c, priority: (i + 1) * 10 }));
    });
    dragItem.current = null;
    dragOverItem.current = null;
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/signals/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: configs.map(c => ({
            signalId: c.signalId,
            priority: c.priority,
            catchUpEnabled: c.catchUpEnabled,
            triageEnabled: c.triageEnabled,
            triagePrompt: c.triagePrompt,
          })),
        }),
      });
      setDirty(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const enabledCount = configs.filter(c => c.catchUpEnabled).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-lg mx-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Catch Up Settings</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {enabledCount} of {configs.length} signals active · drag to reorder priority
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-[var(--text-muted)]">Loading signals...</span>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {/* Info bar */}
              <div className="bg-[var(--bg-surface)] rounded-lg px-3 py-2 mb-2">
                <p className="text-[10px] text-[var(--text-muted)]">
                  <span className="text-brand-400 font-medium">Priority &amp; prompts</span> — signals at the top are triaged first.
                  Click any signal to edit its triage prompt. Each starts with a smart default.
                </p>
              </div>

              {configs.map((config, index) => {
                const isExpanded = expandedSignal === config.signalId;
                const activePrompt = config.triagePrompt || config.defaultTriagePrompt;
                const isCustomized = !!config.triagePrompt;

                return (
                  <div key={config.signalId} className="rounded-lg border border-[var(--border-color)] overflow-hidden">
                    {/* Main row */}
                    <div
                      draggable={!isExpanded}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 transition-all',
                        !isExpanded && 'cursor-grab active:cursor-grabbing',
                        config.catchUpEnabled
                          ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80'
                          : 'bg-[var(--bg-secondary)]/50 opacity-60',
                      )}
                    >
                      {/* Priority number */}
                      <span className={cn(
                        'text-[10px] font-bold w-4 text-center flex-shrink-0',
                        config.catchUpEnabled ? 'text-brand-400' : 'text-[var(--text-muted)]'
                      )}>
                        {index + 1}
                      </span>

                      {/* Drag handle */}
                      <span className="text-[var(--text-muted)] text-xs flex-shrink-0 cursor-grab select-none" title="Drag to reorder">
                        ⠿
                      </span>

                      {/* Signal info — clickable to expand */}
                      <button
                        onClick={() => setExpandedSignal(isExpanded ? null : config.signalId)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <span className="text-base flex-shrink-0">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">{config.name}</span>
                            {config.isCustom && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium flex-shrink-0">custom</span>
                            )}
                            {isCustomized && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-brand-500/10 text-brand-400 font-medium flex-shrink-0">edited</span>
                            )}
                          </div>
                          <span className={cn(
                            'text-[9px]',
                            config.category === 'communication' ? 'text-blue-400' :
                            config.category === 'meetings' ? 'text-purple-400' :
                            config.category === 'content' ? 'text-green-400' :
                            'text-orange-400'
                          )}>
                            {config.category} · <span className="text-[var(--text-muted)]">click to edit prompt</span>
                          </span>
                        </div>
                        <span className={cn(
                          'text-[10px] text-[var(--text-muted)] transition-transform flex-shrink-0',
                          isExpanded && 'rotate-180'
                        )}>▼</span>
                      </button>

                      {/* Move buttons */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveSignal(index, 'up')}
                          disabled={index === 0}
                          className={cn(
                            'text-[10px] w-5 h-4 rounded flex items-center justify-center transition-colors',
                            index === 0 ? 'text-[var(--text-muted)]/30 cursor-not-allowed' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                          )}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSignal(index, 'down')}
                          disabled={index === configs.length - 1}
                          className={cn(
                            'text-[10px] w-5 h-4 rounded flex items-center justify-center transition-colors',
                            index === configs.length - 1 ? 'text-[var(--text-muted)]/30 cursor-not-allowed' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                          )}
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Toggles */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => toggleCatchUp(index)}
                            className={cn(
                              'relative w-8 h-[18px] rounded-full transition-colors',
                              config.catchUpEnabled ? 'bg-green-500' : 'bg-[var(--bg-surface-hover)]'
                            )}
                            title={config.catchUpEnabled ? 'Included in Catch Up' : 'Excluded from Catch Up'}
                          >
                            <div className={cn(
                              'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform',
                              config.catchUpEnabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
                            )} />
                          </button>
                          <span className="text-[8px] text-[var(--text-muted)]">catch up</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => toggleTriage(index)}
                            className={cn(
                              'relative w-8 h-[18px] rounded-full transition-colors',
                              config.triageEnabled ? 'bg-blue-500' : 'bg-[var(--bg-surface-hover)]'
                            )}
                            title={config.triageEnabled ? 'Triage button visible' : 'Triage button hidden'}
                          >
                            <div className={cn(
                              'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform',
                              config.triageEnabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
                            )} />
                          </button>
                          <span className="text-[8px] text-[var(--text-muted)]">triage</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: Triage Prompt Editor */}
                    {isExpanded && (
                      <div className="px-3 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                            Triage Prompt for {config.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {isCustomized && (
                              <button
                                onClick={() => resetTriagePrompt(index)}
                                className="text-[9px] text-orange-400 hover:text-orange-300 transition-colors"
                              >
                                ↺ Reset to default
                              </button>
                            )}
                            {!isCustomized && (
                              <span className="text-[9px] text-green-400">Using smart default</span>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={activePrompt}
                          onChange={(e) => updateTriagePrompt(index, e.target.value)}
                          rows={6}
                          className="w-full text-[11px] leading-relaxed bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/40 resize-y min-h-[80px]"
                          placeholder="Tell Divi what to do when triaging this signal..."
                        />
                        <p className="text-[9px] text-[var(--text-muted)] mt-1.5">
                          This prompt tells Divi exactly what to look for, how to prioritize, and what actions to take when triaging {config.name}.
                          {!isCustomized && ' Edit to customize — it starts with a smart default based on the signal type.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
          <p className="text-[10px] text-[var(--text-muted)]">
            {dirty ? '⚠ Unsaved changes' : '✓ Saved'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={cn(
                'text-xs px-4 py-1.5 rounded-lg font-medium transition-all',
                dirty && !saving
                  ? 'bg-[var(--brand-primary)] text-white hover:opacity-90'
                  : 'bg-[var(--bg-surface-hover)] text-[var(--text-muted)] cursor-not-allowed'
              )}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
