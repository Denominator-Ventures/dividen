# DiviDen ↔ FVP Cross-Operability Guide

**Version**: 2.2.0  
**Last Updated**: 2026-04-17  
**Audience**: FVP (Fractional Venture Partners) / MainClaw engineering team  
**Author**: DiviDen Platform Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Connection Prerequisites](#2-connection-prerequisites)
3. [Event Type Taxonomy](#3-event-type-taxonomy)
4. [Relay Push (Task Routing)](#4-relay-push-task-routing)
5. [Project Invite Push](#5-project-invite-push)
6. [Comms / Share Update](#6-comms--share-update)
7. [Relay Response / Completion](#7-relay-response--completion)
8. [Connection Lifecycle Events](#8-connection-lifecycle-events)
9. [Status Sync (Bidirectional)](#9-status-sync-bidirectional)
10. [Endpoint Reference](#10-endpoint-reference)
11. [Authentication](#11-authentication)
12. [Payload Schemas](#12-payload-schemas)
13. [Error Handling](#13-error-handling)
14. [What FVP Needs to Build](#14-what-fvp-needs-to-build)
15. [What DiviDen Has Built](#15-what-dividen-has-built)

---

## 1. Overview

DiviDen and FVP communicate via a **push model**. When an event occurs on one instance that affects a user on the other instance, the originating instance POSTs to the receiving instance's federation endpoint.

**Two endpoints per instance:**

| Endpoint | Purpose |
|---|---|
| `POST /api/federation/relay` | Structured task/request relays (assign_task, delegate, share_update, etc.) |
| `POST /api/federation/notifications` | Lightweight notifications (project_invite, task_completed, status_update, etc.) |

Both are authenticated via `x-federation-token` header, matched against the `federationToken` stored on the `Connection` record.

---

## 2. Connection Prerequisites

Before any federation events can flow, both instances need:

1. **Active Connection** with `isFederated: true`, `status: 'active'`
2. **`peerInstanceUrl`** — the remote instance's base URL (e.g., `https://cc.fractionalventure.partners`)
3. **`federationToken`** — shared secret, stored on both sides
4. **`peerUserEmail`** — the email of the user on the remote instance (for routing)

DiviDen stores these on the `Connection` model. FVP should store equivalent fields in your `InstanceRegistry` or connection model.

---

## 3. Event Type Taxonomy

All events that need to flow between instances, organized by channel:

### Relay Events (`/api/federation/relay`)

| Intent | Direction | Description | DiviDen Status |
|---|---|---|---|
| `assign_task` | Sender → Recipient | Task delegation with full context | ✅ Built (v2.1.2) |
| `delegate` | Sender → Recipient | General delegation (non-task) | ✅ Supported via relay_request |
| `share_update` | Either → Either | Conversational update on shared work | ⚠️ Planned |
| `request_approval` | Sender → Recipient | Approval request with payload | ✅ Supported via relay_request |
| `get_info` | Sender → Recipient | Information request | ✅ Supported via relay_request |
| `schedule` | Sender → Recipient | Meeting/calendar request | ✅ Supported via relay_request |
| `introduce` | Sender → Recipient | Introduction relay (connect two people) | ✅ Supported via relay_request |
| `custom` | Either → Either | Freeform relay | ✅ Supported |
| `relay_response` | Recipient → Sender | Response to a relay (complete/decline) | ⚠️ Needs outbound push |
| `status_update` | Either → Either | Relay status change notification | ⚠️ Needs outbound push |

### Notification Events (`/api/federation/notifications`)

| Type | Direction | Description | DiviDen Status |
|---|---|---|---|
| `project_invite` | Sender → Recipient | Invited to join a project | ✅ Built (v2.1.3) |
| `project_invite_accepted` | Recipient → Sender | Accepted a project invite | ⚠️ Needs outbound push |
| `project_invite_declined` | Recipient → Sender | Declined a project invite | ⚠️ Needs outbound push |
| `task_completed` | Recipient → Sender | Delegated task was completed | ⚠️ Needs outbound push |
| `task_update` | Either → Either | Progress update on a delegated task | ⚠️ Planned |
| `mention` | Either → Either | User was @mentioned cross-instance | ✅ Supported (existing) |
| `relay_received` | Auto | Acknowledgment that relay was received | ✅ Built into relay handler |
| `connection_request` | Sender → Recipient | New connection request | ✅ Existing |
| `connection_accepted` | Recipient → Sender | Connection request accepted | ✅ Existing |
| `card_linked` | Either → Either | A kanban card was linked cross-user | ⚠️ Planned |
| `briefing_ready` | Either → Either | A project briefing is available | ⚠️ Planned |

---

## 4. Relay Push (Task Routing)

### When it fires
When a DiviDen user dispatches a task_route queue item where the target is a federated connection.

### Flow
```
User says "send Ready Set Food task to Alvaro"
  → Divi emits [[task_route:...]] 
  → Queue item created (status: ready)
  → User dispatches (or CoS auto-dispatches)
  → executeTaskRouteDispatch() runs:
    1. Creates local AgentRelay (outbound, pending → delivered)
    2. Creates local comms + kanban card for recipient
    3. POSTs to remote /api/federation/relay  ← THIS IS THE PUSH
    4. Creates sender-side comms + checklist item
```

### Payload shape (what FVP receives)
```json
{
  "connectionId": "clxyz...",
  "relayId": "clxyz_relay...",
  "fromUserEmail": "jon@colab.la",
  "fromUserName": "Jon Bradford",
  "toUserEmail": "alvaro@fractionalventure.partners",
  "type": "request",
  "intent": "assign_task",
  "subject": "Ready Set Food — market analysis",
  "payload": {
    "_briefId": "brief_123",
    "task": {
      "title": "Ready Set Food — market analysis",
      "description": "Analyze the Ready Set Food market opportunity...",
      "requiredSkills": ["market-analysis", "food-tech"],
      "intent": "assign_task",
      "priority": "medium"
    },
    "cardContext": {
      "id": "card_abc",
      "title": "Ready Set Food",
      "status": "active"
    }
  },
  "priority": "medium",
  "dueDate": null
}
```

### What FVP should do on receipt
1. Validate `x-federation-token` against your stored token for this connection
2. Create a local QueueItem or KanbanCard on the target user's board
3. Create a local AgentRelay record (inbound, status: delivered)
4. Notify the user via your comms/notification system
5. Return `{ success: true, relayId: "<your_local_relay_id>" }`

---

## 5. Project Invite Push

### When it fires
When a DiviDen user creates a project and invites a federated connection as a member, or invites them to an existing project.

### Flow
```
User says "create project Debugging DiviDen and add @alvaro"
  → Divi emits [[create_project:{name:"...", members:[{name:"alvaro"}]}]]
  → Project created, ProjectInvite created
  → Queue item + comms message on local side for recipient
  → POSTs to remote /api/federation/notifications
```

### Payload shape
```json
{
  "type": "project_invite",
  "fromUserName": "Jon Bradford",
  "fromUserEmail": "jon@colab.la",
  "toUserEmail": "alvaro@fractionalventure.partners",
  "title": "Project invite: Debugging DiviDen",
  "body": "You've been invited to join \"Debugging DiviDen\" as contributor.",
  "metadata": {
    "projectId": "proj_abc",
    "inviteId": "inv_xyz",
    "role": "contributor"
  },
  "timestamp": "2026-04-17T19:00:00.000Z"
}
```

### What FVP should do
1. Validate token
2. Create a local notification / queue item for the target user
3. Store the `projectId` and `inviteId` from DiviDen for reference
4. When user accepts/declines, POST back to DiviDen's notification endpoint with type `project_invite_accepted` or `project_invite_declined`

---

## 6. Comms / Share Update

### Current state
Comms messages are currently local-only in DiviDen. For cross-instance conversational messages (not structured task relays), we need a `share_update` relay intent.

### Proposed flow
```
User says "tell Alvaro we're pushing the deadline to Friday"
  → Divi emits [[relay_request:{to:"alvaro", intent:"share_update", subject:"...", payload:{...}}]]
  → Creates local AgentRelay
  → POSTs to remote /api/federation/relay with intent: share_update
```

### Payload shape for share_update
```json
{
  "connectionId": "clxyz...",
  "relayId": "relay_456",
  "fromUserEmail": "jon@colab.la",
  "fromUserName": "Jon Bradford",
  "toUserEmail": "alvaro@fractionalventure.partners",
  "type": "notification",
  "intent": "share_update",
  "subject": "Deadline pushed to Friday",
  "payload": {
    "content": "We're pushing the Ready Set Food deadline to Friday.",
    "projectId": "proj_abc",
    "projectName": "Ready Set Food",
    "cardContext": { "id": "card_abc", "title": "Ready Set Food" }
  },
  "priority": "normal"
}
```

### Key fields for FVP to display
- `fromUserName` / `fromUserEmail` — who sent it
- `payload.projectId` / `payload.projectName` — link it to the right board card
- `payload.content` — the actual message
- `payload.cardContext` — optional, links to originating card

---

## 7. Relay Response / Completion

### When it fires
When a user on the receiving instance completes, declines, or responds to a relay.

### What needs to happen
The receiving instance should POST back to the originating instance:

```json
{
  "connectionId": "clxyz...",
  "relayId": "<new_response_relay_id>",
  "fromUserEmail": "alvaro@fractionalventure.partners",
  "fromUserName": "Alvaro",
  "toUserEmail": "jon@colab.la",
  "type": "response",
  "intent": "assign_task",
  "subject": "Re: Ready Set Food — market analysis",
  "payload": {
    "parentRelayId": "<original_relay_id>",
    "action": "completed",
    "response": "Analysis complete. Key findings: ...",
    "artifacts": [
      { "type": "document", "title": "RSF Market Analysis.pdf", "url": "..." }
    ]
  },
  "priority": "normal"
}
```

### DiviDen handling
DiviDen's `/api/federation/relay` already handles inbound relays. When a response comes back:
1. The relay is created locally as inbound
2. A comms message is created for the sender
3. If `payload.parentRelayId` matches an outbound relay, DiviDen can update its status
4. The sender's Divi surfaces the response naturally in conversation

---

## 8. Connection Lifecycle Events

These are already partially implemented. For completeness:

| Event | Endpoint | Notes |
|---|---|---|
| Connection request | `/api/federation/notifications` type: `connection_request` | Existing |
| Connection accepted | `/api/federation/notifications` type: `connection_accepted` | Existing |
| Connection blocked | `/api/federation/notifications` type: `connection_blocked` | Existing |
| Profile updated | `/api/federation/notifications` type: `profile_updated` | Future |

---

## 9. Status Sync (Bidirectional)

When a relay's status changes on either side, the other side should be notified:

```json
{
  "type": "relay_status_changed",
  "fromUserName": "Alvaro",
  "fromUserEmail": "alvaro@fractionalventure.partners",
  "title": "Relay status update",
  "body": "Relay 'Ready Set Food — market analysis' is now completed.",
  "metadata": {
    "relayId": "<local_relay_id>",
    "peerRelayId": "<remote_relay_id>",
    "previousStatus": "delivered",
    "newStatus": "completed"
  }
}
```

---

## 10. Endpoint Reference

### DiviDen endpoints FVP should call

| Method | URL | Auth | Purpose |
|---|---|---|---|
| POST | `https://dividen.ai/api/federation/relay` | `x-federation-token` | Push task relays, responses, updates |
| POST | `https://dividen.ai/api/federation/notifications` | `x-federation-token` | Push notifications (invite accepted, task completed) |
| GET | `https://dividen.ai/api/v2/network/discover` | Bearer API key | Browse user profiles |
| GET | `https://dividen.ai/api/v2/relays/inbound` | Bearer API key | Poll inbound relays (backup if push fails) |

### FVP endpoints DiviDen will call

| Method | URL | Auth | Purpose |
|---|---|---|---|
| POST | `https://cc.fractionalventure.partners/api/federation/relay` | `x-federation-token` | Push task relays |
| POST | `https://cc.fractionalventure.partners/api/federation/notifications` | `x-federation-token` | Push project invites, notifications |

---

## 11. Authentication

All federation requests include:

```
x-federation-token: <shared_secret>
Content-Type: application/json
```

The token is the `federationToken` field on the `Connection` record. Both instances store the same token. DiviDen validates it against the `Connection` table:

```typescript
const connection = await prisma.connection.findFirst({
  where: { isFederated: true, federationToken, status: 'active' },
});
if (!connection) return 401;
```

---

## 12. Payload Schemas

### Relay payload (POST /api/federation/relay)

```typescript
interface FederationRelayPayload {
  connectionId: string;        // The Connection ID (from either side)
  relayId: string;             // The originating relay ID
  fromUserEmail: string;       // Sender's email
  fromUserName: string;        // Sender's display name
  toUserEmail: string;         // Recipient's email
  type: 'request' | 'response' | 'notification' | 'update';
  intent: 'assign_task' | 'delegate' | 'share_update' | 'request_approval' | 
          'get_info' | 'schedule' | 'introduce' | 'custom';
  subject: string;             // Human-readable subject line
  payload?: {                  // Structured data
    task?: {
      title: string;
      description?: string;
      requiredSkills?: string[];
      intent?: string;
      priority?: string;
    };
    cardContext?: {
      id: string;
      title: string;
      status?: string;
    };
    content?: string;          // For share_update: the message body
    projectId?: string;
    projectName?: string;
    parentRelayId?: string;    // For responses: the relay being replied to
    action?: string;           // For responses: 'completed' | 'declined' | 'in_progress'
    response?: string;         // For responses: the reply text
    artifacts?: Array<{        // For responses: attached deliverables
      type: string;
      title: string;
      url?: string;
    }>;
    _briefId?: string;         // DiviDen internal brief reference
    _ambient?: boolean;        // Whether this is an ambient (low-priority) relay
  };
  priority?: 'urgent' | 'normal' | 'low';
  dueDate?: string | null;     // ISO date string
}
```

### Notification payload (POST /api/federation/notifications)

```typescript
interface FederationNotificationPayload {
  type: 'project_invite' | 'project_invite_accepted' | 'project_invite_declined' |
        'task_completed' | 'task_update' | 'mention' | 'relay_received' |
        'connection_request' | 'connection_accepted' | 'relay_status_changed' |
        'card_linked' | 'briefing_ready';
  fromUserName: string;
  fromUserEmail: string;
  toUserEmail?: string;        // If omitted, falls back to connection's peerUserEmail
  title: string;
  body: string;
  metadata?: Record<string, any>;
  timestamp?: string;          // ISO timestamp
}
```

---

## 13. Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|---|---|---|
| 200 | Success | Event processed |
| 401 | Missing or invalid federation token | Check token |
| 403 | Inbound federation disabled | Check FederationConfig |
| 404 | Connection not found for token | Re-register connection |
| 500 | Server error | Retry with exponential backoff |

### Retry strategy
DiviDen uses fire-and-forget with a 10-second timeout. If the push fails, it's logged but doesn't block the local operation. For critical events, the receiving instance can also poll `/api/v2/relays/inbound` as a backup.

### Idempotency
Use the `relayId` or `inviteId` as an idempotency key. If you receive a duplicate push, check if the relay/invite already exists before creating a new one.

---

## 14. What FVP Needs to Build

### Already built (confirmed by Alvaro)
- [x] `/api/federation/relay` — accepts DAWP inbound relays with 9 intent types
- [x] Task-type relays auto-create QueueItem + KanbanCard
- [x] AgentRelay model tracks lifecycle
- [x] Token-based authentication via InstanceRegistry

### Needs to be built

1. **Project invite handler** — Accept `POST /api/federation/notifications` with type `project_invite`. Create a local notification/queue item. Store the remote `projectId` and `inviteId`.

2. **Outbound relay response push** — When a user completes/declines a relay on FVP, POST back to DiviDen's `/api/federation/relay` with type `response` and the `parentRelayId`.

3. **Outbound notification push** — When a user accepts/declines a project invite, POST to DiviDen's `/api/federation/notifications` with type `project_invite_accepted` or `project_invite_declined`.

4. **Status sync push** — When a relay status changes (e.g., agent_handling → completed), push a `relay_status_changed` notification to DiviDen.

5. **Share update handler** — Accept `share_update` intent relays and surface them to the user with sender context.

6. **Profile discovery integration** — Use DiviDen's `/api/v2/network/discover` to show available profiles in your directory UI.

---

## 15. What DiviDen Has Built

### v2.1.2 (April 17, 2026)
- ✅ Queue-first task routing pipeline
- ✅ Outbound federation relay push via `pushRelayToFederatedInstance()`
- ✅ Federation push utility (`src/lib/federation-push.ts`)
- ✅ Network discovery returns `connections` visibility profiles + profileless users

### v2.1.3 (April 17, 2026)
- ✅ `create_project` action tag with member invites
- ✅ `invite_to_project` action tag
- ✅ Federation push for project invites via `pushNotificationToFederatedInstance()`

### Still needed on DiviDen side
- ⚠️ Outbound push for relay responses (when Jon responds to an inbound relay)
- ⚠️ Outbound push for relay status changes
- ⚠️ Outbound push for project invite accept/decline
- ⚠️ `share_update` relay intent support in system prompt
- ⚠️ Status sync handler for inbound status changes

---

*For questions, reach Jon at jon@colab.la or through the DiviDen relay system.*
