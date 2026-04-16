# DiviDen Federation Integration Guide

**Version**: 2.0.1  
**Last Updated**: 2026-04-16  
**Audience**: FVP (First Ventures Platform) / MainClaw engineering team  
**Author**: DiviDen Platform Team

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
3. [Username Requirements](#3-username-requirements)
4. [Inline Tagging System](#4-inline-tagging-system)
5. [Federation Mentions API](#5-federation-mentions-api)
6. [Notification System](#6-notification-system)
7. [Federation Notification Relay API](#7-federation-notification-relay-api)
8. [Connection Lifecycle](#8-connection-lifecycle)
9. [Relay System](#9-relay-system)
10. [Team Integration](#10-team-integration)
11. [Project Integration](#11-project-integration)
12. [Activity Logging Taxonomy](#12-activity-logging-taxonomy)
13. [Error Handling](#13-error-handling)

---

## 1. Architecture Overview

DiviDen is a federated command center for founders and operators. Each instance (dividen.ai, self-hosted, or partner like FVP) can connect to others via federation tokens.

### Core Models

| Model | Purpose |
|---|---|
| `Connection` | Links two users (local or cross-instance). Federated connections use `isFederated: true` + `federationToken`. |
| `AgentRelay` | Agent-to-agent message passing across connections. |
| `Team` | Groups of users/connections. Can be platform or self-hosted. |
| `Project` | Scoped workspaces within teams. Members can be local users or federated connections. |
| `ActivityLog` | Universal event log — powers the notification bell feed. |
| `QueueItem` | Task/notification queue — appears in the user's queue panel. |
| `CommsMessage` | Direct messaging channel — appears in the Comms tab. |
| `FederationConfig` | Instance-level federation settings (allowInbound, mode, etc). |
| `InstanceRegistry` | Known remote instances with their base URLs and API keys. |

### Three Notification Channels

DiviDen has three parallel notification channels. Your integration should target the appropriate one(s):

| Channel | Model | UI Location | Use For |
|---|---|---|---|
| **Activity Feed** | `ActivityLog` | 🔔 Bell icon dropdown | General notifications — connection events, project updates, team changes |
| **Queue Panel** | `QueueItem` (type: `notification`) | ⚡ Queue sidebar | Actionable items — invites needing response, approvals, tasks |
| **Comms Tab** | `CommsMessage` | 📡 Comms panel | Direct messages, system announcements, detailed relay notifications |

---

## 2. Authentication

### Federation Token

All cross-instance API calls authenticate via the `X-Federation-Token` header:

```http
POST https://dividen.ai/api/federation/notifications
X-Federation-Token: <federation_token>
Content-Type: application/json
```

The token is established during the connection handshake (see [Connection Lifecycle](#5-connection-lifecycle)). It's stored on the `Connection` record and must match an **active** federated connection.

### How Tokens Are Created

1. Instance A sends a connect request to Instance B with a `federationToken`
2. Instance B stores the token on the local `Connection` record
3. All subsequent API calls from Instance A to Instance B use this token
4. The token is bidirectional — Instance B also uses it to call back to Instance A

### Token Validation Flow

```
Request → Extract X-Federation-Token header
        → prisma.connection.findFirst({ isFederated: true, federationToken, status: 'active' })
        → If not found → 404
        → If found → proceed with connection.requesterId as the local user context
```

---

## 3. Username Requirements

**v2.0.1** — Usernames are now required at signup and enforced as unique across the instance. This is critical for the inline tagging system used in chat-based task assignment.

### Rules

| Rule | Detail |
|---|---|
| **Format** | Lowercase letters, numbers, underscores, dots, hyphens: `[a-z0-9_.-]` |
| **Length** | 2–30 characters |
| **Uniqueness** | Globally unique per instance (enforced at DB level with `@unique`) |
| **Reserved words** | `admin`, `system`, `divi`, `dividen`, `support`, `help`, `root`, `null`, `undefined`, `api`, `www` |

### Availability Check

```
GET /api/username/check?username=foo
Auth: None required (public endpoint)
```

**Response**:
```json
{ "available": true }
// or
{ "available": false, "reason": "This username is reserved" }
```

### Where Usernames Appear

- **Chat input**: Users type `@jon` to mention someone — resolves via username
- **Task assignment**: "Assign this to @sarah" in chat triggers routing to that user
- **Relay routing**: The action tag system uses usernames to resolve relay targets
- **Notification summaries**: Activity log entries reference `@username` for clarity

### FVP Implementation Notes

If FVP instances support usernames, they should:
1. Enforce the same format rules (`[a-z0-9_.-]`, 2–30 chars) for cross-instance compatibility
2. Include `username` in the user object when creating federated connections
3. Reference users by `@username` in relay subjects/payloads for consistent resolution

### Username in Connection Handshake

When sending a connection request to DiviDen, include the username in the body if available:

```json
{
  "fromInstanceUrl": "https://fvp.dev",
  "fromUserEmail": "operator@fvp.dev",
  "fromUserName": "FVP Operator",
  "fromUsername": "fvp-operator",
  ...
}
```

DiviDen will store this in `peerUserName` on the connection record. Future versions will add a dedicated `peerUsername` field.

---

## 4. Inline Tagging System

DiviDen's chat supports two inline tagging triggers for task assignment and agent invocation:

### Trigger Characters

| Trigger | What it does | Example |
|---|---|---|
| `@` | Mention a person or agent | `@jon can you review this?` or `@research-agent find me...` |
| `!` | Invoke a command | `!research-agent.deep-dive fintech trends` |

### How It Works (DiviDen Implementation)

1. **User types `@` in the chat input** → triggers a debounced search
2. **Autocomplete dropdown** appears with results from `/api/chat/mentions?type=people&q=<query>` (also fetches `type=agents` in parallel)
3. **User selects a result** → `@username ` or `@agent-slug ` is inserted into the message
4. **Message is sent** → Divi's AI recognizes the mention and routes accordingly:
   - `@person` → task delegation via relay or card assignment
   - `@agent` → invokes that agent's capabilities
   - `!agent.command` → executes a specific command on that agent

### Autocomplete Response Shape

**People** (`GET /api/chat/mentions?type=people&q=jon`):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "type": "person",
      "name": "Jon Bradford",
      "username": "jon",
      "avatar": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Portrait_of_John_Bradford_%284672791%29.jpg/330px-Portrait_of_John_Bradford_%284672791%29.jpg",
      "subtitle": "@jon",
      "diviName": "Divi"
    }
  ]
}
```

**Agents** (`GET /api/chat/mentions?type=agents&q=research`):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "type": "agent",
      "name": "Research Agent",
      "username": "research-agent",
      "subtitle": "@research-agent · Research",
      "description": "Deep research across multiple sources...",
      "commands": [
        { "name": "deep-dive", "description": "Full research report", "usage": "!research-agent.deep-dive <topic>" }
      ]
    }
  ]
}
```

**Commands** (`GET /api/chat/mentions?type=commands&q=deep`):
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...:deep-dive",
      "type": "command",
      "name": "deep-dive",
      "fullCommand": "!research-agent.deep-dive",
      "source": "Research Agent",
      "sourceSlug": "research-agent",
      "sourceType": "agent",
      "description": "Full research report on a topic",
      "usage": "!research-agent.deep-dive <topic>"
    }
  ]
}
```

### FVP Implementation Guide

To implement inline tagging on FVP's side:

#### 1. Input Detection

```typescript
// In your chat input onChange handler:
const handleInputChange = (value: string, cursorPos: number) => {
  // Walk backwards from cursor to find trigger character
  let triggerIdx = -1;
  let triggerChar: '@' | '!' | null = null;
  
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === ' ' || ch === '\n') break; // stop at whitespace
    if (ch === '@' || ch === '!') {
      // Only trigger if at start of input or preceded by whitespace
      if (i === 0 || value[i - 1] === ' ' || value[i - 1] === '\n') {
        triggerIdx = i;
        triggerChar = ch;
      }
      break;
    }
  }
  
  if (triggerChar && triggerIdx >= 0) {
    const query = value.slice(triggerIdx + 1, cursorPos);
    // Fetch suggestions from the federation mentions API
    fetchMentions(triggerChar, query);
  }
};
```

#### 2. Fetch From DiviDen

Use the federation mentions endpoint (see [Section 5](#5-federation-mentions-api)) to query DiviDen's users and agents:

```typescript
const fetchMentions = async (trigger: '@' | '!', query: string) => {
  const type = trigger === '@' ? 'all' : 'commands';
  const res = await fetch(
    `${DIVIDEN_INSTANCE_URL}/api/federation/mentions?type=${type}&q=${encodeURIComponent(query)}`,
    { headers: { 'X-Federation-Token': federationToken } }
  );
  const { data } = await res.json();
  // data.people, data.agents, data.commands
  setSuggestions(data);
};
```

#### 3. Insert Selection

When the user selects from the dropdown:

```typescript
const insertMention = (item: MentionItem) => {
  const handle = item.type === 'command' 
    ? item.fullCommand  // "!agent.command"
    : `@${item.username || item.slug || item.name}`; // "@jon" or "@research-agent"
  
  // Replace from trigger position to cursor with the handle
  const before = input.slice(0, triggerIndex);
  const after = input.slice(cursorPosition);
  setInput(`${before}${handle} ${after}`);
};
```

#### 4. Rendering Mentions in Messages

When displaying messages that contain mentions, parse `@username` tokens and render them as styled chips/links:

```typescript
const renderMentions = (text: string) => {
  return text.replace(/@([a-z0-9_.-]+)/g, (match, username) => {
    return `<span class="mention-tag">@${username}</span>`;
  });
};
```

#### 5. Task Assignment via Mentions

When a message contains `@username` + task language, DiviDen's AI:
1. Resolves the username to a local user or federated connection
2. Creates a relay (if federated) or kanban card (if local)
3. Routes the task with full context

For FVP to trigger task assignment targeting a DiviDen user, include `@username` in relay subjects:

```json
{
  "subject": "Review the pitch deck — assigned to @jon",
  "type": "request",
  "intent": "review",
  "payload": { "targetUsername": "jon" }
}
```

---

## 5. Federation Mentions API

This is the federation-authenticated endpoint for powering inline tagging on remote instances.

### `GET /api/federation/mentions`

**Auth**: `X-Federation-Token` header

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `type` | string | `all` | `people`, `agents`, `commands`, or `all` |
| `q` | string | _(empty)_ | Search term. Returns top results if empty. |

**Privacy Scope**: Returns only users the connection can "see" — members of shared teams/projects. Does NOT expose email addresses.

### Example Request

```bash
curl -X GET "https://dividen.ai/api/federation/mentions?type=all&q=jon" \
  -H "X-Federation-Token: $TOKEN"
```

### Response (200)

```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "clx...",
        "type": "person",
        "name": "Jon Bradford",
        "username": "jon",
        "handle": "@jon",
        "avatar": "https://placehold.co/1200x600/e2e8f0/1e293b?text=avatar_image_of_Jon_Bradford",
        "diviName": "Divi"
      }
    ],
    "agents": [
      {
        "id": "clx...",
        "type": "agent",
        "name": "Research Agent",
        "slug": "research-agent",
        "handle": "@research-agent",
        "category": "Research",
        "description": "Deep research across multiple sources...",
        "hasCommands": true
      }
    ],
    "commands": [
      {
        "id": "clx...:deep-dive",
        "type": "command",
        "name": "deep-dive",
        "fullCommand": "!research-agent.deep-dive",
        "source": "Research Agent",
        "sourceSlug": "research-agent",
        "sourceType": "agent",
        "description": "Full research report on a topic",
        "usage": "!research-agent.deep-dive <topic>"
      }
    ]
  }
}
```

### Response Fields

**People**:

| Field | Type | Description |
|---|---|---|
| `id` | string | User ID |
| `type` | string | Always `"person"` |
| `name` | string | Display name |
| `username` | string \| null | Unique @handle (may be null for legacy users) |
| `handle` | string \| null | Formatted as `@username` |
| `avatar` | string \| null | Profile photo URL |
| `diviName` | string \| null | User's custom AI agent name |

**Agents**:

| Field | Type | Description |
|---|---|---|
| `id` | string | Agent ID |
| `type` | string | Always `"agent"` |
| `name` | string | Display name |
| `slug` | string | URL-safe identifier (used as @handle) |
| `handle` | string | Formatted as `@slug` |
| `category` | string | Agent category |
| `description` | string | Truncated description (max 120 chars) |
| `hasCommands` | boolean | Whether the agent has executable commands |

**Commands**:

| Field | Type | Description |
|---|---|---|
| `id` | string | Compound ID (`agentId:commandName`) |
| `type` | string | Always `"command"` |
| `name` | string | Command name |
| `fullCommand` | string | Full invocation string (e.g. `!slug.command`) |
| `source` | string | Agent or capability name |
| `sourceSlug` | string | Agent or capability slug |
| `sourceType` | string | `"agent"` or `"capability"` |
| `description` | string | What the command does |
| `usage` | string | Usage example |

---

## 6. Notification System

### How Notifications Work Internally

The primary notification mechanism is `ActivityLog`. The function `logActivity()` in `src/lib/activity.ts` is the universal logger:

```typescript
await logActivity({
  userId: string,       // The local user who should see this notification
  action: string,       // Action type (see taxonomy below)
  summary: string,      // Human-readable text shown in the notification feed
  actor?: string,       // 'user' | 'system' | 'agent' (default: 'system')
  metadata?: object,    // Arbitrary JSON — stored for filtering/debugging
  cardId?: string,      // Optional link to a kanban card
});
```

### Notification Feed Endpoint

```
GET /api/notifications/feed
Auth: Session cookie (local users only)
```

Returns recent activity items with:
- `unreadCount` — based on `user.notificationsLastSeen` timestamp
- Each item has `icon`, `category`, `action`, `summary`, `createdAt`

### Category Mapping

| Action prefix | Category | Icon |
|---|---|---|
| `card_` | board | 🗂️ |
| `queue_` | queue | ⚡ |
| `contact_` | crm | 👤 |
| `event_` | calendar | 📅 |
| `goal_` | goals | 🎯 |
| `relay_`, `comms_` | comms | 📡 |
| `connection_` | connections | 🤝 |
| `document_`, `recording_` | drive | 📄 |
| `marketplace_`, `agent_` | marketplace | 🫧 |
| `federation_`, `pattern_` | federation | 🌐 |
| `team_` | teams | 👥 |
| `project_` | projects | 📁 |
| `learning_generated` | intelligence | 🧠 |
| _(default)_ | system | 📋 |

---

## 7. Federation Notification Relay API

This is the primary endpoint for FVP to push notifications to DiviDen users.

### `POST /api/federation/notifications`

**Auth**: `X-Federation-Token` header

**Request Body**:

```json
{
  "toUserEmail": "jon@dividen.ai",
  "action": "project_update",
  "summary": "Sprint 4 deliverables were marked complete on FVP",
  "fromUserName": "MainClaw",
  "fromUserEmail": "mainclaw@fvp.dev",
  "metadata": {
    "projectId": "fvp-proj-123",
    "sprintNumber": 4,
    "completedItems": 12
  },
  "priority": "normal",
  "createQueueItem": true
}
```

**Fields**:

| Field | Type | Required | Description |
|---|---|---|---|
| `toUserEmail` | string | ✅ | Email of the local DiviDen user to notify |
| `action` | string | ✅ | Notification action type. Will be stored as `federation_<action>` |
| `summary` | string | ✅ | Human-readable notification text |
| `fromUserName` | string | ❌ | Display name of the remote actor |
| `fromUserEmail` | string | ❌ | Email of the remote actor |
| `metadata` | object | ❌ | Arbitrary JSON payload for context |
| `priority` | string | ❌ | `low` / `normal` / `high` / `urgent`. Default: `normal` |
| `createQueueItem` | boolean | ❌ | Also create a QueueItem. Default: `true` |

**Response** (200):

```json
{
  "success": true,
  "userId": "clx...",
  "activityLogged": true,
  "queueItemId": "clx..." | null
}
```

**What Happens**:
1. Validates the federation token against an active connection
2. Resolves the local user by `toUserEmail` (falls back to connection owner)
3. Creates an `ActivityLog` entry with action `federation_<action>` — appears in 🔔 bell feed under 🌐 federation category
4. If `createQueueItem` is true, creates a `QueueItem` with type `notification` — appears in ⚡ queue panel

### Example Use Cases for FVP

```bash
# Project milestone completed
curl -X POST https://dividen.ai/api/federation/notifications \
  -H "X-Federation-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserEmail": "jon@dividen.ai",
    "action": "project_milestone",
    "summary": "Milestone \"MVP Launch\" completed — 8/8 tasks done",
    "fromUserName": "MainClaw",
    "priority": "high"
  }'

# Team member status change
curl -X POST https://dividen.ai/api/federation/notifications \
  -H "X-Federation-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserEmail": "jon@dividen.ai",
    "action": "member_status",
    "summary": "Alex Chen went on leave — 3 tasks reassigned",
    "fromUserName": "FVP System",
    "metadata": { "memberId": "fvp-user-456", "reassignedTasks": 3 }
  }'

# Relay status update
curl -X POST https://dividen.ai/api/federation/notifications \
  -H "X-Federation-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserEmail": "jon@dividen.ai",
    "action": "relay_completed",
    "summary": "Research relay \"Market Analysis Q2\" has been completed",
    "fromUserName": "MainClaw",
    "metadata": { "relayId": "fvp-relay-789", "result": "completed" },
    "createQueueItem": false
  }'
```

---

## 8. Connection Lifecycle

### Creating a Federated Connection

**FVP → DiviDen**: `POST /api/federation/connect`

```json
{
  "fromInstanceUrl": "https://fvp.dev",
  "fromInstanceName": "First Ventures Platform",
  "fromUserEmail": "operator@fvp.dev",
  "fromUserName": "FVP Operator",
  "toUserEmail": "jon@dividen.ai",
  "federationToken": "<shared_token>",
  "connectionId": "<fvp_local_connection_id>"
}
```

**What DiviDen Does**:
1. Creates a `Connection` record (`status: pending` if approval required, `active` if not)
2. Creates a `CommsMessage` notifying the local user
3. Creates an `ActivityLog` entry (`federation_connection_request`)
4. Registers/updates the instance in `InstanceRegistry`

### Accepting a Connection

When a DiviDen user accepts an inbound federated connection, DiviDen calls back to the originating instance:

**DiviDen → FVP**: `POST <fvp_instance_url>/api/federation/connect/accept`

```json
{
  "connectionId": "<dividen_connection_id>",
  "acceptedByEmail": "jon@dividen.ai",
  "acceptedByName": "Jon Bradford",
  "instanceUrl": "https://dividen.ai"
}
```

Header: `X-Federation-Token: <federation_token>`

### Connection States

| Status | Meaning |
|---|---|
| `pending` | Awaiting approval from the receiving user |
| `active` | Connected — relays and notifications can flow |
| `declined` | Receiving user declined |
| `blocked` | Receiving user blocked the connection |

---

## 9. Relay System

### Sending a Relay to DiviDen

**FVP → DiviDen**: `POST /api/federation/relay`

Header: `X-Federation-Token: <federation_token>`

```json
{
  "connectionId": "<fvp_connection_id>",
  "relayId": "<fvp_relay_id>",
  "fromUserEmail": "operator@fvp.dev",
  "fromUserName": "MainClaw",
  "toUserEmail": "jon@dividen.ai",
  "type": "request",
  "intent": "research",
  "subject": "Market analysis for Q2 pipeline",
  "payload": { "scope": "fintech", "depth": "deep" },
  "priority": "high",
  "dueDate": "2026-04-30T00:00:00Z"
}
```

**What DiviDen Does**:
1. Creates an `AgentRelay` record (direction: `inbound`)
2. Creates a `CommsMessage` for the local user
3. Creates an `ActivityLog` entry (`federation_relay_received`)

### Relay Types

| Type | Purpose |
|---|---|
| `request` | Asking the remote agent/user to do something |
| `response` | Reply to a previous relay |
| `update` | Status update on an ongoing relay |
| `notification` | Informational — no action needed |

### Relay Intents

| Intent | Purpose |
|---|---|
| `research` | Research request |
| `introduction` | Request an intro to someone |
| `scheduling` | Meeting/calendar coordination |
| `approval` | Needs sign-off |
| `custom` | Free-form |

---

## 10. Team Integration

### Adding a Federated Member to a Team

```
POST /api/teams/:teamId/members
Auth: Session cookie (local admin/owner)
```

```json
{
  "connectionId": "<federated_connection_id>",
  "role": "member"
}
```

This adds the federated connection as a team member. The member is auto-synced to all team projects via `syncNewMemberToTeamProjects()`.

### Team Invite Flow

```
POST /api/teams/:teamId/invites    → create invite
POST /api/teams/invite/:token       → accept/decline invite
```

Invites can target email, userId, or connectionId. They expire after 7 days.

### Activity Actions for Teams

| Action | When |
|---|---|
| `team_created` | New team created |
| `team_member_added` | Member added directly (not via invite) |
| `team_member_joined` | User joined via invite or was added — logged for the joinee |
| `team_member_removed` | Member removed by admin/owner |
| `team_invite_sent` | Invite created |
| `team_invite_received` | Invite received — logged for the invitee |
| `team_invite_accepted` | Invite accepted |
| `team_invite_declined` | Invite declined |

---

## 11. Project Integration

### Project Context Sharing

```
GET /api/federation/project/:id/context
Auth: X-Federation-Token
```

Returns project context (name, description, members, recent activity) for federated partners who are members.

### Adding a Federated Member to a Project

```
POST /api/projects/:projectId/members
Auth: Session cookie
```

```json
{
  "connectionId": "<federated_connection_id>",
  "role": "member"
}
```

### Project Invite Flow

```
POST /api/projects/:projectId/invite   → send invite
PATCH /api/project-invites              → accept/decline
```

### Activity Actions for Projects

| Action | When |
|---|---|
| `project_invite_sent` | Invite created |
| `project_invite_received` | Invite received — logged for invitee |
| `project_invite_accepted` | Invite accepted |
| `project_invite_declined` | Invite declined |
| `project_member_added` | Member added directly |
| `project_member_joined` | User joined — logged for the joinee |

---

## 12. Activity Logging Taxonomy

Complete list of all `action` types used in `ActivityLog`:

### Connections
- `connection_created` — connection request sent
- `connection_accepted` — connection accepted
- `connection_declined` — connection declined
- `connection_blocked` — connection blocked

### Federation
- `federation_connection_request` — inbound federated connection request received
- `federation_connection_accepted` — outbound federated connection was accepted by remote
- `federation_relay_received` — inbound relay from remote instance
- `federation_mcp_call` — MCP tool call across federation
- `federation_instance_status` — instance status update
- `federation_*` — any action pushed via `/api/federation/notifications` gets prefixed with `federation_`

### Teams
- `team_created` — new team created
- `team_member_added` — member added to team
- `team_member_joined` — user joined a team
- `team_member_removed` — member removed from team
- `team_invite_sent` — team invite created
- `team_invite_received` — team invite received
- `team_invite_accepted` — team invite accepted
- `team_invite_declined` — team invite declined

### Projects
- `project_invite_sent` — project invite sent
- `project_invite_received` — project invite received
- `project_invite_accepted` — project invite accepted
- `project_invite_declined` — project invite declined
- `project_member_added` — member added to project
- `project_member_joined` — user joined project

### Board (Kanban)
- `card_created` — card created
- `card_moved` — card moved between columns
- `card_updated` — card details updated
- `card_deleted` — card deleted

### Queue
- `queue_added` — item added to queue
- `queue_status_changed` — queue item status changed
- `queue_updated` — queue item updated
- `queue_deleted` — queue item deleted
- `queue_confirmed` — queue item approved
- `queue_rejected` — queue item rejected

### CRM
- `contact_added` — contact created
- `contact_updated` — contact updated
- `contact_deleted` — contact deleted

### Calendar
- `event_created` — calendar event created
- `event_updated` — calendar event updated
- `event_deleted` — calendar event deleted

### Goals
- `goal_created` — goal created
- `goal_updated` — goal updated
- `goal_deleted` — goal deleted

### Marketplace
- `marketplace_submission` — agent submitted to marketplace
- `marketplace_review_decision` — admin reviewed agent
- `marketplace_capability_reviewed` — capability reviewed

### Comms
- `comms_message_sent` — message sent
- `comms_state_changed` — message state changed

### Intelligence
- `learning_generated` — ambient learning insight generated

### Settings
- `settings_updated` — user settings changed
- `onboarding_completed` — onboarding finished
- `onboarding_progress` — onboarding phase advanced

---

## 13. Error Handling

### Standard Error Response

```json
{
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| 401 | Missing or invalid federation token |
| 403 | Federation disabled, instance not in allowlist, or insufficient permissions |
| 404 | Connection not found, user not found, or resource not found |
| 409 | Duplicate (already a member, invite already pending) |
| 410 | Resource expired (invite expired) |
| 500 | Internal server error |

### Rate Limiting

No explicit rate limiting currently, but connections are validated per-request. Excessive calls may be throttled in future versions.

### Retry Strategy

For federation callbacks (accept, relay, notifications):
- DiviDen does **not** retry failed outbound calls
- FVP should implement retry with exponential backoff for calls to DiviDen
- Recommended: 3 retries with 1s, 5s, 15s delays

---

## Quick Start for FVP

1. **Implement usernames**: Enforce `[a-z0-9_.-]` format, 2–30 chars, unique per instance (see [Section 3](#3-username-requirements))
2. **Establish a connection**: POST to `/api/federation/connect` with your instance details + federation token
3. **Wait for acceptance**: DiviDen user accepts → you receive a callback at your `/api/federation/connect/accept`
4. **Push notifications**: Use `POST /api/federation/notifications` with the federation token to send any notification type
5. **Send relays**: Use `POST /api/federation/relay` for agent-to-agent communication
6. **Add to teams/projects**: DiviDen users can add your connection to teams and projects from their UI
7. **Implement inline tagging**: Use `GET /api/federation/mentions` to power @mention autocomplete on your side (see [Section 4](#4-inline-tagging-system) and [Section 5](#5-federation-mentions-api))

---

*Questions? Reach out to the DiviDen engineering team or open an issue in the federation channel.*
