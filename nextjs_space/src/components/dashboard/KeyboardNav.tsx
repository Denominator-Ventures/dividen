'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CenterTab } from '@/types';

interface KeyboardNavProps {
  onTabChange: (tab: CenterTab) => void;
  onToggleSearch: () => void;
}

const SHORTCUTS: { key: string; label: string; description: string; section: string }[] = [
  // Navigation
  { key: '1', label: '1', description: 'Chat with Divi', section: 'Tabs' },
  { key: '2', label: '2', description: 'Kanban Board', section: 'Tabs' },
  { key: '3', label: '3', description: 'CRM Contacts', section: 'Tabs' },
  { key: '4', label: '4', description: 'Calendar', section: 'Tabs' },
  { key: '5', label: '5', description: 'Email', section: 'Tabs' },
  { key: '6', label: '6', description: 'Recordings', section: 'Tabs' },
  { key: '7', label: '7', description: 'Drive', section: 'Tabs' },
  { key: '8', label: '8', description: 'Connections', section: 'Tabs' },
  { key: '9', label: '9', description: 'Bubble Store', section: 'Tabs' },
  { key: '0', label: '0', description: 'Goals', section: 'Tabs' },
  // Global
  { key: '⌘K', label: '⌘K', description: 'Search', section: 'Global' },
  { key: '/', label: '/', description: 'Focus search', section: 'Global' },
  { key: '?', label: '?', description: 'Show shortcuts', section: 'Global' },
  { key: 'Esc', label: 'Esc', description: 'Close overlay', section: 'Global' },
];

const TAB_MAP: Record<string, CenterTab> = {
  '1': 'chat',
  '2': 'kanban',
  '3': 'crm',
  '4': 'calendar',
  '5': 'inbox',
  '6': 'recordings',
  '7': 'drive',
  '8': 'connections',
  '9': 'marketplace',
  '0': 'goals',
};

export function KeyboardNav({ onTabChange, onToggleSearch }: KeyboardNavProps) {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't fire if typing in an input/textarea/contenteditable
    const tag = (e.target as HTMLElement).tagName;
    const isEditable = (e.target as HTMLElement).isContentEditable;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

    // ? → show shortcuts
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      setShowOverlay((v) => !v);
      return;
    }

    // Escape → close overlay
    if (e.key === 'Escape') {
      setShowOverlay(false);
      return;
    }

    // Number keys → tab navigation
    if (TAB_MAP[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onTabChange(TAB_MAP[e.key]);
      return;
    }

    // / → focus search
    if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onToggleSearch();
      return;
    }
  }, [onTabChange, onToggleSearch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!showOverlay) return null;

  const sections = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    if (!acc[s.section]) acc[s.section] = [];
    acc[s.section].push(s);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowOverlay(false)}
    >
      <div
        className="w-full max-w-md mx-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[var(--text-primary)]">⌨️ Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowOverlay(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <kbd className="px-2 py-0.5 text-[10px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded font-mono">Esc</kbd>
          </button>
        </div>

        {Object.entries(sections).map(([section, shortcuts]) => (
          <div key={section} className="mb-4 last:mb-0">
            <h3 className="label-mono text-[var(--text-muted)] mb-2" style={{ fontSize: '10px' }}>{section}</h3>
            <div className="space-y-1">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-surface-hover)] transition-colors">
                  <span className="text-xs text-[var(--text-secondary)]">{s.description}</span>
                  <kbd className="px-2 py-0.5 text-[10px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded font-mono text-[var(--text-muted)] min-w-[28px] text-center">
                    {s.label}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-center">
          <span className="text-[10px] text-[var(--text-muted)]">Press <kbd className="font-mono">?</kbd> anywhere to toggle this overlay</span>
        </div>
      </div>
    </div>
  );
}
