import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmo4sds2o002juohofgbossy0',
    'cmo4sfpbx002vuohofgbossy0',
    'cmo4sh3kb002zuohofgbossy0'
  ];
  for (const id of ids) {
    const inv = await prisma.projectInvite.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, createdById: true } }, invitee: { select: { username: true, name: true } } }
    });
    console.log('ID:', id);
    if (inv) {
      console.log('  project:', inv.project?.name, '(id='+inv.project?.id+', createdBy='+inv.project?.createdById+')');
      console.log('  invitee:', inv.invitee?.username || inv.inviteeEmail, 'status=', inv.status);
      console.log('  createdAt:', inv.createdAt);
    } else {
      console.log('  NOT FOUND');
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
