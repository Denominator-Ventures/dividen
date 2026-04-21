import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

/**
 * Require the caller to be an authenticated user with role === 'admin'.
 * Returns the session on success, or a 401/403 NextResponse on failure.
 *
 * Usage in API routes:
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   // result is the session
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return session;
}
