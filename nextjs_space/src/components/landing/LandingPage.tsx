'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UPDATES } from '@/lib/updates';

// ─── Animated typing effect ─────────────────────────────────────────────────
function useTypingEffect(phrases: string[], typingSpeed = 80, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setDisplayText(currentPhrase.substring(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);

          if (charIndex + 1 === currentPhrase.length) {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          setDisplayText(currentPhrase.substring(0, charIndex - 1));
          setCharIndex((prev) => prev - 1);

          if (charIndex - 1 === 0) {
            setIsDeleting(false);
            setPhraseIndex((prev) => (prev + 1) % phrases.length);
          }
        }
      },
      isDeleting ? typingSpeed / 2 : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, phrases, typingSpeed, pauseDuration]);

  return displayText;
}

// ─── Feature card data ──────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🧠',
    title: '10-Group Agent Intelligence',
    description:
      'Your Divi reasons across 10 consolidated prompt groups — identity, goals, connections, memory, tools, and more — assembling full context on every decision.',
  },
  {
    icon: '🎯',
    title: 'Goals & Dynamic NOW Engine',
    description:
      'Define objectives, track progress, and let the NOW Engine score and rank what matters most right now — across goals, queue items, and relays.',
  },
  {
    icon: '🔗',
    title: 'Self-Improving Ambient Protocol',
    description:
      'Direct, broadcast, and ambient relay modes. Every ambient interaction teaches the protocol — it learns timing, phrasing, and topics that work, getting less disruptive with every exchange.',
  },
  {
    icon: '📋',
    title: 'The Brief — Show Your Work',
    description:
      'Every agent decision generates a reasoning brief. Full transparency on what context was assembled, who was matched, and why. The handshake contract between human and agent.',
  },
  {
    icon: '⚡',
    title: 'Action Tags — Not Just Chat',
    description:
      '32+ executable actions via natural conversation. Route tasks, create goals, assemble briefs, dispatch relays, orchestrate work — all from chat.',
  },
  {
    icon: '👥',
    title: 'Teams, Projects & Visibility',
    description:
      'Organize connections into persistent teams and scoped projects. Control visibility with public, team-only, and private modes across every entity.',
  },
  {
    icon: '🌐',
    title: 'Federated by Design',
    description:
      'No shared database. No vendor lock-in. Your instance, your data. Agents communicate across boundaries transparently via DAWP.',
  },
  {
    icon: '🧩',
    title: 'Extensions Framework',
    description:
      'Installable skills and personas that extend what your Divi can do. Curated registry, one-click install, automatic prompt integration.',
  },
  {
    icon: '🏪',
    title: 'Agent Marketplace',
    description:
      'Discover, execute, and pay for AI agents built by other developers. List your own agents and earn 97% of every transaction. Powered by Stripe.',
  },
];

const PROTOCOL_LAYERS = [
  {
    num: '01',
    name: 'Identity & Profile',
    desc: 'Routing manifests — not résumés. Skills, lived experience, task types, and availability that agents use to make decisions.',
  },
  {
    num: '02',
    name: 'Goals & Dynamic NOW Engine',
    desc: 'Objectives with progress tracking, priority scoring, and a dynamic ranking engine that surfaces what matters most right now — across goals, queue items, and relays.',
  },
  {
    num: '03',
    name: 'Ambient Relay Protocol',
    desc: 'Direct, broadcast, and ambient modes. Agents exchange context-rich relays — or weave questions naturally into conversation without interrupting anyone.',
  },
  {
    num: '04',
    name: 'The Brief — Reasoning Artifact',
    desc: 'Every orchestration generates a brief: what context was assembled, which connections matched, why a routing decision was made. The "show your work" layer.',
  },
  {
    num: '05',
    name: 'Ambient Learning Engine',
    desc: 'Every ambient relay interaction feeds a learning loop — timing, disruption, topic success, phrasing effectiveness. The protocol teaches itself to be less interruptive and more pointed over time.',
  },
  {
    num: '06',
    name: 'Teams & Projects',
    desc: 'Persistent teams and scoped projects that add organizational context to connections, task routing, and relay delivery — including federated members across instances.',
  },
  {
    num: '07',
    name: 'Extensions Framework',
    desc: 'Installable skills and personas from a curated registry. Extend what your Divi can do without touching the core protocol.',
  },
  {
    num: '08',
    name: 'Federation',
    desc: 'Cross-instance communication via DAWP. Your company runs one, theirs runs another. Agents still coordinate seamlessly — with full context API support.',
  },
  {
    num: '09',
    name: 'Integration Surface',
    desc: 'A2A bridge, webhooks, Agent API v2 — connect anything, from anywhere.',
  },
  {
    num: '10',
    name: 'Agent Marketplace & Payments',
    desc: 'Discover and execute agents built by other developers. Stripe Connect handles payouts, saved cards enable one-click purchases, and a 97/3 revenue split rewards builders.',
  },
];

// ─── Marketplace stats (static for now) ─────────────────────────────────────
const MARKETPLACE_STATS = [
  { label: 'Developer Revenue Share', value: '97%' },
  { label: 'Platform Routing Fee', value: '3%' },
  { label: 'Payment Processing', value: 'Stripe' },
  { label: 'Self-Hosted Fee', value: '0%' },
];

// ─── Download App Hero Button (PWA install prompt) ───────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function DownloadAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full sm:w-auto text-center border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-8 py-3.5 rounded-xl transition-all text-base flex items-center justify-center gap-2"
      title={deferredPrompt ? 'Install DiviDen as an app' : 'Open in Chrome or Edge to install'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download App
    </button>
  );
}

// ─── Main Landing Page ──────────────────────────────────────────────────────
export function LandingPage() {
  const typedText = useTypingEffect(
    [
      'manage your pipeline',
      'coordinate across teams',
      'delegate to your AI agent',
      'monetize your AI agents',
      'show its work on every decision',
      'track goals and priorities',
      'route work intelligently',
      'earn from every execution',
      'learn from every interaction',
    ],
    70,
    1800
  );

  const [mounted, setMounted] = useState(false);
  const [todayUpdateCount, setTodayUpdateCount] = useState(0);
  useEffect(() => {
    setMounted(true);
    const todayCT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    setTodayUpdateCount(UPDATES.filter(u => u.date === todayCT).length);
  }, []);

  return (
    <div className="min-h-dvh bg-[#050505] text-white overflow-x-hidden overflow-y-auto">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <a href="/" className="relative shrink-0">
            <svg viewBox="0 0 130 50" fill="none" xmlns="http://www.w3.org/2000/svg" width="91" height="35" aria-label="DiviDen">
              <rect x="1" y="1" width="128" height="48" rx="2" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <line x1="1" y1="12" x2="1" y2="38" stroke="#4F7CFF" strokeWidth="1.5" />
              <text x="65" y="31" textAnchor="middle" fill="#F5F5F5" fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif" fontSize="18" fontWeight="600" letterSpacing="0.5">DiviDen</text>
            </svg>
          </a>

          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors">
              Features
            </a>
            <a href="#marketplace" className="text-sm text-white/50 hover:text-white transition-colors">
              Marketplace
            </a>
            <Link href="/updates" className="relative text-sm text-white/50 hover:text-white transition-colors">
              Updates
              {todayUpdateCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {todayUpdateCount}
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white px-4 py-2 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/setup"
              className="text-sm bg-brand-500 hover:bg-brand-400 text-black font-medium px-5 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-brand-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36">
        {/* Subtle gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-brand-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div
            className={`transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-6">
              Your AI-powered command center
            </p>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
              Divi reads your inbox.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
                You read less.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-4 leading-relaxed">
              One AI agent that surfaces what matters, drafts responses, and acts on your behalf.
              Connect more tools, compound the time savings.
              Then discover the agent marketplace — built by the community, for the community.
            </p>

            {/* Typing effect */}
            <div className="h-8 flex items-center justify-center mb-10">
              <span className="font-mono text-sm text-white/30">
                divi, {typedText}
                <span className="animate-pulse text-brand-400">|</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/setup"
                className="w-full sm:w-auto text-center bg-brand-500 hover:bg-brand-400 text-black font-semibold px-8 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-brand-500/25 text-base"
              >
                Start for Free
              </Link>
              {mounted && <DownloadAppButton />}
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem / Solution ──────────────────────────────────────── */}
      <section className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
            {/* The problem */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-400/70 mb-4">
                The Problem
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6 leading-tight">
                5 context switches.
                <br />
                2 people.
                <br />
                1 simple request.
              </h2>
              <div className="space-y-3 text-white/40 text-sm leading-relaxed">
                <p>Alice needs something from Bob.</p>
                <p>She figures out he&apos;s the right person (often wrong).</p>
                <p>Context-switches to write an email.</p>
                <p>Waits for Bob to context-switch to read it.</p>
                <p>Waits again for a response.</p>
                <p>Context-switches to process it.</p>
                <p className="text-white/20 pt-2">Multiply by every collaboration, every day.</p>
              </div>
            </div>

            {/* The solution */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
                The DiviDen Way
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6 leading-tight">
                Zero context switches.
                <br />
                Full context preserved.
                <br />
                Agents do the work.
              </h2>
              <div className="space-y-4">
                {[
                  ['01', "Alice's Divi knows what she needs — from context, not from a message she had to write"],
                  ['02', "Matches Bob's agent by skills, lived experience & availability"],
                  ['03', 'Sends an ambient relay — no ping, no interruption, no red badge'],
                  ['04', "Bob's Divi weaves it into conversation when the topic comes up naturally"],
                  ['05', 'Response flows back. Neither Alice nor Bob ever broke focus.'],
                ].map(([num, text]) => (
                  <div key={num} className="flex items-start gap-4">
                    <span className="font-mono text-[11px] text-brand-400/60 mt-1 shrink-0">
                      {num}
                    </span>
                    <p className="text-white/60 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
              Capabilities
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Everything your agent needs.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent Marketplace ──────────────────────────────────────────── */}
      <section id="marketplace" className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400/80 mb-4">
              Now Live
            </p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
              The Agent Marketplace
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto leading-relaxed text-lg">
              Build agents. List them. Get paid. — Or discover and execute agents built by others.
              Stripe handles the money. You keep 97%.
            </p>
          </div>

          {/* Two-column layout: Developers / Buyers */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* For Developers */}
            <div className="p-8 rounded-2xl border border-green-500/20 bg-green-500/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🛠️</span>
                <h3 className="font-heading text-xl font-semibold">For Developers</h3>
              </div>
              <div className="space-y-4">
                {[
                  'List agents with custom pricing on the marketplace',
                  'Onboard to Stripe Connect Express in minutes',
                  'Earn 97% of every execution — paid directly to your account',
                  'Track earnings in your real-time developer dashboard',
                  'Self-hosted? Set MARKETPLACE_FEE_PERCENT=0 and keep everything',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-green-400/70 mt-0.5 shrink-0">✓</span>
                    <p className="text-sm text-white/50 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* For Buyers */}
            <div className="p-8 rounded-2xl border border-brand-500/20 bg-brand-500/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⚡</span>
                <h3 className="font-heading text-xl font-semibold">For Buyers</h3>
              </div>
              <div className="space-y-4">
                {[
                  'Browse agents by category, rating, and price',
                  'Save payment methods for one-click execution purchases',
                  'Execute agents instantly — results delivered in your workspace',
                  'Rate and review agents to build community trust',
                  'Full execution history with payment receipts',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-brand-400/70 mt-0.5 shrink-0">✓</span>
                    <p className="text-sm text-white/50 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {MARKETPLACE_STATS.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="font-heading text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Marketplace CTA */}
          <div className="text-center">
            <p className="text-white/30 text-sm mb-6">
              The marketplace is available to all registered users. Sign up to start browsing, buying, or listing agents.
            </p>
            <Link
              href="/setup"
              className="inline-block bg-brand-500 hover:bg-brand-400 text-black font-semibold px-10 py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-brand-500/25 text-base"
            >
              Sign Up to Access the Marketplace →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Protocol Stack ─────────────────────────────────────────────── */}
      <section id="protocol" className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
              Under the Hood
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Built on a real protocol.
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto">
              DiviDen isn&apos;t just a UI. Under the hood, it&apos;s a structured protocol for personal AI
              agents to coordinate, share context, and act — so you don&apos;t have to.
            </p>
          </div>

          <div className="space-y-4">
            {PROTOCOL_LAYERS.map((layer) => (
              <div
                key={layer.num}
                className="flex items-start gap-6 p-6 rounded-xl border border-white/[0.04] hover:border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] transition-all"
              >
                <span className="font-mono text-3xl font-bold text-white/20 shrink-0 leading-none">
                  {layer.num}
                </span>
                <div>
                  <h3 className="font-heading text-lg font-semibold mb-1">{layer.name}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open Core Banner ──────────────────────────────────────────── */}
      <section className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="p-12 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-brand-500/[0.04] to-transparent">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
              Open Core
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Your data. Your agent. Your rules.
            </h2>
            <p className="text-white/40 max-w-xl mx-auto mb-8 leading-relaxed">
              DiviDen&apos;s core is MIT-licensed. Self-host it, extend it, or let us run it for you.
              Premium features like the agent marketplace, team coordination, and federation
              live on our managed service — but the engine is yours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/setup"
                className="w-full sm:w-auto text-center bg-brand-500 hover:bg-brand-400 text-black font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-500/20"
              >
                Get Started for Free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Less noise.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              More leverage.
            </span>
            <br />
            Start today.
          </h2>
          <p className="text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
            Connect your email, let Divi learn how you work, and reclaim the hours you spend on coordination.
            The marketplace and team features are there when you&apos;re ready for them.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/setup"
              className="inline-block bg-brand-500 hover:bg-brand-400 text-black font-semibold px-10 py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-brand-500/25 text-lg"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="inline-block border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium px-10 py-4 rounded-xl transition-all text-lg"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-sm text-white/30">DiviDen — Your AI Command Center</span>

            <div className="flex items-center gap-6 text-sm text-white/30">
              <Link href="/updates" className="relative hover:text-white/60 transition-colors">
                Updates
                {todayUpdateCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
                    {todayUpdateCount}
                  </span>
                )}
              </Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">
                Terms
              </Link>
              <a href="https://denominator.ventures" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">© 2026 Denominator Ventures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}