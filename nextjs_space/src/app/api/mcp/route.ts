export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, isAuthError, AgentContext } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

// ─── MCP Protocol Constants ──────────────────────────────────────────────────

const MCP_PROTOCOL_VERSION = '2025-11-25';
const SERVER_NAME = 'dividen-mcp-server';
const SERVER_VERSION = '0.1.0';

// ─── JSON-RPC 2.0 Helpers ────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

function jsonRpcResponse(id: string | number | null | undefined, result: any) {
  return { jsonrpc: '2.0' as const, id: id ?? null, result };
}

function jsonRpcError(id: string | number | null | undefined, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0' as const, id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

// JSON-RPC error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'send_relay',
    description: 'Send a structured relay to a connected agent. Relays are the atomic unit of inter-agent communication in DiviDen — they carry classified intent, priority, and structured payloads.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        connectionId: { type: 'string', description: 'ID of the connection to send through' },
        intent: {
          type: 'string',
          enum: ['get_info', 'assign_task', 'request_approval', 'share_update', 'schedule', 'introduce', 'custom'],
          description: 'What the sender wants',
        },
        subject: { type: 'string', description: 'Human-readable summary of the relay' },
        payload: { type: 'object', description: 'Structured data — the distilled context for this relay' },
        priority: { type: 'string', enum: ['urgent', 'normal', 'low'], description: 'Priority level (default: normal)' },
        dueDate: { type: 'string', description: 'ISO 8601 due date (optional)' },
      },
      required: ['connectionId', 'intent', 'subject'],
    },
  },
  {
    name: 'respond_to_relay',
    description: 'Respond to a pending inbound relay. Updates the relay status and attaches a response payload.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        relayId: { type: 'string', description: 'ID of the relay to respond to' },
        status: { type: 'string', enum: ['completed', 'declined'], description: 'Resolution status' },
        responsePayload: { type: 'object', description: 'Structured response data' },
        responseMessage: { type: 'string', description: 'Human-readable response message' },
      },
      required: ['relayId', 'status'],
    },
  },
  {
    name: 'list_connections',
    description: 'List active connections with their trust levels, permission scopes, and peer profile summaries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['pending', 'active', 'blocked', 'declined'], description: 'Filter by status (default: active)' },
        includeFederated: { type: 'boolean', description: 'Include federated connections (default: true)' },
      },
    },
  },
  {
    name: 'manage_connection',
    description: 'Accept, decline, block, or update a connection. Allows changing trust levels and permission scopes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        connectionId: { type: 'string', description: 'ID of the connection to manage' },
        action: { type: 'string', enum: ['accept', 'decline', 'block', 'update_permissions'], description: 'Action to perform' },
        trustLevel: { type: 'string', enum: ['full_auto', 'supervised', 'restricted'], description: 'New trust level (for update_permissions)' },
        scopes: {
          type: 'array', items: { type: 'string' },
          description: 'New permission scopes (for update_permissions)',
        },
      },
      required: ['connectionId', 'action'],
    },
  },
  {
    name: 'list_relays',
    description: 'List relays with optional filters. Returns relay details including status, intent, and payloads.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status' },
        direction: { type: 'string', enum: ['inbound', 'outbound'], description: 'Filter by direction' },
        connectionId: { type: 'string', description: 'Filter by connection' },
        limit: { type: 'number', description: 'Max results (default: 20, max: 100)' },
      },
    },
  },
  {
    name: 'update_profile',
    description: 'Update the authenticated user\'s identity profile. Supports professional info, lived experience, task types, availability, and privacy settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        headline: { type: 'string' },
        bio: { type: 'string' },
        currentTitle: { type: 'string' },
        currentCompany: { type: 'string' },
        industry: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        taskTypes: {
          type: 'array', items: { type: 'string' },
          description: 'Self-identified task type IDs: research, review, introductions, technical, creative, strategy, operations, mentoring, sales, legal, finance, hr, translation, custom',
        },
        languages: { type: 'array', items: { type: 'object' }, description: 'Array of {language, proficiency}' },
        countriesLived: { type: 'array', items: { type: 'object' }, description: 'Array of {country, duration, context}' },
        timezone: { type: 'string', description: 'IANA timezone' },
        capacity: { type: 'string', enum: ['available', 'at_capacity', 'out_of_office'] },
        capacityNote: { type: 'string' },
        hobbies: { type: 'array', items: { type: 'string' } },
        personalValues: { type: 'array', items: { type: 'string' } },
        superpowers: { type: 'array', items: { type: 'string' } },
        visibility: { type: 'string', enum: ['public', 'connections', 'private'] },
      },
    },
  },
];

// ─── Resource Definitions ────────────────────────────────────────────────────

const RESOURCES = [
  {
    uri: 'dividen://profile/self',
    name: 'My Profile',
    description: 'The authenticated user\'s full identity profile including professional info, lived experience, task types, availability, and privacy settings.',
    mimeType: 'application/json',
  },
  {
    uri: 'dividen://connections',
    name: 'Active Connections',
    description: 'List of active agent connections with trust levels, permission scopes, and peer profile summaries.',
    mimeType: 'application/json',
  },
  {
    uri: 'dividen://relays/pending',
    name: 'Pending Relays',
    description: 'Inbound relays awaiting response — these need attention.',
    mimeType: 'application/json',
  },
  {
    uri: 'dividen://relays/history',
    name: 'Relay History',
    description: 'Recent relay activity (last 50 relays, all statuses).',
    mimeType: 'application/json',
  },
  {
    uri: 'dividen://queue',
    name: 'Task Queue',
    description: 'Pending and active task queue items.',
    mimeType: 'application/json',
  },
];

// ─── Prompt Definitions ──────────────────────────────────────────────────────

const PROMPTS = [
  {
    name: 'relay_context',
    description: 'Full context for handling a specific relay — includes the relay details, connection info, and peer profile.',
    arguments: [
      { name: 'relayId', description: 'ID of the relay to get context for', required: true },
    ],
  },
  {
    name: 'routing_decision',
    description: 'Context for deciding which connection to route a request to — evaluates all active connections\' profiles, skills, task types, lived experience, and availability.',
    arguments: [
      { name: 'taskDescription', description: 'Description of what needs to be done', required: true },
      { name: 'requiredSkills', description: 'Comma-separated skills needed (optional)', required: false },
    ],
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, any>, agent: AgentContext): Promise<any> {
  const userId = agent.userId;

  switch (name) {
    case 'send_relay': {
      const { connectionId, intent, subject, payload, priority, dueDate } = args;
      // Verify connection belongs to this user
      const connection = await prisma.connection.findFirst({
        where: {
          id: connectionId,
          status: 'active',
          OR: [{ requesterId: userId }, { accepterId: userId }],
        },
      });
      if (!connection) return { error: 'Connection not found or not active' };

      const toUserId = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

      const relay = await prisma.agentRelay.create({
        data: {
          connectionId,
          fromUserId: userId,
          toUserId,
          direction: 'outbound',
          type: 'request',
          intent: intent || 'custom',
          subject,
          payload: payload ? JSON.stringify(payload) : null,
          status: 'pending',
          priority: priority || 'normal',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      // Create comms notification for the recipient
      if (toUserId) {
        await prisma.commsMessage.create({
          data: {
            sender: 'system',
            content: `📡 Relay from connected agent: ${subject}`,
            state: 'new',
            priority: priority || 'normal',
            userId: toUserId,
            metadata: JSON.stringify({ type: 'relay', relayId: relay.id }),
          },
        });
      }

      return { success: true, relayId: relay.id, status: relay.status };
    }

    case 'respond_to_relay': {
      const { relayId, status, responsePayload, responseMessage } = args;
      const relay = await prisma.agentRelay.findFirst({
        where: { id: relayId, toUserId: userId },
      });
      if (!relay) return { error: 'Relay not found or not addressed to you' };

      const updated = await prisma.agentRelay.update({
        where: { id: relayId },
        data: {
          status,
          responsePayload: responsePayload ? JSON.stringify(responsePayload) : responseMessage || null,
          resolvedAt: new Date(),
        },
      });

      return { success: true, relayId: updated.id, status: updated.status };
    }

    case 'list_connections': {
      const { status: connStatus, includeFederated } = args;
      const where: any = {
        OR: [{ requesterId: userId }, { accepterId: userId }],
        status: connStatus || 'active',
      };
      if (includeFederated === false) where.isFederated = false;

      const connections = await prisma.connection.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      return connections.map((c: any) => {
        const peer = c.requesterId === userId ? c.accepter : c.requester;
        let permissions = { trustLevel: 'supervised', scopes: [] as string[] };
        try { permissions = JSON.parse(c.permissions); } catch {}
        return {
          id: c.id,
          peer: peer ? { id: peer.id, name: peer.name, email: peer.email } : { name: c.peerUserName, email: c.peerUserEmail },
          status: c.status,
          isFederated: c.isFederated,
          peerInstanceUrl: c.peerInstanceUrl,
          trustLevel: permissions.trustLevel,
          scopes: permissions.scopes,
          nickname: c.requesterId === userId ? c.nickname : c.peerNickname,
          createdAt: c.createdAt,
        };
      });
    }

    case 'manage_connection': {
      const { connectionId, action, trustLevel, scopes } = args;
      const connection = await prisma.connection.findFirst({
        where: {
          id: connectionId,
          OR: [{ requesterId: userId }, { accepterId: userId }],
        },
      });
      if (!connection) return { error: 'Connection not found' };

      if (action === 'accept') {
        await prisma.connection.update({ where: { id: connectionId }, data: { status: 'active' } });
        return { success: true, status: 'active' };
      } else if (action === 'decline') {
        await prisma.connection.update({ where: { id: connectionId }, data: { status: 'declined' } });
        return { success: true, status: 'declined' };
      } else if (action === 'block') {
        await prisma.connection.update({ where: { id: connectionId }, data: { status: 'blocked' } });
        return { success: true, status: 'blocked' };
      } else if (action === 'update_permissions') {
        const newPerms = JSON.stringify({ trustLevel: trustLevel || 'supervised', scopes: scopes || [] });
        await prisma.connection.update({ where: { id: connectionId }, data: { permissions: newPerms } });
        return { success: true, trustLevel, scopes };
      }
      return { error: `Unknown action: ${action}` };
    }

    case 'list_relays': {
      const { status: relayStatus, direction, connectionId: connId, limit } = args;
      const where: any = {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      };
      if (relayStatus) where.status = relayStatus;
      if (direction === 'inbound') {
        where.OR = [{ toUserId: userId }];
      } else if (direction === 'outbound') {
        where.OR = [{ fromUserId: userId }];
      }
      if (connId) where.connectionId = connId;

      const relays = await prisma.agentRelay.findMany({
        where,
        include: {
          connection: {
            include: {
              requester: { select: { id: true, name: true, email: true } },
              accepter: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit || 20, 100),
      });

      return relays.map((r: any) => ({
        id: r.id,
        type: r.type,
        intent: r.intent,
        subject: r.subject,
        payload: r.payload ? (() => { try { return JSON.parse(r.payload); } catch { return r.payload; } })() : null,
        status: r.status,
        priority: r.priority,
        direction: r.fromUserId === userId ? 'outbound' : 'inbound',
        dueDate: r.dueDate,
        resolvedAt: r.resolvedAt,
        responsePayload: r.responsePayload ? (() => { try { return JSON.parse(r.responsePayload); } catch { return r.responsePayload; } })() : null,
        connectionId: r.connectionId,
        peerInstanceUrl: r.peerInstanceUrl,
        createdAt: r.createdAt,
      }));
    }

    case 'update_profile': {
      const existing = await prisma.userProfile.findUnique({ where: { userId } });

      const jsonFields = ['skills', 'languages', 'countriesLived', 'lifeExperiences',
        'volunteering', 'hobbies', 'personalValues', 'superpowers', 'taskTypes'];
      const plainFields = ['headline', 'bio', 'currentTitle', 'currentCompany', 'industry',
        'linkedinUrl', 'timezone', 'capacity', 'capacityNote', 'visibility'];

      const data: Record<string, any> = {};

      for (const field of plainFields) {
        if (args[field] !== undefined) data[field] = args[field];
      }

      for (const field of jsonFields) {
        if (args[field] !== undefined) {
          // Merge arrays rather than replace
          if (existing) {
            let existingVal: any[] = [];
            try { existingVal = JSON.parse((existing as any)[field] || '[]'); } catch {}
            const merged = Array.isArray(args[field])
              ? [...new Set([...existingVal.filter((v: any) => typeof v === 'string'), ...args[field].filter((v: any) => typeof v === 'string')])]
              : args[field];
            data[field] = JSON.stringify(Array.isArray(merged) ? merged : args[field]);
          } else {
            data[field] = JSON.stringify(args[field]);
          }
        }
      }

      // Handle workingHours and outOfOffice as JSON
      if (args.workingHours) data.workingHours = JSON.stringify(args.workingHours);
      if (args.outOfOffice) data.outOfOffice = JSON.stringify(args.outOfOffice);
      if (args.sharedSections) data.sharedSections = JSON.stringify(args.sharedSections);

      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: data,
        create: { user: { connect: { id: userId } }, ...data },
      });

      return { success: true, updatedFields: Object.keys(data) };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Resource Reading ────────────────────────────────────────────────────────

async function readResource(uri: string, agent: AgentContext): Promise<any> {
  const userId = agent.userId;

  const parseJson = (val: string | null) => {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return val; }
  };

  switch (uri) {
    case 'dividen://profile/self': {
      const profile = await prisma.userProfile.findUnique({ where: { userId } });
      if (!profile) return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ exists: false, message: 'No profile configured yet. Use update_profile tool to create one.' }) }] };

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            professional: {
              headline: profile.headline,
              bio: profile.bio,
              currentTitle: profile.currentTitle,
              currentCompany: profile.currentCompany,
              industry: profile.industry,
              skills: parseJson(profile.skills),
              experience: parseJson(profile.experience),
              education: parseJson(profile.education),
            },
            livedExperience: {
              languages: parseJson(profile.languages),
              countriesLived: parseJson(profile.countriesLived),
              lifeExperiences: parseJson(profile.lifeExperiences),
              volunteering: parseJson(profile.volunteering),
              hobbies: parseJson(profile.hobbies),
              personalValues: parseJson(profile.personalValues),
              superpowers: parseJson(profile.superpowers),
            },
            taskTypes: parseJson(profile.taskTypes),
            availability: {
              timezone: profile.timezone,
              workingHours: parseJson(profile.workingHours),
              capacity: profile.capacity,
              capacityNote: profile.capacityNote,
              outOfOffice: parseJson(profile.outOfOffice),
            },
            privacy: {
              visibility: profile.visibility,
              sharedSections: parseJson(profile.sharedSections),
            },
          }),
        }],
      };
    }

    case 'dividen://connections': {
      const connections = await prisma.connection.findMany({
        where: {
          status: 'active',
          OR: [{ requesterId: userId }, { accepterId: userId }],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Load peer profiles
      const peerIds = connections.map((c: any) =>
        c.requesterId === userId ? c.accepterId : c.requesterId
      ).filter((id: any): id is string => !!id);

      const profiles = peerIds.length > 0
        ? await prisma.userProfile.findMany({ where: { userId: { in: peerIds } } })
        : [];
      const profileMap = new Map(profiles.map((p: any) => [p.userId, p]));

      const data = connections.map((c: any) => {
        const peer = c.requesterId === userId ? c.accepter : c.requester;
        const peerId = peer?.id;
        const peerProfile = peerId ? profileMap.get(peerId) : null;
        let permissions = { trustLevel: 'supervised', scopes: [] as string[] };
        try { permissions = JSON.parse(c.permissions); } catch {}

        return {
          id: c.id,
          peer: peer ? { name: peer.name, email: peer.email } : { name: c.peerUserName, email: c.peerUserEmail },
          isFederated: c.isFederated,
          trustLevel: permissions.trustLevel,
          scopes: permissions.scopes,
          peerProfile: peerProfile ? {
            headline: peerProfile.headline,
            skills: parseJson(peerProfile.skills),
            taskTypes: parseJson(peerProfile.taskTypes),
            capacity: peerProfile.capacity,
            timezone: peerProfile.timezone,
            superpowers: parseJson(peerProfile.superpowers),
          } : null,
        };
      });

      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
    }

    case 'dividen://relays/pending': {
      const relays = await prisma.agentRelay.findMany({
        where: {
          toUserId: userId,
          status: { in: ['pending', 'delivered', 'agent_handling'] },
        },
        include: {
          connection: {
            include: {
              requester: { select: { name: true, email: true } },
              accepter: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const data = relays.map((r: any) => ({
        id: r.id,
        type: r.type,
        intent: r.intent,
        subject: r.subject,
        payload: r.payload ? (() => { try { return JSON.parse(r.payload); } catch { return r.payload; } })() : null,
        status: r.status,
        priority: r.priority,
        dueDate: r.dueDate,
        from: r.connection?.requesterId === userId
          ? r.connection?.accepter
          : r.connection?.requester,
        peerInstanceUrl: r.peerInstanceUrl,
        createdAt: r.createdAt,
      }));

      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
    }

    case 'dividen://relays/history': {
      const relays = await prisma.agentRelay.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const data = relays.map((r: any) => ({
        id: r.id,
        type: r.type,
        intent: r.intent,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        direction: r.fromUserId === userId ? 'outbound' : 'inbound',
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      }));

      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
    }

    case 'dividen://queue': {
      const items = await prisma.queueItem.findMany({
        where: { status: { in: ['pending', 'in_progress'] } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 30,
      });

      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(items) }] };
    }

    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
}

// ─── Prompt Generation ───────────────────────────────────────────────────────

async function getPrompt(name: string, args: Record<string, string>, agent: AgentContext): Promise<any> {
  const userId = agent.userId;

  switch (name) {
    case 'relay_context': {
      const { relayId } = args;
      if (!relayId) throw new Error('relayId is required');

      const relay = await prisma.agentRelay.findFirst({
        where: {
          id: relayId,
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        include: {
          connection: {
            include: {
              requester: { select: { id: true, name: true, email: true } },
              accepter: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!relay) throw new Error('Relay not found');

      // Get peer profile
      const peerId = relay.fromUserId === userId ? relay.toUserId : relay.fromUserId;
      const peerProfile = peerId ? await prisma.userProfile.findUnique({ where: { userId: peerId } }) : null;

      const parseJson = (v: any) => { try { return JSON.parse(v); } catch { return v; } };

      const context = [
        `## Relay Details`,
        `- **Subject**: ${relay.subject}`,
        `- **Type**: ${relay.type}`,
        `- **Intent**: ${relay.intent}`,
        `- **Priority**: ${relay.priority}`,
        `- **Status**: ${relay.status}`,
        `- **Direction**: ${relay.fromUserId === userId ? 'outbound' : 'inbound'}`,
        relay.dueDate ? `- **Due**: ${relay.dueDate}` : '',
        relay.payload ? `\n## Payload\n\`\`\`json\n${relay.payload}\n\`\`\`` : '',
        relay.responsePayload ? `\n## Response\n\`\`\`json\n${relay.responsePayload}\n\`\`\`` : '',
      ].filter(Boolean).join('\n');

      const peerContext = peerProfile ? [
        `\n## Peer Profile`,
        `- **Name**: ${(relay.connection as any)?.requester?.name || (relay.connection as any)?.accepter?.name || 'Unknown'}`,
        peerProfile.headline ? `- **Headline**: ${peerProfile.headline}` : '',
        peerProfile.skills ? `- **Skills**: ${parseJson(peerProfile.skills)?.join(', ')}` : '',
        peerProfile.taskTypes ? `- **Task Types**: ${parseJson(peerProfile.taskTypes)?.join(', ')}` : '',
        peerProfile.capacity ? `- **Capacity**: ${peerProfile.capacity}` : '',
        peerProfile.timezone ? `- **Timezone**: ${peerProfile.timezone}` : '',
      ].filter(Boolean).join('\n') : '';

      return {
        description: `Full context for relay: ${relay.subject}`,
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: `${context}${peerContext}\n\n## Instructions\nBased on the relay details and peer profile above, help me handle this relay appropriately. Consider the intent, priority, and the peer's profile when crafting a response.` },
          },
        ],
      };
    }

    case 'routing_decision': {
      const { taskDescription, requiredSkills } = args;
      if (!taskDescription) throw new Error('taskDescription is required');

      // Get all active connections with profiles
      const connections = await prisma.connection.findMany({
        where: {
          status: 'active',
          OR: [{ requesterId: userId }, { accepterId: userId }],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          accepter: { select: { id: true, name: true, email: true } },
        },
      });

      const peerIds = connections.map((c: any) =>
        c.requesterId === userId ? c.accepterId : c.requesterId
      ).filter((id: any): id is string => !!id);

      const profiles = peerIds.length > 0
        ? await prisma.userProfile.findMany({ where: { userId: { in: peerIds } } })
        : [];
      const profileMap = new Map(profiles.map((p: any) => [p.userId, p]));

      const parseJson = (v: any) => { try { return JSON.parse(v); } catch { return []; } };

      const candidateList = connections.map((c: any) => {
        const peer = c.requesterId === userId ? c.accepter : c.requester;
        const peerId = peer?.id;
        const profile = peerId ? profileMap.get(peerId) : null;
        let permissions = { trustLevel: 'supervised', scopes: [] as string[] };
        try { permissions = JSON.parse(c.permissions); } catch {}

        return [
          `### ${peer?.name || c.peerUserName || 'Unknown'}`,
          profile?.headline ? `Headline: ${profile.headline}` : '',
          profile?.skills ? `Skills: ${parseJson(profile.skills).join(', ')}` : '',
          profile?.taskTypes ? `Task Types: ${parseJson(profile.taskTypes).join(', ')}` : '',
          profile?.superpowers ? `Superpowers: ${parseJson(profile.superpowers).join(', ')}` : '',
          profile?.languages ? `Languages: ${parseJson(profile.languages).map((l: any) => l.language || l).join(', ')}` : '',
          profile?.countriesLived ? `Countries Lived: ${parseJson(profile.countriesLived).map((c: any) => c.country || c).join(', ')}` : '',
          profile?.capacity ? `Capacity: ${profile.capacity}${profile.capacityNote ? ` (${profile.capacityNote})` : ''}` : '',
          profile?.timezone ? `Timezone: ${profile.timezone}` : '',
          `Trust Level: ${permissions.trustLevel}`,
          `Scopes: ${permissions.scopes.join(', ') || 'none'}`,
          `Connection ID: ${c.id}`,
        ].filter(Boolean).join('\n');
      }).join('\n\n');

      return {
        description: `Routing decision for: ${taskDescription}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `## Task`,
                taskDescription,
                requiredSkills ? `\n## Required Skills\n${requiredSkills}` : '',
                `\n## Available Connections`,
                candidateList || 'No active connections available.',
                `\n## Routing Rules`,
                `1. Skills match — technical capability`,
                `2. Lived experience — cultural understanding, relevant life experiences`,
                `3. Task type alignment — self-identified work categories`,
                `4. Availability — capacity status (busy/unavailable = route elsewhere)`,
                `5. Superpowers — unique match priority`,
                `6. Trust level — connection permission constraints`,
                `\nLived-in experience > speaks-language for cultural understanding.`,
                `Superpowers get priority when uniquely matched.`,
                `Never route to someone at_capacity or out_of_office unless urgent.`,
                `\n## Instructions`,
                `Evaluate each candidate against the task. Recommend the best match with reasoning. Include the connectionId for sending the relay.`,
              ].filter(Boolean).join('\n'),
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// ─── MCP Method Router ───────────────────────────────────────────────────────

async function handleMcpMethod(method: string, params: any, agent: AgentContext): Promise<any> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      };

    case 'ping':
      return {};

    case 'tools/list':
      return { tools: TOOLS };

    case 'tools/call': {
      const { name, arguments: toolArgs } = params || {};
      if (!name) throw { code: INVALID_PARAMS, message: 'Missing tool name' };
      const tool = TOOLS.find(t => t.name === name);
      if (!tool) throw { code: INVALID_PARAMS, message: `Unknown tool: ${name}` };

      const result = await executeTool(name, toolArgs || {}, agent);
      return {
        content: [
          { type: 'text', text: JSON.stringify(result, null, 2) },
        ],
      };
    }

    case 'resources/list':
      return { resources: RESOURCES };

    case 'resources/read': {
      const { uri } = params || {};
      if (!uri) throw { code: INVALID_PARAMS, message: 'Missing resource URI' };
      return await readResource(uri, agent);
    }

    case 'prompts/list':
      return { prompts: PROMPTS };

    case 'prompts/get': {
      const { name, arguments: promptArgs } = params || {};
      if (!name) throw { code: INVALID_PARAMS, message: 'Missing prompt name' };
      return await getPrompt(name, promptArgs || {}, agent);
    }

    // Notifications (client → server, no response expected)
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return undefined; // Acknowledged, no response

    default:
      throw { code: METHOD_NOT_FOUND, message: `Method not found: ${method}` };
  }
}

// ─── HTTP Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/mcp
 * 
 * MCP (Model Context Protocol) Server — Streamable HTTP transport.
 * Implements JSON-RPC 2.0 over HTTP per the MCP November 2025 specification.
 * 
 * Authentication: Bearer token (same as Agent API v2)
 * Protocol: JSON-RPC 2.0
 * Spec: https://modelcontextprotocol.io/specification/2025-11-25
 */
export async function POST(req: NextRequest) {
  // Authenticate
  const auth = await authenticateAgent(req, 'mcp');
  if (isAuthError(auth)) return auth;
  const agent = auth as AgentContext;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      jsonRpcError(null, PARSE_ERROR, 'Parse error: invalid JSON'),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (request: JsonRpcRequest) => {
        try {
          return await processSingleRequest(request, agent);
        } catch (err: any) {
          return jsonRpcError(request?.id, INTERNAL_ERROR, err.message || 'Internal error');
        }
      })
    );
    // Filter out notification responses (undefined)
    const filtered = responses.filter(r => r !== undefined);
    if (filtered.length === 0) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(filtered, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Single request
  try {
    const response = await processSingleRequest(body, agent);
    if (response === undefined) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return NextResponse.json(
      jsonRpcError(body?.id, INTERNAL_ERROR, err.message || 'Internal error'),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function processSingleRequest(request: JsonRpcRequest, agent: AgentContext) {
  if (!request || request.jsonrpc !== '2.0' || !request.method) {
    return jsonRpcError(request?.id, INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request');
  }

  // Notifications have no id and expect no response
  const isNotification = request.id === undefined || request.id === null;

  try {
    const result = await handleMcpMethod(request.method, request.params || {}, agent);
    if (isNotification || result === undefined) return undefined;
    return jsonRpcResponse(request.id, result);
  } catch (err: any) {
    if (isNotification) return undefined;
    if (err.code) {
      return jsonRpcError(request.id, err.code, err.message);
    }
    return jsonRpcError(request.id, INTERNAL_ERROR, err.message || 'Internal error');
  }
}

/**
 * GET /api/mcp
 * 
 * Returns server metadata for discovery.
 * MCP clients can GET this endpoint to discover capabilities before connecting.
 */
export async function GET() {
  return NextResponse.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    description: 'DiviDen MCP Server — Agent relay coordination, profile routing, and federated connections.',
    capabilities: ['tools', 'resources', 'prompts'],
    documentation: 'https://dividen.ai/docs',
    authentication: {
      type: 'bearer',
      description: 'Use a DiviDen API key as Bearer token. Generate keys from Settings → API Keys.',
    },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * OPTIONS /api/mcp — CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
