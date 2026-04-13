import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'DiviDen Agent API v2',
    version: '2.0.0',
    description: `External API for AI agents to interact with the DiviDen Command Center.

All endpoints require Bearer token authentication via the Authorization header.
Generate API keys from the DiviDen Settings page.

## Authentication
\`\`\`
Authorization: Bearer dvd_your_api_key_here
\`\`\`

## Rate Limiting
- 120 requests per minute per API key
- Rate limit headers included in responses:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

## Error Responses
All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": "Human-readable error message"
}
\`\`\`

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (expired/deactivated key or insufficient permissions)
- 404: Not Found
- 429: Rate Limited
- 500: Internal Server Error
`,
  },
  servers: [
    { url: '/api/v2', description: 'Agent API v2' },
  ],
  security: [
    { BearerAuth: [] },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key generated from DiviDen Settings page',
      },
    },
    schemas: {
      QueueItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['task', 'notification', 'reminder', 'agent_suggestion'] },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['pending_confirmation', 'ready', 'in_progress', 'done_today', 'blocked'], description: 'pending_confirmation = awaiting user approval before entering queue' },
          source: { type: 'string', nullable: true },
          metadata: { type: 'string', nullable: true, description: 'JSON string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      KanbanCard: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['leads', 'qualifying', 'proposal', 'negotiation', 'contracted', 'active', 'development', 'planning', 'paused', 'completed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assignee: { type: 'string', enum: ['human', 'agent'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          order: { type: 'integer' },
          checklist: { type: 'array', items: { $ref: '#/components/schemas/ChecklistItem' } },
          contacts: { type: 'array', items: { $ref: '#/components/schemas/CardContact' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ChecklistItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          completed: { type: 'boolean' },
          order: { type: 'integer' },
        },
      },
      CardContact: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          contactId: { type: 'string' },
          role: { type: 'string', nullable: true },
          contact: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', nullable: true },
              company: { type: 'string', nullable: true },
            },
          },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          role: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          tags: { type: 'string', nullable: true },
          source: { type: 'string', nullable: true },
          enrichedData: { type: 'string', nullable: true },
          cards: { type: 'array', items: { $ref: '#/components/schemas/CardContact' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string', enum: ['user', 'assistant', 'system'] },
          content: { type: 'string' },
          agentName: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/queue': {
      get: {
        tags: ['Queue'],
        summary: 'List queue items',
        description: 'Get queue items with optional filtering by status, priority, or type.',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending_confirmation', 'ready', 'in_progress', 'done_today', 'blocked'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'List of queue items',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    items: [{ id: 'clx...', type: 'task', title: 'Review proposal', status: 'ready', priority: 'high' }],
                    pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/queue/{id}': {
      get: {
        tags: ['Queue'],
        summary: 'Get single queue item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Queue item details' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/queue/{id}/result': {
      post: {
        tags: ['Queue'],
        summary: 'Report task result',
        description: 'Report task completion with result data. Automatically sets status to done_today.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['result'],
                properties: {
                  result: { type: 'string', description: 'Task result/output' },
                  status: { type: 'string', enum: ['done_today', 'blocked'], default: 'done_today' },
                },
              },
              example: { result: 'Proposal reviewed and approved', status: 'done_today' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated queue item' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/queue/{id}/status': {
      post: {
        tags: ['Queue'],
        summary: 'Update item status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pending_confirmation', 'ready', 'in_progress', 'done_today', 'blocked'] },
                },
              },
              example: { status: 'in_progress' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated queue item' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/queue/{id}/confirm': {
      post: {
        tags: ['Queue'],
        summary: 'Approve or reject a pending queue item',
        description: 'Items created by Divi enter the queue as `pending_confirmation`. Use this endpoint to approve (moves to `ready`) or reject (deletes the item). Only works on items with status `pending_confirmation`.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['approve', 'reject'], description: 'approve = move to ready, reject = delete' },
                },
              },
              example: { action: 'approve' },
            },
          },
        },
        responses: {
          '200': { description: 'Confirmation result' },
          '400': { description: 'Item not in pending_confirmation status' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get user settings',
        description: 'Returns current mode, queue preferences, and onboarding status.',
        responses: {
          '200': {
            description: 'User settings',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    mode: 'cockpit',
                    queueAutoApprove: false,
                    diviName: 'Divi',
                    goalsEnabled: true,
                    onboardingComplete: true,
                    onboardingPhase: 6,
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Settings'],
        summary: 'Update user settings',
        description: 'Update mode (cockpit ↔ chief_of_staff) or queue behavior. Switching to CoS mode auto-dispatches the next ready item. Switching back to cockpit returns a briefing summary.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mode: { type: 'string', enum: ['cockpit', 'chief_of_staff'], description: 'Operating mode' },
                  queueAutoApprove: { type: 'boolean', description: 'When true, tasks skip pending_confirmation and go straight to ready. Useful for open-source self-hosted setups.' },
                },
              },
              example: { mode: 'chief_of_staff' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated settings with optional autoDispatched item or briefing' },
          '400': { description: 'No valid fields to update' },
        },
      },
    },
    '/shared-chat/stream': {
      get: {
        tags: ['Shared Chat'],
        summary: 'SSE stream for real-time updates',
        description: `Server-Sent Events stream. Delivers: new_message, heartbeat (every 30s), wake (urgent tasks).

Set \`X-Agent-Name\` header to identify the agent.

Example events:
\`\`\`
event: connected
data: {"type":"connected","clientId":"sse_...","agentName":"my-agent"}

event: heartbeat
data: {"type":"heartbeat","timestamp":"2026-04-06T..."}

event: new_message
data: {"type":"new_message","message":{"id":"...","content":"Hello"}}

event: wake
data: {"type":"wake","reason":"urgent_task","metadata":{...}}
\`\`\``,
        parameters: [
          { name: 'X-Agent-Name', in: 'header', schema: { type: 'string' }, description: 'Agent display name' },
        ],
        responses: {
          '200': { description: 'SSE stream', content: { 'text/event-stream': {} } },
        },
      },
    },
    '/shared-chat/send': {
      post: {
        tags: ['Shared Chat'],
        summary: 'Send message as agent',
        description: 'Send a chat message as an agent. Message appears in the shared chat for the user.',
        parameters: [
          { name: 'X-Agent-Name', in: 'header', schema: { type: 'string' }, description: 'Agent display name' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', maxLength: 10000 },
                  metadata: { type: 'object', description: 'Optional metadata' },
                },
              },
              example: { content: 'I have completed the analysis. Here are the results...', metadata: { taskId: 'clx...' } },
            },
          },
        },
        responses: {
          '201': { description: 'Message created' },
        },
      },
    },
    '/shared-chat/messages': {
      get: {
        tags: ['Shared Chat'],
        summary: 'Get chat history',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Cursor for pagination' },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['user', 'assistant', 'system'] } },
        ],
        responses: {
          '200': {
            description: 'Chat messages in chronological order',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    messages: [{ id: 'clx...', role: 'user', content: 'Hello', createdAt: '2026-04-06T...' }],
                    pagination: { limit: 50, cursor: null, hasMore: false },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/kanban': {
      get: {
        tags: ['Kanban'],
        summary: 'List all kanban cards (read-only)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['leads', 'qualifying', 'proposal', 'negotiation', 'contracted', 'active', 'development', 'planning', 'paused', 'completed'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
          { name: 'assignee', in: 'query', schema: { type: 'string', enum: ['human', 'agent'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'List of kanban cards with checklists and contacts' },
        },
      },
    },
    '/kanban/{id}': {
      get: {
        tags: ['Kanban'],
        summary: 'Get single kanban card',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Card with full details' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'List all contacts (read-only)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, or company' },
          { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Filter by tag' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'List of contacts with linked cards' },
        },
      },
    },
    '/contacts/{id}': {
      get: {
        tags: ['Contacts'],
        summary: 'Get single contact',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Contact with full details and linked cards' },
          '404': { description: 'Not found' },
        },
      },
    },

    // ── Federation & Network ─────────────────────────────────────
    '/updates': {
      get: {
        tags: ['Network'],
        summary: 'Public unified updates feed',
        description: 'Returns the DiviDen changelog/updates. No authentication required. Self-hosted instances can poll this to stay in sync.',
        security: [],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 }, description: 'Max entries to return' },
          { name: 'since', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Return entries newer than this ISO date' },
          { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Filter by tag' },
        ],
        responses: {
          '200': { description: 'Updates array with metadata' },
        },
      },
    },
    '/network/discover': {
      get: {
        tags: ['Network'],
        summary: 'Network discovery feed',
        description: 'Browse public profiles, teams, and marketplace agents. Authenticated federated instances get richer data.',
        security: [],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['profiles', 'teams', 'agents', 'all'], default: 'all' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
        ],
        responses: {
          '200': { description: 'Discovery results with network stats' },
        },
      },
    },
    '/federation/register': {
      post: {
        tags: ['Federation'],
        summary: 'Register self-hosted instance with the managed platform',
        description: 'Connect to Network endpoint. Returns a platform token for authenticated API access.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'baseUrl', 'apiKey'],
                properties: {
                  name: { type: 'string', description: 'Instance display name' },
                  baseUrl: { type: 'string', description: 'Instance public URL' },
                  apiKey: { type: 'string', description: 'Instance federation API key' },
                  version: { type: 'string' },
                  userCount: { type: 'integer' },
                  agentCount: { type: 'integer' },
                  capabilities: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registration successful. Returns platformToken and available endpoints.' },
          '403': { description: 'API key mismatch on re-registration' },
        },
      },
    },
    '/federation/marketplace-link': {
      post: {
        tags: ['Federation'],
        summary: 'Enable/disable marketplace participation',
        description: 'Requires platform token from registration. Allows self-hosted instances to list agents on the managed marketplace.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['enable', 'disable', 'status'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Marketplace link status updated' },
        },
      },
    },
    '/federation/heartbeat': {
      post: {
        tags: ['Federation'],
        summary: 'Instance heartbeat',
        description: 'Periodic health check from federated instances. Updates stats and returns network info.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'string' },
                  userCount: { type: 'integer' },
                  agentCount: { type: 'integer' },
                  status: { type: 'string', enum: ['healthy', 'degraded', 'maintenance'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Heartbeat acknowledged with network stats' },
        },
      },
    },
    '/federation/validate-payment': {
      post: {
        tags: ['Federation'],
        summary: 'Validate network payment fee',
        description: 'Validates that a proposed payment fee meets the network minimum floor.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transactionType', 'grossAmount', 'proposedFeePercent'],
                properties: {
                  transactionType: { type: 'string', enum: ['marketplace', 'recruiting'] },
                  grossAmount: { type: 'number' },
                  proposedFeePercent: { type: 'number' },
                  agentId: { type: 'string' },
                  executionId: { type: 'string' },
                  contractId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Validation result with enforced fee details' },
          '401': { description: 'Invalid or missing platformToken' },
        },
      },
    },
    '/federation/agents': {
      post: {
        tags: ['Federation'],
        summary: 'Batch sync agents from a federated instance',
        description: 'Push agents from a self-hosted instance to the DiviDen marketplace. Accepts full agent config including pricing tiers, integration kit, and display fields. Max 50 agents per call.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agents'],
                properties: {
                  agents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'name'],
                      properties: {
                        id: { type: 'string', description: 'Remote agent ID on your instance' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        endpointUrl: { type: 'string', description: 'A2A/MCP endpoint URL' },
                        developerName: { type: 'string' },
                        category: { type: 'string', enum: ['research', 'coding', 'writing', 'analysis', 'operations', 'creative', 'general'] },
                        pricingModel: { type: 'string', enum: ['free', 'per_task', 'tiered', 'dynamic'] },
                        pricePerTask: { type: 'number' },
                        pricingConfig: {
                          type: 'object',
                          description: 'Full pricing configuration. For tiered: include tiers[]. For dynamic: include dynamicConfig.',
                          properties: {
                            model: { type: 'string', enum: ['free', 'per_task', 'tiered', 'dynamic'] },
                            tiers: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  name: { type: 'string' },
                                  pricePerTask: { type: 'number' },
                                  taskLimit: { type: 'integer' },
                                  description: { type: 'string' },
                                },
                              },
                            },
                            dynamicConfig: {
                              type: 'object',
                              properties: {
                                estimateRange: { type: 'array', items: { type: 'number' }, description: '[min, max] estimated cost' },
                                requiresApproval: { type: 'boolean', description: 'User must approve price before charge' },
                                description: { type: 'string' },
                              },
                            },
                          },
                        },
                        installGuide: { type: 'string', description: 'Markdown post-install instructions' },
                        commands: { type: 'array', description: '[{name, description, usage}]' },
                        taskTypes: { type: 'array', description: 'What this agent handles' },
                        contextInstructions: { type: 'string' },
                        supportsA2A: { type: 'boolean' },
                        supportsMCP: { type: 'boolean' },
                        version: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sync results with per-agent status' },
          '401': { description: 'Invalid platform token' },
          '403': { description: 'Marketplace not enabled' },
        },
      },
      get: {
        tags: ['Federation'],
        summary: 'List agents synced from this instance',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of synced agents with stats' },
        },
      },
    },
    '/federation/agents/{remoteId}': {
      put: {
        tags: ['Federation'],
        summary: 'Register or update a single agent',
        description: 'Preferred endpoint for managing individual agents. Full agent config accepted. Creates if new, updates if exists.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'remoteId', in: 'path', required: true, schema: { type: 'string' }, description: 'Agent ID on your instance' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  endpointUrl: { type: 'string' },
                  pricingModel: { type: 'string', enum: ['free', 'per_task', 'tiered', 'dynamic'] },
                  pricePerTask: { type: 'number' },
                  pricingConfig: { type: 'object', description: 'Full PricingConfig (see batch sync docs)' },
                  installGuide: { type: 'string' },
                  commands: { type: 'array' },
                  taskTypes: { type: 'array' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Agent updated' },
          '201': { description: 'Agent created' },
          '409': { description: 'Slug conflict' },
        },
      },
      get: {
        tags: ['Federation'],
        summary: 'Get a single synced agent',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'remoteId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Agent details with revenue stats' },
          '404': { description: 'Agent not found' },
        },
      },
      delete: {
        tags: ['Federation'],
        summary: 'Remove a synced agent from marketplace',
        description: 'Permanently removes the agent and all its subscriptions and executions.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'remoteId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Agent deleted' },
          '404': { description: 'Agent not found' },
        },
      },
    },
  },
};

// GET /api/v2/docs - OpenAPI specification
export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}