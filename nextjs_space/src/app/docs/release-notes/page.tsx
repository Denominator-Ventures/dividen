export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Release Notes',
  description: 'DiviDen release notes — Federation v2, multi-account Google sync, instance approval, admin expansion, and more.',
  openGraph: {
    title: 'DiviDen Release Notes',
    description: 'Federation v2, multi-account Google sync, instance approval, admin expansion, and more.',
    images: [{ url: '/api/og?title=Release+Notes&subtitle=Federation+v2+%2B+Multi-Account+Sync&tag=release', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen Release Notes',
    description: 'Federation v2, multi-account Google sync, instance approval, admin expansion, and more.',
    images: ['/api/og?title=Release+Notes&subtitle=Federation+v2+%2B+Multi-Account+Sync&tag=release'],
  },
};

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Back links */}
        <div className="mb-6 flex items-center gap-4">
          <a href="/documentation" className="text-brand-400 hover:text-brand-300 text-sm">← Documentation</a>
          <a href="/docs/developers" className="text-brand-400 hover:text-brand-300 text-sm">API Reference</a>
          <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 text-sm">Federation Docs</a>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 font-heading">📋 DiviDen — Release Notes</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl mt-2">
            Chronological release updates for the DiviDen Command Center. Latest releases first.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 12-13, 2026 RELEASE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl">
          <div className="flex flex-wrap gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 12–13, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">MCP Server: v1.5</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Agent Card: v0.4</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">A2A: v0.4</span>
            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">LATEST</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Federation v2, Multi-Account Sync, Admin Expansion</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">
            {/* Instance Approval */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔐 Instance Approval Process</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>New federated instances now register as <strong className="text-amber-400">pending_approval</strong> instead of auto-active</li>
                <li>Admin must explicitly approve each instance before it appears on the network</li>
                <li>Deactivating an instance <strong>cascade-suspends</strong> all its marketplace agents</li>
                <li>Re-activating restores suspended agents to active status</li>
                <li>Re-registration preserves existing approval status</li>
                <li>Registration response now includes <code className="code-inline">status</code> field and <code className="code-inline">endpoints.agentSync</code></li>
              </ul>
            </div>

            {/* Payment Validation */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">💰 Two-Tier Fee Model & Payment Validation</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>New <code className="code-inline">POST /api/v2/federation/validate-payment</code> endpoint</li>
                <li>Internal transactions: configurable via env vars, can be 0% for closed teams</li>
                <li>Network transactions: enforced minimum floor — 3% marketplace, 7% recruiting</li>
                <li>Fee calculators: <code className="code-inline">marketplace-config.ts</code> and <code className="code-inline">recruiting-config.ts</code></li>
              </ul>
            </div>

            {/* Multi-Account */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📊 Multi-Account Google Sync</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Calendar:</strong> Per-account filter checkboxes when &gt;1 Google accounts connected, color-coded dividers</li>
                <li><strong>Drive:</strong> Account tabs (All / Local / per-account), table + grid view toggle</li>
                <li><strong>File Viewer:</strong> Inline preview for Google Docs/Sheets/Slides, PDFs, and images within DiviDen</li>
                <li>New schema fields: <code className="code-inline">CalendarEvent.accountEmail</code>, <code className="code-inline">Document.accountEmail</code>, <code className="code-inline">Document.mimeType</code>, <code className="code-inline">Document.fileSize</code>, <code className="code-inline">Document.thumbnailUrl</code></li>
              </ul>
            </div>

            {/* MCP v1.5 */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔧 MCP v1.5 — 2 New Tools</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">marketplace_browse</code> — Search and filter marketplace agents by category, pricing, skills</li>
                <li><code className="code-inline">marketplace_unlock</code> — Unlock paid agents with developer-shared access passwords</li>
                <li>Agent card capabilities now include <code className="code-inline">marketplacePasswordAccess</code> and <code className="code-inline">persistentConversation</code></li>
              </ul>
            </div>

            {/* A2A v0.4 */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🤝 A2A v0.4 — Agent Card Updates</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>New capabilities: <code className="code-inline">marketplacePasswordAccess: true</code>, <code className="code-inline">persistentConversation: true</code></li>
                <li>Agent card now advertises MCP tool names array for capability negotiation</li>
                <li>Webhook events list exposed: <code className="code-inline">task_dispatched</code>, <code className="code-inline">new_message</code>, <code className="code-inline">wake</code>, <code className="code-inline">queue_changed</code>, <code className="code-inline">relay_state_changed</code></li>
              </ul>
            </div>

            {/* Connections */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔗 Connections Redesign</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>3 sub-tabs: &quot;🔍 Find People&quot; (default), &quot;🔗 My Connections&quot;, &quot;📡 Relays&quot;</li>
                <li>Federation hidden behind collapsible in Connect by Email — less confusing for new users</li>
                <li>Connection acceptance ceremony: modal with nickname, relationship type, trust level, notes</li>
                <li>Directory now includes federated discoverable instances with &quot;self-hosted&quot; badge</li>
              </ul>
            </div>

            {/* Jobs → Tasks */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📋 Jobs → Paying Tasks Reframe</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Renamed throughout: Job→Task, Hire→Assign, Worker→Contributor, Client→Poster</li>
                <li>Dual projects on acceptance: poster gets oversight board, contributor gets execution board</li>
                <li>Task breakdown field: becomes kanban cards on contributor&apos;s board</li>
                <li><code className="code-inline">propose_task</code> action tag: creates agent suggestions for human review before network posting</li>
                <li>Inner-circle-first routing: card contributors → team → connections → network (last resort)</li>
                <li>5-star default: everyone starts at 5.0⭐, real ratings don&apos;t factor until 5+ completions</li>
              </ul>
            </div>

            {/* Admin Expansion */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🛡️ Admin Dashboard Expansion</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>11 tabs (up from 6): Overview, Users, Content, Activity, Instances, Marketplace, Usage, System Prompt, Tasks, Federation, Telemetry</li>
                <li>New <code className="code-inline">TasksTab</code>: shows ALL tasks across users with filters/search</li>
                <li>New <code className="code-inline">UsageTab</code>: feature adoption heatmap, per-user engagement, daily trends</li>
                <li>New <code className="code-inline">SystemPromptTab</code>: read-only inspector with token estimates per group</li>
                <li>Pending instances show &quot;⏳ Pending Approval&quot; badge with pulsing amber dot</li>
              </ul>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚙️ Settings Reorganization</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>6 tabs (down from 8): Your Divi, General, Integrations, Network, Payments, Alerts</li>
                <li>Relay + Federation merged into &quot;Network&quot; tab</li>
                <li>Mobile-friendly: horizontally scrollable tab bar</li>
                <li>Default tab changed to &quot;Your Divi&quot;</li>
              </ul>
            </div>

            {/* Other */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📄 Other Changes</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Comprehensive <a href="/documentation" className="text-brand-400 hover:text-brand-300">developer documentation</a> at <code className="code-inline">/documentation</code></li>
                <li>Chat conversation continuity: 50-message context window, soft-clear with timestamps</li>
                <li>Profile view + photo upload to S3 with presigned URLs</li>
                <li>Marketplace agent access passwords for developer-shared free access</li>
                <li>Comms redesign: relay-based agent-to-agent communication log</li>
                <li>Google OAuth integration for Gmail, Calendar, Drive data sync</li>
                <li>Smart triage: task-first architecture with Levenshtein card matching</li>
                <li>Due date discipline: Divi infers deadlines from context with configurable defaults</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 11, 2026 RELEASE (original) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-10 opacity-80">
          <div className="flex flex-wrap gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">April 11, 2026</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">MCP Server: v1.4.0</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Agent Card: v0.3.0</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Agent Install/Uninstall</span>
          </div>
          <h2 className="text-xl font-bold mb-3 font-heading text-[var(--text-secondary)]">FVP Integration Brief + Agent Marketplace Build</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mb-6">
            14 FVP proposals, Agent Integration Kit, Install/Uninstall lifecycle, dynamic MCP tools, and marketplace coherence.
          </p>
        </div>

        {/* TOC */}
        <nav className="mb-10 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {[
              { id: 'schema', label: 'Database Schema Changes' },
              { id: 'libraries', label: 'New Library Files' },
              { id: 'routes', label: 'New API Routes' },
              { id: 'mcp', label: 'MCP Server Updates (v1.4.0)' },
              { id: 'agent-card', label: 'Agent Card Updates (v0.3.0)' },
              { id: 'system-prompt', label: 'System Prompt Changes' },
              { id: 'action-tags', label: 'Action Tags Updates' },
              { id: 'webhook', label: 'Webhook Push System' },
              { id: 'marketplace', label: 'Agent Marketplace System (NEW)' },
              { id: 'changelog', label: 'Changelog Entry' },
              { id: 'pwa', label: 'PWA / Layout Fixes' },
              { id: 'dx', label: 'Developer Experience (DX) Additions' },
              { id: 'mcp-registry', label: 'MCP Registry Submission Kit' },
              { id: 'files', label: 'Files Changed Summary' },
              { id: 'deploy', label: 'Deployment Checklist' },
              { id: 'future', label: 'What\'s NOT in This Build' },
            ].map((item) => (
              <li key={item.id}><a href={`#${item.id}`} className="text-brand-400 hover:text-brand-300">{item.label}</a></li>
            ))}
          </ol>
        </nav>

        {/* ═══════════════════════════════════════════════ */}
        {/* 1. DATABASE SCHEMA */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="schema" num={1} title="Database Schema Changes">
          <h3 className="text-lg font-semibold mb-3">New Migrations to Apply</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Four migrations since last push:</p>

          <CodeBlock title="Migration: 20260411_add_relay_threading_and_artifacts">{`-- FVP Brief Proposals #2 and #3: Relay Threading + Structured Artifacts
ALTER TABLE "agent_relays" ADD COLUMN "threadId" TEXT;
ALTER TABLE "agent_relays" ADD COLUMN "artifactType" TEXT;
ALTER TABLE "agent_relays" ADD COLUMN "artifacts" TEXT;
CREATE INDEX "agent_relays_threadId_idx" ON "agent_relays"("threadId");`}</CodeBlock>

          <CodeBlock title="Migration: 20260411_add_portable_reputation">{`-- FVP Brief Proposal #7: Portable Reputation
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "isFederated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "endorsements" TEXT;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "federatedScore" DOUBLE PRECISION NOT NULL DEFAULT 0;`}</CodeBlock>

          <CodeBlock title="Migration: 20260411_add_agent_integration_kit">{`-- Agent Integration Kit: 7 new fields on MarketplaceAgent
ALTER TABLE "marketplace_agents" ADD COLUMN "taskTypes" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "contextInstructions" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "requiredInputSchema" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "outputSchema" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "usageExamples" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "contextPreparation" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN "executionNotes" TEXT;`}</CodeBlock>

          <CodeBlock title="Migration: 20260411_add_agent_install_management">{`-- Agent Install/Uninstall lifecycle on MarketplaceSubscription
ALTER TABLE "marketplace_subscriptions" ADD COLUMN "installed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "marketplace_subscriptions" ADD COLUMN "installedAt" TIMESTAMP(3);
ALTER TABLE "marketplace_subscriptions" ADD COLUMN "uninstalledAt" TIMESTAMP(3);`}</CodeBlock>

          <h3 className="text-lg font-semibold mb-3 mt-6">Prisma Schema Updates</h3>

          <div className="space-y-4">
            <FieldGroup model="AgentRelay" fields={[
              { name: 'threadId String?', desc: 'Groups multi-turn relay conversations' },
              { name: 'artifactType String?', desc: 'One of: text, code, document, data, contact_card, calendar_invite, email_draft' },
              { name: 'artifacts String?', desc: 'JSON-encoded structured artifact payload' },
            ]} />
            <FieldGroup model="ReputationScore" fields={[
              { name: 'isFederated Boolean @default(false)', desc: 'Whether score includes cross-instance data' },
              { name: 'endorsements String?', desc: 'JSON array of HMAC-signed attestation objects' },
              { name: 'federatedScore Float @default(0)', desc: 'Weighted federation reputation score' },
            ]} />
            <FieldGroup model="MarketplaceAgent — Integration Kit" fields={[
              { name: 'taskTypes String?', desc: 'JSON array of task type strings this agent handles' },
              { name: 'contextInstructions String?', desc: 'How to prepare context before invoking this agent' },
              { name: 'requiredInputSchema String?', desc: 'JSON schema describing required input fields' },
              { name: 'outputSchema String?', desc: 'JSON schema describing output format' },
              { name: 'usageExamples String?', desc: 'JSON array of example invocations with expected results' },
              { name: 'contextPreparation String?', desc: 'Steps Divi should take before delegating to this agent' },
              { name: 'executionNotes String?', desc: 'Runtime notes — timeouts, retries, known limitations' },
            ]} />
            <FieldGroup model="MarketplaceSubscription — Install Lifecycle" fields={[
              { name: 'installed Boolean @default(false)', desc: 'Whether agent is actively installed in user memory' },
              { name: 'installedAt DateTime?', desc: 'Timestamp of last install' },
              { name: 'uninstalledAt DateTime?', desc: 'Timestamp of last uninstall' },
            ]} />
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 2. LIBRARIES */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="libraries" num={2} title="New Library Files">
          <h3 className="text-lg font-semibold mb-3">Core Libraries (confirm present)</h3>
          <Table headers={['File', 'Purpose']} rows={[
            ['entity-resolution.ts', 'Universal entity resolution across contacts, connections, cards, events, emails, relays, team members'],
            ['task-exchange.ts', 'Auto-propose tasks to best-matched connections by skill/capacity/reputation'],
            ['webhook-push.ts', 'Push relay state changes to connected instances via webhook'],
            ['relay-queue-bridge.ts', 'Bidirectional sync between relays and queue items'],
            ['ambient-learning.ts', 'Signal capture, pattern synthesis, ambient relay learning loop'],
            ['activity.ts', 'logActivity() — universal event logger, fire-and-forget'],
            ['now-engine.ts', 'Dynamic NOW scoring: priority, impact, deadline, calendar gaps, relay freshness'],
            ['brief-assembly.ts', 'Context brief assembly + skill matching + project context'],
            ['telemetry.ts', 'Request/error logging, client IP tracking'],
            ['job-matcher.ts', 'Job-to-profile matching engine'],
            ['queue-dedup.ts', 'Queue item deduplication'],
            ['queue-dispatch.ts', 'Chief of Staff auto-dispatch'],
            ['cos-sequential-dispatch.ts', 'Sequential task dispatch in CoS mode'],
          ]} />

          <h3 className="text-lg font-semibold mb-3 mt-8">Federation Intelligence Layer (FVP Tier 4)</h3>
          <Table headers={['File', 'Purpose', 'Key Exports']} rows={[
            ['federation/pattern-sharing.ts', 'Cross-instance ambient learning pattern exchange', 'exportShareablePatterns(), importSharedPatterns(), getNetworkLearningDigest()'],
            ['federation/graph-matching.ts', 'Serendipity engine — triadic closure, complementary expertise, structural bridges', 'buildLocalGraph(), findSerendipityMatches(), exportGraphTopology()'],
            ['federation/composite-prompts.ts', 'Network briefing aggregation from federated peers', 'generateLocalBriefingContribution(), compileNetworkBriefing()'],
            ['federation/task-routing.ts', '7-signal weighted scoring for network-level task routing', 'routeTask(), getRoutingIntelligenceDigest()'],
          ]} />

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h4 className="text-sm font-semibold text-brand-400 mb-2">Task Routing Scoring Weights</h4>
              <pre className="text-xs text-[var(--text-secondary)] font-mono">{`skill match:     30%
completion rate: 20%
capacity:        15%
trust:           10%
reputation:      10%
latency:          5%
domain proximity: 10%`}</pre>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h4 className="text-sm font-semibold text-brand-400 mb-2">Pattern Sharing Rules</h4>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                <li>• Only synthesized/aggregated patterns shared — never raw signals</li>
                <li>• 20% federation discount on remote pattern confidence</li>
                <li>• Weighted confidence merging when patterns overlap</li>
                <li>• Patterns anonymized before export</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 3. API ROUTES */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="routes" num={3} title="New API Routes">
          <h3 className="text-lg font-semibold mb-3">Federation Endpoints</h3>
          <Table headers={['Route', 'Methods', 'Auth', 'Purpose']} rows={[
            ['/api/federation/patterns', 'GET, POST', 'x-federation-token', 'Exchange anonymized ambient learning patterns'],
            ['/api/federation/briefing', 'GET, POST', 'Session / x-federation-token', 'Network briefing aggregation'],
            ['/api/federation/routing', 'GET, POST', 'Session / x-federation-token', 'Intelligent task routing with 7-signal scoring'],
            ['/api/federation/graph', 'GET, POST', 'Session / x-federation-token', 'Serendipity matches + graph topology export'],
            ['/api/federation/mcp', 'POST', 'x-federation-token', 'Cross-instance MCP tool invocation (trust-gated)'],
            ['/api/federation/entity-search', 'GET, POST', 'x-federation-token', 'Privacy-respecting cross-instance entity lookup'],
            ['/api/federation/jobs/apply', 'POST', 'x-federation-token', 'Remote job application routing'],
            ['/api/federation/reputation', 'GET, POST', 'x-federation-token', 'Portable reputation with HMAC-signed attestations'],
            ['/api/federation/project/[id]/context', 'GET', 'x-federation-token', 'Cross-instance project dashboard'],
          ]} />

          <h3 className="text-lg font-semibold mb-3 mt-8">Marketplace Endpoints (NEW)</h3>
          <Table headers={['Route', 'Methods', 'Auth', 'Purpose']} rows={[
            ['/api/marketplace', 'GET, POST', 'Session', 'List / register marketplace agents (POST auto-installs own agents)'],
            ['/api/marketplace/[id]', 'GET, PUT, DELETE', 'Session', 'Agent detail, update, remove'],
            ['/api/marketplace/[id]/install', 'POST, DELETE', 'Session', 'Install (POST) / Uninstall (DELETE) — payment-gated for paid agents'],
            ['/api/marketplace/[id]/execute', 'POST', 'Session', 'Execute agent task with input payload'],
            ['/api/marketplace/[id]/subscribe', 'POST, DELETE', 'Session', 'Subscribe/unsubscribe — unsubscribe cascades to uninstall + memory clear'],
            ['/api/marketplace/[id]/rate', 'POST', 'Session', 'Rate an agent (1-5 stars)'],
            ['/api/marketplace/earnings', 'GET', 'Session', 'Agent creator earnings dashboard'],
            ['/api/marketplace/fee-info', 'GET', 'Public', 'Platform fee structure'],
          ]} />

          <h3 className="text-lg font-semibold mb-3 mt-8">Other Endpoints (confirm present)</h3>
          <Table headers={['Route', 'Methods', 'Purpose']} rows={[
            ['/api/entity-resolve', 'GET, POST', 'Universal entity resolution'],
            ['/api/jobs', 'GET, POST', 'Network job board CRUD'],
            ['/api/jobs/match', 'GET', 'Job-to-profile matching'],
            ['/api/jobs/[id]', 'GET, PUT, DELETE', 'Individual job operations'],
            ['/api/jobs/[id]/apply', 'POST', 'Job applications'],
            ['/api/reputation', 'GET, POST', 'Reputation scores'],
            ['/api/briefs', 'GET', 'Brief assembly receipts'],
            ['/api/now', 'GET', 'Dynamic NOW engine scored items'],
            ['/api/activity', 'GET', 'Universal activity feed (filterable by category)'],
            ['/api/ambient-learning/synthesize', 'GET, POST', 'Trigger pattern synthesis'],
            ['/api/mcp', 'GET, POST', 'MCP Server v1.4.0'],
            ['/api/a2a', 'POST', 'A2A protocol endpoint'],
            ['/api/a2a/playbook', 'GET', 'Operational playbook'],
            ['/api/main-connect', 'POST', 'Connection ceremony'],
            ['/api/main-disconnect', 'POST', 'Disconnection'],
            ['/api/main-handoff', 'GET', 'Handoff brief'],
            ['/api/status', 'GET', 'Enhanced health check (DB + migrations + env)'],
          ]} />
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 4. MCP SERVER */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="mcp" num={4} title="MCP Server Updates (v1.4.0)">
          <p className="text-sm text-[var(--text-secondary)] mb-4">File: <code className="code-inline">src/app/api/mcp/route.ts</code></p>

          <h3 className="text-lg font-semibold mb-3">New Tools Added (FVP Build)</h3>
          <Table headers={['Tool', 'Description']} rows={[
            ['relay_thread_list', 'List relay threads for the current user'],
            ['relay_threads', 'Get all relays in a specific thread'],
            ['relay_send', 'Send a relay to a connection'],
            ['entity_resolve', 'Cross-surface entity resolution (contacts, connections, cards, events, emails, relays, teams)'],
            ['serendipity_matches', 'Graph topology matching — "you should meet X" recommendations'],
            ['route_task', 'Network-level task routing with 7-signal weighted scoring'],
            ['network_briefing', 'Composite cross-instance network pulse'],
          ]} />

          <h3 className="text-lg font-semibold mb-3 mt-6">Dynamic Marketplace Tools (v1.4.0 — NEW)</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            <code className="code-inline">tools/list</code> now dynamically includes installed marketplace agents as tools.
            Each installed agent becomes a <code className="code-inline">marketplace_&#123;slug&#125;</code> tool.
            <code className="code-inline">tools/call</code> handles <code className="code-inline">marketplace_*</code> prefixed tools — proxies to agent endpoint.
          </p>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] mb-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">How It Works</h4>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1">
              <li>• Install an agent → it appears as an MCP tool</li>
              <li>• Uninstall → tool disappears from <code className="code-inline">tools/list</code></li>
              <li>• Tool name: <code className="code-inline">marketplace_&#123;slug&#125;</code> (e.g., <code className="code-inline">marketplace_research_agent</code>)</li>
              <li>• Input schema pulled from agent&apos;s Integration Kit <code className="code-inline">requiredInputSchema</code></li>
              <li>• External MCP clients see your installed agents as native tools</li>
            </ul>
          </div>

          <h3 className="text-lg font-semibold mb-3 mt-6">Full Tool Inventory (20 static + dynamic)</h3>
          <CodeBlock>{`# Static tools (20)
queue_list, queue_add, queue_update,
contacts_list, contacts_search,
cards_list, mode_get, briefing_get, activity_recent,
job_post, job_browse, job_match, reputation_get,
relay_thread_list, relay_threads, relay_send,
entity_resolve,
serendipity_matches, route_task, network_briefing

# Dynamic tools (per-user, based on installed agents)
marketplace_{slug}  — one per installed agent`}</CodeBlock>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 5. AGENT CARD */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="agent-card" num={5} title="Agent Card Updates (v0.3.0)">
          <p className="text-sm text-[var(--text-secondary)] mb-4">File: <code className="code-inline">src/app/.well-known/agent-card.json/route.ts</code></p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-400 mb-2">New Capabilities</h3>
              <CodeBlock>{`streaming: true
pushNotifications: true
stateTransitionHistory: true
threading: true
structuredArtifacts: true
statusUpdates: true
webhookPush: true`}</CodeBlock>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-400 mb-2">Supported Methods</h3>
              <CodeBlock>{`tasks/send
tasks/get
tasks/list
tasks/respond
tasks/cancel
tasks/update_status
agent/info`}</CodeBlock>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-brand-400 mb-2 mt-4">Dynamic Skills Array (v1.4.0 — NEW)</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Skills array now dynamically includes installed marketplace agents. Each installed agent becomes a skill entry
            with its task types, and <code className="code-inline">mcpTools</code> includes <code className="code-inline">marketplace_&#123;slug&#125;</code> entries.
          </p>

          <h3 className="text-sm font-semibold text-brand-400 mb-2 mt-4">Artifact Types</h3>
          <div className="flex flex-wrap gap-2">
            {['text', 'code', 'document', 'data', 'contact_card', 'calendar_invite', 'email_draft'].map((t) => (
              <span key={t} className="px-2 py-1 rounded bg-white/[0.04] border border-[var(--border-color)] text-xs font-mono">{t}</span>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-brand-400 mb-2 mt-4">Federation Endpoints in Card</h3>
          <CodeBlock>{`federation.connect      /api/federation/connect
federation.relay        /api/federation/relay
federation.jobs         /api/federation/jobs
federation.jobApply     /api/federation/jobs/apply
federation.reputation   /api/federation/reputation
federation.mcp          /api/federation/mcp
federation.entitySearch /api/federation/entity-search
federation.patterns     /api/federation/patterns
federation.briefing     /api/federation/briefing
federation.routing      /api/federation/routing
federation.graph        /api/federation/graph`}</CodeBlock>

          <h3 className="text-sm font-semibold text-brand-400 mb-2 mt-4">Webhook Events</h3>
          <div className="flex flex-wrap gap-2">
            {['task_dispatched', 'new_message', 'wake', 'queue_changed', 'relay_state_changed'].map((e) => (
              <span key={e} className="px-2 py-1 rounded bg-white/[0.04] border border-[var(--border-color)] text-xs font-mono">{e}</span>
            ))}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 6. SYSTEM PROMPT */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="system-prompt" num={6} title="System Prompt Changes">
          <p className="text-sm text-[var(--text-secondary)] mb-4">New sections added: <strong>Federation Intelligence (FVP Brief)</strong> + <strong>Marketplace Agent Loading (Layer 11)</strong></p>
          <Table headers={['Action Tag', 'Syntax', 'Purpose']} rows={[
            ['entity_resolve', '[[entity_resolve:{"query":"email/name/domain"}]]', 'Cross-surface entity resolution'],
            ['serendipity_matches', '[[serendipity_matches:{}]]', 'Graph topology matching for connection recommendations'],
            ['route_task', '[[route_task:{"taskDescription":"...","taskSkills":["..."],"taskType":"..."}]]', 'Network-level intelligent task routing'],
            ['network_briefing', '[[network_briefing:{}]]', 'Composite cross-instance network pulse'],
          ]} />

          <div className="mt-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-lg text-sm text-[var(--text-secondary)]">
            <strong className="text-brand-400">Layer 11 — Marketplace Agent Loading (NEW):</strong>
            <ul className="mt-2 space-y-1">
              <li>• System prompt loads only agents with <code className="code-inline">installed: true</code></li>
              <li>• Each installed agent&apos;s identity, task types, and context instructions loaded into prompt</li>
              <li>• Non-installed agents: Divi suggests <code className="code-inline">[[install_agent:...]]</code> when relevant</li>
              <li>• Proactively surface serendipity matches when relevant</li>
              <li>• Use route_task for skill-matched delegation</li>
              <li>• Pull network briefings to stay current on federation activity</li>
            </ul>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 7. ACTION TAGS */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="action-tags" num={7} title="Action Tags Updates">
          <h3 className="text-sm font-semibold mb-2">Modified Tags</h3>
          <Table headers={['Tag', 'Change']} rows={[
            ['relay_request', 'Now supports threadId and parentRelayId for threading'],
            ['relay_broadcast', 'Checks recipient relay preferences before sending'],
            ['relay_ambient', 'Checks recipient relay preferences before sending'],
          ]} />
          <h3 className="text-sm font-semibold mb-2 mt-4">New Tags (FVP)</h3>
          <Table headers={['Tag', 'Purpose']} rows={[
            ['entity_resolve', 'Resolves entities across all data surfaces'],
          ]} />
          <h3 className="text-sm font-semibold mb-2 mt-4">New Tags (Marketplace — NEW)</h3>
          <Table headers={['Tag', 'Syntax', 'Purpose']} rows={[
            ['install_agent', '[[install_agent:{"agentId":"..."}]]', 'Install a marketplace agent — payment-gated for paid agents, loads Integration Kit into memory'],
            ['uninstall_agent', '[[uninstall_agent:{"agentId":"..."}]]', 'Uninstall agent — clears all memory keys for the agent'],
            ['list_marketplace', '[[list_marketplace:{"category?":"...","search?":"..."}]]', 'Browse marketplace — enriched with installed/subscribed/isOwnAgent/taskTypes'],
            ['execute_agent', '[[execute_agent:{"agentId":"...","input":{}}]]', 'Execute a marketplace agent task with structured input'],
            ['subscribe_agent', '[[subscribe_agent:{"agentId":"...","tier":"..."}]]', 'Subscribe to a paid agent — required before install for paid agents'],
          ]} />
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 8. WEBHOOK */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="webhook" num={8} title="Webhook Push System">
          <p className="text-sm text-[var(--text-secondary)] mb-3">New event: <code className="code-inline">relay_state_changed</code></p>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            <code className="code-inline">pushRelayStateChanged()</code> fires when relay status transitions (pending → delivered → completed). Wired into:
          </p>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1">
            <li>• Relay PATCH handler</li>
            <li>• Action tags (relay_request, relay_respond)</li>
          </ul>
          <p className="text-sm text-[var(--text-secondary)] mt-3">
            Webhook config stored in <code className="code-inline">ServiceApiKey</code> with <code className="code-inline">service=&apos;webhook_push&apos;</code>.
          </p>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 9. AGENT MARKETPLACE SYSTEM (NEW) */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="marketplace" num={9} title="Agent Marketplace System (NEW)">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Complete agent lifecycle: register → browse → subscribe → install → execute → uninstall.
            Agents are only loaded into Divi&apos;s context when explicitly installed.
          </p>

          <h3 className="text-lg font-semibold mb-3">Agent Integration Kit</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Seven new fields on <code className="code-inline">MarketplaceAgent</code> that tell Divi <em>how</em> to use an agent — not just that it exists.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h4 className="text-sm font-semibold text-brand-400 mb-2">What the Kit Contains</h4>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                <li>• <code className="font-mono">taskTypes</code> — what this agent can do</li>
                <li>• <code className="font-mono">contextInstructions</code> — how to prepare context</li>
                <li>• <code className="font-mono">requiredInputSchema</code> — JSON schema for input</li>
                <li>• <code className="font-mono">outputSchema</code> — JSON schema for output</li>
                <li>• <code className="font-mono">usageExamples</code> — example invocations</li>
                <li>• <code className="font-mono">contextPreparation</code> — pre-delegation steps</li>
                <li>• <code className="font-mono">executionNotes</code> — timeouts, retries, limits</li>
              </ul>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h4 className="text-sm font-semibold text-brand-400 mb-2">Memory Keys (per agent)</h4>
              <pre className="text-xs text-[var(--text-secondary)] font-mono">{`agent:{id}:identity        (tier 1)
agent:{id}:task_types      (tier 1)
agent:{id}:context_instructions (tier 2)
agent:{id}:preparation_steps    (tier 2)
agent:{id}:input_schema    (tier 2)
agent:{id}:output_schema   (tier 2)
agent:{id}:usage_examples  (tier 3)
agent:{id}:execution_notes (tier 3)`}</pre>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-3">Install / Uninstall Lifecycle</h3>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] mb-4">
            <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
              <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400">browse</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400">subscribe (if paid)</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">install</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400">execute</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-red-500/10 text-red-400">uninstall</span>
            </div>
          </div>
          <Table headers={['Action', 'What Happens']} rows={[
            ['Install (free agent)', 'Auto-creates subscription + sets installed=true + loads all Integration Kit memory keys'],
            ['Install (paid agent)', 'Requires active subscription — sets installed=true + loads memory'],
            ['Uninstall', 'Sets installed=false + uninstalledAt timestamp + deletes all memory keys for agent'],
            ['Unsubscribe', 'Cascades to uninstall + clears memory + removes subscription'],
            ['Register own agent', 'Auto-installs immediately — your own agents are always available'],
          ]} />

          <h3 className="text-lg font-semibold mb-3 mt-6">Coherence Rules</h3>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1">
            <li>• <strong>Own agents:</strong> Auto-installed on registration, <code className="code-inline">isOwnAgent: true</code> flag in list responses</li>
            <li>• <strong>MCP dynamic tools:</strong> Only installed agents appear as <code className="code-inline">marketplace_&#123;slug&#125;</code> tools</li>
            <li>• <strong>A2A dynamic skills:</strong> Agent card skills array reflects installed agents</li>
            <li>• <strong>System prompt:</strong> Layer 11 loads only <code className="code-inline">installed: true</code> agents into context</li>
            <li>• <strong>UI:</strong> Install/Uninstall toggle, green &quot;Installed&quot; badge with pulse animation</li>
          </ul>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 10. CHANGELOG */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="changelog" num={10} title="Changelog Entry">
          <p className="text-sm text-[var(--text-secondary)] mb-3">Two entries in <code className="code-inline">src/lib/updates.ts</code>:</p>

          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-green-500/20 mb-4">
            <p className="font-semibold">Install / Uninstall — Divi Only Learns What You Need (NEW)</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">April 11, 2026</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {['marketplace', 'agents', 'memory', 'mcp', 'a2a', 'integration-kit'].map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-mono">{tag}</span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
            <p className="font-semibold">FVP Integration Brief — 14 Proposals, One Build</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">April 11, 2026 @ 11:45 PM</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {['federation', 'protocol', 'a2a', 'mcp', 'intelligence', 'fvp', 'network'].map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-mono">{tag}</span>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 11. PWA */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="pwa" num={11} title="PWA / Layout Fixes">
          <h3 className="text-sm font-semibold mb-2">globals.css — PWA standalone mode</h3>
          <CodeBlock>{`@media (display-mode: standalone) {
  html {
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }
  body {
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .app-shell {
    height: 100%;
  }
}`}</CodeBlock>

          <h3 className="text-sm font-semibold mb-2 mt-4">layout.tsx — Body class</h3>
          <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] font-mono text-xs">
            <div className="text-red-400">- &lt;body className=&quot;min-h-full&quot;&gt;</div>
            <div className="text-green-400">+ &lt;body className=&quot;min-h-full overflow-x-hidden&quot;&gt;</div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 12. DX */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="dx" num={12} title="Developer Experience (DX) Additions">
          <Table headers={['File', 'Purpose']} rows={[
            ['scripts/setup.sh', 'One-command setup for macOS/Linux/WSL'],
            ['scripts/setup.ps1', 'One-command setup for Windows PowerShell'],
            ['docker-compose.yml', 'Local PostgreSQL 16 via Docker'],
            ['.env.example', 'Clear Required/Optional variable documentation'],
            ['README.md', 'Quick Start-first, troubleshooting FAQ sections'],
          ]} />

          <h3 className="text-sm font-semibold mb-2 mt-4">Health Check Enhancement</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            <code className="code-inline">GET /api/status</code> now returns: database connection status + user count,
            migration validation, environment variable validation. Returns <strong>200</strong> (healthy) or <strong>503</strong> (unhealthy).
          </p>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 13. MCP REGISTRY */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="mcp-registry" num={13} title="MCP Registry Submission Kit">
          <Table headers={['File', 'Purpose']} rows={[
            ['public/mcp-registry/server.json', 'Official MCP Registry format'],
            ['public/mcp-registry/README.md', 'Copy-paste submission kit for 5 registries (Official, Smithery, PulseMCP, Glama, mcp.so)'],
          ]} />
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 14. FILES */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="files" num={14} title="Files Changed Summary">
          <h3 className="text-sm font-semibold mb-2">New Files</h3>
          <CodeBlock>{`# Federation Intelligence (FVP)
src/lib/federation/pattern-sharing.ts
src/lib/federation/graph-matching.ts
src/lib/federation/composite-prompts.ts
src/lib/federation/task-routing.ts
src/lib/entity-resolution.ts
src/lib/task-exchange.ts
src/app/api/federation/patterns/route.ts
src/app/api/federation/briefing/route.ts
src/app/api/federation/routing/route.ts
src/app/api/federation/graph/route.ts
src/app/api/federation/mcp/route.ts
src/app/api/federation/entity-search/route.ts
src/app/api/federation/jobs/apply/route.ts
src/app/api/federation/reputation/route.ts
src/app/api/entity-resolve/route.ts

# Marketplace Install/Uninstall
src/app/api/marketplace/[id]/install/route.ts

# Migrations
prisma/migrations/20260411_add_relay_threading_and_artifacts/
prisma/migrations/20260411_add_portable_reputation/
prisma/migrations/20260411_add_agent_integration_kit/
prisma/migrations/20260411_add_agent_install_management/`}</CodeBlock>

          <h3 className="text-sm font-semibold mb-2 mt-4">Modified Files</h3>
          <CodeBlock>{`prisma/schema.prisma              — AgentRelay (3), ReputationScore (3), MarketplaceAgent (7), MarketplaceSubscription (3)
src/app/api/mcp/route.ts           — v1.4.0, dynamic marketplace tools
src/app/.well-known/agent-card.json/route.ts — dynamic skills + marketplace MCP tools
src/app/api/marketplace/route.ts   — auto-install on registration, Integration Kit memory loading
src/app/api/marketplace/[id]/subscribe/route.ts — unsubscribe cascades to uninstall + memory clear
src/lib/system-prompt.ts           — Layer 11 marketplace agent loading + install suggestions
src/lib/action-tags.ts             — install_agent, uninstall_agent, list_marketplace, execute_agent, subscribe_agent
src/lib/webhook-push.ts            — relay_state_changed event
src/lib/updates.ts                 — Install/Uninstall changelog entry
src/components/dashboard/MarketplaceView.tsx — Install/Uninstall toggle, Installed badge
src/app/globals.css                — PWA viewport fix
src/app/layout.tsx                 — overflow-x-hidden on body
src/app/dashboard/page.tsx         — Mobile flex layout fix
src/components/dashboard/ChatView.tsx — flex-shrink-0 on header/input`}</CodeBlock>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 15. DEPLOY */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="deploy" num={15} title="Deployment Checklist">
          <CodeBlock>{`# 1. Pull latest code
git pull origin main

# 2. Install dependencies
yarn install

# 3. Generate Prisma client
yarn prisma generate

# 4. Apply migrations
yarn prisma migrate deploy

# 5. Build
yarn build

# 6. Verify
curl https://os.dividen.ai/api/status
curl https://os.dividen.ai/.well-known/agent-card.json | jq '.version'
curl -s https://os.dividen.ai/api/mcp -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{"method":"server/info"}' | jq '.result.version'`}</CodeBlock>

          <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-green-400 mb-2">Expected Results</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              <li>• <code className="code-inline">/api/status</code> → 200 with all checks passing</li>
              <li>• Agent card version → <code className="code-inline">0.3.0</code></li>
              <li>• MCP server version → <code className="code-inline">1.4.0</code></li>
              <li>• <code className="code-inline">tools/list</code> → 20 static tools + dynamic marketplace tools</li>
            </ul>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════ */}
        {/* 16. FUTURE */}
        {/* ═══════════════════════════════════════════════ */}
        <Section id="future" num={16} title="What's NOT in This Build (Future)">
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            <li>• No UI for federation intelligence (patterns, graph, briefing, routing are API + MCP only — Divi surfaces them conversationally)</li>
            <li>• No admin dashboard for federation analytics (telemetry captures data, dashboard TBD)</li>
            <li>• No automated pattern sharing schedule (manual or Divi-initiated only)</li>
            <li>• No multi-instance graph visualization (topology data is exportable, viz TBD)</li>
            <li>• No marketplace analytics dashboard (earnings endpoint exists, UI TBD)</li>
            <li>• No agent versioning (agents update in place — versioning planned for future)</li>
          </ul>
        </Section>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-muted)]">
            DiviDen Command Center — Last updated April 13, 2026
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <a href="/documentation" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Documentation</a>
            <a href="/docs/developers" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">API Reference</a>
            <a href="/docs/federation" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Federation</a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Sub-Components ─── */

function Section({ id, num, title, children }: { id: string; num: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">
        {num}. {title}
      </h2>
      {children}
    </section>
  );
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <div className="mb-4">
      {title && <p className="text-xs font-mono text-brand-400 mb-1">{title}</p>}
      <pre className="p-4 bg-[#0d0d0d] border border-[var(--border-color)] rounded-lg overflow-x-auto text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] text-xs">
                  {ci === 0 ? <code className="font-mono text-[var(--text-primary)]">{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldGroup({ model, fields }: { model: string; fields: { name: string; desc: string }[] }) {
  return (
    <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
      <h4 className="text-sm font-semibold text-brand-400 mb-2">{model} model — {fields.length} new fields</h4>
      <ul className="space-y-1">
        {fields.map((f, i) => (
          <li key={i} className="text-xs text-[var(--text-secondary)]">
            <code className="font-mono text-[var(--text-primary)]">{f.name}</code> — {f.desc}
          </li>
        ))}
      </ul>
    </div>
  );
}
