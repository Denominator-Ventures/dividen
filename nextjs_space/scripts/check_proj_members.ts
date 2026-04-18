import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Jon's user ID
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';
  
  const cards = await prisma.kanbanCard.findMany({
    where: { userId: jonId, projectId: { not: null } },
    include: {
      project: {
        select: {
          id: true, name: true,
          members: {
            select: { id: true, role: true, userId: true, connectionId: true,
              user: { select: { name: true, email: true } },
              connection: { select: { peerUserName: true, peerUserEmail: true } },
            }
          }
        }
      }
    },
    take: 10,
  });
  
  console.log('Jon cards with projects:', cards.length);
  for (const c of cards) {
    console.log(`\nCard: ${c.title}`);
    console.log(`  Project: ${c.project?.name} (${c.project?.id})`);
    console.log(`  Members: ${c.project?.members.length}`);
    for (const m of (c.project?.members || [])) {
      const who = m.user?.name || m.connection?.peerUserName || '(unknown)';
      console.log(`    - ${who} [${m.role}] user=${!!m.user} conn=${!!m.connection}`);
    }
  }
  
  // Also check all Jon's projects and their members
  console.log('\n\n--- ALL Jon projects ---');
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: jonId } } },
    include: { members: {
      select: { id: true, role: true, userId: true, connectionId: true,
        user: { select: { name: true, email: true } },
        connection: { select: { peerUserName: true, peerUserEmail: true } },
      }
    } },
  });
  for (const p of projects) {
    console.log(`\n${p.name} (${p.id}) | createdBy=${(p as any).createdBy ?? (p as any).createdById}`);
    console.log(`  Members: ${p.members.length}`);
    for (const m of p.members) {
      const who = m.user?.name || m.connection?.peerUserName || '(unknown)';
      console.log(`    - ${who} [${m.role}]`);
    }
  }
  
  // Check pending invites
  console.log('\n\n--- Pending project invites FROM Jon ---');
  const invites = await prisma.projectInvite.findMany({
    where: { inviterId: jonId },
    include: {
      project: { select: { name: true } },
      invitee: { select: { name: true, email: true, username: true } },
      connection: { select: { peerUserName: true, peerUserEmail: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  for (const inv of invites) {
    const to = inv.invitee?.name || inv.connection?.peerUserName || inv.inviteeEmail || '(unknown)';
    console.log(`  [${inv.status}] ${inv.project?.name} → ${to} (${inv.role}) | created ${inv.createdAt.toISOString()}`);
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
