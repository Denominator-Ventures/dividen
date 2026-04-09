export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/extensions/:id — Get a single extension
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const extension = await prisma.agentExtension.findUnique({
      where: { id: params.id },
      include: { installedBy: { select: { id: true, name: true, email: true } } },
    });

    if (!extension) return NextResponse.json({ error: 'Extension not found' }, { status: 404 });

    return NextResponse.json(extension);
  } catch (error: any) {
    console.error('GET /api/extensions/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/extensions/:id — Update an extension (toggle active, change config, etc.)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.agentExtension.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Extension not found' }, { status: 404 });
    if (existing.installedById !== userId) {
      return NextResponse.json({ error: 'Only the installer can modify this extension' }, { status: 403 });
    }

    const body = await req.json();
    const updates: any = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.config !== undefined) {
      if (typeof body.config === 'string') {
        try { JSON.parse(body.config); } catch {
          return NextResponse.json({ error: 'config must be valid JSON' }, { status: 400 });
        }
        updates.config = body.config;
      } else {
        updates.config = JSON.stringify(body.config);
      }
    }
    if (body.scope !== undefined) updates.scope = body.scope;
    if (body.scopeId !== undefined) updates.scopeId = body.scopeId;

    const updated = await prisma.agentExtension.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/extensions/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/extensions/:id — Uninstall an extension
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.agentExtension.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Extension not found' }, { status: 404 });
    if (existing.installedById !== userId) {
      return NextResponse.json({ error: 'Only the installer can remove this extension' }, { status: 403 });
    }

    await prisma.agentExtension.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/extensions/:id error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
