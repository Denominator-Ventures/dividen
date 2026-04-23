# DiviDen ↔ FVP Federation Handoff

> **Purpose**: Everything the next agent conversation needs to get DiviDen (`dividen.ai`) and FVP Command Center (`cc.fractionalventure.partners`) fully connected and working bidirectionally.
>
> **Date**: April 16, 2026
> **Author**: Jon Bradford (founder), via Abacus AI Agent
> **Project path**: `/home/ubuntu/dividen_command_center`
> **Git remote**: `github.com/Denominator-Ventures/dividen.git` (PAT auth configured)
> **Both domains untagged**: One `deploy_nextjs_project` call deploys to both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`

---

## 1. Instance Overview

| Property | DiviDen (this instance) | FVP Command Center |
|---|---|---|
| **URL** | `https://dividen.ai` | `https://cc.fractionalventure.partners` |
| **Version** | 0.4.0 (agent card) | 2.7.0 (agent card) |
| **Protocol** | DAWP/0.1 | DAWP/0.1 |
| **Agent Card** | `/.well-known/agent-card.json` | `/.well-known/agent-card.json` |
| **Federation Mode** | `open` (allowInbound: true) | `open` (allowInbound: true) |
| **Operator** | Jon Bradford (`jon@colab.la`) | Jon Bradford (`jon@fractionalventure.partners`) |
| **DB** | Shared dev/prod Postgres | Separate Abacus-hosted Postgres |
| **Hosting** | Abacus AI Agent | Abacus AI Agent (separate conversation) |

---

## 2. Current Connection State

### DiviDen Side
- **Connection ID**: `cmo2bx2nb0001t2bbs8j75id8`
- **Status**: `active`
- **Peer**: `jon@fractionalventure.partners` at `https://cc.fractionalventure.partners`
- **Federation Token**: `test-token-456`
- **Trust Level**: `full_auto`
- **Scopes**: `relay, task, ambient, marketplace, profile`

### FVP Side
- **Connection ID**: `cmo2bu3oq0002rx08c9pbqere`
- **Status**: `pending` ← **NEEDS ACCEPTANCE**
- **Peer**: `jon@colab.la` at `https://dividen.ai`
- **Federation Token**: `test-token-456`

### ⚠️ CRITICAL FIRST STEP
Jon must accept the pending connection on FVP's side. Until that happens, FVP will reject incoming relays from DiviDen (its relay endpoint checks for `status: 'active'`).

The FVP connection was created via:
```bash
curl -X POST https://cc.fractionalventure.partners/api/federation/connect \
  -H 'Content-Type: application/json' \
  -d '{
    "fromInstanceUrl": "https://dividen.ai",
    "fromInstanceName": "DiviDen",
    "fromUserEmail": "jon@colab.la",
    "fromUserName": "Jon Bradford (DiviDen)",
    "toUserEmail": "jon@fractionalventure.partners",
    "federationToken": "test-token-456"
  }'
```

The FVP instance responded: `{"success":true,"connectionId":"cmo2bu3oq0002rx08c9pbqere","status":"pending"}`

---

## 3. Federation Endpoint Matrix

Both instances should support all of these. DiviDen now supports both v1 and v2 paths.

| Endpoint | DiviDen | FVP | Auth | Purpose |
|---|---|---|---|---|
| `POST /api/federation/connect` | ✅ | ✅ | None (token in body) | Create connection request |
| `POST /api/v2/connections` | ✅ (new) | ✅ | None (token in body) | v2 connection request (alias) |
| `GET /api/v2/connections` | ✅ (new) | ✅ | Bearer | List federated connections |
| `POST /api/federation/relay` | ✅ | ✅ | `X-Federation-Token` | Send relay |
| `POST /api/v2/relay` | ✅ (new) | ✅ | `X-Federation-Token` | v2 relay (proxy on DiviDen) |
| `POST /api/federation/relay-ack` | ✅ | ✅ | `X-Federation-Token` | Relay completion callback |
| `POST /api/a2a` | ✅ | ✅ | Bearer | A2A task protocol |
| `POST /api/federation/jobs` | ✅ | ✅ | `X-Federation-Token` | Job gossip |
| `GET /api/federation/jobs` | ✅ | ✅ | `X-Federation-Token` | Fetch peer jobs |
| `POST /api/federation/notifications` | ✅ | ✅ | `X-Federation-Token` | Push notifications |
| `POST /api/federation/platform` | ✅ | ✅ | Platform token | Platform registration |

---

## 4. How Relays Flow

### Outbound (DiviDen → FVP)
1. Divi emits `[[relay_request:...]]` with `connectionNickname: "Jon Bradford (FVP)"`
2. `action-tags.ts` → `relay_request` handler creates `AgentRelay` record
3. For federated connections, calls `pushRelayToFederatedInstance()` in `federation-push.ts`
4. Pushes to `https://cc.fractionalventure.partners/api/federation/relay` with `X-Federation-Token: test-token-456`
5. FVP creates local relay, delivers to FVP user's Divi, sends ack back
6. DiviDen stores `peerRelayId` and `peerInstanceUrl` on the relay

### Inbound (FVP → DiviDen)
1. FVP pushes to `https://dividen.ai/api/federation/relay` (or `/api/v2/relay`)
2. DiviDen looks up connection by `federationToken` in header
3. Creates local `AgentRelay` record linked to the connection
4. Creates `CommsMessage` for the target user
5. Relay appears in Divi's system prompt (`INCOMING RELAYS — WEAVE INTO CONVERSATION`)
6. Divi weaves relay content naturally into conversation
7. When user responds, Divi auto-emits `[[relay_respond:...]]`
8. If relay has `peerRelayId`, pushes ack back via `pushRelayAckToFederatedInstance()`

### Relay Response Flow
- Relay responses **skip the queue** — go comms-to-comms only
- CommsMessage created for sender with relay response content
- System prompt surfaces responses in "Relay Responses (last 24h)" section
- Linked queue items are synced to `done_today` (if any exist)
- Checklist delegation status updated
- Webhook fired for `relay_state_changed`

---

## 5. Key User IDs

### DiviDen Instance
| User | ID | Email |
|---|---|---|
| Jon Bradford | `cmo1kgydf00o4sz086ffjsmp1` | `jon@colab.la` |
| Jaron Hartley | `cmo1milx900g9o408deuk7h2f` | `jaron@colab.la` |
| Alvaro González | `cmo1n6psb023co408ikcsw7xb` | `alvaro@colab.la` |

### Connection IDs (DiviDen local)
| Connection | ID | Type |
|---|---|---|
| Jon ↔ Jaron | `cmo1mo95m00zqo4081ly7i7dr` | Local |
| Alvaro ↔ Jon | `cmo1o4aiz0002o9082jainegr` | Local |
| Jon ↔ Jon (FVP) | `cmo2bx2nb0001t2bbs8j75id8` | Federated |

### FVP Instance Registry (on DiviDen)
| Field | Value |
|---|---|
| Name | FVP Command Center |
| Base URL | `https://cc.fractionalventure.partners` |
| Platform Token | `dvd_fed_bd66e5487b5ea2697206b38aaaf25c3d77310f0ce06a9dadb1503c19fccc2e87` |
| Active | true |
| Marketplace | enabled |
| Discovery | enabled |

---

## 6. What Needs to Happen

### Phase 1: Get Connected (Priority)
- [ ] **Accept FVP connection**: Jon accepts `cmo2bu3oq0002rx08c9pbqere` on FVP's Connections UI
- [ ] **Verify bidirectional relay**: Send a test relay from DiviDen → FVP and confirm it arrives
- [ ] **Verify reverse**: Send a test relay from FVP → DiviDen and confirm it arrives
- [ ] **Verify relay-ack**: Complete a relay on the receiving side and confirm the ack reaches the sender

### Phase 2: Fix FVP Outbound Connection Push
The FVP instance creates local connection records but doesn't push to the remote. The FVP dev team needs to:
- [ ] When a user creates a federated connection from FVP's UI, the code should:
  1. Read the remote agent card (`GET /.well-known/agent-card.json`)
  2. Find the `federation.connect` or `endpoints.v2Connections` URL
  3. POST the connection request there with the federation token
  4. On success, update the local connection status
- [ ] Both `federation.connect` and `v2Connections` should be tried (fallback)

### Phase 3: Full Integration Testing
- [ ] **Ambient relays**: Test ambient relay from DiviDen → FVP (intent: ambient, payload includes `_ambient: true`)
- [ ] **Task assignment**: Test `intent: assign_task` relay — should create a card on the receiver's board
- [ ] **Relay broadcast**: Test `relay_broadcast` scoped to a team/project
- [ ] **Marketplace**: Test marketplace agent execution cross-instance (mAInClaw)
- [ ] **Job gossip**: Test federated job listings visibility
- [ ] **Notifications**: Test `POST /api/federation/notifications` cross-instance
- [ ] **Activity feed**: Verify federation events appear in both instances' activity feeds

### Phase 4: Multi-User Federation
- [ ] Test connections between different users on each instance (not just Jon ↔ Jon)
- [ ] Test team-scoped relays with mixed local + federated members
- [ ] Test project invites cross-instance

---

## 7. Key Files Reference

### Federation Core
| File | Purpose |
|---|---|
| `src/app/api/federation/connect/route.ts` | Inbound connection requests (v1) |
| `src/app/api/v2/connections/route.ts` | Inbound connection requests (v2) |
| `src/app/api/federation/relay/route.ts` | Inbound relay delivery |
| `src/app/api/v2/relay/route.ts` | Inbound relay delivery (v2 proxy) |
| `src/app/api/federation/relay-ack/route.ts` | Relay completion callback |
| `src/lib/federation-push.ts` | Outbound relay push + ack push |
| `src/lib/relay-queue-bridge.ts` | Bidirectional relay ↔ queue sync |
| `src/app/api/a2a/route.ts` | A2A task protocol endpoint |
| `src/app/api/federation/notifications/route.ts` | Cross-instance notifications |
| `src/app/api/federation/jobs/route.ts` | Federated job gossip |

### Agent & System Prompt
| File | Purpose |
|---|---|
| `src/lib/system-prompt.ts` | Divi's system prompt (relay weaving instructions) |
| `src/lib/action-tags.ts` | Action tag handlers (relay_request, relay_respond, etc.) |
| `src/lib/llm.ts` | LLM API integration (Abacus AI / Claude preferred) |

### UI Components
| File | Purpose |
|---|---|
| `src/components/dashboard/ChatView.tsx` | Chat with relay badges (📡) |
| `src/components/dashboard/QueuePanel.tsx` | Queue panel + CommsTab |
| `src/components/dashboard/CommsTab.tsx` | Comms messages (grouped by connection) |
| `src/app/docs/federation/page.tsx` | Federation documentation page |
| `src/app/.well-known/agent-card.json/route.ts` | Agent card (discovery) |

### Database Schema
| Model | Key Fields |
|---|---|
| `Connection` | `id, requesterId, accepterId, status, isFederated, peerInstanceUrl, peerUserEmail, federationToken, permissions` |
| `AgentRelay` | `id, connectionId, fromUserId, toUserId, direction, type, intent, subject, payload, status, peerRelayId, peerInstanceUrl, queueItemId` |
| `CommsMessage` | `id, sender, content, state, priority, userId, metadata` |
| `FederationConfig` | `id, instanceName, instanceUrl, federationMode, allowInbound, allowOutbound, instanceApiKey` |
| `InstanceRegistry` | `id, name, baseUrl, apiKey, isActive, platformToken, marketplaceEnabled, discoveryEnabled` |

---

## 8. Technical Notes

### Token Flow
The federation token is symmetric — both sides store the same token from the connection handshake. It's used as `X-Federation-Token` header for relay delivery and relay-ack.

### Relay Response Behavior
Relay responses skip the queue entirely:
- `relay_respond` action → updates AgentRelay status → creates CommsMessage → fires webhook
- For federated relays with `peerRelayId`, also calls `pushRelayAckToFederatedInstance()`
- The sender's Divi sees the response via system prompt "Relay Responses (last 24h)" section

### System Prompt Relay Instructions
Divi is instructed to **weave relay content naturally** into conversation (not announce as a notification). When the user's response clearly addresses a relay, Divi auto-emits `[[relay_respond:...]]` without asking for confirmation.

### Unicode Characters
`ChatView.tsx` and `CommsTab.tsx` contain emoji/unicode. Use `batch_file_write` or `file_edit_lines` when editing, NOT `file_str_replace` (encoding issues).

### TSC OOM
TypeScript compiler runs out of memory. Skip `test_nextjs_project` and go straight to `build_and_save_nextjs_project_checkpoint`.

### DB Connection Pool
Singleton Prisma client with `connection_limit=5`. The DB has max 25 concurrent connections with short idle timeouts.

### Jon's Preferences
- Direct/technical communication
- Dark-only theme
- Always deploy + git push after changes
- Skip tsc tests (OOM)

---

## 9. Testing Commands

### Test relay from DiviDen → FVP
```bash
curl -X POST https://cc.fractionalventure.partners/api/federation/relay \
  -H 'Content-Type: application/json' \
  -H 'X-Federation-Token: test-token-456' \
  -d '{
    "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
    "fromUserEmail": "jon@colab.la",
    "fromUserName": "Jon Bradford (DiviDen)",
    "toUserEmail": "jon@fractionalventure.partners",
    "type": "request",
    "intent": "get_info",
    "subject": "Federation test relay",
    "payload": "Testing bidirectional federation between DiviDen and FVP",
    "priority": "normal"
  }'
```

### Test relay from FVP → DiviDen
```bash
curl -X POST https://dividen.ai/api/federation/relay \
  -H 'Content-Type: application/json' \
  -H 'X-Federation-Token: test-token-456' \
  -d '{
    "connectionId": "cmo2bu3oq0002rx08c9pbqere",
    "fromUserEmail": "jon@fractionalventure.partners",
    "fromUserName": "Jon Bradford (FVP)",
    "toUserEmail": "jon@colab.la",
    "type": "request",
    "intent": "get_info",
    "subject": "Reverse federation test",
    "payload": "Testing FVP to DiviDen relay delivery",
    "priority": "normal"
  }'
```

### Verify connection state
```bash
# DiviDen
curl -s https://dividen.ai/api/v2/connections \
  -H 'Authorization: Bearer <api-key>' | python3 -m json.tool

# FVP
curl -s https://cc.fractionalventure.partners/api/v2/connections \
  -H 'Authorization: Bearer dvd_fed_bd66e5487b5ea2697206b38aaaf25c3d77310f0ce06a9dadb1503c19fccc2e87' | python3 -m json.tool
```

---

## 10. Known Issues

1. **FVP outbound connection push is broken**: When you create a connection from FVP's UI, it creates a local record but never calls the remote's federation/connect endpoint. This needs fixing on the FVP side.

2. **Token mismatch risk**: If either side regenerates tokens without updating the other, relays will 401. The current token `test-token-456` is a test value — consider generating a proper one once both sides are connected.

3. **Version gap**: DiviDen is 0.4.0, FVP is 2.7.0. Some FVP features (v2 endpoints) weren't available on DiviDen until now. The v2/connections and v2/relay endpoints were added to bridge this gap.

4. **`CommsMessage` model has NO `connectionId` field**: Don't try to query comms by connectionId. Use the metadata JSON field for relay-related lookups.

5. **`AgentRelay` model has NO `summary` field**: Use `subject` instead.
