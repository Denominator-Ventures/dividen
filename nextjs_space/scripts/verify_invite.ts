import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const inv = await prisma.projectInvite.findUnique({
    where: { id: 'cmo4vikgb0075x1ht26jej0oh' },
    include: {
      project: { select: { name: true, createdBy: { select: { username: true } } } },
      invitee: { select: { username: true, name: true } },
      inviter: { select: { username: true } },
    }
  });
  console.log(inv ? JSON.stringify(inv, null, 2) : 'NOT FOUND');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
