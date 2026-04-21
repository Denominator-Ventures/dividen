/**
 * GET /api/search?q=query&limit=25&scope=all|personal|network
 *
 * Unified search across personal data AND network entities:
 * Personal: KanbanCard, Contact, Document, Recording, CalendarEvent, EmailMessage, CommsMessage, QueueItem
 * Network:  User (people), Team, MarketplaceAgent, NetworkJob
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logRequest, logError, getClientIp } from '@/lib/telemetry';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

type ResultType = 'card' | 'contact' | 'document' | 'recording' | 'calendar' | 'email' | 'comms' | 'queue' | 'person' | 'team' | 'agent' | 'job';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: string;
  meta?: string;
  url?: string;
  section: 'personal' | 'network';
}

function parseJson(val: string | null, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

async function _GET(request: NextRequest) {
  const start = Date.now();
  const ip = getClientIp(request.headers);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '25'), 50);
  const scope = request.nextUrl.searchParams.get('scope') || 'all'; // all | personal | network

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const contains = q;
  const perType = Math.ceil(limit / 10);

  try {
    const results: SearchResult[] = [];

    // ── Personal Data ──────────────────────────────────────────
    if (scope === 'all' || scope === 'personal') {
      const cards = await prisma.kanbanCard.findMany({
        where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, priority: true },
      });
      const contacts = await prisma.contact.findMany({
        where: { userId, OR: [{ name: { contains, mode: 'insensitive' } }, { email: { contains, mode: 'insensitive' } }, { company: { contains, mode: 'insensitive' } }, { role: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, email: true, company: true, role: true },
      });
      const documents = await prisma.document.findMany({
        where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { content: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, type: true },
      });
      const recordings = await prisma.recording.findMany({
        where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { transcript: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, source: true, status: true },
      });
      const calendarEvents = await prisma.calendarEvent.findMany({
        where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { startTime: 'desc' },
        select: { id: true, title: true, startTime: true, location: true },
      });
      const emails = await prisma.emailMessage.findMany({
        where: { userId, OR: [{ subject: { contains, mode: 'insensitive' } }, { fromName: { contains, mode: 'insensitive' } }, { fromEmail: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { receivedAt: 'desc' },
        select: { id: true, subject: true, fromName: true, fromEmail: true, isRead: true },
      });
      const queueItems = await prisma.queueItem.findMany({
        where: { userId, OR: [{ title: { contains, mode: 'insensitive' } }, { description: { contains, mode: 'insensitive' } }] },
        take: perType, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, status: true, priority: true },
      });

      for (const c of cards) {
        results.push({ id: c.id, type: 'card', title: c.title, subtitle: `${c.status.replace('_', ' ')} · ${c.priority}`, icon: '📋', meta: c.status, section: 'personal' });
      }
      for (const c of contacts) {
        const parts = [c.role, c.company].filter(Boolean);
        results.push({ id: c.id, type: 'contact', title: c.name, subtitle: parts.length > 0 ? parts.join(' @ ') : (c.email || 'Contact'), icon: '👤', section: 'personal' });
      }
      for (const d of documents) {
        const typeIcons: Record<string, string> = { note: '📝', report: '📊', template: '📄', meeting_notes: '📋' };
        results.push({ id: d.id, type: 'document', title: d.title, subtitle: d.type, icon: typeIcons[d.type] || '📄', section: 'personal' });
      }
      for (const r of recordings) {
        results.push({ id: r.id, type: 'recording', title: r.title, subtitle: `${r.source} · ${r.status}`, icon: '🎙️', section: 'personal' });
      }
      for (const e of calendarEvents) {
        const when = new Date(e.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        results.push({ id: e.id, type: 'calendar', title: e.title, subtitle: e.location ? `${when} · ${e.location}` : when, icon: '📅', section: 'personal' });
      }
      for (const e of emails) {
        results.push({ id: e.id, type: 'email', title: e.subject || '(no subject)', subtitle: `From ${e.fromName || e.fromEmail || 'unknown'}`, icon: e.isRead ? '📧' : '📬', section: 'personal' });
      }
      for (const q of queueItems) {
        results.push({ id: q.id, type: 'queue', title: q.title, subtitle: `${q.type} · ${q.status}`, icon: '📋', section: 'personal' });
      }
    }

    // ── Network Entities ───────────────────────────────────────
    if (scope === 'all' || scope === 'network') {
      // People — users with non-private profiles
      const people = await prisma.user.findMany({
        where: {
          id: { not: userId },
          OR: [
            { name: { contains, mode: 'insensitive' } },
            { email: { contains, mode: 'insensitive' } },
            { profile: { headline: { contains, mode: 'insensitive' } } },
            { profile: { currentTitle: { contains, mode: 'insensitive' } } },
            { profile: { currentCompany: { contains, mode: 'insensitive' } } },
            { profile: { skills: { contains, mode: 'insensitive' } } },
          ],
        },
        take: perType,
        select: {
          id: true, name: true, email: true,
          profile: { select: { headline: true, capacity: true, currentTitle: true, currentCompany: true, visibility: true } },
        },
      });

      // Get connection status map for people results
      const peopleIds = people.map((p: any) => p.id);
      const connections = peopleIds.length > 0 ? await prisma.connection.findMany({
        where: { OR: [
          { requesterId: userId, accepterId: { in: peopleIds } },
          { accepterId: userId, requesterId: { in: peopleIds } },
        ]},
        select: { requesterId: true, accepterId: true, status: true },
      }) : [];
      const connMap = new Map<string, string>();
      for (const c of connections) {
        const peerId = c.requesterId === userId ? c.accepterId : c.requesterId;
        if (peerId) connMap.set(peerId, c.status);
      }

      for (const p of people) {
        const u = p as any;
        if (u.profile?.visibility === 'private') continue;
        const parts = [u.profile?.currentTitle, u.profile?.currentCompany].filter(Boolean);
        const subtitle = u.profile?.headline || (parts.length > 0 ? parts.join(' at ') : u.email);
        const connStatus = connMap.get(u.id);
        const capacityBadge = u.profile?.capacity ? ` · ${u.profile.capacity}` : '';
        results.push({
          id: u.id, type: 'person', title: u.name || u.email,
          subtitle: subtitle + capacityBadge,
          icon: '🧑', meta: connStatus || undefined, url: `/profile/${u.id}`, section: 'network',
        });
      }

      // Teams — network or public visible
      const teams = await prisma.team.findMany({
        where: {
          visibility: { in: ['network', 'public'] },
          isActive: true,
          OR: [
            { name: { contains, mode: 'insensitive' } },
            { description: { contains, mode: 'insensitive' } },
            { headline: { contains, mode: 'insensitive' } },
            { industry: { contains, mode: 'insensitive' } },
          ],
        },
        take: perType, orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, headline: true, type: true, industry: true, _count: { select: { members: true } } },
      });

      for (const t of teams) {
        const tm = t as any;
        const subtitle = tm.headline || [tm.type, tm.industry].filter(Boolean).join(' · ') || 'Team';
        results.push({
          id: tm.id, type: 'team', title: tm.name,
          subtitle: `${subtitle} · ${tm._count.members} member${tm._count.members !== 1 ? 's' : ''}`,
          icon: '🏢', url: `/team/${tm.id}`, section: 'network',
        });
      }

      // Marketplace Agents — active
      const agents = await prisma.marketplaceAgent.findMany({
        where: {
          status: 'active',
          OR: [
            { name: { contains, mode: 'insensitive' } },
            { description: { contains, mode: 'insensitive' } },
            { category: { contains, mode: 'insensitive' } },
            { tags: { contains, mode: 'insensitive' } },
            { developerName: { contains, mode: 'insensitive' } },
          ],
        },
        take: perType, orderBy: { totalExecutions: 'desc' },
        select: { id: true, name: true, slug: true, description: true, category: true, pricingModel: true, avgRating: true, totalExecutions: true, sourceInstanceId: true, sourceInstanceUrl: true, developerName: true },
      });

      // Track federated developers we've seen to add as people results
      const seenFederatedDevs = new Set<string>();

      for (const a of agents) {
        const ag = a as any;
        const rating = ag.avgRating > 0 ? ` · ★${ag.avgRating.toFixed(1)}` : '';
        results.push({
          id: ag.id, type: 'agent', title: ag.name,
          subtitle: `${ag.category} · ${ag.pricingModel}${rating} · ${ag.totalExecutions} runs`,
          icon: '🤖', section: 'network',
        });

        // Add federated developers as people results (deduplicated)
        if (ag.sourceInstanceId && ag.developerName) {
          const devKey = `${ag.developerName}::${ag.sourceInstanceId}`;
          if (!seenFederatedDevs.has(devKey)) {
            seenFederatedDevs.add(devKey);
            const hostname = ag.sourceInstanceUrl ? (() => { try { return new URL(ag.sourceInstanceUrl).hostname; } catch { return 'Federated'; } })() : 'Federated';
            results.push({
              id: `feddev-${ag.slug}`, type: 'person' as any, title: ag.developerName,
              subtitle: `🌐 Federated developer via ${hostname}`,
              icon: '🌐', section: 'network',
              url: `/developer/${ag.slug}`,
            });
          }
        }
      }

      // Jobs — open network-visible
      const jobs = await prisma.networkJob.findMany({
        where: {
          status: 'open',
          visibility: { in: ['network', 'connections'] },
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { description: { contains, mode: 'insensitive' } },
            { requiredSkills: { contains, mode: 'insensitive' } },
          ],
        },
        take: perType, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, taskType: true, urgency: true, compensation: true, compensationType: true, compensationAmount: true, poster: { select: { name: true } } },
      });

      for (const j of jobs) {
        const jb = j as any;
        const comp = jb.compensationType && jb.compensationAmount
          ? `$${jb.compensationAmount}/${jb.compensationType}`
          : (jb.compensation || 'Open');
        results.push({
          id: jb.id, type: 'job', title: jb.title,
          subtitle: `${jb.taskType} · ${comp} · by ${jb.poster?.name || 'Unknown'}`,
          icon: '💼', meta: jb.urgency, section: 'network',
        });
      }
    }

    // Sort: exact title matches first, then network results after personal
    const lowerQ = q.toLowerCase();
    results.sort((a, b) => {
      // Section priority: personal first when scope=all
      if (scope === 'all') {
        const aSec = a.section === 'personal' ? 0 : 1;
        const bSec = b.section === 'personal' ? 0 : 1;
        if (aSec !== bSec) return aSec - bSec;
      }
      // Then exact prefix match
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

export const GET = withTelemetry(_GET);
