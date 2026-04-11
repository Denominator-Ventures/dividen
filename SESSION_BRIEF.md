# DiviDen Command Center — Full Project Brief

**Date**: April 11, 2026  
**Author**: Jon (via Abacus AI Agent session)  
**Purpose**: Complete context document for continuing development in a new conversation  
**Project path**: `/home/ubuntu/dividen_command_center`  
**Next.js app**: `/home/ubuntu/dividen_command_center/nextjs_space`

---

## 1. What Is DiviDen?

DiviDen is an **open-source agentic coordination platform** — a command center where independent builders work alongside their personal AI agent ("Divi"). Think of it as an operating system for your professional life where your AI agent handles coordination, communication, and task execution across a growing network of other agents and humans.

**The core thesis**: You don't need a boss. You need a system. Your agent finds work, routes tasks, manages communication, and earns money — all while you focus on what you're good at.

**Key differentiators**:
- **Dual-protocol**: MCP (Model Context Protocol) + A2A (Google Agent-to-Agent) — any AI agent can connect
- **Federation**: DiviDen instances talk to each other. Your agent communicates with agents on other instances via relays
- **Ambient intelligence**: Agents learn from interaction patterns and share anonymized insights across the network
- **Two revenue streams**: Agent Marketplace (97/3 split) + Job Board with contracts (93/7 split)
- **Self-hostable**: MIT licensed, everything runs locally, all platform fees can be set to 0%
- **Progressive Web App**: Installable on desktop/mobile from the browser

**Production URLs**:
- `dividen.ai` — primary custom domain
- `sdfgasgfdsgsdg.abacusai.app` — Abacus AI domain (both untagged, deploy once updates both)
- `os.dividen.ai` — **separate project** at `/home/ubuntu/dividen` (open-source docs/marketing site, needs its own conversation to edit)

**GitHub**: `Denominator-Ventures/dividen` (PAT stored in git remote, MIT License)

---

## 2. Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (shared dev/prod, `prisma migrate` not `db push`)
- **Auth**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS, dark theme
- **AI**: Abacus.AI LLM API (ABACUSAI_API_KEY)
- **Payments**: Stripe Connect Express + Stripe Elements
- **Email**: IMAP/SMTP integration + Abacus notification API
- **Package manager**: yarn only (never npm/npx)

### Design System
- Brand blue: `#4F7CFF` (primary), `#6B9AFF` (secondary)
- Background: `#0a0a0a` (base), `#111111` (surface)
- Text: `#f5f5f5` (primary), `#a1a1a1` (secondary), `#666666` (muted)
- Borders: `rgba(255,255,255,0.06)`
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (code/labels)

### Environment Variables
```
DATABASE_URL
NEXTAUTH_SECRET
ADMIN_PASSWORD=DiviDenAdmin2026!
ABACUSAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
MARKETPLACE_FEE_PERCENT=3
NOTIF_ID_CONNECTION_INVITATION
WEB_APP_ID
```

### Key Credentials
- **Admin**: `admin@dividen.ai` / `DiviDenAdmin2026!`
- **Test user**: `john@doe.com` / `johndoe123`
- **Jon's email**: `jon@fractionalventure.partners`

---

## 3. Application Structure

### Pages (Frontend)
| Route | Purpose |
|---|---|
| `/` | Landing page with feature grid, hero, download CTA |
| `/login` | Login with ToS reference |
| `/setup` | Account creation with ToS checkbox, deep-link invite support |
| `/dashboard` | Main 3-column command center (NOW panel / Center tabs / Queue+Activity) |
| `/dashboard/comms` | Comms channel — inter-agent communication view |
| `/settings` | User settings (profile, relay prefs, payments, notifications, install) |
| `/admin` | Admin dashboard with stats, user management, telemetry |
| `/updates` | Changelog/update posts (markdown-rendered, founder voice) |
| `/terms` | Terms of Service (14 sections, version-tracked) |
| `/docs/federation` | Federation protocol documentation |
| `/docs/integrations` | Integration guides |
| `/docs/release-notes` | Technical release notes |

### Dashboard Tabs (CenterPanel)
Chat, Kanban, Goals, Jobs, Contacts, Calendar, Inbox, Recordings, Drive, Extensions, Marketplace, Teams

### Dashboard Modes
- **Cockpit** (default): Full 3-column layout — NOW panel, center tabs, queue/activity
- **Chief of Staff**: Locked-down observer mode — queue progress, relay tracking, intervention controls, no full-site nav

### API Surface (~120 routes)
Complete REST API covering: auth, chat, queue, kanban, contacts, calendar, comms, connections, relays, goals, teams, projects, jobs, contracts, marketplace, stripe, federation (14 sub-endpoints), admin, telemetry, webhooks, MCP, A2A, briefs, extensions, recordings, documents, memory, notifications, entity resolution, profile, invites, search, v2 public API with shared chat.

---

## 4. Major Feature Areas

### AI Agent (Divi)
- 10-group consolidated system prompt (was 19 layers)
- Group 11: Business Operations Layer (dynamic — contracts, earnings, marketplace agents, reputation)
- Action tags for: queue management, kanban, contacts, calendar, relays (direct/broadcast/ambient), goals, jobs (post/find/complete/review), marketplace (list/execute/subscribe), federation intelligence (serendipity/briefing/routing), project dashboards, invites, profile updates
- Ambient relay learning system (signals → patterns → prompt → better behavior)
- Proactive intent detection and smart routing

### Federation Protocol
- Cross-instance agent communication via relays (direct, broadcast, ambient)
- Agent Card v0.3.0 at `/.well-known/agent-card.json`
- MCP Server v1.3.0 at `/api/mcp` (20 tools)
- A2A endpoint at `/api/a2a`
- Operational Playbook at `/api/a2a/playbook`
- Handoff Brief at `/api/main-handoff`
- Server Card at `/.well-known/mcp/server-card.json`
- OAuth Protected Resource at `/.well-known/oauth-protected-resource`
- Federation sub-endpoints: relay, connect/disconnect, jobs (gossip), apply, reputation, mcp, entity-search, patterns, graph, briefing, routing, project context, config, instances

### Agent Marketplace
- Browse, execute, rate, subscribe to AI agents
- List your own agent in 2 minutes
- Stripe Connect Express for developer payouts
- Destination charges — platform never holds funds
- 97/3 revenue split (configurable, self-hosted: 0%)
- Earnings dashboard: revenue hero, stats grid, per-agent breakdown
- Pricing models: free, per_task, subscription

### Network Job Board
- Post tasks with structured compensation (flat/hourly/weekly/monthly)
- AI matching engine (skill overlap 40%, task type 25%, availability 20%, reputation 15%)
- Proactive agent matching — Divi finds and applies to jobs for you
- Reputation system: 🌱 New → 📈 Rising → 🏛️ Established → 🛡️ Trusted → 👑 Exemplary
- Portable reputation with HMAC-signed attestations
- Job contracts with payment tracking
- 7% recruiting fee (configurable, self-hosted: 0%)
- Hire button, recurring payments, destination charges
- Earnings dashboard v2: agent earnings + job earnings side by side
- Federated job gossip (Phase B) — jobs propagate across instances

### Teams & Projects
- Team model with owner/admin/member roles
- Project model with lead/contributor/reviewer/observer roles
- Federated members via connectionId
- Visibility: private/team/open
- Project context assembler for cross-member dashboards
- Divi has project_dashboard action tag

### Orchestration (Kanban → Task → Route → Brief)
- Brief Assembly Engine reads card context graph
- Skill matching against connection profiles
- AgentBrief model stores routing receipts
- Action tags: task_route, assemble_brief

### Other Key Features
- **Activity Feed**: Universal event log across all surfaces
- **Dynamic NOW Engine**: Scores and ranks items by priority, deadline, impact, calendar gaps
- **PWA**: Installable desktop app with service worker, manifest.json, auto-updates
- **Outbound Invitations**: Email invites with deep-link signup
- **CRM**: Contacts with activity timelines, relationships, research/enrichment
- **Goals & Objectives**: Hierarchical goals with deadlines, progress tracking
- **Extensions Framework**: Installable agent skills/personas
- **Recordings**: Audio recording management
- **Documents/Drive**: File management
- **Global Search**: Cross-surface search
- **Guided Walkthrough**: New user onboarding tour
- **Dynamic OG Images**: `/api/og` generates social preview images per page
- **Telemetry**: Query-level database telemetry, admin dashboard

---

## 5. Database Schema (Key Models)

**Core**: User, Account, Session, VerificationToken  
**Work**: QueueItem, KanbanCard, KanbanChecklist, KanbanChecklistItem, Goal  
**People**: Contact, ContactRelationship, Team, TeamMember, Project, ProjectMember  
**Communication**: AgentRelay, Comm, Email, CalendarEvent, Notification, NotificationRule  
**Jobs**: NetworkJob, JobApplication, ReputationScore, JobReview, JobContract, JobPayment  
**Marketplace**: MarketplaceAgent, MarketplaceSubscription, MarketplaceExecution  
**Federation**: Connection, FederatedInstance, Invitation  
**AI/Intelligence**: Memory, AmbientRelaySignal, AmbientPattern, AgentBrief, AgentExtension  
**Infrastructure**: ServiceApiKey, AgentApiKey, Document, Recording, ActivityEvent, TelemetryEvent, WebhookConfig, WebhookLog, UserProfile

### Migrations Applied
```
0_baseline
20260409214946_add_telemetry_events
20260410000001_add_queue_item_id_to_relay
20260411_add_agent_marketplace
20260411_add_marketplace_revenue_split
20260411_add_portable_reputation
20260411_add_relay_threading_and_artifacts
20260411_add_terms_acceptance
```

---

## 6. What We Did This Session (April 11, 2026)

This was a massive session covering MCP registry prep, PWA, UI/UX, DX, protocol expansion, monetization, and content. Here's everything in chronological order:

### Phase 1: MCP Registry & Federation
1. **MCP Registry Submission Kit** — Created `public/mcp-registry/server.json` and `README.md` with copy-paste instructions for all 5 registries (Official, Smithery, PulseMCP, Glama, mcp.so)
2. **Server Card endpoint** — Built `/.well-known/mcp/server-card.json` dynamic route per MCP spec
3. **OAuth Protected Resource** — Built `/.well-known/oauth-protected-resource` for MCP auth discovery
4. **Smithery troubleshooting** — Debugged authentication errors, created server card, explored DNS verification options
5. **Federation Job Gossip (Phase B)** — Built `GET/POST /api/federation/jobs` for cross-instance job propagation with dedup
6. **GitHub push** — Established pull-rebase-push workflow for safe remote updates

### Phase 2: PWA & Desktop Experience
7. **PWA Implementation** — manifest.json, service worker registration, icons (192/512), meta tags, standalone mode
8. **Install Desktop link** — Added "Download" to top nav with beforeinstallprompt handling
9. **PWA height fixes** — Multiple iterations fixing chat area height in standalone mode (env safe-area-insets, flex-shrink-0)
10. **Service worker auto-update** — PWA refreshes on new deployments

### Phase 3: UI/UX Improvements
11. **Chief of Staff Mode overhaul** — Complete rewrite as locked-down observer cockpit with queue progress, relay tracking, intervention controls, pause/resume
12. **Guided Walkthrough** — Multi-step onboarding tour for new users
13. **Dynamic OG images** — `/api/og` endpoint generating social preview images with Satori
14. **Landing page updates** — Feature grid updates, PWA install banner, Download CTA, corrected stats
15. **Update badge** — Notification badge on Updates nav link (resets at midnight Central Time)
16. **Dashboard height** — Removed fixed heights, dynamic viewport with mobile PWA spacing

### Phase 4: Developer Experience
17. **DX Overhaul** (from community member Robert's feedback):
    - `scripts/setup.sh` — one-command setup (deps, env, db, migrations, seed)
    - `docker-compose.yml` — local Postgres
    - `scripts/validate-env.ts` — environment validation
    - `.env.example` — complete with documentation
    - `README.md` rewrite
    - `GET /api/status` — health check endpoint
    - Root-level LICENSE, README.md, .nvmrc copies

### Phase 5: Protocol Expansion (FVP Integration Brief)
18. **14 FVP Proposals implemented** across 4 tiers:
    - **Tier 1 (Foundation)**: Webhook push, relay threading, structured artifacts, agent card v0.3.0, universal entity resolution
    - **Tier 2 (Federation Jobs)**: Federated job broadcast/application routing, portable reputation with HMAC attestations
    - **Tier 3 (Cross-Instance)**: Remote MCP tool invocation, agent-initiated task exchange, federated entity search
    - **Tier 4 (Intelligence)**: Shared ambient learning patterns, graph topology matching (serendipity engine), composite cross-instance prompts, network-level task routing
19. **2 Prisma migrations**: relay threading + portable reputation
20. **New action tags**: accept_invite, decline_invite, list_invites, complete_job, review_job, list_marketplace, execute_agent, subscribe_agent, serendipity_matches, network_briefing, route_task
21. **System prompt Group 11**: Business Operations Layer (dynamic)

### Phase 6: Monetization
22. **Agent Marketplace Phase 2** — Stripe Connect Express, saved payment methods, destination charges, webhook handler, 97/3 split
23. **Marketplace Earnings Dashboard** — Revenue hero, stats grid, per-agent breakdown, recent activity
24. **Monetization CTAs** — Banners after importing extensions/accepting connections, gradient CTAs in QueuePanel and Comms
25. **Terms of Service** — 14-section ToS at `/terms`, signup checkbox, login reference, version tracking
26. **Job Recruiting Monetization** — Structured compensation, JobContract/JobPayment models, hire button, recurring payments, 7% recruiting fee, destination charges, live fee preview
27. **Earnings Dashboard v2** — Two streams: agent earnings + job earnings

### Phase 7: Content & Polish
28. **11 update posts written** for `/updates` page in founder voice
29. **Claude model fix** — Updated retired `claude-sonnet-4-20250514` to `claude-sonnet-4-6` in llm.ts
30. **Privacy cleanup** — Removed Robert's name from update #14, removed FVP command center URL from all site content
31. **os.dividen.ai audits** — Two comprehensive audits produced as markdown docs with specific change lists
32. **Update post consolidation** — Merged redundant posts (6→3, then rewrote 2 completely for better energy)
33. **Marketplace language cleanup** — Ensured "marketplace" only appears in agent marketplace context, not job board
34. **Multiple GitHub pushes** — Using pull-rebase-push workflow

---

## 7. Current Update Posts on `/updates` (Newest First)

1. **Divi Now Sees Everything** — Full platform awareness, job preferences, invites via chat
2. **Your Agent Makes Money While You Sleep** — Agent Marketplace with 97/3 split, first earnings dashboard
3. **FVP Integration Brief** — 14 proposals, 4 tiers, MCP server v1.3.0 (20 tools)
4. **Developer Experience Overhaul** — One command to running, Docker, health checks
5. **The Activity Feed Is Now the Universal Event Log** — Every action, one timeline
6. **Chief of Staff Mode** — Observer cockpit, intervention controls
7. **Install DiviDen on Your Desktop** — PWA + Smithery submission
8. **The Network Now Pays You** — Jobs with contracts, earnings dashboard v2, 7% recruiting fee
9. **12 Extension Proposals, One Session** — FVP contribution, all 12 DEPs
10. **Hardening the Protocol, Opening the Repo** — Security, performance, open source
11. **Goals, the Dynamic NOW Engine, and a Leaner Brain** — Goals system, NOW scoring, prompt consolidation
12. **Federation Project Context and the Extensions Framework** — Remote project dashboards, agent extensions
13. **Teams, Projects, and Cross-Member Awareness** — Teams/projects with visibility rules

---

## 8. Known Issues & Outstanding Items

### os.dividen.ai (Separate Project)
Two audits were produced this session. Key remaining fixes:
- Terminal command on homepage needs updating to `bash scripts/setup.sh`
- "Export" claim in Systems section needs removal
- 5 missing API endpoints need adding to the docs page
- Changelog needs updating with recent pushes
- Several count discrepancies (tools, stages) need correcting

### MCP Registry Submissions
All 5 registries still NOT submitted:
- **Smithery**: Attempted, deleted, needs re-publish (username: `jon-81d7`)
- **PulseMCP**: Web form at pulsemcp.com/submit
- **Glama**: Web form at glama.ai/mcp/servers
- **mcp.so**: GitHub issue
- **Official MCP**: Fork registry repo, submit PR (needs DNS TXT verification)

### Code Notes
- `claude-sonnet-4-6` is the current model in `src/lib/llm.ts`
- MCP server reports 20 tools (not 22 — corrected in FVP brief)
- Database is shared dev/prod — be careful with data changes
- All schema changes must be backward-compatible (never `--accept-data-loss`)
- Federation intelligence functions (serendipity, network briefing, task routing) have basic implementations with stubs for advanced features

---

## 9. Important Rules & Preferences

### Jon's Preferences
- **Tone**: Builder-log, technical but accessible, direct, no fluff
- **Updates**: Written in founder voice, signed `— Jon`
- **Privacy**: Never share Robert's full name or FVP command center URL (`cc.fractionalventure.partners`)
- **Timezone**: America/Chicago (Central Time)
- **Git workflow**: Always pull-rebase-push (never force push, never overwrite remote changes)

### Technical Rules
- Never use `db push` — always `prisma migrate`
- Never use npm/npx — always yarn
- Never scaffold new projects — edit within existing directory
- NEXTAUTH_URL is auto-configured by Abacus AI — don't set it manually
- Database shared between dev and prod — don't delete/overwrite records unless essential
- All fees configurable to 0% for self-hosted instances

---

## 10. File Structure Quick Reference

```
nextjs_space/
├── src/
│   ├── app/                    # Pages + API routes
│   │   ├── api/                # ~120 API routes
│   │   ├── dashboard/          # Main command center
│   │   ├── admin/              # Admin dashboard
│   │   ├── updates/            # Changelog page
│   │   ├── terms/              # Terms of Service
│   │   ├── docs/               # Federation, integrations, release notes
│   │   ├── settings/           # User settings
│   │   └── .well-known/        # Agent card, MCP server card, OAuth
│   ├── components/
│   │   ├── dashboard/          # All dashboard view components
│   │   ├── landing/            # Landing page
│   │   ├── layouts/            # Layout components
│   │   └── ui/                 # Shared UI primitives
│   ├── lib/
│   │   ├── system-prompt.ts    # AI agent system prompt (10 groups + conditional layers)
│   │   ├── action-tags.ts      # All executable action tags
│   │   ├── brief-assembly.ts   # Brief assembly + skill matching
│   │   ├── entity-resolution.ts # Entity resolution + serendipity
│   │   ├── updates.ts          # All update posts (1325 lines)
│   │   ├── now-engine.ts       # Dynamic NOW scoring
│   │   ├── ambient-learning.ts # Ambient relay learning
│   │   ├── recruiting-config.ts # Recruiting fee config
│   │   ├── marketplace-config.ts # Marketplace fee config
│   │   ├── activity.ts         # Activity logging helper
│   │   ├── prisma.ts           # Prisma singleton with telemetry
│   │   ├── llm.ts              # LLM API integration
│   │   ├── auth.ts             # NextAuth options
│   │   ├── webhook-push.ts     # Webhook push events
│   │   ├── relay-queue-bridge.ts # Relay↔Queue sync
│   │   ├── task-exchange.ts    # Agent-initiated task exchange
│   │   └── federation/         # Pattern sharing, graph matching, composite prompts, task routing
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # 8 migrations
├── scripts/
│   ├── setup.sh                # One-command setup
│   ├── seed.ts                 # Database seeding
│   └── validate-env.ts         # Environment validation
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── mcp-registry/           # MCP registry submission kit
│   └── icons/                  # PWA icons
└── .env                        # Environment variables
```

---

This document should give a new conversation complete context to continue building DiviDen without losing any decisions, patterns, or progress from this session.
