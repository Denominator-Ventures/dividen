# DiviDen Federation Integration Guide

**Version**: 1.9.5  
**Last Updated**: 2026-04-16  
**Audience**: FVP (First Ventures Platform) / MainClaw engineering team  
**Author**: DiviDen Platform Team

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
3. [Notification System](#3-notification-system)
4. [Federation Notification Relay API](#4-federation-notification-relay-api)
5. [Connection Lifecycle](#5-connection-lifecycle)
6. [Relay System](#6-relay-system)
7. [Team Integration](#7-team-integration)
8. [Project Integration](#8-project-integration)
9. [Activity Logging Taxonomy](#9-activity-logging-taxonomy)
10. [Error Handling](#10-error-handling)

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

## 3. Notification System

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

## 4. Federation Notification Relay API

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

## 5. Connection Lifecycle

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

## 6. Relay System

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

## 7. Team Integration

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

## 8. Project Integration

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

## 9. Activity Logging Taxonomy

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

## 10. Error Handling

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

1. **Establish a connection**: POST to `/api/federation/connect` with your instance details + federation token
2. **Wait for acceptance**: DiviDen user accepts → you receive a callback at your `/api/federation/connect/accept`
3. **Push notifications**: Use `POST /api/federation/notifications` with the federation token to send any notification type
4. **Send relays**: Use `POST /api/federation/relay` for agent-to-agent communication
5. **Add to teams/projects**: DiviDen users can add your connection to teams and projects from their UI

---

*Questions? Reach out to the DiviDen engineering team or open an issue in the federation channel.*
