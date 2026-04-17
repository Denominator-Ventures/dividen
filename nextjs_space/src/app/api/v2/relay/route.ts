export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v2/relay — v2 relay endpoint
 *
 * Proxies to the existing /api/federation/relay endpoint.
 * This exists so instances advertising v2Relay in their agent card
 * can reach us.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward federation token
    const fedToken = req.headers.get('x-federation-token');
    if (fedToken) headers['x-federation-token'] = fedToken;

    // Forward auth header
    const auth = req.headers.get('authorization');
    if (auth) headers['authorization'] = auth;

    const selfUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${selfUrl}/api/federation/relay`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('POST /api/v2/relay proxy error:', error);
    return NextResponse.json({ error: error.message || 'Relay proxy failed' }, { status: 500 });
  }
}
