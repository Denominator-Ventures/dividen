import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/contacts/:id - Get single contact with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgent(request, 'contacts');
  if (isAuthError(auth)) return auth;

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
      include: {
        cards: {
          include: {
            card: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                assignee: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!contact) {
      return jsonError('Contact not found', 404);
    }

    return jsonSuccess(contact);
  } catch (error) {
    return jsonError('Failed to fetch contact', 500);
  }
}
