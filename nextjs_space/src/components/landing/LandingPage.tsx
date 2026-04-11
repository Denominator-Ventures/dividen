'use client';

import { useState, useEffect, useMemo } from 'react';
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
];

// ─── Main Landing Page ──────────────────────────────────────────────────────
export function LandingPage() {
  const typedText = useTypingEffect(
    [
      'manage your pipeline',
      'coordinate across teams',
      'delegate to your AI agent',
      'show its work on every decision',
      'track goals and priorities',
      'route work intelligently',
      'learn from every interaction',
    ],
    70,
    1800
  );

  const [mounted, setMounted] = useState(false);
  const [todayUpdateCount, setTodayUpdateCount] = useState(0);
  useEffect(() => {
    setMounted(true);
    // Compute today's update count client-side to avoid hydration mismatch
    const today = new Date().toISOString().slice(0, 10);
    setTodayUpdateCount(UPDATES.filter(u => u.date === today).length);
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
            <a href="#protocol" className="text-sm text-white/50 hover:text-white transition-colors">
              Protocol
            </a>
            <a
              href="https://os.dividen.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Open Source
            </a>
            <a
              href="https://github.com/Denominator-Ventures/dividen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              GitHub
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
              The Agentic Working Protocol
            </p>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
              The last interface
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
                you&apos;ll ever need.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-4 leading-relaxed">
              Your personal AI agent that manages your pipeline, coordinates with other agents,
              and acts on your behalf — across every team, tool, and company boundary.
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
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-8 py-3.5 rounded-xl transition-all text-base"
              >
                View on GitHub →
              </a>
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* ── Protocol Stack ─────────────────────────────────────────────── */}
      <section id="protocol" className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
              Architecture
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Protocol-first. Frontend-second.
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto">
              DiviDen is not a dashboard. It&apos;s a protocol — a structured way for personal AI
              agents to coordinate on behalf of the humans they serve.
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

      {/* ── Open Source Banner ──────────────────────────────────────────── */}
      <section className="py-20 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="p-12 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-brand-500/[0.04] to-transparent">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
              Open Source
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Build your own interface.
            </h2>
            <p className="text-white/40 max-w-xl mx-auto mb-8 leading-relaxed">
              DiviDen is a protocol, not a product. The entire stack is open source —
              fork it, self-host it, and build the interface that fits the way you work.
              No vendor lock-in. No permission needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://os.dividen.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center bg-brand-500 hover:bg-brand-400 text-black font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-500/20"
              >
                Explore the Open Source Project →
              </a>
              <a
                href="/docs/federation"
                className="w-full sm:w-auto text-center border border-white/10 hover:border-brand-500/40 text-white/70 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-all"
              >
                Federation Guide →
              </a>
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center bg-white/10 hover:bg-white/15 text-white px-8 py-3.5 rounded-xl transition-all font-medium"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Welcome to the
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              future of work.
            </span>
          </h2>
          <p className="text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
            One agent. One protocol. Every collaboration — handled.
          </p>
          <Link
            href="/setup"
            className="inline-block bg-brand-500 hover:bg-brand-400 text-black font-semibold px-10 py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-brand-500/25 text-lg"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-sm text-white/30">DiviDen — The Agentic Working Protocol</span>

            <div className="flex items-center gap-6 text-sm text-white/30">
              <a
                href="https://os.dividen.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                Open Source
              </a>
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                GitHub
              </a>
              <Link href="/updates" className="relative hover:text-white/60 transition-colors">
                Updates
                {todayUpdateCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
                    {todayUpdateCount}
                  </span>
                )}
              </Link>
              <Link href="/docs/integrations" className="hover:text-white/60 transition-colors">
                Docs
              </Link>
              <a href="https://denominator.ventures" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">© 2026 Denominator Ventures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}