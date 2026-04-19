# Transition: v2.3.2 — Multi-Tenant Relay Wire

**Date:** April 18, 2026
**Prev:** v2.3.1 (Project Invites as First-Class Divi→Divi Comms)
**Next:** v2.3.3 (Comms Threading Surface Parity)

---

## Purpose

Project invites in v2.3.1 proved the four-signal pattern for a single namespace. FVP (Build 522) was blocked waiting for scope — `teamId` and `projectId` — to propagate across the federation wire so multi-tenant routing, gating, and audit trails stayed coherent once more than one namespace started relaying through a single instance.

v2.3.2 wires scope end-to-end: outbound mutation → federation wire → inbound handler → persisted row → gating cascade → UI chips.

---

## What Shipped

### Federation wire

- **`src/lib/federation-push.ts`** — all three push functions (`pushRelayToFederatedInstance`, `pushRelayAckToFederatedInstance`, `pushNotificationToFederatedInstance`) now accept and emit optional `teamId` / `projectId` top-level fields. Hydrated from stored relay if caller didn't pass explicitly.

### Inbound handlers

- **`src/app/api/federation/relay/route.ts`** — destructures `teamId` / `projectId`, validates against local Team/Project rows, persists on AgentRelay + KanbanCard + CommsMessage metadata. Drops silently + echoes `scopeDropped` if peer sends unknown IDs. Project→team inheritance when only projectId is given.
- **`src/app/api/federation/notifications/route.ts`** — same scope propagation + dual wire-shape support (`{type,title,body}` and legacy `{action,summary}`) + fixed invalid status enum (`'open'` → `'ready'`).
- **Ambient gate (`checkAmbientInboundGate`)** — filter entries now accept object form `{ topic?, projectId?, teamId? }`. All specified fields must match. Legacy string filters still work.

### Call sites backfilled

- `src/lib/cos-sequential-dispatch.ts` — relay case reads from item + meta
- `src/lib/queue-dispatch.ts` — `executeTaskRouteDispatch` propagates to relay + KanbanCard + push
- `src/lib/action-tags.ts` — `relay_request` (line 1258) + `task_route` queueItem (line 2027) now carry scope top-level + in metadata JSON
- `src/lib/relay-queue-bridge.ts` — `createLinkedDispatch` accepts scope on item or opts, opts precedence
- `src/lib/task-exchange.ts` — `projectId` piped through from linked job
- `src/app/api/relays/route.ts` — validates and persists scope
- `src/app/api/mcp/route.ts` (`relay_send` tool) — new fields in input schema + output payload

### v2.3.1 invite gap fix

- **`src/app/api/projects/[id]/invite/route.ts`** — federated invitees now trigger `pushRelayToFederatedInstance` + `pushNotificationToFederatedInstance` with `projectId`. Relay stays `pending` until peer ACKs. Skips local CommsMessage (peer owns their side). Symmetry restored.

### UI

- **`src/components/dashboard/QueuePanel.tsx`** — adds 📁 projectId / 👥 teamId chips in metadata row, last 6 chars of ID, full in tooltip
- **`src/components/dashboard/CommsTab.tsx`** — same chips, parsed from relay payload
- **`src/types/index.ts`** — `QueueItemData` extended with optional `teamId` / `projectId`

### Verification

- **`nextjs_space/scripts/check_federation_scope.ts`** — new script:
  ```
  cd nextjs_space && npx tsx scripts/check_federation_scope.ts 100
  ```
  Walks last N AgentRelay / QueueItem / KanbanCard rows and reports scope coverage.

### Docs

- **`src/lib/updates.ts`** — new v2.3.2 entry at top
- **`src/app/docs/release-notes/page.tsx`** — new v2.3.2 block added before v2.3.1, LATEST tag moved

---

## Key Architectural Decisions

1. **Additive, optional everywhere.** All fields optional on both outbound and inbound. No peer is forced to upgrade.
2. **Advisory routing, not strict rejection.** Unknown scope → drop field + echo `scopeDropped`, but still ingest. Preserves availability during sync lag.
3. **Top-level envelope only.** Scope lives on the envelope, not inside payload. Keeps gating simple and makes scope a first-class routing concern.
4. **Project → team inheritance.** If peer sends only projectId, and project has teamId, we auto-resolve team as scope.
5. **No schema migration.** Columns `teamId` / `projectId` were already present on `AgentRelay`, `QueueItem`, `KanbanCard`, `NetworkJob`. Only `yarn prisma generate` needed.

---

## Two Latent Bugs Flushed

1. **Wire-shape mismatch** in federation notifications — outbound pushed `{type,title,body}`, handler read `{action,summary}`. Handler now accepts both.
2. **Status enum violation** — federated notifications created QueueItems with `status: 'open'` (not valid). Now `'ready'`.

---

## Six Federation Behaviors (still hold)

1. **Idempotency** — federation envelope IDs dedupe at inbound.
2. **Ambient gates** — now scope-aware, filters narrow by topic + projectId + teamId.
3. **Task → Kanban** — scoped KanbanCards inherit projectId from relay envelope.
4. **Comms parity** — federated invitee now mirrors local four-signal shape.
5. **Fallback never silent** — `scopeDropped` echo tells sender what we couldn't resolve.
6. **Symmetric audit trail** — scope logged on both sides' AgentRelay + ActivityLog.

---

## FVP Unblock Status

- v2.3.2 delivered. Reply doc: `FVP_BUILD_522_REPLY_2.md`.
- FVP can now send relays tagged with their `teamId` + `projectId` and they'll round-trip cleanly — scoped, gated, persisted, visible on the right boards, audited symmetrically.
- Next waiting on FVP to confirm: (1) envelope shape, (2) advisory routing OK, (3) answers to §4 clarifies in reply doc.

---

## Roadmap After v2.3.2

| Version | What | Why |
|---|---|---|
| v2.3.3 | Comms threading surface parity UI | Thread drill-down still lacks scope context |
| v2.3.4 | Four-signal pattern for Team Invites | Consistency with project invites |
| v2.3.5 | Four-signal pattern for Project Role Changes | Same — promote/demote should emit relay |
| v2.4.0 | HMAC enforcement (feature-flagged) + self-test suite | Security hardening, rollout-compatible |

---

## Verification Checklist

- [x] `yarn prisma generate` succeeds (no schema changes needed)
- [x] `tsc --noEmit --skipLibCheck` passes clean
- [x] `scripts/check_federation_scope.ts` runs and reports coverage
- [x] Scope chip visible in QueuePanel + CommsTab for scoped items
- [x] Federated project invite test round-trips to peer instance
- [x] `scopeDropped` echo correct when peer sends unknown IDs
- [x] Legacy peer (no scope fields) still works unchanged
- [x] Checkpoint + deploy + git commit/push
- [x] Release notes + updates.ts reflect v2.3.2
- [x] FVP reply doc written

---

— Jon
