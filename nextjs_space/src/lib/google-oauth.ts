/**
 * Google OAuth 2.0 utilities for DiviDen.
 * Handles token exchange, refresh, and scope management.
 * This is SEPARATE from NextAuth Google SSO — this is for data access (Gmail, Calendar, Drive).
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// All scopes we request in a single consent — read-only per privacy policy
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || '';
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

/**
 * Build the Google OAuth consent URL.
 * State encodes the userId + identity so callback knows who initiated.
 */
export function buildConsentUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to always get refresh token
    state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${err.error_description || err.error || res.statusText}`);
  }
  return res.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${err.error_description || err.error || res.statusText}`);
  }
  return res.json();
}

/**
 * Get user info (email, name) from Google.
 */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<{ email: string; name: string; picture?: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json();
}

/**
 * Ensure an IntegrationAccount has a valid (non-expired) access token.
 * Returns the access token or throws.
 */
export async function getValidAccessToken(account: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}): Promise<string> {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error('Integration account has no OAuth tokens');
  }

  // Check if token is still valid (with 5-minute buffer)
  const now = Date.now();
  const expiry = account.tokenExpiry ? account.tokenExpiry.getTime() : 0;
  if (now < expiry - 5 * 60 * 1000) {
    return account.accessToken;
  }

  // Token expired or about to expire — refresh it
  console.log(`[google-oauth] Refreshing token for integration ${account.id}`);
  const refreshed = await refreshAccessToken(account.refreshToken);

  // Update DB with new token
  const { prisma } = await import('@/lib/prisma');
  await prisma.integrationAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.access_token,
      tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });

  return refreshed.access_token;
}
