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

/**
 * Maps each setup task to the action the agent should trigger.
 * Tasks with `actionTag` render an interactive widget directly.
 * Tasks with `agentPrompt` get sent to the LLM for conversational handling.
 * This is the single source of truth — the system prompt references it generically,
 * and the auto-continue flow uses it to trigger widgets deterministically.
 */
export type SetupTaskAction = {
  taskText: string;
  actionTag?: string;          // e.g. 'show_settings_widget'
  actionParams?: Record<string, any>; // e.g. { group: 'triage' }
  agentPrompt?: string;        // fallback: send this to the LLM instead of rendering a widget
  description: string;         // human-readable description of what this step does
};

export const SETUP_TASK_ACTIONS: SetupTaskAction[] = [
  {
    taskText: "Configure Divi's Working Style",
    actionTag: 'show_settings_widget',
    actionParams: { group: 'working_style' },
    description: 'Set response detail, proactivity, autonomy, and tone sliders.',
  },
  {
    taskText: 'Set Triage Preferences',
    actionTag: 'show_settings_widget',
    actionParams: { group: 'triage' },
    description: 'Choose how incoming signals get organized (task-first, card-per-item, minimal).',
  },
  {
    taskText: 'Connect Email & Calendar',
    actionTag: 'show_google_connect',
    actionParams: { identity: 'operator' },
    description: 'Grant Gmail & Calendar access so Divi can process your signals.',
  },
  {
    taskText: "Review What's Connected",
    agentPrompt: "The user wants to review what's connected. Summarize their current integrations — email, calendar, drive — and what data you can see. If nothing's connected, let them know.",
    description: 'See a summary of active integrations and what data Divi can access.',
  },
  {
    taskText: 'Set Up Custom Signals (Optional)',
    agentPrompt: "The user wants to set up custom signals. Walk them through Settings → Signals where they can configure custom signal sources and rules. This is optional — let them know they can skip it.",
    description: 'Configure custom signal sources and routing rules.',
  },
  {
    taskText: 'Run Your First Catch-Up',
    actionTag: 'sync_signal',
    actionParams: { service: 'all' },
    description: 'Process all connected signals and populate the board.',
  },
];

/** Look up the action config for a setup task by its text */
export function getSetupTaskAction(taskText: string): SetupTaskAction | undefined {
  return SETUP_TASK_ACTIONS.find(a => a.taskText === taskText);
}

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
