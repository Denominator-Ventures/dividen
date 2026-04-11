# os.dividen.ai — Required Updates

**Date:** April 11, 2026  
**Context:** DX overhaul shipped (setup scripts, docker-compose, README rewrite, health check). These changes need to be reflected on the marketing site.

---

## 🔴 Priority 1: Terminal Section — Update Setup Commands

**Location:** Homepage → terminal code block (below the API section, above "Open Source / This is not software" section)

**Current (stale — causes the exact friction Robert reported):**
```
$ git clone https://github.com/Denominator-Ventures/dividen.git
→ system created
→ you are now operating independently
$ yarn install
$ npx prisma migrate deploy
$ yarn dev
```

**Replace with:**
```
$ git clone https://github.com/Denominator-Ventures/dividen.git
→ system created
→ you are now operating independently
$ cd dividen/nextjs_space
$ bash scripts/setup.sh
→ dependencies installed
→ database configured
→ migrations applied
→ ready
$ npm run dev
```

**Why:** The old sequence is missing `cd`, `.env` creation, `prisma generate`, and database setup. Someone following these commands verbatim will hit every issue Robert documented. The new `setup.sh` handles everything in one command.

---

## 🔴 Priority 2: Timestamp

**Location:** Header bar, next to "DiviDen OS" logo

**Current:** `Updated Apr 11, 2026, 05:00:00 PM UTC`

**Action:** Bump to the deployment timestamp when these changes ship.

---

## 🟡 Priority 3: New Feature Tile — "Developer Experience"

**Location:** "What You Get" feature grid → add near the bottom, before or after "Bring Your Own Key"

**New tile:**

> ### Developer Experience
> `One-command setup · Docker optional · Cross-platform`
>
> `bash scripts/setup.sh` handles everything — dependencies, env config, database, migrations, seed. Docker-compose included for local Postgres. Works on macOS, Linux, WSL, and Windows PowerShell. Five minutes from `git clone` to `localhost:3000`.

**Why:** Signals to prospective self-hosters that DiviDen takes onboarding seriously. Directly addresses the class of concerns Robert raised.

---

## 🟡 Priority 4: Self-Hosted Callout Below CoS Section

**Location:** Below the "Built for founders and their right hand" section (after the 6 CoS sub-cards and the "Live today" badge)

**Add:**

> **Self-hosted in five minutes.** Clone → `bash scripts/setup.sh` → `npm run dev`. Local Postgres via Docker or bring your own. No vendor lock-in. Full control.

**Why:** Reinforces that this isn't SaaS-only — it's an open system with genuinely easy self-hosted setup.

---

## 🟡 Priority 5: Docs Page — Quick Start Note in Build Instructions

**Location:** `/docs` → "Build Instructions" section → top of the section, before "Phase 1: Core Web Application"

**Add a note block:**

> **💡 New: One-command setup**  
> The repo now includes `scripts/setup.sh` (macOS/Linux/WSL) and `scripts/setup.ps1` (Windows) that automate the entire setup sequence — dependencies, environment, database, migrations, and seed data. See the [README Quick Start](https://github.com/Denominator-Ventures/dividen#quick-start-5-minutes) for details.  
> The Phase 1/2/3 instructions below remain useful as architecture documentation.

**Why:** Developers landing on the docs to figure out how to build should immediately see the easy path exists. The detailed build phases are still valuable as architecture reference but shouldn't be the first thing they try to follow.

---

## 🟡 Priority 6: Docs Page — Add `/api/status` Health Check Endpoint

**Location:** `/docs` → add to the Agent API section, or create a new "Health & Diagnostics" section near Admin & Telemetry

**Add:**

> ### Health Check
>
> **`GET /api/status`**
>
> Returns a structured health report. Use this after setup to confirm everything is wired correctly.
>
> **Response `200` (healthy) or `503` (unhealthy):**
>
> ```json
> {
>   "status": "healthy",
>   "checks": {
>     "database": { "status": "connected", "users": 2 },
>     "needsSetup": false,
>     "migrations": {
>       "status": "complete",
>       "tables": 42
>     },
>     "environment": {
>       "nextauthSecret": true,
>       "adminPassword": true,
>       "llmConfigured": false
>     },
>     "version": "2.1.0",
>     "timestamp": "2026-04-11T21:45:00.000Z"
>   }
> }
> ```
>
> **Checks performed:**
> - **Database connection** — connects and counts users
> - **Migration validation** — queries `pg_tables` to confirm all core tables exist (User, Card, QueueItem, Contact, ChatMessage, Connection)
> - **Environment variables** — confirms `NEXTAUTH_SECRET`, `ADMIN_PASSWORD`, and `ABACUSAI_API_KEY` are set
> - **Version** — current protocol version
>
> **No authentication required.** This is a public endpoint.

---

## ✅ Verified Accurate — No Changes Needed

These sections were audited and confirmed correct:

- **Hero / Manifesto** — messaging is current
- **All 31 feature tiles** in the "What You Get" grid:
  - Kanban Pipeline (10-stage), Integrated CRM, Calendar & Comms, Inbox, Recordings & Transcripts, Drive, Global Search, Guided Walkthrough, Desktop Notifications, Activity Feed, The Brief, Connections & Relay Protocol, User Profiles, Ambient Learning Engine, Directory & Outbound Invites, Memory & Learning, Action Tags, Goals & NOW Engine, Teams & Projects, Extensions Framework, Visibility Controls, Connection Ceremony, Webhook Push, MCP Server, Operational Playbook, Handoff Brief, Chief of Staff Mode, PWA, Network Job Board, Bring Your Own Key
- **CoS section** — 6 sub-cards (Daily Brief, Goal Tracker, Blocker Radar, Pipeline Summary, Calendar & Comms, Read-Only Safety) + "Live today" badge
- **"How It Works"** — 4-step pipeline visual with all 10 Kanban stages
- **Agent API section** — all endpoints listed correctly, including `/api/jobs/*`, `/api/mcp`, `/api/reputation`
- **"A Note from the Creator"** section
- **FVP implementation partner** section
- **Contact form + footer**
- **All nav links** — DOCS, UPDATES (→ dividen.ai/updates), OPEN SOURCE, GITHUB
- **Docs page Kanban Protocol** — now says "Pipeline Stages (10 stages)" with PLANNING and PAUSED included
- **Docs page Action Tag Reference** — says "40+ tags" (correct)
- **Docs page Operating Modes** — Cockpit and Chief of Staff both documented

---

## Summary

| # | Change | Priority | Effort |
|---|---|---|---|
| 1 | Terminal setup commands (stale, causes real friction) | 🔴 High | 5 min |
| 2 | Timestamp bump | 🔴 High | 1 min |
| 3 | "Developer Experience" feature tile | 🟡 Medium | 10 min |
| 4 | Self-hosted callout below CoS section | 🟡 Medium | 5 min |
| 5 | Docs: Quick Start note in Build Instructions | 🟡 Medium | 5 min |
| 6 | Docs: `/api/status` health check documentation | 🟡 Medium | 10 min |

**Total estimated effort: ~35 minutes**

The two 🔴 items are the most important — the terminal commands are the exact path a self-hosted user follows, and they're currently incomplete.
