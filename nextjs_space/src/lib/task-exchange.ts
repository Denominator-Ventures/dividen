/**
 * FVP Brief Proposal #9: Agent-Initiated Task Exchange
 *
 * Enables agents to autonomously post, discover, and accept tasks
 * within trust boundaries. This sits on top of:
 * - Job Board (posting/browsing)
 * - Federation (cross-instance discovery)
 * - A2A Protocol (task coordination)
 * - Reputation (trust scoring)
 *
 * The key addition: automated matching + proposal flow.
 * When a job is posted, the engine automatically finds the best-suited
 * connections and proposes the match via relay.
 */

import { prisma } from './prisma';

interface TaskExchangeResult {
  jobId: string;
  proposalsCreated: number;
  proposedTo: Array<{ connectionId: string; name: string; matchScore: number }>;
}

/**
 * When a job is posted, automatically find matching connections
 * and send relay proposals to the best candidates.
 */
export async function autoProposeTasks(
  userId: string,
  jobId: string,
  maxProposals = 3
): Promise<TaskExchangeResult> {
  const job = await prisma.networkJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'open') {
    return { jobId, proposalsCreated: 0, proposedTo: [] };
  }

  // Parse required skills
  let requiredSkills: string[] = [];
  try { requiredSkills = JSON.parse(job.requiredSkills || '[]'); } catch {}

  // Find active connections with profiles
  const connections = await prisma.connection.findMany({
    where: {
      status: 'active',
      OR: [{ requesterId: userId }, { accepterId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      accepter: { select: { id: true, name: true, email: true } },
    },
  });

  const candidates: Array<{ connectionId: string; peerId: string | null; name: string; score: number }> = [];

  for (const conn of connections) {
    const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
    const peerId = peer?.id || null;
    const peerName = conn.peerUserName || peer?.name || 'Unknown';

    // Skip self-connections or connections to the poster
    if (peerId === userId) continue;

    // Check trust level
    let trustLevel = 'restricted';
    try { trustLevel = JSON.parse(conn.permissions || '{}').trustLevel || 'restricted'; } catch {}

    // Score the match
    let score = 0;

    // 1. Profile skill matching (if local user)
    if (peerId) {
      const profile = await prisma.userProfile.findUnique({ where: { userId: peerId } });
      if (profile) {
        const peerSkills: string[] = [];
        try { peerSkills.push(...JSON.parse(profile.skills || '[]')); } catch {}
        const peerTaskTypes: string[] = [];
        try { peerTaskTypes.push(...JSON.parse(profile.taskTypes || '[]')); } catch {}

        const skillOverlap = requiredSkills.filter(s =>
          peerSkills.some(ps => ps.toLowerCase().includes(s.toLowerCase()))
        );
        score += skillOverlap.length * 20;

        if (job.taskType && peerTaskTypes.includes(job.taskType)) {
          score += 15;
        }

        // Capacity check
        if (profile.capacity === 'available') score += 10;
        else if (profile.capacity === 'busy') score -= 5;
      }

      // 2. Reputation bonus
      const rep = await prisma.reputationScore.findUnique({ where: { userId: peerId } });
      if (rep) {
        score += Math.round(rep.score / 10); // 0-10 points from reputation
      }
    }

    // 3. Trust level bonus
    if (trustLevel === 'full_auto') score += 10;
    else if (trustLevel === 'supervised') score += 5;

    if (score > 0) {
      candidates.push({ connectionId: conn.id, peerId, name: peerName, score });
    }
  }

  // Sort by score descending and take top N
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, maxProposals);

  const proposedTo: Array<{ connectionId: string; name: string; matchScore: number }> = [];

  for (const candidate of topCandidates) {
    try {
      // Create a relay proposing the task
      await prisma.agentRelay.create({
        data: {
          connectionId: candidate.connectionId,
          fromUserId: userId,
          toUserId: candidate.peerId,
          direction: 'outbound',
          type: 'request',
          intent: 'assign_task',
          subject: `📨 Task opportunity: ${job.title}`,
          payload: JSON.stringify({
            type: 'task_exchange_proposal',
            jobId: job.id,
            title: job.title,
            description: job.description,
            taskType: job.taskType,
            urgency: job.urgency,
            compensation: job.compensation,
            estimatedHours: job.estimatedHours,
            matchScore: candidate.score,
            requiredSkills,
          }),
          status: 'pending',
          priority: job.urgency === 'critical' ? 'urgent' : 'normal',
          // v2.3.2 — scope the relay to the poster's project so downstream surfaces inherit context
          projectId: job.projectId || undefined,
        },
      });

      proposedTo.push({
        connectionId: candidate.connectionId,
        name: candidate.name,
        matchScore: candidate.score,
      });
    } catch (err: any) {
      console.error(`[task-exchange] Failed to propose to ${candidate.name}:`, err.message);
    }
  }

  return { jobId, proposalsCreated: proposedTo.length, proposedTo };
}
