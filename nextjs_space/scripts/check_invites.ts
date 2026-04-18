import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = ['cmo4sds2o', 'cmo4sfpbx', 'cmo4sh3kb'];
  for (const prefix of ids) {
    const invs = await prisma.projectInvite.findMany({
      where: { id: { startsWith: prefix } },
      include: { project: { select: { id: true, name: true, createdById: true } }, invitee: { select: { username: true, name: true } } }
    });
    for (const inv of invs) {
      console.log(inv.id, '→ project:', inv.project?.name, '(id='+inv.project?.id+', createdBy='+inv.project?.createdById+')');
      console.log('  invitee:', inv.invitee?.username || inv.inviteeEmail, ', status=', inv.status);
    }
  }
  
  // Also check ALL projects Jon has created OR is member of
  const jonId = 'cmo1kgydf00o4sz086ffjsmp1';
  const projs = await prisma.project.findMany({
    where: {
      OR: [
        { createdById: jonId },
        { members: { some: { userId: jonId } } }
      ]
    },
    select: { id: true, name: true, createdById: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nAll projects Jon owns or is member of: ${projs.length}`);
  for (const p of projs) {
    console.log(`  ${p.id} | ${p.name} | createdBy=${p.createdById} | ${p.createdAt}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
