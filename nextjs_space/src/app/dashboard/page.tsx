'use client';

import { useState, useEffect, useCallback } from 'react';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import type { CenterTab } from '@/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');
  const [mode, setMode] = useState<'cockpit' | 'chief_of_staff'>('cockpit');
  const [modeLoading, setModeLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMode(d.data.user.mode);
      })
      .catch(() => {});
  }, []);

  const toggleMode = useCallback(async () => {
    const newMode = mode === 'cockpit' ? 'chief_of_staff' : 'cockpit';
    setModeLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      setMode(newMode);
    } catch {
      // silent
    } finally {
      setModeLoading(false);
    }
  }, [mode]);

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1 flex items-center justify-between gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMode}
            disabled={modeLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border border-[var(--border-color)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--bg-surface)]"
            title={
              mode === 'cockpit'
                ? 'Cockpit: You drive, AI assists'
                : 'Chief of Staff: AI drives, you approve'
            }
          >
            <span className="text-lg">{mode === 'cockpit' ? '🎮' : '🎯'}</span>
            <span className="text-[var(--text-primary)] font-medium">
              {mode === 'cockpit' ? 'Cockpit' : 'Chief of Staff'}
            </span>
            <span className="label-mono hidden sm:inline" style={{ fontSize: '10px' }}>
              {mode === 'cockpit'
                ? 'you drive'
                : 'ai drives'}
            </span>
          </button>
        </div>

        {/* Open Source Banner */}
        {showBanner && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
            <span className="label-mono-accent" style={{ fontSize: '10px' }}>Open Source</span>
            <span className="text-[var(--text-muted)]">—</span>
            <a
              href="https://github.com/jonnyuniverse/dividenapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Fork it, build on it, make it yours →
            </a>
            <button
              onClick={() => setShowBanner(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Dashboard */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* NOW Panel - Left: Collapsible sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-72' : 'w-14'
          }`}
        >
          {sidebarOpen ? (
            <NowPanel
              onNewTask={() => {}}
              onQuickChat={() => setActiveTab('chat')}
              onCollapse={() => setSidebarOpen(false)}
            />
          ) : (
            <CollapsedSidebar
              onExpand={() => setSidebarOpen(true)}
              onTabChange={setActiveTab}
            />
          )}
        </div>

        {/* Center Panel - Main */}
        <div className="flex-1 min-w-0">
          <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Queue Panel - Right */}
        <div className="w-72 flex-shrink-0">
          <QueuePanel />
        </div>
      </div>
    </div>
  );
}

/* ── Collapsed sidebar: thin icon strip ───────────────────────────────────────── */

function CollapsedSidebar({
  onExpand,
  onTabChange,
}: {
  onExpand: () => void;
  onTabChange: (tab: CenterTab) => void;
}) {
  const iconBtn = "w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all";

  return (
    <div className="panel h-full flex flex-col items-center py-3 gap-1">
      <button onClick={onExpand} className={iconBtn} title="Expand sidebar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>

      <div className="w-6 border-t border-[var(--border-color)] my-1" />

      <button onClick={onExpand} className={iconBtn} title="Focus / NOW">
        <span className="text-lg">⚡</span>
      </button>
      <button onClick={() => onTabChange('chat')} className={iconBtn} title="Chat">
        <span className="text-lg">💬</span>
      </button>
      <button onClick={() => onTabChange('kanban')} className={iconBtn} title="Kanban Board">
        <span className="text-lg">📋</span>
      </button>
      <button onClick={() => onTabChange('crm')} className={iconBtn} title="CRM">
        <span className="text-lg">👥</span>
      </button>

      <div className="w-6 border-t border-[var(--border-color)] my-1" />

      <a href="/settings" className={iconBtn} title="Settings">
        <span className="text-lg">⚙️</span>
      </a>

      <div className="mt-auto" />

      <a href="/docs/integrations" className={iconBtn} title="Integration Docs">
        <span className="text-lg">📖</span>
      </a>
    </div>
  );
}
