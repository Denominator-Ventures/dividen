import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';


export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }
  
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
  { const g = await requireAdmin(); if (g instanceof NextResponse) return g; }
  
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
