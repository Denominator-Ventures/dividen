export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeTag } from '@/lib/action-tags';

/**
 * POST /api/chat/execute-tag
 *
 * Executes a single action tag and returns the result.
 * Used by the setup flow to trigger interactive widgets directly
 * without going through the LLM.
 *
 * Body: { tag: string, params: Record<string, any> }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { tag, params } = await req.json();
    if (!tag) return NextResponse.json({ error: 'Missing tag name' }, { status: 400 });

    // Only allow widget-rendering tags from this endpoint (security)
    const ALLOWED_TAGS = ['show_settings_widget', 'show_google_connect', 'sync_signal'];
    if (!ALLOWED_TAGS.includes(tag)) {
      return NextResponse.json({ error: `Tag "${tag}" is not allowed via this endpoint` }, { status: 403 });
    }

    const result = await executeTag(
      { raw: `[[${tag}:${JSON.stringify(params || {})}]]`, name: tag, params: params || {} },
      userId,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[execute-tag] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
