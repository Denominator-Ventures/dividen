import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed required test account
  const testPasswordHash = await bcrypt.hash('johndoe123', 12);
  
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      passwordHash: testPasswordHash,
      role: 'admin',
      mode: 'cockpit',
    },
  });

  // Seed admin account
  const adminPasswordHash = await bcrypt.hash('DiviDen2024!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@dividen.ai' },
    update: {},
    create: {
      email: 'admin@dividen.ai',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'admin',
      mode: 'cockpit',
    },
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
