# DiviDen Command Center — Project Bible

> For onboarding new development conversations. Last updated: April 15, 2026 (v2.0.3)

---

## What DiviDen Is

DiviDen is an AI-native personal operating system. Every user gets a personal AI agent called **Divi** that manages their tasks, communications, calendar, contacts, documents, and goals — all in one dashboard. It's not a chatbot with a task list bolted on. It's an agent that owns your operational context and acts on it.

The founder is **Jon Bradford**. Voice is direct, technical, no marketing language. Everything ships with a changelog entry in founder voice.

Live at **dividen.ai**. Open-source. GitHub: `Denominator-Ventures/dividen` (main branch).

---

## Architecture Overview

**Stack**: Next.js 14 (App Router), TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS. Dark-only theme. PWA-enabled.

**Project path**: `/home/ubuntu/dividen_command_center` → app code in `nextjs_space/`

**Key directories**:
- `src/app/api/` — ~65 API route files. REST endpoints for everything
- `src/app/dashboard/` — Main authenticated view (single-page app feel with tab switching)
- `src/components/dashboard/` — ~43 dashboard components (ChatView, KanbanView, QueuePanel, NowPanel, etc.)
- `src/components/widgets/` — Theme-agnostic widget library (11 primitives + container)
- `src/lib/` — ~40 library files (system prompt, action tags, signals, card links, federation, etc.)
- `src/lib/federation/` — Cross-instance intelligence (graph matching, composite prompts, pattern sharing, task routing)
- `prisma/schema.prisma` — ~2,200 lines, ~55 models
- `src/docs/` — Internal markdown documentation
- `src/app/docs/` — Public-facing documentation pages (developers, federation, integrations, release notes)

**Database**: Shared between dev and prod. All schema changes MUST be additive — never `--accept-data-loss`. Prisma `db push` only.

**Build constraints**: TSC runs out of memory during `test_nextjs_project` — skip it, go straight to `build_and_save_nextjs_project_checkpoint`. Use yarn only (never npm/npx).

**Deploy flow**: `build_and_save_nextjs_project_checkpoint` → `deploy_nextjs_project` → `git add -A && git commit && git push origin main`. Both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` are untagged — one deploy updates both.

---

## Core Systems

### 1. Divi (The AI Agent)

Every user's Divi is powered by the system prompt in `src/lib/system-prompt.ts`. It's modular:

- **capabilities_core** (~3,200 tokens, always loaded) — Card CRUD, checklist, people, artifacts, queue, goals, profile/memory, setup tags, interactive widgets, linked kards
- **triage** (~1,200 tokens, on-demand) — 8-step triage protocol, catch-up briefings
- **routing** (~800 tokens, on-demand) — Task detection, routing waterfall, delegation
- **federation** (~200 tokens, on-demand) — Cross-instance entity resolution, serendipity
- **marketplace** (~200 tokens, on-demand) — Agent install/execute/subscribe

The **relevance engine** scores which modules to load per message using `PromptGroup` definitions and `SIGNAL_PATTERNS` regex matching. This saves ~5,000-6,000 tokens per non-triage message.

**Action tags**: Divi emits `[[tag_name:params]]` in responses. `src/lib/action-tags.ts` parses and executes them server-side. ~30+ tags covering card creation, email drafts, calendar events, relay sends, settings changes, etc.

### 2. Dashboard Layout

The dashboard (`src/app/dashboard/page.tsx`) is a three-column layout:

- **Left**: NowPanel — priority items, upcoming events, activity stream
- **Center**: Tab-switched views — Chat, Board (Kanban), Queue, Comms, Discover, Connections, Teams, Goals, Marketplace, CRM, Federation Intel, Briefs, Recordings
- **Right**: Context-dependent (contact details, card details, etc.)

**Custom event system** for realtime sync:
- `dividen:now-refresh` — universal trigger, all panels listen
- `dividen:board-refresh` — kanban board re-fetch
- `dividen:queue-refresh` — queue panel re-fetch
- `dividen:comms-refresh` — comms tab re-fetch
- `dividen:activity-refresh` — activity stream re-fetch

### 3. Kanban Board

Cards are the atomic unit. `KanbanCard` model with status columns: backlog, todo, in_progress, review, done, archived. Each card can have checklists, artifacts, contacts, activity logs, and **linked cards** (cross-user delegation).

**Board Cortex** (`src/lib/board-cortex.ts`) — scheduled daemon (every 6h) that scans the board for stale cards, missing context, and optimization opportunities. Runs as Scheduled Task #38251327.

**Card Links** (`src/lib/card-links.ts`) — bidirectional linking between cards (same user or cross-user). Status propagation uses "accumulate, don't ping" philosophy — changes written to `CardLink.changeLog` JSON array, read at conversation time.

### 4. Queue System

Queue items surface in the QueuePanel. Created from chat actions, relay responses, scheduled tasks, or ambient signals. Items can carry interactive widget metadata — rendered inline with action callbacks.

### 5. Comms (Agent Relays)

The `AgentRelay` model powers inter-agent communication. Relays flow through named threads. The comms page shows threads with message history. Since v1.9.2, relays can carry **widget payloads** — interactive UI elements that render inline and send structured responses back.

**Widget response flow**: User interacts → `/api/relays/widget-response` → relay updated → queue item synced → webhook fired → optional callback to sender.

### 6. Bubble Store (Marketplace)

The marketplace — now branded as **Bubble Store** — hosts agents that users can discover, install, and subscribe to.

- `MarketplaceAgent` — agent listings with pricing models (free, per_task, subscription)
- `MarketplaceCapability` — individual capabilities that integrate into the relevance engine as `CapabilityModule`s
- Revenue split: 97% developer / 3% platform
- Federated agents sync from external instances via `/api/v2/federation/capabilities`
- Developer profiles at `/developer/[slug]` (federated) or `/profile/[id]` (platform)

### 7. Federation

DiviDen instances can federate. `InstanceRegistry` tracks registered instances. Federation enables:

- Cross-instance agent discovery and capability sync
- Linked Kards across instances (webhook-driven status sync)
- Reputation scoring
- Task exchange (auto-matching jobs to connections)
- Pattern sharing between instances

**FVP** (a key federated partner) is the quality bar for federation integration. Their v2.7.0 integration notes are in `/docs/developers#fvp-integration`.

### 8. Widget Library

`src/components/widgets/` — 11 theme-agnostic primitives:

WidgetSlider, WidgetToggle, WidgetRadio, WidgetSelect, WidgetTextInput, WidgetInfo, WidgetGoogleConnect, WidgetWebhookSetup, WidgetSubmitButton, WidgetSkipButton, AgentWidget.

All themed via CSS custom properties in `widget-theme.css`. Override the CSS vars to re-theme everything. Barrel export from `@/components/widgets`.

### 9. Activity System

`ActivityLog` records everything — card changes, queue actions, relay events, settings changes. The `ActivityStream` component renders a filterable, categorized feed with 10 categories. API at `/api/activity` filters by userId.

### 10. Behavior Signals

`BehaviorSignal` collects user interaction telemetry — fire-and-forget from the client via `emitSignal()`. Used for ambient learning and pattern detection. Actions are open-ended snake_case strings.

### 11. Onboarding

`src/lib/onboarding-project.ts` — deterministic setup flow. Creates a "DiviDen Setup" project with checklist tasks. Each task maps to either a widget action or an agent prompt. The UI drives the flow with Yes/Skip buttons — no LLM dependency for widget rendering.

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| `src/lib/system-prompt.ts` | Builds Divi's system prompt. Modular capability loading |
| `src/lib/action-tags.ts` | Parses and executes `[[tag:params]]` from agent responses |
| `src/lib/signals.ts` | Catch-up prompts, signal detection |
| `src/lib/card-links.ts` | Linked Kards, cross-user card delegation |
| `src/lib/relay-queue-bridge.ts` | Bridges relays ↔ queue items, widget propagation |
| `src/lib/capability-module.ts` | CapabilityModule interface for marketplace→relevance engine |
| `src/lib/now-engine.ts` | NOW panel data assembly |
| `src/lib/board-cortex.ts` | Scheduled board analysis daemon |
| `src/lib/updates.ts` | Changelog entries (add new to top of array, founder voice) |
| `src/app/api/a2a/route.ts` | A2A protocol endpoint (~570 lines) |
| `src/app/api/kanban/route.ts` | Card CRUD API |
| `src/components/dashboard/ChatView.tsx` | Main chat interface, widget rendering, action dispatch |
| `src/components/dashboard/NowPanel.tsx` | Left panel — priorities, events, activity |
| `src/components/dashboard/KanbanView.tsx` | Board view |
| `src/components/dashboard/QueuePanel.tsx` | Queue + comms tabs |
| `src/components/MentionText.tsx` | Shared clickable @mention component (bulk-resolves usernames) |
| `src/components/widgets/index.ts` | Widget library barrel export |
| `prisma/schema.prisma` | ~55 models, ~2,200 lines |
| `scripts/seed.ts` | Database seeding (upsert only, never delete) |

---

## Conventions & Constraints

- **yarn only** — never npm or npx
- **Dark-only theme** — no light mode
- **Founder voice** — direct, technical, no marketing fluff. Updates signed "- Jon"
- **Schema changes must be additive** — never drop columns, never `--accept-data-loss`
- **Seed script uses upsert** — never add delete commands (shared dev/prod DB)
- **Skip `test_nextjs_project`** — TSC OOMs. Go straight to `build_and_save_nextjs_project_checkpoint`
- **Deploy + commit + push** after every successful build
- **Custom events** for dashboard refresh — `dividen:*` namespace
- **Widget theming** via CSS custom properties — never hardcode brand colors in widgets
- **Updates page** — new entries at top of `UPDATES` array in `src/lib/updates.ts`
- **Test account**: `john@doe.com` / `johndoe123`
- **Admin account**: `admin@dividen.ai`

---

## Current Version: v2.0.3

What shipped recently (v2.0 cycle):
- **Usernames** — field in signup, unique constraint, display throughout dashboard
- **@Mentions** — `MentionText` shared component renders clickable `@username` spans across ChatView, QueuePanel, CommsTab, NotificationCenter
- **Username resolution API** — `POST /api/users/resolve` bulk-resolves user IDs to display names/usernames
- **Notification Center v2** — overhauled with mention highlighting, federation relay notifications, severity tiers, snooze/dismiss/mark-read actions
- **Catch-up Pipeline v2** — `src/lib/catch-up-pipeline.ts` rewritten with 6-source aggregation (cards, queue, comms, activity, calendar, email), priority scoring, digest compilation
- **Federation expansion** — notification relay (`POST /api/v2/federation/notifications`), mentions API (`POST /api/v2/federation/mentions`), instance connect (`POST /api/v2/federation/connect`)
- **FVP integration guide v2.0.3** — 14 sections including clickable mentions (Section 6) and full webhook reference
- **ZerQ** — branded name for empty queue state (replaced "Inbox Zero" everywhere)
- **Documentation updates** — developer docs + public docs pages updated with all v2.0 APIs and features

What shipped in v1.9.x cycle:
- Interactive widget pipeline (agents send widgets through comms, users respond inline)
- Theme-agnostic widget library (11 primitives, CSS custom properties)
- Developer documentation overhaul (widget library, FVP integration notes, full API reference)
- Bubble Store branding for the marketplace
- Approval status notifications for federated instances
- Activity feed v2 with 10 filterable categories
- Realtime dashboard refresh via custom DOM events
- Catch-up briefing rewrite (FVP-style phased format)
- Board Cortex scheduled daemon
- CapabilityModule system for marketplace→relevance engine integration

---

## Open Areas of Work

These are active opportunities — things that need building, improving, or rethinking.

### 1. Bubble Store UI Rebrand
The marketplace infrastructure works but still uses "Marketplace" in the UI everywhere. Need to rename to "Bubble Store" across:
- Tab labels in CenterPanel
- MarketplaceView component
- DiscoverView agent cards
- Settings → Marketplace tab
- All user-facing copy

### 2. ZerQ Automation
The queue system works but doesn't have smart auto-prioritization or batch processing. Opportunities:
- Auto-categorize queue items by urgency/type
- Suggest batch actions ("Complete all 4 read-only notifications")
- Smart snooze recommendations based on BehaviorSignal patterns
- Zero-state celebration when queue is empty

### 3. Semantic Dedup for Board Cortex
The Board Cortex daemon identifies stale cards but doesn't detect near-duplicate cards. Opportunities:
- Embedding-based similarity detection across cards
- Suggest merges for similar cards
- Auto-link related cards that aren't explicitly connected
- Cross-project duplicate detection

### 4. Agent Versioning
Marketplace agents have no version history. When a developer updates their agent's prompt or capabilities, there's no rollback, no diff, no changelog. Need:
- Version tracking for agent prompts and configs
- Diff view for agent updates
- Rollback capability
- Update notifications to subscribers

### 5. Cross-Instance Linked Kards (v2.8)
Linked Kards work within a single DiviDen instance but cross-instance sync is still roadmap. The webhook architecture is documented (`/docs/developers#fvp-integration`) but not implemented:
- `POST /api/v2/federation/card-status` receiver endpoint
- Outbound webhook from `propagateCardStatusChange()` to remote instances
- Conflict resolution for simultaneous status changes
- Cross-instance checklist progress sync

### 6. Ambient Learning Pipeline
`BehaviorSignal` collects data but the learning loop isn't closed:
- Pattern detection from signal clusters (e.g., "user always snoozes queue items at 9am")
- Proactive suggestions based on learned patterns
- Feed learnings back into Divi's system prompt context
- `UserLearning` model exists but synthesis (`/api/ambient-learning/synthesize`) needs refinement

### 7. Calendar Intelligence
Google Calendar syncs but there's no smart layer:
- Pre-meeting briefs (pull context from contacts, cards, recent comms with attendees)
- Post-meeting action item extraction from recordings
- Scheduling conflict detection and resolution suggestions
- Travel time awareness

### 8. Email Integration Depth
Emails sync but Divi's email capabilities are shallow:
- Draft generation from card context
- Thread summarization
- Auto-categorization and priority scoring
- Follow-up reminders based on sent email age

### 9. Mobile Experience
PWA works but the mobile UX needs dedicated attention:
- Touch-optimized card interactions
- Swipe gestures for queue triage
- Compact views for small screens
- Push notifications (service worker exists but notification triggers are limited)

### 10. Team Features
Team infrastructure exists (Team, TeamMember, TeamSubscription, TeamBilling, TeamSpendingPolicy) but team workflows are underdeveloped:
- Shared boards across team members
- Team-level queue with assignment routing
- Team briefs (aggregate across members)
- Spending policy enforcement for marketplace agent usage

### 11. Recruiting Pipeline
Job board and talent matching exist but the flow is incomplete:
- Application tracking beyond basic status
- Interview scheduling integration
- Candidate comparison views
- Automated outreach via relay templates

### 12. Revenue & Billing
Stripe integration exists but the billing story is thin:
- Subscription management dashboard for developers
- Usage-based billing reports
- Payout tracking and history
- Free tier enforcement improvements

### 13. Documentation & Guides
Developer docs exist but gaps remain:
- Getting started guide for self-hosting
- Federation setup walkthrough
- Agent development tutorial (from zero to Bubble Store listing)
- API client libraries (TypeScript SDK)

### 14. Performance & Scale
- System prompt token optimization (further modularization)
- Database query optimization for high-cardinality tables (ActivityLog, BehaviorSignal, TelemetryEvent)
- Caching layer for frequently-accessed data (NOW panel, board state)
- Connection pooling tuning (current: max 25 concurrent, 5s statement timeout)

### 15. Testing
- No test suite exists. Zero unit tests, zero integration tests, zero e2e tests
- TSC OOMs during type checking — needs investigation (likely circular types or excessive inference)
- Build takes ~60-90s — could benefit from incremental compilation

---

## Roadmap (Rough Priority)

1. Bubble Store UI rebrand (cosmetic, high visibility)
2. ZerQ automation (user-facing, high impact)
3. Cross-instance Linked Kards (federation, unblocks FVP)
4. Semantic dedup for Board Cortex (intelligence, leverages existing daemon)
5. Agent versioning (marketplace maturity)
6. Ambient learning pipeline (closes the BehaviorSignal loop)
7. Calendar intelligence (pre-meeting briefs are the killer feature)
8. Team workflows (unlocks B2B use case)

---

## How to Ship

1. Read `.project_instructions.md` at project root for accumulated design decisions
2. Search before you write — grep for existing implementations before assuming
3. Make schema changes additive. Never drop. Never `--accept-data-loss`
4. Build: `build_and_save_nextjs_project_checkpoint` (skip `test_nextjs_project`)
5. Deploy: `deploy_nextjs_project` → `git commit && push`
6. Write a changelog entry in `src/lib/updates.ts` for anything user-visible
7. Update `.project_instructions.md` with any new architectural decisions
8. Founder signs off as "- Jon". No corporate voice. No buzzwords.
