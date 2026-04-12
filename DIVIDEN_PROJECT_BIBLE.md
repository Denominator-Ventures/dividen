# DiviDen — Project Bible

**Last updated:** April 12, 2026 
**Purpose:** Comprehensive reference for continuing development in a new conversation. Covers what DiviDen is, how it works, what was built during this session, and everything a new context window needs to pick up where we left off.

---

## Table of Contents

1. [What Is DiviDen](#1-what-is-dividen)
2. [Philosophy](#2-philosophy)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema (56 Models)](#4-database-schema-56-models)
5. [System Prompt Engine (12 Groups)](#5-system-prompt-engine-12-groups)
6. [Action Tags (49 Executable Actions)](#6-action-tags-49-executable-actions)
7. [API Surface (165 Routes)](#7-api-surface-165-routes)
8. [Dashboard & UI](#8-dashboard--ui)
9. [Agent Marketplace](#9-agent-marketplace)
10. [Teams Infrastructure](#10-teams-infrastructure)
11. [Federation & Network](#11-federation--network)
12. [Payments (Stripe)](#12-payments-stripe)
13. [CRM & Contact Intelligence](#13-crm--contact-intelligence)
14. [Protocol Layers](#14-protocol-layers)
15. [Homepage & Landing Page](#15-homepage--landing-page)
16. [Updates System](#16-updates-system)
17. [Authentication & Security](#17-authentication--security)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Git & Version Control](#19-git--version-control)
20. [Environment Variables](#20-environment-variables)
21. [What We Built This Session](#21-what-we-built-this-session)
22. [Known Issues & Pending Work](#22-known-issues--pending-work)
23. [Jon's Preferences & Decision Log](#23-jons-preferences--decision-log)
24. [Credentials](#24-credentials)
25. [File Structure Reference](#25-file-structure-reference)
26. [Critical Rules for Future Development](#26-critical-rules-for-future-development)

---

## 1. What Is DiviDen

DiviDen is an AI-powered workflow command center. Every user gets a personal AI agent called **Divi** that learns how they work, handles what it can, and surfaces only what needs them. The platform combines:

- A **conversational AI agent** with full platform awareness (12 context groups, 49 action tags)
- A **CRM** with contact enrichment, relationship tracking, and activity timelines
- A **task management system** (Kanban boards, queue, goals, dynamic NOW engine)
- An **agent marketplace** where developers list AI agents and earn 97% of revenue
- A **federation protocol** (DAWP — DiviDen Agent Wire Protocol) for cross-instance communication
- A **team infrastructure** with subscriptions, spending policies, and team agents
- **Payments** via Stripe Connect for marketplace transactions and job contracts
- A **network layer** with profiles, discovery, connections, and reputation scoring

The codebase is ~59,500 lines of TypeScript across 165 API routes, 56 database models, and 45+ React components.

**Deployment:**
- Production: `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged — one deploy updates both)
- Open source companion site: `os.dividen.ai` (separate repo, NOT editable from this project)
- GitHub: `https://github.com/Denominator-Ventures/dividen.git`, branch `main`

---

## 2. Philosophy

**Individual-first.** This is the core principle Jon has settled on after extensive iteration:

- The individual is the atomic unit. Everything else — teams, marketplace, network — is a tool they pick up when it makes sense.
- Divi is YOUR agent. It learns YOUR patterns. The more you connect, the more time savings compound.
- Teams exist for individuals who need them, not the other way around. Anyone can step into the role of an individual at any time.
- The single greatest hook for new users: **email intelligence** — Divi reads your inbox, surfaces what matters, drafts responses, sends on your behalf.
- Onboarding focuses on connecting signals (email first), not showcasing features.
- The platform experience is primary; open-source/self-hosting is secondary but supported.
- Builder-log tone in all communications — technical but direct, no fluff.

**Open Core model:**
- MIT-licensed engine (self-hostable)
- Premium managed features (marketplace payments, team subscriptions, network discovery)
- Self-hosted instances can federate with the managed platform via public APIs

---

## 3. Architecture Overview

```
/home/ubuntu/dividen_command_center/
└── nextjs_space/                    # The actual Next.js app
    ├── prisma/schema.prisma         # 56 models, ~1715 lines
    ├── src/
    │   ├── app/                     # Next.js App Router pages + API routes
    │   │   ├── api/                 # 165 API routes
    │   │   ├── admin/               # Admin dashboard
    │   │   ├── dashboard/           # Main app (3-column layout)
    │   │   ├── login/ setup/        # Auth flows
    │   │   ├── profile/[userId]/    # Public profile pages
    │   │   ├── team/[id]/           # Team profile pages
    │   │   ├── settings/            # Settings (8 tabs)
    │   │   ├── updates/             # Changelog/updates feed
    │   │   ├── terms/               # Terms of Service
    │   │   ├── docs/                # Developer/federation/integration docs
    │   │   └── .well-known/         # A2A agent card, MCP server card, OAuth
    │   ├── components/
    │   │   ├── dashboard/           # 30+ dashboard components
    │   │   ├── settings/            # 11 settings components
    │   │   ├── landing/             # LandingPage.tsx
    │   │   └── updates/             # UpdatesPage.tsx
    │   └── lib/                     # 38 utility/service files
    │       ├── system-prompt.ts     # 12-group dynamic system prompt (~1287 lines)
    │       ├── action-tags.ts       # 49 executable actions (~1944 lines)
    │       ├── updates.ts           # All update posts (~1772 lines)
    │       ├── prisma.ts            # Singleton Prisma client + telemetry
    │       ├── llm.ts               # LLM integration (Anthropic Claude)
    │       ├── auth.ts              # NextAuth config
    │       ├── stripe.ts            # Stripe integration
    │       └── ...                  # 30+ more utilities
    ├── scripts/seed.ts              # Database seeder
    └── .env                         # Environment variables
```

**Tech Stack:**
- Next.js 14.2 (App Router)
- TypeScript
- Prisma ORM → PostgreSQL (shared dev/prod database)
- NextAuth.js for authentication
- Tailwind CSS (custom brand colors: blue `#4f7cff`)
- Stripe Connect for payments
- Anthropic Claude (via Abacus.AI API) for LLM
- SSE for real-time activity streaming
- PWA support (installable desktop app)

---

## 4. Database Schema (56 Models)

Grouped by domain:

### Core User
- `User` — accounts with role, email, password, free tier flag, TOS acceptance
- `UserProfile` — public profile (headline, bio, skills, availability, avatar)
- `UserLearning` — ambient patterns the system learns from user behavior

### AI Agent
- `ChatMessage` — conversation history with Divi
- `AgentMessage` — agent-to-agent communications
- `AgentApiKey` — per-user LLM API key management
- `AgentRule` — user-defined rules for Divi's behavior
- `AgentBrief` — reasoning artifacts ("show your work")
- `AgentExtension` — installable skills/personas
- `AgentRelay` — relay messages between agents
- `MemoryItem` — agent memory (approved, pending, pinned)
- `AmbientPattern` — learned ambient relay patterns
- `AmbientRelaySignal` — ambient relay interaction data

### Task Management
- `KanbanCard` — kanban board cards with status, priority, due dates
- `ChecklistItem` — checklist items within kanban cards
- `QueueItem` — task queue (staging area for relays/actions)
- `Goal` — user objectives with progress tracking

### CRM & Contacts
- `Contact` — CRM contacts with enrichment fields
- `ContactRelationship` — relationships between contacts (manager, colleague, etc.)
- `CardContact` — linking contacts to kanban cards
- `Connection` — platform connections between users
- `Invitation` — connection invitations with token-based acceptance

### Communications
- `CommsMessage` — Comms Channel (agent-to-agent task execution)
- `EmailMessage` — synced email messages
- `CalendarEvent` — synced calendar events
- `Recording` — meeting/call recordings
- `Document` — uploaded documents

### Teams
- `Team` — team entity (name, description, avatar, headline, agentEnabled)
- `TeamMember` — membership with role (owner, admin, member)
- `TeamSubscription` — tier (starter/pro), billing cycle, member/project limits
- `TeamBilling` — payment records
- `TeamSpendingPolicy` — per-member or per-project spending caps
- `TeamAgentAccess` — which team members can use the team agent
- `TeamFollow` — following teams for updates

### Marketplace
- `MarketplaceAgent` — listed agents with pricing, description, category
- `MarketplaceSubscription` — agent subscriptions (installed agents)
- `MarketplaceExecution` — execution logs and billing

### Jobs & Contracts
- `NetworkJob` — job listings on the network
- `JobApplication` — applications to jobs
- `JobContract` — active contracts (flat, hourly, weekly, monthly)
- `JobPayment` — payment records for jobs
- `JobReview` — reviews after job completion

### Federation & Network
- `FederationConfig` — per-user federation settings
- `InstanceRegistry` — registered self-hosted instances (with platform link fields)
- `ReputationScore` — network reputation
- `IntegrationAccount` — connected external services

### Platform
- `Project` — scoped workspaces (public, team, private visibility)
- `ProjectMember` / `ProjectInvite` — project membership
- `NotificationRule` — configurable notification triggers
- `TelemetryEvent` — usage analytics
- `ActivityLog` — universal event log
- `Webhook` / `WebhookLog` — incoming webhook configurations
- `ServiceApiKey` / `ExternalApiKey` — API key management

---

## 5. System Prompt Engine (12 Groups)

File: `src/lib/system-prompt.ts` (~1287 lines)

The system prompt is dynamically assembled per-user from 12 context groups:

| Group | Name | Content |
|-------|------|--------|
| 1 | Identity, Rules & Time | Agent persona, user-defined rules, current timestamp |
| 2 | Active State | NOW cards, kanban board, queue items, goals |
| 3 | Conversation | Recent chat messages |
| 4 | People | CRM contacts + platform connections + profiles |
| 5 | Memory & Learning | Approved memory items + learned patterns |
| 6 | Schedule & Inbox | Calendar events (7 days) + unread emails |
| 7 | Capabilities & Syntax | Action tag reference + execution syntax |
| 8 | Connections & Relay | Federation relay protocol + active connections |
| 9 | Extensions | Installed agent extensions (conditional) |
| 10 | Platform Setup | Onboarding status (conditional, compact if done) |
| 11 | Business Operations | Jobs, contracts, marketplace, recordings, reputation |
| 12 | Team Agent Context | Team config, members, projects, behavior rules (conditional) |

Group 12 enforces **individual-first team agent rules**: coordinators not commanders, suggest never assign, peers to individual Divi not superiors.

---

## 6. Action Tags (49 Executable Actions)

File: `src/lib/action-tags.ts` (~1944 lines)

Divi executes structured actions via `[ACTION:TAG_NAME]` syntax in chat responses. Current count: **49 action tags** covering:

- Task management: create/update kanban cards, queue items, goals
- CRM: create/update contacts, add relationships, research contacts
- Calendar: create/update events
- Communications: send relays, create comms messages
- Marketplace: install/uninstall agents, execute agents, list agents
- Documents: create/manage documents
- Memory: save/update memory items
- Goals: create/track objectives
- Search: platform and network search
- Settings: update preferences
- Briefs: assemble reasoning artifacts
- Extensions: manage agent extensions
- Jobs: post jobs, apply, hire, review

**Note for os.dividen.ai:** The count displayed there (49) matches the actual codebase count. Earlier guides said 44 — the actual count is 49.

---

## 7. API Surface (165 Routes)

Organized by domain:

### Auth (4 routes)
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/auth/login` — credential login with telemetry
- `/api/signup` — user registration with TOS + contact auto-linking
- `/api/setup` — first-time account creation

### Chat (2 routes)
- `/api/chat/messages` — fetch conversation history
- `/api/chat/send` — send message to Divi (triggers system prompt + action tags)

### Dashboard (4 routes)
- `/api/now` — Dynamic NOW engine scoring
- `/api/queue`, `/api/queue/[id]`, `/api/queue/dispatch` — Queue management

### CRM (10 routes)
- `/api/contacts` — CRUD contacts
- `/api/contacts/[id]/activity` — contact activity timeline
- `/api/contacts/[id]/relationships` — relationship management
- `/api/contacts/[id]/research` — AI enrichment
- `/api/contacts/[id]/cards` — linked kanban cards
- `/api/connections`, `/api/connections/[id]` — platform connections

### Teams (7 routes)
- `/api/teams` — CRUD teams
- `/api/teams/[id]/members` — member management
- `/api/teams/[id]/subscription` — tier management (Starter/Pro)
- `/api/teams/[id]/agent` — team agent config
- `/api/teams/[id]/follow` — team following

### Marketplace (8 routes)
- `/api/marketplace` — browse/list agents
- `/api/marketplace/[id]/install` — install agent (knowledge transfer to Divi)
- `/api/marketplace/[id]/execute` — run an agent
- `/api/marketplace/[id]/subscribe` — subscription management
- `/api/marketplace/[id]/rate` — rate/review agents
- `/api/marketplace/earnings` — creator earnings
- `/api/marketplace/fee-info` — fee structure

### Jobs (10 routes)
- `/api/jobs` — browse/post jobs
- `/api/jobs/[id]/apply`, `/hire`, `/complete`, `/review`
- `/api/jobs/earnings` — job income
- `/api/jobs/match` — AI job matching
- `/api/contracts`, `/api/contracts/[id]/pay`

### Federation (15+ routes)
- `/api/federation/config` — federation settings
- `/api/federation/connect` — instance pairing
- `/api/federation/relay` — relay protocol
- `/api/federation/routing` — task routing
- `/api/federation/patterns` — pattern sharing
- `/api/federation/jobs`, `/api/federation/jobs/apply`
- `/api/federation/entity-search` — cross-instance search
- `/api/federation/graph` — knowledge graph
- `/api/federation/mcp` — MCP bridge
- `/api/federation/reputation` — reputation federation
- `/api/federation/briefing` — federation briefings

### v2 API (Public/Federation)
- `GET /api/v2/updates` — Public unified updates feed (no auth, CORS)
- `GET /api/v2/network/discover` — Network discovery (profiles, teams, agents)
- `POST /api/v2/federation/register` — Instance registration → returns platformToken
- `POST /api/v2/federation/marketplace-link` — Enable/disable marketplace
- `POST /api/v2/federation/heartbeat` — Health check from federated instances
- `/api/v2/docs` — OpenAPI specification
- `/api/v2/contacts`, `/api/v2/kanban`, `/api/v2/queue` — External API access
- `/api/v2/keys` — API key management
- `/api/v2/shared-chat/*` — Shared chat endpoints

### Webhooks (8 routes)
- `/api/webhooks/email`, `/calendar`, `/transcript`, `/generic` — Incoming
- `/api/webhooks-management/*` — Webhook config, logs, learning, testing

### Integrations (4 routes)
- `/api/integrations` — manage connected services
- `/api/integrations/sync`, `/send`, `/test`

### Stripe (7 routes)
- `/api/stripe/connect/onboard`, `/dashboard`, `/status`
- `/api/stripe/payment-methods`, `/default`
- `/api/stripe/status`, `/webhooks`

### Admin (4 routes)
- `/api/admin/stats` — platform statistics
- `/api/admin/telemetry` — usage analytics
- `/api/admin/federation-activity`, `/federation-check`

### Well-Known (3 routes)
- `/.well-known/agent-card.json` — A2A agent card
- `/.well-known/mcp/server-card.json` — MCP server discovery
- `/.well-known/oauth-protected-resource` — OAuth metadata

### Plus: Memory, Goals, Calendar, Email, Documents, Briefs, Kanban, Recordings, Notifications, Profile, Projects, Search, Settings, Status, Activity, Relays, Reputation, Service Keys, Directory, Discover, OG images, etc.

---

## 8. Dashboard & UI

### Layout
The dashboard uses a **3-column layout** (no sidebar):

| Left (NOW Panel) | Center Panel | Right (Queue Panel) |
|---|---|---|
| Dynamic priority scoring | Tabbed content area | Task queue + dispatch |
| Click items → prefill chat | Chat, CRM, Calendar, Kanban, etc. | Send to Comms on demand |

### Center Panel Tabs
The center panel has scrollable tabs (drag-to-scroll with fade gradients):
- Chat, CRM, Calendar, Inbox, Kanban, Marketplace, Connections, Extensions, Discover, Goals, Drive, Recordings, Job Board, Federation, Comms, Chief of Staff, Earnings

### Key Components
- `NowPanel.tsx` — Dynamic NOW engine, clickable items prefill chat
- `ChatView.tsx` — Conversation with Divi, prefill support
- `CenterPanel.tsx` — Tab management with scroll UX
- `QueuePanel.tsx` — Task queue with "Send to Comms" action
- `MarketplaceView.tsx` — Agent marketplace + earnings (~1891 lines)
- `TeamsView.tsx` — Team management (~605 lines)
- `CrmView.tsx` — Contact management with detail modal
- `ChiefOfStaffView.tsx` — Autonomous execution dashboard
- `OnboardingWizard.tsx` — First-run experience
- `Walkthrough.tsx` — Feature walkthrough overlay
- `FederationIntelligenceView.tsx` — Federation analytics
- `LandingPage.tsx` — Public homepage

### Settings Page (8 Sections)
- Profile, Relay Settings, Payment, Federation, Notifications, Integrations, Memory, API Keys, Webhooks, Service Keys, Desktop Install

---

## 9. Agent Marketplace

**How it works:**
1. Developers list agents with name, description, category, pricing
2. Users browse/search the marketplace
3. **Install** an agent → Divi receives knowledge transfer (task types, context preparation, execution parameters)
4. **Execute** via chat or queue dispatch
5. **Uninstall** → Divi forgets the agent's knowledge (no memory bloat)
6. Earnings: **97%** to developer, **3%** platform fee
7. Self-hosted instances pay **0%** for their own agents

**Payment flow:** Stripe Connect handles onboarding, payouts, and saved payment methods.

**Key files:**
- `src/components/dashboard/MarketplaceView.tsx` — UI
- `src/app/api/marketplace/*` — API routes
- `src/lib/marketplace-config.ts` — Configuration
- Schema: `MarketplaceAgent`, `MarketplaceSubscription`, `MarketplaceExecution`

---

## 10. Teams Infrastructure

**Individual-first teams:** Teams are a premium feature. Individuals are always the atomic unit — teams are tools they pick up when needed.

### Data Model
- `Team` — name, description, avatar, headline, `agentEnabled` flag
- `TeamMember` — role: owner | admin | member
- `TeamSubscription` — tier + billing cycle + limits
- `TeamBilling` — payment records
- `TeamSpendingPolicy` — per-member or per-project spending caps (Pro only)
- `TeamAgentAccess` — which members can use the team agent (Pro only)
- `TeamFollow` — follow teams for updates

### Subscription Tiers
| Feature | Starter ($29/mo) | Pro ($79/mo + $9/seat) |
|---------|-------------------|------------------------|
| Members | 5 | 10+ base |
| Projects | 3 | Unlimited |
| Team Agent | ❌ | ✅ |
| Spending Policies | ❌ | ✅ |
| 14-day trial | ✅ | ✅ |

### Team Agent (Group 12)
The team agent is a **coordinator, not a commander**:
- Suggests, never assigns
- Peers to individual Divi, not superiors
- Loads team config, member lists, projects, activity
- Only activates for teams with `agentEnabled: true`

### Key Files
- `src/components/dashboard/TeamsView.tsx` — Team management UI
- `src/app/api/teams/*` — 7 API routes
- `src/app/team/[id]/page.tsx` — Team profile page
- `src/lib/system-prompt.ts` (Group 12) — Team agent context builder

---

## 11. Federation & Network

### DAWP (DiviDen Agent Wire Protocol)
Cross-instance communication without shared databases:
- Relay protocol (direct, broadcast, ambient modes)
- Task routing across instances
- Pattern sharing (ambient learning)
- Entity search federation
- Knowledge graph queries
- MCP bridge

### Federation APIs (v2 — Public)
Built this session for self-hosted instance integration:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v2/updates` | GET | None | Unified changelog feed |
| `/api/v2/network/discover` | GET | Optional Bearer | Network discovery (profiles, teams, agents) |
| `/api/v2/federation/register` | POST | instanceUrl + adminEmail | Register instance → get platformToken |
| `/api/v2/federation/marketplace-link` | POST | platformToken | Enable/disable marketplace participation |
| `/api/v2/federation/heartbeat` | POST | platformToken | Health check + stats reporting |

### Connect to Network Wizard
In Settings → Federation → "Connect to Network":
1. Pre-flight checks (instance URL reachable, admin email present)
2. One-click registration → automatic platformToken exchange
3. Feature toggles (marketplace, discovery, updates)
4. Token display for manual integration

### InstanceRegistry Extended Fields
- `platformLinked`, `platformToken`, `marketplaceEnabled`, `discoveryEnabled`, `updatesEnabled`
- `version`, `userCount`, `agentCount`, `lastSyncAt`

---

## 12. Payments (Stripe)

- **Stripe Connect** for marketplace payouts (97/3 split)
- Onboarding flow: `/api/stripe/connect/onboard` → Stripe dashboard
- Saved payment methods for one-click purchases
- Job contract payments (flat, hourly, weekly, monthly)
- Team subscription billing
- Webhook handler: `/api/stripe/webhooks`

---

## 13. CRM & Contact Intelligence

- Full CRM with contact enrichment, activity timelines, relationship mapping
- Contact auto-linking: new signups auto-match existing CRM contacts across users
- 3-tab contact detail modal: Overview, Activity, Relationships
- Relationship types: colleague, manager, report, partner, spouse, friend, referral, custom
- Platform bridge: `src/lib/contact-platform-bridge.ts`
- Profile pages with 5-section tabbed layout + relationship API

---

## 14. Protocol Layers

The platform is organized into 10 protocol layers (displayed as expandable accordion on homepage):

1. **Identity & Profile** — Routing manifests for agent decision-making
2. **Goals & Dynamic NOW Engine** — Objective tracking + priority scoring
3. **Ambient Relay Protocol** — Direct, broadcast, ambient agent communication
4. **The Brief — Reasoning Artifact** — Transparent orchestration documentation
5. **Ambient Learning Engine** — Self-improving protocol from interaction patterns
6. **Teams & Projects** — Organizational context for routing and visibility
7. **Extensions Framework** — Installable skills from curated registry
8. **Federation** — Cross-instance DAWP communication
9. **Integration Surface** — A2A, webhooks, Agent API v2
10. **Agent Marketplace & Payments** — Agent commerce with Stripe Connect

---

## 15. Homepage & Landing Page

File: `src/components/landing/LandingPage.tsx` + `src/lib/landing-data.ts`

### Structure
1. **Hero**: "The last interface you'll ever need." (DO NOT CHANGE — Jon's explicit preference)
   - Subhead: "Your AI agent learns how you work, handles what it can, and surfaces only what needs you."
   - Typing animation: 6 individual-focused phrases
2. **Problem/Solution**: Alice/Bob scenario (Jon likes it, don't change)
3. **Features**: 4 core visible (2×2 grid) + 5 power features behind "Show more" button
4. **Protocol**: 10-layer expandable accordion
5. **Marketplace Stats**: 97% revenue share, 3% platform fee, Stripe payments, 0% self-hosted
6. **CTAs**: "Try the Managed Platform" / "Create Your Account" (platform-first, not open-source push)

### Navigation
Minimal top nav: Home, Updates, Login/Sign Up. Removed: Docs, Protocol, GitHub (per Jon's request).

---

## 16. Updates System

File: `src/lib/updates.ts` (~1772 lines, 21 update posts)

The updates feed serves as a public changelog/builder-log. Posts are stored as TypeScript objects with title, subtitle, date, tags, content (with `<h3>`, `<p>`, `<pre>`, `<ul>` HTML).

Recent posts (newest first):
1. **Teams for Individuals, Federation for Everyone** — Team infrastructure + federation APIs
2. **A Founder Letter — The Shift to Individual-First** — Philosophy, platform state, open-core positioning
3. **Hardening Sprint** — Rate limits, agent versioning, federation intel
4. **Install / Uninstall** — Marketplace agent lifecycle
5. **Divi Now Sees Everything** — Full platform awareness
6. **Your Agent Makes Money While You Sleep** — Marketplace launch
7. **FVP Integration Brief** — 14 proposals, one build
8. ...and 14 more going back to the earliest updates

Also served via `GET /api/v2/updates` for federation consumption.

---

## 17. Authentication & Security

- **NextAuth.js** with credentials provider
- Session-based auth with JWT
- TOS acceptance required at signup (checkbox + `/terms` page)
- Agent liability disclaimers in TOS
- Telemetry logging on login attempts (IP, duration, success/failure)
- Rate limiting on auth and execution endpoints
- Security headers on all responses
- API key auth for v2 endpoints (`/api/v2/keys`)
- Platform token auth for federation endpoints

---

## 18. Deployment & Infrastructure

- **Hosted on Abacus.AI** platform
- Production URLs: `dividen.ai`, `sdfgasgfdsgsdg.abacusai.app`
- Both are untagged — one `deploy_nextjs_project` call updates both
- Database: PostgreSQL (shared dev/prod via Abacus.AI)
- Build: `yarn run build` with standalone output
- PWA: Progressive Web App with desktop install
- SSE: Server-Sent Events for real-time activity
- OG images: Dynamic generation via `/api/og`

**CRITICAL deployment rules:**
- No system tools in production (no python, ffmpeg, etc.)
- Relative paths only (production directory differs from dev)
- Only files inside project directory get packaged

---

## 19. Git & Version Control

**Repository:** `https://github.com/Denominator-Ventures/dividen.git` 
**Branch:** `main`

**Rules:**
- Always `git reset HEAD .abacus.donotdelete && git checkout -- .abacus.donotdelete` before commits
- Always `git pull --rebase origin main` before push
- Never modify `.abacus.donotdelete`

**Recent commit history (this session):**
```
5b96995 Teams federation update post v2 guide
129fc08 Teams + Federation update post, OS site guide v2
42d8f2d Federation APIs and Connect wizard
4210eca Federation integration: Connect to Network wizard, public APIs
b8a1603 Add comprehensive os.dividen.ai update guide
532067a Founder letter update post added
1b45c6c Homepage polish and codebase cleanup
4cd7904 Phase 7.5: Homepage polish, tiered features, accordion protocol
f5fec56 Revert hero to last interface
```

---

## 20. Environment Variables

Stored in `nextjs_space/.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret |
| `ABACUSAI_API_KEY` | LLM API access (Anthropic Claude via Abacus) |
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side key |
| `ADMIN_PASSWORD` | Admin dashboard password |
| `MARKETPLACE_FEE_PERCENT` | Platform fee (3%) |
| `NOTIF_ID_CONNECTION_INVITATION` | Notification type ID |
| `WEB_APP_ID` | Abacus app identifier |

**Note:** `NEXTAUTH_URL` is auto-configured by Abacus.AI per environment. Do not set manually.

---

## 21. What We Built This Session

This was a massive session covering product thinking, architecture, and implementation across multiple phases.

### Phase 1: Network Architecture Schema Foundation
- Extended Prisma schema with network models: Connection, Invitation, UserProfile, ReputationScore, NetworkJob, JobApplication, JobContract, JobPayment, JobReview
- Platform connection system with invitation tokens

### Phase 2: Rich Profile Pages
- 5-section tabbed ProfileView (server component)
- Relationship API between platform users
- Public profile pages at `/profile/[userId]`

### Phase 3: CRM Platform Integration
- Platform badges on contacts
- Invite CTAs for non-platform contacts
- Contact auto-linking on signup (`contact-platform-bridge.ts`)
- Platform profile section in ContactDetailModal

### Phase 4: Team Profile Pages
- Team profiles at `/team/[id]`
- Subscription tier badges
- Member/project limit enforcement
- Team follow system

### Phase 5: Marketplace Agent Lifecycle
- Install/uninstall with knowledge transfer
- Divi learns agent capabilities on install, forgets on uninstall
- MCP and A2A dynamic updates
- Memory management for agent knowledge

### Phase 6: Network Search & Discovery
- Unified search API with network entities
- `/api/discover` endpoint with faceted filters
- GlobalSearch with scope pills (platform, network, people)
- DiscoverView tab in dashboard

### Phase 7 & 7.5: Homepage Polish & Codebase Cleanup
- Hero reverted to "The last interface you'll ever need" (Jon's preference)
- Tiered features (4 core + 5 power behind "Show more")
- 10-layer protocol accordion
- Landing data extracted to `landing-data.ts`
- Removed dead Sidebar component
- Removed excess nav links (Docs, Protocol, GitHub)
- Tab scroll UX with drag + fade gradients
- Onboarding reordered (Chat → Email → Contact → Goal)
- Free tier field on User model
- Admin stats batched (was 44+ sequential queries)

### Founder Letter Update Post
- Comprehensive builder-log covering the philosophical shift to individual-first
- Covered all platform state, network architecture, marketplace, open-core positioning
- Thanked Jaron, Todd, Laura, Jon Bruce

### OS Site Update Guide v1
- `OS_DIVIDEN_AI_UPDATE_GUIDE.md` — First comprehensive review of os.dividen.ai
- Cataloged every page, every discrepancy, every needed update
- ~840 lines covering homepage, docs, open-source, updates pages

### Federation APIs & Connect to Network
- Built 5 new v2 API endpoints (updates, discover, register, marketplace-link, heartbeat)
- Extended InstanceRegistry schema with platform link fields
- Connect to Network wizard in FederationManager
- OpenAPI docs updated

### Teams + Federation Update Post
- Second major update post covering team data model, subscriptions, team agents, federation APIs
- Individual-first framing throughout

### OS Site Update Guide v2
- `OS_DIVIDEN_AI_UPDATE_GUIDE_V2.md` — Follow-up review after partial os.dividen.ai updates
- Found: action tag count still wrong, no teams docs, no federation API docs, updates page still separate

### Performance & Quality
- Telemetry batching (createMany instead of sequential creates)
- N+1 query elimination
- Dead code removal
- TypeScript strict typing fixes
- Query bounds on all database reads

---

## 22. Known Issues & Pending Work

### Active Issues
1. **os.dividen.ai** needs further updates (documented in `OS_DIVIDEN_AI_UPDATE_GUIDE_V2.md`) — separate repo, can't edit directly
2. **Free tier** (`isFreeUser` field + `free-tier.ts`) — field exists but not yet consumed by any gating logic
3. **Comms Channel** UX may not fully convey its purpose (agent-to-agent, not user-to-Divi)

### Future Considerations
- Email integration onboarding (the #1 hook — connect inbox, Divi reads/surfaces/drafts)
- Stripe Connect testing in live mode
- PWA push notifications
- Agent versioning with changelogs (infrastructure exists, UI may need polish)
- Federation pattern sharing daemon
- Recruiting fee configuration (`recruiting-config.ts` exists)

---

## 23. Jon's Preferences & Decision Log

These are decisions Jon has explicitly made during conversations:

| Decision | Context |
|----------|---------|
| Hero H1: "The last interface you'll ever need" | Tried alternatives, Jon explicitly reverted to this |
| Individual-first philosophy | Teams are secondary; the individual is the atomic unit |
| Problem/Solution section (Alice/Bob) | Jon likes it, don't change |
| Platform-first CTAs | "Try the Managed Platform" over "Self-Host It" |
| Remove nav links: Docs, Protocol, GitHub | Platform is standalone now |
| Email intelligence = #1 hook | For onboarding, NOT homepage hero |
| Builder-log tone | Technical but direct, no marketing fluff |
| Team agents = coordinators | Suggest, never assign. Peers to individual Divi. |
| 97% marketplace split | Developer-friendly, 3% platform fee, 0% self-hosted |
| Onboarding order | Chat → Connect email → Add contact → Set goal |
| Earnings tab inside Marketplace | Not a separate top-level tab |
| Queue = staging area for prompts | Items get sent to Comms for execution |
| Comms = agent-to-agent | NOT user-to-Divi; Divi interacts with other agents here |
| Chief of Staff mode | Autonomous execution; Divi works down the queue |

---

## 24. Credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | `admin@dividen.ai` | `DiviDenAdmin2026!` | admin |
| Test User | `john@doe.com` | `johndoe123` | admin |
| Admin Page | — | `DiviDenAdmin2026!` | `/admin` access |

---

## 25. File Structure Reference

### Key Files by Function

**Core Logic:**
- `src/lib/system-prompt.ts` — 12-group dynamic system prompt (1287 lines)
- `src/lib/action-tags.ts` — 49 executable action tags (1944 lines)
- `src/lib/llm.ts` — LLM integration (Anthropic Claude)
- `src/lib/prisma.ts` — Singleton Prisma client + telemetry batching
- `src/lib/auth.ts` — NextAuth configuration
- `src/lib/stripe.ts` — Stripe integration
- `src/lib/now-engine.ts` — Dynamic NOW priority scoring
- `src/lib/queue-dispatch.ts` — Queue execution logic
- `src/lib/cos-sequential-dispatch.ts` — Chief of Staff sequential dispatch
- `src/lib/relay-queue-bridge.ts` — Queue ↔ Relay bridge

**Federation:**
- `src/lib/federation/composite-prompts.ts` — Cross-instance prompt assembly
- `src/lib/federation/graph-matching.ts` — Knowledge graph queries
- `src/lib/federation/pattern-sharing.ts` — Ambient pattern federation
- `src/lib/federation/task-routing.ts` — Cross-instance task routing
- `src/components/settings/FederationManager.tsx` — Federation settings + Connect wizard

**Data & Content:**
- `src/lib/updates.ts` — 21 update posts (1772 lines)
- `src/lib/landing-data.ts` — Homepage content (features, protocol, stats)
- `src/lib/marketplace-config.ts` — Marketplace configuration
- `src/lib/recruiting-config.ts` — Job/recruiting fee config

**Utilities:**
- `src/lib/telemetry.ts` — Request/error logging
- `src/lib/rate-limit.ts` — Rate limiting
- `src/lib/memory.ts` — Agent memory management
- `src/lib/ambient-learning.ts` — Pattern learning
- `src/lib/entity-resolution.ts` — Entity matching
- `src/lib/contact-platform-bridge.ts` — Contact auto-linking
- `src/lib/free-tier.ts` — Free tier utility (not yet consumed)
- `src/lib/feature-gates.ts` — Feature gating
- `src/lib/api-auth.ts` — API key authentication
- `src/lib/webhook-*.ts` — Webhook processing (actions, auth, learn, push)

---

## 26. Critical Rules for Future Development

1. **Never `--accept-data-loss`** on Prisma. Dev and prod share the same database. Only additive schema changes.
2. **Never modify `.abacus.donotdelete`** — system file. Always reset it before git commits.
3. **Always `git pull --rebase origin main`** before pushing.
4. **Hero H1 stays** as "The last interface you'll ever need." — Jon's explicit decision.
5. **Individual-first** in all messaging, features, and UX decisions.
6. **Use yarn only** — never npm or npx.
7. **Existing seed.ts** in scripts/ — modify it, don't create new seeders. Use upsert, never delete.
8. **Project path** for tools: `/home/ubuntu/dividen_command_center` (NOT the nextjs_space subdirectory).
9. **os.dividen.ai** is a separate repo — create guide documents, don't try to edit it directly.
10. **NEXTAUTH_URL** is auto-configured per environment. Don't set it in `.env`.
11. **Two OS update guides exist**: `OS_DIVIDEN_AI_UPDATE_GUIDE.md` (v1) and `OS_DIVIDEN_AI_UPDATE_GUIDE_V2.md` (v2) — both pushed to GitHub.
12. **Database has 56 models** — check schema.prisma before adding new ones to avoid conflicts.
13. **System prompt has 12 groups** — Group 12 (Team Agent) is the newest.
14. **49 action tags** — the actual count matches the codebase.
15. **Stripe is configured** — both publishable and secret keys are in `.env`.

---

*This document was generated on April 12, 2026 at the end of a comprehensive building session. It represents the complete state of the DiviDen Command Center as of commit `5b96995`.*
