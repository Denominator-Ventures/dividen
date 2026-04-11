/**
 * GET /api/search?q=query&limit=20
 *
 * Global search across all models:
 * KanbanCard, Contact, Document, Recording, CalendarEvent, EmailMessage, CommsMessage, QueueItem
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'card' | 'contact' | 'document' | 'recording' | 'calendar' | 'email' | 'comms' | 'queue';
  title: string;
  subtitle: string;
  icon: string;
  meta?: string;
  url?: string;
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(request.headers);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '25'), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const contains = q; // Prisma 'contains' is case-insensitive on Postgres with mode: 'insensitive'
  const perType = Math.ceil(limit / 6); // distribute across types

  try {
    // Serialize queries to avoid connection pool exhaustion
    const cards = await prisma.kanbanCard.findMany({
      where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, priority: true, updatedAt: true },
    });
    const contacts = await prisma.contact.findMany({
      where: { userId, OR: [{ name: { contains, mode: 'insensitive' } }, { email: { contains, mode: 'insensitive' } }, { company: { contains, mode: 'insensitive' } }, { role: { contains, mode: 'insensitive' } }, { notes: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, email: true, company: true, role: true },
    });
    const documents = await prisma.document.findMany({
      where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { content: { contains, mode: 'insensitive' } }, { tags: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, type: true, updatedAt: true },
    });
    const recordings = await prisma.recording.findMany({
      where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { transcript: { contains, mode: 'insensitive' } }, { summary: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, source: true, status: true, updatedAt: true },
    });
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }, { location: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { startTime: 'desc' },
      select: { id: true, title: true, startTime: true, location: true },
    });
    const emails = await prisma.emailMessage.findMany({
      where: { userId, OR: [{ subject: { contains, mode: 'insensitive' } }, { fromName: { contains, mode: 'insensitive' } }, { fromEmail: { contains, mode: 'insensitive' } }, { body: { contains, mode: 'insensitive' } }, { snippet: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { receivedAt: 'desc' },
      select: { id: true, subject: true, fromName: true, fromEmail: true, receivedAt: true, isRead: true },
    });
    const comms = await prisma.commsMessage.findMany({
      where: { userId, content: { contains, mode: 'insensitive' } },
      take: perType, orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, sender: true, state: true, priority: true, createdAt: true },
    });
    const queueItems = await prisma.queueItem.findMany({
      where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }] },
      take: perType, orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, type: true, status: true, priority: true, createdAt: true },
    });

    // Transform into unified results
    const results: SearchResult[] = [];

    for (const c of cards) {
      results.push({
        id: c.id,
        type: 'card',
        title: c.title,
        subtitle: `${c.status.replace('_', ' ')} · ${c.priority}`,
        icon: '📋',
        meta: c.status,
      });
    }

    for (const c of contacts) {
      const parts = [c.role, c.company].filter(Boolean);
      results.push({
        id: c.id,
        type: 'contact',
        title: c.name,
        subtitle: parts.length > 0 ? parts.join(' @ ') : (c.email || 'Contact'),
        icon: '👤',
      });
    }

    for (const d of documents) {
      const typeIcons: Record<string, string> = { note: '📝', report: '📊', template: '📄', meeting_notes: '📋' };
      results.push({
        id: d.id,
        type: 'document',
        title: d.title,
        subtitle: d.type,
        icon: typeIcons[d.type] || '📄',
      });
    }

    for (const r of recordings) {
      results.push({
        id: r.id,
        type: 'recording',
        title: r.title,
        subtitle: `${r.source} · ${r.status}`,
        icon: '🎙️',
      });
    }

    for (const e of calendarEvents) {
      const when = new Date(e.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      results.push({
        id: e.id,
        type: 'calendar',
        title: e.title,
        subtitle: e.location ? `${when} · ${e.location}` : when,
        icon: '📅',
      });
    }

    for (const e of emails) {
      results.push({
        id: e.id,
        type: 'email',
        title: e.subject || '(no subject)',
        subtitle: `From ${e.fromName || e.fromEmail || 'unknown'}`,
        icon: e.isRead ? '📧' : '📬',
      });
    }

    for (const m of comms) {
      const senders: Record<string, string> = { user: 'You', divi: 'Divi', system: 'System' };
      results.push({
        id: m.id,
        type: 'comms',
        title: m.content.length > 80 ? m.content.slice(0, 80) + '…' : m.content,
        subtitle: `${senders[m.sender] || m.sender} · ${m.state}`,
        icon: '📡',
      });
    }

    for (const q of queueItems) {
      results.push({
        id: q.id,
        type: 'queue',
        title: q.title,
        subtitle: `${q.type} · ${q.status}`,
        icon: '📋',
      });
    }

    // Sort by relevance — exact title matches first, then partial
    const lowerQ = q.toLowerCase();
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      const bExact = b.title.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      return aExact - bExact;
    });

    logRequest({ userId, ip, method: 'GET', path: '/api/search', statusCode: 200, duration: Date.now() - start });
    return NextResponse.json({ results: results.slice(0, limit) });
  } catch (error: any) {
    console.error('[search] Error:', error.message);
    logError({ userId, ip, path: '/api/search', method: 'GET', errorMessage: error?.message || 'Unknown', errorStack: error?.stack });
    logRequest({ userId, ip, method: 'GET', path: '/api/search', statusCode: 500, duration: Date.now() - start });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
