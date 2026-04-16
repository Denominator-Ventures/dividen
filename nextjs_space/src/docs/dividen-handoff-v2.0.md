# DiviDen Handoff — v2.0.3

> Written April 15, 2026. Supplements the Project Bible (`src/docs/dividen-project-bible.md`).
> Read both documents before making any changes.

---

## What This Document Is

This is a state transfer for the next development conversation. It covers what was built in the v2.0 cycle, what's queued up next, decisions that were made and why, and landmines to avoid. The Project Bible covers architecture and conventions. This document covers *momentum*.

---

## What Shipped in v2.0 (This Conversation)

### v2.0.0 — Catch-up Pipeline v2 + Onboarding Fixes
- Rewrote `src/lib/catch-up-pipeline.ts` — 6-source aggregation (cards, queue, comms, activity, calendar, email) with priority scoring and digest compilation
- Fixed onboarding flow edge cases

### v2.0.1 — Username System
- Added `username` field to User model (unique, optional)
- Username input on signup form with real-time availability check via `GET /api/username/check?username=x`
- Display names throughout dashboard respect username when set

### v2.0.2 — Federation Mentions API
- `POST /api/v2/federation/mentions` — cross-instance mention resolution
- Updated FVP integration guide to v2.0.2 (added clickable mentions as Section 6)
- Renumbered guide to 14 sections

### v2.0.3 — MentionText Component + Notification Center v2
- **`src/components/MentionText.tsx`** — shared component that parses `@userId` patterns, bulk-resolves via `/api/users/resolve`, renders clickable spans with tooltips
- Wired MentionText into ChatView, QueuePanel, CommsTab, NotificationCenter
- **`POST /api/users/resolve`** — takes `{ userIds: string[] }`, returns map of `{ [id]: { name, username } }`
- **Notification Center v2** — severity tiers (critical/warning/info), snooze/dismiss/mark-read, mention highlighting, federation relay notifications
- **Federation endpoints** added: `POST /api/v2/federation/notifications` (relay), `POST /api/v2/federation/connect` (instance registration)

### Rename: Inbox Zero → ZerQ
- "Inbox Zero" was the empty state name for the queue. Renamed to **ZerQ** because it's a queue, not an inbox.
- Changed in: QueuePanel.tsx (UI), updates.ts (changelog), catch-up-pipeline.ts (email context changed to "All clear"), project bible
- **IMPORTANT**: Never call this "Inbox Zero" in any future work. The branded name is ZerQ.

### Documentation Sprint
- `src/app/documentation/page.tsx` — Added Usernames & @Mentions section, Notification Center v2 section, 5 new API endpoints
- `src/app/docs/developers/page.tsx` — Added Username System, @Mentions & Resolution, Federation Mentions API, Notification Center sections + 3 new federation endpoints
- `src/app/docs/release-notes/page.tsx` — Updated OG/meta for v2.0
- `src/lib/updates.ts` — v2.0 update post written (Identity Layer), covers all features with Dallas/Jaron acknowledgment

---

## Key Files Modified (v2.0 Cycle)

| File | What Changed |
|---|---|
| `src/components/MentionText.tsx` | NEW — shared @mention component |
| `src/app/api/users/resolve/route.ts` | NEW — bulk username resolution |
| `src/app/api/username/check/route.ts` | NEW — username availability check |
| `src/app/api/v2/federation/notifications/route.ts` | NEW — notification relay |
| `src/app/api/v2/federation/mentions/route.ts` | NEW — cross-instance mentions |
| `src/app/api/v2/federation/connect/route.ts` | NEW — instance registration |
| `src/components/dashboard/ChatView.tsx` | `renderInline` updated for @mention rendering |
| `src/components/dashboard/QueuePanel.tsx` | MentionText wired in + ZerQ rename |
| `src/components/dashboard/CommsTab.tsx` | MentionText wired in |
| `src/components/dashboard/NotificationCenter.tsx` | Full overhaul — severity, snooze, mentions |
| `src/lib/catch-up-pipeline.ts` | Rewritten — 6-source aggregation |
| `src/lib/updates.ts` | v2.0 entry + ZerQ renames |
| `src/app/documentation/page.tsx` | 2 sections + 5 endpoints added |
| `src/app/docs/developers/page.tsx` | 4 sections + 3 endpoints added |
| `src/app/docs/release-notes/page.tsx` | Meta/OG updated |
| `public/fvp-integration-guide.md` | Section 6 (clickable mentions) + renumbered to 14 |
| `src/docs/dividen-project-bible.md` | Version bump to v2.0.3, ZerQ renames |
| `prisma/schema.prisma` | `username` field on User model |

---

## What's Next (Priority Order)

These are the highest-impact items. The Project Bible has the full backlog (§ Open Areas of Work).

### 1. Homepage Improvements (Ready to Execute)
A full review was done. Here are the 10 identified improvements, roughly prioritized:

1. **Dashboard screenshot/preview** — Highest single impact. The hero has no visual of the product. Add a real screenshot or animated preview of the dashboard below the hero.
2. **Hero copy rewrite** — "The last interface" is vague. Needs to communicate what DiviDen *does* in one line. Something like "One agent. Every workflow. Zero context switching."
3. **"Who is this for" personas** — Add a section with 3-4 persona cards (founder, developer, ops lead, etc.) showing how each uses DiviDen differently.
4. **Typing phrases** — The animated typing in the hero shows generic phrases. Should show real Divi commands/interactions that demonstrate capability.
5. **Social proof / traction signals** — Any numbers, logos, quotes. Even "Built for the FVP network" counts.
6. **Problem/Solution section** — Current copy is too abstract. Needs visceral specificity — "You have 4 tools open, 12 tabs, and no idea what's urgent."
7. **Protocol stack** — The technical protocol visualization is cool but wrong audience for a landing page. Move to /docs or make it expandable.
8. **Missing "Docs" nav link** — Header has no link to documentation. Easy fix.
9. **CTA hierarchy** — Multiple CTAs competing. Should be one primary ("Get Started") and one secondary ("See the Docs").
10. **Features grid** — All features presented equally. Promote 2-3 hero features (Divi agent, Board, Comms) and demote the rest.

### 2. Bubble Store UI Rebrand
Infrastructure works but UI still says "Marketplace" everywhere. Need to rename across tab labels, component names, settings, and copy. See Project Bible § Open Areas.

### 3. ZerQ Automation
The queue empty state is branded but there's no smart automation yet. Auto-categorization, batch actions, smart snooze. See Project Bible § Open Areas.

### 4. Cross-Instance Linked Kards
Webhook architecture documented in FVP guide but not implemented. This unblocks deeper FVP integration. See Project Bible § Open Areas.

---

## Decisions & Context

### Voice & Branding
- **Jon Bradford** is the founder. All updates signed "- Jon". Direct, technical, no marketing language.
- **"The future belongs to everyone"** — closing line Jon uses in major updates.
- **Dallas meeting with Chris** — referenced in v2.0 update. Jaron acknowledged for platform support and FVP introduction.
- **FVP** = First Ventures Platform. Key federated partner. Their agent is called **MainClaw**. Integration guide at `public/fvp-integration-guide.md`.

### Technical Decisions
- **MentionText is shared** — one component used by ChatView, QueuePanel, CommsTab, NotificationCenter. Don't create per-component mention rendering.
- **Username resolution is bulk** — `/api/users/resolve` takes an array. MentionText collects all IDs first, makes one request. Don't add per-mention API calls.
- **Catch-up pipeline uses priority scoring** — items scored 0-10, sorted, grouped by source. Don't flatten into a simple list.
- **ZerQ, not Inbox Zero** — the queue is not an inbox. This naming is intentional and permanent.
- **Dark-only** — no light mode, no theme toggle, no "prefers-color-scheme" detection.

### Build & Deploy
- Skip `test_nextjs_project` (TSC OOMs) → go straight to `build_and_save_nextjs_project_checkpoint`
- Deploy updates both `dividen.ai` and `sdfgasgfdsgsdg.abacusai.app` (both untagged, one deploy call)
- After deploy: `git add -A && git commit -m "description" && git push origin main`
- Database is shared dev/prod — all schema changes must be additive

### Accounts
- Test: `john@doe.com` / `johndoe123`
- Admin: `admin@dividen.ai`

---

## Landmines

1. **TSC OOM** — TypeScript compiler runs out of memory. Don't try to fix this by running tsc manually. Just skip `test_nextjs_project` and use `build_and_save_nextjs_project_checkpoint` which uses the Next.js build (works fine).
2. **Prisma schema is ~2,200 lines with ~55 models** — large. Search before adding new models to avoid duplication.
3. **`--accept-data-loss` will destroy production data** — the database is shared. Never use this flag without explicit user confirmation.
4. **Custom events** — dashboard components communicate via `dividen:*` DOM events. If you add a new data source, make sure the relevant refresh event is dispatched.
5. **Widget theming** — widgets use CSS custom properties from `widget-theme.css`. Never hardcode colors in widget components.
6. **Action tags** — Divi's responses contain `[[tag:params]]` markup. `action-tags.ts` parses these. If you add a new agent capability, you probably need a new action tag.
7. **seed.ts uses upsert** — never add delete commands. Database is shared with production.

---

## First Steps for Next Conversation

1. Read `.project_instructions.md` (project root) — accumulated design decisions and preferences
2. Read `src/docs/dividen-project-bible.md` — architecture, conventions, systems overview
3. Read this file — what just shipped, what's next, what to avoid
4. Ask Jon what he wants to work on. The homepage improvements are ready to execute if he wants visible impact fast.
