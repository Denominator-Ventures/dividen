# DiviDen → FVP — Integration Answers

> **From**: DiviDen platform team (dividen.ai)
> **To**: FVP Command Center dev team (cc.fractionalventure.partners)
> **Date**: April 16, 2026
> **DiviDen Version**: 0.4.0 (agent card) / v2.1.1 (internal)
> **Build**: Current production on dividen.ai

---

## 1. Connection Lifecycle — Acceptance Callback

### Q1.1: When a DiviDen user accepts a connection request from FVP, does DiviDen call back to FVP?

**Yes.** DiviDen POSTs to `{peerInstanceUrl}/api/federation/connect/accept`.

The callback is in `src/app/api/connections/[id]/route.ts` (PATCH handler, line 44–66). When a user accepts a federated connection:

```typescript
await fetch(`${connection.peerInstanceUrl}/api/federation/connect/accept`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Federation-Token': connection.federationToken,
  },
  body: JSON.stringify({
    connectionId: id,
    acceptedByEmail: session.user.email,
    acceptedByName: session.user.name,
    instanceUrl,  // DiviDen's own URL from FederationConfig
  }),
});
```

**Endpoint called**: `POST /api/federation/connect/accept`
**Auth**: `X-Federation-Token` header (the original shared token from the connection request).

DiviDen does **NOT** use `/api/federation/notifications` for acceptance callbacks. It calls `/api/federation/connect/accept` directly.

### Q1.2: What is the exact payload?

```json
{
  "connectionId": "<dividen-side-connection-id>",
  "acceptedByEmail": "jon@colab.la",
  "acceptedByName": "Jon Bradford",
  "instanceUrl": "https://dividen.ai"
}
```

This matches your expected shape exactly. No additional fields.

### Q1.3: Does DiviDen read FVP's agent card to discover the accept callback URL?

**No, not currently.** DiviDen hardcodes the path as `{peerInstanceUrl}/api/federation/connect/accept`. It does **not** read the agent card for this endpoint.

**Recommendation**: FVP should ensure `/api/federation/connect/accept` exists at that path. If you want to also advertise it in your agent card, add `endpoints.federation.connectAccept` — we'll update DiviDen to read it in a future build, but for now the hardcoded path works as long as your endpoint is at `/api/federation/connect/accept`.

**UPDATE (this build)**: We've added `connectAccept` to DiviDen's agent card under `endpoints.federation.connectAccept` so both sides are consistent.

### Q1.4: Is the acceptance callback synchronous with the user clicking Accept?

**Synchronous within the same HTTP request.** The PATCH handler `await`s the fetch to the remote instance before returning. If the remote call fails (timeout, 500, etc.), it's caught silently — the local connection is still updated to `active` regardless. The callback is best-effort but synchronous.

### Q1.5: If DiviDen auto-accepts connections, does it still send a callback?

DiviDen's `/api/federation/connect` checks `fedConfig.requireApproval`. If `requireApproval` is `false`, the connection is created as `active` immediately. **However**, the acceptance callback is only triggered when a user clicks Accept (via the PATCH endpoint). So auto-accepted connections do **NOT** currently fire a callback.

**This is a gap.** We'll add auto-accept callback in a future build. For now, if FVP's connection stays `pending` after DiviDen auto-accepts, you can detect this by polling or by sending a test relay (which will succeed if the connection is active on our side).

---

## 2. Connection Lifecycle — FVP Accepting Inbound Requests

### Q2.1: When FVP accepts an inbound connection, should you call back to DiviDen?

**Yes.** POST to `https://dividen.ai/api/federation/connect/accept` with the federation token.

DiviDen has this endpoint live and ready (`src/app/api/federation/connect/accept/route.ts`). It:
1. Looks up the local connection by `federationToken` + `status: 'pending'`
2. Updates it to `active`
3. Creates a CommsMessage notifying the local user
4. Creates a CRM contact for the remote user
5. Logs an ActivityLog entry

### Q2.2: What payload does DiviDen expect?

```json
{
  "connectionId": "<fvp-side-connection-id>",
  "acceptedByEmail": "jon@fractionalventure.partners",
  "acceptedByName": "Jon Bradford",
  "instanceUrl": "https://cc.fractionalventure.partners"
}
```

**Headers**:
```
Content-Type: application/json
X-Federation-Token: test-token-456
```

### Q2.3: Should the acceptance callback use the original federation token or a new one?

**The original federation token from the connection request.** DiviDen looks up the connection by `{ isFederated: true, federationToken, status: 'pending' }`. If FVP sends a different token, the lookup will fail with 404.

---

## 3. Notification Bell — Surfacing Actionable Federation Events

### Q3.1: Does DiviDen have inline Accept/Decline in the notification dropdown?

**No.** DiviDen's notification bell shows ActivityLog entries as read-only items. Connection acceptance/decline is done through the **Connections tab** in the dashboard (ConnectionsView.tsx). Pending connections show Accept/Decline buttons there, plus an AcceptConnectionModal for setting nickname and trust level.

If you want to match DiviDen's UX: show federation events in the notification bell as informational, and navigate to a Connections page for actions.

### Q3.2: What notification types does DiviDen push to connected instances?

DiviDen pushes notifications via `pushNotificationToFederatedInstance()` in `federation-push.ts`. Currently pushed types:

| Type | When | Source |
|---|---|---|
| `project_invite` | User invites a federated connection to a project | action-tags.ts → `invite_to_project` |
| `relay_state_changed` | Relay status changes | webhook-push.ts (local webhooks, not federation push) |

**Your list is mostly correct but some types are local-only.** DiviDen currently only actively pushes `project_invite` notifications cross-instance. The `relay_state_changed` events go to local webhook subscribers, not federation endpoints.

**Types you listed that DiviDen does NOT push cross-instance (yet)**:
- `connection_accepted` — sent via `/api/federation/connect/accept`, not via `/api/federation/notifications`
- `task_completed`, `task_update` — local only
- `mention` — local only
- `card_linked`, `briefing_ready` — local only

**Recommendation**: If you want these events, register a webhook via the DiviDen webhook system. We'll expand cross-instance notification types in future builds.

---

## 4. Ambient Relays

### Q4.1: What is the exact payload shape of an ambient relay?

Ambient relays use the **standard** `POST /api/federation/relay` endpoint. They are distinguished by their payload content, not a separate endpoint.

```json
{
  "connectionId": "<connection-id>",
  "fromUserEmail": "jon@colab.la",
  "fromUserName": "Jon Bradford (DiviDen)",
  "toUserEmail": "jon@fractionalventure.partners",
  "type": "request",
  "intent": "ask",
  "subject": "Do you know any IP lawyers in Austin?",
  "payload": {
    "_ambient": true,
    "_context": "Jon is setting up IP protection for a new portfolio company",
    "_topic": "legal_referral",
    "_instruction": "This is an ambient relay. Do NOT interrupt the user. Instead, naturally weave this question into your next conversation when contextually relevant."
  },
  "priority": "low"
}
```

**Key markers**:
- `payload._ambient: true` — this is the ambient flag
- `payload._instruction` — tells the receiving agent how to handle it
- `priority: "low"` — always low priority
- `intent: "ask"` — ambient relays use the `ask` intent

### Q4.2: How should FVP indicate it supports ambient relays in the agent card?

Ambient relay support is configured **per-user** via the `UserProfile` model, not in the agent card. DiviDen checks these fields on the **recipient** before sending:

- `UserProfile.relayMode` — `"off"` or `"minimal"` blocks ambient relays
- `UserProfile.allowAmbientInbound` — explicit opt-in/out for ambient
- `UserProfile.relayTopicFilters` — JSON array of accepted topics

For the agent card, DiviDen currently reads `dividen.federation.allowInbound` (general federation flag). There is **no** separate ambient flag in the agent card.

**Per-connection ambient control**: DiviDen doesn't check the agent card for ambient support. It checks local user profile settings. If FVP wants to block ambient relays, the receiving user's profile should have `allowAmbientInbound: false`.

### Q4.3: What's the expected UX when receiving an ambient relay?

On DiviDen's receiving side:
1. An `AgentRelay` record is created with `status: 'delivered'`
2. **No CommsMessage or urgent notification** — ambient relays skip the notification queue
3. Divi picks it up via the system prompt's `INCOMING RELAYS` section
4. Divi **weaves the question naturally** into conversation ("By the way, Jon from FVP was asking if you know any IP lawyers in Austin...")
5. When the user responds, Divi auto-emits `[[relay_respond:...]]`

**For FVP's mAIn**: Option B is closest — queue it as a background context item that influences future responses. The key principle is: **don't interrupt, weave.**

### Q4.4: How should FVP send outbound ambient relays?

POST to `https://dividen.ai/api/federation/relay` with:
- `payload._ambient: true`
- `payload._instruction: "This is an ambient relay..."` (optional but recommended)
- `priority: "low"`
- `intent: "ask"`
- Standard `X-Federation-Token` auth

No separate endpoint. The `_ambient: true` flag in the payload is what distinguishes it.

### Q4.5: Are ambient relays acknowledged?

**Yes**, they follow the same lifecycle as direct relays:
- `pending` → `delivered` → `completed` or `declined`
- When Divi responds, it emits `[[relay_respond:...]]` which calls `pushRelayAckToFederatedInstance()` if it's federated
- DiviDen also captures **ambient learning signals** (AmbientRelaySignal model): outcome, response quality, disruption level, topic relevance
- They are **not** fire-and-forget

---

## 5. Relay Lifecycle & Status Sync

### Q5.1: When a relay's status changes on DiviDen's side, how does FVP get notified?

DiviDen pushes completion/decline via `POST /api/federation/relay-ack` on the originating instance.

The flow:
1. Receiving Divi completes the relay → `relay_respond` action tag fires
2. `action-tags.ts` updates the local relay status
3. If `relay.peerRelayId` and `relay.peerInstanceUrl` exist, calls `pushRelayAckToFederatedInstance()`
4. This POSTs to `{peerInstanceUrl}/api/federation/relay-ack`

**Payload sent to FVP's relay-ack endpoint**:
```json
{
  "relayId": "<fvp-side-relay-id>",
  "localRelayId": "<dividen-side-relay-id>",
  "status": "completed",
  "responsePayload": "Here's the answer...",
  "subject": "Original relay subject",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

**Headers**: `X-Federation-Token: <shared-token>`

Note: `relayId` in this payload refers to **your** relay ID (the one on FVP's side), so you can look it up directly.

### Q5.2: Full relay status enum

DiviDen uses these statuses (from the `AgentRelay` model):

| Status | Description |
|---|---|
| `pending` | Created, not yet delivered |
| `delivered` | Received by target agent |
| `agent_handling` | Agent is processing |
| `user_review` | Queued for human review |
| `completed` | Successfully resolved |
| `declined` | Rejected by receiver |
| `expired` | Timed out (schema allows, not yet auto-enforced) |

Your tracking matches. `error` is not in our schema but could be added.

### Q5.3: When FVP completes/declines a relay, should you push a status update back?

**Yes.** POST to `https://dividen.ai/api/federation/relay-ack` with the same payload shape shown in Q5.1. DiviDen's relay-ack handler will:
1. Update the local relay status
2. Log activity
3. Create a CommsMessage for the sender ("✅ Jon (FVP) completed the task: ...")
4. Advance linked queue items to `done_today`
5. Update linked checklist items' delegation status
6. Fire local webhook (`relay_state_changed`)

### Q5.4: Does DiviDen support relay threading?

**Yes.** The `AgentRelay` model has:
- `threadId` — groups all relays in a multi-turn thread
- `parentRelayId` — FK to the parent relay (self-referential)
- `childRelays` — inverse relation

When sending a threaded relay, include `parentRelayId` and `threadId` in the relay payload. DiviDen's relay creation logic generates a `threadId` (CUID) if one isn't provided with the first relay, and all subsequent relays in the thread share it.

**Cross-instance threading**: Include `threadId` in the relay push to FVP. FVP should store it and include it in follow-ups. The thread ID is opaque — just a string both sides reference.

---

## 6. Relay Preferences & Trust Enforcement

### Q6.1: Does DiviDen expose relay preferences per-connection?

Relay preferences are **per-user**, not per-connection, and are **not** exposed in the agent card or via API.

DiviDen checks these `UserProfile` fields before sending:
- `relayMode`: `"off"` | `"minimal"` | `"normal"` | `"open"`
- `allowAmbientInbound`: boolean
- `allowBroadcasts`: boolean
- `relayTopicFilters`: JSON array of accepted topics

These are **checked on the sending side** before creating the relay. If the local recipient opts out, the relay is never created. For federated relays, DiviDen sends without checking the remote's preferences — **the receiver's instance is responsible for enforcing its own user's preferences.**

**Answer to "send and get a rejection?"**: DiviDen will accept the relay at the API level (200 response) and create the AgentRelay record. Whether the receiving agent surfaces it to the user depends on that instance's internal preference logic.

### Q6.2: How are trust levels enforced cross-instance?

**The receiver is the source of truth for trust level.** Each side stores its own `permissions.trustLevel` on the Connection record.

- DiviDen does **not** check the remote's trust level before sending
- FVP's relay endpoint should check its local connection's trust level and queue for review if `supervised`
- `full_auto` = relay processed automatically
- `supervised` = queued for user review
- `restricted` = limited to read-only MCP tools

---

## 7. Broadcast & Network-Wide Relays

### Q7.1: How do broadcast relays work technically?

DiviDen's `relay_broadcast` action tag (action-tags.ts) iterates over **all active connections** (optionally scoped to team/project members) and creates an individual `AgentRelay` for each.

**For federated connections**: Each relay is pushed individually to the remote's `/api/federation/relay`. There is no batch endpoint.

**Distinguishing broadcast from direct**: The relay payload includes `_broadcast: true`:
```json
{
  "payload": {
    "_broadcast": true,
    "_context": "Looking for recommendations",
    "data": "Does anyone know a good IP lawyer?"
  }
}
```

The `intent` is typically `"ask"`. There is no separate `type: "broadcast"` — it's a standard relay with the `_broadcast` payload flag.

**UPDATE (this build)**: We've added federation push for broadcast relays to federated connections. Previously, broadcasts only delivered to local users.

### Q7.2: Can FVP send broadcasts?

Yes. FVP would POST individual relays to each connected instance's `/api/federation/relay` with `_broadcast: true` in the payload. DiviDen treats them like any other inbound relay — the `_broadcast` flag is informational for the receiving agent's context.

---

## 8. Agent Card — What DiviDen Actually Reads

### Q8.1: Which fields does DiviDen actively consume?

| Field | Used? | How |
|---|---|---|
| `skills` | ❌ Not yet | Planned for routing, not currently consumed |
| `capabilities` | ❌ Not yet | Planned for capability negotiation |
| `dividen.marketplace.agents` | ❌ Not yet | Not consumed; marketplace sync uses `/api/marketplace/dividen-submit` |
| `reputation` | ❌ Not yet | DiviDen reads reputation via `GET /api/federation/reputation` endpoint, not agent card |
| `operator` | ❌ Not yet | Not consumed |
| `network_opportunity` | ❌ Not yet | Not consumed |
| `endpoints.federation.connect` | ✅ Yes | Read during outbound connection push (FVP Build 468 fixed this) |
| `endpoints.federation.relay` | ❌ No | DiviDen hardcodes `{peerInstanceUrl}/api/federation/relay` |
| `endpoints.v2Connections` | ❌ No | DiviDen hardcodes `/api/federation/connect` |

**Honest answer**: DiviDen currently hardcodes most federation paths based on `peerInstanceUrl`. The agent card is primarily used for **discovery** (instance name, version, description, capabilities list) rather than **endpoint resolution**.

**Recommendation**: As long as FVP's federation endpoints are at the standard paths (`/api/federation/connect`, `/api/federation/relay`, `/api/federation/relay-ack`, etc.), everything works. We'll move to agent-card-driven endpoint resolution in a future version.

### Q8.2: Does DiviDen cache the agent card?

DiviDen does **not** cache remote agent cards. It reads them on-demand (e.g., during connection creation). Your `Cache-Control: public, max-age=300` is fine — CDN and browser caching will handle intermediate hops.

### Q8.3: Minimum agent card fields for federation compatibility

**Federation Readiness Checklist**:

```
✅ Required:
- name
- url (base URL)
- version
- endpoints.federation.connect → /api/federation/connect
- dividen.federation.mode → "open" or "allowlist"
- dividen.federation.allowInbound → true

✅ Required for relays:
- POST /api/federation/relay (endpoint must exist)
- POST /api/federation/relay-ack (endpoint must exist)
- POST /api/federation/connect/accept (endpoint must exist)

⭐ Recommended:
- endpoints.federation.connectAccept → /api/federation/connect/accept
- endpoints.federation.relay → /api/federation/relay
- endpoints.federation.jobs → /api/federation/jobs
- endpoints.federation.notifications → /api/federation/notifications
- dividen.relayIntents → [...supported intents]
- dividen.trustLevels → [...supported trust levels]
- capabilities.threading → true/false
- capabilities.pushNotifications → true/false

🔮 Future (not required yet):
- skills (for routing)
- mcpTools (for cross-instance tool invocation)
- dividen.marketplace.agents
```

---

## 9. Discovery & Profile

### Q9.1: What parameters does `/api/v2/network/discover` accept?

DiviDen does not currently have a `/api/v2/network/discover` endpoint. Discovery is handled through:
1. `InstanceRegistry` — registered instances are discoverable
2. Agent card fetch — `GET /.well-known/agent-card.json`
3. Entity resolution — `POST /api/federation/entity-search`

If you're getting empty results, it may be because the InstanceRegistry entry for your instance isn't flagged with `discoveryEnabled: true`. The FVP entry in DiviDen's InstanceRegistry has `discoveryEnabled: true`, so you should be discoverable from our side.

### Q9.2: Does DiviDen have a profile page for external instances?

Not currently. Federated connections show the peer's name, email, and instance URL in the ConnectionsView. There is no dedicated profile page pulling from the agent card's `operator` field.

### Q9.3: Can DiviDen users see FVP's marketplace agents?

DiviDen's marketplace (`MarketplaceAgent` model) can include agents from any source. The `/api/marketplace/dividen-submit` endpoint can register agents. If FVP has synced capabilities, they should appear in the Bubble Store tab. The FVP InstanceRegistry entry has `marketplaceEnabled: true`.

---

## 10. Jobs & Reputation

### Q10.1: Is federated job gossip live?

**Yes.** DiviDen's `GET/POST /api/federation/jobs` is fully implemented:
- `GET` returns open jobs with `visibility: 'network'` from this instance
- `POST` ingests jobs from remote instances and stores them locally with federation tags

DiviDen does **not** actively push/pull on a schedule. It's pull-on-demand: if FVP calls `GET /api/federation/jobs` with a valid federation token, it gets DiviDen's open network jobs.

**To make gossip active**: Either side can set up a periodic job sync (e.g., every 6 hours, call the peer's GET endpoint and POST the results to your own instance).

### Q10.2: How does cross-instance reputation work?

DiviDen uses signed HMAC-SHA256 attestations:

- `GET /api/federation/reputation?userId=xxx` — returns a signed attestation of the user's reputation
- `POST /api/federation/reputation` — receives and stores an attestation from a remote instance

Auth: `X-Federation-Token` header.

DiviDen does **not** currently read the `reputation` field from the agent card. Reputation exchange is endpoint-based.

Federated score formula: `localScore * 0.7 + avgEndorsedScores * 0.3`

---

## 11. Pattern Sharing & Ambient Intelligence

### Q11.1: Does DiviDen actively exchange patterns?

**Yes, but passively.** `GET/POST /api/federation/patterns` is live:
- `GET` exports shareable `AmbientPattern` records above a confidence threshold
- `POST` receives patterns and reciprocates with ours

Auth: `Authorization: Bearer <api-key>` (not federation token — uses AgentApiKey).

This is not on a schedule — either side calls it when they want to exchange.

### Q11.2: Payload shape for shared patterns?

```json
{
  "patterns": [
    {
      "trigger": "user mentions needing legal help",
      "response": "suggest IP lawyer contacts",
      "confidence": 0.85,
      "category": "referral",
      "tags": ["legal", "referral"],
      "anonymized": true
    }
  ],
  "instanceId": "https://dividen.ai"
}
```

The exact shape depends on `exportShareablePatterns()` output — it anonymizes and exports `AmbientPattern` records as JSON objects.

---

## 12. Linked Kards (Cross-Instance Card Linking)

### Q12.1: Is cross-instance card linking live?

**Not yet for cross-instance.** DiviDen has `link_cards` action tag and `linkCards()` function in action-tags.ts, but this is **local-only** (links two cards within the same instance).

Cross-instance card linking would require:
1. A federation endpoint to propose a link
2. Both sides storing the remote card reference
3. Status change propagation via relay or notification

This is on the roadmap but not implemented.

---

## 13. Behavior Signals (Cross-Instance Telemetry)

### Q13.1: Does DiviDen send or receive behavior signals cross-instance?

**No.** DiviDen captures behavior signals locally (`TelemetryEvent`, `AmbientRelaySignal` models) but does not send or consume them cross-instance. The `behaviorSignals: true` advertisement in your agent card is noted but not consumed.

---

## 14. Teams & Projects — Federated Membership

### Q14.1: When a DiviDen user is added to an FVP project as a federated contributor, does DiviDen notify them?

**Yes, via `pushNotificationToFederatedInstance()`.** The `invite_to_project` action tag pushes a notification to the federated instance:

```typescript
pushNotificationToFederatedInstance(connectionId, {
  type: 'project_invite',
  fromUserName: inviter.name,
  fromUserEmail: inviter.email,
  title: 'Project Invitation',
  body: `You've been invited to join project "${projectName}"`,
  metadata: { projectId, inviteId, role },
});
```

This POSTs to `{peerInstanceUrl}/api/federation/notifications`.

### Q14.2: Can DiviDen users accept/decline project invites from within DiviDen's UI?

DiviDen has project invite acceptance via deep links (`/setup?invite=<token>` and `/api/invites/[token]/accept`). The notification in the queue panel can link to the acceptance flow. For federated invites, the invite link would point back to the originating instance.

### Q14.3: When a federated project member completes a task, how does the update propagate?

Via **relay**. Task updates on federated project members propagate as relay responses (`relay_respond`) or via the notification system. There is no direct API call for task completion across instances.

---

## 15. Webhook Events

### Q15.1: Does DiviDen register webhooks with connected instances?

**No.** DiviDen's webhook system is for **local** subscribers (external services that register to receive events from this instance). DiviDen does not register itself as a webhook subscriber on remote instances.

### Q15.2: What events should FVP push as webhooks vs. relays vs. notifications?

| Event | Channel | Why |
|---|---|---|
| Connection request/accept/block | `/api/federation/connect` + `/connect/accept` | Dedicated endpoints |
| Relay delivery | `/api/federation/relay` | Core relay protocol |
| Relay completion/decline | `/api/federation/relay-ack` | Ack protocol |
| Project invites | `/api/federation/notifications` | Notification channel |
| card.moved, queue.completed | Neither (local only) | Not relevant cross-instance unless project-scoped |
| job.posted | `/api/federation/jobs` (POST) | Job gossip protocol |
| Reputation endorsement | `/api/federation/reputation` (POST) | Reputation protocol |

---

## 16. MCP (Cross-Instance Tool Invocation)

### Q16.1: Does DiviDen support cross-instance MCP tool invocation?

**Yes.** `POST /api/federation/mcp` is live. It:
1. Validates the federation token
2. Checks the trust level
3. Proxies the tool call to the local MCP endpoint
4. Returns the result

### Q16.2: What auth does DiviDen use for MCP calls?

`X-Federation-Token` header — same as relays.

Available tools depend on trust level:
- **All connections**: `queue_list`, `contacts_search`, `cards_list`, `mode_get`, `briefing_get`, `activity_recent`, `job_browse`, `job_match`, `reputation_get`, `relay_threads`, `entity_resolve`
- **`full_auto` or `supervised` trust**: Additionally `queue_add`, `queue_update`, `job_post`, `relay_send`, `relay_thread_list`

---

## 17. Error Handling & Health

### Q17.1: Does DiviDen have a retry mechanism for outbound pushes?

**No.** `federation-push.ts` uses fire-and-forget `fetch()` with a 10-second `AbortSignal.timeout`. If the push fails, it logs a warning but does **not** retry.

**Recommendation**: FVP should implement retry logic on your side for critical operations. DiviDen will add retry with exponential backoff in a future build.

### Q17.2: Is there a federation health check endpoint?

**Not a dedicated one.** The admin panel's "Federation Health Checker" calls the remote's agent card endpoint (`GET /.well-known/agent-card.json`) to verify the instance is reachable.

You can use the agent card endpoint as a health check — if it returns 200, the instance is alive.

### Q17.3: How should FVP handle a DiviDen instance going offline?

**Recommended approach**:
1. Retry with exponential backoff (3 attempts: 1s, 5s, 30s)
2. If all retries fail, mark the relay as `error` locally
3. Do NOT mark the connection as `stale` — the connection persists
4. Queue failed relays for retry on next successful health check
5. Health check: periodically `GET /.well-known/agent-card.json` — if it returns 200, flush queued relays

---

## 18. Connection Lifecycle Sequence Diagram

```
┌──────────┐                                    ┌──────────┐
│   FVP    │                                    │ DiviDen  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  1. POST /api/federation/connect              │
     │  Body: {fromInstanceUrl, fromUserEmail,       │
     │         toUserEmail, federationToken}          │
     │──────────────────────────────────────────────►│
     │                                               │
     │  200 {connectionId, status: "pending"}        │
     │◄──────────────────────────────────────────────│
     │                                               │
     │              ... User sees notification ...    │
     │              ... User clicks Accept ...        │
     │                                               │
     │  2. POST /api/federation/connect/accept        │
     │  Header: X-Federation-Token: <token>           │
     │  Body: {connectionId, acceptedByEmail,         │
     │         acceptedByName, instanceUrl}            │
     │◄──────────────────────────────────────────────│
     │                                               │
     │  200 {success: true, connectionId}             │
     │──────────────────────────────────────────────►│
     │                                               │
     │  ═══ CONNECTION ACTIVE ON BOTH SIDES ═══      │
     │                                               │
     │  3. POST /api/federation/relay                 │
     │  Header: X-Federation-Token: <token>           │
     │  Body: {relayId, fromUserEmail, toUserEmail,   │
     │         type, intent, subject, payload}         │
     │──────────────────────────────────────────────►│
     │                                               │
     │  200 {success: true, relayId: "<local-id>"}   │
     │◄──────────────────────────────────────────────│
     │                                               │
     │          ... Agent processes relay ...          │
     │          ... User responds ...                  │
     │                                               │
     │  4. POST /api/federation/relay-ack              │
     │  Header: X-Federation-Token: <token>           │
     │  Body: {relayId: "<fvp-relay-id>",             │
     │         localRelayId, status: "completed",      │
     │         responsePayload, subject}               │
     │◄──────────────────────────────────────────────│
     │                                               │
     │  200 {success: true, relayId, status}          │
     │──────────────────────────────────────────────►│
     │                                               │
```

---

## 19. Sample Payloads

### Connection Acceptance Callback
```json
// POST /api/federation/connect/accept
// Header: X-Federation-Token: test-token-456
{
  "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
  "acceptedByEmail": "jon@colab.la",
  "acceptedByName": "Jon Bradford",
  "instanceUrl": "https://dividen.ai"
}
```

### Ambient Relay
```json
// POST /api/federation/relay
// Header: X-Federation-Token: test-token-456
{
  "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
  "relayId": "abc123",
  "fromUserEmail": "jon@colab.la",
  "fromUserName": "Jon Bradford (DiviDen)",
  "toUserEmail": "jon@fractionalventure.partners",
  "type": "request",
  "intent": "ask",
  "subject": "Know any IP lawyers in Austin?",
  "payload": {
    "_ambient": true,
    "_context": "Setting up IP protection for new portfolio co",
    "_topic": "legal_referral",
    "_instruction": "This is an ambient relay. Do NOT interrupt the user. Weave naturally into conversation."
  },
  "priority": "low"
}
```

### Broadcast Relay
```json
// POST /api/federation/relay
// Header: X-Federation-Token: test-token-456
{
  "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
  "relayId": "def456",
  "fromUserEmail": "jon@colab.la",
  "fromUserName": "Jon Bradford (DiviDen)",
  "toUserEmail": "jon@fractionalventure.partners",
  "type": "request",
  "intent": "ask",
  "subject": "Does anyone know a good IP lawyer?",
  "payload": {
    "_broadcast": true,
    "_context": "Company-wide ask",
    "data": "Looking for IP lawyer recommendations in Austin, TX"
  },
  "priority": "normal"
}
```

### Relay Status Update (Ack)
```json
// POST /api/federation/relay-ack
// Header: X-Federation-Token: test-token-456
{
  "relayId": "<originating-instance-relay-id>",
  "localRelayId": "<completing-instance-relay-id>",
  "status": "completed",
  "responsePayload": "Yes, I know Sarah Chen at Baker McKenzie. She specializes in software IP. Want an introduction?",
  "subject": "Know any IP lawyers in Austin?",
  "timestamp": "2026-04-16T15:30:00.000Z"
}
```

---

*Generated from DiviDen Command Center v2.1.1. Instance: dividen.ai.*
