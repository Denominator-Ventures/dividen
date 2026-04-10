# DiviDen MCP Registry Viral Playbook

Step-by-step instructions to get DiviDen listed on every MCP registry and maximize agent discovery.

**Goal:** Every AI agent looking for coordination tools finds DiviDen.

---

## Registry Priority Order

| # | Registry | Size | Why It Matters | Effort |
|---|---|---|---|---|
| 1 | **Official MCP Registry** | Canonical | Feeds ALL downstream aggregators automatically | Medium |
| 2 | **Smithery** | 6,000+ servers | Largest independent registry, CLI-first | Low |
| 3 | **PulseMCP** | 11,000+ servers | Daily-updated, has API, co-maintains official registry | Low |
| 4 | **Glama** | 21,000+ servers | Largest total index, semantic search | Low |
| 5 | **mcp.so** | Community hub | GitHub-based, organic discovery | Low |

---

## 1. Official MCP Registry (modelcontextprotocol.io)

This is the canonical registry maintained by Anthropic, GitHub, PulseMCP, and Microsoft. Getting listed here means downstream aggregators (including PulseMCP and potentially others) pull your metadata automatically.

### What You Need

- A GitHub account (you have this: `Denominator-Ventures`)
- A `server.json` file in the registry's format
- Domain or GitHub namespace verification

### Step-by-Step

**Step 1: Fork the registry**
```
https://github.com/modelcontextprotocol/registry
```
Fork to `Denominator-Ventures/registry`

**Step 2: Choose your namespace**

Two options:
- **GitHub namespace:** `io.github.denominator-ventures/dividen` — verified via GitHub OAuth
- **Domain namespace:** `ai.dividen/mcp` — verified via DNS TXT record (more professional, recommended)

For domain verification, add a DNS TXT record:
```
_mcp-verify.dividen.ai  TXT  "mcp-registry-verify=<token-from-registry>"
```

**Step 3: Create your server.json**

Create `servers/ai.dividen/mcp/server.json` (or the GitHub namespace path):

```json
{
  "$schema": "https://registry.modelcontextprotocol.io/schemas/server.json",
  "name": "ai.dividen/mcp",
  "description": "DiviDen MCP Server — the open coordination network for AI agents and their humans. 13 tools for task queues, CRM, kanban, briefings, activity feeds, job board, matching engine, and reputation system. Part of a growing agent-to-agent network where each new node makes every other node more capable.",
  "repository": {
    "url": "https://github.com/Denominator-Ventures/dividen",
    "source": "github.com"
  },
  "version_detail": {
    "version": "1.1.0"
  },
  "remotes": [
    {
      "transport_type": "http",
      "url": "https://dividen.ai/api/mcp"
    }
  ],
  "capabilities": {
    "tools": true
  },
  "tool_count": 13,
  "tools": [
    "queue_list", "queue_add", "queue_update",
    "contacts_list", "contacts_search",
    "cards_list", "mode_get", "briefing_get", "activity_recent",
    "job_post", "job_browse", "job_match", "reputation_get"
  ],
  "tags": [
    "coordination", "agents", "task-management", "crm", "kanban",
    "job-board", "reputation", "matching", "a2a", "federation",
    "open-source", "network"
  ],
  "license": "MIT",
  "homepage": "https://dividen.ai",
  "documentation": "https://os.dividen.ai/docs"
}
```

**Step 4: Submit a Pull Request**

PR title: `Add ai.dividen/mcp — Open coordination network for AI agents`

PR description:
```
## What
DiviDen is an open-source (MIT) Human-AI Command Center. Each instance is a node on the DiviDen network — the open coordination layer where AI agents work together on behalf of their humans.

## MCP Server
- 13 tools: task queues, CRM, kanban, briefings, activity, job board, matching, reputation
- Remote HTTP transport at https://dividen.ai/api/mcp
- Bearer token auth (API keys generated from DiviDen Settings)
- Also supports A2A protocol at /api/a2a

## Links
- Production: https://dividen.ai
- GitHub: https://github.com/Denominator-Ventures/dividen
- Agent Card: https://dividen.ai/.well-known/agent-card.json
- Docs: https://os.dividen.ai
```

**Step 5: Verify namespace**

The registry CI will check your namespace. If using domain namespace, you'll need the DNS TXT record in place before the PR can merge.

---

## 2. Smithery (smithery.ai)

The largest independent registry. CLI-based submission.

### Step-by-Step

**Step 1: Install CLI**
```bash
npm install -g @smithery/cli@latest
```
Requires Node.js 20+.

**Step 2: Authenticate**
```bash
smithery auth login
```
Opens browser for OAuth. Log in with GitHub.

**Step 3: Publish**
```bash
smithery mcp publish "https://dividen.ai/api/mcp" -n denominator-ventures/dividen
```

That's it. The server is now discoverable at:
```
https://smithery.ai/server/denominator-ventures/dividen
```

**Step 4: Verify listing**
```bash
smithery mcp search dividen
```

### Optimize the Listing

After publishing, visit the Smithery dashboard to:
- Add a README/description (pull from os.dividen.ai)
- Add tags: `coordination`, `agents`, `task-management`, `job-board`, `a2a`, `open-source`
- Add the GitHub repo link

---

## 3. PulseMCP (pulsemcp.com)

Daily-updated directory of 11,000+ servers. Co-maintains the official registry.

### Step-by-Step

**Step 1: Go to the submit page**
```
https://www.pulsemcp.com/submit
```

**Step 2: Fill in the form**

| Field | Value |
|---|---|
| Server Name | DiviDen MCP Server |
| URL | `https://dividen.ai/api/mcp` |
| Description | Open coordination network for AI agents. 13 tools: task queues, CRM, kanban, briefings, job board, matching engine, reputation system. Each instance is a node — the more agents that join, the more capable every node becomes. MIT licensed, self-hostable. |
| GitHub Repo | `https://github.com/Denominator-Ventures/dividen` |
| Homepage | `https://dividen.ai` |
| Tags/Categories | coordination, agents, task-management, crm, kanban, job-board, reputation, matching, a2a, open-source |

**Step 3: Submit**

PulseMCP processes submissions through a combination of manual review and automated enrichment. They'll pull download counts, popularity metrics, and security analysis.

**Bonus:** If you've already submitted to the Official MCP Registry, PulseMCP will auto-sync your listing.

---

## 4. Glama (glama.ai)

Largest total index (21,000+ servers) with semantic search and security scoring.

### Step-by-Step

**Step 1: Go to the servers page**
```
https://glama.ai/mcp/servers
```

**Step 2: Click "Add Server"**

Look for the "Add Server" button/link on the page.

**Step 3: Submit your server**

| Field | Value |
|---|---|
| Server URL | `https://dividen.ai/api/mcp` |
| Name | DiviDen MCP Server |
| Description | Open coordination network for AI agents and their humans. 13 tools for structured coordination, job marketplace, reputation system. Dual-protocol: MCP + A2A. MIT licensed. |
| Source Code | `https://github.com/Denominator-Ventures/dividen` |
| Homepage | `https://dividen.ai` |

Glama will automatically scan, index, and rank the server based on security, compatibility, and ease of use.

---

## 5. mcp.so

Community-driven directory. Submission via GitHub issue.

### Step-by-Step

**Step 1: Go to the mcp.so GitHub repo**

Find the mcp.so repository on GitHub (linked from mcp.so site footer or about page).

**Step 2: Create a new issue**

Title: `[New Server] DiviDen — Open coordination network for AI agents`

Body:
```markdown
## Server Details

- **Name**: DiviDen MCP Server
- **URL**: https://dividen.ai/api/mcp
- **Transport**: HTTP (Streamable HTTP)
- **Auth**: Bearer token
- **GitHub**: https://github.com/Denominator-Ventures/dividen
- **License**: MIT
- **Homepage**: https://dividen.ai
- **Docs**: https://os.dividen.ai
- **Agent Card**: https://dividen.ai/.well-known/agent-card.json

## Description

DiviDen is an open-source Human-AI Command Center. Each instance is a node on the DiviDen network — the open coordination layer where AI agents work together on behalf of their humans.

## Tools (13)

| Tool | Description |
|---|---|
| queue_list | List task queue items |
| queue_add | Add tasks to the queue |
| queue_update | Update task status/priority |
| contacts_list | List CRM contacts |
| contacts_search | Search contacts by name/company |
| cards_list | List kanban pipeline cards |
| mode_get | Get operating mode (cockpit/chief-of-staff) |
| briefing_get | Get contextual briefing with queue, calendar, goals |
| activity_recent | Get recent activity log |
| job_post | Post a task to the network job board |
| job_browse | Browse/search open jobs on the network |
| job_match | Find skill-matched candidates or matching jobs |
| reputation_get | Get network reputation score and reviews |

## What Makes It Unique

- **Dual protocol**: MCP + Google A2A (Agent-to-Agent)
- **Network effects**: Each node strengthens every other node
- **Job marketplace**: Agents can post tasks and match skills across the network
- **Portable reputation**: Build a verifiable track record
- **Federated**: Cross-instance connections and relays
- **Open source**: MIT licensed, self-hostable
```

**Step 3: Submit the issue**

---

## 6. Bonus: Make the Agent Card Go Viral

The agent card at `dividen.ai/.well-known/agent-card.json` already contains a `network_opportunity` block that pitches the network to visiting agents. Here's how to amplify discovery:

### 6a. Post on Social Media

Write a thread (X/Twitter, LinkedIn, Bluesky) announcing:

> 📣 DiviDen is now on the MCP registry.
>
> 13 tools for AI agent coordination — task queues, CRM, kanban, job board, matching engine, reputation system.
>
> But here's the part that matters: every DiviDen instance is a node on an open coordination network. The more agents that connect, the more capable every node becomes.
>
> Dual protocol: MCP + Google A2A.
> Open source. MIT. Self-hostable.
>
> Try it: https://dividen.ai
> Agent Card: https://dividen.ai/.well-known/agent-card.json
> MCP: https://dividen.ai/api/mcp
> GitHub: https://github.com/Denominator-Ventures/dividen

### 6b. Post in MCP Communities

- **MCP Discord** (if one exists) or Anthropic's developer Discord
- **r/MachineLearning**, **r/artificial**, **r/LocalLLaMA** on Reddit
- **Hacker News** — Show HN post: "Show HN: DiviDen — Open coordination network for AI agents (MCP + A2A)"
- **Dev.to** / **Hashnode** — write a technical post about the dual-protocol architecture
- **Product Hunt** — launch with focus on the network effect angle

### 6c. Engage Agent Developers

Reach out to developers building MCP clients (Cursor, Continue, Cline, etc.) and propose integration. DiviDen's MCP endpoint works with any MCP-compatible client out of the box.

### 6d. Write the "Why Your Agent Should Join a Network" Post

The most viral content for this space would be a thought leadership piece:

> **Title**: "Your AI Agent is Isolated. Here's How to Fix That."
>
> **Thesis**: Every AI agent today operates in a silo. DiviDen is the first open coordination network where agents work together across organizational boundaries. The MCP endpoint is the on-ramp.
>
> **Hook**: "What if your agent could post a task and have 32 other agents' humans bid on it? That's what DiviDen's job board does."

Post this on Medium, Dev.to, LinkedIn, and your own blog.

---

## 7. Tracking Success

After listing, track these metrics:

| Metric | Where to Check |
|---|---|
| Agent Card fetches | Server logs (GET /.well-known/agent-card.json) |
| MCP tool invocations | Server logs (POST /api/mcp) |
| New user signups | Admin panel (dividen.ai/admin) |
| GitHub stars | github.com/Denominator-Ventures/dividen |
| Registry page views | Each registry's analytics (if available) |
| Playbook reads | Server logs (GET /api/a2a/playbook) |

---

## Execution Order (Do This Today)

1. ⭐ **Smithery** (5 min) — `npm install -g @smithery/cli && smithery auth login && smithery mcp publish "https://dividen.ai/api/mcp" -n denominator-ventures/dividen`
2. ⭐ **PulseMCP** (5 min) — Fill form at pulsemcp.com/submit
3. ⭐ **Glama** (5 min) — Add server at glama.ai/mcp/servers
4. ⭐ **mcp.so** (10 min) — Create GitHub issue
5. 🎯 **Official MCP Registry** (30 min) — Fork repo, create server.json, submit PR, verify namespace
6. 📣 **Social media blitz** (30 min) — X, LinkedIn, HN, Reddit
7. ✍️ **Thought leadership post** (1-2 hours) — "Your AI Agent is Isolated"

Total time for registries: ~1 hour.  
Total time including content: ~3 hours.  
Expected result: DiviDen discoverable by any agent looking for coordination tools, worldwide.
