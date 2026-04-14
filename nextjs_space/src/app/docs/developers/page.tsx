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
  { id: 'capabilities-api', label: 'Capabilities API' },
  { id: 'federation-v2', label: 'Federation v2 API' },
  { id: 'mcp', label: 'MCP Server' },
  { id: 'a2a', label: 'A2A Protocol' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'marketplace', label: 'Agent Marketplace API' },
  { id: 'federation', label: 'Cross-Instance API' },
  { id: 'integration-kit', label: 'Integration Kit' },
  { id: 'queue-gating', label: 'Queue Gating & Confirmation' },
  { id: 'cos-engine', label: 'CoS Execution Engine' },
  { id: 'settings-api', label: 'Settings API (v2)' },
  { id: 'teams-api', label: 'Teams & Project Delegation' },
  { id: 'behavior-signals', label: 'Behavior Signals API' },
  { id: 'learnings-api', label: 'Learnings API' },
  { id: 'smart-tagging', label: 'Smart Tagging' },
  { id: 'drag-scroll', label: 'DragScrollContainer' },
  { id: 'now-engine', label: 'NOW Engine Correlation' },
  { id: 'rate-limits', label: 'Rate Limits' },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function DeveloperDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <a href="/documentation" className="text-brand-400 hover:text-brand-300 text-sm">← Documentation</a>
          <h1 className="text-4xl font-heading font-bold mt-4">Developer Documentation</h1>
          <p className="text-[var(--text-secondary)] mt-3 text-lg">
            Everything you need to build on DiviDen — REST API, MCP server, A2A protocol, webhooks, and the agent Integration Kit.
          </p>
          <div className="flex gap-3 mt-4 text-xs">
            <a href="/api/v2/docs" target="_blank" className="text-brand-400 hover:text-brand-300">OpenAPI Spec →</a>
            <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">Federation Docs →</a>
            <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300">Integration Guide →</a>
            <a href="/docs/release-notes" className="text-brand-400 hover:text-brand-300">Release Notes →</a>
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

        {/* ── Capabilities API ──────────────────────────────── */}
        <Section id="capabilities-api" title="Capabilities API">
          <p className="text-[var(--text-secondary)] mb-4">
            Browse, install, customize, create, and manage capability skill packs. Capabilities extend Divi&apos;s
            abilities through prompt templates with editable fields. Integration-gated: some capabilities require
            a connected service (email, calendar, slack, etc.) before installation.
          </p>

          <h3 className="text-lg font-bold mb-3">Browse & Install</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/marketplace-capabilities" description="Browse all capabilities (filter by ?category=, ?search=, ?installed=true)" auth="Session" />
            <Endpoint method="POST" path="/api/marketplace-capabilities" description="Install a capability (capabilityId, optional accessPassword) or create a custom one (action: 'create')" auth="Session" />
          </div>

          <h3 className="text-lg font-bold mb-3">Per-Capability Operations</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/marketplace-capabilities/:id" description="Get detail (prompt hidden until installed)" auth="Session" />
            <Endpoint method="PATCH" path="/api/marketplace-capabilities/:id" description="Update customizations → resolves prompt template with user values" auth="Session" />
            <Endpoint method="DELETE" path="/api/marketplace-capabilities/:id" description="Uninstall (soft disable) a capability" auth="Session" />
          </div>

          <h3 className="text-lg font-bold mb-3">Integration Gating</h3>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Capabilities with an <InlineCode>integrationType</InlineCode> (email, calendar, slack, crm, payments, transcript)
              require the user to have that integration connected before installation. The API checks webhooks,
              built-in capabilities, and service API keys. If missing, the response is:
            </p>
            <Code>{`HTTP 422
{
  "error": "This capability requires an active Email integration...",
  "code": "INTEGRATION_REQUIRED",
  "requiredIntegration": "email"
}`}</Code>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              The browse endpoint returns <InlineCode>integrationConnected: boolean</InlineCode> per capability so the UI
              can show lock icons before the user attempts install.
            </p>
          </div>

          <h3 className="text-lg font-bold mb-3">Purchase Gating & Access Passwords</h3>
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Paid capabilities (<InlineCode>pricingModel: &quot;one_time&quot;</InlineCode>) require payment before install.
              Attempting to install without paying returns:
            </p>
            <Code>{`HTTP 402
{
  "error": "Payment required",
  "code": "PAYMENT_REQUIRED",
  "price": 4.99
}`}</Code>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Developers can set an <InlineCode>accessPassword</InlineCode> when creating a capability.
              Users who supply the correct password in the install request bypass the paywall:
            </p>
            <Code>{`POST /api/marketplace-capabilities
{ "capabilityId": "...", "accessPassword": "secret123" }`}</Code>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              The browse endpoint returns <InlineCode>hasAccessPassword: boolean</InlineCode> per capability.
              Only the capability owner can see the actual password value.
            </p>
          </div>

          <h3 className="text-lg font-bold mb-3">Creating Custom Capabilities</h3>
          <Code>{`POST /api/marketplace-capabilities
Content-Type: application/json

{
  "action": "create",
  "name": "My Custom Capability",
  "description": "What this capability does",
  "icon": "🚀",
  "category": "productivity",
  "integrationType": null,
  "pricingModel": "free",
  "prompt": "When the user asks about {{topic}}, respond with...",
  "editableFields": "[{\\"name\\":\\"topic\\",\\"label\\":\\"Topic\\",\\"type\\":\\"text\\",\\"default\\":\\"general\\"}]",
  "accessPassword": "secret123"
}`}</Code>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            Custom capabilities auto-install for the creator. Only <InlineCode>free</InlineCode> and <InlineCode>one_time</InlineCode> pricing
            are supported — subscription pricing is rejected. The optional <InlineCode>accessPassword</InlineCode> lets you share a password that bypasses the paywall for paid capabilities.
          </p>

          <h3 className="text-lg font-bold mb-3">Prompt Resolution</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Prompts support <InlineCode>{'{{fieldName}}'}</InlineCode> template variables. When a user customizes a capability,
            the API resolves variables against their custom values and stores the <InlineCode>resolvedPrompt</InlineCode>.
            Divi injects resolved prompts from all active capabilities into the system context.
          </p>
        </Section>

        {/* ── Federation v2 API ──────────────────────────────── */}
        <Section id="federation-v2" title="Federation v2 API">
          <p className="text-[var(--text-secondary)] mb-4">
            The v2 federation endpoints handle instance registration, heartbeat, marketplace linking, agent sync, and payment validation.
            Public endpoints are CORS-enabled. Authenticated endpoints use the <InlineCode>platformToken</InlineCode> issued during registration.
          </p>

          <h3 className="text-lg font-bold mb-3">Public Endpoints</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/updates" description="Unified platform updates feed (CORS-enabled, cacheable)" auth="Public" />
            <Endpoint method="GET" path="/api/v2/network/discover" description="Discover profiles, teams, marketplace agents" auth="Public or Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Instance Registration & Lifecycle</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/register" description="Register instance → returns platformToken. New instances start as pending_approval." auth="None" />
            <Endpoint method="POST" path="/api/v2/federation/heartbeat" description="Report instance health, version, user/agent counts (send every 1-12h)" auth="Platform Token" />
            <Endpoint method="POST" path="/api/v2/federation/marketplace-link" description="Enable/disable marketplace participation for instance" auth="Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Agent Sync</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/agents" description="Sync agents to managed marketplace (max 50 per call)" auth="Platform Token" />
            <Endpoint method="GET" path="/api/v2/federation/agents" description="List agents currently synced from your instance" auth="Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Payment Validation</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/validate-payment" description="Validate proposed fee against network minimums (3% marketplace, 7% recruiting)" auth="Platform Token" />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <h4 className="text-sm font-bold text-amber-400 mb-1">Instance Lifecycle</h4>
            <p className="text-sm text-[var(--text-secondary)]">
              New registrations start as <strong className="text-amber-400">pending_approval</strong>. Admin approval is required before the instance is active on the network.
              Deactivating an instance cascade-suspends all its marketplace agents. Re-activating restores them.
            </p>
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

          <h3 className="text-lg font-bold mb-3">Static Tools (22)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {[
              'queue_list', 'queue_add', 'queue_update',
              'contacts_list', 'contacts_search', 'cards_list',
              'mode_get', 'briefing_get', 'activity_recent',
              'job_post', 'job_browse', 'job_match',
              'reputation_get', 'relay_thread_list', 'relay_threads',
              'relay_send', 'entity_resolve', 'serendipity_matches',
              'route_task', 'network_briefing',
              'marketplace_browse', 'marketplace_unlock',
            ].map(tool => (
              <div key={tool} className="text-xs font-mono text-brand-400 bg-brand-500/10 rounded px-2 py-1">{tool}</div>
            ))}
          </div>

          <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-4 mb-6">
            <h4 className="text-sm font-bold text-white mb-2">New in MCP v1.6</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              <li><InlineCode>marketplace_browse</InlineCode> — Search and filter marketplace agents by category, pricing, skills</li>
              <li><InlineCode>marketplace_unlock</InlineCode> — Unlock paid agents using developer-shared access passwords</li>
            </ul>
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

        {/* ── Cross-Instance API ──────────────────────────────── */}
        <Section id="federation" title="Cross-Instance API">
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

        {/* ── Queue Gating & Confirmation ──────────────────────── */}
        <Section id="queue-gating" title="Queue Gating & Confirmation Gate">
          <p className="text-[var(--text-secondary)] mb-4">
            When Divi dispatches a task to the queue, two layers of protection activate:
            <strong> capability gating</strong> (does a handler exist?) and <strong>user confirmation</strong> (does the user approve?).
          </p>

          <h3 className="text-lg font-bold mb-3">Layer 1: Capability Gate</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            Before any queue item is created, the system checks if the user has a handler for the task type:
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-3">
                <span className="text-brand-400 font-bold">1.</span>
                <span>Installed marketplace agents with matching task types</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-brand-400 font-bold">2.</span>
                <span>Active user capabilities matching the task domain</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-brand-400 font-bold">3.</span>
                <span>Built-in agent capabilities (email, meetings, custom)</span>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-3">Layer 2: Confirmation Gate</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            If a handler exists, the item is created with status <InlineCode>pending_confirmation</InlineCode> — it does NOT enter the active queue automatically.
            The user sees it in the Queue panel with Approve / Reject buttons.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-3">
                <span className="text-yellow-400 font-bold">🟡</span>
                <span><InlineCode>pending_confirmation</InlineCode> → User sees Approve / Reject in Queue panel</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <span>Approve → status moves to <InlineCode>ready</InlineCode> (enters execution pipeline)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-bold">✕</span>
                <span>Reject → item is deleted (never existed)</span>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-3">Queue Item Status Lifecycle</h3>
          <Code>{`pending_confirmation → ready → in_progress → done_today
                                    ↘ blocked (if stuck)
                                    ↘ later (deferred)

Status guards:
  - pending_confirmation cannot skip to in_progress or done_today
  - done_today cannot revert to ready or in_progress`}</Code>

          <h3 className="text-lg font-bold mb-3">Bypassing the Confirmation Gate</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            Open-source self-hosted users who want tasks to enter the queue without manual approval can set <InlineCode>queueAutoApprove: true</InlineCode>:
          </p>
          <Code>{`// Via v2 API
PATCH /api/v2/settings
Authorization: Bearer dvd_your_key
{ "queueAutoApprove": true }

// Via session API
PUT /api/settings
{ "queueAutoApprove": true }`}</Code>

          <h3 className="text-lg font-bold mb-3">API: Confirm / Reject</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/queue/{id}/confirm" description='Approve or reject. Body: { "action": "approve" | "reject" }. Only works on pending_confirmation items.' auth="Bearer" />
            <Endpoint method="POST" path="/api/queue/confirm" description='Session-based confirm. Body: { "id": "...", "action": "approve" | "reject" }' auth="Session" />
          </div>

          <h3 className="text-lg font-bold mb-3">Action Tags — Queue Creation</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="TAG" path='[[dispatch_queue:{"title":"...","type":"task"}]]' description="Creates as pending_confirmation (or ready if queueAutoApprove). Gated by capability check." />
            <Endpoint method="TAG" path='[[queue_capability_action:{"capabilityType":"email","action":"compose"}]]' description="Creates capability action as pending_confirmation. Same auto-approve logic." />
            <Endpoint method="TAG" path='[[suggest_marketplace:{"search":"...","category":"..."}]]' description="Surfaces matching capabilities when no handler found (gate failure)" />
          </div>

          <h3 className="text-lg font-bold mb-3">Action Tags — Chat-Based Queue Control</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            Users can manage queue items directly from chat. Divi uses these tags when the user confirms, rejects, or edits items conversationally:
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="TAG" path={'[[confirm_queue_item:{"id":"<queue_item_id>"}]]'} description="Approves a pending_confirmation item → status moves to ready. Only works on pending_confirmation items." />
            <Endpoint method="TAG" path={'[[remove_queue_item:{"id":"<queue_item_id>"}]]'} description="Deletes a queue item entirely. Works on any status." />
            <Endpoint method="TAG" path={'[[edit_queue_item:{"id":"...","title":"...","description":"...","priority":"..."}]]'} description="Updates title, description, and/or priority. Triggers the Smart Task Prompter to re-optimize the payload for the target agent." />
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            The <InlineCode>edit_queue_item</InlineCode> tag is the most powerful — when a user provides detailed context, files, or instructions in chat, Divi
            includes all of it in the edit. The Smart Task Prompter then generates both a compact <InlineCode>displaySummary</InlineCode> (≤120 chars for the queue card)
            and a full <InlineCode>optimizedPayload</InlineCode> structured to match the target agent&apos;s input schema.
          </p>

          <h3 className="text-lg font-bold mb-3">Smart Task Prompter v2</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            When a queue item is edited (via chat or inline UI), the Smart Task Prompter optimizes the task for its target execution agent:
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-start gap-3">
                <span className="text-brand-400 font-bold">1.</span>
                <span>Resolves the target agent&apos;s <strong className="text-white">Integration Kit</strong> from MarketplaceAgent (taskTypes, requiredInputSchema, contextInstructions, usageExamples, executionNotes)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-brand-400 font-bold">2.</span>
                <span>Calls LLM to produce <InlineCode>displaySummary</InlineCode> (≤120 chars — shown on queue card) and <InlineCode>optimizedPayload</InlineCode> (full structured payload matching the agent&apos;s input schema)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-brand-400 font-bold">3.</span>
                <span>Stores both in queue item <InlineCode>metadata</InlineCode> (never overwrites title/description). Also stores <InlineCode>_original</InlineCode>, <InlineCode>_optimizedAt</InlineCode>, <InlineCode>_optimizedForAgent</InlineCode></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-brand-400 font-bold">4.</span>
                <span>Falls back to generic <InlineCode>{'{task, context, deliverables, files, constraints}'}</InlineCode> structure when no agent schema is available</span>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            CoS relay dispatch sends <InlineCode>optimizedPayload</InlineCode> when available, falling back to the raw description. Queue cards show a ⚡ badge when the optimized payload exists.
          </p>
          <Code>{`// Smart Prompter output stored in metadata:
{
  "displaySummary": "Draft Q4 board deck with revenue projections",
  "optimizedPayload": {
    "task": "Create board presentation",
    "context": "Q4 2026 board meeting, Series A metrics...",
    "deliverables": ["slide-deck"],
    "constraints": ["under 15 slides", "include ARR chart"]
  },
  "_original": { "title": "...", "description": "..." },
  "_optimizedAt": "2026-04-14T...",
  "_optimizedForAgent": "research-agent"
}`}</Code>

          <h3 className="text-lg font-bold mb-3">Schema Change</h3>
          <Code>{`// User model — new field
queueAutoApprove  Boolean  @default(false)

// QueueItem.status now includes:
// "pending_confirmation" | "ready" | "in_progress" | "done_today" | "blocked" | "later"`}</Code>
        </Section>

        {/* ── CoS Execution Engine ───────────────────────────── */}
        <Section id="cos-engine" title="Chief of Staff Execution Engine">
          <p className="text-[var(--text-secondary)] mb-4">
            Chief of Staff (CoS) mode transforms Divi from reactive (waiting for you in chat) to proactive (executing queue tasks sequentially).
            When activated, Divi picks the highest-priority ready item, moves it to <InlineCode>in_progress</InlineCode>, <strong>executes it</strong>, and when done,
            auto-dispatches the next item.
          </p>

          <h3 className="text-lg font-bold mb-3">Execution Strategies</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <div>
                <span className="font-bold text-blue-400">Capability Tasks</span>
                <span className="text-[var(--text-muted)]"> — metadata contains <InlineCode>capabilityType</InlineCode></span>
                <p className="mt-1 pl-4">Invokes the capability (email, meetings, etc.) and logs as activity. Execution detail stored in <InlineCode>metadata.cosExecution</InlineCode>.</p>
              </div>
              <div>
                <span className="font-bold text-purple-400">Agent Delegation</span>
                <span className="text-[var(--text-muted)]"> — metadata contains <InlineCode>handler.connectionId</InlineCode></span>
                <p className="mt-1 pl-4">Creates an <InlineCode>AgentRelay</InlineCode> (intent: <InlineCode>assign_task</InlineCode>) to the connected agent via comms channel.</p>
              </div>
              <div>
                <span className="font-bold text-green-400">Generic Tasks</span>
                <span className="text-[var(--text-muted)]"> — no specific handler in metadata</span>
                <p className="mt-1 pl-4">Divi works on the task directly. Activity feed shows execution status.</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-3">Sequential Dispatch Contract</h3>
          <Code>{`// One task in flight at a time
// Priority: urgent > high > medium > low, then oldest first

1. User activates CoS → onEnterCoSMode(userId)
   → Dispatches top READY item to in_progress
   → Executes it (capability / relay / generic)

2. Task completes → onTaskComplete(userId, itemId)
   → Auto-dispatches next READY item
   → Executes it
   → Repeat until queue empty

3. User switches back to Cockpit
   → Returns briefing: { completedToday, stillReady, blocked }`}</Code>

          <h3 className="text-lg font-bold mb-3">Activating via API</h3>
          <Code>{`// Switch to CoS mode (auto-dispatches if queue has ready items)
PATCH /api/v2/settings
Authorization: Bearer dvd_your_key
{ "mode": "chief_of_staff" }

// Response includes auto-dispatched item:
{
  "success": true,
  "data": {
    "mode": "chief_of_staff",
    "autoDispatched": { "id": "clx...", "title": "Review proposal", "status": "in_progress" }
  }
}

// Switch back to Cockpit (returns briefing)
PATCH /api/v2/settings
{ "mode": "cockpit" }
// → { "briefing": { "completedToday": 3, "stillReady": 1, "blocked": 0 } }`}</Code>

          <h3 className="text-lg font-bold mb-3">Execution Metadata</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            After CoS executes a task, the queue item&apos;s metadata is enriched with:
          </p>
          <Code>{`{
  "cosExecution": {
    "method": "capability" | "relay" | "generic",
    "detail": "email:compose" | "Delegated to Sarah" | "Divi is executing",
    "startedAt": "2026-04-14T00:15:00.000Z"
  }
}`}</Code>
        </Section>

        {/* ── Settings API ───────────────────────────────────── */}
        <Section id="settings-api" title="Settings API (v2)">
          <p className="text-[var(--text-secondary)] mb-4">
            Programmatic access to user settings — mode switching, queue behavior, and onboarding status.
            Useful for open-source integrations, automation scripts, and custom dashboards.
          </p>

          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] divide-y divide-white/[0.04] mb-6">
            <Endpoint method="GET" path="/api/v2/settings" description="Read current settings: mode, queueAutoApprove, diviName, goalsEnabled, onboarding status" auth="Bearer" />
            <Endpoint method="PATCH" path="/api/v2/settings" description='Update settings. Body: { "mode": "chief_of_staff", "queueAutoApprove": true }' auth="Bearer" />
          </div>

          <h3 className="text-lg font-bold mb-3">Available Fields</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4">
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <div className="flex items-start gap-3">
                <InlineCode>mode</InlineCode>
                <span><InlineCode>{'"cockpit"'}</InlineCode> | <InlineCode>{'"chief_of_staff"'}</InlineCode> — Operating mode. Switching to CoS auto-dispatches.</span>
              </div>
              <div className="flex items-start gap-3">
                <InlineCode>queueAutoApprove</InlineCode>
                <span><InlineCode>boolean</InlineCode> — When true, tasks skip <InlineCode>pending_confirmation</InlineCode> and go straight to <InlineCode>ready</InlineCode>.</span>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-6 mb-3">Open-Source Quick Start</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            If you&apos;re self-hosting and want to skip the onboarding UI entirely:
          </p>
          <Code>{`# 1. Create account via /api/setup
curl -X POST /api/setup \\
  -d '{"email":"you@domain.com","password":"...","name":"You","acceptedTerms":true}'

# 2. Generate API key via /api/v2/keys
curl -X POST /api/v2/keys \\
  -H "Authorization: Bearer <session>" \\
  -d '{"label":"my-integration","scopes":["queue","chat"]}'

# 3. Configure for automation
curl -X PATCH /api/v2/settings \\
  -H "Authorization: Bearer dvd_your_key" \\
  -d '{"queueAutoApprove": true}'

# 4. Activate CoS mode
curl -X PATCH /api/v2/settings \\
  -H "Authorization: Bearer dvd_your_key" \\
  -d '{"mode": "chief_of_staff"}'`}</Code>
        </Section>

        {/* ── Teams & Project Delegation ─────────────────────── */}
        <Section id="teams-api" title="Teams & Project Delegation">
          <p className="text-[var(--text-secondary)] mb-4">
            Teams are persistent groups that span projects. Assign a team to a project to auto-sync all members as contributors.
            CoS mode delegates qualifying tasks to project contributors via relay.
          </p>

          <h4 className="text-base font-bold text-white mb-3">Schema</h4>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            <InlineCode>Team</InlineCode> now has <InlineCode>originInstanceUrl</InlineCode> (nullable — null means dividen.ai platform) and <InlineCode>isSelfHosted</InlineCode> (boolean, default false).
            Self-hosted teams bypass all subscription and billing gates.
          </p>
          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            <InlineCode>TeamInvite</InlineCode> is a new model with token-based deep links, role assignment, optional message, 7-day expiry, and support for email, userId, or connectionId targets.
          </p>

          <h4 className="text-base font-bold text-white mb-3">API Endpoints</h4>
          <div className="space-y-2 mb-6">
            <Endpoint method="POST" path="/api/teams" description="Create team. Pass originInstanceUrl for self-hosted." auth="Session" />
            <Endpoint method="GET" path="/api/teams" description="List teams you own or belong to" auth="Session" />
            <Endpoint method="GET" path="/api/teams/:id" description="Team detail with members, projects, subscription" auth="Session (member)" />
            <Endpoint method="PUT" path="/api/teams/:id" description="Update team (owner/admin)" auth="Session (owner/admin)" />
            <Endpoint method="DELETE" path="/api/teams/:id" description="Delete team (owner only)" auth="Session (owner)" />
            <Endpoint method="POST" path="/api/teams/:id/members" description="Add member by email or connectionId" auth="Session (owner/admin)" />
            <Endpoint method="DELETE" path="/api/teams/:id/members?memberId=x" description="Remove member" auth="Session (owner/admin)" />
            <Endpoint method="POST" path="/api/teams/:id/invites" description="Create invite (email, userId, or connectionId)" auth="Session (owner/admin)" />
            <Endpoint method="GET" path="/api/teams/:id/invites" description="List pending invites" auth="Session (member)" />
            <Endpoint method="GET" path="/api/teams/invite/:token" description="Preview invite details" auth="Public" />
            <Endpoint method="POST" path="/api/teams/invite/:token" description="Accept or decline: {'{ action: &quot;accept&quot; | &quot;decline&quot; }'}" auth="Session" />
            <Endpoint method="POST" path="/api/teams/:id/projects" description="Assign team to project (syncs all members)" auth="Session (owner/admin)" />
            <Endpoint method="GET" path="/api/teams/:id/projects" description="List projects assigned to team" auth="Session (member)" />
            <Endpoint method="DELETE" path="/api/teams/:id/projects?projectId=x" description="Unassign team from project" auth="Session (owner/admin)" />
          </div>

          <h4 className="text-base font-bold text-white mb-3">CoS Project Delegation</h4>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            When CoS dispatches a generic task (no explicit capability or relay handler), it checks if the task belongs to a project
            with <InlineCode>lead</InlineCode> or <InlineCode>contributor</InlineCode> members. If a qualifying member has an active connection, CoS creates an
            <InlineCode>AgentRelay</InlineCode> (type: <InlineCode>request</InlineCode>, intent: <InlineCode>assign_task</InlineCode>) with the project context.
          </p>
          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            Strategy priority: <strong className="text-white">capability → explicit relay → project contributor → generic</strong>.
            Teams add members as a bundled unit — delegation operates at the <InlineCode>ProjectMember</InlineCode> level regardless of how the member was added.
          </p>

          <h4 className="text-base font-bold text-white mb-3">Billing Boundary</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 text-sm mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-brand-500/5 border border-brand-500/10">
                <p className="font-bold text-brand-400 text-xs mb-1">Platform (dividen.ai)</p>
                <p className="text-[var(--text-muted)] text-xs">Subscription required. Starter $29/mo (5 seats) or Pro $79/mo (10 + $9/seat).</p>
              </div>
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                <p className="font-bold text-emerald-400 text-xs mb-1">Self-Hosted (open-source)</p>
                <p className="text-[var(--text-muted)] text-xs">Free. All gates bypassed. Unlimited seats, projects, features.</p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-xs mt-3">Billing follows team <strong className="text-white">origin</strong>, not member origin. A platform user joining a self-hosted team is free.</p>
          </div>

          <h4 className="text-base font-bold text-white mb-3">Open-Source Implementation Guide</h4>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">If you&apos;re running your own instance and want to enable teams:</p>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] text-sm space-y-2 mb-4">
            <li><strong className="text-white">Pull the latest schema.</strong> <InlineCode>Team</InlineCode> has new fields: <InlineCode>originInstanceUrl</InlineCode>, <InlineCode>isSelfHosted</InlineCode>. <InlineCode>TeamInvite</InlineCode> is a new model. Run <InlineCode>npx prisma db push</InlineCode>.</li>
            <li><strong className="text-white">Set your instance URL.</strong> Add <InlineCode>DIVIDEN_INSTANCE_URL</InlineCode> to your <InlineCode>.env</InlineCode>. Pass it as <InlineCode>originInstanceUrl</InlineCode> when creating teams. The API sets <InlineCode>isSelfHosted = !!originInstanceUrl</InlineCode>.</li>
            <li><strong className="text-white">Feature gates auto-bypass.</strong> <InlineCode>feature-gates.ts</InlineCode> returns a synthetic unlimited subscription for any team where <InlineCode>isSelfHosted: true</InlineCode>. No code changes required.</li>
            <li><strong className="text-white">Team invites work locally.</strong> Same token-based flow — generate at <InlineCode>/api/teams/:id/invites</InlineCode>, share the link, accept at <InlineCode>/team/invite/:token</InlineCode>.</li>
            <li><strong className="text-white">Cross-instance invites</strong> require a <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">federation connection</a> between instances first. The invite links to a <InlineCode>connectionId</InlineCode> and membership flows through the relay system.</li>
            <li><strong className="text-white">CoS delegation works automatically</strong> once members are synced to projects. No additional configuration.</li>
            <li><strong className="text-white">Profiles work the same way.</strong> User profiles at <InlineCode>/profile/:userId</InlineCode> and team profiles at <InlineCode>/team/:id</InlineCode> are public by default. Set <InlineCode>visibility</InlineCode> to <InlineCode>private</InlineCode> or <InlineCode>network</InlineCode> to restrict access.</li>
          </ol>
          <p className="text-[var(--text-secondary)] text-sm">
            See the <a href="/open-source" className="text-brand-400 hover:text-brand-300">open-source guide</a> for general self-hosting setup,
            and the <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">federation docs</a> for cross-instance connectivity.
          </p>
        </Section>

        {/* ── Behavior Signals API ────────────────────────────── */}
        <Section id="behavior-signals" title="Behavior Signals API">
          <p className="text-[var(--text-secondary)] mb-4">
            The behavior signal system collects lightweight, fire-and-forget events from user interactions.
            These signals feed the pattern analysis engine that generates learnings.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Endpoint</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
            <Endpoint method="POST" path="/api/behavior-signals" description="Emit a behavior signal. Payload: { action, context, hour?, dayOfWeek? }. Returns 201." auth="Session" />
            <Endpoint method="GET" path="/api/behavior-signals" description="List signals for current user (paginated). Query: ?limit=50&offset=0" auth="Session" />
          </div>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Client Helper</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Use <InlineCode>emitSignal(action, context)</InlineCode> from <InlineCode>src/lib/behavior-signals.ts</InlineCode>.
            It automatically attaches the current hour and day-of-week, and swallows errors so it never breaks the UI.
          </p>
          <Code>{`import { emitSignal } from '@/lib/behavior-signals';

// In any event handler:
emitSignal('queue_done_today', { itemId: item.id, status: 'done_today' });
emitSignal('chat_send', { contentLength: message.length });
emitSignal('email_opened', { threadId: thread.id });`}</Code>

          <h4 className="text-base font-bold text-white mb-2">Currently Instrumented Actions</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)]">
              <div><InlineCode>queue_done_today</InlineCode> — Queue item marked done</div>
              <div><InlineCode>queue_in_progress</InlineCode> — Queue item started</div>
              <div><InlineCode>queue_delete</InlineCode> — Queue item deleted</div>
              <div><InlineCode>chat_send</InlineCode> — Chat message sent</div>
            </div>
          </div>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Adding New Signal Types</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Call <InlineCode>emitSignal</InlineCode> from any component&apos;s event handler. No schema changes needed — the
            <InlineCode>action</InlineCode> field is a free-form string and <InlineCode>context</InlineCode> is a JSON object.
            The analysis endpoint (<InlineCode>POST /api/learnings/analyze</InlineCode>) groups signals by action type for pattern detection.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Prisma Model</h4>
          <Code>{`model BehaviorSignal {
  id        String   @id @default(cuid())
  userId    String
  action    String   // e.g. "queue_done_today"
  context   Json?    // e.g. { itemId, status }
  hour      Int?     // 0-23
  dayOfWeek Int?     // 0=Sun, 6=Sat
  createdAt DateTime @default(now())
  user      User     @relation(...)
}`}</Code>
        </Section>

        {/* ── Learnings API ──────────────────────────────────── */}
        <Section id="learnings-api" title="Learnings API">
          <p className="text-[var(--text-secondary)] mb-4">
            Learnings are patterns detected from behavior signals. Every learning is user-controlled — editable, dismissable, deletable.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Endpoints</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
            <Endpoint method="GET" path="/api/learnings" description="List all learnings for current user. Returns array with category, confidence, source, content, dismissed, seenAt." auth="Session" />
            <Endpoint method="POST" path="/api/learnings" description="Create a learning. Body: { category, content, confidence?, source? }" auth="Session" />
            <Endpoint method="PATCH" path="/api/learnings/[id]" description="Update a learning. Body: { content?, dismissed?, seenAt? }" auth="Session" />
            <Endpoint method="DELETE" path="/api/learnings/[id]" description="Permanently delete a learning." auth="Session" />
            <Endpoint method="POST" path="/api/learnings/analyze" description="Trigger pattern analysis. Processes signals, generates new learnings, creates notification." auth="Session" />
          </div>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Learning Categories</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)]">
              <div><InlineCode>behavior</InlineCode> — Usage patterns (peak hours, quiet days)</div>
              <div><InlineCode>schedule</InlineCode> — Time-based patterns</div>
              <div><InlineCode>capability</InlineCode> — Feature usage insights</div>
              <div><InlineCode>workflow</InlineCode> — Action sequence patterns</div>
            </div>
          </div>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Notification Deep-Linking</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            When the analysis endpoint creates new learnings, it logs an <InlineCode>ActivityLog</InlineCode> with
            action <InlineCode>learning_generated</InlineCode>. The notification feed maps this to the intelligence category.
            Clicking the notification navigates to <InlineCode>/settings?tab=learnings</InlineCode>.
          </p>
          <p className="text-[var(--text-secondary)] mb-4">
            Implementation: <InlineCode>NotificationCenter.tsx</InlineCode> checks notification action and uses
            <InlineCode>router.push(&apos;/settings?tab=learnings&apos;)</InlineCode> for learning/intelligence notifications.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Admin: Workflow Discovery</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
            <Endpoint method="GET" path="/api/admin/workflows" description="List WorkflowPattern records. Returns action sequences detected across users." auth="Bearer" />
            <Endpoint method="PATCH" path="/api/admin/workflows" description="Mark a pattern as reviewed. Body: { id }" auth="Bearer" />
          </div>
        </Section>

        {/* ── Smart Tagging ──────────────────────────────────── */}
        <Section id="smart-tagging" title="Smart Tagging Implementation">
          <p className="text-[var(--text-secondary)] mb-4">
            Smart tags are auto-generated labels on kanban cards that surface who&apos;s involved (local + federated) and due date urgency.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Tag Extraction — <InlineCode>getSmartTags(card)</InlineCode></h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Located in <InlineCode>src/components/dashboard/KanbanView.tsx</InlineCode>. Returns an array of
            <InlineCode>{'{'}label, color, icon{'}'}</InlineCode> objects:
          </p>
          <Code>{`function getSmartTags(card: KanbanCardData) {
  const tags: { label: string; color: string; icon: string }[] = [];

  // 1. Project member tags
  card.project?.members?.forEach(m => {
    if (m.user) {
      tags.push({ label: m.user.name, color: 'blue', icon: '👤' });
    } else if (m.connection) {
      tags.push({ label: m.connection.name, color: 'purple', icon: '🔗' });
    }
  });

  // 2. Due date urgency
  if (card.dueDate) {
    const due = new Date(card.dueDate);
    const now = new Date();
    if (due < now) tags.push({ label: 'Overdue', color: 'red', icon: '🔴' });
    else if (due.toDateString() === now.toDateString())
      tags.push({ label: 'Due Today', color: 'orange', icon: '⏰' });
  }

  return tags;
}`}</Code>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Extending Tags</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Add new tag types by pushing to the <InlineCode>tags</InlineCode> array:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li><strong className="text-white">Labels</strong> — Read <InlineCode>card.metadata?.labels</InlineCode> or add a <InlineCode>labels</InlineCode> field to the KanbanCard model</li>
            <li><strong className="text-white">Priority</strong> — Map <InlineCode>card.priority</InlineCode> to color-coded tags</li>
            <li><strong className="text-white">External IDs</strong> — Parse Jira/GitHub references from card title or metadata</li>
            <li><strong className="text-white">Custom status</strong> — Derive from <InlineCode>card.column</InlineCode> or <InlineCode>card.status</InlineCode></li>
          </ul>
          <p className="text-[var(--text-secondary)] mb-4">
            Colors are mapped to Tailwind classes in the card renderer: <InlineCode>blue</InlineCode> → <InlineCode>bg-blue-500/20 text-blue-300</InlineCode>,{' '}
            <InlineCode>purple</InlineCode> → <InlineCode>bg-purple-500/20 text-purple-300</InlineCode>, etc.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Board Drag Detection</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The kanban board distinguishes card drags from board scrolls using <InlineCode>data-kanban-card=&quot;true&quot;</InlineCode> attributes:
          </p>
          <Code>{`// In board pointer handlers:
const isOnCard = (e.target as HTMLElement).closest('[data-kanban-card]');
if (isOnCard) return; // Let dnd-kit handle card drag
// Otherwise, initiate board scroll via boardRef.current.scrollLeft`}</Code>
        </Section>

        {/* ── DragScrollContainer ────────────────────────────── */}
        <Section id="drag-scroll" title="DragScrollContainer">
          <p className="text-[var(--text-secondary)] mb-4">
            A reusable component for enabling horizontal drag-to-scroll on any overflow content.
            Located at <InlineCode>src/components/ui/DragScrollContainer.tsx</InlineCode>.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Usage</h4>
          <Code>{`import { DragScrollContainer } from '@/components/ui/DragScrollContainer';

<DragScrollContainer className="gap-2" showFadeEdges>
  {tabs.map(tab => (
    <button key={tab.id} className="flex-shrink-0 px-3 py-1.5">
      {tab.label}
    </button>
  ))}
</DragScrollContainer>`}</Code>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Props</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 text-sm text-[var(--text-secondary)]">
            <div className="space-y-2">
              <div><InlineCode>children</InlineCode> — Content to render inside the scrollable container</div>
              <div><InlineCode>className?</InlineCode> — Additional classes for the inner flex container</div>
              <div><InlineCode>showFadeEdges?</InlineCode> — Show gradient fade indicators at overflow boundaries (default: true)</div>
            </div>
          </div>

          <h4 className="text-base font-bold text-white mt-6 mb-2">How It Works</h4>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Uses <InlineCode>ResizeObserver</InlineCode> to detect when content overflows horizontally</li>
            <li>Pointer events track drag state — when dragging, <InlineCode>scrollLeft</InlineCode> updates with delta</li>
            <li>Click events are captured and suppressed during drag to prevent accidental tab/button activation</li>
            <li>Fade edges render as absolute-positioned gradient overlays when <InlineCode>showFadeEdges</InlineCode> is true</li>
          </ul>

          <h4 className="text-base font-bold text-white mb-2">Currently Applied To</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 text-sm text-[var(--text-secondary)]">
            <div className="space-y-1">
              <div>• <InlineCode>Settings</InlineCode> tab bar — <InlineCode>src/app/settings/page.tsx</InlineCode></div>
              <div>• <InlineCode>Admin</InlineCode> tab bar — <InlineCode>src/app/admin/page.tsx</InlineCode></div>
              <div>• <InlineCode>CenterPanel</InlineCode> sub-tabs — <InlineCode>src/components/dashboard/CenterPanel.tsx</InlineCode></div>
            </div>
          </div>
        </Section>

        {/* ── NOW Engine Correlation ─────────────────────────── */}
        <Section id="now-engine" title="NOW Engine: Calendar-Queue Correlation">
          <p className="text-[var(--text-secondary)] mb-4">
            The NOW engine (<InlineCode>src/lib/now-engine.ts</InlineCode>) dynamically prioritizes queue items
            by cross-referencing them with upcoming calendar events.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Correlation Algorithm</h4>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Scans calendar events starting within the next <strong className="text-white">60 minutes</strong></li>
            <li>Tokenizes each event title into keywords (only words with 3+ characters)</li>
            <li>For each queue item, checks if its title contains any event keyword (case-insensitive substring match)</li>
            <li>Matching items receive a <strong className="text-white">+25 score boost</strong></li>
            <li>Subtitle is updated to: <InlineCode>&quot;Related to upcoming: [Event Title]&quot;</InlineCode></li>
          </ol>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Implementation Location</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The correlation block runs inside <InlineCode>computeNow()</InlineCode> after the calendar prep items section.
            It iterates the <InlineCode>scored</InlineCode> array of NowItems and modifies scores in-place before final sorting.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Extending Correlation</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            To add new correlation sources:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Add data fetching alongside the existing calendar fetch in <InlineCode>computeNow()</InlineCode></li>
            <li>Create a new correlation block following the same pattern: extract keywords → match against queue items → boost score</li>
            <li>Adjust boost values relative to the existing +25 for calendar (e.g., email mentions might warrant +15)</li>
          </ul>
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
            Built by <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">DiviDen</a> — the individual-first operating system
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <a href="/open-source" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Open Source</a>
            <a href="/documentation" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Documentation</a>
            <a href="/docs/federation" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Federation</a>
            <a href="/docs/release-notes" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Changelog</a>
            <a href="/docs/integrations" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Integrations</a>
          </div>
        </div>
      </div>
    </div>
  );
}