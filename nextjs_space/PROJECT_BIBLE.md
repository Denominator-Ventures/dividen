# DiviDen Command Center — Project Bible

**Last updated:** April 13, 2026  
**Author:** Build session handoff document  
**Purpose:** Everything a new Deep Agent conversation needs to continue this project effectively.

---

## Table of Contents

1. [What DiviDen Is](#what-dividen-is)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema (60 Models)](#database-schema)
6. [AI Agent System (Divi)](#ai-agent-system)
7. [Dashboard Layout](#dashboard-layout)
8. [Authentication & Authorization](#authentication)
9. [Google OAuth Integration](#google-oauth)
10. [Integrations & Signals](#integrations-signals)
11. [Capabilities System](#capabilities-system)
12. [Smart Triage & Task-First Architecture](#smart-triage)
13. [Connections & Federation](#connections-federation)
14. [Marketplace & Payments](#marketplace-payments)
15. [Jobs → Paying Tasks](#paying-tasks)
16. [Admin Dashboard](#admin-dashboard)
17. [Protocol Versions (MCP, A2A, Agent Card)](#protocol-versions)
18. [Settings Page](#settings-page)
19. [Landing Page & Public Pages](#landing-page)
20. [Environment Variables](#environment-variables)
21. [Deployment](#deployment)
22. [Known Constraints & Gotchas](#gotchas)
23. [Credentials](#credentials)
24. [Open Source Site (os.dividen.ai)](#open-source-site)
25. [Style & Design System](#design-system)
26. [Feature Inventory (Complete)](#feature-inventory)
27. [Audit Documents](#audit-documents)

---

## 1. What DiviDen Is <a name="what-dividen-is"></a>

DiviDen is an **AI-powered workflow command center**. Think: an AI chief of staff that manages your email, calendar, CRM, task board, and professional network — all through natural conversation.

**Core philosophy:** Individual-first. It's a powerful tool for one person to manage their entire workflow. Teams and social features are secondary. The AI agent ("Divi") learns how you work, handles what it can, and surfaces only what needs you.

**Two deployment models:**
- **Managed platform** at `dividen.ai` — hosted, multi-tenant, includes network features
- **Self-hosted** (MIT license) — full codebase, documented at `os.dividen.ai`

**Founder:** Jon (Denominator Ventures). Thinks in product terms, builder-log tone, no fluff.

---

## 2. Architecture Overview <a name="architecture-overview"></a>

```
┌─────────────────────────────────────────────────┐
│                    Next.js 14 App               │
│              (App Router, Server Actions)        │
├─────────────┬──────────────┬────────────────────┤
│  Landing    │  Dashboard   │  Settings/Admin    │
│  (public)   │  (authed)    │  (authed)          │
├─────────────┴──────────────┴────────────────────┤
│                   API Layer                      │
│  /api/*  (NextAuth, CRUD, Chat, Federation)     │
│  /api/v2/* (Public APIs, Federation endpoints)  │
├─────────────────────────────────────────────────┤
│               Core Libraries                     │
│  system-prompt.ts · action-tags.ts · llm.ts     │
│  signals.ts · google-sync.ts · now-engine.ts    │
├─────────────────────────────────────────────────┤
│          PostgreSQL (Prisma ORM, 60 models)     │
│          S3 (profile photos, drive files)       │
│          Stripe Connect (payments)              │
└─────────────────────────────────────────────────┘
```

**Dashboard is a 3-column layout:**
- **Left:** NOW Panel (scored priority items, quick actions, earnings widget, activity stream)
- **Center:** Tabbed workspace (Chat, CRM, Calendar, Inbox, Recordings + network tabs)
- **Right:** Queue Panel (task queue + Comms tab)

**Two modes:** Cockpit (operator view) and Chief of Staff (observer view for a founder's right hand)

---

## 3. Tech Stack <a name="tech-stack"></a>

| Layer | Technology | Version |
|-------|-----------|--------|
| Framework | Next.js (App Router) | 14.2.28 |
| React | React | 18.2.0 |
| Language | TypeScript | 5.2.2 |
| Auth | NextAuth.js | 4.24.11 |
| Database | PostgreSQL via Prisma | 6.7.0 |
| Styling | Tailwind CSS | 3.3.3 |
| UI Components | Radix UI + shadcn/ui patterns | Various |
| State | Jotai, Zustand, SWR, TanStack Query | Various |
| Animation | Framer Motion | 10.18.0 |
| Charts | Recharts, Plotly.js | Various |
| Payments | Stripe + Stripe Connect | ^22.0.1 |
| Email | Nodemailer (SMTP) + Gmail API (Google) | ^8.0.5 |
| Google APIs | googleapis npm | ^171.4.0 |
| Cloud Storage | AWS S3 | @aws-sdk/client-s3 |
| LLM | Anthropic (Claude) via custom wrapper | BYOK |
| Package Manager | **yarn ONLY** (never npm/npx) | — |

**Fonts:** Space Grotesk (headings), Inter (body), JetBrains Mono (code)  
**Color palette:** Dark theme, brand blue `#4f7cff`, surfaces at `#0a0a0a` / `#111` / `#1a1a1a`

---

## 4. Project Structure <a name="project-structure"></a>

```
/home/ubuntu/dividen_command_center/
├── .project_instructions.md          ← Agent memory (design decisions, patterns)
├── nextjs_space/
│   ├── prisma/schema.prisma          ← 60 models, 1847 lines
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              ← Redirects to landing or dashboard
│   │   │   ├── layout.tsx            ← Root layout (providers, fonts, meta)
│   │   │   ├── globals.css           ← Global styles, PWA fixes
│   │   │   ├── providers.tsx         ← SessionProvider wrapper
│   │   │   ├── login/page.tsx
│   │   │   ├── setup/page.tsx
│   │   │   ├── dashboard/page.tsx     ← Main dashboard (3-column layout)
│   │   │   ├── settings/page.tsx     ← 6-tab settings page
│   │   │   ├── admin/page.tsx        ← 11-tab admin dashboard
│   │   │   ├── updates/page.tsx
│   │   │   ├── profile/[userId]/page.tsx
│   │   │   ├── team/[id]/page.tsx
│   │   │   ├── docs/                 ← Developer docs, federation, integrations
│   │   │   ├── api/                  ← ~100+ API routes
│   │   │   │   ├── auth/             ← NextAuth, Google OAuth, login, signup
│   │   │   │   ├── chat/             ← Chat messages, send (LLM)
│   │   │   │   ├── integrations/     ← Google/SMTP connect, sync, send
│   │   │   │   ├── v2/               ← Public APIs (federation, network)
│   │   │   │   ├── admin/            ← Admin endpoints (stats, tasks, etc.)
│   │   │   │   ├── stripe/           ← Stripe Connect, payments, webhooks
│   │   │   │   └── ...               ← CRM, calendar, queue, jobs, etc.
│   │   ├── components/
│   │   │   ├── landing/LandingPage.tsx
│   │   │   ├── dashboard/            ← 30+ dashboard components
│   │   │   ├── settings/             ← 11 settings components
│   │   │   ├── admin/                ← 6 admin tab components
│   │   │   └── updates/UpdatesPage.tsx
│   │   ├── lib/                      ← 40+ library modules
│   │   │   ├── system-prompt.ts      ← 1635 lines, 13 prompt groups
│   │   │   ├── action-tags.ts        ← 53 action tags + execution logic
│   │   │   ├── llm.ts                ← LLM provider abstraction
│   │   │   ├── signals.ts            ← 6 built-in signals + custom
│   │   │   ├── google-oauth.ts       ← OAuth token management
│   │   │   ├── google-sync.ts        ← Gmail, Calendar, Drive sync
│   │   │   ├── now-engine.ts         ← Priority scoring for NOW panel
│   │   │   ├── brief-assembly.ts     ← Smart brief generation
│   │   │   ├── prisma.ts             ← Singleton client + telemetry
│   │   │   ├── stripe.ts             ← Stripe integration
│   │   │   └── ...                   ← Many more utilities
│   │   ├── types/index.ts            ← Shared TypeScript types
│   │   └── docs/                     ← Audit documents for os.dividen.ai
│   ├── scripts/seed.ts               ← DB seed (test users + defaults)
│   ├── public/                       ← Static assets, PWA manifest
│   ├── .env                          ← Environment variables
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── tsconfig.json
```

---

## 5. Database Schema (60 Models) <a name="database-schema"></a>

**ORM:** Prisma 6.7.0 with PostgreSQL  
**Schema file:** `prisma/schema.prisma` (1847 lines)  
**Migration strategy:** `yarn prisma db push` only (no migrations, shadow DB is broken in this env)  
**⚠️ NEVER run `--accept-data-loss`** without explicit user confirmation — dev and prod share the same DB.

### Core Models (grouped by domain)

**Users & Auth:**
`User` · `UserProfile` · `UserLearning` · `AgentApiKey` · `ExternalApiKey` · `ServiceApiKey`

**Chat & AI:**
`ChatMessage` (with `clearedAt` for soft-clear) · `AgentMessage` · `AgentRule` · `AmbientPattern` · `AmbientRelaySignal`

**CRM:**
`Contact` · `ContactRelationship`

**Kanban / Project Board:**
`KanbanCard` · `ChecklistItem` (with `assigneeType`, `dueDate`, `sourceType`) · `CardContact` · `CardArtifact` · `Project` · `ProjectMember` · `ProjectInvite`

**Calendar & Email:**
`CalendarEvent` · `EmailMessage` · `IntegrationAccount` (multi-account via `accountIndex`)

**Signals & Capabilities:**
`SignalConfig` · `CustomSignal` · `AgentCapability`

**Queue & NOW:**
`QueueItem`

**Connections & Federation:**
`Connection` · `AgentRelay` · `FederationConfig` · `InstanceRegistry` · `Invitation`

**Marketplace:**
`MarketplaceAgent` (with `accessPassword`) · `MarketplaceSubscription` · `MarketplaceExecution`

**Jobs/Tasks:**
`NetworkJob` (with `taskBreakdown`, `contributorProjectId`) · `JobApplication` · `JobContract` · `JobPayment` · `JobReview`

**Teams:**
`Team` · `TeamMember` · `TeamFollow` · `TeamSubscription` · `TeamBilling` · `TeamAgentAccess` · `TeamSpendingPolicy`

**Documents & Recordings:**
`Document` · `Recording`

**Comms & Notifications:**
`CommsMessage` (legacy) · `NotificationRule`

**Extensions:**
`AgentExtension`

**Goals & Memory:**
`Goal` · `MemoryItem`

**Briefs & Activity:**
`AgentBrief` · `ActivityLog`

**Reputation & Webhooks:**
`ReputationScore` · `Webhook` · `WebhookLog`

**Telemetry:**
`TelemetryEvent`

---

## 6. AI Agent System (Divi) <a name="ai-agent-system"></a>

### System Prompt
- **File:** `src/lib/system-prompt.ts` (1635 lines)
- **13 prompt groups** (conditionally assembled per user state):
  1. Identity, Rules & Time
  2. Active State (board, queue, goals)
  3. Conversation
  4. People (CRM + profiles)
  5. Memory & Learning
  6. Calendar & Inbox
  7. Capabilities & Action Tags
  8. Connections & Relay
  9. Extensions (conditional)
  10. Platform Setup (conditional)
  11. Business Operations
  12. Team Agent Context (conditional)
  13. Active Capabilities (conditional)

### Action Tags (53)
Divi emits structured `[[tag:payload]]` patterns that get parsed and executed. The full list in `src/lib/action-tags.ts`:

**Core:** `create_card`, `update_card`, `archive_card`, `upsert_card`, `merge_cards`, `create_contact`, `update_contact`, `link_contact`, `add_relationship`, `link_artifact`, `link_recording`

**Tasks:** `add_checklist` (alias: `add_task`), `complete_checklist`, `dispatch_queue` (alias: `dispatch`)

**Calendar/Email:** `create_event` (alias: `schedule_event`), `create_calendar_event`, `set_reminder`, `send_email`, `send_comms`

**Memory:** `update_memory`, `save_learning`

**Setup:** `setup_webhook`, `save_api_key`, `add_known_person`, `create_document`, `update_profile`

**Connections:** `relay_request`, `relay_broadcast`, `relay_ambient`, `accept_connection`, `relay_respond`

**Orchestration:** `task_route`, `assemble_brief`, `project_dashboard`, `queue_capability_action`

**Goals:** `create_goal`, `update_goal`

**Jobs/Tasks:** `post_job`, `propose_task`, `find_jobs`

**Entity:** `entity_resolve`

**Marketplace:** `install_agent`, `uninstall_agent`

**Integration:** `sync_signal`

### LLM Integration
- **BYOK model** — users bring their own OpenAI or Anthropic key
- **File:** `src/lib/llm.ts`
- **Current model:** `claude-sonnet-4-6` (Anthropic)
- **Context window:** 50 messages in `/api/chat/send`
- **Chat persistence:** Messages stored in DB, `clearedAt` for soft-clear

### Divi Personality
- Configurable name via `User.diviName` (default "Divi")
- 4-dimension working style (verbosity, proactivity, autonomy, formality)
- Triage settings (autoMerge, autoRouteToBoard, triageStyle)
- Goals toggle (`goalsEnabled`, default false)
- All configured in Settings → Your Divi

---

## 7. Dashboard Layout <a name="dashboard-layout"></a>

**No sidebar.** 3-column layout: NOW | Center | Queue

### Header
- DiviDen logo, Search, Catch Up (with gear → CatchUpQuickMenu), notification bell, mode toggle strip below header

### Primary Tabs (CenterPanel)
`Chat` · `CRM` · `Calendar` · `Inbox` · `Recordings`

### Network Tabs
`Discover` · `Connections` · `Teams` · `Tasks` (was Jobs) · `Marketplace` · `Federation Intel`

### Tab scroll behavior
Drag-to-scroll with 5px threshold + fade gradients on mobile

### Key Components
- `NowPanel.tsx` — Scored priority items, quick actions (📋 Board), conditional earnings widget, activity stream
- `CenterPanel.tsx` — Tab router for all workspace views
- `QueuePanel.tsx` — Task queue + CommsTab
- `ChiefOfStaffView.tsx` — Observer mode
- `ChatView.tsx` — AI conversation with personalized avatars
- `InboxView.tsx` — Email inbox with All/Unread/Starred/Drafts filters + inline reply bar
- `KanbanView.tsx` — Project board with task delegation breakdown
- `ConnectionsView.tsx` — 3 sub-tabs: Find People, My Connections, Relays
- `JobBoardView.tsx` — Network tasks (Open Tasks, My Tasks, Accepted, Agreements)
- `MarketplaceView.tsx` — Agent marketplace + Earnings view

### Board accessible via
📋 button in NowPanel quick actions (not a primary tab)

### Mobile
Single-panel view with bottom nav switching between NOW/Center/Queue

---

## 8. Authentication & Authorization <a name="authentication"></a>

- **NextAuth.js** with email/password credentials provider
- **Session:** JWT-based
- **Files:** `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- **Setup page:** `/setup` (account creation + Terms of Service acceptance)
- **Login page:** `/login` (with deep-link invitation support)
- **Admin:** Bearer token auth via `ADMIN_PASSWORD` env var, separate from NextAuth
- **⚠️ NEXTAUTH_URL** is auto-configured by Abacus AI. Never set manually. Files reading it need `export const dynamic = "force-dynamic"`.

---

## 9. Google OAuth Integration <a name="google-oauth"></a>

**Purpose:** Data access (signals) — separate from NextAuth login. Users authenticate with email/password, then optionally connect Google.

### Google Cloud Project
- **Project:** `dividen-493203`, Number: `689488798650`
- **Scopes:** `gmail.readonly`, `gmail.send`, `gmail.compose`, `calendar` (full read+write), `drive.readonly`, `userinfo.email`, `userinfo.profile`
- **⚠️ Gmail scopes are RESTRICTED** — Google security audit required for 100+ users. Testing mode allows up to 100 test users.

### Multi-Inbox Support
- `IntegrationAccount.accountIndex` — `Int @default(0)`
- Unique constraint: `@@unique([userId, identity, service, accountIndex])`
- **Operators:** up to 3 Google accounts (accountIndex 0, 1, 2)
- **Agent identities:** 1 Google account
- UI groups all accounts under one Google section with per-account connect/disconnect

### Self-Hosted OAuth Isolation
- When `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing:
  - `/api/auth/google-connect` returns 501 with clear message
  - IntegrationManager shows self-setup prompt + Google Cloud Console link
  - `googleOAuthAvailable` boolean in GET `/api/integrations` response

### Send Route
- `/api/integrations/send` — detects provider:
  - **Google accounts:** Gmail API (`users.messages.send` with RFC 2822 raw message)
  - **SMTP accounts:** Nodemailer

### Redirect URI Fix
- All OAuth routes use `getPublicBaseUrl(req)` helper (reads `x-forwarded-host`) instead of `req.url` to avoid container hostname leaking

### Redirect URIs (must be in Google Console)
```
https://dividen.ai/api/auth/callback/google-connect
https://sdfgasgfdsgsdg.abacusai.app/api/auth/callback/google-connect
http://localhost:3000/api/auth/callback/google-connect
```

### Key Files
- `src/lib/google-oauth.ts` — Token exchange, refresh, scope management, `getValidAccessToken()` with auto-refresh (5-min buffer)
- `src/lib/google-sync.ts` — `syncGmail()`, `syncCalendar()`, `syncDrive()`, `syncAllGoogleServices()`
- `src/app/api/auth/google-connect/route.ts` — Initiates OAuth, builds consent URL
- `src/app/api/auth/callback/google-connect/route.ts` — Handles callback, creates 3 IntegrationAccount records
- `src/components/settings/IntegrationManager.tsx` — UI for all integrations

---

## 10. Integrations & Signals <a name="integrations-signals"></a>

### Signal Framework
- **File:** `src/lib/signals.ts`
- **6 built-in signals:** email, calendar, recordings, crm, drive, connections
- **Custom signals:** Webhook-based, user-created, auto-generate task-first triage prompts
- **Per-user config:** `SignalConfig` model — priority (int), catchUpEnabled, triageEnabled
- **Catch Up:** Dynamic prompt respecting priority order and exclusions
- **CatchUpQuickMenu:** Dropdown with drag-reorder + checkboxes for signals

### Sync
- `sync_signal` action tag triggers Google service syncs
- `/api/integrations/sync` — manual sync endpoint
- Drive sync stores files as `Document` records with `fileSource: 'google_drive'`

---

## 11. Capabilities System <a name="capabilities-system"></a>

- **Model:** `AgentCapability` (type: email/meetings/custom, identity, rules, config, status)
- **API:** `/api/capabilities` (GET, POST), `/api/capabilities/[type]` (GET, PATCH, DELETE)
- **Setup wizard:** 4 steps (intro → identity → rules → review)
- **Queue integration:** `queue_capability_action` creates queue items with `capabilityType` metadata
- **System prompt Group 13:** Dynamic capabilities context injected from DB

---

## 12. Smart Triage & Task-First Architecture <a name="smart-triage"></a>

**Mental model:** Cards = Projects (containers), Checklist Items = Tasks (atomic work items)

### Triage Protocol (8 steps)
1. EXTRACT TASKS → 2. ROUTE TO PROJECT → 3. ADD TO EXISTING (checklist + artifact) → 4. CREATE NEW PROJECT (sparingly) → 5. ASSIGN → 6. QUEUE → 7. LEARN → 8. SUMMARIZE

### Key Patterns
- **upsert_card:** Levenshtein similarity ≥80% — finds existing card by title before creating
- **link_artifact:** Dual-write system — direct FK for built-in types + generic `CardArtifact` for extensibility
- **ChecklistItem source tracking:** `sourceType`, `sourceId`, `sourceLabel` fields
- **Task delegation:** `assigneeType` (self/divi/delegated), delegation via relay
- **Due dates:** Every task should have one; Divi infers from context
- **Queue dedup:** Levenshtein ≥80% prevents duplicate queue items
- **Card merging:** `merge_cards` action tag + `/api/kanban/merge` API

---

## 13. Connections & Federation <a name="connections-federation"></a>

### Connections
- **3 sub-tabs:** Find People (default), My Connections, Relays
- **AcceptConnectionModal:** Full ceremony (nickname, relationship type, trust level, notes)
- **No local/federated toggle** — federation hidden behind collapsible in Connect by Email

### Federation
- **InstanceRegistry model:** platformLinked, platformToken, marketplaceEnabled, discoveryEnabled, etc.
- **Public APIs (v2):**
  - `GET /api/v2/updates` — unified updates feed
  - `GET /api/v2/network/discover` — network discovery
  - `POST /api/v2/federation/register` — instance registration
  - `POST /api/v2/federation/marketplace-link` — marketplace participation toggle
  - `POST /api/v2/federation/heartbeat` — health check
  - `POST /api/v2/federation/validate-payment` — fee validation
- **Relay system:** Agent-to-agent communication (Comms tab in QueuePanel)

---

## 14. Marketplace & Payments <a name="marketplace-payments"></a>

### Marketplace
- Agents can be listed, sold, subscribed to
- **Password-protected agents:** `accessPassword` field for private distribution
- **97% developer revenue share**, 3% platform routing fee
- **Internal fees:** Configurable via `MARKETPLACE_FEE_PERCENT`
- **Network fee floors:** 3% marketplace, 7% recruiting (enforced minimums)

### Stripe Integration
- Stripe Connect for seller onboarding
- Payment methods management
- Webhooks for payment events
- **Files:** `src/lib/stripe.ts`, `src/app/api/stripe/*`

---

## 15. Jobs → Paying Tasks <a name="paying-tasks"></a>

**Core principle:** Jobs are project-based paying tasks, NOT employment.

### Language Mapping
| Old | New |
|-----|-----|
| Job | Task |
| Hire | Assign |
| Worker | Contributor |
| Client | Poster |
| Contract | Agreement |
| Apply | Express Interest |
| Recruiting fee | Platform fee |

### Key Features
- Dual projects on acceptance (poster oversight + contributor execution)
- `taskBreakdown` field → becomes kanban cards
- 5-star default rating (real ratings after 5+ completed tasks)
- Equity/alternative compensation supported
- `propose_task` action tag → operator reviews before posting
- Inner-circle-first routing waterfall

---

## 16. Admin Dashboard <a name="admin-dashboard"></a>

- **URL:** `/admin` (password: `ADMIN_PASSWORD` env var)
- **11 tabs:** Overview · Users · Content · Activity · Instances · Marketplace · Usage · System Prompt · Tasks · Federation · Telemetry
- **Components:** `src/components/admin/` (shared.tsx + 5 tab components)
- **APIs:** `src/app/api/admin/` (7 endpoints, all Bearer token auth)

---

## 17. Protocol Versions <a name="protocol-versions"></a>

| Protocol | Version | File |
|----------|---------|------|
| MCP | v1.5.0 | `/api/mcp` — 22+ dynamic tools |
| A2A | v0.4.0 | `/api/a2a` — marketplace password access, persistent conversation |
| Agent Card | v0.4.0 | `/.well-known/agent-card.json` |
| DAWP | v0.1 | Internal relay protocol |

---

## 18. Settings Page <a name="settings-page"></a>

**6 tabs** (down from 8):
1. **Your Divi** — Agent name, working style, triage settings, goals toggle
2. **General** — API keys, mode toggle
3. **Integrations** — Google OAuth, SMTP
4. **Network** — Relay settings + Federation manager (merged)
5. **Payments** — Stripe Connect, payment methods
6. **Alerts** — Notification rules

Mobile-friendly: `overflow-x-auto scrollbar-hide` tab bar

---

## 19. Landing Page & Public Pages <a name="landing-page"></a>

### Landing Page (`src/components/landing/LandingPage.tsx`)
- **Hero:** "The last interface you'll ever need." (Jon explicitly chose this — do NOT change)
- **Nav:** Features · Marketplace · Updates · Open Source (→ os.dividen.ai) · Log in · Get Started
- **Sections:** Hero → Problem/Solution → Features (4 core + 5 power) → Protocol accordion → Marketplace → FVP → Contact → Footer
- **Data file:** `src/lib/landing-data.ts`

### Other Public Pages
- `/updates` — Changelog (data in `src/lib/updates.ts`)
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/docs/*` — Developer docs, federation, integrations, release notes
- `/profile/[userId]` — Public profile view
- `/team/[id]` — Team page

---

## 20. Environment Variables <a name="environment-variables"></a>

```
DATABASE_URL              ← PostgreSQL connection string (shared dev/prod!)
NEXTAUTH_SECRET           ← Auto-managed by Abacus
ADMIN_PASSWORD            ← Admin dashboard + API auth
ABACUSAI_API_KEY          ← For notification emails
AWS_BUCKET_NAME           ← S3 bucket for file uploads
AWS_FOLDER_PREFIX         ← S3 key prefix
AWS_REGION                ← S3 region
AWS_PROFILE               ← AWS credentials profile
GOOGLE_CLIENT_ID          ← Google OAuth (optional for self-hosted)
GOOGLE_CLIENT_SECRET      ← Google OAuth (optional for self-hosted)
STRIPE_SECRET_KEY         ← Stripe payments
STRIPE_PUBLISHABLE_KEY    ← Stripe client-side
MARKETPLACE_FEE_PERCENT   ← Internal marketplace fee
NOTIF_ID_CONNECTION_INVITATION ← Email notification type ID
WEB_APP_ID                ← Abacus app ID
```

**⚠️ NEXTAUTH_URL** is auto-set. Never add it to `.env`.

---

## 21. Deployment <a name="deployment"></a>

### Environments
- **Production:** `dividen.ai` + `sdfgasgfdsgsdg.abacusai.app` (both untagged)
- **Preview:** Dev server at localhost:3000 (reverse-proxied to user interface)
- **Dev and prod share the same database** — be careful with data operations

### Git
- **Remote:** `https://github.com/Denominator-Ventures/dividen.git` (branch `main`)
- **Always** reset `.abacus.donotdelete` before commit. Pull-rebase before push.

### Build
- Uses `NODE_OPTIONS="--max-old-space-size=10240"` (required because `googleapis` npm package causes OOM with default memory)
- `tsc --noEmit` also needs `--max-old-space-size=4096` minimum
- Standalone output mode

### Deploy Command
```bash
# From Abacus AI deploy tool — don't run manually
yarn run build  # with NEXT_OUTPUT_MODE=standalone
# Packaged as .tgz, deployed to bare-bones server
```

---

## 22. Known Constraints & Gotchas <a name="gotchas"></a>

### Critical
1. **`googleapis` OOM** — Default tsc heap is too small. Always use `--max-old-space-size=4096` for type checking, `10240` for build.
2. **Shared dev/prod DB** — Never delete data carelessly. Use upsert in seeds.
3. **Never `--accept-data-loss`** — Prisma db push with this flag can destroy production data. Always get explicit user confirmation.
4. **yarn only** — Never npm or npx.
5. **NEXTAUTH_URL** — Auto-configured. Files reading `process.env.NEXTAUTH_URL` must have `export const dynamic = "force-dynamic"`.
6. **No sidebar** — Dashboard uses 3-column layout. Don't add a sidebar.

### Important
7. **Google OAuth redirect** — Must use `getPublicBaseUrl(req)` helper, not `req.url` (container hostname leaks otherwise)
8. **Hydration** — Avoid non-deterministic values in SSR. Wrap browser APIs in `useEffect`.
9. **DB connections** — Short idle timeout, max 25 concurrent, 5s statement timeout. Keep connections ephemeral.
10. **No external system tools** — Production has no python, ffmpeg, etc. Only Node.js.
11. **Relative paths only** — Production directory structure differs from dev.
12. **`.abacus.donotdelete`** — Never modify this file.

### Style
13. **Builder-log tone** — Jon thinks in product terms. No corporate speak.
14. **Individual-first messaging** — Teams are secondary.
15. **Hero H1 is sacred** — "The last interface you'll ever need." Don't change.

---

## 23. Credentials <a name="credentials"></a>

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@dividen.ai | DiviDenAdmin2026! |
| Test user | john@doe.com | johndoe123 |
| Admin page | /admin | DiviDenAdmin2026! |

---

## 24. Open Source Site (os.dividen.ai) <a name="open-source-site"></a>

**Separate site** — NOT part of this codebase. Jon maintains it independently.

Audit documents live in `src/docs/`:
- `os-dividen-ai-corrections.md` — v1 corrections
- `os-dividen-ai-audit-v2.md` — Full copy audit (303 lines, 31 issues)
- `os-dividen-ai-audit-v3.md` — Addendum for multi-inbox, self-hosted OAuth, Gmail API send

### Key Issues (may still be unfixed on site)
- 12→13 prompt groups, 44→53 action tags, 55→60 models
- MCP v1.4→v1.5, Agent Card v0.3→v0.4
- LLM keys: remove "platform provides keys automatically" — both are BYOK
- "can be 0%" fee language needs rewording
- "Jobs" → "Tasks" in architecture diagrams
- Google Drive integration card missing
- Self-hosted OAuth isolation not documented
- Multi-inbox not documented

---

## 25. Style & Design System <a name="design-system"></a>

### Colors
- **Brand:** `#4f7cff` (blue)
- **Background:** `#050505` → `#0a0a0a` → `#111` → `#1a1a1a` (layered surfaces)
- **Text:** `white/90` (primary) → `white/60` → `white/40` → `white/25`
- **Borders:** `white/[0.06]` → `white/[0.08]` → `white/10`
- **Success:** green-500 / **Warning:** amber-500 / **Danger:** red-500

### Typography
- **Headings:** Space Grotesk (600-700 weight)
- **Body:** Inter / system-ui
- **Code:** JetBrains Mono

### Component Patterns
- Cards: `bg-[#111] border border-white/[0.06] rounded-xl`
- Buttons: `bg-brand-500 hover:bg-brand-400 text-black font-medium rounded-lg`
- Ghost buttons: `bg-white/[0.04] hover:bg-white/[0.08] text-white/60`
- Inputs: `bg-[#0a0a0a] border-white/10`
- Modals: Radix Dialog + `bg-[#111] border-white/[0.08]`
- Tabs: drag-to-scroll with fade gradients

### Dark Theme Only
No light mode. Everything assumes dark background.

---

## 26. Feature Inventory (Complete) <a name="feature-inventory"></a>

### Shipped & Stable
- [x] AI chat with 13-group system prompt + 53 action tags
- [x] CRM (contacts, relationships, activity timelines, research)
- [x] Calendar (events, sync with Google)
- [x] Inbox (email, sync with Google, Gmail API send, drafts filter, inline reply)
- [x] Recordings (transcription linking)
- [x] Kanban board (projects, tasks, delegation, merging, artifacts)
- [x] NOW engine (priority scoring, scored items)
- [x] Queue (task queue with capability metadata, approve/review/skip)
- [x] Goals (optional, enabled in settings)
- [x] Memory & Learning (ambient patterns, user learnings)
- [x] Capabilities (email/meetings/custom, setup wizard)
- [x] Signals (6 built-in + custom webhook, catch-up, triage)
- [x] Connections (find people, my connections, relays, acceptance ceremony)
- [x] Federation (instance registry, discovery, relay, marketplace linking)
- [x] Marketplace (list/buy/subscribe agents, password access, earnings)
- [x] Paying Tasks (post, browse, apply, agreements, dual-project)
- [x] Teams (create, members, billing, spending policies, agent access)
- [x] Discover (network directory with federated instances)
- [x] Comms (agent-to-agent relay log)
- [x] Profile (photo upload, preview/edit modes)
- [x] Search (global search across all entities)
- [x] Keyboard navigation (shortcuts)
- [x] PWA (installable, standalone mode)
- [x] Onboarding wizard (12-step)
- [x] Notifications (in-app notification center + email notifications)
- [x] Admin dashboard (11 tabs, full operational visibility)
- [x] Google OAuth (multi-inbox, self-hosted isolation, Gmail API send)
- [x] Stripe Connect (payments, webhooks)
- [x] Webhooks (management, learning, generic/calendar/email/transcript)
- [x] Entity resolution (cross-surface person/company matching)
- [x] Brief assembly (smart brief generation for cards)
- [x] Chief of Staff mode (observer view)
- [x] Updates page (changelog)
- [x] Terms of Service + Privacy Policy
- [x] Open Graph dynamic images (`/api/og`)
- [x] Telemetry (request logging, error tracking, query buffer)

### Aspirational / Not Yet Shipped
- [ ] Public workflow sharing / forking ("Fork Reality" section on os.dividen.ai)
- [ ] System prompt DB overrides (admin tab is read-only v1)
- [ ] Free tier enforcement (field exists, not consumed)
- [ ] Google Drive write access (currently read-only)

---

## 27. Audit Documents <a name="audit-documents"></a>

All in `src/docs/`:

| File | Purpose | Lines |
|------|---------|-------|
| `os-dividen-ai-corrections.md` | v1: Core corrections + new feature additions | ~170 |
| `os-dividen-ai-audit-v2.md` | v2: Full copy audit of every page on os.dividen.ai | ~303 |
| `os-dividen-ai-audit-v3.md` | v3: Multi-inbox, self-hosted OAuth, Gmail API send additions | ~140 |

---

## Quick Reference: Common Tasks

### Add a new action tag
1. Add to `SUPPORTED_TAGS` array in `src/lib/action-tags.ts`
2. Add `case` handler in `executeTag()` function
3. Document in system prompt (`src/lib/system-prompt.ts`)
4. Update count in os.dividen.ai audit docs

### Add a new Prisma model
1. Add to `prisma/schema.prisma`
2. Run `cd nextjs_space && yarn prisma db push`
3. Update model count in os.dividen.ai audit docs

### Add a new dashboard tab
1. Add to `CenterTab` type in `src/types/index.ts`
2. Add tab definition in `CenterPanel.tsx`
3. Create view component in `src/components/dashboard/`
4. Import and render in CenterPanel's tab router

### Add a new settings tab
1. Update `SettingsTab` type in `src/app/settings/page.tsx`
2. Add to `TABS` array
3. Add conditional render block

### Add a new admin tab
1. Create component in `src/components/admin/`
2. Add to tabs array in `src/app/admin/page.tsx`
3. Create API route in `src/app/api/admin/`

### Push to GitHub
```bash
cd /home/ubuntu/dividen_command_center/nextjs_space
git checkout -- .abacus.donotdelete
git add -A
git commit -m "description"
git pull --rebase origin main
git push origin main
```

---

*This bible was generated from the live codebase on April 13, 2026. For the most current design decisions and patterns, also read `.project_instructions.md` in the project root.*
