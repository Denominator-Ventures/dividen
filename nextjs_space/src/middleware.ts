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

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
