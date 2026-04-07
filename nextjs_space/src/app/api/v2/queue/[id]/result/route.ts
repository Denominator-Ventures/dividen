import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// POST /api/v2/queue/:id/result - Report task completion with result
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { result, status } = body;

    if (!result) {
      return jsonError('Missing required field: result', 400);
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return jsonError('Queue item not found', 404);
    }

    // Merge result into metadata
    let existingMetadata: Record<string, unknown> = {};
    if (item.metadata) {
      try { existingMetadata = JSON.parse(item.metadata); } catch { /* ignore */ }
    }

    const updatedMetadata = {
      ...existingMetadata,
      agentResult: result,
      completedBy: auth.keyName,
      completedAt: new Date().toISOString(),
    };

    const updated = await prisma.queueItem.update({
      where: { id: params.id },
      data: {
        status: status || 'done_today',
        metadata: JSON.stringify(updatedMetadata),
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError('Failed to report result', 500);
  }
}
