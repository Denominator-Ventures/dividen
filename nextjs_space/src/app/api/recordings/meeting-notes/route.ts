/**
 * POST /api/recordings/meeting-notes
 * 
 * Generate meeting notes for a calendar event using Gemini.
 * Optionally links to a recording with transcript for richer notes.
 * Requires Gmail/Google Calendar connected + GEMINI_API_KEY configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAndSaveMeetingNotes } from '@/lib/gemini-meeting-notes';
import { prisma } from '@/lib/prisma';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { eventId, recordingId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId is required' }, { status: 400 });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key not configured. Add GEMINI_API_KEY to your environment.',
      }, { status: 400 });
    }

    // Check if user has Google calendar connected
    const googleIntegration = await prisma.integrationAccount.findFirst({
      where: {
        userId,
        provider: 'google',
        isActive: true,
        service: { in: ['calendar', 'email'] },
      },
    });

    if (!googleIntegration) {
      return NextResponse.json({
        success: false,
        error: 'No Google account connected. Connect Google from Settings → Integrations to use meeting notes.',
      }, { status: 400 });
    }

    const result = await generateAndSaveMeetingNotes(userId, eventId, recordingId);

    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        summary: result.notes.summary,
        actionItemCount: result.notes.actionItems.length,
        topicCount: result.notes.topics.length,
        sentiment: result.notes.sentiment,
      },
    });
  } catch (error: any) {
    console.error('[meeting-notes] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate meeting notes',
    }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
