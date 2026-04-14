export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/intro
 * Sends Divi's intro message + "together or solo?" choice widget into chat.
 * Called after the user saves their API key in the OnboardingWelcome modal.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, diviName: true },
    });

    const diviName = user?.diviName || 'Divi';
    const firstName = user?.name?.split(' ')[0] || 'there';

    // Check if intro message already exists
    const existing = await prisma.chatMessage.findFirst({
      where: {
        userId,
        role: 'assistant',
        metadata: { contains: '"isSetupIntro":true' },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: { alreadyExists: true } });
    }

    // Create the Divi intro message
    const introMessage = `Hey ${firstName} \u2014 I'm **${diviName}**, your AI chief of staff.

I read your signals \u2014 email, calendar, files, webhooks \u2014 and turn them into a prioritized stack of what matters. Tasks land on your board, organized and ready. You approve, adjust, or let me handle things autonomously.

Think of me as your operating layer. I don't just answer questions \u2014 I manage the flow of your work.

Before I can do any of that, we need to get a few things configured. I've set up a **DiviDen Setup** project on your board with each step as a task.`;

    const choiceMessage = `How would you like to do this?`;

    // Create intro message
    await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: introMessage,
        userId,
        metadata: JSON.stringify({ isSetupIntro: true }),
      },
    });

    // Create choice message with widget
    await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: choiceMessage,
        userId,
        metadata: JSON.stringify({
          isOnboarding: true,
          isSetupChoice: true,
          onboardingPhase: 0,
          widgets: [
            {
              type: 'radio',
              id: 'setupMode',
              label: '',
              options: [
                {
                  value: 'together',
                  label: '\ud83e\udd1d Walk me through it',
                  description: 'We\'ll go step by step together right now',
                },
                {
                  value: 'solo',
                  label: '\ud83d\udee0\ufe0f I\'ll handle it myself',
                  description: 'Tasks due in a week \u2014 I\'ll check in if anything\'s still open',
                },
              ],
              selectedValue: 'together',
            },
            {
              type: 'submit',
              id: 'setup_choice_submit',
              submitLabel: 'Let\'s go \u2192',
            },
          ],
        }),
      },
    });

    // Mark walkthrough as seen, set phase to 6 (project-based onboarding)
    await prisma.user.update({
      where: { id: userId },
      data: {
        hasSeenWalkthrough: true,
        onboardingPhase: 6, // Skip old phases
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/onboarding/intro error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
