'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Flow Steps ──────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    id: 'signals',
    icon: '📡',
    title: 'Your World Flows In',
    subtitle: 'Signals',
    description: 'Emails, calendar events, Slack pings, payments, tickets — everything you already use sends signals into one place.',
    examples: ['📧 Email', '📅 Calendar', '💬 Slack', '💳 Stripe', '📋 Jira'],
    color: 'from-blue-500/20 to-blue-400/5',
    borderColor: 'border-blue-500/20',
    accentColor: 'text-blue-400',
    glowColor: 'bg-blue-500/10',
  },
  {
    id: 'divi',
    icon: '🧠',
    title: 'Divi Reads Everything',
    subtitle: 'Your AI Agent',
    description: 'Your personal AI agent reads every signal, understands what matters, and sorts it automatically. No rules to set up — it just learns how you work.',
    examples: ['Reads context', 'Learns patterns', 'Knows priorities'],
    color: 'from-purple-500/20 to-purple-400/5',
    borderColor: 'border-purple-500/20',
    accentColor: 'text-purple-400',
    glowColor: 'bg-purple-500/10',
  },
  {
    id: 'board',
    icon: '📋',
    title: 'Tasks Appear on Your Board',
    subtitle: 'Smart Kanban',
    description: 'The important stuff becomes cards on your board — organized, prioritized, and ready. Nothing falls through the cracks.',
    examples: ['Auto-created cards', 'Priority ranked', 'People linked'],
    color: 'from-amber-500/20 to-amber-400/5',
    borderColor: 'border-amber-500/20',
    accentColor: 'text-amber-400',
    glowColor: 'bg-amber-500/10',
  },
  {
    id: 'you',
    icon: '👆',
    title: 'You Decide What Matters',
    subtitle: 'Your Focus',
    description: 'Every morning, Divi shows you what needs attention — ranked by urgency. You approve, adjust, or skip. You stay in control.',
    examples: ['"Do this first"', '"Handle it for me"', '"Skip for now"'],
    color: 'from-green-500/20 to-green-400/5',
    borderColor: 'border-green-500/20',
    accentColor: 'text-green-400',
    glowColor: 'bg-green-500/10',
  },
  {
    id: 'agents',
    icon: '⚡',
    title: 'Agents Get It Done',
    subtitle: 'Execution Queue',
    description: 'Approved tasks go to a queue where AI agents execute — drafting emails, scheduling meetings, updating CRMs. Results flow back to Divi to process next.',
    examples: ['Draft replies', 'Schedule meetings', 'Update systems'],
    color: 'from-brand-500/20 to-brand-400/5',
    borderColor: 'border-brand-500/20',
    accentColor: 'text-brand-400',
    glowColor: 'bg-brand-500/10',
  },
];

// ─── Animated Connector Arrow ────────────────────────────────────────────────

function FlowArrow({ direction = 'down', className = '' }: { direction?: 'down' | 'right' | 'left' | 'up'; className?: string }) {
  if (direction === 'right') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative w-12 h-8 flex items-center">
          <div className="absolute inset-y-1/2 left-0 right-3 h-px bg-gradient-to-r from-white/[0.06] to-white/20" />
          <div className="absolute right-0 w-0 h-0 border-l-[6px] border-l-white/20 border-y-[4px] border-y-transparent" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-right" />
        </div>
      </div>
    );
  }

  if (direction === 'left') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative w-12 h-8 flex items-center">
          <div className="absolute inset-y-1/2 left-3 right-0 h-px bg-gradient-to-l from-white/[0.06] to-white/20" />
          <div className="absolute left-0 w-0 h-0 border-r-[6px] border-r-white/20 border-y-[4px] border-y-transparent" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-left" />
        </div>
      </div>
    );
  }

  if (direction === 'up') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative w-8 h-10 flex flex-col items-center">
          <div className="absolute inset-x-1/2 top-3 bottom-0 w-px bg-gradient-to-t from-white/[0.06] to-white/20" />
          <div className="absolute top-0 w-0 h-0 border-b-[6px] border-b-white/20 border-x-[4px] border-x-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-up" />
        </div>
      </div>
    );
  }

  // down (default)
  return (
    <div className={`flex items-center justify-center py-2 ${className}`}>
      <div className="relative w-8 h-10 flex flex-col items-center">
        <div className="absolute inset-x-1/2 top-0 bottom-3 w-px bg-gradient-to-b from-white/[0.06] to-white/20" />
        <div className="absolute bottom-0 w-0 h-0 border-t-[6px] border-t-white/20 border-x-[4px] border-x-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-down" />
      </div>
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  isActive,
  onHover,
  compact = false,
}: {
  step: typeof FLOW_STEPS[0];
  index: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative group transition-all duration-500 ${
        isActive ? 'scale-[1.02] z-10' : 'scale-100'
      }`}
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Step number badge */}
      <div className="absolute -top-3 left-4 z-20">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border ${
          isActive
            ? 'bg-brand-500 text-black border-brand-500'
            : 'bg-white/[0.06] text-white/50 border-white/[0.1]'
        } transition-all duration-300`}>
          {index + 1}
        </div>
      </div>

      {/* Card */}
      <div className={`relative overflow-hidden rounded-2xl border ${
        isActive ? step.borderColor + ' bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
      } ${compact ? 'p-4 pt-5' : 'p-5 pt-6'} transition-all duration-300 group-hover:border-white/[0.12]`}>
        {/* Background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <div className="relative">
          {/* Icon + Title row */}
          <div className="flex items-start gap-3 mb-3">
            <span className={`${compact ? 'text-xl' : 'text-2xl'} flex-shrink-0 mt-0.5`}>{step.icon}</span>
            <div>
              <p className={`font-mono text-[9px] uppercase tracking-[0.2em] ${step.accentColor} mb-0.5`}>
                {step.subtitle}
              </p>
              <h3 className={`font-heading ${compact ? 'text-sm' : 'text-base'} font-semibold leading-tight`}>
                {step.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className={`${compact ? 'text-xs' : 'text-[13px]'} text-white/45 leading-relaxed mb-3`}>
            {step.description}
          </p>

          {/* Example pills */}
          <div className="flex flex-wrap gap-1.5">
            {step.examples.map((ex) => (
              <span
                key={ex}
                className="px-2 py-0.5 text-[10px] rounded-full bg-white/[0.04] text-white/35 border border-white/[0.06]"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loop-back Arrow (curved visual for desktop) ─────────────────────────────

// ─── Mobile loop-back indicator ──────────────────────────────────────────────

function MobileLoopBack() {
  return (
    <div className="lg:hidden flex flex-col items-center py-3 gap-1.5">
      <div className="relative w-full flex items-center justify-center">
        <svg width="200" height="44" viewBox="0 0 200 44" fill="none" className="opacity-60">
          <path
            d="M100 4 C 180 4, 180 40, 100 40 C 20 40, 20 4, 100 4"
            stroke="url(#mobileLoopGrad)"
            strokeWidth="1"
            strokeDasharray="4 3"
            fill="none"
          />
          <circle r="2.5" fill="#a855f7" opacity="0.8">
            <animateMotion dur="3s" repeatCount="indefinite">
              <mpath href="#mobileLoopPath" />
            </animateMotion>
          </circle>
          <path id="mobileLoopPath" d="M100 4 C 180 4, 180 40, 100 40 C 20 40, 20 4, 100 4" fill="none" />
          <defs>
            <linearGradient id="mobileLoopGrad" x1="0" y1="22" x2="200" y2="22">
              <stop offset="0%" stopColor="rgba(168,85,247,0.3)" />
              <stop offset="50%" stopColor="rgba(168,85,247,0.15)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.3)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-[10px] font-mono text-purple-400/50 tracking-wider uppercase">
        ↻ loops back to Divi
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection observer for entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-play — cycle through loop steps: 1,2,3,4,5,2,3,4,5,2,...
  // After the first pass, it loops 2→3→4→5→2
  useEffect(() => {
    if (!isAutoPlaying || !isVisible) return;
    const timer = setInterval(() => {
      setAutoPlayIndex((prev) => {
        // After step 5 (index 4), loop back to step 2 (index 1)
        if (prev >= 4) return 1;
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, isVisible]);

  const handleHover = (id: string | null) => {
    if (id) {
      setIsAutoPlaying(false);
      setActiveStep(id);
    } else {
      setActiveStep(null);
      setIsAutoPlaying(true);
    }
  };

  const currentActive = activeStep || (isAutoPlaying ? FLOW_STEPS[autoPlayIndex]?.id : null);

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-32 border-t border-white/[0.04] relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-brand-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
            How It Works
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            One loop. Zero effort.
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto">
            Signals trigger the loop. Divi processes, you decide, agents execute &mdash; and results flow right back in. A self-driving cycle that never stops working.
          </p>
        </div>

        {/* ── Desktop: Loop Layout ────────────────────────────────────────── */}
        {/*
            Layout:
            [1 Signals] ──→ [2 Divi Brain] ──→ [3 Board]
                                  ↑                  ↓
                            [5 Agents]  ←── [4 You Decide]
            
            With a loop-back arrow from 5 → 2 shown as the left ↑ arrow
        */}
        <div className={`hidden lg:block transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}>
          {/* Top row: Step 1 (entry) → Step 2 → Step 3 */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-0 mb-0">
            <StepCard step={FLOW_STEPS[0]} index={0} isActive={currentActive === FLOW_STEPS[0].id} onHover={handleHover} compact />
            <FlowArrow direction="right" className="mt-10" />
            <StepCard step={FLOW_STEPS[1]} index={1} isActive={currentActive === FLOW_STEPS[1].id} onHover={handleHover} compact />
            <FlowArrow direction="right" className="mt-10" />
            <StepCard step={FLOW_STEPS[2]} index={2} isActive={currentActive === FLOW_STEPS[2].id} onHover={handleHover} compact />
          </div>

          {/* Middle connectors: ↑ on left (5→2) and ↓ on right (3→4) */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-0">
            {/* Empty space under step 1 */}
            <div />
            <div />
            {/* Up arrow under step 2 (loop-back from 5) */}
            <div className="flex justify-center">
              <FlowArrow direction="up" />
            </div>
            <div />
            {/* Down arrow under step 3 (flow to 4) */}
            <div className="flex justify-center">
              <FlowArrow direction="down" />
            </div>
          </div>

          {/* Bottom row: Step 5 (under 2) ← Step 4 (under 3) */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-0">
            {/* Empty space under step 1 */}
            <div />
            <div />
            <StepCard step={FLOW_STEPS[4]} index={4} isActive={currentActive === FLOW_STEPS[4].id} onHover={handleHover} compact />
            <FlowArrow direction="left" className="mt-10" />
            <StepCard step={FLOW_STEPS[3]} index={3} isActive={currentActive === FLOW_STEPS[3].id} onHover={handleHover} compact />
          </div>

          {/* Loop annotation */}
          <div className="flex justify-center mt-4">
            <span className="text-[10px] font-mono text-purple-400/40 tracking-wider uppercase">
              ↻ agents complete → results flow back to divi → cycle continues
            </span>
          </div>
        </div>

        {/* ── Mobile: Vertical Flow with Loop ─────────────────────────────── */}
        <div className={`lg:hidden space-y-0 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}>
          {/* Step 1: Entry point */}
          <StepCard step={FLOW_STEPS[0]} index={0} isActive={currentActive === FLOW_STEPS[0].id} onHover={handleHover} />
          <FlowArrow direction="down" />

          {/* Loop container with visual indicator */}
          <div className="relative border border-purple-500/10 rounded-2xl p-3 pt-6">
            {/* Loop badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <span className="px-3 py-1 text-[9px] font-mono uppercase tracking-[0.15em] text-purple-400/70 bg-purple-500/10 border border-purple-500/15 rounded-full whitespace-nowrap">
                ↻ continuous loop
              </span>
            </div>

            <div className="space-y-0">
              <StepCard step={FLOW_STEPS[1]} index={1} isActive={currentActive === FLOW_STEPS[1].id} onHover={handleHover} />
              <FlowArrow direction="down" />
              <StepCard step={FLOW_STEPS[2]} index={2} isActive={currentActive === FLOW_STEPS[2].id} onHover={handleHover} />
              <FlowArrow direction="down" />
              <StepCard step={FLOW_STEPS[3]} index={3} isActive={currentActive === FLOW_STEPS[3].id} onHover={handleHover} />
              <FlowArrow direction="down" />
              <StepCard step={FLOW_STEPS[4]} index={4} isActive={currentActive === FLOW_STEPS[4].id} onHover={handleHover} />
            </div>

            {/* Mobile loop-back indicator */}
            <MobileLoopBack />
          </div>
        </div>

        {/* ── Progress indicator ────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {FLOW_STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => {
                setIsAutoPlaying(false);
                setActiveStep(step.id);
                setTimeout(() => {
                  setActiveStep(null);
                  setIsAutoPlaying(true);
                }, 5000);
              }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentActive === step.id
                  ? 'w-8 bg-brand-400'
                  : 'w-1.5 bg-white/[0.12] hover:bg-white/[0.2]'
              }`}
              aria-label={`Step ${i + 1}: ${step.title}`}
            />
          ))}
        </div>

        {/* ── Summary line ──────────────────────────────────────────────── */}
        <p className="text-center text-white/25 text-sm mt-8 max-w-md mx-auto">
          Signals in, the loop runs, things get done. You stay focused.
        </p>
      </div>
    </section>
  );
}