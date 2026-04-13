export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/system-prompt';

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === process.env.ADMIN_PASSWORD;
}

// Rough token estimate: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Find first user to generate a sample prompt
    const sampleUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, mode: true },
    });

    if (!sampleUser) {
      return NextResponse.json({ error: 'No users exist to generate prompt' }, { status: 404 });
    }

    const fullPrompt = await buildSystemPrompt({
      userId: sampleUser.id,
      mode: sampleUser.mode || 'cockpit',
      userName: sampleUser.name,
    });

    // Split the prompt by group headers (## headings)
    const sections = fullPrompt.split(/(?=^## )/m).filter(Boolean);
    
    const groups = sections.map((section, index) => {
      const firstLine = section.split('\n')[0].trim();
      const label = firstLine.replace(/^##\s*/, '') || `Section ${index + 1}`;
      const content = section.trim();
      const preview = content.substring(0, 200).replace(/\n/g, ' ');
      return {
        index: index + 1,
        label,
        tokenEstimate: estimateTokens(content),
        preview,
        content,
      };
    });

    const totalTokens = groups.reduce((sum, g) => sum + g.tokenEstimate, 0);

    return NextResponse.json({
      groups,
      totalTokens,
      generatedFor: sampleUser.email || sampleUser.name || sampleUser.id,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin system-prompt error:', error);
    return NextResponse.json({ error: 'Failed to generate system prompt' }, { status: 500 });
  }
}
