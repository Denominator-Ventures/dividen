import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/kanban/:id - Get single kanban card with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'kanban');
  if (isAuthError(auth)) return auth;

  try {
    const card = await prisma.kanbanCard.findFirst({
      where: { id: params.id, userId: auth.userId },
      include: {
        checklist: { orderBy: { order: 'asc' } },
        contacts: {
          include: {
            contact: {
              select: { id: true, name: true, email: true, company: true, phone: true, role: true, tags: true },
            },
          },
        },
      },
    });

    if (!card) {
      return jsonError('Kanban card not found', 404);
    }

    return jsonSuccess(card);
  } catch (error) {
    return jsonError('Failed to fetch kanban card', 500);
  }
}
