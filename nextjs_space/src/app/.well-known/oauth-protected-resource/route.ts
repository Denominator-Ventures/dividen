export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /.well-known/oauth-protected-resource
 *
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 *
 * DiviDen uses API key bearer auth, NOT OAuth. We intentionally return 404
 * here so that MCP clients and registries (like Smithery) that probe for
 * OAuth support get a clean "not found" and fall back to our static
 * server card at /.well-known/mcp/server-card.json instead of getting
 * stuck on an incomplete OAuth configuration.
 *
 * If DiviDen ever adds OAuth support, this endpoint should return
 * proper RFC 9728 metadata with a non-empty authorization_servers array.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'OAuth not supported. This server uses API key bearer authentication. See /.well-known/mcp/server-card.json for server metadata.' },
    {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
