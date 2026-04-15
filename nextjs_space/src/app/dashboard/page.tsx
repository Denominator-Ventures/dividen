'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NowPanel } from '@/components/dashboard/NowPanel';
import { CenterPanel } from '@/components/dashboard/CenterPanel';
import { QueuePanel } from '@/components/dashboard/QueuePanel';
import { ChiefOfStaffView } from '@/components/dashboard/ChiefOfStaffView';
import { GlobalSearch } from '@/components/dashboard/GlobalSearch';
import { CockpitBanners } from '@/components/dashboard/CockpitBanners';
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { FeedbackTab } from '@/components/dashboard/FeedbackTab';
import { OnboardingWelcome } from '@/components/dashboard/OnboardingWelcome';
import { KeyboardNav } from '@/components/dashboard/KeyboardNav';
import { CatchUpSettings } from '@/components/dashboard/CatchUpSettings';
import { CatchUpQuickMenu } from '@/components/dashboard/CatchUpQuickMenu';
import type { CenterTab } from '@/types';
import { getSignalTriagePrompt, getCatchUpPrompt, type SignalCatchUpConfig } from '@/lib/signals';

type MobilePanel = 'now' | 'center' | 'queue';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');
  const [mode, setMode] = useState<'cockpit' | 'chief_of_staff'>('cockpit');
  const [modeLoading, setModeLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeInitialStep, setWelcomeInitialStep] = useState<'welcome' | 'apikey' | undefined>(undefined);
  const [onboardingPhase, setOnboardingPhase] = useState<number>(0);
  const [userName, setUserName] = useState<string | undefined>();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center');
  const [commsUnread, setCommsUnread] = useState(0);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catchUpSettingsOpen, setCatchUpSettingsOpen] = useState(false);
  const [catchUpQuickOpen, setCatchUpQuickOpen] = useState(false);
  const catchUpGearRef = useRef<HTMLButtonElement>(null);

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

  const handleDiscuss = useCallback((context: string) => {
    setChatPrefill(context);
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

  // Handle welcome popup "Start Chat" — sends Divi intro message (project already created at signup)
  const handleWelcomeStart = useCallback(async () => {
    setShowWelcome(false);
    setActiveTab('chat');
    setMobilePanel('center');

    try {
      // Create Divi's intro chat message (project/card/checklist already exist from signup)
      await fetch('/api/onboarding/intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setOnboardingPhase(6);
      // Force ChatView to re-mount and load the new intro message
      setChatRefreshKey(k => k + 1);
      // No auto-send — intro now asks "now or later?" and user responds naturally
    } catch (e) {
      console.error('Failed to send intro:', e);
    }
  }, []);

  const handleWelcomeDismiss = useCallback(async () => {
    setShowWelcome(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenWalkthrough: true, hasCompletedOnboarding: true, onboardingPhase: 6 }),
      });
    } catch {}
  }, []);

  // Resume onboarding on login if user is in mid-phase (1-5)
  const resumeOnboarding = useCallback(async (phase: number) => {
    if (phase < 1 || phase >= 6) return;
    setActiveTab('chat');
    // Check if there's already an onboarding message for this phase
    try {
      const msgRes = await fetch('/api/chat/messages?limit=50');
      const msgData = await msgRes.json();
      const hasPhaseMsg = msgData.data?.messages?.some((m: any) => {
        try {
          const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
          return meta?.isOnboarding && meta?.onboardingPhase === phase;
        } catch { return false; }
      });
      if (!hasPhaseMsg) {
        // Generate the message for current phase (init = don't advance, just generate)
        await fetch('/api/onboarding/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' }),
        });
      }
    } catch {}
  }, []);

  // Check for tab navigation from Comms/Extensions/Connections pages or URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        setActiveTab(tabParam as CenterTab);
      }
      // Handle returning from Google OAuth during onboarding
      const googleStatus = urlParams.get('google');
      if (googleStatus === 'connected') {
        setActiveTab('chat');
        // Refresh the onboarding phase 2 widgets by re-generating the message
        (async () => {
          try {
            await fetch('/api/onboarding/advance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'init' }),
            });
          } catch {}
        })();
      }
      // Clean URL params
      if (tabParam || googleStatus) {
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
      .then(async (d) => {
        if (d.success) {
          setMode(d.data.user.mode);
          setUserName(d.data.user.name || undefined);
          const userPhase = d.data.user.onboardingPhase || 0;
          const hasCompleted = d.data.user.hasCompletedOnboarding;
          const hasActiveApiKey = d.data?.apiKeys?.some((k: any) => k.isActive);

          // ── Detect stuck onboarding: user already completed or has real data ──
          // If hasCompletedOnboarding is true but phase < 6, fix the phase silently
          if (hasCompleted && userPhase < 6) {
            setOnboardingPhase(6);
            // Fire-and-forget DB fix
            fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ onboardingPhase: 6 }),
            }).catch(() => {});

            // Even if onboarding is "complete", if they have no API key, show the key entry
            if (!hasActiveApiKey) {
              setWelcomeInitialStep('apikey');
              setTimeout(() => setShowWelcome(true), 400);
            }
          } else if (!hasCompleted && userPhase > 0 && userPhase < 6) {
            // ── User saw walkthrough but may not have an API key yet ──
            if (!hasActiveApiKey) {
              // No API key — show the BYOAI key entry modal directly
              setOnboardingPhase(userPhase);
              setWelcomeInitialStep('apikey');
              setTimeout(() => setShowWelcome(true), 400);
            } else {
              // Has API key — check for real data
              try {
                const qRes = await fetch('/api/queue');
                const qData = await qRes.json();
                const hasRealData = qData.success && qData.data && qData.data.length > 0;
                if (hasRealData) {
                  setOnboardingPhase(6);
                  fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hasCompletedOnboarding: true, onboardingPhase: 6 }),
                  }).catch(() => {});
                } else {
                  setOnboardingPhase(userPhase);
                  setTimeout(() => resumeOnboarding(userPhase), 500);
                }
              } catch {
                setOnboardingPhase(6);
              }
            }
          } else if (!d.data.user.hasSeenWalkthrough || (!hasCompleted && userPhase === 0)) {
            // Brand new user — show the welcome popup from step 1
            setOnboardingPhase(userPhase);
            setWelcomeInitialStep('welcome');
            setTimeout(() => setShowWelcome(true), 400);
          } else {
            setOnboardingPhase(userPhase);
            // Completed onboarding but no API key — nudge them to add one
            if (!hasActiveApiKey) {
              setWelcomeInitialStep('apikey');
              setTimeout(() => setShowWelcome(true), 400);
            }
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

  // Track when user navigates away from chat during onboarding
  const prevTabRef = useRef<CenterTab>('chat');
  useEffect(() => {
    if (onboardingPhase > 0 && onboardingPhase < 6 && prevTabRef.current === 'chat' && activeTab !== 'chat') {
      // User left chat during onboarding — create a notification for resume
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'system',
          title: 'Continue setup with Divi',
          message: `You left off at step ${onboardingPhase} of setup. Click to pick up where you left off.`,
          actionUrl: '/dashboard?tab=chat',
        }),
      }).catch(() => {});
    }
    prevTabRef.current = activeTab;
  }, [activeTab, onboardingPhase]);

  return (
    <div className="h-full flex flex-col">
      {/* Welcome popup — shown to new users, opens chat with Divi */}
      {showWelcome && (
        <OnboardingWelcome
          userName={userName}
          onStart={handleWelcomeStart}
          onDismiss={handleWelcomeDismiss}
          initialStep={welcomeInitialStep}
        />
      )}

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

        {/* Right: Nav + Sign Out */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
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
              <div className="relative flex items-stretch">
                <button
                  onClick={handleCatchUp}
                  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1.5 rounded-l-md bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)] border-r-0"
                  title="Catch up on all signals — Divi triages everything"
                >
                  <span className="text-sm leading-none">🔄</span>
                  <span className="hidden sm:inline text-[11px] leading-none">Catch Up</span>
                </button>
                <button
                  ref={catchUpGearRef}
                  onClick={() => setCatchUpQuickOpen(!catchUpQuickOpen)}
                  className="flex items-center justify-center px-1.5 rounded-r-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)]"
                  title="Configure catch-up signals"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
                <CatchUpQuickMenu
                  open={catchUpQuickOpen}
                  onClose={() => setCatchUpQuickOpen(false)}
                  anchorRef={catchUpGearRef}
                />
              </div>

              {/* Notification Center */}
              <NotificationCenter />

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

      {/* Mode toggle has been moved into the Workspace panel */}

      {/* ── Chief of Staff mode: locked-down observer view ── */}
      {mode === 'chief_of_staff' ? (
        <div className="flex-1 min-h-0">
          <ChiefOfStaffView onIntervene={() => {}} />
        </div>
      ) : (
        <>
          {/* ── Cockpit Notification Banners ── */}
          <CockpitBanners mode={mode} />

          {/* ── Desktop: 3-column layout ── */}
          <div className="hidden md:flex flex-1 gap-3 p-3 min-h-0">
            <div className="w-72 flex-shrink-0" data-walkthrough="now-panel">
              <NowPanel onNewTask={() => {}} onQuickChat={() => setActiveTab('chat')} onItemClick={handleNowItemClick} onOpenBoard={() => setActiveTab('kanban')} onOpenEarnings={() => setActiveTab('earnings')} onDiscuss={handleDiscuss} />
            </div>
            <div className="flex-1 min-w-0" data-walkthrough="center-panel">
              <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} marketplacePrefill={marketplacePrefill} onMarketplacePrefillConsumed={() => setMarketplacePrefill(null)} chatPrefill={chatPrefill} onChatPrefillConsumed={() => setChatPrefill(null)} onTriage={handleTriage} onChatWithPrefill={(msg) => { setChatPrefill(msg); setActiveTab("chat"); }} onOpenCatchUpSettings={() => setCatchUpSettingsOpen(true)} chatRefreshKey={chatRefreshKey} />
            </div>
            <div className="w-72 flex-shrink-0" data-walkthrough="queue-panel">
              <QueuePanel onNavigateToMarketplace={() => setActiveTab('marketplace')} onNavigateToComms={() => router.push('/dashboard/comms')} onDiscuss={handleDiscuss} mode={mode} onToggleMode={toggleMode} modeLoading={modeLoading} />
            </div>
          </div>

          {/* ── Mobile: Single panel + bottom nav ── */}
          <div className="flex md:hidden flex-1 flex-col min-h-0">
            {/* Active panel */}
            <div className="flex-1 min-h-0 p-1 flex flex-col">
              {mobilePanel === 'now' && (
                <div className="flex-1 min-h-0" data-walkthrough="now-panel">
                  <NowPanel onNewTask={() => {}} onQuickChat={() => { setActiveTab('chat'); setMobilePanel('center'); }} onItemClick={(title) => { handleNowItemClick(title); setMobilePanel('center'); }} onOpenBoard={() => { setActiveTab('kanban'); setMobilePanel('center'); }} onOpenEarnings={() => { setActiveTab('earnings'); setMobilePanel('center'); }} onDiscuss={(ctx) => { handleDiscuss(ctx); setMobilePanel('center'); }} />
                </div>
              )}
              {mobilePanel === 'center' && (
                <div className="flex-1 min-h-0" data-walkthrough="center-panel">
                  <CenterPanel activeTab={activeTab} onTabChange={setActiveTab} marketplacePrefill={marketplacePrefill} onMarketplacePrefillConsumed={() => setMarketplacePrefill(null)} chatPrefill={chatPrefill} onChatPrefillConsumed={() => setChatPrefill(null)} onTriage={handleTriage} onChatWithPrefill={(msg) => { setChatPrefill(msg); setActiveTab("chat"); }} onOpenCatchUpSettings={() => setCatchUpSettingsOpen(true)} chatRefreshKey={chatRefreshKey} />
                </div>
              )}
              {mobilePanel === 'queue' && (
                <div className="flex-1 min-h-0" data-walkthrough="queue-panel">
                  <QueuePanel onNavigateToMarketplace={() => { setActiveTab('marketplace'); setMobilePanel('center'); }} onNavigateToComms={() => router.push('/dashboard/comms')} onDiscuss={(ctx) => { handleDiscuss(ctx); setMobilePanel('center'); }} mode={mode} onToggleMode={toggleMode} modeLoading={modeLoading} />
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
                onClick={() => { setCommsUnread(0); router.push('/dashboard/comms'); }}
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

      {/* Floating feedback tab */}
      <FeedbackTab />
    </div>
  );
}