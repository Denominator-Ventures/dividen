# os.dividen.ai — Full Copy Audit

**Date:** April 12, 2026  
**Auditor:** Build session  
**Scope:** Every page, every section on os.dividen.ai  
**Source of truth:** Codebase at HEAD (`8943c29`)

---

## Ground Truth (from codebase)

| Metric | Actual | Notes |
|--------|--------|-------|
| Prompt groups | **13** | Groups 1-13 in `system-prompt.ts` |
| Action tags | **53** | 53 unique `[[tag:` patterns in `system-prompt.ts` |
| Prisma models | **60** | `schema.prisma` — was 55, grew to 60 |
| MCP version | **v1.5.0** | `api/mcp/route.ts` |
| MCP base tools | **22** | Plus dynamic marketplace tools |
| A2A version | **v0.4.0** | `api/a2a/route.ts` |
| Agent Card | **v0.4.0** | `.well-known/agent-card.json/route.ts` |
| LLM keys | **BYOK on both platforms** | Managed does NOT auto-provide |
| Extensions tab | **Removed** | Absorbed into capabilities/marketplace |
| Dashboard primary tabs | Chat · CRM · Calendar · Inbox · Recordings | |
| Dashboard network tabs | Discover · Connections · Teams · Jobs · Marketplace · Federation Intel | |
| Connections view | **3 tabs**: Find People, My Connections, Relays | No local/federated toggle |
| Internal fees | Configurable | Don't promise "can be 0%" — it's operator choice |
| Network fee floors | 3% marketplace, 7% recruiting | Enforced minimums |

---

## HOMEPAGE (os.dividen.ai)

### ✅ Correct
- Hero: "You don't need a boss. You need a system." — Good
- Manifesto section — Good
- "What You Get" intro — Good
- Goals & Dynamic NOW Engine description — Good
- The Brief description — Good
- "How It Works" section — Good
- Agent API endpoint list — Mostly good (see below)
- Open Source section / creator letter — Good
- Fractional Venture Partners section — Good
- Contact form — Good
- Footer — Good

### ❌ CORE Section

#### 1. "12-Group Agent Intelligence" → **13-Group**
**Location:** CORE section, first item  
**Current:** "12-Group Agent Intelligence" / "12 prompt groups"  
**Correct:** "13-Group Agent Intelligence" / "13 prompt groups"  
**Details:** Group 13 (Active Capabilities) was added. The group list in the description also needs updating.

#### 2. Prompt group list includes "extensions" → Remove
**Location:** CORE section, description of Agent Intelligence  
**Current:** "identity, goals, connections, memory, tools, calendar, inbox, capabilities, extensions, platform setup, business operations, and team context"  
**Correct:** Remove "extensions" — this group was absorbed. The actual 13 groups are:
1. Identity, Rules & Time
2. Active State (board, queue, goals)
3. Conversation
4. People (CRM + profiles)
5. Memory & Learning
6. Calendar & Inbox
7. Capabilities & Action Tags
8. Connections & Relay
9. Extensions (conditional — still exists as prompt group even though tab removed)
10. Platform Setup
11. Business Operations
12. Team Agent Context
13. Active Capabilities

**Note:** Extensions still exist as a conditional prompt group (#9) but the tab was removed from the dashboard. The list should reflect the actual group names, not the old naming.

#### 3. "44 Action Tags" → **53 Action Tags**
**Location:** CORE section, third item  
**Current:** "44 Action Tags" / "44 executable actions" / "44 structured commands"  
**Correct:** "53 Action Tags" / "53 executable actions" / "53 structured commands"  
**Appears in:** Title, description text, and the "How It Works" step 2

### ❌ PLATFORM Section

#### 4. "expand 10 features" → **9 features**
**Location:** PLATFORM expandable section  
**Current:** "expand 10 features" with list: "Marketplace · Network Discovery · Profiles · CRM · Teams · Jobs · Relay · Federation · Extensions · Comms"  
**Correct:** Remove "Extensions" from the list → 9 features, "expand 9 features"

### ❌ INFRASTRUCTURE Section

#### 5. Protocol versions need audit
**Location:** INFRASTRUCTURE feature list  
**Current:** Inline text shows "A2A · MCP · Agent API v2"  
**Note:** A2A is v0.4 ✅, but MCP references elsewhere say v1.4.0 when it's actually v1.5.0. Ensure the expanded description (if any) uses correct versions.

### ❌ PRICING Section

#### 6. "can be 0%" language → Remove
**Location:** PRICING intro text  
**Current:** "Internal transactions (same instance) = your rules, can be 0%."  
**Correct:** "Internal transactions (same instance) = your rules." — Drop the "can be 0%" — it's implied and the explicit promise is unnecessary.

#### 7. LLM Keys — "Platform version provides keys automatically" → Wrong
**Location:** PRICING / LLM Keys card  
**Current:** "Platform version at dividen.ai provides keys automatically."  
**Correct:** "Both versions are BYOK — bring your own OpenAI / Anthropic key. No vendor lock-in. Zero markup."  
**Reason:** The managed platform does NOT auto-provide LLM keys. It's BYOK everywhere.

#### 8. Agent Marketplace — "can be 0%" → Remove
**Location:** PRICING / Agent Marketplace card  
**Current:** "Internal (same instance): configurable, can be 0%."  
**Correct:** "Internal (same instance): configurable."

#### 9. Job Recruiting — "can be 0%" → Remove
**Location:** PRICING / Job Recruiting card  
**Current:** "Internal (same instance): configurable, can be 0%."  
**Correct:** "Internal (same instance): configurable."

### ❌ AGENT API Section

#### 10. MCP version in API list → v1.5.0
**Location:** Agent API endpoint list  
**Current:** "GET /api/mcp — MCP v1.4.0 (20+ dynamic tools)"  
**Correct:** "GET /api/mcp — MCP v1.5.0 (22+ dynamic tools)"

### ❌ OPEN SOURCE Section (bottom of homepage)

#### 11. "Builders" / "Systems" / "Fork Reality" — Aspirational?
**Location:** "This is not software. It's a network." section  
**Note:** This section describes "Builders growing" and "Systems — public workflows you can fork" and "Fork Reality." These are aspirational/forward-looking. Currently there's no public workflow sharing or forking mechanism. Consider labeling as vision or removing.

---

## /open-source PAGE

### ❌ Comparison Table

#### 12. "44 Action Tags" → **53**
**Location:** Platform vs Self-Hosted table  
**Current:** "44 Action Tags — ✅ Full / ✅ Full"  
**Correct:** "53 Action Tags"

#### 13. "Extensions" row → Review
**Location:** Platform vs Self-Hosted table  
**Current:** "Extensions — ✅ Full / ✅ Full"  
**Note:** Extensions as a dashboard tab no longer exist. The extensions framework (JSON/URL import) still works, but it's not a top-level feature anymore. Consider renaming to "Extensions Framework" or "Agent Skills Import" and adding a note.

#### 14. "Team Agent (Grp 12)" → Correct group number
**Location:** Platform vs Self-Hosted table  
**Current:** "Team Agent (Grp 12)"  
**Note:** This IS actually Group 12 in the system prompt, so this is technically correct. But if the headline says "13-Group" and a reader counts, they might be confused. Fine as-is.

#### 15. Marketplace "Internal 0%" → "Internal: configurable"
**Location:** Platform vs Self-Hosted table  
**Current:** "✅ Internal 0%"  
**Correct:** "✅ Internal: configurable" — Same "can be 0%" issue

#### 16. Job Board "Internal 0%" → "Internal: configurable"
**Location:** Platform vs Self-Hosted table  
**Current:** "✅ Internal 0%"  
**Correct:** "✅ Internal: configurable"

### ❌ "What it builds" Section

#### 17. "12-group system prompt with 44 action tags" → **13-group, 53 tags**
**Location:** Chat Engine description  
**Current:** "12-group system prompt with 44 action tags that trigger real database operations"  
**Correct:** "13-group system prompt with 53 action tags..."

#### 18. MCP version → v1.5.0
**Location:** MCP Server description  
**Current:** "MCP v1.4.0 with 20+ dynamic tools"  
**Correct:** "MCP v1.5.0 with 22+ dynamic tools"

#### 19. Agent Card version → v0.4.0
**Location:** Agent Card description  
**Current:** "v0.3.0 identity document"  
**Correct:** "v0.4.0" — updated with marketplace password access and persistent conversation capabilities

#### 20. "Extensions Framework" — Consider relabeling
**Location:** What it builds list  
**Current:** "Extensions Framework — Importable skills and personas via JSON/URL with automatic prompt integration"  
**Note:** Still accurate as a framework. But since it's no longer a dashboard tab, users won't find an "Extensions" section in the UI. The import happens through chat commands or settings.

### ❌ Build Phases

#### 21. Phase 1: "44 action tags · 12-group system prompt" → 53 tags, 13 groups
**Location:** Build Phases, Phase 1 checklist  
**Current:** "Chat engine with 44 action tags · 12-group system prompt"  
**Correct:** "Chat engine with 53 action tags · 13-group system prompt"

#### 22. Phase 1: "55 tables" → **60 tables**
**Location:** Build Phases, Phase 1 checklist  
**Current:** "Prisma schema + PostgreSQL (55 tables)"  
**Correct:** "Prisma schema + PostgreSQL (60 tables)"

#### 23. Phase 2: MCP version → v1.5.0
**Location:** Build Phases, Phase 2 checklist  
**Current:** "MCP Server v1.4.0 (20+ dynamic tools)"  
**Correct:** "MCP Server v1.5.0 (22+ dynamic tools)"

#### 24. Phase 2: Agent Card → v0.4.0
**Location:** Build Phases, Phase 2 checklist  
**Current:** "Entity Resolution + Agent Card v0.3.0"  
**Correct:** "Entity Resolution + Agent Card v0.4.0"

### ❌ Architecture Diagram

#### 25. Architecture ASCII — Outdated references
**Location:** Architecture section  
**Notes:**
- Still shows "Agent Card (v0.3.0)" → should be v0.4.0
- Still shows "DAWP/0.1" which may or may not be current (check)
- Missing: Connections view redesign (Find People/My Connections/Relays)
- Missing: CatchUp quick signal dropdown, mode toggle in workspace
- These are UI details that may not belong in the architecture diagram though

---

## /docs PAGE (Protocol Specification)

#### 26. Sidebar: "Data Model (55)" → **(60)**
**Location:** Left sidebar  
**Current:** "Data Model (55)"  
**Correct:** "Data Model (60)"

#### 27. Sidebar: "Extensions" section
**Location:** Left sidebar  
**Note:** Extensions still exists as a concept (conditional prompt group, JSON/URL import). The docs page listing is fine — it documents the protocol, not the UI.

#### 28. "What's New" box: Versions
**Location:** Top of docs page, "What's New — FVP Integration Brief"  
**Current:** "MCP v1.4.0" / "Agent Card v0.3.0"  
**Correct:** "MCP v1.5.0" / "Agent Card v0.4.0"

#### 29. Main body references
**Note:** The full docs page is very long. Search-and-replace needed for:
- All instances of "44 action tags" → "53 action tags"
- All instances of "12 prompt groups" or "12-group" → "13" 
- All instances of "55 tables" or "55 models" → "60"
- All instances of "MCP v1.4" → "MCP v1.5"
- All instances of "Agent Card v0.3" → "Agent Card v0.4"
- All instances of "can be 0%" in fee descriptions → remove

---

## /updates PAGE

#### 30. Historical entries — DO NOT change
**Note:** Updates are historical log entries. They were accurate at time of writing. Changing "44 action tags" in an April 11 entry to "53" would be revisionist. Leave them as-is.

#### 31. Missing updates
**Current latest:** "Your Profile Has a Home Now" (April 12, 11:00 PM)  
**Missing since then:**
- Connections view redesign (3 tabs: Find People, My Connections, Relays; federated discovery; removed local/federated toggle)
- PeerProfileModal (click name/avatar → full profile with Profile + Us tabs, connect button)
- Catch-up button restyled to match nav; CatchUpQuickMenu dropdown (drag-reorder + checkboxes for signals)
- Mode toggle moved from header into workspace strip

---

## OPEN-SOURCE vs MANAGED — Key Distinctions to Document

| Feature | Open Source (Self-Hosted) | Managed Platform (dividen.ai) |
|---------|-------------------------|-------------------------------|
| Core engine | ✅ Full (MIT) | ✅ Full |
| 13-group prompt / 53 tags | ✅ Full | ✅ Full |
| CRM, Calendar, Goals, Queue | ✅ Full | ✅ Full |
| LLM keys | BYOK | BYOK |
| Internal fees | Configurable | Configurable |
| Agent Marketplace | ✅ Internal only | ✅ Network (3% floor) |
| Job Board | ✅ Internal only | ✅ Network (7% floor) |
| Federation | ✅ Direct relay | ✅ Full network discovery |
| Network discovery | Via API | Built-in wizard |
| Teams | Basic | Full (Pro: team agent, spending policies) |
| Hosting/SSL | Self-managed | Included |
| Auto-updates | git pull | Continuous deployment |
| Pricing | Free (MIT) | Starter $29/mo, Pro $79/mo + $9/seat |

---

## Summary: All Changes Needed

### Critical (numbers wrong)
1. 12 → **13** prompt groups (homepage, open-source, docs — ~8 occurrences)
2. 44 → **53** action tags (homepage, open-source, docs — ~10 occurrences)
3. 55 → **60** Prisma models (docs sidebar, open-source build phases — ~3 occurrences)
4. MCP v1.4.0 → **v1.5.0** (homepage API list, open-source, docs — ~5 occurrences)
5. Agent Card v0.3.0 → **v0.4.0** (open-source, docs — ~3 occurrences)

### Important (misleading copy)
6. LLM Keys: Remove "Platform version provides keys automatically" — both are BYOK
7. Fee copy: Remove all "can be 0%" language (~4 occurrences across homepage + open-source)
8. Extensions: Remove from PLATFORM feature list on homepage (10 → 9 features)

### Minor (cosmetic/consistency)
9. Homepage prompt group list: update to reflect actual group names
10. Open-source comparison table: "Internal 0%" → "Internal: configurable"
11. Architecture diagram: update Agent Card version reference

### Don't Touch
- Historical update entries (they were correct at time of writing)
- Manifesto section (aspirational, not factual)
- Creator letter (personal, not technical)
- Fractional Venture Partners section
