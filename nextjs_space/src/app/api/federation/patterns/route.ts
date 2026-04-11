/**
 * Federation Pattern Sharing API
 * FVP Proposal #11
 *
 * POST — receive patterns from a connected instance (exchange)
 * GET  — export shareable patterns for connected instances
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  exportShareablePatterns,
  importSharedPatterns,
} from '@/lib/federation/pattern-sharing';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const key = authHeader.slice(7);
  const apiKey = await prisma.agentApiKey.findFirst({
    where: { apiKey: key, isActive: true },
  });
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  const minConfidence = parseFloat(req.nextUrl.searchParams.get('minConfidence') || '0.4');
  const patterns = await exportShareablePatterns(minConfidence);

  return NextResponse.json({
    instanceId: process.env.NEXTAUTH_URL || 'unknown',
    patternCount: patterns.length,
    patterns,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const key = authHeader.slice(7);
  const apiKey = await prisma.agentApiKey.findFirst({
    where: { apiKey: key, isActive: true },
  });
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { patterns, instanceId } = body;

    if (!Array.isArray(patterns)) {
      return NextResponse.json({ error: 'patterns must be an array' }, { status: 400 });
    }

    // Import received patterns
    const result = await importSharedPatterns(patterns);

    // Reciprocate with our patterns
    const ourPatterns = await exportShareablePatterns();

    return NextResponse.json({
      received: { accepted: result.accepted, rejected: result.rejected, merged: result.merged },
      reciprocated: { patternCount: ourPatterns.length, patterns: ourPatterns },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
