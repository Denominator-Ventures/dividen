# DiviDen Command Center — Cleanup & Hardening Roadmap

**Source**: Full project assessment performed April 21, 2026 (after v2.4.6 ship)
**Baseline**: 110,374 LOC TypeScript, 424 files, 71 Prisma models, 239 API routes, zero tests
**Status**: Platform is functional and secure. Structural debt is the #1 risk to future velocity.

---

## Guiding Principles

1. **Mechanical refactors before feature work.** Every new feature added to the current structure increases the cost of cleanup later.
2. **Tests before refactors.** The action-tags file cannot be safely split without a safety net.
3. **Additive > invasive.** Match the pattern used for database migrations — keep old paths working while new ones roll in.
4. **One phase at a time.** Finish, checkpoint, deploy, verify. Don't stack phases.
5. **No behavior changes in cleanup phases.** If output differs, it's a bug.

---

## Phase 1 — Safety Net (Must Fix, blocks all other work)

**Goal**: Make refactoring safe. No visible product changes.
**Estimated effort**: 6–8 hours
**Risk if skipped**: Every subsequent refactor is a blind bet.

### 1.1 — Integration test harness
- Install `vitest` + `@vitest/coverage-v8`
- Add `test` + `test:watch` scripts to `package.json`
- Create `src/__tests__/setup.ts` with Prisma test-client configuration
- Seed a known-good test user in `beforeAll`, clean in `afterAll`
- **Acceptance**: `yarn test` runs in CI-like mode, completes in < 30s

### 1.2 — Critical-path tests (20 tests, 5 files)
Cover these paths end-to-end:
- `chat/send` → message saved, prompt built, LLM called (mocked), response streamed
- `relay_request` action tag → AgentRelay created, federation push attempted
- `relay_respond` action tag → relay status updated, ack pushed if federated
- `federation-push.pushRelayToFederatedInstance` → outbound HMAC header, retry logic
- `cron/sweep` → 8 checks execute, stale rows processed, telemetry purged
- **Acceptance**: All 20 tests green, coverage ≥ 40% on these 5 files

### 1.3 — Prompt token metering
- Add `estimateTokens(text: string)` helper in `src/lib/prompt-guard.ts` (use `Math.ceil(chars/4)` — cheap, close enough)
- Log `[prompt] user=X tokens≈Y groups=[...]` on every `chat/send` call
- Add admin telemetry tab row: "avg prompt tokens / user / 24h"
- **Acceptance**: Every chat request logs its prompt size; admin dashboard shows per-user averages

---

## Phase 2 — Structural Refactor (Must Fix, compounds value)

**Goal**: Break the god files. No logic changes.
**Estimated effort**: 6–10 hours
**Prerequisite**: Phase 1 complete

### 2.1 — Split `action-tags.ts` (3,466 → ~200 lines + 68 handler files)
- Create `src/lib/tags/` directory
- Each `case` branch → `src/lib/tags/<tag-name>.ts` exporting `{ name, execute }`
- `action-tags.ts` becomes a registry: imports all handlers, builds `TAG_REGISTRY: Record<string, TagHandler>`
- `executeActionTags()` looks up `TAG_REGISTRY[tag.name]` and calls `.execute(params, userId)`
- Keep `parseActionTags()`, `stripActionTags()`, `sanitizeAssistantContent()` in the root file
- **Acceptance**: All Phase 1 tests still green. No runtime behavior change. `action-tags.ts` under 250 lines.

### 2.2 — Split `system-prompt.ts` (2,010 → ~400 lines + 11 group files)
- Create `src/lib/prompt-groups/` directory
- Each group (identity, state, conversation, people, memory, schedule, relay, etc.) → its own file exporting `buildGroup(ctx): Promise<string>`
- `system-prompt.ts` becomes orchestrator: relevance scoring + group assembly
- **Acceptance**: Output identical to pre-split (byte-for-byte on the same input). Verified via snapshot test.

### 2.3 — Extract hardcoded content from `updates.ts` (4,055 lines)
- Move `UPDATES` array content to `data/updates.json`
- `updates.ts` reduces to: type definitions + `import UPDATES from '../../data/updates.json'` + sort/filter utilities
- Same treatment for `release-notes/page.tsx` (2,978 lines) — load JSON, render
- **Acceptance**: Release notes page renders identically. `updates.ts` under 100 lines.

---

## Phase 2.5 — Chat UX Polish (Should Fix, audit-driven)

**Goal**: Ship four small streaming-UX wins surfaced by the chat-sdk.dev audit (April 22, 2026). Cheap, isolated, high-visibility. Do before the ChatView decomp so the behavior baseline is in place when we refactor.
**Estimated effort**: 2–3 hours
**Prerequisite**: Phase 2 complete ✅

### 2.5.1 — Markdown healing during streaming
- `renderMarkdownLite()` in `ChatView.tsx` currently dumps whatever the LLM has streamed so far. Mid-word, `**bold` with no closer, unterminated `` ` `` inline code all flash broken.
- Add a `healStreamingMarkdown(text: string): string` helper that auto-closes the minimum set of unbalanced tokens (`**`, `_`, `` ` ``, ``` ``` ```) for the *streaming* view only. Final saved message uses raw text unchanged.
- Apply ONLY to the streaming bubble (line ~968 of `ChatView.tsx`), not to persisted messages in history.
- **Acceptance**: Paste a 400-char LLM response with bold/italic mid-word — no "flash of raw asterisks" during stream. Final message renders identically to pre-change.

### 2.5.2 — Table buffering during streaming
- GFM tables emit as `| a | b |\n|---|---|\n| 1 | 2 |`. During stream, the first line arrives before the separator, so the table flashes as pipe-delimited text.
- In `healStreamingMarkdown()` (same helper), detect a potential table header (line starts with `|` and has ≥ 2 pipes) that is NOT yet followed by a separator line, and suppress rendering of the orphaned header until the separator arrives.
- **Acceptance**: Prompt Divi for a markdown table. No "raw pipes flash" before the separator lands. Final table renders.

### 2.5.3 — First-chunk placeholder polish
- Current "streaming indicator" is a dot when `isStreaming && !streamingContent` (line ~983). Replace with a soft-toned one-liner that adapts to mode:
  - Default: `"Thinking…"`
  - When `catchUpMode`: `"Gathering context…"`
  - When a prior message's last action tag fired background work: (future, out of scope)
- **Acceptance**: Chat shows a one-line placeholder instead of a naked dot until the first real token arrives.

### 2.5.4 — (Deferred) Typed LLM errors + `Retry-After`
- Moved to **Phase 4** where it fits naturally with error-class refactoring.

**Items explicitly skipped from the audit**:
- Durable workflow sessions (architecture mismatch — we don't use Vercel Workflow)
- JSX card DSL (existing widget system works; too much refactor)
- Concurrency strategies (we're already serialized per-tab)
- Catch-all tag handler (no demand)

---

## Phase 3 — Component Decomposition (Should Fix, UX impact)

**Goal**: Make the 4 largest React components maintainable.
**Estimated effort**: 4–6 hours
**Prerequisite**: Phase 2 complete (so mental model is clean)

### 3.1 — Split `ChatView.tsx` (1,872 → ~400 + 6 sub-components)
Extract into `src/components/dashboard/chat/`:
- `ChatInput.tsx` — textarea + send button + widget toggles
- `MessageList.tsx` — virtualized list of messages
- `MessageBubble.tsx` — single message (already exists inline, extract it)
- `RelayCard.tsx` — purple/green/amber relay result cards
- `TagResultCard.tsx` — action tag execution results
- `ProjectInviteCard.tsx` — the v2.1.3 dedicated invite result card
- **Acceptance**: `ChatView.tsx` under 500 lines. No visual change. All chat flows work.

### 3.2 — Split `MarketplaceView.tsx` (2,089 lines) and `admin/page.tsx` (2,156 lines)
- MarketplaceView → `BubbleStore/`, `AgentCard/`, `CategoryFilter/`, `InstallModal/`
- Admin → already has tab components; extract remaining inline logic to hooks
- **Acceptance**: Each resulting file under 600 lines.

### 3.3 — Centralized API client
- Create `src/lib/api-client.ts`:
  ```ts
  export const api = {
    kanban: { getCards, moveCard, ... },
    relays: { send, respond, dismiss, ... },
    ...
  }
  ```
- Each domain is a module with typed functions using a shared `request<T>()` helper
- `request()` handles auth header, JSON parsing, error classes (`ApiError`, `AuthError`, `NetworkError`)
- Migrate top 20 fetch call sites first (the hot paths). Leave the long tail for later.
- **Acceptance**: Top 20 components use `api.*` instead of raw `fetch()`. No duplicate error handling.

---

## Phase 4 — Type Safety Restoration (Should Fix, prevents bug class)

**Goal**: Turn `noImplicitAny` back on.
**Estimated effort**: 3–5 hours
**Prerequisite**: Phase 2 (god files split — impossible before)

### 4.1 — Re-enable `noImplicitAny`
- Flip `noImplicitAny: true` in `tsconfig.json`
- Fix errors file-by-file. Batches:
  - Batch A: `src/lib/*` (232 `: any` occurrences)
  - Batch B: `src/app/api/**/*.ts`
  - Batch C: `src/components/**/*.tsx`
- Replace `: any` with Prisma-generated types where the data comes from Prisma
- For genuinely polymorphic data (e.g., action tag params), use typed discriminated unions
- **Acceptance**: `yarn tsc --noEmit` exits 0 with strict mode.

### 4.2 — Remove `as any` casts
- 39 casts in `src/lib/` alone. Each one is a bug waiting to happen.
- Fix the root type (usually a Prisma relation or JSON field) instead of casting.
- **Acceptance**: Zero `as any` in `src/lib/`. Components may retain a few for third-party library interop.

### 4.3 — Typed error taxonomy (audit-driven, from chat-sdk.dev)
- Add `src/lib/errors.ts` with discriminated-union error classes:
  - `LLMRateLimitError(retryAfterMs?: number)` — parse `Retry-After` header from OpenAI/Anthropic/Abacus responses
  - `LLMAuthError` — 401/403 (invalid or expired key)
  - `LLMNetworkError` — fetch failure / timeout
  - `LLMProviderError` — generic 5xx
  - `TagValidationError` / `TagPermissionError` / `TagNotFoundError` — for action-tag handlers
  - `FederationHMACError` / `FederationAuthError` / `FederationScopeError`
- Teach `src/lib/llm.ts` `streamOpenAI` / `streamAnthropic` / `streamAbacus` to throw these typed errors.
- Teach `streamLLMResponse()` to respect `retryAfterMs` — when a provider returns 429, wait up to 5s before falling through to the next provider (don't burn through the user's fallback key in a hot retry loop).
- Teach action-tag handlers to throw typed errors; dispatcher in `action-tags.ts` categorizes them into `TagExecutionResult.errorCategory` so the UI can distinguish validation vs permission vs internal.
- **Acceptance**: Every provider failure in `llm.ts` surfaces a typed class; 429s respect `Retry-After`; failed tag results carry a category.

---

## Phase 5 — Performance & Observability (Nice to Improve)

**Goal**: Close the gap between "platform works" and "platform operates well at scale."
**Estimated effort**: 3–4 hours

### 5.1 — Prisma query logging consolidation
- Remove query-level logging from `src/lib/prisma.ts` (or gate it behind `PRISMA_QUERY_LOG=true`)
- Keep only `withTelemetry()` route-level logs
- **Acceptance**: TelemetryEvent write rate drops ≥ 50% under typical load.

### 5.2 — Admin dashboard for debug scripts
The 19 `scripts/check_*.ts` files indicate missing UI. Add admin tabs for:
- Recent chat messages (filterable by user)
- Recent relays (filterable by status, federation direction)
- Federation health (last heartbeat per connection, HMAC failure count)
- Queue item status distribution
- **Acceptance**: Jon can debug production issues without SSH access.

### 5.3 — Middleware-based auth gating
- Move session checks for `/api/*` to middleware (excluding explicit public routes)
- Eliminate `getServerSession` boilerplate from 163+ routes
- Auth config becomes a single source of truth: `AUTH_CONFIG: { public: [...], admin: [...], default: 'session' }`
- **Acceptance**: Routes become leaner (auth block removed). Impossible to ship an unauthenticated route by accident.

### 5.4 — Script directory cleanup
- Delete / archive: `check_alvaro.ts`, `check_duplicates.ts`, `check_invites.ts`, `check_invs2.ts`, `check_jaron_queue.ts`, `check_msgs.ts`, `check_proj_members.ts`, `check_project.ts`, `check_recent.ts`, `check_recent2.ts`, `verify_invite.ts`, `purge_polluted.ts` (one-off debug)
- Keep: `seed.ts`, `safe-seed.ts`, `setup.sh`, `setup.ps1`, `check_hmac.ts`, `check_federation_scope.ts`, `backfill_scopes.ts`
- Add `scripts/README.md` documenting each survivor
- **Acceptance**: `ls scripts/` shows ≤ 8 files, each purpose documented.

---

## Phase 6 — Quality of Life (Nice to Improve)

**Goal**: Remove paper cuts.
**Estimated effort**: 2–3 hours

### 6.1 — Consolidate auth modules
- Rename: `api-auth.ts` → `auth/api-key.ts`; `admin-auth.ts` → `auth/admin.ts`; `auth.ts` → `auth/session.ts`
- Re-export from `auth/index.ts` to avoid mass import rewrites
- **Acceptance**: Single logical home for auth. No functional change.

### 6.2 — Dedupe `FIELD_TEMPLATES`
- `src/components/settings/WebhookManager.tsx` and `src/lib/webhook-learn.ts` both define near-identical structures
- Extract to `src/lib/webhook-fields.ts` as single source of truth
- **Acceptance**: One definition, both sites import from it.

### 6.3 — Error boundaries on all dashboard tabs
- `TabErrorBoundary` already exists. Ensure every tab (center panel, admin, settings) is wrapped.
- Generic fallback UI: "This panel hit an error. [Reload] [Report]"
- **Acceptance**: Throwing an error in any tab shows the fallback, not a white screen.

---

## Out of Scope for This Roadmap

These are product decisions, not cleanup:
- v2.4.7 LLM cost controls (per-instance budgets)
- IgnitedOS multi-instance deployment wiring
- Team invite ack-back (waiting on FVP Build 543+)
- Connection invitation shareable links
- Admin UI for InstanceRegistry

---

## Suggested Execution Order

| Sprint | Phase(s) | Why |
|--------|----------|-----|
| Sprint 1 | Phase 1 (Safety Net) ✅ | Nothing else is safe without this |
| Sprint 2 | Phase 2.1 (action-tags split) ✅ | Highest leverage single change |
| Sprint 3 | Phase 2.2 + 2.3 (prompt + content split) ✅ | Unblocks type safety work |
| Sprint 4 | **Phase 2.5 (Chat UX Polish) ← NEXT** | Cheap streaming wins from chat-sdk.dev audit |
| Sprint 5 | Phase 3 (component decomposition) | Makes UX work pleasant again |
| Sprint 6 | Phase 4 (type safety + error taxonomy) | Catches bug class that currently ships to prod |
| Sprint 7 | Phase 5 + 6 (observability + QoL) | Polish; do between feature sprints |

Each sprint = one session. Each ships independently. Each is reversible.

---

## Non-Negotiables

- Every phase must pass `build_and_save_nextjs_project_checkpoint` before moving on.
- Every phase must be commit-and-pushed to `origin/main`.
- Every phase must be deployed (both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`) and smoke-tested before starting the next.
- Database schema changes remain additive-only. No `--accept-data-loss`.
- If a phase balloons beyond estimate by 2x, stop and reassess scope.
