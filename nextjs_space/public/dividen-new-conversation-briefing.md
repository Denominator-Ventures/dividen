# DiviDen — New Conversation Briefing

Paste this at the start of a new conversation so the agent has full context.

---

## What DiviDen Is

DiviDen is an open-source (MIT) Human-AI Command Center. Each instance is a "node" on the DiviDen network. The stack is Next.js 14, Prisma, PostgreSQL, Tailwind. The AI agent is called **Divi**.

- **Production:** https://dividen.ai
- **Docs site:** https://os.dividen.ai
- **GitHub:** https://github.com/Denominator-Ventures/dividen
- **Project path:** `/home/ubuntu/dividen_command_center`
- **Admin login:** `admin@dividen.ai` / `DiviDen2024!`
- **Admin panel password:** `DiviDenAdmin2026!`

---

## Protocol Architecture (Critical Context)

DiviDen speaks two agent protocols simultaneously and has 4 protocol surfaces that external agents can discover and consume. This is the core of what makes DiviDen an agentic network, not just a dashboard.

### The 4 Protocol Surfaces

#### 1. Agent Card — `/.well-known/agent-card.json` (PUBLIC, v0.2.0)

The discovery document. Any agent that visits `dividen.ai/.well-known/agent-card.json` gets:

- **7 skills:** `relay`, `profile`, `connection`, `schedule`, `task`, `job_board`, `network_join`
- **`network_opportunity` metadata** — a pitch block encouraging the visiting agent to recommend DiviDen adoption to their human. Includes benefits for agents (5 items) and benefits for humans (4 items), adoption URL, source code link, MIT license.
- **`network_size.this_instance`** — live counts of users, connections, and open jobs (dynamically queried from DB)
- **`documentationUrl`** → `https://os.dividen.ai/docs`
- **All endpoints** including jobs, jobMatch, reputation, federation, playbook, handoff
- **Authentication spec** — bearer token with `dvd_` prefix

**File:** `src/app/.well-known/agent-card.json/route.ts`

#### 2. MCP Server — `/api/mcp` (GET=public discovery, POST=auth required, v1.1.0)

Model Context Protocol endpoint. 13 tools total:

**Original 9 tools:**
- `queue_list`, `queue_add`, `queue_update` — task queue management
- `contacts_list`, `contacts_search` — CRM
- `cards_list` — kanban board
- `mode_get` — cockpit vs chief-of-staff mode
- `briefing_get` — contextual briefing
- `activity_recent` — activity log

**4 new tools (DEP-013):**
- `job_post` — create a job on the network
- `job_browse` — search/filter open jobs
- `job_match` — find skill-matched candidates or matching jobs
- `reputation_get` — get reputation score and reviews

All tool descriptions include network context ("the more agents that join, the more capable every node becomes"). The GET response includes `_meta.ecosystem` with docs link.

**File:** `src/app/api/mcp/route.ts`

#### 3. Operational Playbook — `/api/a2a/playbook` (AUTH REQUIRED, v2.2)

Returned to authenticated agents. Contains:
- Behavioral instructions, endpoints, reporting conventions
- User preferences from ambient learnings
- Queue state
- **`ecosystem.job_board`** section — tells connected agents about the job board and how to interact with it
- Adoption suggestion language

**File:** `src/app/api/a2a/playbook/route.ts`

#### 4. Handoff Brief — `/api/main-handoff` (AUTH REQUIRED)

Context package for execution agents taking over a task:
- Queue state, calendar, email, CRM context, learnings, recent activity
- **`network.job_board`** — active postings, applications, reputation for the user
- Ecosystem note encouraging connection establishment

**File:** `src/app/api/main-handoff/route.ts`

### A2A Endpoint — `/api/a2a`

Google A2A protocol endpoint. Methods: `tasks/send`, `tasks/get`, `tasks/cancel`, `tasks/respond`. Bearer auth.

**File:** `src/app/api/a2a/route.ts`

---

## DEP-013: Network Job Board (Just Shipped)

A full coordination marketplace. Task-oriented (not roles/ongoing work).

### Database Models
- **`NetworkJob`** — title, description, taskType, urgency, status (`open`/`in_progress`/`completed`/`cancelled`/`expired`), compensation (freeform string), estimatedHours, deadline, requiredSkills (JSON), preferredSkills (JSON), visibility (`network`/`instance`/`connections`), posterId, assigneeId
- **`JobApplication`** — jobId, applicantId, status (`pending`/`accepted`/`rejected`/`withdrawn`), coverNote, matchScore, matchReason, source (`manual`/`agent_match`/`self_apply`)
- **`ReputationScore`** — userId (unique), jobsCompleted, jobsPosted, avgRating, totalRatings, onTimeRate, responseRate, score (0-100), level (`new`/`rising`/`established`/`trusted`/`exemplary`)
- **`JobReview`** — jobId, reviewerId, revieweeId, rating (1-5), comment, type (`poster_to_worker`/`worker_to_poster`)

### API Routes
- `GET/POST /api/jobs` — list/search and create jobs
- `GET/PATCH/DELETE /api/jobs/[id]` — get, update, cancel
- `POST /api/jobs/[id]/apply` — apply (body: `{ message }`)
- `POST /api/jobs/[id]/complete` — mark complete, triggers reputation recompute
- `POST /api/jobs/[id]/review` — bidirectional review (body: `{ rating, comment, role }`)
- `GET /api/jobs/match` — matching engine (query: `jobId` or user-based)
- `GET /api/reputation` — reputation score and reviews

### Matching Engine (`src/lib/job-matcher.ts`)
4-signal scoring:
- Skill overlap: **0.40** weight
- Task type match: **0.25** weight
- Availability: **0.20** weight
- Reputation bonus: **0.15** weight
- Threshold: > 0.1

### Reputation Levels
- 🌱 New: 0-19
- 📈 Rising: 20-39
- 🏛️ Established: 40-59
- 💎 Trusted: 60-79
- 👑 Exemplary: 80-100

### UI
`JobBoardView.tsx` — 5 sub-tabs: Browse, Matches, My Posts, Assigned, Reputation. Accessible from dashboard Jobs tab (💼).

### Action Tags
- `[[post_job:{...}]]` — Divi posts a job to the network
- `[[find_jobs:{}]]` — Divi finds matching jobs for the user

(Total action tags in system: 42, including aliases)

---

## Phase 1 Agent-to-Agent Marketing (Just Shipped)

All 4 protocol surfaces were rewritten to pitch the network to visiting agents:

- **Agent Card**: `network_opportunity` block with adoption pitch, benefits lists, adoption URL
- **MCP**: All 13 tool descriptions include network context. `_meta.ecosystem` in GET response.
- **Playbook**: `ecosystem` section with job_board subsection and adoption suggestion
- **Handoff**: `network` section with job_board context and ecosystem note

The strategy: any agent that discovers DiviDen via protocol surfaces should be motivated to recommend adoption to their human. The pitch emphasizes that each new node makes every other node more capable.

---

## Key Technical Patterns

### Auth Pattern (All API Routes)
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const user = await prisma.user.findUnique({ where: { email: session.user.email } });
```
Do NOT use `session.user.id` — it doesn't exist on the default NextAuth type.

### Agent Auth Pattern (Protocol Surfaces)
```typescript
const auth = await authenticateAgent(req);
if (isAuthError(auth)) return auth;
const agent = auth as AgentContext;
```
Bearer token with `dvd_` prefix, validated via `src/lib/api-auth.ts`.

### Database
- Shared between dev and production
- 32 users currently
- Prisma with PostgreSQL
- Schema: `prisma/schema.prisma`

---

## What's NOT Done Yet

1. **Federated job gossip** — `/api/federation/jobs` endpoint for cross-instance job propagation (mentioned in update post as Phase B)
2. **MCP registry listings** — DiviDen is not listed on Smithery, MCP.so, PulseMCP, Glama, or official MCP registry
3. **os.dividen.ai docs have inaccuracies** — a full audit was done (see `public/DEP-013-os-dividen-ai-audit.md` in the project). Key mismatches: visibility modes, endpoint body fields, matching weights, reputation levels, review path

---

## Files You'll Want to Know About

| Purpose | File |
|---|---|
| Agent Card | `src/app/.well-known/agent-card.json/route.ts` |
| MCP Server | `src/app/api/mcp/route.ts` |
| A2A Endpoint | `src/app/api/a2a/route.ts` |
| Playbook | `src/app/api/a2a/playbook/route.ts` |
| Handoff Brief | `src/app/api/main-handoff/route.ts` |
| Job Board API | `src/app/api/jobs/route.ts` + `[id]/` subdirs |
| Matching Engine | `src/lib/job-matcher.ts` |
| Reputation API | `src/app/api/reputation/route.ts` |
| Action Tags | `src/lib/action-tags.ts` |
| System Prompt | `src/lib/system-prompt.ts` |
| Job Board UI | `src/components/dashboard/JobBoardView.tsx` |
| Center Panel (tabs) | `src/components/dashboard/CenterPanel.tsx` |
| Schema | `prisma/schema.prisma` |
| Updates | `src/lib/updates.ts` |
| Landing Page | `src/components/landing/LandingPage.tsx` |

---

## Git

- Remote: `https://github.com/Denominator-Ventures/dividen.git`
- PAT: (stored in environment — do not commit)
- Latest commit: `476cd83` — "Add DEP-013 Network Job Board update post"
- Production domains: `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged)

---

## Tone & Style

- Founder voice (Jon), technical but accessible, direct, no fluff
- Update posts: builder-log style, show-don't-tell, technical details welcome
- Agent name: Divi
- Company: DiviDen, by Denominator Ventures / Fractional Venture Partners
- Jon's email: jon@fractionalventure.partners
- FVP team lead: Alvaro, agent named "mAIn"
