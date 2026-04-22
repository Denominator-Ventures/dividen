import { prisma } from '../prisma';

export async function buildPeopleLayer(
  userId: string,
  contacts: Awaited<ReturnType<typeof prisma.contact.findMany>>,
  connections: Awaited<ReturnType<typeof prisma.connection.findMany>>,
): Promise<string> {
  const parse = (v: string | null, fallback: any = []) => {
    if (!v) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  };

  let text = '## People\n';

  // Owner's profile
  const ownProfile = await prisma.userProfile.findUnique({ where: { userId } });
  if (ownProfile) {
    text += '### Your Owner\n';
    if (ownProfile.headline) text += `${ownProfile.headline} | `;
    text += `Capacity: ${ownProfile.capacity}`;
    if (ownProfile.capacityNote) text += ` — ${ownProfile.capacityNote}`;
    text += '\n';
    const skills = parse(ownProfile.skills);
    if (skills.length) text += `Skills: ${skills.join(', ')}\n`;
    const taskTypes = parse(ownProfile.taskTypes);
    if (taskTypes.length) text += `Task types: ${taskTypes.join(', ')}\n`;
    const languages = parse(ownProfile.languages);
    if (languages.length) text += `Languages: ${languages.map((l: any) => `${l.language} (${l.proficiency})`).join(', ')}\n`;
    const superpowers = parse(ownProfile.superpowers);
    if (superpowers.length) text += `Superpowers: ${superpowers.join(', ')}\n`;
    if (ownProfile.timezone) text += `Timezone: ${ownProfile.timezone}\n`;
  } else {
    text += '*Profile not set up — suggest completing it for better relay routing.*\n';
  }

  // CRM Contacts
  if (contacts.length > 0) {
    text += `\n### CRM Contacts (${contacts.length})\n`;
    text += contacts.map((c: any) => {
      const parts = [c.name];
      if (c.company) parts.push(`@ ${c.company}`);
      if (c.role) parts.push(`(${c.role})`);
      if (c.email) parts.push(`<${c.email}>`);
      return `- [${c.id}] ${parts.join(' ')}`;
    }).join('\n') + '\n';
  }

  // Connection profiles (for routing intelligence)
  if (connections.length > 0) {
    const peerIds = connections.map((c: any) =>
      (c as any).requesterId === userId ? (c as any).accepterId : (c as any).requesterId
    ).filter((id: string | null): id is string => !!id);

    const peerProfiles = peerIds.length > 0
      ? await prisma.userProfile.findMany({ where: { userId: { in: peerIds }, NOT: { visibility: 'private' } } })
      : [];

    if (peerProfiles.length > 0) {
      text += `\n### Connection Profiles (for relay routing)\n`;
      for (const pp of peerProfiles) {
        const conn = connections.find((c: any) => ((c as any).requesterId === userId ? (c as any).accepterId : (c as any).requesterId) === pp.userId);
        const peer = conn ? ((conn as any).requesterId === userId ? (conn as any).accepter : (conn as any).requester) : null;
        const nickname = conn ? ((conn as any).requesterId === userId ? conn.nickname : conn.peerNickname) : null;
        const name = nickname || peer?.name || 'Unknown';

        text += `**${name}** — ${pp.capacity}`;
        if (pp.headline) text += ` | ${pp.headline}`;
        text += '\n';
        const pSkills = parse(pp.skills);
        if (pSkills.length) text += `  Skills: ${pSkills.slice(0, 8).join(', ')}\n`;
        const pTaskTypes = parse(pp.taskTypes);
        if (pTaskTypes.length) text += `  Task types: ${pTaskTypes.join(', ')}\n`;
      }
    }
  }

  text += '\n*When the user mentions personal details, update their profile with [[update_profile:{...}]]*';
  return text;
}
