'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NotificationPrefs {
  enabled: boolean;
  categories: Record<string, boolean>;
}

const CATEGORY_INFO: { id: string; label: string; icon: string; description: string }[] = [
  { id: 'board', label: 'Board', icon: '\uD83D\uDDC2\uFE0F', description: 'Card created, moved, completed' },
  { id: 'queue', label: 'Queue & Tasks', icon: '\u26A1', description: 'Tasks queued, dispatched, status changes' },
  { id: 'comms', label: 'Comms', icon: '\uD83D\uDCE1', description: 'Relay messages sent & received' },
  { id: 'connections', label: 'Connections', icon: '\uD83E\uDD1D', description: 'New connections, requests accepted' },
  { id: 'teams', label: 'Teams', icon: '\uD83D\uDC65', description: 'Team membership changes' },
  { id: 'projects', label: 'Projects', icon: '\uD83D\uDCC1', description: 'Project created, invitations' },
  { id: 'crm', label: 'CRM', icon: '\uD83D\uDC64', description: 'Contacts added or updated' },
  { id: 'calendar', label: 'Calendar', icon: '\uD83D\uDCC5', description: 'Events created or changed' },
  { id: 'goals', label: 'Goals', icon: '\uD83C\uDFAF', description: 'Goals completed, milestones' },
  { id: 'marketplace', label: 'Bubble Store', icon: '\uD83E\uDEE7', description: 'Agent installations, executions' },
  { id: 'federation', label: 'Federation', icon: '\uD83C\uDF10', description: 'Cross-instance activity' },
  { id: 'drive', label: 'Drive', icon: '\uD83D\uDCC4', description: 'Documents and recordings' },
  { id: 'intelligence', label: 'Intelligence', icon: '\uD83E\uDDE0', description: 'Ambient learnings generated' },
];

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      const d = await res.json();
      if (d.success) {
        setPrefs(d.data);
        setLoaded(true);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const savePrefs = useCallback(async (updated: NotificationPrefs) => {
    setSaving(true);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleMaster = () => {
    if (!prefs) return;
    const updated = { ...prefs, enabled: !prefs.enabled };
    setPrefs(updated);
    savePrefs(updated);
  };

  const toggleCategory = (cat: string) => {
    if (!prefs) return;
    const updated = {
      ...prefs,
      categories: { ...prefs.categories, [cat]: !prefs.categories[cat] },
    };
    setPrefs(updated);
    savePrefs(updated);
  };

  const allOff = () => {
    if (!prefs) return;
    const cats: Record<string, boolean> = {};
    for (const key of Object.keys(prefs.categories)) cats[key] = false;
    const updated = { ...prefs, categories: cats };
    setPrefs(updated);
    savePrefs(updated);
  };

  const allOn = () => {
    if (!prefs) return;
    const cats: Record<string, boolean> = {};
    for (const key of Object.keys(prefs.categories)) cats[key] = true;
    const updated = { ...prefs, categories: cats };
    setPrefs(updated);
    savePrefs(updated);
  };

  if (!loaded) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading preferences...</div>;
  }

  if (!prefs) return null;

  const enabledCount = Object.values(prefs.categories).filter(Boolean).length;
  const totalCount = Object.keys(prefs.categories).length;

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div>
          <div className="text-sm font-medium text-[var(--text-primary)]">Notifications</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {prefs.enabled ? `${enabledCount}/${totalCount} categories active` : 'All notifications paused'}
          </div>
        </div>
        <button
          onClick={toggleMaster}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            prefs.enabled ? 'bg-brand-500' : 'bg-white/10'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              prefs.enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* Category toggles */}
      {prefs.enabled && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Categories</span>
            <div className="flex gap-2">
              <button onClick={allOn} className="text-[10px] text-brand-400 hover:text-brand-300">
                Enable all
              </button>
              <span className="text-[var(--text-muted)] text-[10px]">|</span>
              <button onClick={allOff} className="text-[10px] text-[var(--text-muted)] hover:text-red-400">
                Disable all
              </button>
            </div>
          </div>

          <div className="grid gap-1">
            {CATEGORY_INFO.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{cat.icon}</span>
                  <div>
                    <div className="text-xs text-[var(--text-primary)]">{cat.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{cat.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    'relative w-8 h-4 rounded-full transition-colors flex-shrink-0',
                    prefs.categories[cat.id] ? 'bg-brand-500' : 'bg-white/10'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                      prefs.categories[cat.id] ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {saving && (
        <div className="text-[10px] text-[var(--text-muted)] text-center">Saving...</div>
      )}
    </div>
  );
}
