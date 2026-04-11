export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer Docs',
  description: 'REST API, MCP server, A2A protocol, webhooks, and Integration Kit documentation for DiviDen.',
  openGraph: {
    title: 'DiviDen Developer Docs',
    description: 'Build on DiviDen — REST API, MCP, A2A, webhooks, and agent Integration Kit.',
    images: [{ url: '/api/og?title=Developer+Docs&subtitle=REST+API+%7C+MCP+%7C+A2A+%7C+Webhooks&tag=docs', width: 1200, height: 630 }],
  },
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-white/[0.06]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-4 overflow-x-auto text-sm font-mono text-[var(--text-secondary)] mb-4">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, description, auth }: { method: string; path: string; description: string; auth?: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    PATCH: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex-shrink-0 ${colors[method] || 'bg-gray-500/20 text-gray-400'}`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm text-[var(--text-primary)] font-mono">{path}</code>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      {auth && <span className="text-[10px] text-[var(--text-muted)] bg-white/[0.04] rounded px-1.5 py-0.5 flex-shrink-0">{auth}</span>}
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="code-inline">{children}</code>;
}

/* ── Table of Contents ──────────────────────────────────────────────────────── */

const TOC = [
  { id: 'auth', label: 'Authentication' },
  { id: 'rest-api', label: 'REST API (v2)' },
  { id: 'mcp', label: 'MCP Server' },
  { id: 'a2a', label: 'A2A Protocol' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'marketplace', label: 'Marketplace API' },
  { id: 'federation', label: 'Federation API' },
  { id: 'integration-kit', label: 'Integration Kit' },
  { id: 'rate-limits', label: 'Rate Limits' },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function DeveloperDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <a href="/" className="text-brand-400 hover:text-brand-300 text-sm">← Home</a>
          <h1 className="text-4xl font-heading font-bold mt-4">Developer Documentation</h1>
          <p className="text-[var(--text-secondary)] mt-3 text-lg">
            Everything you need to build on DiviDen — REST API, MCP server, A2A protocol, webhooks, and the agent Integration Kit.
          </p>
          <div className="flex gap-3 mt-4 text-xs">
            <a href="/api/v2/docs" target="_blank" className="text-brand-400 hover:text-brand-300">OpenAPI Spec →</a>
            <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">Federation Docs →</a>
            <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300">Integration Guide →</a>
          </div>
        </div>

        {/* TOC */}
        <nav className="mb-12 p-4 bg-[var(--bg-surface)] rounded-lg border border-white/[0.06]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">On this page</p>
          <div className="flex flex-wrap gap-2">
            {TOC.map(t => (
              <a key={t.id} href={`#${t.id}`} className="text-sm text-brand-400 hover:text-brand-300 bg-brand-500/10 rounded px-2.5 py-1">
                {t.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Authentication ──────────────────────────────────── */}
        <Section id="auth" title="Authentication">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen uses two auth mechanisms depending on the endpoint:
          </p>
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-1">Session Auth (browser)</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Standard NextAuth.js session cookies. Used by all <InlineCode>/api/*</InlineCode> routes when called from the dashboard.
                Login via <InlineCode>POST /api/auth/login</InlineCode> or the <InlineCode>/login</InlineCode> page.
              </p>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-1">API Key Auth (external)</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Bearer token in the <InlineCode>Authorization</InlineCode> header. Create API keys at <strong>Settings → API Keys</strong>.
                Used by MCP clients, external agents, and programmatic access.
              </p>
              <Code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-instance.com/api/v2/contacts`}</Code>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-1">Federation Token (cross-instance)</h4>
              <p className="text-xs text-[var(--text-muted)]">
                <InlineCode>x-federation-token</InlineCode> header for <InlineCode>/api/federation/*</InlineCode> endpoints.
                Tokens are exchanged during the connection ceremony.
              </p>
            </div>
          </div>
        </Section>

        {/* ── REST API v2 ─────────────────────────────────────── */}
        <Section id="rest-api" title="REST API (v2)">
          <p className="text-[var(--text-secondary)] mb-4">
            The v2 API provides programmatic access to contacts, kanban, queue, documents, and chat.
            Full OpenAPI spec at <a href="/api/v2/docs" target="_blank" className="text-brand-400 hover:text-brand-300">/api/v2/docs</a>.
          </p>

          <h3 className="text-lg font-bold mb-3 mt-6">Contacts</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/contacts" description="List all contacts (paginated, searchable)" auth="API Key" />
            <Endpoint method="POST" path="/api/v2/contacts" description="Create a new contact" auth="API Key" />
            <Endpoint method="GET" path="/api/v2/contacts/:id" description="Get contact by ID" auth="API Key" />
            <Endpoint method="PUT" path="/api/v2/contacts/:id" description="Update a contact" auth="API Key" />
            <Endpoint method="DELETE" path="/api/v2/contacts/:id" description="Delete a contact" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">Kanban</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/kanban" description="List kanban cards (filterable by status, search)" auth="API Key" />
            <Endpoint method="POST" path="/api/v2/kanban" description="Create a kanban card" auth="API Key" />
            <Endpoint method="GET" path="/api/v2/kanban/:id" description="Get card by ID with checklist and contacts" auth="API Key" />
            <Endpoint method="PUT" path="/api/v2/kanban/:id" description="Update a card" auth="API Key" />
            <Endpoint method="DELETE" path="/api/v2/kanban/:id" description="Delete a card" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">Queue</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/queue" description="List queue items (filterable by status, priority)" auth="API Key" />
            <Endpoint method="POST" path="/api/v2/queue" description="Add a queue item" auth="API Key" />
            <Endpoint method="GET" path="/api/v2/queue/:id" description="Get queue item by ID" auth="API Key" />
            <Endpoint method="PUT" path="/api/v2/queue/:id" description="Update a queue item" auth="API Key" />
            <Endpoint method="PATCH" path="/api/v2/queue/:id/status" description="Update queue item status" auth="API Key" />
            <Endpoint method="GET" path="/api/v2/queue/:id/result" description="Get execution result" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">Documents & Chat</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/docs" description="OpenAPI specification (JSON)" auth="Public" />
            <Endpoint method="GET" path="/api/v2/shared-chat/messages" description="Get shared chat messages" auth="API Key" />
            <Endpoint method="POST" path="/api/v2/shared-chat/send" description="Send a message to shared chat" auth="API Key" />
            <Endpoint method="GET" path="/api/v2/shared-chat/stream" description="SSE stream for real-time messages" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">API Keys</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4">
            <Endpoint method="GET" path="/api/v2/keys" description="List API keys (manage via Settings UI)" auth="Session" />
          </div>
        </Section>

        {/* ── MCP Server ──────────────────────────────────────── */}
        <Section id="mcp" title="MCP Server">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen exposes a Model Context Protocol server at <InlineCode>/api/mcp</InlineCode>.
            Compatible with Claude Desktop, Cursor, and any MCP-compliant client.
          </p>

          <h3 className="text-lg font-bold mb-3">Endpoint</h3>
          <Code>{`POST /api/mcp
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</Code>

          <h3 className="text-lg font-bold mb-3 mt-6">Methods</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path='{ "method": "tools/list" }' description="List all available tools (20 static + dynamic marketplace tools)" />
            <Endpoint method="POST" path='{ "method": "tools/call", "params": { "name": "...", "arguments": {...} } }' description="Execute a tool" />
            <Endpoint method="POST" path='{ "method": "resources/list" }' description="List available resources" />
          </div>

          <h3 className="text-lg font-bold mb-3">Static Tools (20)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {[
              'queue_list', 'queue_add', 'queue_update',
              'contacts_list', 'contacts_search', 'cards_list',
              'mode_get', 'briefing_get', 'activity_recent',
              'job_post', 'job_browse', 'job_match',
              'reputation_get', 'relay_thread_list', 'relay_threads',
              'relay_send', 'entity_resolve', 'serendipity_matches',
              'route_task', 'network_briefing'
            ].map(tool => (
              <div key={tool} className="text-xs font-mono text-brand-400 bg-brand-500/10 rounded px-2 py-1">{tool}</div>
            ))}
          </div>

          <h3 className="text-lg font-bold mb-3">Dynamic Tools</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            Installed marketplace agents appear as <InlineCode>marketplace_&#123;slug&#125;</InlineCode> tools.
            Install an agent → it becomes an MCP tool automatically.
          </p>

          <h3 className="text-lg font-bold mb-3 mt-6">Server Card</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Machine-readable server metadata at <a href="/.well-known/mcp/server-card.json" target="_blank" className="text-brand-400 hover:text-brand-300">/.well-known/mcp/server-card.json</a>
          </p>
        </Section>

        {/* ── A2A Protocol ────────────────────────────────────── */}
        <Section id="a2a" title="A2A Protocol">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen implements the Agent-to-Agent protocol for direct agent communication.
          </p>

          <h3 className="text-lg font-bold mb-3">Discovery</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/.well-known/agent-card.json" description="Agent Card — capabilities, skills, supported methods, MCP tools" auth="Public" />
            <Endpoint method="GET" path="/api/a2a/playbook" description="Operational Playbook — learned preferences, handoff brief" auth="API Key" />
            <Endpoint method="GET" path="/api/main-handoff" description="Handoff Brief — current state, queue, calendar, priorities" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">Task Execution</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/a2a" description="Send tasks, receive results (supports structured artifacts)" auth="API Key" />
          </div>

          <h3 className="text-lg font-bold mb-3">Artifact Types</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            A2A tasks support 7 structured artifact formats:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['text', 'code', 'document', 'data', 'contact_card', 'calendar_invite', 'email_draft'].map(t => (
              <div key={t} className="text-xs font-mono text-amber-400 bg-amber-500/10 rounded px-2 py-1">{t}</div>
            ))}
          </div>
        </Section>

        {/* ── Webhooks ────────────────────────────────────────── */}
        <Section id="webhooks" title="Webhooks">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen can both receive and send webhooks.
          </p>

          <h3 className="text-lg font-bold mb-3">Inbound (receive events)</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/webhooks/generic" description="Generic webhook receiver — auto-learns field mapping" />
            <Endpoint method="POST" path="/api/webhooks/calendar" description="Calendar event webhooks" />
            <Endpoint method="POST" path="/api/webhooks/email" description="Email event webhooks" />
            <Endpoint method="POST" path="/api/webhooks/transcript" description="Recording transcript webhooks" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Configure inbound webhooks at <strong>Settings → Webhooks</strong>. Each webhook gets a unique URL.
            The AI-powered field mapper auto-learns your payload structure.
          </p>

          <h3 className="text-lg font-bold mb-3">Outbound (push events)</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            Configure push webhooks at <strong>Settings → Service Keys</strong> with service <InlineCode>webhook_push</InlineCode>.
            Events pushed: relay state changes, queue updates, mode switches.
          </p>
        </Section>

        {/* ── Marketplace API ─────────────────────────────────── */}
        <Section id="marketplace" title="Marketplace API">
          <p className="text-[var(--text-secondary)] mb-4">
            Register, discover, and execute AI agents.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/marketplace" description="Browse agents (filter by category, pricing, search, sort)" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace" description="Register a new agent" auth="Session" />
            <Endpoint method="GET" path="/api/marketplace/:id" description="Agent detail (includes integration kit, stats, executions)" auth="Session" />
            <Endpoint method="PUT" path="/api/marketplace/:id" description="Update agent (owner only) — supports version bumps + changelog" auth="Session" />
            <Endpoint method="DELETE" path="/api/marketplace/:id" description="Delete agent (owner only)" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace/:id/execute" description="Execute a task against an agent (rate limited: 20/min)" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace/:id/subscribe" description="Subscribe to an agent" auth="Session" />
            <Endpoint method="DELETE" path="/api/marketplace/:id/subscribe" description="Unsubscribe from an agent" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace/:id/install" description="Install agent into Divi's toolkit (loads Integration Kit into memory)" auth="Session" />
            <Endpoint method="DELETE" path="/api/marketplace/:id/install" description="Uninstall agent from Divi's toolkit" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace/:id/rate" description="Rate an execution (1-5 stars)" auth="Session" />
            <Endpoint method="GET" path="/api/marketplace/earnings" description="Earnings dashboard data" auth="Session" />
            <Endpoint method="GET" path="/api/marketplace/fee-info" description="Current fee structure" auth="Public" />
          </div>
        </Section>

        {/* ── Federation API ──────────────────────────────────── */}
        <Section id="federation" title="Federation API">
          <p className="text-[var(--text-secondary)] mb-4">
            Cross-instance endpoints for federated DiviDen instances. All require <InlineCode>x-federation-token</InlineCode> or <InlineCode>Authorization: Bearer</InlineCode> header.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/federation/relay" description="Send a relay message to this instance" auth="Federation" />
            <Endpoint method="GET" path="/api/federation/patterns" description="Export shareable ambient patterns" auth="API Key" />
            <Endpoint method="POST" path="/api/federation/patterns" description="Import patterns, reciprocate with local patterns" auth="API Key" />
            <Endpoint method="GET" path="/api/federation/jobs" description="List network-visible jobs for gossip" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/jobs" description="Ingest jobs from a remote instance" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/jobs/apply" description="Apply for a job from a remote instance" auth="Federation" />
            <Endpoint method="GET" path="/api/federation/graph" description="Graph matching data for serendipity engine" auth="Session" />
            <Endpoint method="GET" path="/api/federation/routing" description="7-signal task routing weights and skills" auth="Session" />
            <Endpoint method="GET" path="/api/federation/briefing" description="Composite network briefing" auth="Session" />
            <Endpoint method="POST" path="/api/federation/mcp" description="Cross-instance MCP tool invocation (trust-gated)" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/reputation" description="Portable reputation attestation exchange" auth="Federation" />
            <Endpoint method="GET" path="/api/federation/entity-search" description="Privacy-respecting cross-instance entity lookup" auth="Federation" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            Full federation docs at <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">/docs/federation</a>.
          </p>
        </Section>

        {/* ── Integration Kit ─────────────────────────────────── */}
        <Section id="integration-kit" title="Integration Kit">
          <p className="text-[var(--text-secondary)] mb-4">
            When listing an agent in the marketplace, you can provide an Integration Kit — structured metadata that teaches Divi how to work with your agent.
          </p>

          <h3 className="text-lg font-bold mb-3">Kit Fields</h3>
          <div className="space-y-3 mb-6">
            {[
              { field: 'taskTypes', desc: 'JSON array of task categories this agent handles', example: '["research", "writing", "data-analysis"]' },
              { field: 'contextInstructions', desc: 'How to prepare context before calling this agent' },
              { field: 'requiredInputSchema', desc: 'JSON schema of required input fields' },
              { field: 'outputSchema', desc: 'JSON schema of the expected output format' },
              { field: 'usageExamples', desc: 'Example prompts and expected outputs' },
              { field: 'contextPreparation', desc: 'Steps Divi should take before invoking this agent' },
              { field: 'executionNotes', desc: 'Tips, gotchas, rate limits, or special behavior' },
            ].map(f => (
              <div key={f.field} className="flex items-start gap-3 text-sm">
                <code className="text-brand-400 font-mono text-xs bg-brand-500/10 rounded px-1.5 py-0.5 flex-shrink-0">{f.field}</code>
                <div>
                  <p className="text-[var(--text-secondary)]">{f.desc}</p>
                  {f.example && <code className="text-xs text-[var(--text-muted)]">{f.example}</code>}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold mb-3">Install Lifecycle</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            When a user installs your agent, the Integration Kit is decomposed into up to 8 memory entries in Divi&apos;s persistent memory.
            Divi then proactively suggests your agent when tasks match its capabilities.
            Uninstalling removes all memory entries — clean separation.
          </p>
        </Section>

        {/* ── Rate Limits ─────────────────────────────────────── */}
        <Section id="rate-limits" title="Rate Limits">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen enforces sliding-window rate limits on key endpoints.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-bold text-[var(--text-primary)]">Auth</p>
                <p className="text-[var(--text-muted)] text-xs">Login, Signup</p>
                <p className="text-red-400 font-mono text-lg mt-1">10/min</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Heavy</p>
                <p className="text-[var(--text-muted)] text-xs">Agent execution</p>
                <p className="text-amber-400 font-mono text-lg mt-1">20/min</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Federation</p>
                <p className="text-[var(--text-muted)] text-xs">Cross-instance</p>
                <p className="text-blue-400 font-mono text-lg mt-1">30/min</p>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mt-4">
            Rate-limited responses return <InlineCode>429 Too Many Requests</InlineCode> with a <InlineCode>Retry-After</InlineCode> header.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-8 mt-16 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Built by <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">DiviDen</a> — an agentic working protocol
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <a href="/docs/federation" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Federation</a>
            <a href="/docs/release-notes" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Release Notes</a>
            <a href="/updates" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Updates</a>
            <a href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
