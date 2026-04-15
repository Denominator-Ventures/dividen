# DiviDen Command Center — Conversation Transition Document

**Date**: April 15, 2026  
**Current version**: v1.8.3  
**Latest commit**: `e7b8059` on `main` (after this session deploys, check git log for the newest)  
**Deployed at**: `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`  
**GitHub**: `https://github.com/Denominator-Ventures/dividen.git`  
**Project path**: `/home/ubuntu/dividen_command_center` (app code in `nextjs_space/`)

---

## 1. What This App Is

DiviDen is an agentic working protocol / command center. It's a Next.js 14 app (App Router, dark-only theme, CSS variables design system) with:

- **Divi** — an AI work partner with a modular system prompt (17 prompt groups, relevance-scored)
- **Kanban board** with Board Cortex intelligence layer (stale detection, dedup, auto-escalation)
- **Queue system** with confirmation gate, CoS (Chief of Staff) execution engine
- **Federation protocol** — instances connect, sync agents/capabilities, marketplace
- **Marketplace** — agents + capabilities, revenue split (97/3), access passwords
- **A2A protocol** (Google spec), MCP server, agent discovery
- **Onboarding** — project-based, conversational setup flow
- **Teams, invites, projects, contacts/CRM, calendar, email integration**

## 2. Build/Deploy Workflow

**CRITICAL RULES**:
- Use `yarn` only (never npm/npx)
- Skip `test_nextjs_project` — TSC runs out of memory on this codebase. Go straight to `build_and_save_nextjs_project_checkpoint`
- After every successful build: `deploy_nextjs_project` → `git add -A && git commit -m "message" && git push origin main`
- Both hostnames (`dividen.ai` and `sdfgasgfdsgsdg.abacusai.app`) are untagged — one deploy updates both

## 3. Scheduled Task — CHECK THIS

**Task ID**: 38251327  
**Name**: DiviDen Board Cortex Scan  
**Schedule**: Every 6 hours  
**What it does**: Calls `POST https://dividen.ai/api/cron/cortex-scan` with `Authorization: Bearer {ADMIN_PASSWORD}`  
**Purpose**: Runs `runBoardScan()` for all active users — detects stale cards, duplicates, deadline escalations, archive candidates. Persists `BoardInsight` records.

**Status as of last check**: Was returning 404 earlier in this conversation lineage (deployment hadn't propagated). Was confirmed fixed after redeployment. Should be verified in the new conversation — check the task logs or trigger a manual test.

**Manual trigger**: There's also a "🧠 Run Cortex Scan" button on the Kanban board toolbar that hits `POST /api/board/cortex` (user-scoped, session auth).

## 4. Key Architecture Files

| File | Purpose |
|------|--------|
| `src/lib/system-prompt.ts` | Modular system prompt — 17 groups, relevance scoring, capability modules |
| `src/lib/capability-module.ts` | CapabilityModule interface, scoring, loading, prompt injection |
| `src/lib/board-cortex.ts` | Board intelligence — stale/dedup/escalation detection |
| `src/lib/action-tags.ts` | 29+ action tags Divi can execute from chat |
| `src/lib/now-engine.ts` | NOW panel priority scoring |
| `src/lib/card-links.ts` | Linked Kards v2 — auto-linking, status propagation, cross-user mirroring |
| `src/lib/updates.ts` | Updates page content (add new entries to top of array) |
| `src/lib/prisma.ts` | Singleton Prisma client with telemetry |
| `src/lib/auth.ts` | NextAuth config |
| `prisma/schema.prisma` | Database schema |
| `scripts/seed.ts` | Database seed (upsert, no deletes) |

## 5. Federation Endpoints

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/v2/federation/register` | POST | Instance registration → `pending_review` |
| `/api/v2/federation/heartbeat` | POST | Instance heartbeat |
| `/api/v2/federation/agents` | POST | Bulk agent sync (accepts `pricePerTask`/`pricingAmount`/`price` aliases, `accessPassword`, `currency`, nested `capabilities`) |
| `/api/v2/federation/agents/{remoteId}` | PUT/GET/DELETE | Single agent CRUD |
| `/api/v2/federation/capabilities` | POST | Capability sync |
| `/api/v2/federation/capabilities` | GET | List instance capabilities |
| `/api/v2/federation/marketplace-link` | POST | Link marketplace |
| `/api/v2/federation/validate-payment` | POST | Payment validation |

## 6. Naming Conventions (Canonical)

| DiviDen canonical | Accepted aliases | Notes |
|-------------------|-----------------|-------|
| `pending_review` | (none) | All submissions use this, not `pending_approval` |
| `per_task` | `per_execution` | Normalized on ingest |
| `pricePerTask` | `pricingAmount`, `price` | String→float coercion applied |
| `currency` | — | Default `USD`, ISO 4217 |

## 7. FVP Integration Status

- **FVP Command Center** is the first federated instance
- **Spec version**: v1.3 (April 14, 2026) — fully aligned with DiviDen
- **mAInClaw** is their agent (Writing category, $5/task, accessPassword: "freeme")
- **Jaron** is the primary contact on the FVP side
- **No auto-approve** — even trusted instances go through `pending_review`
- **No `/api/v2/federation/profiles` endpoint** — developer profiles are derived from agent sync data at `/developer/{slug}`

## 8. Documentation Pages

| Page | Path | Lines | Download |
|------|------|-------|----------|
| Developer Docs | `/docs/developers` | ~1,850 | ✅ .md download at bottom |
| Documentation | `/documentation` | ~1,140 | ✅ .md download at bottom |
| Federation Guide | `/docs/federation` | ~810 | ✅ .md download at bottom |
| Integration Docs | `/docs/integrations` | ~345 | ✅ .md download at bottom |
| Release Notes | `/docs/release-notes` | ~1,675 | ✅ per-version + full page |
| Updates | `/updates` | via `src/lib/updates.ts` | Content in data file |

Doc pages use `UpdatedBadge` component (amber "UPDATED" / green "NEW") on recently changed sections. Add `badge={<UpdatedBadge date="..." />}` to any `<Section>` when updating.

## 9. Download Components

| Component | Path | Purpose |
|-----------|------|--------|
| `DocDownloadButton` | `src/components/docs/DocDownloadButton.tsx` | DOM→markdown converter + download trigger + `UpdatedBadge` |
| `DocFooterDownload` | `src/components/docs/DocFooterDownload.tsx` | Footer section wrapper with download button |

Uses `data-doc-content` on page containers and `data-no-download` on elements to skip (nav, footer, buttons).

## 10. Version History (This Session Lineage)

| Version | Commit | What |
|---------|--------|------|
| v1.6.1 | `a867dd8` | CapabilityModule Phase 2, webhook receiver, 97/3, prompt-groups API |
| v1.6.2 | `bf104e3` | Approval hardening, audit trail, admin notifications |
| v1.7.0 | `ad86d9c` | FVP spec alignment — pricing normalization, auto-approve removal, developer links, currency |
| v1.8.0 | `2e05eb0` | P3: federation capabilities endpoint, federated developer profiles |
| v1.8.1 | `66d089a` | Fix federation price passthrough + accessPassword support |
| v1.8.2 | `f19e0e2` | Release notes v1.6.1→v1.8.1, docs audit fixes |
| v1.8.3 | `e7b8059` | Doc download buttons, per-version downloads, UPDATED badges |
| v1.8.4 | (pending) | Updates page entry, transition document |

## 11. Environment

- `.env` has: `DATABASE_URL`, `NEXTAUTH_SECRET`, `ABACUSAI_API_KEY`, `ADMIN_PASSWORD` + others
- Database is shared between dev and production — be careful with schema changes
- `NEXTAUTH_URL` is auto-configured per environment — don't set manually
- `ADMIN_PASSWORD` is used for the cron endpoint auth

## 12. Style & Voice

- Dark-only theme. CSS variables design system (`--bg-primary`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-primary`)
- Brand color: `brand-400` / `brand-500` (blue)
- Font: Space Grotesk for headings, Inter for body
- Updates/communications signed "— Jon"
- Direct technical voice. No marketing fluff.
- Founder: Jon Bradford

## 13. Known Issues / Things to Watch

- **TSC OOM**: TypeScript compiler runs out of memory. Always skip `test_nextjs_project` and go straight to build checkpoint.
- **Prisma idle timeout**: DB uses short idle timeout, max 25 concurrent connections, 5s statement timeout. Handle disconnects gracefully.
- **Federation price scope bug**: The `resolvedPricePerTask` variable was scoped inside a `try` block — the `catch` fallback uses an inline IIFE to re-resolve. If touching that code, be aware of the scoping.
- **The v1.1.0 release notes block** still says `pending_approval` (line ~816 in release-notes/page.tsx) — that's historically accurate for that version, don't "fix" it.

## 14. What's Next (Roadmap)

- Cross-instance Linked Kards (federated card linking with FVP)
- Webhook/poll notification when agent approval status changes
- Semantic dedup (LLM-powered, beyond Levenshtein) for Board Cortex
- Inbox zero automation layer
- Agent versioning (agents currently update in place)

---

*This document was prepared on April 15, 2026 to hand off context to a new Abacus AI Agent conversation.*
