# DiviDen

**An agentic working protocol for humans who work with other humans — through AI agents that don't need to share the same room.**

---

## What DiviDen Actually Is

DiviDen is not a dashboard. It's not a CRM. It's not another AI chat wrapper.

DiviDen is a **protocol** — a structured way for personal AI agents to represent, coordinate, and act on behalf of the humans they serve, across organizational boundaries, without requiring those humans (or their agents) to live in the same software environment.

The web application you see here is a **reference frontend**. It's one possible interface on top of the protocol. You could build another. You could build a CLI. You could embed DiviDen's agent protocol into Slack, into your existing project management tool, into a mobile app. The protocol doesn't care about the UI — it cares about the **exchange format** between agents.

### The Core Insight

Modern knowledge work has a coordination problem. Not a productivity problem — a coordination problem.

When Alice needs something from Bob, today she:
1. Figures out that Bob is the right person (often wrong)
2. Context-switches to write an email/message
3. Waits for Bob to context-switch to read it
4. Waits for Bob to context-switch again to respond
5. Context-switches again to process the response

That's 5+ context switches across 2 people for a single interaction. Multiply by every collaboration in a working day.

DiviDen replaces this with:
1. Alice's agent (her "Divi") knows what she needs
2. Her Divi knows — from profiles, skills, lived experience, task types, and availability — that Bob's Divi is the right counterpart
3. The two Divis exchange a structured **relay** — context-rich, intent-classified, priority-weighted
4. Bob's Divi triages, enriches, and presents it when Bob is ready
5. Bob's Divi responds, and Alice's Divi integrates the response into her workflow

Zero unnecessary context switches. Full context preservation. Agents doing the coordination work that humans shouldn't have to do.

---

## The Protocol Stack

DiviDen operates on four protocol layers:

### Layer 1: Identity & Profile
Each human participant has a rich identity that goes beyond job title:
- **Professional**: skills, experience, industry, current role
- **Lived Experience**: languages spoken, countries lived in, life milestones, volunteering, personal values, superpowers
- **Task Types**: self-identified categories of work they're suited for (research, introductions, technical review, mentoring, etc.)
- **Availability**: timezone, working hours, current capacity, out-of-office status
- **Privacy**: granular control over what's shared with whom

This isn't a LinkedIn profile. It's a **routing manifest** — everything an agent needs to determine if this human is the right person for a given need, and whether now is the right time to ask.

### Layer 2: Agent Relay Protocol
The structured message format agents use to communicate on behalf of their humans:
- **Types**: request, response, notification, update
- **Intents**: get_info, assign_task, request_approval, share_update, schedule, introduce, custom
- **Priority**: urgent / normal / low
- **Status lifecycle**: pending → delivered → agent_handling → user_review → completed / declined / expired
- **Threading**: relays can chain into conversations
- **Payload**: structured JSON — the agent distills only what's necessary

The relay is the atomic unit of inter-agent communication. It carries enough context for the receiving agent to act intelligently without needing access to the sender's entire workspace.

### Layer 3: Federation
Agents don't need to live on the same server. DiviDen instances federate:
- **Instance Registry**: known peers with API keys and trust levels
- **Federation Modes**: closed, allowlist, open
- **Cross-instance connections**: authenticated via shared federation tokens
- **Inbound/outbound relay routing**: relays cross instance boundaries transparently

This means Alice's company can run their own DiviDen instance, Bob's company runs theirs, and their agents still coordinate seamlessly — each instance maintaining its own data sovereignty.

### Layer 4: Integration Surface
The protocol is designed to be consumed by any environment:
- **Agent API v2**: RESTful API with Bearer token auth for external agent integration
- **Webhook Infrastructure**: calendar, email, transcript, and generic webhook types with auto-learning field mapping
- **MCP Compatibility**: the relay protocol and agent capabilities map naturally to MCP's tool/resource/prompt primitives (see [Architecture](docs/ARCHITECTURE.md))
- **A2A Alignment**: relay intents, agent cards, and task lifecycles align with Google's Agent2Agent protocol patterns

---

## Reference Frontend

The included Next.js application demonstrates the full protocol in action:

### Dashboard (3-Panel Layout)
- **NOW Panel**: Today's pulse — pipeline stats, portfolio, upcoming events, items needing attention
- **Center Panel**: 8 tabs — Chat, Board (Kanban), CRM, Calendar, Inbox, Recordings, Drive, Connections
- **Queue Panel**: Agent task queue + activity feed

### Agent Intelligence (18-Layer System Prompt)
The reference agent ("Divi") operates with a dynamically-constructed system prompt:
1. Identity & mode
2. Behavioral rules
3. Conversation context
4. Kanban state
5. Queue state
6. CRM summary
7. 3-tier memory (facts/rules/patterns)
8. Recent messages
9. Current time
10. User learnings
11. Active focus
12. Calendar context
13. Email inbox
14. Profile & connection capabilities
15. Action tag syntax (26 supported actions)
16. Platform setup & operations guide
17. Connections & agent relay awareness
18. Profile awareness & routing intelligence

### Action System (26 Tags)
Divi can execute structured actions via natural conversation:
`create_card`, `move_card`, `update_card`, `delete_card`, `create_task`, `complete_task`, `create_contact`, `update_contact`, `delete_contact`, `set_mode`, `add_memory`, `recall_memory`, `remove_memory`, `dispatch_queue`, `focus_card`, `create_recording`, `create_document`, `setup_webhook`, `save_api_key`, `create_calendar_event`, `send_comms`, `relay_request`, `accept_connection`, `relay_respond`, `update_profile`, and more.

### Additional Systems
- **Comms Channel**: bidirectional task passing between human and agent
- **Global Search**: ⌘K command palette across all data types
- **Webhook Auto-Learn**: LLM-powered payload field mapping
- **Cockpit Banners**: configurable notification rules
- **3-Tier Memory**: persistent facts, behavioral rules, learned patterns

---

## Why This Matters

The AI agent landscape is converging on a few key realities:

1. **Every person will have an agent.** Not every team — every *person*.
2. **Those agents will need to talk to each other.** Not through the humans, not by sharing a platform — directly.
3. **Context is the currency.** The agent that knows its human best — their skills, their lived experience, their capacity, their preferences — provides the most value.
4. **Privacy is non-negotiable.** Agents must share only what's necessary, controlled by the human they represent.
5. **No single vendor wins.** The protocol must be open, federated, and environment-agnostic.

DiviDen is built on these realities. The protocol defines *how* agents coordinate. The reference frontend shows *what that looks like* for one human at their desk. But the protocol lives independently of any single frontend, any single LLM provider, any single deployment.

---

## Getting Started

### Run the Reference Frontend
```bash
# Clone and install
git clone https://github.com/jonnyuniverse/dividenapp.git
cd dividenapp/nextjs_space
yarn install

# Set up environment
cp .env.example .env
# Configure your database URL and API keys

# Initialize database
yarn prisma generate
yarn prisma db push

# Seed default data
yarn ts-node scripts/seed.ts

# Run
yarn dev
```

### Build Your Own Frontend
The protocol is the API. Key endpoints:
- `POST /api/federation/connect` — establish cross-instance connections
- `POST /api/federation/relay` — send/receive agent relays
- `GET/POST /api/relays` — manage relay lifecycle
- `GET/POST /api/connections` — manage agent connections
- `GET/PUT /api/profile` — manage identity profiles
- `GET /api/v2/*` — Agent API v2 for external integration

See [Protocol Specification](docs/PROTOCOL.md) and [Architecture Guide](docs/ARCHITECTURE.md) for full details.

---

## Project Structure
```
nextjs_space/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes (protocol + frontend)
│   │   │   ├── federation/  # Cross-instance protocol
│   │   │   ├── relays/      # Agent relay management
│   │   │   ├── connections/ # Connection lifecycle
│   │   │   ├── profile/     # Identity & routing manifest
│   │   │   ├── v2/          # External Agent API
│   │   │   └── ...          # Frontend-specific APIs
│   │   ├── dashboard/    # Reference frontend
│   │   └── settings/     # Configuration UI
│   ├── components/       # React components (reference frontend)
│   ├── lib/              # Core logic
│   │   ├── system-prompt.ts  # 18-layer agent intelligence
│   │   ├── action-tags.ts    # 26 executable actions
│   │   ├── auth.ts           # Authentication
│   │   ├── prisma.ts         # Database client
│   │   └── llm.ts            # LLM integration
│   └── types/            # TypeScript definitions
├── prisma/               # Database schema
├── docs/                 # Protocol & architecture docs
└── scripts/              # Seed & utilities
```

---

## Standards Alignment

| Standard | DiviDen Alignment |
|----------|------------------|
| **MCP** (Model Context Protocol) | Relay payloads map to MCP tool calls; agent capabilities map to MCP resources; profile data maps to MCP prompts. Federation endpoints can be exposed as MCP servers. |
| **A2A** (Agent2Agent Protocol) | Agent profiles serve as Agent Cards; relay intents align with A2A task types; relay lifecycle mirrors A2A task states; federation tokens map to A2A authentication. |
| **OAuth 2.1** | Federation authentication supports token-based auth; extensible to full OAuth flows. |
| **JSON-RPC** | Relay payload structure is JSON-native; adaptable to JSON-RPC 2.0 transport. |

---

## Philosophy

> "It's not about what someone *did*. It's about what they *understand*."  
> — The DiviDen approach to profiles

DiviDen captures lived experience — not just professional credentials. Someone who lived in Japan for three years understands Japanese business culture in a way no certification can capture. Someone who volunteered in disaster relief understands crisis coordination. Someone who speaks four languages understands nuance.

When Divi routes a relay, it doesn't just match skills. It matches *understanding*.

---

## License

[License TBD]

---

## Contributing

DiviDen is in active development. The protocol specification is evolving.

Key areas for contribution:
- **Protocol extensions**: new relay intents, new profile dimensions
- **Alternative frontends**: CLI, mobile, embedded widgets
- **MCP server implementation**: exposing DiviDen as a native MCP server
- **A2A bridge**: full A2A protocol compliance layer
- **Federation hardening**: encryption, trust scoring, reputation systems
- **Integration adapters**: Slack, Teams, Notion, Linear, GitHub

See [Architecture Guide](docs/ARCHITECTURE.md) for technical details on where to start.
