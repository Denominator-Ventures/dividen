export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createOnboardingProject, SETUP_TASKS } from '@/lib/onboarding-project';
import { withTelemetry } from '@/lib/telemetry';

/**
 * POST /api/onboarding/intro
 * Creates the intro chat message + updates user flags.
 * The setup project/card/checklist is created at signup time (see onboarding-project.ts),
 * so this endpoint only handles the chat-side intro — fast, single DB round-trip.
 */
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Parallel: user info + existing intro check
    const [user, existingIntro] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, diviName: true } }),
      prisma.chatMessage.findFirst({
        where: { userId, role: 'assistant', metadata: { contains: '"isSetupIntro":true' } },
        select: { id: true },
      }),
    ]);

    if (existingIntro) {
      return NextResponse.json({ success: true, data: { alreadyExists: true } });
    }

    const diviName = user?.diviName || 'Divi';
    const firstName = user?.name?.split(' ')[0] || 'there';

    const introContent = `Hey ${firstName} — I'm **${diviName}**, your AI chief of staff.

I read your signals — email, calendar, files, webhooks — and turn them into a prioritized stack of what matters. Tasks land on your board, organized and ready. You approve, adjust, or let me handle things autonomously.

Think of me as your operating layer. I don't just answer questions — I manage the flow of your work.

I've put a **DiviDen Setup** card on your board with 6 tasks to get everything configured. Want to knock them out now, or set them aside for later?`;

    // ── Single transaction: intro message + user update ──
    await prisma.$transaction(async (tx) => {
      // Ensure setup project exists (idempotent — created at signup, but guard edge cases)
      await createOnboardingProject(tx, userId);

      await Promise.all([
        tx.chatMessage.create({
          data: { role: 'assistant', content: introContent, userId, metadata: JSON.stringify({ isSetupIntro: true }) },
        }),
        tx.user.update({
          where: { id: userId },
          data: { hasSeenWalkthrough: true, onboardingPhase: 6 },
        }),
      ]);
    });

    return NextResponse.json({
      success: true,
      data: { firstTaskText: SETUP_TASKS[0] },
    });
  } catch (err: any) {
    console.error('POST /api/onboarding/intro error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
