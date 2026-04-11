export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * FVP Brief Proposal #6: Federated Job Application Routing
 *
 * POST /api/federation/jobs/apply
 *
 * Remote instances submit job applications on behalf of their operators.
 * Auth: x-federation-token header
 *
 * Flow:
 *   Instance A posts job → broadcast to connections →
 *   Instance B sees job (federated) → operator applies →
 *   Application relayed back to Instance A (this endpoint) →
 *   Poster reviews → acceptance relayed to Instance B →
 *   Work begins → completion + review → reputation update
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    // Validate federation token
    const federationToken = req.headers.get('x-federation-token');
    if (!federationToken) {
      return NextResponse.json({ error: 'Missing federation token' }, { status: 401, headers: CORS_HEADERS });
    }

    const connection = await prisma.connection.findFirst({
      where: { isFederated: true, federationToken, status: 'active' },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Invalid federation token' }, { status: 403, headers: CORS_HEADERS });
    }

    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
    }

    const { jobId, applicant, coverNote, matchScore, matchReason } = body;

    if (!jobId || !applicant?.name) {
      return NextResponse.json({ error: 'jobId and applicant.name required' }, { status: 400, headers: CORS_HEADERS });
    }

    // Find the job
    const job = await prisma.networkJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: CORS_HEADERS });
    }
    if (job.status !== 'open') {
      return NextResponse.json({ error: 'Job is no longer open' }, { status: 400, headers: CORS_HEADERS });
    }

    // Find or create a local proxy user for the remote applicant
    // We use the connection's local user as the applicant proxy
    const localUserId = connection.requesterId || connection.accepterId;
    if (!localUserId) {
      return NextResponse.json({ error: 'No local user for federation' }, { status: 500, headers: CORS_HEADERS });
    }

    // Check for duplicate application
    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_applicantId: { jobId, applicantId: localUserId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already applied', applicationId: existing.id }, { status: 409, headers: CORS_HEADERS });
    }

    // Create the application with federation metadata
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: localUserId,
        coverNote: [
          `🌐 Federated application from **${applicant.name}**`,
          applicant.email ? `Email: ${applicant.email}` : null,
          applicant.instanceUrl ? `Instance: ${applicant.instanceUrl}` : null,
          applicant.skills?.length ? `Skills: ${applicant.skills.join(', ')}` : null,
          coverNote ? `\n${coverNote}` : null,
        ].filter(Boolean).join('\n'),
        matchScore: matchScore || null,
        matchReason: matchReason || null,
        source: 'federation',
      },
    });

    // Notify the job poster
    await prisma.commsMessage.create({
      data: {
        sender: 'system',
        content: `🌐 Federated job application: **${applicant.name}** applied to "${job.title}" from ${connection.peerInstanceUrl || 'a connected instance'}`,
        state: 'new',
        priority: 'normal',
        userId: job.posterId,
        metadata: JSON.stringify({ type: 'federated_job_application', jobId, applicationId: application.id }),
      },
    });

    return NextResponse.json(
      {
        applicationId: application.id,
        status: 'pending',
        message: 'Application received and forwarded to job poster',
      },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (error: any) {
    console.error('POST /api/federation/jobs/apply error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process application' }, { status: 500, headers: CORS_HEADERS });
  }
}
