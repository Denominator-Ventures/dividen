# DiviDen Command Center — Project Bible

**Generated:** 2026-04-12 
**Purpose:** Complete handoff document for continuing development in a new Abacus AI Agent conversation. 
**Project path:** `/home/ubuntu/dividen_command_center`

---

## 1. What Is DiviDen?

DiviDen is an open-source AI operating system for solo founders, freelancers, and small teams. The core product is a **Command Center** — a chat-first dashboard where an AI agent named **Divi** manages your workflow by processing incoming information (Signals), routing tasks to a Kanban board, delegating to other agents, and executing outbound actions (Capabilities).

**Philosophy:** Individual-first. Divi is your AI chief of staff. Everything revolves around the individual operator's priorities. Teams and social features are secondary.

**Deployed at:** `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged deployments). 
**GitHub:** `https://github.com/Denominator-Ventures/dividen.git` (branch: `main`) 
**Marketing site:** `os.dividen.ai` (separate codebase, separate developer)

---

## 2. Architecture at a Glance

| Layer | Detail |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Prisma + PostgreSQL (Abacus-hosted, shared dev/prod) |
| Auth | NextAuth.js (credentials) |
| AI | OpenAI-compatible LLM API via Abacus AI |
| Styling | Tailwind CSS, Space Grotesk + JetBrains Mono |
| Package manager | Yarn only (never npm/npx) |
| Schema changes | `yarn prisma db push` only (no migrations, no `--accept-data-loss` without user consent) |
| Git workflow | Always reset `.abacus.donotdelete` before commit. Pull-rebase before push. |

### Key Numbers (verified 2026-04-12)

| Metric | Count |
|---|---|
| Prisma models | **60** |
| Action tags (SUPPORTED_TAGS) | **45** (42 unique + 3 aliases) |
| System prompt groups | **13** |
| Pipeline stages (Kanban columns) | **10** |
| API routes | **172** |
| Dashboard views (tabs) | **~20** |
| Pages | **15** |
| Built-in signals | **6** (email, calendar, recordings, crm, drive, connections) |

---

## 3. Dashboard Layout

**No sidebar.** 3-column layout:

```
┌──────────┬─────────────────────────┬──────────┐
│   NOW    │     CENTER PANEL        │  QUEUE   │
│ (left)   │  (tabbed content area)  │ (right)  │
└──────────┴─────────────────────────┴──────────┘
```

- **NOW** (`NowPanel.tsx`): Priority-scored stack of what to do right now. Onboarding tasks show here.
- **CENTER** (`CenterPanel.tsx`): Tabbed views — Chat, Kanban, CRM, Calendar, Inbox, Drive, Recordings, Connections, Capabilities/Signals, Marketplace, Teams, Goals, etc.
- **QUEUE** (`QueuePanel.tsx`): Agent task queue. Shows outbound capability actions (email replies, meeting schedules) with Approve/Review/Skip buttons.

**Top bar:** Catch Up button (triggers all-signal triage), global search, notifications.

---

## 4. The Full Loop (How It Works)

```
Signals (inbound)  →  Triage (conversation)  →  Kanban Board (projects + tasks)
     ↓                                                    ↓
 Catch Up                                           NOW (my tasks)
 (all signals)                                          ↓
                                                  Chat with Divi
                                                        ↓
                                                  Queue (agent tasks)
                                                        ↓
                                              Capabilities (outbound)
                                              (emails, meetings, etc.)
```

1. **Signals** bring information in (email, calendar, recordings, CRM, drive, connections, custom webhooks)
2. **Triage** — Divi reviews each signal conversationally, extracts tasks, routes to existing project cards or creates new ones
3. **Kanban** — The board of truth. Cards = projects, checklist items = tasks.
4. **NOW** — Surfaces the operator's most urgent tasks
5. **Chat** — Operator works with Divi to plan, decide, delegate
6. **Queue** — Tasks for agents to execute
7. **Capabilities** — Outbound actions Divi can take (send email, schedule meeting)

---

## 5. Core Systems (Deep Dive)

### 5.1 Signals Framework

**File:** `src/lib/signals.ts`

6 built-in signals, each with:
- `id`, `name`, `icon`, `description`
- `inboundDescription` — what data comes in
- `triagePrompt` — what Divi does during triage (editable per-user)
- `taskTypes[]` — types of tasks this signal typically produces
- `capabilities[]` — outbound actions available through this channel

**Signals:** `email`, `calendar`, `recordings`, `crm`, `drive`, `connections`

**Custom signals** (`CustomSignal` model): User-created webhook/integration signals with custom payloads, auto-generated triage prompts, and custom `artifactType` strings.

**Signal config** (`SignalConfig` model): Per-user priority ordering, catch-up enable/disable, triage enable/disable, custom triage prompts per signal.

**API endpoints:**
- `GET/PUT /api/signals/config` — Signal configuration
- `GET/POST /api/signals/custom` — Custom webhook signals

### 5.2 Capabilities Engine

**Model:** `AgentCapability` — type, identity (operator/agent/both), rules (JSON[]), config (JSON), status

**Tiered autonomy:**
- Tier 1: Auto-execute (low-risk, routine)
- Tier 2: Draft-and-confirm (agent drafts, user approves)
- Tier 3: Human approval required (high-stakes)

**Current capabilities:** Email (send/reply), Meetings (schedule)

**Action tag:** `[[queue_capability_action:{}]]` → creates queue items with capability metadata

**UI:** `CapabilitiesView.tsx` — setup wizard (4 steps), signal+capability management in one view

**System prompt:** Group 13 (conditional) injects active capabilities context

### 5.3 KanbAIn (Smart Kanban)

**10 pipeline stages:** Leads → Qualifying → Proposal → Negotiation → Contracted → Active → Development → Planning → Paused → Completed

**Task-first triage** (the key mental model):
- Cards = Projects (containers)
- Checklist Items = Tasks (atomic work items)
- Every signal item produces tasks, not cards
- `upsert_card` tag: Levenshtein fuzzy matching (≥80%) finds existing cards before creating new ones
- `link_artifact` tag: Dual-write — direct FK for built-in types + generic `CardArtifact` record for extensibility

**Three-way delegation model on ChecklistItem:**
- `self` — operator does it
- `divi` — Divi handles autonomously
- `delegated` — routed to another user's Divi agent (shows as "Name via Divi")

**Card merge:** `merge_cards` tag + `POST /api/kanban/merge`. Combines tasks, contacts, artifacts. Source card deleted. **Never auto-merges** — Divi suggests, operator confirms.

**Due date discipline:** `dueDate` on ChecklistItem. Divi infers from context or suggests defaults by priority (urgent=today, high=+2d, medium=+7d, low=+14d).

**No auto-routing to board:** Divi never silently adds items. Everything goes through conversational triage.

**CardContact roles:** `primary`, `contributor` (can take tasks), `related` (contextual only). `canDelegate` flag auto-set from `platformUserId` presence.

**CardArtifact:** Generic polymorphic join table (cardId, artifactType, artifactId, label, metadata). Supports any artifact type string.

**Board rendering shows:** Task delegation breakdown `[me:2 divi:3 via-divi:1]`, contributor names with 🟢 for DiviDen users, related count, artifact counts by type.

### 5.4 Catch Up

Button in top bar triggers all-signal triage respecting user's priority ordering and exclusions.

**CatchUpSettings** (`CatchUpSettings.tsx`): Modal with drag-to-reorder signal priority, per-signal catch-up/triage toggles.

`getCatchUpPrompt(configs?)` builds dynamic prompt respecting priority order.

### 5.5 Brief Assembly

**File:** `src/lib/brief-assembly.ts`

Reads a card's full context graph (contacts, pipeline stage, checklist status, artifacts, activity) and assembles a structured briefing document. Used by `assemble_brief` action tag.

### 5.6 System Prompt

**File:** `src/lib/system-prompt.ts` (1492 lines)

**13 groups:**
1. Identity, Rules & Time
2. Active State (kanban + queue + calendar)
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
13. Active Capabilities (conditional) ← newest

### 5.7 Action Tags

**File:** `src/lib/action-tags.ts` (2254 lines)

45 supported tags. Key categories:
- **Kanban:** `create_card`, `update_card`, `archive_card`, `upsert_card`, `merge_cards`
- **Tasks:** `add_checklist` (with `assigneeType`, `delegateTo`, `dueDate`), `complete_checklist`
- **People:** `create_contact`, `link_contact` (with `involvement`), `update_contact`, `add_relationship`, `add_known_person`
- **Artifacts:** `link_artifact` (dual-write), `link_recording`
- **Comms:** `send_email`, `send_comms`, `relay_request`, `relay_broadcast`, `relay_ambient`, `relay_respond`, `accept_connection`
- **Calendar:** `create_event`, `create_calendar_event`, `set_reminder`
- **Queue:** `dispatch_queue`
- **Capabilities:** `queue_capability_action`
- **Orchestration:** `task_route`, `assemble_brief`, `project_dashboard`
- **Memory:** `update_memory`, `save_learning`
- **Goals:** `create_goal`, `update_goal`
- **Jobs:** `post_job`, `find_jobs`
- **Marketplace:** `install_agent`, `uninstall_agent`
- **Entity:** `entity_resolve`
- **Platform:** `setup_webhook`, `save_api_key`, `create_document`, `update_profile`
- **Aliases:** `dispatch` → `dispatch_queue`, `schedule_event` → `create_event`, `add_task` → `add_checklist`

---

## 6. Onboarding Flow

NOW tasks appear in order:
1. Chat with Divi
2. Connect email
3. Analyze inbox (first triage)
4. Setup email capability
5. Approve first outbound email
6. Connect calendar
7. Setup meetings capability
8. Add contact
9. Set goal
10. Teach rule
11. Explore marketplace
12. Invite collaborator

Onboarding creates an "active" project card with tasks as checklist items. Skip/complete buttons on each.

---

## 7. Key Models (60 total, highlights)

| Model | Purpose |
|---|---|
| `User` | Auth + profile |
| `KanbanCard` | Project cards, 10-stage pipeline |
| `ChecklistItem` | Tasks on cards (assigneeType, dueDate, delegation, source tracking) |
| `CardArtifact` | Generic entity→card linking (any artifact type) |
| `CardContact` | People linked to cards (primary/contributor/related, canDelegate) |
| `Contact` | CRM contacts with relationship graphing |
| `ContactRelationship` | Typed relationships between contacts |
| `QueueItem` | Agent task queue |
| `AgentCapability` | Outbound capabilities (email, meetings) with tiered autonomy |
| `SignalConfig` | Per-user signal configuration |
| `CustomSignal` | User-defined webhook signals |
| `AmbientRelaySignal` | Ambient relay signal definitions |
| `AmbientPattern` | Pattern detection config |
| `AgentBrief` | Assembled briefing documents |
| `CalendarEvent` | Calendar integration |
| `EmailMessage` | Email integration |
| `Document` | Drive/docs |
| `Recording` | Meeting recordings |
| `ChatMessage` | Chat history |
| `Connection` | Federation connections between users |
| `AgentRelay` | Relay messages between connected agents |
| `MemoryItem` | Long-term agent memory |
| `UserLearning` | Learned patterns/preferences |
| `Goal` | User goals with progress tracking |
| `MarketplaceAgent` | Published agent marketplace entries |
| `Team` | Team infrastructure |
| `Webhook` | Webhook configurations |
| `InstanceRegistry` | Federation instance tracking |
| `TelemetryEvent` | Analytics/telemetry |
| `NotificationRule` | Notification preferences |

---

## 8. Pages & Routes

### Pages (15)
| Path | Description |
|---|---|
| `/` | Landing/homepage |
| `/login` | Login form |
| `/setup` | Account creation (with ToS) |
| `/dashboard` | Main command center |
| `/dashboard/comms` | Comms messages |
| `/admin` | Admin dashboard (password protected) |
| `/settings` | User settings (multi-tab) |
| `/profile/[userId]` | Public profile |
| `/team/[id]` | Team page |
| `/updates` | Release notes / builder log |
| `/terms` | Terms of service |
| `/docs/developers` | Developer docs |
| `/docs/federation` | Federation protocol docs |
| `/docs/integrations` | Integration guides |
| `/docs/release-notes` | Technical release notes |

### Dashboard Tabs (~20 views)
Chat, Kanban, CRM, Calendar, Inbox, Drive, Recordings, Connections, Capabilities/Signals, Marketplace, Teams, Goals, Jobs, Chief of Staff, Discover, Federation Intelligence, Extensions

### API Routes (172)
Too many to list — organized under `/api/` with RESTful patterns. Key ones:
- `/api/chat/send` — Chat with Divi
- `/api/kanban/*` — Kanban CRUD + merge
- `/api/signals/*` — Signal configuration
- `/api/capabilities/*` — Capability management
- `/api/contacts/*` — CRM
- `/api/calendar/*`, `/api/queue/*`, `/api/relays/*`, `/api/briefs/*`
- `/api/v2/*` — Public federation APIs

---

## 9. Dashboard Components (32 files)

| Component | Purpose |
|---|---|
| `KanbanView.tsx` | Drag-and-drop kanban board with smart rendering |
| `CardDetailModal.tsx` | Card detail with merge button, delegation breakdown |
| `ChatView.tsx` | AI chat interface with prefill support |
| `NowPanel.tsx` | Priority-scored "what to do now" |
| `QueuePanel.tsx` | Agent queue with capability action buttons |
| `CenterPanel.tsx` | Tab router for all center views |
| `CapabilitiesView.tsx` | Signal + capability management |
| `CatchUpSettings.tsx` | Catch-up priority configuration |
| `TriageButton.tsx` | Per-signal triage trigger |
| `CrmView.tsx` | Contact management |
| `ContactDetailModal.tsx` | Contact detail with activity + relationships |
| `CalendarView.tsx` | Calendar integration |
| `InboxView.tsx` | Email inbox |
| `DriveView.tsx` | Document management |
| `RecordingsView.tsx` | Meeting recordings |
| `ConnectionsView.tsx` | Federation connections |
| `MarketplaceView.tsx` | Agent marketplace + earnings |
| `TeamsView.tsx` | Team management |
| `GoalsView.tsx` | Goal tracking |
| `JobBoardView.tsx` | Network job board |
| `GlobalSearch.tsx` | Unified search |
| `OnboardingWizard.tsx` | Onboarding flow |
| `CockpitBanners.tsx` | Contextual banners |
| `NotificationCenter.tsx` | Notification management |
| `MemoryPanel.tsx` | Agent memory viewer |
| `FederationIntelligenceView.tsx` | Federation analytics |
| `DiscoverView.tsx` | Network discovery |
| `ChiefOfStaffView.tsx` | AI chief of staff mode |
| `ExtensionsView.tsx` | Extension management |
| `Walkthrough.tsx` | Interactive walkthrough |
| `KeyboardNav.tsx` | Keyboard shortcuts |
| `TabErrorBoundary.tsx` | Error boundary for tabs |

---

## 10. What Happened in This Conversation

This conversation covered a massive build session. Here's everything in chronological order:

### Session 1: Onboarding Redesign
- **Removed** the requirement to go to Settings to add API key — added inline form on dashboard
- **Redesigned onboarding** to create an "active" project card with 12 setup tasks as checklist items
- **NOW panel** now shows onboarding tasks with ✓ Done / Skip buttons
- **Divi auto-introduces** itself after API key setup, explains capabilities, encourages email connection

### Session 2: Capabilities Engine
- **Designed and built** the full Capabilities system
- **AgentCapability model** with tiered autonomy (Tier 1/2/3)
- **Email capability** — send as operator or as Divi, rule-based automation
- **Meetings capability** — schedule meetings with similar rules
- **CapabilitiesView** — 4-step setup wizard in new ⚡ tab
- **queue_capability_action tag** — queues outbound actions
- **QueuePanel** enhanced with capability-specific UI (Approve/Review/Skip)
- **Group 13** added to system prompt for capability context injection

### Session 3: Signals Framework
- **Designed the Signals mental model** — every source of information is a Signal
- **6 built-in signals** with descriptions, triage prompts, task types
- **Signal configuration** — per-user priority, enable/disable, custom triage prompts
- **Custom webhook signals** — user-created with auto-generated triage prompts
- **Triage button** on each signal view section
- **Catch Up** button in top bar — triages all signals respecting priority order
- **CatchUpSettings** — drag-to-reorder, per-signal toggles
- **Smart triage prompts** — auto-filled based on signal type, user-editable

### Session 4: Updates Page Entry (Signals/Capabilities)
- Wrote builder-log style update entry: "Signals, Capabilities, and the Full Loop"
- Git push to GitHub

### Session 5: Task-First Triage Architecture
- **Fundamental redesign** of how signals route to the board
- Cards = Projects, Checklist Items = Tasks (not: signal → new card)
- **upsert_card** action tag with Levenshtein fuzzy matching
- **link_artifact** with dual-write (direct FK + generic CardArtifact)
- **CardArtifact model** for extensible artifact linking
- Source tracking on ChecklistItem (sourceType, sourceId, sourceLabel)
- All triage prompts rewritten to EXTRACT TASKS → ROUTE TO PROJECT → ADD pattern
- Custom signals auto-generate task-first triage prompts

### Session 6: Delegation & People Model
- **Three-way delegation** on ChecklistItem: self / divi / delegated
- "Name via Divi" display pattern
- **CardContact roles**: contributor (can take tasks) vs related (context only)
- `canDelegate` auto-detection from `platformUserId`
- Board rendering enhanced with delegation breakdown and contributor display
- System prompt fully documented with delegation action tag params

### Session 7: Card Merge + Due Dates + No Auto-Route
- **merge_cards** action tag + `/api/kanban/merge` endpoint
- **UI merge** in CardDetailModal with two-step confirmation
- **Due date discipline** — `dueDate` on ChecklistItem, system prompt rules for inference
- **Explicit guardrail**: No auto-routing to board. Divi suggests, operator decides.
- System prompt: "NEVER auto-merge without explicit operator approval"

### Session 8: KanbAIn Update Entry
- Wrote builder-log update: "KanbAIn — The Board That Manages Itself"
- Covers task-first triage, delegation, merge, due dates, no auto-routing

### Session 9: os.dividen.ai Content Audit
- **Full text extraction** from homepage, docs, and open-source pages
- **Cross-referenced against codebase** — found 44→45 tags, 12→13 groups, 55→60 models
- **Comprehensive audit MD file** written at `/public/os-dividen-ai-audit.md`
- Priority fixes: 3 critical (wrong numbers), 5 major (missing feature verticals), 6 minor (completeness)

---

## 11. Updates Page Entries (Chronological)

The `/updates` page has builder-log style entries. Current entries from newest to oldest:

1. **KanbAIn — The Board That Manages Itself** (`kanbain-delegation-merge`) — Task-first triage, delegation, merge, due dates
2. **Signals, Capabilities, and the Full Loop** (`signals-capabilities-triage`) — Signals framework, Catch Up, capabilities engine
3. **Teams for Individuals, Federation for Everyone** (`teams-federation-apis`) — Team infrastructure, federation APIs
4. **A Founder Letter — The Shift to Individual-First** (`founder-letter-individual-first`) — Philosophy piece
5. **Hardening Sprint** (`hardening-analytics-federation-intel`) — Security, analytics, federation intelligence
6. **Install / Uninstall** (`agent-install-uninstall-system`) — Marketplace agent management

---

## 12. Credentials

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@dividen.ai` | `DiviDenAdmin2026!` | admin |
| Test user | `john@doe.com` | `johndoe123` | admin |
| Admin page | `/admin` | `DiviDenAdmin2026!` | — |

---

## 13. Key Files Reference

| File | Lines | Purpose |
|---|---|---|
| `prisma/schema.prisma` | 1822 | All 60 models |
| `src/lib/system-prompt.ts` | 1492 | 13-group dynamic prompt builder |
| `src/lib/action-tags.ts` | 2254 | 45 action tag definitions + handlers |
| `src/lib/signals.ts` | 207 | Signal definitions + helpers |
| `src/lib/brief-assembly.ts` | 706 | Card context aggregation |
| `src/lib/updates.ts` | 1979 | Builder-log update entries |
| `src/lib/now-engine.ts` | — | NOW panel scoring engine |
| `src/lib/queue-dedup.ts` | — | Levenshtein queue deduplication |
| `src/lib/free-tier.ts` | — | Free tier utility (not yet consumed) |
| `src/lib/llm.ts` | — | LLM integration (Anthropic Claude) |
| `src/lib/prisma.ts` | — | Singleton Prisma client + telemetry |
| `src/lib/auth.ts` | — | NextAuth configuration |
| `src/lib/landing-data.ts` | — | Homepage content data |
| `src/types/index.ts` | — | Core TypeScript types + KANBAN_COLUMNS |
| `tailwind.config.ts` | — | Tailwind config (blue brand, Space Grotesk) |
| `src/app/globals.css` | — | Global styles + PWA fixes |

---

## 14. Design Language

- **Colors:** Blue brand (`#4f7cff` primary), dark background
- **Fonts:** Space Grotesk (headings), JetBrains Mono (code)
- **Tone:** Builder-log, technical but direct, no fluff
- **Hero H1:** "The last interface you'll ever need." (founder's explicit preference — do NOT change)
- **CTAs:** Platform-first ("Try the Managed Platform"), not open-source push
- **Layout:** No sidebar. 3-column dashboard. Tab scroll with drag.

---

## 15. Pricing

- Team Starter: $29/mo
- Team Pro: $79/mo + $9/seat
- 14-day Pro trial

---

## 16. Federation & Network

- **Public APIs** (`/api/v2/*`): Updates feed, network discovery, instance registration, marketplace linking, heartbeat
- **InstanceRegistry** model: platformLinked, platformToken, marketplaceEnabled, discoveryEnabled
- **FederationManager UI**: "Connect to Network" wizard
- **Ambient relays**: Low-priority asks between connected agents
- **Relay protocol**: request, broadcast, ambient, respond

---

## 17. Known Issues / Next Steps

### From the os.dividen.ai audit (separate site):
- Numbers wrong everywhere (44→45 tags, 12→13 groups, 55→60 models)
- Three major feature verticals missing from marketing site: Signals, Capabilities, KanbAIn
- Full audit at `/public/os-dividen-ai-audit.md`

### Outstanding in the Command Center:
- `isFreeUser` field + `free-tier.ts` utility exists but is not yet consumed by any feature
- No actual email/calendar integration yet (the signals and capabilities are the framework/UI — actual IMAP/OAuth connections are not yet built)
- Delegation relay flow (operator → Divi → target user's Divi) is modeled but the actual relay execution is not fully end-to-end tested
- Custom signal webhook endpoint receiving is modeled but needs live testing
- Brief assembly is functional but could be expanded

### Founder's design principles (enforce these):
- **No auto-routing to board** — everything goes through conversational triage
- **No auto-merging** — Divi suggests, operator confirms
- **Every task gets a due date** — infer or default, always confirm
- **Individual-first** — the operator is the center of the universe
- **Delegation is via Divi** — never bypass the agent layer

---

## 18. How to Continue

1. Start a new Abacus AI Agent conversation
2. Tell it to read this file: "Read `/home/ubuntu/dividen_command_center/nextjs_space/public/dividen-project-bible.md` — this is a complete handoff document for the DiviDen Command Center project."
3. Also tell it to read `.project_instructions.md` at the project root for additional context
4. The new agent will have full access to the same codebase and database
5. Key files to read first: `system-prompt.ts`, `action-tags.ts`, `signals.ts`, `schema.prisma`

---

*This bible was generated from codebase cross-reference and full conversation history. All numbers verified against source files.*
