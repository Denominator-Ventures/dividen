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
          status: { type: 'string', enum: ['ready', 'in_progress', 'done_today', 'blocked'] },
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
          status: { type: 'string', enum: ['leads', 'qualifying', 'proposal', 'negotiation', 'active', 'development', 'completed'] },
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
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ready', 'in_progress', 'done_today', 'blocked'] } },
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
                  status: { type: 'string', enum: ['ready', 'in_progress', 'done_today', 'blocked'] },
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
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['leads', 'qualifying', 'proposal', 'negotiation', 'active', 'development', 'completed'] } },
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
