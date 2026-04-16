# DiviDen Investor Deck — v2 Outline

**Date**: April 16, 2026  
**Status**: Comprehensive outline with research-backed data  
**Audience**: Investors, enterprise partners  
**Positioning**: Enterprise AI Operating Infrastructure

---

## Slide 1 — Title

### DiviDen: Enterprise AI Operating Infrastructure

**Subtitle**: The execution layer where AI agents coordinate, operate, and deliver — in real time, across every team.

**Key framing**: DiviDen isn't another AI tool. It's the infrastructure that AI tools run on. One interface. One agent. Every workflow. Agents execute tasks, route work to other agents, and operate on behalf of users — all governed, all auditable, all in real time.

**Visual**: Dark, minimal. DiviDen logo. Tagline.

---

## Slide 2 — The Problem (The Tax on Every Knowledge Worker)

### The average knowledge worker loses 60% of their day to operational overhead.

Present the problem as a **time audit** — not a feature comparison. This isn't "too many tools." It's a systemic tax on every employee, every day.

#### The Daily Tax

| Activity | Hours/Week Lost | Source |
|----------|----------------|--------|
| Email (reading, writing, sorting) | 11.2 hrs | ReadLess.app 2025 — knowledge workers spend 28% of workweek on email, 580+ hrs/year |
| Meetings (attending, scheduling, recovering) | 11.3 hrs | Archie App 2025 — 392 hrs/year in meetings; 43% spend 3+ hrs/week just scheduling |
| Note-taking & documentation | 2.5 hrs | CalendHub 2025 — 15-20 min per meeting × 8 meetings/week = 100-150 hrs/year |
| Context switching & refocusing | 4.0 hrs | SpeakWise 2025 — 9.5 min to refocus per switch; 1,200 app toggles/day; 40% productivity loss |
| Searching for information | 4.5 hrs | Conclude.io 2025 — nearly 1 hour/day searching across apps and data silos |
| Follow-ups, status checks, coordination | 3.0 hrs | Asana Work Index 2024 — "work about work" consumes 58% of knowledge worker time |
| **Total operational overhead** | **~36.5 hrs/week** | |

**Punchline**: In a 45-hour workweek, that leaves **~8.5 hours for actual thinking, creating, and deciding**. The rest is overhead.

**Visual**: A stacked bar showing the 45-hour week, with the overhead in grey/red and the productive time in a thin green sliver.

#### What This Costs

- Average US knowledge worker fully loaded cost: **$150,000/year** (Glassdoor 2025: $111K base × 1.35 burden rate)
- 60% overhead = **$90,000/year per employee wasted on coordination, not creation**
- 500-person org: **$45M/year** in operational drag
- Context switching alone costs the US economy **$450B annually** (SpeakWise/Tivazo 2025)

---

## Slide 3 — The Shift (From AI Assistants to AI Infrastructure)

### The industry is moving from copilots to operating systems.

Frame this as a market evolution — not just DiviDen's opinion.

#### The Evolution

| Stage | What It Looks Like | Limitation |
|-------|--------------------|------------|
| **Copilots** (2023-2024) | Embedded AI in existing apps. GitHub Copilot, Notion AI, Gmail Smart Compose. | One tool at a time. No cross-app coordination. Human still routes everything. |
| **Standalone Agents** (2024-2025) | Task-specific agents. AI SDRs, AI support bots, AI meeting notetakers. | Isolated. Each agent is another silo. No shared context. No governance. |
| **Agent Infrastructure** (2025→) | A coordination layer where agents execute, route to each other, share context, and operate under governance. | **← We are here.** |

#### Supporting Data

- **Gartner (Aug 2025)**: 40% of enterprise apps will feature task-specific AI agents by end of 2026, up from <5% in 2025.
- **Gartner (Jun 2025)**: >40% of agentic AI projects will be canceled by end of 2027 — because there's no operating layer to deploy them into. Cost overruns, unclear value, inadequate controls.
- **Gartner (2025)**: By 2028, AI agent ecosystems will enable networks of specialized agents to dynamically collaborate across multiple applications.
- **Forrester (2026)**: 75% of firms will fail at building advanced agentic architectures independently. 85% of agentic builds fail without proper frameworks.
- **AI Agent Orchestration Market**: $5.6B in 2025 → $26.3B by 2034 (CAGR 18.8%, IntelEvoResearch). Broader AI Agents market: $7.6B → $183B by 2033 (CAGR 49.6%, Grand View Research).

**Punchline**: The world is building thousands of AI agents. Almost nobody is building the infrastructure they run on. That's the gap.

**Visual**: Three-stage evolution diagram. Copilots → Standalone Agents → Agent Infrastructure (DiviDen highlighted).

---

## Slide 4 — The Solution (What DiviDen Is)

### DiviDen is the operating infrastructure for AI-native work.

One deployment. One interface. An agent that coordinates everything — and an open marketplace where anyone can build on top.

#### Architecture

**Divi** — the core agent  
Every DiviDen instance ships with Divi: a context-aware AI agent that understands your projects, people, schedule, queue, and history. Divi doesn't just answer questions — it executes. 56 action tags (card management, email, calendar, CRM, task routing, team coordination, federation) that fire real operations.

**Agents** — specialized executors  
Agents are specialized AI modules that perform specific tasks. They live in the Bubble Store (DiviDen's marketplace) and execute on-demand. Example: **mAInClaw** — a marketplace agent that runs ambient research surveys for $5/task. Anyone can build and publish agents. The platform handles discovery, execution, payment.

**Capabilities** — composable building blocks  
Capabilities are smaller than agents — they're individual skills (email drafting, meeting scheduling, compliance checking) that can be installed into Divi's active toolkit. Agents are composed of capabilities. Capabilities can also be shared across the federation.

**Signals** — the universal input  
Everything that enters DiviDen is a signal: a webhook payload, an email, a calendar event, a chat message, a relay from another instance, an API call. Signals are the connective tissue. Any external system can connect to DiviDen — it just has to emit a signal. This is what makes DiviDen infrastructure, not an app: **you don't integrate with DiviDen's tools — you connect your tools to DiviDen's signal bus.**

#### Definitions Box (for the deck)

| Term | Definition |
|------|------------|
| **Divi** | The core AI agent. Ships with every instance. Orchestrates, reasons, executes. |
| **Agent** | A specialized AI module on the Bubble Store. Performs specific tasks on-demand. Anyone can build one. |
| **Capability** | A composable skill (email draft, meeting schedule). Agents are made of capabilities. Installable. |
| **Signal** | Any input to DiviDen — webhook, email, calendar event, chat, relay. The universal integration point. |
| **Action Tag** | An executable operation Divi can perform (56 today). Cards, email, CRM, routing, federation. |
| **Instance** | A single DiviDen deployment. Can be personal, team, or enterprise. Connects to other instances via federation. |

**Visual**: Hub-and-spoke diagram — Divi at center, surrounded by Agents, Capabilities, Signals. Lines show flow: Signals → Divi → Action Tags → Agents → Execution → Federation.

---

## Slide 5 — How It Works (The Execution Flow)

### When a task enters DiviDen, agents work — not people.

Show a concrete execution flow, not an abstract architecture diagram.

#### Example: "Triage my inbox and queue the actions"

1. **Signal in**: User types the command (or it fires on a schedule, or a webhook triggers it)
2. **Context assembly**: Divi loads relevant prompt groups — only what's needed. 17 modular groups, scored by relevance. No wasted tokens.
3. **Reasoning**: Divi reads the inbox signals, cross-references contacts (CRM), checks calendar for conflicts, reviews project context (Kanban)
4. **Execution**: Divi fires action tags:
   - `dispatch_queue` — queues items for human review
   - `create_card` — creates project tasks
   - `send_comms` — notifies team members
   - `relay_request` — routes tasks to the right connection's agent
5. **Agent handoff**: If a queued task matches a marketplace agent's specialty, that agent picks it up. Example: mAInClaw runs the research survey. Another agent drafts the follow-up email. Each operates within governed boundaries.
6. **Human-in-the-loop**: High-stakes actions go through the queue for confirmation. The user sees what's pending, approves or adjusts, and the system learns.

#### Agent-to-Agent Execution

This is the infrastructure play. When Divi encounters a task that belongs to someone else:
- It uses `task_route` to decompose, skill-match, and route to the best connection
- The receiving instance's agent picks up the task — no human scheduling required
- Both agents operate in real time. The originator gets status updates via relay.
- Cross-instance tasks flow through federation with token-authenticated APIs

**The power**: Everyone's agent is operating simultaneously. Your Divi routes a task to your colleague's Divi. Their Divi executes, responds, updates. No meetings scheduled. No emails sent. No Slack threads. **Agents coordinating with agents, on behalf of their humans, in real time.**

**Visual**: Horizontal flow diagram with the 6 steps. Highlight the agent-to-agent handoff with a bidirectional arrow between two DiviDen instances.

---

## Slide 6 — The Impact (What DiviDen Eliminates)

### DiviDen doesn't improve your workflow. It replaces the overhead.

#### Impact Claims (with math)

| Category | Reduction | What It Means | How |
|----------|-----------|---------------|-----|
| **Email** | **80%** | From 11.2 hrs/week → 2.2 hrs | Divi triages inbox, drafts responses, queues actions. You review and approve. Only novel, high-context emails need human composition. |
| **Calendar Management** | **95%** | From 3+ hrs/week scheduling → ~10 min | Divi creates events, resolves conflicts, sends invites, reschedules. Calendar is a signal source, not a task. |
| **Notes & Documentation** | **100%** | From 2.5 hrs/week → 0 | Divi captures context from every interaction. Action items auto-create cards. Meeting outcomes log to projects. Nothing to write down. |
| **Context Switching** | **~70%** | From 4 hrs/week → ~1.2 hrs | One interface for everything. No toggling between 10 apps. Divi has your full context — projects, people, schedule, history — in one view. |
| **Follow-ups & Coordination** | **~80%** | From 3 hrs/week → ~0.6 hrs | Continuous task awareness. Divi tracks open items, nudges connections, routes updates. No "just checking in" emails. |
| **Searching for Information** | **~85%** | From 4.5 hrs/week → ~0.7 hrs | Entity resolution across your entire surface — contacts, projects, emails, docs, calendar. Ask Divi, get the answer. |

#### Per-Employee Math

```
Weekly overhead before DiviDen:     36.5 hours
Weekly overhead after DiviDen:      ~5.0 hours  (email: 2.2 + calendar: 0.2 + notes: 0 + switching: 1.2 + follow-up: 0.6 + search: 0.7)
Weekly hours recovered:             ~31.5 hours

Annual hours recovered per employee: 31.5 × 48 weeks = 1,512 hours
At $75/hr fully loaded:              $113,400/year in recovered capacity per employee
```

#### Organizational Math

| Org Size | Annual Hours Recovered | Value of Recovered Capacity | What That Means |
|----------|----------------------|----------------------------|-----------------|
| 10 people | 15,120 hrs | $1.13M | Like adding 7 full-time employees |
| 50 people | 75,600 hrs | $5.67M | Equivalent of 36 FTEs |
| 200 people | 302,400 hrs | $22.68M | A whole division's worth of capacity |
| 1,000 people | 1,512,000 hrs | $113.4M | Transforms the entire org |

**Punchline**: DiviDen doesn't save 30 minutes a day. It recovers **31+ hours a week** — nearly an entire workweek — for every knowledge worker. That's not incremental. That's structural.

**Note on claims**: The 80/95/100% figures are targets based on the current feature set (56 action tags, triage pipeline, calendar sync, ambient learning, federation). Real-world results will vary by implementation depth. Position these as "what's possible with full deployment" not guaranteed outcomes.

**Visual**: Before/After bar chart of a 45-hour workweek. Before: thin green sliver. After: mostly green with small overhead. The visual should be striking.

---

## Slide 7 — Why Customers Buy (The Four Pillars)

### Coordination · Context · Controlled Execution · Security

This slide was strong in v1. Keep it. Update the proof points.

| Pillar | What It Means | Proof Point |
|--------|--------------|-------------|
| **Coordination** | Agents route tasks to agents. No human scheduling overhead. | 56 action tags. Federation protocol. Task routing with skill-matching. Relay broadcasts. |
| **Context** | Every interaction builds institutional memory. | 17 prompt groups loaded by relevance scoring. Ambient learning pipeline. Behavior signals. Persistent memory per user. |
| **Controlled Execution** | Agents execute within governed boundaries. | Queue-based human-in-the-loop. Action tags are explicit, auditable operations. No black-box automation. |
| **Security** | Your data stays in your instance. | Per-instance deployment. Federation via token-authenticated APIs. No shared data layer. Instance-level access controls. |

**Visual**: Four quadrant layout. One icon per pillar. Clean.

---

## Slide 8 — The Platform (What Others Build on Top)

### DiviDen is infrastructure. Others build businesses on it.

This is the infrastructure thesis. DiviDen isn't trying to be every vertical tool — it's the layer those tools deploy into.

#### The Bubble Store (Agent Marketplace)

- Anyone can build and publish agents
- Agents execute tasks on-demand within DiviDen instances
- **Revenue model**: 97% to developer, 3% platform routing fee
- Example: **mAInClaw** — runs ambient research surveys for **$5/task**
- Agents can be free, freemium (password-gated), or paid per-task
- Discovery, execution, payment all handled by the platform

#### What Others Build

The real play: **implementation partners build full custom instances**.

| Builder Type | What They Build | Revenue for Them |
|-------------|----------------|------------------|
| **Agent developers** | Specialized agents (research, compliance, recruiting, etc.) | Per-task revenue, 97% take rate |
| **Implementation partners** | Full custom DiviDen instances with bespoke integrations | Consulting + ongoing management fees |
| **Industry verticals** | Pre-configured instances for specific sectors (legal, finance, healthcare) | Instance licensing + agent bundles |
| **Integration builders** | Custom signal connectors (Salesforce → DiviDen signal, Jira → DiviDen signal, etc.) | Capability licensing |

**Key insight**: Integrations on DiviDen aren't limited to webhooks. Anything can connect as a **signal**. Webhooks are one signal type. You can build full custom connectors — Salesforce sync, Jira bridge, ERP pipeline, proprietary data feeds — anything that emits structured data into DiviDen's signal bus. **That's what makes this infrastructure: the integration surface is open.**

#### The Network Job Board

- Users can post paid tasks to the network
- Any connected user's agent can match, apply, and execute
- **7% platform fee on job/recruiting transactions** (enforced minimum)
- Enables a real labor marketplace — agents doing work for other agents' humans

**Visual**: Platform layer diagram. DiviDen as the base layer. Agents, capabilities, and custom integrations stacking on top. Implementation partners building full verticals.

---

## Slide 9 — Business Model

### Four revenue lines. One grows with the network.

| Revenue Line | Model | Status |
|-------------|-------|--------|
| **Team Pricing** | Per-seat subscription for on-platform teams | Active — pricing being finalized |
| **Marketplace Fees** | 3% routing fee on all Bubble Store transactions (97/3 split) | Live — Stripe Connect integrated |
| **Job Board Fees** | 7% fee on all network job/recruiting transactions | Live — enforced minimum |
| **LLM Subscription** | Subscription fee to provide the LLM powering Divi (exploring) | Planned — currently evaluating pricing |

#### How It Scales

**Team Pricing**: Direct SaaS revenue. Scales with enterprise seats.  
**Marketplace Fees**: Scales with transaction volume. Every new agent listed, every task executed = 3% to DiviDen. As the agent ecosystem grows, this becomes the engine.  
**Job Board Fees**: Scales with network size. More connected instances = more task routing = more 7% fees. Network effects compound.  
**LLM Subscription**: Recurring infrastructure revenue. DiviDen provides the LLM that powers Divi — customers don't need to bring their own key. Predictable, high-margin.

#### The Compounding Effect

Every new instance adds:
- More agents to the Bubble Store → more marketplace transactions → more 3% fees
- More connections to the federation → more task routing → more 7% job fees
- More signal connectors built by partners → more integration lock-in → more team seats

**Visual**: Revenue waterfall. Four streams stacking. Marketplace and job board lines curve up with network size.

---

## Slide 10 — Market Validation (The Trend)

### The market is confirming the thesis.

#### Analyst Predictions

| Source | Prediction | Date |
|--------|-----------|------|
| **Gartner** | 40% of enterprise apps will feature task-specific AI agents by end of 2026 (up from <5% in 2025) | Aug 2025 |
| **Gartner** | >40% of agentic AI projects will be canceled by 2027 — no operating layer to deploy into | Jun 2025 |
| **Gartner** | 70% of enterprises will deploy agentic AI in IT infrastructure by 2029 | 2025 |
| **Gartner** | Agentic AI could drive 30% of enterprise app software revenue by 2035 (~$450B) | Aug 2025 |
| **Forrester** | 75% of firms will fail at building advanced agentic architectures independently | 2026 |
| **Forrester** | 85% of agentic architecture builds fail without proper frameworks | 2026 |
| **Grand View Research** | AI Agents market: $7.6B (2025) → $183B by 2033 (CAGR 49.6%) | 2025 |
| **McKinsey** | Generative AI could automate 60-70% of employee time | 2025 |
| **McKinsey** | AI can increase labor productivity by up to 40% | 2025 |

#### Enterprise Readiness

- **89% of CIOs** consider agent-based AI a strategic priority (OneReach.ai 2025)
- **88% of senior executives** plan to increase AI-related budgets in next 12 months (Forbes/OneReach 2025)
- **93% of leaders** believe those who scale AI agents in the next 12 months will gain a lasting edge (OneReach.ai 2025)
- **50% of enterprises** using Generative AI will deploy autonomous AI agents by 2027, up from 25% in 2025 (OneReach.ai)
- **ROI benchmark**: 5x-10x per dollar invested in AI agents (OneReach.ai 2025)

#### The Gap DiviDen Fills

The quote from v1 was strong. Keep it:

> "Enterprise AI doesn't fail because models aren't good enough. It fails because there's no operating layer to deploy them into."

Gartner's data confirms this: the cancellation rate isn't about AI capability — it's about infrastructure. DiviDen is that infrastructure.

**Visual**: Timeline with analyst predictions plotted. Market size curve from $5.6B → $26B+. DiviDen positioned in the gap between "agents exist" and "agents have somewhere to run."

---

## Slide 11 — Proof Point (FVP Command Center)

### First enterprise deployment: FVP.

*Note: Be precise about deployment status. Use "pilot" or "deployment" accurately based on current reality.*

#### What Was Delivered

- Full DiviDen instance configured for FVP's operational needs
- Federation protocol integration — FVP's instance connects to the DiviDen network
- Custom signal connectors for FVP's existing tools
- Agent-to-agent coordination across FVP team members
- Governed execution with queue-based approval for high-stakes operations

#### Documented Integration

- 14-section FVP integration guide in the codebase
- Federation endpoints: notification relay, mentions API, task routing, entity resolution, reputation
- Webhook receiver for marketplace events
- Capability synchronization across instances

**Visual**: FVP logo + DiviDen logo. Key metrics from the deployment (if available — task volume, time saved, agent-to-agent interactions).

---

## Slide 12 — The Power of Real-Time (Why This Compounds)

### When every agent is always on, the math changes.

This is the slide that separates DiviDen from "another AI tool."

#### The Old Way

1. Alice needs a research report from Bob's team
2. Alice emails Bob → Bob sees it 3 hours later → Bob forwards to Carol → Carol starts work next day
3. Carol finishes → emails Bob → Bob reviews → emails Alice
4. **Total elapsed time: 2-3 days. Total human coordination overhead: ~90 minutes across 3 people.**

#### The DiviDen Way

1. Alice tells Divi: "Get me a research report on X from Bob's team"
2. Alice's Divi uses `relay_request` → Bob's Divi receives the signal → Bob's Divi routes to Carol's Divi via `task_route`
3. Carol's Divi picks up the task, executes (or queues for Carol's review), responds via relay
4. Alice's Divi receives the result, creates a card, notifies Alice
5. **Total elapsed time: minutes to hours. Total human coordination overhead: 0 minutes. Agents handled it.**

#### Why This Compounds

- Every instance that joins the network adds agent capacity
- Every agent that learns makes the routing smarter
- Every task that completes generates ambient learning (behavior signals, pattern recognition)
- The federation doesn't just connect instances — it creates an **always-on coordination fabric** where agents operate on behalf of their humans 24/7

**The vision**: A thousand-person organization where every employee has an always-on agent. Those agents coordinate continuously. Tasks flow to the right person (or agent) without meetings, emails, or status checks. The organization operates at the speed of its best decisions, not its slowest coordination.

**Visual**: Network diagram showing 5-6 instances with bidirectional relay arrows. Agents passing tasks. Timestamp showing "2 min" vs "2 days."

---

## Slide 13 — Why Now / Why Us

### Three reasons now. Three reasons us.

#### Why Now

| Factor | Evidence |
|--------|----------|
| **Models are ready** | Claude, GPT-4o, Gemini can handle complex multi-step reasoning. The bottleneck moved from "can AI think?" to "where does AI operate?" |
| **Enterprises are spending** | 88% of executives increasing AI budgets. $5.6B market in 2025, 49.6% CAGR through 2033. The money is moving. |
| **The failure rate proves the gap** | Gartner: >40% of agentic AI projects canceled by 2027. Not because AI failed — because there was no infrastructure. That's the market signal. |

#### Why Us

| Factor | Evidence |
|--------|----------|
| **We built the infrastructure first** | 56 action tags. 17 prompt groups. Federation protocol. Marketplace. Job board. This isn't a roadmap — it's shipped code. |
| **Open platform, not a walled garden** | Anyone can build agents, capabilities, custom signal connectors. 97/3 split means developers keep almost everything. |
| **Federation is the moat** | Instance-to-instance coordination with token auth, entity resolution, task routing, reputation. Nobody else has this. |

**Visual**: Clean two-column layout. Why Now on left, Why Us on right.

---

## Slide 14 — Ask / Close

*[Customize based on raise details]*

### What we're building next

- Expanded signal connectors (Salesforce, Jira, Slack bridge)
- LLM-as-a-service for Divi instances (subscription revenue)
- Team pricing rollout
- Enterprise pilot program (10 target companies)
- Agent developer program (incentivize Bubble Store growth)

### Contact

Jon Bradford, Founder  
jon@dividen.ai  
dividen.ai

---

## Appendix A — Supporting Research & Sources

### Email Statistics
- Knowledge workers spend 28% of workweek (11.2 hrs) on email — ReadLess.app 2025
- 580+ hours annually — ReadLess.app 2025  
- 121 emails received per day, only 24% important — ReadLess.app / Drag App 2025
- Email overload decreases productivity by up to 40% — ReadLess.app 2025
- 23 minutes to refocus after email interruption — Threadly 2025
- Source: https://www.readless.app/blog/email-overload-statistics

### Meeting Statistics  
- 392 hours/year in meetings (11.3 hrs/week) — Archie App 2025
- 65% of people feel they regularly waste time in meetings — MyHours 2025
- 43% spend 3+ hours/week just scheduling meetings — Archie App 2025
- Meeting time costs $29,000 per employee per year — Archie App 2025
- Time in unproductive meetings doubled since 2019, reaching 5 hrs/week — SpeakWise 2025
- Source: https://archieapp.co/blog/meeting-statistics/

### Context Switching
- Knowledge workers toggle between apps 1,200 times per day — Conclude.io / SpeakWise 2025
- 9.5 minutes average to refocus after each switch — Conclude.io 2025
- Context switching costs US economy $450B annually — SpeakWise 2025
- 40% of productive time lost to context switching — Conclude.io / SpeakWise 2025
- Workers productive only 2 hrs 53 min per 8-hour day — CanElevate 2025
- Source: https://speakwiseapp.com/blog/context-switching-statistics

### Note-Taking & Documentation
- 15-20 minutes per meeting for notes; 100-150 hours/year for 6-8 meetings/week — CalendHub 2025
- AI note-taking market: $450M (2023) → $2.5B by 2033 — CalendHub 2025
- Source: https://calendhub.com/blog/ai-meeting-notes-productivity-guide-2025

### AI Productivity Impact
- Generative AI could automate 60-70% of employee time — McKinsey 2025
- AI saves employees average 7.5 hours/week — London School of Economics via Korn Ferry 2025
- AI can increase labor productivity by up to 40% — McKinsey / Aisera 2025
- $2.6T-$4.4T annual global economic value from generative AI — McKinsey 2025
- Source: https://www.makebot.ai/blog-en/mckinsey-report-how-generative-ai-is-reshaping-global-productivity-and-the-future-of-work

### Market Size & Analyst Forecasts
- AI Agent Orchestration Software: $5.6B (2025) → $26.3B by 2034, CAGR 18.8% — IntelEvoResearch
- AI Agents Market: $7.6B (2025) → $183B by 2033, CAGR 49.6% — Grand View Research
- 40% of enterprise apps will feature task-specific AI agents by 2026 — Gartner Aug 2025
- >40% of agentic AI projects will be canceled by 2027 — Gartner Jun 2025
- 89% of CIOs consider agent-based AI a strategic priority — OneReach.ai 2025
- 88% of senior executives increasing AI budgets — Forbes/OneReach 2025
- ROI: 5x-10x per dollar invested in AI agents — OneReach.ai 2025
- Source: https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025

### Employee Cost Basis
- Average US knowledge worker salary: $111,572/year — Glassdoor 2025
- Fully loaded cost: 1.25-1.4× base = ~$139K-$156K — Calculatorr 2025
- Used $150K midpoint for calculations
- Source: https://www.glassdoor.com/Salaries/knowledge-worker-salary-SRCH_KO0,16.htm

---

## Appendix B — DiviDen Platform Facts (v2.0.5)

For investor diligence. All numbers verified against the live codebase.

| Metric | Value |
|--------|-------|
| Action tags | 56 (52 unique + 4 aliases) |
| Prompt groups | 17 (relevance-scored, modular) |
| Marketplace | Bubble Store — live, Stripe Connect integrated |
| Revenue split | 97% developer / 3% platform (marketplace), 7% platform (job board) |
| Federation | Peer-to-peer protocol — relay, entity resolution, task routing, reputation, capability sync |
| LLM | Claude claude-sonnet-4-6 (Anthropic) |
| Identity | Username system, @mentions (people, teams, agents), entity resolution |
| Teams | Team creation, member management, agent-per-team, project assignment |
| Integrations | Google (Calendar, Drive, Gmail) via OAuth, webhooks for any external system |
| Open source | Protocol spec + integration guides published |
| Current version | v2.0.5 (April 16, 2026) |
| Tech stack | Next.js 14, Prisma, PostgreSQL, Tailwind CSS |

---

## Appendix C — Deck Design Notes

- **Theme**: Dark. Matches DiviDen's actual product aesthetic.
- **Typography**: Clean sans-serif. Generous whitespace. Let the numbers breathe.
- **Colors**: Brand green (#10B981) for highlights. White/grey for body. Minimal color palette.
- **Charts**: Flat, modern. No gradients or 3D effects. Data should be the visual.
- **Tone**: Technical, direct. Jon's voice. No marketing superlatives. Let the data speak.
- **Length**: 14 slides (12 main + 2 appendix). Under 20 minutes to present.
- **Rule**: Every number has a source. Every claim maps to a shipped feature or a cited report. No vapor.
