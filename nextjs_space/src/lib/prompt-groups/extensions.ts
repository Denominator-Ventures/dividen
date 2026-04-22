import { prisma } from '../prisma';

export async function layer19_agentExtensions(userId: string): Promise<string> {
  try {
    // Get user's team and project memberships to resolve scoped extensions
    const [teamMemberships, projectMemberships] = await Promise.all([
      prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      }),
      prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      }),
    ]);

    const teamIds = teamMemberships.map((m: any) => m.teamId);
    const projectIds = projectMemberships.map((m: any) => m.projectId);

    // Fetch all active extensions matching user's scope
    const extensions = await prisma.agentExtension.findMany({
      where: {
        isActive: true,
        OR: [
          { scope: 'user', installedById: userId },
          { scope: 'global' },
          ...(teamIds.length > 0 ? [{ scope: 'team', scopeId: { in: teamIds } }] : []),
          ...(projectIds.length > 0 ? [{ scope: 'project', scopeId: { in: projectIds } }] : []),
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 30,
    });

    if (extensions.length === 0) return '';

    let prompt = `## Layer 19: Agent Extensions (${extensions.length} active)\n`;
    prompt += `The following extensions augment your capabilities. Apply them according to their scope.\n\n`;

    for (const ext of extensions) {
      let config: Record<string, any> = {};
      try { config = JSON.parse(ext.config); } catch { continue; }

      const scopeLabel = ext.scope === 'user' ? '👤 Personal'
        : ext.scope === 'team' ? '👥 Team'
        : ext.scope === 'project' ? '📋 Project'
        : '🌐 Global';

      prompt += `### 🧩 ${ext.name} (${ext.type}) — ${scopeLabel}\n`;
      if (ext.description) prompt += `${ext.description}\n`;
      if (ext.source !== 'manual') prompt += `Source: ${ext.source}${ext.sourceUrl ? ` (${ext.sourceUrl})` : ''}\n`;

      // Inject prompt text
      if (config.promptText) {
        prompt += `\n${config.promptText}\n`;
      }

      // Document extension action tags
      if (config.actionTags && config.actionTags.length > 0) {
        prompt += `\n**Extension Action Tags:**\n`;
        for (const tag of config.actionTags) {
          prompt += `- \`${tag.syntax}\` — ${tag.description}\n`;
        }
      }

      // Document parameters
      if (config.parameters && Object.keys(config.parameters).length > 0) {
        prompt += `\n**Parameters:** ${JSON.stringify(config.parameters)}\n`;
      }

      prompt += '\n';
    }

    return prompt;
  } catch (e) {
    console.error('Layer 19 (extensions) error:', e);
    return '';
  }
}
