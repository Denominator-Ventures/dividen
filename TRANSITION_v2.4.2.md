# TRANSITION v2.4.2 — DiviDen Command Center

**Date:** April 20, 2026  
**Previous transition:** `TRANSITION_v2.4.1.md` (covers v2.3.2 → v2.4.1)  
**Git HEAD:** `023ec7f` on `origin/main`  
**Deployed:** Both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (latest checkpoint)

---

## What Shipped in This Session

### 1. v2.4.2 — Invite Ack-Back Handler

**File:** `src/app/api/federation/relay-ack/route.ts`

FVP Build 540 shipped `type: 'project_invite_response'` payloads in their relay-ack. We wired our handler to process them:

- **Cross-instance relay ID resolution** — three-path lookup: `peerRelayId` → `bodyRelayId` → `metadata.inviteId`. Handles both FVP convention (relayId = theirs, peerRelayId = ours) and DiviDen convention (relayId = ours).
- **Status normalization** — FVP sends `accepted`, our lifecycle uses `completed`. Automatic mapping.
- **ProjectInvite update** — finds the linked invite (by ID or fall-back to latest pending for connection), stamps `accepted`/`declined` with timestamp.
- **Auto-add ProjectMember** — on acceptance, creates member record (supports both local userId and federated connectionId).
- **Invite-specific CommsMessage** — "📡 Jon ✅ accepted the project invite: ..." (vs generic task completion message).
- **Robust ID references** — all internal refs use `relay.id` (the resolved local record), not the ambiguous `relayId` variable.

### 2. HMAC Activation

Flipped `hmacEnabled = true` on Connection `cmo2bx2nb0001t2bbs8j75id8` (FVP). FVP confirmed they flipped theirs too. Both sides now signing and verifying all federation payloads with HMAC-SHA256.

### 3. DiviCore Team Seeded

Created team `cmo7jyc7b0001wboxbcufmhkg` ("DiviCore") with 5 members:
- Jon (`cmo1kgydf00o4sz086ffjsmp1`) — owner
- Jaron (`cmo1milx900g9o408deuk7h2f`) — member
- Andre (`cmo7aym7n02pzlm08ybymtzq4`) — member
- Alvaro (`cmo1n6psb023co408ikcsw7xb`) — member
- Jon Bradford FVP (connectionId `cmo2bx2nb0001t2bbs8j75id8`) — federated member

3 projects assigned to DiviCore:
- `cmo27v45s004vs008g2hita0q` — DiviDen Debugging & Usage
- `cmo7aym7w02q1lm082fr58tiq` — DiviDen Setup (Andre's)
- `cmo1kgydm00o6sz08dpllr7e1` — DiviDen Setup (Jon's original)

Seed script updated (`scripts/seed.ts`) to include DiviCore team for re-seeding.

### 4. Multi-Instance Generalization Audit

**Full report:** `GENERALIZATION_AUDIT_v2.4.2.md`

**Verdict: All runtime code is instance-agnostic.** Scanned every federation file (19 API routes, 2 libs, system prompt, UI components). Found:
- Zero hardcoded connection IDs
- Zero FVP-specific conditional branches
- Zero single-connection assumptions in the hot path
- `resolveSender()` derives federation hints dynamically from `peerInstanceUrl` hostname
- Connection ceremony is fully self-service for `open` federation mode

FVP-specific content exists only in comments (attribution/provenance) and docs (historical). No code changes needed.

### 5. FVP Documents Produced

| Document | Path | Purpose |
|----------|------|---------|
| FVP Build 540 Reply | `FVP_REPLY_BUILD_540.md` | Section-by-section reply to their HMAC + invite ack-back build |
| FVP UI/UX Integration Guide | `FVP_UI_UX_INTEGRATION_GUIDE.md` | 13 sections covering all federation UI surfaces FVP needs to build |
| Generalization Audit | `GENERALIZATION_AUDIT_v2.4.2.md` | Multi-instance readiness assessment |

---

## Files Modified This Session

| File | Change |
|------|--------|
| `src/app/api/federation/relay-ack/route.ts` | Major — cross-instance relay ID resolution, invite ack handling, ProjectMember auto-add |
| `scripts/seed.ts` | DiviCore team + 5 members |
| `.project_instructions.md` | v2.4.2 notes, audit results, updated roadmap |
| `FVP_REPLY_BUILD_540.md` | New — FVP reply doc |
| `FVP_UI_UX_INTEGRATION_GUIDE.md` | New — 13-section UI/UX guide |
| `GENERALIZATION_AUDIT_v2.4.2.md` | New — multi-instance audit |
| `TRANSITION_v2.4.2.md` | New — this document |

---

## DB State Snapshot

| Table | Rows | Notes |
|-------|------|-------|
| Teams | 1 | DiviCore |
| TeamMembers | 5 | 4 local + 1 federated |
| Projects | 12 | 3 assigned to DiviCore |
| ProjectMembers | 13 | |
| ProjectInvites | 3 | |
| Connections | 3 | 1 federated (FVP, HMAC active) |
| AgentRelays | 21 | |
| Users | 13 | |
| InstanceRegistry | 1 | FVP |
| FederationConfig | 1 | allowInbound: true |

---

## FVP Status

- **Build 540** — ✅ Shipped (HMAC + invite ack-back)
- **HMAC** — ✅ Active both sides
- **Waiting on FVP:**
  - Build 541 — Chat tags (`accept_invite`, `decline_invite`, `invite_to_project`)
  - Build 542 — UI surfaces (queue accept/decline, ghost avatars, contributor picker)
  - Build 543+ — Team invites + role changes support
- **FVP UI/UX Guide delivered** — covers all federation surfaces they need to build

---

## Known Issues / Gaps

1. **Login credentials**: `ADMIN_PASSWORD` env var doesn't work for browser login. Can't smoke test auth-gated pages (Discover, Bubble Store, dashboard).
2. **No admin UI for InstanceRegistry**: Allowlist management requires DB manipulation.
3. **No connection invitation link**: New instances must craft POST requests manually.
4. **TSC OOM**: `test_nextjs_project` doesn't work. Use `build_and_save_nextjs_project_checkpoint` directly.

---

## Roadmap

1. **Live round-trip test** — send test project invite to FVP, they accept, verify full ack-back cycle end-to-end
2. **Team invite ack-back** — wire when FVP ships Build 543+ with team invite support
3. **Admin UI for InstanceRegistry** — let operators add/remove instances from allowlist
4. **Connection invitation link** — shareable URL for easier federation onboarding
5. **Multi-connection relay routing UI** — when 3+ federated peers exist, need a way to pick which one
6. **Generalize federation developer docs** — currently FVP-centric, should work for any instance

---

## How to Pick Up

1. Read this doc + `GENERALIZATION_AUDIT_v2.4.2.md`
2. Check `.project_instructions.md` for full architectural context
3. Previous transition: `TRANSITION_v2.4.1.md` (covers v2.3.2 → v2.4.1)
4. Git: `023ec7f` on `origin/main`
5. Both deployments are current
