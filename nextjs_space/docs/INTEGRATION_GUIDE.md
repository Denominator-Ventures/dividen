# DiviDen Integration Guide

**How to connect your existing tools and agents to the DiviDen protocol.**

---

## Quick Start: What Kind of Integration?

| You want to... | Use... | Auth method |
|----------------|--------|-------------|
| Build a custom UI for a human | Frontend API (`/api/*`) | NextAuth session |
| Connect an external AI agent | Agent API v2 (`/api/v2/*`) | Bearer token |
| Send data into DiviDen | Webhooks (`/api/webhooks/*`) | Webhook secret |
| Connect two DiviDen instances | Federation (`/api/federation/*`) | Federation token |
| Connect any MCP-compatible agent | MCP Server (planned) | OAuth 2.1 |
| Connect any A2A-compatible agent | A2A Bridge (planned) | Bearer token |

---

## 1. Agent API v2

For external agents or automation tools that need to interact with a DiviDen instance.

### Getting an API Key
1. Log into your DiviDen instance
2. Go to Settings → API Keys
3. Create a new key with a label (e.g., "My Automation Agent")
4. Use the key as a Bearer token in all requests

### Example: External Agent Workflow

```bash
# Check for pending queue items
curl -H "Authorization: Bearer YOUR_KEY" \
  https://your-instance.com/api/v2/queue?status=pending

# Send a message to Divi
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "Create a task to review the Q2 report"}' \
  https://your-instance.com/api/v2/shared-chat/send

# Create a contact
curl -X POST -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith", "email": "jane@example.com", "company": "Acme"}' \
  https://your-instance.com/api/v2/contacts
```

### Full API Reference
OpenAPI documentation available at: `GET /api/v2/docs`

---

## 2. Webhook Integration

For pushing data from external systems into DiviDen.

### Supported Types
- **Calendar**: events from Google Calendar, Outlook, Cal.com
- **Email**: messages from Gmail, Outlook, IMAP bridges
- **Transcript**: recordings from Plaud, Otter, Fireflies
- **Generic**: any structured data from Zapier, Make, n8n

### Setting Up a Webhook
1. Settings → Webhooks → Create
2. Select type, give it a name
3. Copy the generated URL + secret
4. Configure your source to POST to that URL with the secret as signature

### Auto-Learning
DiviDen automatically analyzes incoming webhook payloads using LLM-powered field mapping. Send a sample payload, and DiviDen will learn the mapping. You can manually adjust in Settings → Webhooks → Field Mapping.

---

## 3. Federation

For connecting separate DiviDen instances.

### Prerequisites
- Both instances must be publicly accessible
- Both instances must have federation enabled

### Establishing a Connection

**From Instance A to Instance B:**

```bash
# Instance A sends connection request to Instance B
curl -X POST https://instance-b.com/api/federation/connect \
  -H "Content-Type: application/json" \
  -d '{
    "fromInstanceUrl": "https://instance-a.com",
    "fromInstanceName": "Alice Corp DiviDen",
    "fromUserEmail": "alice@acme.com",
    "fromUserName": "Alice",
    "toUserEmail": "bob@globex.com",
    "federationToken": "shared-secret-token"
  }'
```

**Instance B** receives the request, creates a local connection, and notifies the target user via Comms.

### Sending a Federated Relay

```bash
curl -X POST https://instance-b.com/api/federation/relay \
  -H "X-Federation-Token: shared-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "intent": "get_info",
    "subject": "Status of Project Phoenix?",
    "payload": { "context": "Need update for board meeting Thursday" },
    "priority": "normal",
    "fromUserEmail": "alice@acme.com",
    "fromUserName": "Alice",
    "toUserEmail": "bob@globex.com"
  }'
```

---

## 4. MCP Integration (Roadmap)

DiviDen will expose itself as an MCP server, allowing any MCP-compatible agent to:

- **Read** profiles, connections, pending relays (as MCP Resources)
- **Execute** relay sends, profile updates, connection management (as MCP Tools)
- **Use** context templates for relay handling and routing decisions (as MCP Prompts)

**Transport**: Streamable HTTP at `/api/mcp`  
**Auth**: OAuth 2.1 with PKCE  
**Spec**: MCP November 2025 specification

This means Claude Desktop, GPT agents, Gemini agents, or any custom MCP client can participate in the DiviDen network natively — without running the reference frontend.

---

## 5. A2A Integration (Roadmap)

DiviDen will publish Agent Cards and implement A2A task endpoints:

- **Agent Card**: published at `/.well-known/agent-card.json`
- **Task endpoint**: A2A tasks map to DiviDen relays
- **Streaming**: SSE for long-running relay conversations

This enables any A2A-compatible agent to discover and collaborate with DiviDen agents.

---

## 6. Building Your Own Frontend

The reference Next.js app is just one consumer of the DiviDen protocol. You can build:

- **Mobile app**: consume the same API routes
- **CLI tool**: `divi relay send --to bob --intent get_info --subject "Status?"`
- **Slack bot**: relay notifications and responses through Slack
- **VS Code extension**: see relay status in your IDE
- **Embedded widget**: minimal relay management in your existing app

The protocol doesn't care what the UI looks like. It cares about the exchange format.

### Minimum Viable Frontend

1. **Auth**: `POST /api/auth/login`, session cookie management
2. **Chat**: `POST /api/chat` (SSE stream)
3. **Profile**: `GET/PUT /api/profile`
4. **Connections**: `GET/POST /api/connections`
5. **Relays**: `GET/POST/PATCH /api/relays`

That's 5 API surfaces for a fully functional DiviDen client.
