import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jon = await prisma.user.findFirst({ where: { username: 'jonnydreams1' } });
  console.log('Jon userId:', jon?.id, 'username=', jon?.username);
  if (!jon) return;

  // Find all projects matching "DiviDen"
  const projs = await prisma.project.findMany({
    where: { name: { contains: 'DiviDen', mode: 'insensitive' } },
    include: { 
      createdBy: { select: { id: true, username: true, name: true } },
      members: { 
        include: { user: { select: { username: true, name: true } } },
      }
    }
  });
  console.log(`Found ${projs.length} matching projects for name contains "DiviDen"`);
  for (const p of projs) {
    console.log('---');
    console.log('ID:', p.id, 'Name:', p.name);
    console.log('CreatedBy:', p.createdBy?.username, '(id=' + p.createdBy?.id + ')');
    console.log('Members:', p.members.map(m => `${m.user?.username || m.userId}(${m.role})`).join(', ') || '(none)');
    console.log('Created:', p.createdAt, 'Updated:', p.updatedAt);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
