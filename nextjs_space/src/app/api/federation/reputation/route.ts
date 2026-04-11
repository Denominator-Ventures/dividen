export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

/**
 * FVP Brief Proposal #7: Portable Reputation with Signed Attestations
 *
 * POST /api/federation/reputation — Receive reputation attestation from remote instance
 * GET  /api/federation/reputation?userId=xxx — Share reputation score with remote instance
 *
 * When an operator completes a federated job and receives a review:
 * 1. The review is stored on the job poster’s instance
 * 2. A signed reputation attestation is relayed to the worker’s instance (this endpoint)
 * 3. The worker’s ReputationScore is updated with the cross-instance endorsement
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-federation-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Generate HMAC signature for attestation verification
 */
function signAttestation(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function verifyAttestation(data: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(data).digest('hex');
  return expected === signature;
}

/**
 * GET — Share this user's reputation with a federated peer
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: CORS_HEADERS });
  }

  const reputation = await prisma.reputationScore.findUnique({ where: { userId } });
  if (!reputation) {
    return NextResponse.json({ error: 'No reputation record' }, { status: 404, headers: CORS_HEADERS });
  }

  const fedConfig = await prisma.federationConfig.findFirst();
  const instanceUrl = fedConfig?.instanceUrl || process.env.NEXTAUTH_URL || '';

  // Create a signed attestation
  const attestationData = JSON.stringify({
    userId,
    score: reputation.score,
    level: reputation.level,
    jobsCompleted: reputation.jobsCompleted,
    avgRating: reputation.avgRating,
    onTimeRate: reputation.onTimeRate,
    sourceInstance: instanceUrl,
    timestamp: new Date().toISOString(),
  });
  const signature = signAttestation(attestationData, federationToken);

  return NextResponse.json(
    {
      attestation: JSON.parse(attestationData),
      signature,
      signatureMethod: 'hmac-sha256',
      signatureKey: 'federation-token',
    },
    { headers: CORS_HEADERS },
  );
}

/**
 * POST — Receive reputation attestation from a remote instance
 */
export async function POST(req: NextRequest) {
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

  const { attestation, signature, targetUserId } = body;

  if (!attestation || !signature || !targetUserId) {
    return NextResponse.json({ error: 'attestation, signature, and targetUserId required' }, { status: 400, headers: CORS_HEADERS });
  }

  // Verify the signature
  const attestationStr = JSON.stringify(attestation);
  if (!verifyAttestation(attestationStr, signature, federationToken)) {
    return NextResponse.json({ error: 'Invalid attestation signature' }, { status: 403, headers: CORS_HEADERS });
  }

  // Verify targetUserId belongs to this instance
  const localUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!localUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404, headers: CORS_HEADERS });
  }

  // Upsert reputation score with the endorsement
  const existing = await prisma.reputationScore.findUnique({ where: { userId: targetUserId } });
  const existingEndorsements: any[] = existing?.endorsements ? (() => {
    try { return JSON.parse(existing.endorsements!); } catch { return []; }
  })() : [];

  // Add the new endorsement
  const endorsement = {
    ...attestation,
    signature,
    receivedAt: new Date().toISOString(),
    fromInstance: connection.peerInstanceUrl || 'unknown',
  };
  existingEndorsements.push(endorsement);

  // Compute federated score: average of local score and endorsed scores
  const endorsedScores = existingEndorsements
    .filter(e => typeof e.score === 'number')
    .map(e => e.score as number);
  const localScore = existing?.score || 0;
  const avgEndorsed = endorsedScores.length > 0
    ? endorsedScores.reduce((a, b) => a + b, 0) / endorsedScores.length
    : 0;
  const federatedScore = endorsedScores.length > 0
    ? localScore * 0.7 + avgEndorsed * 0.3
    : localScore;

  await prisma.reputationScore.upsert({
    where: { userId: targetUserId },
    update: {
      isFederated: true,
      endorsements: JSON.stringify(existingEndorsements),
      federatedScore,
    },
    create: {
      userId: targetUserId,
      isFederated: true,
      endorsements: JSON.stringify(existingEndorsements),
      federatedScore,
    },
  });

  return NextResponse.json(
    {
      accepted: true,
      endorsementCount: existingEndorsements.length,
      federatedScore,
    },
    { status: 200, headers: CORS_HEADERS },
  );
}
