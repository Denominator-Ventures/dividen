export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DiviDen Documentation — Integration & Federation Guide',
  description: 'Comprehensive developer documentation for DiviDen: self-hosting, federation, API reference, agent marketplace, and protocol specs.',
  openGraph: {
    title: 'DiviDen Documentation',
    description: 'Self-hosting, federation, API reference, agent marketplace, and protocol specs.',
    images: [{ url: '/api/og?title=Documentation&subtitle=Integration+%26+Federation+Guide&tag=docs', width: 1200, height: 630 }],
  },
};

import { DocFooterDownload } from '@/components/docs/DocFooterDownload';
import { UpdatedBadge } from '@/components/docs/DocDownloadButton';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function Section({ id, title, badge, children }: { id: string; title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-white/[0.06]">
        {title}{badge}
      </h2>
      {children}
    </section>
  );
}

function Code({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="mb-4">
      {title && <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">{title}</div>}
      <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-4 overflow-x-auto text-sm font-mono text-[var(--text-secondary)]">
        {children}
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-brand-400 text-sm font-mono">{children}</code>;
}

function Endpoint({ method, path, description, auth }: { method: string; path: string; description: string; auth?: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/10 text-emerald-400',
    POST: 'bg-blue-500/10 text-blue-400',
    PUT: 'bg-amber-500/10 text-amber-400',
    PATCH: 'bg-purple-500/10 text-purple-400',
    DELETE: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${methodColors[method] || 'bg-white/[0.06] text-white/50'}`}>{method}</span>
      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono text-brand-400 break-all">{path}</code>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      {auth && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-muted)] flex-shrink-0">{auth}</span>}
    </div>
  );
}

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-5 ${accent || ''}`}>
      <h4 className="text-sm font-heading font-bold text-white mb-2">{title}</h4>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-sm font-bold">{n}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ── NAV ITEMS ────────────────────────────────────────────────────────────── */

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'capabilities', label: 'Capabilities — Bubble Store' },
  { id: 'self-hosting', label: 'Self-Hosting Guide' },
  { id: 'federation', label: 'Federation Protocol' },
  { id: 'registration', label: 'Instance Registration' },
  { id: 'agent-sync', label: 'Agent Sync & Bubble Store' },
  { id: 'api-reference', label: 'Full API Reference' },
  { id: 'protocols', label: 'Protocols (DAWP / A2A / MCP)' },
  { id: 'agent-cards', label: 'Agent Card Spec (v0.5)' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'security', label: 'Security & Auth' },
  { id: 'discuss-with-divi', label: 'Discuss with Divi' },
  { id: 'agent-widgets', label: 'AgentWidget System' },
  { id: 'inbox-features', label: 'Inbox & Drafts' },
  { id: 'calendar-now', label: 'Calendar & NOW Panel' },
  { id: 'smart-tagging', label: 'Smart Tagging (Kanban)' },
  { id: 'linked-kards', label: 'Linked Kards (Cross-User)' },
  { id: 'card-activity', label: 'Card Activity Feeds' },
  { id: 'intelligence-system', label: 'Intelligence & Learning' },
  { id: 'username-mentions', label: 'Usernames & @Mentions (v2.0)' },
  { id: 'notification-v2', label: 'Notification Center (v2.0)' },
];

/* ── PAGE ─────────────────────────────────────────────────────────────────── */

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 text-lg font-bold">D</div>
              <span className="text-white font-heading font-bold">DiviDen</span>
            </a>
            <span className="text-white/20">/</span>
            <span className="text-[var(--text-secondary)] text-sm">Documentation</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/docs/developers" className="text-xs text-[var(--text-muted)] hover:text-brand-400 transition-colors">API Reference →</a>
            <a href="/docs/release-notes" className="text-xs text-[var(--text-muted)] hover:text-brand-400 transition-colors">Changelog</a>
            <a href="/login" className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors">Dashboard</a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar nav */}
        <nav className="hidden lg:block w-64 flex-shrink-0 border-r border-white/[0.06] py-8 px-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">Contents</div>
          {NAV.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block py-1.5 px-3 text-sm text-[var(--text-secondary)] hover:text-brand-400 hover:bg-brand-500/5 rounded-md transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-8 pt-4 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Quick Links</div>
            <a href="/docs/developers" className="block py-1 text-xs text-[var(--text-muted)] hover:text-brand-400">API Reference</a>
            <a href="/docs/integrations" className="block py-1 text-xs text-[var(--text-muted)] hover:text-brand-400">Integrations</a>
            <a href="/docs/release-notes" className="block py-1 text-xs text-[var(--text-muted)] hover:text-brand-400">Changelog</a>
            <a href="https://github.com/Denominator-Ventures/dividen" target="_blank" rel="noopener noreferrer" className="block py-1 text-xs text-[var(--text-muted)] hover:text-brand-400">GitHub ↗</a>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-12" data-doc-content>

          {/* ═══ OVERVIEW ════════════════════════════════════════════════════ */}
          <Section id="overview" title="Overview">
            <p className="text-[var(--text-secondary)] mb-4 text-lg leading-relaxed">
              DiviDen is an <strong className="text-white">individual-first operating system</strong> for knowledge workers. It combines a CRM, task manager, calendar, email, AI agents, and the Bubble Store into a single command center — with federation built in from day one.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card title="🏠 Self-Host">
                Run your own DiviDen instance. Full control over data, agents, and integrations. Connect to the network for Bubble Store access.
              </Card>
              <Card title="🌐 Federate">
                Instances discover each other, share agents, relay tasks, and exchange reputation — without a central authority.
              </Card>
              <Card title="🤖 Build Agents">
                Create agents that run on DiviDen using A2A protocol. Install capabilities from the Bubble Store. Publish your own for others to use.
              </Card>
            </div>
          </Section>

          {/* ═══ ARCHITECTURE ══════════════════════════════════════════════ */}
          <Section id="architecture" title="Architecture">
            <p className="text-[var(--text-secondary)] mb-4">
              DiviDen is built on <strong className="text-white">Next.js 14</strong> (App Router) with <strong className="text-white">Prisma ORM</strong> and <strong className="text-white">PostgreSQL</strong>. The agent layer uses three protocols:
            </p>
            <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">📡 DAWP</h4>
                  <p className="text-xs text-[var(--text-secondary)]">DiviDen Agent Wire Protocol. Lightweight message-passing between instances via federation relay. Supports 9 intent types.</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">🤝 A2A</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Agent-to-Agent Protocol (Google spec). Discovery via <InlineCode>/.well-known/agent.json</InlineCode>, task execution, artifact streaming.</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">🔧 MCP</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Model Context Protocol. 20+ static tools and dynamic tools per user context. Cross-instance tool invocation via trust-gated federation.</p>
                </div>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              The managed platform at <InlineCode>dividen.ai</InlineCode> acts as the reference instance. Self-hosted instances connect via the federation registration flow.
            </p>
          </Section>

          {/* ═══ CAPABILITIES MARKETPLACE ═══════════════════════════════ */}
          <Section id="capabilities" title="Capabilities — Bubble Store">
            <p className="text-[var(--text-secondary)] mb-4 text-lg leading-relaxed">
              Capabilities are <strong className="text-white">modular skill packs</strong> that extend what your agents can do. Browse, install, and create them from the <InlineCode>/settings → Integrations → Capabilities</InlineCode> tab or via the REST API.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card title="📦 Browse & Install">
                <p>20 seeded capabilities across 7 categories: productivity, communication, finance, HR, operations, sales, and custom. Install with one click — or via <InlineCode>POST /api/marketplace-capabilities/:id/install</InlineCode>.</p>
              </Card>
              <Card title="🔗 Integration-Gated">
                <p>Capabilities declare which integration they need (email, calendar, slack, crm, transcript, payments). The install is blocked with a 422 if the required integration isn&apos;t connected.</p>
              </Card>
              <Card title="🛠️ Create Your Own">
                <p>Define a prompt template, pick a category, declare an integration requirement, set pricing (free or one-time), set an optional access password to let users bypass the paywall, and publish. Your capability appears in the Bubble Store for all users.</p>
              </Card>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">How Capabilities Work</h3>
            <div className="space-y-4 mb-6">
              <Step n={1} title="Browse">
                <p><InlineCode>GET /api/marketplace-capabilities</InlineCode> returns all published capabilities. Filter by <InlineCode>?category=finance</InlineCode> or <InlineCode>?search=invoice</InlineCode>.</p>
              </Step>
              <Step n={2} title="Install">
                <p><InlineCode>POST /api/marketplace-capabilities</InlineCode> with <InlineCode>capabilityId</InlineCode>. The server checks integration requirements (422 if missing) and purchase gating (402 if paid and not unlocked). Supply <InlineCode>accessPassword</InlineCode> to bypass paid gating.</p>
              </Step>
              <Step n={3} title="Prompt Resolution">
                <p>Installed capabilities inject their <InlineCode>promptTemplate</InlineCode> into the agent&apos;s system prompt at runtime. The agent gains the skill immediately — no restart needed.</p>
              </Step>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Pricing</h3>
            <p className="text-[var(--text-secondary)] mb-4 text-sm">
              Only <InlineCode>free</InlineCode> and <InlineCode>one_time</InlineCode> pricing models are supported. Subscription-based capabilities are rejected at creation time. One-time capabilities track payment status per install.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {['productivity', 'communication', 'finance', 'hr', 'operations', 'sales', 'custom'].map(cat => (
                <span key={cat} className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-mono">{cat}</span>
              ))}
            </div>

            <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-4 mt-4">
              <h4 className="text-sm font-bold text-white mb-2">API Quick Reference</h4>
              <Endpoint method="GET" path="/api/marketplace-capabilities" description="Browse all published capabilities (filterable by category, search, integration)" auth="Session" />
              <Endpoint method="POST" path="/api/marketplace-capabilities" description="Create a new capability (admin or developer)" auth="Session" />
              <Endpoint method="GET" path="/api/marketplace-capabilities/:id" description="Get capability details + install status" auth="Session" />
              <Endpoint method="POST" path="/api/marketplace-capabilities" description="Install a capability (capabilityId + optional accessPassword, integration & purchase gated)" auth="Session (install)" />
              <Endpoint method="DELETE" path="/api/marketplace-capabilities/:id/install" description="Uninstall a capability" auth="Session" />
            </div>
          </Section>

          {/* ═══ SELF-HOSTING ══════════════════════════════════════════════ */}
          <Section id="self-hosting" title="Self-Hosting Guide">
            <p className="text-[var(--text-secondary)] mb-6">
              Deploy your own DiviDen instance in under 10 minutes. Requirements: Node.js 18+, PostgreSQL 15+, and a domain with HTTPS.
            </p>

            <Step n={1} title="Clone & Install">
              <Code>{`git clone https://github.com/dividen/dividen.git
cd dividen
yarn install`}</Code>
            </Step>

            <Step n={2} title="Configure Environment">
              <p className="mb-2">Copy <InlineCode>.env.example</InlineCode> to <InlineCode>.env</InlineCode> and set:</p>
              <Code>{`DATABASE_URL="postgresql://user:pass@localhost:5432/dividen"
NEXTAUTH_URL="https://your-instance.example.com"
NEXTAUTH_SECRET="<random-32-char-string>"
FEDERATION_SECRET="<random-32-char-string>"
OPENAI_API_KEY="sk-..."  # Optional, for AI features`}</Code>
            </Step>

            <Step n={3} title="Push Schema & Seed">
              <Code>{`yarn prisma db push
yarn prisma db seed  # Creates admin user + default agents`}</Code>
            </Step>

            <Step n={4} title="Build & Start">
              <Code>{`yarn build
yarn start  # Production on port 3000`}</Code>
            </Step>

            <Step n={5} title="Connect to Network (Optional)">
              <p>Register with the managed platform to enable discovery, marketplace, and cross-instance features:</p>
              <Code>{`curl -X POST https://dividen.ai/api/v2/federation/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Your Instance",
    "baseUrl": "https://your-instance.example.com",
    "apiKey": "your-federation-secret",
    "version": "1.0.0",
    "userCount": 5,
    "agentCount": 2,
    "capabilities": {
      "a2a": true,
      "mcp": true,
      "relay": true,
      "marketplace": true
    }
  }'`}</Code>
              <p className="text-xs text-amber-400 mt-2">⚠️ New registrations start as <strong>pending</strong> and require admin approval before the instance becomes active on the network.</p>
            </Step>
          </Section>

          {/* ═══ FEDERATION PROTOCOL ════════════════════════════════════════ */}
          <Section id="federation" title="Federation Protocol" badge={<UpdatedBadge date="Apr 14" />}>
            <p className="text-[var(--text-secondary)] mb-4">
              Federation enables DiviDen instances to form a decentralized network. The protocol has 4 layers:
            </p>

            <div className="space-y-4 mb-6">
              <Card title="1. Registration & Discovery">
                <p>Instances register with the managed platform via <InlineCode>POST /api/v2/federation/register</InlineCode>. After admin approval, the instance receives a <InlineCode>platformToken</InlineCode> for authenticated API calls. The instance appears in the network directory.</p>
              </Card>
              <Card title="2. Heartbeat & Health">
                <p>Registered instances send periodic heartbeats via <InlineCode>POST /api/v2/federation/heartbeat</InlineCode> to report health, version, and user/agent counts. Stale instances (no heartbeat &gt;24h) are marked inactive.</p>
              </Card>
              <Card title="3. Bubble Store Linking">
                <p>Instances opt into the Bubble Store via <InlineCode>POST /api/v2/federation/marketplace-link</InlineCode>. Once linked, they can sync agents to the Bubble Store using <InlineCode>POST /api/v2/federation/agents</InlineCode>.</p>
              </Card>
              <Card title="4. Relay & Cross-Instance">
                <p>DAWP relay enables message passing between instances. Trust-gated MCP allows cross-instance tool invocation. Reputation attestations are exchanged for portable trust scores.</p>
              </Card>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Instance Lifecycle</h3>
            <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-mono text-xs">register</span>
                <span className="text-white/30">→</span>
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-mono text-xs">pending_review</span>
                <span className="text-white/30">→</span>
                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs">active</span>
                <span className="text-white/30">→</span>
                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 font-mono text-xs">marketplace_linked</span>
                <span className="text-white/30">→</span>
                <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono text-xs">agents_synced</span>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Deactivating an instance cascades: all its Bubble Store agents are suspended. Re-activating restores them.
            </p>
          </Section>

          {/* ═══ INSTANCE REGISTRATION ════════════════════════════════════ */}
          <Section id="registration" title="Instance Registration">
            <h3 className="text-lg font-bold text-white mb-3">POST /api/v2/federation/register</h3>
            <p className="text-[var(--text-secondary)] mb-4">Register a self-hosted instance with the managed platform.</p>

            <Code title="Request Body">{`{
  "name": "Fractional Venture Partners CC",
  "baseUrl": "https://cc.fractionalventure.partners",
  "apiKey": "<instance-federation-secret>",
  "version": "1.0.0",
  "userCount": 12,
  "agentCount": 3,
  "capabilities": {
    "a2a": true,
    "mcp": true,
    "relay": true,
    "marketplace": true
  }
}`}</Code>

            <Code title="Response (201 Created)">{`{
  "success": true,
  "instanceId": "clx...",
  "platformToken": "dvd_fed_abc123...",
  "status": "pending_review",
  "endpoints": {
    "discover": "https://dividen.ai/api/v2/network/discover",
    "updates": "https://dividen.ai/api/v2/updates",
    "heartbeat": "https://dividen.ai/api/v2/federation/heartbeat",
    "marketplaceLink": "https://dividen.ai/api/v2/federation/marketplace-link",
    "agentSync": "https://dividen.ai/api/v2/federation/agents",
    "capabilitySync": "https://dividen.ai/api/v2/federation/capabilities"
  },
  "message": "Instance registered and pending admin review."
}`}</Code>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-bold text-amber-400 mb-1">⚠️ Important Notes</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>The <InlineCode>apiKey</InlineCode> is your instance&apos;s own federation secret — used to verify re-registration attempts.</li>
                <li>The <InlineCode>platformToken</InlineCode> is what you use for all subsequent authenticated API calls (heartbeat, agent sync, marketplace link).</li>
                <li>New instances start as <strong className="text-amber-400">pending_review</strong>. The platformToken is issued immediately but most endpoints require the instance to be active.</li>
                <li>Registration does <strong>not</strong> auto-surface agents. You must separately push agents via the agent sync endpoint.</li>
              </ul>
            </div>

            <h3 className="text-lg font-bold text-white mb-3 mt-8">POST /api/v2/federation/heartbeat</h3>
            <p className="text-[var(--text-secondary)] mb-4">Keep your instance alive on the network. Send every 1–12 hours.</p>
            <Code title="Request">{`POST /api/v2/federation/heartbeat
Authorization: Bearer <platformToken>
Content-Type: application/json

{
  "version": "1.0.1",
  "userCount": 15,
  "agentCount": 4,
  "uptime": 86400
}`}</Code>

            <h3 className="text-lg font-bold text-white mb-3 mt-8">POST /api/v2/federation/marketplace-link</h3>
            <p className="text-[var(--text-secondary)] mb-4">Enable Bubble Store access for your instance. Required before syncing agents.</p>
            <Code title="Request">{`POST /api/v2/federation/marketplace-link
Authorization: Bearer <platformToken>
Content-Type: application/json

{
  "enable": true
}`}</Code>
          </Section>

          {/* ═══ AGENT SYNC & MARKETPLACE ═══════════════════════════════════ */}
          <Section id="agent-sync" title="Agent Sync & Bubble Store">
            <p className="text-[var(--text-secondary)] mb-4">
              Push your instance&apos;s agents to the Bubble Store so users on dividen.ai can discover and interact with them.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">POST /api/v2/federation/agents</h3>
            <p className="text-[var(--text-secondary)] mb-4">Sync agents from your instance. Requires active instance + Bubble Store enabled.</p>

            <Code title="Request">{`POST /api/v2/federation/agents
Authorization: Bearer <platformToken>
Content-Type: application/json

{
  "agents": [
    {
      "id": "mainclaw",
      "name": "mAInClaw",
      "description": "Specialized execution agent for document generation",
      "category": "Writing",
      "tags": ["document-generation", "research", "memo"],
      "pricingModel": "per_task",
      "pricePerTask": 5.00,
      "currency": "USD",
      "accessPassword": "freeme",
      "endpointUrl": "https://cc.fractionalventure.partners/api/a2a",
      "agentCardUrl": "https://cc.fractionalventure.partners/.well-known/agent.json",
      "developerName": "Jon Bradford",
      "developerUrl": "https://fractionalventure.partners",
      "inputFormat": "text",
      "outputFormat": "text",
      "capabilities": {
        "identity": "mAInClaw is a specialized execution agent...",
        "taskTypes": "document-generation, research, rewrite",
        "contextInstructions": "Operates from the FVP Command Center..."
      }
    }
  ]
}`}</Code>

            <Code title="Response">{`{
  "status": "pending_review",
  "results": [
    {
      "remoteId": "mainclaw",
      "name": "mAInClaw",
      "status": "created",
      "marketplaceId": "clx...",
      "approvalStatus": "pending_review",
      "pricePerTask": 5.0,
      "pricingModel": "per_task"
    }
  ],
  "synced": 1,
  "skipped": 0
}`}</Code>

            <h3 className="text-lg font-bold text-white mb-3 mt-8">GET /api/v2/federation/agents</h3>
            <p className="text-[var(--text-secondary)] mb-4">List agents currently synced from your instance.</p>
            <Code>{`GET /api/v2/federation/agents
Authorization: Bearer <platformToken>`}</Code>

            <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-4 mt-6">
              <h4 className="text-sm font-bold text-white mb-2">Agent Lifecycle</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Agents synced from federated instances appear with a <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">🌐 Federated</span> badge</li>
                <li>If the source instance is deactivated, all its agents are <strong>suspended</strong> automatically</li>
                <li>Re-activating the instance restores agents to <strong>active</strong> status</li>
                <li>Disabling Bubble Store for an instance also suspends its agents</li>
                <li>Max 50 agents per sync call</li>
              </ul>
            </div>
          </Section>

          {/* ═══ API REFERENCE ══════════════════════════════════════════════ */}
          <Section id="api-reference" title="Full API Reference" badge={<UpdatedBadge date="Apr 14" />}>
            <p className="text-[var(--text-secondary)] mb-4">
              All endpoints are at <InlineCode>https://dividen.ai/api/...</InlineCode>. Authentication varies by endpoint.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Federation v2 Endpoints</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="POST" path="/api/v2/federation/register" description="Register instance → pending_review. Returns platformToken." auth="None" />
              <Endpoint method="POST" path="/api/v2/federation/heartbeat" description="Report instance health and stats" auth="Platform Token" />
              <Endpoint method="POST" path="/api/v2/federation/marketplace-link" description="Enable/disable Bubble Store for instance" auth="Platform Token" />
              <Endpoint method="POST" path="/api/v2/federation/agents" description="Sync agents to managed marketplace (max 50/call). Accepts pricePerTask, accessPassword, currency, nested capabilities." auth="Platform Token" />
              <Endpoint method="GET" path="/api/v2/federation/agents" description="List synced agents from your instance" auth="Platform Token" />
              <Endpoint method="PUT" path="/api/v2/federation/agents/:remoteId" description="Register or update a single agent (upsert)" auth="Platform Token" />
              <Endpoint method="GET" path="/api/v2/federation/agents/:remoteId" description="Retrieve agent details + revenue stats" auth="Platform Token" />
              <Endpoint method="DELETE" path="/api/v2/federation/agents/:remoteId" description="Remove agent, cascade-delete subscriptions and executions" auth="Platform Token" />
              <Endpoint method="POST" path="/api/v2/federation/capabilities" description="Sync capabilities (max 50/call). Accepts promptGroup, signalPatterns, tokenEstimate, alwaysLoad." auth="Platform Token" />
              <Endpoint method="GET" path="/api/v2/federation/capabilities" description="List synced capabilities from your instance" auth="Platform Token" />
              <Endpoint method="POST" path="/api/v2/federation/validate-payment" description="Validate proposed fee vs. network minimums (3% marketplace, 7% recruiting)" auth="Platform Token" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Cross-Instance Endpoints</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="POST" path="/api/federation/relay" description="Send a DAWP relay message to this instance" auth="Federation Token" />
              <Endpoint method="GET" path="/api/federation/patterns" description="Export shareable ambient patterns" auth="API Key" />
              <Endpoint method="POST" path="/api/federation/patterns" description="Import patterns, reciprocate with local" auth="API Key" />
              <Endpoint method="GET" path="/api/federation/jobs" description="List network-visible jobs for gossip" auth="Federation Token" />
              <Endpoint method="POST" path="/api/federation/jobs" description="Ingest jobs from a remote instance" auth="Federation Token" />
              <Endpoint method="POST" path="/api/federation/mcp" description="Cross-instance MCP tool invocation" auth="Federation Token" />
              <Endpoint method="POST" path="/api/federation/reputation" description="Reputation attestation exchange" auth="Federation Token" />
              <Endpoint method="GET" path="/api/federation/entity-search" description="Privacy-respecting cross-instance entity lookup" auth="Federation Token" />
              <Endpoint method="POST" path="/api/federation/notifications" description="Push typed notifications (12 types) into this instance" auth="Federation Token" />
              <Endpoint method="GET" path="/api/federation/mentions?prefix=jo" description="@mention autocomplete — prefix-search users (max 10 results)" auth="Federation Token" />
              <Endpoint method="POST" path="/api/federation/connect" description="Request a federation connection with a user on this instance" auth="Federation Token" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Identity & Mentions</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="GET" path="/api/username/check?username=jon" description="Check username availability (real-time)" auth="None" />
              <Endpoint method="GET" path="/api/users/resolve?usernames=jon,sarah" description="Bulk username→profile resolution (public-safe fields)" auth="None" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Discovery & Network</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="GET" path="/api/v2/network/discover" description="Discover profiles, teams, and Bubble Store agents" auth="Public or Platform Token" />
              <Endpoint method="GET" path="/api/v2/updates" description="Platform updates feed (CORS-enabled, cacheable)" auth="None" />
              <Endpoint method="GET" path="/api/directory" description="Network directory (users, teams, federated instances)" auth="Session" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Core App Endpoints</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="GET" path="/api/v2/contacts" description="List CRM contacts" auth="API Key" />
              <Endpoint method="POST" path="/api/v2/contacts" description="Create or update contacts" auth="API Key" />
              <Endpoint method="GET" path="/api/v2/kanban" description="List kanban boards and cards" auth="API Key" />
              <Endpoint method="POST" path="/api/v2/kanban" description="Create/move cards" auth="API Key" />
              <Endpoint method="GET" path="/api/v2/queue" description="List queue items" auth="API Key" />
              <Endpoint method="POST" path="/api/v2/queue" description="Push items to queue" auth="API Key" />
              <Endpoint method="GET" path="/api/calendar" description="List calendar events" auth="Session" />
              <Endpoint method="POST" path="/api/calendar" description="Create calendar event" auth="Session" />
              <Endpoint method="GET" path="/api/documents" description="List documents" auth="Session" />
              <Endpoint method="GET" path="/api/marketplace" description="Browse Bubble Store agents" auth="Session" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Capabilities — Bubble Store</h3>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="GET" path="/api/marketplace-capabilities" description="Browse capabilities (filter by category, search, integration)" auth="Session" />
              <Endpoint method="POST" path="/api/marketplace-capabilities" description="Create a custom capability" auth="Session" />
              <Endpoint method="GET" path="/api/marketplace-capabilities/:id" description="Capability detail + install status" auth="Session" />
              <Endpoint method="POST" path="/api/marketplace-capabilities" description="Install capability (capabilityId + optional accessPassword)" auth="Session (install)" />
              <Endpoint method="DELETE" path="/api/marketplace-capabilities/:id/install" description="Uninstall capability" auth="Session" />
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              For detailed request/response schemas, see the <a href="/docs/developers" className="text-brand-400 hover:text-brand-300">Developer Docs</a>.
            </p>
          </Section>

          {/* ═══ PROTOCOLS ════════════════════════════════════════════════ */}
          <Section id="protocols" title="Protocols (DAWP / A2A / MCP)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card title="DAWP — DiviDen Agent Wire Protocol">
                <p className="mb-2">Lightweight message relay between instances.</p>
                <p className="text-xs text-[var(--text-muted)]"><strong>9 intent types:</strong> get_info, assign_task, request_approval, share_update, schedule, introduce, delegate, escalate, custom</p>
                <p className="text-xs text-[var(--text-muted)] mt-1"><strong>Endpoint:</strong> POST /api/federation/relay</p>
                <p className="text-xs text-[var(--text-muted)] mt-1"><strong>Auth:</strong> x-federation-token header + hmac-sha256 signature</p>
              </Card>
              <Card title="A2A — Agent-to-Agent Protocol">
                <p className="mb-2">Google&apos;s agent interoperability standard.</p>
                <p className="text-xs text-[var(--text-muted)]"><strong>Discovery:</strong> GET /.well-known/agent.json</p>
                <p className="text-xs text-[var(--text-muted)] mt-1"><strong>Task execution:</strong> POST /api/a2a (JSON-RPC 2.0)</p>
                <p className="text-xs text-[var(--text-muted)] mt-1"><strong>Artifacts:</strong> text, file, data, json, code</p>
              </Card>
            </div>

            <Card title="MCP v1.6 — Model Context Protocol">
              <p className="mb-2">Tool invocation standard. DiviDen exposes 22 static tools (incl. <code className="text-brand-400 text-[10px] font-mono">marketplace_browse</code>, <code className="text-brand-400 text-[10px] font-mono">marketplace_unlock</code>, &amp; <code className="text-brand-400 text-[10px] font-mono">capabilities_browse</code>) plus dynamic tools per user context. v1.6 adds queue gate awareness and capability-injected prompts.</p>
              <p className="text-xs text-[var(--text-muted)] mb-2"><strong>Endpoint:</strong> POST /api/mcp (SSE transport)</p>
              <p className="text-xs text-[var(--text-muted)]"><strong>Cross-instance:</strong> POST /api/federation/mcp (trust-gated, requires trusted instance)</p>
              <Code>{`// Example MCP tool call
{
  "method": "tools/call",
  "params": {
    "name": "search_contacts",
    "arguments": { "query": "VC firms in SF" }
  }
}`}</Code>
            </Card>
          </Section>

          {/* ═══ AGENT CARDS ═══════════════════════════════════════════════ */}
          <Section id="agent-cards" title="Agent Card Spec (v0.5)">
            <p className="text-[var(--text-secondary)] mb-4">
              Every agent on DiviDen exposes a JSON agent card at <InlineCode>/.well-known/agent-card.json</InlineCode>. This follows the A2A spec with DiviDen extensions.
            </p>
            <Code title="Agent Card Structure (v0.5)">{`{
  "name": "mAIn",
  "description": "AI assistant for venture capital operations",
  "url": "https://cc.fractionalventure.partners/api/a2a",
  "version": "0.5.0",
  "protocol": "a2a",
  "protocolVersion": "0.2",
  "provider": {
    "organization": "Fractional Venture Partners",
    "url": "https://fractionalventure.partners"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true,
    "threading": true,
    "structuredArtifacts": true,
    "statusUpdates": true,
    "webhookPush": true,
    "marketplacePasswordAccess": true,
    "persistentConversation": true
  },
  "authentication": { "schemes": ["bearer"] },
  "defaultInputModes": ["application/json", "text/plain"],
  "defaultOutputModes": ["application/json", "text/plain"],
  "mcpTools": ["queue_list", "contacts_search", "..."],
  "webhookEvents": [
    "task_dispatched", "new_message", "wake",
    "queue_changed", "relay_state_changed"
  ],
  "skills": [
    {
      "id": "deal-analysis",
      "name": "Deal Analysis",
      "description": "Analyze investment opportunities and generate deal memos"
    }
  ]
}`}</Code>
            <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-4 mt-4">
              <h4 className="text-sm font-bold text-white mb-2">New in v0.5</h4>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li><InlineCode>mcpTools</InlineCode> array — advertises available MCP tool names for capability negotiation</li>
                <li><InlineCode>webhookEvents</InlineCode> — declares pushable event types</li>
                <li><InlineCode>marketplacePasswordAccess</InlineCode> — agents can be unlocked with dev-shared passwords</li>
                <li><InlineCode>persistentConversation</InlineCode> — chat threads continue indefinitely</li>
                <li>Resilient card serving — <InlineCode>/.well-known/agent.json</InlineCode> now returns a valid card even when the DB is unreachable (static fallback)</li>
              </ul>
            </div>
          </Section>

          {/* ═══ WEBHOOKS ═════════════════════════════════════════════════ */}
          <Section id="webhooks" title="Webhooks">
            <h3 className="text-lg font-bold text-white mb-3">Inbound Webhooks</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Send data into DiviDen from external services. Supported channels:
            </p>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
              <Endpoint method="POST" path="/api/webhooks/email" description="Inbound email (SendGrid/Mailgun format)" auth="None" />
              <Endpoint method="POST" path="/api/webhooks/calendar" description="Calendar event updates" auth="None" />
              <Endpoint method="POST" path="/api/webhooks/recording" description="Recording transcripts (Plaud, Otter)" auth="None" />
              <Endpoint method="POST" path="/api/webhooks/generic" description="Generic data ingestion" auth="API Key" />
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Outbound Events</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              DiviDen can push events to your systems when things happen:
            </p>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside mb-4">
              <li><InlineCode>contact.created</InlineCode> / <InlineCode>contact.updated</InlineCode></li>
              <li><InlineCode>card.moved</InlineCode> / <InlineCode>card.completed</InlineCode></li>
              <li><InlineCode>relay.received</InlineCode> / <InlineCode>relay.completed</InlineCode></li>
              <li><InlineCode>agent.task.completed</InlineCode></li>
            </ul>
          </Section>

          {/* ═══ SECURITY & AUTH ══════════════════════════════════════════ */}
          <Section id="security" title="Security & Auth">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="🔑 API Key Auth">
                <p>For REST API endpoints. Generate keys at <InlineCode>/settings</InlineCode> under API Keys tab. Include as <InlineCode>Authorization: Bearer &lt;api-key&gt;</InlineCode>.</p>
              </Card>
              <Card title="🌐 Platform Token Auth">
                <p>For federation endpoints. Issued during registration. Include as <InlineCode>Authorization: Bearer &lt;platformToken&gt;</InlineCode>.</p>
              </Card>
              <Card title="🛡️ Federation Token Auth">
                <p>For cross-instance relay. HMAC-SHA256 signed with shared federation secret. Include as <InlineCode>x-federation-token</InlineCode> header.</p>
              </Card>
              <Card title="🔒 Session Auth">
                <p>For browser-based endpoints. NextAuth.js session cookie. Requires authenticated user session.</p>
              </Card>
            </div>

            <div className="mt-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-sm font-bold text-white mb-2">Rate Limits</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-brand-400">1000</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">req/hr (API Key)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-400">200</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">req/hr (Unauthenticated)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-400">60</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">req/min (Relay)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-400">50</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">agents/sync</div>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ DISCUSS WITH DIVI ═════════════════════════════════════ */}
          <Section id="discuss-with-divi" title="Discuss with Divi">
            <p className="text-[var(--text-secondary)] mb-4">
              Every view in the dashboard now includes a <InlineCode>💬</InlineCode> &quot;Discuss with Divi&quot; button.
              One click assembles context from whatever you&apos;re looking at and pre-fills the chat input.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
            <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside mb-6">
              <li>Click the 💬 button on any item (email, queue task, calendar event, drive file)</li>
              <li>DiviDen assembles a context string from the item metadata</li>
              <li>Chat input is pre-filled with the context and the Chat tab activates</li>
              <li>Divi recognizes the pre-filled context and responds in scope</li>
            </ol>

            <h3 className="text-lg font-bold text-white mb-3">Supported Views</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
                { view: 'NOW Panel', ctx: 'Top-priority item title, source, and due info' },
                { view: 'Queue Panel', ctx: 'Queue item title, action tag, status' },
                { view: 'Inbox View', ctx: 'Email subject, sender, thread snippet' },
                { view: 'Calendar View', ctx: 'Event title, time, attendees' },
                { view: 'Drive View', ctx: 'File name, type, last modified' },
              ].map((v) => (
                <div key={v.view} className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-3">
                  <div className="text-sm font-bold text-white">{v.view}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{v.ctx}</div>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Implementation Pattern</h3>
            <Code title="onDiscuss callback">
{`// Every view component accepts onDiscuss
onDiscuss={(context: string) => {
  setChatPrefill(context);
  setActiveTab('chat');
}}`}
            </Code>
          </Section>

          {/* ═══ AGENTWIDGET SYSTEM ════════════════════════════════════════ */}
          <Section id="agent-widgets" title="AgentWidget System">
            <p className="text-[var(--text-secondary)] mb-4">
              Agents can return structured widget metadata in chat responses. The <InlineCode>AgentWidget</InlineCode> component
              renders these as interactive UI components — choice cards, action lists, info cards, and payment prompts.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Widget Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
                { type: 'choice_card', desc: 'Present labeled options with action callbacks (navigate, execute, dismiss)' },
                { type: 'action_list', desc: 'List of items with per-item action buttons (approve, reject, etc.)' },
                { type: 'info_card', desc: 'Read-only structured data — summaries, breakdowns, status cards' },
                { type: 'payment_prompt', desc: 'Transactional widget with price, payment action, and confirmation flow' },
              ].map((w) => (
                <div key={w.type} className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-3">
                  <code className="text-sm font-mono text-brand-400">{w.type}</code>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{w.desc}</div>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Widget Protocol</h3>
            <Code title="Metadata JSON (in chat message)">
{`{
  "widgets": [
    {
      "type": "choice_card",
      "title": "Which license tier?",
      "items": [
        {
          "id": "tier-basic",
          "title": "Basic — $49/mo",
          "actions": [
            { "label": "Select", "type": "button", "action": "select_tier_basic" }
          ]
        }
      ]
    }
  ]
}`}
            </Code>

            <h3 className="text-lg font-bold text-white mb-3">Where Widgets Render</h3>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside mb-6">
              <li><strong>ChatView</strong> — Inline below the agent&apos;s text response</li>
              <li><strong>QueuePanel</strong> — In the detail view of queue items with widget metadata</li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-3">Payment Flow (Bubble Store Agents)</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Bubble Store agents use <InlineCode>payment_prompt</InlineCode> widgets to charge for work.
              The flow is: surface catalog → user selects → present payment prompt → process via Stripe Connect (97% to agent provider, 3% network fee).
              Everything happens inline in chat — no redirects.
            </p>
          </Section>

          {/* ═══ INBOX FEATURES ════════════════════════════════════════════ */}
          <Section id="inbox-features" title="Inbox: Multi-Account & Drafts">
            <h3 className="text-lg font-bold text-white mb-3">Multi-Account Support</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Operators can connect up to 3 Google accounts per identity. Each account is tracked via <InlineCode>IntegrationAccount.accountIndex</InlineCode> (0, 1, 2).
              When multiple accounts are connected, the inbox shows account filter tabs — auto-derived from connected accounts.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Gmail API Send</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Google-connected accounts now send email via the <strong>Gmail API</strong> (<InlineCode>users.messages.send</InlineCode> with RFC 2822 raw encoding)
              instead of SMTP. No app passwords or SMTP relay config needed. SMTP/nodemailer remains the fallback for non-Google integrations.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Drafts & Inline Reply</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The Inbox filter tabs now include <strong>Drafts</strong> alongside All / Unread / Starred.
              The inline reply bar sits at the bottom of message threads — always visible when viewing a thread.
            </p>
          </Section>

          {/* ═══ CALENDAR & NOW ════════════════════════════════════════════ */}
          <Section id="calendar-now" title="Calendar & NOW Panel Updates">
            <h3 className="text-lg font-bold text-white mb-3">Calendar Checkboxes</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Calendar events now use checkbox-style toggles instead of the old button-style toggles. Cleaner, more familiar interaction pattern.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">NOW Panel: Mark Complete</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The top NOW item now has a ✓ button. Clicking it sends a <InlineCode>PATCH</InlineCode> to <InlineCode>/api/queue/&#123;id&#125;</InlineCode> with <InlineCode>done_today: true</InlineCode>.
              No need to navigate to the queue view to clear the top-priority item.
            </p>
          </Section>

          {/* ═══ SMART TAGGING ═══════════════════════════════════════════════ */}
          <Section id="smart-tagging" title="Smart Tagging (Kanban)">
            <p className="text-[var(--text-secondary)] mb-4">
              Kanban cards automatically display <strong className="text-white">smart tags</strong> based on
              who&apos;s involved in a task — whether they&apos;re on the same instance or connected via federation —
              plus urgency indicators derived from due dates.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Connected User Tags</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              When a card belongs to a project with members, each connected user is shown as a smart tag
              on the card. Tags are color-coded:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><span className="text-blue-400 font-medium">Blue tags (👤)</span> — Same-instance users. These are users on the same DiviDen instance who are project members.</li>
              <li><span className="text-purple-400 font-medium">Purple tags (🔗)</span> — Federated users. These are users connected via the federation protocol from another DiviDen instance.</li>
            </ul>
            <p className="text-[var(--text-secondary)] mb-4">
              Tags appear at the top of each card, making it immediately visible who&apos;s involved without opening the card detail.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Data Model &amp; Tag Extraction</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Smart tags are derived from the <InlineCode>ProjectMember</InlineCode> records associated with a card&apos;s project.
              Each member links to either a local <InlineCode>User</InlineCode> (via <InlineCode>userId</InlineCode>) or a federated
              peer (via <InlineCode>connectionId</InlineCode> on a <InlineCode>Connection</InlineCode> with <InlineCode>isFederated: true</InlineCode>).
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              The <InlineCode>getSmartTags(card)</InlineCode> helper in <InlineCode>KanbanView.tsx</InlineCode> handles extraction:
            </p>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>Reads <InlineCode>card.project.members[]</InlineCode> from the kanban card data</li>
              <li>For each member with a <InlineCode>user</InlineCode> object → blue tag with <InlineCode>user.name</InlineCode></li>
              <li>For each member with a <InlineCode>connection</InlineCode> object → purple tag with <InlineCode>connection.name</InlineCode></li>
              <li>Checks <InlineCode>card.dueDate</InlineCode> against current time → overdue (red) or due-today (orange) tag</li>
            </ol>

            <h3 className="text-lg font-bold text-white mb-3">Extending Smart Tags (Opencore)</h3>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mb-4">
              <p className="text-[var(--text-secondary)] text-sm mb-3">
                To add custom tag types, modify <InlineCode>getSmartTags()</InlineCode> in{' '}
                <InlineCode>src/components/dashboard/KanbanView.tsx</InlineCode>:
              </p>
              <ul className="list-disc list-inside text-[var(--text-secondary)] text-sm space-y-2">
                <li><strong className="text-white">Label tags</strong> — Read from <InlineCode>card.metadata</InlineCode> or a new <InlineCode>labels</InlineCode> field on the KanbanCard model</li>
                <li><strong className="text-white">Priority tags</strong> — Map card priority values to colored tags (e.g., P0 = red, P1 = amber)</li>
                <li><strong className="text-white">Custom status tags</strong> — Use <InlineCode>card.column</InlineCode> or custom metadata to derive contextual status tags</li>
                <li><strong className="text-white">External integration tags</strong> — Query external data sources to tag cards with Jira ticket IDs, GitHub PRs, etc.</li>
              </ul>
              <p className="text-[var(--text-secondary)] text-sm mt-3">
                Each tag is a <InlineCode>{'{'}label, color, icon{'}'}</InlineCode> object. The card renderer maps colors to Tailwind classes.
              </p>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Cross-Instance Task Tracking</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              When you&apos;re tracking a task that&apos;s assigned to a user on another instance via their Divi:
            </p>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>The task card shows the federated user&apos;s name with a purple 🔗 tag</li>
              <li>Project member avatars show a <span className="text-purple-400">purple ring</span> for federated members vs. role-based colors for local users</li>
              <li>Hovering a member avatar shows &quot;(role) — federated&quot; for cross-instance members</li>
              <li>Status updates propagate via the <InlineCode>AgentRelay</InlineCode> system — when the remote user&apos;s Divi completes a task, your board updates</li>
            </ol>

            <h3 className="text-lg font-bold text-white mb-3">Due Date Tags</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><span className="text-red-400">🔴 Overdue</span> — Card is past its due date</li>
              <li><span className="text-orange-400">⏰ Due Today</span> — Card is due within 24 hours</li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-3">Board Interaction (Trello Model)</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The kanban board uses a Trello-inspired interaction model with two distinct drag modes:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Drag a card</strong> — Click and drag any card to move it between columns. Cards are identified by <InlineCode>data-kanban-card=&quot;true&quot;</InlineCode> attribute.</li>
              <li><strong className="text-white">Scroll the board</strong> — Click and drag on any empty space (pointer events check <InlineCode>target.closest(&apos;[data-kanban-card]&apos;)</InlineCode>). If not on a card, drag scrolls the board.</li>
              <li><strong className="text-white">Touch devices</strong> — Native touch scrolling for the board, press-and-hold a card to drag</li>
              <li><strong className="text-white">All tab rows</strong> — The <InlineCode>DragScrollContainer</InlineCode> component enables drag-to-scroll on any overflow-x element</li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-3">DragScrollContainer (Reusable)</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Located at <InlineCode>src/components/ui/DragScrollContainer.tsx</InlineCode>. Wrap any horizontally-overflowing content:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>Detects overflow with <InlineCode>ResizeObserver</InlineCode></li>
              <li>Suppresses click events during drag (prevents accidental tab activation)</li>
              <li>Optional fade edges (<InlineCode>showFadeEdges</InlineCode> prop) showing gradient indicators at overflow boundaries</li>
              <li>Used on: Settings tabs, Admin tabs, CenterPanel sub-tabs</li>
            </ul>
          </Section>

          {/* ═══ LINKED KARDS (CROSS-USER) ════════════════════════════════════ */}
          <Section id="linked-kards" title="Linked Kards (Cross-User Visibility)">
            <p className="text-[var(--text-secondary)] mb-4">
              When a task is delegated to another user via relay, both the originator&apos;s card and the recipient&apos;s card are automatically linked.
              Both users&apos; Divis see the other side&apos;s status and progress without constant relay pings.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">How Auto-Linking Works</h3>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>A relay with <InlineCode>assign_task</InlineCode> intent is sent to another user</li>
              <li>The receiving Divi creates a card from the relay context</li>
              <li><InlineCode>autoLinkFromRelay()</InlineCode> automatically creates a <InlineCode>CardLink</InlineCode> between the two cards</li>
              <li>The new card is stamped with <InlineCode>originCardId</InlineCode>, <InlineCode>originUserId</InlineCode>, <InlineCode>sourceRelayId</InlineCode></li>
            </ol>

            <h3 className="text-lg font-bold text-white mb-3">Accumulate, Don&apos;t Ping</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Status changes on linked cards are logged silently to <InlineCode>CardLink.changeLog</InlineCode> (a capped JSON array).
              When the user next starts a conversation, accumulated updates are delivered as a digest in the system prompt —
              not as interrupt-driven relay pings. Divi surfaces them naturally: &ldquo;Sarah completed that task you delegated.&rdquo;
            </p>

            <h3 className="text-lg font-bold text-white mb-3">In the UI</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>Delegated cards show a <span className="text-purple-400">purple provenance badge</span> with the originating user&apos;s name</li>
              <li>Linked card indicators show direction, type, title, user, and checklist progress (e.g., <InlineCode>✓2/5</InlineCode>)</li>
              <li>In the system prompt: <InlineCode>[cardId] &quot;My Card&quot; (high) ⬅️delegated-from:Jon 🔗→delegation:&quot;Their Task&quot; (active) by Sarah ✓2/5</InlineCode></li>
            </ul>
            <p className="text-[var(--text-secondary)] text-sm">
              See the <a href="/docs/developers#linked-kards" className="text-brand-400 hover:underline">developer docs</a> for the full schema, action tags, and status accumulation flow.
            </p>
          </Section>

          {/* ═══ CARD ACTIVITY FEEDS ═══════════════════════════════════════════ */}
          <Section id="card-activity" title="Card Activity Feeds">
            <p className="text-[var(--text-secondary)] mb-4">
              Every kanban card has its own activity timeline. When you open a card and expand the <strong className="text-white">Activity</strong> section,
              you see a chronological feed of everything that&apos;s happened to that card — created, updated, moved, tasks completed, delegated, auto-completed.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Cross-User Mirroring</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              When a card has <a href="#linked-kards" className="text-brand-400 hover:underline">linked cards</a> owned by other users,
              activity automatically mirrors to the linked card&apos;s timeline. If Sarah completes a task on a card linked to your origin card,
              your card&apos;s activity feed shows: <InlineCode>🔗 Sarah: Completed task &quot;Research Report&quot;</InlineCode> — without
              any relay being sent and without your Divi being interrupted.
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Own entries</strong> — 👤 (human) or 🤖 (divi) icon on neutral background</li>
              <li><strong className="text-white">Cross-user entries</strong> — 🔗 icon on brand-tinted background, with the acting user&apos;s name</li>
              <li><strong className="text-white">Global feed unchanged</strong> — The main activity stream stays strictly user-scoped. Card feeds are the local surface for cross-user visibility.</li>
            </ul>
            <p className="text-[var(--text-secondary)] text-sm">
              See the <a href="/docs/developers#card-activity-feeds" className="text-brand-400 hover:underline">developer docs</a> for the API endpoint, schema, and mirroring implementation.
            </p>
          </Section>

          {/* ═══ INTELLIGENCE & LEARNING ═════════════════════════════════════ */}
          <Section id="intelligence-system" title="Intelligence & Learning System">
            <p className="text-[var(--text-secondary)] mb-4">
              DiviDen includes a pattern-recognition engine that learns from your behavior over time.
              This is <strong className="text-white">not goal inference</strong> — it&apos;s observational learning from how you actually use the system.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Architecture Overview</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The intelligence system has four layers:
            </p>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Signal Collection</strong> — Lightweight fire-and-forget events from UI interactions</li>
              <li><strong className="text-white">Pattern Analysis</strong> — Batch processing of signals into learnings</li>
              <li><strong className="text-white">User Control</strong> — CRUD interface for reviewing and managing what Divi knows</li>
              <li><strong className="text-white">Integration</strong> — Learnings feed into the NOW engine, system prompt, and notification pipeline</li>
            </ol>

            <h3 className="text-lg font-bold text-white mb-3">Behavior Signals</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Actions like completing queue items, sending chat messages, and changing card statuses emit
              lightweight signals via <InlineCode>POST /api/behavior-signals</InlineCode>. Signals are stored
              in the <InlineCode>BehaviorSignal</InlineCode> model with timing metadata (hour, day-of-week).
            </p>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mb-4">
              <p className="text-[var(--text-secondary)] text-sm mb-2 font-bold text-white">Adding New Signals (Opencore)</p>
              <p className="text-[var(--text-secondary)] text-sm mb-2">
                Import <InlineCode>emitSignal</InlineCode> from <InlineCode>src/lib/behavior-signals.ts</InlineCode> and call it from any interaction handler:
              </p>
              <ul className="list-disc list-inside text-[var(--text-secondary)] text-sm space-y-1">
                <li><InlineCode>emitSignal(&apos;action_name&apos;, {'{'} contextKey: value {'}'})</InlineCode></li>
                <li>Fire-and-forget pattern — failures don&apos;t affect the UI</li>
                <li>Currently instrumented: <InlineCode>queue_done_today</InlineCode>, <InlineCode>queue_in_progress</InlineCode>, <InlineCode>queue_delete</InlineCode>, <InlineCode>chat_send</InlineCode></li>
                <li>To add: email opens, calendar interactions, capability usage, settings changes</li>
              </ul>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Pattern Analysis</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The analysis engine (<InlineCode>POST /api/learnings/analyze</InlineCode>) processes collected signals
              and detects patterns. Currently detected:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Peak hours</strong> — Times when the user is most active</li>
              <li><strong className="text-white">Discussion frequency</strong> — How often the discuss feature is used on emails</li>
              <li><strong className="text-white">Quiet days</strong> — Days of the week with consistently low activity</li>
              <li><strong className="text-white">Capability usage</strong> — Which capabilities are active vs. gathering dust</li>
            </ul>
            <p className="text-[var(--text-secondary)] mb-4">
              Each detected pattern becomes a <InlineCode>UserLearning</InlineCode> record. Learnings have a
              category, confidence score (0–1), source attribution, and a user-editable content field.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Managing Learnings</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Navigate to <InlineCode>Settings → Learnings</InlineCode> (or click any intelligence notification) to see everything Divi has learned.
              The tab provides:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Category filters</strong> — Filter by behavior, schedule, capability, workflow</li>
              <li><strong className="text-white">New-dot indicators</strong> — Blue dot on unseen learnings</li>
              <li><strong className="text-white">Inline editing</strong> — Click to modify any learning&apos;s content</li>
              <li><strong className="text-white">Dismiss / Delete</strong> — Dismiss hides a learning; delete permanently removes it</li>
              <li><strong className="text-white">Analytics summary</strong> — Total count, new this week, average confidence</li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-3">Learnings API (Opencore)</h3>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mb-4">
              <p className="text-[var(--text-secondary)] text-sm mb-2">
                Full CRUD at <InlineCode>/api/learnings</InlineCode> (GET list, POST create) and{' '}
                <InlineCode>/api/learnings/[id]</InlineCode> (PATCH update, DELETE remove). All require session auth.
              </p>
              <p className="text-[var(--text-secondary)] text-sm mb-2">
                Analysis trigger: <InlineCode>POST /api/learnings/analyze</InlineCode> — processes signals, generates
                learnings, and creates an <InlineCode>ActivityLog</InlineCode> entry with a notification for the user.
              </p>
              <p className="text-[var(--text-secondary)] text-sm">
                Deep-linking: notifications with <InlineCode>action: &apos;learning_generated&apos;</InlineCode> navigate to{' '}
                <InlineCode>/settings?tab=learnings</InlineCode> when clicked.
              </p>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">NOW Engine: Calendar-Queue Correlation</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The NOW engine (<InlineCode>src/lib/now-engine.ts</InlineCode>) cross-references upcoming calendar
              events with queue items. The correlation logic:
            </p>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li>Finds events starting within 60 minutes</li>
              <li>Tokenizes event titles into keywords (3+ characters)</li>
              <li>Fuzzy-matches keywords against queue item titles (case-insensitive)</li>
              <li>Matching items get a <strong className="text-white">+25 score boost</strong> and a subtitle like{' '}
                <InlineCode>&quot;Related to upcoming: Q3 Planning Call&quot;</InlineCode></li>
            </ol>
            <p className="text-[var(--text-secondary)] mb-4">
              This means prep items automatically surface before meetings without any manual tagging.
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Admin: Workflow Discovery</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The admin panel (<InlineCode>/admin</InlineCode> → Workflows tab) surfaces cross-user workflow patterns.
              The <InlineCode>WorkflowPattern</InlineCode> model stores action sequences that multiple users follow.
              Admin can review patterns, mark them as reviewed, and use them to inform new capability development.
              API: <InlineCode>GET /api/admin/workflows</InlineCode> (list) and <InlineCode>PATCH /api/admin/workflows</InlineCode> (mark reviewed).
            </p>

            <h3 className="text-lg font-bold text-white mb-3">Supporting Models</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              The intelligence system adds five Prisma models:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><InlineCode>BehaviorSignal</InlineCode> — Raw action events with timing metadata</li>
              <li><InlineCode>UserLearning</InlineCode> — Detected patterns (extended with category, confidence, source, dismissed fields)</li>
              <li><InlineCode>CapabilityUsageLog</InlineCode> — Tracks capability activation/deactivation</li>
              <li><InlineCode>RelayTemplate</InlineCode> — Proven interaction patterns from network relays</li>
              <li><InlineCode>AgentQualityScore</InlineCode> — Bubble Store agent effectiveness scores</li>
              <li><InlineCode>WorkflowPattern</InlineCode> — Cross-user workflow sequences for admin review</li>
            </ul>
          </Section>

          {/* ═══ USERNAMES & @MENTIONS ═══════════════════════════════ */}
          <Section id="username-mentions" title="Usernames & @Mentions (v2.0)" badge={<UpdatedBadge date="Apr 15" />}>
            <p className="text-[var(--text-secondary)] mb-4 text-lg leading-relaxed">
              Every DiviDen account now has a unique <InlineCode>@username</InlineCode> handle — the identity primitive
              for mentions, federation, and profile URLs. Usernames are enforced at signup with real-time validation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card title="🏷️ Username Rules">
                <p>2–30 characters, <InlineCode>[a-z0-9_.-]</InlineCode> format. Reserved words blocked (admin, system, dividen, etc.).
                Uniqueness enforced at database level. Real-time availability check at <InlineCode>GET /api/username/check</InlineCode>.</p>
              </Card>
              <Card title="@️ Clickable @Mentions">
                <p>Type <InlineCode>@username</InlineCode> anywhere — chat, queue, comms, notifications — and it renders as a
                styled clickable chip linking to <InlineCode>/profile/[userId]</InlineCode>. Batch-resolved via
                <InlineCode>GET /api/users/resolve</InlineCode> (public, no auth).</p>
              </Card>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">Where Mentions Render</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
              <li><strong className="text-white">Chat</strong> — Message bodies alongside bold/code formatting</li>
              <li><strong className="text-white">Queue</strong> — Task titles and descriptions (main list + review suggestions)</li>
              <li><strong className="text-white">Comms</strong> — Relay thread peer names and message subjects</li>
              <li><strong className="text-white">Notifications</strong> — Activity feed summaries</li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-3">Federation Support</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Federated instances can power @mention autocomplete via <InlineCode>GET /api/federation/mentions?prefix=jo</InlineCode> (prefix-search, max 10 results).
              Push notifications containing @mentions are supported via <InlineCode>POST /api/federation/notifications</InlineCode> (12 notification types).
              Full spec in the <a href="/fvp-integration-guide.md" target="_blank" className="text-brand-400 hover:text-brand-300">FVP Integration Guide</a>.
            </p>
          </Section>

          {/* ═══ NOTIFICATION CENTER v2 ════════════════════════════════ */}
          <Section id="notification-v2" title="Notification Center (v2.0)" badge={<UpdatedBadge date="Apr 15" />}>
            <p className="text-[var(--text-secondary)] mb-4 text-lg leading-relaxed">
              The notification feed now supports click-through navigation and category filtering — making it an
              actionable hub instead of a passive list.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card title="🔗 Click-Through Navigation">
                <p>Every notification routes to the relevant dashboard tab when clicked. Cards → Kanban, relays → Comms,
                queue items → Queue. Dispatches <InlineCode>dividen:navigate-tab</InlineCode> custom DOM event.</p>
              </Card>
              <Card title="🏷️ Category Filters">
                <p>Filter pills at the top: All, Queue, Comms, Cards, System. Quick triage without scrolling through
                unrelated notifications.</p>
              </Card>
            </div>

            <h3 className="text-lg font-bold text-white mb-3">@Mention Rendering</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Notification summaries now render <InlineCode>@username</InlineCode> tokens as clickable profile links,
              using the shared <InlineCode>MentionText</InlineCode> component with batch resolution.
            </p>
          </Section>

          {/* Download */}
          <DocFooterDownload filename="dividen-documentation" lastUpdated="April 15, 2026" />

          {/* Footer */}
          <div className="border-t border-white/[0.06] pt-8 mt-8 text-center" data-no-download>
            <p className="text-sm text-[var(--text-muted)]">
              Built by <span className="text-white">DiviDen</span> — the individual-first operating system.
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <a href="/open-source" className="text-xs text-brand-400 hover:text-brand-300">Open Source</a>
              <a href="/docs/developers" className="text-xs text-brand-400 hover:text-brand-300">API Reference</a>
              <a href="/docs/release-notes" className="text-xs text-brand-400 hover:text-brand-300">Changelog</a>
              <a href="/" className="text-xs text-brand-400 hover:text-brand-300">Home</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
