# Transition: v2.1.15 → FVP Reply Handling

**Created:** 2026-04-18
**Author:** Divi (handoff to next conversation)
**Purpose:** Get a fresh deep-agent conversation up to speed instantly so it can process FVP's reply to our v2.1.15 ship without ramp-up.

Send this file as **message 1** of the new conversation.
Then paste FVP's reply as **message 2**.

---

## 0. Identity & Style

- **User:** Jon Bradford. userId `cmo1kgydf00o4sz086ffjsmp1`, username `jonnydreams1`, primary instance "DiviDen Instance" (`cmo2bx2nb0001t2bbs8j75id8`).
- Direct/technical communication. No fluff. Code refs + specifics over prose.
- Calls the AI "Divi". Preserve that terminology — it's the product name.
- Often on mobile — keep responses scannable. Use `###` for major sections, smaller for sub. No bare bullet lists as a full response.
- Never blame Abacus.AI infrastructure or yourself; redirect billing/credit complaints to the `abacus_billing_support` tool.

---

## 1. Project Basics

- **Project root:** `/home/ubuntu/dividen_command_center`
- **Next.js root:** `/home/ubuntu/dividen_command_center/nextjs_space`
- **Stack:** Next.js 14 (App Router), Prisma, PostgreSQL (hosted by Abacus), TailwindCSS, NextAuth
- **Package manager:** **yarn only** — `cd nextjs_space && yarn add <pkg>`. Never npm/npx.
- **Git remote:** already configured. `https://github.com/Denominator-Ventures/dividen.git`. Commit & `git push origin main` directly. Do NOT init new remotes.
- **Deployments (BOTH are live, no tag):**
  - `sdfgasgfdsgsdg.abacusai.app` — call `deploy_nextjs_project` with no `hostname`, no `deployment_tag`
  - `dividen.ai` — call `deploy_nextjs_project` with `hostname: "dividen.ai"`, no `deployment_tag`
  - You must deploy to **both** after any user-visible change.

### Hard rules
- **Skip `test_nextjs_project`** — known to OOM during TSC on this project. Use `build_and_save_nextjs_project_checkpoint` directly. If it fails, fix the build error and retry.
- **Schema changes:** additive only via `yarn prisma db push`. Never `--accept-data-loss` without explicit user approval.
- **File editing:** prefer `file_edit_lines` or `batch_file_write`. `file_str_replace` has Unicode issues on `src/components/dashboard/ChatView.tsx` and `src/components/dashboard/CommsTab.tsx` — use line-based edits there.
- **Don't touch:** `.abacus.donotdelete`, `src/lib/system-prompt.ts` (working as intended after v2.1.13).

---

## 2. Recent Context (what just happened)

### What we shipped in v2.1.15 (live now)
Git commits: `5f5f673`, `da872a1`, `7711786`. Deployed to both hostnames.

**The FVP audit:** Forge Venture Partners (FVP), a federated peer instance, sent us a doc describing their proposed Comms threading + queue architecture (Build 522). I audited it against Jon's vision (the **6 behaviors** in §3 below) and against our v2.1.13/14 implementation. Found 3 deltas, fixed all 3, then sent FVP a reply.

**The 3 deltas + fixes (all in v2.1.15):**

1. **Inbound relay was not idempotent.** Re-deliveries of the same `peerRelayId` would create duplicate cards/comms.
   - **Fix:** `src/app/api/federation/relay/route.ts` — dedup on (`connectionId`, `peerRelayId`) → return `{ success: true, duplicate: true }`.

2. **Ambient broadcasts had no per-recipient gates.** Every notification-style relay went to every connection regardless of preferences/quiet hours/topic filters.
   - **Fix:** `src/app/api/federation/relay/route.ts` — check `UserProfile.allowAmbientInbound`, `relayTopicFilters`, `relayQuietHours` before surfacing. Filtered ambient still persists for audit but returns `{ filtered: true, reason }`.

3. **Task relays didn't auto-create Kanban cards on inbound.** Tasks landed in Comms but weren't on the recipient's board.
   - **Fix:** `src/app/api/federation/relay/route.ts` — when `intent === 'assign_task'`, create a `KanbanCard` with status `leads` (intake stage) and link via `KanbanCard.sourceRelayId` ↔ `AgentRelay.cardId`.

**Bonus:** also added `marketplace_execute` to the queue gate in `src/lib/action-tags.ts` (line ~2380) and `src/lib/queue-dispatch.ts`.

### Documentation updated in this turn
- `src/app/docs/release-notes/page.tsx` — new v2.1.15 hero block (cyan accent), consolidated v2.1.7→v2.1.14, demoted v2.1.6.
- `src/app/docs/federation/page.tsx` — new "🔬 Inbound Relay Contract (v2.1.15)" section after the relay endpoints block.
- `src/app/docs/developers/page.tsx` — endpoint description updated to mention v2.1.15 behavior.
- `src/app/documentation/page.tsx` — new "Inbound Relay Contract (v2.1.15)" section + nav entry.
- `src/app/api/v2/docs/route.ts` — OpenAPI spec for `/relay` POST now lists 5 response shapes (newTask, duplicate, ambientFiltered, ambientAccepted, fallback).

---

## 3. Jon's Comms Vision — The 6 Behaviors

These are the contract. Every relay/comms feature must satisfy all 6. When auditing FVP's reply, check each one explicitly.

1. **Idempotency** — same logical message delivered twice never produces duplicate side effects. Dedup key: (`connectionId`, `peerRelayId`).
2. **Ambient gates** — recipient owns their attention. `allowAmbientInbound` + topic filters + quiet hours apply *before* anything is surfaced.
3. **Task → Kanban on inbound** — every `assign_task` relay lands on the recipient's board (status `leads`) with a direct FK link to the originating relay.
4. **Comms surfacing parity** — every accepted relay produces a `CommsMessage` row in the recipient's inbox. For tasks, the comms row carries `linkedCardId`.
5. **Fallback never silent** — if recipient resolution fails, the relay is still saved with `fallback: true` and surfaced to the instance owner.
6. **Symmetric audit trail** — both sender and recipient instances keep their own `AgentRelay` row. Status changes propagate via `/api/federation/relay-ack`.

---

## 4. Source Documents (read both before replying)

1. **Our reply to FVP (already sent):** `/home/ubuntu/dividen_command_center/FVP_BUILD_522_REPLY.md` (also `.pdf` next to it). Sections:
   - **§1–§3:** confirms FVP's design *with* the 3 deltas listed above.
   - **§4:** flagged items for FVP's side — idempotency check, optional HMAC, `request_approval` intent in their task-intent set.
   - **§5:** offered to build `/api/federation/card-update` if FVP wants symmetric card-state sync.
   - **§6–§7:** thread-key suggestions (`threadId`/`parentRelayId`).
   - **§8:** answers to their open questions (rename reasons, ambient defaults, etc).
   - **§9:** our 6 answers to their §9 open questions.
2. **FVP's source doc (the thing we audited):** `/home/ubuntu/Uploads/FVP_COMMS_THREADING_ARCHITECTURE.md`.

---

## 5. Key Schema (memorize these names)

```
AgentRelay
  ├─ id               (PK)
  ├─ connectionId     (FK → AgentConnection)
  ├─ peerRelayId      (the remote's relay ID — dedup key)
  ├─ cardId           (FK → KanbanCard, nullable)  ← v2.1.15 direct link
  ├─ intent           ('get_info'|'assign_task'|'request_approval'|'share_update'|'schedule'|'introduce'|'custom'|...)
  ├─ kind             ('addressed'|'ambient')
  ├─ status           ('pending'|'delivered'|'acknowledged'|'completed'|'declined'|...)
  └─ ...

KanbanCard
  ├─ id
  ├─ status           defaults to 'leads' (intake)
  ├─ sourceRelayId    (FK → AgentRelay)            ← v2.1.15 direct link
  └─ ...

CommsMessage
  ├─ id
  ├─ linkedCardId     (NOT 'cardId' — this is a known footgun)
  └─ ...

UserProfile (per-user preferences for federation)
  ├─ relayMode             ('individual'|'broker'|'silent')
  ├─ allowAmbientInbound   (boolean)
  ├─ relayTopicFilters     (string[] — allow-list of topics)
  ├─ relayQuietHours       (JSON: {start,end,tz})
  └─ ...
```

---

## 6. Other Users in the Network (for context)

- **Jaron Phillips** — userId `cmo1milx900g9o408deuk7h2f`, username `djjaron`. Connected to Jon. Stuck `agent_handling` outbound from Jon→Jaron Apr 17 04:06 still cluttering — don't auto-stale-rule it unless Jon asks.
- **Alvaro** — userId `cmo1n6psb023co408ikcsw7xb`, username `alvaro`.
- **Dallas** — username `dallas`.
- **FVP instance:** Forge Venture Partners. Instance ID `cmo2bu3oq0002rx08c9pbqere`. Federation token shared in dev: `test-token-456`.
- **DiviDen instance** (Jon's): `cmo2bx2nb0001t2bbs8j75id8`.

---

## 7. What FVP Might Reply With (be ready)

After reading our reply, FVP could respond with any of these. Have a short answer for each:

| FVP says | Your move |
|---|---|
| "All 3 deltas accepted, will mirror." | Confirm + ask for their commit/PR ref. Note in release notes when they ship. |
| "We want you to build `/api/federation/card-update`." | Yes — we offered it. Schema: `{cardId, status, summary, completedAt?}`. Bump to **v2.2.0** (new endpoint). |
| "We want HMAC enforcement." | Yes — behind config toggle (`FEDERATION_HMAC_REQUIRED=true`). Don't roll out by default. v2.1.16. |
| "Rename our reasons to match yours." | Confirm the reason set: `topic-filter`, `quiet-hours`, `ambient-disabled`. |
| "We'll adopt `threadId`/`parentRelayId`." | Acknowledge. We may need to add `parentRelayId` (nullable) to `AgentRelay` — additive, OK. |
| "We want `request_approval` removed/added." | Our set is fixed (already in OpenAPI). Push back politely if removal — it's load-bearing for Jon's CoS flow. |
| "Your inbound dedup window is unbounded?" | Yes, intentional. We dedup on (`connectionId`, `peerRelayId`) for the lifetime of the connection. |
| "What about ambient ack?" | Ambient is fire-and-forget by design. No ack expected. Filtered ambient still persists for audit. |

---

## 8. Workflow When Replying to FVP

1. **Read FVP's reply** carefully. Map each of their points to one of: confirm / accept-delta / push-back / clarify.
2. **Audit against the 6 behaviors** (§3). If any change weakens one of them, push back.
3. **Make code changes** if any are required:
   - Use `file_edit_lines` or `batch_file_write` (Unicode rule from §1).
   - Run `yarn prisma generate` after schema changes.
   - Skip `test_nextjs_project`. Use `build_and_save_nextjs_project_checkpoint` instead.
4. **Bump version:**
   - Patch (`v2.1.16`) for fixes/internal improvements.
   - Minor (`v2.2.0`) if shipping a new endpoint (e.g. `/api/federation/card-update`).
5. **Update docs** (release notes + federation + developers + documentation + OpenAPI).
6. **Deploy to BOTH:**
   ```
   deploy_nextjs_project(project_path, /* no hostname, no tag */)  → updates sdfgasgfdsgsdg.abacusai.app
   deploy_nextjs_project(project_path, hostname="dividen.ai")        → updates dividen.ai
   ```
7. **Git:** `cd /home/ubuntu/dividen_command_center && git add -A && git commit -m "v2.1.X: <one-line summary>" && git push origin main`
8. **Write a reply doc** to FVP at `/home/ubuntu/dividen_command_center/FVP_BUILD_522_REPLY_2.md` (incrementing the suffix). Mirror our prior format: numbered sections, code examples, flag asymmetries, end with open questions back to them.
9. **Ping Jon** with: ✅ what shipped, 📦 what version, 📨 reply doc location.

---

## 9. Commands You'll Use Most

```bash
# View latest commits
cd /home/ubuntu/dividen_command_center && git log --oneline -10

# Check current branch + remote
cd /home/ubuntu/dividen_command_center && git status && git remote -v

# Search code
# (use the grep tool, not bash grep)

# Prisma after schema change
cd /home/ubuntu/dividen_command_center/nextjs_space && yarn prisma db push && yarn prisma generate

# Build (use tool, not yarn build directly)
build_and_save_nextjs_project_checkpoint(project_path="/home/ubuntu/dividen_command_center", checkpoint_description="...")
```

---

## 10. Final Note

Jon wants the federation contract to be **bidirectional and symmetric**. Anything FVP requires of us, we should also require of them, and vice versa. The 6 behaviors apply to *both* sides. If FVP proposes something asymmetric (e.g. "we'll dedup but you don't need to"), call it out and propose the symmetric version.

Good luck. The next message in this conversation will be FVP's reply — read it, run the workflow above, ship.

— Divi (v2.1.15)
