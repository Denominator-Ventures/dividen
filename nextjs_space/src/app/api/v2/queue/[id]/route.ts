import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/queue/:id - Get single queue item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'queue');
  if (isAuthError(auth)) return auth;

  try {
    const item = await prisma.queueItem.findUnique({
      where: { id: params.id },
    });

    if (!item || item.userId !== auth.userId) {
      return jsonError('Queue item not found', 404);
    }

    return jsonSuccess(item);
  } catch (error) {
    return jsonError('Failed to fetch queue item', 500);
  }
}
