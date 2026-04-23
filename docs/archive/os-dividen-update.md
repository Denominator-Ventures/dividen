# os.dividen.ai — Site Update Brief

**Date**: April 12, 2026  
**For**: os.dividen.ai dev team  
**From**: DiviDen product session

This document covers all product changes from the April 12 sessions that need to be reflected on the marketing site.

---

## 1. Two-Tier Fee Model (from earlier session)

### What changed
The old single-fee model (`MARKETPLACE_FEE_PERCENT` applied to everything) is replaced with a two-tier system:

- **Internal transactions** (both parties on the same instance): Fee configurable, can be 0%. Self-hosted promise preserved.
- **Network transactions** (marketplace, federation, external): Enforced minimum floors — 3% marketplace, 7% recruiting. Payments route through DiviDen.

### Site impact
- **Pricing page**: If there's any mention of fees, clarify the two-tier model. Internal = your rules. Network = minimum floors apply.
- **Self-hosted/enterprise section**: Emphasize that internal transactions can be 0% fee. Only network transactions have floors.
- **Federation/network docs**: Mention that self-hosted instances connecting to the network must route payments through DiviDen for network transactions.

### New API endpoint
- `POST /api/v2/federation/validate-payment` — Validates proposed payment fees against network minimums. This needs to be added to the **Developers (/docs/developers)** page under the Federation API section. It's already in the OpenAPI spec.

---

## 2. Comms Redesign (from earlier session)

### What changed
Comms is no longer a user↔Divi messaging view. It's now a **Divi↔other agents relay log**. The user observes agent-to-agent communication; they don't participate.

### Site impact
- Any screenshots or descriptions of "Comms" should show relay threads (outbound/inbound messages between agents), not a chat interface.
- Comms now lives as a tab in the right panel (Queue + Comms tabs).
- The Activity stream moved to the bottom of the NOW panel (left column).

---

## 3. Divi's Personality (new)

### What changed
Divi now has a fully defined personality hardcoded into the system prompt:
- **Identity**: High-agency chief of staff for ambitious founders, operators, and dealmakers
- **Thinking model**: Leverage, incentives, sequencing, signal vs noise, people fit, asymmetric upside
- **Communication**: Direct, confident, conversational. Dry humor. Never corporate, never robotic.
- **Behavioral rules**: Acts like an owner, makes recommendations (not option lists), flags blind spots, treats narrative/reputation as strategic assets

### Site impact
- **Homepage / product description**: Update Divi's description from generic "AI agent" to reflect the personality. Suggested copy:
  > *"Your AI chief of staff. Strategic, resourceful, commercially minded. Divi thinks in terms of leverage, incentives, and sequencing. It communicates with clarity, confidence, and good taste — sharp, human, and never robotic."*
- **Features section**: If there's a section about how Divi works, mention the personality dimensions.
- **Any demo/screenshot areas**: Divi's responses should now sound like a competent operator, not a chirpy assistant.

---

## 4. Working Style Settings (new)

### What changed
Users can now tune four behavioral dials in Settings → 🤖 Your Divi:
- **Verbosity** (1-5): Concise ↔ Detailed
- **Proactivity** (1-5): Reactive ↔ Proactive
- **Autonomy** (1-5): Ask First ↔ Act & Report
- **Formality** (1-5): Casual ↔ Professional

These inject dynamically into Divi's system prompt.

### Site impact
- Could be a feature highlight: "Tune your agent to match your working style."
- Screenshot opportunity: The slider UI in settings.

---

## 5. Agent Naming (new)

### What changed
Users can rename their agent (default: "Divi") from Settings → Your Divi → Agent Name. The custom name is used in the system prompt identity, conversations, and comms.

### Site impact
- Minor feature mention. Could be part of a "personalization" section.

---

## 6. Auto-Merge Default (new)

### What changed
Divi now auto-merges duplicate project cards by default. When it detects overlapping workstreams, it merges them automatically, tells the user what it did, and allows undo. Previously, Divi was hardcoded to "NEVER auto-merge."

Configurable in Settings → Your Divi → Triage & Organization.

### Site impact
- If there's any mention of board management or triage, this is a good feature to highlight: "Your board converges automatically. Divi merges duplicate projects and tells you what changed."

---

## 7. Triage Settings (new)

### What changed
New configurable triage settings:
- **Auto-merge** (default: on)
- **Auto-route to board** (default: off)
- **Triage style**: Task-First (default), Card-Per-Item, Minimal

With warnings when users change from defaults.

### Site impact
- Part of the "Your Divi" settings story. Advanced users can tune how aggressively Divi manages their board.

---

## 8. Tab Reorganization (new)

### What changed
Major dashboard tab cleanup:

**Removed from tabs:**
- Extensions (removed entirely — marketplace is where you find agent skills)
- Signals/Capabilities (moved to Settings)
- Goals (moved to Settings, optional, off by default)
- Earnings (moved to NOW panel widget, only visible if user has marketplace activity)
- Board (removed from top row — accessible via 📋 Board button in NOW panel)

**Inbox and Recordings** are now separate top-level tabs (were grouped under "Messages").

**New layout:**
```
PRIMARY:    Chat · CRM · Calendar · Inbox · Recordings
NETWORK:    Discover · Connections · Teams · Jobs · Marketplace · Federation Intel
STANDALONE: Drive
```

**NOW panel additions:**
- 📋 Board button in quick actions
- 💰 Earnings widget (conditional — only shows if user has marketplace agents or job activity)

### Site impact
- **Any dashboard screenshots need updating** — the tab bar is significantly different now.
- **Feature descriptions**: Update any references to Extensions tab, Signals tab, or Goals tab.
- The story is now: "Your dashboard has fewer tabs because the important stuff surfaces to you in NOW."

---

## 9. Goals as Optional Setting (new)

### What changed
Goals are no longer a top-level dashboard tab. They're an optional setting (off by default) in Settings → Your Divi. When enabled, Divi considers active goals when prioritizing the board.

### Site impact
- If goals are mentioned in features, frame them as optional: "Set goals to give your agent additional prioritization context — or skip them entirely. Divi works fine without them."

---

## Summary of Pages to Update

| Page | What to update |
|------|---------------|
| Homepage | Divi personality description, dashboard screenshot |
| Features | Working style dials, auto-merge, triage settings, tab simplification |
| Pricing | Two-tier fee model clarification |
| Developers (/docs/developers) | Add `POST /federation/validate-payment` endpoint |
| Self-hosted/Enterprise | Internal 0% fees, network fee floors |
| Any screenshots | Dashboard tab bar, NOW panel (Board button + Earnings widget), Settings (new "Your Divi" tab) |

---

*Generated from DiviDen Command Center session — April 12, 2026*
