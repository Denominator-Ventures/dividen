# Handoff — DiviDen Command Center Cleanup Sprint

**Purpose of this document**: Hand a fresh Deep Agent conversation everything it needs to resume the cleanup sprint effectively. Read this top-to-bottom before touching code.

**Companion document**: `CLEANUP_ROADMAP.md` in the project root. That has the phased plan; this doc has the operational context.

---

## Current State (as of April 21, 2026)

### What's deployed
- **v2.4.6 Prompt Injection Hardening** is live on both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`
- Git HEAD: `c32b7fd` on `origin/main`
- Hourly sweep daemon (task ID: `423ffaea6`) is active and healthy

### What the last session completed
- **v2.4.4** — Admin panel session-based RBAC (eliminated static ADMIN_PASSWORD on 14 `/api/admin/*` routes)
- **v2.4.5** — Full telemetry coverage (`withTelemetry()` HOF wrapping 165 routes)
- **v2.4.6** — Prompt injection hardening (`prompt-guard.ts`, boundary markers, relay sanitization)
- **Full project audit** — see `CLEANUP_ROADMAP.md` for the 13 findings

### What is NOT done (and explicitly deferred)
- **v2.4.7 LLM cost controls** — out of scope until cleanup sprint complete
- **Live round-trip test with FVP** — awaiting scheduling with Alvaro
- **Team invite ack-back** — blocked on FVP Build 543+
- **Everything in `CLEANUP_ROADMAP.md`** — that's what this handoff enables

---

## Owner & Working Style

**Jon Bradford** (`jon@colab.la`, user ID `cmo1kgydf00o4sz086ffjsmp1`)
- Founder of DiviDen. Direct, technical, zero tolerance for marketing fluff.
- Prefers `###` markdown headers, crisp framing, strong opinions over hedging.
- Wants to see the "why" behind technical recommendations, not just the "what".
- Hates ceremony. If you're about to ask for permission on a mechanical refactor, just ship it and report what you did.
- Ask clarifying questions only when the cost of being wrong is high.

---

## The Codebase in One Paragraph

DiviDen is a Next.js 14 App Router application. An AI chief-of-staff agent ("Divi") sits on top of a 71-model Prisma schema covering kanban, CRM, relays (the core inter-agent protocol), federation (HMAC-signed cross-instance communication), marketplace, and team/project multi-tenancy. Chat happens via SSE streaming from `/api/chat/send`, which builds a dynamic system prompt (`src/lib/system-prompt.ts`), calls Abacus AI (Claude) by default, parses `[[action_tags:{...}]]` from the response, and executes them via a giant switch in `src/lib/action-tags.ts`. There's a federation layer where instances of DiviDen talk to each other (primarily Alvaro's "FVP" instance) with per-connection HMAC signing. No light mode. No tests. Yarn only.

---

## Critical Rules (violating any of these breaks things)

1. **Do NOT use `test_nextjs_project`** — TypeScript compilation OOMs on this project. Go directly to `build_and_save_nextjs_project_checkpoint`.
2. **Use `file_edit_lines` (not `file_str_replace`) for `ChatView.tsx`** — contains unicode characters that break string matching.
3. **Schema changes must be additive only** — never run `yarn prisma db push --accept-data-loss`. The DB is shared between dev and prod.
4. **Commit and push after every deploy** — `origin` is `github.com/Denominator-Ventures/dividen.git` (PAT already configured).
5. **One `deploy_nextjs_project` call updates both hostnames** — both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` are untagged.
6. **Yarn only**. Never npm. Never npx. `cd nextjs_space && yarn add <pkg>` and then `yarn prisma generate` if Prisma types are needed.
7. **The project root is `/home/ubuntu/dividen_command_center`** — pass THIS path to tools, not the `nextjs_space` subdir.

---

## Files You Will Be Editing Most

| File | Lines | Role |
|------|-------|------|
| `src/lib/action-tags.ts` | 3,466 | 68-case switch of tag handlers — TARGET OF PHASE 2.1 |
| `src/lib/system-prompt.ts` | 2,010 | Conditional prompt builder — TARGET OF PHASE 2.2 |
| `src/app/api/chat/send/route.ts` | 376 | Main chat endpoint — stable, rarely touch |
| `src/components/dashboard/ChatView.tsx` | 1,872 | Chat UI — TARGET OF PHASE 3.1 |
| `src/lib/prompt-guard.ts` | 200 | v2.4.6 injection hardening — recent, stable |
| `src/lib/telemetry.ts` | ~250 | v2.4.5 `withTelemetry()` HOF — stable |
| `src/lib/admin-auth.ts` | ~50 | v2.4.4 `requireAdmin()` — stable |
| `src/lib/prisma.ts` | 102 | Singleton client + query telemetry (consider removing query logging in Phase 5) |
| `src/lib/federation-push.ts` | ~400 | Outbound HMAC-signed federation calls |
| `src/lib/updates.ts` | 4,055 | Hardcoded changelog — TARGET OF PHASE 2.3 |

---

## Assumptions Made in Prior Work

These are design decisions that weren't written down anywhere except in commit messages and `.project_instructions.md`. Preserve them unless Jon says otherwise:

1. **`ADMIN_PASSWORD` is retained for machine-to-machine auth only** (cron endpoints `/api/cron/sweep`, `/api/cron/cortex-scan`). Session RBAC is for human admins.
2. **All 165 route wrappings via `withTelemetry()` log requests at the route layer**, not the ORM layer. If query-level logging is re-enabled, gate it behind an env flag.
3. **`boundaryWrapped` strings include `[[UNTRUSTED_*_START]]`/`[[UNTRUSTED_*_END]]` literal markers** that the LLM is trained to recognize as data boundaries. Do not rename these markers without updating `system-prompt.ts`.
4. **Federation is opt-in per connection** (`Connection.hmacEnabled` flag). Legacy peers without HMAC still work.
5. **`noImplicitAny: false`** is temporary from v2.4.3 — do not add more `: any` without a reason; prefer Prisma generated types. Phase 4 flips it back on.
6. **The `scripts/` folder is excluded from TS compilation** — add new scripts there freely, don't worry about strict typing.

---

## Key Test Accounts

Use these for self-testing and seeding (see `scripts/seed.ts`):
- **Jon** (owner/admin): `jon@colab.la` / `cmo1kgydf00o4sz086ffjsmp1`
- **Jaron** (local user, same-instance peer): `jaronrayhinds@gmail.com` / `cmo1milx900g9o408deuk7h2f`
- **Alvaro / FVP** (federated peer): `alvaro@fractionalventure.partners` / `cmo1n6psb023co408ikcsw7xb`

Test prompts for Divi are in `public/docs/self-test-prompts.md`.

---

## How to Test (per `.project_instructions.md`)

**Automated** (what Divi can verify via action tags):
- Tag firing: relay_request, relay_respond, relay_ambient, task_route, etc.
- API-level state: relay status, connection scopes, card creation
- Prompt compliance: whether Divi emits tags
- Federation push/ack round-trips (visible in sweep cron logs)

**Manual** (requires Jon or a second session):
- UI rendering (colors, layout, modals)
- Dismiss button clicks and other gestures
- Receive-side verification (what Jaron or FVP sees)
- Page navigation, tab switching

**Use natural language for Divi self-tests. Never paste literal `[[tag:{...}]]` syntax into a prompt** — when Divi sees her own syntax in input, she says "Fired" without emitting.

---

## The Hallucination Trap (extremely important)

From session 3.3.1 learning, baked into `.project_instructions.md`:

When Divi reports "duplicate emission", "second fire failed", "contradictory results", or quotes a `cmo...` ID:
1. **Check the DB FIRST.** Use `scripts/check_federation_scope.ts` or add a new `scripts/check_*.ts` query.
2. Every single time this has been reported, the root cause was Divi hallucinating — NOT a real bug in the emission layer.
3. Defense layers are in place (`SUMMARY_PATTERNS` in action-tags.ts, system prompt ban, purge_polluted script). Trust them.

**Translation for cleanup sprint**: Do not refactor code based on Divi's self-diagnosis. Refactor based on actual code inspection + DB state.

---

## Recommended First Actions (in order)

1. **Read `CLEANUP_ROADMAP.md`** cover to cover. Understand the 6 phases.
2. **Read this handoff doc** (you're doing it now).
3. **Read `.project_instructions.md`** in the project root — it has architectural context not repeated here.
4. **Confirm Jon's intent for Phase 1**:
   > "Ready to execute the cleanup sprint? Starting with Phase 1 (safety net: test harness + 20 critical-path tests + prompt token metering). Estimated 6–8 hours. Nothing visible changes to the product. Confirm?"
5. **If Jon confirms, execute Phase 1 in order**:
   - 1.1 install vitest + setup
   - 1.2 write 20 tests (group by the 5 target files)
   - 1.3 add prompt token metering
6. **Build, checkpoint, commit, push, deploy** after Phase 1 is complete.
7. **Report back** with what shipped + what Phase 2 will touch.

---

## Anti-Patterns (don't do these)

- **Don't run `test_nextjs_project`** — it OOMs. Go straight to `build_and_save_nextjs_project_checkpoint`.
- **Don't stack multiple roadmap phases in one session.** Ship Phase N fully, then start Phase N+1.
- **Don't change behavior during cleanup phases.** If a test fails because output changed, the refactor is wrong.
- **Don't add new features during cleanup.** Jon has v2.4.7 queued — it waits until cleanup is done.
- **Don't introduce new dependencies without asking.** Check `package.json` first. The project uses yarn; tests use vitest (to be added in Phase 1.1).
- **Don't skip the commit+push+deploy loop after each phase.** The deployed app is a checkpoint for rollback.
- **Don't try to fix everything in one pass.** The roadmap is phased for a reason. 232 `: any` annotations don't get fixed in one session.

---

## Tools You Will Use Most

- `grep` for finding code patterns (not bash grep — the tool)
- `batch_file_read` with `start_line`/`end_line` for scoped reads
- `file_edit_lines` for line-based edits (required for `ChatView.tsx`)
- `file_str_replace` for surgical edits elsewhere
- `bash` for running yarn, tsx scripts, git ops
- `build_and_save_nextjs_project_checkpoint` after every phase
- `deploy_nextjs_project` after every phase (untagged, updates both hostnames)

---

## When to Stop and Ask

- A phase is taking 2x longer than estimated — reassess scope with Jon
- You find bugs in working code while refactoring — flag them, don't silently fix (could change behavior)
- A test you write reveals an existing bug — flag it, get guidance on priority
- Jon pushes back on the roadmap — defer to him; the roadmap is a recommendation, not a mandate
- You're about to modify `.abacus.donotdelete` — NEVER. System-maintained.
- You're about to run `git reset --hard`, `git filter-repo`, or `git push --force` — NEVER. Breaks checkpointing.

---

## Contact Points for the Next Agent

- **Architectural questions**: read `.project_instructions.md` first. It has ~20 sections covering relay system, federation, prompt groups, etc.
- **Historical context**: `TRANSITION_v2.4.2.md`, `TRANSITION_v2.4.1.md`, `TRANSITION_v2.3.2.md` are chronological handoff docs.
- **FVP integration**: `public/docs/fvp-cross-operability-v2.2.md` is the canonical spec. Reply docs are in `/home/ubuntu/dividen_command_center/FVP_REPLY_BUILD_*.md`.
- **Audit context**: this handoff + `CLEANUP_ROADMAP.md` — everything relevant is here.

---

## Final Note

The platform works. It's secure. It's functional. The cleanup sprint is about future-proofing for IgnitedOS multi-instance deployment and making the codebase something someone other than Jon can contribute to without a month of onboarding. Don't over-engineer. Don't add abstractions speculatively. Match the existing code style. Ship mechanical refactors that are obviously correct.

Good luck.
