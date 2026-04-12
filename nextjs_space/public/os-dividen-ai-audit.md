# os.dividen.ai Content Audit

**Date:** 2026-04-12 
**Auditor:** Divi (via DiviDen Command Center) 
**Scope:** Homepage, Docs, Open Source — content/copy accuracy only 
**Reference codebase:** `dividen_command_center` @ latest checkpoint

---

## Verified Ground-Truth Numbers

| Metric | Site Claims | Actual (Codebase) | Delta |
|---|---|---|---|
| Action Tags | 44 | **45** (SUPPORTED_TAGS array in action-tags.ts) | +1 (merge_cards added) |
| System Prompt Groups | 12 | **13** (system-prompt.ts Group comments) | +1 (Group 13: Active Capabilities) |
| Prisma Models | 55 | **60** (schema.prisma `model` declarations) | +5 |
| Pipeline Stages | 10 | **10** (KANBAN_COLUMNS in types/index.ts) | ✅ Correct |
| Unique Tags (excl. aliases) | — | **42** (3 aliases: dispatch, schedule_event, add_task) | — |

### New models since "55" was written:
- `CardArtifact` — generic entity→card linking
- `CustomSignal` — user-defined webhook signals
- `SignalConfig` — per-signal enable/disable + rules
- `AmbientRelaySignal` — ambient relay signal definitions
- `AmbientPattern` — ambient pattern detection config

(Verify which 5 are net-new vs. which existed before the "55" claim was published.)

---

## Page 1: Homepage (os.dividen.ai)

### H-1 · Hero Section

**Current:** "Your AI Chief of Staff" / "DiviDen is the open-source AI operating system for solo founders, freelancers, and small teams."

**Issue:** No issue with the tagline itself, but the hero makes no mention of Signals, Capabilities, or KanbAIn — the three most recent feature verticals. A visitor's first impression is still the pre-Signals product.

**Suggested fix:** Consider adding a sub-line or rotating badge: "Now with Signals intelligence, outbound Capabilities, and KanbAIn task management."

---

### H-2 · "What is DiviDen?" Section

**Current:** "DiviDen is an open-source AI-native operating system…"

Lists these primitives:
- Chat with 44 action tags → **Should be 45**
- 10-stage kanban pipeline → ✅ Correct
- CRM with relationship graphing → ✅
- Calendar + queue system → ✅
- Federation protocol → ✅

**Missing primitives that now exist:**
- Signals framework (ambient + relay + custom webhook signals)
- Capabilities engine (outbound email, meeting scheduling)
- KanbAIn features (task-first triage via `upsert_card`, delegation model, card merge, due-date discipline)
- CardArtifact generic linking
- Brief assembly engine

---

### H-3 · "How It Works" / Architecture Diagram

**Current (if present):** Likely references "Chat (44 tags)" and "12-group system prompt."

**Fix:** Update to "Chat (45 tags)" and "13-group system prompt."

---

### H-4 · Feature Grid / Expandable Sections

The homepage lists features in expandable cards. Audit each:

| Feature Card | Status | Notes |
|---|---|---|
| Chat Engine | ⚠️ | If it says "44 tags" or "12 groups" → update to 45/13 |
| Kanban Pipeline | ⚠️ | No mention of KanbAIn improvements (merge, delegation, due dates, task-first triage) |
| CRM / Contacts | ✅ | Likely accurate |
| Calendar | ✅ | Likely accurate |
| Queue System | ✅ | Likely accurate |
| Federation | ✅ | Likely accurate |
| Signals | ❌ MISSING | Not mentioned anywhere on homepage |
| Capabilities | ❌ MISSING | Not mentioned anywhere on homepage |
| Brief Assembly | ❌ MISSING | Not mentioned anywhere on homepage |
| Marketplace | ✅ | Likely accurate |

---

### H-5 · API Code Block

**Current:** The homepage shows a code example of the chat API. Verify it still matches the actual endpoint signature. If it references `action_tags: 44` in a comment, update to 45.

---

### H-6 · Footer / Links

Verify all footer links resolve. Specifically:
- `/docs` → works
- `/open-source` → works
- GitHub link → verify points to correct repo
- Any "Get Started" CTA → verify destination

---

## Page 2: Docs (os.dividen.ai/docs)

The docs page is a single long-scroll page with 100+ sections organized by sidebar navigation. Below are all identified inaccuracies.

### D-1 · Top-Level Stats Banner

**Current:** "55 Prisma models · 44 action tags · 12-group system prompt · 10-stage pipeline"

**Fix:** "**60** Prisma models · **45** action tags · **13**-group system prompt · 10-stage pipeline"

---

### D-2 · Architecture Overview

**Current:** Likely says "Chat Engine processes messages through 44 action tags organized in a 12-group system prompt."

**Fix:** 45 action tags, 13-group system prompt.

**Missing:** The architecture overview should mention:
- **Signals Framework** — ambient intelligence layer that monitors patterns and triggers proactive agent behavior
- **Capabilities Engine** — outbound action execution (email replies, meeting scheduling) with tiered autonomy
- **Brief Assembly** — context aggregation pipeline that builds rich briefing documents per card
- **CardArtifact** — generic polymorphic linking model connecting any entity to any card

---

### D-3 · "Philosophy" Section

This section articulates the design principles. Key sub-sections to audit:

#### "Tasks first, cards second"
**Current:** Likely describes the original card creation flow.
**Issue:** The codebase now implements `upsert_card` with Levenshtein fuzzy matching — tasks/artifacts route to existing cards before creating new ones. The philosophy text should reflect this "task-first triage" approach.

#### "Clear ownership model"
**Current:** Likely describes human/agent binary ownership.
**Issue:** The codebase now implements a **three-way delegation model**: `self` (human does it), `divi` (agent does it), `delegated` (routed to a connection). The `ChecklistItem` model has an `assignee` field with these values. The docs should reflect this.

#### "Structured autonomy"
**Current:** Likely describes the action tag system.
**Issue:** Should now also mention the **Capabilities tiered autonomy** model (Tier 1: auto-execute, Tier 2: draft-and-confirm, Tier 3: human approval required).

---

### D-4 · Action Tags Section

**Current:** "DiviDen supports 44 action tags…"

**Fix:** "DiviDen supports **45** action tags (42 unique + 3 aliases)…"

**Missing tag:** `merge_cards` — merge two project cards into one (combines tasks, contacts, artifacts).

The tag listing should include `merge_cards` in the appropriate category. It belongs with the Kanban/Card management tags alongside `create_card`, `update_card`, `archive_card`, `upsert_card`.

---

### D-5 · System Prompt Section

**Current:** "The system prompt is organized into 12 groups…"

**Fix:** "The system prompt is organized into **13** groups…"

**Missing group:** Group 13: Active Capabilities (conditional — only injected if capabilities are configured). This group feeds the agent context about enabled outbound capabilities, their rules, and tiered autonomy levels.

Full group listing should be:
1. Identity, Rules & Time
2. Active State (kanban + queue + calendar)
3. Conversation
4. People (CRM + profiles)
5. Memory & Learning
6. Calendar & Inbox
7. Capabilities & Action Tags
8. Connections & Relay
9. Extensions (conditional)
10. Platform Setup (conditional)
11. Business Operations
12. Team Agent Context (conditional)
13. **Active Capabilities** (conditional) ← NEW

---

### D-6 · Prisma Schema / Data Model Section

**Current:** "55 Prisma models…"

**Fix:** "**60** Prisma models…"

**Missing models to document:**

| Model | Purpose |
|---|---|
| `CardArtifact` | Generic polymorphic link: connects any entity (email, doc, recording, contact, calendar event) to any KanbanCard |
| `CustomSignal` | User-defined webhook-triggered signals with custom payloads |
| `SignalConfig` | Per-signal-type enable/disable toggle + custom rules/thresholds |
| `AmbientRelaySignal` | Definitions for ambient relay signals between connected agents |
| `AmbientPattern` | Pattern detection configuration for ambient intelligence |

Also verify that `ChecklistItem` documentation reflects:
- `assignee` field: `"self"` / `"divi"` / `"delegated"` (three-way delegation)
- `dueDate` field: `DateTime?` (due date discipline)
- `delegatedTo` field: connection ID for delegated tasks

And that `CardContact` documentation reflects:
- `role` field now supports: `"primary"` / `"contributor"` / `"related"` (not just primary/secondary)

---

### D-7 · Kanban Pipeline Section

**Current:** Describes the 10-stage pipeline.

**Pipeline stages are correct:**
1. Leads
2. Qualifying
3. Proposal
4. Negotiation
5. Contracted
6. Active
7. Development
8. Planning
9. Paused
10. Completed

**Missing KanbAIn features to add:**
- **Card Merge** (`merge_cards` tag + `/api/kanban/merge` endpoint) — combines two cards, merging checklists, contacts, and artifacts
- **Task-First Triage** (`upsert_card` tag) — Levenshtein fuzzy-match on title to route tasks to existing cards before creating new ones
- **Delegation Model** — three-way assignment on checklist items: self / divi / delegated
- **Due Date Discipline** — `dueDate` on ChecklistItem, surfaced in card detail
- **Brief Assembly** — per-card context aggregation for AI briefing

---

### D-8 · API Reference Section

**Missing endpoints (verify these aren't documented):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/signals/config` | GET/PUT | Get or update signal configuration |
| `/api/signals/custom` | GET/POST | Manage custom webhook signals |
| `/api/capabilities` | GET/POST/PUT | Manage agent capabilities |
| `/api/kanban/merge` | POST | Merge two kanban cards |
| `/api/brief/[cardId]` | GET | Assemble briefing for a specific card |

---

### D-9 · Signals Section

**Status:** ❌ **Entirely missing from docs**

This is a major feature vertical that needs its own docs section. Content should cover:

- **What Signals are:** An ambient intelligence layer that monitors user activity patterns, relay network signals, and external webhooks to proactively surface insights.
- **Signal types:**
  - **Built-in signals** (defined in `src/lib/signals.ts`): e.g., stale-card detection, overdue tasks, connection activity spikes, calendar conflict detection
  - **Ambient relay signals** (`AmbientRelaySignal`): signals shared across the federation network
  - **Custom webhook signals** (`CustomSignal`): user-defined signals triggered by external webhooks with custom payloads
- **Signal configuration** (`SignalConfig`): per-signal enable/disable, custom thresholds, notification rules
- **API endpoints:** `/api/signals/config`, `/api/signals/custom`
- **Each signal definition includes `taskTypes`** — suggested follow-up actions the agent can take

---

### D-10 · Capabilities Section

**Status:** ❌ **Entirely missing from docs**

Needs its own section covering:

- **What Capabilities are:** Outbound action execution — the agent can send emails, schedule meetings, etc. on the user's behalf.
- **Tiered autonomy model:**
  - Tier 1: Auto-execute (low-risk, routine actions)
  - Tier 2: Draft-and-confirm (agent drafts, user approves)
  - Tier 3: Human approval required (high-stakes actions)
- **Capability types:** Email reply, meeting scheduling (extensible)
- **`queue_capability_action` tag:** How the agent queues outbound actions
- **`AgentCapability` model:** Schema details
- **API endpoint:** `/api/capabilities`

---

### D-11 · Federation / Relay Section

Verify this section mentions:
- **Ambient relay signals** — a newer addition to the relay protocol
- The `relay_ambient` action tag — low-priority ambient asks
- The `AmbientRelaySignal` and `AmbientPattern` models

If not, these need to be added.

---

### D-12 · Brief Assembly Section

**Status:** Likely ❌ **Missing from docs**

Brief assembly (`src/lib/brief-assembly.ts`) is a significant subsystem that:
- Reads a card's full context graph (linked contacts, pipeline stage, checklist status, artifacts, activity log)
- Assembles a structured briefing document
- Used by `assemble_brief` action tag
- Powers the card detail view's AI context panel

Needs documentation.

---

## Page 3: Open Source (os.dividen.ai/open-source)

### OS-1 · Comparison Table

The open-source page has a feature comparison table (DiviDen vs. competitors).

**Inaccuracies:**

| Row | Current | Fix |
|---|---|---|
| Action Tags | 44 | **45** |
| System Prompt | 12 groups | **13 groups** |
| Prisma Models | 55 | **60** |

---

### OS-2 · Architecture Summary Line

**Current:** Something like "Chat Engine: 12-group system prompt with 44 action tags"

**Fix:** "Chat Engine: **13**-group system prompt with **45** action tags"

---

### OS-3 · Feature Checklist

The page lists 40+ features with checkmarks. **Missing features:**

| Feature | Status | Notes |
|---|---|---|
| Signals Framework | ❌ Not listed | Ambient intelligence, pattern detection, custom webhooks |
| Signal Configuration UI | ❌ Not listed | Per-signal enable/disable + thresholds |
| Custom Webhook Signals | ❌ Not listed | User-defined external event triggers |
| Capabilities Engine | ❌ Not listed | Outbound email/meeting execution |
| Tiered Autonomy | ❌ Not listed | Tier 1/2/3 capability approval model |
| KanbAIn Task-First Triage | ❌ Not listed | upsert_card with Levenshtein matching |
| Card Merge | ❌ Not listed | merge_cards combines two cards |
| Delegation Model | ❌ Not listed | self/divi/delegated three-way assignment |
| Due Date Discipline | ❌ Not listed | dueDate on ChecklistItem |
| Brief Assembly | ❌ Not listed | Per-card AI context aggregation |
| CardArtifact Linking | ❌ Not listed | Generic polymorphic entity→card linking |
| Entity Resolution | ❌ Not listed | entity_resolve cross-surface lookup |

---

### OS-4 · "Why Open Source?" Copy

Verify the philosophy text doesn't contradict the current architecture. Specifically:
- If it mentions "44 action tags" → 45
- If it mentions "human/agent ownership" → now three-way (self/divi/delegated)
- If it mentions specific model counts → verify against 60

---

### OS-5 · GitHub Link / README Reference

Verify the GitHub link points to the correct repo and that any stats mentioned (stars, forks, contributors) are not hardcoded stale numbers.

---

## Cross-Cutting Issues

### XC-1 · Number Consistency

Every page that mentions these numbers needs updating:

| Number | Old | New | Pages Affected |
|---|---|---|---|
| Action tags | 44 | **45** | Homepage, Docs, Open Source |
| Prompt groups | 12 | **13** | Homepage, Docs, Open Source |
| Prisma models | 55 | **60** | Docs, Open Source |

**Recommended:** Extract these into a single source-of-truth config that all pages reference, so future additions don't require a multi-page audit.

---

### XC-2 · Missing Feature Verticals

Three major feature verticals are **completely absent** from the public site:

1. **Signals** — ambient intelligence framework
2. **Capabilities** — outbound action execution
3. **KanbAIn** — advanced kanban features (merge, delegation, triage, due dates)

These represent significant product differentiation and should be prominently featured.

---

### XC-3 · Delegation Model Not Reflected

The site describes a binary human/agent ownership model. The codebase implements a three-way model:
- `self` — human does the task
- `divi` — agent handles it autonomously
- `delegated` — routed to a federation connection

This should be updated wherever ownership/assignment is discussed.

---

### XC-4 · CardContact Roles

If the site mentions contact roles as "primary/secondary", the codebase now uses:
- `primary` — main point of contact
- `contributor` — active collaborator
- `related` — contextually linked

---

### XC-5 · New Action Tags Not Documented

Beyond `merge_cards` (the newest), verify these relatively recent tags are documented:
- `upsert_card` — task-first triage
- `link_artifact` — generic entity linking
- `queue_capability_action` — capability execution
- `entity_resolve` — cross-surface entity resolution
- `relay_ambient` — ambient relay
- `assemble_brief` — brief assembly trigger
- `project_dashboard` — cross-member dashboard
- `install_agent` / `uninstall_agent` — marketplace management

---

## Summary: Priority Fixes

### 🔴 Critical (Factually Wrong)
1. **44 → 45** action tags (all pages)
2. **12 → 13** prompt groups (all pages)
3. **55 → 60** Prisma models (docs, open-source)

### 🟡 Major (Missing Features)
4. Add Signals framework documentation (docs + open-source + homepage mention)
5. Add Capabilities engine documentation (docs + open-source + homepage mention)
6. Add KanbAIn features documentation (docs + open-source + homepage mention)
7. Add Brief Assembly documentation (docs)
8. Update delegation model from binary to three-way (docs philosophy)

### 🟢 Minor (Completeness)
9. Add `merge_cards` to action tag listing (docs)
10. Add 5 new Prisma models to schema docs
11. Add missing API endpoints to API reference (docs)
12. Update CardContact roles documentation
13. Add `upsert_card`, `link_artifact`, `queue_capability_action` to tag docs
14. Consider single-source-of-truth for stats numbers

---

*Generated from DiviDen Command Center codebase cross-reference. Numbers verified against `prisma/schema.prisma`, `src/lib/action-tags.ts`, `src/lib/system-prompt.ts`, and `src/types/index.ts`.*
