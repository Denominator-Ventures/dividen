import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';
  const msgs = await prisma.chatMessage.findMany({
    where: { userId: jonId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, role: true, content: true, metadata: true, createdAt: true },
  });
  for (const m of msgs.reverse()) {
    console.log(`=== [${m.role}] ${m.id} at ${m.createdAt} ===`);
    console.log(m.content.substring(0, 1000));
    if (m.metadata) console.log('META:', String(m.metadata).substring(0, 200));
    console.log();
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
