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
      {/* Top Bar: Mode Toggle + Open Source Banner */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1 flex items-center justify-between gap-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMode}
            disabled={modeLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border border-[var(--border-primary)] hover:border-brand-600/50"
            title={
              mode === 'cockpit'
                ? 'Cockpit: You drive, AI assists'
                : 'Chief of Staff: AI drives, you approve'
            }
          >
            <span className="text-lg">{mode === 'cockpit' ? '🎮' : '🎯'}</span>
            <span className="text-[var(--text-primary)]">
              {mode === 'cockpit' ? 'Cockpit Mode' : 'Chief of Staff'}
            </span>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              {mode === 'cockpit'
                ? '— you drive, AI assists'
                : '— AI drives, you approve'}
            </span>
          </button>
        </div>

        {/* Open Source Banner */}
        {showBanner && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5">
            <span>⬡</span>
            <span>
              DiviDen is open source.{' '}
              <a
                href="https://github.com/jonnyuniverse/dividenapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 font-medium"
              >
                Fork it, build on it, make it yours →
              </a>
            </span>
            <button
              onClick={() => setShowBanner(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Dashboard */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* NOW Panel - Left */}
        <div className="w-72 flex-shrink-0">
          <NowPanel
            onNewTask={() => {}}
            onQuickChat={() => setActiveTab('chat')}
          />
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
