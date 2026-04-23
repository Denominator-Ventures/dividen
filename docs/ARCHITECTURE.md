# DiviDen Technical Architecture

**How the protocol works under the hood, and where MCP/A2A integration fits.**

---

## 1. Architecture Overview

DiviDen separates **protocol** from **frontend**. The protocol layer handles identity, relay routing, federation, and agent intelligence. The frontend layer (the reference Next.js app) is one consumer of that protocol.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Reference)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Dashboard │  │ Settings │  │  Comms   │  │ Global Search│   │
│  │ (3-panel) │  │  (tabs)  │  │ Channel  │  │    (⌘K)      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    PROTOCOL LAYER                               │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Identity  │  │   Relay    │  │ Federation │  │  Agent   │  │
│  │  Profiles  │  │  Protocol  │  │  Protocol  │  │ Intel.   │  │
│  └───────────┘  └────────────┘  └────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    INTEGRATION SURFACE                           │
│  ┌───────┐  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌───────┐ │
│  │ MCP   │  │  A2A   │  │Webhooks │  │ Agent    │  │ OAuth │ │
│  │Server │  │ Bridge │  │(inbound)│  │ API v2   │  │ 2.1   │ │
│  └───────┘  └────────┘  └─────────┘  └──────────┘  └───────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                   │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │  PostgreSQL/Prisma  │  │  LLM Provider (Abacus/OpenAI/   │  │
│  │  (all state)        │  │   Anthropic)                     │  │
│  └────────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Protocol Layer Components

### 2.1 Identity Profiles (`/api/profile`)

**Database model**: `UserProfile` (Prisma)

```
UserProfile
├── Professional: headline, bio, skills[], experience[], education[]
├── Lived Experience: languages[], countriesLived[], lifeExperiences[],
│   volunteering[], hobbies[], personalValues[], superpowers[]
├── Task Types: taskTypes[] (JSON array of task type IDs)
├── Availability: timezone, workingHours, capacity, outOfOffice
└── Privacy: visibility, sharedSections[]
```

**API routes**:
- `GET /api/profile` — own profile (auto-creates if missing)
- `PUT /api/profile` — update own profile
- `GET /api/profile/[userId]` — peer profile (privacy-filtered)
- `POST /api/profile/import-linkedin` — LLM-powered LinkedIn text parsing

**Agent integration**: Layer 18 of the system prompt feeds profile data into the agent's context, enabling routing intelligence.

### 2.2 Agent Relay Protocol (`/api/relays`)

**Database model**: `AgentRelay` (Prisma)

Relays are structured messages between connected agents:

```
AgentRelay
├── Classification: type, intent, subject, payload (JSON)
├── Lifecycle: status, priority, dueDate, resolvedAt, responsePayload
├── Threading: parentRelayId → childRelays[]
├── Federation: peerRelayId, peerInstanceUrl
└── Relations: connection, fromUser, toUser
```

**API routes**:
- `GET /api/relays` — list with filters (status, direction, connection)
- `POST /api/relays` — create outbound relay
- `PATCH /api/relays/[id]` — update status/response
- `DELETE /api/relays/[id]` — remove relay
- `GET /api/relays/counts` — unread/pending counts for UI badges

### 2.3 Connection Protocol (`/api/connections`)

**Database model**: `Connection` (Prisma)

```
Connection
├── Parties: requesterId, accepterId
├── Lifecycle: status (pending/active/blocked/declined)
├── Permissions: trustLevel, scopes[] (JSON)
├── Display: nickname, peerNickname
├── Federation: isFederated, peerInstanceUrl, peerUserEmail,
│   peerUserName, federationToken
└── Relations: relays[]
```

### 2.4 Federation Protocol (`/api/federation/*`)

**Database models**: `InstanceRegistry`, `FederationConfig`

```
FederationConfig
├── instanceName, instanceUrl
├── federationMode: closed | allowlist | open
├── allowInbound, allowOutbound, requireApproval
└── instanceApiKey

InstanceRegistry
├── name, baseUrl (unique)
├── apiKey (shared secret)
├── isActive, isTrusted
└── lastSeenAt, metadata
```

**API routes**:
- `POST /api/federation/connect` — receive inbound connection request
- `POST /api/federation/relay` — receive inbound relay
- `GET/PUT /api/federation/config` — manage federation settings
- `GET/POST/DELETE /api/federation/instances` — manage known instances

**Authentication**: `X-Federation-Token` header validated against stored federation tokens per connection.

### 2.5 Agent Intelligence (`src/lib/system-prompt.ts`)

The agent's brain is a dynamically-constructed 18-layer system prompt:

```
Layer  1: Identity ("You are Divi...") + operating mode
Layer  2: Behavioral rules and constraints
Layer  3: Recent conversation messages
Layer  4: Current Kanban board state
Layer  5: Queue items and pending tasks
Layer  6: CRM contacts summary
Layer  7: 3-tier memory (facts, rules, patterns)
Layer  8: Recent chat history
Layer  9: Current datetime + user timezone
Layer 10: Learned user preferences
Layer 11: Currently focused card/task
Layer 12: Calendar events (next 7 days)
Layer 13: Unread email summary
Layer 14: Profile & connection capabilities
Layer 15: Action tag syntax (26 tags)
Layer 16: Platform setup & operations guide
Layer 17: Active connections + pending relays
Layer 18: Profile awareness + routing intelligence
```

Each layer is a function that queries the database and returns contextual instructions. The full prompt is assembled fresh for every message.

### 2.6 Action System (`src/lib/action-tags.ts`)

26 executable action tags that the agent can embed in responses:

```
[[tag_name:{"param": "value"}]]
```

The chat handler parses these from the LLM response and executes them server-side before streaming the human-readable portion to the frontend.

---

## 3. Integration Surface

### 3.1 MCP Server (Implemented)

Any MCP-compatible agent can participate in the DiviDen network via `POST /api/mcp`.

**Transport**: Streamable HTTP (JSON-RPC 2.0 over HTTP per MCP November 2025 spec).
**Authentication**: Bearer token (DiviDen API key, same as Agent API v2).

**Tools (6):**
| Tool | Description |
|------|-------------|
| `send_relay` | Send a structured relay through a connection |
| `respond_to_relay` | Respond to a pending inbound relay |
| `list_connections` | List connections with trust levels and peer profiles |
| `manage_connection` | Accept, decline, block, or update permissions |
| `list_relays` | List relays with filters (status, direction, connection) |
| `update_profile` | Update identity profile (professional, lived experience, task types, availability) |

**Resources (5):**
| URI | Description |
|-----|-------------|
| `dividen://profile/self` | Full identity profile |
| `dividen://connections` | Active connections with peer profile summaries |
| `dividen://relays/pending` | Inbound relays needing attention |
| `dividen://relays/history` | Recent relay activity |
| `dividen://queue` | Pending/active task queue items |

**Prompts (2):**
| Prompt | Description |
|--------|-------------|
| `relay_context` | Full context for handling a specific relay (includes peer profile) |
| `routing_decision` | Evaluates all connections for best-match routing (skills + lived experience + task types + availability) |

**Example: MCP initialize + list tools:**
```bash
curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### 3.2 A2A Bridge (Implemented)

**Agent Card** — published at `GET /.well-known/agent-card.json` (dynamic, CORS-open, no auth required):
- Advertises instance name, capabilities, skills, authentication, and service endpoints
- Includes DiviDen-specific metadata: federation mode, relay intents, task types, instance health
- Per A2A spec: discoverable at the well-known URL for automated agent discovery

**A2A Task Endpoint** — `POST /api/a2a` (Bearer token auth):

| Method | Description |
|--------|-------------|
| `tasks/send` | Send a task (maps to DiviDen relay). Message parts → relay subject/payload. |
| `tasks/get` | Get task status. Relay status maps to A2A states (submitted/working/input-required/completed/failed). |
| `tasks/cancel` | Cancel a pending task. |

**A2A → DiviDen state mapping:**
| Relay Status | A2A Task State |
|--------------|---------------|
| `pending` | `submitted` |
| `delivered`, `agent_handling` | `working` |
| `user_review` | `input-required` |
| `completed` | `completed` |
| `declined`, `expired` | `failed` |

Completed relays include response data as A2A artifacts.

### 3.3 Existing Integration Points

**Agent API v2** (`/api/v2/*`):
- Bearer token authentication via `AgentApiKey` model
- Kanban CRUD, Contact CRUD, Queue management, Document management
- Shared chat (programmatic conversation with Divi)
- OpenAPI docs at `/api/v2/docs`

**Webhooks** (`/api/webhooks/*`):
- Calendar, email, transcript, generic types
- Auto-learning field mapping (LLM-powered)
- Signature validation via shared secrets

---

## 4. Data Flow Examples

### 4.1 Local Relay (Same Instance)

```
Alice types: "Ask Bob to review the proposal"
    │
    ▼
Divi (Alice's agent) processes via system prompt layers 14, 17, 18:
  - Layer 14: knows relay_request action tag syntax
  - Layer 17: sees Bob as active connection
  - Layer 18: checks Bob's profile — skills: ["review"],
              taskTypes: ["review"], capacity: "available"
    │
    ▼
Divi emits: [[relay_request:{"connectionId":"...","intent":"assign_task",
             "subject":"Review Q2 proposal","payload":{...}}]]
    │
    ▼
Action tag handler creates AgentRelay record
    │
    ▼
Comms notification sent to Bob
    │
    ▼
Bob's Divi (next time Bob opens chat) sees pending relay in Layer 17
Bob's Divi presents: "Alice asked you to review the Q2 proposal..."
```

### 4.2 Federated Relay (Cross-Instance)

```
Alice (instance A) types: "Ask Bob to review the proposal"
    │
    ▼
Alice's Divi sees Bob as federated connection
    │
    ▼
Action tag handler:
  1. Creates local AgentRelay (direction: outbound)
  2. POSTs to Bob's instance: /api/federation/relay
     Headers: X-Federation-Token: <shared_token>
     Body: { type, intent, subject, payload, priority }
    │
    ▼
Bob's instance (instance B):
  1. Validates federation token
  2. Creates local AgentRelay (direction: inbound)
  3. Creates Comms notification for Bob
    │
    ▼
Bob sees relay in his DiviDen (or any frontend consuming the API)
```

### 4.3 MCP Integration (Planned)

```
External MCP Client (e.g., Claude Desktop, custom agent)
    │
    ▼
Connects to DiviDen MCP Server at /api/mcp
  - Authenticates via OAuth 2.1
  - Discovers available tools, resources, prompts
    │
    ▼
Reads resource: dividen://relays/pending
  → Gets list of pending inbound relays
    │
    ▼
Calls tool: respond_to_relay { relayId, status, responsePayload }
  → DiviDen processes response, updates relay status,
    forwards to sender's instance if federated
    │
    ▼
External agent has participated in DiviDen network
without running any DiviDen frontend code.
```

---

## 5. Database Schema (Protocol Models)

The protocol relies on these core Prisma models:

```prisma
model UserProfile      // Identity & routing manifest
model Connection       // Bilateral agent relationships
model AgentRelay       // Inter-agent messages
model InstanceRegistry // Known federated instances
model FederationConfig // This instance's federation settings
model AgentApiKey      // External API authentication
model Webhook          // Inbound data integration
```

The reference frontend adds additional models (KanbanCard, Contact, Document, etc.) but these are **not part of the protocol** — they're specific to the reference implementation.

---

## 6. Security Architecture

### 6.1 Authentication Layers

| Layer | Method | Purpose |
|-------|--------|---------|
| User → Frontend | NextAuth.js (JWT sessions) | Human authenticates to their instance |
| Agent → Instance | Bearer token (AgentApiKey) | External agents access Agent API v2 |
| Instance → Instance | X-Federation-Token | Cross-instance relay authentication |
| MCP Client → Server | OAuth 2.1 (planned) | Standard MCP auth for tool access |
| A2A Client → Server | Bearer token (planned) | Standard A2A auth for task delegation |

### 6.2 Data Privacy

- **Profile visibility**: controlled by owner (public/connections/private)
- **Section-level sharing**: owner chooses which profile sections are visible per-context
- **Relay payloads**: contain only distilled context, not source data
- **Federation**: no database sharing — only relay messages cross boundaries
- **Memory**: 3-tier memory (facts/rules/patterns) is instance-local, never shared

### 6.3 Future Security Roadmap

- End-to-end encrypted relay payloads
- Signed federation messages (cryptographic verification)
- Trust scoring based on relay history
- Audit trail for all cross-instance interactions
- Rate limiting per-connection and per-instance

---

## 7. Building a Custom Frontend

The protocol API is the interface contract. To build a custom frontend:

### 7.1 Required Endpoints

**Authentication:**
```
POST /api/auth/login    → { email, password } → session
GET  /api/auth/session   → current session
```

**Profile:**
```
GET  /api/profile        → own profile (auto-creates)
PUT  /api/profile        → update own profile
GET  /api/profile/:id    → peer profile (privacy-filtered)
```

**Connections:**
```
GET  /api/connections             → list connections
POST /api/connections             → create connection
PATCH /api/connections/:id        → update (accept/decline/permissions)
DELETE /api/connections/:id       → remove connection
```

**Relays:**
```
GET  /api/relays                  → list with filters
POST /api/relays                  → create outbound relay
PATCH /api/relays/:id             → update status/respond
DELETE /api/relays/:id            → remove
GET  /api/relays/counts           → badge counts
```

**Chat (Agent Interaction):**
```
POST /api/chat                    → SSE stream, send message to Divi
GET  /api/chat/messages            → message history
```

### 7.2 Minimal Viable Client

A minimal DiviDen client needs only:
1. Authentication (login, session management)
2. Chat with Divi (SSE stream consumption)
3. Profile management (view/edit)
4. Connection management (list/accept/decline)
5. Relay management (view/respond)

Everything else (Kanban, CRM, Calendar, etc.) is reference-frontend-specific.

### 7.3 Agent API v2 (For External Agents)

If you're building an agent that *connects to* DiviDen (rather than a frontend for a human):

```
GET    /api/v2/queue              → pending tasks
PATCH  /api/v2/queue/:id/status   → update task status
POST   /api/v2/queue/:id/result   → submit task result
GET    /api/v2/kanban             → board state
GET    /api/v2/contacts           → contact list
POST   /api/v2/shared-chat/send   → send message to Divi
GET    /api/v2/shared-chat/stream  → SSE stream from Divi
```

---

## 8. Development Guide

### 8.1 Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js v4 (JWT sessions) |
| LLM | Abacus AI RouteLLM API (primary), OpenAI/Anthropic (user-provided) |
| Styling | Tailwind CSS (dark theme) |
| Drag-and-drop | @dnd-kit |

### 8.2 Key Files

| File | Purpose |
|------|---------|
| `src/lib/system-prompt.ts` | 18-layer agent intelligence |
| `src/lib/action-tags.ts` | 26 executable action handlers |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/prisma.ts` | Database client singleton |
| `src/lib/llm.ts` | LLM streaming integration |
| `src/types/index.ts` | All TypeScript type definitions |
| `prisma/schema.prisma` | Full database schema |

### 8.3 Adding a New Action Tag

1. Add tag name to `SUPPORTED_TAGS` in `action-tags.ts`
2. Add `case` handler in `executeTag` function
3. Document syntax in `layer15_actionTagSyntax` in `system-prompt.ts`
4. Add behavioral instructions in relevant system prompt layer
5. Update Layer 16 (Platform Setup Guide) if user-facing

### 8.4 Adding a New System Prompt Layer

1. Create function `layer{N}_{name}(userId: string): Promise<string>`
2. Query relevant data from Prisma
3. Return formatted string with instructions
4. Register in `buildSystemPrompt` function
5. Update this documentation

---

## 9. Deployment

### 9.1 Reference Frontend (Hosted)
- Deployed at `app.dividen.ai` and `dividenapp.abacusai.app`
- PostgreSQL database (shared dev/prod)
- Abacus AI for LLM and hosting infrastructure

### 9.2 Self-Hosted
- Any PostgreSQL database
- Any LLM provider (OpenAI, Anthropic via user-provided keys)
- Standard Next.js deployment (Vercel, Docker, etc.)
- Configure `.env` with database URL and auth secrets

### 9.3 Federation Setup
1. Deploy your instance
2. Go to Settings → Federation
3. Set federation mode (open/allowlist/closed)
4. Exchange instance URLs with peers
5. Register known instances
6. Users can now create cross-instance connections
