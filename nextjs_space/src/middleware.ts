import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware that attaches telemetry timing headers.
 * Actual DB logging happens in the API route layer (via withTelemetry wrapper)
 * because middleware runs on the Edge runtime and cannot import Prisma.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Stamp the request start time so API routes can calculate duration
  response.headers.set('x-request-start', Date.now().toString());

  // Forward client IP for telemetry
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown';
  response.headers.set('x-client-ip', ip);

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // No-cache for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|manifest|sw\\.js).*)'],
};
