import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';
  // Latest 10 assistant messages containing "Platform Build"
  const msgs = await prisma.chatMessage.findMany({
    where: {
      userId: jonId,
      role: 'assistant',
      content: { contains: 'Platform Build' }
    },
    select: { id: true, content: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(`Found ${msgs.length} assistant messages with "Platform Build"`);
  for (const m of msgs) {
    console.log('=== Msg', m.id, 'at', m.createdAt, '===');
    console.log('CONTENT (truncated):');
    console.log(m.content.substring(0, 1500));
    console.log('...');
    console.log('METADATA:');
    console.log(JSON.stringify(m.metadata, null, 2).substring(0, 800));
    console.log();
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
