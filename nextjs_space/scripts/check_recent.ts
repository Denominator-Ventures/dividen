import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';
  const msgs = await prisma.chatMessage.findMany({
    where: { userId: jonId, role: 'assistant' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, content: true, metadata: true, createdAt: true },
  });
  for (const m of msgs) {
    console.log('=== msg', m.id, 'at', m.createdAt, '===');
    const hasFabricatedSummary = m.content.includes('[Tag execution summary');
    const hasEndMarker = m.content.includes('[End of tag summary');
    console.log('Fabricated summary in content?', hasFabricatedSummary, '/ end marker?', hasEndMarker);
    console.log('CONTENT head (800 chars):');
    console.log(m.content.substring(0, 800));
    console.log('--- METADATA ---');
    console.log(m.metadata ? String(m.metadata).substring(0, 300) : '(null)');
    console.log('');
  }
  
  // Count rows with fabricated summaries
  const count = await prisma.chatMessage.count({
    where: {
      userId: jonId,
      role: 'assistant',
      content: { contains: '[Tag execution summary' }
    }
  });
  console.log(`\nTotal assistant messages with fabricated summary blocks: ${count}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
