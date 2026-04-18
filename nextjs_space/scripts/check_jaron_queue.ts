import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jaronId = 'cmo1milx900g9o408deuk7h2f'; // @djjaron

  // Pending project invites TO Jaron
  const invitesToJaron = await prisma.projectInvite.findMany({
    where: { inviteeId: jaronId, status: 'pending' },
    include: {
      project: { select: { name: true } },
      inviter: { select: { name: true, email: true, username: true } },
    },
  });
  console.log('=== Pending project invites TO Jaron ===');
  for (const inv of invitesToJaron) {
    console.log(`  [${inv.id}] ${inv.project?.name} — from ${inv.inviter?.name} (${inv.role}) | created ${inv.createdAt.toISOString()}`);
  }

  // Queue items for Jaron related to invites
  const queue = await prisma.queueItem.findMany({
    where: {
      userId: jaronId,
      type: 'notification',
      status: { notIn: ['done_today', 'dismissed', 'archived'] },
      metadata: { contains: 'project_invite' },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n=== Queue items for Jaron (project_invite) ===  total=${queue.length}`);
  for (const q of queue) {
    console.log(`  [${q.id}] ${q.status} ${q.title}`);
  }

  // Comms messages for Jaron about invites
  const comms = await prisma.commsMessage.findMany({
    where: {
      userId: jaronId,
      sender: 'system',
      state: { not: 'archived' },
      metadata: { contains: 'project_invite' },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n=== Comms messages for Jaron (project_invite) === total=${comms.length}`);
  for (const c of comms) {
    console.log(`  [${c.id}] ${c.state} ${c.content.slice(0, 80)}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
