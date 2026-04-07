'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import { Walkthrough } from '@/components/dashboard/Walkthrough';
import type { CenterTab } from '@/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');
  const [mode, setMode] = useState<'cockpit' | 'chief_of_staff'>('cockpit');
  const [modeLoading, setModeLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMode(d.data.user.mode);
          // Show walkthrough for first-time users
          if (!d.data.user.hasSeenWalkthrough) {
            // Small delay to let the dashboard render first
            setTimeout(() => setShowWalkthrough(true), 600);
          }
          setSettingsLoaded(true);
        }
      })
      .catch(() => setSettingsLoaded(true));
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

  const handleWalkthroughComplete = useCallback(async () => {
    setShowWalkthrough(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenWalkthrough: true }),
      });
    } catch {
      // silent
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Walkthrough overlay */}
      {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}

      {/* ── Top Header Bar ────────────────────────────────────── */}
      <header className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-color)]">
        {/* Left: Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0" data-walkthrough="brand">
          <span className="text-xl text-brand-400">⬡</span>
          <span className="font-bold text-brand-400 text-lg tracking-tight">DiviDen</span>
        </Link>

        {/* Center: Open Source Banner */}
        {showBanner && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-full px-3 py-1">
            <span className="label-mono-accent" style={{ fontSize: '10px' }}>Open Source</span>
            <span className="text-[var(--text-muted)]">—</span>
            <a
              href="https://github.com/jonnyuniverse/dividenapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Fork it, build on it, make it yours
            </a>
            <button
              onClick={() => setShowBanner(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Right: Mode Toggle + Settings + Sign Out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mode Toggle Switch */}
          <button
            onClick={toggleMode}
            disabled={modeLoading}
            className="flex items-center gap-2.5 group"
            data-walkthrough="mode-toggle"
            title={
              mode === 'cockpit'
                ? 'Cockpit: You drive, AI assists'
                : 'Chief of Staff: AI drives, you approve'
            }
          >
            <span className="label-mono text-[var(--text-muted)] hidden sm:inline" style={{ fontSize: '10px' }}>
              {mode === 'cockpit' ? 'Cockpit' : 'Chief of Staff'}
            </span>
            {/* Toggle track */}
            <div
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                mode === 'chief_of_staff'
                  ? 'bg-[var(--brand-primary)]'
                  : 'bg-[var(--bg-surface-hover)]'
              }`}
            >
              {/* Toggle knob */}
              <div
                className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  mode === 'chief_of_staff' ? 'translate-x-[22px]' : 'translate-x-[3px]'
                }`}
              />
            </div>
          </button>

          <div className="w-px h-5 bg-[var(--border-color)]" />

          {/* Settings */}
          <Link
            href="/settings"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            title="Settings"
            data-walkthrough="settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
            title="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Dashboard: 3-column layout ───────────────────── */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* NOW Panel - Left */}
        <div className="w-72 flex-shrink-0" data-walkthrough="now-panel">
          <NowPanel
            onNewTask={() => {}}
            onQuickChat={() => setActiveTab('chat')}
          />
        </div>

        {/* Center Panel - Main */}
        <div className="flex-1 min-w-0" data-walkthrough="center-panel">
          <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Queue Panel - Right */}
        <div className="w-72 flex-shrink-0" data-walkthrough="queue-panel">
          <QueuePanel />
        </div>
      </div>
    </div>
  );
}