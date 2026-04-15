import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Creates the "DiviDen Setup" project + card + checklist for a new user.
 * Called at signup time so it's ready before the user ever opens chat.
 * Due dates are left null — they get set when the user responds "now" or "later"
 * via /api/onboarding/setup-project.
 */
export const SETUP_TASKS = [
  "Configure Divi's Working Style",
  'Set Triage Preferences',
  'Connect Email & Calendar',
  "Review What's Connected",
  'Set Up Custom Signals (Optional)',
  'Run Your First Catch-Up',
];

export async function createOnboardingProject(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
) {
  // Check if project already exists (idempotent)
  const existing = await tx.project.findFirst({
    where: { createdById: userId, metadata: { contains: '"isSetupProject":true' } },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Create project
  const project = await tx.project.create({
    data: {
      name: 'DiviDen Setup',
      description: 'Get your command center configured — each step is a task.',
      status: 'active',
      visibility: 'private',
      color: '#6366f1',
      createdById: userId,
      metadata: JSON.stringify({ isSetupProject: true }),
      members: { create: { userId, role: 'lead' } },
    },
  });

  // Create the setup card — no dueDate yet (set by now/later choice)
  const card = await tx.kanbanCard.create({
    data: {
      title: 'DiviDen Setup',
      description: 'Your onboarding checklist. Complete each task to get your command center fully configured.',
      status: 'active',
      priority: 'high',
      assignee: 'human',
      order: 0,
      userId,
      projectId: project.id,
    },
  });

  // Batch-create checklist items (no due dates)
  await tx.checklistItem.createMany({
    data: SETUP_TASKS.map((text, i) => ({
      text,
      order: i,
      cardId: card.id,
      assigneeType: 'self' as const,
    })),
  });

  return project.id;
}
