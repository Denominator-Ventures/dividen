import { prisma } from '@/lib/prisma';

/**
 * Check if a user has the free tier flag enabled.
 * When isFreeUser is true, billing checks should be bypassed.
 */
export async function isUserFreeTier(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isFreeUser: true },
    });
    return user?.isFreeUser === true;
  } catch {
    return false;
  }
}
