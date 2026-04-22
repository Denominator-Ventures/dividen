import { prisma } from '../prisma';

export async function buildSetupLayer_conditional(
  userId: string,
  cardCount: number,
  contactCount: number,
  connectionCount: number,
): Promise<string> {
  const [apiKeys, webhooks, docCount, profile] = await Promise.all([
    prisma.agentApiKey.findMany({ where: { isActive: true, userId }, select: { provider: true } }),
    prisma.webhook.findMany({ where: { userId, isActive: true }, select: { name: true, type: true } }),
    prisma.document.count({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { headline: true, capacity: true } }),
  ]);

  const hasApiKey = apiKeys.length > 0;
  const hasProfile = !!profile;
  const hasCards = cardCount > 0;
  const hasContacts = contactCount > 0;
  const hasConnections = connectionCount > 0;

  // Navigation reference — compact, always useful
  const navRef = `### Navigation Reference
- **Primary**: Chat, Board (Kanban), CRM, Calendar
- **Network**: Discover, Connections, Teams, Tasks, Marketplace (includes Earnings)
- **Messages**: Inbox, Recordings | **Files**: Drive
- **Right Panel**: Queue, Comms | **Left Panel**: NOW (focus + activity)
- **Settings**: Profile, Your Agent, Goals, Signals, Integrations, Notifications, Federation, Payments, Security, Appearance
If user asks "set up X" → do it with action tags. "Where is X?" → reference above.`;

  // If everything important is configured, return compact status only
  if (hasApiKey && hasProfile && hasCards && hasContacts) {
    return `## Platform Status
API: ${apiKeys.map((k: any) => k.provider).join(', ')} | Webhooks: ${webhooks.length} | Cards: ${cardCount} | Contacts: ${contactCount} | Connections: ${connectionCount} | Docs: ${docCount} | Profile: ${profile?.headline || profile?.capacity || 'set'}

${navRef}`;
  }

  // Otherwise, show guidance for missing items
  let text = '## Platform Setup Guide\n';
  text += 'Help the user complete their setup. Use action tags to do things directly when possible.\n\n';
  text += `**Status:** API: ${hasApiKey ? '✓' : '⚠️ missing'} | Profile: ${hasProfile ? '✓' : '⚠️ missing'} | Cards: ${cardCount} | Contacts: ${contactCount} | Connections: ${connectionCount}\n\n`;

  // Setup flow instructions — widgets are triggered by the client, not the LLM
  text += `**SETUP FLOW**: The setup checklist is handled by the UI — when a user completes a task, the system automatically presents the next task with Yes/Skip buttons. Interactive widgets (settings sliders, Google Connect) are rendered directly by the client without LLM involvement. Your role during setup is conversational: if the user asks about a setup task, you can use [[show_settings_widget:{"group":"working_style"}]], [[show_settings_widget:{"group":"triage"}]], or [[show_google_connect:{"identity":"operator"}]] to render the appropriate widget. For non-widget tasks like "Review What's Connected", summarize their integrations. For "Set Up Custom Signals", guide them to Settings → Signals & Integrations. For "Run Your First Catch-Up", initiate a catch-up run.\n\n`;

  if (!hasApiKey) text += '- **API Key needed** — Ask user for their OpenAI/Anthropic key, save with [[save_api_key:...]]\n';
  if (!hasProfile) text += '- **Profile not set** — Suggest filling out profile in Settings → 👤 Profile\n';
  if (!hasCards) text += '- **Board empty** — Offer to create initial pipeline cards\n';
  if (!hasContacts) text += '- **No contacts** — Offer to add contacts from conversation\n';
  if (!hasConnections) text += '- **No connections** — Suggest connecting with collaborators\n';

  text += '\nIf user pastes API key → save immediately. If user mentions personal details → update profile.\n\n';
  text += navRef;
  return text;
}
