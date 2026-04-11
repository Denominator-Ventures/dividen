# os.dividen.ai — Site Audit
**Date:** April 10, 2026 · Central Time  
**Auditor:** Abacus AI Agent  
**Site URL:** https://os.dividen.ai  

---

## Executive Summary

os.dividen.ai is DiviDen's public-facing marketing/documentation site. It presents the product vision, feature set, how-it-works flow, and use cases. This audit compares the site's current content against the **live dividen.ai app** (as of April 10, 2026) and flags everything that needs updating, adding, or fixing.

---

## 1. Missing Features — Not Mentioned on the Site

| Feature | Status in App | Notes |
|---|---|---|
| **Chief of Staff Observer View** | ✅ Live (shipped today) | Major new capability — dedicated view for CoS/EA roles to monitor founder activity, flag items, leave notes. Zero mention on os.dividen.ai. Should get its own feature section or at minimum a callout under "What You Get." |
| **PWA Desktop Install** | ✅ Live | The app is installable as a PWA on desktop and mobile. The site mentions "Install" but links to `/open-source` — confusing. Should describe the actual install-to-homescreen/desktop experience. |
| **PWA Auto-Update** | ✅ Live (shipped today) | Service worker auto-updates on new deploys. Worth mentioning for trust/reliability messaging. |
| **Updates Feed / Changelog** | ✅ Live at dividen.ai/updates | The nav links to it, but there's no section on the marketing page explaining that DiviDen ships transparent, dated updates. Could be a trust signal. |
| **Red Badge on Updates** | ✅ Live | Dynamic "today's updates" count badge — shows active development velocity. |

---

## 2. Content That May Be Outdated or Inaccurate

| Section | Issue | Recommendation |
|---|---|---|
| **"Network Job Board"** | Listed as a feature section. Verify this is actually live and functional in the app, or if it's still planned. | If not live, move to a "Coming Soon" section or remove. |
| **"How It Works" flow** | Currently shows a generic onboarding flow. Doesn't reflect the actual current UX (landing page → dashboard with modules). | Update screenshots/descriptions to match current app state. |
| **Feature descriptions** | Many feature blurbs are high-level/aspirational. They don't reflect the specific UI that exists today. | Add concrete details, maybe micro-screenshots or GIFs. |
| **OG Image** (`/og-image.jpg?v=2`) | May be stale — verify it reflects current branding/UI. | Update if the app's visual identity has evolved. |
| **Meta description** | Check if it mentions the latest value props (CoS view, PWA, etc.). | Update to include current differentiators. |

---

## 3. Navigation & Links Audit

| Link | Target | Status | Issue |
|---|---|---|---|
| **Docs** | `/docs` | ⚠️ Unverified | Confirm this page exists and is populated. |
| **Updates** | `https://dividen.ai/updates` | ✅ Works | Opens in new tab — correct behavior. |
| **Open Source** | `/open-source` | ⚠️ Unverified | Confirm page exists and content is current. |
| **GitHub** | External GitHub link | ✅ Works | Verify it points to the correct repo (Denominator-Ventures/dividen or the public-facing one). |
| **"Try it" button** | `https://dividen.ai/` | ✅ Correct | Links to main app. |
| **"Install" button** | `/open-source` | ⚠️ Misleading | "Install" suggests installing the PWA. Linking to open-source page is confusing. Should either link to the app with install instructions, or be relabeled. |
| **Footer links** | Various | ⚠️ Unverified | Audit all footer links for 404s. |

---

## 4. Sections That Need Adding

### 4a. Chief of Staff / EA View
This is a differentiator. Suggest a dedicated section:
- **Headline:** "Built for founders *and* their right hand"
- **Content:** Observer mode, activity monitoring, flagging, notes, read-only safety
- **Position:** After the main feature list or as a highlighted use case

### 4b. PWA / Installability
Current "Install" messaging is unclear. Add a section or callout:
- Works offline-capable
- Install to desktop or mobile homescreen
- Auto-updates on new deploys
- No app store needed

### 4c. Transparent Development / Changelog
- Link to dividen.ai/updates
- "See what we shipped today" messaging
- Builds trust with technical founders

---

## 5. UI/UX Observations

| Observation | Severity | Recommendation |
|---|---|---|
| **Contact form ("Say hello")** | Medium | Verify the Send button is functional and emails actually arrive. If not wired up, either connect it or remove the form. |
| **Mobile responsiveness** | Low | Spot-check on mobile viewport — the page looked fine on desktop but wasn't tested on mobile during this audit. |
| **Page load speed** | Low | No performance issues observed, but run a Lighthouse audit for specifics. |
| **Dark mode** | Info | The main app supports dark mode. Does os.dividen.ai? If not, consider adding for consistency. |
| **Favicon / PWA manifest** | Info | Verify os.dividen.ai has proper favicon and manifest, especially if it's also meant to be installable. |

---

## 6. SEO & Meta Tags

- **Title:** "DiviDen — You are a system." — Good, on-brand.
- **OG Image:** `/og-image.jpg?v=2` — Verify it's current.
- **Missing:** Structured data (JSON-LD) for software application.
- **Missing:** Canonical URL tag (confirm it's set).
- **Recommendation:** Add `<meta name="theme-color">` matching the app's brand color.

---

## 7. Priority Action Items

1. **🔴 High — Add Chief of Staff section** — This is a live, shipped feature and a differentiator. Biggest content gap.
2. **🔴 High — Fix "Install" button** — Currently misleading. Should reflect actual PWA install or be relabeled.
3. **🟡 Medium — Verify all internal links** (`/docs`, `/open-source`, footer links) — Confirm no 404s.
4. **🟡 Medium — Update feature descriptions** — Align with current app capabilities.
5. **🟡 Medium — Verify contact form** — Ensure "Say hello" actually sends.
6. **🟢 Low — Add changelog/updates section** — Trust signal for technical audience.
7. **🟢 Low — OG image & meta refresh** — Quick win for social sharing.
8. **🟢 Low — Lighthouse audit** — Performance, accessibility, SEO scores.

---

*End of audit. Generated from live site inspection on April 10, 2026.*
