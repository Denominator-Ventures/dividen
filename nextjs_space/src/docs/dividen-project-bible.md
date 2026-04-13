# DiviDen Command Center — Project Bible

**Last updated:** April 12, 2026  
**HEAD commit:** `4b34916`  
**Deployed at:** dividen.ai + sdfgasgfdsgsdg.abacusai.app (both untagged)  
**Git remote:** `https://github.com/Denominator-Ventures/dividen.git` → branch `main`  
**OS site:** os.dividen.ai (separate deployment, reads from same `/api/v2/updates` feed)

---

## 1. What DiviDen Is

DiviDen is an **open-core AI-powered command center** — a shared workspace where a human operator and an AI agent ("Divi") coordinate through:

- A **kanban board** (10-stage deal/project pipeline)
- A **task queue** (dispatch work to AI or humans)
- A **CRM** (contacts with relationship mapping)
- A **relay protocol** (agent-to-agent communication across instances)
- **Structured chat** with 53 executable action tags

**Philosophy:** Individual-first. DiviDen is a powerful tool for one person to run their entire work life. Teams, federation, and marketplace are network effects that layer on top — not the core value prop.

**Tagline:** "The last interface you'll ever need."

**Open core model:**
- **Engine** = MIT-licensed. Self-host it, inspect every line.
- **Network features** (marketplace, federation discovery, team plans, network fee enforcement) = managed platform at dividen.ai.

---

## 2. How This Instance Fits the Network

The codebase at `/home/ubuntu/dividen_command_center` is deployed as the **managed platform** at **dividen.ai**. It serves as:

1. **The primary production instance** — the hosted DiviDen platform that users sign up for
2. **The network hub** — self-hosted instances register with this instance via `POST /api/v2/federation/register` and receive a `platformToken`
3. **The marketplace host** — all network marketplace transactions route through this instance for fee enforcement (3% floor)
4. **The federation directory** — `InstanceRegistry` model tracks all connected instances; discoverable ones appear in the Find People tab alongside local users
5. **The updates feed source** — `GET /api/v2/updates` serves the public changelog that os.dividen.ai reads

**Network topology:**
```
┌─────────────────────────┐
│  dividen.ai (this)       │ ◄── The Hub
│  - User accounts         │
│  - Marketplace           │
│  - Federation registry   │
│  - Fee enforcement       │
│  - Network discovery     │
└────────┬────────────────┘
         │ Relay Protocol + Federation APIs
    ┌────┴────┐     ┌────┴────┐
    │ Self-   │     │ Self-   │
    │ hosted  │     │ hosted  │
    │ inst. A │◄───►│ inst. B │
    └─────────┘     └─────────┘
      (can also relay directly P2P)
```

---

## 3. Technical Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM (60 models) |
| Auth | NextAuth.js (credentials provider) |
| Styling | Tailwind CSS + CSS variables |
| Fonts | Space Grotesk (headings), Inter (body), JetBrains Mono (code) |
| Colors | Brand blue `#4f7cff`, dark theme `#050505` base |
| File storage | AWS S3 (presigned URLs, cloud-only — no local files) |
| Payments | Stripe Connect (Express onboarding) |
| Protocols | A2A v0.4, MCP v1.5.0, DAWP/0.1, Agent Card v0.4.0 |
| PWA | Service worker, installable, auto-updates |
| Package manager | **yarn only** (never npm/npx) |
| DB migrations | `yarn prisma db push` only (never `--accept-data-loss` without explicit user consent) |

---

## 4. Architecture

### 4.1 Dashboard Layout

3-column layout: **NOW** (left) | **Center** (main) | **Queue + Comms** (right)

**Primary tabs** (Center panel): Chat · CRM · Calendar · Inbox · Recordings  
**Network tabs**: Discover · Connections · Teams · Jobs · Marketplace · Federation Intel  
**Right panel tabs**: Queue · Comms (relay log)

**Removed from top row:** Board, Extensions, Capabilities/Signals, Goals  
**Board** → accessible via 📋 button in NowPanel  
**Goals** → optional, toggled in Settings → Your Divi  
**Earnings** → conditional widget in NowPanel (visible when marketplace/job activity exists)  
**Mode toggle** (Cockpit/Chief of Staff) → workspace strip between header and content

### 4.2 System Prompt Architecture

13 prompt groups assembled dynamically:

| # | Group | Notes |
|---|-------|-------|
| 1 | Identity, Rules & Time | Hardcoded personality (chief of staff) + operator rules |
| 2 | Active State | Board, queue, goals snapshot |
| 3 | Conversation | Chat history (50 msg context window) |
| 4 | People | CRM + user profiles |
| 5 | Memory & Learning | Explicit facts, behavioral rules, patterns, ambient |
| 6 | Calendar & Inbox | Events + email triage |
| 7 | Capabilities & Action Tags | 53 action tags + capability configs |
| 8 | Connections & Relay | Core protocol layer |
| 9 | Extensions | Conditional — skip if none installed |
| 10 | Platform Setup | Conditional — compact if setup complete |
| 11 | Business Operations | Jobs, contracts, marketplace, recordings, reputation |
| 12 | Team Agent Context | Conditional — only if user is in teams with agents |
| 13 | Active Capabilities | Conditional — only if capabilities configured |

### 4.3 Action Tags (53)

Divi embeds `[[tag_name:params]]` in responses. The parser (`action-tags.ts`) extracts and executes them against the database. Tags cover: card CRUD, queue dispatch, CRM updates, goal management, relay sending, marketplace operations, job posting, memory writes, capability actions, and more.

### 4.4 Smart Triage (Task-First)

- **Cards = Projects** (containers), **Checklist Items = Tasks** (atomic work)
- Auto-merge: ON by default. Levenshtein ≥80% on card titles → merge instead of creating duplicates
- Due date discipline: Every task gets a due date (inferred or suggested by priority)
- Delegation: `self` / `divi` / `delegated` (routed to another user's agent via relay)

### 4.5 Signals & Catch Up

6 built-in signals: Email, Calendar, Recordings, CRM, Drive, Connections  
Custom signals via webhooks  
Catch Up: respects per-signal priority order and inclusion toggles  
Quick signal dropdown: gear icon next to Catch Up button → drag-reorder + checkboxes

### 4.6 Connections (Redesigned This Session)

3 tabs:
- **Find People** — search local + federated instances. Source badges. Default landing.
- **My Connections** — active, incoming requests, outbound pending
- **Relays** — relay history

No local/federated toggle. Federation hidden behind collapsible in Connect by Email.  
Federated instances from `InstanceRegistry` appear in Find People with "self-hosted" badge.

### 4.7 Peer Profile Modal (New This Session)

Click any name/avatar in Connections → full profile modal with:
- **Profile tab** — routing manifest (bio, skills, experience, values, availability)
- **Us tab** — shared context (mutual teams, projects, conversation stats, relay history)
- Connect button in modal

### 4.8 Two-Tier Fee Model

- **Internal** (same instance): Configurable by operator. Env vars `MARKETPLACE_FEE_PERCENT`, `RECRUITING_FEE_PERCENT`.
- **Network** (cross-instance): Enforced minimums — 3% marketplace, 7% recruiting. Validated by `POST /api/v2/federation/validate-payment`.

### 4.9 Key API Surface

175 API routes total. Key ones:

| Endpoint | Purpose |
|----------|---------|
| `/api/chat/send` | Main chat with action tag execution |
| `/api/v2/queue` | Agent task queue |
| `/api/v2/shared-chat/stream` | SSE real-time feed |
| `/api/main-connect` | Agent connection ceremony |
| `/api/main-handoff` | Handoff brief for agents |
| `/api/mcp` | MCP v1.5.0 server (22+ tools) |
| `/api/a2a` | A2A v0.4 endpoint |
| `/api/a2a/playbook` | Operational playbook |
| `/api/v2/federation/*` | Federation registration, heartbeat, marketplace linking |
| `/api/v2/updates` | Public changelog feed |
| `/api/marketplace/*` | Browse, execute, subscribe, earnings |
| `/api/jobs/*` | Job board, matching, contracts |
| `/api/stripe/*` | Stripe Connect onboarding, payments |
| `/api/relays/*` | Relay send, threads, counts |
| `/api/profile/photo` | S3 presigned upload for profile photos |

---

## 5. Divi Personality & Configuration

- **Identity:** High-agency chief of staff — leverage, incentives, sequencing, signal vs noise, asymmetric upside
- **Agent name:** Configurable via `diviName` (User model), defaults to "Divi"
- **Working Style dials** (1-5 each): Verbosity (default 3), Proactivity (4), Autonomy (3), Formality (2)
- **Triage settings:** autoMerge (default true), autoRouteToBoard (false), triageStyle (task-first/card-per-item/minimal)
- **Goals:** Optional, toggled in Settings → Your Divi
- **Settings UI:** Settings → "🤖 Your Divi" tab

---

## 6. Key Files & Locations

| File | What |
|------|------|
| `src/lib/system-prompt.ts` | 13-group dynamic system prompt builder |
| `src/lib/action-tags.ts` | 53 action tag parser/executor |
| `src/lib/signals.ts` | Signal definitions + catch-up prompt builder |
| `src/lib/marketplace-config.ts` | Two-tier marketplace fee logic |
| `src/lib/recruiting-config.ts` | Two-tier recruiting fee logic |
| `src/lib/landing-data.ts` | Landing page data (features, protocol layers, stats) |
| `src/lib/updates.ts` | Changelog entries (builder-log voice) |
| `src/lib/prisma.ts` | Singleton Prisma client with telemetry |
| `src/lib/llm.ts` | LLM provider abstraction (OpenAI/Anthropic) |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/aws-config.ts` | S3 configuration |
| `src/lib/s3.ts` | S3 utilities (presigned upload, URLs, delete) |
| `src/lib/free-tier.ts` | Free tier limits (not yet consumed) |
| `src/app/dashboard/page.tsx` | Main dashboard orchestrator |
| `src/components/dashboard/NowPanel.tsx` | NOW engine (left panel) |
| `src/components/dashboard/CenterPanel.tsx` | Tab router (center) |
| `src/components/dashboard/QueuePanel.tsx` | Queue + Comms (right panel) |
| `src/components/dashboard/ConnectionsView.tsx` | Connections 3-tab view |
| `src/components/dashboard/PeerProfileModal.tsx` | Profile modal with Us tab |
| `src/components/dashboard/CatchUpQuickMenu.tsx` | Quick signal dropdown |
| `src/components/dashboard/ChatView.tsx` | Chat interface |
| `src/components/landing/LandingPage.tsx` | dividen.ai landing page |
| `src/docs/os-dividen-ai-audit-v2.md` | Full os.dividen.ai copy audit |
| `prisma/schema.prisma` | 60 Prisma models |
| `scripts/seed.ts` | Seed script (admin + test users) |

---

## 7. Environment & Credentials

### Env vars (in `.env`)
- `DATABASE_URL` — shared between dev and prod
- `NEXTAUTH_SECRET` — auto-managed by Abacus
- `ABACUSAI_API_KEY` — for LLM APIs
- `ADMIN_PASSWORD` — admin dashboard access
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Stripe Connect
- `AWS_REGION` / `AWS_BUCKET_NAME` / `AWS_FOLDER_PREFIX` — S3 storage
- `MARKETPLACE_FEE_PERCENT` — internal marketplace fee
- `NOTIF_ID_CONNECTION_INVITATION` — email notification type ID

### Test accounts
- **Admin:** `admin@dividen.ai` / (see `.env` or seed script)
- **Test user:** `john@doe.com` / (see `.env` or seed script)
- **Admin page:** `/admin` with `ADMIN_PASSWORD` env var

### Deployment
- **Hostnames:** `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged — one deploy updates both)
- **Git:** Always reset `.abacus.donotdelete` before commit. Pull-rebase before push.
- **NEXTAUTH_URL:** Auto-set by Abacus per environment. Never set manually.

---

## 8. Constraints & Rules

1. **yarn only** — never npm/npx
2. **Prisma `db push` only** — never `--accept-data-loss` without explicit confirmation
3. **Git discipline:** Reset `.abacus.donotdelete` before every commit. Pull-rebase before push.
4. **No local file storage** — all uploads go to S3 via presigned URLs
5. **Database shared between dev and prod** — be careful with data mutations
6. **BYOK** — both self-hosted and managed platform require users to bring their own LLM API keys
7. **No sidebar** — the dashboard has no sidebar and never has
8. **Hero H1 is locked** — "The last interface you'll ever need." — Jon explicitly prefers this
9. **Builder-log tone** — updates and copy are technical, direct, no fluff

---

## 9. os.dividen.ai — Separate Site

os.dividen.ai is a **separate deployment** from dividen.ai. It serves as the open-source project's marketing and documentation site.

**Pages:**
- `/` — Homepage ("You don't need a boss. You need a system.")
- `/docs` — Protocol specification (rendered from `/app/docs/*` routes in this codebase)
- `/open-source` — Open core comparison table, build phases, architecture
- `/updates` — Changelog wall (reads from `GET /api/v2/updates` or rendered from `src/lib/updates.ts`)

**PLATFORM** and **GET STARTED** nav links point to dividen.ai.

**Current audit status:** Full audit completed April 12, 2026 — see `src/docs/os-dividen-ai-audit-v2.md`. Summary of needed corrections:
- 12 → 13 prompt groups (~8 occurrences)
- 44 → 53 action tags (~10 occurrences)
- 55 → 60 Prisma models (~3 occurrences)
- MCP v1.4.0 → v1.5.0 (~5 occurrences)
- Agent Card v0.3.0 → v0.4.0 (~3 occurrences)
- Remove "Platform provides LLM keys automatically" — both are BYOK
- Remove "can be 0%" fee language (~4 occurrences)
- Remove Extensions from PLATFORM feature list

---

## 10. What We Built This Session

### Session Date: April 12, 2026
### Commits (chronological):

#### 1. Divi Personality & Tab Reorganization (`7c3574c`)
- Rewrote system prompt Group 1 with full personality (chief of staff identity)
- Working Style dials (4 dimensions, 1-5 scales) dynamically injected into prompt
- Agent naming (`diviName` field, defaults to "Divi")
- Auto-merge default ON, configurable triage settings
- Dashboard tab reorganization: Primary (Chat, CRM, Calendar, Inbox, Recordings), Network (Discover, Connections, Teams, Jobs, Marketplace, Federation Intel)
- Comms redesigned as relay log (replaced Activity tab)
- Goals made optional (off by default)
- Board moved to 📋 button in NowPanel
- New Settings → "Your Divi" tab

#### 2. Two-Tier Fees & Comms Overhaul (`2594d1f`)
- Internal vs network fee model with configurable rates and enforced floors
- `marketplace-config.ts` and `recruiting-config.ts` with `isNetworkTransaction` flag
- `POST /api/v2/federation/validate-payment` endpoint
- Comms tab in QueuePanel showing relay threads
- Activity stream moved to bottom of NowPanel

#### 3. Agent Passwords, Persistent Threads & A2A v0.4 (`058bc31`)
- `MarketplaceAgent.accessPassword` — share password for free agent access
- Chat context window bumped to 50 messages
- Soft-clear conversations (timestamps, not deletion)
- A2A v0.4 with `marketplacePasswordAccess` and `persistentConversation` capabilities
- MCP v1.5 with `marketplace_browse` and `marketplace_unlock` tools

#### 4. Profile View, Photo Upload, Chat Improvements (`caaccf0`)
- Dedicated ProfileView component in dashboard (Preview + Edit modes)
- S3 presigned upload for profile photos
- `User.profilePhotoUrl` field
- Chat personalization: `diviName` in header/placeholder/avatars, user photos in bubbles
- Context-aware empty state (API key detected → engagement prompts)

#### 5. Landing Page Fixes & os.dividen.ai Corrections (`801e49a`)
- 13 prompt groups, 53 action tags in `landing-data.ts`
- Removed Extensions from features
- Fee copy corrections
- Created `src/docs/os-dividen-ai-corrections.md` (v1)
- Updates wall entry: "Signals, Capabilities, and the Full Loop"

#### 6. Connections View Redesign (`bbbdfb7`)
- 3 tabs: Find People, My Connections, Relays
- Removed local/federated toggle
- `/api/directory` now includes federated `InstanceRegistry` entries
- Federated results show source badges, deep-link to originating instance
- Federation hidden behind collapsible in Connect by Email

#### 7. Peer Profile Modal (`558fc8c`)
- New `PeerProfileModal.tsx` component (~310 lines)
- Click any name/avatar in Connections → full profile modal
- Profile tab (routing manifest) + Us tab (shared context)
- Connect button in modal
- Replaced old inline profile peek

#### 8. Catch-Up Button Restyle & Quick Signal Menu (`8943c29`)
- Catch-Up button restyled to match Search button appearance
- Gear icon toggles `CatchUpQuickMenu` dropdown (drag-reorder + checkboxes)
- Mode toggle (Cockpit/CoS) moved from header into workspace strip

#### 9. Full os.dividen.ai Audit (`81b6d39`)
- Browsed every page: homepage, /open-source, /docs, /updates
- Created `src/docs/os-dividen-ai-audit-v2.md` with 31 items
- Discovered os.dividen.ai is a separate deployment (different hero copy)
- Documented ground truth: 13 groups, 53 tags, 60 models, MCP v1.5.0, Agent Card v0.4.0

#### 10. Updates Wall Entry (`4b34916`)
- "Connections Redesign, Peer Profiles & The Catch-Up Menu" entry added to `src/lib/updates.ts`
- Covers all 4 features from commits 6-8

---

### Earlier This Session (from prior conversation parts):

- **KanbAIn** — Smart triage with task-first architecture, card merging, due date discipline
- **Delegation model** — assignee types (self/divi/delegated), contributor vs related people
- **Signals framework** — 6 built-in signals, custom webhook signals, triage prompts
- **Capabilities system** — email/meetings/custom with setup wizards and outbound actions
- **Catch Up settings** — drag-reorder priority, per-signal toggles
- **Smart triage prompts** — editable per signal, artifact linking
- **API key persistence** — consistency fix
- **Inline onboarding** — API key form in chat

---

## 11. What Needs Doing Next

### Immediate
1. **Apply os.dividen.ai corrections** — The audit doc (`os-dividen-ai-audit-v2.md`) has 31 items. The os site is a separate deployment, so changes there need to be made wherever that site is deployed from.
2. **Deploy** — Current checkpoint is built and pushed to git but not deployed to dividen.ai.

### Open Architecture Items
- Free tier enforcement (`isFreeUser` field + `free-tier.ts` exist but aren't consumed yet)
- Google Calendar sync (integration account + API routes exist, needs OAuth setup)
- Gmail inbox triage (same — integration infrastructure exists)
- Meeting transcription webhooks (endpoint exists, needs transcription service config)
- Recordings playback (model exists, needs file upload integration)
- Drive/document management (model exists, needs UI)
- Desktop notifications (infrastructure exists, needs permission prompt UX)

### Network Features
- Federation health dashboard in admin
- Cross-instance pattern sharing (ambient learning exchange)
- Serendipity graph matching
- Network briefing aggregation
- 7-signal task routing

---

## 12. Pricing (Managed Platform)

| Plan | Price | Includes |
|------|-------|----------|
| Individual | Free | Full engine, BYOK, internal marketplace/jobs |
| Team Starter | $29/mo | 5 members, 3 projects, basic teams |
| Team Pro | $79/mo + $9/seat | Team agent, spending policies, unlimited |
| 14-day Pro trial | Free | Full Pro features |

---

## 13. How to Continue This Conversation

When starting a new Deep Agent conversation:

1. **Reference this file** — Upload or paste the relevant sections of this bible
2. **Key context to provide:**
   - Project path: `/home/ubuntu/dividen_command_center`
   - Git remote: `https://github.com/Denominator-Ventures/dividen.git` (branch `main`)
   - Constraints: yarn only, Prisma `db push` only (no `--accept-data-loss`), reset `.abacus.donotdelete` before commits
   - Deployed at: dividen.ai + sdfgasgfdsgsdg.abacusai.app (both untagged)
   - Credentials: see `.env` file and `scripts/seed.ts`
3. **Tell the agent to read `.project_instructions.md`** — it has the full accumulated context
4. **The os.dividen.ai audit** is at `src/docs/os-dividen-ai-audit-v2.md` if corrections need applying
5. **Updates wall** entries go in `src/lib/updates.ts` — newest at top, builder-log voice, with id/date/time/title/subtitle/tags/content

---

*Built by Jon (Denominator Ventures). Powered by DiviDen. Documented for continuity.*