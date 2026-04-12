'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WorkingStyle {
  verbosity: number;
  proactivity: number;
  autonomy: number;
  formality: number;
}

interface TriageSettings {
  autoMerge: boolean;
  autoRouteToBoard: boolean;
  triageStyle: 'task-first' | 'card-per-item' | 'minimal';
}

interface DiviSettingsProps {
  diviName: string | null;
  workingStyle: WorkingStyle | null;
  triageSettings: TriageSettings | null;
  goalsEnabled: boolean;
}

const STYLE_LABELS: Record<string, { low: string; high: string; description: string }> = {
  verbosity: { low: 'Concise', high: 'Detailed', description: 'How much context and detail in responses' },
  proactivity: { low: 'Reactive', high: 'Proactive', description: 'Surface suggestions vs wait for instructions' },
  autonomy: { low: 'Ask First', high: 'Act & Report', description: 'How much independence on routine decisions' },
  formality: { low: 'Casual', high: 'Professional', description: 'Tone and language register' },
};

const TRIAGE_STYLE_INFO: Record<string, { label: string; description: string }> = {
  'task-first': { label: 'Task-First (Default)', description: 'Extracts tasks from signals, routes them to existing project cards. Board converges over time.' },
  'card-per-item': { label: 'Card Per Item', description: 'Creates a new card for each signal item. More cards, less convergence. Good for high-volume tracking.' },
  'minimal': { label: 'Minimal', description: 'Light-touch triage. Summarizes signals without heavy board manipulation. Good for observers.' },
};

export function DiviSettings({ diviName: initialName, workingStyle: initialStyle, triageSettings: initialTriage, goalsEnabled: initialGoals }: DiviSettingsProps) {
  const [diviName, setDiviName] = useState(initialName || '');
  const [style, setStyle] = useState<WorkingStyle>(initialStyle || { verbosity: 3, proactivity: 4, autonomy: 3, formality: 2 });
  const [triage, setTriage] = useState<TriageSettings>(initialTriage || { autoMerge: true, autoRouteToBoard: false, triageStyle: 'task-first' });
  const [goalsEnabled, setGoalsEnabled] = useState(initialGoals);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useCallback(async (data: any) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diviSettings: data }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save Divi settings:', e);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSaveAll = () => {
    save({
      diviName: diviName || null,
      workingStyle: style,
      triageSettings: triage,
      goalsEnabled,
    });
  };

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="font-semibold">Agent Name</h2>
        </div>
        <div className="panel-body space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Give your agent a custom name. This changes how it refers to itself in conversations.
          </p>
          <input
            type="text"
            value={diviName}
            onChange={(e) => setDiviName(e.target.value)}
            placeholder="Divi"
            className="input-field w-full max-w-xs"
            maxLength={30}
          />
          <p className="text-[10px] text-[var(--text-muted)]">Leave empty for default ("Divi")</p>
        </div>
      </div>

      {/* Working Style */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="font-semibold">Working Style</h2>
        </div>
        <div className="panel-body space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Tune how your agent communicates and operates. These preferences shape its behavior across all interactions.
          </p>
          {Object.entries(STYLE_LABELS).map(([key, labels]) => {
            const value = style[key as keyof WorkingStyle];
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium capitalize">{key}</span>
                    <p className="text-[10px] text-[var(--text-muted)]">{labels.description}</p>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">{value}/5</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{labels.low}</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={value}
                    onChange={(e) => setStyle(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="flex-1 accent-[var(--brand-primary)] h-1.5"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] w-16">{labels.high}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Triage & Organization */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="font-semibold">Triage & Organization</h2>
        </div>
        <div className="panel-body space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Control how your agent organizes incoming signals and manages your board.
          </p>

          {/* Auto-Merge */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-medium">Auto-Merge Cards</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                When on, your agent automatically consolidates duplicate project cards and tells you what changed. You can always ask it to undo a merge.
              </p>
            </div>
            <button
              onClick={() => setTriage(prev => ({ ...prev, autoMerge: !prev.autoMerge }))}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
                triage.autoMerge ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-surface-hover)]'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                triage.autoMerge ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Auto-Route to Board */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-medium">Auto-Route to Board</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                When on, your agent may add items to the board during triage without asking first. Faster, but may create cards you don't want.
              </p>
              {triage.autoRouteToBoard && (
                <p className="text-[10px] text-orange-400 mt-1">⚠️ This means your agent will add to your board without explicit approval on each item.</p>
              )}
            </div>
            <button
              onClick={() => setTriage(prev => ({ ...prev, autoRouteToBoard: !prev.autoRouteToBoard }))}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
                triage.autoRouteToBoard ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-surface-hover)]'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                triage.autoRouteToBoard ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Triage Style */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Triage Style</span>
            <div className="space-y-2">
              {Object.entries(TRIAGE_STYLE_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setTriage(prev => ({ ...prev, triageStyle: key as TriageSettings['triageStyle'] }))}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    triage.triageStyle === key
                      ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/5'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--brand-primary)]/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', triage.triageStyle === key ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-surface-hover)]')} />
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-4">{info.description}</p>
                </button>
              ))}
            </div>
            {triage.triageStyle !== 'task-first' && (
              <p className="text-[10px] text-orange-400">⚠️ Changing triage style affects how your agent organizes your board. The default "Task-First" approach converges your board over time.</p>
            )}
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="font-semibold">Goals</h2>
        </div>
        <div className="panel-body space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-medium">Enable Goals</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Goals give your agent additional context for prioritizing your board. They're optional — your agent works fine without them.
              </p>
            </div>
            <button
              onClick={() => setGoalsEnabled(prev => !prev)}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
                goalsEnabled ? 'bg-[var(--brand-primary)]' : 'bg-[var(--bg-surface-hover)]'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                goalsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
          {goalsEnabled && (
            <p className="text-xs text-[var(--text-secondary)]">
              When enabled, you can manage goals from the Goals section in Chat. Your agent will consider active goals when prioritizing the board and suggesting next actions.
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-xs text-green-400">✓ Saved</span>}
      </div>
    </div>
  );
}
