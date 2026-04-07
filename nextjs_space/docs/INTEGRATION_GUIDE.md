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
| Connect any MCP-compatible agent | MCP Server (`/api/mcp`) | Bearer token |
| Connect any A2A-compatible agent | A2A (`/api/a2a`) | Bearer token |

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

## 4. MCP Integration

DiviDen exposes a full MCP server at `POST /api/mcp`, allowing any MCP-compatible agent to:

- **Read** profiles, connections, pending relays, queue (as MCP Resources)
- **Execute** relay sends, profile updates, connection management (as MCP Tools)
- **Use** context templates for relay handling and routing decisions (as MCP Prompts)

**Transport**: JSON-RPC 2.0 over HTTP (Streamable HTTP per MCP November 2025 spec)  
**Auth**: Bearer token (DiviDen API key)  
**Discovery**: `GET /api/mcp` returns server metadata

### Example: Initialize + Read Pending Relays

```bash
# Initialize the MCP session
curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Read pending relays
curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"dividen://relays/pending"}}'

# Send a relay via tool call
curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"send_relay","arguments":{"connectionId":"conn_id","intent":"get_info","subject":"Project status?"}}}'

# Get routing recommendation
curl -X POST https://your-instance.com/api/mcp \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"prompts/get","params":{"name":"routing_decision","arguments":{"taskDescription":"Need someone to review a Japanese contract"}}}'
```

### Available Tools
`send_relay`, `respond_to_relay`, `list_connections`, `manage_connection`, `list_relays`, `update_profile`

### Available Resources
`dividen://profile/self`, `dividen://connections`, `dividen://relays/pending`, `dividen://relays/history`, `dividen://queue`

### Available Prompts
`relay_context` (by relayId), `routing_decision` (by task description)

---

## 5. A2A Integration

DiviDen publishes an Agent Card and implements A2A task endpoints:

- **Agent Card**: published at `GET /.well-known/agent-card.json` (public, no auth, CORS-open)
- **Task endpoint**: `POST /api/a2a` — tasks/send, tasks/get, tasks/cancel
- **Discovery**: `GET /api/a2a` returns endpoint metadata

### Example: Send an A2A Task

```bash
# Discover the agent
curl https://your-instance.com/.well-known/agent-card.json

# Send a task
curl -X POST https://your-instance.com/api/a2a \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tasks/send",
    "params": {
      "message": {
        "parts": [{"type": "text", "text": "Review the Q2 proposal by Friday"}]
      },
      "metadata": {
        "connectionId": "conn_id",
        "intent": "assign_task",
        "priority": "normal"
      }
    }
  }'

# Check task status
curl -X POST https://your-instance.com/api/a2a \
  -H "Authorization: Bearer dvd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"method": "tasks/get", "params": {"id": "relay_id"}}'
```

Any A2A-compatible agent can discover DiviDen agents and collaborate via structured tasks.

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
