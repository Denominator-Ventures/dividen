export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/setup-project
 * Updates the DiviDen Setup project's due dates based on mode choice.
 * Body: { mode: 'together' | 'solo' }
 *   - together: tasks due today
 *   - solo: tasks due in 1 week
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const mode: 'together' | 'solo' = body.mode || 'together';

    // Find the setup project
    const project = await prisma.project.findFirst({
      where: {
        createdById: userId,
        metadata: { contains: '"isSetupProject":true' },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Setup project not found' }, { status: 404 });
    }

    const now = new Date();
    const oneWeek = new Date(now);
    oneWeek.setDate(oneWeek.getDate() + 7);
    const dueDate = mode === 'together' ? now : oneWeek;

    // Update all setup project cards with the chosen due date
    await prisma.kanbanCard.updateMany({
      where: { projectId: project.id, userId },
      data: { dueDate },
    });

    // Store the mode choice in project metadata
    await prisma.project.update({
      where: { id: project.id },
      data: {
        metadata: JSON.stringify({ isSetupProject: true, setupMode: mode }),
        description: mode === 'together'
          ? "Let's get your command center configured — Divi will walk you through each step."
          : 'Your setup checklist — complete at your own pace. Divi will check in if anything\'s outstanding.',
      },
    });

    return NextResponse.json({
      success: true,
      data: { projectId: project.id, mode, dueDate },
    });
  } catch (err: any) {
    console.error('Setup project update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update setup project' }, { status: 500 });
  }
}