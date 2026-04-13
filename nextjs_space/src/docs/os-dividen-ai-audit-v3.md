# os.dividen.ai — Audit Addendum v3

**Date:** April 13, 2026  
**Auditor:** Build session  
**Scope:** New features shipped since v2 audit + fresh browse of os.dividen.ai  
**Source of truth:** Codebase at HEAD

---

## New Features to Document on os.dividen.ai

### 1. Multi-Inbox Support (Google Accounts)

**What shipped:**  
Operators can now connect **up to 3 Google accounts** per identity. Agent identities get 1 Google account. Each connected account is tracked via `IntegrationAccount.accountIndex` (0, 1, 2). The integration manager groups accounts under a single Google section with per-account connect/disconnect.

**Schema change:** `IntegrationAccount` now has `accountIndex Int @default(0)` and the unique constraint is `@@unique([userId, identity, service, accountIndex])` (widened from the old 3-field unique).

**Where to add on os.dividen.ai:**
- **Integrations section** in /docs: Add "Multi-account" badge to the Gmail and Calendar cards. Note that operators can connect multiple Google accounts (inbox aggregation across accounts).
- **/open-source comparison table:** Add a row or note: "Multi-inbox: up to 3 Google accounts per operator identity."
- **Data Model:** The model count may have stayed at 60 (no new model, just a new field + changed constraint), but verify.

---

### 2. Self-Hosted OAuth Isolation

**What shipped:**  
The open-source version no longer expects DiviDen's own Google OAuth credentials. When `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing from the environment:
- The `/api/auth/google-connect` endpoint returns a 501 with a clear message: "Google OAuth not configured. Self-hosted operators must set up their own Google Cloud project."
- The Integration Manager UI detects `googleOAuthAvailable: false` from the API and shows a friendly setup prompt with a link to the Google Cloud Console instead of a broken connect button.

**Where to add on os.dividen.ai:**
- **/open-source page → Self-Hosted Setup section:** Add a step about creating a Google Cloud OAuth app and setting `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env`.
- **Comparison table:** Add note under Integrations row: "Self-hosted: BYOO (Bring Your Own OAuth) — create your own Google Cloud project for Gmail/Calendar."
- **/docs → Integrations:** Document the required env vars and the graceful degradation behavior.

---

### 3. Gmail API Send (replaces SMTP for Google accounts)

**What shipped:**  
Sending email from Google-connected accounts now uses the **Gmail API** (`users.messages.send` with RFC 2822 raw encoding) instead of SMTP. This eliminates the need for app passwords or SMTP relay config for Google accounts. SMTP/nodemailer is still the fallback path for non-Google (SMTP) integrations.

**Where to add on os.dividen.ai:**
- **Integrations → Gmail card:** Mention "Send via Gmail API (no SMTP config needed)" as a capability.
- **/docs → Integrations spec:** Document that Google accounts use OAuth token → Gmail API for both read and send; SMTP accounts use nodemailer.

---

### 4. Write Scopes (Gmail + Calendar)

**What shipped:**  
The Google OAuth consent now requests **write scopes**:
- `gmail.send` — send mail as the user
- `gmail.compose` — create drafts
- `calendar` (full scope) — read + write calendar events

Previously the integration was read-only. Jon explicitly reversed the read-only security decision.

**Where to add on os.dividen.ai:**
- **/docs → Integrations → Google scopes:** List the full scope set:
  - `gmail.readonly`
  - `gmail.send`
  - `gmail.compose`
  - `calendar` (full read/write)
  - `drive.readonly`
  - `userinfo.email`
  - `userinfo.profile`
- **Homepage / How It Works:** If there's language about "read-only" integrations, remove it. DiviDen now reads AND writes.

---

### 5. Inbox Drafts Filter + Inline Reply Bar

**What shipped:**  
- The Inbox view now has a **Drafts** filter tab alongside All / Unread / Starred.
- The old "Reply" button was replaced with an **inline reply bar** at the bottom of messages (input field + send button, always visible when viewing a thread).

**Where to add on os.dividen.ai:**
- **/docs → Dashboard → Inbox section:** Update the filter list to include Drafts. Mention the inline reply UX.

---

## Fresh Issues Found Browsing os.dividen.ai (April 13, 2026)

### 6. 🔴 Network Tabs: "Jobs" → Should Be "Tasks"

**Location:** /docs → Data Model → Architecture diagram (dashboard layout)  
**Current:** Network tabs shown as: `Discover · Connections · Teams · Jobs · Marketplace · Federation Intel`  
**Issue:** The codebase renamed "Jobs" to "Tasks" in the dashboard network tabs. The architecture diagram still shows the old name.

**Fix:** Replace "Jobs" with "Tasks" in the network tab listing.

**Also check:** The MCP tools section lists `job_post`, `job_browse`, `job_match` — these tool names may still be correct in code (the action tags kept the `job_` prefix internally), but the user-facing language throughout the site should consistently use "Tasks" where referring to the dashboard tab and UI labels.

---

### 7. 🟡 Missing Integration: Google Drive

**Location:** /docs → Integrations section  
**Current:** Shows 4 integration cards: Calendar, Gmail, Meeting Transcription, Webhooks  
**Issue:** The OAuth consent requests `drive.readonly` scope, meaning Google Drive integration exists. There should be a 5th card for Google Drive.

**Fix:** Add a Google Drive integration card:
- **Name:** Google Drive
- **Scope:** `drive.readonly` (read-only access to Drive files)
- **Capability:** Access and reference Drive documents from within DiviDen
- **Note:** Read-only — DiviDen can view/list Drive files but not modify them

---

### 8. 🟡 Data Model Count

**Location:** /docs sidebar: "Data Model (55)" or "Data Model (60)"  
**Note:** v2 audit already flagged this as 55→60. After this session's schema push (adding `accountIndex` to IntegrationAccount), the model count is still **60** (no new models added, just a field change). Confirm sidebar shows 60.

---

### 9. 🟡 Extensions Framework Section

**Location:** /docs → sidebar → Extensions Framework → Extension Model  
**Note:** The extensions framework documentation is still present and technically accurate (JSON/URL import still works as a protocol feature). However, the dashboard no longer has an Extensions tab — the concept was absorbed into marketplace/capabilities. The docs should add a note: "Extensions are installed and managed via marketplace agents and chat commands. There is no dedicated Extensions tab in the dashboard."

---

## Status of v2 Audit Items

| v2 # | Issue | Status |
|------|-------|--------|
| 1 | 12→13 prompt groups | ❓ Unknown if applied to site |
| 2 | 44→53 action tags | ❓ Unknown if applied |
| 3 | LLM BYOK correction | ❓ Unknown if applied |
| 4 | "can be 0%" fee language | ❓ Unknown if applied |
| 5 | Extensions in feature list | ❓ Unknown if applied |
| 6 | MCP v1.4→v1.5 | ❓ Unknown if applied |
| 7-10 | Various additions | ❓ Unknown if applied |

**Note:** During today's browse, the architecture diagram in /docs still showed "Jobs" (not "Tasks"), suggesting that v2 corrections may not yet have been applied to the live site. Jon should review both v2 and v3 together.

---

## Summary: v3 Changes Needed

| # | Item | Type | Priority |
|---|------|------|----------|
| 1 | Multi-inbox documentation | 🟢 New feature | Medium |
| 2 | Self-hosted OAuth isolation | 🟢 New feature | High — affects self-hosters |
| 3 | Gmail API send | 🟢 New feature | Medium |
| 4 | Write scopes documentation | 🟢 New feature | High — security-relevant |
| 5 | Inbox Drafts + reply bar | 🟢 New feature | Low |
| 6 | "Jobs" → "Tasks" in diagrams | 🔴 Incorrect | High |
| 7 | Google Drive integration card | 🟡 Missing | Medium |
| 8 | Data Model count verification | 🟡 Possibly stale | Low |
| 9 | Extensions tab removal note | 🟡 Misleading | Low |

**Recommendation:** Apply v2 corrections first (if not already done), then layer v3 additions on top. The v2 number corrections (13 groups, 53 tags, 60 models, MCP v1.5, Agent Card v0.4) are factual errors that should be fixed before adding new feature documentation.
