# DiviDen Command Center — Project Bible

> **Last updated**: April 14, 2026 (v1.4.0)  
> **Purpose**: Comprehensive onboarding document for any new developer or AI agent continuing this project.

---

## 1. What Is DiviDen?

DiviDen is an **AI-native personal operating system for professionals**. Every user gets their own AI agent called **Divi** that manages their queue, calendar, email, CRM, projects, kanban, goals, and more — all from a single dashboard with a conversational interface.

The core philosophy:
- **Individual-first**: Each person runs their own DiviDen instance (or uses the hosted platform at dividen.ai)
- **Agent-to-Agent federation**: DiviDen instances connect to each other. Your Divi talks to my Divi.
- **Open-core**: The codebase is MIT-licensed. Self-hosted instances are free with no feature gates. The hosted platform (dividen.ai) is the monetization layer with subscriptions and marketplace fees.
- **Teams are grouping, not hierarchy**: A team just adds a group of users to a project as an organized bundled unit. CoS delegation still operates at the ProjectMember level.

**Deployed at**: `dividen.ai` (custom domain) and `sdfgasgfdsgsdg.abacusai.app` (Abacus staging). Both are untagged deployments.

**GitHub**: `https://github.com/Denominator-Ventures/dividen.git` (remote `origin`, PAT auth configured)

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS custom properties (dark theme only) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (credentials provider, JWT strategy, 30-day sessions) |
| AI/LLM | Anthropic Claude (via `src/lib/llm.ts`), Abacus AI API key |
| Payments | Stripe (Connect for payouts, Customer for billing) |
| Storage | AWS S3 (file uploads, cloud storage) |
| Google | OAuth for calendar/email sync, Gemini API for meeting notes |
| Package Manager | **yarn only** — never npm/npx |
| Deployment | Abacus AI platform (standalone Next.js output) |

---

## 3. Project Structure

```
/home/ubuntu/dividen_command_center/          ← PROJECT ROOT (use this in all tools)
├── .project_instructions.md                  ← Agent memory file (design decisions, patterns)
├── .abacus.donotdelete                       ← NEVER MODIFY
├── nextjs_space/                             ← All source code lives here
│   ├── prisma/schema.prisma                  ← Database schema (2139 lines, 67 models)
│   ├── scripts/seed.ts                       ← Database seed (upserts, never deletes)
│   ├── src/
│   │   ├── app/                              ← Next.js App Router pages + API routes
│   │   │   ├── page.tsx                      ← Landing page (renders LandingPage component)
│   │   │   ├── layout.tsx                    ← Root layout (SessionProvider, fonts, OG)
│   │   │   ├── providers.tsx                 ← SessionProvider wrapper
│   │   │   ├── globals.css                   ← CSS variables, Tailwind, PWA fixes
│   │   │   ├── dashboard/page.tsx            ← Main app dashboard (orchestrator)
│   │   │   ├── admin/page.tsx                ← Admin panel
│   │   │   ├── settings/page.tsx             ← User settings page
│   │   │   ├── login/page.tsx                ← Login page
│   │   │   ├── setup/page.tsx                ← Account creation / signup
│   │   │   ├── updates/page.tsx              ← Updates wall page
│   │   │   ├── profile/[userId]/page.tsx     ← Public user profiles
│   │   │   ├── team/[id]/page.tsx            ← Team profile page
│   │   │   ├── team/invite/[token]/page.tsx  ← Team invite acceptance
│   │   │   ├── docs/                         ← Documentation pages
│   │   │   │   ├── developers/page.tsx       ← API reference (v2 endpoints)
│   │   │   │   ├── federation/page.tsx       ← Federation protocol docs
│   │   │   │   ├── integrations/page.tsx     ← Integration guides
│   │   │   │   └── release-notes/page.tsx    ← Versioned release notes
│   │   │   ├── open-source/page.tsx          ← Open-source landing page
│   │   │   ├── terms/page.tsx                ← Terms of Service
│   │   │   ├── privacy/page.tsx              ← Privacy Policy
│   │   │   └── api/                          ← API routes (see Section 6)
│   │   ├── components/
│   │   │   ├── landing/                      ← Landing page components
│   │   │   │   ├── LandingPage.tsx           ← Full landing page (hero, features, pricing)
│   │   │   │   └── HowItWorks.tsx            ← Animated loop flowchart
│   │   │   ├── dashboard/                    ← Dashboard tab components
│   │   │   │   ├── ChatView.tsx              ← Chat with Divi
│   │   │   │   ├── QueuePanel.tsx            ← Task queue (left sidebar)
│   │   │   │   ├── NowPanel.tsx              ← NOW engine ranked items
│   │   │   │   ├── CenterPanel.tsx           ← Tab switcher (center content)
│   │   │   │   ├── KanbanView.tsx            ← Kanban board
│   │   │   │   ├── CrmView.tsx               ← CRM / contacts
│   │   │   │   ├── CalendarView.tsx           ← Calendar
│   │   │   │   ├── InboxView.tsx             ← Email inbox
│   │   │   │   ├── ChiefOfStaffView.tsx      ← CoS mode panel
│   │   │   │   ├── TeamsView.tsx             ← Teams management + invites
│   │   │   │   ├── GoalsView.tsx             ← Goals tracking
│   │   │   │   ├── MarketplaceView.tsx       ← Agent marketplace
│   │   │   │   ├── ConnectionsView.tsx       ← Network connections
│   │   │   │   ├── MemoryPanel.tsx           ← Agent memory items
│   │   │   │   ├── DriveView.tsx             ← Document drive
│   │   │   │   ├── RecordingsView.tsx        ← Meeting recordings
│   │   │   │   ├── CapabilitiesView.tsx      ← Agent capabilities
│   │   │   │   ├── FederationIntelligenceView.tsx ← Federation intel
│   │   │   │   ├── JobBoardView.tsx          ← Network job board
│   │   │   │   ├── ExtensionsView.tsx        ← Agent extensions
│   │   │   │   ├── GlobalSearch.tsx          ← Cross-surface search
│   │   │   │   ├── NotificationCenter.tsx    ← Notification dropdown
│   │   │   │   ├── OnboardingWelcome.tsx     ← Welcome popup for new users
│   │   │   │   ├── OnboardingChatWidgets.tsx  ← Interactive onboarding widgets
│   │   │   │   └── AgentWidget.tsx           ← In-chat interactive widget system
│   │   │   ├── settings/                     ← Settings page components
│   │   │   ├── admin/                        ← Admin panel tabs
│   │   │   ├── updates/UpdatesPage.tsx       ← Updates wall renderer
│   │   │   └── ui/DragScrollContainer.tsx    ← Utility component
│   │   ├── lib/                              ← Core business logic
│   │   │   ├── prisma.ts                     ← Singleton PrismaClient + telemetry
│   │   │   ├── auth.ts                       ← NextAuth config (credentials)
│   │   │   ├── api-auth.ts                   ← Bearer token auth for v2 API
│   │   │   ├── llm.ts                        ← LLM integration (Anthropic Claude)
│   │   │   ├── system-prompt.ts              ← Dynamic system prompt builder (1844 lines)
│   │   │   ├── action-tags.ts                ← Action tag parser + executors (2495 lines)
│   │   │   ├── cos-sequential-dispatch.ts    ← Chief of Staff execution engine
│   │   │   ├── smart-task-prompter.ts        ← Agent-aware task optimizer
│   │   │   ├── feature-gates.ts              ← Subscription/billing gates
│   │   │   ├── team-project-sync.ts          ← Team→Project member sync
│   │   │   ├── now-engine.ts                 ← NOW panel scoring/ranking
│   │   │   ├── queue-gate.ts                 ← Queue confirmation gate logic
│   │   │   ├── queue-dedup.ts                ← Deduplication for queue items
│   │   │   ├── queue-dispatch.ts             ← Queue dispatching logic
│   │   │   ├── signals.ts                    ← Signal processing
│   │   │   ├── behavior-signals.ts           ← User behavior tracking
│   │   │   ├── stripe.ts                     ← Stripe client + helpers
│   │   │   ├── s3.ts                         ← S3 upload/presign helpers
│   │   │   ├── google-oauth.ts               ← Google OAuth helpers
│   │   │   ├── google-sync.ts                ← Calendar/email sync
│   │   │   ├── telemetry.ts                  ← Request/error logging
│   │   │   ├── memory.ts                     ← Memory system
│   │   │   ├── activity.ts                   ← Activity logging
│   │   │   ├── entity-resolution.ts          ← Cross-surface entity matching
│   │   │   ├── brief-assembly.ts             ← AI brief generation
│   │   │   ├── ambient-learning.ts           ← Ambient learning synthesis
│   │   │   ├── relay-queue-bridge.ts         ← Relay↔queue bridging
│   │   │   ├── job-matcher.ts                ← Job matching algorithm
│   │   │   ├── task-exchange.ts              ← Task exchange protocol
│   │   │   ├── webhook-actions.ts            ← Webhook action handlers
│   │   │   ├── webhook-auth.ts               ← Webhook authentication
│   │   │   ├── webhook-learn.ts              ← Webhook pattern learning
│   │   │   ├── webhook-push.ts               ← Outbound webhook delivery
│   │   │   ├── contact-platform-bridge.ts    ← Contact auto-linking
│   │   │   ├── marketplace-config.ts         ← Marketplace configuration
│   │   │   ├── pricing-types.ts              ← Pricing model types
│   │   │   ├── free-tier.ts                  ← Free tier check
│   │   │   ├── rate-limit.ts                 ← Rate limiting
│   │   │   ├── updates.ts                    ← Changelog entries (founder voice)
│   │   │   ├── landing-data.ts               ← Landing page content data
│   │   │   ├── federation/                   ← Federation subsystem
│   │   │   │   ├── composite-prompts.ts      ← Cross-instance prompt composition
│   │   │   │   ├── graph-matching.ts         ← Graph-based matching
│   │   │   │   ├── pattern-sharing.ts        ← Pattern sharing protocol
│   │   │   │   └── task-routing.ts           ← Federated task routing
│   │   │   └── utils.ts                      ← Shared utilities (cn, etc.)
│   │   └── types/index.ts                    ← Shared TypeScript types
│   ├── .env                                  ← Environment variables
│   ├── next.config.js                        ← Next.js configuration
│   ├── tailwind.config.ts                    ← Tailwind config + custom animations
│   ├── tsconfig.json                         ← TypeScript config
│   └── public/                               ← Static assets
```

---

## 4. Design System & Theme

DiviDen uses a **dark-only** theme with CSS custom properties:

| Variable | Value | Usage |
|----------|-------|-------|
| `--brand-primary` | `#4f7cff` | Primary blue (buttons, links, active tabs) |
| `--brand-secondary` | `#5a8fff` | Secondary blue |
| `--brand-accent` | `#b4ff3b` | Lime green accent |
| `--bg-primary` | `#0a0a0a` | Page background |
| `--bg-secondary` | `#0e0e0e` | Slightly lighter bg |
| `--bg-tertiary` | `#161616` | Card/panel background |
| `--bg-surface` | `rgba(255,255,255,0.04)` | Surface elements |
| `--bg-surface-hover` | `rgba(255,255,255,0.07)` | Hover state |
| `--border-color` | `rgba(255,255,255,0.06)` | Default borders |
| `--text-primary` | `#f5f5f5` | Main text |
| `--text-secondary` | `#a1a1a1` | Secondary text |
| `--text-muted` | `rgba(161,161,161,0.5)` | Muted/disabled text |

**CSS utility classes** (defined in `globals.css`):
- `.card` — surface bg + border + rounded-xl
- `.card-header` — border-bottom flex header
- `.btn-primary` — brand blue button
- `.btn-secondary` — surface bg button with border
- `.input-base` — standard text input
- `.tab-active` / `.tab-inactive` — tab styling
- `.code-inline` — inline code snippet styling

**Fonts**: Google Fonts loaded in layout.tsx (Inter for body, heading font configured via CSS).

**PWA**: Service worker registered, standalone display mode supported with safe-area-inset handling.

---

## 5. Database Schema (67 Models)

The Prisma schema is at `prisma/schema.prisma` (2139 lines). Key model groups:

### Core User
- **User** — email/password auth, role, mode (cockpit/chief_of_staff), Stripe IDs, free tier flag, queueAutoApprove, onboarding state
- **UserProfile** — extended profile (bio, skills, languages, headline, LinkedIn)

### Task Management
- **QueueItem** — central task queue. Statuses: `pending_confirmation`, `ready`, `in_progress`, `completed`, `blocked`, `canceled`. Has `cosExecution` JSON for CoS metadata.
- **KanbanCard** — project cards with checklists, artifacts, contacts
- **ChecklistItem** — subtasks on kanban cards
- **CardArtifact** — linked emails/docs/recordings on cards
- **Goal** — OKR-style goals with progress tracking

### Communication
- **ChatMessage** — user↔Divi chat messages
- **AgentMessage** — system/agent messages
- **EmailMessage** — synced emails
- **CommsMessage** — in-app messaging
- **CalendarEvent** — synced calendar events
- **Recording** — meeting recordings + AI notes

### CRM
- **Contact** — CRM contacts with enrichment data
- **ContactRelationship** — typed relationships between contacts
- **CardContact** — contact↔card linkage

### Teams & Projects
- **Team** — name, description, type, visibility, originInstanceUrl, isSelfHosted, agentEnabled
- **TeamMember** — userId or connectionId (federated), role (owner/admin/member)
- **TeamInvite** — token-based invites with email/role/expiry/status
- **Project** — scoped collaborations, optional team ownership
- **ProjectMember** — user membership in projects
- **ProjectInvite** — project-level invitations
- **TeamSubscription** — billing tier for platform teams
- **TeamBilling** — billing details
- **TeamSpendingPolicy** — spending limits
- **TeamAgentAccess** — agent marketplace access control
- **TeamFollow** — team followers

### Federation & Network
- **Connection** — peer connections (local or federated)
- **AgentRelay** — agent-to-agent relay messages
- **AmbientRelaySignal** / **AmbientPattern** — ambient learning from relays
- **FederationConfig** — instance-level federation settings
- **InstanceRegistry** — known federated instances
- **Invitation** — cross-instance connection invitations

### Marketplace
- **MarketplaceAgent** — published agents with Integration Kits, pricing, access passwords
- **MarketplaceSubscription** — user subscriptions to agents
- **MarketplaceExecution** — execution logs
- **MarketplaceCapability** / **UserCapability** — capability definitions

### Jobs & Economy
- **NetworkJob** — task postings on the job board
- **JobApplication** — applications to jobs
- **JobContract** — agreed work contracts
- **JobPayment** — payment records
- **JobReview** — post-completion reviews
- **ReputationScore** — user reputation

### Agent Intelligence
- **MemoryItem** — agent memory (patterns, preferences, learnings)
- **UserLearning** — synthesized learnings from behavior
- **BehaviorSignal** — tracked user behavior signals
- **AgentQualityScore** — self-assessment scores
- **WorkflowPattern** — detected workflow patterns
- **SignalConfig** / **CustomSignal** — signal configuration

### Infrastructure
- **AgentApiKey** — v2 API bearer tokens
- **ServiceApiKey** — user-stored API keys for external services
- **ExternalApiKey** — external API keys (LLM, etc.)
- **Webhook** / **WebhookLog** — webhook management + logs
- **Document** — drive documents
- **IntegrationAccount** — connected services (Google, etc.)
- **NotificationRule** — notification preferences
- **AgentCapability** — registered agent capabilities
- **CapabilityUsageLog** — capability usage tracking
- **RelayTemplate** — relay message templates
- **AgentBrief** — generated intelligence briefs
- **AgentExtension** — custom agent extensions
- **ActivityLog** — system activity log
- **TelemetryEvent** — request/error telemetry
- **Feedback** — user feedback

---

## 6. API Architecture

### Session-based APIs (`/api/*`)
Authenticated via NextAuth session (cookie-based). Used by the dashboard UI.

**Chat**: `/api/chat/send` (POST, SSE streaming), `/api/chat/messages` (GET), `/api/chat/mentions` (GET)

**Queue**: `/api/queue` (GET/POST), `/api/queue/[id]` (GET/PATCH/DELETE), `/api/queue/confirm` (POST), `/api/queue/dispatch` (POST), `/api/queue/[id]/optimize` (POST)

**Kanban**: `/api/kanban` (GET/POST), `/api/kanban/[id]` (GET/PATCH/DELETE), `/api/kanban/[id]/checklist`, `/api/kanban/[id]/move`, `/api/kanban/merge`

**Contacts/CRM**: `/api/contacts` (GET/POST), `/api/contacts/[id]` (GET/PATCH/DELETE), `/api/contacts/[id]/activity`, `/api/contacts/[id]/relationships`, `/api/contacts/[id]/research`, `/api/contacts/[id]/cards`

**Email**: `/api/emails` (GET/POST), `/api/emails/[id]`

**Calendar**: `/api/calendar` (GET/POST), `/api/calendar/[id]`

**Teams**: `/api/teams` (GET/POST), `/api/teams/[id]` (GET/PATCH/DELETE), `/api/teams/[id]/members`, `/api/teams/[id]/projects`, `/api/teams/[id]/invites`, `/api/teams/[id]/agent`, `/api/teams/[id]/follow`, `/api/teams/[id]/subscription`, `/api/teams/invite/[token]`

**Projects**: `/api/projects` (GET/POST), `/api/projects/[id]` (GET/PATCH/DELETE), `/api/projects/[id]/members`, `/api/projects/[id]/invite`, `/api/projects/[id]/context`

**Goals**: `/api/goals` (GET/POST), `/api/goals/[id]` (GET/PATCH/DELETE)

**Connections**: `/api/connections` (GET/POST), `/api/connections/[id]`

**Relays**: `/api/relays` (GET/POST), `/api/relays/[id]`, `/api/relays/counts`

**Marketplace**: `/api/marketplace` (GET/POST), `/api/marketplace/[id]` (GET/PATCH/DELETE), `/api/marketplace/[id]/execute`, `/api/marketplace/[id]/install`, `/api/marketplace/[id]/rate`, `/api/marketplace/[id]/subscribe`, `/api/marketplace/earnings`, `/api/marketplace/fee-info`

**Jobs**: `/api/jobs` (GET/POST), `/api/jobs/[id]` (GET/PATCH), `/api/jobs/[id]/apply`, `/api/jobs/[id]/hire`, `/api/jobs/[id]/complete`, `/api/jobs/[id]/review`, `/api/jobs/earnings`, `/api/jobs/match`

**Memory/Learning**: `/api/memory` (GET/POST), `/api/memory/[id]`, `/api/learnings` (GET/POST), `/api/learnings/analyze`

**Other**: `/api/settings`, `/api/profile`, `/api/notifications`, `/api/briefs`, `/api/documents`, `/api/recordings`, `/api/capabilities`, `/api/extensions`, `/api/integrations`, `/api/signals`, `/api/behavior-signals`, `/api/search`, `/api/now`, `/api/activity`, `/api/feedback`, `/api/webhooks-management`, `/api/entity-resolve`, `/api/discover`, `/api/directory`, `/api/comms`, `/api/contracts`, `/api/earnings`

**Stripe**: `/api/stripe/webhooks`, `/api/stripe/status`, `/api/stripe/payment-methods`, `/api/stripe/connect/*`

**Auth**: `/api/auth/[...nextauth]`, `/api/auth/login`, `/api/auth/google-connect`, `/api/signup`, `/api/setup`

**Onboarding**: `/api/onboarding/init`, `/api/onboarding/advance`, `/api/onboarding/phase`, `/api/onboarding/task`

### Bearer Token APIs (`/api/v2/*`)
Authenticated via `Authorization: Bearer <AgentApiKey>`. For external agent/automation access.

- `/api/v2/queue` (GET/POST), `/api/v2/queue/[id]` (GET/PATCH/DELETE), `/api/v2/queue/[id]/status`, `/api/v2/queue/[id]/confirm`, `/api/v2/queue/[id]/result`
- `/api/v2/contacts` (GET/POST), `/api/v2/contacts/[id]` (GET/PATCH/DELETE)
- `/api/v2/kanban` (GET/POST), `/api/v2/kanban/[id]` (GET/PATCH/DELETE)
- `/api/v2/settings` (GET/PATCH)
- `/api/v2/keys` (GET/POST)
- `/api/v2/docs` — OpenAPI/Swagger spec
- `/api/v2/updates` — programmatic updates feed
- `/api/v2/shared-chat/*` — shared chat endpoints
- `/api/v2/network/discover`

### Federation APIs (`/api/federation/*` and `/api/v2/federation/*`)
- `/api/federation/connect`, `/api/federation/relay`, `/api/federation/config`
- `/api/federation/instances`, `/api/federation/briefing`, `/api/federation/graph`
- `/api/federation/jobs`, `/api/federation/mcp`, `/api/federation/patterns`
- `/api/federation/reputation`, `/api/federation/routing`, `/api/federation/entity-search`
- `/api/v2/federation/register`, `/api/v2/federation/heartbeat`, `/api/v2/federation/agents`, `/api/v2/federation/marketplace-link`, `/api/v2/federation/validate-payment`

### Well-Known
- `/.well-known/agent-card.json` — A2A agent card
- `/.well-known/mcp/server-card.json` — MCP server card
- `/.well-known/oauth-protected-resource` — OAuth resource descriptor

### Webhooks (inbound)
- `/api/webhooks/email`, `/api/webhooks/calendar`, `/api/webhooks/generic`, `/api/webhooks/transcript`

---

## 7. Core Systems Deep Dive

### 7.1 The Divi AI Agent

**Chat flow** (`/api/chat/send`):
1. User sends message → API builds system prompt via `buildSystemPrompt()` (1844-line prompt builder)
2. System prompt is assembled from ~13 logical groups, conditionally included based on message relevance scoring
3. LLM streams response via SSE using Anthropic Claude (`src/lib/llm.ts`)
4. Response is parsed for **action tags** (e.g., `[[create_card:{...}]]`)
5. Action tags are executed server-side (`src/lib/action-tags.ts`, 2495 lines, 50+ tags)
6. Both messages saved to `ChatMessage` table

**Action tags** (50+): `create_card`, `update_card`, `dispatch_queue`, `send_email`, `create_event`, `relay_request`, `relay_broadcast`, `relay_ambient`, `confirm_queue_item`, `remove_queue_item`, `edit_queue_item`, `install_agent`, `entity_resolve`, `task_route`, `assemble_brief`, `post_job`, `generate_meeting_notes`, `show_settings_widget`, and many more.

### 7.2 Queue & Confirmation Gate

- All tasks enter queue as `pending_confirmation` by default
- User must approve (✓) or reject (✕) before execution
- `User.queueAutoApprove` bypasses this (default: false)
- Chat-based control: Divi can confirm/remove/edit queue items from conversation
- Smart Task Prompter v2: on edit, re-optimizes task wording for the target agent's Integration Kit

### 7.3 Chief of Staff (CoS) Mode

`src/lib/cos-sequential-dispatch.ts` — proactive execution engine:
1. Picks highest-priority `ready` queue item
2. Determines strategy: **Capability** (email, meetings) → **Agent Relay** (connected agents) → **Project Contributor** (team members) → **Generic** (Divi direct)
3. Executes the action
4. Logs activity, advances to next task
5. Stores execution metadata in `cosExecution` JSON on queue item

### 7.4 NOW Engine

`src/lib/now-engine.ts` — scores and ranks items for the NOW panel:
- Factors: deadline proximity, goal impact, calendar awareness, relay urgency
- Returns unified ranked list of "what to do right now"
- Inputs: queue items, goals, kanban cards, calendar events, relays

### 7.5 Teams Architecture

- **Team** model has `originInstanceUrl` and `isSelfHosted`
- Self-hosted teams (`isSelfHosted: true`) bypass ALL subscription/billing gates
- Platform teams require `TeamSubscription` for premium features
- **TeamInvite**: token-based, supports email + role + expiry + message
- **Team→Project sync** (`team-project-sync.ts`): when a team is assigned to a project, all team members auto-sync to `ProjectMember`
- **Billing boundary**: follows team origin, not member origin. A platform user in a self-hosted team inherits the team's free billing.

### 7.6 Federation Protocol

DiviDen instances discover and connect to each other:
- **Connection** model with `isFederated` flag and `federationToken`
- **AgentRelay** for agent-to-agent messages (task delegation, ambient signals)
- **InstanceRegistry** for known instances
- **FederationConfig** for instance-level settings (allowInbound, etc.)
- **x-federation-token** header auth for inter-instance API calls
- Federation subsystem: `src/lib/federation/` (composite prompts, graph matching, pattern sharing, task routing)

### 7.7 Marketplace

- **MarketplaceAgent** — published agents with Integration Kits (taskTypes, requiredInputSchema, contextInstructions, usageExamples)
- Pricing models: `free`, `per_task`, `tiered`, `dynamic`
- Platform takes configurable fee (`MARKETPLACE_FEE_PERCENT` env var)
- Stripe Connect for developer payouts
- Install/uninstall agents into Divi's active toolkit via action tags

### 7.8 Onboarding

- Chat-first: Divi guides through setup phases (API key → settings → email → signals → webhooks → done)
- Phase stored in `User.onboardingPhase` (0-6)
- **Auto-heal**: Dashboard detects stuck users with real data and auto-completes onboarding
- No blocking empty states — QueuePanel and NowPanel always show real data
- Interactive in-chat widgets for settings adjustment (`OnboardingChatWidgets.tsx`, `AgentWidget.tsx`)

### 7.9 Signal System

- **SignalConfig** / **CustomSignal** — configurable signal sources
- **BehaviorSignal** — tracked user behaviors
- Google calendar/email sync via `google-sync.ts`
- Webhook inbound signals (email, calendar, generic, transcript)

---

## 8. Environment Variables

All in `nextjs_space/.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |
| `ABACUSAI_API_KEY` | Abacus AI platform key (LLM proxy) |
| `ADMIN_PASSWORD` | Admin panel password |
| `WEB_APP_ID` | Abacus web app identifier |
| `NOTIF_ID_CONNECTION_INVITATION` | Notification type ID |
| `MARKETPLACE_FEE_PERCENT` | Platform marketplace fee % |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `AWS_PROFILE` | AWS credentials profile |
| `AWS_REGION` | S3 region |
| `AWS_BUCKET_NAME` | S3 bucket |
| `AWS_FOLDER_PREFIX` | S3 key prefix |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GEMINI_API_KEY` | Google Gemini API key |

**Note**: `NEXTAUTH_URL` is auto-configured by Abacus AI per environment. Never set manually.

---

## 9. Landing Page Structure

`src/components/landing/LandingPage.tsx` sections (top to bottom):
1. **Navbar** — logo, nav links, login/signup buttons
2. **Hero** — typing effect headline, subtitle, CTA
3. **HowItWorks** — animated 5-step loop flowchart (Step 1 feeds loop of 2→3→4→5→2)
4. **Problem / Solution** — side-by-side comparison
5. **Features Grid** — core + expandable power features
6. **Agent Marketplace** — developer/buyer split, stats
7. **Protocol Stack** — accordion of technical capabilities
8. **Open Core Banner** — MIT license, self-hosting pitch
9. **Final CTA** — signup call to action
10. **Footer** — links, legal

---

## 10. Dashboard Layout

`src/app/dashboard/page.tsx` orchestrates a 3-panel layout:

| Panel | Component | Content |
|-------|-----------|----------|
| Left sidebar | `QueuePanel` | Task queue with status sections, confirmation buttons |
| Center | `CenterPanel` | Tab switcher → Chat, Kanban, CRM, Calendar, Inbox, CoS, Teams, Marketplace, Jobs, Goals, Capabilities, Federation, Extensions, Memory, Drive, Recordings, Discover, Comms, Feedback |
| Right sidebar | `NowPanel` | Ranked NOW items, focus suggestion, quick actions |

Mobile: collapsible sidebar with tab navigation.

---

## 11. Updates Wall

`src/lib/updates.ts` — array of `Update` objects in reverse chronological order. Each entry has:
- `id` (kebab-case slug)
- `date` (ISO), `time` (display string)
- `title`, `subtitle`, `tags[]`
- `content` (markdown-ish, rendered by `UpdatesPage.tsx`)

Written in **founder voice** (casual, technical, signed "— Jon"). Currently 20+ entries.

Rendered at `/updates` page and latest entry shown on landing page.

---

## 12. Release Notes

`src/app/docs/release-notes/page.tsx` — versioned entries, newest first.

Current versions:
- **v1.4.0** (LATEST) — Teams Architecture, CoS Project Delegation, Invite Flow, Open-Source Billing Boundary
- **v1.3.0** — Queue Confirmation Gate, CoS Execution, Chat Queue Control, Smart Prompter v2, Onboarding Auto-Heal
- **v1.2.0** — Federation pricing, admin marketplace expansion
- Earlier versions...

Badge styling:
- LATEST: `bg-green-500/10 text-green-400 border-green-500/20`
- Demoted: `opacity-80` on wrapper, `bg-white/[0.04] text-[var(--text-muted)]` badge
- Tags: `bg-brand-500/10 text-brand-400 border-brand-500/20`

---

## 13. Developer Docs

`src/app/docs/developers/page.tsx` — comprehensive API reference with:
- Custom `<Section>`, `<Endpoint>`, `<InlineCode>`, `<Code>` components defined inline
- Nav sidebar with section links
- Sections: Authentication, Agent API Keys, Queue, Kanban, Contacts, Calendar, Email, Memory, Goals, Capabilities, Marketplace, Settings API, **Teams & Project Delegation** (NEW in v1.4.0), Behavior Signals, CoS Engine, Rate Limits

The Teams section includes:
- Schema documentation
- 14 API endpoint entries
- CoS Project Delegation explanation
- Billing Boundary visual
- Open-Source Implementation Guide (7-step)

---

## 14. Git Workflow

**Branch strategy**: Work happens on detached HEAD (Abacus checkpoint system). Periodically merge to `main` and push.

**Current state** (as of v1.4.0):
- `main` branch at `17d0f50` (pushed to origin)
- Working HEAD at `4f1faaf` (or later checkpoint commit)
- 281 total commits

**Merge process**:
1. `git fetch origin main`
2. Note current HEAD: `git rev-parse HEAD`
3. `git checkout main`
4. `git merge <HEAD_COMMIT> --no-ff -m "v1.X.0: description"`
5. Resolve conflicts with `git checkout --theirs <file>` (detached HEAD is authoritative)
6. **CRITICAL**: `git checkout HEAD -- .abacus.donotdelete` (must run from project root, not nextjs_space)
7. Verify no secrets: `git diff origin/main..HEAD | grep -iE "password|secret|api_key|DATABASE_URL"`
8. `git push origin main`
9. Return to working state: `git checkout <HEAD_COMMIT>`

**Common conflict files**: `.abacus.donotdelete`, `schema.prisma`, `seed.ts`, admin/marketplace components.

---

## 15. Build & Deploy

**Build command** (handled by Abacus):
```bash
NODE_OPTIONS="--max-old-space-size=10240" yarn run build
```

**Key build notes**:
- Output: standalone mode (`NEXT_OUTPUT_MODE=standalone`)
- TSC can OOM on large builds — skip `test_nextjs_project` if needed, use `build_and_save_nextjs_project_checkpoint` directly
- `images: { unoptimized: true }` in next.config.js
- ESLint ignored during builds
- TypeScript errors NOT ignored (strict type checking)

**Deployment**: Both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` are untagged. A single `deploy_nextjs_project` call updates both.

---

## 16. Seed Script

`scripts/seed.ts` — uses **upsert** (never delete) to populate:
- Default users
- Notification rules
- Marketplace agents (including AmbientSurveys with Integration Kit)

**CRITICAL**: Always modify existing seed.ts, never create new. Never add delete commands (production data risk).

---

## 17. Key Conventions

### Code Patterns
- All API routes use `getServerSession(authOptions)` for session auth
- v2 routes use `authenticateAgent(req)` from `api-auth.ts` for Bearer token auth
- `export const dynamic = 'force-dynamic'` on any route reading `NEXTAUTH_URL`
- Prisma singleton at `src/lib/prisma.ts` with telemetry batching
- Activity logging: `logActivity({ userId, action, actor, summary })`
- All monetary operations go through Stripe (never direct)

### Writing Style
- Updates wall: founder voice, casual but technical, signed "— Jon"
- Docs: precise, technical, comprehensive
- UI: clean, minimal, generous whitespace, dark theme

### Database Rules
- Shared between dev and production — be careful with mutations
- Compatible schema changes only — never `--accept-data-loss` without user consent
- Use upsert to avoid duplicates in seed
- Short idle timeout, max 25 concurrent connections

---

## 18. What's Been Built (Cumulative)

1. **Full AI agent** (Divi) with 50+ action tags, dynamic system prompt, SSE streaming
2. **Queue management** with confirmation gate, CoS execution, smart task optimization
3. **Kanban board** with drag-and-drop, checklists, artifact linking, card merging
4. **CRM** with contact enrichment, relationships, activity timelines
5. **Calendar + Email** sync via Google OAuth
6. **Teams** with invites, project sync, billing boundary, open-source support
7. **Projects** with member management, context sharing, team ownership
8. **Goals** with progress tracking and NOW engine integration
9. **Agent Marketplace** with Integration Kits, pricing tiers, Stripe Connect payouts
10. **Federation** protocol for instance-to-instance agent communication
11. **Network Job Board** with matching, contracts, reviews, reputation
12. **Memory system** with approval workflow and pattern detection
13. **Behavior signals** and ambient learning
14. **Webhook management** with pattern learning
15. **Drive** (document storage via S3)
16. **Recording management** with AI meeting notes (Gemini)
17. **Global search** across all surfaces
18. **Admin panel** with stats, telemetry, system prompt editor, marketplace management
19. **Landing page** with animated flowchart, feature grid, marketplace section
20. **Documentation** suite (developers, federation, integrations, release notes)
21. **Updates wall** with founder-voice changelog
22. **PWA support** with service worker and standalone mode
23. **Notification system** with real-time feed and rules
24. **Agent extensions** and capability marketplace
25. **Onboarding** chat-first flow with auto-heal for stuck users

---

## 19. What's Next (Roadmap Context)

Based on the trajectory of development:
- Federation protocol hardening (cross-instance team sync)
- Agent marketplace monetization refinement
- Mobile PWA polish
- Advanced CoS strategies (multi-step orchestration)
- Team analytics and reporting
- Billing dashboard for team admins

---

## 20. Critical Warnings

1. **Never modify `.abacus.donotdelete`** — system-maintained, devastating consequences
2. **Never use npm/npx** — yarn only
3. **Never `--accept-data-loss`** on Prisma without explicit user consent
4. **Never set `NEXTAUTH_URL` manually** — auto-configured per environment
5. **Seed script**: modify existing, never recreate. No deletes.
6. **Git**: detached HEAD is normal. Merge to main periodically. Always verify no secrets before push.
7. **Build OOM**: TSC can run out of memory on large builds. Use `--max-old-space-size=10240`.
8. **Database**: shared dev/prod — mutations affect live users.
9. **The system prompt is 1844 lines** — changes here affect all Divi behavior. Be surgical.
10. **Action tags are 2495 lines** — the core action execution engine. Test changes carefully.
