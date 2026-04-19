# DiviDen Command Center — Transition Guide (v2.3.1)

> **Last updated**: 2026-04-18 (evening, after v2.3.1 ship)
> **Purpose**: Single document to onboard a fresh Deep Agent conversation to this project. If you're a new DA picking this up, read this top-to-bottom before touching code.
> **Author**: Continuing session with Jon Bradford, founder of DiviDen.
> **Prior transition docs**: `TRANSITION.md` (v2.1.0 baseline), `SESSION_BRIEF.md` (v2.0 deep brief), `DIVIDEN_PROJECT_BIBLE.md` (long-form philosophy). This doc supersedes `TRANSITION.md` for state-of-play but doesn't replace the Bible.

---

## 0. TL;DR for a Fresh DA

- **Project path**: `/home/ubuntu/dividen_command_center` — app code in `nextjs_space/`. **Never** pass the `nextjs_space` subpath to tools that expect `project_path`.
- **Current version**: **v2.3.1** shipped 2026-04-18, committed as `1f2bb13` + `35ea512` on `origin/main`. Deployed to both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged — one deploy updates both).
- **Founder**: Jon Bradford. Direct technical style, no fluff, dark theme only, no A/B/fluff experiments. Sends you uploaded spec docs in plain Markdown and expects implementation to land in one shot.
- **LLM**: Abacus Claude is PRIMARY. User's OpenAI / Anthropic keys are fallback only. GPT-4o cannot reliably emit action tags — never route to it.
- **Always skip `test_nextjs_project`** — TSC OOMs on this project. Go straight to `build_and_save_nextjs_project_checkpoint`. Use `NODE_OPTIONS="--max-old-space-size=8192"` if you need to run `tsc --noEmit` manually.
- **Never** run `yarn prisma db push --accept-data-loss` — DB is shared dev/prod with real user data. Always additive migrations.
- **Git**: `origin` at `github.com/Denominator-Ventures/dividen.git` (PAT in remote). Workflow = checkpoint → deploy → commit → push.

---

## 1. What DiviDen Is

DiviDen is a **personal AI operating system** — every user gets an AI agent called **Divi** who manages their work: cards, contacts, knowledge, comms, and cross-instance coordination with other Divis.

Think of Divi as a federated chief of staff. She lives in a chat panel on the right of the dashboard, takes actions via structured `[[tag:{...}]]` action tags, and coordinates with other Divis (local and federated) via the **relay protocol**.

**Core concepts:**
- **Kanban board** — the primary work surface. Cards, columns, projects, contributors, ghost avatars for pending invites.
- **Divi** — AI agent in chat. Emits action tags, the backend executes them, results flow back as comms + queue items.
- **Action tags** — structured `[[tag:{json}]]` syntax (e.g. `relay_request`, `task_route`, `create_project`, `invite_to_project`). Defined in `src/lib/action-tags.ts`.
- **Relays (`AgentRelay`)** — Divi→Divi messages with intents (`request`, `respond`, `introduce`, `ambient`, etc.). The rail everything coordination-related rides on.
- **Federation (DAWP)** — protocol for discovering and connecting independent DiviDen instances. Cross-instance relays are pushed in real time via `federation-push.ts`.
- **Queue** — surfaces actionable items per user (relays to respond to, project invites, dispatched tasks, etc.).
- **Comms** — per-connection message thread. Every relay and invite also creates a `CommsMessage`.
- **Bubble Store / Marketplace** — agent capabilities available for install.
- **Signals / Cockpit / Chief of Staff mode** — ambient intelligence + high-level mode that aggregates daily insights.

**The thesis**: every meaningful coordination action should be _a message_. Invite someone to a project → they see it in their queue, their inbox, their bell, their Divi chat, and on the card. One mutation, five surfaces, zero polling. That's the design philosophy v2.3.1 codified.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript strict |
| Styling | Tailwind CSS + shadcn primitives, dark-only |
| Database | PostgreSQL via Prisma ORM (shared dev/prod) |
| Auth | NextAuth.js (credentials provider) |
| LLM | Abacus AI (Claude) PRIMARY; user Anthropic/OpenAI keys = fallback |
| Package manager | **yarn only** (never npm/npx) |
| Hosting | Abacus AI Agent platform |
| Primary domain | `dividen.ai` |
| Abacus domain | `sdfgasgfdsgsdg.abacusai.app` |
| Both untagged | single deploy updates both |
| File uploads | S3 via AWS SDK v3 (`@aws-sdk/client-s3`) |

**Key env vars** (all in `nextjs_space/.env`):
- `DATABASE_URL` — shared Postgres
- `ABACUSAI_API_KEY` — Claude access via RouteLLM
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — managed by platform

---

## 3. Directory Structure

```
/home/ubuntu/dividen_command_center/
├── nextjs_space/                      # ALL app code lives here
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── api/                   # ~172 route.ts files across 80+ directories
│   │   │   ├── docs/                  # Public dev-facing docs pages
│   │   │   │   ├── release-notes/
│   │   │   │   ├── developers/
│   │   │   │   ├── relay-spec/
│   │   │   │   ├── federation/
│   │   │   │   ├── integrations/
│   │   │   │   └── project-invites-integration/    # NEW in v2.3.1
│   │   │   ├── documentation/         # Docs hub landing page
│   │   │   ├── updates/               # User-facing updates feed
│   │   │   ├── dashboard/             # Main app shell
│   │   │   ├── settings/              # Settings (7 tabs)
│   │   │   ├── login/ signup/ setup/  # Auth flows
│   │   │   └── page.tsx               # Marketing landing
│   │   ├── components/                # ~84 .tsx files
│   │   │   ├── dashboard/             # ⭐ The heavy hitters live here
│   │   │   ├── widgets/               # Theme-agnostic widget library
│   │   │   ├── settings/
│   │   │   ├── ui/                    # shadcn primitives
│   │   │   └── layouts/
│   │   ├── lib/                       # ~54 library files
│   │   └── types/                     # TypeScript type defs
│   ├── prisma/
│   │   └── schema.prisma              # 71 models, 2237 lines
│   ├── scripts/
│   │   ├── seed.ts                    # Main seed
│   │   ├── safe-seed.ts               # Used in production
│   │   ├── check_recent2.ts           # Debug: recent chat activity
│   │   ├── check_duplicates.ts        # Debug: hallucination detection
│   │   └── purge_polluted.ts          # Clean hallucinated chat rows
│   ├── public/
│   │   └── docs/                      # Static MD docs (FVP spec, self-test prompts)
│   └── .env                           # Secrets
├── .project_instructions.md           # ⭐ YOUR persistent memory across sessions
├── TRANSITION.md                      # Baseline transition (v2.1.0)
├── TRANSITION_v2.3.1.md               # ⭐ THIS FILE (current)
├── SESSION_BRIEF.md                   # Long-form project brief (v2.0 era)
├── DIVIDEN_PROJECT_BIBLE.md           # Philosophy + full context
├── FEDERATION_HANDOFF.md              # Federation design spec
├── FVP_BUILD_522_REPLY.md             # Latest FVP team correspondence
├── TRANSITION_v2.1.15_TO_FVP_REPLY.md # Recent Jon→FVP comms threading note
└── FVP_COMMS_THREADING_ARCHITECTURE.md # FVP team's architecture proposal
```

**Rule**: all tool `project_path` args = `/home/ubuntu/dividen_command_center` (never `.../nextjs_space`).

---

## 4. Current State of Play (v2.3.1)

### 4.1 What just shipped (this session, 2026-04-18 evening)

**Theme**: Project invites are now first-class Divi→Divi comms events.

**What changed in behavior**:
1. `POST /api/projects/[id]/invite` now creates **four records atomically**: `ProjectInvite` + `QueueItem` + `AgentRelay` (intent=`introduce`, payload.kind=`project_invite`) + `CommsMessage` (sender=`divi`).
2. Relay payload shape: `{ kind: 'project_invite', inviteId, projectId, projectName, role, message, inviterName }`.
3. Federation push: if the invitee's connection is federated, `pushRelayToFederatedInstance()` fires immediately to their `peerInstanceUrl`. Real-time cross-instance invite delivery.
4. **Duplicate guard**: returns `409 { error, code: 'ALREADY_INVITED', inviteId }` if a pending invite already exists.
5. **Force reinvite**: `{ force: true }` in body → cancels old invite + queue item + relay + comms, creates a fresh set, returns `replacedInviteId`.
6. Queue panel pins a **📬 Pending Invites** section at the top with inline **Accept** (green) / **Decline** (red) buttons. Wired to `PATCH /api/project-invites` with `{ inviteId, action }`.
7. Kanban cards show pending invites as **dashed amber ghost avatars** next to active contributors.
8. **Members → Contributors** rename everywhere in UI (API role strings unchanged for compat).
9. **+ Add contributor** button lives **inside the card detail modal ONLY**, in the Contributors section which defaults to expanded. Previously appeared on kanban cards — reverted in commit `35ea512`.

**Files touched in this session**:
- `src/components/dashboard/KanbanView.tsx` (removed `+` affordance + `onAddContributor` prop chain)
- `src/components/dashboard/CardDetailModal.tsx` (Contributors section defaults open)
- `src/lib/updates.ts` (new `project-invites-as-comms-v2-3-1` entry)
- `src/app/docs/release-notes/page.tsx` (new v2.3.1 section, marked LATEST)
- `src/app/docs/developers/page.tsx` (invite endpoint docs + PATCH project-invites row + Members→Contributors)
- `src/app/docs/relay-spec/page.tsx` (introduce intent updated, new §4.3 project_invite payload, §20 version row)
- `src/app/docs/integrations/page.tsx` (v2.3.1 callout)
- `src/app/documentation/page.tsx` (sidebar link to new integration guide)
- `src/app/docs/project-invites-integration/page.tsx` (**NEW** — 640-line canonical recipe, 13 sections)

**Commits**:
- `1f2bb13` — feat(v2.3.1): project invites as Divi→Divi comms + full docs sync
- `35ea512` — Revert card + button, update all docs (the kanban-level `+` revert)

Both pushed to `origin/main`. Deployed via `deploy_nextjs_project` with no hostname (updates both domains simultaneously).

### 4.2 Context Jon dropped this session

Two uploaded files from the FVP team are relevant but **not yet implemented**:
1. `TRANSITION_v2.1.15_TO_FVP_REPLY.md` — Jon's outgoing reply to FVP about comms threading
2. `FVP_COMMS_THREADING_ARCHITECTURE.md` — FVP team's proposed architecture for reply threading on comms messages

These are **future work**, not shipped. If Jon asks about comms threading, start here.

### 4.3 Earlier versions still live

| Version | Date | Headline |
|---------|------|----------|
| **v2.3.1** | 2026-04-18 | Project invites as Divi→Divi comms (this session) |
| v2.1.3 | 2026-04-17 | Outbound federation push, project-mgmt action tags, FVP cross-operability guide |
| v2.1.15 | 2026-04-17 | (FVP reply context — see uploaded doc) |
| v2.2.0 | earlier | Widget library + comms pipeline refactor (demoted from LATEST this session) |
| v2.1.2 | 2026-04-16 | Queue-first task routing |
| v2.1.1 | 2026-04-16 | Abacus Claude primary LLM |
| v2.1.0 | 2026-04-16 | (TRANSITION.md baseline) |

Full history in `src/lib/updates.ts` (3812 lines, newest-first).

---

## 5. Architecture Essentials

### 5.1 The Action Tag Loop (read this before touching Divi)

```
1. User types in chat → POST /api/chat/send
2. system-prompt.ts builds dynamic prompt (17 groups, relevance-scored)
3. llm.ts streams response from Abacus Claude
4. Response contains [[tag:{json}]] tags in-line
5. action-tags.ts.parseActionTags() extracts them
6. For each tag → executeTag() mutates DB + creates comms + queue items
7. stripActionTags() removes raw tags from the persisted message body
8. sanitizeAssistantContent() strips any fabricated [Tag execution summary] blocks before save
9. Client renders the cleaned message; backend injects the real tag summaries as system messages
```

**Golden rules** (these are CRITICAL EXECUTION RULES in the system prompt):
- Never let Divi write `[Tag execution summary...]` blocks herself — only backend injects those.
- Never let Divi report "duplicate emission" or "first fire succeeded, second failed" — that's hallucination. ALWAYS check the DB first.
- Test prompts must be natural language. **Never** paste `[[tag:{...}]]` syntax into chat — Divi sees it and says "fired" without actually emitting.

See `.project_instructions.md` → _CRITICAL: Divi Self-Testing Hallucination Trap_ for the defense layers.

### 5.2 Relay Protocol

Table: `AgentRelay`. Status flow: `pending` → `delivered` → `completed` / `declined` / `dismissed`.

**Intents**:
- `request` — generic action request
- `respond` — reply to a prior relay
- `introduce` — intros AND project/team invites (v2.3.1 broadened)
- `ambient` — low-signal ambient context share
- `sync_signal` — triggers auto-continue in Divi

**v2.3.1 introduce sub-types** (via `payload.kind`):
- `contact_introduction` — traditional intros
- `project_invite` — project invitation (NEW)
- (reserved for future: `team_invite`, `handoff`)

**Federation**: if `connection.isFederated`, push happens via `src/lib/federation-push.ts`:
- `pushRelayToFederatedInstance()` — outbound relay
- `pushRelayAckToFederatedInstance()` — completion/decline callback
- `pushNotificationToFederatedInstance()` — lightweight notifications

Inbound federation endpoint: `/api/federation/relay` (accepts payload + `x-federation-token`).
Ack endpoint: `/api/federation/relay-ack` (full loop-closing logic).

### 5.3 Queue / Dispatch Pipeline

`src/lib/queue-dispatch.ts` — `executeTaskRouteDispatch()` handles:
- queue item (status=`ready`) → relay (to peer) → comms (both sides) → kanban card on recipient board → checklist update on source card.

`src/lib/cos-sequential-dispatch.ts` — Chief of Staff mode sequential task dispatch.

`src/lib/queue-dedup.ts` / `queue-gate.ts` — idempotency guards.

### 5.4 Federation Directory

Table: `FederatedInstance` (+ `FederatedUser`, `FederatedOperator`).

`/api/v2/network/discover` returns:
- Local users with `profile.visibility = 'connections'` or `'public'`
- Federated operators with `source: 'federated_operator'`
- Excludes test accounts (`test@example.com`)

`PeerProfileModal` handles federated operators with an instance context card.

### 5.5 Database

71 Prisma models, 2237 lines in `schema.prisma`. Key tables:

- **User** — accounts, `notificationPrefs` JSON
- **KanbanCard**, **CardLink**, **ChecklistItem**, **CardArtifact**, **CardContact**
- **Project**, **ProjectMember**, **ProjectInvite**
- **Team**, **TeamMember**, **TeamInvite**, **TeamBilling**, **TeamSpendingPolicy**
- **Connection** — peer relationship (local or federated)
- **AgentRelay**, **AmbientRelaySignal**, **AmbientPattern**, **RelayTemplate**
- **CommsMessage** — threaded messages per connection
- **QueueItem** — per-user actionable queue
- **ChatMessage**, **AgentMessage** — Divi chat history
- **Contact**, **ContactRelationship** — CRM
- **ActivityLog** — audit trail (also feeds notification center)
- **Webhook**, **WebhookLog** — outbound integrations
- **MarketplaceAgent**, **AgentCapability**, **CapabilityUsageLog** — Bubble Store
- **IntegrationAccount**, **ExternalApiKey**, **ServiceApiKey**, **AgentApiKey**
- **FederatedInstance**, **FederatedUser**, **FederatedOperator**
- **Document**, **Recording**, **CalendarEvent**, **EmailMessage**
- **UserLearning**, **BehaviorSignal**, **WorkflowPattern**
- **NotificationRule**, **SignalConfig**, **CustomSignal**

**Constraints**: shared dev/prod → additive changes only, 25 max concurrent connections (pool limit set to 5 in `prisma.ts`), 5s statement timeout, 30s idle-in-transaction timeout.

---

## 6. Critical Files You'll Touch Most

| File | Size | Why |
|------|------|-----|
| `src/lib/system-prompt.ts` | ~1700 L | Dynamic system prompt, 17 groups, relevance scoring |
| `src/lib/action-tags.ts` | ~2000+ L | All tag handlers + SUMMARY_PATTERNS sanitizer |
| `src/lib/llm.ts` | | LLM integration + fallback chain |
| `src/lib/updates.ts` | 3812 L | Public-facing updates feed (add new entries at top) |
| `src/components/dashboard/ChatView.tsx` | 86 KB | Chat UI, relay rendering, tag result cards. **Use `file_edit_lines`, not `file_str_replace`** — contains unicode ellipses that break string matching. |
| `src/components/dashboard/KanbanView.tsx` | 36 KB | Board + card rendering, ghost avatars |
| `src/components/dashboard/CardDetailModal.tsx` | 46 KB | Card detail incl. Contributors section |
| `src/components/dashboard/QueuePanel.tsx` | 58 KB | Queue with interactive accept/decline |
| `src/components/dashboard/NowPanel.tsx` | | Top urgent items |
| `src/components/dashboard/CenterPanel.tsx` | | Main dashboard tab router |
| `src/app/api/chat/send/route.ts` | | LLM streaming + tag execution |
| `src/app/api/projects/[id]/invite/route.ts` | | ⭐ The v2.3.1 epicenter |
| `src/app/api/project-invites/route.ts` | | Accept/Decline handler |
| `src/lib/federation-push.ts` | | Outbound federation pushes |
| `prisma/schema.prisma` | 2237 L | DB schema |

---

## 7. Developer Workflow (every change goes through this)

### 7.1 Before editing

1. `read_project_instructions` to refresh persistent memory.
2. Grep to find existing implementations — DO NOT assume.
3. For large changes, write a todo list with `todo_write`.

### 7.2 Editing rules

- Use `batch_file_write` for multi-file changes.
- Use `file_edit_lines` (line-numbered) for `ChatView.tsx` — unicode breaks string matching.
- Use `file_str_replace` for surgical single-location edits elsewhere.
- Never break Prisma schema backwards compat — additive only.

### 7.3 After editing

**Skip `test_nextjs_project`** — it OOMs. Instead:

1. Manual type check (optional, if worried): 
 ```bash
 cd /home/ubuntu/dividen_command_center/nextjs_space && \
 NODE_OPTIONS="--max-old-space-size=8192" yarn tsc --noEmit
 ```
2. `build_and_save_nextjs_project_checkpoint` with a short 4-5 word description.
3. `deploy_nextjs_project` with NO `hostname` and NO `deployment_tag` (updates both domains).
4. Git commit + push:
 ```bash
 cd /home/ubuntu/dividen_command_center && \
 git add -A && \
 git commit -m "feat(vX.Y.Z): headline
 
 - Detail line 1
 - Detail line 2" && \
 git push origin main
 ```
5. Update `.project_instructions.md` if anything architectural changed.

### 7.4 Debugging

- `fetch_server_logs` with `server_type: 'prod'` first.
- Scripts for DB introspection: `scripts/check_recent2.ts`, `scripts/check_duplicates.ts`.
- If Divi hallucinates, run `scripts/purge_polluted.ts` to clean chat history.
- Use `browser_open` on preview URL for visual verification when Jon reports a UI bug.

---

## 8. Test Accounts & Key User IDs

| User | ID | Email | Role |
|------|----|----|------|
| Jon (owner) | `cmo1kgydf00o4sz086ffjsmp1` | `jon@colab.la` | Primary, all admin powers |
| Jaron | `cmo1milx900g9o408deuk7h2f` | `jaronrayhinds@gmail.com` | Local, non-federated peer |
| Alvaro (FVP) | `cmo1n6psb023co408ikcsw7xb` | `alvaro@fractionalventure.partners` | Federated peer (cross-instance tests) |

Both Jon↔Jaron and Jon↔Alvaro connections are `active`. Use Jaron for same-instance tests, Alvaro for federation tests.

---

## 9. Known Gotchas & Land-Mines

1. **`ChatView.tsx` unicode**: Ellipsis characters (`…`) break `file_str_replace`. Use `file_edit_lines`.
2. **TSC OOM**: Default Node heap can't build this project. Always `NODE_OPTIONS="--max-old-space-size=8192"`.
3. **No light mode**: Jon has vetoed. Don't add theme toggles.
4. **GPT-4o ≠ action tags**: If user's OpenAI key is selected, tags won't fire reliably. Abacus Claude is PRIMARY for a reason.
5. **Shared DB**: dev and prod share a single Postgres. Any `DROP` or `--accept-data-loss` destroys production.
6. **Comms peer resolution**: Never use `conn.requester` / `conn.accepter` positionally. Compare `.id` to `userId` to pick the OTHER side. Pattern used in `CommsTab.tsx` and `comms/page.tsx`.
7. **`export const dynamic = 'force-dynamic'`**: Required on any route reading `process.env.NEXTAUTH_URL` (build-time value ≠ runtime).
8. **Divi hallucination trap**: If Divi reports "duplicate tag", "first fired, second failed", or quotes a `cmo...` ID from memory — she's hallucinating. Check the DB first. See `.project_instructions.md`.
9. **Seed.ts**: modify, never replace. Don't add `delete` calls — will nuke prod data.
10. **Abacus `max_tokens`**: Set to 8192 in `llm.ts`. Lower values truncate responses on the large system prompt.

---

## 10. Documentation Surface (all current as of v2.3.1)

| URL | File | Purpose |
|-----|------|---------|
| `/docs/release-notes` | `src/app/docs/release-notes/page.tsx` | Versioned release notes (v2.3.1 marked LATEST) |
| `/docs/developers` | `src/app/docs/developers/page.tsx` | API reference for integrators |
| `/docs/relay-spec` | `src/app/docs/relay-spec/page.tsx` | Canonical relay protocol spec |
| `/docs/federation` | `src/app/docs/federation/page.tsx` | DAWP federation protocol |
| `/docs/integrations` | `src/app/docs/integrations/page.tsx` | External integrations guide |
| `/docs/project-invites-integration` | `src/app/docs/project-invites-integration/page.tsx` | **NEW v2.3.1** — canonical recipe for implementing the invite-as-comms pattern (640 lines, 13 sections) |
| `/documentation` | `src/app/documentation/page.tsx` | Docs hub landing |
| `/updates` | rendered from `src/lib/updates.ts` | User-facing updates feed |
| `/docs/fvp-cross-operability-v2.2` | `public/docs/fvp-cross-operability-v2.2.md` | Static MD — FVP cross-operability spec |
| `public/docs/self-test-prompts.md` | | Living doc of Divi-executable self-test prompts |

All developer-facing docs were fully synced to platform reality in this session. If you change an API contract, update `developers/page.tsx` AND the relevant spec page AND add a release-notes entry AND an updates.ts entry.

---

## 11. The Four-Signal Pattern (design guideline)

This is the principle v2.3.1 codified. Any important mutation should emit **all four** of:

1. **State mutation** — the source-of-truth DB write (e.g. `ProjectInvite`)
2. **Queue item** — so it surfaces as an action in the recipient's queue
3. **AgentRelay** — so it's logged on both sides' comms and picked up by federation push
4. **CommsMessage** — so the recipient's Divi sees it as a natural conversation

One transaction, four surfaces, zero polling. When Jon asks "make X feel like a message" — this pattern is the answer.

Next candidates for this pattern (not yet shipped): project role changes, shared-context handoffs, team membership events.

---

## 12. Open Threads / Likely Next Asks

Based on uploaded context and recent trajectory:

1. **Comms threading architecture** — FVP team proposed a design (see `FVP_COMMS_THREADING_ARCHITECTURE.md`). Jon's outgoing reply is in `TRANSITION_v2.1.15_TO_FVP_REPLY.md`. Implementation not yet started.
2. **Apply the four-signal pattern to team invites** — currently lives on `TeamInvite` table but doesn't emit relay+comms. Natural next step.
3. **Apply the four-signal pattern to project role changes** — changing someone from `contributor` to `lead` should feel like a message, currently silent.
4. **Self-hosting guide hardening** — Jon periodically audits `os.dividen.ai` (SEPARATE repo at `/home/ubuntu/dividen`, needs its own DA conversation).
5. **Divi self-testing protocol** — `public/docs/self-test-prompts.md` exists. Each bug fix should produce a Divi-executable test prompt.

---

## 13. Cardinal Rules (from `.project_instructions.md`)

> These are non-negotiable. Reading `.project_instructions.md` every session is mandatory — it's updated as the project evolves.

- **Skip `test_nextjs_project`** (OOMs).
- **Dark theme only**, no toggles.
- **Abacus Claude PRIMARY** for LLM.
- **Never destructure `.data`** from `useSession()` directly — use `const { data: session, status } = useSession() || {}`.
- **Shared DB** — additive schema only.
- **Natural-language test prompts only** — never paste `[[tag:...]]` syntax at Divi.
- **Never blame Abacus.AI** in user-facing responses on billing/credits issues — use `abacus_billing_support` tool.
- **Commit → Push** after every deploy. Git remote is `Denominator-Ventures/dividen`.

---

## 14. Quick-Start Checklist for a Fresh DA

```
[ ] Read this file top-to-bottom
[ ] Call read_project_instructions to load .project_instructions.md
[ ] Skim TRANSITION.md (v2.1.0 baseline — background context)
[ ] Glance at DIVIDEN_PROJECT_BIBLE.md if you want the philosophy
[ ] Check git log --oneline -20 for very-recent commits you might have missed
[ ] Check src/lib/updates.ts top entry for the current shipped version
[ ] Look at .env.example if you need to know what env vars exist
[ ] If user mentions FVP, read FVP_BUILD_522_REPLY.md and the two uploaded comms-threading docs
[ ] When editing is done: checkpoint → deploy → commit → push → update .project_instructions.md
```

---

## 15. Contact Map

- **Jon Bradford** — founder, primary user, decision-maker. Direct technical, no fluff.
- **Jaron** — local test peer (same-instance).
- **Alvaro** / **FVP (Fractional Venture Partners)** — federated peer. Cross-instance integration partner. They've been sending architecture proposals that Jon iterates on and replies to via MD files in project root.
- **Denominator Ventures** — GitHub org, MIT license.

---

## 16. If All Else Fails

- `fetch_server_logs` with `server_type: 'prod'` — most bugs Jon reports are already visible in logs.
- `get_database_stats` — rarely needed but handy when debugging data issues.
- `restore_nextjs_checkpoint` — if you break something catastrophic, present the restore UI.
- Ask Jon. He's direct and unambiguous. He'd rather you clarify than ship wrong.

---

**End of transition doc.** If you're a fresh DA reading this, you now have everything you need. Good luck.

— Prior DA session (v2.3.1 ship, 2026-04-18)
