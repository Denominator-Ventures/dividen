export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildConsentUrl, getPublicBaseUrl } from '@/lib/google-oauth';

/**
 * GET /api/auth/google-connect
 * Initiates Google OAuth flow for connecting services (Gmail, Calendar, Drive).
 * Separate from NextAuth SSO — this is for data access.
 */
export async function GET(req: NextRequest) {
  const baseUrl = getPublicBaseUrl(req);
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }
    const userId = (session!.user as any).id;

    // Identity defaults to operator
    const identity = req.nextUrl.searchParams.get('identity') || 'operator';

    const redirectUri = `${baseUrl}/api/auth/callback/google-connect`;

    // Encode state: userId + identity
    const state = Buffer.from(JSON.stringify({ userId, identity })).toString('base64url');

    const consentUrl = buildConsentUrl(redirectUri, state);
    return NextResponse.redirect(consentUrl);
  } catch (error: any) {
    console.error('[google-connect] Error:', error);
    return NextResponse.redirect(new URL('/settings?error=google_connect_failed', baseUrl));
  }
}
