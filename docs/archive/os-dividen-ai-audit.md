# os.dividen.ai — Audit Report

**Date:** April 11, 2026 
**Audited against:** The live DiviDen Command Center codebase (dividen.ai) 
**Purpose:** Identify everything on os.dividen.ai that is missing, inaccurate, or needs to change to accurately represent what we've actually built.

---

## 1. BROKEN LINKS & STRUCTURAL ISSUES

### 1.1 UPDATES link is cross-domain and 404s on os.dividen.ai

The nav header shows "UPDATES" but links to `https://dividen.ai/updates`, which only works for logged-in users on the app itself. On os.dividen.ai the equivalent `/updates` returns a 404. Either:
- Build an `/updates` page on os.dividen.ai that mirrors the changelog, or
- Make the link explicitly say "View Changelog on DiviDen" so visitors aren't surprised by a 404 / login wall.

### 1.2 "VIEW CHANGELOG →" link also goes to dividen.ai/updates

Same issue as above. The inline CTA near the bottom of the homepage has the same broken cross-domain pattern.

### 1.3 No link to the Agent Marketplace from os.dividen.ai

The dividen.ai landing page has a full Marketplace section with "Sign Up to Access the Marketplace →". os.dividen.ai doesn't link to or surface the marketplace at all beyond a vague mention under Network Job Board.

---

## 2. FEATURES THAT EXIST BUT ARE COMPLETELY MISSING FROM os.dividen.ai

### 2.1 Agent Marketplace (fully live)

The platform has a **complete Agent Marketplace** — not just the Network Job Board. This is a separate, major feature surface:
- **Agent listing & discovery** — browse, search, filter agents by category/pricing
- **Agent execution** — one-click paid execution of marketplace agents
- **Agent subscriptions** — recurring subscription model for agents
- **Earnings dashboard** — real-time earnings tracking for developers (as worker and as client)
- **Execution history** — full execution logs with status, input/output, timing
- **Agent registration** — multi-step form to list your own agent with pricing, description, category
- **Revenue split** — 97/3 (developer/platform) with `MARKETPLACE_FEE_PERCENT` configurable to 0% for self-hosted

os.dividen.ai mentions none of this. The "Network Job Board" section says "Coming Soon" — it's not coming soon, it's **live**, and the marketplace is an entirely separate feature on top of it.

**What to add:** A dedicated "Agent Marketplace" feature section covering discovery, execution, subscriptions, earnings, and the revenue model.

### 2.2 Stripe Connect Integration (fully live)

The platform has **full Stripe Connect Express integration**:
- Stripe Connect onboarding for marketplace developers
- Saved payment methods for buyers
- Payment processing for agent executions
- Recruiting fee payment processing for job contracts
- `/api/stripe/connect`, `/api/stripe/payment-methods`, `/api/stripe/status`, `/api/stripe/webhooks`

os.dividen.ai doesn't mention Stripe at all. The Pricing section only says "Bring Your Own Key" for LLM costs.

**What to add:** Mention Stripe Connect as the payment infrastructure. Explain the payment flow for both marketplace agent executions and job recruiting.

### 2.3 Job Contracts & Structured Compensation (fully live)

The platform now has a **complete job contract system**:
- `JobContract` model — active engagements between client and worker
- `JobPayment` model — individual payment records per contract
- Structured compensation types: flat, hourly, weekly, monthly, volunteer
- Contract lifecycle: active → paused → completed → cancelled → disputed
- 7% recruiting fee (configurable via `RECRUITING_FEE_PERCENT`, 0% for self-hosted)
- Worker payout tracking, payment history, Stripe payment status

os.dividen.ai's "Network Job Board" section doesn't mention contracts, structured compensation, or recruiting fees at all.

**What to add:** A section on the economic layer that covers both the 3% marketplace fee and the 7% recruiting fee, contract lifecycle, and compensation structures.

### 2.4 Project Invites (fully live)

Full invite system for projects and jobs:
- `ProjectInvite` model with accept/decline flow
- Action tags: `accept_invite`, `decline_invite`, `list_invites`
- Deep-link onboarding from invites
- Invite management UI

os.dividen.ai mentions "Directory & Outbound Invites" for connections but doesn't cover project/job invites at all.

**What to add:** Mention project invites as part of the Teams & Projects feature.

### 2.5 Admin Dashboard & Telemetry (exists in sidebar but not on homepage)

Full admin panel at `/admin`:
- Federation activity monitoring
- Federation health checks
- System-wide stats
- Query telemetry (Prisma query logging to TelemetryEvent table)
- Activity logging with IP tracking

os.dividen.ai docs sidebar lists "Admin & Telemetry" but the homepage and open-source page don't mention it.

**What to add:** Include admin/observability in the feature list — operators need to know they get a built-in admin dashboard.

### 2.6 Terms of Service & Agent Liability Framework

The platform has a `/terms` page with:
- Agent liability disclaimers
- Marketplace terms
- ToS acceptance tracking (version, timestamp) during signup
- Checkbox on signup/setup pages

os.dividen.ai doesn't mention this at all.

**What to add:** Brief mention in the legal/governance section, especially the agent liability framework — it's a differentiator.

### 2.7 Settings Management

Full `/settings` page for:
- Profile editing (skills, task types, availability, min compensation, accept invites toggle)
- API key management
- Integration accounts
- Notification rules
- LLM provider configuration

os.dividen.ai doesn't mention a settings surface.

### 2.8 Landing Page (dividen.ai)

The main app at dividen.ai has its own marketing landing page with:
- Hero section, problem/solution narrative
- Features grid
- Agent Marketplace section with Stripe details
- Protocol stack visualization
- Open source CTA
- Footer with links to os.dividen.ai

os.dividen.ai doesn't acknowledge this page or link to it as the "product" landing page (it links to dividen.ai for "Try it" and "Install app" but doesn't explain what they'll see).

### 2.9 Minimum Compensation & Job Preferences

Users can set:
- `minCompensationType` / `minCompensationAmount` / `minCompensationCurrency`
- `acceptVolunteerWork` toggle
- `acceptProjectInvites` toggle

This is a routing-relevant feature — agents use these preferences to filter jobs. Not mentioned on os.dividen.ai.

---

## 3. INACCURATE NUMBERS & CLAIMS

### 3.1 "40+ action tags" → Actually 47

The site says "40+ structured tags" and "40+ tags · 10-group system prompt" in multiple places. The actual count is **47 action tags** across the codebase. Should be updated to "47 action tags" or "45+" at minimum.

Full list:
`accept_connection`, `accept_invite`, `add_checklist`, `add_known_person`, `add_relationship`, `archive_card`, `assemble_brief`, `complete_checklist`, `complete_job`, `create_calendar_event`, `create_card`, `create_contact`, `create_document`, `create_event`, `create_goal`, `decline_invite`, `dispatch_queue`, `entity_resolve`, `execute_agent`, `find_jobs`, `link_contact`, `link_recording`, `list_invites`, `list_marketplace`, `network_briefing`, `post_job`, `project_dashboard`, `relay_ambient`, `relay_broadcast`, `relay_request`, `relay_respond`, `review_job`, `route_task`, `save_api_key`, `save_learning`, `send_comms`, `send_email`, `serendipity_matches`, `set_reminder`, `setup_webhook`, `subscribe_agent`, `task_route`, `update_card`, `update_contact`, `update_goal`, `update_memory`, `update_profile`

### 3.2 "10-group system prompt" → Actually 11 groups

The system prompt now has **11 builder groups** after the addition of Group 11: Business Operations Layer. This group dynamically fetches contracts, posted jobs, applications, earnings, reputation, recordings, integrations, and marketplace agents.

### 3.3 "MCP v1.3.0 · 22 tools" → Actually 20 tools

The MCP server currently exposes **20 tools** (verified by counting `name:` entries in the route handler), not 22. Tools: `queue_list`, `queue_add`, `queue_update`, `contacts_list`, `contacts_search`, `cards_list`, `mode_get`, `briefing_get`, `activity_recent`, `job_post`, `job_browse`, `job_match`, `reputation_get`, `relay_thread_list`, `relay_threads`, `entity_resolve`, `serendipity_matches`, `route_task`, `network_briefing`, `relay_send`.

Either update the count to 20, or add the 2 missing tools.

### 3.4 Network Job Board says "Coming Soon"

The "Network Job Board" feature card on the homepage says:
> DEP-013 · Matching · Reputation · **Coming Soon**

This is **wrong**. The job board is **fully live**:
- `/api/jobs` — full CRUD
- `/api/jobs/match` — skill-matched job discovery via `job-matcher.ts`
- `/api/jobs/[id]` — individual job management
- `/api/jobs/earnings` — earnings tracking
- `JobBoardView.tsx` — full UI in dashboard
- Action tags: `find_jobs`, `post_job`, `complete_job`, `review_job`

Remove "Coming Soon" and update description.

### 3.5 Pricing section is incomplete

The Pricing section only covers:
> 🔑 Bring Your Own Key — No usage fees from DiviDen.

This is misleading. The actual revenue model:
- **Agent Marketplace:** 3% platform routing fee (`MARKETPLACE_FEE_PERCENT`), 97% to developer. Self-hosted: 0%.
- **Job Recruiting:** 7% recruiting fee (`RECRUITING_FEE_PERCENT`) on paid jobs matched through the network. Self-hosted: 0%.
- **LLM Keys:** Bring your own for self-hosted. Platform version provides keys automatically.

The pricing section needs to cover all three revenue streams transparently.

### 3.6 "Systems — Public workflows you can fork. Coming soon"

The open-source/network section mentions forkable systems as "Coming soon." If this isn't built yet, it should be marked differently or removed. Currently reads as though the fork mechanism exists.

---

## 4. DESCRIPTIONS THAT NEED UPDATING

### 4.1 Federation Intelligence description is too abstract

Current:
> FVP Tier 4 · Patterns · Graph · Routing

Actual implementation includes concrete API endpoints:
- `/api/federation/patterns` — ambient learning exchange
- `/api/federation/routing` — 7-signal weighted task routing
- `/api/federation/graph` — serendipity matches via triadic closure
- `/api/federation/briefing` — composite network pulse
- `/api/federation/connect`, `/api/federation/config`, `/api/federation/entity-search`, `/api/federation/instances`, `/api/federation/jobs`, `/api/federation/mcp`, `/api/federation/project`, `/api/federation/relay`, `/api/federation/reputation`

That's **13 federation sub-endpoints**. The description should mention the breadth.

### 4.2 Entity Resolution description is too brief

Current:
> Cross-surface · Universal lookup · /api/entity-resolve

Actual: The entity resolution system has a dedicated action tag (`entity_resolve`), MCP tool, and is used across federation endpoints for cross-instance identity matching. It resolves across contacts, connections, cards, events, emails, relays, and team members.

### 4.3 Chief of Staff section mentions "Read-Only Safety" but doesn't mention the actual route

`ChiefOfStaffView.tsx` is a full dashboard component. The section could mention it's accessible as a tab within the Command Center, not a separate app.

### 4.4 The Agent API section is missing newer endpoints

The API endpoint listing on the homepage shows:
```
POST /api/main-connect
GET  /api/main-handoff
GET  /api/v2/queue
POST /api/v2/queue/:id/result
GET  /api/v2/shared-chat/stream
POST /api/v2/shared-chat/send
GET  /api/v2/kanban
GET  /api/v2/contacts
GET  /api/a2a/playbook
GET  /api/mcp
POST /api/mcp
GET  /api/jobs
GET  /api/jobs/match
GET  /api/reputation
GET  /api/entity-resolve
GET  /api/federation/patterns
GET  /api/federation/routing
GET  /api/federation/graph
GET  /api/federation/briefing
GET  /api/status
```

Missing from this list:
- `GET /api/marketplace` — browse marketplace agents
- `POST /api/marketplace` — register an agent
- `POST /api/marketplace/[id]` — execute an agent
- `GET /api/marketplace/earnings` — earnings dashboard
- `GET /api/contracts` — list contracts
- `POST /api/contracts` — create contract
- `GET /api/jobs/earnings` — job earnings
- `POST /api/stripe/connect` — Stripe Connect onboarding
- `GET /api/stripe/status` — Stripe account status
- `GET /api/stripe/payment-methods` — saved payment methods
- `POST /api/project-invites` — project invite management
- `GET /api/v2/docs` — OpenAPI spec
- All 13 federation sub-endpoints

### 4.5 "Developer Experience" section terminal example uses `npm run dev`

The terminal block at the bottom of the page shows:
```
$ npm run dev
```

But the setup instructions earlier reference `bash scripts/setup.sh`. Should be consistent. If the project uses yarn, it should say `yarn dev`. If npm is the default for self-hosted, keep it but make it consistent with the setup script.

---

## 5. TONE & POSITIONING GAPS

### 5.1 No mention of the two-tier deployment model

The platform has two tiers that aren't clearly explained:
1. **dividen.ai** — hosted platform version with API keys provided, 3% marketplace fee, 7% recruiting fee
2. **Self-hosted** — clone the repo, bring your own keys, set fees to 0%, full control

os.dividen.ai vaguely says "The platform version at dividen.ai provides keys automatically" but doesn't clearly articulate the two-tier model.

### 5.2 The Manifesto doesn't connect to the economic layer

The manifesto talks about "ownership without permission" but never connects this to the actual economic infrastructure — earning money through marketplace agents, getting paid for job contracts, keeping 100% when self-hosted. The philosophical narrative stops short of the economic thesis.

### 5.3 "A NOTE FROM THE CREATOR" section could reference newer features

The creator note mentions use cases like:
- Ambient relay coordination
- Calendar auto-negotiation
- Investor update drafting
- Monday morning standups

But doesn't mention:
- Listing an agent on the marketplace and earning passive income
- Using the job board to find and pay contractors through the platform
- Setting up contracts with structured compensation
- Getting skill-matched to opportunities through the matching engine

These are concrete, differentiating use cases that should be highlighted.

---

## 6. MISSING PAGES ON os.dividen.ai

### 6.1 No `/updates` or `/changelog` page

The nav links to dividen.ai/updates which requires auth. os.dividen.ai needs its own public changelog page, or the dividen.ai updates page needs to be publicly accessible.

### 6.2 No dedicated Marketplace page

Given the marketplace is a major feature, os.dividen.ai should have a page explaining it — or at minimum, the open-source page should include it prominently.

### 6.3 No pricing/revenue page

The current pricing section is a single card. A dedicated page explaining the revenue model (marketplace fees, recruiting fees, self-hosted zero-fee option) would add clarity.

---

## 7. SUMMARY OF REQUIRED CHANGES

| # | Item | Priority | Type |
|---|------|----------|------|
| 1 | Add Agent Marketplace feature section | **Critical** | Missing feature |
| 2 | Remove "Coming Soon" from Network Job Board | **Critical** | Inaccurate |
| 3 | Update action tag count: 40+ → 47 | **High** | Inaccurate number |
| 4 | Update system prompt groups: 10 → 11 | **High** | Inaccurate number |
| 5 | Update MCP tools count: 22 → 20 (or add 2 tools) | **High** | Inaccurate number |
| 6 | Add Stripe Connect / payment infrastructure | **Critical** | Missing feature |
| 7 | Add Job Contracts & structured compensation | **Critical** | Missing feature |
| 8 | Update Pricing section with full revenue model | **Critical** | Incomplete |
| 9 | Fix UPDATES link (404 on os.dividen.ai) | **High** | Broken link |
| 10 | Add Project Invites to Teams & Projects | **Medium** | Missing feature |
| 11 | Add Admin Dashboard & Telemetry to homepage | **Medium** | Missing feature |
| 12 | Add job preferences / min compensation | **Medium** | Missing feature |
| 13 | Update Agent API endpoint listing | **High** | Incomplete |
| 14 | Fix `npm run dev` → consistent command | **Low** | Inconsistency |
| 15 | Add Terms of Service / agent liability mention | **Medium** | Missing feature |
| 16 | Clarify two-tier deployment model | **High** | Unclear positioning |
| 17 | Connect manifesto to economic layer | **Medium** | Tone gap |
| 18 | Update creator note with marketplace use cases | **Low** | Tone gap |
| 19 | Create public changelog page on os.dividen.ai | **High** | Missing page |
| 20 | Update Federation Intelligence description breadth | **Medium** | Understated |

---

**Bottom line:** os.dividen.ai accurately represents the *original* DiviDen — the command center, relay protocol, CRM, kanban, and federation layer. But it's **missing the entire economic layer** that's been built since: the Agent Marketplace, Stripe Connect, job contracts, structured compensation, recruiting fees, earnings dashboards, and payment infrastructure. It also has stale numbers (action tags, system prompt groups, MCP tools) and a "Coming Soon" label on a feature that shipped. The site needs a pass to bring it current with what's actually live at dividen.ai.
