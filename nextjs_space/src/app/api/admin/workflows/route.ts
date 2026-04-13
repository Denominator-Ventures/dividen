import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function verifyAdmin(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  const token = auth?.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const patterns = await prisma.workflowPattern.findMany({
      orderBy: [{ suggestedAsCapability: 'desc' }, { userCount: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return NextResponse.json({ patterns });
  } catch (e) {
    console.error('Failed to fetch workflow patterns:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const { id, adminReviewed } = await req.json();
    const updated = await prisma.workflowPattern.update({
      where: { id },
      data: { adminReviewed: adminReviewed ?? true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Failed to update workflow pattern:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
