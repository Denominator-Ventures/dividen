/**
 * FVP Brief Proposal #5: Universal Entity Resolution
 *
 * Cross-surface dedup and entity resolution. Given an email, name, or domain,
 * finds all matching entities across contacts, connections, kanban cards,
 * calendar events, email messages, and relays.
 *
 * This is the foundation for cross-surface intelligence — one function
 * that answers "what do we know about this person/company?"
 */

import { prisma } from './prisma';

export interface ResolvedEntity {
  type: 'contact' | 'connection' | 'card' | 'calendar_event' | 'email' | 'relay' | 'team_member';
  id: string;
  name: string;
  detail?: string;
  matchedOn: string; // What field matched
  confidence: 'exact' | 'strong' | 'fuzzy';
}

export interface EntityResolutionResult {
  query: string;
  queryType: 'email' | 'name' | 'domain' | 'auto';
  matches: ResolvedEntity[];
  summary: {
    contacts: number;
    connections: number;
    cards: number;
    events: number;
    emails: number;
    relays: number;
    teamMembers: number;
  };
}

/**
 * Detect query type from input
 */
function detectQueryType(query: string): 'email' | 'domain' | 'name' {
  if (query.includes('@') && query.includes('.')) return 'email';
  if (query.match(/^[a-z0-9-]+\.[a-z]{2,}$/i)) return 'domain';
  return 'name';
}

/**
 * Extract domain from email
 */
function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

/**
 * Resolve an entity across all surfaces.
 * 
 * @param userId - The authenticated user's ID (ownership scoping)
 * @param query - Email, name, or domain to search for
 * @param options - Optional: limit results, filter by surface
 */
export async function resolveEntity(
  userId: string,
  query: string,
  options?: { limit?: number; surfaces?: string[] }
): Promise<EntityResolutionResult> {
  const queryLower = query.toLowerCase().trim();
  const queryType = detectQueryType(queryLower);
  const limit = options?.limit || 50;
  const surfaces = options?.surfaces || ['contacts', 'connections', 'cards', 'events', 'emails', 'relays', 'team_members'];
  const matches: ResolvedEntity[] = [];

  // Extract domain for company-level matching
  const domain = queryType === 'email' ? extractDomain(queryLower) : queryType === 'domain' ? queryLower : null;

  // 1. Contacts
  if (surfaces.includes('contacts')) {
    const contactWhere: any = { userId };
    if (queryType === 'email') {
      contactWhere.OR = [
        { email: { equals: queryLower, mode: 'insensitive' } },
        { name: { contains: queryLower.split('@')[0], mode: 'insensitive' } },
      ];
    } else if (queryType === 'domain') {
      contactWhere.OR = [
        { email: { endsWith: `@${queryLower}`, mode: 'insensitive' } },
        { company: { contains: queryLower.replace(/\.[a-z]+$/, ''), mode: 'insensitive' } },
      ];
    } else {
      contactWhere.OR = [
        { name: { contains: queryLower, mode: 'insensitive' } },
        { email: { contains: queryLower, mode: 'insensitive' } },
        { company: { contains: queryLower, mode: 'insensitive' } },
      ];
    }
    const contacts = await prisma.contact.findMany({
      where: contactWhere,
      take: limit,
      select: { id: true, name: true, email: true, company: true },
    });
    for (const c of contacts) {
      const isExactEmail = queryType === 'email' && c.email?.toLowerCase() === queryLower;
      matches.push({
        type: 'contact',
        id: c.id,
        name: c.name || c.email || 'Unknown',
        detail: [c.email, c.company].filter(Boolean).join(' · '),
        matchedOn: isExactEmail ? 'email' : 'name/company',
        confidence: isExactEmail ? 'exact' : 'strong',
      });
    }
  }

  // 2. Connections
  if (surfaces.includes('connections')) {
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
    for (const conn of connections) {
      const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
      const peerName = conn.peerUserName || peer?.name || '';
      const peerEmail = conn.peerUserEmail || peer?.email || '';
      const nameMatch = peerName.toLowerCase().includes(queryLower);
      const emailMatch = peerEmail.toLowerCase() === queryLower || peerEmail.toLowerCase().includes(queryLower);
      const domainMatch = domain && peerEmail.toLowerCase().endsWith(`@${domain}`);

      if (nameMatch || emailMatch || domainMatch) {
        matches.push({
          type: 'connection',
          id: conn.id,
          name: peerName || peerEmail || 'Unknown',
          detail: conn.isFederated ? `Federated: ${conn.peerInstanceUrl}` : `Local connection`,
          matchedOn: emailMatch ? 'email' : nameMatch ? 'name' : 'domain',
          confidence: emailMatch && peerEmail.toLowerCase() === queryLower ? 'exact' : 'strong',
        });
      }
    }
  }

  // 3. Kanban Cards
  if (surfaces.includes('cards')) {
    const cards = await prisma.kanbanCard.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: queryLower, mode: 'insensitive' } },
          { description: { contains: queryLower, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, title: true, status: true, assignee: true },
    });
    for (const card of cards) {
      matches.push({
        type: 'card',
        id: card.id,
        name: card.title,
        detail: `${card.status} · ${card.assignee}`,
        matchedOn: 'title/description',
        confidence: 'strong',
      });
    }
  }

  // 4. Calendar Events
  if (surfaces.includes('events')) {
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: queryLower, mode: 'insensitive' } },
          { attendees: { contains: queryLower, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { startTime: 'desc' },
      select: { id: true, title: true, startTime: true, attendees: true },
    });
    for (const event of events) {
      matches.push({
        type: 'calendar_event',
        id: event.id,
        name: event.title,
        detail: event.startTime?.toISOString().split('T')[0],
        matchedOn: 'title/attendees',
        confidence: 'fuzzy',
      });
    }
  }

  // 5. Email Messages
  if (surfaces.includes('emails')) {
    const emails = await prisma.emailMessage.findMany({
      where: {
        userId,
        OR: [
          { fromEmail: { contains: queryLower, mode: 'insensitive' } },
          { toEmail: { contains: queryLower, mode: 'insensitive' } },
          { fromName: { contains: queryLower, mode: 'insensitive' } },
        ],
      },
      take: Math.min(limit, 10),
      orderBy: { receivedAt: 'desc' },
      select: { id: true, subject: true, fromName: true, fromEmail: true, receivedAt: true },
    });
    for (const email of emails) {
      matches.push({
        type: 'email',
        id: email.id,
        name: email.subject || 'No subject',
        detail: `From: ${email.fromName || email.fromEmail}`,
        matchedOn: 'from/to email',
        confidence: email.fromEmail?.toLowerCase() === queryLower ? 'exact' : 'strong',
      });
    }
  }

  // 6. Agent Relays
  if (surfaces.includes('relays')) {
    const relays = await prisma.agentRelay.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        subject: { contains: queryLower, mode: 'insensitive' },
      },
      take: Math.min(limit, 10),
      orderBy: { createdAt: 'desc' },
      select: { id: true, subject: true, status: true, threadId: true, createdAt: true },
    });
    for (const relay of relays) {
      matches.push({
        type: 'relay',
        id: relay.id,
        name: relay.subject,
        detail: `${relay.status} · ${relay.threadId ? `Thread: ${relay.threadId}` : 'No thread'}`,
        matchedOn: 'subject',
        confidence: 'fuzzy',
      });
    }
  }

  // 7. Team Members (via connections)
  if (surfaces.includes('team_members')) {
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        team: { members: { some: { userId } } },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        connection: { select: { id: true, peerUserName: true, peerUserEmail: true } },
      },
      take: limit,
    });
    for (const tm of teamMembers) {
      const memberName = tm.user?.name || tm.connection?.peerUserName || '';
      const memberEmail = tm.user?.email || tm.connection?.peerUserEmail || '';
      if (memberName.toLowerCase().includes(queryLower) || memberEmail.toLowerCase().includes(queryLower)) {
        matches.push({
          type: 'team_member',
          id: tm.id,
          name: memberName || memberEmail || 'Unknown',
          detail: `Role: ${tm.role}`,
          matchedOn: memberEmail.toLowerCase() === queryLower ? 'email' : 'name',
          confidence: memberEmail.toLowerCase() === queryLower ? 'exact' : 'strong',
        });
      }
    }
  }

  // Sort by confidence: exact > strong > fuzzy
  const confidenceOrder = { exact: 0, strong: 1, fuzzy: 2 };
  matches.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

  return {
    query,
    queryType: queryType === 'email' || queryType === 'domain' ? queryType : 'name',
    matches: matches.slice(0, limit),
    summary: {
      contacts: matches.filter(m => m.type === 'contact').length,
      connections: matches.filter(m => m.type === 'connection').length,
      cards: matches.filter(m => m.type === 'card').length,
      events: matches.filter(m => m.type === 'calendar_event').length,
      emails: matches.filter(m => m.type === 'email').length,
      relays: matches.filter(m => m.type === 'relay').length,
      teamMembers: matches.filter(m => m.type === 'team_member').length,
    },
  };
}


// ─── Serendipity Matching Stub ────────────────────────────────────────────────
// Graph topology matching: "who should I meet?"
// Based on triadic closure, complementary expertise, structural bridges.

export async function computeSerendipityMatches(userId: string) {
  const { prisma } = await import('./prisma');

  // Get user's connections
  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: userId }, { accepterId: userId }], status: 'active' },
  });
  const connectedIds = new Set(
    connections.map(c => c.requesterId === userId ? c.accepterId : c.requesterId).filter(Boolean)
  );

  // Get profiles of connected users' connections (2nd degree)
  const secondDegreeConnections = await prisma.connection.findMany({
    where: {
      status: 'active',
      OR: [
        { requesterId: { in: [...connectedIds].filter((id): id is string => !!id) } },
        { accepterId: { in: [...connectedIds].filter((id): id is string => !!id) } },
      ],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      accepter: { select: { id: true, name: true, email: true } },
    },
  });

  // Find people who are connected to your connections but not to you
  const candidates = new Map<string, { name: string; mutualConnections: number }>();
  for (const c of secondDegreeConnections) {
    const otherId = connectedIds.has(c.requesterId) ? c.accepterId : c.requesterId;
    const otherUser = connectedIds.has(c.requesterId) ? c.accepter : c.requester;
    if (!otherId || otherId === userId || connectedIds.has(otherId)) continue;
    const existing = candidates.get(otherId);
    if (existing) {
      existing.mutualConnections++;
    } else {
      candidates.set(otherId, { name: otherUser?.name || otherUser?.email || 'Unknown', mutualConnections: 1 });
    }
  }

  // Sort by mutual connections (triadic closure strength)
  const sorted = [...candidates.entries()]
    .sort((a, b) => b[1].mutualConnections - a[1].mutualConnections)
    .slice(0, 10)
    .map(([id, data]) => ({ userId: id, name: data.name, mutualConnections: data.mutualConnections }));

  return {
    matches: sorted,
    summary: sorted.length > 0
      ? `Found ${sorted.length} potential connections. Top match: ${sorted[0].name} (${sorted[0].mutualConnections} mutual connections).`
      : 'No serendipity matches found yet. Build more connections to unlock network topology matching.',
  };
}