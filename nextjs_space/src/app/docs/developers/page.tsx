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

import { DocFooterDownload } from '@/components/docs/DocFooterDownload';
import { UpdatedBadge } from '@/components/docs/DocDownloadButton';

/* ── Helpers ────────────────────────────────────────────────────────────────── */

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
  { id: 'marketplace', label: 'Bubble Store API' },
  { id: 'federation', label: 'Cross-Instance API' },
  { id: 'integration-kit', label: 'Integration Kit' },
  { id: 'queue-gating', label: 'Queue Gating & Confirmation' },
  { id: 'cos-engine', label: 'CoS Execution Engine' },
  { id: 'settings-api', label: 'Settings API (v2)' },
  { id: 'teams-api', label: 'Teams & Project Delegation' },
  { id: 'project-management', label: 'Project Management API' },
  { id: 'behavior-signals', label: 'Behavior Signals API' },
  { id: 'learnings-api', label: 'Learnings API' },
  { id: 'smart-tagging', label: 'Smart Tagging' },
  { id: 'drag-scroll', label: 'DragScrollContainer' },
  { id: 'board-cortex', label: 'Board Cortex Intelligence' },
  { id: 'system-prompt', label: 'System Prompt Architecture' },
  { id: 'onboarding-v2', label: 'Project-Based Onboarding' },
  { id: 'cockpit-mode', label: 'Cockpit Mode & Work Partner' },
  { id: 'auto-patterns', label: 'Auto-Discuss / Auto-Complete' },
  { id: 'now-engine', label: 'NOW Engine Correlation' },
  { id: 'realtime-events', label: 'Realtime Event System' },
  { id: 'catch-up', label: 'Catch-Up Briefing' },
  { id: 'activity-api', label: 'Activity Feed API' },
  { id: 'cortex-daemon', label: 'Cortex Daemon (Scheduled Scan)' },
  { id: 'linked-kards', label: 'Linked Kards (Cross-User)' },
  { id: 'card-activity-feeds', label: 'Card Activity Feeds' },
  { id: 'google-connect-widget', label: 'Google Connect Widget' },
  { id: 'widget-library', label: 'Widget Library (v1.9.2)' },
  { id: 'fvp-integration', label: 'FVP Integration Notes (v2.7)' },
  { id: 'username-system', label: 'Username System (v2.0)' },
  { id: 'mentions-system', label: '@Mentions & Resolution (v2.0)' },
  { id: 'federation-mentions', label: 'Federation Mentions API (v2.0)' },
  { id: 'notification-center', label: 'Notification Center (v2.0)' },
  { id: 'rate-limits', label: 'Rate Limits' },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function DeveloperDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-12" data-doc-content>
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
        <Section id="federation-v2" title="Federation v2 API" badge={<UpdatedBadge date="Apr 14" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            The v2 federation endpoints handle instance registration, heartbeat, Bubble Store linking, agent sync, and payment validation.
            Public endpoints are CORS-enabled. Authenticated endpoints use the <InlineCode>platformToken</InlineCode> issued during registration.
          </p>

          <h3 className="text-lg font-bold mb-3">Public Endpoints</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="GET" path="/api/v2/updates" description="Unified platform updates feed (CORS-enabled, cacheable)" auth="Public" />
            <Endpoint method="GET" path="/api/v2/network/discover" description="Discover profiles, teams, Bubble Store agents" auth="Public or Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Instance Registration & Lifecycle</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/register" description="Register instance → returns platformToken. New instances start as pending_review." auth="None" />
            <Endpoint method="POST" path="/api/v2/federation/heartbeat" description="Report instance health, version, user/agent counts (send every 1-12h)" auth="Platform Token" />
            <Endpoint method="POST" path="/api/v2/federation/marketplace-link" description="Enable/disable Bubble Store participation for instance" auth="Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Agent Sync</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/agents" description="Sync agents to managed Bubble Store (max 50 per call). Accepts pricePerTask/pricingAmount/price, accessPassword, currency, nested capabilities." auth="Platform Token" />
            <Endpoint method="GET" path="/api/v2/federation/agents" description="List agents currently synced from your instance" auth="Platform Token" />
            <Endpoint method="PUT" path="/api/v2/federation/agents/:remoteId" description="Register or update a single agent (upsert)" auth="Platform Token" />
            <Endpoint method="GET" path="/api/v2/federation/agents/:remoteId" description="Retrieve agent details + revenue stats" auth="Platform Token" />
            <Endpoint method="DELETE" path="/api/v2/federation/agents/:remoteId" description="Remove agent, cascade-delete subscriptions and executions" auth="Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Capability Sync</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/capabilities" description="Sync capabilities to managed Bubble Store (max 50 per call). Accepts promptGroup, signalPatterns, tokenEstimate, alwaysLoad." auth="Platform Token" />
            <Endpoint method="GET" path="/api/v2/federation/capabilities" description="List capabilities currently synced from your instance" auth="Platform Token" />
          </div>

          <h3 className="text-lg font-bold mb-3">Payment Validation</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/v2/federation/validate-payment" description="Validate proposed fee against network minimums (3% Bubble Store, 7% recruiting)" auth="Platform Token" />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <h4 className="text-sm font-bold text-amber-400 mb-1">Instance Lifecycle</h4>
            <p className="text-sm text-[var(--text-secondary)]">
              New registrations start as <strong className="text-amber-400">pending_review</strong>. Admin approval is required before the instance is active on the network.
              All agent and capability submissions always enter <strong className="text-amber-400">pending_review</strong> — no auto-approve, even for trusted instances.
              Deactivating an instance cascade-suspends all its Bubble Store agents. Re-activating restores them.
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
            <Endpoint method="POST" path='{ "method": "tools/list" }' description="List all available tools (20 static + dynamic Bubble Store tools)" />
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
              <li><InlineCode>marketplace_browse</InlineCode> — Search and filter Bubble Store agents by category, pricing, skills</li>
              <li><InlineCode>marketplace_unlock</InlineCode> — Unlock paid agents using developer-shared access passwords</li>
            </ul>
          </div>

          <h3 className="text-lg font-bold mb-3">Dynamic Tools</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            Installed Bubble Store agents appear as <InlineCode>marketplace_&#123;slug&#125;</InlineCode> tools.
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
        <Section id="marketplace" title="Bubble Store API">
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

          <h3 className="text-lg font-bold mb-3">Execution Endpoint — Full Contract</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            <InlineCode>POST /api/marketplace/:id/execute</InlineCode> is the primary endpoint for running tasks against Bubble Store agents.
            DiviDen acts as a broker: it calls the agent&apos;s <InlineCode>endpointUrl</InlineCode> directly, tracks the execution, and handles payment splitting.
          </p>

          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">Request</h4>
          <Code>{`POST /api/marketplace/:id/execute
Auth: Session (logged-in user)
Rate Limit: 20/min per IP

{
  "input": "string (required — the task text)",
  "paymentMethodId": "string (optional — Stripe PM ID, falls back to default)"
}`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Standard Response</h4>
          <Code>{`{
  "executionId": "cuid",
  "status": "completed" | "failed" | "timeout",
  "output": "string (agent's response)",
  "responseTimeMs": 1234,
  "isOwnAgent": false,
  "revenue": {                     // only for paid executions
    "gross": 5.00,
    "developerPayout": 4.85,
    "platformFee": 0.15,
    "feePercent": 3
  }
}`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Dynamic Pricing Response</h4>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            If the agent&apos;s <InlineCode>pricingModel</InlineCode> is <InlineCode>dynamic</InlineCode> and it returns a <InlineCode>price_quote</InlineCode> in its response, the execution enters a two-phase flow:
          </p>
          <Code>{`{
  "executionId": "cuid",
  "status": "completed",
  "output": "string",
  "pricingPhase": "quoted",
  "quote": {
    "amount": 12.50,
    "currency": "USD",
    "breakdown": "2h research @ $6.25/hr",
    "approveUrl": "/api/marketplace/:id/execute/:executionId"
  },
  "widget": { "type": "payment_prompt", ... }
}

// User approves/declines via:
POST /api/marketplace/:id/execute/:executionId
{ "action": "approve" | "decline" }`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">How DiviDen Calls Your Agent</h4>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            DiviDen sends a POST to the agent&apos;s <InlineCode>endpointUrl</InlineCode> with auth headers matching the agent&apos;s <InlineCode>authMethod</InlineCode>.
            The payload format depends on <InlineCode>inputFormat</InlineCode>:
          </p>
          <Code>{`// inputFormat: "text" (default)
{ "message": "task text" }

// inputFormat: "json"
{ "task": "task text", "executionId": "cuid" }

// inputFormat: "a2a" (Agent-to-Agent protocol)
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "executionId",
    "message": { "role": "user", "parts": [{ "type": "text", "text": "task text" }] }
  }
}

// Headers always include:
X-DiviDen-Execution-Id: <executionId>
X-DiviDen-Source: marketplace`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Federated Agent Approval</h4>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            All agents and capabilities synced from federated instances enter <InlineCode>pending_review</InlineCode> status — no auto-approve, even for trusted instances.
            Admin reviews each submission in the DiviDen admin panel. When an agent is approved or rejected, a webhook fires to the source instance at <InlineCode>/api/marketplace/webhook</InlineCode>:
          </p>
          <Code>{`// Webhook payload
{
  "event": "agent_approval",
  "agentId": "remote-agent-id",
  "marketplaceId": "marketplace-cuid",
  "name": "Agent Name",
  "slug": "instance-agent-slug",
  "status": "active" | "rejected",
  "reason": "optional rejection reason",
  "timestamp": "2026-04-14T..."
}`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Inbound Task Routing — Which Endpoint Receives What</h4>
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-sm space-y-2">
            <div className="flex gap-2">
              <span className="font-bold text-blue-400 w-40 flex-shrink-0">Bubble Store Execute</span>
              <span className="text-[var(--text-secondary)]">Direct HTTP POST to agent&apos;s <InlineCode>endpointUrl</InlineCode>. Brokered by DiviDen. Used when a user clicks &quot;Execute&quot; on a Bubble Store agent. Synchronous (30s timeout).</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-purple-400 w-40 flex-shrink-0">DAWP Relay</span>
              <span className="text-[var(--text-secondary)]">POST to <InlineCode>/api/federation/relay</InlineCode>. Used for CoS delegation to connected agents and cross-instance task assignment. Asynchronous (fires and tracks).</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-green-400 w-40 flex-shrink-0">A2A Protocol</span>
              <span className="text-[var(--text-secondary)]">POST to <InlineCode>/api/a2a</InlineCode>. JSON-RPC format for programmatic agent-to-agent communication. Supports tasks/send, tasks/respond, tasks/get. Used for structured multi-step workflows.</span>
            </div>
          </div>
        </Section>

        {/* ── Cross-Instance API ──────────────────────────────── */}
        <Section id="federation" title="Cross-Instance API">
          <p className="text-[var(--text-secondary)] mb-4">
            Cross-instance endpoints for federated DiviDen instances. All require <InlineCode>x-federation-token</InlineCode> or <InlineCode>Authorization: Bearer</InlineCode> header.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="POST" path="/api/federation/relay" description="Send a relay message to this instance (v2.1.15: idempotent on peerRelayId, ambient gates, auto-Kanban for tasks)" auth="Federation" />
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
            <Endpoint method="POST" path="/api/federation/notifications" description="Push typed notifications (12 types) from federated instance" auth="Federation" />
            <Endpoint method="GET" path="/api/federation/mentions?prefix=jo" description="@mention autocomplete — prefix-search users (max 10)" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/connect" description="Request a federation connection with a user" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/connect/accept" description="Acceptance callback — fires when auto-accept is on (v2.1.6)" auth="Federation" />
            <Endpoint method="POST" path="/api/federation/relay-ack" description="Relay completion/decline acknowledgment callback" auth="Federation" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            Full federation docs at <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">/docs/federation</a>.
          </p>
        </Section>

        {/* ── Integration Kit ─────────────────────────────────── */}
        <Section id="integration-kit" title="Integration Kit">
          <p className="text-[var(--text-secondary)] mb-4">
            When listing an agent in the Bubble Store, you can provide an Integration Kit — structured metadata that teaches Divi how to work with your agent.
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
                <span>Installed Bubble Store agents with matching task types</span>
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

        {/* ── Project Management API ──────────────────────────── */}
        <Section id="project-management" title="Project Management API">
          <p className="text-[var(--text-secondary)] mb-4">
            Projects are scoped workspaces with members (local users or federated connections). Members can be leads, contributors, reviewers, or observers.
            New in v2.1.3: Divi can create projects and invite members directly from chat using action tags.
          </p>

          <h4 className="text-base font-bold text-white mb-3">REST Endpoints</h4>
          <div className="space-y-2 mb-6">
            <Endpoint method="POST" path="/api/projects" description="Create project. Body: { name, description?, teamId?, color?, visibility? }. Creator auto-added as lead." auth="Session" />
            <Endpoint method="GET" path="/api/projects" description="List projects you created or are a member of" auth="Session" />
            <Endpoint method="GET" path="/api/projects/:id" description="Project detail with members, cards, invites" auth="Session (member)" />
            <Endpoint method="PUT" path="/api/projects/:id" description="Update project (lead only)" auth="Session (lead)" />
            <Endpoint method="POST" path="/api/projects/:id/invite" description="Invite user by userId, email, or connectionId. Creates ProjectInvite + queue notification." auth="Session (lead)" />
            <Endpoint method="GET" path="/api/projects/:id/invite" description="List pending invites" auth="Session (member)" />
            <Endpoint method="POST" path="/api/projects/:id/members" description="Direct-add member by email or connectionId (skip invite)" auth="Session (lead/contributor)" />
            <Endpoint method="DELETE" path="/api/projects/:id/members?memberId=x" description="Remove member" auth="Session (lead)" />
          </div>

          <h4 className="text-base font-bold text-white mb-3">Action Tags (Chat-Based)</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <Endpoint method="TAG" path={'[[create_project:{"name":"...","description":"...","members":[{"name":"jaron"},{"name":"alvaro"}]}]]'} description="Creates project + auto-invites members. Resolves names against active connections. Each invitee gets queue item + comms." />
            <Endpoint method="TAG" path={'[[invite_to_project:{"projectName":"...","members":[{"name":"jaron","role":"contributor"}]}]]'} description="Invites members to existing project by name (fuzzy match) or ID. Same invite pipeline." />
            <Endpoint method="TAG" path={'[[assign_team_to_project:{"projectName":"...","teamName":"..."}]]'} description="Converts project to team project. All team members auto-added as contributors." />
          </div>

          <h4 className="text-base font-bold text-white mb-3">Federation: Cross-Instance Project Invites</h4>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            When a project invite targets a federated connection, DiviDen automatically pushes a notification to the remote instance via <InlineCode>POST /api/federation/notifications</InlineCode> with type <InlineCode>project_invite</InlineCode>.
          </p>
          <Code>{`// Federation notification payload for project invite
{
  "type": "project_invite",
  "fromUserName": "Jon Bradford",
  "fromUserEmail": "jon@colab.la",
  "toUserEmail": "alvaro@fractionalventure.partners",
  "title": "Project invite: Debugging DiviDen",
  "body": "You've been invited to join \\"Debugging DiviDen\\" as contributor.",
  "metadata": {
    "projectId": "proj_abc",
    "inviteId": "inv_xyz",
    "role": "contributor"
  },
  "timestamp": "2026-04-17T19:00:00.000Z"
}`}</Code>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            See the <a href="/docs/fvp-cross-operability-v2.2.md" className="text-brand-400 hover:text-brand-300" target="_blank">FVP Cross-Operability Guide</a> for the full event taxonomy and implementation details.
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

        {/* ── Board Cortex Intelligence ─────────────────────── */}
        <Section id="board-cortex" title="Board Cortex Intelligence">
          <p className="text-[var(--text-secondary)] mb-4">
            The Board Cortex is a background intelligence layer that analyzes the kanban board for redundancies,
            stale items, and escalation candidates. It produces a pre-digested context digest that Divi receives
            in every conversation — replacing raw data analysis with actionable insights.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Architecture</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Located in <InlineCode>src/lib/board-cortex.ts</InlineCode>. Pure functions that take cards as input
            and produce structured analysis. No LLM calls — all deterministic, Levenshtein-based similarity matching.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Core Functions</h4>
          <div className="space-y-3 mb-4">
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">detectDuplicates(cards)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Levenshtein scan across active card titles. 75% similarity threshold. Returns merge suggestions with source/target and confidence scores.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">detectDuplicateTasks(cards)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Cross-card checklist similarity at 80% threshold. Finds overlapping incomplete tasks across different cards.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">findStaleCards(cards, now)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Active cards with no update for 14+ days. Includes checklist progress for context.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">findEscalationCandidates(cards, now)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Cards within 48h of deadline at &lt;30% checklist completion. Auto-bumped to &quot;urgent&quot; priority during full scans.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">buildContextDigest(userId, cards, now)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Produces the pre-digested summary injected into Divi&apos;s system prompt. Includes TOP FOCUS, BOARD HEALTH, RECENT COMPLETIONS, and actionable BOARD INTELLIGENCE with ready-to-use action tags.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm font-mono text-brand-400">runBoardScan(userId)</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Full scan: detect all issues → auto-escalate deadline cards → persist insights to BoardInsight model → log activity. Called by <InlineCode>POST /api/board/cortex</InlineCode>.</p>
            </div>
          </div>

          <h4 className="text-base font-bold text-white mb-2">API Endpoints</h4>
          <div className="space-y-2 mb-4">
            <Endpoint method="GET" path="/api/board/cortex" description="Returns the context digest (same format injected into Divi&apos;s prompt)" auth="Session" />
            <Endpoint method="POST" path="/api/board/cortex" description="Triggers full board scan with auto-housekeeping. Returns health summary, all detected issues, and auto-actions taken." auth="Session" />
          </div>

          <h4 className="text-base font-bold text-white mb-2">BoardInsight Model</h4>
          <Code>{`model BoardInsight {
  id         String   // cuid
  type       String   // "merge_suggestion" | "stale_card" | "auto_escalate" | "duplicate_tasks" | "archive_candidate"
  status     String   // "active" | "dismissed" | "applied"
  confidence Float    // 0.0 - 1.0
  reason     String   // Human-readable explanation
  sourceId   String   // Primary card/item ID
  targetId   String?  // For merge suggestions — the target card
  userId     String
}`}</Code>

          <h4 className="text-base font-bold text-white mt-6 mb-2">System Prompt Integration</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The digest is injected into Divi&apos;s Group 2 (Active State) as a &quot;🧠 Board Intelligence&quot; section.
            It supplements the raw card listing — Divi gets both detail and analysis. When the board
            is clean, only the health status line appears. When issues are detected, full context plus suggested action
            tags are included.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Extending the Cortex</h4>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Add new detection functions following the same pattern: take <InlineCode>CortexCard[]</InlineCode>, return typed results</li>
            <li>Wire them into <InlineCode>buildContextDigest()</InlineCode> and <InlineCode>runBoardScan()</InlineCode></li>
            <li>Reuse <InlineCode>similarity()</InlineCode> from <InlineCode>queue-dedup.ts</InlineCode> for any text matching</li>
            <li>For LLM-powered analysis (semantic dedup, priority suggestions), add to <InlineCode>runBoardScan()</InlineCode> — keep <InlineCode>buildContextDigest()</InlineCode> fast and deterministic</li>
          </ul>
        </Section>

        {/* ── System Prompt Architecture ──────────────────────── */}
        <Section id="system-prompt" title="System Prompt Architecture (Modular Capabilities)">
          <p className="text-[var(--text-secondary)] mb-4">
            Divi&apos;s system prompt is dynamically assembled per-message from modular groups.
            A relevance engine scores each group against the current conversation context and only loads what&apos;s needed.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Capability Modules</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            The old monolithic <InlineCode>buildCapabilitiesAndSyntax()</InlineCode> (7,219 tokens, always loaded) has been
            split into 5 purpose-built functions:
          </p>
          <div className="bg-black/20 rounded-lg border border-white/[0.06] overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-3 text-white font-bold">Function</th>
                  <th className="text-right p-3 text-white font-bold">~Tokens</th>
                  <th className="text-left p-3 text-white font-bold">Group</th>
                  <th className="text-left p-3 text-white font-bold">Loading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[var(--text-secondary)]">
                <tr>
                  <td className="p-3"><InlineCode>buildCapabilitiesCore()</InlineCode></td>
                  <td className="p-3 text-right font-mono text-brand-400">3,200</td>
                  <td className="p-3"><InlineCode>capabilities_core</InlineCode></td>
                  <td className="p-3">Always</td>
                </tr>
                <tr>
                  <td className="p-3"><InlineCode>buildTriageCapabilities()</InlineCode></td>
                  <td className="p-3 text-right font-mono">1,200</td>
                  <td className="p-3"><InlineCode>capabilities_triage</InlineCode></td>
                  <td className="p-3">On-demand</td>
                </tr>
                <tr>
                  <td className="p-3"><InlineCode>buildRoutingCapabilities()</InlineCode></td>
                  <td className="p-3 text-right font-mono">800</td>
                  <td className="p-3"><InlineCode>capabilities_routing</InlineCode></td>
                  <td className="p-3">On-demand</td>
                </tr>
                <tr>
                  <td className="p-3"><InlineCode>buildFederationCapabilities()</InlineCode></td>
                  <td className="p-3 text-right font-mono">200</td>
                  <td className="p-3"><InlineCode>capabilities_federation</InlineCode></td>
                  <td className="p-3">On-demand</td>
                </tr>
                <tr>
                  <td className="p-3"><InlineCode>buildMarketplaceCapabilities()</InlineCode></td>
                  <td className="p-3 text-right font-mono">200</td>
                  <td className="p-3"><InlineCode>capabilities_marketplace</InlineCode></td>
                  <td className="p-3">On-demand</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-base font-bold text-white mb-2">Relevance Engine</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            <InlineCode>selectRelevantGroups(currentMessage, recentContext)</InlineCode> manages 17 prompt groups.
            Each group has regex signal patterns in <InlineCode>SIGNAL_PATTERNS</InlineCode>. The engine:
          </p>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-1 text-sm">
            <li>Scores each group against current message + last 3 messages</li>
            <li>Groups with empty patterns (like <InlineCode>capabilities_core</InlineCode>) always score 1.0</li>
            <li>Groups above the relevance threshold are included</li>
            <li><InlineCode>setup</InlineCode> is always force-added (lightweight status line)</li>
          </ol>

          <h4 className="text-base font-bold text-white mb-2">All 17 Prompt Groups</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[var(--text-secondary)]">
              <span>1. <InlineCode>identity</InlineCode></span>
              <span>2. <InlineCode>active_state</InlineCode></span>
              <span>3. <InlineCode>comms</InlineCode></span>
              <span>4. <InlineCode>connections</InlineCode></span>
              <span>5. <InlineCode>goals</InlineCode></span>
              <span>6. <InlineCode>memory</InlineCode></span>
              <span>7. <InlineCode>capabilities_core</InlineCode> ★</span>
              <span>7b. <InlineCode>capabilities_triage</InlineCode></span>
              <span>7c. <InlineCode>capabilities_routing</InlineCode></span>
              <span>7d. <InlineCode>capabilities_federation</InlineCode></span>
              <span>7e. <InlineCode>capabilities_marketplace</InlineCode></span>
              <span>8. <InlineCode>setup</InlineCode></span>
              <span>9. <InlineCode>federation</InlineCode></span>
              <span>10. <InlineCode>triage</InlineCode></span>
              <span>11. <InlineCode>marketplace</InlineCode></span>
              <span>12. <InlineCode>queue</InlineCode></span>
              <span>13. <InlineCode>now</InlineCode></span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">★ = always loaded</p>
          </div>

          <h4 className="text-base font-bold text-white mb-2">Setup Layer</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            <InlineCode>buildSetupLayer_conditional()</InlineCode> has two paths: <strong className="text-white">complete</strong> (returns
            a ~200-token status line + nav reference) and <strong className="text-white">incomplete</strong> (returns widget→task mappings
            so Divi can guide setup). Widget syntax and Linked Kards docs are now in <InlineCode>capabilities_core</InlineCode>, not setup.
            Legacy onboarding phases 0-5 have been removed entirely — project-based onboarding is the only path.
          </p>

          <h4 className="text-base font-bold text-white mb-2">File</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            <InlineCode>src/lib/system-prompt.ts</InlineCode> — single file, ~1,200 lines. The admin route at <InlineCode>/api/admin/system-prompt</InlineCode> renders
            the full prompt for inspection.
          </p>
        </Section>

        {/* ── Project-Based Onboarding ────────────────────────── */}
        <Section id="onboarding-v2" title="Project-Based Onboarding (v2)">
          <p className="text-[var(--text-secondary)] mb-4">
            Onboarding in DiviDen is not a wizard — it&apos;s a project. The old 6-phase system is replaced
            by a real kanban project with checklist tasks that show up in the Now Panel and can be discussed with Divi.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Flow</h4>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li><strong className="text-white">Welcome modal</strong> — Two-step: intro screen → API key entry (Anthropic/OpenAI selector). Component: <InlineCode>OnboardingWelcome.tsx</InlineCode></li>
            <li><strong className="text-white"><InlineCode>POST /api/onboarding/intro</InlineCode></strong> — Creates project + 1 kanban card (&quot;DiviDen Setup&quot;) + 6 checklist items + chat messages, all in a <InlineCode>$transaction</InlineCode> with parallelized reads</li>
            <li><strong className="text-white">Choice</strong> — &quot;Walk me through it&quot; (due today) or &quot;I&apos;ll handle it myself&quot; (due in 1 week)</li>
            <li><strong className="text-white"><InlineCode>POST /api/onboarding/setup-project</InlineCode></strong> — Updates due dates on checklist items, returns <InlineCode>firstTaskText</InlineCode> for auto-discussion</li>
            <li><strong className="text-white">Auto-discuss</strong> — First task discussion auto-sent to chat via <InlineCode>__AUTOSEND__</InlineCode> prefix</li>
          </ol>

          <h4 className="text-base font-bold text-white mb-2">Setup Checklist Items</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <ol className="list-decimal list-inside text-[var(--text-secondary)] space-y-1 text-sm">
              <li>Configure Working Style</li>
              <li>Set Triage Preferences</li>
              <li>Connect Email &amp; Calendar</li>
              <li>Review Connected Signals</li>
              <li>Custom Signals (optional)</li>
              <li>Run First Catch-Up</li>
            </ol>
          </div>
          <p className="text-[var(--text-secondary)] mb-4">
            All items have <InlineCode>assigneeType=&apos;self&apos;</InlineCode> and appear naturally in the Now Panel via the NOW engine.
            Setup tasks are visible to Divi through the normal kanban context (Group 2) — no special onboarding block needed.
          </p>

          <h4 className="text-base font-bold text-white mb-2">API Key Gate</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The dashboard checks <InlineCode>apiKeys.some(k =&gt; k.isActive)</InlineCode>. No active key → shows
            <InlineCode>OnboardingWelcome</InlineCode> at step 2, regardless of onboarding phase. Accepts <InlineCode>initialStep</InlineCode> prop.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Legacy Compatibility</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The <InlineCode>onboardingPhase</InlineCode> DB field still exists but is <strong className="text-white">no longer read by the system prompt</strong>.
            Legacy onboarding phases 0-5 have been removed from <InlineCode>system-prompt.ts</InlineCode> entirely.
            New users get phase set to 6 immediately after <InlineCode>/api/onboarding/intro</InlineCode>.
            The <InlineCode>/api/onboarding/advance</InlineCode> endpoint still works for settings-save flows but is not used for phase progression.
          </p>
        </Section>

        {/* ── Cockpit Mode & Work Partner ────────────────────── */}
        <Section id="cockpit-mode" title="Cockpit Mode &amp; Work Partner Behavior">
          <p className="text-[var(--text-secondary)] mb-4">
            In cockpit mode, Divi behaves as a <strong className="text-white">work partner</strong> — proactively working through
            the operator&apos;s task list instead of passively waiting for instructions.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Behavior Loop</h4>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>System prompt includes operator&apos;s incomplete checklist tasks (ranked by NOW engine)</li>
            <li>Divi picks the highest-priority item and opens discussion</li>
            <li>Helps the operator execute — may fire capabilities directly (email, calendar) for low-risk actions</li>
            <li>Marks the task complete via <InlineCode>[[complete_checklist:&#123;&quot;id&quot;:&quot;...&quot;&#125;]]</InlineCode></li>
            <li>Suggests follow-on tasks or creates them via <InlineCode>[[create_checklist:&#123;...&#125;]]</InlineCode></li>
            <li>Moves to the next priority</li>
          </ol>

          <h4 className="text-base font-bold text-white mb-2">System Prompt Integration</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The batch fetch in <InlineCode>buildSystemPrompt()</InlineCode> now queries <InlineCode>checklistItems</InlineCode> with
            <InlineCode>assigneeType=&apos;self&apos;</InlineCode> and <InlineCode>completed: false</InlineCode>.
            These are injected as <InlineCode>myChecklistTasks</InlineCode> in the Active State (Group 2), giving Divi
            visibility into the operator&apos;s to-do list with due dates and parent card context.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Three Assignment Types</h4>
          <div className="space-y-2 mb-4">
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm"><InlineCode>&quot;self&quot;</InlineCode> — Operator does it. Shows in Now Panel.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm"><InlineCode>&quot;divi&quot;</InlineCode> — Agent handles via queue/capabilities.</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3">
              <p className="text-sm"><InlineCode>&quot;delegated&quot;</InlineCode> — Routed to another user&apos;s Divi via relay.</p>
            </div>
          </div>

          <h4 className="text-base font-bold text-white mb-2">Activity Logging</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Actions executed from chat are logged to the activity feed via <InlineCode>logActivity()</InlineCode> or
            direct <InlineCode>prisma.activityLog.create()</InlineCode>. Card-related actions now include a <InlineCode>cardId</InlineCode> column
            for card-scoped activity feeds (see <a href="#card-activity-feeds" className="text-brand-400 hover:underline">Card Activity Feeds</a>):
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-1 text-sm">
            <li><InlineCode>send_email</InlineCode> → logs <InlineCode>capability_executed</InlineCode></li>
            <li><InlineCode>create_calendar_event</InlineCode> → logs <InlineCode>capability_executed</InlineCode></li>
            <li><InlineCode>complete_checklist</InlineCode> → logs <InlineCode>task_completed</InlineCode> with card title + <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>card_created / card_updated / card_deleted / card_moved</InlineCode> → logged with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>task_routed / task_decomposed</InlineCode> → logged with <InlineCode>cardId</InlineCode> when card context exists</li>
            <li><InlineCode>card_auto_completed</InlineCode> → logged with <InlineCode>cardId</InlineCode> when all checklist items complete</li>
          </ul>
        </Section>

        {/* ── Auto-Discuss / Auto-Complete Patterns ─────────── */}
        <Section id="auto-patterns" title="Auto-Discuss &amp; Auto-Complete Patterns">
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen uses several automation patterns to reduce friction. These patterns are reusable beyond onboarding.
          </p>

          <h4 className="text-base font-bold text-white mb-2">__AUTOSEND__ Prefix</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            When <InlineCode>chatPrefill</InlineCode> starts with the string <InlineCode>__AUTOSEND__</InlineCode>,
            <InlineCode>ChatView</InlineCode> automatically sends the message instead of just filling the input field.
            Used for initiating contextual conversations programmatically.
          </p>
          <Code>{`// In dashboard/page.tsx
setChatPrefill('__AUTOSEND__Let\\'s discuss: ' + firstTaskText);

// In ChatView.tsx — uses pendingAutoSend ref pattern
const pendingAutoSend = useRef<string | null>(null);

useEffect(() => {
  if (chatPrefill?.startsWith('__AUTOSEND__')) {
    pendingAutoSend.current = chatPrefill.replace('__AUTOSEND__', '');
  }
}, [chatPrefill]);

// After messages load, check and fire
useEffect(() => {
  if (pendingAutoSend.current && messages.length > 0) {
    sendMessage(pendingAutoSend.current);
    pendingAutoSend.current = null;
  }
}, [messages]);`}</Code>

          <h4 className="text-base font-bold text-white mt-6 mb-2">Auto-Complete on Settings Save</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The <InlineCode>/api/onboarding/advance</InlineCode> endpoint matches saved settings to setup checklist items
            and marks them complete automatically. For example, saving &quot;Working Style&quot; settings auto-completes
            the &quot;Configure Working Style&quot; checklist item. Pattern: keyword match against
            checklist <InlineCode>text</InlineCode> field on the user&apos;s setup card.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Auto-Install Capabilities on Google Connect</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The Google OAuth callback (<InlineCode>/api/auth/callback/google-connect</InlineCode>) silently upserts
            <InlineCode>AgentCapability</InlineCode> records for &apos;email&apos; (Outbound Email) and &apos;meetings&apos; (Meeting Scheduling)
            with default rules. Also auto-completes the &quot;Connect Email &amp; Calendar&quot; setup task if it exists.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Interactive Settings Widgets</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            The <InlineCode>show_settings_widget</InlineCode> action tag renders interactive settings controls directly
            in chat messages. Available groups:
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-3 mb-4">
            <p className="text-sm font-mono text-[var(--text-secondary)]">
              <InlineCode>working_style</InlineCode> | <InlineCode>triage</InlineCode> | <InlineCode>goals</InlineCode> | <InlineCode>identity</InlineCode> | <InlineCode>all</InlineCode>
            </p>
          </div>
          <p className="text-[var(--text-secondary)] mb-4">
            Widget definitions live in <InlineCode>src/lib/onboarding-phases.ts</InlineCode> → <InlineCode>getSettingsWidgets()</InlineCode>.
            Rendered by <InlineCode>AgentWidget.tsx</InlineCode> when <InlineCode>isSettingsWidget</InlineCode> metadata is present on a message.
          </p>
        </Section>

        {/* ── NOW Engine Correlation ─────────────────────────── */}
        <Section id="now-engine" title="NOW Engine: Priority Scoring &amp; Calendar Correlation">
          <p className="text-[var(--text-secondary)] mb-4">
            The NOW engine (<InlineCode>src/lib/now-engine.ts</InlineCode>) produces the operator&apos;s priority stack using
            deterministic scoring — no LLM. Sources: active kanban cards (assignee=&apos;human&apos;), checklist items
            (assigneeType=&apos;self&apos;), calendar events, goals with deadlines, and relay responses. Queue items are
            <strong className="text-white"> excluded</strong> — they belong to Divi. Calendar events within 60 minutes
            boost related items by +25 score.
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

        {/* ── Realtime Event System ────────────────────────────── */}
        <Section id="realtime-events" title="Realtime Event System" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            Dashboard panels refresh instantly via lightweight custom DOM events on <InlineCode>window</InlineCode>. No WebSockets or SSE —
            just <InlineCode>window.dispatchEvent(new Event(name))</InlineCode> from <InlineCode>ChatView.tsx</InlineCode> when actions complete.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Event Catalog</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Listeners</th>
                  <th className="pb-2">Dispatched After</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4"><InlineCode>dividen:now-refresh</InlineCode></td>
                  <td className="py-2 pr-4">NowPanel, KanbanView, QueuePanel, CommsTab, dashboard/page</td>
                  <td className="py-2">Settings save, chat completion, setup next/skip, any board/queue mutation</td>
                </tr>
                <tr className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4"><InlineCode>dividen:board-refresh</InlineCode></td>
                  <td className="py-2 pr-4">KanbanView</td>
                  <td className="py-2">Card create/move/delete via chat</td>
                </tr>
                <tr className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4"><InlineCode>dividen:queue-refresh</InlineCode></td>
                  <td className="py-2 pr-4">QueuePanel</td>
                  <td className="py-2">Queue dispatch/mutation via chat</td>
                </tr>
                <tr className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4"><InlineCode>dividen:comms-refresh</InlineCode></td>
                  <td className="py-2 pr-4">CommsTab</td>
                  <td className="py-2">Relay/comms actions via chat</td>
                </tr>
                <tr className="border-t border-white/[0.04]">
                  <td className="py-2 pr-4"><InlineCode>dividen:activity-refresh</InlineCode></td>
                  <td className="py-2 pr-4">ActivityStream</td>
                  <td className="py-2">Any action that also dispatches <InlineCode>now-refresh</InlineCode></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-base font-bold text-white mb-2">Adding a New Event</h4>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Define a name: <InlineCode>dividen:your-panel-refresh</InlineCode></li>
            <li>Dispatch from <InlineCode>ChatView.tsx</InlineCode> at the relevant action point: <InlineCode>window.dispatchEvent(new Event(&apos;dividen:your-panel-refresh&apos;))</InlineCode></li>
            <li>Listen in your panel&apos;s <InlineCode>useEffect</InlineCode>: add/remove listener, trigger re-fetch on event</li>
          </ol>
          <p className="text-[var(--text-secondary)] mb-4">
            The NOW panel also polls every <strong className="text-white">60 seconds</strong> as a backstop. Other panels rely on events only.
          </p>
        </Section>

        {/* ── Catch-Up Briefing ──────────────────────────────────── */}
        <Section id="catch-up" title="Catch-Up Briefing" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            The catch-up briefing is Divi&apos;s phased status report. It runs when the user triggers the <InlineCode>catch_up</InlineCode> action tag
            (e.g., from onboarding or manually). The prompt is defined in <InlineCode>getCatchUpPrompt()</InlineCode> in <InlineCode>src/lib/signals.ts</InlineCode>.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Architecture</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            <InlineCode>catch_up</InlineCode> is <strong className="text-white">not</strong> a server-side action tag in <InlineCode>ALLOWED_TAGS</InlineCode> — it&apos;s
            handled entirely client-side in <InlineCode>ChatView.tsx</InlineCode>:
          </p>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] mb-4 space-y-2">
            <li>Show &quot;Syncing your data...&quot; assistant message</li>
            <li>Fire <InlineCode>sync_signal</InlineCode> via <InlineCode>POST /api/chat/execute-tag</InlineCode> in background (pulls fresh Google data)</li>
            <li>Wait 1.5s for data freshness</li>
            <li>Send the full catch-up prompt to the LLM via <InlineCode>sendMessage()</InlineCode></li>
          </ol>
          <p className="text-[var(--text-secondary)] mb-4">
            The LLM has all required data in its system prompt context: board state (Group 2), queue items (Group 2), unread emails (Group 6),
            calendar events. The catch-up prompt instructs a four-phase briefing:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-1">
            <li><strong className="text-white">Phase 1:</strong> Board &amp; Queue Progress</li>
            <li><strong className="text-white">Phase 2:</strong> Inbox Triage</li>
            <li><strong className="text-white">Phase 3:</strong> Calendar &amp; Signals</li>
            <li><strong className="text-white">Phase 4:</strong> Recommended Focus</li>
          </ul>

          <h4 className="text-base font-bold text-white mb-2">Quality Tuning</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            To improve catch-up quality, edit <InlineCode>getCatchUpPrompt()</InlineCode> in <InlineCode>src/lib/signals.ts</InlineCode>.
            The prompt is the single source of truth — the LLM&apos;s briefing quality is entirely a function of how well
            the prompt shapes the system-prompt data into a narrative.
          </p>
        </Section>

        {/* ── Activity Feed API ──────────────────────────────────── */}
        <Section id="activity-api" title="Activity Feed API" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            The global activity stream at <InlineCode>GET /api/activity</InlineCode> supports filtering by category.
            The UI renders a dropdown checkbox filter with 10 categories.
          </p>

          <Endpoint method="GET" path="/api/activity" description="User-scoped activity feed. Supports ?category=board or ?categories=board,queue,sync (comma-separated multi-filter)." auth="Session" />

          <h4 className="text-base font-bold text-white mt-6 mb-2">Categories</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">queue</td><td className="py-1.5 text-xs">queue_added, queue_updated, queue_status_changed, queue_deleted, queue_dispatched, task_dispatched</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">board</td><td className="py-1.5 text-xs">card_created, card_updated, card_moved, card_deleted, checklist_completed, checklist_unchecked</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">crm</td><td className="py-1.5 text-xs">contact_added, contact_updated, contact_deleted</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">calendar</td><td className="py-1.5 text-xs">event_created, event_updated, event_deleted</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">goals</td><td className="py-1.5 text-xs">goal_created, goal_updated, goal_deleted</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">comms</td><td className="py-1.5 text-xs">comms_replied, comms_created, relay_sent, relay_responded, relay_broadcast</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">connections</td><td className="py-1.5 text-xs">connection_created, connection_accepted, connection_removed, google_connected</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">drive</td><td className="py-1.5 text-xs">document_created, recording_created, recording_processed</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">settings</td><td className="py-1.5 text-xs">settings_updated, onboarding_progress, onboarding_completed, setup_action</td></tr>
                <tr className="border-t border-white/[0.04]"><td className="py-1.5 pr-4 font-mono text-xs">sync</td><td className="py-1.5 text-xs">sync_completed</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-base font-bold text-white mb-2">Logging Activity</h4>
          <p className="text-[var(--text-secondary)] mb-4">
            Use <InlineCode>logActivity()</InlineCode> from <InlineCode>src/lib/activity.ts</InlineCode> (or direct <InlineCode>prisma.activityLog.create()</InlineCode>).
            Include <InlineCode>action</InlineCode> (must match a category mapping above), <InlineCode>userId</InlineCode>, and optional <InlineCode>metadata</InlineCode> JSON.
            For card-related actions, include <InlineCode>cardId</InlineCode> for card-scoped feeds.
          </p>
        </Section>

        {/* ── Cortex Daemon (Scheduled Scan) ────────────────────── */}
        <Section id="cortex-daemon" title="Cortex Daemon (Scheduled Scan)">
          <p className="text-[var(--text-secondary)] mb-4">
            The Board Cortex Daemon is a background scheduled task that runs every 6 hours, scanning all active users&apos; boards for insights.
          </p>
          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">Endpoint</h4>
          <Code>{`POST /api/cron/cortex-scan

# Headers
Authorization: Bearer <ADMIN_PASSWORD>
# OR
x-cron-secret: <ADMIN_PASSWORD>

# Optional query params
?userId=<id>  # Scan a single user (for testing)

# Response
{
  "success": true,
  "scanned": 5,
  "results": [
    {
      "userId": "...",
      "userName": "Jon",
      "cardCount": 12,
      "insightsFound": 3,
      "details": { "stale": 1, "duplicate": 0, "escalated": 2, ... }
    }
  ]
}`}</Code>
          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">What It Does Per User</h4>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
            <li>Runs <InlineCode>runBoardScan()</InlineCode> — all 6 detection functions (stale, duplicate, deadline, archivable, escalation, correlation)</li>
            <li>Auto-escalates deadline-approaching cards</li>
            <li>Persists <InlineCode>BoardInsight</InlineCode> records</li>
            <li>Logs activity entries for notable findings</li>
          </ul>
          <p className="text-[var(--text-muted)] mt-3 text-sm">
            Each DiviDen instance runs its own daemon — no centralized dependency. The daemon is scheduled via background task infrastructure and authenticates with the admin password.
          </p>
        </Section>

        {/* ── Linked Kards (Cross-User) ─────────────────────────── */}
        <Section id="linked-kards" title="Linked Kards v2 (Cross-User Visibility)">
          <p className="text-[var(--text-secondary)] mb-4">
            When a relay creates work on another user&apos;s board, both cards link together automatically. Both users&apos; Divis see the linked card&apos;s status/progress, and status changes propagate back to the originator via update relays.
          </p>
          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">v2 Architecture</h4>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)] mb-4">
            <li><strong>Auto-linking</strong>: Cards created after inbound relays with <InlineCode>assign_task</InlineCode> intent are automatically linked — no LLM action required</li>
            <li><strong>Delegation provenance</strong>: Cards stamped with <InlineCode>originCardId</InlineCode>, <InlineCode>originUserId</InlineCode>, <InlineCode>sourceRelayId</InlineCode></li>
            <li><strong>Status propagation</strong>: When a linked card changes status, cached status updates on CardLink + update relay sent to originator</li>
            <li><strong>Relay→Card FK</strong>: <InlineCode>AgentRelay.cardId</InlineCode> directly references the source card (no JSON parsing needed)</li>
          </ul>
          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">Schema</h4>
          <Code>{`model KanbanCard {
  ...
  originCardId    String?    // Card on SENDER's board
  originUserId    String?    // User who delegated to us
  sourceRelayId   String?    // Relay that delivered work
}

model CardLink {
  ...
  linkedStatus      String?    // Cached status (synced on change)
  linkedPriority    String?    // Cached priority
  lastSyncedAt      DateTime?  // Last sync timestamp
  externalCardId    String?    // Cross-instance (FVP)
  externalInstanceUrl String?  // Remote instance URL
}

model AgentRelay {
  ...
  cardId            String?    // Direct FK to source card
}`}</Code>
          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Action Tags</h4>
          <Code>{`# Card creation auto-links from recent relay context (v2 default)
[[create_card:{"title":"Research Report"}]]

# Manual override with explicit source (still works)
[[create_card:{"title":"...","linkedFromCardId":"<source_card_id>"}]]

# Explicitly link two existing cards
[[link_cards:{"fromCardId":"...","toCardId":"...","linkType":"collaboration"}]]`}</Code>
          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Status Accumulation Flow (Accumulate, Don&apos;t Ping)</h4>
          <Code>{`1. Sarah moves card to "completed"
2. propagateCardStatusChange() fires SILENTLY:
   a. Updates CardLink.linkedStatus cache
   b. Appends {"field":"status","from":"active","to":"completed"} to changeLog
   c. NO relay sent — no pinging Jon's Divi
3. Jon starts a conversation → system prompt builds
   a. getUnseenLinkedCardChanges() reads accumulated changeLog
   b. Injects "🔗 Linked Card Updates" section into Group 2
   c. markLinkedCardChangesSeen() clears the log (fire-and-forget)
4. Jon's Divi surfaces updates naturally in conversation`}</Code>
          <p className="text-[var(--text-secondary)] mt-2 mb-2 text-sm">
            Updates accumulate silently in <InlineCode>CardLink.changeLog</InlineCode> (JSON array, capped at 20 entries). They&apos;re delivered as a digest when the user starts a conversation — not as constant relay pings. The log is cleared after delivery via <InlineCode>markLinkedCardChangesSeen()</InlineCode>.
          </p>
          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">System Prompt Context</h4>
          <Code>{`[cardId] "My Card" (high) ⬅️delegated-from:Jon 🔗→delegation:"Their Task" (active) by Sarah ✓2/5`}</Code>
        </Section>

        {/* ── Card Activity Feeds ──────────────────────────────── */}
        <Section id="card-activity-feeds" title="Card Activity Feeds (Card-Scoped + Cross-User)">
          <p className="text-[var(--text-secondary)] mb-4">
            Every kanban card has its own activity timeline. Card-related actions write <InlineCode>cardId</InlineCode> as a first-class column on <InlineCode>ActivityLog</InlineCode>.
            When a card has linked cards (via <a href="#linked-kards" className="text-brand-400 hover:underline">Linked Kards</a>), activity automatically mirrors to linked cards owned by other users.
          </p>

          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">Schema</h4>
          <Code>{`model ActivityLog {
  ...
  cardId       String?    // FK to KanbanCard — card-scoped feed
  isCrossUser  Boolean    @default(false) // true for mirrored cross-user entries
  card         KanbanCard? @relation(...)
  @@index([cardId, createdAt]) // composite index for fast card queries
}`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Cross-User Mirroring</h4>
          <Code>{`1. logActivity() called with cardId (e.g. task_completed on Sarah's card)
2. mirrorActivityToLinkedCards() fires (fire-and-forget):
   a. Finds all CardLink records for cardId
   b. For each linked card owned by a DIFFERENT user:
      - Creates mirror ActivityLog with isCrossUser: true
      - Prefixes summary with "🔗"
      - Sets actor to the acting user's name
3. Jon opens his linked card → Activity section shows:
   "🔗 Sarah: Completed task 'Research Report'"  (isCrossUser: true)
   alongside his own card activity`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">API Endpoint</h4>
          <Endpoint method="GET" path="/api/kanban/[id]/activity" description="Card-scoped activity feed. Returns own + cross-user entries ordered by createdAt desc." auth="Session" />
          <div className="mt-2 text-sm text-[var(--text-secondary)]">
            <p><strong>Query params:</strong> <InlineCode>limit</InlineCode> (default 50, max 100), <InlineCode>cursor</InlineCode> (entry ID for pagination)</p>
            <p className="mt-1"><strong>Response:</strong></p>
          </div>
          <Code>{`{
  "success": true,
  "data": [
    {
      "id": "...",
      "action": "task_completed",
      "actor": "divi",
      "summary": "Completed task: \\"Research Report\\"",
      "isCrossUser": false,
      "createdAt": "2026-04-14T..."
    },
    {
      "id": "...",
      "action": "task_completed",
      "actor": "Sarah",
      "summary": "🔗 Sarah: Completed task \\"Data Analysis\\"",
      "isCrossUser": true,
      "createdAt": "2026-04-14T..."
    }
  ],
  "nextCursor": "..." // null when no more entries
}`}</Code>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Wired Call Sites</h4>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)] text-sm">
            <li><InlineCode>POST /api/kanban</InlineCode> → <InlineCode>card_created</InlineCode> with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>PATCH /api/kanban/[id]</InlineCode> → <InlineCode>card_updated</InlineCode> with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>DELETE /api/kanban/[id]</InlineCode> → <InlineCode>card_deleted</InlineCode> with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>POST /api/kanban/[id]/move</InlineCode> → <InlineCode>card_moved</InlineCode> with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>action-tags.ts</InlineCode> → <InlineCode>task_completed</InlineCode>, <InlineCode>task_routed</InlineCode>, <InlineCode>task_decomposed</InlineCode> with <InlineCode>cardId</InlineCode></li>
            <li><InlineCode>card-auto-complete.ts</InlineCode> → <InlineCode>card_auto_completed</InlineCode> with <InlineCode>cardId</InlineCode></li>
          </ul>

          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">UI (CardDetailModal)</h4>
          <p className="text-[var(--text-secondary)] text-sm">
            Collapsible <strong>Activity</strong> section in the card detail modal. Lazy-loads on expand.
            Own entries show 👤/🤖 icons on neutral backgrounds. Cross-user entries (<InlineCode>isCrossUser: true</InlineCode>) show 🔗 on a brand-tinted background.
            Relative timestamps. The global activity feed (<InlineCode>/api/activity</InlineCode> and SSE stream) remains user-scoped — no cross-user bleed.
          </p>
        </Section>

        {/* ── Google Connect Widget ──────────────────────────────── */}
        <Section id="google-connect-widget" title="Google Connect Widget">
          <p className="text-[var(--text-secondary)] mb-4">
            Interactive Google Connect button that can be rendered in chat anytime — not just during onboarding.
          </p>
          <h4 className="text-md font-semibold mb-2 text-[var(--text-primary)]">Action Tag</h4>
          <Code>{`# Connect user's own Gmail/Calendar
[[show_google_connect:{"identity":"operator"}]]

# Connect Divi's separate account
[[show_google_connect:{"identity":"agent","label":"🤖 Connect Divi's Gmail"}]]

# Custom label and description
[[show_google_connect:{
  "identity":"operator",
  "label":"🔗 Connect Email",
  "description":"Let Divi read your inbox to auto-triage."
}]]`}</Code>
          <h4 className="text-md font-semibold mb-2 mt-4 text-[var(--text-primary)]">Behavior</h4>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
            <li>Checks if already connected — shows connected state with email address if so</li>
            <li>Renders as an interactive button in the chat message (reuses onboarding widget renderer)</li>
            <li>Clicking redirects to <InlineCode>/api/auth/google-connect</InlineCode> OAuth flow</li>
            <li>Works both during onboarding and in regular conversation</li>
            <li>Maps to the &quot;Connect Email &amp; Calendar&quot; setup checklist task</li>
          </ul>
        </Section>

        {/* ── Widget Library ─────────────────────────────────── */}
        <Section id="widget-library" title="Widget Library (v1.9.2)" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            DiviDen ships a theme-agnostic widget library at <InlineCode>src/components/widgets/</InlineCode>.
            Every widget renders using CSS custom properties — override the variables, the entire set follows.
            No class-name hunting, no brand coupling.
          </p>

          <h4 className="text-base font-bold text-white mb-2">Available Primitives</h4>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[var(--text-muted)] border-b border-white/[0.06]">
                <th className="pb-2 pr-4">Component</th><th className="pb-2 pr-4">Purpose</th><th className="pb-2">Key Props</th>
              </tr></thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetSlider</td><td className="py-2 pr-4">Range input (autonomy, priorities)</td><td className="py-2">value, onChange, min, max, step, labels</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetToggle</td><td className="py-2 pr-4">Boolean toggle</td><td className="py-2">checked, onChange, label</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetRadio</td><td className="py-2 pr-4">Radio group (single select)</td><td className="py-2">options, value, onChange</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetSelect</td><td className="py-2 pr-4">Dropdown</td><td className="py-2">options, value, onChange</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetTextInput</td><td className="py-2 pr-4">Text input</td><td className="py-2">value, onChange, placeholder</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetInfo</td><td className="py-2 pr-4">Read-only display</td><td className="py-2">label, value</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetGoogleConnect</td><td className="py-2 pr-4">Google OAuth button</td><td className="py-2">identity, onConnect</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetWebhookSetup</td><td className="py-2 pr-4">Webhook creation flow</td><td className="py-2">onComplete</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetSubmitButton</td><td className="py-2 pr-4">Primary action</td><td className="py-2">onClick, label, loading</td></tr>
                <tr className="border-b border-white/[0.04]"><td className="py-2 pr-4 font-mono text-brand-400">WidgetSkipButton</td><td className="py-2 pr-4">Skip/dismiss</td><td className="py-2">onClick, label</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-brand-400">AgentWidget</td><td className="py-2 pr-4">Agent cards/lists (Bubble Store, A2A)</td><td className="py-2">payload, onAction</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-base font-bold text-white mb-2">CSS Custom Properties</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            All theming flows through 18 CSS variables defined in <InlineCode>widget-theme.css</InlineCode>.
            Override these on any parent container to re-theme the entire widget set.
          </p>
          <Code>{`--widget-bg: var(--bg-surface);
--widget-bg-hover: var(--bg-hover);
--widget-accent: var(--brand-primary);
--widget-accent-text: #ffffff;
--widget-text: var(--text-primary);
--widget-text-secondary: var(--text-secondary);
--widget-text-muted: var(--text-muted);
--widget-border: var(--border-color);
--widget-track: rgba(255, 255, 255, 0.1);`}</Code>

          <h4 className="text-base font-bold text-white mb-2 mt-6">Comms → Widget Pipeline</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            Remote agents can send interactive widgets as part of A2A tasks.
            The pipeline flows: <InlineCode>tasks/send</InlineCode> → relay payload → queue item metadata → UI rendering → <InlineCode>/api/relays/widget-response</InlineCode>.
          </p>
          <ol className="list-decimal list-inside text-[var(--text-secondary)] text-sm space-y-2 mb-4">
            <li>A2A <InlineCode>tasks/send</InlineCode> accepts <InlineCode>metadata.widgets</InlineCode> — an array of <InlineCode>AgentWidgetData</InlineCode> objects</li>
            <li>Relay payload carries widget definitions. If linked to a queue item, widgets propagate to the queue item&apos;s <InlineCode>metadata</InlineCode></li>
            <li>QueuePanel and Comms detail page render widgets inline via <InlineCode>AgentWidgetContainer</InlineCode></li>
            <li>Widget actions POST to <InlineCode>/api/relays/widget-response</InlineCode> with <InlineCode>{'{'}relayId, widgetId, itemId, action, payload{'}'}</InlineCode></li>
            <li>Terminal actions (approve, decline, submit) auto-complete both relay and linked queue item</li>
            <li>If the relay payload contains a <InlineCode>widgetResponseUrl</InlineCode>, the response is forwarded there with <InlineCode>X-DiviDen-Event: widget_response</InlineCode></li>
          </ol>

          <h4 className="text-base font-bold text-white mb-2">AgentWidgetData Schema</h4>
          <Code>{`// Each widget in the array
interface AgentWidgetData {
  type: 'choice_card' | 'action_list' | 'info_card' | 'payment_prompt';
  title: string;
  subtitle?: string;
  items: WidgetItem[];   // Each item has: id, label, description?, actions[]
  layout?: 'horizontal' | 'vertical' | 'grid';
}

// Sending widgets via A2A tasks/send:
{
  "method": "tasks/send",
  "params": {
    "message": { "parts": [{ "type": "text", "text": "Approve budget" }] },
    "metadata": {
      "intent": "request_approval",
      "widgets": [{
        "widget_type": "choice_card",
        "title": "Budget Approval",
        "items": [
          { "id": "approve", "label": "Approve", "actions": [{ "action": "approve" }] },
          { "id": "decline", "label": "Decline", "actions": [{ "action": "decline" }] }
        ]
      }],
      "widgetResponseUrl": "https://your-instance/api/callback"
    }
  }
}`}</Code>
        </Section>

        {/* ── FVP Integration Notes ────────────────────────────── */}
        <Section id="fvp-integration" title="FVP Integration Notes (v2.7)" badge={<UpdatedBadge date="Apr 15" />}>
          <h4 className="text-base font-bold text-white mb-2">1. Linked Kards — Polling vs Webhooks</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            DiviDen does <strong className="text-white">not</strong> poll. Status changes propagate via the <InlineCode>propagateCardStatusChange()</InlineCode> function
            in <InlineCode>card-links.ts</InlineCode>, which silently updates the <InlineCode>CardLink</InlineCode> row
            (cached <InlineCode>linkedStatus</InlineCode>, <InlineCode>linkedPriority</InlineCode>, and a <InlineCode>changeLog</InlineCode> JSON array capped at 20 entries).
            The originator&apos;s Divi reads accumulated changes at conversation time via the system prompt — <strong className="text-white">accumulate, don&apos;t ping</strong>.
          </p>
          <p className="text-[var(--text-secondary)] mb-3">
            For <strong className="text-white">cross-instance</strong> Linked Kards (FVP ↔ DiviDen), the recommended pattern:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-3 space-y-1">
            <li>FVP exposes a <InlineCode>POST /api/webhooks/card-status</InlineCode> endpoint</li>
            <li>DiviDen calls it when a linked card&apos;s status/priority changes (fire-and-forget from <InlineCode>propagateCardStatusChange</InlineCode>)</li>
            <li>Payload: <InlineCode>{`{ cardId, externalCardId, newStatus, newPriority, changeLog }`}</InlineCode></li>
            <li>Reciprocally, FVP calls <InlineCode>POST /api/v2/federation/card-status</InlineCode> on DiviDen (to be added in v2.8)</li>
            <li>No polling interval needed — webhook-driven, event-sourced</li>
          </ul>

          <h4 className="text-base font-bold text-white mb-2 mt-6">2. Capability Sync — Why Capabilities Get Skipped</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            <InlineCode>POST /api/v2/federation/capabilities</InlineCode> requires <strong className="text-white">two preconditions</strong>:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-3 space-y-1">
            <li><InlineCode>platformLinked: true</InlineCode> AND <InlineCode>isActive: true</InlineCode> — instance must be fully registered and active</li>
            <li><InlineCode>marketplaceEnabled: true</InlineCode> — call <InlineCode>POST /api/v2/federation/marketplace-link</InlineCode> first to enable Bubble Store on the instance</li>
          </ul>
          <p className="text-[var(--text-secondary)] mb-3">
            If either condition fails, the response is <InlineCode>401</InlineCode> (inactive token) or <InlineCode>403</InlineCode> (Bubble Store not enabled).
            The <InlineCode>403</InlineCode> body includes the specific error message. FVP should check the response status and call <InlineCode>marketplace-link</InlineCode> if they get a 403 with the Bubble Store error.
          </p>

          <h4 className="text-base font-bold text-white mb-2 mt-6">3. BehaviorSignal Spec — Taxonomy</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            The <InlineCode>BehaviorSignal</InlineCode> model stores per-user interaction signals. Current action taxonomy:
          </p>
          <Code>{`// Core action types (action field)
"queue_complete"     // User completed a queue item
"queue_snooze"       // User snoozed a queue item
"email_discuss"      // User opened email discussion
"calendar_dismiss"   // User dismissed a calendar item
"chat_send"          // User sent a chat message
"draft_edit"         // User edited a draft
"capability_use"     // User invoked a Bubble Store capability
"relay_send"         // User sent a relay

// Schema
POST /api/behavior-signals
{
  action: string,        // One of the above (extensible — add new types freely)
  context?: object,      // Arbitrary JSON — item details, timing, metadata
  duration?: number       // ms — time spent before action (optional)
}

// Stored fields (auto-populated server-side)
dayOfWeek: 0-6         // 0=Sun..6=Sat
hourOfDay: 0-23        // Hour of day
createdAt: DateTime     // Auto timestamp

// Aggregation: GET /api/behavior-signals?days=30
// Returns: totalSignals, byAction counts, byHour, byDay, peakHour, peakDay`}</Code>
          <p className="text-[var(--text-secondary)] mb-3">
            FVP can emit any new action types — the taxonomy is open-ended. Convention: use <InlineCode>snake_case</InlineCode> verbs.
            For cross-instance signals, FVP should prefix with <InlineCode>fvp_</InlineCode> (e.g., <InlineCode>fvp_session_start</InlineCode>).
          </p>

          <h4 className="text-base font-bold text-white mb-2 mt-6">4. DOM Event Namespace</h4>
          <p className="text-[var(--text-secondary)] mb-3">
            DiviDen uses the <InlineCode>dividen:</InlineCode> prefix for all custom DOM events:
          </p>
          <ul className="list-disc list-inside text-[var(--text-secondary)] mb-3 space-y-1">
            <li><InlineCode>dividen:now-refresh</InlineCode> — universal trigger, all panels listen</li>
            <li><InlineCode>dividen:board-refresh</InlineCode> — kanban board re-fetch</li>
            <li><InlineCode>dividen:queue-refresh</InlineCode> — queue panel re-fetch</li>
            <li><InlineCode>dividen:comms-refresh</InlineCode> — comms tab re-fetch</li>
            <li><InlineCode>dividen:activity-refresh</InlineCode> — activity stream re-fetch</li>
          </ul>
          <p className="text-[var(--text-secondary)] mb-3">
            <strong className="text-white">FVP should:</strong> Keep <InlineCode>fvp:*</InlineCode> for their own internal events. When FVP widgets run embedded inside DiviDen,
            emit the corresponding <InlineCode>dividen:*</InlineCode> event alongside the <InlineCode>fvp:*</InlineCode> event so DiviDen panels stay in sync.
            Pattern:
          </p>
          <Code>{`// Inside an FVP widget running in DiviDen context
function emitStatusChange() {
  window.dispatchEvent(new Event('fvp:card-updated'));       // FVP internal
  window.dispatchEvent(new Event('dividen:board-refresh'));   // DiviDen sync
  window.dispatchEvent(new Event('dividen:activity-refresh'));
}`}</Code>
          <p className="text-[var(--text-secondary)] mb-3">
            Detect DiviDen context by checking <InlineCode>window.__DIVIDEN_HOST === true</InlineCode> (set by the dashboard shell).
            Only emit <InlineCode>dividen:*</InlineCode> events when running in that context.
          </p>
        </Section>

        {/* ── Username System (v2.0) ─────────────────────────── */}
        <Section id="username-system" title="Username System (v2.0)" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            Every DiviDen account now has a unique <InlineCode>@username</InlineCode> handle.
            Usernames are the identity primitive for @mentions, federation, and profile URLs.
          </p>

          <h3 className="text-lg font-bold text-white mb-3">Validation Rules</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-6">
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              <li>Length: 2–30 characters</li>
              <li>Characters: <InlineCode>[a-z0-9_.-]</InlineCode> (lowercase only)</li>
              <li>Reserved words blocked: admin, system, dividen, support, help, api, www, mail, etc.</li>
              <li>Uniqueness enforced at database level</li>
            </ul>
          </div>

          <h3 className="text-lg font-bold text-white mb-3">API Endpoints</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <Endpoint method="GET" path="/api/username/check?username=jon" description="Real-time availability check. Returns { available: boolean, username: string }" auth="None" />
            <Endpoint method="POST" path="/api/setup" description="Account creation (includes optional username field with server-side validation)" auth="None" />
            <Endpoint method="POST" path="/api/signup" description="User registration (includes optional username field with server-side validation)" auth="None" />
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            The setup page debounces username checks as the user types, showing real-time ✓/✗ status. The submit button is disabled while checking or if the username is taken.
          </p>
        </Section>

        {/* ── @Mentions & Resolution (v2.0) ────────────────────── */}
        <Section id="mentions-system" title="@Mentions & Username Resolution (v2.0)" badge={<UpdatedBadge date="Apr 16" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            All <InlineCode>@username</InlineCode> tokens rendered anywhere in DiviDen are clickable links
            that navigate to the mentioned user&apos;s profile page (<InlineCode>/profile/[userId]</InlineCode>).
            Team mentions (<InlineCode>@team-name</InlineCode>) render as purple chips linking to the team view.
          </p>

          <h3 className="text-lg font-bold text-white mb-3">Inline @Search (Chat Input)</h3>
          <p className="text-[var(--text-secondary)] mb-3 text-sm">
            Typing <InlineCode>@</InlineCode> in the chat input triggers a debounced search across three entity types in parallel:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[
              { surface: '👤 People', detail: 'Matched by name, username, and email via /api/chat/mentions?type=people' },
              { surface: '👥 Teams', detail: 'Matched by team name and description via /api/chat/mentions?type=teams (your teams only)' },
              { surface: '🤖 Agents', detail: 'Matched by agent name and slug via /api/chat/mentions?type=agents (installed only)' },
            ].map((s) => (
              <div key={s.surface} className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-3">
                <div className="text-sm font-bold text-white">{s.surface}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{s.detail}</div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold text-white mb-3">Where Mentions Render</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {[
              { surface: 'Chat Messages', detail: 'Message bodies — alongside bold/code formatting' },
              { surface: 'Queue Panel', detail: 'Task titles + descriptions (main list and review suggestions)' },
              { surface: 'Comms Tab', detail: 'Relay thread peer names and message subjects' },
              { surface: 'Notification Center', detail: 'Activity feed summaries' },
            ].map((s) => (
              <div key={s.surface} className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-3">
                <div className="text-sm font-bold text-white">{s.surface}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{s.detail}</div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold text-white mb-3">Resolution API</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <Endpoint method="GET" path="/api/users/resolve?usernames=jon,ops-team" description="Bulk username→profile resolution. Resolves users by username AND teams by kebab-cased name. Returns { [handle]: { id, name, username, avatar, type? } }. type='team' for teams." auth="None (public)" />
          </div>

          <h3 className="text-lg font-bold text-white mb-3">Implementation</h3>
          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            The shared <InlineCode>{'<MentionText text={...} />'}</InlineCode> component handles all rendering.
            It splits text on the <InlineCode>@[a-z0-9_.-]{'{2,30}'}</InlineCode> pattern, batch-resolves
            usernames via <InlineCode>/api/users/resolve</InlineCode> (module-level cache + 50ms coalescing window),
            and renders resolved mentions as styled <InlineCode>{'<Link>'}</InlineCode> chips. User mentions link
            to <InlineCode>/profile/[userId]</InlineCode>. Team mentions render as purple chips with a 👥 prefix
            linking to the team view. Unresolved handles render styled but not linked.
          </p>
        </Section>

        {/* ── Federation Mentions API (v2.0) ────────────────────── */}
        <Section id="federation-mentions" title="Federation Mentions API (v2.0)" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            Federated instances can query DiviDen&apos;s user directory to power @mention autocomplete on their side.
          </p>

          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <Endpoint method="GET" path="/api/federation/mentions?prefix=jo" description="Prefix-search users for @mention autocomplete. Returns up to 10 matches with { id, username, name, avatar }." auth="Federation Token" />
          </div>

          <h3 className="text-lg font-bold text-white mb-3">Federation Notification Relay</h3>
          <div className="bg-[var(--bg-surface)] rounded-lg border border-white/[0.06] p-4 mb-4">
            <Endpoint method="POST" path="/api/federation/notifications" description="Push typed notifications into DiviDen from a federated instance. 12 notification types supported." auth="Federation Token" />
          </div>

          <h3 className="text-lg font-bold text-white mb-3">Supported Notification Types</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {['task_assigned', 'mention', 'relay_received', 'approval_needed', 'deadline_approaching',
              'agent_update', 'team_invite', 'project_update', 'capability_alert', 'system_notice',
              'payment_received', 'goal_progress'].map(t => (
              <span key={t} className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-secondary)] text-[10px] font-mono">{t}</span>
            ))}
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            Full specification available in the <a href="/fvp-integration-guide.md" target="_blank" className="text-brand-400 hover:text-brand-300">FVP Integration Guide</a> (14 sections).
          </p>
        </Section>

        {/* ── Notification Center (v2.0) ─────────────────────────── */}
        <Section id="notification-center" title="Notification Center (v2.0)" badge={<UpdatedBadge date="Apr 15" />}>
          <p className="text-[var(--text-secondary)] mb-4">
            The notification feed received two major upgrades in v2.0: click-through navigation and category filtering.
          </p>

          <h3 className="text-lg font-bold text-white mb-3">Click-Through Navigation</h3>
          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            Every notification now routes to the relevant dashboard tab when clicked. Card activity → Kanban.
            Relay notifications → Comms. Queue items → Queue. The notification dispatches a custom
            <InlineCode>dividen:navigate-tab</InlineCode> DOM event with the target tab, which the dashboard layout
            picks up to switch context.
          </p>

          <h3 className="text-lg font-bold text-white mb-3">Category Filter Pills</h3>
          <p className="text-[var(--text-secondary)] mb-4 text-sm">
            Filter pills at the top of the feed let you narrow by category: All, Queue, Comms, Cards, System.
            Quick triage without scrolling through unrelated items.
          </p>

          <h3 className="text-lg font-bold text-white mb-3">Event System</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            The notification center integrates with the dashboard event bus. Key events:
            <InlineCode>dividen:navigate-tab</InlineCode> (click-through routing),
            <InlineCode>dividen:now-refresh</InlineCode> (data refresh trigger),
            <InlineCode>dividen:activity-refresh</InlineCode> (activity feed update).
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

        {/* Download */}
        <DocFooterDownload filename="dividen-developer-docs" lastUpdated="April 16, 2026" />

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-8 mt-8 text-center" data-no-download>
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