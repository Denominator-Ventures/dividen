import { prisma } from '../prisma';

export async function buildTeamAgentContext(userId: string): Promise<string> {
  try {
    // Find teams where user is a member AND team agent is enabled
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: {
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            agentEnabled: true,
            agentConfig: true,
            headline: true,
            members: {
              select: {
                role: true,
                user: { select: { id: true, name: true } },
                connection: { select: { peerUserName: true } },
              },
              take: 20,
            },
            projects: {
              where: { status: { not: 'archived' } },
              select: { id: true, name: true, status: true },
              take: 10,
            },
            _count: { select: { goals: true, queueItems: true, relays: true } },
          },
        },
      },
      take: 5,
    });

    const agentTeams = memberships.filter((m: any) => m.team.agentEnabled);
    if (agentTeams.length === 0) return '';

    let text = '## Group 12: Team Agent Context\n\n';
    text += 'You are aware of the following team agents. Team agents are COORDINATORS, not commanders.\n';
    text += 'They suggest, never assign. They are peers to you (individual Divi), not superiors.\n\n';

    for (const membership of agentTeams) {
      const team = membership.team as any;
      let config: any = {};
      if (team.agentConfig) {
        try { config = JSON.parse(team.agentConfig); } catch {}
      }

      text += `### 🤖 Team: ${team.name}\n`;
      if (team.headline) text += `*${team.headline}*\n`;
      text += `Your role: ${membership.role}\n`;
      text += `Members: ${team.members.map((m: any) => m.user?.name || m.connection?.peerUserName || 'Unknown').join(', ')}\n`;
      text += `Active projects: ${team.projects.map((p: any) => p.name).join(', ') || 'None'}\n`;
      text += `Activity: ${team._count.goals} goals, ${team._count.queueItems} queue items, ${team._count.relays} relays\n`;

      if (config.personality) text += `Agent personality: ${config.personality}\n`;
      if (config.checkInFrequency) text += `Check-in frequency: ${config.checkInFrequency}\n`;
      if (config.autoSuggestTasks) text += `Auto-suggests tasks: yes\n`;
      if (config.autoSurfaceBlockers) text += `Auto-surfaces blockers: yes\n`;
      if (config.synthesizeUpdates) text += `Synthesizes team updates: yes\n`;
      if (config.notifyOn?.length) text += `Notifies on: ${config.notifyOn.join(', ')}\n`;

      text += '\n**Team Agent Behavior Rules:**\n';
      text += '- When the user asks about team activity, provide a synthesis of what team members are working on.\n';
      text += '- When routing tasks within this team, prefer team members with relevant skills.\n';
      text += '- Surface potential blockers proactively — if two members are working on conflicting tasks, flag it.\n';
      text += '- Coordinate cross-member handoffs gracefully via relay_ambient.\n';
      text += '- Never make decisions for the team — only suggest and inform.\n\n';
    }

    return text;
  } catch (err) {
    console.error('buildTeamAgentContext error:', err);
    return '';
  }
}
