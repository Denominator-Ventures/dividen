# DiviDen Agentic Working Protocol

**Version 0.1 — Draft Specification**

This document specifies the DiviDen Agentic Working Protocol (DAWP) — a structured approach to inter-agent coordination on behalf of human participants.

---

## 1. Design Principles

### 1.1 Agent Sovereignty
Each agent operates on behalf of exactly one human. The agent's primary obligation is to its human — not to the network, not to other agents, not to any central authority. An agent may decline any request that conflicts with its human's interests, capacity, or preferences.

### 1.2 Context Distillation
Agents share the *minimum necessary context* for the receiving agent to act intelligently. A relay carries distilled intent, not raw data. The sender's agent decides what to include based on the relationship's trust level and permission scopes.

### 1.3 Environment Independence
The protocol makes no assumptions about the software environment of either party. Alice might use the DiviDen reference frontend. Bob might use a custom CLI. Carol might have her agent embedded in VS Code. The protocol defines the *exchange format*, not the *interface*.

### 1.4 Federation by Default
No central server. No shared database. No vendor lock-in. Each participant runs their own instance (or uses a hosted one), and instances federate through authenticated, structured API calls.

### 1.5 Human-in-the-Loop
Agents coordinate, but humans decide. The protocol defines escalation points where agent autonomy yields to human judgment, configurable per-connection through trust levels.

---

## 2. Identity Model

### 2.1 Profile Structure

Every participant in the protocol has an **Identity Profile** — a structured representation of who they are, what they can do, and what they understand.

```typescript
interface IdentityProfile {
  // === Professional ===
  headline: string;          // "Founder & CEO at Acme" — one-liner
  bio: string;               // Longer narrative
  currentTitle: string;
  currentCompany: string;
  industry: string;
  skills: string[];           // ["negotiation", "python", "design"]
  experience: Experience[];   // Structured work history
  education: Education[];     // Structured education history
  
  // === Lived Experience ===
  // This is what makes DiviDen profiles different.
  // Not what someone DID — what they UNDERSTAND.
  languages: Language[];              // { language, proficiency }
  countriesLived: CountryExperience[];// { country, duration, context }
  lifeExperiences: string[];          // Life milestones that shape understanding
  volunteering: VolunteerEntry[];     // { org, role, cause, duration }
  hobbies: string[];                  // Interests and passions
  personalValues: string[];           // Core values
  superpowers: string[];              // Self-identified unique strengths
  
  // === Task Types ===
  // Self-identified categories of work this person is suited for.
  // Used by agents for relay routing.
  taskTypes: TaskTypeId[];  // e.g. ["research", "introductions", "mentoring"]
  
  // === Availability ===
  timezone: string;                   // IANA timezone
  workingHours: WorkingHours;         // { start, end, days }
  capacity: 'available' | 'at_capacity' | 'out_of_office';
  capacityNote: string;               // "Back Monday" / "Only urgent items"
  outOfOffice: OutOfOfficeConfig;     // { enabled, until, message }
  
  // === Privacy ===
  visibility: 'public' | 'connections' | 'private';
  sharedSections: ProfileSection[];   // Which sections connected agents can see
}
```

### 2.2 Task Types

Task types are a controlled vocabulary that humans self-identify with. They serve as routing hints for agents:

| ID | Label | Description |
|----|-------|-------------|
| `research` | Deep Research | Thorough investigation and analysis |
| `review` | Review & Feedback | Evaluating work and providing critique |
| `introductions` | Introductions | Connecting people who should know each other |
| `technical` | Technical Work | Engineering, architecture, implementation |
| `creative` | Creative Work | Design, writing, ideation |
| `strategy` | Strategy | High-level planning and direction |
| `operations` | Operations | Process management, logistics, execution |
| `mentoring` | Mentoring | Guidance, teaching, coaching |
| `sales` | Sales & BD | Business development, partnerships, deals |
| `legal` | Legal & Compliance | Contracts, regulations, governance |
| `finance` | Finance | Budgeting, accounting, financial planning |
| `hr` | People & HR | Hiring, culture, team management |
| `translation` | Translation | Language translation and cultural bridging |
| `custom` | Custom | Anything not covered above |

Task types are *hints*, not hard constraints. An agent uses them alongside skills, lived experience, and availability to make routing decisions.

### 2.3 Privacy Controls

The profile owner controls what's visible:
- **Public**: visible to anyone on the network
- **Connections only**: visible to established connections
- **Private**: visible only to the owner's agent
- **Per-section control**: professional info might be public while lived experience is connections-only

### 2.4 Routing Intelligence

When an agent needs to route a relay, it evaluates potential recipients using a weighted scoring model:

1. **Skills match** — does the person have the technical capability?
2. **Lived experience match** — do they have relevant understanding?
   - *Lived-in > speaks-language* for cultural understanding
   - *Life experiences* can be uniquely relevant (e.g., someone who managed a crisis is better for crisis coordination)
3. **Task type alignment** — have they self-identified as suited for this kind of work?
4. **Availability** — are they at capacity? Out of office?
5. **Superpowers** — unique match priority (a self-identified "superpower" in a relevant area trumps general skill match)
6. **Trust level** — does the connection's trust level permit this type of request?

---

## 3. Agent Relay Protocol

### 3.1 Relay Structure

A **relay** is the atomic unit of inter-agent communication:

```typescript
interface AgentRelay {
  id: string;                 // Unique relay identifier
  connectionId: string;       // The connection this relay travels through
  fromUserId: string;         // Sender (local user ID)
  toUserId: string | null;    // Receiver (null if federated/pending)
  direction: 'outbound' | 'inbound';
  
  // Classification
  type: RelayType;            // What kind of message
  intent: RelayIntent;        // What the sender wants
  subject: string;            // Human-readable summary
  payload: object | null;     // Structured data — the distilled context
  
  // Lifecycle
  status: RelayStatus;
  priority: 'urgent' | 'normal' | 'low';
  dueDate: Date | null;
  resolvedAt: Date | null;
  responsePayload: object | null;
  
  // Threading
  parentRelayId: string | null;  // For relay chains
  
  // Federation
  peerRelayId: string | null;    // ID on the remote instance
  peerInstanceUrl: string | null;
}
```

### 3.2 Relay Types

| Type | Purpose |
|------|--------|
| `request` | Asking for something — information, action, approval |
| `response` | Answering a previous request |
| `notification` | Informing — no response expected |
| `update` | Updating status on an ongoing matter |

### 3.3 Relay Intents

| Intent | Description | Example |
|--------|-------------|---------|
| `get_info` | Requesting information | "What's the status of Project X?" |
| `assign_task` | Delegating work | "Can you review this proposal by Friday?" |
| `request_approval` | Seeking sign-off | "Approve the Q2 budget?" |
| `share_update` | Pushing information | "FYI: the client moved the deadline" |
| `schedule` | Coordinating time | "Find a slot for us to meet this week" |
| `introduce` | Connecting people | "You should talk to Carol about this" |
| `custom` | Anything else | Free-form structured payload |

### 3.4 Relay Lifecycle

```
pending → delivered → agent_handling → user_review → completed
                                                   → declined
                                                   → expired
```

**State transitions:**
- `pending`: Relay created, not yet sent (outbound) or received (inbound)
- `delivered`: Received by the destination agent
- `agent_handling`: The receiving agent is processing (e.g., gathering context, preparing a response)
- `user_review`: The receiving agent has escalated to its human for a decision
- `completed`: Successfully resolved with a response payload
- `declined`: The receiving party declined the request
- `expired`: Timed out without resolution

### 3.5 Trust Levels

Each connection has a configurable trust level that determines agent autonomy:

| Level | Agent Autonomy |
|-------|---------------|
| `full_auto` | Agent can handle relays without human intervention |
| `supervised` | Agent triages and prepares, human confirms before sending responses |
| `restricted` | Agent presents relay to human; human must explicitly direct all responses |

### 3.6 Permission Scopes

Granular permissions on what a connected agent can request:

| Scope | Allows |
|-------|--------|
| `request_files` | Request document/file sharing |
| `assign_tasks` | Send task assignments |
| `read_status` | Query availability and capacity |
| `schedule` | Propose meeting times |
| `share_updates` | Push status notifications |
| `request_approval` | Send approval requests |

---

## 4. Federation Protocol

### 4.1 Instance Discovery

DiviDen instances advertise themselves through an **Instance Card** — analogous to A2A's Agent Card:

```json
{
  "name": "Acme Corp DiviDen",
  "baseUrl": "https://dividen.acme.com",
  "version": "0.1",
  "federationMode": "allowlist",
  "capabilities": ["relay", "profile", "connection"],
  "allowInbound": true,
  "allowOutbound": true
}
```

Future: publish at `/.well-known/dividen-instance.json` for automated discovery.

### 4.2 Connection Establishment

```
Instance A                          Instance B
    │                                    │
    │── POST /api/federation/connect ──→ │
    │   { fromInstanceUrl,               │
    │     fromUserEmail,                 │
    │     toUserEmail,                   │
    │     federationToken }              │
    │                                    │
    │                    [Instance B validates,
    │                     creates local connection,
    │                     notifies target user]
    │                                    │
    │←── { success, connectionId } ──────│
    │                                    │
    │   [If requireApproval: true,       │
    │    user must accept before         │
    │    relays can flow]                │
```

### 4.3 Relay Exchange

```
Alice's Divi                        Bob's Divi
    │                                    │
    │── POST /api/federation/relay ────→ │
    │   Headers:                         │
    │     X-Federation-Token: <token>    │
    │   Body:                            │
    │     { type, intent, subject,       │
    │       payload, priority }          │
    │                                    │
    │                    [Bob's instance creates
    │                     local relay + comms
    │                     notification]
    │                                    │
    │←── { success, relayId } ──────────│
```

### 4.4 Federation Modes

| Mode | Behavior |
|------|----------|
| `closed` | No federation. Instance is isolated. |
| `allowlist` | Only instances in the registry can connect. |
| `open` | Any instance can request a connection. |

### 4.5 Security Model

- **Federation tokens**: shared secrets generated during connection establishment
- **Instance API keys**: per-instance authentication for inbound requests
- **Token rotation**: recommended on a regular schedule (not yet automated)
- **Future**: OAuth 2.1 support, signed payloads, certificate-based trust

---

## 5. Integration Points

### 5.1 MCP (Model Context Protocol) Mapping

DiviDen's architecture maps naturally to MCP primitives:

| DiviDen Concept | MCP Primitive | How It Maps |
|-----------------|---------------|-------------|
| Relay execution | **Tool** | Sending a relay = calling a tool on the remote instance |
| User profile | **Resource** | Profile data exposed as a readable resource |
| System prompt layers | **Prompt** | Agent context layers map to MCP prompt templates |
| Connection permissions | **Capability negotiation** | Scopes define what tools the remote can invoke |
| Federation endpoints | **MCP Server** | Each DiviDen instance can expose itself as an MCP server |

**Implementation path**: Expose DiviDen federation endpoints as an MCP server, so any MCP-compatible agent (Claude, GPT, Gemini, etc.) can participate in the DiviDen network without running the full reference frontend.

### 5.2 A2A (Agent2Agent Protocol) Mapping

| DiviDen Concept | A2A Concept | How It Maps |
|-----------------|-------------|-------------|
| Identity Profile | **Agent Card** | Profile serves as the agent's capability advertisement |
| Relay | **Task** | A relay is a unit of work with a lifecycle |
| Relay intent | **Task type** | Intent classifies what the agent is being asked to do |
| Relay status lifecycle | **Task states** | pending/delivered/completed maps to submitted/working/completed |
| Federation token | **Authentication scheme** | Token-based auth in the Agent Card |
| Relay payload | **Message parts** | Structured JSON maps to A2A DataPart |

**Implementation path**: Publish DiviDen profiles as A2A Agent Cards at `/.well-known/agent-card.json`, and implement A2A task endpoints as a bridge to the relay system.

### 5.3 Webhook Integration

DiviDen supports inbound data from any system via webhooks:
- **Calendar events** (Google Calendar, Outlook, Cal.com)
- **Email** (Gmail, Outlook, custom IMAP bridges)
- **Transcripts** (Plaud, Otter, Fireflies, any note-taker)
- **Generic** (Zapier, Make, n8n, custom systems)

Webhook payloads are automatically analyzed by the agent (LLM-powered field mapping) and integrated into the user's workspace.

### 5.4 Agent API v2

External systems can interact with a DiviDen instance programmatically:
- Bearer token authentication
- CRUD on kanban cards, contacts, queue items, documents
- Shared chat (send messages to / receive from Divi)
- Full REST API with OpenAPI documentation at `/api/v2/docs`

---

## 6. Multi-Tenant Considerations

### 6.1 Data Sovereignty
Each DiviDen instance owns its data completely. Federation shares *relays*, not *databases*. The receiving instance stores a local copy of inbound relays but never has access to the sender's internal data (cards, contacts, documents, memory).

### 6.2 Agent Autonomy
Each agent operates independently. There is no central orchestrator. Trust is bilateral — established per-connection, configurable by each party independently.

### 6.3 Scalability Model
- **Single-user instances**: One person, one Divi (the default)
- **Team instances**: Multiple users on one instance, local connections between them
- **Federated networks**: Multiple instances, cross-instance connections
- **Hybrid**: Teams federate with individuals and other teams

### 6.4 Open Source Considerations
- Self-hosted instances must respect privacy settings
- Federation tokens should be treated as secrets
- Instance operators are responsible for their users' data
- The protocol is open; implementations can vary

---

## 7. Roadmap

### Current (v0.1)
- ✅ Identity profiles with lived experience and task types
- ✅ Agent relay protocol with full lifecycle
- ✅ Local and federated connections
- ✅ Trust levels and permission scopes
- ✅ Reference frontend with 18-layer agent intelligence
- ✅ 26 executable action tags
- ✅ Webhook auto-learn infrastructure

### Next (v0.2)
- ✅ MCP server implementation (6 tools, 5 resources, 2 prompts at `/api/mcp`)
- ✅ A2A Agent Card publishing (`/.well-known/agent-card.json`)
- ✅ A2A task endpoint (`/api/a2a` — tasks/send, tasks/get, tasks/cancel)
- 🔲 Encrypted relay payloads (end-to-end between agents)
- 🔲 Federation token rotation
- 🔲 Relay analytics and trust scoring
- 🔲 Batch relay operations

### Future (v0.3+)
- 🔲 MCP Tasks primitive for long-running relays
- 🔲 Agent reputation system
- 🔲 Multi-modal relay payloads (files, images, audio)
- 🔲 Relay marketplace (offer capabilities to the network)
- 🔲 SDK for building custom DiviDen agents in any language

---

## 8. Glossary

| Term | Definition |
|------|------------|
| **Divi** | A personal AI agent operating on behalf of one human |
| **Relay** | The atomic unit of inter-agent communication |
| **Connection** | An authenticated relationship between two participants |
| **Federation** | Cross-instance communication between DiviDen deployments |
| **Instance** | A single deployment of DiviDen (self-hosted or cloud) |
| **Trust Level** | How much autonomy an agent has within a connection |
| **Task Type** | A self-identified category of work a person is suited for |
| **Lived Experience** | Understanding gained through life, not just credentials |
| **Routing Manifest** | The combination of profile data agents use for relay routing |
| **Context Distillation** | The process of extracting only necessary information for a relay |
