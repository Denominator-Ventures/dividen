export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens, getGoogleUserInfo, getPublicBaseUrl } from '@/lib/google-oauth';
import { logActivity } from '@/lib/activity';

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
    logActivity({ userId, action: 'google_connected', summary: `Connected Google account (${userInfo.email}) — ${services.join(', ')}`, actor: 'user', metadata: { email: userInfo.email, services, identity } }).catch(() => {});

    // ── Auto-install capabilities for connected signals (silent — user discovers later) ──
    const capabilityUpserts: Promise<any>[] = [];
    if (services.includes('email')) {
      capabilityUpserts.push(
        prisma.agentCapability.upsert({
          where: { userId_type: { userId, type: 'email' } },
          create: {
            type: 'email', name: 'Outbound Email', status: 'enabled',
            identity: identity === 'agent' ? 'agent' : 'operator',
            rules: JSON.stringify([
              { rule: 'Match my tone and writing style', enabled: true },
              { rule: 'Always get approval before sending to new contacts', enabled: true },
            ]),
            config: JSON.stringify({ provider: 'google', emailAddress: userInfo.email }),
            userId,
          },
          update: {
            config: JSON.stringify({ provider: 'google', emailAddress: userInfo.email }),
            // Don't overwrite status/rules if user already configured
          },
        })
      );
    }
    if (services.includes('calendar')) {
      capabilityUpserts.push(
        prisma.agentCapability.upsert({
          where: { userId_type: { userId, type: 'meetings' } },
          create: {
            type: 'meetings', name: 'Meeting Scheduling', status: 'enabled',
            identity: identity === 'agent' ? 'agent' : 'operator',
            rules: JSON.stringify([
              { rule: 'No meetings before 9am or after 6pm', enabled: true },
              { rule: 'Default meeting duration is 30 minutes', enabled: true },
              { rule: 'Always check for conflicts before scheduling', enabled: true },
            ]),
            config: JSON.stringify({ provider: 'google' }),
            userId,
          },
          update: {
            config: JSON.stringify({ provider: 'google' }),
          },
        })
      );
    }
    if (capabilityUpserts.length > 0) {
      await Promise.all(capabilityUpserts).catch((e) =>
        console.warn('[google-callback] Capability auto-install error (non-fatal):', e.message)
      );
      console.log(`[google-callback] Auto-installed ${capabilityUpserts.length} capabilities`);
    }

    // ── Fire-and-forget: sync all Google services immediately ──
    // This pulls emails, calendar events, and drive files in the background
    // so data is ready by the time the user lands back on the dashboard.
    import('@/lib/google-sync').then(({ syncAllGoogleServices }) => {
      syncAllGoogleServices(userId)
        .then((result) => console.log(`[google-callback] Auto-sync complete:`, result))
        .catch((e) => console.error('[google-callback] Auto-sync error (non-fatal):', e.message));
    }).catch(() => {});

    // ── Auto-complete "Connect Email & Calendar" checklist task if it exists ──
    try {
      const connectTasks = await prisma.checklistItem.findMany({
        where: {
          completed: false,
          text: { contains: 'Connect' },
          card: {
            userId,
            status: { in: ['active', 'in_progress', 'development'] },
            project: { metadata: { contains: '"isSetupProject":true' } },
          },
        },
        select: { id: true },
      });
      if (connectTasks.length > 0) {
        await prisma.checklistItem.updateMany({
          where: { id: { in: connectTasks.map(t => t.id) } },
          data: { completed: true },
        });
        console.log(`[google-callback] Auto-completed ${connectTasks.length} setup checklist tasks`);

        // Inject auto-continue message with the next task for the setup flow
        if (returnTo === 'onboarding') {
          try {
            const { getSetupTaskAction } = await import('@/lib/onboarding-project');
            const { checkAndAutoCompleteCard } = await import('@/lib/card-auto-complete');
            // Check auto-complete for affected cards
            const affectedCards = await prisma.checklistItem.findMany({
              where: { id: { in: connectTasks.map(t => t.id) } },
              select: { cardId: true },
              distinct: ['cardId'],
            });
            for (const { cardId } of affectedCards) {
              await checkAndAutoCompleteCard(cardId, userId);
            }
            // Find the next incomplete setup task
            const nextTask = await prisma.checklistItem.findFirst({
              where: {
                completed: false,
                card: {
                  userId,
                  status: { in: ['active', 'in_progress', 'development'] },
                  OR: [
                    { title: { contains: 'Setup' } },
                    { project: { metadata: { contains: '"isSetupProject":true' } } },
                  ],
                },
              },
              orderBy: { order: 'asc' },
              select: { text: true },
            });
            if (nextTask) {
              const nextTaskAction = getSetupTaskAction(nextTask.text) || null;
              await prisma.chatMessage.create({
                data: {
                  role: 'assistant',
                  content: `✅ Google connected! That's checked off your setup list.\n\nNext up is **"${nextTask.text}"**. Want to knock that out now?`,
                  userId,
                  metadata: JSON.stringify({
                    isSetupNextTask: true,
                    nextTaskText: nextTask.text,
                    nextTaskAction,
                  }),
                },
              });
            } else {
              await prisma.chatMessage.create({
                data: {
                  role: 'assistant',
                  content: `✅ Google connected — and that was the last setup task! Your setup checklist is complete. You're all set to go.\n\nWhat would you like to focus on?`,
                  userId,
                },
              });
            }
          } catch (e) {
            console.error('[google-callback] Auto-continue injection error:', e);
          }
        }
      }
    } catch (e) {
      // Non-fatal
    }

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
