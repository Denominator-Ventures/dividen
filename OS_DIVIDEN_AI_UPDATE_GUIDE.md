# os.dividen.ai — Complete Update Guide

**Author:** Generated from platform audit on April 11, 2026  
**Purpose:** Detailed instructions for updating every page of os.dividen.ai to reflect the current state of the DiviDen platform (dividen.ai) and open-source project.  
**Context:** The platform has undergone 7+ phases of development since the last os.dividen.ai update. The philosophical framing has shifted from "protocol-first" to "individual-first, open core." This document covers every page, every section, and every line that needs to change.

---

## Table of Contents

1. [Global Changes (All Pages)](#1-global-changes-all-pages)
2. [Homepage (os.dividen.ai/)](#2-homepage)
3. [Docs Landing (os.dividen.ai/docs)](#3-docs-landing)
4. [Docs: Architecture](#4-docs-architecture)
5. [Docs: Action Tags](#5-docs-action-tags)
6. [Docs: Federation](#6-docs-federation)
7. [Docs: Integrations](#7-docs-integrations)
8. [Docs: Release Notes](#8-docs-release-notes)
9. [Open Source Page](#9-open-source-page)
10. [Updates Page](#10-updates-page)
11. [New Pages to Create](#11-new-pages-to-create)
12. [Self-Hosted Integration Improvements](#12-self-hosted-integration-improvements)
13. [Visual/Design Updates](#13-visual-design-updates)

---

## 1. Global Changes (All Pages)

### Navigation Bar

**Current:** Links to Docs, Open Source, GitHub, Updates  
**Change to:** Links to Platform, Docs, Open Source, Updates, GitHub (icon only)

- **Add "Platform" link** → points to `https://dividen.ai` — this should be the most prominent nav item
- **Keep "Docs"** → `/docs`
- **Keep "Open Source"** → `/open-source`
- **Keep "Updates"** → `/updates` (should sync with dividen.ai/updates feed)
- **GitHub** → Change from text link to a GitHub icon/badge, less prominent
- **Add CTA button** in nav: "Get Started" → `https://dividen.ai/setup`

### Footer

**Current tagline:** "The Agentic Working Protocol" (or similar)  
**Change to:** "Your AI Command Center — Open Core"

**Update footer links to include:**
- Platform → `https://dividen.ai`
- Docs → `/docs`
- Open Source → `/open-source`
- Updates → `/updates`
- GitHub → `https://github.com/Denominator-Ventures/dividen`
- Terms → `https://dividen.ai/terms`
- © 2026 Denominator Ventures

### Version Badge

**Current:** v2.1 (or similar)  
**Change to:** Remove specific version number. Replace with: "Continuously shipped — see [Updates](/updates) for the latest."

Rationale: We ship multiple times per day. A version number is misleading.

### Meta / SEO

**Update all page titles to format:** `Page Name | DiviDen — Open Core AI Command Center`  
**Update meta descriptions** to reflect individual-first positioning.

---

## 2. Homepage

### Hero Section

**Current:** Likely "You don't need a boss. You need a system." with open-source-first framing  
**Keep the headline** — it's strong and aligns with individual-first philosophy.

**Change subhead to:**
> DiviDen is an AI-powered command center for individuals. Your agent learns how you work, handles what it can, and surfaces only what needs you. The more you connect, the more it compounds.

**Change primary CTA from** "View on GitHub" or "Get Started (self-host)"  
**To two CTAs:**
1. **Primary:** "Try the Platform" → `https://dividen.ai/setup` (filled button, brand color)
2. **Secondary:** "Self-Host It" → `https://github.com/Denominator-Ventures/dividen` (outline button)

**Add a line below CTAs:**
> Open core. MIT-licensed engine. Managed platform with marketplace, teams, and federation.

### "What Is DiviDen" / Manifesto Section

**Current framing:** Protocol-first, developer-first  
**Update to individual-first framing:**

Replace or update the manifesto copy to emphasize:

1. **The Core Loop:** Connect tools → Divi learns → compound time savings
2. **Not just chat:** 44 action tags — you work *through* Divi, not alongside it
3. **The Brief:** Every decision shows its work. Full transparency.
4. **The Network (secondary):** When you're ready — marketplace, teams, federation

### Feature List / Cards

**Current state on os.dividen.ai is outdated.** Replace the entire feature section with these tiers:

#### Tier 1 — Core (Always Visible)

| Feature | Description |
|---------|-------------|
| **12-Group Agent Intelligence** | Divi reasons across 12 consolidated prompt groups — identity, goals, connections, memory, tools, calendar, inbox, capabilities, extensions, platform setup, business operations, and team context. Full context on every decision. |
| **Goals & Dynamic NOW Engine** | Define objectives, track progress, and let the NOW Engine rank what matters most right now — across goals, queue items, calendar events, and relays. |
| **44 Action Tags** | Not just chat. 44 executable actions via natural conversation: create goals, dispatch tasks, assemble briefs, manage contacts, post jobs, install agents, route work, send relays — all from chat. |
| **The Brief — Show Your Work** | Every agent decision generates a reasoning brief. Full transparency on what context was assembled, who was matched, and why. The handshake contract between human and agent. |

#### Tier 2 — Platform (Expandable)

| Feature | Description |
|---------|-------------|
| **Agent Marketplace** | Discover and execute AI agents built by other developers. List your own and earn 97% of every transaction. Install/uninstall lifecycle. Earnings dashboard. |
| **Network Discovery** | Browse people, teams, agents, and jobs across the entire network. Faceted filtering by skills, categories, availability. |
| **Rich Profile Pages** | Routing manifests, not résumés. Skills, capacity badges, reputation levels, superpowers, availability — everything agents need to make routing decisions. |
| **CRM + Relationship Mapping** | Full contact management with activity timelines, relationship types (colleague, manager, partner, friend), and cross-surface entity resolution. |
| **Teams & Projects** | Persistent teams with federated member support. Projects with scoped visibility. Team subscriptions: Starter ($29/mo, 5 members, 3 projects) or Pro ($79/mo + $9/seat, 10+ members, unlimited). |
| **Jobs, Contracts & Payments** | Post jobs to the network. Hire with flat, hourly, weekly, or monthly rates. Manage contracts. Get paid through Stripe. |
| **Ambient Relay Protocol** | Direct, broadcast, and ambient relay modes. Every ambient interaction teaches the protocol — it learns timing, phrasing, and topics that work, getting less disruptive with every exchange. |
| **Federation** | Cross-instance communication via DAWP. No shared database. No vendor lock-in. Your instance, your data. |
| **Extensions Framework** | Installable skills and personas that extend what your Divi can do. Three types: skill, persona, prompt_layer. Scoped to user, team, project, or global. |
| **Comms — Agent Relay Channel** | Where your Divi communicates with other agents. Relays, marketplace dispatches, cross-agent coordination — not for human-to-Divi chat. That's the Chat tab. |

#### Tier 3 — Infrastructure (Collapsed)

| Feature | Description |
|---------|-------------|
| **Rate Limiting** | Sliding-window rate limiter on auth (10/min), execution (20/min), federation (30/min), general (60/min). |
| **Security Headers** | X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy on every response. |
| **Agent Versioning** | Semantic versioning with changelogs on marketplace agents. |
| **Telemetry & Admin** | Request logging, error tracking, admin dashboard with batched analytics. |
| **Federation Intelligence** | Cross-instance pattern sharing, entity search, reputation queries, graph intelligence. |
| **Webhook System** | Configurable webhooks with AI-powered field mapping auto-learn. |
| **A2A Protocol Bridge** | Agent-to-Agent communication for external LLM agents. |
| **MCP Server** | Model Context Protocol endpoint for tool-use integration. |
| **Agent API v2** | RESTful API with full OpenAPI spec for external integrations. |

### Kanban / Pipeline Section

**Current:** Shows basic statuses  
**Update to full pipeline:**

```
Leads → Qualifying → Proposal → Negotiation → Contracted → Active → Development → Planning → Paused → Completed
```

That's 10 stages now, not the original 5-6.

### Architecture Diagram

**Current:** Likely outdated ASCII diagram  
**Replace with updated diagram showing:**

```
┌─────────────────────────────────────────────────────┐
│                    DiviDen Platform                   │
├──────────┬──────────┬──────────┬────────────────────┤
│   NOW    │  CENTER  │  QUEUE   │      COMMS         │
│  Engine  │  Panel   │  Panel   │  (Agent Relay)     │
├──────────┴──────────┴──────────┴────────────────────┤
│              12-Group System Prompt                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐  │
│  │Identity│ │ State  │ │ Memory │ │ Capabilities │  │
│  │& Rules │ │& Goals │ │& Learn │ │ & 44 Tags    │  │
│  └────────┘ └────────┘ └────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────┤
│                   Data Layer                         │
│  CRM · Calendar · Inbox · Drive · Kanban · Goals     │
│  Contacts · Recordings · Documents · Memory          │
├──────────┬──────────┬──────────┬────────────────────┤
│Marketplace│ Network │Federation│    Extensions      │
│  Agents  │Discovery │  DAWP    │  Skills/Personas   │
│  Stripe  │ Profiles │Cross-Inst│  Prompt Layers     │
│  97/3    │ Jobs     │  Relays  │  Curated Registry  │
├──────────┴──────────┴──────────┴────────────────────┤
│              Integration Surface                     │
│  A2A · MCP · Agent API v2 · Webhooks · Federation    │
└─────────────────────────────────────────────────────┘
```

---

## 3. Docs Landing

### Sidebar Navigation

**Current sidebar likely has:** Getting Started, Architecture, Action Tags, Federation, Integrations, Release Notes

**Update sidebar to:**

```
Getting Started
  ├── Quick Start (5-minute setup)
  ├── Platform vs Self-Hosted
  └── Onboarding Flow
Architecture
  ├── 12-Group System Prompt
  ├── NOW / Queue / Comms Model
  ├── Dashboard Layout
  └── Data Model (55 tables)
Action Tags (44 tags)
The Brief
Agent Marketplace
  ├── For Developers
  ├── For Buyers
  ├── Install/Uninstall Lifecycle
  └── Earnings Dashboard
Network
  ├── Profiles & Discovery
  ├── Connections & Ceremonies
  ├── Teams & Projects
  ├── Jobs & Contracts
  └── Reputation System
Federation
  ├── DAWP Protocol
  ├── Federation Intelligence
  ├── Cross-Instance Relays
  └── Self-Hosted → Platform Integration
Extensions
  ├── Types (Skill, Persona, Prompt Layer)
  ├── Scopes (User, Team, Project, Global)
  └── Creating Extensions
Integrations
  ├── Webhooks & Field Mapping
  ├── A2A Protocol Bridge
  ├── MCP Server
  ├── Agent API v2
  └── Email & Calendar
CRM & Contacts
  ├── Contact Management
  ├── Relationship Mapping
  ├── Activity Timelines
  └── Entity Resolution
Billing & Pricing
  ├── Free Tier
  ├── Team Starter ($29/mo)
  ├── Team Pro ($79/mo + $9/seat)
  └── Marketplace Economics (97/3)
Release Notes
```

### Quick Start Section

**Change build commands from:**
```bash
npm run dev
```

**To:**
```bash
git clone https://github.com/Denominator-Ventures/dividen.git
cd dividen
bash scripts/setup.sh
yarn dev
```

Always use `yarn`, never `npm`.

---

## 4. Docs: Architecture

### System Prompt Section

**Current:** Likely references "10 prompt groups" or similar  
**Update to:** "12 Consolidated Prompt Groups"

List all 12 groups:

| Group | Name | Contents |
|-------|------|----------|
| 1 | Identity, Rules & Time | Agent name, user profile, custom rules, timezone, current datetime |
| 2 | Active State | NOW focus, kanban board, queue items, active goals |
| 3 | Conversation | Recent chat history, conversation patterns |
| 4 | People | CRM contacts, enriched profiles, platform user data |
| 5 | Memory & Learning | Approved memories, user learnings, ambient patterns |
| 6 | Calendar & Inbox | Upcoming events, recent emails, scheduling context |
| 7 | Capabilities & Action Tags | All 44 action tags with syntax, available tools |
| 8 | Connections & Relay | Connected users, relay protocol, ambient/broadcast/direct modes |
| 9 | Extensions | Installed skills, personas, prompt layers (conditional) |
| 10 | Platform Setup | Integration status, webhook configs, API keys (conditional) |
| 11 | Business Operations | Jobs, contracts, marketplace agents, recordings, reputation |
| 12 | Team Agent Context | Team-specific config, member lists, projects, behavior rules (conditional) |

### Dashboard Layout Section

**Add new section** describing the three-column layout:

```
┌──────────┬──────────────────────────┬──────────┐
│   NOW    │        CENTER            │  QUEUE   │
│  Panel   │  ┌─────────────────────┐ │  Panel   │
│          │  │ Chat · Board · CRM  │ │          │
│ Priority │  │ Calendar · Goals    │ │ Task     │
│ Stack    │  │ ─────────────────── │ │ Queue    │
│          │  │ Network · Messages  │ │          │
│ Scoring  │  │ Drive · Extensions  │ │ Activity │
│ Engine   │  │ Earnings            │ │ Log      │
│          │  └─────────────────────┘ │          │
└──────────┴──────────────────────────┴──────────┘
```

**Center Panel Tabs:**
- Primary: Chat, Board, CRM, Calendar, Goals
- Network group: Discover, Connections, Teams, Jobs, Marketplace, Federation Intel
- Messages group: Inbox, Recordings
- Standalone: Drive, Extensions, Earnings

**NOW Panel:**
- Pulls from queue items (ready/in_progress/blocked), goals, kanban cards, calendar events, relays
- Scoring algorithm ranks by urgency, priority, and type
- Items are clickable → prefills Chat with context

**Queue Panel:**
- Task queue with source tracking (system, user, relay, marketplace)
- "Send to Comms" button for delegation to other agents
- Activity log showing recent actions

**Comms (separate page):**
- Agent Relay Channel — NOT for human-to-Divi chat
- Where Divi communicates with other agents via relays and marketplace dispatches

### Data Model Section

**Update table count:** The schema now has **55 models** (not whatever the old count was). Key models to document:

```
Core: User, UserProfile, ChatMessage, QueueItem, KanbanCard, Goal
CRM: Contact, ContactRelationship, EmailMessage
Calendar: CalendarEvent
Documents: Document, Recording
Network: Connection, Team, TeamMember, Project, ProjectMember
Jobs: NetworkJob, JobApplication, JobContract, JobPayment, JobReview
Marketplace: MarketplaceAgent, MarketplaceExecution, MarketplaceSubscription
Federation: FederationConfig, InstanceRegistry, AmbientPattern, AmbientRelaySignal
Billing: TeamSubscription, TeamBilling, TeamSpendingPolicy, TeamFollow, TeamAgentAccess
Agent: AgentBrief, AgentExtension, AgentMessage, AgentRelay, AgentRule
Memory: MemoryItem, UserLearning
Integrations: IntegrationAccount, Webhook, WebhookLog, ExternalApiKey, ServiceApiKey
System: ActivityLog, TelemetryEvent, NotificationRule, ReputationScore, Invitation, ProjectInvite, CommsMessage
```

---

## 5. Docs: Action Tags

**Current:** Likely lists fewer tags  
**Update to: 44 action tags** organized by category:

### Core Actions (17)
```
create_card, update_card, archive_card
create_contact, update_contact, link_contact, add_relationship
dispatch_queue / dispatch
create_event / schedule_event
set_reminder
send_email
add_checklist / add_task
complete_checklist
update_memory, save_learning
add_known_person
```

### Platform Setup Actions (7)
```
setup_webhook
save_api_key
create_calendar_event
create_document
send_comms
link_recording
update_profile
```

### Connection & Relay Actions (5)
```
relay_request — direct relay to one connection
relay_broadcast — relay to ALL connections
relay_ambient — low-priority ambient ask
accept_connection
relay_respond — respond to inbound relay
```

### Orchestration Actions (3)
```
task_route — decompose card into tasks, match skills, route to best connection
assemble_brief — trigger brief assembly for a kanban card
project_dashboard — assemble cross-member project status
```

### Goal Actions (2)
```
create_goal
update_goal
```

### Job Board Actions (2)
```
post_job — post to the network job board
find_jobs — find matching jobs for user's profile
```

### Advanced Actions (2)
```
entity_resolve — cross-surface entity resolution (find all info about a person/company)
install_agent / uninstall_agent — marketplace agent lifecycle
```

For each tag, document:
- **Syntax:** How Divi formats it in responses
- **Parameters:** What data it expects
- **Example:** A natural language prompt that triggers it
- **Result:** What happens when executed

---

## 6. Docs: Federation

### Update Federation Endpoints

The federation API surface now includes:

```
/api/federation/config — GET/PUT federation configuration
/api/federation/connect — POST initiate federation handshake
/api/federation/relay — POST/GET cross-instance relay
/api/federation/instances — GET list federated instances
/api/federation/reputation — GET/POST cross-instance reputation queries
/api/federation/entity-search — POST search entities across instances
/api/federation/graph — GET federation network graph
/api/federation/briefing — GET cross-instance briefing data
/api/federation/patterns — GET/POST shared ambient learning patterns
/api/federation/jobs/route — GET federated job listings
/api/federation/jobs/apply — POST apply to federated jobs
/api/federation/mcp — MCP endpoint for federated tool-use
/api/federation/routing — POST intelligent routing across instances
/api/federation/project/[id]/context — GET cross-instance project context
```

### Add: Federation Intelligence Section

New section documenting:
- **Pattern Sharing:** How ambient learning patterns are shared across instances
- **Entity Search:** Cross-instance search for people, skills, availability
- **Reputation Federation:** How reputation scores propagate across the network
- **Graph Intelligence:** Network topology and relationship mapping
- **Briefing Protocol:** Cross-instance briefing data assembly

### Add: Self-Hosted → Platform Integration Guide

New section (see also Section 12 below):
1. How to register a self-hosted instance with the managed platform
2. How to configure federation keys
3. How to participate in the managed marketplace from a self-hosted instance
4. How to join the relay network
5. How to sync the updates feed

---

## 7. Docs: Integrations

### Webhook Section

**Add:** AI-powered field mapping documentation

```
POST /api/webhooks-management — Create webhook
GET  /api/webhooks-management — List webhooks
GET  /api/webhooks-management/[id] — Get webhook details
PATCH /api/webhooks-management/[id] — Update webhook
DELETE /api/webhooks-management/[id] — Delete webhook
POST /api/webhooks-management/[id]/learn — Trigger AI field mapping
GET  /api/webhooks-management/[id]/logs — View webhook delivery logs
POST /api/webhooks-management/[id]/test — Send test webhook
```

Field mapping supports:
- Auto-learn from incoming payloads (Divi analyzes the JSON structure)
- Manual override with dot-notation paths
- Confidence scoring (auto-learned, manual, mixed)
- Templates for common webhook types

### Agent API v2 Section

**Update the full endpoint list:**

```
GET/POST /api/v2/contacts — List/create contacts
GET/PATCH/DELETE /api/v2/contacts/[id] — Manage individual contacts
GET/POST /api/v2/kanban — List/create kanban cards
GET/PATCH/DELETE /api/v2/kanban/[id] — Manage individual cards
GET/POST /api/v2/queue — List/create queue items
GET/PATCH /api/v2/queue/[id] — Manage individual queue items
GET /api/v2/queue/[id]/status — Check queue item status
POST /api/v2/queue/[id]/result — Submit queue item result
GET/POST /api/v2/keys — Manage API keys
GET/POST /api/v2/shared-chat/messages — Shared chat messages
POST /api/v2/shared-chat/send — Send shared chat message
GET /api/v2/shared-chat/stream — Stream shared chat responses
GET /api/v2/docs — OpenAPI specification
```

Kanban status enum is now:
```
leads | qualifying | proposal | negotiation | contracted | active | development | planning | paused | completed
```

### A2A Protocol Bridge

Document endpoints:
```
POST /api/a2a — Agent-to-Agent message endpoint
GET /api/a2a/playbook — Agent playbook/capabilities
GET /.well-known/agent-card.json — Agent discovery card
```

### MCP Server

Document endpoint:
```
POST /api/mcp — Model Context Protocol tool-use endpoint
GET /.well-known/mcp/server-card.json — MCP server card
```

---

## 8. Docs: Release Notes

**Current:** Likely outdated  
**Replace with:** A sync mechanism or manual summary of the dividen.ai/updates feed.

At minimum, add a summary of the last 2 weeks of updates:

| Date | Title |
|------|-------|
| Apr 11 | **A Founder Letter — The Shift to Individual-First** |
| Apr 12 | Hardening Sprint — Rate Limits, Agent Versioning, Federation Intel |
| Apr 12 | Install/Uninstall — Divi Only Learns What You Need |
| Apr 12 | Divi Now Sees Everything — Full Platform Awareness |
| Apr 12 | Your Agent Makes Money While You Sleep |
| Apr 11 | FVP Integration Brief — 14 Proposals, One Build |
| Apr 11 | Developer Experience Overhaul — One Command to Running |
| Apr 11 | The Activity Feed Is Now the Universal Event Log |
| Apr 10 | Chief of Staff Mode |
| Apr 10 | Install DiviDen on Your Desktop — Plus: MCP Registry Submission |
| Apr 10 | The Network Now Pays You — Jobs, Contracts & Earnings v2 |
| Apr 9 | 12 Extension Proposals — The FVP Contribution |
| Apr 9 | Hardening the Protocol, Opening the Repo |
| Apr 9 | Ambient Intelligence — The Self-Improving Relay Protocol |
| Apr 8 | Teams, Kanban Pipeline, Recording & Checklist Overhaul |
| Apr 8 | Connection Ceremonies, Relay Maturity, Walkthrough |
| Apr 8 | Relay Protocol & Connection Architecture |
| Apr 8 | Auto-Dispatch Engine |
| Apr 8 | Queue, Calendar, Comms Launch |
| Apr 8 | The Foundation |

Ideal: Set up an automated sync that pulls from `dividen.ai/updates` (they share the same `UPDATES` array in `src/lib/updates.ts`).

---

## 9. Open Source Page

### Hero

**Current:** "The Company Operating System. Open protocol. Open source."  
**Change to:** "Open Core AI Command Center"

**Subhead:**
> DiviDen's engine is MIT-licensed. Self-host it, extend it, inspect every line. Premium features — marketplace, team coordination, federation — live on the managed platform. The core is yours.

### Framing Shift

**Remove language that positions open source as the primary experience.** The primary experience is the managed platform at dividen.ai. The open source is the engine.

**Add a clear "Platform vs Self-Hosted" comparison:**

| Capability | Self-Hosted (MIT) | Managed Platform |
|------------|-------------------|------------------|
| AI Agent (Divi) | ✅ Full | ✅ Full |
| 44 Action Tags | ✅ Full | ✅ Full |
| CRM, Calendar, Goals | ✅ Full | ✅ Full |
| NOW/Queue/Comms | ✅ Full | ✅ Full |
| Extensions | ✅ Full | ✅ Full |
| The Brief | ✅ Full | ✅ Full |
| Drive & Documents | ✅ Full | ✅ Full |
| Agent Marketplace | ⚠️ Requires federation | ✅ Built-in |
| Network Discovery | ⚠️ Local only | ✅ Full network |
| Team Subscriptions | ⚠️ Set MARKETPLACE_FEE_PERCENT=0 | ✅ Stripe integration |
| Federation | ✅ Full | ✅ Full |
| Desktop PWA | ✅ Full | ✅ Full |
| Automatic Updates | ❌ Manual pull | ✅ Continuous |
| Hosted Infrastructure | ❌ You manage | ✅ We manage |

### Build Phases Section

**Current:** Shows phases as future work  
**Update:** Mark all phases as COMPLETE with dates:

- ✅ Phase 1: Network Architecture (Teams, Projects, Connections, Federation members) — Apr 8-9
- ✅ Phase 2: Rich Profile Pages (routing manifests, skills, capacity, reputation) — Apr 9
- ✅ Phase 3: CRM Integration (relationship mapping, activity timelines, enrichment) — Apr 9-10
- ✅ Phase 4: Feature Gates & Team Subscriptions (Starter/Pro tiers, 14-day trial) — Apr 10
- ✅ Phase 5: Connection Ceremonies (trust handshake, agent-to-agent trust) — Apr 10
- ✅ Phase 6: Network Discovery (browse people, teams, agents, jobs) — Apr 10-11
- ✅ Phase 7: UX Rework (NOW/Queue split, onboarding, homepage, admin optimization) — Apr 11
- ✅ Phase 7.5: Homepage Polish (tiered features, accordion protocol, codebase cleanup) — Apr 11

### Setup Commands

**Change ALL instances of `npm` to `yarn`:**

```bash
# Clone the repository
git clone https://github.com/Denominator-Ventures/dividen.git
cd dividen

# Run the setup script (installs deps, sets up .env, runs db push)
bash scripts/setup.sh

# Start the development server
yarn dev

# Open http://localhost:3000
```

---

## 10. Updates Page

### Sync Strategy

The updates on os.dividen.ai should mirror the updates on dividen.ai. They both read from the same `UPDATES` array in `src/lib/updates.ts`.

**Options:**
1. **Best:** Make os.dividen.ai fetch updates from dividen.ai via API or shared data file
2. **Good:** Manually copy the `UPDATES` array when deploying os.dividen.ai
3. **Minimum:** Link to dividen.ai/updates as the canonical source

**Add a banner at the top of the updates page:**
> These updates are also available at [dividen.ai/updates](https://dividen.ai/updates) and are published in the platform's Updates feed.

---

## 11. New Pages to Create

### 11.1 — Docs: Onboarding Flow

**Path:** `/docs/onboarding`

Document the onboarding wizard:
- Welcome step (agent naming)
- Agent personality step
- Workspace setup (NOW/Queue task seeding)
- Connect step (email, calendar integration)
- Done step

NOW tasks seeded (in order):
1. Chat with Divi
2. Connect your email
3. Add your first contact
4. Set a goal

Queue tasks seeded:
1. Explore the Agent Marketplace
2. Create a kanban card
3. Invite a collaborator
4. Check out Extensions

### 11.2 — Docs: NOW / Queue / Comms Model

**Path:** `/docs/now-queue-comms`

Document the three-panel architecture:
- **NOW:** Scoring algorithm, data sources (queue items, goals, calendar, relays), clickable → chat prefill
- **Queue:** Task lifecycle (ready → in_progress → blocked → done_today → deferred → cancelled), source tracking, "Send to Comms" delegation
- **Comms:** Agent Relay Channel (distinct from Chat), relay types, marketplace dispatch, cross-agent coordination

### 11.3 — Docs: CRM & Contacts

**Path:** `/docs/crm`

Document:
- Contact management (CRUD, tags, enrichment)
- Relationship types: colleague, manager, report, partner, spouse, friend, referral, custom
- Activity timelines (emails, events, comms, linked cards)
- Entity resolution (`entity_resolve` action tag)
- Contact-platform bridging (auto-link contacts to platform users by email)

### 11.4 — Docs: Billing & Pricing

**Path:** `/docs/billing`

Document:
- **Free Tier:** `isFreeUser` flag on User model. Bypasses billing checks.
- **Team Starter:** $29/mo, 5 members, 3 active projects, 14-day trial
- **Team Pro:** $79/mo + $9/seat (beyond 10), unlimited projects, team agent, advanced controls, 14-day trial
- **Marketplace Economics:** 97/3 revenue split. Developers earn 97%. Self-hosted: set `MARKETPLACE_FEE_PERCENT=0`.
- **Stripe Integration:** Connect Express for developer payouts, saved payment methods for buyers.

### 11.5 — Docs: Agent Marketplace

**Path:** `/docs/marketplace`

Document:
- Listing an agent (name, description, pricing, category)
- Agent versioning and changelogs
- Install/uninstall lifecycle (how Divi learns/forgets agent capabilities)
- Execution flow (buyer triggers → agent runs → results delivered)
- Earnings dashboard (revenue distribution, success rates, execution breakdown)
- Stripe Connect onboarding
- Rating and review system

### 11.6 — Docs: Self-Hosted → Platform Integration

**Path:** `/docs/self-hosted-integration`

New guide (see Section 12 below).

---

## 12. Self-Hosted Integration Improvements

These are features/docs that should be added to make self-hosted instances seamless network participants:

### 12.1 — "Connect to Network" Wizard

**What it is:** A Settings page flow that automates federation setup with the managed platform.

**Steps:**
1. User clicks "Connect to DiviDen Network" in Settings
2. System generates an instance keypair
3. User authenticates with their dividen.ai account (OAuth or API key)
4. System registers the instance with dividen.ai's federation registry
5. Key exchange completes automatically
6. Instance appears in the network graph

**Currently:** Manual config of URLs and API keys. Documented but not automated.

### 12.2 — Marketplace Participation from Self-Hosted

**What it is:** Allowing self-hosted instances to list agents on the managed marketplace.

**Requires:**
- A "Platform Link" API endpoint on dividen.ai that accepts instance registration
- Agent listing sync protocol (push agent metadata to platform marketplace)
- Execution routing (platform marketplace routes execution requests to self-hosted instance)
- Payment handling (Stripe Connect enrollment from self-hosted instance)

**Currently:** Not implemented. Self-hosted instances can only use agents, not list them on the managed marketplace.

### 12.3 — Network Discovery Federation

**What it is:** Self-hosted instances querying the managed network's discovery feed.

**Requires:**
- A public/federated endpoint on dividen.ai: `GET /api/federation/discover`
- Returns public profiles, teams, agents, and jobs visible to federated instances
- Respects visibility settings (public entities only)

**Currently:** Federation supports relays and entity search, but not the full discovery feed.

### 12.4 — Unified Updates Feed

**What it is:** Self-hosted instances pulling the changelog.

**Requires:**
- A public endpoint on dividen.ai: `GET /api/updates` (returns JSON array of updates)
- Self-hosted Settings page option: "Subscribe to platform updates"
- Updates appear in the self-hosted instance's notification feed

**Currently:** Not implemented. Self-hosted users have to visit dividen.ai/updates manually.

### 12.5 — Documentation

Create a dedicated page at `/docs/self-hosted-integration` with:
1. Prerequisites (domain, SSL, Postgres)
2. Step-by-step federation setup
3. Marketplace enrollment
4. Relay network participation
5. Troubleshooting common federation errors
6. Environment variables reference for federation config

---

## 13. Visual / Design Updates

### Color Palette

The platform moved from purple (`#7c3aed`) to blue (`#4f7cff`) as the brand color.

**Update os.dividen.ai to match:**
- Primary/accent: `#4f7cff` (brand-500)
- Background: `#050505` (near-black)
- Text: white with opacity layers (white/50, white/40, white/30 for hierarchy)
- Cards: `border-white/[0.06] bg-white/[0.02]` with hover states
- Protocol/accent gradient: `from-brand-400 to-brand-300`

### Typography

- **Headings:** Space Grotesk (font-heading)
- **Body:** Inter (system default)
- **Code/Mono:** JetBrains Mono (font-mono)

### Component Style

- Cards: rounded-2xl, subtle borders, minimal backgrounds
- Buttons: rounded-xl, brand-500 fill for primary, border-white/10 for secondary
- Sections: separated by `border-t border-white/[0.04]`
- Generous padding: `py-20 md:py-32` between sections
- Font sizes: monospace labels at `text-[11px] uppercase tracking-[0.2em]` for section headers

---

## Implementation Priority

### P0 — Do First
1. Update homepage hero and framing (individual-first, open core)
2. Add "Platform" link and CTA to nav
3. Update feature list to match current capabilities
4. Fix all `npm` references to `yarn`
5. Sync updates feed

### P1 — Do Soon
6. Update docs sidebar navigation
7. Add NOW/Queue/Comms architecture page
8. Update action tags to 44 (with categories)
9. Update architecture diagram
10. Add marketplace documentation

### P2 — Do When Ready
11. Add CRM & billing docs pages
12. Add self-hosted integration guide
13. Update visual design to match platform
14. Build automated updates sync
15. Implement "Connect to Network" wizard

---

*End of document. This file lives at `/OS_DIVIDEN_AI_UPDATE_GUIDE.md` in the project root.*
