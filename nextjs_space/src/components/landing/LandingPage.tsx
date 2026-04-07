'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    title: '18-Layer Agent Intelligence',
    description:
      'Your Divi knows your pipeline, your contacts, your calendar, your memory — and reasons across all of it simultaneously.',
  },
  {
    icon: '🔗',
    title: 'Agent-to-Agent Relay',
    description:
      'Structured inter-agent communication. Your agent talks to their agent. Zero unnecessary context switches.',
  },
  {
    icon: '🌐',
    title: 'Federated by Design',
    description:
      'No shared database. No vendor lock-in. Your instance, your data. Agents communicate across boundaries transparently.',
  },
  {
    icon: '⚡',
    title: 'Action Tags — Not Just Chat',
    description:
      '26 executable actions via natural conversation. Create cards, dispatch tasks, send relays, update CRM — all from chat.',
  },
  {
    icon: '🔌',
    title: 'MCP + A2A Native',
    description:
      'Full MCP server and A2A protocol support. Any compatible agent can join your DiviDen network.',
  },
  {
    icon: '🛡️',
    title: 'Privacy-First Profiles',
    description:
      'Rich identity profiles — skills, lived experience, task types — with granular privacy controls on every section.',
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
    name: 'Agent Relay Protocol',
    desc: 'Structured messages between agents — intent-classified, priority-weighted, with full lifecycle tracking.',
  },
  {
    num: '03',
    name: 'Federation',
    desc: 'Cross-instance communication. Your company runs one, theirs runs another. Agents still coordinate seamlessly.',
  },
  {
    num: '04',
    name: 'Integration Surface',
    desc: 'MCP server, A2A bridge, webhooks, Agent API v2 — connect anything, from anywhere.',
  },
];

// ─── Main Landing Page ──────────────────────────────────────────────────────
export function LandingPage() {
  const typedText = useTypingEffect(
    [
      'manage your pipeline',
      'coordinate across teams',
      'delegate to your AI agent',
      'federate across companies',
      'route work intelligently',
    ],
    70,
    1800
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
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
              href="https://github.com/Denominator-Ventures/dividen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              GitHub
            </a>
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
                  ['01', "Alice's Divi knows what she needs"],
                  ['02', "Matches Bob's agent by skills, experience & availability"],
                  ['03', 'Agents exchange a structured relay — context-rich, intent-classified'],
                  ['04', "Bob's Divi triages and presents it when Bob is ready"],
                  ['05', 'Response flows back. Alice never broke focus.'],
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
              Built in the open.
            </h2>
            <p className="text-white/40 max-w-xl mx-auto mb-8 leading-relaxed">
              DiviDen is open source. Fork it. Self-host it. Build your own frontend.
              The protocol lives independently of any single UI, LLM provider, or deployment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center bg-white/10 hover:bg-white/15 text-white px-8 py-3.5 rounded-xl transition-all font-medium"
              >
                ⭐ Star on GitHub
              </a>
              <Link
                href="/docs/integrations"
                className="w-full sm:w-auto text-center border border-white/10 hover:border-white/20 text-white/60 hover:text-white px-8 py-3.5 rounded-xl transition-all"
              >
                Read the Docs
              </Link>
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
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-[10px] font-bold text-black">
                D
              </div>
              <span className="text-sm text-white/30">DiviDen — The Agentic Working Protocol</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/30">
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                GitHub
              </a>
              <Link href="/docs/integrations" className="hover:text-white/60 transition-colors">
                Docs
              </Link>
              <span>© 2026 Denominator Ventures</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}