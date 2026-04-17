export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Release Notes',
  description: 'DiviDen release notes — v2.1.6 Ambient Relays Live, Federation Auto-Accept, Sequential Relay Handling, UI Polish.',
  openGraph: {
    title: 'DiviDen Release Notes',
    description: 'v2.1.6 — Ambient Relays Live, Federation Auto-Accept Fix, Sequential Relay Handling, 6 UI Bug Fixes.',
    images: [{ url: '/api/og?title=Release+Notes&subtitle=v2.1.6+Ambient+Relays+Live&tag=release', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen Release Notes',
    description: 'v2.1.6 — Ambient Relays Live, Federation Auto-Accept Fix, Sequential Relay Handling, 6 UI Bug Fixes.',
    images: ['/api/og?title=Release+Notes&subtitle=v2.1.6+Ambient+Relays+Live&tag=release'],
  },
};

import { DocDownloadButton } from '@/components/docs/DocDownloadButton';
import { DocFooterDownload } from '@/components/docs/DocFooterDownload';

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-6 sm:p-8" data-doc-content>
        {/* Back links */}
        <div className="mb-6 flex items-center gap-4" data-no-download>
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
        {/* APRIL 17, 2026 — v2.1.6 AMBIENT RELAYS LIVE, FEDERATION FIX    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v2.1.6" className="mb-16 p-6 bg-[var(--bg-surface)] border border-brand-500/30 rounded-xl relative overflow-hidden">
          {/* Glow accent for latest */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v2.1.6</span>
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">LATEST</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">April 17, 2026</span>
                <DocDownloadButton containerId="release-v2.1.6" filename="dividen-release-v2.1.6" variant="icon" />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-6">Ambient Relays Live, Federation Auto-Accept Fix, Agent Card Updates, 6 UI Bug Fixes, Sequential Relay Handling, FVP Architecture Docs</p>

            {/* Thank you Jaron */}
            <div className="mb-8 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <p className="text-sm text-purple-300">
                <strong>🙏 Shoutout to Jaron</strong> — massive thanks for your help stress-testing federation, flagging the auto-accept bug, and surfacing all the UI rough edges. This release is way tighter because of you.
              </p>
            </div>

            <div className="space-y-8">

              {/* Ambient Relays */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🌊 Ambient Relays Are Live</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  The ambient relay system is officially live across the federation. Divi can now send low-priority, context-aware observations to connected agents — and receive them back. These aren&apos;t tasks; they&apos;re <strong className="text-white">shared awareness</strong>.
                </p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2 mb-3">
                  <li>• Ambient relays carry <code className="code-inline">_ambient: true</code> in the payload — same transport layer, different handling semantics.</li>
                  <li>• Divi weaves inbound ambient relays into conversation naturally rather than treating them as action items.</li>
                  <li>• Broadcast relays (<code className="code-inline">relay_broadcast</code>) now correctly push to all federated connections, not just local ones.</li>
                  <li>• Comprehensive architecture doc published for FVP integration: <a href="/FVP_AMBIENT_RELAY_ARCHITECTURE.md" className="text-brand-400 hover:text-brand-300" target="_blank">Ambient Relay Architecture Guide</a> (<a href="/FVP_AMBIENT_RELAY_ARCHITECTURE.pdf" className="text-brand-400 hover:text-brand-300" target="_blank">PDF</a>).</li>
                </ul>
              </div>

              {/* Federation Auto-Accept Fix */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🔧 Federation Auto-Accept Callback Fix</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  When DiviDen auto-accepts an inbound federation connection request (<code className="code-inline">requireApproval: false</code>), it now correctly fires the acceptance callback to the requesting instance. Previously, the callback was silently skipped — leaving the requesting side stuck in <code className="code-inline">pending</code> forever.
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Fixed in <code className="code-inline">/api/federation/connect</code>. The acceptance POST now sends <code className="code-inline">{'{'}connectionId, status: &quot;active&quot;, token{'}'}</code> back to the requester&apos;s callback URL.
                </p>
              </div>

              {/* Agent Card Updates */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🪪 Agent Card: New Endpoints</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  <code className="code-inline">/.well-known/agent-card.json</code> now advertises two new federation endpoints:
                </p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2">
                  <li>• <code className="code-inline">connectAccept</code> — <code className="code-inline">/api/federation/connect/accept</code> — Callback endpoint for accepting connection requests.</li>
                  <li>• <code className="code-inline">relayAck</code> — <code className="code-inline">/api/federation/relay-ack</code> — Acknowledgment endpoint for relay delivery confirmation.</li>
                </ul>
              </div>

              {/* FVP Integration Answers */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">📄 FVP Integration Q&amp;A Document</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Answered all 45 integration questions from the FVP team covering relay lifecycle, ambient vs. direct semantics, connection trust, pattern sharing, and error handling. Available at <a href="/FVP_DIVIDEN_INTEGRATION_ANSWERS.md" className="text-brand-400 hover:text-brand-300" target="_blank">FVP Integration Answers</a> (<a href="/FVP_DIVIDEN_INTEGRATION_ANSWERS.pdf" className="text-brand-400 hover:text-brand-300" target="_blank">PDF</a>).
                </p>
              </div>

              {/* Sequential Relay Handling */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🔢 One Relay at a Time</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Divi&apos;s system prompt now injects <strong className="text-white">one relay at a time</strong> instead of batching up to 20. This prevents context overload and ensures each relay gets proper attention.
                </p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2">
                  <li>• All three relay queries (inbound, responses, ambient) changed from <code className="code-inline">take: 10/5/5</code> to <code className="code-inline">take: 1</code>.</li>
                  <li>• Prompt instructions updated with &quot;HANDLE THIS ONE FIRST&quot; framing.</li>
                  <li>• Ambient section pre-fills <code className="code-inline">relayId</code> in the respond template for instant action.</li>
                </ul>
              </div>

              {/* 6 UI Bug Fixes */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🐛 6 UI Bug Fixes</h3>
                <p className="text-sm text-[var(--text-muted)] mb-3">From Jaron&apos;s testing feedback:</p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2">
                  <li>• <strong className="text-white">Comms direction colors</strong> — Outbound relays now render green, inbound render purple. Previously all same color.</li>
                  <li>• <strong className="text-white">Relay collapse toggle</strong> — Active relays section in Comms is now collapsible. Click the header to expand/collapse.</li>
                  <li>• <strong className="text-white">Relay dismiss button</strong> — Each relay in Comms now has a dismiss (×) button that marks it as expired via PATCH.</li>
                  <li>• <strong className="text-white">Queue filter</strong> — <code className="code-inline">behavior_learning</code> items no longer appear in the task queue. They belong in Settings → Learnings.</li>
                  <li>• <strong className="text-white">Chat textarea</strong> — Input converted from single-line <code className="code-inline">&lt;input&gt;</code> to auto-resizing <code className="code-inline">&lt;textarea&gt;</code>. Grows vertically up to 160px, resets on send.</li>
                  <li>• <strong className="text-white">Name resolution</strong> — <code className="code-inline">invite_to_project</code> now uses score-based matching (exact → contains → first-name) and searches <code className="code-inline">peerAgentName</code> field.</li>
                </ul>
              </div>

              {/* DB Cleanup */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">🧹 Test Data Cleanup</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Expired stuck test relays and archived their associated comms messages from the federation bridge testing phase. Production DB is clean.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 17, 2026 — v2.1.3 PROJECT MANAGEMENT, FEDERATION PUSH     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v2.1.3" className="mb-16 p-6 bg-[var(--bg-surface)] border border-brand-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v2.1.3</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">April 17, 2026</span>
              <DocDownloadButton containerId="release-v2.1.3" filename="dividen-release-v2.1.3" variant="icon" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Project Management Tags, Queue-First Task Routing, Federation Relay Push, Directory Discovery Fix, FVP Cross-Operability Guide</p>

          <div className="space-y-8">

            {/* Project Management */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📋 Project Management from Chat</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Two new action tags let Divi create projects and invite members directly from conversation:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-2 mb-3">
                <li>• <code className="code-inline">create_project</code> — Creates a Project record, adds the creator as lead, and auto-invites listed members. Members are resolved by name/username/email against active connections.</li>
                <li>• <code className="code-inline">invite_to_project</code> — Invites members to an existing project by name (fuzzy match) or ID. Each invitee gets a <code className="code-inline">ProjectInvite</code> record, a queue item, and a comms notification.</li>
              </ul>
              <p className="text-sm text-[var(--text-secondary)]">
                Example: <em>&quot;create a project called Debugging DiviDen and add @jaron and @alvaro&quot;</em> → project created, both invited with queue items.
              </p>
            </div>

            {/* Queue-First Task Routing */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 Queue-First Task Routing (v2.1.2)</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                The <code className="code-inline">task_route</code> tag now creates a queue item instead of immediately firing relays. The full pipeline (relay → comms → kanban card on recipient board) executes only when the item is dispatched — either manually or via Chief of Staff mode.
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Flow: <code className="code-inline">task_route</code> → queue (READY) → dispatch → relay + comms + recipient card + sender tracking + checklist on source card.
              </p>
            </div>

            {/* Federation Push */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🌐 Outbound Federation Relay Push</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                DiviDen now pushes relays to federated instances. When a task_route dispatch targets a federated connection, the relay payload is POSTed to the remote instance&apos;s <code className="code-inline">/api/federation/relay</code> endpoint with the shared federation token. Fire-and-forget with 10s timeout.
              </p>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Project invites also push notifications to federated instances via <code className="code-inline">/api/federation/notifications</code>.
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                New utility: <code className="code-inline">src/lib/federation-push.ts</code> — shared <code className="code-inline">pushRelayToFederatedInstance()</code> and <code className="code-inline">pushNotificationToFederatedInstance()</code> helpers.
              </p>
            </div>

            {/* Directory Fix */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔍 Directory Discovery Fix</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                <code className="code-inline">/api/v2/network/discover</code> now returns profiles with <code className="code-inline">visibility: &apos;connections&apos;</code> (not just <code className="code-inline">&apos;public&apos;</code>). Also returns basic entries for users without profile records. Test accounts excluded.
              </p>
            </div>

            {/* LLM Provider */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🧠 LLM Provider Priority</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Abacus AI (Claude) is now the primary LLM provider. GPT-4o doesn&apos;t reliably emit <code className="code-inline">[[tag:params]]</code> action tags. User OpenAI keys are fallback only. Max tokens increased to 8192 for Abacus.
              </p>
            </div>

            {/* FVP Guide */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📄 FVP Cross-Operability Guide v2.2</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Comprehensive guide for FVP integration: full event taxonomy (relay + notification types), payload schemas, authentication, endpoint reference, and implementation checklist. Available at <a href="/docs/fvp-cross-operability-v2.2.md" className="text-brand-400 hover:text-brand-300" target="_blank">/docs/fvp-cross-operability-v2.2.md</a>.
              </p>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 16, 2026 — v2.1.0 TASK ROUTING, BUBBLE STORE, SETTINGS    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v2.1.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-brand-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v2.1.0</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">April 16, 2026</span>
              <DocDownloadButton containerId="release-v2.1.0" filename="dividen-release-v2.1.0" variant="icon" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Cross-User Task Routing, Relay Pipeline, Bubble Store Promotion, Settings Overhaul, Installed Manager, Capabilities Resilience</p>

          <div className="space-y-8">

            {/* Task Routing */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 Cross-User Task Routing</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Task routing is now a core capability — not a Bubble Store install. When you say &quot;assign this to Alvaro&quot;, Divi emits a <code className="code-inline">[[task_route:...]]</code> tag that creates a full delivery pipeline:
              </p>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><strong className="text-white">Queue item</strong> created on the sender&apos;s side for tracking and approval.</li>
                <li><strong className="text-white">Relay</strong> created and linked to the queue item, sent to the recipient&apos;s Divi.</li>
                <li><strong className="text-white">Comms message</strong> delivered to recipient with task details, subject, and card context.</li>
                <li><strong className="text-white">Sender comms thread</strong> created for tracking routed tasks.</li>
                <li><strong className="text-white">Checklist item</strong> added to source card (if card context exists) showing assignee, due date, and delegation status.</li>
                <li><strong className="text-white">Activity log</strong> records the routing with match scores and route mode.</li>
              </ul>
            </div>

            {/* task_route Flexibility */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔧 Flexible task_route Tag</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><code className="code-inline">cardId</code> is now <strong className="text-white">optional</strong>. Tasks can be routed standalone without a specific kanban card.</li>
                <li><code className="code-inline">cardTitle</code> added as an alternative — looks up cards by name (case-insensitive partial match).</li>
                <li>Minimum viable tag: <code className="code-inline">{'[[task_route:{"tasks":[{"title":"...","to":"Name","dueDate":"..."}]}]]'}</code></li>
                <li>Explicit <code className="code-inline">to</code> field bypasses skill matching — direct assignment always works regardless of profile skills.</li>
                <li>When skill matching fails for the <code className="code-inline">to</code> target, falls back to searching <strong className="text-white">all active connections</strong>.</li>
              </ul>
            </div>

            {/* Relay Respond Sync */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔄 Relay Response Sync</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><code className="code-inline">relay_respond</code> now syncs delegation status back to the sender&apos;s checklist item (accepted/declined).</li>
                <li>Queue items linked to relays are also updated when relays complete or are declined.</li>
                <li>Inbound <code className="code-inline">assign_task</code> relays instruct the recipient&apos;s Divi to create a card on their board.</li>
              </ul>
            </div>

            {/* Routing Always Loaded */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Routing Capabilities Always On</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>When a user has <strong className="text-white">any active connections</strong>, the routing capability group and relay group are always loaded into Divi&apos;s context.</li>
                <li>Previously required specific keyword patterns to match — now routing is available in every conversation.</li>
                <li>5 concrete <code className="code-inline">[[task_route:...]]</code> examples added to CRITICAL EXECUTION RULES to prevent phantom work.</li>
                <li>Rule 6 explicitly prohibits using <code className="code-inline">upsert_card</code> for cross-user assignment.</li>
              </ul>
            </div>

            {/* Checklist Delegation */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📋 Delegation on Checklist Items</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Checklist items now carry <code className="code-inline">assigneeType</code>, <code className="code-inline">assigneeName</code>, <code className="code-inline">delegationStatus</code>, <code className="code-inline">dueDate</code>, and <code className="code-inline">sourceType/sourceId/sourceLabel</code>.</li>
                <li>Card detail modal shows purple <strong className="text-white">Delegated</strong> badges and per-task due dates.</li>
                <li>NOW panel scores and surfaces delegated tasks with assignee info.</li>
              </ul>
            </div>

            {/* Bubble Store */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🫧 Bubble Store — Top-Level Tab</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Bubble Store promoted from the Network sub-menu to the <strong className="text-white">primary tab bar</strong> — one click, no nesting.</li>
                <li>Sits alongside Chat, CRM, Calendar, Email, Recordings as a first-class surface.</li>
              </ul>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚙️ Settings Overhaul</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><strong className="text-white">Compact tab bar</strong> — all 7 tabs fit in a single row with icon-above-label layout. No horizontal scrolling, no two-row wrapping.</li>
                <li><strong className="text-white">Installed Manager</strong> (Divi tab) — new section showing all installed agents and capabilities with uninstall, edit rules, and links to stores.</li>
                <li>Capability customization fields editable inline — no need to navigate to the store.</li>
              </ul>
            </div>

            {/* Capabilities Resilience */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🛡️ Capabilities Page Resilience</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Auto-retry (up to 2x) on server errors and network failures — handles DB connection pool timeouts gracefully.</li>
                <li>Error state with manual &quot;Retry&quot; button when auto-retry exhausted.</li>
              </ul>
            </div>

            {/* Connection Requests */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🤝 Connection Request Surfacing</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Pending inbound connection requests now injected into the relay group with <code className="code-inline">[[accept_connection:...]]</code> action tags.</li>
                <li>Divi proactively tells the operator about pending requests at the start of responses.</li>
                <li>Relay group force-loaded when pending requests exist.</li>
              </ul>
            </div>

            {/* Signals Onboarding */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔔 Signals Onboarding Fix</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Signal onboarding links now open settings <strong className="text-white">in-page</strong> (not new tab) and navigate to the correct tab.</li>
              </ul>
            </div>

            {/* Directory */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🌍 Directory Improvements</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Raw instance entities without <code className="code-inline">operatorName</code> hidden from directory — only operators with profiles show.</li>
                <li>Federated operators displayed as people with instance context cards.</li>
              </ul>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 16, 2026 — v2.0.5 TEAM @MENTIONS, REFACTORING, DOCS AUDIT */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v2.0.5" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v2.0.5</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">April 16, 2026</span>
              <DocDownloadButton containerId="release-v2.0.5" filename="dividen-release-v2.0.5" variant="icon" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Team @Mentions, Codebase Refactoring, Performance Optimizations, Accessibility, Documentation Audit</p>

          <div className="space-y-8">
            <div>
              <h3 className="text-base font-bold text-white mb-2">👥 Team @Mentions</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>The <code className="code-inline">@</code> trigger in chat now searches <strong className="text-white">people</strong>, <strong className="text-white">teams</strong>, and <strong className="text-white">agents</strong> in parallel.</li>
                <li>Teams matched by name and description — only teams you&apos;re a member of appear.</li>
                <li>Team mentions render as purple chips with a 👥 prefix, linking to the team view.</li>
                <li>Team names auto-kebab-cased for handles (e.g., &quot;Ops Team&quot; → <code className="code-inline">@ops-team</code>).</li>
                <li><code className="code-inline">/api/users/resolve</code> now resolves both usernames and kebab-cased team names.</li>
                <li><code className="code-inline">/api/chat/mentions?type=teams</code> — new endpoint for team search in inline autocomplete.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">🧹 Codebase Refactoring</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><strong className="text-white">Dead code removed:</strong> ~15 unused imports/variables across components and lib files. Removed 115-line dead function (<code className="code-inline">layer18_profileAwareness_optimized</code>) from system prompt. Removed unused <code className="code-inline">LoopBackArrow</code> SVG component (38 lines).</li>
                <li><strong className="text-white">Type safety:</strong> Added <code className="code-inline">next-auth.d.ts</code> type augmentation — <code className="code-inline">session.user.id</code> now typed without <code className="code-inline">as any</code> casting.</li>
                <li><strong className="text-white">Auth audit:</strong> All API routes verified for auth guards. v2 routes use <code className="code-inline">authenticateAgent()</code>, federation routes use token auth, public routes are intentional.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Performance Optimizations</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li><code className="code-inline">/api/chat/send</code>: Message save + user fetch now run in parallel. System prompt build + message history fetch also parallelized. Saves ~2 DB round-trips per chat message.</li>
                <li>N+1 query audit: All read-heavy endpoints (kanban GET, /api/now, notifications feed) confirmed free of N+1 patterns.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">♿ Accessibility</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Chat input: <code className="code-inline">role=&quot;combobox&quot;</code>, <code className="code-inline">aria-expanded</code>, <code className="code-inline">aria-activedescendant</code> for inline search dropdown.</li>
                <li>Inline search results: <code className="code-inline">role=&quot;listbox&quot;</code> + <code className="code-inline">role=&quot;option&quot;</code> with <code className="code-inline">aria-selected</code>.</li>
                <li>Kanban columns: <code className="code-inline">role=&quot;region&quot;</code> with descriptive <code className="code-inline">aria-label</code>. Add-card buttons labeled.</li>
                <li>Error boundaries: NowPanel and QueuePanel now wrapped in <code className="code-inline">TabErrorBoundary</code> (desktop + mobile).</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">🏠 Homepage</h3>
              <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5">
                <li>Hero copy reverted to &quot;The last interface you&apos;ll ever need&quot; per founder preference.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 15, 2026 — v1.9.1 REALTIME DASHBOARD + CATCH-UP + ACTIVITY  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.9.1" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.9.1</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">April 15, 2026</span>
              <DocDownloadButton containerId="release-v1.9.1" filename="dividen-release-v1.9.1" variant="icon" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Covers v1.9.0 → v1.9.1 — Realtime Dashboard, Catch-Up Rewrite, Activity Feed v2</p>

          <div className="space-y-8 text-sm text-[var(--text-secondary)] leading-relaxed">

            {/* ── Realtime Dashboard ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Realtime Dashboard Refresh</h3>
              <p className="mb-2">
                Every dashboard panel now refreshes instantly when a related action completes in chat. Lightweight custom DOM event system — no WebSockets or SSE required.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-muted)]">
                <li><code className="code-inline">dividen:now-refresh</code> — universal trigger, all panels listen</li>
                <li><code className="code-inline">dividen:board-refresh</code> — kanban board re-fetch</li>
                <li><code className="code-inline">dividen:queue-refresh</code> — queue panel re-fetch</li>
                <li><code className="code-inline">dividen:comms-refresh</code> — comms tab re-fetch</li>
                <li><code className="code-inline">dividen:activity-refresh</code> — activity stream re-fetch</li>
              </ul>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                ChatView dispatches relevant events after settings saves, chat completions, setup task advances. NOW panel poll interval reduced from 120s to 60s as a backstop.
              </p>
            </div>

            {/* ── Catch-Up Briefing ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📋 Catch-Up Briefing Rewrite</h3>
              <p className="mb-2">
                <code className="code-inline">getCatchUpPrompt()</code> in <code className="code-inline">signals.ts</code> completely rewritten. The old prompt was a task router — it told the LLM to create cards and dispatch queue items. The new prompt produces a FVP-style phased status briefing:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-muted)]">
                <li><strong className="text-white">Phase 1:</strong> Board &amp; Queue Progress — what moved, stuck, or completed</li>
                <li><strong className="text-white">Phase 2:</strong> Inbox Triage — unread count, notable threads, replies needed</li>
                <li><strong className="text-white">Phase 3:</strong> Calendar &amp; Signals — upcoming events, deadlines, time-sensitive items</li>
                <li><strong className="text-white">Phase 4:</strong> Recommended Focus — Divi&apos;s opinion on what to tackle first</li>
              </ul>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                The <code className="code-inline">catch_up</code> action tag is now handled client-side: fires <code className="code-inline">sync_signal</code> in the background, waits 1.5s for data freshness, then sends the briefing prompt to the LLM. Onboarding &quot;Run Your First Catch-Up&quot; now uses <code className="code-inline">catch_up</code> instead of <code className="code-inline">sync_signal</code>.
              </p>
            </div>

            {/* ── Activity Feed v2 ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📊 Activity Feed v2</h3>
              <p className="mb-2">
                Activity stream replaced static tabs with a dropdown checkbox filter supporting 10 categories:
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                Queue · Board · CRM · Calendar · Goals · Comms · Connections · Drive · Settings · Sync
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Multiple categories can be selected simultaneously. Badge count shows active filter count. New activity logging added for: settings changes, Google connections, action tag executions, sync completions, checklist completions/unchecks.
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                API: <code className="code-inline">GET /api/activity?categories=board,queue,sync</code> — comma-separated category filter parameter.
              </p>
            </div>

            {/* ── Bug Fixes ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🐛 Bug Fixes (v1.9.0 → v1.9.1)</h3>
              <ul className="list-disc pl-5 space-y-2 text-xs text-[var(--text-muted)]">
                <li><strong className="text-white">NOW panel stale after chat actions</strong> — fixed with <code className="code-inline">dividen:now-refresh</code> event + <code className="code-inline">refreshKey</code> prop</li>
                <li><strong className="text-white">Catch-up execution produced no output</strong> — was wired to <code className="code-inline">sync_signal</code> (sync only), now uses two-step <code className="code-inline">catch_up</code> flow (sync + brief)</li>
                <li><strong className="text-white"><code className="code-inline">/api/inbox</code> and <code className="code-inline">/api/drive</code> 404s</strong> — badge count endpoints were missing entirely. Added both — query EmailMessage and Document respectively</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 14, 2026 — v1.8.1 FEDERATION CAPABILITIES + DEV PROFILES    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.8.1" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 14, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.8.1</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Federation v2</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Developer Profiles</span>
            <DocDownloadButton containerId="release-v1.8.1" filename="dividen-release-v1.8.1" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Federation Capabilities, Federated Developer Profiles, Onboarding Overhaul & Approval Hardening</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Covers v1.6.1 → v1.6.2 → v1.7.0 → v1.8.0 → v1.8.1</p>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* ── v1.8.0 / v1.8.1 — Federation Capabilities + Dev Profiles ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🌐 Federation Capabilities Endpoint (v1.8.0)</h3>
              <p className="mb-2">
                Federated instances can now sync <strong className="text-white">capabilities</strong> to DiviDen&apos;s managed marketplace — not just agents.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">POST /api/v2/federation/capabilities</code> — sync capabilities from a federated instance (max 50 per call). Accepts <code className="code-inline">promptGroup</code>, <code className="code-inline">signalPatterns</code>, <code className="code-inline">tokenEstimate</code>, <code className="code-inline">alwaysLoad</code>.</li>
                <li><code className="code-inline">GET /api/v2/federation/capabilities</code> — list capabilities currently synced from your instance.</li>
                <li>Schema: added <code className="code-inline">promptGroup</code>, <code className="code-inline">sourceInstanceId</code>, <code className="code-inline">sourceInstanceUrl</code>, <code className="code-inline">remoteCapabilityId</code> to <code className="code-inline">MarketplaceCapability</code>.</li>
                <li>All capability submissions enter <code className="code-inline">pending_review</code> — no auto-approve, even for trusted instances.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">👤 Federated Developer Profiles (v1.8.0)</h3>
              <p className="mb-2">
                Federated developers (people who build agents on other DiviDen instances) now have a presence on the managed platform.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>New page: <code className="code-inline">/developer/{'{slug}'}</code> — shows developer name, purple <span className="text-purple-400">🌐 Federated via {'{instance}'}</span> badge, all their agents and capabilities on DiviDen.</li>
                <li>Developer name links: <strong className="text-purple-400">federated agents → /developer/{'{slug}'}</strong> (purple), <strong className="text-brand-400">platform agents → /profile/{'{userId}'}</strong> (brand).</li>
                <li>Applied across Marketplace browse, Marketplace detail, Discover agents, Global Search, Directory, and Connections.</li>
                <li>Federated developers appear as <code className="code-inline">person</code> results in search and as <code className="code-inline">federated_developer</code> entries in the directory.</li>
                <li>Connections view shows &quot;View Profile →&quot; instead of &quot;Connect&quot; for federated developers.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">🔧 Price &amp; Access Password Fix (v1.8.1)</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Federation agent sync now accepts price from <code className="code-inline">pricePerTask</code>, <code className="code-inline">pricingAmount</code>, or <code className="code-inline">price</code> — with string→float coercion.</li>
                <li><code className="code-inline">accessPassword</code> now passes through federation agent sync (was silently dropped before). Users on DiviDen can unlock agents using developer-shared passwords.</li>
                <li>Sync response echoes back <code className="code-inline">pricePerTask</code> and <code className="code-inline">pricingModel</code> for debugging.</li>
              </ul>
            </div>

            {/* ── v1.7.0 — FVP Spec Federation Alignment ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🤝 Federation Naming Alignment (v1.7.0)</h3>
              <p className="mb-2">
                Canonical naming conventions established for the federation protocol — instances sending agents and capabilities should use these values:
              </p>
              <div className="bg-black/20 rounded-lg border border-white/[0.06] overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-3 text-white font-bold">Legacy / Alias</th>
                      <th className="text-left p-3 text-white font-bold">DiviDen Canonical</th>
                      <th className="text-left p-3 text-white font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="p-3"><code className="code-inline">per_execution</code></td>
                      <td className="p-3 text-brand-400"><code className="code-inline">per_task</code></td>
                      <td className="p-3">Both accepted, stored as per_task</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">pending_approval</code></td>
                      <td className="p-3 text-brand-400"><code className="code-inline">pending_review</code></td>
                      <td className="p-3">Canonical status for all submissions</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">pricingAmount</code></td>
                      <td className="p-3 text-brand-400"><code className="code-inline">pricePerTask</code></td>
                      <td className="p-3">Alias accepted and mapped automatically</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">currency</code> field supported (ISO 4217, default <code className="code-inline">USD</code>).</li>
                <li>Top-level <code className="code-inline">status: &apos;pending_review&apos;</code> added to federation sync response.</li>
                <li>Trusted-instance auto-approve <strong className="text-red-400">removed</strong> — all submissions always enter <code className="code-inline">pending_review</code>.</li>
                <li>Developer attribution: just <code className="code-inline">developerName</code> + <code className="code-inline">developerUrl</code>. No bio, title, company, or industry fields.</li>
                <li>Nested <code className="code-inline">capabilities</code> object parsed on agent submissions (<code className="code-inline">identity</code>, <code className="code-inline">taskTypes</code>, <code className="code-inline">contextInstructions</code>).</li>
              </ul>
            </div>

            {/* ── v1.6.2 — Review & Approval Hardening ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">✅ Review &amp; Approval Hardening (v1.6.2)</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Agent approval now records <code className="code-inline">reviewedAt</code>, <code className="code-inline">reviewedById</code>, <code className="code-inline">reviewNotes</code> in the database — full audit trail.</li>
                <li>Admin notification via <code className="code-inline">ActivityLog</code> when marketplace agents or capabilities are submitted for review.</li>
                <li>Developer notification via <code className="code-inline">ActivityLog</code> on approval, rejection, or suspension.</li>
                <li>Schema additions: <code className="code-inline">reviewedAt</code>, <code className="code-inline">reviewedById</code>, <code className="code-inline">reviewNotes</code> on both <code className="code-inline">MarketplaceAgent</code> and <code className="code-inline">MarketplaceCapability</code>.</li>
              </ul>
            </div>

            {/* ── v1.6.1 — CapabilityModule Phase 2 ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🧩 CapabilityModule Phase 2 (v1.6.1)</h3>
              <p className="mb-2">
                Phase 2 of the modular capability system — marketplace capabilities are now data-driven modules that integrate with the relevance engine.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Formal <code className="code-inline">CapabilityModule</code> interface in <code className="code-inline">src/lib/capability-module.ts</code> — scoring, loading, prompt injection.</li>
                <li><code className="code-inline">scoreCapabilityModule()</code> uses same weights as static groups — message match (+0.6), context match (+0.3), baseline (+0.05), threshold (0.3).</li>
                <li><code className="code-inline">loadRelevantCapabilityModules(userId, message, context)</code> fetches installed caps, scores them, returns only those above threshold.</li>
                <li>System prompt: dynamic capability modules injected as Group 14 — each module scored independently.</li>
                <li>Schema: <code className="code-inline">signalPatterns</code>, <code className="code-inline">tokenEstimate</code>, <code className="code-inline">alwaysLoad</code>, <code className="code-inline">moduleVersion</code>, revenue tracking fields on <code className="code-inline">MarketplaceCapability</code>.</li>
                <li><strong className="text-brand-400">97/3 revenue split</strong> on paid capability purchases (same as agents) via <code className="code-inline">calculateRevenueSplit()</code>.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 New APIs (v1.6.1)</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">GET /api/v2/prompt-groups</code> — exposes all 17 static prompt groups, signal patterns, scoring params, and the CapabilityModule spec. For federation alignment.</li>
                <li><code className="code-inline">POST /api/marketplace/webhook</code> — receives <code className="code-inline">agent_approval</code> events from the managed marketplace. Validates <code className="code-inline">X-Federation-Token</code>.</li>
              </ul>
            </div>

            {/* ── Onboarding Overhaul (across v1.6.1–v1.7.0) ── */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🎓 Onboarding Overhaul</h3>
              <p className="mb-2">
                Complete rewrite of how new users get set up — project-based, conversational, and non-blocking.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Onboarding project (&quot;DiviDen Setup&quot;) now created at <strong className="text-white">signup time</strong>, not after first chat message.</li>
                <li>Setup tasks appear in the NOW panel immediately — no due dates, just a checklist.</li>
                <li>Divi walks through setup <strong className="text-white">conversationally</strong>: completes a task → asks &quot;Next up is X. Want to knock that out now?&quot; → user confirms → renders the appropriate widget.</li>
                <li>Legacy onboarding phases (0-5) fully removed from system prompt. <code className="code-inline">onboardingPhase</code> field still exists but is no longer read.</li>
                <li>Manual &quot;Cortex Scan&quot; button added to kanban board for on-demand board analysis.</li>
              </ul>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 15, 2026 — v1.6.0 MODULAR CAPABILITY SYSTEM PROMPT          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.6.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 15, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.6.0</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Modular Capabilities</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Token Optimization</span>
          
            <DocDownloadButton containerId="release-v1.6.0" filename="dividen-release-v1.6.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Modular Capability System — Divi Gets a Lighter Brain</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Problem */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🧠 The Problem</h3>
              <p>
                The monolithic <code className="code-inline">buildCapabilitiesAndSyntax()</code> function dumped 7,219 tokens into every
                single message — triage protocol, routing logic, federation commands, marketplace operations — regardless of what the user
                actually asked. &quot;Good morning&quot; got the same payload as &quot;run my triage catch-up.&quot;
              </p>
            </div>

            {/* Architecture */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📦 Capabilities as Installed Modules</h3>
              <p className="mb-3">
                The monolith is now split into 5 purpose-built functions. Only <code className="code-inline">capabilities_core</code> loads
                on every message. The rest load on-demand based on relevance scoring:
              </p>
              <div className="bg-black/20 rounded-lg border border-white/[0.06] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-3 text-white font-bold">Module</th>
                      <th className="text-right p-3 text-white font-bold">Tokens</th>
                      <th className="text-left p-3 text-white font-bold">Loads When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="p-3"><code className="code-inline">capabilities_core</code></td>
                      <td className="p-3 text-right text-brand-400 font-mono">~3,200</td>
                      <td className="p-3">Always — Card CRUD, checklists, people, queue, goals, widgets, Linked Kards, task awareness</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">capabilities_triage</code></td>
                      <td className="p-3 text-right font-mono">~1,200</td>
                      <td className="p-3">Triage, catch-up, morning briefing, signal processing</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">capabilities_routing</code></td>
                      <td className="p-3 text-right font-mono">~800</td>
                      <td className="p-3">Task routing, delegation, relay, connection handling</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">capabilities_federation</code></td>
                      <td className="p-3 text-right font-mono">~200</td>
                      <td className="p-3">Cross-instance resolution, serendipity, network briefing</td>
                    </tr>
                    <tr>
                      <td className="p-3"><code className="code-inline">capabilities_marketplace</code></td>
                      <td className="p-3 text-right font-mono">~200</td>
                      <td className="p-3">Agent listing, install/uninstall, subscribe, execute</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Relevance Engine */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🎯 Relevance Engine</h3>
              <p className="mb-2">
                <code className="code-inline">selectRelevantGroups()</code> now manages 17 prompt groups (up from 13).
                Each group has regex signal patterns in <code className="code-inline">SIGNAL_PATTERNS</code>. The engine scores
                each module against the current message + recent context. Groups with empty patterns
                (like <code className="code-inline">capabilities_core</code>) always score 1.0.
              </p>
              <p>
                Assembly wires modules as groups 7 (core), 7b (triage), 7c (routing), 7d (federation), 7e (marketplace).
              </p>
            </div>

            {/* Cleanup */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🗑️ What Got Killed</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-white">Legacy onboarding phases 0-5</strong> — removed entirely from system prompt. Project-based onboarding is the only path.</li>
                <li><strong className="text-white">Duplicate Federation Intelligence</strong> — same block was injected twice. Fixed.</li>
                <li><strong className="text-white">Dead <code className="code-inline">layer16_platformSetupAssistant_optimized</code></strong> — 130-line function defined but never called. Gone.</li>
                <li><strong className="text-white">Settings hint bloat</strong> — ~1,200 tokens on both setup paths. Now: widget syntax in core, setup-complete is ~200 tokens.</li>
              </ul>
            </div>

            {/* Impact */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📉 Token Savings</h3>
              <p>
                <strong className="text-brand-400">~5,000-6,000 tokens saved per typical message</strong> (non-triage, non-routing).
                That&apos;s roughly 30% of the old always-on payload. Triage messages still get the full protocol — loaded on-demand
                instead of wasting context window when you&apos;re talking about something else.
              </p>
            </div>

            {/* Phase 2 */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔮 Phase 2 — Shipped in v1.6.1</h3>
              <p>
                Phase 2 is now live: a formal <code className="code-inline">CapabilityModule</code> interface where marketplace capabilities are data-driven,
                per-user installable modules that integrate with the relevance engine. See <strong className="text-brand-400">v1.8.1 release notes</strong> above for details.
              </p>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 14, 2026 — v1.5.0 CARD ACTIVITY FEEDS, CROSS-USER MIRRORING */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.5.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 14, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.5.0</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Card Activity Feeds</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Cross-User Mirroring</span>
          
            <DocDownloadButton containerId="release-v1.5.0" filename="dividen-release-v1.5.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Card-Scoped Activity Feeds &amp; Cross-User Activity Mirroring</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Schema Changes */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📊 ActivityLog Schema Extension</h3>
              <p className="mb-2">The <code className="code-inline">ActivityLog</code> model gains two new fields and a composite index for card-scoped queries:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">cardId String?</code> — FK to <code className="code-inline">KanbanCard</code>. Promotes card context from metadata JSON to a queryable, indexed column.</li>
                <li><code className="code-inline">isCrossUser Boolean @default(false)</code> — Flags entries that were mirrored from a linked card owned by another user.</li>
                <li><code className="code-inline">@@index([cardId, createdAt])</code> — Composite index for fast card-scoped feed retrieval.</li>
              </ul>
            </div>

            {/* Cross-User Mirroring Engine */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔗 Cross-User Activity Mirroring</h3>
              <p className="mb-2"><code className="code-inline">mirrorActivityToLinkedCards()</code> fires automatically (fire-and-forget) when <code className="code-inline">logActivity()</code> is called with a <code className="code-inline">cardId</code>. For each <code className="code-inline">CardLink</code> pointing to a card owned by a different user, it creates a mirror <code className="code-inline">ActivityLog</code> entry:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Mirror entry has <code className="code-inline">isCrossUser: true</code></li>
                <li>Summary prefixed with <code className="code-inline">🔗</code> and the acting user&apos;s name as actor</li>
                <li>Logged on the <em>linked</em> card&apos;s ID, not the original — so it shows up in the other user&apos;s card timeline</li>
              </ul>
            </div>

            {/* Wired Call Sites */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Wired Call Sites</h3>
              <p className="mb-2">All card-related activity now writes <code className="code-inline">cardId</code>:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">POST /api/kanban</code> → <code className="code-inline">card_created</code></li>
                <li><code className="code-inline">PATCH /api/kanban/[id]</code> → <code className="code-inline">card_updated</code></li>
                <li><code className="code-inline">DELETE /api/kanban/[id]</code> → <code className="code-inline">card_deleted</code></li>
                <li><code className="code-inline">POST /api/kanban/[id]/move</code> → <code className="code-inline">card_moved</code></li>
                <li><code className="code-inline">action-tags.ts</code>: <code className="code-inline">task_completed</code>, <code className="code-inline">task_routed</code>, <code className="code-inline">task_decomposed</code></li>
                <li><code className="code-inline">card-auto-complete.ts</code>: <code className="code-inline">card_auto_completed</code></li>
              </ul>
            </div>

            {/* New Endpoint */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🆕 New Endpoint</h3>
              <p className="mb-2"><code className="code-inline">GET /api/kanban/[id]/activity</code> — Card-scoped activity feed with cursor pagination.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Auth: session (ownership verified)</li>
                <li>Query: <code className="code-inline">?limit=50&amp;cursor=&lt;id&gt;</code></li>
                <li>Returns both own and cross-user (<code className="code-inline">isCrossUser</code>) entries, ordered by <code className="code-inline">createdAt desc</code></li>
              </ul>
            </div>

            {/* UI */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🖥️ CardDetailModal — Activity Section</h3>
              <p className="mb-2">Collapsible Activity section in the card detail modal. Lazy-loads on first expand.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Own entries: 👤 (human) or 🤖 (divi) on neutral background</li>
                <li>Cross-user entries: 🔗 on brand-tinted background with border</li>
                <li>Relative timestamps (just now, 5m ago, 2h ago, 3d ago)</li>
                <li>Global activity feed (<code className="code-inline">/api/activity</code> + SSE) remains user-scoped — no cross-user bleed</li>
              </ul>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 14, 2026 — v1.4.0 TEAMS, PROJECT DELEGATION, OPEN-SOURCE BILLING */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.4.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 14, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.4.0</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Teams &amp; Invites</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">CoS Delegation: v2</span>
          
            <DocDownloadButton containerId="release-v1.4.0" filename="dividen-release-v1.4.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Teams Architecture, CoS Project Contributor Delegation, Invite Flow & Open-Source Billing Boundary</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Team Model */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">👥 Team Model & Schema</h3>
              <p className="mb-2">Teams are a grouping mechanism — a convenient way to add multiple users to a project as an organized bundled unit. CoS delegation still operates at the <code className="code-inline">ProjectMember</code> level.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>New <code className="code-inline">Team</code> model: <code className="code-inline">name</code>, <code className="code-inline">description</code>, <code className="code-inline">ownerId</code>, <code className="code-inline">originInstanceUrl</code>, <code className="code-inline">isSelfHosted</code></li>
                <li><code className="code-inline">TeamMember</code> join table with <code className="code-inline">role</code> enum: <code className="code-inline">OWNER</code>, <code className="code-inline">ADMIN</code>, <code className="code-inline">MEMBER</code></li>
                <li><code className="code-inline">TeamProject</code> join table links teams → projects, auto-syncs members to <code className="code-inline">ProjectMember</code></li>
                <li><code className="code-inline">originInstanceUrl</code> tracks which DiviDen instance the team was created on — drives billing boundary</li>
                <li>Full CRUD: <code className="code-inline">/api/v2/teams</code> (GET, POST), <code className="code-inline">/api/v2/teams/[id]</code> (GET, PATCH, DELETE)</li>
              </ul>
            </div>

            {/* Team Invites */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">✉️ Team Invite Flow</h3>
              <p className="mb-2">Token-based invite system with email + role + expiry. Invite page at <code className="code-inline">/team/invite/[token]</code> handles acceptance for both existing and new users.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>New <code className="code-inline">TeamInvite</code> model: <code className="code-inline">email</code>, <code className="code-inline">role</code>, <code className="code-inline">token</code> (unique), <code className="code-inline">expiresAt</code>, <code className="code-inline">status</code> (PENDING / ACCEPTED / EXPIRED)</li>
                <li>API: <code className="code-inline">POST /api/v2/teams/[id]/invites</code> (create), <code className="code-inline">POST /api/v2/teams/invites/accept</code> (accept by token)</li>
                <li>Feature gate bypass: self-hosted instances skip all feature-gate checks (<code className="code-inline">isSelfHosted: true</code> → unlimited teams, invites, members)</li>
                <li>Acceptance auto-adds user as <code className="code-inline">TeamMember</code> and syncs to all <code className="code-inline">TeamProject</code> linked projects</li>
              </ul>
            </div>

            {/* CoS Project Delegation */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ CoS Project Contributor Delegation</h3>
              <p className="mb-2">When CoS dispatches a task scoped to a project, it now resolves project contributors (via team membership sync) and selects the best-fit member using strategy priority:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-blue-400">Capability match</strong> → <strong className="text-purple-400">Agent relay</strong> → <strong className="text-green-400">Generic execution</strong></li>
                <li>Team members synced to <code className="code-inline">ProjectMember</code> are first-class contributors — no separate delegation path</li>
                <li>Strategy stored in <code className="code-inline">cosExecution.delegationStrategy</code> on each queue item</li>
              </ul>
            </div>

            {/* Billing Boundary */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">💰 Billing Boundary</h3>
              <p className="mb-2">Billing follows team <em>origin</em>, not member origin. Platform-hosted teams are subject to feature gates; self-hosted teams bypass all gates.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Platform teams: feature gates enforced (member limits, invite quotas, team caps per plan tier)</li>
                <li>Self-hosted teams: <code className="code-inline">isSelfHosted: true</code> → all gates bypassed, unlimited everything</li>
                <li>Mixed membership is fine — a platform user can join a self-hosted team, inherits the team&apos;s billing rules</li>
              </ul>
            </div>

            {/* Open-Source Implementation */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔓 Open-Source Implementation Guide</h3>
              <p className="mb-2">Self-hosted DiviDen instances can implement the full teams architecture at zero cost. See the <a href="/docs/developers#teams-api" className="text-brand-400 hover:underline">Teams API reference</a> and <a href="/open-source" className="text-brand-400 hover:underline">Open Source page</a> for details.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Run Prisma migration to add Team / TeamMember / TeamProject / TeamInvite tables</li>
                <li>Set <code className="code-inline">isSelfHosted: true</code> on all team records → feature gates bypassed</li>
                <li>Set <code className="code-inline">originInstanceUrl</code> to your instance&apos;s public URL</li>
                <li>Wire invite acceptance page at <code className="code-inline">/team/invite/[token]</code></li>
                <li>Team profile pages at <code className="code-inline">/team/[id]</code>, user profiles at <code className="code-inline">/profile/[userId]</code></li>
                <li>Optional: federate teams across instances via <a href="/docs/federation" className="text-brand-400 hover:underline">federation protocol</a></li>
              </ul>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 14, 2026 — v1.3.0 QUEUE CONTROL, SMART PROMPTER, LOOP FLOWCHART */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.3.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">April 14, 2026</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Platform: v1.3.0</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Action Tags: 29+</span>
            <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Smart Prompter: v2</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">v1.3.0</span>
          
            <DocDownloadButton containerId="release-v1.3.0" filename="dividen-release-v1.3.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Queue Confirmation Gate, CoS Execution, Chat Queue Control, Smart Prompter v2 & Onboarding Auto-Heal</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Queue Confirmation Gate */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🟡 Queue Confirmation Gate</h3>
              <p className="mb-2">Nothing enters the execution queue without explicit user approval. New <code className="code-inline">pending_confirmation</code> status sits above <code className="code-inline">ready</code>.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Divi dispatches tasks as <code className="code-inline">pending_confirmation</code> — user sees ✓ Approve / ✕ Reject in Queue panel</li>
                <li>Approve → <code className="code-inline">ready</code> (enters execution pipeline). Reject → deleted</li>
                <li>Applies to <code className="code-inline">dispatch_queue</code> and <code className="code-inline">queue_capability_action</code> action tags</li>
                <li>Self-hosted bypass: <code className="code-inline">queueAutoApprove: true</code> via <code className="code-inline">PATCH /api/v2/settings</code></li>
                <li>New <code className="code-inline">User.queueAutoApprove</code> field (default: false)</li>
              </ul>
            </div>

            {/* CoS Engine */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Chief of Staff Execution Engine</h3>
              <p className="mb-2">CoS mode now proactively <em>executes</em> tasks — capability invocation, agent delegation via relay, or direct generic execution.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Sequential dispatch: pick highest-priority ready → execute → auto-dispatch next → repeat</li>
                <li>Three strategies: <strong className="text-blue-400">Capability</strong> (email, meetings), <strong className="text-purple-400">Agent Relay</strong> (connected agents), <strong className="text-green-400">Generic</strong> (Divi direct)</li>
                <li>Execution metadata stored in <code className="code-inline">cosExecution</code> on queue item</li>
                <li>CoS view redesign: ⚡ status header, &quot;Awaiting Approval&quot; stat card</li>
              </ul>
            </div>

            {/* Chat Queue Control */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">💬 Chat-Based Queue Control</h3>
              <p className="mb-2">3 new action tags let users manage queue items entirely from conversation with Divi:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">confirm_queue_item</code> — approve pending items from chat</li>
                <li><code className="code-inline">remove_queue_item</code> — delete items from chat</li>
                <li><code className="code-inline">edit_queue_item</code> — update title/description/priority, triggers Smart Prompter re-optimization</li>
                <li>Inline edit UI on QueueItemCard: ✏️ → edit form → &quot;Save &amp; Optimize&quot;</li>
                <li>System prompt updated with full confirmation flow instructions</li>
              </ul>
            </div>

            {/* Smart Prompter */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🧠 Smart Task Prompter v2</h3>
              <p className="mb-2">Agent-aware optimization engine that structures tasks for their target execution agent:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Resolves target agent&apos;s Integration Kit (taskTypes, requiredInputSchema, contextInstructions, usageExamples)</li>
                <li>Generates <code className="code-inline">displaySummary</code> (≤120 chars for queue card) + <code className="code-inline">optimizedPayload</code> (structured for agent input schema)</li>
                <li>Falls back to generic <code className="code-inline">{'{task, context, deliverables, files, constraints}'}</code> when no agent schema</li>
                <li>CoS relay dispatch sends <code className="code-inline">optimizedPayload</code> when available</li>
                <li>Queue cards show ⚡ badge when optimized payload exists</li>
              </ul>
            </div>

            {/* Chat-First Onboarding */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🎓 Chat-First Onboarding</h3>
              <p className="mb-2">Complete rewrite of the onboarding flow — no more wizard walkthrough. Divi guides through setup in chat.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>6-phase flow: Welcome → Settings → Google Connect → Platform Tour → Webhooks → Launch</li>
                <li>Interactive chat widgets for each phase (sliders, toggles, OAuth buttons, submit forms)</li>
                <li>Resume on re-login: detects current phase, regenerates if needed</li>
                <li>Settings adjustable anytime via <code className="code-inline">[[show_settings_widget]]</code> action tag</li>
              </ul>
            </div>

            {/* Onboarding Auto-Heal */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔧 Onboarding Auto-Heal</h3>
              <p className="mb-2">Fixed a critical bug where users stuck in mid-onboarding (phases 1–5) had their queue, NOW panel, and Divi context blocked.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Dashboard detects stuck phase + existing data → auto-completes onboarding</li>
                <li>QueuePanel and NowPanel always show real data regardless of onboarding state</li>
                <li>System prompt only injects onboarding context when user genuinely has no data</li>
                <li><code className="code-inline">PUT /api/settings</code> now supports <code className="code-inline">onboardingPhase</code> updates directly</li>
              </ul>
            </div>

            {/* v2 APIs */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 New v2 API Endpoints</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">POST /api/v2/queue/{'{id}'}/confirm</code> — approve/reject pending items (Bearer auth)</li>
                <li><code className="code-inline">GET /api/v2/settings</code> — read mode, queueAutoApprove, diviName, goalsEnabled</li>
                <li><code className="code-inline">PATCH /api/v2/settings</code> — update mode + queue behavior. CoS auto-dispatches on switch.</li>
                <li>OpenAPI spec updated with all new endpoints and <code className="code-inline">pending_confirmation</code> status</li>
              </ul>
            </div>

            {/* HowItWorks Loop */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔄 Landing: HowItWorks Loop Redesign</h3>
              <p className="mb-2">Flowchart redesigned from linear (1→5) to continuous loop architecture reflecting the actual system:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Step 1 (Signals) = entry point feeding into loop of 2→3→4→5→back to 2</li>
                <li>Desktop: clockwise rectangular layout with animated arrows in all 4 directions</li>
                <li>Mobile: vertical stack with loop container and SVG loop-back animation</li>
                <li>Auto-play now cycles 1→2→3→4→5→2→3→4→5→... matching the loop</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 13, 2026 — FEDERATION PRICING + ADMIN EXPANSION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.2.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">April 13, 2026</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Platform: v1.2.0</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Federation API: v2.1</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Agent Card: v0.5</span>
          
            <DocDownloadButton containerId="release-v1.2.0" filename="dividen-release-v1.2.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading">Federation Pricing, Admin Marketplace & UX Improvements</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Dynamic Pricing */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">💰 Tiered & Dynamic Pricing</h3>
              <p className="mb-2">Marketplace agents now support four pricing models — from free through dynamic, agent-quoted pricing.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-white">Pricing models:</strong> <code className="code-inline">free</code>, <code className="code-inline">per_task</code>, <code className="code-inline">tiered</code>, and <code className="code-inline">dynamic</code></li>
                <li><strong className="text-white">Tiered pricing:</strong> Volume-based rate tiers — price resolved by cumulative task count</li>
                <li><strong className="text-white">Dynamic pricing:</strong> Agent returns a price quote mid-execution → checkout widget rendered in chat → user approves or declines before any charge</li>
                <li>Two-phase execution model: <code className="code-inline">immediate → quoted → approved / declined</code></li>
                <li>New <code className="code-inline">MarketplaceExecution</code> fields: <code className="code-inline">pricingPhase</code>, <code className="code-inline">quoteAmount</code>, <code className="code-inline">quoteCurrency</code>, <code className="code-inline">quoteMetadata</code>, <code className="code-inline">quotedAt</code>, <code className="code-inline">approvedAt</code></li>
                <li>Pricing utility library: <code className="code-inline">parsePricingConfig</code>, <code className="code-inline">serializePricingConfig</code>, <code className="code-inline">resolveExecutionPrice</code></li>
              </ul>
            </div>

            {/* Quote Approval */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">✅ Quote Approval Flow</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>New <code className="code-inline">POST /api/marketplace/:id/execute/:executionId</code> — approve or decline a quoted price</li>
                <li>Approve triggers Stripe charge and updates revenue accumulators</li>
                <li>Decline sets <code className="code-inline">pricingPhase: &apos;declined&apos;</code> with no charge</li>
                <li><code className="code-inline">GET .../:executionId</code> returns full execution status including quote details</li>
                <li>Chat widget <code className="code-inline">onAction</code> handler wired for <code className="code-inline">purchase</code> / <code className="code-inline">decline</code> actions</li>
              </ul>
            </div>

            {/* Federation Agents Expanded */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🌐 Federation Agent Sync — Full Config</h3>
              <p className="mb-2">The agent sync endpoints now accept comprehensive configuration during registration.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-white">Pricing config:</strong> <code className="code-inline">pricingModel</code>, <code className="code-inline">pricingConfig</code> object (tiers, min/max for dynamic), <code className="code-inline">pricePerTask</code>, <code className="code-inline">subscriptionPrice</code>, <code className="code-inline">taskLimit</code></li>
                <li><strong className="text-white">Integration kit:</strong> <code className="code-inline">taskTypes</code>, <code className="code-inline">contextInstructions</code>, <code className="code-inline">requiredInputSchema</code>, <code className="code-inline">outputSchema</code>, <code className="code-inline">usageExamples</code>, <code className="code-inline">executionNotes</code></li>
                <li><strong className="text-white">Display:</strong> <code className="code-inline">installGuide</code>, <code className="code-inline">commands</code>, <code className="code-inline">samplePrompts</code>, <code className="code-inline">version</code>, <code className="code-inline">agentCardUrl</code></li>
                <li><strong className="text-white">Protocol flags:</strong> <code className="code-inline">supportsA2A</code>, <code className="code-inline">supportsMCP</code></li>
              </ul>
            </div>

            {/* Single Agent Endpoint */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔗 Single Agent Register / Update / Delete</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">PUT /api/v2/federation/agents/:remoteId</code> — register or update a single agent (upsert)</li>
                <li><code className="code-inline">GET /api/v2/federation/agents/:remoteId</code> — retrieve agent details + revenue stats</li>
                <li><code className="code-inline">DELETE /api/v2/federation/agents/:remoteId</code> — remove agent, cascade-delete subscriptions and executions</li>
                <li>Slug conflict returns <code className="code-inline">409</code> with actionable error</li>
              </ul>
            </div>

            {/* Admin Marketplace */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🛠️ Admin Marketplace Expansion</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Admin MarketplaceTab rewritten with 4 sub-tabs: <strong className="text-white">Agents</strong>, <strong className="text-white">Capabilities</strong>, <strong className="text-white">+ Capability</strong>, <strong className="text-white">+ Agent</strong></li>
                <li>Publisher attribution: <code className="code-inline">publisherName</code>, <code className="code-inline">publisherType</code> (platform / community / partner), <code className="code-inline">publisherUrl</code></li>
                <li>Approval workflow: <code className="code-inline">approvalStatus</code> (pending / approved / rejected) with admin PATCH control</li>
                <li>8 new Agent Skills capabilities seeded (<code className="code-inline">skillFormat: true</code>, source: agentskills.io)</li>
                <li>Capabilities and Agents APIs unified to Bearer auth</li>
                <li>User capability submission with approval flow</li>
              </ul>
            </div>

            {/* Marketplace UI */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🎨 Marketplace UI Updates</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Agent pricing badges: <code className="code-inline">free</code> (emerald), <code className="code-inline">per_task</code> (amber), <code className="code-inline">subscription</code> (purple), <code className="code-inline">tiered</code> (blue), <code className="code-inline">dynamic</code> (pink)</li>
                <li>Tiered pricing display: &quot;From $X/task&quot;</li>
                <li>Dynamic pricing display: &quot;~$min–$max/task&quot; or &quot;Dynamic&quot;</li>
                <li>Capability cards show publisher name and skill badges</li>
              </ul>
            </div>

            {/* UX Improvements */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚙️ UX Improvements</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-white">Smart Task Assembly:</strong> Multi-step wizard replaces simple add-item form — define task type, objective, priority, context, expected outcome</li>
                <li><strong className="text-white">Inbox → Email:</strong> Tab renamed across CenterPanel, keyboard nav, and global search</li>
                <li><strong className="text-white">Settings resilience:</strong> Profile, Relay, and Divi settings panels now retry on load failure</li>
                <li><strong className="text-white">Network Auto-Connect:</strong> <code className="code-inline">/api/network/status</code> endpoint; FederationManager triggers automatic registration check</li>
              </ul>
            </div>

            {/* v2 Docs */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 API Documentation</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>OpenAPI spec updated with full <code className="code-inline">/federation/agents</code> batch and single-agent endpoints</li>
                <li>Request/response schemas include <code className="code-inline">pricingConfig</code>, integration kit fields, and protocol flags</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 13, 2026 — CAPABILITIES MARKETPLACE RELEASE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.1.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">April 13, 2026</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Platform: v1.1.0</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">MCP Server: v1.6</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Agent Card: v0.5</span>
          
            <DocDownloadButton containerId="release-v1.1.0" filename="dividen-release-v1.1.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading text-[var(--text-secondary)]">Capabilities Marketplace, Queue Gating & Integration-Gated Installs</h2>

          <div className="space-y-6 text-sm text-[var(--text-secondary)]">

            {/* Capabilities Marketplace */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚡ Capabilities Marketplace</h3>
              <p className="mb-2">A new system for discovering, installing, customizing, and creating skill packs that extend what Divi can do for you.</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>20 pre-seeded capabilities across productivity, communication, finance, HR, operations, and sales</li>
                <li>Browse by category, search, or filter by installed — all from the <strong className="text-white">⚡ Capabilities</strong> tab</li>
                <li>Each capability has a <strong className="text-white">prompt template</strong> with <strong className="text-white">editable fields</strong> — customize behavior per-user after install</li>
                <li>Capabilities inject resolved prompts into Divi&apos;s system context — Divi automatically uses them</li>
                <li>Create your own capabilities: name, description, prompt, editable fields, integration type, pricing</li>
                <li>Custom capabilities auto-install for the creator and appear in the marketplace for all users</li>
              </ul>
            </div>

            {/* Integration Gating */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔐 Integration-Gated Installs</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Capabilities tied to a specific integration (email, calendar, slack, CRM, etc.) <strong className="text-white">require</strong> that integration to be connected before install</li>
                <li>Browse API returns <code className="code-inline">integrationConnected</code> boolean per capability</li>
                <li>UI shows 🔒 lock badge on capabilities where the required integration isn&apos;t connected</li>
                <li>Install attempts without the integration return <code className="code-inline">422 INTEGRATION_REQUIRED</code> with actionable error message</li>
                <li>Broad capabilities (<code className="code-inline">integrationType: null</code>) install without restriction</li>
              </ul>
            </div>

            {/* Queue Gating */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🚦 Queue Gating System</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Before dispatching a task to the queue, the system checks if the user has a handler (installed agent, active capability, or built-in capability)</li>
                <li>If no handler exists, task is blocked and Divi suggests relevant marketplace capabilities via <code className="code-inline">[[suggest_marketplace:...]]</code></li>
                <li>Inline marketplace suggestion cards render in chat with icon, name, description, and Install button</li>
                <li>Smart scoring ranks marketplace suggestions by relevance to the blocked task</li>
              </ul>
            </div>

            {/* Pricing Enforcement */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">💰 Pricing Enforcement</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Capabilities support <strong className="text-white">free</strong> or <strong className="text-white">one-time purchase</strong> pricing only</li>
                <li>Subscription pricing model is rejected at both create and install time</li>
                <li>All 20 seeded capabilities are free</li>
              </ul>
            </div>

            {/* Capabilities API */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">📡 Capabilities API</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">GET /api/marketplace-capabilities</code> — Browse all or installed only (<code className="code-inline">?installed=true</code>)</li>
                <li><code className="code-inline">POST /api/marketplace-capabilities</code> — Install capability (with integration gating) or create custom (<code className="code-inline">action: &apos;create&apos;</code>)</li>
                <li><code className="code-inline">GET /api/marketplace-capabilities/:id</code> — Detail view (prompt hidden until installed)</li>
                <li><code className="code-inline">PATCH /api/marketplace-capabilities/:id</code> — Update customizations, resolves prompt template</li>
                <li><code className="code-inline">DELETE /api/marketplace-capabilities/:id</code> — Uninstall capability</li>
              </ul>
            </div>

            {/* Schema */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🗃️ New Database Models</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">MarketplaceCapability</code> — name, slug, description, icon, category, tags, integrationType, pricingModel, price, editableFields (JSON), prompt, promptVersion, status, featured, totalPurchases, avgRating, isSystemSeed</li>
                <li><code className="code-inline">UserCapability</code> — userId, capabilityId, status, customizations (JSON), resolvedPrompt, installedAt, lastUsedAt</li>
              </ul>
            </div>

            {/* Admin Key Reset */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🔑 Admin Instance Key Reset</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Admin Instances tab now supports resetting API keys for federated instances</li>
                <li>PATCH endpoint accepts <code className="code-inline">apiKey</code> and <code className="code-inline">name</code> fields</li>
                <li>Resolves &quot;API key mismatch&quot; errors during re-registration without deleting the instance</li>
              </ul>
            </div>

            {/* Agent Card Fix */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">🛡️ Agent Card Resilience</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="code-inline">/.well-known/agent-card.json</code> no longer returns 500 when the federation config table is empty</li>
                <li>Added try/catch fallback with sensible defaults for new or unconfigured instances</li>
              </ul>
            </div>

            {/* Settings Link */}
            <div>
              <h3 className="text-base font-bold text-white mb-2">⚙️ Other Changes</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Settings → Integrations now shows a &quot;⚡ Capabilities&quot; quick link that opens the marketplace</li>
                <li>System prompt Layer 16 updated with capability discovery guidance</li>
                <li><code className="code-inline">dispatch_queue</code> action tag now queue-gated — fails if no handler available</li>
                <li><code className="code-inline">suggest_marketplace</code> action tag for inline capability suggestions in chat</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APRIL 12-13, 2026 RELEASE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div id="release-v1.0.0" className="mb-16 p-6 bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl opacity-80">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">April 12–13, 2026</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">MCP Server: v1.5</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">Agent Card: v0.4</span>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">A2A: v0.4</span>
          
            <DocDownloadButton containerId="release-v1.0.0" filename="dividen-release-v1.0.0" variant="icon" />
          </div>
          <h2 className="text-2xl font-bold mb-4 font-heading text-[var(--text-secondary)]">Federation v2, Multi-Account Sync, Admin Expansion</h2>

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
              <li>• Agent card version → <code className="code-inline">0.5.0</code></li>
              <li>• MCP server version → <code className="code-inline">1.6.0</code></li>
              <li>• <code className="code-inline">tools/list</code> → 22 static tools + dynamic marketplace tools</li>
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

        {/* Download full page */}
        <DocFooterDownload containerId="" filename="dividen-release-notes-all" lastUpdated="April 16, 2026" />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center" data-no-download>
          <p className="text-xs text-[var(--text-muted)]">
            DiviDen Command Center — Last updated April 17, 2026
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
