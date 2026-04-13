export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/relay-templates — List relay templates.
 * Query: ?category=intro_request
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category) where.category = category;

    const templates = await prisma.relayTemplate.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { successRate: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * POST /api/relay-templates — Record template usage.
 * Body: { templateId, completed }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

    const body = await req.json();
    const { templateId, completed } = body;

    if (!templateId) return NextResponse.json({ success: false, error: 'templateId required' }, { status: 400 });

    const template = await prisma.relayTemplate.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const newCount = template.usageCount + 1;
    const successCount = Math.round(template.successRate * template.usageCount) + (completed ? 1 : 0);

    await prisma.relayTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: newCount,
        successRate: newCount > 0 ? successCount / newCount : 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
