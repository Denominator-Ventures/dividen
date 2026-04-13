# DiviDen Command Center — Project Bible

> **Last updated:** April 13, 2026 · **Platform version:** v1.2.0 · **License:** MIT (Denominator Ventures)

This document is designed to give a new developer (or a new AI agent conversation) full context to continue working on the DiviDen Command Center.

---

## 1. What Is DiviDen?

DiviDen is an **AI-first command center for solo operators and micro-teams**. Think of it as a personal operating system that combines:

- An AI executive assistant ("Divi") with deep system context
- Task queue, calendar, email, CRM, kanban, document management
- A **federated agent marketplace** — discover, install, and transact with AI agents across a peer network
- A **capabilities marketplace** — skill packs that extend what Divi can do
- Federation protocol (A2A + MCP) for agent-to-agent communication across instances

**Philosophy:** Individual-first. Opencore. No goal inference — Divi executes what you tell it. Strong admin control, clean abstractions, builder-log tone.

**Founder:** Jon (also lead developer). **Team:** Fractional Venture Partners (FVP), led by Alvaro. FVP's agent is called "mAIn".

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (credentials + Google OAuth) |
| AI/LLM | Abacus.AI API (OpenAI-compatible), Anthropic |
| Payments | Stripe (Connect + direct charges) |
| Storage | AWS S3 (cloud storage) |
| Notifications | Abacus.AI notification API |
| Package Manager | **yarn only** — never npm or npx |
| Hosting | Abacus.AI (deployed at dividen.ai + sdfgasgfdsgsdg.abacusai.app) |
| Repo | github.com/Denominator-Ventures/dividen (MIT) |

---

## 3. Project Structure

```
dividen_command_center/
├── .env.example              # Template — real .env is gitignored
├── .gitignore
├── LICENSE                    # MIT
├── PROJECT_BIBLE.md           # ← This file
├── nextjs_space/
│   ├── prisma/
│   │   └── schema.prisma      # ~67 models
│   ├── scripts/
│   │   └── seed.ts            # Upserts test user, admin, 36 capabilities
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout (SessionProvider, fonts, PWA)
│   │   │   ├── providers.tsx   # SessionProvider wrapper
│   │   │   ├── globals.css     # Tailwind + PWA standalone fixes
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── login/          # Login page
│   │   │   ├── setup/          # Account creation + ToS
│   │   │   ├── dashboard/      # Main app (page.tsx + comms/)
│   │   │   ├── admin/          # Admin panel
│   │   │   ├── settings/       # User settings
│   │   │   ├── docs/           # Developer docs, federation docs, release notes
│   │   │   ├── documentation/  # User-facing docs hub
│   │   │   ├── profile/[userId]/ # Public user profiles
│   │   │   ├── team/[id]/      # Team pages
│   │   │   ├── terms/          # Terms of Service
│   │   │   ├── privacy/        # Privacy Policy
│   │   │   ├── open-source/    # Open-source page
│   │   │   ├── updates/        # Updates page
│   │   │   └── api/            # All API routes (see §5)
│   │   ├── components/
│   │   │   ├── admin/          # Admin tabs (MarketplaceTab, InstancesTab, etc.)
│   │   │   └── dashboard/      # All dashboard views (30+ components)
│   │   ├── lib/                # Utilities, configs, services (see §6)
│   │   └── types/              # Shared TypeScript types
│   ├── public/                 # Static assets
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── tsconfig.json
```

---

## 4. Database Models (Key Ones)

Full schema in `prisma/schema.prisma` (~67 models). Key models:

| Model | Purpose |
|---|---|
| `User` | Accounts with email/password auth, role (user/admin), mode (cockpit/cos) |
| `QueueItem` | Task queue entries with priority, status, metadata |
| `ChatMessage` | User ↔ Divi conversations |
| `AgentMessage` / `CommsMessage` | A2A comms between agents |
| `Contact` / `ContactRelationship` | CRM contacts + relationship graph |
| `KanbanCard` / `ChecklistItem` | Kanban board with checklists |
| `CalendarEvent` | Synced from Google Calendar (multi-account) |
| `EmailMessage` | Synced from Gmail (multi-account) |
| `Document` | Synced from Google Drive |
| `MemoryItem` | Agent memory (auto-learned + user-pinned) |
| `InstanceRegistry` | Federated peer instances |
| `FederationConfig` | This instance's federation identity |
| `MarketplaceAgent` | Agents listed in the marketplace (local + federated) |
| `MarketplaceSubscription` | User subscriptions to agents |
| `MarketplaceExecution` | Agent execution records (with two-phase pricing fields) |
| `MarketplaceCapability` | Skill packs (system-seeded + user-created) |
| `UserCapability` | Installed capabilities per user |
| `Team` / `TeamMember` | Team/org structure |
| `NetworkJob` / `JobContract` | Job board & recruiting |
| `AgentApiKey` | Per-user LLM API keys |
| `IntegrationAccount` | Google OAuth tokens (multi-account) |
| `Connection` / `Invitation` | User-to-user connections |
| `Webhook` / `WebhookLog` | Inbound webhooks with learning |
| `TelemetryEvent` | Request/error telemetry |
| `BehaviorSignal` | User behavior signals for ambient learning |

**DB rules:**
- Shared between dev and production — be careful with writes
- Never use `prisma db push --accept-data-loss`
- Always use compatible schema migrations
- Seed script: `scripts/seed.ts` — uses upsert, no deletes

---

## 5. API Routes

### Authentication
- `POST /api/auth/login` — Credentials login
- `POST /api/signup` — User registration
- `POST /api/setup` — First-time account setup
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/auth/google-connect` — Google OAuth data access (not SSO)

### Core Dashboard
- `/api/queue` — Task queue CRUD
- `/api/chat/send` + `/api/chat/messages` — Divi conversation
- `/api/calendar` — Calendar events
- `/api/emails` — Email messages
- `/api/contacts` — CRM contacts + research + activity + relationships
- `/api/kanban` — Kanban board + checklists
- `/api/documents` — Google Drive documents
- `/api/briefs` — Agent briefings
- `/api/memory` — Agent memory CRUD
- `/api/comms` — Agent-to-agent communications
- `/api/notifications` — Notification rules + feed
- `/api/connections` — User connections + invitations
- `/api/settings` — User settings

### Marketplace
- `/api/marketplace` — Browse agents
- `/api/marketplace/[id]` — Agent detail
- `/api/marketplace/[id]/install` — Install agent
- `/api/marketplace/[id]/subscribe` — Subscribe to agent
- `/api/marketplace/[id]/execute` — Execute agent task
- `/api/marketplace/[id]/execute/[executionId]` — Approve/decline dynamic price quote
- `/api/marketplace/[id]/rate` — Rate agent
- `/api/marketplace-capabilities` — Capabilities CRUD
- `/api/marketplace-capabilities/[id]` — Capability detail + update
- `/api/marketplace/earnings` — Revenue dashboard
- `/api/marketplace/fee-info` — Platform fee info

### Federation v2 (`/api/v2/federation/`)
- `POST /register` — Instance registration (approval required)
- `POST /heartbeat` — Keep-alive + status sync
- `POST /agents` — Batch agent sync (full config)
- `GET /agents` — List synced agents
- `PUT /agents/[remoteId]` — Single agent register/update
- `GET /agents/[remoteId]` — Single agent detail
- `DELETE /agents/[remoteId]` — Remove agent
- `POST /validate-payment` — Cross-instance payment validation
- `POST /marketplace-link` — Marketplace linking

### Admin (`/api/admin/`)
- `/stats` — Dashboard stats (users, agents, revenue, etc.)
- `/instances` — Manage federated instances
- `/marketplace` — Manage marketplace agents
- `/capabilities` — Manage capabilities (approval flow)
- `/tasks` — View/manage queue items
- `/workflows` — Workflow patterns
- `/telemetry` — Request/error logs
- `/usage` — Usage analytics
- `/system-prompt` — View/edit system prompt
- `/federation-check` — Check federation health
- `/federation-activity` — Federation activity log

### Other
- `/api/v2/queue` — External queue API (for federated instances)
- `/api/v2/contacts` — External contacts API
- `/api/v2/kanban` — External kanban API
- `/api/v2/docs` — OpenAPI spec (Swagger)
- `/api/stripe/*` — Stripe Connect + payments
- `/api/webhooks/*` — Inbound webhooks (calendar, email, generic, transcript)
- `/api/teams/*` — Team management
- `/api/jobs/*` — Job board matching
- `/.well-known/agent-card.json` — A2A agent card
- `/.well-known/mcp/server-card.json` — MCP server card

---

## 6. Key Libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `prisma.ts` | Singleton PrismaClient with telemetry batching |
| `auth.ts` | NextAuth config (credentials + Google OAuth) |
| `llm.ts` | LLM provider management, streaming |
| `system-prompt.ts` | Dynamic system prompt builder (capabilities context, queue gating) |
| `action-tags.ts` | AI action tag parser + executor (dispatch_queue, suggest_marketplace, etc.) |
| `pricing-types.ts` | Pricing config types + resolvers (free, per_task, tiered, dynamic) |
| `marketplace-config.ts` | Marketplace fee calculator |
| `recruiting-config.ts` | Recruiting fee calculator |
| `queue-gate.ts` | Queue gating — checks if user has handler before dispatch |
| `queue-dispatch.ts` | Queue item dispatch logic |
| `queue-dedup.ts` | Queue deduplication |
| `stripe.ts` | Stripe client singleton |
| `s3.ts` | AWS S3 client + upload helpers |
| `google-oauth.ts` | Google OAuth helper |
| `google-sync.ts` | Google Calendar/Gmail/Drive sync |
| `now-engine.ts` | NOW panel scoring engine |
| `memory.ts` | Agent memory operations |
| `behavior-signals.ts` | Client-side behavior signal emission |
| `ambient-learning.ts` | Ambient learning from user patterns |
| `telemetry.ts` | Request/error logging |
| `entity-resolution.ts` | Cross-entity name/email resolution |
| `contact-platform-bridge.ts` | Auto-link contacts on signup |
| `feature-gates.ts` | Feature flag system |
| `rate-limit.ts` | API rate limiting |
| `federation/` | Federation sub-modules (composite prompts, graph matching, pattern sharing, task routing) |

---

## 7. Dashboard Components (`src/components/dashboard/`)

The main dashboard (`/dashboard`) is a multi-panel layout:

| Component | Purpose |
|---|---|
| `CenterPanel.tsx` | Tab switcher (Email, CRM, Calendar, Drive, Kanban, Marketplace, Capabilities, etc.) |
| `ChatView.tsx` | Divi chat interface with widget rendering + dynamic pricing actions |
| `QueuePanel.tsx` | Task queue + Smart Task Assembly wizard + Comms tab |
| `NowPanel.tsx` | "What to do right now" scored list |
| `MarketplaceView.tsx` | Agent marketplace browser with pricing badges |
| `CapabilitiesMarketplace.tsx` | Capabilities browser + install + create |
| `CapabilitiesView.tsx` | Installed capabilities management |
| `CalendarView.tsx` | Multi-account calendar with filters |
| `InboxView.tsx` | Email view |
| `CrmView.tsx` | CRM contacts + detail modals |
| `KanbanView.tsx` | Kanban board |
| `DriveView.tsx` | Google Drive browser |
| `JobBoardView.tsx` | Job listings |
| `FederationIntelligenceView.tsx` | Federation network intelligence |
| `DiscoverView.tsx` | Discovery/explore view |
| `ConnectionsView.tsx` | User connections |
| `MemoryPanel.tsx` | Agent memory viewer |
| `AgentWidget.tsx` | Renders interactive widgets from agent responses |
| `GlobalSearch.tsx` | Cross-entity search |
| `KeyboardNav.tsx` | Keyboard navigation handler |
| `ActivityStream.tsx` | Activity timeline |
| `NotificationCenter.tsx` | Notification feed |

---

## 8. Admin Panel (`/admin`)

Protected by Bearer auth (`ADMIN_PASSWORD` env var). Components in `src/components/admin/`:

| Tab | Component | Purpose |
|---|---|---|
| Instances | `InstancesTab.tsx` | Manage federated instances (approve/deactivate, key reset) |
| Marketplace | `MarketplaceTab.tsx` | 4 sub-tabs: Agents, Capabilities, +Capability, +Agent |
| Tasks | `TasksTab.tsx` | View/manage queue items across users |
| Usage | `UsageTab.tsx` | Usage analytics |
| System Prompt | `SystemPromptTab.tsx` | View/edit Divi's system prompt |

Admin APIs use Bearer token auth (not session auth).

---

## 9. Federation Protocol

DiviDen instances communicate via a federation protocol:

- **Registration:** Instance registers at `/api/v2/federation/register` → admin approves → status: active
- **Heartbeat:** Periodic `/api/v2/federation/heartbeat` to maintain presence
- **Agent Sync:** Instances push agent catalogs via `/api/v2/federation/agents`
- **A2A:** Agent-to-agent messaging via `/api/a2a` (Google A2A protocol)
- **MCP:** Tool sharing via `/.well-known/mcp/server-card.json`
- **Agent Card:** Discovery via `/.well-known/agent-card.json`

**Key entities:**
- `InstanceRegistry` — peer instances with trust level, capabilities, marketplace/discovery/updates flags
- `FederationConfig` — this instance's identity (name, URL, capabilities, system prompt)
- `MarketplaceAgent` — agents from self or federated instances

**FVP Instance:** Fractional Venture Partners at `cc.fractionalventure.partners`, instance ID `cmnxbbnwq00lcnq08bawmkqgb`. Currently has marketplace/discovery/updates enabled.

---

## 10. Pricing System

Four pricing models for marketplace agents:

1. **Free** — no charge
2. **Per-task** — flat rate per execution
3. **Tiered** — volume-based (cumulative task count determines rate)
4. **Dynamic** — agent quotes a price mid-execution, user approves/declines

**Two-phase execution flow (dynamic):**
1. User triggers execution → agent returns `price_quote` in response
2. Checkout widget rendered in chat with approve/decline buttons
3. `POST /api/marketplace/:id/execute/:executionId` with `action: approve/decline`
4. Approve → Stripe charge → revenue update. Decline → no charge.

**Fee structure:**
- Internal (same-instance): configurable, can be 0%
- Network (cross-instance): enforced minimums — 3% marketplace, 7% recruiting
- Config in `marketplace-config.ts` and `recruiting-config.ts`

**Key file:** `src/lib/pricing-types.ts` — `PricingConfig`, `PricingTier`, `parsePricingConfig`, `serializePricingConfig`, `resolveExecutionPrice`

---

## 11. Capabilities System

"Capabilities" are skill packs that extend Divi's behavior:

- 36 pre-seeded (20 general + 8 Agent Skills + 8 from prior batches)
- Users can create custom capabilities (subject to admin approval)
- Each capability has a prompt template with editable fields
- On install, resolved prompt is injected into Divi's system context
- Integration-gated: capabilities tied to an integration require it to be connected
- Queue gating: if a task has no handler, Divi suggests marketplace capabilities

**Models:** `MarketplaceCapability` + `UserCapability`
**API:** `/api/marketplace-capabilities` (browse, install, create, update, uninstall)
**Admin:** `/api/admin/capabilities` (approval flow, CRUD)

---

## 12. Visual Design

- **Theme:** Dark with glass-morphism effects
- **Brand color:** Blue (`#4f7cff`, Tailwind `brand-500`)
- **Fonts:** Space Grotesk (headings), JetBrains Mono (code)
- **Surface:** `bg-white/[0.02]` with `border-white/[0.06]`
- **Text:** `var(--text-primary)` (white), `var(--text-secondary)` (muted gray)
- **Status badges:** Emerald (active/approved), Amber (pending), Red (rejected), Gray (disabled)
- **Pricing badges:** Emerald (free), Amber (per_task), Purple (subscription), Blue (tiered), Pink (dynamic)

---

## 13. Environment Variables

See `.env.example` for full list. Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session encryption |
| `ADMIN_PASSWORD` | Admin panel auth |
| `ABACUSAI_API_KEY` | LLM API access |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Payments |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google data access OAuth |
| `MARKETPLACE_FEE_PERCENT` | Internal marketplace fee |
| `RECRUITING_FEE_PERCENT` | Internal recruiting fee |
| `WEB_APP_ID` / `NOTIF_ID_*` | Notification IDs |
| `S3_BUCKET_NAME` / `S3_REGION` | Cloud storage |

**Note:** `NEXTAUTH_URL` is auto-configured by the hosting platform. Don't set it manually.

---

## 14. Build & Development Notes

### Running locally
```bash
cd nextjs_space
cp .env.example .env   # Fill in values
yarn install
yarn prisma generate
yarn prisma db push
yarn dev
```

### Seeding
```bash
cd nextjs_space
export DATABASE_URL="your-connection-string"
yarn ts-node scripts/seed.ts
```

### Known quirks
- **TSC OOM:** TypeScript compiler can run out of memory on this codebase. If `test_nextjs_project` fails with OOM, go straight to `build_and_save_nextjs_project_checkpoint`.
- **Detached HEAD:** The Abacus.AI hosting uses detached HEAD. Push with `git push origin HEAD:main`.
- **Prisma "already in sync":** DB sometimes has fields from prior sessions even when `schema.prisma` didn't list them. Always run `prisma db push` after schema changes.
- **Admin auth:** Admin API routes use Bearer token (`Authorization: Bearer <ADMIN_PASSWORD>`), not session auth.
- **`force-dynamic`:** Any file reading `process.env.NEXTAUTH_URL` must have `export const dynamic = 'force-dynamic'`.

---

## 15. Deployment

- **Hosted on:** Abacus.AI platform
- **Domains:** `dividen.ai` (primary) + `sdfgasgfdsgsdg.abacusai.app` (staging)
- **Both are untagged** — a single deploy updates both
- **Process:** Checkpoint → Deploy via UI or `deploy_nextjs_project` tool
- **DB is shared** between dev preview and production

---

## 16. Git & GitHub

- **Remote:** `github.com/Denominator-Ventures/dividen`
- **Branch:** `main`
- **License:** MIT (Denominator Ventures)
- **Gitignored:** `.env`, `.env.local`, `node_modules`, `.next`, `.build`, `.deploy`
- **Sensitive data audit:** No secrets in tracked files. Seed script reads `ADMIN_PASSWORD` from env.

---

## 17. Current Platform Version: v1.2.0

### What shipped in v1.2.0 (latest)
- Tiered & dynamic pricing models
- Two-phase quote approval flow
- Federation agent sync with full config (pricing, integration kit, display, protocol flags)
- Single agent register/update/delete endpoints
- Admin marketplace rewrite (4 sub-tabs, publisher attribution, approval flow)
- 8 Agent Skills capabilities seeded
- Smart Task Assembly wizard
- Inbox → Email rename
- Settings loading resilience
- Network Auto-Connect
- Marketplace UI pricing badges (tiered, dynamic)
- ChatView widget action handler for dynamic pricing
- OpenAPI spec updated

### What shipped in v1.1.0
- Capabilities Marketplace (20 capabilities, browse/install/create)
- Queue Gating system
- Integration-gated installs
- Marketplace suggestion cards in chat
- Admin instance key reset
- Agent card resilience

### What shipped in v1.0.x (prior)
- Federation v2 (instance approval, multi-account sync, admin expansion)
- Two-tier fee model + payment validation
- Multi-account Google sync (Calendar, Drive, Gmail)
- CRM with contact detail modals, relationships, activity timelines
- Kanban with drag-scroll, checklists
- A2A protocol, MCP server card
- Agent Widget system
- PWA standalone mode fixes
- Terms of Service + Privacy Policy
- Telemetry + behavior signals
- Ambient learning system

---

## 18. How to Continue in a New Conversation

When starting a new Abacus AI Agent conversation on this project:

1. **Project path:** `/home/ubuntu/dividen_command_center`
2. **Paste this file** as upfront context (or reference it)
3. **Key constraints to state upfront:**
   - yarn only, no npm/npx
   - DB is shared dev/prod — never `--accept-data-loss`
   - TSC may OOM — skip `test_nextjs_project`, go to `build_and_save_nextjs_project_checkpoint`
   - Admin uses Bearer auth, not session auth
   - Deployed at dividen.ai and sdfgasgfdsgsdg.abacusai.app (both untagged)
4. **Tone:** Builder-log, direct, no fluff. Jon prefers individual-first philosophy, "opencore" positioning, strong admin control, clean abstractions.
