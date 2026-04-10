export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /.well-known/oauth-protected-resource
 *
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * MCP clients (and registries like Smithery) look for this endpoint
 * during auth discovery.
 *
 * DiviDen uses API key bearer auth, not OAuth. This endpoint
 * returns minimal metadata indicating bearer token support
 * and pointing to the server card for full details.
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'dividen.ai';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  const metadata = {
    resource: `${baseUrl}/api/mcp`,
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://os.dividen.ai/docs',
    resource_name: 'DiviDen MCP Server',

    // Note: DiviDen uses static API key bearer auth, not OAuth.
    // API keys are generated from the DiviDen Settings page.
    // There is no OAuth authorization server — tokens are
    // pre-provisioned, not obtained through an OAuth flow.
    authorization_servers: [],

    resource_signing_alg_values_supported: [],
    scopes_supported: ['all'],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
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
