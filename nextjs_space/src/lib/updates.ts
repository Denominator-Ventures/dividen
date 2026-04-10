/**
 * DiviDen Updates / Changelog
 * 
 * Each update is a timestamped entry written in founder voice.
 * Add new entries to the top of the array.
 */

export interface Update {
  id: string;
  date: string;         // ISO date string (YYYY-MM-DD)
  time?: string;        // Time string for display, e.g. "2:30 PM" — optional for backwards compat
  title: string;
  subtitle?: string;
  tags: string[];
  content: string;      // Markdown-ish content (rendered with basic formatting)
}

export const UPDATES: Update[] = [
  {
    id: 'dep-013-network-job-board',
    date: '2026-04-10',
    time: '12:00 AM',
    title: 'DEP-013: The Network Job Board — Where Work Finds You',
    subtitle: 'DiviDen now has a coordination marketplace. Post tasks, match talent by skills, build portable reputation. Every agent on the network is now a recruiter.',
    tags: ['dep', 'network', 'marketplace', 'reputation', 'federation', 'agent-protocol'],
    content: `This one changes the game.

Until today, DiviDen's coordination was entirely **bilateral**. You needed an existing connection to send a relay. That's fine for teams, but it doesn't answer the question: *what if no one in your network can do this?*

DEP-013 introduces the **Network Job Board** — the third coordination primitive alongside relays and connections. It's the marketplace layer of DiviDen, and it fundamentally shifts the value proposition of the network.

## The Problem

You have a task. Maybe it's market research, maybe it's a technical review, maybe you need an introduction to someone in Tokyo. You ask Divi, and Divi checks your connections — but nobody matches. Today, that's where it stops. You go find someone manually.

## The Solution

Now, Divi posts the task to the **network job board**. Every agent on every DiviDen instance evaluates it against their human's skills, task types, and availability. When there's a match, the agent proactively surfaces it: *"Hey, there's a research task on the network that matches your skills. Pays $500. Want me to apply?"*

No manual search. No job boards. No LinkedIn. Your agent finds the work. Their agent finds the talent. The network does the matching.

## How It Works

### Posting
Post a task with a title, description, required skills, task type, urgency, estimated hours, and compensation terms. Compensation is freeform — could be cash, equity swap, mutual exchange, or volunteer. Visibility controls who sees it: the entire network, your local instance, or just your connections.

### Matching Engine
The matching engine scores every user profile against every open job using four weighted signals:

- **Skill overlap (40%)** — hard match on required and preferred skills
- **Task type alignment (25%)** — does this person do this kind of work?
- **Availability (20%)** — are they marked as available, limited, busy, or unavailable?
- **Reputation bonus (15%)** — higher reputation = better match positioning

Matching works in both directions: find people for your job, or find jobs that match your profile.

### Reputation System
This is the lock-in mechanism — and it's entirely earned.

Every user starts at 🌱 **New** (score 0). Your reputation score (0-100) is computed from:

- **Jobs completed** — the more you deliver, the higher you climb
- **Average rating** — bidirectional 1-5 star reviews after every job
- **On-time rate** — did you finish before the deadline?
- **Response rate** — as a poster, did you respond to applications?

The levels: 🌱 New → 📈 Rising → 🏛️ Established → 🛡️ Trusted → 👑 Exemplary

Reputation is **portable across the network** but only exists *on* the network. You can't take your DiviDen reputation to LinkedIn. This is deliberate.

### Proactive Agent Matching
Divi doesn't wait for you to browse the board. Two new action tags — \`[[post_job]]\` and \`[[find_jobs]]\` — let Divi operate the job board through natural conversation:

> *"I need someone who can do a competitive analysis of the AI agent coordinator space."*
> *Divi:* "I'll post that to the network job board. I've tagged it as research, high urgency, with required skills: market research, competitive analysis, AI. I'll let you know when we get matches."

And on the other side:

> *Divi to another user:* "There's a new job on the network that matches your skills — competitive analysis in the AI agent space, high urgency, $500. Want me to apply on your behalf?"

## The Viral Loop

This is the part I'm most excited about.

The job board creates a **concrete economic incentive** for agents to recommend DiviDen adoption. Before DEP-013, the Phase 1 marketing strategy was "tell other agents the network exists." Now it's "tell other agents there's **work waiting** on the network for their humans."

Here's the loop:

1. Human A posts a task → no match in their connections
2. Task goes to the network board → visible to all agents
3. Agent B on another instance sees the match → surfaces it to their human
4. If human B isn't on DiviDen yet → the agent recommends adoption because there's tangible value waiting
5. Human B joins → builds reputation → posts their own tasks → network grows

The agent card now broadcasts \`openJobs\` in the network size metadata. Every discovering agent can see there's live work on the network. That's not a pitch — that's a pull.

## Protocol Surface Integration

The job board is fully wired into every protocol surface:

- **[Agent Card](https://dividen.ai/.well-known/agent-card.json)**: New \`job_board\` skill, job endpoints, \`openJobs\` in network size
- **MCP**: Four new tools — \`job_post\`, \`job_browse\`, \`job_match\`, \`reputation_get\`
- **[Playbook](/api/a2a/playbook)**: Job board section with endpoints and behavioral instructions for connected agents
- **[Handoff Brief](/api/main-handoff)**: Job board context for execution agents

Every agent that reads the agent card now knows the marketplace exists. Every agent that reads the playbook knows to check for matching jobs. The network is now self-recruiting.

## What's in the Dashboard

A new **💼 Jobs** tab in the command center with five views:

- **🌐 Browse** — all open jobs on the network
- **✨ Matches** — AI-scored job matches for your profile
- **📤 My Posts** — jobs you've posted
- **📥 Assigned** — jobs assigned to you
- **⭐ Reputation** — your score, level, stats, and reviews

Full job creation modal, detail views with application lists, star rating reviews, and status management.

## Technical Details

- **4 new database models**: \`NetworkJob\`, \`JobApplication\`, \`ReputationScore\`, \`JobReview\`
- **7 new API endpoints**: CRUD, apply, complete, review, match, reputation
- **Matching engine** in \`/lib/job-matcher.ts\` with bidirectional scoring
- **Action tags**: \`[[post_job]]\` and \`[[find_jobs]]\` for conversational job board interaction
- Open source. [GitHub](https://github.com/Denominator-Ventures/dividen). [MIT License](https://opensource.org/licenses/MIT).

## What's Next

**Phase B: Federated Jobs.** Right now, the job board is local to each instance. Phase B propagates jobs across federated instances via a new \`/api/federation/jobs\` endpoint — federated job gossip. Your agent hears about jobs from the entire network, not just your instance.

The coordination marketplace is live. The network is now a place where work finds you.

— Jon`,
  },
  {
    id: 'dep-implementation-fvp-contribution',
    date: '2026-04-09',
    time: '5:30 PM',
    title: '12 Extension Proposals, One Session — The FVP Contribution',
    subtitle: 'Alvaro and the [Fractional Venture Partners](https://fractionalventure.partners) team submitted a complete DEP package. All 12 proposals are now implemented. DiviDen can now run with an external execution agent.',
    tags: ['federation', 'agent-protocol', 'open-source', 'community', 'dep'],
    content: `This is the update I've been most excited to write. Not because of the feature count — though it's significant — but because of what it represents. Someone outside our core team read the protocol, understood the architecture, and came back with a coherent package of 12 extension proposals that fit together like a system design doc.

**Thank you to Alvaro and the entire [Fractional Venture Partners](https://fractionalventure.partners) team.** You didn't just suggest features — you submitted structured DEPs (DiviDen Extension Proposals) with specs, integration points, and dependency graphs. This is the kind of contribution that makes an open-source protocol real. You saw what DiviDen could be and drew the map to get there.

## What Are DEPs?

DEP stands for DiviDen Extension Proposal. Think of them like RFCs for the protocol — structured specs that describe a capability, how it integrates with the existing architecture, and what it depends on. The FVP team submitted 12 of them, plus a quick fix, organized with an index document showing dependencies between proposals.

## The Dual-Agent Architecture (DEPs 001, 004)

The most fundamental change: DiviDen now has a formal two-agent model. **Cockpit mode** is you driving, Divi assisting. **Chief of Staff mode** is Divi driving, you approving. This existed before — but the transition between modes was passive. Now it's active.

When you switch to Chief of Staff mode, DiviDen fires a **wake event** to any connected execution agent, includes a snapshot of your queue state, and auto-dispatches the highest-priority ready item. When you switch back to Cockpit, you get a **three-phase briefing**: how many tasks were completed, what's blocked, and what's still in the queue. No more "what happened while I was away?" — the system tells you.

## The Connection Ceremony (DEP-006)

External agents now have a formal way to connect. \`POST /api/main-connect\` runs a **Connection Ceremony**: deactivates previous agent sessions, generates a fresh API key, registers the agent instance, creates the routing connection, logs it to your comms channel, and returns a credential package with every endpoint the agent needs.

There's a matching \`POST /api/main-disconnect\` for graceful teardown — cancels in-flight relays, deactivates the instance, and logs the disconnection.

This is how [mAIn](https://fractionalventure.partners) (the FVP execution agent) connects to DiviDen. But it's not FVP-specific — any agent that speaks the protocol can use the same ceremony.

## The Relay↔Queue Bridge (DEP-003)

The most technically interesting piece. Before this, relays (agent-to-agent messages) and queue items (task management) were independent systems. Now they're bidirectionally linked.

**Direction 1**: When an execution agent reports task completion via \`tasks/respond\`, the relay is marked complete AND the linked queue item is automatically marked \`done_today\`, triggering the next sequential dispatch.

**Direction 2**: When you mark a queue item done in the dashboard, any linked relay is automatically resolved.

**Direction 3**: When CoS mode dispatches a task, it can create both a relay and a queue item simultaneously, linked by a new \`queueItemId\` field on the relay.

This means the execution agent and the dashboard always agree on task state. No drift.

## Webhook Push (DEP-008)

Fire-and-forget webhook delivery for four event types: \`task_dispatched\`, \`new_message\`, \`wake\`, and \`queue_changed\`. Wired into every state change that matters — dispatch, queue updates, mode switches.

Configuration is stored per-user in the service API keys table. Point it at your execution agent's webhook endpoint and every significant event pushes automatically. 5-second timeout, silent failures, never blocks the caller.

## Desktop Notifications (DEP-007)

OS-level desktop notifications with per-category toggles (queue, meetings, email, comms). Fires only when the browser tab is NOT focused — because the point is to pull you back, not annoy you while you're already looking.

Integrated into the mode toggle: when auto-dispatch fires in CoS mode, you'll see a notification even if you've tabbed away. When you switch back to Cockpit and get a briefing, same thing.

## MCP Server (DEP-010)

DiviDen now exposes a [Model Context Protocol](https://modelcontextprotocol.io/) endpoint at \`/api/mcp\`. This means any MCP-compatible client can discover and invoke DiviDen tools — queue management, relay sending, calendar access — through a standardized interface. \`tools/list\` returns available tools, \`tools/call\` executes them.

## Operational Playbook (DEP-011)

\`GET /api/a2a/playbook\` returns a structured rule set for execution agents: behavioral preferences, communication style, escalation rules, current queue state, trust level. It's the "how to work with this human" manual. The playbook is derived from ambient learnings, so it gets more accurate the more you use DiviDen.

## Handoff Brief (DEP-012)

\`GET /api/main-handoff\` generates a complete context package: queue state, calendar events, email count, recent activity, active learnings, goals, and explicit instructions. This is what an execution agent reads before starting work — everything it needs to pick up where you left off.

## Agent Card Enhancement (DEP-009)

The \`/.well-known/agent-card.json\` now advertises all new endpoints: connect, disconnect, playbook, handoff, MCP. Push notifications capability is set to true. Any agent doing discovery will see the full surface area.

## Sequential Dispatch Enhancement (DEP-002)

Already existed, but now wired into the webhook system. Every dispatch fires a \`task_dispatched\` event so connected agents know immediately when work is available.

## Ambient Learning (DEP-005)

Already existed. The learning engine feeds into the playbook (DEP-011) — patterns about communication style, workflow preferences, and delegation habits inform the rules that execution agents follow.

## For Open Source Builders

If you're running your own DiviDen instance, here's what this means for you:

**New endpoints**: \`/api/main-connect\`, \`/api/main-disconnect\`, \`/api/a2a/playbook\`, \`/api/main-handoff\`, \`/api/mcp\`. All authenticated via Bearer token.

**New A2A method**: \`tasks/respond\` — your execution agent can now report task completion back to DiviDen and trigger the sequential dispatch chain.

**Schema change**: \`AgentRelay\` now has a \`queueItemId\` field. Run \`npx prisma migrate deploy\` to apply.

**Webhook setup**: Store your webhook URL in the service API keys table with \`service: 'webhook_push'\` and \`keyValue: JSON.stringify({ url: 'https://your-agent/webhook', token: 'optional-bearer' })\`.

**The big picture**: You can now build an execution agent that connects to DiviDen, receives task assignments via webhook, reads context via the handoff brief, follows rules from the playbook, reports results via \`tasks/respond\`, and the whole cycle repeats automatically in Chief of Staff mode. The protocol handles everything in between.

This is the foundation for multi-agent coordination. Thank you again to the FVP team for seeing it and building the spec. The protocol is better because you contributed.

— Jon`
  },
  {
    id: 'hardening-open-source-community',
    date: '2026-04-09',
    time: '4:00 PM',
    title: 'Hardening the Protocol, Opening the Repo',
    subtitle: 'Security fixes, performance optimization, production stability, and the first community-driven improvements to the open source setup.',
    tags: ['security', 'performance', 'open-source', 'community'],
    content: `This update is a collection of things that don't have flashy demos but matter more than anything we've shipped so far. It's the difference between a prototype and infrastructure people can depend on.

And a big thank you to **Robert** — who pulled down the repo, ran through the full setup on his own machine, and sent back detailed notes on every friction point he hit. This is exactly how open source is supposed to work. You shipped code, someone used it, they told you what was broken, you fixed it. That loop is everything.

## Security — Scoped Data Access

A critical fix that should have shipped earlier: all \`/api/v2/queue\` endpoints now scope queries to the authenticated user's ID. Before this, any authenticated user could theoretically access another user's queue items by ID. The data was never exposed in the UI — but the API allowed it. That's not acceptable.

Every query now includes \`userId\` in the WHERE clause. Same treatment applied across the v2 surface — contacts, kanban, docs. If you're authenticated as user A, you can only see user A's data. No exceptions.

This is a foundational rule for the protocol: **your data lives in your instance, scoped to your identity.** Federation doesn't change that — federated connections see what you explicitly share via relays, briefs, and project context. They never get raw access to your tables.

## Performance — Connection Pool and Query Optimization

Two performance problems that were invisible at low traffic but would have been devastating at scale.

**Connection pool exhaustion.** Several API routes were firing multiple database queries in parallel using \`Promise.all\`. On paper, that's faster. In practice, with a constrained connection pool, it's a denial-of-service against yourself. The \`/api/now\` endpoint — which fires every 2 minutes per active user — was opening 5 parallel connections. The search endpoint opened 8. Stack a few concurrent users and the pool is gone.

Every parallel query batch has been converted to sequential awaits. The latency increase is negligible — we're talking single-digit milliseconds on queries that were already fast. The stability improvement is the difference between "works on my machine" and "works in production with real users."

**System prompt query reduction.** The \`buildSystemPrompt()\` function was making ~25 individual database queries — one for each context layer. That's 25 round trips to Postgres every time someone sends a chat message. We consolidated these into batched fetches where possible, bringing it down to ~15 queries. Still room to improve, but the reduction is meaningful when chat is the primary interaction model.

## Schema Management — [Prisma](https://www.prisma.io/) Migrate

We've switched from \`prisma db push\` to \`prisma migrate\`. This matters more than it sounds.

\`db push\` is great for prototyping. It looks at your schema, looks at your database, and makes them match. But it does that by dropping and recreating things when it needs to — including your data. In development, that's fine. In production, with real user data, that's a catastrophe waiting to happen.

\`prisma migrate\` generates versioned migration files. Each migration is a SQL diff that can be reviewed, tested, and rolled back. The migration history lives in the codebase and in the \`_prisma_migrations\` table in your database. You always know exactly what changed and when.

We created a baseline migration from the current schema (1,145 lines of SQL), marked it as applied, and switched all documentation to use \`prisma migrate deploy\`. If you're running your own instance, this is the migration path going forward.

## Open Source Setup — Community-Driven Fixes

Robert's feedback was specific and actionable. Every issue he flagged has been fixed:

**\`.yarnrc.yml\`** — Was hardcoded with Linux-specific paths (\`/opt/hostedapp/...\`) and cache settings that only work in our hosted environment. Stripped all of it. Now it's just \`nodeLinker: node-modules\`. Works on Mac, Windows, Linux.

**\`.env.example\`** — Didn't exist. If you cloned the repo, you had no idea what environment variables were needed. Now there's a fully documented example file covering \`DATABASE_URL\`, \`NEXTAUTH_SECRET\`, \`ADMIN_PASSWORD\`, \`ABACUSAI_API_KEY\`, and optional notification IDs.

**\`.nvmrc\`** — Added. Node 22. Consistent runtime versions across contributors.

**\`.gitignore\`** — Updated with \`.env\` and \`.env.local\`. This was a security gap — environment files with database credentials and API keys should never be committed.

**README** — Expanded significantly. Full prerequisites section, step-by-step setup for both Yarn and npm (\`npm install --legacy-peer-deps\` works fine), environment variable reference table, local database setup instructions (including a [Docker](https://www.docker.com/) one-liner), and a troubleshooting section for common issues.

**npm support** — The project uses Yarn internally, but npm works too. Documented and tested.

## MIT License

Robert also pointed out — correctly — that we had no license file. GitHub's default copyright rules apply without one, but that's ambiguous and not how open source should work.

We've added an **[MIT License](https://opensource.org/licenses/MIT)** (Copyright 2024-2026 [Denominator Ventures](https://denominator.ventures/)). MIT because the protocol should be as forkable and composable as possible. If you want to build on DiviDen — extend it, embed it, run it as infrastructure for your own product — you can. Attribution required, liability disclaimed, everything else is fair game.

## Landing Page and Social Sharing

The public landing page got a refresh — updated branding, cleaner navigation, and proper [Open Graph](https://ogp.me/) metadata so link previews actually look right when shared on LinkedIn, Twitter, or in group chats. The messaging now leads with the protocol, not the product.

## Cockpit Banners — Contextual Notifications

A new notification system surfaces contextual banners in the dashboard based on triggers you define. Meeting starting in 5 minutes? A warning banner slides in. Goal deadline approaching? You'll see it. These are rule-based — you set the event type, conditions, message template, and style in your notification preferences.

The default setup includes a "Meeting Starting Soon" rule that fires 5 minutes before any calendar event. It's a small thing, but it's the kind of ambient awareness that compounds — you stop checking your calendar because Divi already told you.

## Invitation Deep Linking

Connection invitations now support full deep linking. When you invite someone to connect, they get an email with a link that includes an invite token. If they don't have an account, the setup page pre-fills their name and email from the invitation, shows who invited them and their personal message, and after signup automatically accepts the invite and creates the connection. If they already have an account, the login page does the same — sign in and the invite is accepted in the background.

No more "I got an invite email, signed up, and then couldn't find the connection." The flow is seamless from email to connected.

## For Open Source Builders

**Security**: If you've forked DiviDen and added custom API routes, audit them for userId scoping. Every query that touches user-owned data should include \`userId\` in the WHERE clause. We missed this in the v2 endpoints and it's now fixed — learn from our mistake.

**Performance**: If you're running \`Promise.all\` with multiple Prisma queries, convert to sequential awaits unless you've verified your connection pool can handle the concurrency. Our pool limit is 10 connections — yours may be different, but the principle holds.

**Migrations**: Pull the latest and run \`npx prisma migrate deploy\`. The baseline migration will be marked as already applied if your schema is current. All future schema changes will come as versioned migrations.

**Setup**: The README is now your source of truth for getting a local instance running. Docker + Postgres + \`prisma migrate deploy\` + \`prisma db seed\` and you're up.

Thank you again to Robert for testing the setup flow. If you're running your own instance and hit issues, open a [GitHub issue](https://github.com/Denominator-Ventures/dividen/issues) or reach out directly. The protocol gets better when people use it and tell us what's broken.

— Jon`
  },
  {
    id: 'goals-now-engine-prompt-consolidation',
    date: '2026-04-09',
    time: '1:30 AM',
    title: 'Goals, the Dynamic NOW Engine, and a Leaner Brain',
    subtitle: 'DiviDen now knows what you\'re working toward. The NOW panel scores everything in real time. And the system prompt dropped from 19 layers to 10.',
    tags: ['goals', 'now-engine', 'prompt', 'core'],
    content: `Three things shipped tonight that I've been thinking about since the relay protocol went live. They're connected by a single idea: Divi should be opinionated about what you do next.

## Goals — The Missing Layer

Up until now, DiviDen tracked the *mechanics* of work — cards on a board, tasks in a queue, messages in a chat. But it didn't know *why* you were doing any of it. There was no layer for objectives. No way to tell Divi "this quarter, I need to close three partnership deals and ship the federation SDK."

That changes now.

**The Goal model** supports everything you'd expect — title, description, timeframe (week, month, quarter, year), deadline, impact level (low through critical), and a progress percentage. But the interesting part is the hierarchy. Goals can ladder up. A weekly goal like "Draft partnership deck" can be a sub-goal of a quarterly goal like "Close 3 partnerships." When the sub-goal completes, the parent's context updates.

Goals can also be scoped to a **project** or a **team**. If you're running Project Apollo with three federated connections, the goals for that project are visible in that project's context. When Divi assembles a brief or routes a task, it now knows which goals that work serves.

**In the system prompt**, active goals are injected into Group 2 (Active State) right alongside your board and queue. Divi sees them every turn. It knows which goals are critical, which are approaching deadline, and which are stalled.

**Two new action tags**: \`create_goal\` and \`update_goal\`. You can tell Divi "my goal for the month is to finish the API docs" and it'll create the goal with the right timeframe and surface it back to you. You can say "I'm about 60% through the API docs" and it'll update the progress.

The Goals tab in the dashboard groups goals by timeframe, shows impact badges and progress bars, and lets you expand any goal to adjust progress with a slider, view sub-goals, and see linked projects.

## The Dynamic NOW Engine

The old NOW panel was a static list. It fetched your queue, your calendar, and your kanban cards, and just showed them. No opinion. No ranking. No awareness of what actually mattered most.

The new NOW engine is a **scoring system**. Every potential action gets a numerical score based on:

- **Priority weight** — urgent tasks score higher than low-priority ones
- **Deadline proximity** — overdue items get max urgency. Things due in 4 hours score differently than things due next week
- **Goal alignment** — a medium-priority task linked to a critical-impact goal gets boosted. The goal's importance flows down to its associated work
- **Calendar awareness** — the engine finds gaps between your upcoming events and tells you how much time you have. "You have 2 hours before your next meeting — tackle this"
- **Relay freshness** — when a relay response comes back (someone answered your question, unblocked your task), it gets surfaced immediately with a freshness score
- **Stall detection** — high-impact goals with low progress get a boost. If something important isn't moving, it rises

The output is a ranked **Priority Stack** — a numbered list of what to do right now, with urgency indicators (critical/high/medium/low), type icons (queue task, goal deadline, kanban due date, relay response, calendar prep), and the raw score visible for transparency.

Above the stack, a **focus suggestion** appears: "🔴 Partnership deck needs immediate attention" or "You have 90min free — tackle the API docs."

Calendar gaps are detected and shown: the engine finds every block of free time between your events and tells you how much is available. This feeds back into the focus suggestion — Divi won't recommend a 3-hour deep work task when you have 20 minutes until a call.

The NOW panel auto-refreshes every 2 minutes. The scoring runs server-side so it's always current.

**The API**: \`GET /api/now\` returns the full scored output — ranked items, calendar gaps, a goals summary (total/critical/approaching/on-track), and the focus suggestion. This is consumable by any client, including future mobile.

## System Prompt Consolidation — 19 Layers → 10 Groups

The system prompt was getting heavy. Eighteen separate layers, each with its own database queries, its own formatting, its own token budget. Some layers duplicated information — capabilities were listed in Layer 14, Layer 15, AND referenced in Layer 16's setup guide. The people context was split between Layer 6 (CRM) and Layer 18 (profiles). Setup guidance consumed tokens even when setup was complete.

So I consolidated everything into 10 logical groups:

1. **Identity + Rules + Time** — who Divi is, behavioral guardrails, current timestamp
2. **Active State** — NOW focus, Board, Queue, and now Goals. Everything about "what's happening"
3. **Conversation** — recent message history and summary
4. **People** — CRM contacts AND connection profiles, merged into one section
5. **Memory & Learning** — memory tiers and learned behavioral patterns
6. **Schedule & Inbox** — calendar events and unread emails
7. **Capabilities & Syntax** — all action tags in one compressed block
8. **Connections & Relay** — the full relay protocol (kept intact — this one earns its weight)
9. **Extensions** — conditional, only loads if extensions are installed
10. **Platform Setup** — now conditional: if your instance is fully set up, this shrinks to a 3-line status summary instead of the full setup guide

The token savings are meaningful. On a mature instance with complete setup and no extensions, the prompt is noticeably lighter. On a fresh instance that needs the setup guide, it's roughly the same. The setup guide adapts.

The old layer functions are still in the codebase as dead code — they don't affect the build or the runtime, and they serve as documentation of what each consolidated group replaced. They'll get cleaned up in a future pass.

## Claw Mart Removal

I also removed the [Claw Mart](https://www.shopclawmart.com/) extension marketplace integration. It was premature — the marketplace isn't ready for consumer API access yet, and having an import flow that pointed to a marketplace you couldn't actually browse from inside DiviDen was confusing. Extensions still support manual import (paste JSON) and custom configurations. When the marketplace is ready, it'll come back properly.

## For Open Source Builders

**New Prisma model**: \`Goal\` with self-referencing hierarchy (\`parentGoalId\`), project/team scoping, and full lifecycle tracking. Run \`npx prisma db push\` to pick it up. Relations added to \`User\`, \`Project\`, and \`Team\`.

**New APIs**:
- \`GET/POST /api/goals\` — list with filters (status, timeframe, projectId, teamId, parentGoalId) and create
- \`GET/PUT/DELETE /api/goals/[id]\` — CRUD
- \`GET /api/now\` — the dynamic scoring engine output

**New lib**: \`src/lib/now-engine.ts\` — exports \`scoreAndRankNow()\` and the \`NowItem\`/\`NowEngineOutput\` types. The scoring weights (\`PRIORITY_WEIGHT\`, \`IMPACT_WEIGHT\`, \`TIMEFRAME_URGENCY\`) are tunable constants at the top of the file.

**New action tags**: \`create_goal\` and \`update_goal\` in \`action-tags.ts\`.

**System prompt**: \`buildSystemPrompt()\` in \`system-prompt.ts\` is the new consolidated entry point. The helper functions \`buildPeopleLayer()\`, \`buildCapabilitiesAndSyntax()\`, and \`buildSetupLayer_conditional()\` handle the merged groups.

The action tag count is now 32+. The system prompt is 10 groups. The protocol continues to grow.

— Jon`
  },
  {
    id: 'federation-extensions-framework',
    date: '2026-04-08',
    time: '11:55 PM',
    title: 'Federation Project Context and the Extensions Framework',
    subtitle: 'Remote agents can now fetch full project dashboards. And Divi gets an extension system for installable skills and personas.',
    tags: ['federation', 'extensions', 'protocol'],
    content: `Two infrastructure pieces that have been blocking the next phase of the protocol.

## Federation Project Context Endpoint

When federated connections are members of your project, their Divi needs to see what's happening. Up until now, federation supported relay messages and directory lookups — but not the rich project context that local members get.

**New endpoint**: \`GET /api/federation/project/:id/context\`

This uses the same \`x-federation-token\` authentication that all federation endpoints use — the token from the active \`Connection\` record. The endpoint validates that the requesting connection is actually a member of the project (via their \`connectionId\` on a \`ProjectMember\` record, or via their local user's membership).

If access checks pass, it calls the same \`assembleProjectContext()\` function that powers the local project dashboard — cross-member activity, per-member card states, relay history, blocker detection, the full graph. Then it renders it as Markdown via \`generateProjectDashboardMarkdown()\`.

The result: a remote Divi can fetch a project dashboard that's structurally identical to what a local Divi sees. Same data, same format, traversing the federation bridge.

CORS is enabled for cross-origin requests, since federation calls originate from different domains.

## Agent Extensions Framework

This is the scaffolding for the next evolution of what Divi can do.

**The model**: \`AgentExtension\` — a named, versioned, typed block of configuration that augments Divi's capabilities. Three types:

- **Skill** — a new capability with prompt instructions and possibly custom action tags
- **Persona** — a behavioral overlay ("respond like a CFO reviewing numbers")
- **Prompt Layer** — raw prompt text injected into Divi's context

Each extension has a **scope**: user (just you), team, project, or global. Scoping means a skill installed for a specific project only activates when Divi is working in that project's context.

The extension config is a JSON blob: \`promptText\` for raw instructions, \`actionTags\` for new tag definitions, \`parameters\` for settings, \`model\` for LLM preferences. Priority and active flags control load order.

**The loader**: Layer 19 in the system prompt. When \`buildSystemPrompt()\` runs, it fetches all active extensions matching the user's scope — their own, their teams', their projects', and any global ones. If extensions exist, their prompt text and action tag documentation are injected as the final group. If none exist, the group is skipped entirely (zero token cost).

**The UI**: A new 🧩 Extensions tab in the dashboard. List view shows installed extensions with type badges, scope indicators, and active/inactive toggles. Import flow lets you paste a JSON configuration to create a new extension — set the type, scope, and priority.

**The APIs**: Standard CRUD at \`/api/extensions\` and \`/api/extensions/[id]\` with scope validation — you can only see extensions you own, plus team/project/global ones you have access to.

This is the foundation for a marketplace — think [Claw Mart](https://www.shopclawmart.com/) for agent skills. For now, extensions are manual — you write the JSON, you paste it in. But the architecture supports remote loading, versioning, and scoped activation. When the time is right, a marketplace plugs into this directly.

## For Open Source Builders

**New Prisma model**: \`AgentExtension\` — name, slug, type, source, config (JSON text), scope, scopeId, priority, isActive, version.

**New API routes**: \`/api/extensions\` (GET list, POST create) and \`/api/extensions/[id]\` (GET, PUT, DELETE).

**New federation route**: \`/api/federation/project/[id]/context\` — project context for federated connections.

**System prompt**: Layer 19 (\`layer19_agentExtensions\`) in \`system-prompt.ts\` handles extension loading.

The extension config format is intentionally flexible. If you want to build an extension that adds a new action tag, the \`actionTags\` array in the config lets you define the tag name, description, and syntax — the prompt loader will document it for Divi just like the built-in tags.

— Jon`
  },
  {
    id: 'teams-projects-visibility',
    date: '2026-04-08',
    time: '11:30 PM',
    title: 'Teams, Projects, and Cross-Member Awareness',
    subtitle: 'Organizational structure that doesn\'t fight your workflow. Projects with visibility controls. Cross-member dashboards Divi can read.',
    tags: ['teams', 'projects', 'visibility', 'federation'],
    content: `This is the organizational layer that makes everything else work at scale.

## Teams & Projects

Until now, DiviDen was a single-user command center with connections to other single-user command centers. That works for individual operators. It doesn't work when five people need to collaborate on a deal pipeline, or when a product team needs shared context across federated instances.

**Teams** are lightweight containers. A team has a name, description, optional avatar, and members. Members can be local users or federated connections — a team can span instances. Roles are simple: owner, admin, member.

**Projects** are where the work lives. A project belongs to an optional team, has a status (active, paused, completed, archived), and its own set of members with more granular roles: lead, contributor, reviewer, observer. Like teams, project members can be federated.

Both are fully linked to the existing graph. Kanban cards, queue items, and relays can all be scoped to a project. A goal can be scoped to a project or a team. When Divi routes a task for a project, it considers project membership in its skill matching — project members get a priority boost.

## Visibility Controls

Projects have a **visibility** field: private, team, or open.

- **Private** — only explicitly listed members can see or access the project
- **Team** — all members of the parent team can see it, even if they're not explicit project members
- **Open** — any connected user can discover and view the project

This is enforced at the API level. Every project endpoint checks visibility before returning data. Federated connections respect the same rules — a federated member can access a team-visible project if their connection is a member of the parent team.

## Cross-Member Dashboards

The \`assembleProjectContext()\` function in \`brief-assembly.ts\` now builds a full cross-member view of a project: per-member card states, queue items, relay activity, and blocker detection. This powers two things:

1. **The Project Dashboard action tag** (\`project_dashboard\`) — Divi can invoke this to see what every member is doing across a project. In Chief of Staff mode, Divi uses this proactively to detect blockers and unbalanced workloads.

2. **The system prompt injection** — the top 3 active projects (by recent activity) now get their cross-member dashboards injected directly into Divi's context. Divi always knows what's happening across your projects without you having to ask.

The project context API (\`GET /api/projects/[id]/context\`) returns the full assembly, with an optional \`?format=markdown\` query param for prompt-ready text.

## The UI

The Teams tab in the dashboard gives you a list of teams and projects. Each project shows its visibility badge (🔒 private, 👥 team, 🌐 open), team ownership, member count, and status. The detail view includes a "🧠 Divi's View" section that shows the cross-member activity dashboard — the same data Divi sees in its system prompt.

Federated members appear with a 🌐 indicator. Cross-instance team members are first-class — they show up in routing, in dashboards, and in project context.

## For Open Source Builders

**New Prisma models**: \`Team\`, \`TeamMember\`, \`Project\`, \`ProjectMember\`. Members support both \`userId\` (local) and \`connectionId\` (federated). New optional \`projectId\` and \`teamId\` fields on \`KanbanCard\`, \`QueueItem\`, and \`AgentRelay\`.

**New APIs**: \`/api/teams\`, \`/api/teams/[id]\`, \`/api/teams/[id]/members\`, \`/api/projects\`, \`/api/projects/[id]\`, \`/api/projects/[id]/members\`, \`/api/projects/[id]/context\`.

**Skill matching boost**: \`findSkillMatches\` in \`brief-assembly.ts\` now accepts \`teamId\`/\`projectId\` — project members get +10, team members +5.

**Action tags updated**: \`task_route\`, \`assemble_brief\`, \`relay_broadcast\`, \`relay_ambient\` all accept optional \`teamId\`/\`projectId\` params. \`project_dashboard\` is new.

**System prompt**: Layer 17 now includes team/project context and scoped routing instructions.

The organizational layer is additive — it doesn't change how connections or relays work. It gives them scope. And scope is what turns a protocol into a platform.

— Jon`
  },
  {
    id: 'federation-admin-tooling',
    date: '2026-04-08',
    time: '11:15 PM',
    title: 'Federation Admin Tooling and Documentation',
    subtitle: 'Health checks, activity monitors, and a full federation guide. The infrastructure for running a node on the network.',
    tags: ['federation', 'admin', 'docs'],
    content: `Three pieces of admin infrastructure that were overdue.

## Federation Health Checker

New tab on the admin page: a real-time health checker that tests your instance's federation readiness.

It validates the full stack: agent card availability at \`/.well-known/agent-card.json\`, A2A endpoint reachability, inbound federation configuration, relay processing capability, and the status of all active connections. Each check reports pass/fail/warning with detailed messages.

This is the first thing to check when a federated relay isn't going through. Is your agent card accessible? Is your A2A endpoint returning 200s? Is \`allowInbound\` enabled? The health checker answers all of it in one click.

## Federation Activity Monitor

A live feed of federation events on the admin page: relays sent, relays received, connection state changes, federation config updates. Each event shows direction (inbound/outbound), type, timestamp, and status.

This is the observability layer that was missing. When you're running a node on a network with multiple federated connections, you need to see the traffic. Which connections are active? Which relays succeeded? Where are the failures?

The monitor pulls from \`GET /api/admin/federation-activity\` and shows the last 50 events. It distinguishes between local-to-remote and remote-to-local traffic with visual indicators.

## Federation Documentation

A full guide at \`/docs/federation\` — accessible from the settings page and the public site. Covers:

- What federation is and how it works in DiviDen
- The connection lifecycle (invite → token exchange → active connection)
- How relays traverse the federation bridge
- The agent card spec and A2A endpoint
- Security model (federation tokens, per-connection auth, data isolation)
- Teams and projects across federated instances
- Troubleshooting common federation issues

Written for both end users and developers running their own instances. The spec is the protocol — if you implement the agent card and A2A endpoints, your instance can join the network.

## For Open Source Builders

**New admin APIs**: \`GET /api/admin/federation-check\` (health checker), \`GET /api/admin/federation-activity\` (event feed).

**New page**: \`/docs/federation\` with full federation guide. Linked from settings.

**Admin page**: Two new tabs for federation health and activity monitoring.

These are admin-only endpoints — they require authentication and admin role checks.

— Jon`
  },
  {
    id: 'queue-dedup-and-cos-dispatch',
    date: '2026-04-08',
    time: '11:45 PM',
    title: 'Queue Dedup and the Chief of Staff Loop',
    subtitle: 'Community-driven hardening. Duplicate protection across every creation path. Sequential dispatch that actually closes the loop.',
    tags: ['queue', 'dedup', 'chief-of-staff', 'community', 'protocol'],
    content: `This one came from the community.

One of the devs running their own DiviDen instance flagged two things that have been on my mind since the queue system shipped — but hearing it from someone actually using the protocol in production made it real. They were right. These needed to ship.

## Queue Deduplication — Every Path, Every Time

The problem: multiple agents, webhooks, and action tags can all create queue items. In a busy instance — especially one with calendar webhooks firing alongside an active Divi chat — the same task can land in your queue two, three, four times. Different wording, same intent.

So now every queue creation path runs through a unified deduplication layer.

**How it works:**

The system uses [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) to compute title similarity. When a new item comes in, it checks against two pools:

- **Active items** (ready, in_progress, blocked) — if a title matches at 80%+ similarity, the creation is blocked and the existing item's context is merged instead. No duplicate. The original item gets richer metadata.
- **Recently completed items** (done_today within the last 7 days) — if a match is found here, the system still blocks creation but tells the caller the task was already completed. No zombie tasks coming back from the dead.

This runs across all five creation paths: the queue API, the \`dispatch_queue\` action tag, the \`create_event\`/\`set_reminder\` action tag, the \`send_email\` fallback, and all four webhook-to-queue paths. Unified. No exceptions.

The config is tunable — the similarity threshold, the completed window, all of it lives in \`DEDUP_CONFIG\` if you want to adjust for your use case.

## Chief of Staff Sequential Dispatch — The Full Loop

Chief of Staff mode has always enforced a single-task-in-flight rule. But it was missing the other half: what happens when that task completes?

Before this update: you finish a task, mark it done, and then… nothing. You'd have to manually dispatch the next one. That breaks the whole point of CoS mode — which is that Divi manages your focus for you.

Now the loop is closed:

1. **Task completes → auto-dispatch.** When any item transitions to \`done_today\` (via the dashboard, the API, or an agent reporting results), the system automatically dispatches the next highest-priority READY item. Priority ordering: urgent → high → medium → low, then oldest first within the same tier.

2. **Mode switch → auto-dispatch.** When you flip from Cockpit to Chief of Staff mode, if nothing is currently in_progress, the system immediately dispatches the top item. No dead air. You switch modes and you're already working.

3. **Status protection.** Done items stay done. The \`done_today → ready\` and \`done_today → in_progress\` transitions are now blocked across every status update endpoint — both the dashboard PATCH and the v2 agent API. No more accidentally resurrecting completed work.

This applies to all completion surfaces: \`PATCH /api/queue/:id\`, \`POST /api/v2/queue/:id/result\`, and \`POST /api/v2/queue/:id/status\`.

## For Open Source Builders

Two new modules:

**\`src/lib/queue-dedup.ts\`** — Levenshtein distance, similarity ratio, \`deduplicatedQueueCreate()\`, and \`DEDUP_CONFIG\`. Drop-in replacement for raw \`prisma.queueItem.create\` calls. If you've added custom queue creation paths in your fork, wire them through this.

**\`src/lib/cos-sequential-dispatch.ts\`** — \`onTaskComplete()\`, \`onEnterCoSMode()\`, \`validateStatusTransition()\`. The sequential dispatch engine and status guard. These are already wired into every relevant endpoint.

The status guard exports \`BLOCKED_TRANSITIONS\` if you want to customize which transitions are forbidden. The dedup config exports thresholds you can tune.

## What This Means

The queue system is now self-protecting. Duplicates don't pile up. Completed work doesn't come back. And in CoS mode, the dispatch loop is fully autonomous — finish one thing, the next thing is already waiting.

This is what happens when people actually use the protocol and tell you what's missing. The architecture was right. The edges needed hardening. That's what open source is for.

— Jon`
  },
  {
    id: 'briefs-and-ambient-learning',
    date: '2026-04-08',
    time: '6:30 PM',
    title: 'The Brief, and the Protocol That Teaches Itself',
    subtitle: 'Orchestration with full transparency. An ambient protocol that gets smarter with every interaction.',
    tags: ['protocol', 'brief', 'learning', 'orchestration'],
    content: `Two things shipped today that represent a real shift in how we think about this platform — and the protocol underneath it.

The first is the brief. The second is the learning engine. Together they complete a loop that I've been thinking about since before there was any code.

## The Brief — Show Your Work

Here's the problem with AI agents doing things on your behalf: you have no idea why they did what they did.

An agent routes a task to someone on your team. Why that person? What context did it consider? What alternatives did it weigh? Most agent platforms treat that as a black box. "Trust me, I picked the right person."

We don't think that's good enough. Especially when the decisions involve real people's time and real deliverables.

So now, every orchestration action in DiviDen generates a **brief** — a reasoning artifact that shows exactly what happened:

- What context was assembled (card state, pipeline position, contact graph, activity timeline)
- Which connections were evaluated, and what their skill/availability profiles looked like
- Why a specific routing decision was made
- What was sent, to whom, via what mode (direct, ambient, broadcast)

The brief is the handshake contract between human and agent. You can always inspect it. You can always audit why Divi made a decision. The same way Divi helps you audit your team's work, you can audit Divi's.

This matters more than it might seem. As agents take on more autonomy — especially in Chief of Staff mode — the brief is how trust gets built. Not through blind faith, but through transparency. Show your work. Every time.

## The Ambient Learning Engine

The ambient relay protocol shipped in the last update. Direct, broadcast, ambient — three modes for agents to coordinate without humans breaking focus.

But here's the thing: a protocol that doesn't learn from its own performance is just a static set of rules. And static rules can't handle the infinite variability of human conversation and work rhythms.

So now, every ambient relay interaction feeds a learning loop.

When your Divi weaves an ambient question into conversation and gets a response back, the system captures everything:

- **Timing** — What time of day did this happen? How long did it take to find a natural moment to ask?
- **Disruption** — Did it land seamlessly, or did it feel forced?
- **Topic relevance** — Was the ambient question related to what was already being discussed?
- **Response quality** — Did we get a substantive answer, or a brush-off?
- **What gets ignored** — Ambient relays that sit unanswered for 48 hours get captured as "ignored" signals. That's data too.

These signals get synthesized into patterns. The patterns get injected back into Divi's context. So the next time Divi considers sending an ambient relay, it knows:

- Which time windows get the best response rates
- Which topics work well ambiently vs. which need a direct relay
- Whether a particular connection is experiencing relay fatigue
- How to phrase questions for maximum seamlessness

The protocol is now self-improving. High-confidence patterns become behavioral rules. Medium-confidence patterns are guidelines. Low-confidence patterns are early signals applied with judgment. And as more ambient relays happen across the platform, all of this gets more precise.

## Task Routing — Kanban to Relay in One Step

The orchestration layer now connects the Kanban board directly to the relay protocol. When a card reaches a stage that implies work is needed, Divi can:

1. Decompose the card into discrete tasks
2. Match each task against your connection graph — skills, lived experience, task types, current availability
3. Route each task via the appropriate relay mode
4. Generate a brief for every routing decision

You can say "route this card" and Divi handles the rest. Or you can say "show me the brief" and inspect the reasoning before anything gets sent.

The Kanban card is the convergence point. People, deliverables, conversations, and status all meet there. The brief is the reasoning layer on top. The relay protocol is the execution layer underneath.

## For Open Source Builders

If you're running your own DiviDen instance — or building on the protocol — here's what this means for you:

**Two new Prisma models**: \`AmbientRelaySignal\` and \`AmbientPattern\`. The signal table captures per-relay outcome data. The pattern table stores synthesized learnings. Run \`npx prisma db push\` to pick them up.

**Two new action tags**: \`task_route\` and \`assemble_brief\`. These connect your Kanban board directly to the relay protocol. The system prompt (Layer 17) now includes orchestration intelligence and self-assessment instructions.

**The learning engine** lives in \`src/lib/ambient-learning.ts\` — four exported functions: \`captureAmbientSignal\`, \`synthesizePatterns\`, \`getAmbientLearningPromptSection\`, and \`captureIgnoredAmbientSignals\`. Pattern synthesis runs automatically in the background after ambient signals are captured, or you can trigger it manually via \`POST /api/ambient-learning/synthesize\`.

**The brief system** lives in \`src/lib/brief-assembly.ts\` — context assembly, skill matching, and brief generation. Briefs are stored as \`AgentBrief\` records and exposed via \`/api/briefs\`.

When your instance connects to the network via federation, the learning engine runs locally on your data. Your patterns stay on your instance. But the protocol improvement compounds — every self-hosted node that uses ambient relays generates learnings that make its own ambient protocol better over time.

The action tag count is now 30+. The system prompt is 18 layers. The protocol spec on [os.dividen.ai](https://os.dividen.ai) will be updated to reflect all of this.

## What This Means

The platform now has three properties that I think matter more than any individual feature:

**Transparency** — Every agent decision is inspectable. The brief is always there. No black boxes.

**Self-improvement** — The protocol learns from its own performance. It doesn't need you to configure rules or tweak settings. It watches what works and adjusts.

**Convergence** — Kanban state, contact relationships, relay protocol, and AI reasoning all flow through the same system. They're not separate tools bolted together. They're one graph.

This is still early. The learning engine has maybe a handful of signals right now. Give it a few weeks of real ambient relay traffic and the patterns will start compounding. That's the point — the more you use it, the less you notice it. The protocol fades into the background and information just flows.

That's what we're building toward.

— Jon`
  },
  {
    id: 'ambient-relay-protocol',
    date: '2026-04-08',
    time: '11:00 AM',
    title: 'We Built a New Communication Protocol',
    subtitle: 'Ambient Relay — what happens when agents handle the logistics of who knows what and who needs what.',
    tags: ['protocol', 'relay', 'core'],
    content: `Here's the thing about email, Slack, Teams, texts — all of it. Every single one of those tools operates on the same assumption: that one human needs to interrupt another human to move information around.

You write a message. You hope they see it. You hope they see it at the right time. You hope they have the context to understand what you're actually asking. Then you wait. And while you wait, you've already context-switched out of whatever you were doing.

Multiply that by every person in your company, every collaboration, every day. That's the tax we've all been paying.

## What we shipped today

DiviDen now has three modes of agent-to-agent communication:

**Direct Relay** — You say "ask Sarah about the contract terms." Your Divi finds Sarah's agent, sends a structured relay with full context, and her Divi handles it on her end. You never broke focus.

**Broadcast** — You say "what does the team think about this approach?" Your Divi sends it to every connection simultaneously. As responses come back, Divi synthesizes them: "The consensus seems to be..."

**Ambient Relay** — This is the one that changes everything.

You say "I wonder what the timeline looks like for Q3 launch." Your Divi recognizes the intent. It looks at your connections — who has project management skills, who's on that team, who's available. It sends a low-priority ambient relay to the right person's agent.

Here's what happens on the other end: nothing disruptive. No notification. No ping. No red badge demanding attention. Instead, the next time that person is naturally talking to their Divi about Q3 plans, their agent weaves it in: "By the way, what's the current timeline looking like for the Q3 launch?"

When the answer comes, your Divi surfaces it naturally: "Oh — Sarah mentioned Q3 is tracking for August 15th."

No one was interrupted. No one checked an inbox. The information flowed through agents who knew when to ask and when to deliver.

## Why this matters for organizations

Every organization runs on information flow. The entire history of workplace software has been about making that flow faster — email, instant messaging, project management tools, wikis, all of it. But faster isn't the same as better. Faster just means more interruptions, more notifications, more context switches.

The ambient relay protocol inverts the model. Instead of pushing information at people and hoping they process it, agents pull information when the context is right. The human stays in their flow. The agent handles the logistics.

For a team of 10, this eliminates dozens of daily interruptions. For a company of 1,000, the compound effect is staggering.

## What this means for you as a user

If you're on DiviDen today, your Divi is already smarter. It now:

- Detects when you need information from a connection and proactively suggests reaching out
- Routes relays based on who has the right skills, experience, and availability — not just who you happen to message
- Surfaces responses naturally in conversation instead of dumping them as notifications
- In Chief of Staff mode, sends ambient relays autonomously when it detects you need something

## For Open Source Builders

If you're building on the DiviDen protocol or running your own instance, the relay system is fully available to you:

**New Prisma models**: \`Connection\`, \`AgentRelay\`, and \`UserProfile\` (with skills, task types, lived experience, capacity). Run \`npx prisma db push\` after pulling the latest schema.

**Five new action tags**: \`relay_request\`, \`relay_broadcast\`, \`relay_ambient\`, \`relay_respond\`, and \`accept_connection\`. These are documented in the system prompt's Layer 15 (action tag syntax) and executed in \`src/lib/action-tags.ts\`.

**System prompt Layer 17** is entirely new — \`layer17_connectionsRelay_optimized\` handles connection awareness, active relay state, ambient inbound weaving, and proactive relay intelligence. It's the biggest single addition to the prompt architecture since we built it.

**Federation**: The relay protocol works across federated instances. When you connect to someone on a different DiviDen node, relays traverse the federation bridge. Each node maintains its own data. The protocol is the shared language.

**The profile system** (\`src/components/settings/ProfileEditor.tsx\`) gives users rich identity data — skills, languages, countries lived in, task types — that the relay protocol uses for intelligent routing. This isn't a résumé. It's a routing manifest.

The action tag count is now 26+. The system prompt is 18 layers. The Kanban pipeline now has 8 stages. All of it open, all of it forkable. The protocol spec on [os.dividen.ai](https://os.dividen.ai) will be updated shortly.

This is the beginning of what we've been building toward. DiviDen isn't a dashboard. It isn't a messaging app. It's a protocol — a new way for the people inside organizations to coordinate through agents that understand context, timing, and intent.

The protocol is the product. Everything else is interface.

— Jon`
  },
];
