'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const ALL_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DiviDen',
    description: 'Your personal command center for coordinating work between you and Divi, your AI agent. Let\'s take a quick tour of the key areas.',
    targetSelector: '[data-walkthrough="brand"]',
    position: 'bottom',
  },
  {
    id: 'mode-toggle',
    title: 'Operating Mode',
    description: 'Toggle between Cockpit (you drive, Divi assists) and Chief of Staff (Divi drives, you approve). This changes how the agent behaves.',
    targetSelector: '[data-walkthrough="mode-toggle"]',
    position: 'bottom',
  },
  {
    id: 'now-panel',
    title: 'NOW Panel',
    description: 'Your focus zone. See what\'s in progress right now, what\'s done today, and quickly add new tasks. This is your daily command view.',
    targetSelector: '[data-walkthrough="now-panel"]',
    position: 'right',
    desktopOnly: true,
  },
  {
    id: 'center-panel',
    title: 'Center Panel',
    description: 'The main workspace. Chat with Divi, manage your Kanban board, CRM contacts, documents, and recordings. Switch between views using the tabs.',
    targetSelector: '[data-walkthrough="center-panel"]',
    position: 'left',
    desktopOnly: true,
  },
  {
    id: 'queue-panel',
    title: 'Queue Panel',
    description: 'Your task queue. Items flow through Ready → In Progress → Done. Divi can add suggestions here, and you can dispatch tasks with a click.',
    targetSelector: '[data-walkthrough="queue-panel"]',
    position: 'left',
    desktopOnly: true,
  },
  {
    id: 'mobile-panels',
    title: 'Your Workspace',
    description: 'Use the tabs at the bottom to switch between NOW (your focus zone), Workspace (chat with Divi, Kanban, CRM, docs), and Queue (your task pipeline). Swipe through to explore.',
    targetSelector: '[data-walkthrough="center-panel"]',
    position: 'top',
    mobileOnly: true,
  },
  {
    id: 'comms',
    title: 'Comms Channel',
    description: 'Your structured task-passing channel with Divi. Send tasks, receive proactive updates, and track every message through its lifecycle — new → read → acknowledged → resolved.',
    targetSelector: '[data-walkthrough="comms"]',
    position: 'bottom',
  },
  {
    id: 'connections',
    title: 'Connections & Agent Relay',
    description: 'Connect with other DiviDen users. Your Divi talks to their Divi — send relays, assign tasks across teams, and get responses back through a structured agent-to-agent protocol. Supports both local and federated (cross-instance) connections.',
    targetSelector: '[data-walkthrough="center-panel"]',
    position: 'bottom',
  },
  {
    id: 'settings',
    title: 'Settings & API Keys',
    description: 'Head to Settings to add your LLM API key (or bring your own via Integrations) to enable Divi. You can also configure webhooks, manage memory, federation settings, your profile, and relay preferences.',
    targetSelector: '[data-walkthrough="settings"]',
    position: 'bottom',
  },
];

interface WalkthroughProps {
  onComplete: () => void;
}

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile once on mount and on resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Filter steps based on viewport
  const STEPS = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (isMobile && s.desktopOnly) return false;
      if (!isMobile && s.mobileOnly) return false;
      return true;
    });
  }, [isMobile]);

  const step = STEPS[currentStep];

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Only set if the element is actually visible (has dimensions)
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    // Element not found or not visible — try to find a fallback
    // Use the brand logo as a safe fallback so the tooltip still renders
    const fallback = document.querySelector('[data-walkthrough="brand"]');
    if (fallback) {
      setTargetRect(fallback.getBoundingClientRect());
    }
  }, [step]);

  useEffect(() => {
    // Small delay to let DOM settle after step change
    const timer = setTimeout(updateTargetRect, 50);
    window.addEventListener('resize', updateTargetRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [updateTargetRect]);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Keyboard navigation: Escape to skip, Enter/Right to next, Left to prev
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!step || !targetRect) return null;

  // Calculate tooltip position — always clamped to viewport
  const PADDING = isMobile ? 8 : 12;
  const TOOLTIP_GAP = isMobile ? 12 : 16;
  const TOOLTIP_HEIGHT_ESTIMATE = 200; // approximate tooltip height
  const TOOLTIP_MAX_W = 360;

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10002,
      transition: 'all 0.3s ease',
    };

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // On mobile: always position below or above, full width with margins
    if (isMobile) {
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;
      if (spaceBelow > TOOLTIP_HEIGHT_ESTIMATE || spaceBelow > spaceAbove) {
        return { ...base, top: Math.min(targetRect.bottom + TOOLTIP_GAP, vh - TOOLTIP_HEIGHT_ESTIMATE - 16), left: 12, right: 12 };
      }
      return { ...base, bottom: Math.min(vh - targetRect.top + TOOLTIP_GAP, vh - 16), left: 12, right: 12 };
    }

    // Desktop: try step config position, but fall back if off-screen
    const spaceBelow = vh - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = vw - targetRect.right;
    const spaceLeft = targetRect.left;

    // Determine best position: prefer configured, fall back to where there's room
    let pos = step.position;
    if (pos === 'bottom' && spaceBelow < TOOLTIP_HEIGHT_ESTIMATE) {
      pos = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
    if (pos === 'top' && spaceAbove < TOOLTIP_HEIGHT_ESTIMATE) {
      pos = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }
    if (pos === 'right' && spaceRight < TOOLTIP_MAX_W + TOOLTIP_GAP) {
      pos = spaceLeft > spaceRight ? 'left' : 'right';
    }
    if (pos === 'left' && spaceLeft < TOOLTIP_MAX_W + TOOLTIP_GAP) {
      pos = spaceRight > spaceLeft ? 'right' : 'left';
    }

    // Clamp horizontal left so tooltip never overflows right edge
    const clampLeft = (left: number) => Math.max(16, Math.min(left, vw - TOOLTIP_MAX_W - 16));
    // Clamp vertical top so tooltip never overflows bottom edge
    const clampTop = (top: number) => Math.max(16, Math.min(top, vh - TOOLTIP_HEIGHT_ESTIMATE - 16));

    // For large target elements (e.g., center-panel filling the whole viewport),
    // anchor to the center of the visible portion instead of the edge
    const centerY = Math.max(80, Math.min(targetRect.top + targetRect.height / 2, vh - 80));
    const centerX = Math.max(80, Math.min(targetRect.left + targetRect.width / 2, vw - 80));

    switch (pos) {
      case 'bottom':
        return {
          ...base,
          maxWidth: TOOLTIP_MAX_W,
          top: clampTop(targetRect.bottom + TOOLTIP_GAP),
          left: clampLeft(targetRect.left),
        };
      case 'top':
        return {
          ...base,
          maxWidth: TOOLTIP_MAX_W,
          bottom: Math.max(16, vh - targetRect.top + TOOLTIP_GAP),
          left: clampLeft(targetRect.left),
        };
      case 'right':
        return {
          ...base,
          maxWidth: TOOLTIP_MAX_W,
          top: clampTop(centerY - TOOLTIP_HEIGHT_ESTIMATE / 2),
          left: Math.min(targetRect.right + TOOLTIP_GAP, vw - TOOLTIP_MAX_W - 16),
        };
      case 'left':
        return {
          ...base,
          maxWidth: TOOLTIP_MAX_W,
          top: clampTop(centerY - TOOLTIP_HEIGHT_ESTIMATE / 2),
          right: Math.max(16, vw - targetRect.left + TOOLTIP_GAP),
        };
      default:
        // Absolute fallback: center of screen
        return {
          ...base,
          maxWidth: TOOLTIP_MAX_W,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  // Spotlight cutout values
  const spotPad = PADDING;
  const sx = targetRect.left - spotPad;
  const sy = targetRect.top - spotPad;
  const sw = targetRect.width + spotPad * 2;
  const sh = targetRect.height + spotPad * 2;
  const sr = 12; // border-radius for the cutout

  return (
    <div className="fixed inset-0" style={{ zIndex: 10000 }}>
      {/* Overlay with spotlight cutout */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 10000, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="walkthrough-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={sx}
              y={sy}
              width={sw}
              height={sh}
              rx={sr}
              ry={sr}
              fill="black"
              style={{ transition: 'all 0.3s ease' }}
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#walkthrough-mask)"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          onClick={handleNext}
        />
      </svg>

      {/* Highlight border around target */}
      <div
        className="fixed border-2 border-[var(--brand-primary)] rounded-xl pointer-events-none"
        style={{
          zIndex: 10001,
          top: targetRect.top - spotPad,
          left: targetRect.left - spotPad,
          width: targetRect.width + spotPad * 2,
          height: targetRect.height + spotPad * 2,
          transition: 'all 0.3s ease',
          boxShadow: '0 0 0 2px rgba(79, 124, 255, 0.3), 0 0 20px rgba(79, 124, 255, 0.15)',
        }}
      />

      {/* Tooltip card */}
      <div
        style={getTooltipStyle()}
        className={`bg-[#141414] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-5 ${
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        } transition-all duration-300`}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="label-mono text-[var(--brand-primary)]" style={{ fontSize: '10px' }}>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider"
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 font-heading">
          {step.title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Tap hint */}
        <p className="text-[10px] text-[var(--text-muted)] mb-3 italic">Tap anywhere or press → to continue</p>

        {/* Progress dots + navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-[var(--brand-primary)]'
                    : i < currentStep
                    ? 'w-1.5 bg-[var(--brand-primary)]/50'
                    : 'w-1.5 bg-[rgba(255,255,255,0.1)]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="text-xs px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="text-xs px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[#3d65e0] text-white font-medium transition-colors"
            >
              {currentStep < STEPS.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
