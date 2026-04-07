/**
 * Contact Research/Enrichment API
 * POST — enrich contact data with available information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) {
    return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
  }

  // Build enrichment data from available context
  // In production, this would call external APIs (Clearbit, LinkedIn, etc.)
  const enrichment: Record<string, any> = {
    enrichedAt: new Date().toISOString(),
    source: 'internal',
  };

  // Check for linked cards to build activity summary
  const linkedCards = await prisma.cardContact.findMany({
    where: { contactId: contact.id },
    include: {
      card: { select: { id: true, title: true, status: true, priority: true, createdAt: true } },
    },
  });

  enrichment.linkedCards = linkedCards.length;
  enrichment.activeDeals = linkedCards.filter(
    (lc) => !['completed'].includes(lc.card.status)
  ).length;

  // Check for memory items related to this contact
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user) {
    const relatedMemories = await prisma.memoryItem.findMany({
      where: {
        userId: user.id,
        OR: [
          { scope: { contains: contact.name } },
          { value: { contains: contact.name } },
        ],
      },
      take: 10,
    });
    enrichment.relatedMemories = relatedMemories.length;
    enrichment.notes = relatedMemories.map((m) => `${m.key}: ${m.value}`).slice(0, 5);
  }

  // Update contact with enrichment data
  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: {
      enrichedData: JSON.stringify(enrichment),
      source: contact.source === 'manual' ? 'enriched' : contact.source,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      contact: updated,
      enrichment,
    },
  });
}
