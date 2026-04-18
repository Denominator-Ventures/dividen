import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Look up Alvaro
  const alvaro = await prisma.user.findFirst({
    where: { email: 'alvaro@fractionalventure.partners' },
    select: { id: true, email: true, name: true, username: true }
  });
  console.log('Alvaro user record:', JSON.stringify(alvaro, null, 2));
  
  // Look up Jon
  const jon = await prisma.user.findFirst({
    where: { email: 'jon@colab.la' },
    select: { id: true, email: true, name: true, username: true }
  });
  console.log('Jon user record:', JSON.stringify(jon, null, 2));
  
  // Look up Jon's connections - get EVERYTHING
  if (jon) {
    const conns = await prisma.connection.findMany({
      where: { 
        OR: [{ requesterId: jon.id }, { accepterId: jon.id }]
      },
      include: {
        requester: { select: { id: true, name: true, email: true, username: true } },
        accepter: { select: { id: true, name: true, email: true, username: true } }
      }
    });
    console.log('\nJon connections (ALL statuses):');
    for (const c of conns) {
      const isRequester = c.requesterId === jon.id;
      const peerUserId = isRequester ? c.accepterId : c.requesterId;
      const peer = isRequester ? c.accepter : c.requester;
      console.log(`  id=${c.id} status=${c.status}`);
      console.log(`    requesterId=${c.requesterId}, requester=${c.requester ? `${c.requester.name}/${c.requester.email}` : 'NULL'}`);
      console.log(`    accepterId=${c.accepterId}, accepter=${c.accepter ? `${c.accepter.name}/${c.accepter.email}` : 'NULL'}`);
      console.log(`    peerUserName=${c.peerUserName}, peerUserEmail=${c.peerUserEmail}, peerUserId=${c.peerUserId}, peerInstanceUrl=${c.peerInstanceUrl}`);
      console.log(`    nickname=${c.nickname}, peerNickname=${c.peerNickname}, permissions=${c.permissions}`);
      console.log(`    federated=${c.isFederated}`);
    }
  }
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
