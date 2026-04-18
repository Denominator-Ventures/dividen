import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Purge (set clearedAt) on all assistant messages that contain fabricated
// tag-summary patterns or quote backend IDs that don't exist in the DB.
async function main() {
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';

  // Find assistant messages that contain any of these poison patterns
  const candidates = await prisma.chatMessage.findMany({
    where: {
      userId: jonId,
      role: 'assistant',
      clearedAt: null,
      OR: [
        { content: { contains: '[Tag execution summary' } },
        { content: { contains: 'First summary:' } },
        { content: { contains: 'Second summary:' } },
        { content: { contains: 'inviteId: cmo' } },
        { content: { contains: 'inviteId=cmo' } },
        { content: { contains: 'relayId: cmo' } },
        { content: { contains: 'cmo4sds2o' } }, // known fake ID
        { content: { contains: 'cmo4sfpbx' } },
        { content: { contains: 'cmo4sh3kb' } },
      ],
    },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${candidates.length} polluted assistant messages`);
  for (const c of candidates) {
    console.log(`  - ${c.id} ${c.createdAt} : ${c.content.substring(0, 100).replace(/\n/g, ' ')}...`);
  }

  // Also purge the CORRESPONDING user messages that contain the test prompts
  // with literal tag syntax (so Divi doesn't see them either)
  const userCandidates = await prisma.chatMessage.findMany({
    where: {
      userId: jonId,
      role: 'user',
      clearedAt: null,
      OR: [
        { content: { contains: '[[invite_to_project:' } },
        { content: { contains: '[[relay_request:' } },
        { content: { contains: '[[relay_ambient:' } },
        { content: { contains: '[[query_relays:' } },
        { content: { contains: '[[query_connections:' } },
        { content: { contains: 'Self-test Bug 2' } }, // our test prompts
        { content: { contains: 'Self-test Bug 1' } },
      ],
    },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${userCandidates.length} polluted user messages (test prompts with literal tag syntax)`);

  // Also clear any NON-polluted but recent assistant messages between these,
  // since they reference the polluted content contextually. Clear everything
  // for Jon from today's test session (Apr 18, after 14:00 UTC).
  const fullSessionPurge = await prisma.chatMessage.findMany({
    where: {
      userId: jonId,
      clearedAt: null,
      createdAt: { gte: new Date('2026-04-18T14:00:00Z') },
    },
    select: { id: true, role: true, content: true },
  });

  console.log(`\nAll msgs in today's test session (Apr 18 >= 14:00 UTC): ${fullSessionPurge.length}`);

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('\nDRY RUN — no changes applied. Rerun without --dry-run to purge.');
    await prisma.$disconnect();
    return;
  }

  // Purge the polluted assistant messages
  const res1 = await prisma.chatMessage.updateMany({
    where: { id: { in: candidates.map(c => c.id) } },
    data: { clearedAt: new Date() },
  });
  console.log(`\nPurged ${res1.count} polluted assistant messages`);

  // Purge test-prompt user messages
  const res2 = await prisma.chatMessage.updateMany({
    where: { id: { in: userCandidates.map(c => c.id) } },
    data: { clearedAt: new Date() },
  });
  console.log(`Purged ${res2.count} test-prompt user messages`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
