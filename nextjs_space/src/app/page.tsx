import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Root page - redirects based on auth and setup state.
 * - No users in DB → /setup
 * - Not authenticated → /login
 * - Authenticated → /dashboard
 */
export default async function RootPage() {
  // Try to check if setup is needed
  try {
    const { prisma } = await import('@/lib/prisma');
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      redirect('/setup');
    }
  } catch {
    // If DB is not available, go to setup
    redirect('/setup');
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}
