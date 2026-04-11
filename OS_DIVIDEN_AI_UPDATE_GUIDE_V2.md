# os.dividen.ai — Follow-Up Update Guide (v2)

> **Date:** April 11, 2026  
> **Context:** This document covers changes needed on os.dividen.ai since the first update guide was delivered. It focuses on two new areas: **Teams infrastructure** and **Federation APIs** — plus corrections identified during a second review of the live site.

---

## 1. Action Tag Count — Still Wrong

**Current on os.dividen.ai:** "49 structured commands" (homepage, step 02) and "49 total" (updates page, Install/Uninstall entry)  
**Actual count:** 44 action tags (verified from `SUPPORTED_TAGS` array in `src/lib/action-tags.ts`)

This was flagged in the first guide but hasn't been corrected yet. It appears in at least two places:
- Homepage → step 02 ("It acts.") → "49 structured commands"
- Updates page → "Agent Install / Uninstall System" entry → "Two new action tags: install_agent, uninstall_agent (49 total)"

**Fix:** Find-and-replace `49` with `44` in all action tag references.

---

## 2. NEW: Teams Documentation

The managed platform now has a full team infrastructure. The docs sidebar has a "Teams & Projects" entry, but it needs to be significantly expanded to cover the new capabilities.

### What Exists on the Platform Now

**Team Data Model:**
```
Team
  ├── TeamMember (owner | admin | member)
  │     ├── User (local members)
  │     └── Connection (federated members — cross-instance)
  ├── TeamSubscription (starter | pro)
  ├── TeamBilling (Stripe customer, monthly budget, current spend)
  ├── TeamSpendingPolicy (per_member | per_project | per_agent)
  ├── TeamAgentAccess (shared marketplace agents with usage limits)
  ├── TeamFollow (network followers)
  ├── Project[]
  ├── QueueItem[]
  ├── AgentRelay[]
  └── Goal[]
```

**Team Entity Fields:**
- `type`: work | community | hybrid
- `visibility`: private | network | public
- `headline`, `website`, `location`, `industry`, `foundedAt`
- `agentEnabled`: boolean (requires Pro subscription)
- `agentConfig`: JSON (personality, check-in frequency, auto-suggest tasks, auto-surface blockers, synthesize updates, notification triggers)

**Subscription Tiers:**

| Tier | Price | Members | Projects | Team Agent | Spending Policies |
|------|-------|---------|----------|------------|-------------------|
| Starter | $29/mo | 5 | 3 | ❌ | ❌ |
| Pro | $79/mo + $9/seat | 10 base + unlimited | Unlimited | ✅ | ✅ |

Both tiers include a 14-day free trial. Stripe-backed billing with enforcement (member limit blocks invites, project limit blocks creation).

**Team APIs:**
- `GET/POST /api/teams` — list/create teams
- `GET/PUT/DELETE /api/teams/[id]` — team CRUD
- `GET/POST/DELETE /api/teams/[id]/members` — member management
- `GET/PUT /api/teams/[id]/subscription` — subscription management
- `GET/PUT /api/teams/[id]/agent` — team agent configuration
- `POST /api/teams/[id]/follow` — follow/unfollow a team

**Team Agent (Group 12 in System Prompt):**

When `agentEnabled` is true, the system prompt loads team context as Group 12. The agent:
- Knows all team members, their roles, active projects, goal/queue/relay counts
- Follows strict behavior rules: suggest, never assign; surface blockers proactively; coordinate cross-member handoffs via ambient relay; never make decisions for the team
- Is a coordinator, not a commander — a peer to the individual's Divi, not a superior
- Loads personality config, check-in frequency, and notification preferences from `agentConfig` JSON
- Is skipped entirely if no team agent is configured — zero overhead for solo operators

**Team Profile Pages:**
- Route: `/team/[id]`
- Server component with `TeamProfileView`
- Shows headline, members, projects, agent status
- Followable from the network
- Discoverable via search (`/api/search`) and network discovery (`/api/v2/network/discover`)

### What Needs to Change on os.dividen.ai

#### Docs Sidebar: Expand "Teams & Projects"

The current "Teams & Projects" entry should be expanded into a full section covering:
1. **Team Data Model** — schema diagram showing Team and all related models
2. **Subscription Tiers** — pricing table with feature matrix
3. **Team Member Management** — roles (owner/admin/member), federated members via connections, invite flow
4. **Team Agent Configuration** — how `agentConfig` JSON works, Group 12 prompt assembly, behavior rules
5. **Spending Policies** — per-member, per-project, per-agent limits with billing cycle enforcement
6. **Shared Agent Access** — how `TeamAgentAccess` lets admins share marketplace agents across the team
7. **Team APIs** — full route documentation with request/response examples

#### Docs Sidebar: Add "Team Subscriptions & Billing"

New section or sub-section covering:
- Tier comparison table
- Free trial mechanics
- Stripe integration (team-level Stripe customer, separate from individual)
- Spending policy enforcement
- Billing cycle management

#### Homepage: Individual-First Framing for Teams

The homepage should mention teams WITHOUT making it sound like DiviDen is a team tool. Suggested framing:

> "Individuals first. Teams when you need them. Create a team, configure its agent, set the budget — then step out and be yourself again. Your Divi stays yours."

This could go in the "What You Get" section as an additional feature card, or in the manifesto section.

#### Open Source Page: Team Features as Open Core

The open source page should clarify:
- Team schema and basic CRUD are open source (MIT)
- Team subscriptions, spending policies, and Stripe billing are managed platform features
- Team agents work on self-hosted instances (the system prompt logic is open), but subscription enforcement is platform-side

---

## 3. NEW: Federation APIs Documentation

Five new public API endpoints are now live on the managed platform. These need to be documented on os.dividen.ai so self-hosted operators know how to connect.

### New Endpoints

#### `GET /api/v2/updates`
**Public. No authentication required. CORS enabled.**

Returns the unified DiviDen changelog/updates feed.

```
GET https://dividen.ai/api/v2/updates?limit=50&since=2026-04-01&tag=federation

Response:
{
  "updates": [...],      // Array of update objects
  "total": 15,           // Total updates available
  "returned": 10,        // Updates in this response
  "source": "dividen.ai",
  "generatedAt": "2026-04-11T23:00:00.000Z"
}
```

Self-hosted instances should poll this endpoint to keep their updates page in sync. Recommended: cache for 5 minutes (matching the `Cache-Control` header).

#### `GET /api/v2/network/discover`
**Public (basic) or Authenticated (rich data).**

Returns public profiles, teams, and marketplace agents from the managed network.

```
# Unauthenticated — basic public data
GET https://dividen.ai/api/v2/network/discover?type=all&q=research&limit=20

# Authenticated — richer profile data (languages, hobbies, superpowers)
GET https://dividen.ai/api/v2/network/discover?type=profiles
Authorization: Bearer dvd_fed_<platform_token>

Response:
{
  "profiles": { "items": [...], "total": 42 },
  "teams": { "items": [...], "total": 8 },
  "agents": { "items": [...], "total": 15 },
  "networkStats": {
    "users": 150,
    "teams": 23,
    "agents": 45,
    "federatedInstances": 3
  }
}
```

#### `POST /api/v2/federation/register`
**No authentication required (creates token).**

The "Connect to Network" endpoint. Self-hosted instances call this to register with the managed platform.

```
POST https://dividen.ai/api/v2/federation/register
Content-Type: application/json

{
  "name": "Acme Corp DiviDen",
  "baseUrl": "https://dividen.acme.com",
  "apiKey": "<instance_federation_api_key>",
  "version": "2.1.0",
  "userCount": 12,
  "agentCount": 3,
  "capabilities": {
    "relay": true,
    "marketplace": true,
    "discovery": true,
    "updates": true
  }
}

Response (201):
{
  "success": true,
  "instanceId": "clx...",
  "platformToken": "dvd_fed_abc123...",
  "endpoints": {
    "discover": "https://dividen.ai/api/v2/network/discover",
    "updates": "https://dividen.ai/api/v2/updates",
    "heartbeat": "https://dividen.ai/api/v2/federation/heartbeat",
    "marketplaceLink": "https://dividen.ai/api/v2/federation/marketplace-link"
  },
  "features": {
    "discovery": true,
    "updates": true,
    "marketplace": true,
    "relay": true
  },
  "message": "Instance \"Acme Corp DiviDen\" registered successfully."
}
```

**Important:** The `platformToken` must be stored securely. It's used for all subsequent authenticated API calls.

#### `POST /api/v2/federation/marketplace-link`
**Requires platform token.**

Enables/disables marketplace participation.

```
POST https://dividen.ai/api/v2/federation/marketplace-link
Authorization: Bearer dvd_fed_<platform_token>
Content-Type: application/json

{ "action": "enable" }   // or "disable" or "status"

Response:
{
  "success": true,
  "marketplaceEnabled": true,
  "nextSteps": [
    "POST agents to the managed marketplace via the agent listing API",
    "Set up Stripe Connect for payouts (optional, for paid agents)",
    "Agents from your instance will appear in the managed network discovery feed"
  ]
}
```

#### `POST /api/v2/federation/heartbeat`
**Requires platform token.**

Periodic health check. Should be called on a cron schedule (recommended: every hour).

```
POST https://dividen.ai/api/v2/federation/heartbeat
Authorization: Bearer dvd_fed_<platform_token>
Content-Type: application/json

{
  "version": "2.1.0",
  "userCount": 15,
  "agentCount": 4,
  "status": "healthy"
}

Response:
{
  "success": true,
  "networkStats": {
    "totalUsers": 200,
    "totalAgents": 50,
    "federatedInstances": 5
  },
  "features": {
    "marketplace": true,
    "discovery": true,
    "updates": true
  }
}
```

### InstanceRegistry Schema Changes

The `InstanceRegistry` model now includes:

| Field | Type | Description |
|-------|------|-------------|
| `platformLinked` | Boolean | Has completed Connect to Network registration |
| `platformToken` | String? | Token for managed platform API access |
| `marketplaceEnabled` | Boolean | Can list agents on managed marketplace |
| `discoveryEnabled` | Boolean | Can query managed network discovery feed |
| `updatesEnabled` | Boolean | Pulls changelog from managed platform |
| `version` | String? | Self-reported instance version |
| `userCount` | Int? | Self-reported user count |
| `agentCount` | Int? | Self-reported marketplace agent count |
| `lastSyncAt` | DateTime? | Last successful sync with managed platform |

### What Needs to Change on os.dividen.ai

#### Docs Sidebar: Add "Platform Integration" Section

New top-level docs section (or sub-section under Federation Intelligence) covering:
1. **Connect to Network** — step-by-step guide with code examples
2. **Federation API Reference** — all 5 endpoints documented with request/response
3. **Platform Token Management** — how to store, rotate, and use the token
4. **Marketplace Federation** — how to list self-hosted agents on the managed marketplace
5. **Heartbeat Setup** — cron job example for periodic health checks
6. **Updates Feed Sync** — how to pull and display the unified changelog

#### Docs Sidebar: Update "Federation Intelligence"

The existing Federation Intelligence section should reference these new APIs and explain the relationship between:
- Local federation (instance-to-instance relays, which already work)
- Platform federation (connecting to the managed network via these new APIs)

#### Homepage: "Connect to Network" mention

Consider adding a brief mention in the "What You Get" section:

> "Self-host the engine. Connect to the network. One API call links your instance to the managed DiviDen platform — browse the marketplace, discover people, pull the changelog. Your instance stays yours."

#### Open Source Page: Federation APIs

The open source page should document:
- The federation APIs are **on the managed platform side** (dividen.ai)
- Self-hosted instances call these APIs to register and participate
- The Connect to Network wizard exists in Settings → Federation on self-hosted instances
- All federation relay infrastructure remains MIT-licensed

---

## 4. Updates Page — Still Out of Sync

The os.dividen.ai updates page has its own changelog entries (e.g., "Team Agent Context (Group 12)", "Agent Install / Uninstall System", "Divi Platform Awareness"). These are NOT pulled from dividen.ai's updates feed.

Now that `GET /api/v2/updates` exists, os.dividen.ai should:
1. **Pull from the managed platform's API** as the primary source
2. **Merge** with any os-specific entries (if they exist) that are relevant only to the open-source project
3. **De-duplicate** — if the same update appears in both sources, prefer the managed platform version (it's more detailed)

Implementation suggestion:
```javascript
// On os.dividen.ai, fetch from the managed platform
const res = await fetch('https://dividen.ai/api/v2/updates?limit=50');
const { updates } = await res.json();
// Merge with local os-specific updates, sort by date, render
```

---

## 5. Connect to Network Wizard — UI Documentation

The managed platform's Settings → Federation page now includes a "Connect to Network" wizard. This is relevant for os.dividen.ai's documentation because self-hosted users will use this wizard.

The wizard flow:
1. **Idle** — explanation of what connecting does, "Start Connection Wizard" button
2. **Configure** — target platform URL (default: `https://dividen.ai`), feature toggles (marketplace, discovery, updates), pre-flight checks (instance name, public URL, API key)
3. **Registering** — animated loading while calling the register API
4. **Success** — displays platform token, available endpoints, next steps
5. **Error** — error message with retry option

os.dividen.ai docs should include screenshots or a walkthrough of this wizard flow.

---

## 6. Known Instances List — New UI Badges

The Known Instances list in Settings → Federation now shows platform link status with badges:
- 🌐 **Linked** — instance has completed platform registration
- 🏪 **Marketplace** — marketplace participation enabled
- 🔍 **Discovery** — network discovery enabled
- 📢 **Updates** — unified updates feed enabled

This should be reflected in the documentation screenshots.

---

## 7. OpenAPI Docs Updated

The `/api/v2/docs` endpoint now includes documentation for all 5 federation endpoints under `Network` and `Federation` tags. os.dividen.ai's API documentation section should reference this:

```
https://dividen.ai/api/v2/docs
```

This returns a full OpenAPI 3.0.3 spec that any Swagger UI instance can render.

---

## 8. Priority Matrix

### High Priority (do first)
1. **Fix action tag count** — 49 → 44 (appears in multiple places)
2. **Add Federation API docs** — self-hosted users need this to connect
3. **Sync updates feed** — switch to pulling from `GET /api/v2/updates`

### Medium Priority
4. **Expand Teams docs** — full team schema, subscriptions, agent config
5. **Add Platform Integration guide** — step-by-step Connect to Network walkthrough
6. **Homepage teams mention** — brief individual-first framing for teams

### Lower Priority
7. **Open Source page** — clarify team/federation open core boundaries
8. **UI screenshots** — wizard flow, badges, team profile pages
9. **OpenAPI docs link** — reference the live spec endpoint

---

## Summary of All Files Changed on Managed Platform Since Last Guide

| File | Change |
|------|--------|
| `prisma/schema.prisma` | InstanceRegistry extended with platform link fields |
| `src/app/api/v2/updates/route.ts` | NEW — public updates feed |
| `src/app/api/v2/network/discover/route.ts` | NEW — network discovery feed |
| `src/app/api/v2/federation/register/route.ts` | NEW — instance registration |
| `src/app/api/v2/federation/marketplace-link/route.ts` | NEW — marketplace participation |
| `src/app/api/v2/federation/heartbeat/route.ts` | NEW — periodic health check |
| `src/app/api/v2/docs/route.ts` | Updated — 5 new endpoints in OpenAPI spec |
| `src/app/api/federation/instances/route.ts` | Updated — returns new platform link fields |
| `src/components/settings/FederationManager.tsx` | Updated — Connect to Network wizard + badges |
| `src/lib/updates.ts` | Updated — new "Teams for Individuals, Federation for Everyone" post |

All changes are pushed to GitHub and checkpointed. Deploy to make the APIs live.
