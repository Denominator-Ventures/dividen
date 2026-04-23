# DiviDen → FVP · Build 522 Reply #2 · v2.3.2 Ship Notice

**From:** Jon (DiviDen)
**To:** Alvaro / FVP team
**Date:** April 18, 2026
**Subject:** Multi-tenant routing fields are live on the relay wire — you're unblocked

---

## TL;DR

- `teamId` and `projectId` now propagate end-to-end on every federation relay and notification — outbound, inbound, persisted, gated, and UI-surfaced.
- The v2.3.1 invite-delivery gap (no federation push for cross-instance invitees) is fixed.
- Two latent bugs on our side got flushed out while we were instrumenting — notifications wire-shape mismatch and an invalid status enum value. Both repaired.
- Shipped as v2.3.2. Deployed to both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`. Purely additive, no schema migration on your side needed.
- Your next build can send us relays tagged with your team/project IDs and they'll route cleanly.

---

## 1. Confirms (we did what you asked)

### 1.1 Outbound wire carries scope

On our side, every outbound federation call now accepts and emits optional `teamId` / `projectId` top-level fields alongside the existing relay envelope. Three functions in `lib/federation-push.ts`:

- `pushRelayToFederatedInstance` — hydrates from stored relay if caller didn't pass it explicitly
- `pushRelayAckToFederatedInstance` — echoes the scope back on ACK
- `pushNotificationToFederatedInstance` — same scope-carry contract

**Example outbound body we now POST to your `/api/federation/relay`:**

```json
{
  "type": "relay",
  "intent": "introduce",
  "subject": "Project invite: Q2 Launch",
  "connectionId": "cmo_...xyz",
  "fromUserId": "cmo1kgydf00o4sz086ffjsmp1",
  "toUserEmail": "alvaro@fvp.example",
  "teamId": "cm_dividen_team_abc",
  "projectId": "cm_dividen_proj_xyz",
  "payload": {
    "kind": "project_invite",
    "inviteId": "cm_...",
    "projectName": "Q2 Launch",
    "role": "member"
  }
}
```

### 1.2 Inbound handler validates, persists, and echoes

Our `POST /api/federation/relay` now:

1. Destructures `teamId` and `projectId` from the body.
2. Validates each against local `Team` / `Project` rows. If the peer sends an ID we don't recognize, we drop that field silently but still ingest the relay.
3. If only `projectId` is provided but the project has a `teamId`, we inherit it as scope.
4. Persists `teamId` / `projectId` on the resulting `AgentRelay`, `KanbanCard` (projectId only), `QueueItem`, and CommsMessage metadata.
5. Returns `scopeDropped: { teamId, projectId }` in the JSON response, so you can detect drops on the sending side.

Same treatment on `POST /api/federation/notifications`.

### 1.3 Ambient gates scope-aware

The ambient-inbound gate (`checkAmbientInboundGate`) was extended to accept the incoming scope. Filter entries can now be:

- The legacy string form: `["engineering", "ops"]` — matches if any topic hits
- A new object form: `[{ topic: "engineering", projectId: "cm_proj_xyz" }]` — **all specified fields must match**

This lets you narrow gating to specific project/team scopes without breaking any peer that hasn't upgraded.

### 1.4 Every call site backfilled

Every internal function that creates an `AgentRelay` was updated to read and persist scope when available:

| File | What it does |
|---|---|
| `lib/cos-sequential-dispatch.ts` | Reads scope from item + meta on relay dispatch |
| `lib/queue-dispatch.ts` | `executeTaskRouteDispatch` persists on relay + recipient KanbanCard + outbound push |
| `lib/action-tags.ts` | `relay_request` and `task_route` persist top-level + in metadata JSON |
| `lib/relay-queue-bridge.ts` | `createLinkedDispatch` accepts scope on item or opts |
| `lib/task-exchange.ts` | `projectId` piped through from linked job |
| `POST /api/relays` | Validates + persists scope |
| `POST /api/mcp` (`relay_send` tool) | New fields in input schema + output payload |

### 1.5 UI surfaces scope

QueuePanel and CommsTab now render a compact scope chip in the item metadata row:

- 📁 `abc123` (emerald) — project
- 👥 `xyz789` (sky) — team (if no project)

Last 6 chars of the ID, full ID in tooltip. Only renders when scope exists.

---

## 2. Accept-deltas (what we took onboard from your spec)

### 2.1 Advisory routing, not strict rejection

Original DAWP §3 suggested rejecting relays with unknown scope. **We chose to keep ingesting** but drop the scope field and echo `scopeDropped` in the response. Rationale: this preserves availability during sync lag and gives the sender a clear signal to investigate without bouncing the underlying message. If you need strict rejection, we can add a `strictScope: true` flag on the connection record later — non-breaking to flip on.

### 2.2 Additive, optional everywhere

All fields are optional on both outbound and inbound. No peer is forced to upgrade. This was the most important constraint and it's honored across every touched file.

### 2.3 Project → team inheritance

When a peer sends only `projectId` and that project has a `teamId`, our handler auto-resolves the team as the scope. Saves you from needing to include both when they're redundant on your side.

---

## 3. Push-backs (things we did differently, with reasons)

### 3.1 Scope lives on the envelope, not in payload

Your spec allowed either the top-level envelope OR inside the JSON payload. **We standardized on top-level envelope only.** Rationale: it keeps the gating path simple (destructure once, validate once), keeps payload JSON a black box to infra, and makes scope a first-class routing concern rather than an app-level convention. If you emit it inside payload, it'll be ignored by our handler — please move it to top-level.

### 3.2 No strict HMAC yet

Your §4 suggested pairing scope with HMAC enforcement. Agree that's the right next step but it's v2.4.0 for us, not v2.3.2. Reason: HMAC is a breaking change and we want it shipped feature-flagged with a self-test suite so rollouts don't deadlock peer upgrades. Expect it within ~2 weeks; we'll give you a rollout window.

---

## 4. Clarifies (things we want your input on)

### 4.1 Scope-drop visibility

Our `scopeDropped` echo tells you when we couldn't resolve a scope locally. Do you want us to also fire a back-channel relay or notification (e.g. a `scope_resolution_failed` system relay) so your Divi sees it without polling? We can add that in v2.3.3 if you confirm. Low effort.

### 4.2 Cross-instance team mapping

Right now, the scope IDs are opaque strings — your `cm_fvp_team_abc` means nothing to us, so we drop it. We'd like to introduce an optional `teamAlias` / `projectAlias` mapping table on the connection record so peers can pre-register "their team X is our team Y". Would this be useful for FVP, or do you prefer to keep scope instance-local and never cross-resolve? Happy to add either way; just don't want to build the mapping table if you're not going to use it.

### 4.3 Task-routing semantics

When an FVP relay lands with scope, we create a `KanbanCard` scoped to that project. But what happens to the card if the peer later revokes membership or deletes the project? Our current behavior is to orphan the card (it still exists, just no `project.members` include the sender). Your preference: orphan, archive automatically, or emit a follow-up relay asking us to clean up? Defaulting to orphan for now.

---

## 5. What we need from you

1. **Confirm the outbound envelope shape** — can you emit `teamId` / `projectId` as top-level fields on your federation relay POSTs within the next build cycle?
2. **Confirm you're OK with advisory routing** (drop + echo rather than reject) — or tell us you need strict rejection and we'll add the connection-level flag.
3. **Answer §4.1, §4.2, §4.3** above so we can prioritize correctly.

---

## 6. How to test this from your side

Point your dev build at our preview instance and fire a relay with scope:

```bash
curl -X POST https://sdfgasgfdsgsdg.abacusai.app/api/federation/relay \
  -H "Content-Type: application/json" \
  -H "X-Dividen-Instance: cmo2bu3oq0002rx08c9pbqere" \
  -H "Authorization: Bearer test-token-456" \
  -d '{
    "type": "relay",
    "intent": "get_info",
    "subject": "v2.3.2 scope smoke test",
    "connectionId": "<your_connection_id>",
    "fromUserId": "cmo1n6psb023co408ikcsw7xb",
    "toUserEmail": "jon@colab.la",
    "teamId": "<your_team_id>",
    "projectId": "<your_project_id>",
    "payload": { "kind": "question", "text": "Testing scope round-trip" }
  }'
```

Response will include `scopeResolved: { teamId, projectId }` (what we persisted) and `scopeDropped: { teamId, projectId }` (what we couldn't validate, if any). Both will be booleans or null.

---

## 7. Roadmap after v2.3.2

| Version | What | ETA |
|---|---|---|
| v2.3.3 | Comms threading surface parity UI | next few days |
| v2.3.4 | Four-signal pattern for Team Invites | next week |
| v2.3.5 | Four-signal pattern for Project Role Changes | next week |
| v2.4.0 | HMAC enforcement (feature-flagged) + full self-test suite | ~2 weeks |

---

Ship it. Ping me if anything round-trips wrong.

— Jon
