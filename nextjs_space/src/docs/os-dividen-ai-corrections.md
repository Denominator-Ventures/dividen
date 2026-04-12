# os.dividen.ai — Corrections, Changes & Additions

**Date:** April 12, 2026 
**Source of truth:** `dividen.ai` production codebase (Denominator-Ventures/dividen.git)

---

## 🔴 Corrections (Inaccurate — Fix ASAP)

### 1. "12-Group Agent Intelligence" → **13 Prompt Groups**

**Current (wrong):** "12-Group Agent Intelligence" / "12 prompt groups — identity, goals, connections, memory, tools, calendar, inbox, capabilities, extensions, platform setup, business operations, and team context."

**Correct:** The system prompt now has **13 consolidated prompt groups:**
1. Identity, Rules & Time
2. Active State
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
13. Active Capabilities (conditional)

**Fix:** Change to "13-Group Agent Intelligence" and update the list.

---

### 2. "44 Action Tags" → **53 Action Tags**

**Current (outdated):** "Not just chat. 44 executable actions via natural conversation"

**Correct:** The action tag parser now handles **53 distinct action tags**. Including: `execute_agent`, `subscribe_agent`, `uninstall_agent`, `install_agent`, `find_jobs`, `post_job`, `review_job`, `complete_job`, `create_document`, `link_recording`, `entity_resolve`, `serendipity_matches`, `network_briefing`, `project_dashboard`, `queue_capability_action`, and all the originals.

**Fix:** Change "44" to "53" everywhere it appears (heading, body text, "How it works" section).

---

### 3. LLM Keys — "Platform version at dividen.ai provides keys automatically"

**Current (wrong):** "Bring your own OpenAI / Anthropic API key. No vendor lock-in. Platform version at dividen.ai provides keys automatically."

**Correct:** The managed platform (dividen.ai) is **also BYOK** (Bring Your Own Key). Users must supply their own OpenAI or Anthropic API key on both self-hosted and managed versions. The platform does NOT provide keys automatically.

**Fix:** Remove the sentence "Platform version at dividen.ai provides keys automatically." Replace with something like: "Same BYOK model on both self-hosted and managed. Your key, your spend, full control."

---

### 4. Fee Copy — Remove "can be 0%" Language

**Current:** 
- Pricing intro: "Internal transactions (same instance) = your rules, can be 0%."
- Agent Marketplace: "Internal (same instance): configurable, can be 0%."
- Job Recruiting: "Internal (same instance): configurable, can be 0%."

**Issue:** Advertising 0% fees implies the platform encourages zero-revenue internal transactions. The fee model is configurable but shouldn't lead with "can be 0%" as a selling point.

**Fix:** Change to language like:
- Pricing intro: "Internal transactions (same instance) = your rules, your pricing. Network transactions (marketplace, federation) = minimum floors apply."
- Agent Marketplace: "Internal (same instance): set your own fee structure."
- Job Recruiting: "Internal (same instance): set your own fee structure."

---

### 5. "Extensions" Still Listed in Platform Features

**Current:** Platform feature dot-list includes: "Marketplace · Network Discovery · Profiles · CRM · Teams · Jobs · Relay · Federation · **Extensions** · Comms"

**Correct:** Extensions were **removed as a dashboard tab**. The concept was absorbed into marketplace agents and capabilities. Extensions should not be listed as a standalone platform feature.

**Fix:** Remove "Extensions" from the platform features list. Consider replacing with "Earnings" or "Drive" which are current dashboard tabs.

Also in the 12-group description, it lists "extensions" as a prompt group — while Extensions still exists as a conditional prompt group (#9), it should be de-emphasized since it's no longer a user-facing feature.

---

### 6. A2A Version Reference

**Current:** The API infrastructure list says "A2A" without a version.

**Correct:** The A2A implementation is at **v0.2** (protocolVersion in the agent card). However, the most recent update notes reference A2A v0.4 spec compatibility.

**Fix:** If versioning is shown, specify "A2A v0.4" to match the latest update logs.

---

### 7. Pipeline Stages — "10 pipeline stages" in "How it works"

**Current:** "Cards move through 10 pipeline stages." in the "Work flows" step.

**Correct:** The Kanban board has **10 stages**: Leads, Qualifying, Proposal, Negotiation, Contracted, Active, Development, Planning, Paused, Completed. This is actually correct ✅

---

## 🟡 Additions (New Features Missing from Site)

### 8. Agent Marketplace — Password-Protected Agents

Developers can now set **access passwords** on marketplace agents. Buyers must enter the password to view/execute the agent. This enables private distribution channels — share a password with select clients, teams, or partners.

**Suggested copy for developers section:** "Lock agents behind access passwords for private distribution — share with select clients, partners, or teams."

---

### 9. Persistent Chat Conversations

Chat history is now **persistent across sessions**. Conversations are stored in the database and restored on login. Users can soft-clear the visible chat while preserving the full history. The agent remembers prior context.

**Suggested addition:** Mention under the "Memory builds" step or as a standalone callout: "Conversations persist across sessions. Your Divi never starts over."

---

### 10. Profile Photos & User Profiles

Users can now **upload profile photos** via S3-backed cloud storage. Profile photos appear in chat messages, profile views, and throughout the platform. There's a dedicated profile view in the dashboard with preview and edit modes.

**Suggested addition:** Could be mentioned under the "What you get" section or the Identity & Profile protocol layer.

---

### 11. MCP v1.5

The MCP (Model Context Protocol) server is now at **version 1.5.0**. The infrastructure list should reflect this.

**Fix:** If versioning is shown, specify "MCP v1.5".

---

### 12. Chief of Staff Observer View

The "Built for founders and their right hand" section is accurate and already mentions the CoS view. The "Live today" badge says it shipped April 10 — this is correct. ✅

---

## 🟢 Accurate (No Changes Needed)

- ✅ Hero copy: "You don't need a boss. You need a system."
- ✅ Divi personality description matches the defined identity
- ✅ Goals & Dynamic NOW Engine description
- ✅ The Brief — Show Your Work
- ✅ Ambient Relay Protocol description
- ✅ Federation section
- ✅ "How it works" 4-step flow (You talk → It acts → Work flows → Memory builds)
- ✅ Chief of Staff Observer View section (6 features)
- ✅ Self-hosted setup instructions (clone → bash scripts/setup.sh → yarn dev)
- ✅ Marketplace developer/buyer split
- ✅ 97% developer revenue share
- ✅ 3% platform routing fee
- ✅ Stripe Connect integration
- ✅ Open core / MIT-licensed messaging
- ✅ PWA install capability
- ✅ Agent API section
- ✅ Pipeline stage visualization (10 stages)
- ✅ Implementation Partner (FVP) section
- ✅ Creator note / contact section

---

## Summary: Priority Changes

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1 | 12 → 13 prompt groups | 🔴 Incorrect | Update heading + description |
| 2 | 44 → 53 action tags | 🔴 Outdated | Update all references |
| 3 | "Platform provides keys automatically" | 🔴 Incorrect | Remove/rewrite |
| 4 | "can be 0%" fee language | 🔴 Per founder | Rewrite fee descriptions |
| 5 | Extensions in feature list | 🟡 Removed feature | Remove from list |
| 6 | A2A version | 🟡 Outdated | Update to v0.4 |
| 7 | Password-protected agents | 🟢 New feature | Add to marketplace section |
| 8 | Persistent chat | 🟢 New feature | Add to memory section |
| 9 | Profile photos | 🟢 New feature | Add to identity section |
| 10 | MCP v1.5 | 🟡 Version bump | Update version reference |
