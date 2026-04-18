import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get Jon's user ID
  const jon = await prisma.user.findFirst({ where: { email: 'jon@colab.la' } });
  if (!jon) { console.log('Jon not found'); return; }

  // Get most recent 10 assistant messages
  const msgs = await prisma.chatMessage.findMany({
    where: { userId: jon.id, role: 'assistant' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { id: true, content: true, metadata: true, createdAt: true },
  });

  console.log(`\nFound ${msgs.length} recent assistant messages:\n`);
  for (const m of msgs) {
    const taggedContent = m.content.match(/\[\[(\w+):/g);
    let parsedMeta: any = {};
    try { parsedMeta = JSON.parse(m.metadata || '{}'); } catch {}
    const tags = parsedMeta?.tags || [];
    console.log(`\n--- ${m.id} (${m.createdAt.toISOString()}) ---`);
    console.log(`  Tags in content: ${taggedContent ? taggedContent.join(',') : 'NONE'}`);
    console.log(`  metadata.tags count: ${tags.length}`);
    for (const t of tags) {
      const status = t.success ? 'OK' : `FAIL: ${t.error}`;
      console.log(`    - ${t.tag}: ${status}`);
    }
    if (taggedContent && taggedContent.length !== tags.length) {
      console.log(`  ⚠️  MISMATCH: ${taggedContent.length} tags in content vs ${tags.length} in metadata`);
    }
    // Show a snippet of content with tag markers
    const preview = m.content.slice(0, 300).replace(/\n/g, '\\n');
    console.log(`  Preview: ${preview}...`);
  }

  // Look specifically at recent invite_to_project messages
  console.log(`\n\n--- Recent invite_to_project messages ---`);
  const inviteMsgs = await prisma.chatMessage.findMany({
    where: { userId: jon.id, role: 'assistant', content: { contains: 'invite_to_project' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  for (const m of inviteMsgs) {
    console.log(`\n${m.id} at ${m.createdAt.toISOString()}`);
    console.log(`Full content:`);
    console.log(m.content);
    console.log(`\n---`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
