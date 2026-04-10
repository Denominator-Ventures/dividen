export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Federation Job Gossip — Phase B
 *
 * GET  /api/federation/jobs — Remote instances fetch open jobs from this instance
 * POST /api/federation/jobs — Remote instances push their open jobs to this instance
 *
 * Auth: x-federation-token header matched against active federated Connection.
 *
 * GET returns jobs with visibility="network" that are open.
 * POST receives jobs from a remote instance and stores them as federated job listings.
 *
 * This enables cross-instance job discovery: agents on instance A can find work
 * posted on instance B, and vice versa.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── Helper: validate federation token ──────────────────────────────────────────

async function validateFederationAuth(req: NextRequest) {
  const federationToken = req.headers.get('x-federation-token');
  if (!federationToken) {
    return { error: NextResponse.json({ error: 'Missing federation token' }, { status: 401, headers: CORS_HEADERS }) };
  }

  const fedConfig = await prisma.federationConfig.findFirst();
  if (!fedConfig || !fedConfig.allowInbound) {
    return { error: NextResponse.json({ error: 'Inbound federation disabled' }, { status: 403, headers: CORS_HEADERS }) };
  }

  const connection = await prisma.connection.findFirst({
    where: {
      isFederated: true,
      federationToken,
      status: 'active',
    },
  });

  if (!connection) {
    return { error: NextResponse.json({ error: 'No active federated connection for this token' }, { status: 404, headers: CORS_HEADERS }) };
  }

  return { connection, fedConfig };
}

// ── GET: Share our open network-visible jobs with a federated peer ─────────────

export async function GET(req: NextRequest) {
  const auth = await validateFederationAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO date — only return jobs updated after this
  const taskType = searchParams.get('taskType');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const where: any = {
    visibility: 'network',
    status: 'open',
  };

  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      where.updatedAt = { gte: sinceDate };
    }
  }

  if (taskType) {
    where.taskType = taskType;
  }

  const jobs = await prisma.networkJob.findMany({
    where,
    orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      poster: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  // Get this instance's identity for provenance
  const fedConfig = await prisma.federationConfig.findFirst();
  const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';
  const instanceName = fedConfig?.instanceName || 'DiviDen';

  const federatedJobs = jobs.map((job) => ({
    // Core job data
    id: job.id,
    title: job.title,
    description: job.description,
    taskType: job.taskType,
    urgency: job.urgency,
    status: job.status,
    compensation: job.compensation,
    estimatedHours: job.estimatedHours,
    deadline: job.deadline,
    requiredSkills: safeParseJson(job.requiredSkills),
    preferredSkills: safeParseJson(job.preferredSkills),
    applicationCount: job._count.applications,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,

    // Provenance — where this job lives
    sourceInstance: {
      url: instanceUrl,
      name: instanceName,
    },
    poster: {
      name: job.poster.name,
      email: job.poster.email,
    },

    // How to apply — remote agents POST here
    applyUrl: `${instanceUrl}/api/jobs/${job.id}/apply`,
  }));

  return NextResponse.json(
    {
      instance: { url: instanceUrl, name: instanceName },
      jobs: federatedJobs,
      count: federatedJobs.length,
      gossipVersion: '1.0.0',
    },
    { headers: CORS_HEADERS },
  );
}

// ── POST: Receive job listings from a remote instance (gossip ingest) ──────────

export async function POST(req: NextRequest) {
  const auth = await validateFederationAuth(req);
  if ('error' in auth) return auth.error;
  const { connection } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const { jobs: incomingJobs, instance: sourceInstance } = body;

  if (!Array.isArray(incomingJobs)) {
    return NextResponse.json({ error: 'Expected jobs array' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!sourceInstance?.url || !sourceInstance?.name) {
    return NextResponse.json({ error: 'Missing source instance info' }, { status: 400, headers: CORS_HEADERS });
  }

  // Validate that the source URL matches the federation connection's peer
  const peerUrl = connection.peerInstanceUrl;
  if (peerUrl && !sourceInstance.url.startsWith(peerUrl.replace(/\/$/, ''))) {
    return NextResponse.json(
      { error: 'Source instance URL does not match federation connection' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  const results: Array<{ remoteJobId: string; action: 'created' | 'updated' | 'skipped'; localId?: string }> = [];

  for (const job of incomingJobs.slice(0, 50)) {
    if (!job.id || !job.title || !job.description) {
      results.push({ remoteJobId: job.id || 'unknown', action: 'skipped' });
      continue;
    }

    // Check if we already have this federated job (by sourceInstance + remoteId combo stored in description tag)
    const federationTag = `[federation:${sourceInstance.url}:${job.id}]`;
    const existing = await prisma.networkJob.findFirst({
      where: {
        description: { contains: federationTag },
      },
    });

    if (existing) {
      // Update if the remote version is newer
      if (job.updatedAt && new Date(job.updatedAt) > existing.updatedAt) {
        await prisma.networkJob.update({
          where: { id: existing.id },
          data: {
            title: job.title,
            description: `${job.description}\n\n---\n${federationTag}`,
            taskType: job.taskType || 'custom',
            urgency: job.urgency || 'medium',
            status: job.status === 'open' ? 'open' : 'expired', // only propagate open jobs as open
            compensation: job.compensation,
            estimatedHours: job.estimatedHours,
            deadline: job.deadline ? new Date(job.deadline) : null,
            requiredSkills: JSON.stringify(job.requiredSkills || []),
            preferredSkills: JSON.stringify(job.preferredSkills || []),
            expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
          },
        });
        results.push({ remoteJobId: job.id, action: 'updated', localId: existing.id });
      } else {
        results.push({ remoteJobId: job.id, action: 'skipped' });
      }
    } else {
      // Need a local poster — use the federation connection's local user
      const localUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: connection.requesterId },
            { id: connection.accepterId || '' },
          ],
        },
      });

      if (!localUser) {
        results.push({ remoteJobId: job.id, action: 'skipped' });
        continue;
      }

      const newJob = await prisma.networkJob.create({
        data: {
          title: `[${sourceInstance.name}] ${job.title}`,
          description: `${job.description}\n\n---\n🌐 Federated from **${sourceInstance.name}** (${sourceInstance.url})\nOriginal poster: ${job.poster?.name || 'Unknown'} (${job.poster?.email || ''})\nApply at: ${job.applyUrl || sourceInstance.url}\n\n${federationTag}`,
          taskType: job.taskType || 'custom',
          urgency: job.urgency || 'medium',
          status: 'open',
          compensation: job.compensation,
          estimatedHours: job.estimatedHours,
          deadline: job.deadline ? new Date(job.deadline) : null,
          requiredSkills: JSON.stringify(job.requiredSkills || []),
          preferredSkills: JSON.stringify(job.preferredSkills || []),
          visibility: 'instance', // federated jobs are visible locally, not re-propagated
          posterId: localUser.id,
          expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
        },
      });

      results.push({ remoteJobId: job.id, action: 'created', localId: newJob.id });
    }
  }

  return NextResponse.json(
    {
      received: incomingJobs.length,
      processed: results.length,
      results,
      gossipVersion: '1.0.0',
    },
    { headers: CORS_HEADERS },
  );
}

// ── Utility ────────────────────────────────────────────────────────────────────

function safeParseJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
