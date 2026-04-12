'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import { ChiefOfStaffView } from '@/components/dashboard/ChiefOfStaffView';
import { Walkthrough } from '@/components/dashboard/Walkthrough';
import { GlobalSearch } from '@/components/dashboard/GlobalSearch';
import { CockpitBanners } from '@/components/dashboard/CockpitBanners';
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';
import { KeyboardNav } from '@/components/dashboard/KeyboardNav';
import { CatchUpSettings } from '@/components/dashboard/CatchUpSettings';
import type { CenterTab } from '@/types';
import { getSignalTriagePrompt, getCatchUpPrompt, type SignalCatchUpConfig } from '@/lib/signals';

type MobilePanel = 'now' | 'center' | 'queue';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');
  const [mode, setMode] = useState<'cockpit' | 'chief_of_staff'>('cockpit');
  const [modeLoading, setModeLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center');
  const [commsUnread, setCommsUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catchUpSettingsOpen, setCatchUpSettingsOpen] = useState(false);

  // DEP-007: Desktop notifications
  const { sendNotification } = useDesktopNotifications({
    desktopNotifications: true,
    desktopNotifQueue: true,
    desktopNotifComms: true,
  });

  const [marketplacePrefill, setMarketplacePrefill] = useState<any>(null);
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const handleNowItemClick = useCallback((title: string) => {
    setChatPrefill(`Help me with: ${title}`);
    setActiveTab('chat');
  }, []);

  /** Triage a specific signal — uses user's custom prompt if set, else smart default */
  const handleTriage = useCallback(async (signalId: string) => {
    try {
      const res = await fetch('/api/signals/config');
      const json = await res.json();
      if (json.success) {
        const signalConfig = json.data.find((s: any) => s.signalId === signalId);
        if (signalConfig?.triagePrompt) {
          setChatPrefill(signalConfig.triagePrompt);
        } else {
          setChatPrefill(getSignalTriagePrompt(signalId));
        }
      } else {
        setChatPrefill(getSignalTriagePrompt(signalId));
      }
    } catch {
      setChatPrefill(getSignalTriagePrompt(signalId));
    }
    setActiveTab('chat');
    setMobilePanel('center');
  }, []);

  /** Catch Up — triage ALL connected signals at once, respecting user config */
  const handleCatchUp = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/config');
      const json = await res.json();
      const configs: SignalCatchUpConfig[] = json.success ? json.data : [];
      const prompt = getCatchUpPrompt(configs);
      setChatPrefill(prompt);
    } catch {
      // Fallback to default prompt if config fetch fails
      setChatPrefill(getCatchUpPrompt());
    }
    setActiveTab('chat');
    setMobilePanel('center');
  }, []);

  // Handle onboarding completion — trigger Divi's intro conversation
  const handleOnboardingComplete = useCallback(async (options?: { triggerDiviIntro?: boolean }) => {
    setShowOnboarding(false);
    setActiveTab('chat');

    if (options?.triggerDiviIntro) {
      // Send a hidden system message that triggers Divi's self-introduction
      try {
        await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '[SYSTEM: User just completed onboarding setup. Introduce yourself warmly. Explain what you can do across all your capabilities (task management, CRM, email, calendar, marketplace, goals, connections). Then enthusiastically encourage them to connect their email — explain that this is the #1 way to see your value immediately. Offer to help them do it step-by-step. Frame it as: "Let me show you what I can do — connect your email and I\'ll read through everything, tell you what needs attention right now, and draft responses for the urgent ones. It\'s the fastest way to see the impact." Be direct, builder-log tone, not salesy. Keep it concise but compelling.]',
          }),
        });
        // The chat view will auto-scroll to show Divi's response
        setChatPrefill(null);
      } catch {
        // Silent — chat will still work normally
      }
    }
  }, []);

  // Check for tab navigation from Comms/Extensions/Connections pages or URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL query param first
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        setActiveTab(tabParam as CenterTab);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
      const openTab = sessionStorage.getItem('openTab');
      if (openTab) {
        setActiveTab(openTab as CenterTab);
        sessionStorage.removeItem('openTab');
      }
      const prefill = sessionStorage.getItem('marketplacePrefill');
      if (prefill) {
        try { setMarketplacePrefill(JSON.parse(prefill)); } catch {}
        sessionStorage.removeItem('marketplacePrefill');
      }
    }
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMode(d.data.user.mode);
          setUserName(d.data.user.name || undefined);
          if (!d.data.user.hasSeenWalkthrough) {
            setTimeout(() => setShowWalkthrough(true), 600);
          } else if (!d.data.user.hasCompletedOnboarding) {
            setTimeout(() => setShowOnboarding(true), 400);
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

  // ⌘K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleMode = useCallback(async () => {
    const newMode = mode === 'cockpit' ? 'chief_of_staff' : 'cockpit';
    setModeLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      setMode(newMode);

      // DEP-007: Desktop notification for mode switch events
      if (data.autoDispatched) {
        sendNotification('task_completed', 'Task Auto-Dispatched',
          `"${data.autoDispatched.title}" is now in progress`);
      }
      if (data.briefing) {
        sendNotification('task_completed', 'Welcome Back to Cockpit', data.briefing.message);
      }
    } catch {
      // silent
    } finally {
      setModeLoading(false);
    }
  }, [mode, sendNotification]);

  const handleWalkthroughComplete = useCallback(async () => {
    setShowWalkthrough(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenWalkthrough: true }),
      });
      // Show onboarding after walkthrough completes
      setTimeout(() => setShowOnboarding(true), 300);
    } catch {
      // silent
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Walkthrough overlay */}
      {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}

      {/* Onboarding wizard — fires after walkthrough or if walkthrough was already seen */}
      {/* Now renders inline in the layout below, not as a modal */}

      {/* Keyboard navigation (global hotkeys + ? overlay) */}
      <KeyboardNav
        onTabChange={setActiveTab}
        onToggleSearch={() => setSearchOpen((o) => !o)}
      />

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as CenterTab)}
      />

      {/* Catch Up Settings */}
      <CatchUpSettings
        open={catchUpSettingsOpen}
        onClose={() => setCatchUpSettingsOpen(false)}
      />

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
              href="https://github.com/Denominator-Ventures/dividen"
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

        {/* Right: Mode Toggle + Nav + Sign Out */}
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
              {mode === 'cockpit' ? '🎛️ Cockpit' : '🔭 Chief of Staff'}
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

          {/* Cockpit-only nav buttons — hidden in CoS mode */}
          {mode === 'cockpit' && (
            <>
              {/* Global Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)]"
                title="Search (⌘K)"
                data-walkthrough="search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="hidden sm:inline text-[11px]">Search</span>
                <kbd className="hidden md:inline-flex items-center px-1 py-0.5 text-[9px] text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded font-mono ml-1">
                  ⌘K
                </kbd>
              </button>

              {/* Catch Up — triage all signals + settings */}
              <div className="flex items-center">
                <button
                  onClick={handleCatchUp}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-l-md text-[11px] font-medium transition-all bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/30 border-r-0"
                  title="Catch up on all signals — Divi triages everything"
                >
                  <span className="text-sm">🔄</span>
                  <span className="hidden sm:inline">Catch Up</span>
                </button>
                <button
                  onClick={() => setCatchUpSettingsOpen(true)}
                  className="flex items-center px-1.5 py-1 rounded-r-md text-[11px] transition-all bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/30"
                  title="Catch Up settings — priority & exclusions"
                >
                  <span className="text-xs">⚙</span>
                </button>
              </div>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Comms Channel */}
              <button
                onClick={() => router.push('/dashboard/comms')}
                className="relative text-[var(--text-muted)] hover:text-brand-400 transition-colors p-1"
                title="Comms Channel"
                data-walkthrough="comms"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
                  <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
                </svg>
                {commsUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--brand-primary)] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {commsUnread > 9 ? '9+' : commsUnread}
                  </span>
                )}
              </button>

              <div className="w-px h-5 bg-[var(--border-color)]" />

              {/* Profile */}
              <button
                onClick={() => setActiveTab('profile')}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                title="Your Profile"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

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
            </>
          )}

          {/* Sign Out — always visible */}
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

      {/* ── Chief of Staff mode: locked-down observer view ── */}
      {mode === 'chief_of_staff' ? (
        <div className="flex-1 min-h-0">
          <ChiefOfStaffView onIntervene={() => {}} />
        </div>
      ) : (
        <>
          {/* ── Cockpit Notification Banners ── */}
          <CockpitBanners mode={mode} />

          {/* ── Desktop: 3-column layout (or onboarding center) ── */}
          {showOnboarding && !showWalkthrough ? (
            <div className="hidden md:flex flex-1 items-center justify-center p-6 min-h-0">
              <OnboardingWizard userName={userName} onComplete={handleOnboardingComplete} />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 gap-3 p-3 min-h-0">
              <div className="w-72 flex-shrink-0" data-walkthrough="now-panel">
                <NowPanel onNewTask={() => {}} onQuickChat={() => setActiveTab('chat')} onItemClick={handleNowItemClick} onOpenBoard={() => setActiveTab('kanban')} onOpenEarnings={() => setActiveTab('earnings')} />
              </div>
              <div className="flex-1 min-w-0" data-walkthrough="center-panel">
                <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} marketplacePrefill={marketplacePrefill} onMarketplacePrefillConsumed={() => setMarketplacePrefill(null)} chatPrefill={chatPrefill} onChatPrefillConsumed={() => setChatPrefill(null)} onTriage={handleTriage} onOpenCatchUpSettings={() => setCatchUpSettingsOpen(true)} />
              </div>
              <div className="w-72 flex-shrink-0" data-walkthrough="queue-panel">
                <QueuePanel onNavigateToMarketplace={() => setActiveTab('marketplace')} />
              </div>
            </div>
          )}

          {/* ── Mobile: Single panel + bottom nav ── */}
          <div className="flex md:hidden flex-1 flex-col min-h-0">
            {/* Active panel */}
            <div className="flex-1 min-h-0 p-1 flex flex-col">
              {showOnboarding && !showWalkthrough ? (
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  <OnboardingWizard userName={userName} onComplete={handleOnboardingComplete} />
                </div>
              ) : (
                <>
                  {mobilePanel === 'now' && (
                    <div className="flex-1 min-h-0" data-walkthrough="now-panel">
                      <NowPanel onNewTask={() => {}} onQuickChat={() => { setActiveTab('chat'); setMobilePanel('center'); }} onItemClick={(title) => { handleNowItemClick(title); setMobilePanel('center'); }} onOpenBoard={() => { setActiveTab('kanban'); setMobilePanel('center'); }} onOpenEarnings={() => { setActiveTab('earnings'); setMobilePanel('center'); }} />
                    </div>
                  )}
                  {mobilePanel === 'center' && (
                    <div className="flex-1 min-h-0" data-walkthrough="center-panel">
                      <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} marketplacePrefill={marketplacePrefill} onMarketplacePrefillConsumed={() => setMarketplacePrefill(null)} chatPrefill={chatPrefill} onChatPrefillConsumed={() => setChatPrefill(null)} onTriage={handleTriage} onOpenCatchUpSettings={() => setCatchUpSettingsOpen(true)} />
                    </div>
                  )}
                  {mobilePanel === 'queue' && (
                    <div className="flex-1 min-h-0" data-walkthrough="queue-panel">
                      <QueuePanel onNavigateToMarketplace={() => { setActiveTab('marketplace'); setMobilePanel('center'); }} />
                    </div>
                  )}
                </>
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
        </>
      )}
    </div>
  );
}