export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens, getGoogleUserInfo, getPublicBaseUrl } from '@/lib/google-oauth';

/**
 * GET /api/auth/callback/google-connect
 * Handles the OAuth callback from Google after user consent.
 * Creates/updates IntegrationAccount records for email, calendar, and drive.
 */
export async function GET(req: NextRequest) {
  const baseUrl = getPublicBaseUrl(req);
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }
    const sessionUserId = (session!.user as any).id;

    const code = req.nextUrl.searchParams.get('code');
    const stateStr = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      console.error('[google-callback] OAuth error:', error);
      return NextResponse.redirect(new URL(`/settings?tab=integrations&error=${error}`, baseUrl));
    }

    if (!code || !stateStr) {
      return NextResponse.redirect(new URL('/settings?tab=integrations&error=missing_code', baseUrl));
    }

    // Decode state
    let state: { userId: string; identity: string; accountIndex?: number; returnTo?: string };
    try {
      state = JSON.parse(Buffer.from(stateStr, 'base64url').toString());
    } catch {
      return NextResponse.redirect(new URL('/settings?tab=integrations&error=invalid_state', baseUrl));
    }

    // Security: verify the session user matches the state user
    if (state.userId !== sessionUserId) {
      return NextResponse.redirect(new URL('/settings?tab=integrations&error=user_mismatch', baseUrl));
    }

    const { userId, identity } = state;
    const accountIndex = state.accountIndex ?? 0;
    const returnTo = state.returnTo || '';

    // Build redirect URI (must match exactly what was sent to Google)
    const redirectUri = `${baseUrl}/api/auth/callback/google-connect`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    console.log('[google-callback] Token exchange successful, scope:', tokens.scope);

    // Get user info to find their email
    const userInfo = await getGoogleUserInfo(tokens.access_token);
    console.log('[google-callback] Google user:', userInfo.email);

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    const scope = tokens.scope;

    // Create/update integration accounts for each service the scopes cover
    const services: string[] = [];
    if (scope.includes('gmail')) services.push('email');
    if (scope.includes('calendar')) services.push('calendar');
    if (scope.includes('drive')) services.push('drive');

    // Always create all three if we have the full consent
    if (services.length === 0) {
      services.push('email', 'calendar', 'drive');
    }

    for (const service of services) {
      await prisma.integrationAccount.upsert({
        where: {
          userId_identity_service_accountIndex: { userId, identity, service, accountIndex },
        },
        create: {
          userId,
          identity,
          provider: 'google',
          service,
          accountIndex,
          label: identity === 'agent'
            ? `Divi's Google ${service.charAt(0).toUpperCase() + service.slice(1)}`
            : `Google ${service.charAt(0).toUpperCase() + service.slice(1)}${accountIndex > 0 ? ` #${accountIndex + 1}` : ''}`,
          emailAddress: userInfo.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry,
          scope,
        },
        update: {
          provider: 'google',
          emailAddress: userInfo.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined, // Don't overwrite if not returned
          tokenExpiry,
          scope,
          isActive: true,
        },
      });
    }

    console.log(`[google-callback] Created/updated ${services.length} integration accounts for ${userInfo.email}`);

    // If returning from onboarding, redirect to dashboard (chat) instead of settings
    if (returnTo === 'onboarding') {
      return NextResponse.redirect(
        new URL('/dashboard?google=connected', baseUrl)
      );
    }

    return NextResponse.redirect(
      new URL('/settings?tab=integrations&google=connected', baseUrl)
    );
  } catch (error: any) {
    console.error('[google-callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=${encodeURIComponent(error.message || 'callback_failed')}`, baseUrl)
    );
  }
}
