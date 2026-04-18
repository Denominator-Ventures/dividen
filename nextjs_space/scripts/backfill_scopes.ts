import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_SCOPES = ['relay', 'task', 'project', 'ambient'];

async function main() {
  const all = await prisma.connection.findMany({ 
    where: { status: 'active' },
    select: { id: true, permissions: true, requester: { select: { name: true } }, accepter: { select: { name: true } } }
  });
  
  console.log(`Found ${all.length} active connections`);
  let updated = 0;
  for (const c of all) {
    let perms: any = { trustLevel: 'supervised', scopes: [] };
    try { perms = JSON.parse(c.permissions); } catch {}
    
    const currentScopes: string[] = Array.isArray(perms.scopes) ? perms.scopes : [];
    const missingScopes = DEFAULT_SCOPES.filter(s => !currentScopes.includes(s));
    
    if (missingScopes.length > 0) {
      const newScopes = [...currentScopes, ...missingScopes];
      const newPerms = { ...perms, scopes: newScopes };
      await prisma.connection.update({
        where: { id: c.id },
        data: { permissions: JSON.stringify(newPerms) }
      });
      console.log(`  [updated] ${c.id} (${c.requester?.name} ↔ ${c.accepter?.name || 'federated'}): added ${missingScopes.join(',')}`);
      updated++;
    } else {
      console.log(`  [skip] ${c.id}: already has all default scopes`);
    }
  }
  console.log(`\nDone. Updated ${updated} connections.`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
