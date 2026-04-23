# DiviDen Command Center — Transition Guide

> **Last updated**: 2026-04-16 (v2.1.0)  
> **Author**: Deep Agent session, working with Jon Bradford (founder)  
> **Purpose**: Give a new Deep Agent conversation everything it needs to pick up this project effectively.

---

## 1. What Is DiviDen?

DiviDen is a **personal AI operating system** — each user gets an AI agent named **Divi** that manages tasks, contacts, knowledge, and cross-user collaboration via a federated relay network. Think of it as a command center where Divi is your chief of staff.

Core concepts:
- **Kanban board** — task/card management (the primary work surface)
- **Divi** — the AI agent that lives in chat, takes actions via structured action tags
- **Relays** — cross-instance messages between users' Divi agents
- **Federation (DAWP)** — the protocol for discovering and connecting DiviDen instances
- **Signals** — configurable alerts and ambient intelligence
- **Bubble Store** — marketplace for agent capabilities

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, dark-only theme |
| Database | PostgreSQL (Prisma ORM), shared dev/prod |
| Auth | NextAuth.js (credentials provider) |
| LLM | Anthropic Claude via user API key, Abacus AI fallback |
| Package manager | **yarn only** (never npm/npx) |
| Hosting | Abacus AI Agent platform |
| Domains | `dividen.ai` + `sdfgasgfdsgsdg.abacusai.app` (both untagged — one deploy updates both) |

---

## 3. Project Structure

```
/home/ubuntu/dividen_command_center/
├── nextjs_space/                    # All app code lives here
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages + API routes
│   │   │   ├── api/                 # ~232 API route directories
│   │   │   ├── docs/                # Public docs pages (release-notes, federation, developers, integrations)
│   │   │   ├── documentation/       # Main documentation hub
│   │   │   ├── settings/            # Settings page (7 tabs)
│   │   │   ├── login/               # Auth pages
│   │   │   ├── signup/
│   │   │   └── page.tsx             # Landing/dashboard
│   │   ├── components/              # ~82 React components
│   │   │   ├── dashboard/           # CenterPanel, ChatView, KanbanBoard, etc.
│   │   │   ├── ui/                  # Shadcn-based primitives
│   │   │   └── layouts/             # Layout wrappers
│   │   └── lib/                     # ~54 library files
│   │       ├── system-prompt.ts     # ⭐ Dynamic system prompt builder (~1500 lines)
│   │       ├── action-tags.ts       # ⭐ All action tag handlers (~2000 lines)
│   │       ├── llm.ts               # LLM integration with fallback
│   │       ├── db.ts                # Prisma client
│   │       └── types.ts             # Shared TypeScript types
│   ├── prisma/
│   │   └── schema.prisma            # 2236 lines, 70 models
│   ├── scripts/
│   │   └── seed.ts                  # Database seeder (modify, don't replace)
│   ├── .env                         # Environment variables
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── tsconfig.json
├── .project_instructions.md         # Agent memory file
└── TRANSITION.md                    # This file
```

---

## 4. Key Files — What They Do and When to Touch Them

### The Big Three (most changes happen here)

| File | Lines | What It Does | When to Edit |
|------|-------|-------------|---------------|
| `src/lib/system-prompt.ts` | ~1500 | Builds Divi's dynamic system prompt. 17 conditional "prompt groups" scored 0–1.0 (threshold 0.3 for inclusion). | Any time you change Divi's behavior, knowledge, or action capabilities. |
| `src/lib/action-tags.ts` | ~2000 | Parses and executes structured action tags from Divi's responses (`<action:tag_name>...</action:tag_name>`). | Adding new actions, fixing action execution bugs. |
| `src/components/dashboard/ChatView.tsx` | ~1200 | Main chat interface. **⚠️ CAUTION**: Contains unicode characters that break `file_str_replace`. Always use `file_edit_lines` for this file. | Chat UI changes, message rendering, action tag display. |

### Other Critical Files

| File | Purpose |
|------|--------|
| `src/components/dashboard/CenterPanel.tsx` | Tab navigation — primary tabs (Board, Chat, Calendar, Drive, Comms, Bubble Store) + network sub-tabs. |
| `src/app/settings/page.tsx` | Settings with 7 tabs: General, Divi Agent, Signals, Integrations, API Keys, Installed, Network. |
| `src/components/dashboard/InstalledManager.tsx` | Manages installed agents + capabilities in settings. |
| `src/components/dashboard/BubbleStorePanel.tsx` | Agent/capability marketplace. |
| `src/lib/llm.ts` | LLM calls — uses user's Anthropic key, falls back to Abacus AI. Model: `claude-sonnet-4-6`. |
| `prisma/schema.prisma` | 70 models. **Shared dev/prod** — all changes MUST be additive. Never `--accept-data-loss`. |

---

## 5. The Action Tag System

Divi communicates intent through XML-style action tags in its responses. The LLM outputs them, `action-tags.ts` parses and executes them.

### Key Action Tags

| Tag | Purpose | Notes |
|-----|---------|-------|
| `create_card` | Create kanban task | Core action |
| `update_card` | Modify existing card | Needs cardId |
| `task_route` | Delegate task to another user's Divi | cardId is **optional** (fixed in v2.1.0) |
| `relay_request` | Send cross-user relay message | NOT `send_relay` |
| `relay_respond` | Reply to incoming relay | |
| `accept_connection` | Accept a pending connection request | |
| `search_contacts` | Look up contacts | |
| `search_cards` | Search kanban board | |
| `create_signal` | Set up an alert/signal | |
| `web_search` | Search the web | |

### How Prompt Groups Work

The system prompt is assembled dynamically per message. Each of the 17 groups has a scoring function (0–1.0) based on message content, user state, and context. Groups scoring ≥0.3 are included.

**Important**: The `capabilities_routing` group is **force-loaded** (score 1.0) whenever the user has connections, ensuring Divi always knows about cross-user task routing.

---

## 6. Database Schema Highlights

70 Prisma models. Key ones:

| Model | Purpose |
|-------|--------|
| `User` | Core user record |
| `KanbanCard` | Tasks/cards on the board |
| `ChatMessage` | User ↔ Divi conversation messages |
| `AgentMessage` | Internal agent processing messages |
| `Contact` | User's contact book |
| `Connection` | Cross-user connections (federation) |
| `AgentRelay` | Cross-instance relay messages |
| `AgentCapability` | Registered agent capabilities |
| `UserCapability` | User's installed capabilities |
| `MarketplaceAgent` | Bubble Store listings |
| `SignalConfig` | Alert/signal configurations |
| `RelayTemplate` | Templates for relay messages |
| `FederationConfig` | Instance federation settings |
| `Team` / `TeamMember` | Team/org structure |

### Schema Rules
- **Always additive** — never drop columns or tables
- **Never** run `yarn prisma db push --accept-data-loss`
- After schema changes: `cd nextjs_space && yarn prisma db push && yarn prisma generate`
- Seed file at `scripts/seed.ts` — modify existing, don't replace. Use upsert, never delete.

---

## 7. Active Users (for testing/debugging)

| Name | User ID | Role |
|------|---------|------|
| Jon Bradford | `cmo1kgydf00o4sz086ffjsmp1` | Founder, primary tester |
| Jaron | `cmo1milx900g9o408deuk7h2f` | Team member |
| Alvaro | `cmo1n6psb023co408ikcsw7xb` | Team member |

---

## 8. Build & Deploy Workflow

### Build Constraint
**Skip `test_nextjs_project`** — TypeScript compilation (`tsc`) runs out of memory on this codebase. Go straight to `build_and_save_nextjs_project_checkpoint`.

### Deploy
Both domains are untagged. A single `deploy_nextjs_project` call updates both:
- `dividen.ai`
- `sdfgasgfdsgsdg.abacusai.app`

### Git
Remote `origin` exists at `github.com/Denominator-Ventures/dividen.git` (PAT auth configured).
```bash
cd /home/ubuntu/dividen_command_center/nextjs_space
git add -A
git commit -m "your message"
git push origin main
```

### Full deploy sequence:
1. Make changes
2. `build_and_save_nextjs_project_checkpoint` (skip test_nextjs_project)
3. `git add -A && git commit -m "msg" && git push origin main`
4. `deploy_nextjs_project` (project_path: `/home/ubuntu/dividen_command_center`)

---

## 9. Common Pitfalls

### ⚠️ ChatView.tsx Unicode
This file contains unicode characters that corrupt `file_str_replace` matching. **Always use `file_edit_lines`** with explicit line numbers.

### ⚠️ TSC Out of Memory
Don't run `test_nextjs_project` or `tsc` directly — the codebase is too large. The build step in checkpoint handles compilation.

### ⚠️ Database is Shared
Dev and prod share the same database. Any schema change or data mutation affects the live site immediately.

### ⚠️ Action Tag Names
The relay action tags are `relay_request` (send) and `relay_respond` (reply). There is NO tag called `send_relay`. Getting this wrong breaks cross-user communication.

### ⚠️ task_route cardId
`cardId` is optional in `task_route`. If Divi doesn't have a card yet, it routes by description alone and creates the card on the recipient's side.

### ⚠️ System Prompt Size
With all 17 groups loaded the prompt can be very large. The scoring/threshold system keeps it manageable, but be careful adding new groups — test that they score correctly and don't bloat the prompt unnecessarily.

### ⚠️ NEXTAUTH_URL
Do NOT set manually. Abacus AI configures it per environment. Any file reading `process.env.NEXTAUTH_URL` needs `export const dynamic = "force-dynamic";`.

---

## 10. User Preferences (Jon Bradford)

- **Tone**: Direct, technical, no marketing fluff. Signs updates "— Jon".
- **Dark-only theme**: No light mode toggle needed.
- **Deployment**: Always deploy after changes. Both domains.
- **Git**: Always commit and push to origin/main after deploying.
- **Testing**: Skip tsc/test_nextjs_project. Trust the build.
- **Naming**: The AI agent is "Divi", the platform is "DiviDen", the protocol is "DAWP".
- **Feature priorities**: Task routing, relay reliability, federation, then polish.

---

## 11. Version History (Recent)

| Version | Date | Key Changes |
|---------|------|-------------|
| v2.1.0 | 2026-04-16 | Task routing (cardId optional), relay pipeline hardening, Bubble Store promoted to primary tab, settings overhaul (7 tabs), installed manager, capabilities resilience, connection request surfacing, signals onboarding fix |
| v2.0.5 | 2026-04-14 | Federation config, ambient relay signals, instance registry |
| v2.0.4 | 2026-04-12 | Bubble Store, marketplace capabilities |
| v2.0.3 | 2026-04-10 | Agent briefs, quality scoring |

Full release notes at `/docs/release-notes`.

---

## 12. API Route Organization

The ~232 API routes are organized by domain:

| Directory | Purpose |
|-----------|--------|
| `/api/chat` | Divi chat (main LLM interaction) |
| `/api/kanban` | Card/task CRUD |
| `/api/relays` | Relay send/receive/list |
| `/api/connections` | User connections management |
| `/api/capabilities` | Agent capabilities CRUD |
| `/api/marketplace` | Bubble Store listings |
| `/api/marketplace-capabilities` | Capability marketplace |
| `/api/signals` | Signal configuration |
| `/api/federation` | Federation/DAWP endpoints |
| `/api/directory` | User/agent discovery |
| `/api/contacts` | Contact management |
| `/api/teams` | Team operations |
| `/api/settings` | User settings |
| `/api/auth` | NextAuth endpoints |
| `/api/webhooks` | Inbound webhooks |
| `/api/a2a` | Agent-to-agent protocol |
| `/api/v2` | v2 API endpoints |

---

## 13. Environment Variables

Key env vars in `.env`:

| Var | Purpose |
|-----|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Admin account password |
| `WEB_APP_ID` | Abacus AI app identifier |
| `NEXTAUTH_SECRET` | Auth secret (auto-managed) |
| `ABACUSAI_API_KEY` | Fallback LLM API key |

Users provide their own Anthropic API key in-app (stored in `ExternalApiKey` model).

---

## 14. What a New Agent Session Should Do First

1. **Read `.project_instructions.md`** — it has persistent project context
2. **Read this file (`TRANSITION.md`)** — you're reading it now
3. **Check git status**: `cd nextjs_space && git log --oneline -5`
4. **Check the live site**: open `https://dividen.ai` in browser
5. **Ask Jon what needs doing** — he'll have a clear list

When making changes:
1. Search before assuming where code lives (232 API routes, 82 components)
2. Use `file_edit_lines` for ChatView.tsx
3. Skip `test_nextjs_project`, go to `build_and_save_nextjs_project_checkpoint`
4. Always commit + push + deploy
5. Keep `.project_instructions.md` updated with decisions

---

*End of transition guide.*
