export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DiviDen Open Source — Self-Host Your AI Command Center',
  description: 'MIT-licensed core. Self-host DiviDen for full data sovereignty, custom integrations, and team environments. Or let us run it for you.',
  openGraph: {
    title: 'DiviDen Open Source',
    description: 'MIT-licensed core. Self-host for full data sovereignty.',
    images: [{ url: '/api/og?title=Open+Source&subtitle=Your+data.+Your+agent.+Your+rules.&tag=opencore', width: 1200, height: 630 }],
  },
};

/* ── Reusable components ─────────────────────────────────────────────────── */

function SectionHeading({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-400 mb-3">{tag}</p>
      <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-3">{title}</h2>
      {subtitle && <p className="text-white/40 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function ComparisonRow({ feature, selfHosted, managed }: { feature: string; selfHosted: string; managed: string }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-3 pr-4 text-sm text-white/70 font-medium">{feature}</td>
      <td className="py-3 px-4 text-sm text-white/50 text-center">{selfHosted}</td>
      <td className="py-3 pl-4 text-sm text-brand-400 text-center">{managed}</td>
    </tr>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{description}</p>
    </div>
  );
}

function EnvVar({ name, description, required }: { name: string; description: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <code className="text-sm font-mono text-brand-400 flex-shrink-0">{name}</code>
      <p className="text-xs text-white/40 flex-1">{description}</p>
      {required && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">required</span>}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-heading font-bold text-white hover:text-brand-400 transition-colors">
            ← DiviDen
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/documentation" className="text-sm text-white/50 hover:text-white transition-colors">Docs</Link>
            <Link href="/docs/developers" className="text-sm text-white/50 hover:text-white transition-colors">API</Link>
            <Link href="/docs/federation" className="text-sm text-white/50 hover:text-white transition-colors">Federation</Link>
            <a href="https://github.com/dividen" target="_blank" rel="noopener noreferrer" className="text-sm bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white px-4 py-2 rounded-lg transition-all">
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-20 md:pt-36 md:pb-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
            <span className="font-mono text-xs text-brand-400">MIT License · Opencore</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your data. Your agent.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              Your rules.
            </span>
          </h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            DiviDen&apos;s core is MIT-licensed. Self-host it for full data sovereignty,
            bring your own OAuth credentials, extend it with custom integrations,
            or run private team environments. The managed platform adds marketplace,
            federation, and zero-config convenience — but the engine is yours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/dividen"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-medium px-8 py-3.5 rounded-xl transition-all"
            >
              ⭐ Star on GitHub
            </a>
            <Link
              href="/setup"
              className="w-full sm:w-auto text-center bg-brand-500 hover:bg-brand-400 text-black font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-500/20"
            >
              Try Managed Platform →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Self-Host ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            tag="Why Self-Host"
            title="Security, sovereignty, and extensibility"
            subtitle="Every byte of data stays on your infrastructure. No third-party data processing. No vendor lock-in. Full control over integrations and agent behavior."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🔒"
              title="Full Data Sovereignty"
              description="Your conversations, contacts, relays, and agent memory never leave your servers. No shared databases, no telemetry, no cloud dependencies."
            />
            <FeatureCard
              icon="🔑"
              title="Bring Your Own OAuth"
              description="Self-hosted instances use your own Google Cloud project for Gmail, Calendar, and Drive. No shared credentials — complete OAuth isolation."
            />
            <FeatureCard
              icon="🛠️"
              title="Custom Integrations"
              description="Extend the protocol with custom action tags, webhook handlers, and MCP tools. Wire DiviDen into your existing infrastructure without restrictions."
            />
            <FeatureCard
              icon="👥"
              title="Private Team Environments"
              description="Run DiviDen for your team on your own infrastructure. Internal relays, private marketplace agents, and custom prompt configurations."
            />
            <FeatureCard
              icon="🌐"
              title="Federation Ready"
              description="Your self-hosted instance can federate with other DiviDen instances — including the managed platform — via DAWP (DiviDen Agent Wire Protocol)."
            />
            <FeatureCard
              icon="📊"
              title="Full Audit Trail"
              description="Every agent decision generates a reasoning brief. Self-hosted means you own the audit log — no third-party compliance concerns."
            />
          </div>
        </div>
      </section>

      {/* ── What's Included ──────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            tag="Open Core"
            title="What ships in the MIT-licensed core"
            subtitle="Everything you need to run a fully functional AI command center. The managed platform adds convenience and network effects — but nothing is locked away."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🧠', label: 'Full AI Agent Engine', detail: '17 prompt groups, 56 action tags, persistent memory' },
              { icon: '📋', label: 'Queue & NOW Engine', detail: 'Dynamic priority ranking, queue gating, mark-complete workflows' },
              { icon: '📧', label: 'Multi-Inbox', detail: 'Up to 3 Google accounts per operator identity, unified inbox with account filtering' },
              { icon: '📅', label: 'Calendar Integration', detail: 'Full read/write Google Calendar with checkbox-style event management' },
              { icon: '💬', label: 'Persistent Chat', detail: 'Context compounds over sessions. Discuss with Divi from any view.' },
              { icon: '🎯', label: 'Goals & Progress', detail: 'Define objectives, track measurable progress, automatic priority scoring' },
              { icon: '⚡', label: 'Relay Protocol', detail: 'Direct, broadcast, and ambient modes with learning engine' },
              { icon: '📄', label: 'The Brief', detail: 'Full reasoning artifact on every agent decision' },
              { icon: '👥', label: 'Teams & Projects', detail: 'Persistent teams, scoped projects, visibility controls' },
              { icon: '🔗', label: 'Webhooks & API', detail: 'Inbound/outbound webhooks, REST API with key auth' },
              { icon: '🛠️', label: 'MCP v1.6 Tools', detail: '60+ tools including capabilities_browse, queue gating' },
              { icon: '🎨', label: 'AgentWidget System', detail: 'Interactive components in chat — choice cards, action lists, payment prompts' },
              { icon: '📁', label: 'Google Drive', detail: 'Read-only access to Drive files via OAuth' },
              { icon: '✉️', label: 'Gmail API Send', detail: 'Send via Gmail API — no SMTP config needed for Google accounts' },
              { icon: '📝', label: 'Drafts & Inline Reply', detail: 'Drafts filter tab, inline reply bar in inbox threads' },
              { icon: '🔐', label: 'Write Scopes', detail: 'gmail.send, gmail.compose, full calendar read/write' },
              { icon: '🏗️', label: 'Self-Hosted OAuth', detail: 'Graceful degradation when Google OAuth not configured' },
              { icon: '📦', label: 'Capabilities System', detail: '20 skill packs across 7 categories, integration-gated installs' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-4">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{item.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ──────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading
            tag="Comparison"
            title="Self-Hosted vs Managed Platform"
            subtitle="The core engine is identical. The managed platform adds network effects, zero-config integrations, and marketplace payments."
          />
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 px-4 text-left text-xs font-mono uppercase tracking-wider text-white/30">Feature</th>
                  <th className="py-3 px-4 text-center text-xs font-mono uppercase tracking-wider text-white/30">Self-Hosted</th>
                  <th className="py-3 px-4 text-center text-xs font-mono uppercase tracking-wider text-brand-400">Managed</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow feature="AI Agent Engine" selfHosted="✅ Full" managed="✅ Full" />
                <ComparisonRow feature="Chat, Queue, NOW, Goals" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Multi-Inbox (3 accounts)" selfHosted="✅ BYOO" managed="✅ Pre-configured" />
                <ComparisonRow feature="Gmail API Send" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Calendar Read/Write" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Google Drive" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Relay Protocol" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="The Brief (Reasoning)" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="AgentWidget System" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Discuss with Divi" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Capabilities (20 packs)" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="MCP v1.6 / A2A v0.4" selfHosted="✅" managed="✅" />
                <ComparisonRow feature="Federation (DAWP)" selfHosted="✅ Configure" managed="✅ Built-in" />
                <ComparisonRow feature="Bubble Store" selfHosted="—" managed="✅ Network" />
                <ComparisonRow feature="Stripe Payments" selfHosted="—" managed="✅ 97% payout" />
                <ComparisonRow feature="OAuth Configuration" selfHosted="Your GCP project" managed="Zero-config" />
                <ComparisonRow feature="Hosting" selfHosted="Your infra" managed="Fully managed" />
                <ComparisonRow feature="Data Location" selfHosted="Your servers" managed="Our cloud" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Self-Hosting Quick Start ─────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading
            tag="Quick Start"
            title="Self-host in under 10 minutes"
            subtitle="Clone the repo, configure your environment, and you're live. Production-ready with Docker or bare-metal Node.js."
          />

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-white font-bold mb-3">1. Clone & Install</h3>
              <pre className="bg-black/50 rounded-lg p-4 text-sm font-mono text-white/60 overflow-x-auto">
{`git clone https://github.com/dividen/dividen.git
cd dividen
yarn install
cp .env.example .env`}
              </pre>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-white font-bold mb-3">2. Configure Environment</h3>
              <div className="bg-black/50 rounded-lg border border-white/[0.06] p-4">
                <EnvVar name="DATABASE_URL" description="PostgreSQL connection string" required />
                <EnvVar name="NEXTAUTH_SECRET" description="Random 32+ char secret for session encryption" required />
                <EnvVar name="NEXTAUTH_URL" description="Your instance URL (e.g. https://dividen.yourcompany.com)" required />
                <EnvVar name="OPENAI_API_KEY" description="LLM provider API key" required />
                <EnvVar name="GOOGLE_CLIENT_ID" description="Your GCP OAuth client ID (for Gmail/Calendar/Drive)" />
                <EnvVar name="GOOGLE_CLIENT_SECRET" description="Your GCP OAuth client secret" />
                <EnvVar name="GOOGLE_REDIRECT_URI" description="OAuth callback URL (https://your-domain/api/auth/google-callback)" />
                <EnvVar name="FEDERATION_SECRET" description="Shared secret for cross-instance relay HMAC signing" />
                <EnvVar name="STRIPE_SECRET_KEY" description="For marketplace payments (optional)" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-white font-bold mb-3">3. Initialize & Run</h3>
              <pre className="bg-black/50 rounded-lg p-4 text-sm font-mono text-white/60 overflow-x-auto">
{`yarn prisma generate
yarn prisma db push
yarn build
yarn start`}
              </pre>
              <p className="text-sm text-white/40 mt-3">Or with Docker:</p>
              <pre className="bg-black/50 rounded-lg p-4 text-sm font-mono text-white/60 overflow-x-auto mt-2">
{`docker compose up -d`}
              </pre>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-brand-500/[0.04] border border-brand-500/10">
            <p className="text-sm text-white/50">
              <span className="text-brand-400 font-bold">Note on OAuth:</span> If you skip Google OAuth setup,
              DiviDen will gracefully degrade — the Integration Manager shows a setup prompt with a link to
              the Google Cloud Console instead of a broken connect button. No crashes, no silent failures.
            </p>
          </div>
        </div>
      </section>

      {/* ── Architecture ─────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            tag="Architecture"
            title="10 protocol layers, 60 data models"
            subtitle="DiviDen is structured as a layered protocol — each layer is independently testable, extensible, and replaceable."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { num: '01', name: 'Identity & Profile', desc: 'Routing manifests — not résumés. Skills, experience, task types, availability.' },
              { num: '02', name: 'Goals & NOW Engine', desc: 'Objectives + dynamic priority ranking engine that surfaces what matters now.' },
              { num: '03', name: 'Ambient Relay Protocol', desc: 'Direct, broadcast, and ambient modes. Agents exchange context-rich relays.' },
              { num: '04', name: 'The Brief', desc: 'Every orchestration generates a reasoning artifact with full transparency.' },
              { num: '05', name: 'Ambient Learning', desc: 'Every relay interaction feeds timing, disruption, topic success learnings.' },
              { num: '06', name: 'Teams & Projects', desc: 'Persistent teams, scoped projects, organizational context for routing.' },
              { num: '07', name: 'Capabilities & Marketplace', desc: 'Modular skill packs, integration-gated installs, 20 seeded capabilities.' },
              { num: '08', name: 'Federation (DAWP)', desc: 'Cross-instance communication. Your company, theirs. Agents still coordinate.' },
              { num: '09', name: 'Integration Surface', desc: 'A2A v0.4, MCP v1.6, webhooks, Agent API v2 — connect anything.' },
              { num: '10', name: 'Marketplace & Payments', desc: 'Agent marketplace with Stripe Connect. 97% developer payout.' },
            ].map((layer) => (
              <div key={layer.num} className="flex items-start gap-4 bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-4">
                <span className="font-mono text-lg font-bold text-brand-500/40">{layer.num}</span>
                <div>
                  <div className="text-sm font-bold text-white">{layer.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{layer.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Google Scopes ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionHeading
            tag="Integration Scopes"
            title="Google OAuth — full read & write"
            subtitle="Self-hosted instances use your own GCP project. The managed platform provides pre-configured OAuth. Either way, these are the scopes."
          />
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6">
            <div className="space-y-3">
              {[
                { scope: 'gmail.readonly', desc: 'Read inbox threads, list messages', rw: 'Read' },
                { scope: 'gmail.send', desc: 'Send mail as the authenticated user via Gmail API', rw: 'Write' },
                { scope: 'gmail.compose', desc: 'Create and manage drafts', rw: 'Write' },
                { scope: 'calendar', desc: 'Full read/write access to Google Calendar events', rw: 'Read/Write' },
                { scope: 'drive.readonly', desc: 'List and read Google Drive files', rw: 'Read' },
                { scope: 'userinfo.email', desc: 'Access user email address', rw: 'Read' },
                { scope: 'userinfo.profile', desc: 'Access user profile information', rw: 'Read' },
              ].map((s) => (
                <div key={s.scope} className="flex items-center gap-4 py-2 border-b border-white/[0.03] last:border-0">
                  <code className="text-sm font-mono text-brand-400 w-40 flex-shrink-0">{s.scope}</code>
                  <span className="text-xs text-white/40 flex-1">{s.desc}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                    s.rw === 'Write' ? 'bg-amber-500/10 text-amber-400' :
                    s.rw === 'Read/Write' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>{s.rw}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Developer Resources ───────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            tag="Developer Resources"
            title="Everything you need to build on DiviDen"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/documentation" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">📖 Documentation</h3>
              <p className="text-sm text-white/40">Comprehensive guide — architecture, self-hosting, API reference, capabilities marketplace, agent protocols.</p>
            </Link>
            <Link href="/docs/developers" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">🔧 API Reference</h3>
              <p className="text-sm text-white/40">REST API endpoints, authentication, rate limits, MCP tools, and agent action tags.</p>
            </Link>
            <Link href="/docs/federation" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">🌐 Federation Guide</h3>
              <p className="text-sm text-white/40">DAWP protocol, instance registration, cross-instance relay, agent sync, and marketplace peering.</p>
            </Link>
            <Link href="/docs/integrations" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">🔗 Integrations</h3>
              <p className="text-sm text-white/40">Gmail, Calendar, Drive, Meeting Transcription, Webhooks — setup and configuration for each.</p>
            </Link>
            <Link href="/docs/release-notes" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">📋 Release Notes</h3>
              <p className="text-sm text-white/40">Version history, platform changelog, protocol updates, and migration guides.</p>
            </Link>
            <a href="https://github.com/dividen" target="_blank" rel="noopener noreferrer" className="block bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-6 hover:border-brand-500/30 transition-colors group">
              <h3 className="text-white font-bold mb-2 group-hover:text-brand-400 transition-colors">⭐ GitHub</h3>
              <p className="text-sm text-white/40">Source code, issue tracker, contribution guide, and discussions.</p>
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-6">
            Run it yourself. Or let us.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              Either way, it&apos;s yours.
            </span>
          </h2>
          <p className="text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
            The MIT-licensed core gives you everything you need. The managed platform
            gives you everything you don&apos;t want to maintain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/dividen"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-medium px-8 py-3.5 rounded-xl transition-all"
            >
              Clone the Repo
            </a>
            <Link
              href="/setup"
              className="w-full sm:w-auto text-center bg-brand-500 hover:bg-brand-400 text-black font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-500/20"
            >
              Start on Managed →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-sm text-white/30">DiviDen — MIT-licensed AI Command Center</span>
            <div className="flex items-center gap-6 text-sm text-white/30">
              <Link href="/documentation" className="hover:text-white/60 transition-colors">Docs</Link>
              <Link href="/updates" className="hover:text-white/60 transition-colors">Updates</Link>
              <a href="https://github.com/dividen" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">GitHub</a>
              <a href="https://denominator.ventures" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">© 2026 Denominator Ventures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
