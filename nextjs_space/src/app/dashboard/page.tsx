'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import { Walkthrough } from '@/components/dashboard/Walkthrough';
import type { CenterTab } from '@/types';

type MobilePanel = 'now' | 'center' | 'queue';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');
  const [mode, setMode] = useState<'cockpit' | 'chief_of_staff'>('cockpit');
  const [modeLoading, setModeLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center');
  const [commsUnread, setCommsUnread] = useState(0);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMode(d.data.user.mode);
          if (!d.data.user.hasSeenWalkthrough) {
            setTimeout(() => setShowWalkthrough(true), 600);
          }
          setSettingsLoaded(true);
        }
      })
      .catch(() => setSettingsLoaded(true));

    // Fetch comms unread count
    fetch('/api/comms/unread')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCommsUnread(d.data.count); })
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
      <header className="flex-shrink-0 px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between border-b border-[var(--border-color)] gap-2">
        {/* Left: Brand */}
        <Link href="/dashboard" className="flex items-center gap-1.5 md:gap-2 flex-shrink-0" data-walkthrough="brand">
          <span className="text-lg md:text-xl text-brand-400">⬡</span>
          <span className="font-bold text-brand-400 text-base md:text-lg tracking-tight">DiviDen</span>
        </Link>

        {/* Center: Open Source Banner — hidden on mobile */}
        {showBanner && (
          <div className="hidden md:flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-full px-3 py-1">
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
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Mode Toggle Switch */}
          <button
            onClick={toggleMode}
            disabled={modeLoading}
            className="flex items-center gap-2 md:gap-2.5 group"
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
            <div
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                mode === 'chief_of_staff'
                  ? 'bg-[var(--brand-primary)]'
                  : 'bg-[var(--bg-surface-hover)]'
              }`}
            >
              <div
                className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  mode === 'chief_of_staff' ? 'translate-x-[22px]' : 'translate-x-[3px]'
                }`}
              />
            </div>
          </button>

          {/* Comms Channel */}
          <button
            onClick={() => router.push('/dashboard/comms')}
            className="relative text-[var(--text-muted)] hover:text-brand-400 transition-colors p-1"
            title="Comms Channel"
            data-walkthrough="comms"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {commsUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--brand-primary)] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {commsUnread > 9 ? '9+' : commsUnread}
              </span>
            )}
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

      {/* ── Desktop: 3-column layout ── */}
      <div className="hidden md:flex flex-1 gap-3 p-3 min-h-0">
        <div className="w-72 flex-shrink-0" data-walkthrough="now-panel">
          <NowPanel onNewTask={() => {}} onQuickChat={() => setActiveTab('chat')} />
        </div>
        <div className="flex-1 min-w-0" data-walkthrough="center-panel">
          <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="w-72 flex-shrink-0" data-walkthrough="queue-panel">
          <QueuePanel />
        </div>
      </div>

      {/* ── Mobile: Single panel + bottom nav ── */}
      <div className="flex md:hidden flex-1 flex-col min-h-0">
        {/* Active panel */}
        <div className="flex-1 min-h-0 p-2 overflow-hidden">
          {mobilePanel === 'now' && (
            <div className="h-full" data-walkthrough="now-panel">
              <NowPanel onNewTask={() => {}} onQuickChat={() => { setActiveTab('chat'); setMobilePanel('center'); }} />
            </div>
          )}
          {mobilePanel === 'center' && (
            <div className="h-full" data-walkthrough="center-panel">
              <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}
          {mobilePanel === 'queue' && (
            <div className="h-full" data-walkthrough="queue-panel">
              <QueuePanel />
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <nav className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1.5 flex justify-around safe-bottom">
          {([
            { id: 'now' as MobilePanel, label: 'NOW', icon: '⚡' },
            { id: 'center' as MobilePanel, label: 'Workspace', icon: '💬' },
            { id: 'queue' as MobilePanel, label: 'Queue', icon: '📋' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobilePanel(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                mobilePanel === tab.id
                  ? 'text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
          {/* Comms — navigates to dedicated page */}
          <button
            onClick={() => router.push('/dashboard/comms')}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors text-[var(--text-muted)]"
          >
            <span className="text-lg leading-none">📡</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">Comms</span>
            {commsUnread > 0 && (
              <span className="absolute top-0.5 right-1 bg-[var(--brand-primary)] text-white text-[7px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {commsUnread > 9 ? '9+' : commsUnread}
              </span>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}