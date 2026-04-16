export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token === process.env.ADMIN_PASSWORD;
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Deletes a user and cleans up their data.
 * Behavior:
 *   - Connections (pending + active) → deleted (cascade)
 *   - Projects with other members → ownership transferred to next member, user's membership removed
 *   - Teams with other members → ownership transferred to next member, user's membership removed
 *   - Kanban cards in shared projects → ownership transferred to project lead / next member
 *   - Solo projects, solo teams, personal cards, chat history, etc. → deleted (cascade)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── 1. Transfer project ownership for shared projects ──
    const ownedProjects = await prisma.project.findMany({
      where: { createdById: userId },
      include: {
        members: {
          where: { userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    for (const project of ownedProjects) {
      if (project.members.length > 0 && project.members[0].userId) {
        // Transfer ownership to first other member
        await prisma.project.update({
          where: { id: project.id },
          data: { createdById: project.members[0].userId },
        });
        // Remove deleted user's membership
        await prisma.projectMember.deleteMany({
          where: { projectId: project.id, userId },
        });
      }
      // Solo projects will cascade-delete with the user
    }

    // ── 2. Transfer team ownership for shared teams ──
    const ownedTeams = await prisma.team.findMany({
      where: { createdById: userId },
      include: {
        members: {
          where: { userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    for (const team of ownedTeams) {
      if (team.members.length > 0 && team.members[0].userId) {
        // Transfer ownership
        await prisma.team.update({
          where: { id: team.id },
          data: { createdById: team.members[0].userId },
        });
        // Promote the new owner to "owner" role
        await prisma.teamMember.update({
          where: { id: team.members[0].id },
          data: { role: 'owner' },
        });
        // Remove deleted user's membership
        await prisma.teamMember.deleteMany({
          where: { teamId: team.id, userId },
        });
      }
    }

    // ── 3. Transfer kanban cards in shared projects ──
    // Find cards owned by this user that belong to projects with other members
    const sharedProjectIds = ownedProjects
      .filter((p) => p.members.length > 0 && p.members[0].userId)
      .map((p) => p.id);

    // Also find projects where user is a member (not creator)
    const memberProjects = await prisma.projectMember.findMany({
      where: { userId, project: { members: { some: { userId: { not: userId } } } } },
      include: {
        project: {
          include: {
            members: {
              where: { userId: { not: userId } },
              orderBy: { joinedAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    const allSharedProjectIds = [
      ...sharedProjectIds,
      ...memberProjects.filter((m) => m.project.members.length > 0).map((m) => m.projectId),
    ];

    if (allSharedProjectIds.length > 0) {
      // Build a map of projectId → new owner userId
      const projectNewOwnerMap = new Map<string, string>();

      for (const p of ownedProjects) {
        if (p.members.length > 0 && p.members[0].userId) {
          projectNewOwnerMap.set(p.id, p.members[0].userId);
        }
      }
      for (const m of memberProjects) {
        if (m.project.members.length > 0 && m.project.members[0].userId) {
          projectNewOwnerMap.set(m.projectId, m.project.members[0].userId);
        }
      }

      // Transfer cards project by project
      for (const [projectId, newOwnerId] of projectNewOwnerMap) {
        await prisma.kanbanCard.updateMany({
          where: { userId, projectId },
          data: { userId: newOwnerId },
        });
      }
    }

    // ── 4. Remove user's project memberships (for projects they don't own) ──
    await prisma.projectMember.deleteMany({ where: { userId } });

    // ── 5. Remove user's team memberships (for teams they don't own) ──
    await prisma.teamMember.deleteMany({ where: { userId } });

    // ── 6. Nullify marketplace capabilities created by this user ──
    // (onDelete: SetNull should handle this, but be explicit)
    await prisma.marketplaceCapability.updateMany({
      where: { createdByUserId: userId },
      data: { createdByUserId: null },
    });

    // ── 7. Delete the user — cascade handles the rest ──
    await prisma.user.delete({ where: { id: userId } });

    console.log(`[admin] Deleted user ${user.email} (${userId}). Shared projects/teams transferred.`);

    return NextResponse.json({
      success: true,
      deleted: { id: userId, email: user.email, name: user.name },
      transferred: {
        projects: ownedProjects.filter((p) => p.members.length > 0).length,
        teams: ownedTeams.filter((t) => t.members.length > 0).length,
        cardsInSharedProjects: allSharedProjectIds.length > 0 ? 'transferred' : 'none',
      },
    });
  } catch (error: any) {
    console.error('[admin] Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', detail: error.message },
      { status: 500 }
    );
  }
}
