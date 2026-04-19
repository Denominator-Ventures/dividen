/**
 * v2.3.2 verification: scope propagation audit for relays and queue items.
 *
 * Usage:
 *   cd nextjs_space && npx tsx scripts/check_federation_scope.ts [limit]
 *
 * Reports the most recent N (default 50) AgentRelay + QueueItem records,
 * highlighting rows missing teamId/projectId scope when an activity is
 * expected to carry one (federated/relay sources).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const limit = Number(process.argv[2] || 50);

  console.log('--------------------------------------------------------');
  console.log(`v2.3.2 scope propagation audit (most recent ${limit} rows)`);
  console.log('--------------------------------------------------------\n');

  // 1. Agent relays
  const relays = await prisma.agentRelay.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      intent: true,
      type: true,
      direction: true,
      teamId: true,
      projectId: true,
      status: true,
      createdAt: true,
    },
  });

  let relaysWithScope = 0;
  let relaysWithoutScope = 0;
  console.log('--- AgentRelay (latest) ---');
  for (const r of relays) {
    const hasScope = Boolean(r.teamId || r.projectId);
    if (hasScope) relaysWithScope++;
    else relaysWithoutScope++;
    const tag = hasScope ? '\x1b[32m\u2713\x1b[0m' : '\x1b[33m\u2717\x1b[0m';
    console.log(
      `${tag} ${r.createdAt.toISOString().slice(0, 19)} ${r.direction.padEnd(9)} ${r.intent.padEnd(14)} ${r.status.padEnd(10)} team=${r.teamId || '-'} proj=${r.projectId || '-'}  (${r.id.slice(-8)})`,
    );
  }
  console.log(`\n  Relays with scope:    ${relaysWithScope}`);
  console.log(`  Relays without scope: ${relaysWithoutScope}\n`);

  // 2. Queue items (task_route + relay_request especially)
  const queueItems = await prisma.queueItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    where: {
      OR: [
        { source: 'relay' },
        { source: 'agent' },
        { type: 'task' },
      ],
    },
    select: {
      id: true,
      title: true,
      type: true,
      source: true,
      teamId: true,
      projectId: true,
      status: true,
      createdAt: true,
    },
  });

  let queueWithScope = 0;
  let queueWithoutScope = 0;
  console.log('--- QueueItem (latest task/relay/agent) ---');
  for (const q of queueItems) {
    const hasScope = Boolean(q.teamId || q.projectId);
    if (hasScope) queueWithScope++;
    else queueWithoutScope++;
    const tag = hasScope ? '\x1b[32m\u2713\x1b[0m' : '\x1b[33m\u2717\x1b[0m';
    const title = (q.title || '').slice(0, 32).padEnd(32);
    console.log(
      `${tag} ${q.createdAt.toISOString().slice(0, 19)} ${(q.source || 'none').padEnd(9)} ${q.status.padEnd(10)} team=${q.teamId || '-'} proj=${q.projectId || '-'}  ${title}`,
    );
  }
  console.log(`\n  Queue items with scope:    ${queueWithScope}`);
  console.log(`  Queue items without scope: ${queueWithoutScope}\n`);

  // 3. Kanban cards created from relays (sourceRelayId set)
  const cards = await prisma.kanbanCard.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    where: {
      sourceRelayId: { not: null },
    },
    select: {
      id: true,
      title: true,
      sourceRelayId: true,
      projectId: true,
      status: true,
      createdAt: true,
    },
  });

  let cardsWithProject = 0;
  let cardsWithoutProject = 0;
  console.log('--- KanbanCard (with sourceRelayId, i.e. from federation) ---');
  for (const c of cards) {
    const hasProj = Boolean(c.projectId);
    if (hasProj) cardsWithProject++;
    else cardsWithoutProject++;
    const tag = hasProj ? '\x1b[32m\u2713\x1b[0m' : '\x1b[33m\u2717\x1b[0m';
    const title = (c.title || '').slice(0, 40).padEnd(40);
    console.log(
      `${tag} ${c.createdAt.toISOString().slice(0, 19)} relay=${(c.sourceRelayId || '').slice(-8).padEnd(8)} ${c.status.padEnd(10)} proj=${c.projectId || '-'}  ${title}`,
    );
  }
  console.log(`\n  Kanban cards with projectId:    ${cardsWithProject}`);
  console.log(`  Kanban cards without projectId: ${cardsWithoutProject}\n`);

  console.log('--------------------------------------------------------');
  console.log('Totals:');
  console.log(`  Relays:      ${relaysWithScope}/${relays.length} scoped`);
  console.log(`  Queue items: ${queueWithScope}/${queueItems.length} scoped`);
  console.log(`  Kanban:      ${cardsWithProject}/${cards.length} projectId`);
  console.log('--------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
