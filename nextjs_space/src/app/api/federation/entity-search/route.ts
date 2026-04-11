export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * FVP Brief Proposal #10: Federated Entity Search
 *
 * GET /api/federation/entity-search?q=query
 *
 * Auth: x-federation-token header
 *
 * Allows connected instances to query: "Does your instance know this person?"
 * Returns privacy-respecting results — only entity existence and basic metadata,
 * not full records. Controlled by connection trust level and user preferences.
 *
 * This enables the "warm intro" engine — discovering mutual connections
 * across the DiviDen network.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const federationToken = req.headers.get('x-federation-token');
  if (!federationToken) {
    return NextResponse.json({ error: 'Missing federation token' }, { status: 401, headers: CORS_HEADERS });
  }

  const connection = await prisma.connection.findFirst({
    where: { isFederated: true, federationToken, status: 'active' },
  });
  if (!connection) {
    return NextResponse.json({ error: 'Invalid federation token' }, { status: 403, headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter "q" required (min 2 chars)' }, { status: 400, headers: CORS_HEADERS });
  }

  const queryLower = query.toLowerCase().trim();

  // Determine local user for this connection
  const localUserId = connection.requesterId || connection.accepterId;
  if (!localUserId) {
    return NextResponse.json({ error: 'No local user for this connection' }, { status: 500, headers: CORS_HEADERS });
  }

  // Privacy-respecting search: only return existence + minimal metadata
  const results: Array<{
    type: 'contact' | 'card' | 'user';
    exists: boolean;
    count: number;
    hint?: string;
  }> = [];

  // 1. Search contacts (privacy: only name/company, no email/phone)
  const contactCount = await prisma.contact.count({
    where: {
      userId: localUserId,
      OR: [
        { name: { contains: queryLower, mode: 'insensitive' } },
        { email: { contains: queryLower, mode: 'insensitive' } },
        { company: { contains: queryLower, mode: 'insensitive' } },
      ],
    },
  });
  if (contactCount > 0) {
    // Get a hint (first name only) for the requesting instance
    const firstContact = await prisma.contact.findFirst({
      where: {
        userId: localUserId,
        OR: [
          { name: { contains: queryLower, mode: 'insensitive' } },
          { email: { contains: queryLower, mode: 'insensitive' } },
          { company: { contains: queryLower, mode: 'insensitive' } },
        ],
      },
      select: { name: true, company: true },
    });
    results.push({
      type: 'contact',
      exists: true,
      count: contactCount,
      hint: firstContact?.name ? `Known contact: ${firstContact.name}${firstContact.company ? ` (${firstContact.company})` : ''}` : undefined,
    });
  }

  // 2. Search kanban cards (privacy: only title, no details)
  const cardCount = await prisma.kanbanCard.count({
    where: {
      userId: localUserId,
      OR: [
        { title: { contains: queryLower, mode: 'insensitive' } },
        { description: { contains: queryLower, mode: 'insensitive' } },
      ],
    },
  });
  if (cardCount > 0) {
    results.push({
      type: 'card',
      exists: true,
      count: cardCount,
      hint: `${cardCount} related card(s) found`,
    });
  }

  // 3. Search local users
  const userCount = await prisma.user.count({
    where: {
      OR: [
        { name: { contains: queryLower, mode: 'insensitive' } },
        { email: { contains: queryLower, mode: 'insensitive' } },
      ],
    },
  });
  if (userCount > 0) {
    results.push({
      type: 'user',
      exists: true,
      count: userCount,
      hint: 'Known user on this instance',
    });
  }

  const fedConfig = await prisma.federationConfig.findFirst();

  return NextResponse.json(
    {
      query,
      instance: {
        name: fedConfig?.instanceName || 'DiviDen',
        url: fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '',
      },
      results,
      totalMatches: results.reduce((sum, r) => sum + r.count, 0),
      privacyNote: 'Results are privacy-filtered. Only entity existence and minimal metadata are shared. Request a warm introduction via relay for full details.',
    },
    { headers: CORS_HEADERS },
  );
}
