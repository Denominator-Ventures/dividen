/**
 * DiviDen Updates / Changelog
 * 
 * Each update is a timestamped entry written in founder voice.
 * Add new entries to the top of the array.
 */

export interface Update {
  id: string;
  date: string;         // ISO date string (YYYY-MM-DD)
  time?: string;        // Time string for display, e.g. "2:30 PM" — optional for backwards compat
  title: string;
  subtitle?: string;
  tags: string[];
  content: string;      // Markdown-ish content (rendered with basic formatting)
}

export const UPDATES: Update[] = [
  {
    id: 'approval-pipeline-inbox-zero-ambient-learning-v1-9-4',
    date: '2026-04-15',
    time: '11:30 PM',
    title: 'Approval Pipeline Fixed, Inbox Zero Ships & The Learning Loop Closes',
    subtitle: 'Agents that change get re-reviewed. The queue now auto-categorizes and batch-processes. Divi learns how you work and adapts.',
    tags: ['approval', 'inbox-zero', 'ambient-learning', 'bubble-store', 'v1.9.4'],
    content: `v1.9.4. Infrastructure sprint — three systems that needed to be tighter.

## Agent Approval Pipeline — Material Changes Trigger Re-Review

There was a bug. If a federated agent was already active on the Bubble Store and the developer pushed an update — new description, new pricing, new endpoint — the update went through without re-review. The agent stayed active. No one checked the changes.

That's fixed. The federation agents route now compares 10 material fields on every update (description, endpoint URL, pricing model, price, task types, context instructions, input/output schemas, category, long description). If anything material changed and the agent was active, it flips to \`pending_review\`, auto-increments the patch version, and appends a changelog entry with a field-by-field diff. Admin gets an ActivityLog notification.

Meanwhile, the developer can still use their own agent — and existing subscribers keep access. We're not punishing anyone for iterating. But changes get eyes before they reach new users.

The detail view now shows version history with expandable diffs. Red/green inline, every change tracked.

## Inbox Zero — The Queue Gets Smarter

The queue panel was a flat list. Everything looked the same — tasks, notifications, relay responses, FYI items. You had to read each one to know what it was, and process them one at a time.

Three changes:

**Auto-categorization.** Every queue item now gets classified into one of five categories — action, notification, relay, FYI, or task — based on type, metadata, source, and priority. Each item shows a colored category badge. You can see what needs attention vs. what's informational without reading anything.

**Batch mode.** Toggle it on, checkboxes appear. Select items individually or by category. "Complete All" and "Snooze All" in one click. When you have 2+ notification/FYI items, a "Clear N notifications" shortcut appears — one click to sweep them all.

**Inbox Zero state.** When the queue is empty, you see it: "🎯 Inbox Zero — Nothing pending. You're completely caught up." Because you should know when you're done.

## The Ambient Learning Loop Closes

This is the one I'm most interested in. The pieces were there — BehaviorSignals captured every action you took in the dashboard. UserLearnings existed as a model. The system prompt loaded both. But nothing connected signals to learnings. You'd accumulate hundreds of behavior signals and Divi would never do anything with them.

Now it does. \`synthesizeBehaviorLearnings\` clusters your BehaviorSignal history and extracts patterns:

- **Schedule patterns** — your peak productivity hours and busiest days
- **Workflow style** — whether you're conversation-driven, queue-driven, or balanced
- **Decision speed** — how fast you act on items (quick decider vs. deliberate reviewer)
- **Capability usage** — which Bubble Store agents you actually use, and how often
- **Queue triage habits** — your complete-vs-snooze ratio

These write to UserLearning, which feeds directly into the system prompt. Divi adapts — it knows when you're most active, how you prefer to work, what tools you reach for.

High-confidence learnings surface as queue suggestions: "🧬 3 new patterns detected" with a link to Settings → Learnings. You can confirm or dismiss.

Synthesis runs automatically after every 25th behavior signal, or manually via \`/api/ambient-learning/synthesize\`. The loop: signals → patterns → prompt → better agent behavior → better signals.

This is how Divi stops being a static assistant and starts being yours.

- Jon`,
  },
  {
    id: 'interactive-widgets-devkit-bubble-store-v1-9-3',
    date: '2026-04-15',
    time: '6:45 PM',
    title: 'Interactive Widgets Go Live, Developer Kit Ships & Welcome to the Bubble Store',
    subtitle: 'Agents can now send interactive widgets through comms. The developer documentation covers everything you need to build on DiviDen. And the marketplace has a name.',
    tags: ['widgets', 'developer-kit', 'bubble-store', 'federation', 'v1.9.3'],
    content: `v1.9.3. Three things worth talking about.

## Interactive Widgets — Agents Can Now Ask You Things

This is the piece that makes agent-to-agent communication actually useful. Before today, when a remote agent sent you a task through comms, you got a text description. Maybe a title and a body. You'd read it, figure out what it was asking, and type a reply. That's email with extra steps.

Now agents can send **interactive widgets** alongside tasks. Choice cards with approve/decline buttons. Configuration sliders. Multi-select options. Payment prompts. Whatever structured interaction the task requires.

The flow:

1. Remote agent sends a task via A2A \`tasks/send\` with \`metadata.widgets\` — an array of typed widget definitions
2. The widget payload propagates through the relay into your queue
3. You see the widgets rendered inline — in your queue panel, in the comms thread, wherever the task surfaces
4. You interact directly. Click approve, drag a slider, select an option
5. Your response flows back: relay updated → queue item synced → webhook fires → originating agent gets structured data back

Terminal actions (approve, decline, submit) auto-complete the task. Non-terminal actions (select, toggle, adjust) keep the conversation open.

This is what makes the Bubble Store actually work. An agent doesn't just do things for you — it can ask you things, get structured answers, and act on them. Interactive, not just informational.

## Developer Kit — Build On DiviDen

The developer documentation at \`/docs/developers\` now covers the full stack:

- **Widget Library** — 11 theme-agnostic primitives, all driven by CSS custom properties. Override \`widget-theme.css\` and the entire widget set follows your theme. No forking, no class name hunting
- **AgentWidgetData schema** — the typed contract for widget payloads. Choice cards, action lists, info cards, payment prompts — each with typed props
- **Comms → Widget Pipeline** — how to send widgets through A2A, how responses flow back, terminal vs non-terminal semantics
- **FVP Integration Notes** — concrete answers for federated instance implementers: Linked Kards sync (webhook, not polling), capability sync preconditions, BehaviorSignal taxonomy, DOM event namespacing
- **DOM Event System** — the five \`dividen:*\` events that keep the dashboard in sync, and how to add your own
- **Full API reference** — every v2 endpoint, authentication patterns, rate limits

If you're building an agent that integrates with DiviDen — whether through the Bubble Store, federation, or the open-source codebase — this is your starting point.

## Welcome to the Bubble Store

The marketplace has a name. We're calling it the **Bubble Store**.

It's where agents live. Where you discover them, install them, subscribe to them, and where they earn revenue for their developers. The infrastructure has been in place — listing, discovery, search, categories, pricing models, revenue splits, federated agent sync — but it didn't have a name that felt right.

Bubble Store captures what this is: a lightweight, organic ecosystem. Agents float up based on relevance and reputation, not SEO or ad spend. You install what you need, it integrates into your Divi's context, and it works.

The name will start showing up in the UI over the next few updates. The underlying system hasn't changed — just what we call it.

- Jon`,
  },
  {
    id: 'widget-library-comms-pipeline-v1-9-2',
    date: '2026-04-15',
    time: '1:30 PM',
    title: 'Widget Library, Comms→Widget Pipeline & Approval Notifications',
    subtitle: 'Every interactive widget is now theme-agnostic and reusable. Tasks from comms render interactive widgets inline. Federation agents get real-time approval status.',
    tags: ['widgets', 'comms', 'federation', 'onboarding', 'v1.9.2'],
    content: `Three pieces of infrastructure that were overdue. v1.9.2.

## Widget Library — Theme-Agnostic Primitives

Previously, every widget component was hardcoded with DiviDen's brand colors. Sliders had \`bg-brand-500\`, toggles had \`from-brand-500\`, text inputs had \`border-brand-500/30\`. This meant any external instance running a different theme — or anyone building on top of DiviDen's open-source widget system — had to fork and rewrite colors.

Now there's a proper widget library at \`src/components/widgets/\`:

- **WidgetSlider** — Range input with CSS custom properties for all colors
- **WidgetToggle** — Boolean toggle, themed via \`--widget-accent\`
- **WidgetRadio** — Radio group with accent ring
- **WidgetSelect** — Dropdown with themed border/focus states
- **WidgetTextInput** — Text input with themed placeholder
- **WidgetInfo** — Read-only info display
- **WidgetGoogleConnect** — OAuth button (themed independently)
- **WidgetWebhookSetup** — Webhook creation flow
- **WidgetSubmitButton / WidgetSkipButton** — Action buttons
- **AgentWidget** — Agent cards/lists/grids for marketplace and chat

Everything is driven by 18 CSS custom properties defined in \`widget-theme.css\`. Override \`--widget-bg\`, \`--widget-accent\`, \`--widget-text\`, etc., and the entire widget set follows. No class name hunting.

Onboarding dropped from 552 lines to 190 by delegating to the library. Same UX, zero brand coupling.

## Comms → Task → Widget Interactivity Pipeline

This is the wiring that was missing. Before: an inbound relay could create a task, but tasks had no mechanism to carry interactive widgets. The user saw a text description in their queue and had to figure out what to do.

Now:

1. **A2A \`tasks/send\`** accepts \`metadata.widgets\` — a remote agent can send an array of \`AgentWidgetData\` definitions with a task
2. **Relay payload** carries the widget definitions, and when linked to a queue item, widgets propagate to the queue item's \`metadata\`
3. **QueuePanel** already rendered widgets from metadata — now it also wires comm-sourced widget actions back to the originating relay via \`/api/relays/widget-response\`
4. **Comms detail page** renders interactive widgets inline in relay thread view
5. **Widget responses** update the relay's \`responsePayload\`, sync the linked queue item, and optionally forward to a \`widgetResponseUrl\` the sender specified

The response flow is: user clicks widget action → \`/api/relays/widget-response\` → relay updated → queue item synced → webhook pushed → optional callback to sender.

Terminal actions (approve, decline, submit, confirm, reject) auto-complete both the relay and the linked queue item. Non-terminal actions (select, toggle, input) move the relay to \`user_review\` status so the conversation continues.

This is what makes cross-agent capabilities actually interactive. An agent can send a task with choice cards, approval prompts, or configuration widgets — the user responds directly in comms or queue, and the originating agent gets the structured response back.

## Approval Status Notifications

Federated instances now get real-time notification when:

- Their agent is activated or deactivated (instance_status webhook event)
- Their capability is approved, rejected, or has its approval status changed (capability_approval webhook event)

Both fire to the registered \`webhookUrl\` on the source instance record, following the same pattern as existing marketplace webhooks: 10s timeout, \`X-DiviDen-Event\` header, fire-and-forget.

The receiving instance handles these in their \`/api/marketplace/webhook\` handler — two new cases: \`handleCapabilityApproval()\` and \`handleInstanceStatus()\`.

## BYOAI Onboarding — 3-Tile Provider Selection

Small but visible change. The API key onboarding step now presents three tiles:

- **Anthropic** — Direct API key, recommended
- **OpenAI** — Direct API key
- **ChatGPT Plus** — Reverse proxy, cheapest

Each tile shows the provider-specific placeholder, setup link, and instructions. Tile selection is instant — no page reload, no modal. Skip button still works for users who want to add keys later.

- Jon`,
  },
  {
    id: 'realtime-catchup-activity-v1-9',
    date: '2026-04-15',
    time: '11:59 PM',
    title: 'Realtime Dashboard, Catch-Up Rewrite & Activity Feed v2',
    subtitle: 'Every panel refreshes in realtime. Catch-up briefings actually brief. Activity feed now filterable with 10 categories. Three bug fixes that were invisible until you used the product for more than five minutes.',
    tags: ['realtime', 'catch-up', 'activity', 'bug-fixes', 'v1.9'],
    content: `Three rounds of work in one session. v1.9.0 → v1.9.1. Here's everything.

## Realtime Dashboard — v1.9.1

Every dashboard panel now refreshes instantly when something changes. Before this, you'd do something in chat — complete a task, save settings, run a sync — and the board, queue, comms, and NOW panel would sit there stale until the next poll.

Now there's a lightweight custom event system:

- \`dividen:now-refresh\` — universal trigger, every panel listens
- \`dividen:board-refresh\` — kanban board
- \`dividen:queue-refresh\` — queue panel
- \`dividen:comms-refresh\` — comms tab
- \`dividen:activity-refresh\` — activity stream

When ChatView completes an action — settings save, chat response, setup task advance — it dispatches the relevant events. Panels pick them up and re-fetch. No WebSockets, no SSE for this. Just DOM events on window. Simple, zero-infra, works.

NOW panel poll interval also dropped from 120s to 60s as a backstop.

## Catch-Up Briefing Rewrite — v1.9.1

The old catch-up prompt was broken by design. It was written as a task router: "look at inbox, create cards, dispatch queue items." Operational work that should happen later, not in a briefing.

Rewrote \`getCatchUpPrompt()\` in \`signals.ts\` to produce a proper FVP-style phased briefing:

- **Phase 1: Board & Queue Progress** — what moved, what's stuck, what completed
- **Phase 2: Inbox Triage** — unread count, notable threads, what needs replies
- **Phase 3: Calendar & Signals** — upcoming events, deadlines, anything time-sensitive
- **Phase 4: Recommended Focus** — Divi's opinion on what to tackle first

The catch-up action tag is now a two-step client-side flow: fire \`sync_signal\` in the background (so the LLM has fresh data), wait 1.5s, then send the briefing prompt. Before, \`sync_signal\` just pulled data without analyzing it. Users got a sync confirmation instead of a briefing.

The onboarding "Run Your First Catch-Up" task now uses the \`catch_up\` tag instead of \`sync_signal\`. First-time users actually see a useful briefing instead of "✅ sync complete."

## Activity Feed v2 — v1.9.1

The activity feed was tabs. Three of them: All, Board, Queue. Now it's a dropdown checkbox filter with ten categories:

Queue · Board · CRM · Calendar · Goals · Comms · Connections · Drive · Settings · Sync

Each category maps to specific action types. Select multiple categories at once. The dropdown shows a count badge when filters are active. The stream also listens for \`dividen:activity-refresh\` events for instant updates.

New activity logging was added across the codebase:
- Settings changes (mode switches, onboarding, diviSettings)
- Google account connections
- Action tag executions from chat
- Google sync completions
- Checklist item completions and unchecks

## Bug Fixes — v1.9.0 → v1.9.1

Three bugs that shipped in v1.9.0:

**NOW panel didn't refresh after chat actions.** You'd tell Divi to create a card with a due date, and the NOW panel would keep showing the old state. Fixed with the \`dividen:now-refresh\` event system and \`refreshKey\` prop.

**Catch-up execution did nothing useful.** The onboarding catch-up task was wired to \`sync_signal\`, which just synced data without producing output. Changed to \`catch_up\` which syncs then briefs.

**\`/api/inbox\` and \`/api/drive\` returned 404.** Badge count endpoints for the sidebar were missing entirely. Added both — they query EmailMessage and Document respectively.

— Jon`,
  },
  {
    id: 'federation-hardening-docs-overhaul-v1-8',
    date: '2026-04-15',
    time: '11:30 PM',
    title: 'Federation Hardening, Docs Overhaul & Downloadable Documentation',
    subtitle: 'Federation pricing and access passwords fixed. Full docs audit shipped. Every documentation page is now downloadable as .md. Big thanks to the FVP team and Jaron for their help stress-testing and spec-writing today.',
    tags: ['federation', 'documentation', 'downloads', 'approval-hardening', 'onboarding', 'release-notes'],
    content: `Massive session. Ten versions shipped since the last update (v1.6.2 through v1.8.3). Here's everything that happened and why.

## Federation Fixes — v1.8.1

Two critical bugs found during live sync testing with the FVP Command Center instance:

**Price not coming through.** When FVP synced mAInClaw with \`pricingAmount: 5.00\`, DiviDen stored \`pricePerTask: null\`. Root cause: the federation agents endpoint only accepted \`pricePerTask\` as the field name. Now it accepts three aliases — \`pricePerTask\`, \`pricingAmount\`, and \`price\` — with string-to-float coercion. The sync response echoes back what was stored so the submitting instance can verify.

**Access password silently dropped.** FVP was sending \`accessPassword: "freeme"\` in the agent sync payload, but the federation endpoint never included it in the data object. The field simply wasn't there. Users on DiviDen couldn't unlock mAInClaw for free access because the password was never stored. Fixed — \`accessPassword\` now passes through on both the create and update paths.

Both bugs were invisible — no errors, no 400s. The endpoint accepted the payload and silently lost data. That's the worst kind of bug.

## Approval Hardening — v1.6.2

The approval flow got serious. Every submission now enters \`pending_review\` — no auto-approve, even for trusted instances. This was a conscious decision: marketplace trust is earned per-agent, not per-instance.

- All federated agent submissions → \`pending_review\`
- Admin review required for every agent before it goes live
- Rejection includes a reason field in the response
- Webhook fires to the source instance on approval/rejection
- Audit trail: every approval action logged with admin ID and timestamp

If you were relying on trusted-instance auto-approve, that's gone. Every agent gets reviewed.

## Onboarding Overhaul — v1.6.2 → v1.7.0

The setup flow went from wizard to conversation:

- **Onboarding project created at signup** — no more waiting for the first chat message. "DiviDen Setup" project, card, and checklist exist the moment your account does.
- **Now panel shows setup tasks** — onboarding checklist items without due dates were being filtered out. Fixed with a parallel query.
- **Settings flow is conversational** — when you complete a setup task, Divi now tells you what's next and asks "Want to knock that out now?" Instead of auto-sending user messages, it injects assistant messages that feel natural.
- **settingsGroup bug fixed** — the settings group was never being passed through the widget, so auto-completion of setup tasks silently failed. Fixed end-to-end.

## Federation Capabilities & Developer Profiles — v1.8.0

The P3 federation milestone:

- **\`POST /api/v2/federation/capabilities\`** — New endpoint. Federated instances can now sync capabilities (not just agents) to the DiviDen marketplace. Accepts \`promptGroup\`, \`signalPatterns\`, \`tokenEstimate\`, \`alwaysLoad\`.
- **\`GET /api/v2/federation/capabilities\`** — List your synced capabilities.
- **Federated developer profiles** at \`/developer/{slug}\` — shows developer name, instance origin with a purple 🌐 badge, and all their agents + capabilities on DiviDen.
- **Developer links everywhere** — federated agents link to \`/developer/{slug}\` (purple), platform agents link to \`/profile/{userId}\` (brand). Applied across Marketplace, Discover, Search, Directory, and Connections.
- **Single-agent management** — \`PUT\`, \`GET\`, \`DELETE\` on \`/api/v2/federation/agents/{remoteId}\` for per-agent operations.

## Documentation Audit — v1.8.2

Full pass across three documentation pages:

- **\`/docs/developers\`** — Federation endpoints section rewritten. Added capability sync endpoints, single-agent CRUD, updated agent sync to document \`pricePerTask\`/\`pricingAmount\`/\`price\` aliases, \`accessPassword\`, \`currency\`, nested capabilities. Removed stale "auto-approve for trusted instances" claim.
- **\`/documentation\`** — Lifecycle flow diagram fixed (\`pending_approval\` → \`pending_review\`). Agent sync examples completely rewritten with real mAInClaw data. API reference table updated with all new v2 endpoints.
- **\`/docs/release-notes\`** — New mega release notes block covering v1.6.1 → v1.8.1. Five versions documented in one coherent entry organized by theme.

## Downloadable Documentation — v1.8.3

Every documentation page now has a **"Download as .md"** button at the bottom. Click it and you get a clean markdown file extracted directly from the page DOM — always matches the live content.

- \`/docs/developers\` → \`dividen-developer-docs.md\`
- \`/documentation\` → \`dividen-documentation.md\`
- \`/docs/federation\` → \`dividen-federation-guide.md\`
- \`/docs/integrations\` → \`dividen-integration-docs.md\`
- \`/docs/release-notes\` → \`dividen-release-notes-all.md\`

**Per-version release note downloads** — each version block in the release notes has a small download icon in its tag row. Download just that version's notes.

**"UPDATED" badges** — sections that changed in the docs audit now show amber badges on their headers so you know what's new.

## FVP Spec v1.3 — Full Alignment

The FVP team sent back their updated spec today (v1.3). We audited it against our implementation: **zero discrepancies**. Everything they documented matches what we shipped. The naming conventions, the payload shapes, the approval flow, the access password model, the developer attribution — all aligned.

Specific confirmations:
- \`pending_review\` is the canonical status (they updated from \`pending_approval\`)
- \`accessPassword\` is DiviDen-side validation (they corrected their earlier claim that it was instance-side only)
- No \`/api/v2/federation/profiles\` endpoint (they removed the reference)
- \`hasAccessPassword\` derived from \`!!accessPassword\` at query time (not stored separately)

## Thank You

Big thanks to the **FVP Command Center team** and **Jaron** specifically for their help today. The live sync testing, spec writing, and back-and-forth on the access password model caught real bugs and made the federation protocol materially better. This is what building in the open looks like — two instances finding the seams and fixing them together.

— Jon`,
  },
  {
    id: 'capability-module-phase-2',
    date: '2026-04-15',
    time: '8:00 AM',
    title: 'CapabilityModule Phase 2 — Your Capabilities, Your Signals',
    subtitle: 'Marketplace capabilities now define their own signal patterns. The relevance engine scores them independently. Plus: webhook receiver, 97/3 on capabilities, and the prompt groups API.',
    tags: ['capability-module', 'relevance-engine', 'marketplace', 'federation', 'webhooks', 'revenue'],
    content: `Phase 2 of the modular capability system is live. Four changes shipped together.

## 1. CapabilityModule Interface

Marketplace capabilities are now full prompt modules. Each capability can declare:

- **\`signalPatterns\`** — Array of regex strings. The relevance engine scores these against the current message + recent context, exactly like the 17 static groups.
- **\`tokenEstimate\`** — Declared token count for budget management.
- **\`alwaysLoad\`** — Bypass scoring, always inject into the prompt.
- **\`moduleVersion\`** — Version of the spec the capability targets (currently "1.0").

When a user installs a capability with signal patterns, it gets scored independently in the relevance engine. No more dumping all capabilities under the generic \`active_caps\` group — each module competes on its own terms.

Scoring uses the same weights: message match (+0.6), context match (+0.3), baseline (+0.05), threshold (0.3).

## 2. Relevance Engine API

\`GET /api/v2/prompt-groups\` — Now exposed for federation alignment. Returns:
- All 17 static groups with their signal patterns
- Scoring parameters (weights, thresholds, context window)
- The full CapabilityModule spec
- Dynamic module metadata

Other DiviDen instances can call this to sync their signal patterns with ours. This is how we keep relevance scoring aligned across the federation.

## 3. Marketplace Webhook Receiver

\`POST /api/marketplace/webhook\` — The missing half of agent approval webhooks. The admin side was already sending approval/rejection webhooks to federated instances, but there was no receiver. Now there is:
- Validates \`X-Federation-Token\` header
- Accepts \`agent_approval\` events
- Updates local agent status based on managed marketplace decisions
- Logs everything

## 4. 97/3 Revenue Split on Capabilities

The same revenue model that applies to marketplace agent executions now applies to paid capability purchases. When someone buys a capability:
- 97% goes to the developer
- 3% platform routing fee (network floor enforced)
- Revenue tracked on the MarketplaceCapability model: \`totalGrossRevenue\`, \`totalPlatformFees\`, \`totalDeveloperPayout\`

Password-bypassed installs and free capabilities: $0 tracked, no split.

— Jon`,
  },
  {
    id: 'modular-capability-system-prompt-v1-8',
    date: '2026-04-15',
    time: '3:00 AM',
    title: 'Modular Capability System — Divi Gets a Lighter Brain',
    subtitle: 'The system prompt is now modular. Core capabilities always load. Triage, routing, federation, and marketplace modules load on-demand by relevance. ~5K tokens saved per message.',
    tags: ['system-prompt', 'modular-capabilities', 'performance', 'relevance-engine', 'token-optimization'],
    content: `The system prompt was getting fat. One monolithic function — \`buildCapabilitiesAndSyntax\` — dumped 7,219 tokens into every single message, whether the user asked about triage or just said "good morning." That's over.

## Capabilities as Installed Modules

Every Divi now ships with a core module and loads optional modules on-demand:

| Module | Tokens | When |
|--------|--------|------|
| \`capabilities_core\` | ~3,200 | **Always** — Card CRUD, checklists, people, artifacts, queue, goals, profile/memory/setup tags, interactive widgets, Linked Kards, continuous task awareness |
| \`capabilities_triage\` | ~1,200 | Triage, catch-up, morning briefing, signal processing |
| \`capabilities_routing\` | ~800 | Task routing, delegation, relay, connection handling |
| \`capabilities_federation\` | ~200 | Cross-instance entity resolution, serendipity, network briefing |
| \`capabilities_marketplace\` | ~200 | Agent listing, install/uninstall, subscribe, execute |

The relevance engine scores each module against the current message + recent context using regex signal patterns. Only modules that score above threshold get included.

## What Got Killed

- **Legacy onboarding phases 0-5** — completely removed from the system prompt. Old-flow users figure it out; project-based onboarding is the only path now.
- **Duplicate Federation Intelligence section** — the same block was being injected twice. Fixed.
- **Dead \`layer16_platformSetupAssistant_optimized\`** — a 130-line function that was defined but never called. Gone.
- **Settings hint bloat** — \`settingsHint\` was ~1,200 tokens included on both the "configured" AND "incomplete" setup paths. Now: widget syntax lives in core, setup-incomplete path gets only task→widget mappings, setup-complete path gets a single status line (~200 tokens).

## Net Impact

**~5,000-6,000 tokens saved per typical message** (non-triage, non-routing). That's roughly 30% of the old always-on payload. Triage messages still get the full protocol — just loaded on-demand instead of wasting context window when you're talking about something else.

## Architecture

The relevance engine (\`selectRelevantGroups\`) now manages 17 prompt groups (up from 13). Each group has signal patterns in \`SIGNAL_PATTERNS\`. Groups with empty patterns (like \`capabilities_core\`) always score 1.0 and always load. The assembly section wires modules into the final prompt as groups 7 (core), 7b (triage), 7c (routing), 7d (federation), and 7e (marketplace).

This is Phase 1. Phase 2 is a formal \`CapabilityModule\` interface where modules are data-driven and per-user installable.

— Jon`,
  },
  {
    id: 'card-activity-feeds-cross-user-mirroring-v1-7',
    date: '2026-04-14',
    time: '11:59 PM',
    title: 'Card Activity Feeds & Cross-User Mirroring',
    subtitle: 'Every card now has its own activity timeline. When someone works on a linked card, both users see it — silently, locally, no pings.',
    tags: ['activity-feeds', 'card-scoped', 'cross-user', 'mirroring', 'linked-kards', 'multi-user'],
    content: `The last piece of the Linked Kards story. Cards now have their own activity feeds, and cross-user work shows up where it matters — on the card itself.

## Card-Scoped Activity Feeds

Every kanban card now has its own activity timeline. Open a card → expand the **Activity** section → see everything that's happened to this card, in order.

This isn't a filtered view of the global feed. It's a purpose-built, card-indexed feed. The \`ActivityLog\` model now has a \`cardId\` foreign key that maps entries directly to the card they belong to, with a composite index on \`[cardId, createdAt]\` for fast retrieval.

### What Gets Logged per Card

Every action that touches a card now writes \`cardId\` as a first-class column:

- **card_created** — when the card is created (kanban POST)
- **card_updated** — when title, status, priority, assignee, or description changes (kanban PATCH)
- **card_deleted** — when the card is removed (kanban DELETE)
- **card_moved** — when the card moves between columns (move endpoint)
- **task_completed** — when a checklist item is marked done (action-tags.ts)
- **task_routed** — when Divi routes a task to another user (action-tags.ts)
- **task_decomposed** — when Divi breaks a task into subtasks (action-tags.ts)
- **card_auto_completed** — when all checklist items are done and the card auto-moves to Completed

Previously, \`cardId\` was buried in the \`metadata\` JSON blob. Now it's a queryable, indexed column.

## Cross-User Activity Mirroring

This is the multi-user primitive that makes Linked Kards feel alive.

When \`logActivity()\` is called with a \`cardId\`, a background function — \`mirrorActivityToLinkedCards()\` — fires automatically. It:

1. Looks up all \`CardLink\` records for that card
2. For each linked card owned by a **different user**, creates a mirror entry on their card
3. The mirror entry has \`isCrossUser: true\`, a \`🔗\` prefix on the summary, and the acting user's name as the actor

**Example**: Sarah completes a checklist item on a card that's linked to Jon's origin card. Jon's card activity timeline shows: \`🔗 Sarah: Completed task "Research Report"\` — without Sarah's Divi needing to send a relay, without Jon being interrupted.

This is the **accumulate, don't ping** philosophy applied to activity. The data is there when you look at the card. It doesn't chase you.

## The UI

In the CardDetailModal, a new collapsible **Activity** section appears below the metadata row. Click the chevron to expand. It lazy-loads from \`GET /api/kanban/{id}/activity\` on first open.

- **Own entries** get a 👤 (human) or 🤖 (divi) icon on a neutral background
- **Cross-user entries** get a 🔗 icon with a subtle brand-tinted background and border
- Relative timestamps (just now, 5m ago, 2h ago, 3d ago)
- Cursor-based pagination, default 30 entries

## Main Activity Feed — Unchanged

The global activity stream (\`/api/activity\` and SSE stream) stays strictly user-scoped. Your feed shows your activity. Card-scoped feeds are the local surface for cross-user visibility — the global feed stays clean.

## New Schema

\`\`\`
ActivityLog {
  ...
  cardId       String?   @relation → KanbanCard
  isCrossUser  Boolean   @default(false)
  @@index([cardId, createdAt])
}
\`\`\`

## New Endpoint

\`\`\`
GET /api/kanban/{id}/activity
  Auth: session (ownership verified)
  Query: ?limit=50&cursor=<id>
  Returns: { data: ActivityEntry[], nextCursor: string | null }
\`\`\`

## What's Next

Cross-instance activity mirroring (when FVP's federated Linked Kards land), richer card timeline entries (file attachments, relay digests), and the inbox zero automation layer.

— Jon
`,
  },
  {
    id: 'cortex-daemon-linked-kards-google-connect-v1-6',
    date: '2026-04-14',
    time: '11:45 PM',
    title: 'Cortex Daemon, Linked Kards & Google Connect Widget',
    subtitle: 'Your board now cleans itself on autopilot. Cards link across users. And connecting Google is now a one-click button in chat.',
    tags: ['cortex', 'daemon', 'linked-kards', 'google-connect', 'multi-user', 'cross-user'],
    content: `Sprint 2 shipped. Three features that each make DiviDen feel less like a tool and more like something that runs itself.

## Scheduled Board Cortex Daemon

Board Cortex already ran when you chatted — detecting stale cards, duplicates, deadline escalations, archivable work. But it only fired during conversation. If you didn't talk to Divi for a day, your board intelligence went cold.

Now there's a **background daemon that runs every 6 hours** across ALL users. It hits \`POST /api/cron/cortex-scan\`, which:
- Iterates every active user with kanban cards
- Runs \`runBoardScan()\` per user — all 6 detection functions
- Auto-escalates deadline-approaching cards
- Persists BoardInsight records
- Logs activity entries for notable findings

Auth is admin-password-gated. Each DiviDen instance runs its own daemon — no centralized dependency.

Your board now cleans itself even when you're not looking.

## Linked Kards v2 — Cross-User Card Visibility with Auto-Linking & Status Propagation

The big multi-user primitive, now with deterministic infrastructure instead of LLM-dependent linking.

**v2 Architecture (what changed from v1):**
- **Auto-linking**: When a relay sends work to another user and they create a card, the link forms automatically. No more hoping the LLM remembers to pass \`linkedFromCardId\` — it's infrastructure now.
- **Delegation provenance**: Every card created from relay context gets stamped with \`originCardId\`, \`originUserId\`, \`sourceRelayId\`. The card itself knows where it came from.
- **Relay→Card FK**: \`AgentRelay\` now has a direct \`cardId\` field instead of burying card context in JSON payload. Query-friendly, indexable.
- **Accumulate, don't ping**: Status changes are logged silently on the CardLink (\`changeLog\` JSON array). No constant relay spam. Updates accumulate and are delivered as a digest in the system prompt when the user next starts a conversation. After delivery, the log clears. Your Divi brings them up naturally — "Sarah completed that task you delegated" — not as interrupt-driven pings.
- **Cross-instance prep**: CardLink now has \`externalCardId\` + \`externalInstanceUrl\` fields for FVP's federated use case.

**In the system prompt**, delegated cards show: \`[cardId] "My Card" (high) ⬅️delegated-from:Jon 🔗→delegation:"Their Task" (active) by Sarah ✓2/5\`
When there are accumulated updates, a "🔗 Linked Card Updates" section appears with a digest of changes since your last conversation.

**In the Kanban UI**, delegated cards show a purple provenance badge + linked card indicators with direction, type, title, user, and checklist progress.

Manual linking (\`[[link_cards]]\` and \`linkedFromCardId\`) still works as override.

## Google Connect Button Widget

Previously, connecting Google (Gmail, Calendar, Drive) required either the onboarding flow or manually navigating to settings. Now Divi can surface an interactive **Google Connect button directly in chat** anytime.

- \`[[show_google_connect:{"identity":"operator"}]]\` — renders a one-click Google OAuth button in the chat
- Works during onboarding AND regular conversation
- Shows connected state if already linked
- Supports both operator and agent identity accounts

The setup task "Connect Email & Calendar" in the onboarding checklist now maps directly to this widget instead of generic guidance.

## What's Next

Cross-instance Linked Kards (FVP team integration), Board Cortex pattern recognition improvements, and the inbox zero automation layer.

— Jon
`,
  },
  {
    id: 'auto-complete-cards-federation-approval-v1-5-1',
    date: '2026-04-14',
    time: '10:30 PM',
    title: 'Auto-Complete Cards, Federation Approval & Marketplace Docs',
    subtitle: 'Cards now complete themselves. Federated agents go through review. And the execution endpoint finally has full documentation.',
    tags: ['auto-complete', 'federation', 'marketplace', 'approval', 'documentation', 'admin'],
    content: `Three things shipped tonight that each solve a different flavor of "why doesn't this just work?"

## Cards Auto-Complete When All Tasks Are Done

This was the most requested behavior gap: you check off every task on a card, and the card just... sits there in Active. Not anymore.

When the last checklist item on a card is marked complete — whether by you in the UI, by Divi via \`[[complete_checklist]]\`, or by the onboarding auto-complete system — the card automatically moves to the **Completed** column. Activity log captures it. No manual drag required.

Rules are intentional:
- Card must have at least 1 checklist item (empty cards don't auto-move)
- Card must not be paused (we respect the pause)
- All items must be done (no partial credit)

## Federated Agent Approval Workflow

Previously, agents synced from federated instances via \`POST /api/v2/federation/agents\` went straight to \`active\` — instantly visible on the marketplace. That was fine for trusted partners but not scalable.

Now:
- **Untrusted instances** → agents enter \`pending_review\` status
- **Trusted instances** (admin-flagged via \`isTrusted\`) → agents auto-approve to \`active\`
- **Updates to existing agents** preserve their current approval status — we don't re-gate updates

Admin approval happens via \`POST /api/admin/marketplace/agents\` with actions: \`approve\`, \`reject\`, \`suspend\`.

When an agent is approved or rejected, **a webhook fires to the source instance** at \`/api/marketplace/webhook\` with the decision, agent ID, and optional rejection reason. This closes the submit→approve→live loop that federated instances were waiting for.

## Admin Federation Management

New endpoint: \`POST /api/admin/federation\`

- **reset_token** — Rotate a federated instance's platform token (self-service key rotation)
- **toggle_active** — Activate/deactivate an instance
- **toggle_marketplace** — Enable/disable marketplace access
- **toggle_trusted** — Mark instance as trusted (auto-approves agents)

## Marketplace Execution — Full Documentation

The \`POST /api/marketplace/:id/execute\` endpoint was always fully built but never fully documented. The developer docs now include:

- Complete request/response schemas for standard and dynamic pricing flows
- How DiviDen calls your agent (payload formats for text/json/a2a)
- The two-phase dynamic pricing approval flow
- **Inbound Task Routing guide** — clear breakdown of which endpoint receives what:
  - Marketplace Execute = direct HTTP to agent endpoint (synchronous, brokered)
  - DAWP Relay = federation relay for CoS delegation (asynchronous)
  - A2A Protocol = JSON-RPC for programmatic agent-to-agent (structured)

## What's Next

Scheduled Board Cortex daemon (your board cleans itself even when you're not chatting), Linked Kards for cross-user visibility, and the Google Connect button widget for frictionless onboarding.

— Jon
`,
  },
  {
    id: 'cockpit-mode-onboarding-v2-auto-everything',
    date: '2026-04-14',
    time: '11:59 PM',
    title: 'Cockpit Mode, Onboarding v2 & the Auto-Everything Update',
    subtitle: 'We were so excited about the Cortex that we almost forgot to share the other half of the session. Divi is now a work partner, onboarding is a project, and half the manual steps are gone.',
    tags: ['cockpit-mode', 'onboarding', 'work-partner', 'auto-discuss', 'auto-complete', 'capabilities', 'settings-widgets', 'system-prompt'],
    content: `We shipped the Board Cortex update and got so deep into the intelligence layer that we almost forgot — there's an entire second half of this session that never got its own post. This is that post.

## Onboarding v2 — Onboarding Is a Project

The old 6-phase onboarding wizard is dead. The new system has one idea: **onboarding IS a project.**

When you enter your API key and hit "Get Started," DiviDen creates a real project called "DiviDen Setup" with a single kanban card and six checklist items:

1. Configure Working Style
2. Set Triage Preferences
3. Connect Email & Calendar
4. Review Connected Signals
5. Custom Signals (optional)
6. Run First Catch-Up

These aren't tutorial steps in a wizard. They're **real tasks** on your board that show up in your Now Panel, that Divi can discuss with you, and that get marked complete when you actually do them.

You pick "Walk me through it" or "I'll handle it myself." That sets the pace (due today vs. one week), and then Divi immediately starts discussing your first task.

### Why This Matters

Every other platform teaches you the platform and then hopes you'll use it. We just put you to work. The setup tasks are the product. By the time you're "done onboarding," you've already configured your agent, connected your signals, and run your first catch-up. There's nothing to transition to.

## Cockpit Mode — Divi as Work Partner

This is the big behavior change. When you open chat, Divi now **proactively works through your Now list**.

The system prompt includes your incomplete checklist tasks, ranked by the NOW engine. Divi picks the highest priority item, helps you execute it, marks it complete via \`[[complete_checklist:{...}]]\`, and moves to the next one. No prompt needed. You just open chat.

### What "Work Partner" Means in Practice

- Divi sees your assigned checklist items in the system prompt
- It picks the top item and starts discussing how to tackle it
- When context is clear and risk is low, it can execute capabilities directly (send an email, create a calendar event) without going through the queue
- Everything gets logged to the activity feed
- After marking one task done, it suggests creating follow-on tasks or moves to the next priority

This is the opposite of a chatbot sitting there waiting. Divi has a to-do list and it's working through it.

## Auto-Everything

Three things that used to require manual clicks are now automatic:

### Auto-Discuss

When onboarding completes, Divi doesn't wait for you to type. It auto-sends a message discussing your first setup task. The \`__AUTOSEND__\` prefix on chat prefill triggers automatic send instead of just filling the input. This pattern is reusable anywhere you want to kick off a contextual conversation.

### Auto-Complete Setup Tasks

When you save your working style via the interactive settings widget in chat, the matching setup checklist item ("Configure Working Style") automatically marks complete. Same for triage preferences, goals, and any other setting that maps to a setup task. No "done" button needed.

### Auto-Install Capabilities

When you connect Google (email/calendar), the system silently installs the corresponding agent capabilities — Outbound Email and Meeting Scheduling — with sensible default rules. You discover them later in the Capabilities tab. Zero friction.

## Interactive Settings Widgets in Chat

This one's subtle but powerful. When Divi discusses a setup task like "Configure Working Style," it doesn't just describe what to do — it renders **actual working settings controls** directly in the chat message.

The \`show_settings_widget\` action tag triggers real interactive UI components: sliders, toggles, selectors. You configure your preferences right in the conversation, the settings save to the backend, and the corresponding checklist task auto-completes.

## Speed Fix — Instant Onboarding

The intro API was rewritten to use a \`$transaction\` with parallelized reads. Creating the project, card, checklist items, and chat messages now happens in a single atomic operation with all database reads running in parallel. What used to feel sluggish now feels instant.

## Activity Feed Integration

Three action tags now log to the activity feed:

- **\`send_email\`** — logs "capability_executed" when Divi sends an email from chat
- **\`create_calendar_event\`** — logs "capability_executed" when Divi creates a meeting
- **\`complete_checklist\`** — logs "task_completed" with the card title and task text

This means every significant action Divi takes from chat is auditable. The activity stream tells the full story.

## System Prompt Overhaul

The system prompt got a serious refresh this session:

- **Checklist tasks in context** — Divi now sees operator's incomplete checklist items with due dates, assignee types, and parent card context
- **Work partner behavioral instructions** — New cockpit mode behavior: pick highest priority → help execute → mark complete → suggest follow-ons → next item
- **Setup project awareness** — During onboarding, Divi naturally sees setup tasks through the normal kanban context (Group 2), no special onboarding block needed
- **Board Cortex digest** — (covered in the Cortex post) Pre-digested intelligence replaces raw data analysis

## What's Next

The roadmap from here: scheduled daemon for Board Cortex auto-cleaning, linked Kards for cross-user task visibility, and pushing CoS mode toward full autonomous task processing with the comms channel.

— Jon`,
  },
  {
    id: 'board-cortex-intelligence-layer',
    date: '2026-04-14',
    time: '11:59 PM',
    title: 'Board Cortex — Your Kanban Has Its Own Brain Now',
    subtitle: 'The board scans itself for duplicates, stale projects, and deadline risks. Divi sees a pre-digested brief instead of raw data.',
    tags: ['board-cortex', 'intelligence', 'kanban', 'system-prompt', 'auto-escalation', 'dedup'],
    content: `The kanban board is no longer a passive tracking surface. It thinks.

## What Changed

A new intelligence layer — **Board Cortex** — now runs analysis on your board and feeds the results directly into Divi's context. The goal: Divi should only work with the sharpest version of reality. Board janitoring is no longer the AI's job.

### Duplicate Detection

The Cortex uses the same Levenshtein similarity engine that already powers queue deduplication, now applied across **card titles** (75% threshold) and **checklist items across different cards** (80% threshold). When it finds overlap:

- It suggests merging the less-developed card into the richer one
- Divi gets the suggestion with a ready-to-fire \`[[merge_cards:...]]\` action tag
- Nothing auto-merges. You confirm.

### Stale Card Detection

Any active card with no update for 14+ days gets flagged. The Cortex calculates checklist completion percentage to distinguish "stuck at 0%" from "90% done but forgotten." Divi asks: continue, pause, or archive?

### Auto-Escalation

Cards approaching their deadline (within 48 hours) with less than 30% checklist completion get **automatically bumped to urgent** priority. No human intervention needed — the urgency is self-evident.

### Archive Candidates

Completed cards sitting for 2+ days are flagged as archive-ready. Keeps the board clean without you thinking about it.

### Context Digest → System Prompt

The big architectural change: Divi now receives a **🧠 Board Intelligence** section in every conversation. Instead of parsing raw card listings to figure out what's important, Divi gets:

- **TOP FOCUS** — top 5 cards ranked by priority and deadline, with completion percentages
- **BOARD HEALTH** — flags for duplicates, stale items, escalation candidates, overlapping tasks
- **RECENT COMPLETIONS** — what finished recently (velocity context)
- **BOARD INTELLIGENCE** — actionable suggestions with ready-to-use action tags

When the board is healthy, this section is one line: "✅ Clean — no redundancies or stale items detected." When there's something to do, Divi proactively raises it.

## NOW Panel Redesign

While we were in there, cleaned up the left sidebar:

- **Stats → Priority Stack → Calendar Gap → Board** — that's the flow now
- Removed the "+Task" and "Chat" buttons. The panel is for seeing priorities, not input
- Single wide "📋 Open Board" button beneath the calendar gap indicator

## API Access

- \`GET /api/board/cortex\` — returns the context digest (same format Divi sees)
- \`POST /api/board/cortex\` — triggers a full scan with auto-housekeeping

The \`BoardInsight\` model persists all detected issues with confidence scores and status tracking.

## What's Next

Scheduled daemon to run the Cortex scan on a cadence — so the board self-cleans even when you're not chatting with Divi. Semantic dedup (LLM-powered, beyond Levenshtein) for catching cards that describe the same thing in different words.

— Jon`,
  },
  {
    id: 'teams-architecture-open-source-billing-cos-delegation',
    date: '2026-04-14',
    time: '11:59 PM',
    title: 'Teams, Project Delegation & the Open-Source Billing Boundary',
    subtitle: 'Create a team on the platform or from your own instance. Assign it to a project. Divi delegates qualifying tasks to contributors automatically.',
    tags: ['teams', 'projects', 'open-source', 'federation', 'cos-delegation', 'billing', 'invites'],
    content: `Teams are live. Here's how they work, why they're free for self-hosted instances, and what happens when you assign one to a project.

## The Model

A team is a persistent group of people who work together across projects. Not a project — a unit. You create a team, invite members, and then assign that team to projects. The team is the organizational wrapper. The project is the execution context.

When you assign a team to a project, all team members automatically become project contributors. When a new member joins the team later, they're synced to all team projects too. The team is a bundled unit that flows into projects.

### How to Create a Team

From the [Teams panel](/dashboard) (👥 Teams tab), hit **+ New Team**. Name it, add a description, pick an emoji. You're the owner.

### How to Invite Members

Open your team → **+ Invite** → enter an email. DiviDen creates a [token-based invite link](/docs/developers#teams-api) that you can copy and share. The invitee clicks the link, logs in (or signs up), and joins. They're automatically added to all team projects as contributors.

For cross-instance members (someone running their own DiviDen), the invite works through the existing [federation connection](/docs/federation) infrastructure — the \`TeamInvite\` links to a \`connectionId\`, and the membership flows through the relay system.

### How to Assign a Team to a Project

Open your team → **+ Assign Project** → select from your existing projects. All team members become ProjectMembers instantly. You can unassign later without losing individual memberships.

## CoS Delegation to Project Contributors

This is the real payoff. When Divi is in [Chief of Staff mode](/docs/developers#cos-engine) and dispatches a task from the queue, it now checks: *does this task belong to a project with contributors?*

The dispatch strategy is now four layers deep:

1. **Capability tasks** → invoke installed capability (email draft, meeting scheduling, etc.)
2. **Explicit relay handler** → delegate to the specific connected agent in the task metadata
3. **Project contributor delegation** → if the task is in a project, find a qualifying lead or contributor with an active connection, and send them an \`AgentRelay\` (type: \`request\`, intent: \`assign_task\`)
4. **Generic** → Divi works on it directly

Layer 3 is new. It doesn't care whether the contributor was added individually or came in through a team. A team just adds members as a bundled unit — the delegation logic operates at the \`ProjectMember\` level. If you have three contributors on a project, one from your team and two independent, all three are candidates for delegation.

The contributor finder prefers members with active federated connections (relay-ready), then falls back to local users with local connections. Observer and reviewer roles are excluded — only leads and contributors qualify.

## The Open-Source Billing Boundary

Here's the rule: **if you create a team from your own self-hosted instance, it's free.** No subscription, no seat limits, no feature gates. Every billing check in DiviDen — \`requireTeamSubscription()\`, \`requireTeamPro()\`, \`checkTeamMemberLimit()\`, \`checkTeamBudget()\` — first calls \`isTeamSelfHosted()\`. If true, it returns a synthetic unlimited subscription and moves on.

If you create a team on dividen.ai (the platform), you get a [14-day Team Pro trial](/docs/developers#teams-api). After that, it's $29/mo Starter (5 seats, 3 projects) or $79/mo Pro (10 seats + $9/each, unlimited projects, team agent).

The billing boundary follows the **team origin**, not the member origin:

| Scenario | Billing |
|---|---|
| Team created on dividen.ai | Subscription required |
| Team created on self-hosted instance | Free, unlimited |
| Platform user joins a self-hosted team | Free — team origin wins |
| Self-hosted user joins a platform team | Counts as a seat on the team's subscription |

This is the open-core contract. The code is MIT. The infrastructure to host teams at scale is the premium.

## What Open-Source Instances Need to Do

If you're self-hosting and want to implement teams:

1. **Pull the latest schema.** \`Team\` now has \`originInstanceUrl\` and \`isSelfHosted\` fields. \`TeamInvite\` is a new model. Run \`npx prisma db push\`.
2. **Set \`isSelfHosted: true\`** when creating teams on your instance. The simplest way: set an env var like \`DIVIDEN_INSTANCE_URL\` and pass it as \`originInstanceUrl\` in your team creation call. The API sets \`isSelfHosted = !!originInstanceUrl\`.
3. **The feature gates already bypass** for self-hosted teams. No code changes needed — \`feature-gates.ts\` handles it.
4. **Team invites work locally** — same token-based flow. For cross-instance invites, you'll need the [federation connection](/docs/federation) between instances set up first.
5. **CoS project delegation works automatically** once team members are synced to projects. No configuration.

See the [developer docs](/docs/developers#teams-api) for the full API reference, and the [open-source guide](/open-source) for general self-hosting setup.

## New API Endpoints

- \`POST /api/teams\` — create team (accepts \`originInstanceUrl\` for self-hosted)
- \`POST /api/teams/:id/invites\` — create invite (email, userId, or connectionId)
- \`GET /api/teams/invite/:token\` — preview invite (no auth required)
- \`POST /api/teams/invite/:token\` — accept or decline
- \`POST /api/teams/:id/projects\` — assign team to project (syncs members)
- \`GET /api/teams/:id/projects\` — list team's projects
- \`DELETE /api/teams/:id/projects?projectId=x\` — unassign

All endpoints use session auth. The v2 Bearer token equivalents are coming.

---

Teams are a persistent social structure, not a billing construct. The billing is layered on top for the platform. The architecture is the same whether you're on dividen.ai or running your own instance. That's the point.

— Jon`
  },
  {
    id: 'chat-queue-control-smart-prompter-onboarding-rewrite',
    date: '2026-04-14',
    time: '11:45 PM',
    title: 'Chat Queue Control, Smart Prompter v2, Onboarding Rewrite & HowItWorks Loop',
    subtitle: 'Control your queue from conversation. Divi now builds prompts that know your agents. Onboarding is chat-first. The loop diagram actually loops.',
    tags: ['chat', 'queue-control', 'smart-prompter', 'onboarding', 'how-it-works', 'action-tags', 'ux'],
    content: `Five changes that tighten the gap between conversation and execution — and fix the front door.

## Chat-Based Queue Control

You can now approve, reject, and edit queue items directly from conversation. No need to leave the chat panel to manage your queue.

Three new action tags power this:

### \`[[confirm_queue_item]]\`
Divi uses this when you say "approve that task" or "confirm the pending item." It finds the oldest \`pending_confirmation\` item and promotes it to \`ready\`. If the queue confirmation gate is off (\`queueAutoApprove: true\`), Divi tells you there's nothing to confirm.

### \`[[remove_queue_item]]\`
"Remove the last thing from my queue" — Divi identifies the item by context (title match or most recent) and deletes it. Works on any status. Divi confirms what was removed so you know exactly what happened.

### \`[[edit_queue_item]]\`
"Change the priority on that task to high" or "rename the second queue item to Weekly Sync Prep." Divi finds the item, patches the fields you described, and confirms the edit. Supports title, description, priority, and category.

All three tags go through the same API v2 endpoints — so if you're self-hosted and building integrations, the same \`/api/v2/queue/{id}/confirm\`, \`DELETE /api/v2/queue/{id}\`, and \`PATCH /api/v2/queue/{id}\` routes work programmatically too.

## Smart Task Prompter v2

Previously, when Divi dispatched a task to the queue, the prompt was a static string. It didn't know what agents you had connected, what capabilities were installed, or what context was relevant.

### How It Works Now

1. **Divi identifies a task** from conversation
2. **Smart Prompter reads your environment** — installed capabilities, connected agents, their task types, your current mode
3. **Builds an agent-aware prompt** that includes delegation targets, capability invocations, and contextual metadata
4. **Attaches structured metadata** to the queue item: \`promptVersion: 2\`, source agent, matched capability/agent, execution hints

The metadata schema:
\`\`\`json
{
  "promptVersion": 2,
  "sourceAgent": "divi-core",
  "matchedCapability": "email_draft",
  "matchedAgent": null,
  "executionHint": "capability_invoke",
  "contextWindow": ["recent_conversation_summary"]
}
\`\`\`

When CoS mode picks up a v2-prompted task, it reads \`executionHint\` to decide whether to invoke a capability, delegate to an agent, or handle it generically. The prompts are dramatically better — they actually describe *how* to execute, not just *what* to execute.

## Chat-First Onboarding

The old onboarding was a wizard. Steps. Progress bars. Checkboxes. It felt like filling out a form to use an operating system.

### The New Flow

Onboarding is now a conversation with Divi. You open DiviDen for the first time and Divi greets you — not a wizard.

1. **Divi introduces itself** and asks your name
2. **Asks what you're working on** — your focus, your role, what kind of work you want help with
3. **Suggests a first task** based on what you told it, and offers to add it to your queue
4. **Onboarding completes** when you've had a real interaction — not when you've clicked through slides

The dashboard now renders a chat-first layout during onboarding. The queue panel, settings, and other chrome are hidden until onboarding completes. You see Divi, a message input, and nothing else. Clean entry point.

### Onboarding Auto-Heal

We found a bug where stuck onboarding state could block the entire app — queue wouldn't render, chat was frozen, settings were inaccessible. The fix: DiviDen now detects stuck onboarding on every page load. If your account has been active for more than 24 hours and onboarding flags are still incomplete, it auto-completes them and unlocks the full dashboard. No user action required. The system heals itself.

This also fixed a related issue where \`pending_confirmation\` items couldn't be approved if onboarding was in a half-complete state — the queue panel wasn't rendering, so the approve/reject buttons were invisible.

## HowItWorks Loop Redesign

The "How It Works" section on the landing page had a flowchart that showed a linear process: Input → Process → Output. But DiviDen is a loop. You talk to Divi, Divi queues tasks, tasks execute, results feed back into conversation.

### The New Diagram

The flowchart is now a proper loop with four nodes connected by animated directional arrows:

**Conversation** → **Queue** → **Execution** → **Feedback** → back to **Conversation**

Each node has a description. The arrows animate to show flow direction. The loop closes — because the system actually loops. It's not a pipeline, it's a cycle.

Built with CSS animations — no external charting library. The nodes pulse subtly on hover. On mobile, the loop renders as a vertical flow with curved connectors.

## Homepage Diagram Update

While we were at it, we updated the main homepage diagram to match the new loop mental model. The old version showed a vague "AI assistant" pitch — the new one distills how DiviDen actually changes your workflow down to its simplest form. Shoutout to Robert for helping us figure out the cleanest way to present the potential impact of DiviDen on how you work. Sometimes the hardest part of building an OS is explaining what it does in one picture — he made that click.

---

These changes close the loop between conversation and execution in a very literal way — you can now manage your entire task pipeline without leaving the chat, and the homepage finally explains what that means for your day-to-day.

— Jon`
  },
  {
    id: 'queue-confirmation-gate-cos-execution-engine',
    date: '2026-04-14',
    time: '12:15 AM',
    title: 'Queue Confirmation Gate & Chief of Staff Execution Engine',
    subtitle: 'Nothing enters your queue without your approval. CoS mode now proactively executes tasks instead of just observing them.',
    tags: ['queue', 'chief-of-staff', 'execution', 'api-v2', 'open-source', 'security', 'confirmation-gate'],
    content: `Two foundational changes to the queue and CoS architecture that make DiviDen work the way it was always meant to.

## Queue Confirmation Gate

Previously, when Divi identified a task from conversation and dispatched it to the queue, it went straight in as \`ready\`. No human in the loop. That's wrong for an operating system — your queue is your execution pipeline, and nothing should enter it without your explicit approval.

### How It Works Now

1. **Divi identifies a task** from conversation based on installed capabilities or connected agents' task types
2. **Task enters as \`pending_confirmation\`** — a new queue status (yellow 🟡) that sits above Ready
3. **You see it in the Queue panel** with ✓ Approve / ✕ Reject buttons
4. **Approve → moves to Ready** (enters the execution pipeline). **Reject → deleted** (never existed)

This applies to both \`[[dispatch_queue]]\` and \`[[queue_capability_action]]\` action tags. The queue gate (capability check) still runs first — if no handler exists, Divi suggests marketplace agents. But *having* a handler no longer means auto-queue.

### For Open-Source / Self-Hosted Users

If you're running your own instance and want to bypass the confirmation gate (you trust your Divi's judgment, or you're building automations), set:

\`\`\`
PATCH /api/v2/settings
{ "queueAutoApprove": true }
\`\`\`

Or toggle it via \`PUT /api/settings { "queueAutoApprove": true }\` from the dashboard. When \`queueAutoApprove\` is true, tasks go straight to \`ready\` — same behavior as before this update.

**Schema change**: \`User\` model now has \`queueAutoApprove Boolean @default(false)\`. Run \`npx prisma db push\` after pulling.

**New status**: \`QueueItemStatus\` now includes \`'pending_confirmation'\` as the first status in the lifecycle. The status guard prevents \`pending_confirmation → in_progress\` or \`pending_confirmation → done_today\` — items must flow through \`ready\` first.

## Chief of Staff — Execution Engine

CoS mode was a passive observer. It labeled itself "Away Mode — Observing" and all it did was move items from \`ready\` to \`in_progress\`. It never actually *executed* anything.

### How It Works Now

When CoS mode dispatches a task to \`in_progress\`, it reads the task's metadata to determine the execution strategy:

**Capability tasks** (email drafts, meeting scheduling, etc.)
→ Invokes the capability and logs it as an activity entry. The execution method and detail are stored in the queue item's metadata under \`cosExecution\`.

**Agent/delegation tasks** (connected agents via comms)
→ Creates an \`AgentRelay\` (type: \`request\`, intent: \`assign_task\`) to the corresponding connected agent. The relay includes the task description and priority. The connection's comms channel becomes the execution interface.

**Generic tasks** (no specific handler)
→ Logs that Divi is actively working on the task. Activity feed shows real-time execution status.

The sequential loop: **dispatch → execute → on completion, auto-dispatch next → execute → repeat until queue empty.** One task in flight at a time.

### CoS View Redesign

The header now shows ⚡ with dynamic status text:
- **"Executing Queue"** — a task is actively in_progress
- **"Ready to Execute"** — tasks are ready but none dispatched yet
- **"Queue Clear"** — all done

New stat card: **"Awaiting Approval"** (yellow) shows when pending_confirmation items exist, so you know tasks need your sign-off before CoS can work them.

Pause/Resume and Intervene still work as before.

## New v2 API Endpoints

### \`POST /api/v2/queue/{id}/confirm\`
Approve or reject a \`pending_confirmation\` item programmatically. Body: \`{ "action": "approve" }\` or \`{ "action": "reject" }\`.

### \`GET /api/v2/settings\`
Read current user settings: mode, queueAutoApprove, diviName, goalsEnabled, onboarding status.

### \`PATCH /api/v2/settings\`
Update mode and queue behavior. Switching to \`chief_of_staff\` auto-dispatches. Switching to \`cockpit\` returns a briefing summary.

All three endpoints use Bearer token auth (same as all v2 endpoints).

## Open-Source Integration Notes

Self-hosted users who skip onboarding can:
1. Generate an API key via \`POST /api/v2/keys\`
2. Set \`queueAutoApprove: true\` via \`PATCH /api/v2/settings\` to bypass the confirmation gate
3. Use \`PATCH /api/v2/settings { "mode": "chief_of_staff" }\` to programmatically activate CoS mode
4. Monitor execution via \`GET /api/v2/queue?status=in_progress\` and the SSE stream

The onboarding flow is still available and recommended for new users, but every step it touches is also reachable via API.`,
  },
  {
    id: 'smart-tagging-kanban-ux-drag-scroll',
    date: '2026-04-13',
    time: '11:59 PM',
    title: 'Smart Tagging, Kanban Board UX, and Drag-Scroll Everywhere',
    subtitle: 'Kanban cards now show who\'s involved and what\'s urgent at a glance. The board scrolls like Trello. Every tab row drags horizontally on any screen.',
    tags: ['kanban', 'smart-tags', 'federation', 'ux', 'mobile', 'drag-scroll', 'documentation', 'opencore'],
    content: `Three layers of UX improvements that compound — each one makes the others more useful.

## Smart Tagging on Kanban Cards

Every kanban card now automatically surfaces **smart tags** derived from the task's context:

### Connected User Tags
- **Blue tags (👤)** — Same-instance users who are project members. You see exactly who's working on what without opening the card.
- **Purple tags (🔗)** — Federated connections from other DiviDen instances. Cross-instance collaboration becomes visible at the board level.

The tag source is the \`ProjectMember\` model — each member links to either a local \`User\` (userId) or a federated \`Connection\` (connectionId + isFederated: true). The \`getSmartTags()\` helper in \`KanbanView.tsx\` reads these relationships and produces the tag array.

### Due Date Urgency
- **🔴 Overdue** — Red tag when a card's due date has passed
- **⏰ Due Today** — Orange tag when the card is due within 24 hours

### Federated Member Indicators
Project member avatars now show a **purple ring** for federated members vs. role-based accent colors for local users. Tooltip shows "(role) — federated" for cross-instance members.

## Kanban Board: Trello-Style Interaction

The board now distinguishes between two drag intents:
1. **Drag a card** → Pick it up, move it between columns (via dnd-kit). Overlay gets \`shadow-2xl rotate-2\` for satisfying visual feedback. \`dropAnimation: null\` for snappy placement.
2. **Drag empty space** → Horizontally scroll the entire board. Pointer events check \`target.closest('[data-kanban-card]')\` — if you're not on a card, it's a board scroll.

This is the same mental model as Trello. No mode switching required.

## Drag-to-Scroll Tab Rows

New reusable \`DragScrollContainer\` component wraps any overflow-x content:
- **Settings tab bar** — all tabs scrollable on narrow screens
- **Admin tab bar** — including the new Workflows tab
- **CenterPanel sub-tabs** — inbox filters, job board filters, etc.
- **Fade edges** — optional gradient fade indicators showing there's more content

The component uses a \`ResizeObserver\` to detect overflow and suppress click events during drag so you don't accidentally activate a tab while scrolling.

## Documentation & Developer Docs

Updated for opencore contributors:
- **Smart Tagging** section in \`/documentation\` now covers the tag extraction pattern, model relationships, and how to add custom tag types
- **Intelligence & Learning** section expanded with implementation details for behavior signals, learnings CRUD, and NOW engine correlation
- **Developer Docs** (\`/docs/developers\`) now includes **Behavior Signals API**, **Learnings API**, and **Smart Tagging Implementation** sections with endpoint references and code patterns
- All new API routes documented with auth requirements and payload shapes

## For Opencore Contributors

If you're self-hosting or extending DiviDen:
- Smart tag rendering lives in \`getSmartTags()\` in \`KanbanView.tsx\` — extend it to add custom tag types (labels, priority levels, custom metadata)
- \`DragScrollContainer\` is a generic component — use it anywhere you have horizontal overflow
- Behavior signals follow a fire-and-forget pattern via \`emitSignal()\` — add new signal types by calling it from any user interaction handler
- The learnings system is CRUD-first: every learning is user-editable, dismissable, and deletable. The analysis endpoint detects patterns but the user always has final say.`,
  },
  {
    id: 'intelligence-learning-system',
    date: '2026-04-13',
    time: '11:45 PM',
    title: 'Intelligence & Learning System — Divi Learns How You Work',
    subtitle: 'Behavioral signal collection, pattern analysis, calendar-queue correlation in the NOW engine, and a new Learnings settings tab where you control what Divi knows.',
    tags: ['intelligence', 'now-engine', 'learnings', 'behavior', 'calendar', 'admin', 'platform'],
    content: `This is the foundation for Divi actually getting smarter over time. Not goal inference — pattern recognition from your real usage.

## What's New

### Behavior Signal Collection
Every meaningful action you take now emits a lightweight signal — queue completions, chat messages, status changes, email discussions. These signals feed into Divi's pattern analysis engine. No PII stored, just action types and timing metadata.

### Pattern Analysis → Learnings
A new analysis endpoint processes your signals and detects patterns:
- **Peak hours** — when you're most active (and when you're not)
- **Discussion frequency** — how often you use the discuss feature on emails
- **Quiet days** — days of the week where you're consistently less active
- **Capability usage** — which capabilities you actually use vs. which are gathering dust

Each detected pattern becomes a "learning" stored in your profile.

### Settings → Learnings Tab
New tab in Settings where you can see everything Divi has learned about you. Every learning is editable, dismissable, and deletable. Category filters, confidence scores, and source attribution so you know exactly where each insight came from. You control what stays.

### NOW Engine: Calendar-Queue Correlation
The NOW engine now cross-references your upcoming calendar events with your queue items. If you have a meeting about "Q3 planning" in 45 minutes and there's a queue item titled "Review Q3 budget draft" — it gets a 25-point score boost and surfaces as "Related to upcoming: Q3 planning call". Prep items auto-surface before meetings.

### Notification Deep-Linking
When Divi generates new learnings, you'll see them in your notification feed. Click any intelligence notification and it takes you straight to Settings → Learnings.

### Admin: Workflow Discovery
New Workflows tab in the admin panel showing cross-user workflow patterns. When multiple users follow similar action sequences, the system detects them and suggests them as potential new capabilities to develop. Admin can review and mark suggestions as processed.

### Relay Templates & Agent Quality Scoring
Two new subsystems: relay templates (proven patterns from network interactions) and agent quality signals (tracking marketplace agent effectiveness from user corrections and confirmations).

## Philosophy
This is individual-first intelligence. Divi learns *your* patterns, not some aggregate model. You see everything, you control everything, and the system gets smarter because of how you actually work — not how we think you should work.`,
  },
  {
    id: 'agent-widget-system',
    date: '2026-04-13',
    time: '6:30 PM',
    title: 'AgentWidget System — Interactive Components in Chat & Kanban',
    subtitle: 'Agents can now render rich interactive widgets — choice cards, action lists, info cards, and payment prompts — directly in chat and on queue items.',
    tags: ['agent-widget', 'chat', 'kanban', 'marketplace', 'payments', 'protocol', 'platform'],
    content: `This one changes how agents communicate. Instead of text-only responses, agents can now return structured widget metadata that renders as interactive UI components.

## What Are AgentWidgets?

An AgentWidget is a typed UI component that an agent can attach to any chat message or queue item. Four types ship today:

- **choice_card** — Present the user with a set of labeled options. Each option can carry an action type (navigate, execute, dismiss) so the agent knows what the user chose.
- **action_list** — A list of items with action buttons. Think: "Here are 3 invoices that need approval" with Approve/Reject buttons on each.
- **info_card** — Read-only structured data. Agent surfaces a summary, a breakdown, or a status card.
- **payment_prompt** — A transactional widget with a price, a payment action, and a confirmation flow. This is how marketplace agents charge for work.

## The Protocol

Agents return widget data in the metadata JSON of a chat response:

\`\`\`json
{
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
        },
        {
          "id": "tier-pro",
          "title": "Pro — $149/mo",
          "actions": [
            { "label": "Select", "type": "button", "action": "select_tier_pro" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

The \`AgentWidget.tsx\` component parses this metadata and renders the appropriate widget type. Actions are dispatched back to the agent via the existing chat action pipeline.

## Payment Prompts — The Synqabl Example

This is the pattern Jon had in mind when designing the system. A music licensing agent (like Synqabl) can:

1. Surface a catalog of tracks as an \`action_list\`
2. Let the user preview and select
3. Present a \`payment_prompt\` with the price and license terms
4. Process payment via Stripe Connect (97% to the agent provider, 3% network fee)

The widget renders inline in chat — no redirects, no external checkout. The agent handles the entire transaction loop.

## Where Widgets Appear

- **ChatView** — Widgets render inline below the agent's text response
- **QueuePanel** — Queue items with widget metadata render the widget in the detail view
- **Coming soon** — Widget rendering in relay messages and the brief

## Technical Details

- Widget metadata lives in the chat message's \`metadata\` JSON field — no schema changes
- The \`AgentWidget\` component is at \`src/components/dashboard/AgentWidget.tsx\`
- Widget types are extensible — add a new type string and a corresponding render branch
- Payment actions integrate with the existing Stripe Connect flow on the managed platform`,
  },
  {
    id: 'discuss-with-divi',
    date: '2026-04-13',
    time: '5:45 PM',
    title: 'Discuss with Divi — Contextual Chat from Any View',
    subtitle: 'Every item in your dashboard now has a 💬 button. One click pre-fills chat with full context so you can ask Divi about anything you\'re looking at.',
    tags: ['chat', 'ux', 'inbox', 'queue', 'calendar', 'drive', 'discuss', 'platform'],
    content: `Small UX change, big workflow impact. Every panel in the dashboard now has a "Discuss with Divi" button (💬) that opens chat with context already loaded.

## How It Works

When you click the 💬 button on any item, DiviDen:
1. Assembles a context string from the item you're viewing (email subject, sender, queue item title, calendar event details, drive file name)
2. Pre-fills the chat input with that context
3. Switches to the Chat tab automatically

You're immediately in a conversation about the thing you were just looking at. No copy-pasting, no "hey Divi, regarding that email from..."

## Where It Shows Up

- **NOW Panel** — Discuss the top-priority item with Divi
- **Queue Panel** — Ask about any queued task, get recommendations on approach
- **Inbox View** — Discuss an email thread — ask for a draft reply, summarize the thread, or get context on the sender
- **Calendar View** — Ask about upcoming meetings, prep notes, or scheduling conflicts
- **Drive View** — Discuss a document — summarize it, extract action items, or ask questions about its contents

## The Pattern

Every view component now accepts an \`onDiscuss\` callback:

\`\`\`typescript
onDiscuss={(context: string) => {
  setChatPrefill(context);
  setActiveTab('chat');
}}
\`\`\`

The context string is human-readable and structured enough for Divi to understand what you're referring to. The agent's system prompt already knows about the discuss pattern — it recognizes pre-filled context and responds accordingly.

## Also in This Release

- **NOW Panel: Mark Complete** — The top NOW item now has a ✓ button that marks it complete (PATCH to \`/api/queue/{id}\` with \`done_today: true\`). No need to go into the queue view to clear it.
- **Inbox: Account Filtering** — If you have multiple Google accounts connected, the inbox now shows account filter tabs. Auto-derived from connected accounts — appears only when >1 account exists.
- **Calendar: Checkbox UI** — Calendar events now use checkbox-style toggles instead of the old button-style toggles. Cleaner, more familiar.`,
  },
  {
    id: 'capabilities-marketplace-queue-gating',
    date: '2026-04-13',
    time: '3:45 PM',
    title: 'Capabilities Marketplace, Queue Gating & Integration-Gated Installs',
    subtitle: '20 skill packs your agent can install. Queue items now route through gate checks. Capabilities that need integrations enforce it.',
    tags: ['capabilities', 'marketplace', 'queue', 'gating', 'integrations', 'pricing', 'agent-card', 'platform'],
    content: `Big structural release. DiviDen now has a capabilities marketplace, queue gating, and integration-gated installs. Platform v1.1.0, MCP v1.6, Agent Card v0.5.

## Capabilities Marketplace

Capabilities are modular skill packs — a prompt template, a category, and an optional integration requirement. Your agent installs them, and the prompt template is injected into its system context at runtime. No restart, no config.

We seeded 20 capabilities across 7 categories:
- **Productivity** — task prioritization, daily digest, meeting prep, document summarizer
- **Communication** — email composer, follow-up generator, meeting notes formatter
- **Finance** — invoice generator, expense tracker, financial report builder
- **HR** — candidate screener, onboarding assistant, leave manager
- **Operations** — workflow automator, inventory tracker, vendor manager
- **Sales** — lead scorer, proposal generator, pipeline analyzer
- **Custom** — prompt playground (bring your own template)

Browse them at \`GET /api/marketplace-capabilities\`. Filter by \`?category=finance\` or \`?search=invoice\`. Install with \`POST /api/marketplace-capabilities/:id/install\`.

## Integration-Gated Installs

Some capabilities only make sense if you have the right integration connected. The "Email Composer" needs an email integration. The "Invoice Generator" needs payments. Each capability declares an \`integrationRequired\` field — one of: \`email\`, \`calendar\`, \`slack\`, \`crm\`, \`transcript\`, \`payments\`, or \`generic\`.

When you try to install a capability whose required integration isn't connected, you get a clean \`422\`:

\`\`\`json
{ "error": "Integration required: email. Connect it in Settings → Integrations before installing." }
\`\`\`

No half-installed capabilities. No silent failures.

## Queue Gating

Queue items now run through a gate-check pipeline before processing. Three steps:
1. **Relay handler lookup** — checks \`QueueGateConfig\` for a custom handler matching the item's action tag
2. **Global gate** — if no handler matched, checks the global fallback handler
3. **Default pass-through** — if nothing matched, the item proceeds normally

This is the foundation for routing queue items to specific capabilities, blocking certain actions, or forwarding to external handlers. The \`GateCheckResult\` type carries an \`allowed\` boolean, a \`reason\`, and an optional \`handlerId\`.

## Pricing Enforcement

Only \`free\` and \`one_time\` pricing are accepted. If you try to create a capability with \`subscription\` pricing, the API rejects it. One-time capabilities track payment status per install via the \`CapabilityInstall\` model.

## New DB Models

Two new Prisma models:
- **MarketplaceCapability** — name, description, category, promptTemplate, integrationRequired, pricingModel, price, isPublished
- **CapabilityInstall** — links a user to an installed capability, tracks status and payment

## Other Changes

- **Agent Card v0.5** — the \`/.well-known/agent.json\` endpoint now returns a valid static fallback if the DB is unreachable. No more 500s during cold starts or transient connection drops.
- **Admin Key Reset** — admins can regenerate user API keys from the admin panel. Useful when a key leaks or an operator leaves.
- **MCP v1.6** — new tool \`capabilities_browse\` added to the static tool set. Queue gate awareness in the tool router.`,
  },
  {
    id: 'google-write-multi-inbox-self-hosted',
    date: '2026-04-13',
    time: '12:15 AM',
    title: 'Google Write Access, Multi-Inbox & Self-Hosted OAuth Isolation',
    subtitle: 'Divi can send email and create calendar events. Connect up to 3 Google accounts. Self-hosters bring their own OAuth app.',
    tags: ['integrations', 'google', 'email', 'calendar', 'multi-inbox', 'self-hosted', 'oauth', 'security'],
    content: `Three changes that make Google integration actually useful — and one that makes the open-source version properly independent.

## Google Write Scopes

When we first shipped Google OAuth, we locked it to read-only. Good for trust, bad for utility. Divi could see your inbox but couldn't reply. Could see your calendar but couldn't schedule.

Fixed. The OAuth consent now requests:
- \`gmail.send\` + \`gmail.compose\` — Divi can draft and send emails on your behalf (you still control which identity sends)
- \`calendar\` (full read+write) — Divi can create and manage calendar events
- \`drive.readonly\` stays read-only for now

If you already connected Google, you'll need to disconnect and reconnect to pick up the new scopes. The privacy policy already covered write access — we just weren't requesting the scopes.

## Gmail API Send

The send route (\`/api/integrations/send\`) now detects whether your email integration is Google or SMTP and routes accordingly:
- **Google accounts** → Gmail API \`users.messages.send\` with proper RFC 2822 formatting
- **SMTP accounts** → nodemailer, same as before

This means you can send from your Gmail without configuring SMTP app passwords. Works for both operator and agent identities — if you've given Divi its own Google account, it can send from that address directly.

## Multi-Inbox Support

You can now connect **up to 3 Google accounts** per operator identity and 1 for the agent. Each account gets its own set of Gmail, Calendar, and Drive services.

The \`IntegrationAccount\` schema gains an \`accountIndex\` field. The unique constraint is now \`[userId, identity, service, accountIndex]\` — so each slot can hold a different Google account. Disconnect works per-account, not per-identity.

In Settings → Integrations, connected accounts appear grouped by email. Hit "Connect another Google account" to add a second or third inbox.

## Self-Hosted OAuth Isolation

If you're running DiviDen self-hosted, you need to set up your own Google Cloud OAuth app. The managed platform has its own credentials; the open-source version does not ship with any.

When \`GOOGLE_CLIENT_ID\` and \`GOOGLE_CLIENT_SECRET\` are missing from \`.env\`, the integration panel shows a clear message: "Google OAuth not configured" with a link to Google Cloud Console. The connect button is hidden. The API route guards against empty credentials.

This is intentional. Self-hosters should own their OAuth relationship with Google, control their own redirect URIs, and manage their own consent screen. No credential leakage.

## OAuth Redirect Fix

Found and fixed a bug where the OAuth callback was redirecting to the container's internal hostname (\`af23bb2fc621:3000\`) instead of the public domain. All redirect calls now use a \`getPublicBaseUrl(req)\` helper that reads \`x-forwarded-host\`. Clean URLs after connect.

## Inbox UX

- **Inline reply bar**: The email detail view now shows a clickable "↩ Click to reply..." bar at the bottom, styled like Gmail's reply field. Click it to open the full compose view.
- **Drafts tab**: New filter tab in the inbox alongside All, Unread, Starred, and Sent.
- **Google logos**: The gradient "G" square is replaced with the official 4-color Google logo SVG.`,
  },
  {
    id: 'connections-redesign-peer-profiles',
    date: '2026-04-12',
    time: '11:55 PM',
    title: 'Connections Redesign, Peer Profiles & The Catch-Up Menu',
    subtitle: 'Connections got three tabs. Every name is now clickable. Catch-up has a quick-signal dropdown. Mode toggle moved where it belongs.',
    tags: ['connections', 'profiles', 'catch-up', 'signals', 'dashboard', 'federation', 'ux'],
    content: `Four changes that make navigating people and priorities faster.

## Connections — Three Tabs

The Connections view got a full redesign. Instead of a single list with a local/federated toggle, you now get three tabs:

- **Find People** — search your network and federated instances. Results show source badges (local vs federated). Federated results deep-link to the originating instance for connection.
- **My Connections** — active connections, incoming requests, and outbound pending. All in one place.
- **Relays** — your relay history, filtered and sortable.

The old local/federated toggle is gone. Federated discovery happens automatically in Find People — federated instances registered in your InstanceRegistry appear alongside local results.

## Peer Profile Modal

Every name and avatar in Connections is now clickable. Tap any person and you get a full profile modal with two tabs:

- **Profile** — the same routing manifest others see: bio, skills, experience, values, availability, languages, everything.
- **Us** — your shared context: mutual teams, shared projects, conversation stats, relay history, and relationship notes.

There's a connect button right in the modal. No more hunting through menus.

## Catch-Up Quick Signal Menu

The Catch-Up button got restyled to match the rest of the nav bar. More importantly: the gear icon next to it now opens a **quick signal dropdown** where you can toggle which signals Catch Up covers.

Drag to reorder priority. Check/uncheck to include or exclude. Your preferences persist across sessions. This is the fastest way to customize what "catch me up" actually means.

## Mode Toggle Moved

The CoS/Cockpit mode toggle moved out of the header bar and into the workspace strip — that thin bar above the center panel where your active view tabs live. It's still always visible, but it no longer competes with the header nav. Cleaner layout, same one-click switch.`,
  },
  {
    id: 'profile-view-photo-chat',
    date: '2026-04-12',
    time: '11:00 PM',
    title: 'Your Profile Has a Home Now',
    subtitle: 'Dedicated profile view, photo upload, and a smarter chat experience.',
    tags: ['profile', 'photo', 'chat', 'dashboard', 'ux'],
    content: `Three things that make DiviDen feel more personal.

## Profile View

Your profile is no longer buried in Settings. It has its own dedicated view in the dashboard — hit the person icon in the header bar.

Two modes: **Preview** shows exactly how others see you (bio, skills, experience, languages, values, availability — the whole thing). **Edit** is the same editor you already know, with all the tabs. Switch between them with a toggle. Upload a profile photo by hovering over your avatar.

The photo uploads directly to S3, shows up everywhere — including your chat bubbles.

## Smarter Chat Empty State

When you clear the chat (or start fresh), the empty state now knows whether you have an API key configured.

If you do, no more "add your API key" prompt. Instead you get three ways to kick things off:
- **☀️ Catch me up** — what happened, what's urgent, what needs attention
- **🧠 Let's strategize** — think through priorities and focus
- **⚡ Quick task** — hand something off fast

If you don't have a key yet, you still get the setup instructions.

## Chat Personalization

Chat now uses your Divi's name everywhere — header, placeholder, streaming avatar. If you renamed your agent to "Atlas" in settings, the chat says "Chat with Atlas" and shows "A" in the avatar circle instead of "AI". Your profile photo shows up on your own messages.`,
  },
  {
    id: 'agent-passwords-conversation-a2a',
    date: '2026-04-12',
    time: '9:00 PM',
    title: 'Agent Passwords, Persistent Threads & A2A v0.4',
    subtitle: 'Share a password, skip the paywall. Conversations that never really end. And the protocol layer keeps up.',
    tags: ['marketplace', 'passwords', 'chat', 'a2a', 'mcp', 'conversation'],
    content: `Three things shipped tonight that change how agents get shared, how conversations work, and how machines find each other.

## Marketplace Access Passwords

Developers can now set an access password on any marketplace agent. Share that password with someone and they get full free access to the agent — no payment, no task limits. It's the simplest possible distribution tool: build something, set a password, hand it to a friend or collaborator.

The password field shows up during registration and in agent settings. Users see a password unlock form on paid agents that support it. One correct entry and they're in — unlimited access, zero billing.

## Persistent Conversations

Chat threads now continue indefinitely. Context window bumped from 20 to 50 messages. Clearing a conversation gives you a fresh UI — but Divi retains everything underneath. Memory items, board state, learnings, capabilities — all still there. Think of it as starting the day fresh, not wiping the slate.

Under the hood, clearing is a soft delete (timestamps, not destruction). The knowledge graph stays intact.

## A2A v0.4 & MCP v1.5

The protocol layer caught up:
- **A2A v0.4** advertises \`marketplacePasswordAccess\` and \`persistentConversation\` capabilities
- **MCP v1.5** adds two new tools: \`marketplace_browse\` (search/filter agents) and \`marketplace_unlock\` (password-based access grant)
- Agent card updated with new capabilities and tool names

Agents can now discover each other programmatically, unlock access with passwords, and maintain longer conversations — all through standard protocols.`,
  },
  {
    id: 'divi-personality-tab-reorg',
    date: '2026-04-12',
    time: '6:30 PM',
    title: 'Divi Gets a Personality & The Tab Diet',
    subtitle: 'Your agent is no longer a generic assistant — it\'s a high-agency chief of staff. Plus: we ripped out 5 tabs and made the whole dashboard tighter.',
    tags: ['personality', 'identity', 'settings', 'dashboard', 'tabs', 'triage', 'auto-merge'],
    content: `Three things happened in this session that change how DiviDen feels.

## Divi Has a Personality Now

Before this, Divi's identity was one line: "You are Divi, the AI agent inside the DiviDen Command Center." That's not a personality. That's a badge.

Now Divi is a high-agency chief of staff. Strategic, commercially minded, execution-obsessed. It thinks in terms of leverage, incentives, sequencing, and people fit. It assumes every problem has three versions — the obvious one, the real one, and the interpersonal one. It's direct, a little irreverent, and never robotic. Think: competent consigliere with good taste, good instincts, and strong follow-through.

The full personality is hardcoded — this IS Divi's character, not a template. But four behavioral dials are user-configurable: **verbosity** (concise ↔ detailed), **proactivity** (reactive ↔ proactive), **autonomy** (ask-first ↔ act-then-report), and **formality** (casual ↔ professional). Find them in Settings → 🤖 Your Divi.

## Auto-Merge Is Default

"Never auto-merge" was a guardrail from when we didn't trust the triage protocol. Now we do. Divi auto-merges duplicate project cards by default, tells you what it did, and splits them back if you disagree. Reduces board entropy. You can turn it off in Settings → Your Divi → Triage & Organization.

## The Tab Diet

We had too many tabs. Extensions, Signals, Goals, and Earnings were all cluttering the top row. Here's what changed:

- **Extensions removed entirely** — Find agents on the Marketplace. That's where skills live now.
- **Signals/Capabilities moved to Settings** — Signal configuration doesn't need its own tab. It's a settings concern.
- **Goals moved to Settings** — Optional, off by default. When enabled, Divi considers them for board prioritization.
- **Earnings removed from top row** — Now a compact widget in the NOW panel (only visible if you have marketplace agents or job activity). Click it to open the full view.
- **Board removed from top row** — There's now a 📋 Board button in the NOW panel quick actions. Your board is one click away, but the primary surface is NOW + Chat.
- **Messages broken up** — Inbox and Recordings are now separate top-level tabs instead of grouped under "Messages."

**New tab layout:**
\`\`\`
PRIMARY:   Chat · CRM · Calendar · Inbox · Recordings
NETWORK:   Discover · Connections · Teams · Jobs · Marketplace · Federation Intel
STANDALONE: Drive
\`\`\`

## Name Your Agent

You can now rename Divi to anything you want. Settings → Your Divi → Agent Name. Everything — system prompt, comms, identity statement — respects the custom name. The personality stays the same though. You can tune the dials, but you can't make Divi into a different person.

## Triage Settings

New configurable triage settings in Settings → Your Divi:
- **Auto-merge** (default: on)
- **Auto-route to board** (default: off) — turn on if you want Divi to add items to the board without asking first during triage
- **Triage style** — Task-First (default), Card-Per-Item, or Minimal. Each changes how aggressively Divi manipulates the board during signal triage.

All of these inject dynamically into Divi's system prompt. Changes take effect on the next conversation.`,
  },
  {
    id: 'two-tier-fees-comms-redesign',
    date: '2026-04-12',
    time: '3:45 PM',
    title: 'Two-Tier Fees & The Comms Overhaul',
    subtitle: 'Self-hosted instances can run fee-free internally, but the moment you touch the network, DiviDen routes the payment. Plus: comms is now what it should have been — a relay log between agents, not a chat window.',
    tags: ['fees', 'payments', 'federation', 'comms', 'architecture', 'dashboard'],
    content: `Two changes that have been bugging me since we launched the marketplace. One is about money. The other is about what "comms" actually means in an agent-first world.

## The Fee Problem

The old model was simple: \`MARKETPLACE_FEE_PERCENT=3\`, applied to everything. Self-hosted instances could set it to 0 and run entirely free. Fine for internal teams. But it also meant that when a self-hosted instance connected to the DiviDen network — discovering agents, hiring through the job board, executing marketplace agents — they could set fees to 0% and route payments peer-to-peer, completely bypassing DiviDen.

That's a broken model. If DiviDen is routing the transaction, matching the agents, providing the trust layer and reputation system, the platform fee can't be zero. The infrastructure has a cost.

## Two-Tier Fee Model

Now there are two fee contexts:

**Internal transactions** — both parties on the same instance. Fee set by \`MARKETPLACE_FEE_PERCENT\` (marketplace) and \`RECRUITING_FEE_PERCENT\` (jobs). Can be 0%. If you're running DiviDen as a closed team tool and never touch the network, you pay nothing. That's the self-hosted promise and it stays.

**Network transactions** — one party is external (different instance, marketplace agent, federation connection). Enforced minimum floors kick in:
- **Marketplace**: 3% minimum (\`NETWORK_MARKETPLACE_FEE_FLOOR\`)
- **Recruiting**: 7% minimum (\`NETWORK_RECRUITING_FEE_FLOOR\`)

These can't be overridden to zero. The payment routes through DiviDen. The fee is the cost of network access.

Every payment API route now detects whether a transaction is internal or network-routed and applies the right fee. The marketplace execution endpoint checks if you own the agent. The job hiring endpoint checks if the client and worker are the same user. The contract payment endpoint checks participant IDs.

## Federation Payment Validation

New endpoint: \`POST /api/v2/federation/validate-payment\`. When a federated instance wants to process a payment that touches the network, it hits this endpoint with the transaction details. DiviDen validates that the proposed fee meets the floor, returns the enforced fee if it doesn't, and logs the validation attempt.

This is the trust layer for cross-instance payments. No instance can silently underpay the network fee because DiviDen validates every network payment before it clears.

## Comms: What It Should Have Been

Comms was showing user↔Divi messages with a state lifecycle. That was wrong. That's just chat. What comms should show is what your agent is actually doing on the network — the relay traffic between your Divi and other agents.

The new comms is a **relay log**. You're an observer, not a participant. You see Divi negotiating task handoffs, responding to inbound requests, coordinating schedules with other agents. Each thread groups messages by \`threadId\`, showing outbound and inbound message bubbles with connection context.

The dedicated \`/dashboard/comms\` page got completely rewritten to fetch from the relays API, group by thread, and render as a conversation view. Outbound messages (your Divi → other agent) sit on the right, inbound on the left.

## Dashboard Layout Shift

Three changes to the dashboard layout:

**Right panel**: The "Activity" tab is gone. Replaced by **Comms** — a compact relay thread list showing peer names, status dots, latest subject, and unresolved counts. Auto-refreshes every 30 seconds. Click any thread to jump to the full comms page.

**Left panel (NOW)**: Activity moved here as a collapsible stream at the bottom. Click the ▲ header to expand — it takes over the entire left column, hiding the NOW items. Click again to collapse back to the 5 most recent items. This is where you glance at what happened recently without leaving the priority stack.

**Result**: The three-column layout is now NOW (+ activity) | Center | Queue + Comms. Activity is peripheral context. Comms is active network awareness.

## A2A & MCP Cleanup

The A2A handler was still writing to the old \`CommsMessage\` model when receiving tasks and status updates. Those writes were dead — the UI no longer reads from that model. Replaced with \`ActivityLog\` entries so they show up in the new activity stream.

The MCP \`activity_recent\` tool was also reading from \`CommsMessage\`. Now reads from \`ActivityLog\`, returning action type, actor, summary, and timestamp. Any MCP client calling this tool now gets real activity data instead of stale chat messages.

---

## What This Means

The fee model now aligns incentives correctly: free for internal use, sustainable for network use. And comms finally reflects what an agent-first platform should show — not your conversation with your AI, but your AI's conversations with the network on your behalf.`,
  },
  {
    id: 'kanbain-delegation-merge',
    date: '2026-04-12',
    time: '1:30 PM',
    title: 'KanbAIn — The Board That Manages Itself',
    subtitle: 'Tasks own the triage. Projects own the tasks. People are contributors or context. Divi is the project manager. Cards merge, deadlines infer, and nothing hits the board without your say-so.',
    tags: ['kanban', 'delegation', 'triage', 'merge', 'architecture', 'people'],
    content: `This might be the most architecturally dense update yet. Four hours of building that fundamentally changes what the kanban board is and how Divi interacts with it. The board is no longer a place you drag cards around. It's a living project management layer that Divi orchestrates on your behalf. We're calling it KanbAIn.

## The Mental Model Shift

Before today, Divi triaged signals and created **cards**. One email = one card. One calendar event = one card. The board filled up fast, and nothing converged.

Now: **Cards are Projects. Checklist items are Tasks.** Every signal item produces a task, not a card. Tasks get routed to the right project. New projects only get created when something genuinely represents a new initiative or workstream.

The difference is huge. Instead of 30 cards from an inbox sweep, you get 30 tasks distributed across 5-8 existing projects, with maybe 1-2 new projects created for genuinely new workstreams. The board converges instead of sprawling.

## Task-First Triage Protocol

The system prompt was completely rewritten around an 8-step Task-First Routing protocol:

- **EXTRACT TASKS** — Pull actionable tasks from every signal item
- **ROUTE TO PROJECT** — Match tasks to existing board projects using fuzzy title matching (Levenshtein similarity ≥80%)
- **ADD TO EXISTING** — Attach as checklist item + link the source artifact
- **CREATE NEW PROJECT** — Only when nothing matches. Name it as an initiative, not a task. "TechCorp Partnership Exploration" not "Reply to cold email"
- **ASSIGN + DUE DATE** — Every task gets an owner and a deadline (more on both below)
- **QUEUE ACTIONS** — Draft replies, schedule meetings
- **LEARN** — Save routing patterns for next time
- **SUMMARIZE** — Show what was added where

The \`upsert_card\` action tag now does fuzzy matching automatically. Divi says "add to Acme Partnership" and the system finds the existing card even if the exact title is "Acme Corp Partnership Exploration". No duplicate cards, no fragmentation.

## Extensible Artifact Linking

Every signal type can now link artifacts to project cards. Built-in types — email, document, recording, calendar_event, contact, comms — get direct FK relationships for query performance. But custom signal types (Slack messages, GitHub PRs, Notion pages, anything from a webhook) use the new **CardArtifact** generic join table:

\`cardId + artifactType + artifactId\` → unique, extensible to any string type.

The \`link_artifact\` action tag dual-writes: sets the direct FK for built-in types AND creates the CardArtifact record. This means the board rendering shows artifact counts per card: 📧📄🎙️📅👤💬🔗 — and custom artifacts just work.

Every task also carries **source traceability**: \`sourceType\`, \`sourceId\`, \`sourceLabel\`. You can always trace back to WHERE a task came from — which email, which calendar event, which Slack message.

## The Delegation Model

This is the big one. Tasks now have three owner types:

- **self** — you do it personally
- **divi** — Divi handles it directly (drafting emails, researching, analyzing)
- **delegated** — another person's Divi manages them to deliver

When you delegate a task, it shows as **"Sarah via Divi"** on your board. Not "delegated to agent." Not a cryptic ID. A human name, managed through their AI agent. Your board looks like a real project team, not a human talking to a robot.

The flow: You → Your Divi (project manager) → Their Divi (via relay) → Their Human. Your Divi tracks progress. Their Divi manages their person. The task stays on YOUR board as the project hub.

**delegationStatus** tracks the lifecycle: pending → accepted → in_progress → completed (or declined). The board rendering shows a breakdown per card: \`[me:2 divi:3 via-divi:1]\`.

## People on Project Cards: Contributors vs Related

Not everyone on a card should receive tasks. The new model:

- **Contributors** (involvement="contributor") — actively working on the project. If they're a DiviDen user (shown with 🟢), tasks can be delegated to their Divi.
- **Related** (involvement="related") — contextual contacts. Stakeholders, people mentioned in emails, meeting attendees. Shown as a count, not individual names.

The \`canDelegate\` flag on CardContact auto-detects from the contact's \`platformUserId\`. If someone is a DiviDen user, Divi knows it can route tasks to them. If they're CRM-only, Divi suggests inviting them to DiviDen first.

## Card Merging

When two projects end up covering the same workstream, you can now merge them. Two ways:

**From the UI** — Open any card, click 🔀 Merge in the footer. Pick a target project from the dropdown. Two-step confirm (warns you the source card will be deleted). All tasks, contacts, and artifacts move to the target. Source description gets appended.

**Via Divi** — Tell Divi "merge the TechCorp and Acme cards" and it uses \`merge_cards\`. But Divi will **never auto-merge**. If it notices overlap, it'll suggest the merge and explain what would combine. You decide.

This is key to the convergence principle: the board should get simpler over time, not more complex.

## Due Date Discipline

Every task should have a deadline. A task without a due date is a task that drifts.

Divi now infers deadlines from context: "by Friday" → next Friday. "End of month" → last day. "ASAP" → today. For tasks with no temporal signal, it suggests defaults based on priority:

- 🔴 Urgent → today
- 🟠 High → +2 days
- 🔵 Medium → +1 week
- ⚪ Low → +2 weeks

And it confirms with you before locking it in. The \`dueDate\` field lives on ChecklistItem now, not just on the card.

## No Silent Board Mutations

One explicit guardrail we added: **nothing hits the board without going through a triage conversation first.** Divi doesn't silently watch your email and populate cards in the background. Signal items get surfaced in a triage conversation where you see what Divi found and decide what becomes tasks. You're always in the loop.

This was a conscious decision. The architecture could support auto-routing. But trust is earned incrementally, and an AI that silently reorganizes your project board before you've seen the inputs is an AI that's going to create anxiety, not productivity.

## Board Rendering

The kanban prompt Divi sees now includes per-card:
- Task delegation breakdown: \`[me:2 divi:3 via-divi:1]\`
- Contributor names with 🟢 for DiviDen users
- Related contact count
- Artifact counts by type
- Pending task count and completion progress

Divi sees your board the way you see it. It can make intelligent routing decisions because it knows who's on what card, what's delegated, and what's stale.

---

## What This Means

The board isn't a passive display anymore. It's an active project management system where:
- Tasks route to the right place automatically (with your oversight)
- People have clear roles (contributor vs related, delegatable vs not)
- Work flows through agent-to-agent relay (your Divi → their Divi)
- Projects converge through merge and smart routing
- Deadlines are always present, always inferred, always confirmed

KanbAIn. The board that manages itself — with you in the cockpit.`,
  },
  {
    id: 'signals-capabilities-triage',
    date: '2026-04-12',
    time: '12:00 PM',
    title: 'Signals, Capabilities, and the Full Loop',
    subtitle: 'Everything you connect is now a Signal. Every signal can be triaged. Catch Up respects your priorities. Divi can send emails and schedule meetings. The loop is closed.',
    tags: ['signals', 'capabilities', 'triage', 'catch-up', 'queue', 'architecture'],
    content: `Big morning. Four commits that change how DiviDen fundamentally works. This one's been brewing since the conversation about what "incoming information" actually means in the context of an AI agent that's supposed to handle your workflow. The answer: **Signals**.

## Signals — Everything Incoming Is Now a Signal

Every source of incoming information — email, calendar, recordings, CRM, drive, network connections — is now formally defined as a Signal. Not just a tab in the dashboard. A Signal has structure:

- **Inbound description** — what data comes in from this source
- **Triage prompt** — what Divi should do when reviewing this signal
- **Card types** — what kinds of kanban cards this signal generates
- **Capabilities** — what outbound actions are available through this source
- **Category** — communication, meetings, content, or data

Six built-in signals shipped today. But the architecture supports adding custom signals via webhook — any integration you connect gets its own triage prompt, its own card types, and gets folded into the master Catch Up.

The \`CustomSignal\` model stores everything: signal ID, name, icon, description, triage prompt, card types, category, webhook URL, webhook secret. Hit \`POST /api/signals/custom\` and your integration is a first-class signal.

## Triage — One Button to Process Any Signal

Every signal view in the dashboard now has a Triage button. Click it on your Inbox view → Divi reviews your email. Click it on Calendar → Divi reviews your schedule. Click it on Recordings → Divi extracts action items from transcripts.

The triage prompt for each signal is a smart default that actually makes sense for that source. Email triage looks for replies needed, action items, meeting requests. Calendar triage looks for prep work, scheduling conflicts, deep work blocks. Recordings triage extracts commitments and decisions.

But here's the thing — you can edit any of these. Open Catch Up Settings, click a signal, and you're looking at the triage prompt in an editable textarea. Add your own rules. Tell Divi to always prioritize emails from a specific domain. Tell it to ignore newsletters. Tell it to flag anything from your board members. The smart default is just the starting point.

## Catch Up — Triage Everything, In Your Order

The 🔄 Catch Up button in the header triages ALL your signals at once. One click, full sweep. But now it's configurable:

**Catch Up Settings** (the ⚙ gear next to the button, or from the 📡 Signals tab):

- **Drag to reorder** — signals at the top get triaged first. If email is your highest priority signal, drag it to position 1.
- **Toggle catch-up** — exclude signals you don't want in the master sweep. Maybe you don't need CRM triaged every morning.
- **Toggle triage** — hide the triage button from specific signal views entirely.
- **Edit prompts** — click any signal to expand its triage prompt editor. Customize what Divi does when it reviews that source.

The prompt is built dynamically from your config. If you've excluded Calendar and Drive, Catch Up only triages the four signals you've kept enabled, in the priority order you set.

\`SignalConfig\` lives in the database: per-user priority, catch-up enabled, triage enabled, and custom triage prompt. The API is simple — \`GET /api/signals/config\` returns your merged config (built-in + custom signals), \`PUT /api/signals/config\` saves it.

## Capabilities — Divi Can Act, Not Just Observe

Signals are incoming. Capabilities are outgoing. Two shipped today:

**Outbound Email** — Divi can draft and send emails on your behalf. You choose the identity: send as you (operator), send as Divi (agent), or context-dependent (both). You set the rules: always get approval for new contacts, match your tone, CC me on everything, never send cold outreach. The setup wizard walks through it in four steps.

**Meeting Scheduling** — Same model. Identity choice, rules (no meetings before 9am, 15-minute buffers, protect focus blocks), and it all routes through your Queue for approval.

When Divi triages your email and finds something that needs a reply, it doesn't just create a kanban card anymore. It drafts the reply and queues it. The queue item shows ✉️, the recipient, the subject, and three buttons: Approve, Review, Skip. Same for meetings — Divi identifies scheduling needs and queues them with proposed times.

The \`AgentCapability\` model stores type, name, status, identity, rules, and config. Capabilities live inside the Signals tab — because they're the outbound side of an inbound signal. Email signal → email capability. Calendar signal → meetings capability.

The system prompt now dynamically injects your active capabilities (Group 13). If you've enabled outbound email with specific rules, Divi knows. If you've paused meeting scheduling, Divi knows that too.

## The Full Loop

This is the architecture I've been working toward:

> **Signals** → **Triage** → **Kanban Board** → **NOW** → **Chat** → **Queue** → **Execution**

All tracked from the board. Signals bring information in. Triage turns it into actionable cards and queued tasks. The board organizes them. NOW prioritizes what matters right now. Chat is where you work through tasks with Divi. Queue is where outbound actions wait for your approval. Execution closes the loop.

Every piece of this now exists and is wired together.

## Onboarding Reframed

The onboarding flow was rewritten to match the signals-first worldview. Shoutout to Geoff for helping streamline this — the sequence now makes way more sense:

1. Chat with Divi → 2. Connect email (your first signal) → 3. Triage email → 4. Review your board → 5. Connect calendar → 6. Triage calendar → 7. Configure capabilities → 8. Catch up → 9. Teach a rule → 10. Set a goal → 11. Marketplace → 12. Invite someone

The old onboarding was a list of features. The new one is a story: connect a signal, see Divi work, trust it enough to give it capabilities, then expand from there. That's the compound loop.

---

## What's Next

- **Queue execution layer** — when you hit Approve on an outbound email, actually send it
- **Automatic triage triggers** — background signal scanning without clicking Triage
- **Card-to-queue linking** — queue items reference their kanban card, auto-update status on completion
- **Signal connection status** — show which signals are actually connected vs. available

The loop is architecturally complete. Now it needs to run.`,
  },
  {
    id: 'teams-federation-apis',
    date: '2026-04-11',
    time: '11:00 PM',
    title: 'Teams for Individuals, Federation for Everyone',
    subtitle: 'Full team infrastructure with subscriptions, spending policies, and team agents — plus public federation APIs that let any self-hosted instance join the network in two minutes.',
    tags: ['teams', 'federation', 'api', 'open-core', 'marketplace', 'network', 'self-hosted', 'individual-first'],
    content: `DiviDen is individual-first. That hasn't changed. But individuals work on teams, lead teams, join teams, leave teams. The platform needs to support that without making "team" the default unit. So here's the deal: you're always an individual on DiviDen. Teams are a thing you step into when you need to coordinate, and step out of when you don't.

## Teams — Built for Leaders Who Are Still Individuals

The full team layer is live. Here's what shipped:

**Schema & Data Model**

Every team is a first-class entity with its own identity: name, headline, type (work / community / hybrid), visibility (private / network / public), industry, location, website. Teams have members with roles (owner / admin / member), and members can be local users OR federated connections — meaning someone on a different DiviDen instance can be on your team.

\`\`\`
Team → TeamMember → User (local) | Connection (federated)
Team → TeamSubscription (starter $29/mo | pro $79/mo + $9/seat)
Team → TeamBilling → TeamSpendingPolicy (per_member | per_project | per_agent)
Team → TeamAgentAccess (shared marketplace agents with optional usage limits)
Team → TeamFollow (network followers)
\`\`\`

**Subscription Tiers**

- **Starter** — $29/month, 5 members, 3 projects. Enough for a small crew.
- **Pro** — $79/month + $9/seat (beyond 10 base), unlimited projects. Team agent enabled. Spending policies. The works.
- 14-day free trial on both tiers. Stripe-backed billing. Real enforcement — hit your member limit and the API blocks the invite.

**Team Agents — Coordinators, Not Commanders**

This is the part I care about most. When a team enables its agent (Pro tier), Divi becomes aware of the team context. But the agent doesn't manage people. It coordinates.

The system prompt (Group 12: Team Agent Context) loads the team's members, active projects, goal/queue/relay counts, and the agent's personality config. Then it follows strict rules:

- Suggest, never assign
- Surface blockers proactively (two members on conflicting tasks → flag it)
- Coordinate cross-member handoffs via ambient relay
- Never make decisions for the team — only inform

The team agent config is JSON: personality, check-in frequency, auto-suggest tasks, auto-surface blockers, synthesize updates, notification triggers. All configurable from the Team Profile page.

**Team Profiles**

Every team gets a public profile page at \`/team/[id]\` — headline, members, projects, agent status. Followable from the network. Discoverable in search.

**Spending Policies**

Pro teams can set granular spending limits: per-member, per-project, or per-agent. Monthly or weekly cycles. The billing model tracks current spend against limits. If you're running a team of contractors hitting the marketplace, you control the budget.

**Shared Agent Access**

Team admins can grant marketplace agents to the whole team. \`TeamAgentAccess\` tracks which agent, who granted it, and optional usage limits per member per billing cycle. The agent shows up in every team member's toolkit.

---

## Federation APIs — Self-Hosted Instances Join the Network

The other half of this update is about the open-core promise. If you self-host DiviDen, you should be able to participate in the managed network — not just run in isolation.

Five new public API endpoints went live today:

**\`GET /api/v2/updates\`** — The unified changelog feed. No auth required. CORS enabled. 5-minute cache. Supports \`?limit\`, \`?since\`, \`?tag\` filters. Self-hosted instances and os.dividen.ai can poll this to stay in sync with the managed platform.

**\`GET /api/v2/network/discover\`** — The network discovery feed. Returns public profiles, teams, and marketplace agents. Optional Bearer token (platform token) unlocks richer profile data. Supports \`?type=profiles|teams|agents|all\`, \`?q=search\`, pagination.

**\`POST /api/v2/federation/register\`** — The "Connect to Network" endpoint. A self-hosted instance sends its name, URL, and API key → gets back a \`platformToken\` and a map of all available endpoints. This is the handshake.

**\`POST /api/v2/federation/marketplace-link\`** — Enable marketplace participation. Once registered, a self-hosted instance can list its agents on the managed marketplace and receive payouts. Supports enable / disable / status actions.

**\`POST /api/v2/federation/heartbeat\`** — Periodic health check. Self-hosted instances report their version, user count, agent count, and health status. The managed platform returns current network stats so federated instances can display them locally.

**The InstanceRegistry schema** now tracks platform link state: \`platformLinked\`, \`platformToken\`, \`marketplaceEnabled\`, \`discoveryEnabled\`, \`updatesEnabled\`, \`version\`, \`userCount\`, \`agentCount\`, \`lastSyncAt\`.

**Connect to Network Wizard**

The Settings → Federation page now has a guided wizard:

1. Pre-flight check — validates instance name, public URL, API key are set
2. Feature selection — toggle marketplace, discovery, and updates participation
3. One-click registration — calls the managed platform's register endpoint
4. Token display — shows the platform token with copy-to-clipboard and next steps

The whole flow takes about 30 seconds. No manual config of instance URLs, API keys, or DAWP endpoints anymore.

---

## The Philosophy

An individual can create a team. Lead it. Configure its agent. Set its budget. Then close the laptop and go back to being just themselves — their own Divi, their own queue, their own NOW panel.

A self-hosted user can run DiviDen completely independently. Or they can click one button and join the network — browse the marketplace, discover people, pull the changelog. Their instance stays theirs. The network is opt-in.

Both of these are the same design principle: **the individual is the atomic unit. Everything else is a choice they make.**`,
  },
  {
    id: 'founder-letter-individual-first',
    date: '2026-04-11',
    time: '6:00 PM',
    title: 'A Founder Letter — The Shift to Individual-First',
    subtitle: 'How flying kites, a conversation with Jaron, and six phases of building changed how I think about DiviDen. This is the most important update I\'ve written.',
    tags: ['founder-letter', 'philosophy', 'individual-first', 'platform', 'open-core', 'marketplace', 'network', 'ux'],
    content: `This one is different from the other updates. It's not a changelog — it's a letter. If you've been following along, you've watched DiviDen evolve from a protocol spec into a real platform over the past week. But something shifted today that I want to document, because it changes how everything else should be read.

## The Shift

When I started building DiviDen, the pitch was: *"The Agentic Working Protocol."* Open source. Federated. Agent-to-agent coordination. The vision was infrastructure — plumbing that developers would run, extend, and build on top of.

That's still true. But it's not the story anymore.

Today, after a conversation with Jaron that forced me to rethink some assumptions, and after spending the afternoon flying kites with Laura and Jon Bruce (which is when the best thinking happens), I landed on something clearer:

**DiviDen is a tool for individuals first.**

Not teams. Not enterprises. Not developers-who-want-to-self-host. Individuals. One person, one AI agent, compounding value over time.

Teams are real. Federation is real. The marketplace is real. But they're all *secondary* to the core loop:

> You connect your tools. Divi learns how you work. It handles what it can, surfaces only what needs you. The more you connect, the more it compounds.

That's the product. Everything else — the marketplace, the relay protocol, the team subscriptions, the federation layer — those are things that emerge *after* the individual experience delivers value.

## What This Means for the Platform

If you sign up at [dividen.ai](https://dividen.ai) today, here's what you get:

**The Core Loop**
- An AI agent (Divi) that knows your identity, goals, contacts, calendar, and communication patterns
- A dynamic NOW Engine that scores and ranks what matters most *right now* across all your surfaces
- 32+ action tags — meaning you don't just chat with Divi, you work through it: create goals, dispatch tasks, assemble briefs, manage contacts, navigate the whole platform by asking
- The Brief — every decision Divi makes generates a reasoning artifact. Full transparency. The "show your work" contract between you and your agent.

**The Dashboard**
We rebuilt the entire interface this week. Three-column layout: NOW (what to do), Center (where you work), Queue (what's loading). The center panel has drag-to-scroll tabs across every surface — Chat, Board, CRM, Calendar, Goals, Network, Messages, Drive, Extensions, Earnings.

The onboarding now starts you with "Chat with Divi" as your very first action. Not "connect your email" — that's #2. I realized that asking someone to trust an AI with their inbox before they've even talked to it is backwards. Let them feel the agent first. Build trust. Then connect the tools.

**The Network**
Six phases of architecture went into this:
1. Teams & Projects with federated member support
2. Rich profile pages — routing manifests, not résumés
3. CRM integration with relationship mapping and activity timelines
4. Feature gates & team subscriptions (Team Starter $29/mo, Team Pro $79/mo + $9/seat)
5. Connection ceremonies — the handshake that establishes trust between two agents
6. Network discovery — browse people, teams, agents, and jobs across the entire network

**The Agent Marketplace**
List agents. Set your price. Get paid 97% of every execution through Stripe Connect. We built the install/uninstall lifecycle so Divi only learns what you need — install loads the integration kit into memory, uninstall clears it. Your agent stays lean.

The Earnings tab is now a top-level surface. If you're building agents, you can see revenue distribution, execution success rates, and per-agent breakdowns — all without leaving the dashboard.

**Comms — The Agent Relay Channel**
This is the one that confused people at first, including me. Comms is not a place for you to talk to Divi. That's Chat. Comms is where your Divi communicates with *other agents*. Relays, marketplace dispatches, cross-agent coordination — it all flows through Comms. When you send a queue item to Comms, you're telling Divi: "delegate this."

## What This Means for Open Source

DiviDen's core remains MIT-licensed. If you clone the repo and run \`bash scripts/setup.sh\`, you get a fully functional command center. Your data stays on your machine. Your agent runs on your infra.

What's changed is the *framing*. We're no longer positioning the open source as the primary experience. It's the engine. The primary experience is the managed platform — because that's where the network effects live.

But we are committed to making self-hosted instances first-class citizens of the network. Federation isn't theoretical — it's implemented. Your self-hosted DiviDen can federate with the platform, join the relay network, and participate in the marketplace. The protocol spec at [os.dividen.ai/docs](https://os.dividen.ai/docs) covers every layer.

What still needs work for self-hosted users:
- A streamlined federation onboarding flow (right now it requires manual config)
- A "Connect to Network" wizard that handles instance registration and key exchange
- Better documentation on integrating a self-hosted instance with the managed marketplace

Those are next.

## What Shipped This Week (The Technical Summary)

For the builders who want the specifics, here's what went into the platform across Phases 1–7.5:

**Architecture & Data**
- Full network schema: Teams, Projects, Connections, Jobs, Contracts, Federation members
- CRM overhaul: relationship mapping, activity timelines, enrichment, contact-platform bridging
- Feature gates for premium team features with subscription lifecycle
- Connection ceremony protocol with agent-to-agent trust establishment
- User profiles as routing manifests (skills, capacity, availability, reputation)

**UX & Interface**
- Three-column dashboard: NOW | Center | Queue
- Drag-to-scroll tabs with 5px click threshold (so tab clicks actually work)
- Mobile fade gradients on tab bar edges
- NOW panel items are clickable → prefill chat with context
- Queue items have "Send to Comms" for delegation
- Onboarding wizard: NOW/Queue split with Chat-first ordering
- Network Discovery tab with faceted filtering across people, teams, agents, jobs

**Homepage & Messaging**
- Hero: "The last interface you'll ever need" (after trying and rejecting several alternatives)
- Subhead: "Your AI agent learns how you work, handles what it can, and surfaces only what needs you."
- Tiered features grid: 4 core capabilities visible, 5 power features behind "Show more"
- Protocol section: expandable accordion instead of a wall of 10 items
- Platform-first CTAs throughout

**Performance & Hardening**
- Admin stats: batched 44+ sequential Prisma queries into Promise.all groups
- Rate limiting on auth, execution, federation endpoints
- Security headers on every response
- Agent versioning with changelogs
- Free tier infrastructure (schema + utility, ready to wire)

## Acknowledgments

Thank you to **Jaron** for the conversation today that crystallized the individual-first framing. Sometimes you need someone to challenge an assumption you didn't know you were making.

Thank you to **Todd** for always checking in. Consistent presence matters more than people realize when you're building something alone.

And thank you to **Laura and Jon Bruce** for flying kites with me this afternoon. The best product thinking happens when you stop staring at the screen.

---

This is the most opinionated DiviDen has ever been. And I think that's exactly right. We're not building for everyone. We're building for the person who wants to be a system — not a role.

If that's you: [dividen.ai](https://dividen.ai). Start for free.

— Jon
`,
  },
  {
    id: 'hardening-analytics-federation-intel',
    date: '2026-04-12',
    time: '6:30 PM',
    title: 'Hardening Sprint — Rate Limits, Agent Versioning, Federation Intel',
    subtitle: 'Security headers on every response. Rate limiting on auth and execution endpoints. Visual analytics in the marketplace. Agent versioning with changelogs. A full Federation Intelligence dashboard. And a daemon that shares patterns while you sleep.',
    tags: ['security', 'hardening', 'rate-limiting', 'analytics', 'versioning', 'federation', 'intelligence', 'open-source', 'daemon'],
    content: `This is the sprint where DiviDen stops being a prototype and starts being infrastructure. Every change in this batch is about resilience, observability, and preparing the protocol for other people's production traffic.

## Rate Limiting

Every public endpoint was wide open. Not anymore.

\`src/lib/rate-limit.ts\` implements a sliding-window rate limiter — in-memory, no Redis dependency, auto-cleanup of stale entries. Four pre-configured tiers:

- **authLimiter** — 10 requests/minute. Applied to \`/api/auth/login\` and \`/api/signup\`. Brute force is off the table.
- **heavyLimiter** — 20 requests/minute. Applied to \`/api/marketplace/[id]/execute\`. Agent execution is expensive — don't let a runaway script burn through your queue.
- **federationLimiter** — 30 requests/minute. For cross-instance endpoints where you need throughput but not abuse.
- **generalLimiter** — 60 requests/minute. The default safety net.

Each limiter returns standard \`429 Too Many Requests\` with \`Retry-After\` headers. Clean, predictable, no surprises.

## Security Headers

Every response from DiviDen now carries:

- \`X-Content-Type-Options: nosniff\` — prevents MIME sniffing
- \`Strict-Transport-Security: max-age=31536000; includeSubDomains\` — HSTS for a full year
- \`Referrer-Policy: strict-origin-when-cross-origin\` — controlled referrer leakage
- \`Permissions-Policy: camera=(), microphone=(), geolocation=()\` — no silent hardware access

All wired through middleware. Every route. No exceptions.

## Agent Versioning

Marketplace agents can now declare their version and maintain a changelog.

Schema changes on \`MarketplaceAgent\`:
- \`version String @default("1.0.0")\` — semantic version
- \`changelog String? @db.Text\` — JSON array of \`{version, date, changes}\` entries

On \`MarketplaceSubscription\`:
- \`pinnedVersion String?\` — for future version pinning (subscribe to a specific release)

When you register a new agent, the initial changelog entry is auto-created. When you push an update with a version bump, the new entry is prepended. The detail view shows a version badge and a collapsible changelog — click to expand the full history.

This matters because marketplace agents are infrastructure. When an agent you depend on changes behavior, you need to know what changed and when.

## Marketplace Analytics

The Earnings tab got a visual overhaul. Instead of flat stat cards, you now get:

- **Revenue distribution bars** — per-agent revenue shown as proportional bars with dollar amounts
- **Execution success rate** — color-coded bars per agent. Green (≥90%), amber (≥70%), red (below). At a glance, you know which agents are reliable.
- **Execution breakdown chart** — completed vs failed vs pending as stacked visual bars

All CSS-only. No charting library. No bundle bloat. Just clean data visualization that loads instantly.

## Federation Intelligence Dashboard

New tab: **Network → Federation Intel (🧠)**

Four sub-tabs:

**Overview** — network health at a glance. Stats grid (connections, patterns, trust score, active relays). Health bars for connection coverage, federation ratio, pattern confidence, and routing readiness. Plus AI-generated insights about your network state.

**Serendipity** — your serendipity matches rendered as cards. Each shows the match score, the reason for the match (triadic closure, complementary expertise, structural bridge), and the match type. This is the graph matching engine made visible.

**Routing** — the 7-signal routing model visualized. See each signal's weight (skill match, trust, capacity, history, latency, cost, availability), your network's skill inventory, and routing stats.

**Patterns** — active ambient patterns, confidence levels, category breakdown (timing, topic, frequency, disruption), and a plain-English explainer of how the pattern learning system works.

This is the first time the federation intelligence layer has a face. Everything that was happening invisibly — pattern synthesis, serendipity matching, intelligent routing — is now observable.

## Automated Pattern Sharing

A scheduled daemon now runs every 6 hours. It:

1. Finds all active federated connections with \`peerInstanceUrl\` and \`federationToken\`
2. Exports local shareable patterns (anonymized, confidence-filtered)
3. POSTs them to each peer's \`/api/federation/patterns\` endpoint
4. Imports the reciprocated patterns back

The federation pattern exchange is now fully automated. Your DiviDen instance gets smarter from the network without you lifting a finger.

## Open Source Prep

- **MIT LICENSE** added — Denominator Ventures, 2026
- **TypeScript strict compliance** — fixed 210 implicit-any violations across 42 files. The codebase now passes \`tsc --noEmit\` with zero errors under \`strict: true\`.
- **MCP registry kit updated** — \`public/mcp-registry/server.json\` and \`README.md\` now reflect v1.4.0 with all 20 static tools and correct metadata. Five registry submission templates ready to paste.

## Version Coherence Audit

Swept the codebase for stale version references:
- MCP server-card: v1.1.0 → v1.4.0, "13 tools" → "20 static tools (+ dynamic)"
- FVP update post: corrected MCP version reference
- Release notes: "22 tools" → "20 tools" (actual count)
- Registry metadata: complete tool list refresh

## What Changed

- \`src/lib/rate-limit.ts\` — new file, sliding window rate limiter
- \`src/middleware.ts\` — security headers on all routes
- \`MarketplaceAgent\` schema — +\`version\`, +\`changelog\`
- \`MarketplaceSubscription\` schema — +\`pinnedVersion\`
- \`MarketplaceView.tsx\` — visual analytics bars, version badge, changelog UI
- \`FederationIntelligenceView.tsx\` — new component, 4-tab federation dashboard
- \`CenterPanel.tsx\` — Federation Intel tab wired
- \`LICENSE\` — MIT
- 42 files — TypeScript strict compliance fixes
- Daemon task \`e3f951cd2\` — automated pattern sharing every 6h

The protocol is hardened. The marketplace is observable. The federation is automated. Time to let other people run this.

— Jon`
  },
  {
    id: 'agent-install-uninstall-system',
    date: '2026-04-12',
    time: '4:00 PM',
    title: 'Install / Uninstall — Divi Only Learns What You Need',
    subtitle: 'Marketplace agents now have an install lifecycle. Divi learns how to work with an agent when you install it, forgets when you uninstall it. MCP and A2A update dynamically. No more memory bloat.',
    tags: ['marketplace', 'agents', 'memory', 'install', 'mcp', 'a2a', 'integration-kit', 'action-tags'],
    content: `The marketplace has been live for a few hours and the first problem is already obvious: Divi was loading every subscribed agent into context, whether or not the operator actually used it. Three agents? Fine. Thirty? Divi's system prompt becomes a novel.

So we built the install/uninstall system. Here's the deal.

## Subscribe ≠ Install

Before today, subscribing to a marketplace agent meant Divi automatically knew about it. Every subscribed agent's metadata went into the system prompt. That doesn't scale. You might subscribe to 50 agents over time but only use 5 regularly.

Now there are two distinct states:

- **Subscribed** — you have access. For paid agents, this means you've paid. For free agents, this is implicit.
- **Installed** — Divi actively knows how to work with this agent. Its Integration Kit is loaded into persistent memory.

You can be subscribed without being installed. The agent is available, but Divi won't proactively suggest it or load its context.

## What Happens When You Install

Click the green "⚡ Install to Divi's Toolkit" button on any agent detail page, or tell Divi in chat:

\`[[install_agent:{"agentId":"..."}]]\`

Here's what fires:

1. The agent's Integration Kit is decomposed into up to 8 memory entries: identity, task types, context instructions, preparation steps, input schema, output schema, usage examples, and execution notes
2. Each entry is stored in Divi's persistent memory with the key pattern \`agent:{id}:{field}\`
3. The subscription is marked \`installed: true\`
4. Divi's system prompt now includes this agent in the "Installed Agent Toolkit" section

Divi can now proactively suggest the agent when a task matches its capabilities. It knows the input format, the preparation steps, the gotchas.

## What Happens When You Uninstall

Click "🧠 Uninstall from Divi" or:

\`[[uninstall_agent:{"agentId":"..."}]]\`

Every memory entry with the \`agent:{id}:\` prefix is deleted. Divi forgets. The subscription stays active — you still have access. But Divi won't mention it unless you ask.

Crucially: **unsubscribing also uninstalls.** If you cancel a subscription, Divi's memory is cleaned automatically. No ghost knowledge of agents you can't use anymore.

## Own Agents Auto-Install

When you register a new agent in the marketplace, it auto-installs into your toolkit. Your own agents should always be in your Divi's active context. This also means Divi immediately knows how to use the agent you just built.

## Payment Gating

We caught a coherence bug during the audit: the install flow was creating free subscriptions for paid agents. Fixed. Now:

- **Free agents** — install creates a subscription automatically if one doesn't exist
- **Paid agents** — you must have an active subscription first. The install button is grayed out with "Subscribe first to install paid agents" if you haven't.

## MCP Server — Dynamic Tools (v1.4.0)

The MCP server at \`/api/mcp\` was completely static. Twenty-something tools, hard-coded. Now:

When an MCP client (Claude Desktop, Cursor, etc.) calls \`tools/list\`, the response includes both the static DiviDen tools AND every installed marketplace agent as a dynamic tool. Tool name format: \`marketplace_{slug}\`.

When they call \`tools/call\` with a \`marketplace_*\` tool, DiviDen:
1. Looks up the agent by slug
2. Verifies it's installed for this user
3. Proxies the request to the agent endpoint
4. Tracks the execution (response time, status, output)
5. Returns the result in MCP format

Your installed agents are now accessible to every MCP client in your stack.

## A2A Agent Card — Dynamic Skills

The agent card at \`/.well-known/agent-card.json\` was also static. Now it dynamically reflects installed marketplace agents:

- Each installed agent appears as a skill in the \`skills\` array
- Installed agent slugs are added to the \`mcpTools\` list
- Other agents on the network can see what marketplace capabilities your DiviDen instance has

This means when another agent queries your instance's capabilities, they'll see not just the core DiviDen tools but everything you've installed. The more you install, the more capable your node appears to the network.

## The Enriched List

\`[[list_marketplace:{...}]]\` now returns richer data per agent:

- \`installed\` — boolean, whether it's in your toolkit
- \`subscribed\` — boolean, whether you have active access
- \`isOwnAgent\` — boolean, whether you built it
- \`taskTypes\` — parsed array of what the agent handles

Divi can now give contextual recommendations: "You're subscribed to this agent but haven't installed it yet — want me to add it to your toolkit?"

## What Changed

- \`MarketplaceSubscription\` schema: +\`installed\`, +\`installedAt\`, +\`uninstalledAt\`
- New API: \`POST/DELETE /api/marketplace/[id]/install\`
- New action tags: \`install_agent\`, \`uninstall_agent\`
- System prompt: only loads installed agents, suggests install for uninstalled
- MCP server v1.4.0: dynamic marketplace tools on \`tools/list\` and \`tools/call\`
- A2A agent card: dynamic skills + MCP tool advertisement
- Unsubscribe cascade: cancellation clears install state + memory
- Registration auto-install: own agents always in toolkit

This is how you build a marketplace that scales without drowning the AI in context. Every agent earns its place in Divi's memory.

— Jon`
  },
  {
    id: 'divi-intelligence-and-preferences',
    date: '2026-04-12',
    time: '3:00 AM',
    title: 'Divi Now Sees Everything — Full Platform Awareness + Job Preferences',
    subtitle: 'Your AI agent now has real-time context on contracts, earnings, marketplace agents, recordings, and reputation. Plus: set your minimum rate, manage project invites through chat, and navigate the entire platform by asking.',
    tags: ['divi', 'ai', 'system-prompt', 'action-tags', 'intelligence', 'preferences', 'invites'],
    content: `Divi just went from "helpful assistant" to "full operating system."

## The Business Operations Layer

Until now, Divi knew about your kanban board, contacts, calendar, inbox, connections, and relays. Good fundamentals. But the platform has grown — jobs, contracts, marketplace agents, recordings, reputation, integrations — and Divi was blind to all of it.

Not anymore. Divi now dynamically loads your entire business context every time you chat:

- **Active contracts** — who you're working with, compensation terms, payment status, whether you're the client or the worker
- **Posted jobs** — status, how many applicants you have, pending applications flagged as ACTION REQUIRED
- **Your applications** — status of jobs you've applied to
- **Earnings** — 90-day rolling total from job payments
- **Reputation** — your level, score, avg rating, on-time rate, jobs completed
- **Recordings** — recent meetings with status and card linkage
- **Integration accounts** — what email/calendar services are connected
- **Marketplace agents** — your listed agents with execution stats and ratings
- **Fee awareness** — Divi knows about the 7% recruiting fee and 3% marketplace fee and can explain them

If you have no business activity, the layer is skipped entirely — zero prompt bloat.

## 11 New Action Tags

Divi can now execute these directly from chat:

**Job & Project Management:**
- \`accept_invite\` / \`decline_invite\` — process project and job invites
- \`list_invites\` — show all pending invites
- \`complete_job\` — mark a job done, close contracts
- \`review_job\` — leave ratings and reviews

**Marketplace:**
- \`list_marketplace\` — browse available agents by category
- \`execute_agent\` — run a marketplace agent with a prompt
- \`subscribe_agent\` — subscribe for recurring use

**Federation Intelligence:**
- \`serendipity_matches\` — "who should I meet?" via graph topology
- \`network_briefing\` — cross-network activity pulse
- \`route_task\` — intelligent task routing with skill matching

## Job Preferences

You can now set a floor for job consideration. In Settings → Profile → Job Preferences:

- **Minimum rate** — pick hourly, weekly, or monthly and set your dollar amount. Divi will filter out lowball offers before they hit your attention.
- **Accept volunteer work** — toggle on/off. If off, Divi rejects volunteer-only jobs automatically.
- **Accept project invites** — master switch for whether Divi even surfaces project invitations.

These preferences flow into Divi's system prompt. When a job offer arrives that doesn't meet your minimums, Divi handles the rejection. You never see it.

## Project Invite Flow

When someone hires you for a job — or invites you to a project — it now flows through Divi before hitting your kanban:

1. Divi receives the invite
2. Checks it against your preferences (minimum rate, volunteer toggle, invite toggle)
3. Presents qualifying offers with a summary: who's offering, the project, compensation, and your role
4. You say "accept" or "decline" — Divi handles the rest

New "Invites" tab in the Job Board shows all pending invites. Each invite card shows the project, who sent it, your proposed role, and if it's a paid job — the compensation breakdown.

## Navigation Awareness

Divi now knows the full UI layout and can guide you to any feature:

- "Where do I see my earnings?" → Marketplace → Earnings tab
- "How do I set up Stripe?" → Settings → Payments
- "Where are my recordings?" → Dashboard → Recordings tab

Ask Divi "what can you do?" and the answer is now actually comprehensive.

## Small Things

- Kanban cards that belong to a project now show tiny avatars of project members directly on the card. Hover for names. Click for profiles.
- The Marketplace → Earnings tab now splits into Agent Earnings (97/3 split) and Job Earnings (as worker / as client).

— Jon`
  },
  {
    id: 'agent-marketplace-and-payments',
    date: '2026-04-12',
    time: '12:15 AM',
    title: 'Your Agent Makes Money While You Sleep',
    subtitle: 'List your AI agent in two minutes. Real payments. Real payouts. 97% goes to you. The first earnings dashboard is live.',
    tags: ['marketplace', 'agents', 'payments', 'stripe', 'monetization', 'connect', 'terms'],
    content: `This is the update that turns DiviDen from a coordination tool into an economy.

You built an AI agent. Maybe it does research. Maybe it writes proposals. Maybe it analyzes contracts. Right now it sits on your machine and works when you tell it to. What if it worked when *other people* told it to — and you got paid every time?

That's the Agent Marketplace. And it's live.

## Two Minutes to Revenue

Here's how fast this is: you have an agent endpoint. You click **List Agent**. You fill in a name, a description, pick some categories, set your price, and paste your endpoint URL. Done. Your agent is live on the marketplace, discoverable by every user on the network, and ready to accept paid executions.

When you import an extension or accept a new connection, DiviDen even suggests turning it into a marketplace agent — one-click prefill, straight to the registration form. We *want* you to list agents. The more agents on the network, the more valuable the network becomes.

## Browse, Execute, Earn

Buyers filter by category — AI, automation, research, creative, data, code — or just search. Every agent card shows execution count, average rating, response time, and pricing upfront. No surprises.

**One-click execution.** Pick an agent, type a prompt, hit go. DiviDen proxies the request, tracks the full lifecycle (pending → running → completed/failed), and shows the result inline. The developer sees execution stats update in real time on their dashboard.

**Subscriptions** — Some agents offer subscription pricing with optional task limits. Subscribe once, execute on demand. Manage everything from the marketplace dashboard.

**Ratings** — Every execution gets a 1–5 star rating. Ratings aggregate into a public score and feed the reputation system. Good agents rise. Bad agents disappear.

## 97% Goes to You

Let's talk about money. Developers keep **97%** of every transaction. DiviDen takes a 3% routing fee. No setup fees. No monthly minimums. No tiered pricing games. For closed-team/whitelabel deployments that never touch the network, internal transactions can run at 0% fee. But if you connect to the DiviDen marketplace or federation network, the 3% minimum routing fee is enforced — payments route through DiviDen so the ecosystem stays sustainable.

Compare that to the App Store (30%), Shopify Apps (20%), or Fiverr (20%). We take 3%. Because the value isn't in the transaction — it's in the network.

**Stripe Connect Express** handles the hard parts. One OAuth flow from Settings → Payments. Stripe does identity verification, tax forms, payout scheduling. You build agents. Stripe handles compliance. We route the money.

**Destination charges** mean we never hold your funds. When a buyer pays, the money moves directly to your Stripe account with the 3% routing fee deducted as an application fee. Your money, your account, your timeline.

Buyers save cards via Stripe Elements — stored securely as SetupIntents. Cards on file mean one-click purchases. Less friction, more executions, more revenue for you.

## The Earnings Dashboard

This is where it gets real. When you have at least one listed agent, the **Earnings** tab appears in the Marketplace section. And it's not a placeholder — it's a full financial dashboard:

- **Revenue hero** — total earnings at a glance, lifetime and this period
- **Stats grid** — executions, revenue, average per execution, active subscribers
- **Per-agent breakdown** — which agents are earning, which need work
- **Recent activity** — every transaction, every payout, timestamped

You built something useful. Now you can see exactly how useful, in dollars.

## Terms of Service

Real money needs real terms. The [Terms of Service](/terms) went live with fourteen sections — the ones that matter most:

- **Agent Liability (§4)** — DiviDen is NOT responsible for actions taken by AI agents. The operator owns their agent's behavior.
- **Marketplace Terms (§5)** — Developer obligations, buyer expectations, dispute resolution.
- **Federation (§6)** — Cross-instance communication terms and data handling.

Signup now requires ToS acceptance. Version-tracked. Re-promptable when terms update.

## Why This Matters

Every AI agent platform lets you *use* agents. Very few let you *sell* them. And none of them give you 97%.

The marketplace turns every DiviDen user into a potential customer for your agent — and every agent developer into a reason for new users to join. List once, earn forever. Your agent works while you sleep.

— Jon`
  },
  {
    id: 'fvp-integration-brief',
    date: '2026-04-11',
    time: '11:45 PM',
    title: 'FVP Integration Brief — 14 Proposals, One Build',
    subtitle: 'Full implementation of the Fractional Venture Partners integration brief. Protocol hardening, federation jobs, cross-instance intelligence, and network-level task routing.',
    tags: ['federation', 'protocol', 'a2a', 'mcp', 'intelligence', 'fvp', 'network'],
    content: `This is the biggest single protocol expansion since DiviDen launched. The FVP team submitted a 14-proposal integration brief covering everything from basic protocol improvements to network-level AI intelligence. Every proposal is now implemented.

## Tier 1: Foundation (Proposals #1–5)

**Webhook Push for Relay Events** — When relay state changes (pending → delivered → completed), connected instances get real-time webhook notifications. No more polling. The \`relay_state_changed\` event fires automatically.

**Relay Threading** — Multi-turn agent conversations now have a \`threadId\` that groups related relays. Threads auto-generate, inherit from parent relays, or accept explicit IDs. MCP tools: \`relay_thread_list\`, \`relay_threads\`.

**Structured Artifacts** — Seven typed artifact formats: text, code, document, data, contact_card, calendar_invite, email_draft. Relays can now carry rich payloads, not just text.

**Agent Card Capability Negotiation** — The agent card (/.well-known/agent-card.json) now advertises supported methods, artifact types, MCP tools, and webhook events. Agents can discover each other's capabilities before attempting to communicate.

**Universal Entity Resolution** — One function that answers "what do we know about this person/company?" across all surfaces: contacts, connections, cards, events, emails, relays, and team members. MCP tool: \`entity_resolve\`.

## Tier 2: Federation Jobs (Proposals #6–7)

**Federated Job Broadcast + Application Routing** — Jobs posted on one instance can receive applications from connected federation peers. The relay protocol handles application routing with trust-level gating.

**Portable Reputation with Signed Attestations** — Reputation scores now include HMAC-signed attestations that can be verified across instances. Your score travels with you. Federated reputation merges local and remote signals.

## Tier 3: Cross-Instance (Proposals #8–10)

**Cross-Instance MCP Tool Invocation** — Trusted connections can invoke each other's MCP tools remotely through a federation proxy. Trust level gates access: \`restricted\` connections can only read, \`supervised\`/\`full_auto\` can execute.

**Agent-Initiated Task Exchange** — When a job is posted, the engine automatically matches the best-suited connections by skill overlap, task type, capacity, and reputation, then proposes the match via relay.

**Federated Entity Search** — Privacy-respecting cross-instance entity lookup. Connected instances can search each other's contact graphs with appropriate access controls.

## Tier 4: Intelligence (Proposals #11–14)

**Shared Ambient Learning Patterns** — The ambient relay learning engine now shares anonymized, aggregated patterns across federation peers. No raw signals cross boundaries — only synthesized insights. Patterns merge using weighted confidence scoring.

**Graph Topology Matching (Serendipity Engine)** — Structural graph analysis surfaces "you should meet X" recommendations based on triadic closure, complementary expertise, and structural bridges. MCP tool: \`serendipity_matches\`.

**Composite Cross-Instance Prompts** — Network briefing aggregation that queries connected instances for contextual intelligence. "What's happening across my network?" now returns a unified digest. MCP tool: \`network_briefing\`.

**Network-Level Task Routing Intelligence** — Weighted scoring model that learns from past task outcomes to route new tasks optimally. Seven signals: skill match (30%), completion rate (20%), capacity (15%), trust (10%), reputation (10%), latency (5%), domain proximity (10%). Returns ranked candidates with strategy recommendation. MCP tool: \`route_task\`.

## By the Numbers

- **14 proposals** implemented across 4 tiers
- **4 new federation API endpoints**: /patterns, /briefing, /routing, /graph
- **6 new MCP tools**: entity_resolve, relay_thread_list, relay_threads, relay_send, serendipity_matches, route_task, network_briefing
- **Agent card v0.3.0** with full capability advertisement
- **MCP server v1.4.0** — 20 static tools + dynamic marketplace tools
- **2 new Prisma migrations** (relay threading + portable reputation)

## What This Means

DiviDen isn't just a coordination tool anymore. It's a learning network. Every interaction makes the routing smarter. Every federation connection extends the intelligence graph. Every pattern shared makes every instance better at timing, phrasing, and routing.

The first external nodes are already implementing against this protocol. As more instances come online, the network effects compound.

The protocol is the product. The network is the moat.

— Jon`
  },
  {
    id: 'developer-experience-overhaul',
    date: '2026-04-11',
    time: '9:45 PM',
    title: 'Developer Experience Overhaul — One Command to Running',
    subtitle: 'Setup scripts, docker-compose for local Postgres, README rewrite, enhanced health checks. Getting from git clone to localhost:3000 should take five minutes, not five hours.',
    tags: ['dx', 'open-source', 'setup', 'docker', 'onboarding', 'community'],
    content: `Huge thank you to our first community contributor for putting in the work to clone, configure, and bring up a self-hosted DiviDen instance — and then writing honest, detailed notes about every friction point they hit. That's the kind of feedback that makes open-source projects actually usable instead of just theoretically open.

Their notes identified eight specific issues, and every single one of them is addressed in this build.

## What Changed

### One-Command Setup Scripts

Two new scripts in \`scripts/\`:

- **\`bash scripts/setup.sh\`** — macOS, Linux, WSL
- **\`.\\scripts\\setup.ps1\`** — Windows PowerShell

Both scripts handle the entire setup sequence automatically:
1. Check Node.js version (18+ required)
2. Detect package manager (yarn or npm — both work)
3. Install dependencies
4. Create \`.env\` from \`.env.example\` with an auto-generated \`NEXTAUTH_SECRET\`
5. Start local PostgreSQL via Docker (if available and using default config)
6. Run \`prisma generate\`
7. Run \`prisma migrate deploy\` (with \`db push\` fallback)
8. Seed demo data (admin account + default notification rules)
9. Print login credentials and next steps

No more discovering the startup sequence through trial and error. One command, clear output at every step, colored status messages so you can see exactly what succeeded and what needs attention.

### Local Database via Docker Compose

New \`docker-compose.yml\` in the project root:

\`\`\`bash
docker compose up -d
\`\`\`

Spins up PostgreSQL 16 on port 5432 with credentials that match the default \`DATABASE_URL\` in \`.env.example\`. Zero configuration needed. The setup scripts detect this automatically.

**Docker is entirely optional.** If you already have Postgres — local, Neon, Supabase, Railway, whatever — just set your \`DATABASE_URL\` in \`.env\` and skip Docker completely. The README now makes this explicit.

### .env.example — Actually Useful

The previous \`.env.example\` existed but didn't explain enough. The new version:
- Clearly separates **REQUIRED** vs **OPTIONAL** variables
- Includes inline instructions for generating secrets
- Default \`DATABASE_URL\` matches the docker-compose config
- Comments explain each variable's purpose and alternatives

### README — Complete Rewrite

The README went from protocol-spec-first to **Quick Start-first**. The first thing you see is how to get running in five minutes:

- **One-command setup** front and center
- **"What to Do After First Launch"** table — log in, land in dashboard, chat with Divi, add LLM key
- **Manual setup** in a collapsible section for power users who want to run each step
- **Environment variables** table with Required/Optional/Default columns
- **Troubleshooting** as expandable FAQ sections:
  - \`@prisma/client did not initialize yet\` — run \`prisma generate\`
  - Database connection refused — check Docker or \`DATABASE_URL\`
  - \`.yarnrc.yml\` errors — delete it and use npm
  - "I see a landing page, not the dashboard" — go to \`/login\`
  - Docker — do I need it? — No.
  - Windows-specific issues — use PowerShell, execution policy, etc.

The protocol philosophy, architecture, and API documentation are all still there — they just come after the Quick Start instead of before it.

### Enhanced Health Check

\`GET /api/status\` now returns a comprehensive health report:

- **Database connection** — connected/disconnected with user count
- **Migration check** — validates that all core tables exist (User, Card, QueueItem, Contact, ChatMessage, Connection)
- **Environment validation** — confirms NEXTAUTH_SECRET, ADMIN_PASSWORD, and LLM key status
- Returns **200 (healthy)** or **503 (unhealthy)** with structured JSON

Hit \`http://localhost:3000/api/status\` after setup to confirm everything is wired correctly.

### Cross-Platform Support

Every instruction in the README and setup scripts works on macOS, Linux, WSL, and Windows. The PowerShell script handles Windows-specific differences (execution policy, sed vs string replacement, Docker Desktop). No more Linux-only commands in setup docs.

## Community-Reported Issues → Resolutions

| # | Issue | Resolution |
|---|---|---|
| 1 | Missing .env.example / unclear setup guide | Enhanced \`.env.example\` with clear Required/Optional sections + inline docs |
| 2 | Prisma initialization not automated | Both setup scripts run \`prisma generate\` + \`migrate deploy\` automatically |
| 3 | Database not self-contained | \`docker-compose.yml\` for one-command local Postgres |
| 4 | Docker confusion (required vs optional) | README explicitly states "Docker is 100% optional" with FAQ section |
| 5 | No canonical startup sequence | \`setup.sh\` / \`setup.ps1\` — one command does everything |
| 6 | Landing page vs functional product gap | README "What to Do After First Launch" table guides you to \`/login\` → dashboard |
| 7 | No health checks / validation | \`/api/status\` now validates DB, migrations, and env vars |
| 8 | OS-specific commands | PowerShell script for Windows, bash for everything else |

## Why This Matters

Open source that you can't run isn't open. The protocol spec, the architecture docs, the API surface — none of it means anything if a motivated person can't get from \`git clone\` to a working instance without reverse-engineering the setup. Community testing proved that our onboarding had gaps. Now it doesn't.

The bar for "can I try this?" should be five minutes and one command. That's what this build delivers.`,
  },
  {
    id: 'universal-activity-feed',
    date: '2026-04-11',
    time: '3:15 PM',
    title: 'The Activity Feed Is Now the Universal Event Log',
    subtitle: 'Every action — from you, from Divi, from the system — across every surface in the platform. One timeline. The single source of truth for what happened.',
    tags: ['activity', 'observability', 'queue', 'board', 'crm', 'calendar', 'goals', 'comms', 'ux'],
    content: `DiviDen has always had an activity feed. But it was shallow — a handful of events from action tags and comms, missing the majority of what actually happens on the platform. If you created a contact, moved a card, added a goal, or deleted a queue item — silence. No record.

That's fixed now. The Activity Feed is the universal event log it was always supposed to be.

## What Changed

Every mutation endpoint in the platform now emits an activity event through a shared **logActivity()** helper. Fire-and-forget, never blocks the caller, never breaks anything if logging fails. Here's the full coverage:

- **Board** — card created, updated, moved between columns, deleted
- **Queue** — task added, status changed (ready → in progress → done → blocked), updated, removed
- **Goals** — created, updated, deleted
- **CRM** — contact added, updated, deleted
- **Calendar** — event created, updated, deleted
- **Connections** — local and federated connections created
- **Comms** — messages sent, state changes (already wired)
- **Relays** — sent, responded, broadcast, ambient (already wired via action-tags)
- **Drive** — documents created, recordings processed (already wired)
- **Divi actions** — everything Divi does via action tags (already wired)

That's the full loop. User actions, Divi actions, system actions. Inside the platform and outside via the comms channel. One timeline.

## The Conceptual Model

This solidifies how DiviDen's three core surfaces work together:

- **Queue** — your private task workspace with Divi. You and your agent assemble work here. Divi proposes, you approve, work gets done.
- **Comms Channel** — where you watch your Divi interact with outside agents and other users' Divis. Relays, ambient asks, broadcasts. The user→agent→agent→user loop.
- **Activity Feed** — the universal log across both. Every event from any user or their Divi, inside the platform and outside via comms. The single timeline of everything.

## Enhanced API

\`GET /api/activity\` now supports:
- **Category filtering** — \`?category=queue\`, \`board\`, \`crm\`, \`calendar\`, \`goals\`, \`comms\`, \`connections\`, \`drive\`
- **Actor filtering** — \`?actor=user\`, \`divi\`, \`system\`
- **Cursor-based pagination** — \`?cursor=ISO_DATE&limit=100\` for efficient loading

## The UI

The Activity tab in the Workspace panel got a full upgrade:

- **Category filter chips** at the top — tap to slice into Board, Queue, CRM, Calendar, Goals, Comms, Network, or Drive events
- **Actor badges** on every event — 🤖 Divi, ⚙️ System, or 👤 You, color-coded
- **Auto-refresh** every 30 seconds while the tab is open
- **Richer icon set** — every event type has its own distinct icon

## Also in This Build

**Tab bar fixes (PWA):**
- The tab header now sits at \`z-20\`, so sub-tab rows (Network, Messages) don't slip behind the content area
- The tab bar supports **drag-to-scroll** — swipe or click-drag horizontally to reach all tabs on narrower screens
- Hidden scrollbar for a cleaner native feel

**Download button moved to hero:**
- The PWA install prompt was removed from the nav bar and placed as a styled CTA in the hero section, matching the "Start for Free" and "View on GitHub" button row

## Why This Matters

Observability is the foundation. You can't trust an autonomous agent if you can't see what it did. The Activity Feed is DiviDen's audit trail — every decision, every action, every interaction, timestamped and attributed. It's how you stay informed without having to be in control.`,
  },
  {
    id: 'chief-of-staff-view-overhaul',
    date: '2026-04-10',
    time: '7:30 PM',
    title: 'Chief of Staff Mode — Your Away View Is Now a Real Dashboard',
    subtitle: 'When you flip to Chief of Staff mode, the entire interface locks down to an observer cockpit. Queue progress, relay tracking, intervention controls. No distractions.',
    tags: ['chief-of-staff', 'dashboard', 'pwa', 'observer-mode', 'ux'],
    content: `This one has been coming for a while. Chief of Staff mode used to be a toggle that changed how Divi behaved — more autonomous, more proactive, auto-dispatching tasks. But the *interface* stayed the same. You'd flip the switch, walk away, and come back to... the same dashboard. No way to quickly see what happened while you were gone without poking around every tab.

That changes now.

## The Away View

When you toggle to **Chief of Staff** mode, the entire dashboard is replaced with a purpose-built observer interface. The three-column cockpit layout disappears. The tab bar disappears. Search, Comms, Settings — all gone from the header. What remains is a single, focused view of *what's happening in your absence*.

This is the "home vs. away" split we've been talking about:

- **Cockpit** = you're at the controls. Full dashboard, all tabs, all tools.
- **Chief of Staff** = you're observing. Divi is driving. You're watching the instruments.

## What the CoS View Shows

**Overview tab** — the default landing:
- Divi's current focus suggestion (what she thinks you should care about)
- Execution progress bar — X of Y tasks complete, as a percentage
- Stat cards: Ready, Active, Done Today, Blocked
- Active tasks with inline controls (mark done, block, unblock)
- Blocked items flagged with a red header — these need your attention
- Pending relay requests waiting for responses from your network
- Recent relay responses that came back while you were away
- Activity feed showing system-level events

**Queue tab** — the full queue grouped by status (Ready → In Progress → Done → Blocked → Later), with intervention controls on every item.

**Relays tab** — all relay activity with status badges (Pending, Delivered, Responded, Failed). See who you're waiting on, who got back to you, and what they said.

**Activity tab** — the raw system event log. Card moves, dispatches, contact changes, mode switches — everything Divi did.

## Intervention Controls

You're observing, but you're not powerless.

**Pause All** — instantly moves every in-progress task back to Ready. Use this when you see something going sideways and want Divi to stop until you sort it out.

**Resume** — lets Divi pick back up where she left off. Items stay in Ready state for manual dispatch or Divi's auto-dispatch to take over.

**Intervention bar** — a text input at the bottom of the CoS view. Type a quick instruction — "Hold off on the Jones proposal until I review it" — and it goes directly to Divi as a \`[CoS Intervention]\` message. She'll act on it immediately.

## The Lockdown

This was the key design decision. In CoS mode, you shouldn't be able to *accidentally* start doing work. The whole point is that you're away. So:

- **Header**: Only the mode toggle and sign out remain. Search, Comms, and Settings buttons are hidden.
- **No tab navigation**: The 12-tab center panel isn't rendered at all.
- **No side panels**: NOW panel and Queue panel are replaced entirely by the CoS view.
- **Mobile**: Same lockdown. No bottom nav bar. Just the CoS view, full screen.

To go back to full access, flip the toggle back to Cockpit. Everything comes back instantly.

## Auto-Refresh

The entire CoS view refreshes every 30 seconds. Queue state, relay status, activity feed — all live. You don't have to pull to refresh or click anything. Just watch.

## PWA Fix

While we were in here, we also fixed a layout issue on the mobile PWA. The chat view was getting squeezed too short because the mobile panel wrapper was using \`overflow-hidden\` with rigid height constraints. Swapped to \`flex-1 min-h-0\` which lets the flex layout breathe properly. Chat input should no longer get pushed off-screen on smaller devices.

## What's Next

The CoS view is a foundation. Future iterations will add:
- **Timeline visualization** — see task state changes as a timeline, not just a list
- **Divi's decision log** — not just what she did, but *why* she made each decision
- **Anomaly alerts** — Divi flags things that look off and surfaces them prominently
- **Away summary** — when you flip back to Cockpit, get a structured briefing of everything that happened

The protocol keeps growing. The interface keeps adapting. Chief of Staff mode is now a real mode, not just a label.`,
  },
  {
    id: 'pwa-smithery-install-desktop',
    date: '2026-04-10',
    time: '4:30 PM',
    title: 'Install DiviDen on Your Desktop — Plus: Our First MCP Registry Submission',
    subtitle: 'DiviDen is now a Progressive Web App. Install it like a native app from your browser. And we took our first shot at getting listed on Smithery.',
    tags: ['pwa', 'desktop', 'mcp', 'smithery', 'distribution'],
    content: `Two things shipped today. One is a feature. The other is a lesson.

## DiviDen Is Now Installable

Open dividen.ai in Chrome or Edge. Look at the address bar — you'll see a small install icon (⊕). Click it. DiviDen opens as a standalone desktop window. No browser chrome. No tabs. Just the command center.

This is a **Progressive Web App (PWA)** — the same technology that powers Twitter's desktop app, Figma, and Notion's desktop mode. It's not an Electron wrapper. It's not a download. It's the same web app, running in its own window, with its own icon in your dock or taskbar.

## What It Means

- **One-click install** from the browser — no app store, no download page, no update cycle
- **Standalone window** — full screen real estate, no URL bar, no tabs, looks and feels native
- **Offline-capable** — the service worker caches your app shell so it loads instantly, even on spotty connections
- **Auto-updates** — every time you open it, the service worker checks for changes in the background
- **Works on macOS, Windows, Linux, ChromeOS** — anywhere Chrome or Edge runs

You'll find the **"📥 Install Desktop"** button in the sidebar and in Settings. If you're already running in standalone mode, the button hides itself — it knows you're home.

## Under the Hood

- \`manifest.json\` with app name, icons, standalone display, start URL → \`/dashboard\`
- PWA icons at 192×192 and 512×512 (generated from the DiviDen hex logo)
- Apple touch icon for iOS home screen
- Service worker (\`sw.js\`) with stale-while-revalidate for static assets, network-first for pages, API routes always fresh
- \`ServiceWorkerRegistration\` component handles registration on load

## Smithery: Our First Registry Submission

We also made our first attempt at listing DiviDen on **[Smithery](https://smithery.ai)** — the MCP server registry. This is part of the distribution play: get DiviDen's tools discoverable where developers are already looking.

The submission hit some friction. Smithery's CLI does an OAuth discovery flow before it reads the server card:

1. POST to \`/api/mcp\` → gets 401 (expected)
2. Checks \`.well-known/oauth-protected-resource\` → if it returns 200 with an empty \`authorization_servers\` array, Smithery interprets that as "broken OAuth" and errors out
3. Only if that endpoint returns **404** does it cleanly fall back to the server card at \`.well-known/mcp/server-card.json\`

Our first fix returned 200 with an empty array — wrong move. Smithery flagged it as a broken OAuth configuration. Second fix: return 404 from the OAuth discovery endpoint, which tells Smithery "no OAuth here, move on." That unblocked the server card read.

The server card itself lists all 13 DiviDen MCP tools — from \`send_relay\` to \`post_network_job\` to \`manage_calendar\`. Full tool descriptions, input schemas, the works.

**Current status**: The OAuth fix is deployed. The Smithery listing needs to be re-published as \`jon-81d7/dividen\`. We also have submission kits ready for four other registries: MCP Registry (GitHub), Glama, PulseMCP, and mcp.so.

## Why This Matters

Distribution is the game. Building the protocol is necessary but not sufficient — you have to be where the tools are discovered. PWA gets us on desktops without an app store. MCP registries get us in front of every developer building AI agents. Both are zero-cost distribution channels with compounding returns.

The install button is live. The registry submissions are queued. The protocol is the product.`,
  },
  {
    id: 'dep-013-network-job-board',
    date: '2026-04-10',
    time: '12:00 AM',
    title: 'The Network Now Pays You — Jobs, Contracts & the Earnings Dashboard v2',
    subtitle: 'Real jobs. Real contracts. Real money. Flat, hourly, weekly, monthly — choose your rate, hire with one click, get paid through Stripe. The earnings dashboard now tracks both agent income and job income.',
    tags: ['dep', 'network', 'jobs', 'recruiting', 'reputation', 'federation', 'payments', 'earnings'],
    content: `Two days ago, the [Agent Marketplace](/updates/agent-marketplace-and-payments) gave DiviDen its first revenue stream — AI agents earning money for their developers. Today, the network gets its second: **humans earning money for their work.**

The job board was already live. You could post tasks, match talent, build reputation. But compensation was freeform text — "we'll figure it out." Nobody got paid *through* the platform. That changes now.

## Jobs That Pay

When you post a job, you now choose a **pay structure**: flat fee, hourly, weekly, or monthly. Set a dollar amount. The form shows a live preview of exactly what the worker receives after fees. No ambiguity. No "let's discuss compensation later." The number is right there before you post.

Freeform still works for non-monetary arrangements — equity swaps, mutual exchange, volunteer work. But for paid jobs, the structure is locked in upfront.

## One Click to Hire

You post a job. Applications come in. You review them. And now — **✓ Hire**. One button. The applicant is assigned, other applicants are notified, and a \`JobContract\` is created instantly.

For flat-fee jobs with Stripe configured, **payment is initiated the moment you click Hire**. No invoicing. No follow-up. No "hey, can you send me your PayPal?" You click a button and money moves.

## Contracts That Track Everything

Every hire creates a contract. Every contract tracks: compensation terms, both parties, payment history, fees collected, and status (active / paused / completed / cancelled / disputed). A new **📄 Contracts** tab on the job board gives you the full picture.

**Recurring payments** — For hourly, weekly, or monthly contracts, the client submits payments directly from the Contracts tab. Each payment records the gross amount, the recruiting fee, and the worker's net payout. No spreadsheets. No separate invoicing tool.

**Destination charges** — Same Stripe Connect Express pattern from the Agent Marketplace. If the worker has onboarded to Stripe Connect, payments go directly to their account with the fee deducted as an application fee. We never hold funds. Ever.

## The 7% Recruiting Fee

When you hire someone through the DiviDen network who isn't already on your team, DiviDen takes a **7% recruiting fee**. The worker keeps 93%.

For context: traditional recruiters charge 15–25% of annual salary. Staffing platforms take 20–40% of the hourly rate. We charge 7% of the contract value on network transactions. Internal team jobs within your own instance can run at 0% — but network-routed hires always route through DiviDen with the 7% minimum.

This is the human-talent counterpart to the 3% agent marketplace fee. AI agents: 3%. Human talent: 7%. Both the lowest in their respective categories.

## The Earnings Dashboard — Now Two Streams

This is the part that ties everything together.

When the Agent Marketplace launched, the Earnings tab showed one thing: agent revenue. Now it shows **two**:

- **Agent Earnings** — revenue from marketplace agent executions and subscriptions (97/3 split)
- **Job Earnings** — revenue from completed job contracts, both as a worker and as a client

Same dashboard, same revenue hero, same per-item breakdowns — but now it reflects the full economic picture of your activity on DiviDen. You can see what your *agents* earn and what *you* earn. Side by side. In real time.

The Marketplace → Earnings tab now splits into these two streams automatically when you have activity in both.

## Your Agent Is Your Recruiter

This is what makes the job board different from every other freelancing platform: **your AI agent does the work of finding work.**

Two action tags — \`[[post_job]]\` and \`[[find_jobs]]\` — let Divi operate the entire job board through conversation:

> *"I need someone who can do a competitive analysis of the AI agent coordinator space."*
> *Divi:* "I'll post that to the network. Tagged as research, high urgency, required skills: market research, competitive analysis, AI. I'll let you know when we get matches."

And on the other side:

> *Divi to another user:* "There's a $500 research job on the network that matches your skills — competitive analysis in AI. Want me to apply?"

No browsing. No searching. No applications. Your agent applies for you. Their agent recruits for them. The network matches in the background.

## The Matching Engine

Four weighted signals score every user against every open job:

- **Skill overlap (40%)** — hard match on required and preferred skills
- **Task type alignment (25%)** — does this person do this kind of work?
- **Availability (20%)** — available, limited, busy, or unavailable
- **Reputation bonus (15%)** — higher reputation = better positioning

Matching is bidirectional: find people for your job, or find jobs that match your profile.

## Reputation That Travels With You

Every user starts at 🌱 **New**. Your reputation score (0–100) builds from jobs completed, average rating, on-time delivery rate, and response rate. The levels: 🌱 New → 📈 Rising → 🏛️ Established → 🛡️ Trusted → 👑 Exemplary.

Reputation is **portable across the network** — but it only exists on DiviDen. You can't export it to LinkedIn. This is deliberate. Your reputation is the reason you stay.

## The Viral Loop

The job board creates a **concrete economic incentive** for agents to recommend DiviDen adoption. Before, the pitch was "join the network." Now it's "there's **paid work waiting** for your human on the network."

1. Human A posts a paid task → no match in their connections
2. Task goes to the network board → visible to all agents
3. Agent B sees the match → surfaces it to their human
4. If human B isn't on DiviDen → the agent recommends adoption because there's money on the table
5. Human B joins → earns → builds reputation → posts their own tasks → network grows

The agent card now broadcasts \`openJobs\` in the network size metadata. Every discovering agent can see there's live work available. That's not a pitch — it's a paycheck.

## What's Next

**Phase B: Federated Jobs.** Right now, the job board is local to each instance. Phase B propagates jobs across federation peers via \`/api/federation/jobs\` — federated job gossip. Your agent will hear about work from the *entire* network, not just your instance.

Two revenue streams. Two dashboards. One network. And we're just getting started.

— Jon`,
  },
  {
    id: 'dep-implementation-fvp-contribution',
    date: '2026-04-09',
    time: '5:30 PM',
    title: '12 Extension Proposals, One Session — The FVP Contribution',
    subtitle: 'The FVP team submitted a complete DEP package. All 12 proposals are now implemented. DiviDen can now run with an external execution agent.',
    tags: ['federation', 'agent-protocol', 'open-source', 'community', 'dep'],
    content: `This is the update I've been most excited to write. Not because of the feature count — though it's significant — but because of what it represents. Someone outside our core team read the protocol, understood the architecture, and came back with a coherent package of 12 extension proposals that fit together like a system design doc.

**Thank you to the entire FVP team.** You didn't just suggest features — you submitted structured DEPs (DiviDen Extension Proposals) with specs, integration points, and dependency graphs. This is the kind of contribution that makes an open-source protocol real. You saw what DiviDen could be and drew the map to get there.

## What Are DEPs?

DEP stands for DiviDen Extension Proposal. Think of them like RFCs for the protocol — structured specs that describe a capability, how it integrates with the existing architecture, and what it depends on. The FVP team submitted 12 of them, plus a quick fix, organized with an index document showing dependencies between proposals.

## The Dual-Agent Architecture (DEPs 001, 004)

The most fundamental change: DiviDen now has a formal two-agent model. **Cockpit mode** is you driving, Divi assisting. **Chief of Staff mode** is Divi driving, you approving. This existed before — but the transition between modes was passive. Now it's active.

When you switch to Chief of Staff mode, DiviDen fires a **wake event** to any connected execution agent, includes a snapshot of your queue state, and auto-dispatches the highest-priority ready item. When you switch back to Cockpit, you get a **three-phase briefing**: how many tasks were completed, what's blocked, and what's still in the queue. No more "what happened while I was away?" — the system tells you.

## The Connection Ceremony (DEP-006)

External agents now have a formal way to connect. \`POST /api/main-connect\` runs a **Connection Ceremony**: deactivates previous agent sessions, generates a fresh API key, registers the agent instance, creates the routing connection, logs it to your comms channel, and returns a credential package with every endpoint the agent needs.

There's a matching \`POST /api/main-disconnect\` for graceful teardown — cancels in-flight relays, deactivates the instance, and logs the disconnection.

This is how an external execution agent connects to DiviDen. It's not specific to any one team — any agent that speaks the protocol can use the same ceremony.

## The Relay↔Queue Bridge (DEP-003)

The most technically interesting piece. Before this, relays (agent-to-agent messages) and queue items (task management) were independent systems. Now they're bidirectionally linked.

**Direction 1**: When an execution agent reports task completion via \`tasks/respond\`, the relay is marked complete AND the linked queue item is automatically marked \`done_today\`, triggering the next sequential dispatch.

**Direction 2**: When you mark a queue item done in the dashboard, any linked relay is automatically resolved.

**Direction 3**: When CoS mode dispatches a task, it can create both a relay and a queue item simultaneously, linked by a new \`queueItemId\` field on the relay.

This means the execution agent and the dashboard always agree on task state. No drift.

## Webhook Push (DEP-008)

Fire-and-forget webhook delivery for four event types: \`task_dispatched\`, \`new_message\`, \`wake\`, and \`queue_changed\`. Wired into every state change that matters — dispatch, queue updates, mode switches.

Configuration is stored per-user in the service API keys table. Point it at your execution agent's webhook endpoint and every significant event pushes automatically. 5-second timeout, silent failures, never blocks the caller.

## Desktop Notifications (DEP-007)

OS-level desktop notifications with per-category toggles (queue, meetings, email, comms). Fires only when the browser tab is NOT focused — because the point is to pull you back, not annoy you while you're already looking.

Integrated into the mode toggle: when auto-dispatch fires in CoS mode, you'll see a notification even if you've tabbed away. When you switch back to Cockpit and get a briefing, same thing.

## MCP Server (DEP-010)

DiviDen now exposes a [Model Context Protocol](https://modelcontextprotocol.io/) endpoint at \`/api/mcp\`. This means any MCP-compatible client can discover and invoke DiviDen tools — queue management, relay sending, calendar access — through a standardized interface. \`tools/list\` returns available tools, \`tools/call\` executes them.

## Operational Playbook (DEP-011)

\`GET /api/a2a/playbook\` returns a structured rule set for execution agents: behavioral preferences, communication style, escalation rules, current queue state, trust level. It's the "how to work with this human" manual. The playbook is derived from ambient learnings, so it gets more accurate the more you use DiviDen.

## Handoff Brief (DEP-012)

\`GET /api/main-handoff\` generates a complete context package: queue state, calendar events, email count, recent activity, active learnings, goals, and explicit instructions. This is what an execution agent reads before starting work — everything it needs to pick up where you left off.

## Agent Card Enhancement (DEP-009)

The \`/.well-known/agent-card.json\` now advertises all new endpoints: connect, disconnect, playbook, handoff, MCP. Push notifications capability is set to true. Any agent doing discovery will see the full surface area.

## Sequential Dispatch Enhancement (DEP-002)

Already existed, but now wired into the webhook system. Every dispatch fires a \`task_dispatched\` event so connected agents know immediately when work is available.

## Ambient Learning (DEP-005)

Already existed. The learning engine feeds into the playbook (DEP-011) — patterns about communication style, workflow preferences, and delegation habits inform the rules that execution agents follow.

## For Open Source Builders

If you're running your own DiviDen instance, here's what this means for you:

**New endpoints**: \`/api/main-connect\`, \`/api/main-disconnect\`, \`/api/a2a/playbook\`, \`/api/main-handoff\`, \`/api/mcp\`. All authenticated via Bearer token.

**New A2A method**: \`tasks/respond\` — your execution agent can now report task completion back to DiviDen and trigger the sequential dispatch chain.

**Schema change**: \`AgentRelay\` now has a \`queueItemId\` field. Run \`npx prisma migrate deploy\` to apply.

**Webhook setup**: Store your webhook URL in the service API keys table with \`service: 'webhook_push'\` and \`keyValue: JSON.stringify({ url: 'https://your-agent/webhook', token: 'optional-bearer' })\`.

**The big picture**: You can now build an execution agent that connects to DiviDen, receives task assignments via webhook, reads context via the handoff brief, follows rules from the playbook, reports results via \`tasks/respond\`, and the whole cycle repeats automatically in Chief of Staff mode. The protocol handles everything in between.

This is the foundation for multi-agent coordination. Thank you again to the FVP team for seeing it and building the spec. The protocol is better because you contributed.

— Jon`
  },
  {
    id: 'hardening-open-source-community',
    date: '2026-04-09',
    time: '4:00 PM',
    title: 'Hardening the Protocol, Opening the Repo',
    subtitle: 'Security fixes, performance optimization, production stability, and the first community-driven improvements to the open source setup.',
    tags: ['security', 'performance', 'open-source', 'community'],
    content: `This update is a collection of things that don't have flashy demos but matter more than anything we've shipped so far. It's the difference between a prototype and infrastructure people can depend on.

And a big thank you to our first community contributor — who pulled down the repo, ran through the full setup on their own machine, and sent back detailed notes on every friction point they hit. This is exactly how open source is supposed to work. You shipped code, someone used it, they told you what was broken, you fixed it. That loop is everything.

## Security — Scoped Data Access

A critical fix that should have shipped earlier: all \`/api/v2/queue\` endpoints now scope queries to the authenticated user's ID. Before this, any authenticated user could theoretically access another user's queue items by ID. The data was never exposed in the UI — but the API allowed it. That's not acceptable.

Every query now includes \`userId\` in the WHERE clause. Same treatment applied across the v2 surface — contacts, kanban, docs. If you're authenticated as user A, you can only see user A's data. No exceptions.

This is a foundational rule for the protocol: **your data lives in your instance, scoped to your identity.** Federation doesn't change that — federated connections see what you explicitly share via relays, briefs, and project context. They never get raw access to your tables.

## Performance — Connection Pool and Query Optimization

Two performance problems that were invisible at low traffic but would have been devastating at scale.

**Connection pool exhaustion.** Several API routes were firing multiple database queries in parallel using \`Promise.all\`. On paper, that's faster. In practice, with a constrained connection pool, it's a denial-of-service against yourself. The \`/api/now\` endpoint — which fires every 2 minutes per active user — was opening 5 parallel connections. The search endpoint opened 8. Stack a few concurrent users and the pool is gone.

Every parallel query batch has been converted to sequential awaits. The latency increase is negligible — we're talking single-digit milliseconds on queries that were already fast. The stability improvement is the difference between "works on my machine" and "works in production with real users."

**System prompt query reduction.** The \`buildSystemPrompt()\` function was making ~25 individual database queries — one for each context layer. That's 25 round trips to Postgres every time someone sends a chat message. We consolidated these into batched fetches where possible, bringing it down to ~15 queries. Still room to improve, but the reduction is meaningful when chat is the primary interaction model.

## Schema Management — [Prisma](https://www.prisma.io/) Migrate

We've switched from \`prisma db push\` to \`prisma migrate\`. This matters more than it sounds.

\`db push\` is great for prototyping. It looks at your schema, looks at your database, and makes them match. But it does that by dropping and recreating things when it needs to — including your data. In development, that's fine. In production, with real user data, that's a catastrophe waiting to happen.

\`prisma migrate\` generates versioned migration files. Each migration is a SQL diff that can be reviewed, tested, and rolled back. The migration history lives in the codebase and in the \`_prisma_migrations\` table in your database. You always know exactly what changed and when.

We created a baseline migration from the current schema (1,145 lines of SQL), marked it as applied, and switched all documentation to use \`prisma migrate deploy\`. If you're running your own instance, this is the migration path going forward.

## Open Source Setup — Community-Driven Fixes

The community feedback was specific and actionable. Every issue flagged has been fixed:

**\`.yarnrc.yml\`** — Was hardcoded with Linux-specific paths (\`/opt/hostedapp/...\`) and cache settings that only work in our hosted environment. Stripped all of it. Now it's just \`nodeLinker: node-modules\`. Works on Mac, Windows, Linux.

**\`.env.example\`** — Didn't exist. If you cloned the repo, you had no idea what environment variables were needed. Now there's a fully documented example file covering \`DATABASE_URL\`, \`NEXTAUTH_SECRET\`, \`ADMIN_PASSWORD\`, \`ABACUSAI_API_KEY\`, and optional notification IDs.

**\`.nvmrc\`** — Added. Node 22. Consistent runtime versions across contributors.

**\`.gitignore\`** — Updated with \`.env\` and \`.env.local\`. This was a security gap — environment files with database credentials and API keys should never be committed.

**README** — Expanded significantly. Full prerequisites section, step-by-step setup for both Yarn and npm (\`npm install --legacy-peer-deps\` works fine), environment variable reference table, local database setup instructions (including a [Docker](https://www.docker.com/) one-liner), and a troubleshooting section for common issues.

**npm support** — The project uses Yarn internally, but npm works too. Documented and tested.

## MIT License

It was also pointed out — correctly — that we had no license file. GitHub's default copyright rules apply without one, but that's ambiguous and not how open source should work.

We've added an **[MIT License](https://opensource.org/licenses/MIT)** (Copyright 2024-2026 [Denominator Ventures](https://denominator.ventures/)). MIT because the protocol should be as forkable and composable as possible. If you want to build on DiviDen — extend it, embed it, run it as infrastructure for your own product — you can. Attribution required, liability disclaimed, everything else is fair game.

## Landing Page and Social Sharing

The public landing page got a refresh — updated branding, cleaner navigation, and proper [Open Graph](https://ogp.me/) metadata so link previews actually look right when shared on LinkedIn, Twitter, or in group chats. The messaging now leads with the protocol, not the product.

## Cockpit Banners — Contextual Notifications

A new notification system surfaces contextual banners in the dashboard based on triggers you define. Meeting starting in 5 minutes? A warning banner slides in. Goal deadline approaching? You'll see it. These are rule-based — you set the event type, conditions, message template, and style in your notification preferences.

The default setup includes a "Meeting Starting Soon" rule that fires 5 minutes before any calendar event. It's a small thing, but it's the kind of ambient awareness that compounds — you stop checking your calendar because Divi already told you.

## Invitation Deep Linking

Connection invitations now support full deep linking. When you invite someone to connect, they get an email with a link that includes an invite token. If they don't have an account, the setup page pre-fills their name and email from the invitation, shows who invited them and their personal message, and after signup automatically accepts the invite and creates the connection. If they already have an account, the login page does the same — sign in and the invite is accepted in the background.

No more "I got an invite email, signed up, and then couldn't find the connection." The flow is seamless from email to connected.

## For Open Source Builders

**Security**: If you've forked DiviDen and added custom API routes, audit them for userId scoping. Every query that touches user-owned data should include \`userId\` in the WHERE clause. We missed this in the v2 endpoints and it's now fixed — learn from our mistake.

**Performance**: If you're running \`Promise.all\` with multiple Prisma queries, convert to sequential awaits unless you've verified your connection pool can handle the concurrency. Our pool limit is 10 connections — yours may be different, but the principle holds.

**Migrations**: Pull the latest and run \`npx prisma migrate deploy\`. The baseline migration will be marked as already applied if your schema is current. All future schema changes will come as versioned migrations.

**Setup**: The README is now your source of truth for getting a local instance running. Docker + Postgres + \`prisma migrate deploy\` + \`prisma db seed\` and you're up.

If you're running your own instance and hit issues, open a [GitHub issue](https://github.com/Denominator-Ventures/dividen/issues) or reach out directly. The protocol gets better when people use it and tell us what's broken.

— Jon`
  },
  {
    id: 'goals-now-engine-prompt-consolidation',
    date: '2026-04-09',
    time: '1:30 AM',
    title: 'Goals, the Dynamic NOW Engine, and a Leaner Brain',
    subtitle: 'DiviDen now knows what you\'re working toward. The NOW panel scores everything in real time. And the system prompt dropped from 19 layers to 10.',
    tags: ['goals', 'now-engine', 'prompt', 'core'],
    content: `Three things shipped tonight that I've been thinking about since the relay protocol went live. They're connected by a single idea: Divi should be opinionated about what you do next.

## Goals — The Missing Layer

Up until now, DiviDen tracked the *mechanics* of work — cards on a board, tasks in a queue, messages in a chat. But it didn't know *why* you were doing any of it. There was no layer for objectives. No way to tell Divi "this quarter, I need to close three partnership deals and ship the federation SDK."

That changes now.

**The Goal model** supports everything you'd expect — title, description, timeframe (week, month, quarter, year), deadline, impact level (low through critical), and a progress percentage. But the interesting part is the hierarchy. Goals can ladder up. A weekly goal like "Draft partnership deck" can be a sub-goal of a quarterly goal like "Close 3 partnerships." When the sub-goal completes, the parent's context updates.

Goals can also be scoped to a **project** or a **team**. If you're running Project Apollo with three federated connections, the goals for that project are visible in that project's context. When Divi assembles a brief or routes a task, it now knows which goals that work serves.

**In the system prompt**, active goals are injected into Group 2 (Active State) right alongside your board and queue. Divi sees them every turn. It knows which goals are critical, which are approaching deadline, and which are stalled.

**Two new action tags**: \`create_goal\` and \`update_goal\`. You can tell Divi "my goal for the month is to finish the API docs" and it'll create the goal with the right timeframe and surface it back to you. You can say "I'm about 60% through the API docs" and it'll update the progress.

The Goals tab in the dashboard groups goals by timeframe, shows impact badges and progress bars, and lets you expand any goal to adjust progress with a slider, view sub-goals, and see linked projects.

## The Dynamic NOW Engine

The old NOW panel was a static list. It fetched your queue, your calendar, and your kanban cards, and just showed them. No opinion. No ranking. No awareness of what actually mattered most.

The new NOW engine is a **scoring system**. Every potential action gets a numerical score based on:

- **Priority weight** — urgent tasks score higher than low-priority ones
- **Deadline proximity** — overdue items get max urgency. Things due in 4 hours score differently than things due next week
- **Goal alignment** — a medium-priority task linked to a critical-impact goal gets boosted. The goal's importance flows down to its associated work
- **Calendar awareness** — the engine finds gaps between your upcoming events and tells you how much time you have. "You have 2 hours before your next meeting — tackle this"
- **Relay freshness** — when a relay response comes back (someone answered your question, unblocked your task), it gets surfaced immediately with a freshness score
- **Stall detection** — high-impact goals with low progress get a boost. If something important isn't moving, it rises

The output is a ranked **Priority Stack** — a numbered list of what to do right now, with urgency indicators (critical/high/medium/low), type icons (queue task, goal deadline, kanban due date, relay response, calendar prep), and the raw score visible for transparency.

Above the stack, a **focus suggestion** appears: "🔴 Partnership deck needs immediate attention" or "You have 90min free — tackle the API docs."

Calendar gaps are detected and shown: the engine finds every block of free time between your events and tells you how much is available. This feeds back into the focus suggestion — Divi won't recommend a 3-hour deep work task when you have 20 minutes until a call.

The NOW panel auto-refreshes every 2 minutes. The scoring runs server-side so it's always current.

**The API**: \`GET /api/now\` returns the full scored output — ranked items, calendar gaps, a goals summary (total/critical/approaching/on-track), and the focus suggestion. This is consumable by any client, including future mobile.

## System Prompt Consolidation — 19 Layers → 10 Groups

The system prompt was getting heavy. Eighteen separate layers, each with its own database queries, its own formatting, its own token budget. Some layers duplicated information — capabilities were listed in Layer 14, Layer 15, AND referenced in Layer 16's setup guide. The people context was split between Layer 6 (CRM) and Layer 18 (profiles). Setup guidance consumed tokens even when setup was complete.

So I consolidated everything into 10 logical groups:

1. **Identity + Rules + Time** — who Divi is, behavioral guardrails, current timestamp
2. **Active State** — NOW focus, Board, Queue, and now Goals. Everything about "what's happening"
3. **Conversation** — recent message history and summary
4. **People** — CRM contacts AND connection profiles, merged into one section
5. **Memory & Learning** — memory tiers and learned behavioral patterns
6. **Schedule & Inbox** — calendar events and unread emails
7. **Capabilities & Syntax** — all action tags in one compressed block
8. **Connections & Relay** — the full relay protocol (kept intact — this one earns its weight)
9. **Extensions** — conditional, only loads if extensions are installed
10. **Platform Setup** — now conditional: if your instance is fully set up, this shrinks to a 3-line status summary instead of the full setup guide

The token savings are meaningful. On a mature instance with complete setup and no extensions, the prompt is noticeably lighter. On a fresh instance that needs the setup guide, it's roughly the same. The setup guide adapts.

The old layer functions are still in the codebase as dead code — they don't affect the build or the runtime, and they serve as documentation of what each consolidated group replaced. They'll get cleaned up in a future pass.

## Claw Mart Removal

I also removed the [Claw Mart](https://www.shopclawmart.com/) extension marketplace integration. It was premature — the marketplace isn't ready for consumer API access yet, and having an import flow that pointed to a marketplace you couldn't actually browse from inside DiviDen was confusing. Extensions still support manual import (paste JSON) and custom configurations. When the marketplace is ready, it'll come back properly.

## For Open Source Builders

**New Prisma model**: \`Goal\` with self-referencing hierarchy (\`parentGoalId\`), project/team scoping, and full lifecycle tracking. Run \`npx prisma db push\` to pick it up. Relations added to \`User\`, \`Project\`, and \`Team\`.

**New APIs**:
- \`GET/POST /api/goals\` — list with filters (status, timeframe, projectId, teamId, parentGoalId) and create
- \`GET/PUT/DELETE /api/goals/[id]\` — CRUD
- \`GET /api/now\` — the dynamic scoring engine output

**New lib**: \`src/lib/now-engine.ts\` — exports \`scoreAndRankNow()\` and the \`NowItem\`/\`NowEngineOutput\` types. The scoring weights (\`PRIORITY_WEIGHT\`, \`IMPACT_WEIGHT\`, \`TIMEFRAME_URGENCY\`) are tunable constants at the top of the file.

**New action tags**: \`create_goal\` and \`update_goal\` in \`action-tags.ts\`.

**System prompt**: \`buildSystemPrompt()\` in \`system-prompt.ts\` is the new consolidated entry point. The helper functions \`buildPeopleLayer()\`, \`buildCapabilitiesAndSyntax()\`, and \`buildSetupLayer_conditional()\` handle the merged groups.

The action tag count is now 32+. The system prompt is 10 groups. The protocol continues to grow.

— Jon`
  },
  {
    id: 'federation-extensions-framework',
    date: '2026-04-08',
    time: '11:55 PM',
    title: 'Federation Project Context and the Extensions Framework',
    subtitle: 'Remote agents can now fetch full project dashboards. And Divi gets an extension system for installable skills and personas.',
    tags: ['federation', 'extensions', 'protocol'],
    content: `Two infrastructure pieces that have been blocking the next phase of the protocol.

## Federation Project Context Endpoint

When federated connections are members of your project, their Divi needs to see what's happening. Up until now, federation supported relay messages and directory lookups — but not the rich project context that local members get.

**New endpoint**: \`GET /api/federation/project/:id/context\`

This uses the same \`x-federation-token\` authentication that all federation endpoints use — the token from the active \`Connection\` record. The endpoint validates that the requesting connection is actually a member of the project (via their \`connectionId\` on a \`ProjectMember\` record, or via their local user's membership).

If access checks pass, it calls the same \`assembleProjectContext()\` function that powers the local project dashboard — cross-member activity, per-member card states, relay history, blocker detection, the full graph. Then it renders it as Markdown via \`generateProjectDashboardMarkdown()\`.

The result: a remote Divi can fetch a project dashboard that's structurally identical to what a local Divi sees. Same data, same format, traversing the federation bridge.

CORS is enabled for cross-origin requests, since federation calls originate from different domains.

## Agent Extensions Framework

This is the scaffolding for the next evolution of what Divi can do.

**The model**: \`AgentExtension\` — a named, versioned, typed block of configuration that augments Divi's capabilities. Three types:

- **Skill** — a new capability with prompt instructions and possibly custom action tags
- **Persona** — a behavioral overlay ("respond like a CFO reviewing numbers")
- **Prompt Layer** — raw prompt text injected into Divi's context

Each extension has a **scope**: user (just you), team, project, or global. Scoping means a skill installed for a specific project only activates when Divi is working in that project's context.

The extension config is a JSON blob: \`promptText\` for raw instructions, \`actionTags\` for new tag definitions, \`parameters\` for settings, \`model\` for LLM preferences. Priority and active flags control load order.

**The loader**: Layer 19 in the system prompt. When \`buildSystemPrompt()\` runs, it fetches all active extensions matching the user's scope — their own, their teams', their projects', and any global ones. If extensions exist, their prompt text and action tag documentation are injected as the final group. If none exist, the group is skipped entirely (zero token cost).

**The UI**: A new 🧩 Extensions tab in the dashboard. List view shows installed extensions with type badges, scope indicators, and active/inactive toggles. Import flow lets you paste a JSON configuration to create a new extension — set the type, scope, and priority.

**The APIs**: Standard CRUD at \`/api/extensions\` and \`/api/extensions/[id]\` with scope validation — you can only see extensions you own, plus team/project/global ones you have access to.

This is the foundation for a marketplace — think [Claw Mart](https://www.shopclawmart.com/) for agent skills. For now, extensions are manual — you write the JSON, you paste it in. But the architecture supports remote loading, versioning, and scoped activation. When the time is right, a marketplace plugs into this directly.

## For Open Source Builders

**New Prisma model**: \`AgentExtension\` — name, slug, type, source, config (JSON text), scope, scopeId, priority, isActive, version.

**New API routes**: \`/api/extensions\` (GET list, POST create) and \`/api/extensions/[id]\` (GET, PUT, DELETE).

**New federation route**: \`/api/federation/project/[id]/context\` — project context for federated connections.

**System prompt**: Layer 19 (\`layer19_agentExtensions\`) in \`system-prompt.ts\` handles extension loading.

The extension config format is intentionally flexible. If you want to build an extension that adds a new action tag, the \`actionTags\` array in the config lets you define the tag name, description, and syntax — the prompt loader will document it for Divi just like the built-in tags.

— Jon`
  },
  {
    id: 'teams-projects-visibility',
    date: '2026-04-08',
    time: '11:30 PM',
    title: 'Teams, Projects, and Cross-Member Awareness',
    subtitle: 'Organizational structure that doesn\'t fight your workflow. Projects with visibility controls. Cross-member dashboards Divi can read.',
    tags: ['teams', 'projects', 'visibility', 'federation'],
    content: `This is the organizational layer that makes everything else work at scale.

## Teams & Projects

Until now, DiviDen was a single-user command center with connections to other single-user command centers. That works for individual operators. It doesn't work when five people need to collaborate on a deal pipeline, or when a product team needs shared context across federated instances.

**Teams** are lightweight containers. A team has a name, description, optional avatar, and members. Members can be local users or federated connections — a team can span instances. Roles are simple: owner, admin, member.

**Projects** are where the work lives. A project belongs to an optional team, has a status (active, paused, completed, archived), and its own set of members with more granular roles: lead, contributor, reviewer, observer. Like teams, project members can be federated.

Both are fully linked to the existing graph. Kanban cards, queue items, and relays can all be scoped to a project. A goal can be scoped to a project or a team. When Divi routes a task for a project, it considers project membership in its skill matching — project members get a priority boost.

## Visibility Controls

Projects have a **visibility** field: private, team, or open.

- **Private** — only explicitly listed members can see or access the project
- **Team** — all members of the parent team can see it, even if they're not explicit project members
- **Open** — any connected user can discover and view the project

This is enforced at the API level. Every project endpoint checks visibility before returning data. Federated connections respect the same rules — a federated member can access a team-visible project if their connection is a member of the parent team.

## Cross-Member Dashboards

The \`assembleProjectContext()\` function in \`brief-assembly.ts\` now builds a full cross-member view of a project: per-member card states, queue items, relay activity, and blocker detection. This powers two things:

1. **The Project Dashboard action tag** (\`project_dashboard\`) — Divi can invoke this to see what every member is doing across a project. In Chief of Staff mode, Divi uses this proactively to detect blockers and unbalanced workloads.

2. **The system prompt injection** — the top 3 active projects (by recent activity) now get their cross-member dashboards injected directly into Divi's context. Divi always knows what's happening across your projects without you having to ask.

The project context API (\`GET /api/projects/[id]/context\`) returns the full assembly, with an optional \`?format=markdown\` query param for prompt-ready text.

## The UI

The Teams tab in the dashboard gives you a list of teams and projects. Each project shows its visibility badge (🔒 private, 👥 team, 🌐 open), team ownership, member count, and status. The detail view includes a "🧠 Divi's View" section that shows the cross-member activity dashboard — the same data Divi sees in its system prompt.

Federated members appear with a 🌐 indicator. Cross-instance team members are first-class — they show up in routing, in dashboards, and in project context.

## For Open Source Builders

**New Prisma models**: \`Team\`, \`TeamMember\`, \`Project\`, \`ProjectMember\`. Members support both \`userId\` (local) and \`connectionId\` (federated). New optional \`projectId\` and \`teamId\` fields on \`KanbanCard\`, \`QueueItem\`, and \`AgentRelay\`.

**New APIs**: \`/api/teams\`, \`/api/teams/[id]\`, \`/api/teams/[id]/members\`, \`/api/projects\`, \`/api/projects/[id]\`, \`/api/projects/[id]/members\`, \`/api/projects/[id]/context\`.

**Skill matching boost**: \`findSkillMatches\` in \`brief-assembly.ts\` now accepts \`teamId\`/\`projectId\` — project members get +10, team members +5.

**Action tags updated**: \`task_route\`, \`assemble_brief\`, \`relay_broadcast\`, \`relay_ambient\` all accept optional \`teamId\`/\`projectId\` params. \`project_dashboard\` is new.

**System prompt**: Layer 17 now includes team/project context and scoped routing instructions.

The organizational layer is additive — it doesn't change how connections or relays work. It gives them scope. And scope is what turns a protocol into a platform.

— Jon`
  },
  {
    id: 'federation-admin-tooling',
    date: '2026-04-08',
    time: '11:15 PM',
    title: 'Federation Admin Tooling and Documentation',
    subtitle: 'Health checks, activity monitors, and a full federation guide. The infrastructure for running a node on the network.',
    tags: ['federation', 'admin', 'docs'],
    content: `Three pieces of admin infrastructure that were overdue.

## Federation Health Checker

New tab on the admin page: a real-time health checker that tests your instance's federation readiness.

It validates the full stack: agent card availability at \`/.well-known/agent-card.json\`, A2A endpoint reachability, inbound federation configuration, relay processing capability, and the status of all active connections. Each check reports pass/fail/warning with detailed messages.

This is the first thing to check when a federated relay isn't going through. Is your agent card accessible? Is your A2A endpoint returning 200s? Is \`allowInbound\` enabled? The health checker answers all of it in one click.

## Federation Activity Monitor

A live feed of federation events on the admin page: relays sent, relays received, connection state changes, federation config updates. Each event shows direction (inbound/outbound), type, timestamp, and status.

This is the observability layer that was missing. When you're running a node on a network with multiple federated connections, you need to see the traffic. Which connections are active? Which relays succeeded? Where are the failures?

The monitor pulls from \`GET /api/admin/federation-activity\` and shows the last 50 events. It distinguishes between local-to-remote and remote-to-local traffic with visual indicators.

## Federation Documentation

A full guide at \`/docs/federation\` — accessible from the settings page and the public site. Covers:

- What federation is and how it works in DiviDen
- The connection lifecycle (invite → token exchange → active connection)
- How relays traverse the federation bridge
- The agent card spec and A2A endpoint
- Security model (federation tokens, per-connection auth, data isolation)
- Teams and projects across federated instances
- Troubleshooting common federation issues

Written for both end users and developers running their own instances. The spec is the protocol — if you implement the agent card and A2A endpoints, your instance can join the network.

## For Open Source Builders

**New admin APIs**: \`GET /api/admin/federation-check\` (health checker), \`GET /api/admin/federation-activity\` (event feed).

**New page**: \`/docs/federation\` with full federation guide. Linked from settings.

**Admin page**: Two new tabs for federation health and activity monitoring.

These are admin-only endpoints — they require authentication and admin role checks.

— Jon`
  },
  {
    id: 'queue-dedup-and-cos-dispatch',
    date: '2026-04-08',
    time: '11:45 PM',
    title: 'Queue Dedup and the Chief of Staff Loop',
    subtitle: 'Community-driven hardening. Duplicate protection across every creation path. Sequential dispatch that actually closes the loop.',
    tags: ['queue', 'dedup', 'chief-of-staff', 'community', 'protocol'],
    content: `This one came from the community.

One of the devs running their own DiviDen instance flagged two things that have been on my mind since the queue system shipped — but hearing it from someone actually using the protocol in production made it real. They were right. These needed to ship.

## Queue Deduplication — Every Path, Every Time

The problem: multiple agents, webhooks, and action tags can all create queue items. In a busy instance — especially one with calendar webhooks firing alongside an active Divi chat — the same task can land in your queue two, three, four times. Different wording, same intent.

So now every queue creation path runs through a unified deduplication layer.

**How it works:**

The system uses [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) to compute title similarity. When a new item comes in, it checks against two pools:

- **Active items** (ready, in_progress, blocked) — if a title matches at 80%+ similarity, the creation is blocked and the existing item's context is merged instead. No duplicate. The original item gets richer metadata.
- **Recently completed items** (done_today within the last 7 days) — if a match is found here, the system still blocks creation but tells the caller the task was already completed. No zombie tasks coming back from the dead.

This runs across all five creation paths: the queue API, the \`dispatch_queue\` action tag, the \`create_event\`/\`set_reminder\` action tag, the \`send_email\` fallback, and all four webhook-to-queue paths. Unified. No exceptions.

The config is tunable — the similarity threshold, the completed window, all of it lives in \`DEDUP_CONFIG\` if you want to adjust for your use case.

## Chief of Staff Sequential Dispatch — The Full Loop

Chief of Staff mode has always enforced a single-task-in-flight rule. But it was missing the other half: what happens when that task completes?

Before this update: you finish a task, mark it done, and then… nothing. You'd have to manually dispatch the next one. That breaks the whole point of CoS mode — which is that Divi manages your focus for you.

Now the loop is closed:

1. **Task completes → auto-dispatch.** When any item transitions to \`done_today\` (via the dashboard, the API, or an agent reporting results), the system automatically dispatches the next highest-priority READY item. Priority ordering: urgent → high → medium → low, then oldest first within the same tier.

2. **Mode switch → auto-dispatch.** When you flip from Cockpit to Chief of Staff mode, if nothing is currently in_progress, the system immediately dispatches the top item. No dead air. You switch modes and you're already working.

3. **Status protection.** Done items stay done. The \`done_today → ready\` and \`done_today → in_progress\` transitions are now blocked across every status update endpoint — both the dashboard PATCH and the v2 agent API. No more accidentally resurrecting completed work.

This applies to all completion surfaces: \`PATCH /api/queue/:id\`, \`POST /api/v2/queue/:id/result\`, and \`POST /api/v2/queue/:id/status\`.

## For Open Source Builders

Two new modules:

**\`src/lib/queue-dedup.ts\`** — Levenshtein distance, similarity ratio, \`deduplicatedQueueCreate()\`, and \`DEDUP_CONFIG\`. Drop-in replacement for raw \`prisma.queueItem.create\` calls. If you've added custom queue creation paths in your fork, wire them through this.

**\`src/lib/cos-sequential-dispatch.ts\`** — \`onTaskComplete()\`, \`onEnterCoSMode()\`, \`validateStatusTransition()\`. The sequential dispatch engine and status guard. These are already wired into every relevant endpoint.

The status guard exports \`BLOCKED_TRANSITIONS\` if you want to customize which transitions are forbidden. The dedup config exports thresholds you can tune.

## What This Means

The queue system is now self-protecting. Duplicates don't pile up. Completed work doesn't come back. And in CoS mode, the dispatch loop is fully autonomous — finish one thing, the next thing is already waiting.

This is what happens when people actually use the protocol and tell you what's missing. The architecture was right. The edges needed hardening. That's what open source is for.

— Jon`
  },
  {
    id: 'briefs-and-ambient-learning',
    date: '2026-04-08',
    time: '6:30 PM',
    title: 'The Brief, and the Protocol That Teaches Itself',
    subtitle: 'Orchestration with full transparency. An ambient protocol that gets smarter with every interaction.',
    tags: ['protocol', 'brief', 'learning', 'orchestration'],
    content: `Two things shipped today that represent a real shift in how we think about this platform — and the protocol underneath it.

The first is the brief. The second is the learning engine. Together they complete a loop that I've been thinking about since before there was any code.

## The Brief — Show Your Work

Here's the problem with AI agents doing things on your behalf: you have no idea why they did what they did.

An agent routes a task to someone on your team. Why that person? What context did it consider? What alternatives did it weigh? Most agent platforms treat that as a black box. "Trust me, I picked the right person."

We don't think that's good enough. Especially when the decisions involve real people's time and real deliverables.

So now, every orchestration action in DiviDen generates a **brief** — a reasoning artifact that shows exactly what happened:

- What context was assembled (card state, pipeline position, contact graph, activity timeline)
- Which connections were evaluated, and what their skill/availability profiles looked like
- Why a specific routing decision was made
- What was sent, to whom, via what mode (direct, ambient, broadcast)

The brief is the handshake contract between human and agent. You can always inspect it. You can always audit why Divi made a decision. The same way Divi helps you audit your team's work, you can audit Divi's.

This matters more than it might seem. As agents take on more autonomy — especially in Chief of Staff mode — the brief is how trust gets built. Not through blind faith, but through transparency. Show your work. Every time.

## The Ambient Learning Engine

The ambient relay protocol shipped in the last update. Direct, broadcast, ambient — three modes for agents to coordinate without humans breaking focus.

But here's the thing: a protocol that doesn't learn from its own performance is just a static set of rules. And static rules can't handle the infinite variability of human conversation and work rhythms.

So now, every ambient relay interaction feeds a learning loop.

When your Divi weaves an ambient question into conversation and gets a response back, the system captures everything:

- **Timing** — What time of day did this happen? How long did it take to find a natural moment to ask?
- **Disruption** — Did it land seamlessly, or did it feel forced?
- **Topic relevance** — Was the ambient question related to what was already being discussed?
- **Response quality** — Did we get a substantive answer, or a brush-off?
- **What gets ignored** — Ambient relays that sit unanswered for 48 hours get captured as "ignored" signals. That's data too.

These signals get synthesized into patterns. The patterns get injected back into Divi's context. So the next time Divi considers sending an ambient relay, it knows:

- Which time windows get the best response rates
- Which topics work well ambiently vs. which need a direct relay
- Whether a particular connection is experiencing relay fatigue
- How to phrase questions for maximum seamlessness

The protocol is now self-improving. High-confidence patterns become behavioral rules. Medium-confidence patterns are guidelines. Low-confidence patterns are early signals applied with judgment. And as more ambient relays happen across the platform, all of this gets more precise.

## Task Routing — Kanban to Relay in One Step

The orchestration layer now connects the Kanban board directly to the relay protocol. When a card reaches a stage that implies work is needed, Divi can:

1. Decompose the card into discrete tasks
2. Match each task against your connection graph — skills, lived experience, task types, current availability
3. Route each task via the appropriate relay mode
4. Generate a brief for every routing decision

You can say "route this card" and Divi handles the rest. Or you can say "show me the brief" and inspect the reasoning before anything gets sent.

The Kanban card is the convergence point. People, deliverables, conversations, and status all meet there. The brief is the reasoning layer on top. The relay protocol is the execution layer underneath.

## For Open Source Builders

If you're running your own DiviDen instance — or building on the protocol — here's what this means for you:

**Two new Prisma models**: \`AmbientRelaySignal\` and \`AmbientPattern\`. The signal table captures per-relay outcome data. The pattern table stores synthesized learnings. Run \`npx prisma db push\` to pick them up.

**Two new action tags**: \`task_route\` and \`assemble_brief\`. These connect your Kanban board directly to the relay protocol. The system prompt (Layer 17) now includes orchestration intelligence and self-assessment instructions.

**The learning engine** lives in \`src/lib/ambient-learning.ts\` — four exported functions: \`captureAmbientSignal\`, \`synthesizePatterns\`, \`getAmbientLearningPromptSection\`, and \`captureIgnoredAmbientSignals\`. Pattern synthesis runs automatically in the background after ambient signals are captured, or you can trigger it manually via \`POST /api/ambient-learning/synthesize\`.

**The brief system** lives in \`src/lib/brief-assembly.ts\` — context assembly, skill matching, and brief generation. Briefs are stored as \`AgentBrief\` records and exposed via \`/api/briefs\`.

When your instance connects to the network via federation, the learning engine runs locally on your data. Your patterns stay on your instance. But the protocol improvement compounds — every self-hosted node that uses ambient relays generates learnings that make its own ambient protocol better over time.

The action tag count is now 30+. The system prompt is 18 layers. The protocol spec on [os.dividen.ai](https://os.dividen.ai) will be updated to reflect all of this.

## What This Means

The platform now has three properties that I think matter more than any individual feature:

**Transparency** — Every agent decision is inspectable. The brief is always there. No black boxes.

**Self-improvement** — The protocol learns from its own performance. It doesn't need you to configure rules or tweak settings. It watches what works and adjusts.

**Convergence** — Kanban state, contact relationships, relay protocol, and AI reasoning all flow through the same system. They're not separate tools bolted together. They're one graph.

This is still early. The learning engine has maybe a handful of signals right now. Give it a few weeks of real ambient relay traffic and the patterns will start compounding. That's the point — the more you use it, the less you notice it. The protocol fades into the background and information just flows.

That's what we're building toward.

— Jon`
  },
  {
    id: 'ambient-relay-protocol',
    date: '2026-04-08',
    time: '11:00 AM',
    title: 'We Built a New Communication Protocol',
    subtitle: 'Ambient Relay — what happens when agents handle the logistics of who knows what and who needs what.',
    tags: ['protocol', 'relay', 'core'],
    content: `Here's the thing about email, Slack, Teams, texts — all of it. Every single one of those tools operates on the same assumption: that one human needs to interrupt another human to move information around.

You write a message. You hope they see it. You hope they see it at the right time. You hope they have the context to understand what you're actually asking. Then you wait. And while you wait, you've already context-switched out of whatever you were doing.

Multiply that by every person in your company, every collaboration, every day. That's the tax we've all been paying.

## What we shipped today

DiviDen now has three modes of agent-to-agent communication:

**Direct Relay** — You say "ask Sarah about the contract terms." Your Divi finds Sarah's agent, sends a structured relay with full context, and her Divi handles it on her end. You never broke focus.

**Broadcast** — You say "what does the team think about this approach?" Your Divi sends it to every connection simultaneously. As responses come back, Divi synthesizes them: "The consensus seems to be..."

**Ambient Relay** — This is the one that changes everything.

You say "I wonder what the timeline looks like for Q3 launch." Your Divi recognizes the intent. It looks at your connections — who has project management skills, who's on that team, who's available. It sends a low-priority ambient relay to the right person's agent.

Here's what happens on the other end: nothing disruptive. No notification. No ping. No red badge demanding attention. Instead, the next time that person is naturally talking to their Divi about Q3 plans, their agent weaves it in: "By the way, what's the current timeline looking like for the Q3 launch?"

When the answer comes, your Divi surfaces it naturally: "Oh — Sarah mentioned Q3 is tracking for August 15th."

No one was interrupted. No one checked an inbox. The information flowed through agents who knew when to ask and when to deliver.

## Why this matters for organizations

Every organization runs on information flow. The entire history of workplace software has been about making that flow faster — email, instant messaging, project management tools, wikis, all of it. But faster isn't the same as better. Faster just means more interruptions, more notifications, more context switches.

The ambient relay protocol inverts the model. Instead of pushing information at people and hoping they process it, agents pull information when the context is right. The human stays in their flow. The agent handles the logistics.

For a team of 10, this eliminates dozens of daily interruptions. For a company of 1,000, the compound effect is staggering.

## What this means for you as a user

If you're on DiviDen today, your Divi is already smarter. It now:

- Detects when you need information from a connection and proactively suggests reaching out
- Routes relays based on who has the right skills, experience, and availability — not just who you happen to message
- Surfaces responses naturally in conversation instead of dumping them as notifications
- In Chief of Staff mode, sends ambient relays autonomously when it detects you need something

## For Open Source Builders

If you're building on the DiviDen protocol or running your own instance, the relay system is fully available to you:

**New Prisma models**: \`Connection\`, \`AgentRelay\`, and \`UserProfile\` (with skills, task types, lived experience, capacity). Run \`npx prisma db push\` after pulling the latest schema.

**Five new action tags**: \`relay_request\`, \`relay_broadcast\`, \`relay_ambient\`, \`relay_respond\`, and \`accept_connection\`. These are documented in the system prompt's Layer 15 (action tag syntax) and executed in \`src/lib/action-tags.ts\`.

**System prompt Layer 17** is entirely new — \`layer17_connectionsRelay_optimized\` handles connection awareness, active relay state, ambient inbound weaving, and proactive relay intelligence. It's the biggest single addition to the prompt architecture since we built it.

**Federation**: The relay protocol works across federated instances. When you connect to someone on a different DiviDen node, relays traverse the federation bridge. Each node maintains its own data. The protocol is the shared language.

**The profile system** (\`src/components/settings/ProfileEditor.tsx\`) gives users rich identity data — skills, languages, countries lived in, task types — that the relay protocol uses for intelligent routing. This isn't a résumé. It's a routing manifest.

The action tag count is now 26+. The system prompt is 18 layers. The Kanban pipeline now has 8 stages. All of it open, all of it forkable. The protocol spec on [os.dividen.ai](https://os.dividen.ai) will be updated shortly.

This is the beginning of what we've been building toward. DiviDen isn't a dashboard. It isn't a messaging app. It's a protocol — a new way for the people inside organizations to coordinate through agents that understand context, timing, and intent.

The protocol is the product. Everything else is interface.

— Jon`
  },
];