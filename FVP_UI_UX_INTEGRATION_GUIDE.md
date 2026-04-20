# FVP Command Center — UI/UX Integration Guide

**Date:** April 20, 2026  
**From:** DiviDen Engineering  
**To:** FVP / MainClaw Engineering Team  
**Ref:** DiviDen v2.4.2, FVP Build 540  
**Purpose:** Comprehensive guide to every UI surface FVP needs to accommodate the full DiviDen federation integration.

---

## Overview

Your backend (Builds 537–540) handles the wire protocol — you can receive relays, process scope, push ack-backs, and sign payloads. What's missing is the **user-facing surface** that lets Jon see, act on, and manage everything flowing through the federation pipe.

This doc covers **every UI surface** needed, organized by priority. Each section includes:
- **What it does** — the user story
- **Data source** — what's already in your DB from the wire protocol
- **UI spec** — what to render
- **Interaction spec** — what happens when the user clicks

---

## Table of Contents

1. [Queue: Accept/Decline Buttons for Inbound Invites](#1-queue-acceptdecline-buttons-for-inbound-invites)
2. [Queue: Scope Chips (Project/Team Badges)](#2-queue-scope-chips-projectteam-badges)
3. [Comms: Federation Thread View](#3-comms-federation-thread-view)
4. [Comms: Scope Chips on Relay Bubbles](#4-comms-scope-chips-on-relay-bubbles)
5. [Kanban: Federated Cards + Delegation Provenance](#5-kanban-federated-cards--delegation-provenance)
6. [Kanban: Card Sync Status Indicator](#6-kanban-card-sync-status-indicator)
7. [Notifications: Federation Activity Feed](#7-notifications-federation-activity-feed)
8. [Connection Detail: HMAC Status + Federation Health](#8-connection-detail-hmac-status--federation-health)
9. [Team Invites (Incoming — Future)](#9-team-invites-incoming--future)
10. [Role Change Notifications (Incoming)](#10-role-change-notifications-incoming)
11. [Ghost Avatars for Federated Members](#11-ghost-avatars-for-federated-members)
12. [Contributor Picker with Federation Awareness](#12-contributor-picker-with-federation-awareness)
13. [Error States + Edge Cases](#13-error-states--edge-cases)

---

## 1. Queue: Accept/Decline Buttons for Inbound Invites

**Priority: 🔴 Critical (Build 541–542)**

This is the most important missing surface. Jon currently can't accept or decline project invites from DiviDen through the FVP UI — he has to do it via chat tags.

### What it does
When a project invite relay arrives from DiviDen, a queue item should appear with visible **Accept** and **Decline** buttons.

### Data source
Your inbound relay handler (Build 537) already creates a local `AgentRelay` and `QueueItem`. The invite metadata is in the relay payload:

```json
{
  "kind": "project_invite",
  "projectId": "cmo1kgydm00o6sz08dpllr7e1",
  "projectName": "DiviDen Setup",
  "inviterId": "cmo1kgydf00o4sz086ffjsmp1",
  "inviterName": "Jon Bradford",
  "inviterEmail": "jon@colab.la",
  "role": "contributor",
  "inviteId": "<dividen-invite-id>"
}
```

### UI spec

```
┌─────────────────────────────────────────────────┐
│ 📨 Project Invite: DiviDen Setup                │
│ From: Jon Bradford (jon@colab.la)               │
│ Role: contributor                               │
│ 📁 cmo1kg...r7e1                                │
│                                                 │
│  [ ✓ Accept ]  [ ✗ Decline ]                    │
└─────────────────────────────────────────────────┘
```

- **Accept button**: Green background, `bg-green-500/15 text-green-400 border border-green-500/30`
- **Decline button**: Red background, `bg-red-500/10 text-red-400 border border-red-500/25`
- **Loading state**: Button text changes to "Accepting..." / "Declining..." with `disabled:opacity-50`
- **Both disabled** while either is processing (prevent double-click)

### Interaction spec

**On Accept:**
1. Call your local accept handler (update relay status → `completed`, mark queue item → `done_today`)
2. Push `pushRelayAck` to DiviDen's `/api/federation/relay-ack` with:
   ```json
   {
     "relayId": "<your-relay-id>",
     "peerRelayId": "<dividen-invite-id>",
     "status": "accepted",
     "type": "project_invite_response",
     "metadata": {
       "inviteId": "<dividen-invite-id>",
       "connectionId": "<connection-id>",
       "action": "accepted",
       "respondedAt": "<ISO-8601>"
     }
   }
   ```
3. Write a local CommsMessage: "✅ You accepted the project invite: DiviDen Setup"
4. Remove or gray out the queue item

**On Decline:** Same flow, `status: 'declined'`, red confirmation message.

### What DiviDen does on receipt
Our v2.4.2 handler:
- Updates the AgentRelay → `completed`/`declined`
- Updates ProjectInvite → `accepted`/`declined`
- Auto-adds the accepted member to the project
- Writes a CommsMessage to the inviter
- Advances the queue item → `done_today`

---

## 2. Queue: Scope Chips (Project/Team Badges)

**Priority: 🟡 Medium (Build 542)**

Queue items that arrive with `projectId` or `teamId` should show visual scope badges so Jon knows which project/team a task belongs to at a glance.

### UI spec

**Project chip:**
```html
<span class="text-[10px] px-1.5 py-0.5 rounded font-medium
  bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
  📁 {projectId.slice(-6)}
</span>
```

**Team chip:**
```html
<span class="text-[10px] px-1.5 py-0.5 rounded font-medium
  bg-sky-500/15 text-sky-300 border border-sky-500/30">
  👥 {teamId.slice(-6)}
</span>
```

### Rules
- Show project chip if `projectId` exists
- Show team chip if `teamId` exists AND `projectId` does NOT (project takes precedence)
- Chip shows last 6 chars of the CUID
- Full ID in `title` attribute (tooltip on hover)
- Place in the metadata row below the queue item title

---

## 3. Comms: Federation Thread View

**Priority: 🟡 Medium (Build 542)**

Federation relays should appear as threaded conversations in a comms or messaging view, not just raw queue items.

### Thread structure

```
Thread: "Ready Set Food — market analysis"
├── 📤 Outbound relay from Jon (DiviDen) — Apr 18
│   └── Task: analyze market opportunity
├── 📥 Your agent handling note — Apr 18
│   └── "I'll look into this by Friday"
└── 📤 Ack-back to DiviDen — Apr 19
    └── Status: completed
```

Each relay in a thread shares a `threadId`. Group them.

### Thread list view
Show threads with:
- Peer name + avatar (or federation icon)
- Last message preview
- Unread indicator (new state)
- Direction arrow: `↗` outbound (emerald), `↙` inbound (purple)
- Scope hint emoji (📁 if any relay has a projectId)

### Thread detail view
Show each relay as a bubble:
- Outbound: right-aligned, emerald-tinted
- Inbound: left-aligned, purple-tinted
- Each bubble shows: subject, payload preview, timestamp, status badge
- Scope chips per-relay (same emerald/sky pattern)

---

## 4. Comms: Scope Chips on Relay Bubbles

**Priority: 🟡 Medium (Build 542)**

Same chip pattern as queue items, but inside the relay bubble metadata row.

### Data extraction
Scope can be in multiple places (check in order):
1. `relay.projectId` / `relay.teamId` (top-level fields)
2. `relay.payload.projectId` / `relay.payload.teamId`
3. `relay.payload._scope.projectId` / `relay.payload._scope.teamId`

Parse payload JSON and check all three paths.

### Aggregated thread header
If a thread has relays with multiple distinct project/team IDs, show all of them as a chip row in the thread header:

```
[📁 ...r7e1] [📁 ...ta0q] [👥 ...j8k2]
```

Use `Set<string>` to deduplicate across all relays in the thread.

---

## 5. Kanban: Federated Cards + Delegation Provenance

**Priority: 🟢 Low-Medium (Build 543+)**

When DiviDen delegates a task to FVP, a kanban card should appear on Jon's board with clear provenance.

### Card display

```
┌─────────────────────────────────────┐
│ 🔗 Ready Set Food — market analysis │
│ From: Jon Bradford (DiviDen)        │
│ Priority: medium    Due: —          │
│ Status: active                      │
│                                     │
│ 📡 Federated task                   │
│ 📁 cmo1kg...r7e1                    │
└─────────────────────────────────────┘
```

### Required fields
- `🔗` or `📡` icon indicating federated origin
- `From:` line with originator name + instance
- `originCardId` + `originUserId` for provenance (from relay payload `cardContext`)
- Link back to the relay thread for full context

### Card sync
When Jon moves a card (stage change, priority change), POST to DiviDen's `/api/federation/card-update` with:
```json
{
  "localCardId": "<your-card-id>",
  "peerCardId": "<dividen-card-id>",
  "relayId": "<your-relay-id>",
  "peerRelayId": "<dividen-relay-id>",
  "newStage": "in_progress",
  "newPriority": "high",
  "title": "Ready Set Food — market analysis"
}
```

DiviDen will update the sender's board to reflect the stage change.

---

## 6. Kanban: Card Sync Status Indicator

**Priority: 🟢 Low (Build 543+)**

Small icon on federated cards showing sync health:

| State | Icon | Meaning |
|---|---|---|
| Synced | 🟢 | Last card-update push succeeded |
| Pending | 🟡 | Update queued, not yet pushed |
| Failed | 🔴 | Push failed (timeout, 4xx, 5xx) |
| Offline | ⚫ | Connection inactive or unreachable |

Tooltip: "Last synced: 2 min ago" or "Sync failed: connection timeout"

---

## 7. Notifications: Federation Activity Feed

**Priority: 🟡 Medium (Build 542)**

A notification center or activity feed that surfaces federation events:

### Event types to surface

| Event | Icon | Example text |
|---|---|---|
| Inbound relay | 📥 | "Jon Bradford sent you a task: Market analysis" |
| Relay completed | ✅ | "You completed: Market analysis" |
| Project invite received | 📨 | "Jon Bradford invited you to DiviDen Setup" |
| Project invite accepted | ✅ | "You accepted the invite to DiviDen Setup" |
| Project invite declined | ❌ | "You declined the invite to DiviDen Setup" |
| Role change | 🔄 | "Jon Bradford changed your role on DiviDen Debug: contributor → lead" |
| Team invite received | 👥 | "Jon Bradford invited you to team: Alpha Team" |
| HMAC activated | 🔐 | "Secure signing enabled for DiviDen connection" |
| Connection status | 🌐 | "DiviDen connection: active" |

### Noise filtering
Filter out low-value events from the main feed:
- Status sync pings
- Heartbeat/health checks
- Duplicate notifications for the same event

Group similar events by time window (e.g., "3 tasks received from DiviDen" instead of 3 separate notifications).

---

## 8. Connection Detail: HMAC Status + Federation Health

**Priority: 🟡 Medium (Build 542)**

The connection detail view for the DiviDen connection should show:

### Security section
```
🔐 HMAC-SHA256: Active
   Header: x-hmac-sha256
   Key: •••••••••• (federationToken)
   Activated: April 20, 2026
```

### Federation health
```
📡 Federation Status
   Connection: active
   Last relay sent: Apr 19, 12:32 PM
   Last relay received: Apr 18, 11:34 PM
   Total relays: 7 sent, 5 received
   Pending acks: 0
```

### Connection metadata
```
🌐 Peer Instance
   URL: https://dividen.ai
   Operator: Jon Bradford
   Email: jon@colab.la
   Instance ID: cmo2bx2nb0001t2bbs8j75id8
```

---

## 9. Team Invites (Incoming — Future)

**Priority: 🟢 Low (Build 543+)**

DiviDen v2.3.4 ships team invites over the wire. When FVP receives them:

### Wire payload
```json
{
  "type": "request",
  "intent": "introduce",
  "payload": {
    "kind": "team_invite",
    "teamId": "<dividen-team-id>",
    "teamName": "Alpha Team",
    "inviterName": "Jon Bradford",
    "role": "member"
  }
}
```

### UI surface
Same accept/decline pattern as project invites (Section 1), but with team styling:

```
┌─────────────────────────────────────────────────┐
│ 👥 Team Invite: Alpha Team                      │
│ From: Jon Bradford (jon@colab.la)               │
│ Role: member                                    │
│                                                 │
│  [ ✓ Accept ]  [ ✗ Decline ]                    │
└─────────────────────────────────────────────────┘
```

### Ack-back payload
Same pattern as project invite ack-back, but include `teamId` in metadata.

---

## 10. Role Change Notifications (Incoming)

**Priority: 🟢 Low (Build 543+)**

DiviDen v2.3.5 pushes role change notifications via `/api/federation/notifications`. These are **informational only** — no accept/decline needed.

### Wire payload
```json
{
  "type": "member_role_changed",
  "fromUserName": "Jon Bradford",
  "title": "Role changed on DiviDen Debug",
  "body": "Your role was changed from contributor to lead.",
  "metadata": {
    "projectId": "<id>",
    "previousRole": "contributor",
    "newRole": "lead",
    "direction": "promoted"
  }
}
```

### UI surface
Display as a notification card:

```
┌─────────────────────────────────────────────────┐
│ 🔄 Role Change: DiviDen Debug                   │
│ Jon Bradford changed your role:                 │
│ contributor → lead (promoted)                   │
│ 📁 cmo27v...ta0q                                │
└─────────────────────────────────────────────────┘
```

Color the direction: green for promoted ↑, amber for demoted ↓.

---

## 11. Ghost Avatars for Federated Members

**Priority: 🟡 Medium (Build 542)**

Federated connections who appear as project members, task originators, or thread participants should have a distinct visual treatment since they're not local users.

### Avatar pattern
- **Federated user**: Show a 🌐 globe overlay on the avatar (bottom-right badge)
- **No profile photo**: Use initials + a subtle gradient distinguishing federated from local
- **Tooltip**: "Jon Bradford (DiviDen) — federated"

### Where they appear
- Project member lists
- Kanban card assignee badges
- Comms thread participant lists
- Notification actor names
- Relay bubbles (sender/recipient indicators)

### Fallback
If you don't have a profile photo URL for the federated user (you won't — we don't push photos over the wire), use:
```
<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 
  flex items-center justify-center text-[11px] font-medium text-purple-300">
  {initials}
</div>
```

---

## 12. Contributor Picker with Federation Awareness

**Priority: 🟢 Low-Medium (Build 542–543)**

When Jon creates a project or assigns a task on FVP, the contributor/assignee picker should show federated connections alongside local users.

### Picker design
```
┌─────────────────────────────────────┐
│ 🔍 Search members...                │
├─────────────────────────────────────┤
│ 👤 Local Users                      │
│   Jon Bradford (you)                │
│   Sarah Chen                        │
├─────────────────────────────────────┤
│ 🌐 Federated Connections            │
│   Jon Bradford (DiviDen) 📡         │
│   [future connections...]           │
└─────────────────────────────────────┘
```

### Rules
- Separate local users from federated connections with a section header
- Show the instance name in parentheses for federated entries
- 📡 badge or 🌐 icon to indicate federation
- Search should match name, email, and instance name
- When a federated connection is selected for a project invite, fire the outbound relay (which you already have in Build 540)

---

## 13. Error States + Edge Cases

**Priority: 🟡 Medium (all builds)**

### HMAC failures
If an inbound relay fails HMAC verification (401), show a system notification:
```
⚠️ Federation security: HMAC verification failed for incoming relay from DiviDen.
   The payload signature didn't match. This could indicate a token mismatch.
   Contact the DiviDen operator to verify shared secrets.
```

### Scope resolution failures
If an inbound relay references a `projectId` or `teamId` you don't have locally:
- **Don't reject the relay** — process it normally
- Drop the unrecognized scope silently
- Optionally: push a `scope_resolution_failed` notification back (we ingest these)
- Show the relay without scope chips

### Connection offline
If an ack-back push to DiviDen fails (timeout, 5xx):
- Queue the ack for retry (exponential backoff, max 3 attempts)
- Show amber indicator on the connection: "⚠️ Last push failed — retrying"
- After 3 failures: red indicator, log for manual review

### Duplicate invites
If a project invite arrives for a project the user is already a member of:
- Show as a notification: "You're already a member of DiviDen Setup"
- Don't create a duplicate queue item
- Auto-ack with `status: 'accepted'` (idempotent)

### Relay for unknown user
If `toUserEmail` doesn't match any local user:
- Return `{ success: false, error: 'User not found' }` to DiviDen
- We'll log it and surface it as a delivery failure

---

## Appendix A: Color Palette Reference

Consistent chip/badge colors across all surfaces:

| Element | Text | Background | Border |
|---|---|---|---|
| Project scope | `text-emerald-300` | `bg-emerald-500/15` | `border-emerald-500/30` |
| Team scope | `text-sky-300` | `bg-sky-500/15` | `border-sky-500/30` |
| Outbound relay | `text-emerald-400` | `bg-emerald-500/10` | `border-emerald-500/20` |
| Inbound relay | `text-purple-400` | `bg-purple-500/10` | `border-purple-500/20` |
| Accept button | `text-green-400` | `bg-green-500/15` | `border-green-500/30` |
| Decline button | `text-red-400` | `bg-red-500/10` | `border-red-500/25` |
| HMAC active | `text-green-400` | — | — |
| Federation badge | `text-purple-300` | `bg-purple-500/20` | — |
| Promoted | `text-green-400` | — | — |
| Demoted | `text-amber-400` | — | — |

---

## Appendix B: Build Sequence Recommendation

| Build | Surfaces | Sections |
|---|---|---|
| **541** | Chat tags (accept/decline/invite) | §1 (backend only) |
| **542** | Queue accept/decline UI, scope chips, ghost avatars, contributor picker, comms threading, notifications, connection detail | §1–§4, §7–§8, §11–§12 |
| **543** | Kanban federation, card sync, team invites, role changes | §5–§6, §9–§10 |
| **544+** | Error states polish, retry logic, sync indicators | §13 |

---

## Appendix C: Wire Protocol Quick Reference

### Inbound endpoints (FVP receives from DiviDen)

| Endpoint | Payload types |
|---|---|
| `POST /api/federation/relay` | `assign_task`, `delegate`, `introduce` (project/team invite), `custom`, `schedule`, `share_update` |
| `POST /api/federation/notifications` | `project_invite`, `member_role_changed`, `task_completed`, `connection_request` |
| `POST /api/federation/card-update` | Card stage/priority/title sync |

### Outbound endpoints (FVP pushes to DiviDen)

| Endpoint | When |
|---|---|
| `POST /api/federation/relay-ack` | Accept/decline invite, complete task, decline relay |
| `POST /api/federation/card-update` | Card moved/updated on FVP board |
| `POST /api/federation/notifications` | Informational pushes (optional) |

### Headers (all requests)

```
x-federation-token: <shared-secret>
x-hmac-sha256: <hex-hmac>          (when hmacEnabled=true)
Content-Type: application/json
```

---

*This document covers every UI surface needed for full federation parity with DiviDen v2.4.2. Questions → relay to jon@colab.la or push via federation.*
