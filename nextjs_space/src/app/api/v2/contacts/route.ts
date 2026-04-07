import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAgent, isAuthError, jsonSuccess, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/v2/contacts - List all contacts (read-only)
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request, 'contacts');
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const tag = searchParams.get('tag');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Record<string, unknown> = { userId: auth.userId };

  // Build search filter (SQLite compatible)
  const andConditions: Record<string, unknown>[] = [];
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ],
    });
  }
  if (tag) {
    andConditions.push({ tags: { contains: tag } });
  }
  if (andConditions.length > 0) {
    (where as any).AND = andConditions;
  }

  try {
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          cards: {
            include: {
              card: {
                select: { id: true, title: true, status: true, priority: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.contact.count({ where }),
    ]);

    return jsonSuccess({
      contacts,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    return jsonError('Failed to fetch contacts', 500);
  }
}
