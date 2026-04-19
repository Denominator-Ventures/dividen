# DiviDen → FVP: Reply to Build 537–543 Plan

**From:** Jon Bradford, DiviDen  
**To:** Alvaro / FVP Engineering  
**Date:** April 19, 2026  
**Re:** Your digest of our v2.3.2 wire + your Build 537–543 roadmap  

---

## TL;DR

Your read of v2.3.2 is accurate. Three yes, one no, one conditional yes with a counter-proposal.

---

## 1 — Emit `teamId` / `projectId` top-level on outbound relays

**✅ Yes — already shipping.**

As of v2.3.4 (live now), every outbound relay and notification carries `teamId` and `projectId` top-level on the envelope. Team invites (new in v2.3.4) and project invites (v2.3.1) both propagate scope through `pushRelayToFederatedInstance` and `pushNotificationToFederatedInstance`. You should see these fields on every inbound from us going forward.

No action needed on your side beyond destructuring them (your Build 538 scope ingest plan looks correct).

---

## 2 — Advisory routing (drop + echo vs reject)

**✅ Yes — we agree.**

Availability > purity. Our own gating doctrine already works this way — `filter-response` returns `200 { filtered: true }`, never a 4xx rejection. Your `scopeDropped: { teamId, projectId }` echo in the 200 response is the right shape. We'll consume it client-side for mAIn awareness without treating it as an error.

---

## §4.1 — `scope_resolution_failed` back-channel relay

**✅ Yes — useful, low cost.**

We'll ingest it as another notification type on our side. Zero code change for you beyond emitting it — we already have the generic notification ingest path. Suggested shape:

```json
{
  "type": "scope_resolution_failed",
  "title": "Scope resolution failed",
  "body": "teamId 'abc123' not found on this instance",
  "metadata": {
    "droppedTeamId": "abc123",
    "droppedProjectId": null,
    "originalRelayId": "relay_xyz"
  }
}
```

We'll surface it in Comms as an amber system message so Jon sees it without it blocking anything.

---

## §4.2 — `teamAlias` / `projectAlias` mapping table on Connection

**❌ No — not now.**

We're a single-operator shop. Jon doesn't manage cross-instance team graphs, and adding a mapping table creates maintenance burden with zero current payoff. If a real need emerges later (e.g., Jon is on multiple teams across instances with conflicting names), we'll revisit. For now, instance-local resolution is sufficient.

---

## §4.3 — Orphaned card behaviour on peer revoke / project delete

**✅ Conditional yes — orphan + relay, don't auto-archive.**

Jon still wants orphaned cards visible so he can decide what to do with them. Our proposal:

1. **Orphan the card** — remove the federation link, keep the card on the board
2. **Emit a `project_revoked` relay** (or `membership_revoked`) so mAIn can surface: *"DiviDen revoked membership on Acme — card retained, federation link severed"*
3. **Don't auto-archive** — that's a user decision, not a system decision

Suggested relay shape:

```json
{
  "intent": "notify",
  "payload": {
    "kind": "project_revoked",
    "projectId": "proj_abc",
    "projectName": "Acme Launch",
    "reason": "membership_revoked",
    "cardIds": ["card_1", "card_2"]
  },
  "teamId": "team_xyz",
  "projectId": "proj_abc"
}
```

You emit, we ingest and surface. Card stays on board with a visual indicator (dashed border, amber badge) until Jon acts.

---

## Your Build Plan — Our Notes

| Build | Our take |
|-------|----------|
| **537** (Inbound relay for project-invite) | 👍 Correct approach. Our `intent='introduce'` + `payload.kind='project_invite'` is the canonical path. Keep the legacy `/notifications` fallback until you confirm — we'll deprecate it with a version bump. |
| **538** (Scope ingest) | 👍 Your destructure + validate + drop-echo plan matches our contract exactly. `Project→team inheritance` is correct — we do the same inbound. |
| **539** (Accept/Decline + relay-ack + outbound scope) | 👍 Our `/api/federation/relay-ack` endpoint is live and tested. Push the ack with `status: 'completed'` or `'declined'` + `resolvedAt`. We'll advance the queue item, update the checklist, and fire webhooks on our side. |
| **540** (Outbound project-invite POST) | 👍 Your `$transaction` approach is correct. `force:true` re-invite is how we handle it too — cancel existing quartet, create fresh. |
| **541** (Chat tags) | No notes — your internal concern. |
| **542** (UI surfaces) | The `dividen:*` custom events are a nice touch. Our own surfaces fire `fvp:*` events for the same reason. Consider namespacing yours consistently. |
| **543+** (Track our v2.3.4/v2.3.5) | We shipped v2.3.4 (team invites four-signal) today. v2.3.5 (project role changes) is next. Same recipe — you'll see the same wire shape. |

---

## What We Shipped Since Your Last Sync

| Version | What | Status |
|---------|------|--------|
| v2.3.2 | Multi-tenant relay wire (`teamId`/`projectId` on envelope) | ✅ Live |
| v2.3.3 | Comms threading scope parity UI (chips in thread list, header, bubbles, mobile) | ✅ Live |
| v2.3.4 | Team invites four-signal (POST + accept/decline relay stamping + federation push) | ✅ Live |
| v2.3.5 | Project role changes four-signal | 🔜 Next |
| v2.4.0 | HMAC enforcement (feature-flagged) + self-test suite | 🔜 ~2 weeks |

---

## Open Item

The three clarifies from last round are now resolved (§4.1 yes, §4.2 no, §4.3 conditional). No outstanding questions from our side. Ship Build 537 and ping us when you're ready for a live handshake test.

— Jon
