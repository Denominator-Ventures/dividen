/**
 * Team → Project Member Sync
 *
 * When a team is assigned to a project, all team members become project members.
 * When a new member joins a team, they're auto-added to all team projects.
 * When a member leaves a team, they're removed from team-owned projects
 * (unless they were added individually).
 */

import { prisma } from '@/lib/prisma';

/**
 * Sync all team members into a project as ProjectMembers.
 * Skips members who are already in the project.
 * Returns the count of newly added members.
 */
export async function syncTeamMembersToProject(
  teamId: string,
  projectId: string
): Promise<{ added: number; skipped: number }> {
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true, connectionId: true, role: true },
  });

  let added = 0;
  let skipped = 0;

  for (const tm of teamMembers) {
    // Map team role to project role
    const projectRole = tm.role === 'owner' ? 'lead' : 'contributor';

    try {
      if (tm.userId) {
        // Local member — check if already in project
        const existing = await prisma.projectMember.findFirst({
          where: { projectId, userId: tm.userId },
        });
        if (existing) { skipped++; continue; }

        await prisma.projectMember.create({
          data: { projectId, userId: tm.userId, connectionId: tm.connectionId, role: projectRole },
        });
        added++;
      } else if (tm.connectionId) {
        // Federated member — check by connectionId
        const existing = await prisma.projectMember.findFirst({
          where: { projectId, connectionId: tm.connectionId },
        });
        if (existing) { skipped++; continue; }

        await prisma.projectMember.create({
          data: { projectId, connectionId: tm.connectionId, role: projectRole },
        });
        added++;
      }
    } catch (e: any) {
      // Unique constraint violation = already exists, skip
      if (e.code === 'P2002') { skipped++; continue; }
      throw e;
    }
  }

  return { added, skipped };
}

/**
 * When a new member joins a team, add them to all projects owned by that team.
 */
export async function syncNewMemberToTeamProjects(
  teamId: string,
  userId: string | null,
  connectionId: string | null
): Promise<number> {
  const teamProjects = await prisma.project.findMany({
    where: { teamId, status: { not: 'archived' } },
    select: { id: true },
  });

  let added = 0;
  for (const project of teamProjects) {
    try {
      if (userId) {
        const existing = await prisma.projectMember.findFirst({
          where: { projectId: project.id, userId },
        });
        if (existing) continue;
        await prisma.projectMember.create({
          data: { projectId: project.id, userId, connectionId, role: 'contributor' },
        });
      } else if (connectionId) {
        const existing = await prisma.projectMember.findFirst({
          where: { projectId: project.id, connectionId },
        });
        if (existing) continue;
        await prisma.projectMember.create({
          data: { projectId: project.id, connectionId, role: 'contributor' },
        });
      }
      added++;
    } catch (e: any) {
      if (e.code === 'P2002') continue;
      throw e;
    }
  }

  return added;
}
