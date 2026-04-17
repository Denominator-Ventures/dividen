# DiviDen reply to FVP Comms Threading Architecture (Build 522)

**From:** Jon Bradford — `jon@dividen.ai`
**Instance:** `https://dividen.ai` (federation endpoint: `https://dividen.ai/api/federation/relay`)
**Our federation contract version after this reply:** `v2.1.15` (was `v2.1.4` when you wrote the doc)
**Date:** Apr 17, 2026

---

## TL;DR

**Confirm with three deltas, all shipped on our side today.** No changes required on your end.

1. We just upgraded our **inbound** handler to match the behavior you describe — same three gaps we found on our end that you'd already closed on yours: idempotency, ambient preference gates, and task-intent → Kanban card creation. Everything is symmetric now whether a user is on DiviDen or FVP.
2. Payload shape is unchanged. You're good to ship against the v2.1.4 contract you quoted — our v2.1.15 is fully backward-compatible.
3. Minor clarifications on your §9 open questions below.

---

## Response by section

### §1 — Four things you asked us to confirm

| Your ask                                                                | Our answer                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payload shape matches what DiviDen sends                                | **Confirm.** We send exactly the fields you listed: `connectionId`, `relayId`, `fromUserEmail`, `fromUserName`, `toUserEmail`, `type`, `intent`, `subject`, `payload`, `priority`, `dueDate`. |
| Thread keying off `fromUserName` / `fromUserEmail` is compatible        | **Confirm with a caveat (see §9.1 below).** We recommend keying primary identity off `fromUserEmail` and using `fromUserName` as a display label.                                             |
| Ambient preference gates line up with v2.1.4 contract                   | **Confirm.** Your list in §6 matches our implementation — we honor the same four gates in the same order and return the same `{ ok: true, filtered: true, reason }` shape with HTTP 200.     |
| Nothing needs to change on your side                                    | **Nothing needs to change on your side.** All our updates are internal.                                                                                                                       |

### §3 — Inbound flow (DiviDen → FVP)

Nothing we want to change on your side. Your description of how you parse our payload, detect ambient, dedup via `peerRelayId`, and create cards on `assign_task`/`delegate`/`schedule` is exactly what we'd expect.

One small thing to be aware of: **we also send `intent: 'request_approval'` for queue-gated task delegations** (used when a sender's Divi has queued a task for user confirmation before routing it out). If you want those to create a card too, add `request_approval` to your task-intent list. If you want to treat them as messages only, leave the list as-is — they still land in comms correctly.

### §4 — Outbound flow (FVP → DiviDen)

Nothing to change. Our inbound handler now:

1. **Dedupes** via `peerRelayId + connectionId` — retry-safe. Duplicates return `{ success: true, duplicate: true, relayId }` with HTTP 200.
2. **Gates ambient relays** through the recipient's `UserProfile` preferences (relayMode, allowAmbientInbound, relayTopicFilters, relayQuietHours). Blocked ambient relays return `{ ok: true, filtered: true, reason }` — never create a DB row, never surface to comms.
3. **Creates a KanbanCard** at the `leads` stage on the recipient's board when `intent IN ('assign_task', 'delegate', 'schedule', 'request_approval')`. The card is linked to the AgentRelay via `sourceRelayId` (card side) and `cardId` (relay side).
4. **Ambient (non-task) relays** land as **low-priority, state='read'** CommsMessage entries with a 🌊 prefix. These are designed to be woven into the next Divi message rather than generate a notification — matches Jon's Comms Unification Vision behavior #3.

### §5 — Key behavioral rules (Build 522)

All six behaviors now work symmetrically in both directions. Here's the audit we ran:

| # | Behavior                                                                                                     | Our status                                                                                                                                                                                                                    |
| - | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Single chat conversation for all work                                                                         | ✅ Always has been.                                                                                                                                                                                                            |
| 2 | Inbound tasks from other Divis → land directly on Kanban                                                      | ✅ **New in v2.1.15.** Task-intent inbound federation relays now auto-create a KanbanCard at the `leads` stage, wired to the relay.                                                                                             |
| 3 | Inbound ambient relays → woven into next Divi message                                                         | ✅ **New in v2.1.15.** Ambient inbound relays surface as `priority=low`, `state=read`, 🌊 prefix — no separate notification. The chat agent picks them up from the relay inbox.                                                |
| 4 | Outbound task to person via another Divi → sender's queue → comms                                             | ✅ Already in place. `task_route` creates a QueueItem first (status `ready` or `pending_confirmation` based on `queueAutoApprove`). Relay is only fired on dispatch via `executeTaskRouteDispatch`.                             |
| 5 | Outbound task to marketplace agent → sender's queue → comms                                                   | ✅ **New in v2.1.15.** `execute_agent` now creates a `pending_confirmation` queue item unless `queueAutoApprove=true` or the caller sets `skipQueue=true`. Actual execution fires from `dispatchNextItem` when user approves.  |
| 6 | Outbound ambient relay → directly to comms channel (skip queue)                                               | ✅ Already in place. `relay_ambient` creates the relay with `priority=low`, no queue step, and pushes federated peers directly via `federation-push`.                                                                           |

### §6 — Preference gates

**Confirm — HTTP 200 + `{ ok: true, filtered: true, reason }` is correct on our side.** Keep it that way. We use the same response shape on our inbound.

One naming nit (non-breaking): our reasons are slightly more specific than yours. No action needed, just letting you know what you'll see in our logs:

| Your reason (Build 522)      | Our reason (v2.1.15)                  |
| ---------------------------- | ------------------------------------- |
| `relay_mode`                 | `relay_mode_off` / `relay_mode_minimal_blocks_ambient` |
| `ambient_inbound_disabled`   | `ambient_inbound_disabled` (same)     |
| `topic_blocked`              | `topic_filtered:<topic>` (includes the matched topic) |
| `quiet_hours`                | `quiet_hours` (same)                  |

Both are valid — we string-match on prefix if you need to do any sort of reporting across instances.

### §7 — Schema additions

No DiviDen schema changes needed. We're good with your `AgentMessage.threadKey` addition.

### §8 — Testing matrix

Looks solid. One suggestion: add a **retry/dedup test** — send the same relay twice with the same `relayId`. Build 522 says you dedup on `peerRelayId + connectionId`; we just shipped the same — worth cross-validating that neither side double-creates on retry.

---

## Answers to §9 open questions

### Q1 — `fromUserName` stability

**Recommendation: key threads off `fromUserEmail`, use `fromUserName` as a display label.**

`fromUserName` comes from `User.name` on our side, which is user-editable. We can't guarantee casing/spelling stability across relays because a user can rename themselves at any time via settings. `fromUserEmail` is the stable identifier — it only changes on account migration (rare, intentional).

If you switch to email-keying, a rename on our side won't fork your thread. You can still display whatever name we send most recently.

### Q2 — Broadcast relays

**Keep current behavior (per-sender thread, `📢` prefix).** That's what we do on our side too — broadcasts go into the sender thread with a `📢 Broadcast:` prefix. Consistent surface is nicer than a dedicated broadcast inbox that can bury per-sender context.

### Q3 — Multi-instance peer

**Merge by email, not by display name.** Same reasoning as Q1 — display names drift, emails don't. If you want an even stricter signal, use `(fromUserEmail, peerInstanceUrl)` as a two-tuple and merge UI-side on email. That way you preserve per-instance audit trail but show a unified thread to the user.

### Q4 — Attachments

**Not planned near-term.** We have `AgentRelay.artifacts` (JSON array of typed artifact objects) as part of our v2 contract, but we're not currently serializing binaries across federation — the artifact payload is structured references (cardIds, URLs, contact cards). If/when we ship binary attachments, we'll coordinate a contract bump first.

### Q5 — Ack receipts

**Right now we expose:**
- `POST /api/federation/relay-ack` — for response acks on ambient + task relays (includes response payload, quality metadata).

**Not yet:**
- A separate endpoint for Kanban stage changes or task completion on the recipient side.

I'm open to adding one. Suggested shape, if you want it:

```
POST /api/federation/card-update
{
  relayId: string,              // the relay that created the card
  peerCardId: string,           // recipient-side card ID
  change: 'status' | 'priority' | 'completed' | 'assignee',
  from: string,
  to: string,
  at: ISO8601,
  by: { email: string, name?: string }
}
```

If that's useful to you, let me know and I'll ship it. Bidirectional — we'd call yours on our recipient-side changes too.

### Q6 — Thread hints (`threadId`, `parentRelayId`)

**We already use them internally for threading; would love you to adopt them too.**

On our side, `relay_request` inherits the parent's `threadId` when replying (see `action-tags.ts` relay_request handler). `relay_respond` back-propagates the response payload to the parent relay. So from our perspective, a multi-turn ambient conversation across instances already has a thread chain we can walk.

If you key your threads off `threadId` (when present) and fall back to `fromUserEmail` when it's absent, you'd get:

- Sender → Recipient relay A1 (threadId = T1, fromUserEmail = alice@)
- Recipient → Sender relay A2 (threadId = T1, parentRelayId = A1.id, fromUserEmail = bob@)
- Both messages land in the **same thread T1** on both sides, regardless of display name.

That's strictly better than name-keying for multi-party conversations or when a user renames.

---

## Things we're flagging for you to confirm on your side

1. **Idempotency symmetry.** Do you check for duplicate inbound relayIds? We now dedup on `peerRelayId + connectionId`. If you don't, a single transient network retry from us would double-create on your end. Ours now returns `{ success: true, duplicate: true, relayId }` with HTTP 200 — if you adopt this, we can safely retry with exponential backoff.

2. **HMAC verification.** Our config stores `FederationConfig.instanceApiKey` for HMAC-signed requests (`x-signature`), but we **do not currently enforce** signature verification on inbound — we rely on `x-federation-token` matching a provisioned `Connection.federationToken`. If you want us to switch to enforced HMAC, flag it and we'll roll it on a config toggle so we don't break existing peers.

3. **`intent: 'request_approval'`.** See §3 above — we emit this for queue-gated delegations. Confirm whether you want this to create a card or stay as a comms-only message. Default behavior is whatever you decide; we'll match it.

4. **Ambient learning back-channel.** We have an AmbientRelaySignal table that captures outcome/latency/quality for ambient relays — fed by `relay-ack`. If you'd like to reciprocate (send us quality signals on our ambient relays to your users), the `/api/federation/relay-ack` endpoint accepts them already — payload shape in `federation-push.ts`.

---

## Changelog (our side, since your Build 522 doc was written at v2.1.4)

- **v2.1.5–v2.1.8** — ambient relay protocol live, federation auto-accept, sequential relay handling
- **v2.1.9–v2.1.11** — relay quality signals, ambient pattern synthesis, federated developer profiles
- **v2.1.12** — universal @username relay routing (e.g., `@alvaro` auto-resolves to the federated connection)
- **v2.1.13** — fixed inbound relay fetch separation in system prompt (stuck relays no longer block outbound)
- **v2.1.14** — `relay_respond` green card now shows the response content, not the original subject
- **v2.1.15** — (this release) **FVP Build 522 compliance — inbound idempotency, ambient gates, Kanban on task intent, marketplace queue gate**

---

**Reply: confirm, with deltas shipped today. Nothing needed on your side.**
