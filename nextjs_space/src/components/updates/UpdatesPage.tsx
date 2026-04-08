'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UPDATES, Update } from '@/lib/updates';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderContent(content: string) {
  // Simple markdown-ish rendering
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;

  for (const line of lines) {
    key++;
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key} className="font-heading text-xl font-bold text-white mt-10 mb-4">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key} className="text-white font-semibold mt-4 mb-1">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={key} className="flex items-start gap-2 ml-1 mb-1.5">
          <span className="text-brand-400 mt-1 shrink-0">·</span>
          <p className="text-white/60 leading-relaxed">{renderInlineFormatting(line.slice(2))}</p>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key} className="h-3" />);
    } else {
      elements.push(
        <p key={key} className="text-white/60 leading-relaxed mb-1">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  return elements;
}

function renderInlineFormatting(text: string) {
  // Handle **bold** and "quotes"
  const parts = text.split(/(\*\*[^*]+\*\*|"[^"]+")/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      return <em key={i} className="text-white/50">{part}</em>;
    }
    return part;
  });
}

function UpdateEntry({ update, isExpanded, onToggle }: { update: Update; isExpanded: boolean; onToggle: () => void }) {
  return (
    <article className="border-b border-white/[0.04] last:border-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-8 group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <time className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-400/70">
                {formatDate(update.date)}
              </time>
              <div className="flex gap-1.5">
                {update.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-white group-hover:text-brand-400 transition-colors leading-tight">
              {update.title}
            </h2>
            {update.subtitle && (
              <p className="text-sm text-white/40 mt-2 leading-relaxed max-w-3xl">
                {update.subtitle}
              </p>
            )}
          </div>
          <div className="shrink-0 mt-2">
            <span className={`text-white/20 text-lg transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>
              →
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="pb-12 max-w-3xl text-[15px] leading-[1.75]">
          {renderContent(update.content)}
        </div>
      )}
    </article>
  );
}

export function UpdatesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(UPDATES[0]?.id || null);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <svg viewBox="0 0 130 50" fill="none" xmlns="http://www.w3.org/2000/svg" width="91" height="35" aria-label="DiviDen">
              <rect x="1" y="1" width="128" height="48" rx="2" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <line x1="1" y1="12" x2="1" y2="38" stroke="#4F7CFF" strokeWidth="1.5" />
              <text x="65" y="31" textAnchor="middle" fill="#F5F5F5" fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif" fontSize="18" fontWeight="600" letterSpacing="0.5">DiviDen</text>
            </svg>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
              Home
            </Link>
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white px-4 py-2 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-4">
            Updates
          </p>
          <h1 className="font-heading text-3xl md:text-5xl font-bold leading-tight mb-4">
            What we&apos;re building
            <br />
            <span className="text-white/30">and why.</span>
          </h1>
          <p className="text-white/40 max-w-2xl leading-relaxed">
            Real-time notes on what shipped, the thinking behind it, and what it means for
            the people and organizations using DiviDen as their working protocol.
          </p>
        </div>
      </section>

      {/* ── Updates List ── */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-t border-white/[0.06]">
            {UPDATES.map((update) => (
              <UpdateEntry
                key={update.id}
                update={update}
                isExpanded={expandedId === update.id}
                onToggle={() => setExpandedId(expandedId === update.id ? null : update.id)}
              />
            ))}
          </div>

          {UPDATES.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/30">No updates yet. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-sm text-white/30">DiviDen — The Agentic Working Protocol</span>
            <div className="flex items-center gap-6 text-sm text-white/30">
              <Link href="/" className="hover:text-white/60 transition-colors">
                Home
              </Link>
              <a
                href="https://github.com/Denominator-Ventures/dividen"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                GitHub
              </a>
              <a href="https://denominator.ventures" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">© 2026 Denominator Ventures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
