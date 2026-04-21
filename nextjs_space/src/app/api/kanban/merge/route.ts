export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/kanban/merge
 * Merge sourceCardId INTO targetCardId.
 * All tasks, contacts, artifacts move to target; source is deleted.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id as string;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetCardId, sourceCardId } = await req.json();
    if (!targetCardId || !sourceCardId) {
      return NextResponse.json({ error: 'targetCardId and sourceCardId are required' }, { status: 400 });
    }
    if (targetCardId === sourceCardId) {
      return NextResponse.json({ error: 'Cannot merge a card into itself' }, { status: 400 });
    }

    // Verify both cards belong to user
    const [target, source] = await Promise.all([
      prisma.kanbanCard.findFirst({ where: { id: targetCardId, userId }, include: { checklist: true } }),
      prisma.kanbanCard.findFirst({ where: { id: sourceCardId, userId }, include: { checklist: true, contacts: true } }),
    ]);
    if (!target) return NextResponse.json({ error: 'Target card not found' }, { status: 404 });
    if (!source) return NextResponse.json({ error: 'Source card not found' }, { status: 404 });

    // Move all checklist items from source to target
    const movedTasks = await prisma.checklistItem.updateMany({
      where: { cardId: sourceCardId },
      data: { cardId: targetCardId },
    });

    // Re-order all items on target
    const allItems = await prisma.checklistItem.findMany({
      where: { cardId: targetCardId },
      orderBy: { order: 'asc' },
    });
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].order !== i) {
        await prisma.checklistItem.update({ where: { id: allItems[i].id }, data: { order: i } });
      }
    }

    // Move CardContacts — upsert to avoid duplicates
    for (const cc of source.contacts) {
      await prisma.cardContact.upsert({
        where: { cardId_contactId: { cardId: targetCardId, contactId: cc.contactId } },
        create: { cardId: targetCardId, contactId: cc.contactId, role: cc.role, involvement: (cc as any).involvement || 'contributor', canDelegate: (cc as any).canDelegate || false },
        update: {},
      });
    }

    // Move CardArtifacts — upsert to avoid duplicates
    const sourceArtifacts = await prisma.cardArtifact.findMany({ where: { cardId: sourceCardId } });
    for (const art of sourceArtifacts) {
      await prisma.cardArtifact.upsert({
        where: { cardId_artifactType_artifactId: { cardId: targetCardId, artifactType: art.artifactType, artifactId: art.artifactId } },
        create: { cardId: targetCardId, artifactType: art.artifactType, artifactId: art.artifactId, label: art.label, metadata: art.metadata || undefined },
        update: {},
      });
    }

    // Append source description to target
    if (source.description) {
      await prisma.kanbanCard.update({
        where: { id: targetCardId },
        data: {
          description: target.description
            ? target.description + '\n\n---\nMerged from "' + source.title + '":\n' + source.description
            : source.description,
        },
      });
    }

    // Delete source card
    await prisma.kanbanCard.delete({ where: { id: sourceCardId } });

    // Return updated target card
    const updated = await prisma.kanbanCard.findUnique({
      where: { id: targetCardId },
      include: {
        checklist: { orderBy: { order: 'asc' } },
        contacts: { include: { contact: true } },
      },
    });

    return NextResponse.json({
      success: true,
      card: updated,
      merged: {
        deletedSourceTitle: source.title,
        tasksMoved: movedTasks.count,
        contactsMoved: source.contacts.length,
        artifactsMoved: sourceArtifacts.length,
      },
    });
  } catch (error: any) {
    console.error('[kanban/merge] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
