# DiviDen Command Center — Reply to FVP Build 540

**Date:** April 20, 2026  
**From:** DiviDen Engineering  
**To:** Jon Bradford / FVP Command Center  
**DiviDen Version:** v2.4.2  
**Ref:** FVP Build 540 Reply (HMAC + Invite Ack-Back)

---

## 1. Invite Ack-Back — CONFIRMED ✅

Our `/api/federation/relay-ack` endpoint now handles `type: 'project_invite_response'` payloads as of v2.4.2.

### What we added:

- **Cross-instance relay ID resolution:** We support both FVP's field convention (`peerRelayId` = our relay ID, `relayId` = your relay ID) and our own convention (`relayId` = recipient's relay ID). The handler tries `peerRelayId` first, then `relayId`, then `metadata.inviteId` — so it works regardless of which convention is used.
- **`accepted` status normalization:** FVP sends `status: 'accepted'`, which we normalize to `completed` internally (our lifecycle uses `completed` as the terminal success state). Both `accepted` and `completed` are treated equivalently.
- **ProjectInvite record update:** When `type: 'project_invite_response'` arrives, we:
  1. Update the `ProjectInvite` record (`pending` → `accepted` or `declined`)
  2. Set `acceptedAt` or `declinedAt` timestamps
  3. If accepted, auto-add the connection as a `ProjectMember` (handles both local users and federated connections)
- **Four-signal completion:** The ack also advances the QueueItem → `done_today`, updates the AgentRelay status, writes a CommsMessage, logs activity, and fires webhook subscribers — full loop closure.

### Comms message format:

When Jon accepts: `📡 Jon ✅ accepted the project invite: "<subject>"`  
When Jon declines: `📡 Jon ❌ declined the project invite: "<subject>"`

No action needed from FVP — your Build 540 payload shape is fully supported.

---

## 2. HMAC Activation — READY ✅

Our HMAC implementation has been live since v2.4.0 (feature-flagged off). We're ready to activate.

### Proposed activation sequence:

1. **Jon confirms ready** (reply to this doc or via Comms)
2. **DiviDen flips `hmacEnabled = true`** on our Connection record for FVP
3. **DiviDen confirms to Jon** (via Comms relay or email)
4. **Jon flips `hmacEnabled = true`** on FVP's Connection record for DiviDen
5. **Both sides now sign outbound + verify inbound** — done

**Important:** Between steps 2 and 4, outbound relays from DiviDen will carry the `x-hmac-sha256` header. FVP should silently ignore it when `hmacEnabled` is still `false` on your side (which it does per your Build 540 — backward-compatible). Once Jon flips the flag, verification kicks in on both sides.

**Risk window:** Effectively zero — since both sides skip verification when their flag is off, staggered activation just means signatures are sent but not checked during the gap. No mismatches, no failures.

Say the word and we flip.

---

## 3. v2.4.2 Changelog

| Area | Change |
|---|---|
| Inbound relay-ack | Cross-instance relay ID resolution (peerRelayId + relayId + metadata.inviteId fallback) |
| Inbound relay-ack | `accepted` → `completed` status normalization |
| Inbound relay-ack | `type: 'project_invite_response'` triggers ProjectInvite record update |
| Inbound relay-ack | Auto-add accepted invitee as ProjectMember (local or federated) |
| Inbound relay-ack | Invite-specific CommsMessage format |
| Inbound relay-ack | All references now use resolved `relay.id` (robust against ID convention mismatches) |

---

## 4. What's Next

1. **HMAC activation** — waiting on your go signal
2. **Live round-trip test** — once HMAC is active, we'll send a test project invite and verify the full cycle: send → FVP receives → Jon accepts → ack-back → DiviDen updates invite + adds member
3. **Team invite ack-back** — same pattern, ready to wire when FVP adds team invite support (Build 543+)

---

*Ready for handshake.*
