# os.dividen.ai — Release Update

> **Date:** April 11, 2026 
> **Build:** FVP Integration Brief + DX Overhaul + Intelligence Layer 
> **MCP Server:** v1.3.0 (22 tools) 
> **Agent Card:** v0.3.0 
> **Protocol:** DAWP/0.1

This document covers everything that needs to be added or changed on **os.dividen.ai** to bring it current with the latest DiviDen Command Center build. It's organized by layer — schema first, then libraries, then API routes, then UI, then docs.

---

## 1. Database Schema Changes

### New Migrations to Apply

Two new migrations since last push:

#### Migration: `20260411_add_relay_threading_and_artifacts`
```sql
-- FVP Brief Proposals #2 and #3: Relay Threading + Structured Artifacts
ALTER TABLE "agent_relays" ADD COLUMN "threadId" TEXT;
ALTER TABLE "agent_relays" ADD COLUMN "artifactType" TEXT;
ALTER TABLE "agent_relays" ADD COLUMN "artifacts" TEXT;
CREATE INDEX "agent_relays_threadId_idx" ON "agent_relays"("threadId");
```

#### Migration: `20260411_add_portable_reputation`
```sql
-- FVP Brief Proposal #7: Portable Reputation
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "isFederated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "endorsements" TEXT;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "federatedScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
```

### Prisma Schema Updates

**AgentRelay model** — 3 new fields:
- `threadId String?` — groups multi-turn relay conversations
- `artifactType String?` — one of: text, code, document, data, contact_card, calendar_invite, email_draft
- `artifacts String?` — JSON-encoded structured artifact payload
- New index on `threadId`

**ReputationScore model** — 3 new fields:
- `isFederated Boolean @default(false)` — whether score includes cross-instance data
- `endorsements String?` — JSON array of HMAC-signed attestation objects
- `federatedScore Float @default(0)` — weighted federation reputation score

---

## 2. New Library Files

All new files that need to be added to `src/lib/`:

### Core Libraries (added in earlier DEP builds, confirm present)

| File | Purpose |
|------|--------|
| `src/lib/entity-resolution.ts` | Universal entity resolution across contacts, connections, cards, events, emails, relays, team members |
| `src/lib/task-exchange.ts` | Auto-propose tasks to best-matched connections by skill/capacity/reputation |
| `src/lib/webhook-push.ts` | Push relay state changes to connected instances via webhook |
| `src/lib/relay-queue-bridge.ts` | Bidirectional sync between relays and queue items |
| `src/lib/ambient-learning.ts` | Signal capture, pattern synthesis, ambient relay learning loop |
| `src/lib/activity.ts` | `logActivity()` — universal event logger, fire-and-forget |
| `src/lib/now-engine.ts` | Dynamic NOW scoring: priority, impact, deadline, calendar gaps, relay freshness |
| `src/lib/brief-assembly.ts` | Context brief assembly + skill matching + project context |
| `src/lib/telemetry.ts` | Request/error logging, client IP tracking |
| `src/lib/job-matcher.ts` | Job-to-profile matching engine |
| `src/lib/queue-dedup.ts` | Queue item deduplication |
| `src/lib/queue-dispatch.ts` | Chief of Staff auto-dispatch |
| `src/lib/cos-sequential-dispatch.ts` | Sequential task dispatch in CoS mode |

### Federation Intelligence Layer (NEW — FVP Tier 4)

| File | Purpose | Key Exports |
|------|---------|------------|
| `src/lib/federation/pattern-sharing.ts` | Cross-instance ambient learning pattern exchange | `exportShareablePatterns()`, `importSharedPatterns()`, `getNetworkLearningDigest()` |
| `src/lib/federation/graph-matching.ts` | Serendipity engine — triadic closure, complementary expertise, structural bridges | `buildLocalGraph()`, `findSerendipityMatches()`, `exportGraphTopology()` |
| `src/lib/federation/composite-prompts.ts` | Network briefing aggregation from federated peers | `generateLocalBriefingContribution()`, `compileNetworkBriefing()` |
| `src/lib/federation/task-routing.ts` | 7-signal weighted scoring for network-level task routing | `routeTask()`, `getRoutingIntelligenceDigest()` |

#### Task Routing Scoring Weights
```
skill match:     30%
completion rate: 20%
capacity:        15%
trust:           10%
reputation:      10%
latency:          5%
domain proximity: 10%
```

#### Pattern Sharing Rules
- Only synthesized/aggregated patterns are shared — never raw signals
- 20% federation discount on remote pattern confidence
- Weighted confidence merging when patterns overlap
- Patterns anonymized before export

---

## 3. New API Routes

### Federation Endpoints (NEW)

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/federation/patterns` | GET, POST | x-federation-token | Exchange anonymized ambient learning patterns |
| `/api/federation/briefing` | GET, POST | Session / x-federation-token | Network briefing aggregation |
| `/api/federation/routing` | GET, POST | Session / x-federation-token | Intelligent task routing with 7-signal scoring |
| `/api/federation/graph` | GET, POST | Session / x-federation-token | Serendipity matches + graph topology export |
| `/api/federation/mcp` | POST | x-federation-token | Cross-instance MCP tool invocation (trust-gated) |
| `/api/federation/entity-search` | GET, POST | x-federation-token | Privacy-respecting cross-instance entity lookup |
| `/api/federation/jobs/apply` | POST | x-federation-token | Remote job application routing |
| `/api/federation/reputation` | GET, POST | x-federation-token | Portable reputation with HMAC-signed attestations |
| `/api/federation/project/[id]/context` | GET | x-federation-token | Cross-instance project dashboard |

### Other Endpoints (confirm present from earlier builds)

| Route | Methods | Purpose |
|-------|---------|--------|
| `/api/entity-resolve` | GET, POST | Universal entity resolution |
| `/api/jobs` | GET, POST | Network job board CRUD |
| `/api/jobs/match` | GET | Job-to-profile matching |
| `/api/jobs/[id]` | GET, PUT, DELETE | Individual job operations |
| `/api/jobs/[id]/apply` | POST | Job applications |
| `/api/reputation` | GET, POST | Reputation scores |
| `/api/briefs` | GET | Brief assembly receipts |
| `/api/briefs/[id]` | GET | Single brief |
| `/api/now` | GET | Dynamic NOW engine scored items |
| `/api/activity` | GET | Universal activity feed (filterable by category) |
| `/api/ambient-learning/synthesize` | GET, POST | Trigger pattern synthesis |
| `/api/mcp` | GET, POST | MCP Server v1.3.0 |
| `/api/a2a` | POST | A2A protocol endpoint |
| `/api/a2a/playbook` | GET | Operational playbook |
| `/api/main-connect` | POST | Connection ceremony |
| `/api/main-disconnect` | POST | Disconnection |
| `/api/main-handoff` | GET | Handoff brief |
| `/api/status` | GET | Enhanced health check (DB + migrations + env validation) |

---

## 4. MCP Server Updates (v1.3.0)

File: `src/app/api/mcp/route.ts`

### New Tools Added

| Tool | Description |
|------|------------|
| `relay_thread_list` | List relay threads for the current user |
| `relay_threads` | Get all relays in a specific thread |
| `relay_send` | Send a relay to a connection |
| `entity_resolve` | Cross-surface entity resolution (contacts, connections, cards, events, emails, relays, teams) |
| `serendipity_matches` | Graph topology matching — "you should meet X" recommendations |
| `route_task` | Network-level task routing with 7-signal weighted scoring |
| `network_briefing` | Composite cross-instance network pulse |

### Full Tool Inventory (22 tools)
```
queue_list, queue_add, queue_update,
contacts_list, contacts_search,
cards_list, mode_get, briefing_get, activity_recent,
job_post, job_browse, job_match, reputation_get,
relay_thread_list, relay_threads, relay_send,
entity_resolve,
serendipity_matches, route_task, network_briefing
```

Server metadata:
- `name: 'DiviDen MCP Server'`
- `version: '1.3.0'`

---

## 5. Agent Card Updates (v0.3.0)

File: `src/app/.well-known/agent-card.json/route.ts`

### New Capabilities
```json
{
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true,
    "threading": true,
    "structuredArtifacts": true,
    "statusUpdates": true,
    "webhookPush": true
  }
}
```

### New Supported Methods
```
tasks/send, tasks/get, tasks/list,
tasks/respond, tasks/cancel, tasks/update_status,
agent/info
```

### New Artifact Types
```
text, code, document, data, contact_card, calendar_invite, email_draft
```

### New Federation Endpoints in Card
```json
"federation": {
  "connect": "/api/federation/connect",
  "relay": "/api/federation/relay",
  "jobs": "/api/federation/jobs",
  "jobApply": "/api/federation/jobs/apply",
  "reputation": "/api/federation/reputation",
  "mcp": "/api/federation/mcp",
  "entitySearch": "/api/federation/entity-search",
  "patterns": "/api/federation/patterns",
  "briefing": "/api/federation/briefing",
  "routing": "/api/federation/routing",
  "graph": "/api/federation/graph"
}
```

### New Webhook Events
```
task_dispatched, new_message, wake, queue_changed, relay_state_changed
```

### MCP Tools Advertised
Full 22-tool list (see Section 4)

---

## 6. System Prompt Changes

File: `src/lib/system-prompt.ts`

### New Section: Federation Intelligence (FVP Brief)

Added to the consolidated system prompt, before "Profile & Memory":

**New action tags documented:**

| Action Tag | Syntax | Purpose |
|-----------|--------|--------|
| `entity_resolve` | `[[entity_resolve:{"query":"email/name/domain"}]]` | Cross-surface entity resolution |
| `serendipity_matches` | `[[serendipity_matches:{}]]` | Graph topology matching for connection recommendations |
| `route_task` | `[[route_task:{"taskDescription":"...","taskSkills":["..."],"taskType":"..."}]]` | Network-level intelligent task routing |
| `network_briefing` | `[[network_briefing:{}]]` | Composite cross-instance network pulse |

Divi is instructed to:
- Proactively surface serendipity matches when relevant
- Use route_task for skill-matched delegation
- Pull network briefings to stay current on federation activity
- Resolve entities across all surfaces before making assumptions

---

## 7. Action Tags Updates

File: `src/lib/action-tags.ts`

### Modified Tags

| Tag | Change |
|-----|--------|
| `relay_request` | Now supports `threadId` and `parentRelayId` for threading |
| `relay_broadcast` | Checks recipient relay preferences before sending |
| `relay_ambient` | Checks recipient relay preferences before sending |

### New Tag

| Tag | Purpose |
|-----|--------|
| `entity_resolve` | Resolves entities across all data surfaces |

---

## 8. Webhook Push System

File: `src/lib/webhook-push.ts`

### New Event: `relay_state_changed`

`pushRelayStateChanged()` fires when relay status transitions (pending → delivered → completed). Wired into:
- Relay PATCH handler
- Action tags (relay_request, relay_respond)

Webhook config stored in `ServiceApiKey` with `service='webhook_push'`.

---

## 9. Changelog Entry

File: `src/lib/updates.ts`

New entry at top of array:

```typescript
{
  id: 'fvp-integration-brief',
  date: '2026-04-11',
  time: '11:45 PM',
  title: 'FVP Integration Brief — 14 Proposals, One Build',
  subtitle: '...',
  tags: ['federation', 'protocol', 'a2a', 'mcp', 'intelligence', 'fvp', 'network'],
  content: `...` // Full Tier 1-4 breakdown
}
```

This documents all 14 proposals with implementation details for users.

---

## 10. PWA / Layout Fixes

### `src/app/globals.css`

PWA standalone mode viewport fix — prevents top bar from scrolling out of view:

```css
@media (display-mode: standalone) {
  html {
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }
  body {
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .app-shell {
    height: 100%;
  }
}
```

Previously, safe-area padding was on `.app-shell` — moved to `body` so the entire viewport chain is locked.

### `src/app/layout.tsx`

Body class updated:
```diff
- <body className="min-h-full">
+ <body className="min-h-full overflow-x-hidden">
```

---

## 11. Developer Experience (DX) Additions

Confirm these are present on os.dividen.ai:

| File | Purpose |
|------|--------|
| `scripts/setup.sh` | One-command setup for macOS/Linux/WSL |
| `scripts/setup.ps1` | One-command setup for Windows PowerShell |
| `docker-compose.yml` | Local PostgreSQL 16 via Docker |
| `.env.example` | Clear Required/Optional variable documentation |
| `README.md` | Quick Start-first, troubleshooting FAQ sections |

### Health Check Enhancement

`GET /api/status` now returns:
- Database connection status + user count
- Migration validation (checks core tables exist)
- Environment variable validation (NEXTAUTH_SECRET, ADMIN_PASSWORD, LLM key)
- Returns 200 (healthy) or 503 (unhealthy)

---

## 12. MCP Registry Submission Kit

Confirm present:

| File | Purpose |
|------|--------|
| `public/mcp-registry/server.json` | Official MCP Registry format |
| `public/mcp-registry/README.md` | Copy-paste submission kit for 5 registries (Official, Smithery, PulseMCP, Glama, mcp.so) |

---

## 13. Files Changed Summary

### New Files
```
src/lib/federation/pattern-sharing.ts
src/lib/federation/graph-matching.ts
src/lib/federation/composite-prompts.ts
src/lib/federation/task-routing.ts
src/lib/entity-resolution.ts
src/lib/task-exchange.ts
src/app/api/federation/patterns/route.ts
src/app/api/federation/briefing/route.ts
src/app/api/federation/routing/route.ts
src/app/api/federation/graph/route.ts
src/app/api/federation/mcp/route.ts
src/app/api/federation/entity-search/route.ts
src/app/api/federation/jobs/apply/route.ts
src/app/api/federation/reputation/route.ts
src/app/api/entity-resolve/route.ts
prisma/migrations/20260411_add_relay_threading_and_artifacts/migration.sql
prisma/migrations/20260411_add_portable_reputation/migration.sql
```

### Modified Files
```
prisma/schema.prisma              — AgentRelay (3 fields), ReputationScore (3 fields)
src/app/api/mcp/route.ts           — v1.3.0, 7 new tools
src/app/.well-known/agent-card.json/route.ts — v0.3.0, capabilities, endpoints
src/lib/system-prompt.ts           — Federation Intelligence section + 4 action tags
src/lib/action-tags.ts             — Threading support + entity_resolve
src/lib/webhook-push.ts            — relay_state_changed event
src/lib/updates.ts                 — FVP changelog entry
src/app/globals.css                — PWA viewport fix
src/app/layout.tsx                 — overflow-x-hidden on body
src/app/dashboard/page.tsx         — Mobile flex layout fix
src/components/dashboard/ChatView.tsx — flex-shrink-0 on header/input
```

---

## 14. Deployment Checklist

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
yarn install

# 3. Generate Prisma client
yarn prisma generate

# 4. Apply migrations
yarn prisma migrate deploy

# 5. Build
yarn build

# 6. Verify
curl https://os.dividen.ai/api/status
curl https://os.dividen.ai/.well-known/agent-card.json | jq '.version'
curl -s https://os.dividen.ai/api/mcp -X POST -H 'Content-Type: application/json' -d '{"method":"server/info"}' | jq '.result.version'
```

Expected:
- `/api/status` → 200 with all checks passing
- Agent card version → `0.3.0`
- MCP server version → `1.3.0`

---

## 15. What's NOT in This Build (Future)

- No UI for federation intelligence (patterns, graph, briefing, routing are API + MCP only — Divi surfaces them conversationally)
- No admin dashboard for federation analytics (telemetry captures data, dashboard TBD)
- No automated pattern sharing schedule (manual or Divi-initiated only)
- No multi-instance graph visualization (topology data is exportable, viz TBD)

---

*Generated from DiviDen Command Center build `FVP all 14 proposals complete` — April 11, 2026*
