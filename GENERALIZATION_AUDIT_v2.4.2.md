# Multi-Instance Generalization Audit — v2.4.2

**Date:** April 20, 2026  
**Auditor:** Divi AI  
**Scope:** All federation runtime code, system prompt, docs references, UI components  
**Question:** Can a second (non-FVP) instance self-service connect and operate correctly today?

---

## Executive Summary

**Verdict: YES — the runtime code is already instance-agnostic.** Zero hardcoded connection IDs, zero FVP-specific conditional branches, zero single-connection assumptions in the hot path. The only FVP-specific content lives in:

1. **Comments / attribution** — provenance labels like `// FVP Build 522 §4` (harmless, good for archaeology)
2. **Docs / release notes** — historical references to FVP as the first federated partner (accurate, no code impact)
3. **System prompt examples** — uses "your FVP account" as illustrative text (dynamically generated from `resolveSender()`, not hardcoded to FVP)
4. **Signal pattern regex** — `FVP` appears in the federation prompt-group trigger pattern (minor; means typing "FVP" activates federation context — useful but not exclusive)

No code changes are required for multi-instance readiness.

---

## Detailed Findings

### 1. Connection Ceremony (`/api/federation/connect` + `/connect/accept`)

**Status: ✅ Fully generic**

- Accepts any `fromInstanceUrl`, `fromUserEmail`, `fromUserName`, `federationToken`
- Respects `FederationConfig.federationMode` (open / allowlist / closed)
- Allowlist mode checks `InstanceRegistry` — any instance can be added
- Duplicate guard uses `(peerInstanceUrl + peerUserEmail + requesterId)` — works for N instances
- Auto-accept path calls back to the *requesting* instance's `/api/federation/connect/accept` — URL-driven, not hardcoded
- Creates CRM contact for the remote user on accept
- Registers instance in `InstanceRegistry` via upsert

**No issues found.** A new instance (e.g., `acme.co`) can POST to `/api/federation/connect` and get a working connection without any DiviDen-side changes.

### 2. Relay Push (`federation-push.ts`)

**Status: ✅ Fully generic**

- `pushRelayToFederatedInstance(connectionId, payload)` — resolves connection by ID, reads `peerInstanceUrl` dynamically
- `pushRelayAckToFederatedInstance(relay)` — uses `relay.peerInstanceUrl`, no assumptions
- `pushNotificationToFederatedInstance(connectionId, notification)` — same pattern
- `pushCardUpdate(connectionId, payload)` — same pattern
- HMAC signing gated by `connection.hmacEnabled` — per-connection, not global
- No hardcoded URLs, no connection ID constants

### 3. Relay Inbound (`/api/federation/relay`)

**Status: ✅ Fully generic**

- Resolves connection by `federationToken` (any active federated connection matches)
- Idempotency dedup: `(peerRelayId + connectionId)` — multi-connection safe
- Ambient gating: user preferences, not instance-specific
- Thread resolution: `peerRelayId` → local lookup, instance-agnostic
- Multi-tenant scope: verifies `teamId`/`projectId` rows exist locally, drops if not
- Attachments: generic array parsing (accepts both top-level and nested)
- Sender identity: persists `_sender` from payload, not from hardcoded mapping

**Comment cleanup candidates (non-blocking):**
- Line 7: `// FVP Build 522 §5 alignment` — could say "federation spec" instead
- Line 166: `// FVP Build 522 §4` → could say "idempotency spec"
- Line 421: `fallback: !localUser, // Tell FVP we couldn't route` → "Tell peer we couldn't route"

### 4. Relay Ack Inbound (`/api/federation/relay-ack`)

**Status: ✅ Fully generic (with v2.4.2 cross-convention support)**

- Three-path relay ID resolution: `peerRelayId` → `bodyRelayId` → `metadata.inviteId`
- Status normalization: `accepted` → `completed` (handles both conventions)
- Looks up relay by direct ID, then by `peerRelayId` field — works for any peer
- Project invite response handling is type-driven (`ackType === 'project_invite_response'`), not instance-driven

**Comment cleanup candidates (non-blocking):**
- Lines 32-49: Comments say "FVP convention" / "FVP sends" — could say "peer convention"
- Line 81: "FVP may have sent" → "Peer may have sent"

### 5. Notifications Inbound (`/api/federation/notifications`)

**Status: ✅ Fully generic**

- Accepts both legacy `(action, summary)` and current `(type, title, body)` shapes
- Resolves connection by `federationToken` — any connection works
- Multi-tenant scope validation same as relay
- No instance-specific logic

### 6. HMAC (`federation-hmac.ts`)

**Status: ✅ Fully generic**

- Pure crypto functions: `signPayload(body, secret)`, `verifyHmac(body, signature, secret)`
- Per-connection feature flag via `Connection.hmacEnabled`
- New connections default to `hmacEnabled: false` — each instance can opt in independently

### 7. System Prompt (`system-prompt.ts`)

**Status: ✅ Generic — dynamic resolution, examples use FVP illustratively**

- `resolveSender()` (line 1410): Derives federation hint dynamically from `peerInstanceUrl` hostname → `shortInstance.toUpperCase()` → e.g., "your ACME account". **Not hardcoded to FVP.**
- Example text in prompt (lines 1561-1565, 1587, 1713): Uses "your FVP account" as example phrasing. This is correct — when the actual instance IS FVP, the hint WILL say "your FVP account". When it's Acme, it'll say "your ACME account". The examples teach the pattern, not the specific instance name.
- Signal pattern (line 40 in system-prompt.ts, line 122 in prompt-groups): `FVP` in the regex means typing "FVP" in chat triggers federation context. **Low-impact** — federation context also triggers on `federation`, `cross.*instance`, `entity.*resolve`, etc. If we want to be purist, we could remove `FVP` from the pattern, but it's useful since FVP is a real entity users might reference.

**Recommendation:** Leave as-is. The examples are illustrative and the `resolveSender()` logic is fully dynamic.

### 8. Mentions Route (`/api/chat/mentions`)

**Status: ✅ Fully generic**

- Queries ALL active federated connections, not a specific one
- Handle derivation: `nickname → peerUserName → peerUserEmail` — instance-agnostic
- Instance label: parsed from `peerInstanceUrl` hostname dynamically
- Comment on line 48 says "e.g. FVP" — example only, no code impact

### 9. v2 Connections Route (`/api/v2/connections`)

**Status: ✅ Fully generic**

- Comment on line 13 says "like FVP" — example only
- Queries ALL federated connections for the user, not filtered by instance

### 10. Other Federation Routes (jobs, reputation, mcp, entity-search, graph, briefing, patterns, routing)

**Status: ✅ All generic**

- All routes authenticate via `federationToken` → connection lookup
- All use the connection's `peerInstanceUrl` dynamically
- FVP references are only in header comments ("FVP Brief Proposal #N") — attribution, not logic

### 11. Seed Script (`scripts/seed.ts`)

**Status: ⚠️ Contains FVP-specific data (expected)**

- The DiviCore team seed includes Jon Bradford (FVP) as a federated member with `connectionId: 'cmo2bx2nb0001t2bbs8j75id8'`
- This is test data, not runtime logic. A new instance connecting wouldn't touch the seed script.

### 12. Documentation & Release Notes

**Status: ℹ️ Historical references — appropriate**

- `release-notes/page.tsx`: ~50 FVP references across changelog entries (builds 522-540, integration guides, etc.)
- `relay-spec/page.tsx`: Uses FVP as example instance in wire format examples
- `developers/page.tsx`: Has dedicated "FVP Integration Notes (v2.7)" section
- `federation/page.tsx`: References FVP Build 522 symmetry audit
- `project-bible.md`: FVP described as "quality bar for federation integration"

All appropriate historical context. No code impact.

---

## Connection Ceremony — Can a New Instance Self-Service Connect?

**Yes.** The flow:

1. New instance POSTs to `https://dividen.ai/api/federation/connect` with:
   ```json
   {
     "fromInstanceUrl": "https://acme.co",
     "fromInstanceName": "Acme Command Center",
     "fromUserEmail": "alice@acme.co",
     "fromUserName": "Alice",
     "toUserEmail": "jon@colab.la",
     "federationToken": "<shared-secret>"
   }
   ```
2. DiviDen checks `FederationConfig.federationMode`:
   - `open` → auto-creates connection (pending or active based on `requireApproval`)
   - `allowlist` → checks `InstanceRegistry` for `acme.co` (would need to be pre-registered)
   - `closed` → rejects
3. If `requireApproval: false` → auto-accepts and calls back to `https://acme.co/api/federation/connect/accept`
4. Connection is now active. Relays, notifications, card-updates all work.

**One gap:** There's no self-service UI for adding an instance to the allowlist. This requires direct DB manipulation or an admin API. For `open` mode, this isn't needed.

---

## Recommendations

### Code Changes: None Required

All federation runtime code is already instance-agnostic.

### Optional Cleanup (cosmetic, low priority)

| File | Line(s) | Current | Suggested |
|------|---------|---------|----------|
| `relay/route.ts` | 7 | `FVP Build 522 §5 alignment` | `Federation ambient spec` |
| `relay/route.ts` | 166 | `FVP Build 522 §4` | `Idempotency spec` |
| `relay/route.ts` | 421 | `Tell FVP we couldn't route` | `Tell peer we couldn't route` |
| `relay-ack/route.ts` | 32-49 | `FVP convention` / `FVP sends` | `Peer convention` / `Peer sends` |
| `relay-ack/route.ts` | 81 | `FVP may have sent` | `Peer may have sent` |
| `prompt-groups/route.ts` | 122 | `FVP` in signal regex | Could remove, but useful |

These are comment-only changes. I'd keep the FVP attribution in comments as historical provenance — they document WHY the code is shaped a certain way, which helps future developers.

### Future Work (not blocking)

1. **Admin UI for InstanceRegistry** — Let operators add/remove instances from the allowlist without DB manipulation
2. **Connection invitation link** — Generate a shareable URL that encodes the federation token + instance URL, so the receiving operator just clicks "Accept" instead of crafting a POST request
3. **Multi-connection relay routing** — The system already handles N connections correctly, but there's no UI for choosing which connection to relay to when you have 3+ federated peers. Currently relies on Divi AI picking the right `connectionId` from the system prompt.

---

## Conclusion

**DiviDen's federation layer is fully multi-instance ready.** The FVP partnership drove the design, but the implementation is generic. A second instance can connect today via the API without any code changes on either side. The only FVP-specific content is in comments (attribution) and docs (historical), both of which are appropriate to keep.
