# DiviDen Command Center — Transition Document v2.4.1

**Date:** April 20, 2026
**Current Version:** v2.4.1
**Git HEAD:** `bb5b830` on `origin/main`
**Deployed:** Both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (latest checkpoint)
**Previous Transition Doc:** `TRANSITION_v2.3.2.md` (still valid for pre-2.3.2 context)

---

## 1 — What DiviDen Is

DiviDen Command Center is an AI-powered operational cockpit for solo operators and small teams. The core loop: a user (Jon) talks to Divi (the AI agent), Divi takes actions (routes tasks, sends relays, manages projects, updates boards), and everything flows through a four-signal pattern (DB write → QueueItem → AgentRelay → CommsMessage). The platform federates with other DiviDen instances (currently FVP) via a relay protocol with scope routing and HMAC signing.

**Owner:** Jon Bradford (`jon@colab.la`). Direct, technical, no marketing fluff. Prefers scannable responses with `###` headers.

---

## 2 — Environment & Constraints

### Build
- **Project path:** `/home/ubuntu/dividen_command_center` (NEVER use `nextjs_space` as `project_path` in tool params)
- **Skip `test_nextjs_project`** — TSC OOMs on this codebase. Use `build_and_save_nextjs_project_checkpoint` directly.
- For manual type-checking: `cd nextjs_space && NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit --skipLibCheck`
- **yarn only** — never npm/npx for installs

### Deploy
- Both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` are **untagged** — one `deploy_nextjs_project` call updates both simultaneously
- After deploy: commit + push to `origin` (GitHub PAT auth configured)

### Git
- Remote: `origin` → `github.com/Denominator-Ventures/dividen.git`
- Always commit + push after deploying

### Theme
- **Dark-only.** No light mode. No toggle.

### Database
- Shared dev/prod PostgreSQL via Prisma
- **All schema changes MUST be additive** — never `--accept-data-loss`
- Connection limit: 5 (set in `prisma.ts`), max 25 concurrent on the DB
- 72 models in `schema.prisma` (2238 lines)

### Env Vars (keys present, values redacted)
```
ABACUSAI_API_KEY, ADMIN_PASSWORD, AWS_BUCKET_NAME, AWS_FOLDER_PREFIX,
AWS_PROFILE, AWS_REGION, DATABASE_URL, GEMINI_API_KEY, GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET, MARKETPLACE_FEE_PERCENT, NEXTAUTH_SECRET,
NOTIF_ID_CONNECTION_INVITATION, STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY,
WEB_APP_ID
```

---

## 3 — Architecture Overview

### Core Files (by size/importance)
| File | Lines | Role |
|------|-------|------|
| `src/lib/action-tags.ts` | 3466 | All AI action tag definitions + execution |
| `prisma/schema.prisma` | 2238 | 72 models |
| `src/lib/system-prompt.ts` | 1989 | Dynamic system prompt (17 groups, conditional loading) |
| `src/components/dashboard/ChatView.tsx` | 1872 | Core chat UI — relay resolution, widgets, onboarding |
| `src/lib/federation-push.ts` | 416 | 3 outbound federation functions |
| `src/lib/federation-hmac.ts` | 51 | HMAC-SHA256 sign + verify |

### Pages (22 total)
```
/ (landing), /login, /setup, /dashboard, /dashboard/comms,
/admin, /settings, /profile/[userId], /team/[id],
/team/invite/[token], /updates, /terms, /privacy,
/docs/release-notes, /docs/federation, /docs/developers,
/docs/integrations, /docs/relay-spec,
/docs/project-invites-integration, /documentation,
/developer/[slug], /open-source
```

### API Routes (~80+ endpoints)
Grouped under:
- `/api/auth/`, `/api/chat/`, `/api/board/`, `/api/queue/`
- `/api/connections/`, `/api/comms/`, `/api/contacts/`
- `/api/relays/`, `/api/teams/`, `/api/projects/`
- `/api/federation/` (inbound relay, notifications, relay-ack)
- `/api/v2/` (external API: connections, relay, federation, network, kanban, queue, shared-chat)
- `/api/webhooks/`, `/api/webhooks-management/`
- `/api/admin/`, `/api/stripe/`, `/api/cron/`

### Components (84 .tsx files)
Key dashboard components: `ChatView`, `NowPanel`, `CenterPanel`, `QueuePanel`, `CommsTab`, `MarketplaceView`, `CapabilitiesMarketplace`, `ContactDetailModal`, `WebhookManager`

### Scripts (17 diagnostic/seed scripts)
```
scripts/seed.ts              — DB seeding (users, marketplace agents)
scripts/check_federation_scope.ts — Verify relay scope propagation
scripts/check_hmac.ts         — 13-point HMAC self-test suite
scripts/check_recent2.ts      — Recent activity audit
scripts/check_duplicates.ts   — Duplicate emission detector
scripts/purge_polluted.ts     — Clean hallucinated content from chat history
```

---

## 4 — Version History (v2.3.2 → v2.4.1)

### v2.3.2 — Multi-Tenant Relay Wire (April 18, 2026)
- `teamId` + `projectId` propagate end-to-end on every relay and notification
- Outbound mutation → federation wire → inbound handler → persisted row → gating cascade → UI chips
- Inbound scope validated against local rows; unknown IDs → silent drop + `scopeDropped` echo
- Project → team inheritance (peer sends only `projectId`, we auto-resolve `teamId`)
- Ambient gates accept object form `{ topic?, projectId?, teamId? }`
- UI: QueuePanel + CommsTab render scope chips (📁 emerald for project, 👥 sky for team)

### v2.3.3 — Comms Threading Scope Parity (April 18, 2026)
- Scope chips in thread list, thread header, per-relay bubbles, mobile overlay
- Matches QueuePanel chip pattern byte-for-byte

### v2.3.4 — Team Invites Four-Signal (April 18, 2026)
- `POST /api/teams/[id]/invites` → TeamInvite + QueueItem + AgentRelay + CommsMessage + federation push
- Accept/decline stamps paired AgentRelay, deletes pending QueueItem, writes round-trip CommsMessage
- `force:true` duplicate-reinvite logic

### v2.3.5 — Role Changes Four-Signal (April 19, 2026)
- `PATCH /api/projects/[id]/members` + `PATCH /api/teams/[id]/members`
- Emits DB update + QueueItem + AgentRelay + dual CommsMessage
- Federation: `pushNotificationToFederatedInstance` (informational, no ack)

### v2.4.0 — HMAC-SHA256 Enforcement (April 19, 2026)
- `federation-hmac.ts`: `signPayload()` + `verifyHmac()` (timing-safe)
- `Connection.hmacEnabled Boolean @default(false)` — per-connection feature flag
- All 4 outbound fetch sites use `federationHeaders()` helper
- 3 inbound routes verify HMAC when enabled (401 on failure)
- `federationToken` serves dual duty: bearer token + HMAC key
- Self-test: `npx tsx -r dotenv/config scripts/check_hmac.ts`

### v2.4.1 — Bug Fixes + Bubble Store Merge (April 20, 2026)
- **Inbox context fix**: system prompt loads inbox data on `capabilities_triage` (not just `schedule`); includes recent emails even when inbox is zero
- **Discover page fix**: Prisma query crash resolved
- **Bubble Store**: Capabilities tab merged into MarketplaceView; settings link updated

---

## 5 — Four-Signal Pattern (Complete)

Every significant action emits four records:
1. **DB write** (the entity itself)
2. **QueueItem** (actionable task)
3. **AgentRelay** (cross-instance wire)
4. **CommsMessage** (user-visible notification)

Plus federation push when the recipient is on another instance.

**Coverage:**
| Signal | Version |
|--------|---------|
| Task routing | v2.1.2 |
| Project invites | v2.3.1 |
| Team invites | v2.3.4 |
| Role changes | v2.3.5 |

---

## 6 — Federation Architecture

### Push Functions (`federation-push.ts`)
- `pushRelayToFederatedInstance(connectionId, payload)` — relay with ack loop
- `pushRelayAckToFederatedInstance(connectionId, payload)` — completion/decline ack
- `pushNotificationToFederatedInstance(connectionId, notification)` — lightweight notification

All three conditionally add `x-federation-hmac` header when `hmacEnabled` is true.

### Inbound Endpoints
- `POST /api/federation/relay` — receives relays, validates scope, creates local records
- `POST /api/federation/notifications` — receives notifications, dual wire-shape support
- `POST /api/federation/relay-ack` — receives completion/decline acks, advances queue items

### HMAC (v2.4.0)
- Header: `x-hmac-sha256`
- Key: connection's `federationToken`
- Feature-flagged per connection (`hmacEnabled` boolean)
- Currently **OFF** for FVP connection (they don't know about it yet)

### Scope Routing
- Advisory, not strict — unknown scope IDs get silently dropped + `scopeDropped` echo
- Project → team inheritance (auto-resolve)
- No cross-instance team graph (no mapping tables needed)

### Instance Registry (`InstanceRegistry` model)
- Field is `baseUrl` (NOT `url`) — confirmed correct in all production queries
- Tracks: `platformLinked`, `platformToken`, `marketplaceEnabled`, `discoveryEnabled`, `updatesEnabled`, `version`, `userCount`, `agentCount`, `lastSyncAt`, `operatorName`, `operatorEmail`
- Entities without `operatorName` are hidden from directory

---

## 7 — FVP Integration Status

### Current State
| Item | Status |
|------|--------|
| FVP Connection | ✅ Active, `isFederated=true`, `hmacEnabled=false` |
| Scope compliance (both sides) | ✅ FVP Builds 538+539 shipped |
| All 3 clarifies resolved | ✅ Advisory routing, no mapping table, QueueItem invites |
| FVP's 4 asks from us | ✅ All confirmed |
| HMAC (our side) | ✅ Built + flagged off |
| FVP knows about HMAC | ❌ Covered in parked reply doc |
| Invite ack-back (FVP → us) | ⏳ Waiting on FVP to ship |
| `FVP_REPLY_BUILD_539_v2.md` | 📄 Ready for Jon to send to Alvaro |
| Live handshake test | ❌ Blocked on HMAC coordination |

### FVP Build Plan (their side)
- **Build 537** — Inbound relay compliance (`introduce` + `project_invite`)
- **Build 538** — Scope ingest (teamId/projectId destructure, validate, `scopeDropped`)
- **Build 539** — Accept/decline lifecycle + relay-ack push + outbound scope
- **Build 540** — Outbound project-invite POST with `$transaction`
- **Build 541** — Chat tags (accept_invite, decline_invite, invite_to_project)
- **Build 542** — UI surfaces
- **Build 543+** — Track our team invites + role changes

### FVP Clarifies (All Resolved)
- §4.1 `scope_resolution_failed` back-channel → YES (we ingest as notification)
- §4.2 `teamAlias`/`projectAlias` mapping table → NO (single-operator)
- §4.3 Orphaned card on peer revoke → ORPHAN + RELAY (keep visible, emit `project_revoked`)

### Key FVP IDs
- Alvaro/FVP user: `cmo1n6psb023co408ikcsw7xb` (`alvaro@fractionalventure.partners`)
- FVP instance: `cmo2bu3oq0002rx08c9pbqere`
- Our instance: `cmo2bx2nb0001t2bbs8j75id8`

### Parked Documents
- `/home/ubuntu/dividen_command_center/FVP_REPLY_BUILD_539_v2.md` — **Ready to send** (confirmation + HMAC announcement + ack-back timeline ask)
- `/home/ubuntu/dividen_command_center/FVP_REPLY_BUILD_539.md` — Old version (superseded)

---

## 8 — Key Users & IDs

| User | ID | Email | Role |
|------|----|-------|------|
| Jon | `cmo1kgydf00o4sz086ffjsmp1` | jon@colab.la | Owner/admin |
| Jaron | `cmo1milx900g9o408deuk7h2f` | jaronrayhinds@gmail.com | Local test peer |
| Alvaro | `cmo1n6psb023co408ikcsw7xb` | alvaro@fractionalventure.partners | FVP federated peer |
| Andre | `cmo7aym7n02pzlm08ybymtzq4` | info@paia.chat | New user (inbox bug subject) |

### DB Stats (as of April 20, 2026)
- Users: 13, Projects: 12, Teams: 0
- Relays: 7 delivered, 2 expired, 11 completed, 1 agent_handling
- Federation connections: 1 (Jon ↔ FVP, active)

---

## 9 — Critical Gotchas

### Code Editing
- **ChatView.tsx**: Use `file_edit_lines` NOT `file_str_replace` — contains unicode ellipsis characters that break string matching
- **JSX emoji escapes**: Use `{'\uD83D\uDCC1 '}` pattern (string expression), NOT bare unicode in JSX text
- **Template literals in updates.ts**: Use `\`` (single backslash + backtick) for literal backticks

### Schema Field Names (Common Traps)
- `AgentRelay` uses `fromUserId` (NOT `senderId`) and requires `type` field
- `QueueItem` uses `type` field (NOT `kind`)
- `InstanceRegistry` uses `baseUrl` (NOT `url`)

### Function Signatures
- `pushNotificationToFederatedInstance(connectionId, notification)` — TWO args, notification object has `{type, fromUserName, fromUserEmail, title, body, metadata?, teamId?, projectId?}`
- `pushRelayToFederatedInstance(connectionId, payload)` — NOT just `(relayId)`

### LLM Provider
- Abacus AI (Claude) is PRIMARY — action tags don't work with GPT-4o
- Priority: Abacus Claude → User Anthropic → User OpenAI
- `max_tokens`: 8192 for Abacus

### Divi Hallucination Defense
- If Divi reports "duplicate emission", "second fire failed", "contradictory results" → **CHECK THE DB FIRST**. This is almost always hallucination, not a real bug.
- Defense layers: `SUMMARY_PATTERNS` regex strips fabricated summaries, system prompt bans fabricated results, `scripts/purge_polluted.ts` cleans corrupted chat history
- **Never paste literal `[[tag:{...}]]` syntax into user messages** — Divi will say "Fired" without executing. Use natural language.

---

## 10 — Open Roadmap

### Phase 1 — Stability (Immediate)
1. Seed a test team — Teams = 0, team features untested with real data
2. Smoke test Discover + Bubble Store v2.4.1 fixes
3. Update `.project_instructions.md` for v2.4.1 state

### Phase 2 — FVP Completion (Blocked on FVP)
1. Jon sends `FVP_REPLY_BUILD_539_v2.md` to Alvaro
2. HMAC activation — flip `hmacEnabled=true` when FVP confirms ready
3. Invite ack-back — wire into notification pipeline when FVP ships it
4. Full round-trip live handshake test

### Phase 3 — Multi-Instance Generalization
1. Audit federation code for FVP-specific assumptions
2. Self-service connection onboarding for any instance
3. Instance discovery/directory verification
4. HMAC onboarding guide for new instances
5. Federation developer docs (envelope format, scope contract, four-signal, HMAC)
6. Test with a non-FVP mock instance

---

## 11 — Reference Documents

| Document | Location | Status |
|----------|----------|--------|
| FVP Cross-Operability Guide | `public/docs/fvp-cross-operability-v2.2.md` | Current |
| FVP Integration Guide | `public/fvp-integration-guide.md` | v2.0.1 (general) |
| Self-Test Prompts | `public/docs/self-test-prompts.md` | Living doc |
| FVP Reply (ready to send) | `FVP_REPLY_BUILD_539_v2.md` | Ready |
| Previous Transition Doc | `TRANSITION_v2.3.2.md` | Valid for pre-2.3.2 |
| Seed Script | `scripts/seed.ts` | Current |

---

## 12 — How to Pick This Up in a Fresh Conversation

1. **Read this doc first** — paste it or reference it at the start of the new conversation
2. **Read `.project_instructions.md`** — it has the detailed coding constraints and patterns
3. **Check git status**: `cd nextjs_space && git log --oneline -5` to confirm HEAD
4. **Check DB health**: `npx tsx -r dotenv/config -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const u=await p.user.count();const r=await p.agentRelay.count();const c=await p.connection.count();console.log({users:u,relays:r,connections:c});await p.\$disconnect()})()"` 
5. **Check federation**: `npx tsx -r dotenv/config scripts/check_federation_scope.ts 5`
6. **Check HMAC**: `npx tsx -r dotenv/config scripts/check_hmac.ts`
7. Start with the roadmap phase that's relevant

---

## 13 — Scope Chip Color Palette (for UI consistency)

- **Project**: `text-emerald-300 bg-emerald-500/15 border border-emerald-500/30` + 📁
- **Team**: `text-sky-300 bg-sky-500/15 border border-sky-500/30` + 👥
- Chip shows last 6 chars of CUID with full ID in `title` attribute
- Pattern used in: QueuePanel, CommsTab, comms/page, comms bubbles

---

*End of transition document.*
