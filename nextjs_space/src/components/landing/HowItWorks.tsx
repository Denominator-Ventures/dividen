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
    description: 'Approved tasks go to a queue where AI agents execute — drafting emails, scheduling meetings, updating CRMs, or routing work to teammates.',
    examples: ['Draft replies', 'Schedule meetings', 'Update systems'],
    color: 'from-brand-500/20 to-brand-400/5',
    borderColor: 'border-brand-500/20',
    accentColor: 'text-brand-400',
    glowColor: 'bg-brand-500/10',
  },
];

// ─── Animated Connector Arrow ────────────────────────────────────────────────

function FlowArrow({ direction = 'down', className = '' }: { direction?: 'down' | 'right'; className?: string }) {
  if (direction === 'right') {
    return (
      <div className={`hidden lg:flex items-center justify-center ${className}`}>
        <div className="relative w-12 h-8 flex items-center">
          <div className="absolute inset-y-1/2 left-0 right-3 h-px bg-gradient-to-r from-white/[0.06] to-white/20" />
          <div className="absolute right-0 w-0 h-0 border-l-[6px] border-l-white/20 border-y-[4px] border-y-transparent" />
          {/* Animated pulse dot */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-right" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex lg:hidden items-center justify-center py-2 ${className}`}>
      <div className="relative w-8 h-10 flex flex-col items-center">
        <div className="absolute inset-x-1/2 top-0 bottom-3 w-px bg-gradient-to-b from-white/[0.06] to-white/20" />
        <div className="absolute bottom-0 w-0 h-0 border-t-[6px] border-t-white/20 border-x-[4px] border-x-transparent" />
        {/* Animated pulse dot */}
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
}: {
  step: typeof FLOW_STEPS[0];
  index: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
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
      } p-5 pt-6 transition-all duration-300 group-hover:border-white/[0.12]`}>
        {/* Background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <div className="relative">
          {/* Icon + Title row */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
            <div>
              <p className={`font-mono text-[9px] uppercase tracking-[0.2em] ${step.accentColor} mb-0.5`}>
                {step.subtitle}
              </p>
              <h3 className="font-heading text-base font-semibold leading-tight">
                {step.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] text-white/45 leading-relaxed mb-3">
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

  // Auto-play through steps
  useEffect(() => {
    if (!isAutoPlaying || !isVisible) return;
    const timer = setInterval(() => {
      setAutoPlayIndex((prev) => (prev + 1) % FLOW_STEPS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, isVisible]);

  // When user hovers, pause auto-play
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
            Five steps. Zero effort.
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto">
            Your world flows in, your AI agent sorts it, and things get done &mdash; while you focus on what actually matters.
          </p>
        </div>

        {/* ── Desktop: Horizontal Flow ──────────────────────────────────── */}
        <div className={`hidden lg:block transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}>
          {/* Top row: Steps 1-3 */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-0 mb-6">
            <StepCard step={FLOW_STEPS[0]} index={0} isActive={currentActive === FLOW_STEPS[0].id} onHover={handleHover} />
            <FlowArrow direction="right" className="mt-12" />
            <StepCard step={FLOW_STEPS[1]} index={1} isActive={currentActive === FLOW_STEPS[1].id} onHover={handleHover} />
            <FlowArrow direction="right" className="mt-12" />
            <StepCard step={FLOW_STEPS[2]} index={2} isActive={currentActive === FLOW_STEPS[2].id} onHover={handleHover} />
          </div>

          {/* Connecting arrow down-right from step 3 to step 4 */}
          <div className="flex justify-end pr-[15%] py-2">
            <div className="relative w-8 h-10 flex flex-col items-center">
              <div className="absolute inset-x-1/2 top-0 bottom-3 w-px bg-gradient-to-b from-white/[0.06] to-white/20" />
              <div className="absolute bottom-0 w-0 h-0 border-t-[6px] border-t-white/20 border-x-[4px] border-x-transparent" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-400 animate-flow-down" />
            </div>
          </div>

          {/* Bottom row: Steps 4-5 (centered) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-0 max-w-[70%] mx-auto">
            <StepCard step={FLOW_STEPS[3]} index={3} isActive={currentActive === FLOW_STEPS[3].id} onHover={handleHover} />
            <FlowArrow direction="right" className="mt-12" />
            <StepCard step={FLOW_STEPS[4]} index={4} isActive={currentActive === FLOW_STEPS[4].id} onHover={handleHover} />
          </div>
        </div>

        {/* ── Mobile: Vertical Flow ─────────────────────────────────────── */}
        <div className={`lg:hidden space-y-0 transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}>
          {FLOW_STEPS.map((step, i) => (
            <div key={step.id}>
              <StepCard step={step} index={i} isActive={currentActive === step.id} onHover={handleHover} />
              {i < FLOW_STEPS.length - 1 && <FlowArrow direction="down" />}
            </div>
          ))}
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
          That&apos;s it. Signals in, tasks out, agents execute. You stay focused.
        </p>
      </div>
    </section>
  );
}
