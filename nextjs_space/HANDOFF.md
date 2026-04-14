# DiviDen Command Center — Deep Agent Handoff Document

> **Last Updated**: April 14, 2026 — End of Session (Board Cortex v1.5.0)  
> **Author**: AI Agent (for Jon, Denominator Ventures)  
> **Purpose**: Provide deep context for continuing development in a new Deep Agent thread.  
> **Git State**: `origin/main` at `4afa1bc` on `github.com/Denominator-Ventures/dividen.git`  
> **Deployed**: Live on `dividen.ai` + `sdfgasgfdsgsdg.abacusai.app` (both untagged — single deploy updates both)

---

## 1. What Is DiviDen?

DiviDen is an **AI-native personal operating system** — a command center where a human operator (Jon) works alongside an AI agent named **Divi** (Chief of Staff). It's built on a chat-first philosophy: everything flows through conversation, and Divi handles execution through a queue + capability system.

**Core metaphor**: Divi is an employee you're training. You delegate, review, approve. The operator always has the final say.

**Key entities**:
- **Operator** = the human user (Jon)
- **Divi** = the AI agent (Chief of Staff)
- **Kards** = kanban cards (tasks, projects, anything)
- **Queue** = Divi's inbox (things to execute)
- **Now Panel** = operator's priorities (things assigned to you)
- **Board Cortex** = intelligent analysis layer over the kanban
- **Federation** = multi-instance communication (A2A protocol)
- **Marketplace** = agent + capability exchange

**Philosophy pillars**:
1. **Chat-first** — all interaction flows through the chat. Action tags in Divi's responses trigger real operations.
2. **Nothing auto-fires without operator review** — queue items enter as `pending_confirmation` by default.
3. **Malleable** — cards with interactive checklist tasks should be reusable patterns for marketplace/developers.
4. **Queue = Divi's domain, Kanban = tracking layer, Now Panel = operator priorities**.
5. **Dark-only theme** — no light mode.

---

## 2. Tech Stack & Project Structure

```
/home/ubuntu/dividen_command_center          ← PROJECT ROOT (use this in all tool paths)
└── nextjs_space/                            ← Next.js 14 (App Router)
    ├── prisma/schema.prisma                 ← 70 models, 2157 lines, shared dev/prod DB
    ├── src/
    │   ├── app/
    │   │   ├── api/                         ← ~160 API routes
    │   │   ├── dashboard/page.tsx           ← Main dashboard
    │   │   ├── admin/page.tsx               ← Admin panel
    │   │   ├── docs/                        ← Developer, federation, integration docs
    │   │   ├── updates/page.tsx             ← Updates wall
    │   │   └── page.tsx                     ← Landing page
    │   ├── components/dashboard/            ← ~44 dashboard components
    │   └── lib/                             ← ~45 library modules
    ├── .env                                 ← Environment config (never commit)
    ├── PROJECT_BIBLE.md                     ← Comprehensive architectural document
    ├── STYLE_GUIDE.md                       ← UI component reference
    └── package.json → symlinked
```

**Stack**: Next.js 14 (App Router), TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, shadcn/ui, NextAuth.js, Stripe, AWS S3, Google OAuth

**Package manager**: `yarn` only, never npm/npx. Run from `nextjs_space/`.

---

## 3. Critical Build & Deploy Knowledge

### Build Gotchas
- **TSC OOMs** — `test_nextjs_project` fails because the TypeScript compiler runs out of memory on this codebase. **Skip it.** Use `build_and_save_nextjs_project_checkpoint` directly (which runs the Next.js build without tsc).
- **Build requires**: `NODE_OPTIONS="--max-old-space-size=10240"`
- **Never run** `yarn prisma db push --accept-data-loss` — database is shared dev/prod with real user data.

### Deployment
- Both hostnames (`dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`) are **untagged** — a single `deploy_nextjs_project` call (omit `deployment_tag`) updates both simultaneously.
- Propagation takes up to 5 minutes after deploy.

### Git
- Remote exists at `origin` (`github.com/Denominator-Ventures/dividen.git`) with PAT auth.
- Workflow: `git fetch` → `checkout main` → `pull --rebase` → make changes → `add` → verify no secrets → `commit` → `push`
- **Never** include `.abacus.donotdelete` or `.env` in commits.
- License: MIT (Denominator Ventures)

---

## 4. Architecture Deep Dive

### 4.1 System Prompt (`src/lib/system-prompt.ts`)

The brain of Divi. `buildSystemPrompt(userId)` constructs a ~11-group conditional prompt:

| Group | Name | Content |
|-------|------|---------|
| 0 | Identity | Divi's persona, rules, action tag syntax |
| 1 | Federation | Cross-instance comms context |
| 2 | Active State | Kanban cards, Board Cortex digest, NOW data |
| 3 | Contacts/CRM | Contact records, relationships |
| 4 | Calendar | Upcoming events |
| 5 | Email | Recent messages |
| 6 | Queue | Pending items, confirmation gate |
| 7 | Memory | Persistent learnings |
| 8 | Capabilities | Installed agent capabilities |
| 9 | Goals | Active goals with progress |
| 10 | Marketplace | Available agents |

`selectRelevantGroups()` picks which groups to include based on the user's latest message (keyword/intent matching). Group 0 always included.

**Batch fetch**: All DB queries for the prompt run in parallel via `Promise.all` for speed.

### 4.2 Action Tags (`src/lib/action-tags.ts`)

Divi's responses contain action tags like `[[create_card:{"title":"...","priority":"high"}]]` that get parsed and executed server-side.

~50+ tags covering:
- **Kanban**: `create_card`, `update_card`, `move_card`, `archive_card`, `merge_cards`, `create_checklist`, `complete_checklist`
- **Queue**: `dispatch_queue`, `queue_capability_action`, `confirm_queue_item`, `remove_queue_item`, `edit_queue_item`
- **Contacts**: `create_contact`, `update_contact`, `log_contact_activity`
- **Capabilities**: `send_email`, `create_calendar_event`
- **Federation**: `send_relay`, `create_comms_thread`
- **UI**: `show_settings_widget`, `show_kanban_widget`, `show_capability_widget`
- **Goals**: `create_goal`, `update_goal_progress`

**Important**: `merge_cards` expects `targetCardId`/`sourceCardId` (not `targetId`/`sourceId`).

### 4.3 NOW Engine (`src/lib/now-engine.ts`)

`scoreAndRankNow(userId)` — **deterministic scoring** (no LLM). Produces the operator's priority stack from:
- Active kanban cards assigned to human
- Checklist items assigned to operator (with due dates)
- Calendar events
- Goals with deadlines
- Relay responses waiting

Scoring factors: urgency (due date proximity), importance (priority level), recency, completion momentum.

### 4.4 Board Cortex (`src/lib/board-cortex.ts`)

**NEW this session.** Pure functions for board intelligence:
- `detectDuplicates(cards)` — Levenshtein similarity ≥75% on titles
- `detectDuplicateTasks(cards)` — Cross-card checklist items ≥80% similar
- `findStaleCards(cards, now)` — Active cards untouched 14+ days
- `findEscalationCandidates(cards, now)` — Within 48h of deadline, <30% done → auto-bumps to urgent
- `findArchiveCandidates(cards, now)` — Completed 2+ days ago
- `computeBoardHealth(cards, now)` — Summary stats
- `buildContextDigest(userId, cards, now)` — Pre-digested summary injected into system prompt
- `runBoardScan(userId)` — Full scan: detect → persist `BoardInsight` records → auto-escalate → log

Uses `similarity()` from `queue-dedup.ts` (Levenshtein). No LLM calls.

API: `GET /api/board/cortex` (digest) | `POST /api/board/cortex` (full scan with housekeeping)

### 4.5 Queue System

- **Queue dedup**: `deduplicatedQueueCreate()` from `queue-dedup.ts` — ALL queue creation paths must use this
- **Confirmation gate**: Items enter as `pending_confirmation`. User approves via `POST /api/queue/confirm` or Divi uses `[[confirm_queue_item]]`
- **`queueAutoApprove`**: User-level boolean (default false). When true, items skip confirmation → straight to `ready`
- **Smart Task Prompter**: `src/lib/smart-task-prompter.ts` — On edit, resolves target agent's Integration Kit, calls LLM to optimize payload. Stores `displaySummary` + `optimizedPayload` in metadata.
- **CoS dispatch**: `src/lib/cos-sequential-dispatch.ts` — Sequential task execution. Strategy: capability → explicit relay → project contributor → generic.

### 4.6 Onboarding (Project-Based v2)

**Onboarding IS a project.** No separate phase system. Flow:
1. Welcome modal → BYOAI API key entry (Anthropic/OpenAI provider selector)
2. `POST /api/onboarding/intro` — creates project + 1 card + 6 checklist items + chat messages in `$transaction`
3. User picks "Walk me through it" or "I'll handle it myself"
4. `POST /api/onboarding/setup-project` — sets due dates, returns firstTask
5. Tasks appear in Now Panel and Board naturally

**API key gate**: Dashboard checks for active API key. No key → shows OnboardingWelcome at step 2.

### 4.7 Activity Logging

`logActivity({ userId, action, actor, summary })` from `src/lib/activity.ts`.

All significant operations (task completions, capability executions, queue dispatches) should log. Actor is typically `'divi'` or `'operator'`.

### 4.8 Federation & A2A

- **A2A protocol**: `src/app/api/a2a/route.ts` — Agent-to-Agent communication
- **Relays**: Cross-instance task delegation. Templates in `relay-templates`. Bridge in `relay-queue-bridge.ts`.
- **Instance registry**: `InstanceRegistry` model tracks federated instances
- **MCP**: `src/app/api/federation/mcp/route.ts` — Model Context Protocol endpoint

---

## 5. Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (shared dev/prod) |
| `NEXTAUTH_SECRET` | Auth encryption key |
| `ABACUSAI_API_KEY` | LLM API access (Abacus.AI) |
| `ADMIN_PASSWORD` | Admin panel access |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth (SSO + calendar/email connect) |
| `GEMINI_API_KEY` | Gemini API for meeting notes |
| `STRIPE_SECRET_KEY/PUBLISHABLE_KEY` | Payment processing |
| `AWS_BUCKET_NAME/REGION/PROFILE` | S3 file storage |
| `NOTIF_ID_CONNECTION_INVITATION` | Email notification type ID |
| `MARKETPLACE_FEE_PERCENT` | Marketplace transaction fee |
| `WEB_APP_ID` | Abacus.AI app identifier |

**Note**: `NEXTAUTH_URL` is auto-configured by Abacus AI per environment. Don't set manually.

---

## 6. Database — Handle With Care

- **70 models**, 2157-line schema
- **Shared dev/prod** — every change affects live data
- **Never** `--accept-data-loss`
- **Always** make additive/compatible schema changes
- **Seed script**: Check `scripts/seed.ts` before creating new ones. Use upsert, never delete.
- **Connection limits**: Short idle timeout, max 25 concurrent, 5s statement timeout. Treat connections as ephemeral.
- **Key models to know**:
  - `User` → `UserProfile`, `ExternalApiKey`, `AgentCapability`, `MemoryItem`
  - `KanbanCard` → `ChecklistItem`, `CardContact`, `CardArtifact`
  - `QueueItem` → dispatched by CoS, optimized by Smart Prompter
  - `BoardInsight` → cortex scan results (NEW)
  - `Team` → `TeamMember`, `TeamBilling`, `TeamSubscription`, `TeamSpendingPolicy`
  - `AgentRelay` → cross-instance delegation
  - `MarketplaceAgent` → agent listings with Integration Kits

---

## 7. UI Patterns & Components

### Dashboard Layout
- **Left**: Now Panel (priorities) or Queue Panel (Divi's inbox)
- **Center**: Chat (primary interaction), plus tab panels (Calendar, Inbox, Drive, Comms, CRM, etc.)
- **Right**: Contextual panels (card detail, contact detail, settings)

### Key Component Files
- `ChatView.tsx` — The heart of the app. Renders messages, handles action tag widgets, auto-send pattern.
- `NowPanel.tsx` — Operator priorities. Order: Stats → Priority Stack → Calendar Gap → Board button.
- `QueuePanel.tsx` — Divi's queue. Pending confirmation section with ✅/❌ buttons.
- `KanbanView.tsx` — Full board view with columns.
- `CardDetailModal.tsx` — Card detail with checklist, contacts, artifacts.
- `CenterPanel.tsx` — Tab management (Chat, Calendar, Inbox, Drive, etc.).
- `OnboardingWelcome.tsx` — Two-step welcome modal.
- `AgentWidget.tsx` — Renders interactive widgets in chat (settings sliders, kanban previews, etc.).

### Patterns
- **`__AUTOSEND__` prefix**: When `chatPrefill` starts with this, ChatView auto-sends instead of just filling the input.
- **`pendingAutoSend` ref**: Used in ChatView to handle auto-send timing without useCallback ordering issues.
- **`show_settings_widget` action tag**: Renders actual interactive settings UI in chat via `getSettingsWidgets()` from `onboarding-phases.ts`.

---

## 8. What Was Built This Session (Chronological)

1. **Project-based onboarding v2** — Replaced 6-phase system with "onboarding is a project" approach. Single card, 6 checklist items.
2. **Cockpit mode / Work Partner behavior** — Divi proactively works through NOW list. Picks highest-priority → helps execute → marks complete → next.
3. **Auto-discuss on welcome** — "Get Started" auto-sends first setup task discussion to chat.
4. **Auto-complete matching checklist tasks** — Settings save auto-completes the matching setup task.
5. **Auto-install capabilities on Google connect** — Email + meetings capabilities auto-created.
6. **Interactive settings widget** — `show_settings_widget` renders actual working settings UI in chat.
7. **Board Cortex intelligence layer** — Full board analysis: dedup, stale detection, escalation, archive candidates, health scoring, context digest for system prompt.
8. **NowPanel redesign** — Reordered layout, removed redundant buttons.
9. **System prompt optimization** — Cortex digest integration, conditional TOP FOCUS, behavioral instructions.
10. **Developer docs, changelog, git push** — Full documentation of Board Cortex.

---

## 9. Known Issues & Technical Debt

1. **TSC memory** — TypeScript compiler OOMs on full check. The codebase compiles fine via Next.js build but standalone `tsc` fails. This means `test_nextjs_project` will fail — use `build_and_save_nextjs_project_checkpoint` directly.
2. **System prompt token usage** — With 70 models of context, the prompt can get large. `selectRelevantGroups()` helps but aggressive pruning may be needed as data grows.
3. **Board Cortex is Levenshtein-only** — Catches "Deploy website" / "Deploy the website" but not "Ship the landing page" / "Deploy website". Semantic dedup (LLM-powered) is a planned upgrade for `runBoardScan()` while keeping `buildContextDigest()` fast/deterministic.
4. **No scheduled daemon for Cortex** — Currently only runs on-demand (API call or system prompt build). Should run on a cadence for auto-cleaning.
5. **Queue panel UX** — Inline edit works but could use drag-to-reorder and batch actions.

---

## 10. Planned Next Steps (Jon's Roadmap)

These have been discussed but NOT implemented:

1. **Scheduled daemon for Board Cortex** — Run `runBoardScan()` on a cadence so the board self-cleans even when user isn't chatting.
2. **Semantic dedup** — LLM-powered duplicate detection beyond Levenshtein.
3. **Linked Kards view** — Cross-user task visibility.
4. **CoS autonomous mode** — Full queue processing without operator presence.
5. **Cross-agent task delegation via relays** — Multi-agent orchestration.
6. **Widget types as reusable components** — For marketplace/developer extensibility.
7. **Auto-move card to 'completed'** when all checklist items are done.
8. **Google connect button widget** — Interactive widget type beyond settings sliders.

---

## 11. Working With Jon — Style Guide

- **Voice**: Founder energy. Signs updates "— Jon." Writes in punchy, opinionated style.
- **Design**: Dark-only. Clean. Minimal borders, generous whitespace.
- **Decision style**: Moves fast, iterates in conversation. Will say "ok lets..." to kick off work.
- **Updates wall** (`src/lib/updates.ts`): Newest entry at top of array. Founder voice, markdown content. Always has a "What's Next" section teasing future work.
- **Developer docs** (`src/app/docs/developers/page.tsx`): Technical, thorough, with code examples. TOC at top.
- **Git commits**: Descriptive, versioned (v1.4.0, v1.5.0). Always verify no secrets before push.
- **Preferred flow**: Build → review → optimize → document → deploy → push to GitHub.

---

## 12. File Reference — Most Important Files

| File | What It Does | When You'll Touch It |
|------|-------------|---------------------|
| `src/lib/system-prompt.ts` | Builds Divi's brain | Any behavior change |
| `src/lib/action-tags.ts` | Parses + executes Divi's actions | New capabilities |
| `src/lib/now-engine.ts` | Deterministic priority scoring | Priority logic changes |
| `src/lib/board-cortex.ts` | Board intelligence layer | Board analysis |
| `src/lib/queue-dedup.ts` | Queue deduplication | Queue creation paths |
| `src/lib/cos-sequential-dispatch.ts` | CoS task execution | Execution strategy |
| `src/lib/smart-task-prompter.ts` | Queue item optimization | Agent integration |
| `src/lib/activity.ts` | Activity logging | Any new logged action |
| `src/lib/onboarding-phases.ts` | Settings widgets, legacy phases | Onboarding/settings |
| `src/components/dashboard/ChatView.tsx` | Chat rendering + widgets | Chat UI changes |
| `src/components/dashboard/NowPanel.tsx` | Operator priorities | Priority display |
| `src/components/dashboard/QueuePanel.tsx` | Divi's queue | Queue UI |
| `src/components/dashboard/KanbanView.tsx` | Full board view | Board UI |
| `src/components/dashboard/CenterPanel.tsx` | Tab management | Adding new tabs |
| `src/app/dashboard/page.tsx` | Dashboard orchestration | Layout/routing |
| `prisma/schema.prisma` | All 70 data models | Any data change |
| `src/lib/updates.ts` | Updates wall entries | Every release |
| `src/app/docs/developers/page.tsx` | Developer documentation | Every release |
| `PROJECT_BIBLE.md` | Architectural reference | Context |
| `.project_instructions.md` | Agent memory (auto-read) | Auto-maintained |

---

## 13. Quick Start for New Thread

When starting a new Deep Agent thread:

1. **Read this file first**: `cat /home/ubuntu/dividen_command_center/nextjs_space/HANDOFF.md`
2. **Read the project bible**: `cat /home/ubuntu/dividen_command_center/nextjs_space/PROJECT_BIBLE.md`
3. **Read agent memory**: The `.project_instructions.md` file is auto-read by the agent.
4. **Check git status**: `cd /home/ubuntu/dividen_command_center/nextjs_space && git log --oneline -5`
5. **Check deployment**: Use `check_deployment_status` tool with `dividen.ai`
6. **Remember**: Skip `test_nextjs_project` (TSC OOMs). Go straight to `build_and_save_nextjs_project_checkpoint`.

---

*This document was generated to provide continuity across Deep Agent conversation threads. The `.project_instructions.md` file provides automatic agent context, but this document goes deeper into architecture, patterns, gotchas, and the human context needed to work effectively on DiviDen.*
