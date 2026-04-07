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

  // Seed default notification rules for all users
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const user of allUsers) {
    // Meeting Starting Soon
    const existingMeeting = await prisma.notificationRule.findFirst({
      where: { userId: user.id, eventType: 'meeting_starting' },
    });
    if (!existingMeeting) {
      await prisma.notificationRule.create({
        data: {
          userId: user.id,
          name: 'Meeting Starting Soon',
          eventType: 'meeting_starting',
          conditions: JSON.stringify({ minutesBefore: 5 }),
          message: "Meeting '{{title}}' starts in {{minutes}}m",
          style: 'warning',
          sound: true,
          enabled: true,
        },
      });
    }
  }

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
