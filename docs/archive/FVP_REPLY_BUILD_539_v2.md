# DiviDen → FVP: Confirmation + v2.4.0 HMAC + Timeline Ask

**From:** Jon Bradford, DiviDen
**To:** Alvaro / FVP Engineering
**Date:** April 19, 2026
**Re:** Your Build 538–539 reply doc

---

## TL;DR

All aligned. Your Q1–Q3 answers match our implementation exactly. Confirming your four asks below, sharing what we shipped since v2.3.2, and flagging one new thing (HMAC) plus one timeline question (invite ack-back).

---

## 1 — Your Four Asks: All Confirmed

| Ask | Answer |
|-----|--------|
| Happy with Q1–Q3? | ✅ Yes — both sides landed on the same answers independently. Advisory routing, no mapping table, QueueItem-based invite handling. |
| Do we emit `teamId`/`projectId` outbound? | ✅ Yes — since v2.3.2. Every relay and notification from us carries both fields top-level. |
| Do we handle `scopeDropped: true`? | ✅ Yes — we parse it from your response and can surface it in Comms as an amber advisory. No error, no retry. |
| Anything else on the envelope? | Nothing right now. See §3 below for HMAC — that'll be a new header, not an envelope field. |

---

## 2 — What We Shipped Since Your Last Sync

You last saw us at v2.3.2. Here's what's live now:

| Version | What | Status |
|---------|------|--------|
| **v2.3.2** | Multi-tenant relay wire (`teamId`/`projectId` on envelope, scope ingest, advisory routing) | ✅ Live |
| **v2.3.3** | Comms threading scope parity UI — scope chips in thread list, header, bubbles, mobile | ✅ Live |
| **v2.3.4** | Team invites four-signal (DB + QueueItem + AgentRelay + CommsMessage + federation push) | ✅ Live |
| **v2.3.5** | Project + team role changes four-signal (same pattern as invites) | ✅ Live |
| **v2.4.0** | HMAC-SHA256 payload signing — feature-flagged per connection, off by default. Self-test suite included. | ✅ Live |

All four-signal events (task routing, project invites, team invites, role changes) now emit through the same pipeline: DB write → QueueItem → AgentRelay → CommsMessage(s) → federation push. Wire shape is identical across all of them.

---

## 3 — New: HMAC-SHA256 Payload Signing (v2.4.0)

We shipped HMAC enforcement this session. Here's the contract:

- **Header:** `x-hmac-sha256`
- **Signing:** HMAC-SHA256 over the raw JSON body using the connection's `federationToken` as the key
- **Feature-flagged:** Per-connection `hmacEnabled` boolean (default `false`). When `false`, we don't sign outbound and don't verify inbound — zero breaking change.
- **Verification:** Timing-safe comparison. If `hmacEnabled` is `true` on the connection and the header is missing or invalid → `401`.
- **Activation path:** We flip `hmacEnabled` to `true` on our Connection record for FVP, and start signing every outbound payload. You'd need to:
  1. Verify the `x-hmac-sha256` header on your inbound federation routes (relay, notifications, relay-ack)
  2. Sign your outbound payloads with the same scheme so we can verify
  3. Tell us when you're ready — we flip the flag and both sides are enforcing

No rush. The token-based auth still works. HMAC is an upgrade path when you're ready.

**Question:** What's your timeline for adding HMAC verification on your side? Happy to share our implementation if it helps.

---

## 4 — Timeline Ask: Federation Invite Ack-Back

Your doc mentions "federation invite ack-back" (accept/decline → push ack to DiviDen) as not shipped yet. That's the piece we need to close the invite round-trip — right now Jon can accept an invite on your side, but we don't get the status update back.

**Question:** What's the timeline on this? It's the next gate for us — once ack-back is live, we can wire up automatic invite status progression on our side.

For reference, our `/api/federation/relay-ack` endpoint is live and tested. Push the ack with `status: 'completed'` or `'declined'` + `resolvedAt` and we'll advance the queue item.

---

## 5 — Parking Lot (No Action Needed Now)

These came up in our earlier planning but aren't blockers:

- **`project_revoked` relay** — when a project membership is revoked, we proposed emitting a relay so orphaned cards can be visually flagged. Not urgent until cross-instance project lifecycle is more mature.
- **`v2/connections` rewrite** — noted as low priority on your side, agreed.
- **Outbound project invite from Jon** — also noted as not shipped. No urgency from our side.

---

## Summary: What We Need Back

1. ✅ or ❌ on HMAC timeline (even "not this quarter" is fine)
2. ETA on invite ack-back
3. Anything you need from us to unblock either of those

Everything else is aligned. Good work on 538–539 — you're ahead of schedule.

— Jon
