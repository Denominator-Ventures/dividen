/**
 * FVP Brief Proposal #14: Network-Level Task Routing Intelligence
 *
 * ML-lite routing engine that learns from past task outcomes to route
 * new tasks to the best-suited agent/instance in the network.
 *
 * Signals used for routing:
 * 1. Skill match (profile → task requirements)
 * 2. Past completion rate (historical task outcomes per agent)
 * 3. Current capacity (profile availability)
 * 4. Trust level (connection permissions)
 * 5. Reputation score (federated + local)
 * 6. Response latency (how quickly do they engage)
 * 7. Domain proximity (industry/expertise cluster overlap)
 *
 * This is NOT a neural network — it's a weighted scoring model that
 * improves as more data flows through the system.
 */

import { prisma } from '../prisma';

export interface RouteCandidate {
  id: string;         // Connection ID or user ID
  name: string;
  type: 'local_user' | 'connection' | 'federated_instance';
  score: number;      // 0-100 composite routing score
  breakdown: {
    skillMatch: number;
    completionRate: number;
    capacity: number;
    trustLevel: number;
    reputation: number;
    latency: number;
    domainProximity: number;
  };
  federationEndpoint?: string;
}

export interface RoutingDecision {
  taskDescription: string;
  candidates: RouteCandidate[];
  bestMatch: RouteCandidate | null;
  confidence: number;      // 0-1: how confident are we in the routing
  routingStrategy: 'direct' | 'broadcast' | 'auction';
  reasoning: string;
}

// Weights for each signal — these can be tuned over time
const ROUTING_WEIGHTS = {
  skillMatch: 0.30,
  completionRate: 0.20,
  capacity: 0.15,
  trustLevel: 0.10,
  reputation: 0.10,
  latency: 0.05,
  domainProximity: 0.10,
};

/**
 * Score a single candidate for a task.
 */
async function scoreCandidate(
  userId: string,
  candidateUserId: string | null,
  connectionId: string,
  taskSkills: string[],
  taskType: string | null,
  permissions: string | null
): Promise<RouteCandidate['breakdown']> {
  const breakdown = {
    skillMatch: 0,
    completionRate: 50, // Neutral default
    capacity: 50,
    trustLevel: 30,
    reputation: 50,
    latency: 50,
    domainProximity: 0,
  };

  if (!candidateUserId) return breakdown;

  // 1. Skill match
  const profile = await prisma.userProfile.findUnique({ where: { userId: candidateUserId } });
  if (profile) {
    let candidateSkills: string[] = [];
    try { candidateSkills = JSON.parse(profile.skills || '[]'); } catch {}
    const lowerCandidateSkills = candidateSkills.map(s => s.toLowerCase());

    if (taskSkills.length > 0) {
      const matches = taskSkills.filter(s =>
        lowerCandidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs))
      );
      breakdown.skillMatch = taskSkills.length > 0 ? Math.round((matches.length / taskSkills.length) * 100) : 0;
    }

    // Task type match
    let taskTypes: string[] = [];
    try { taskTypes = JSON.parse(profile.taskTypes || '[]'); } catch {}
    if (taskType && taskTypes.map(t => t.toLowerCase()).includes(taskType.toLowerCase())) {
      breakdown.skillMatch = Math.min(100, breakdown.skillMatch + 20);
    }

    // Capacity
    if (profile.capacity === 'available') breakdown.capacity = 90;
    else if (profile.capacity === 'busy') breakdown.capacity = 20;
    else if (profile.capacity === 'away') breakdown.capacity = 0;
    else breakdown.capacity = 50;

    // Domain proximity (industry overlap)
    const candidateIndustries: string[] = profile.industry ? [profile.industry] : [];
    const userProfile = await prisma.userProfile.findUnique({ where: { userId } });
    const userIndustries: string[] = userProfile?.industry ? [userProfile.industry] : [];
    const industryOverlap = candidateIndustries.filter(i =>
      userIndustries.some(ui => ui.toLowerCase() === i.toLowerCase())
    );
    breakdown.domainProximity = Math.min(100, industryOverlap.length * 40);
  }

  // 2. Completion rate — past relay outcomes
  const pastRelays = await prisma.agentRelay.findMany({
    where: {
      toUserId: candidateUserId,
      type: 'request',
      status: { in: ['completed', 'declined', 'expired'] },
    },
    select: { status: true },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  if (pastRelays.length >= 3) {
    const completed = pastRelays.filter((r: any) => r.status === 'completed').length;
    breakdown.completionRate = Math.round((completed / pastRelays.length) * 100);
  }

  // 3. Trust level
  let trustLevel = 'restricted';
  try { trustLevel = JSON.parse(permissions || '{}').trustLevel || 'restricted'; } catch {}
  if (trustLevel === 'full_auto') breakdown.trustLevel = 100;
  else if (trustLevel === 'supervised') breakdown.trustLevel = 60;
  else breakdown.trustLevel = 20;

  // 4. Reputation
  const rep = await prisma.reputationScore.findUnique({ where: { userId: candidateUserId } });
  if (rep) {
    breakdown.reputation = Math.min(100, Math.round(rep.score));
    // Boost for federated reputation
    if (rep.isFederated && rep.federatedScore > 0) {
      breakdown.reputation = Math.min(100, breakdown.reputation + Math.round(rep.federatedScore * 0.3));
    }
  }

  // 5. Latency — average response time for recent relays (use updatedAt as proxy for response time)
  const answeredRelays = await prisma.agentRelay.findMany({
    where: {
      toUserId: candidateUserId,
      status: 'completed',
    },
    select: { createdAt: true, updatedAt: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  if (answeredRelays.length >= 2) {
    const avgLatencyMs = answeredRelays.reduce((acc: any, r: any) => {
      return acc + (r.updatedAt.getTime() - r.createdAt.getTime());
    }, 0) / answeredRelays.length;
    const avgLatencyHours = avgLatencyMs / (1000 * 60 * 60);
    // Score: < 1hr = 100, < 4hr = 75, < 24hr = 50, < 72hr = 25, else = 10
    if (avgLatencyHours < 1) breakdown.latency = 100;
    else if (avgLatencyHours < 4) breakdown.latency = 75;
    else if (avgLatencyHours < 24) breakdown.latency = 50;
    else if (avgLatencyHours < 72) breakdown.latency = 25;
    else breakdown.latency = 10;
  }

  return breakdown;
}

/**
 * Route a task to the best candidate in the network.
 * Returns a ranked list of candidates with scoring breakdown.
 */
export async function routeTask(
  userId: string,
  taskDescription: string,
  taskSkills: string[] = [],
  taskType: string | null = null,
  maxCandidates = 5
): Promise<RoutingDecision> {
  // Get all active connections
  const connections = await prisma.connection.findMany({
    where: {
      status: 'active',
      OR: [{ requesterId: userId }, { accepterId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true } },
      accepter: { select: { id: true, name: true } },
    },
  });

  const candidates: RouteCandidate[] = [];

  for (const conn of connections) {
    const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
    const peerId = peer?.id || null;
    const peerName = conn.peerUserName || peer?.name || 'Unknown';
    if (peerId === userId) continue;

    const breakdown = await scoreCandidate(
      userId, peerId, conn.id, taskSkills, taskType, conn.permissions
    );

    // Compute weighted composite score
    const score = Math.round(
      breakdown.skillMatch * ROUTING_WEIGHTS.skillMatch +
      breakdown.completionRate * ROUTING_WEIGHTS.completionRate +
      breakdown.capacity * ROUTING_WEIGHTS.capacity +
      breakdown.trustLevel * ROUTING_WEIGHTS.trustLevel +
      breakdown.reputation * ROUTING_WEIGHTS.reputation +
      breakdown.latency * ROUTING_WEIGHTS.latency +
      breakdown.domainProximity * ROUTING_WEIGHTS.domainProximity
    );

    candidates.push({
      id: conn.id,
      name: peerName,
      type: conn.peerInstanceUrl ? 'federated_instance' : (peerId ? 'local_user' : 'connection'),
      score,
      breakdown,
      federationEndpoint: conn.peerInstanceUrl || undefined,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, maxCandidates);
  const bestMatch = topCandidates[0] || null;

  // Determine strategy based on confidence spread
  let confidence = 0;
  let strategy: 'direct' | 'broadcast' | 'auction' = 'broadcast';
  let reasoning = '';

  if (bestMatch) {
    confidence = bestMatch.score / 100;
    const secondBest = topCandidates[1];

    if (confidence >= 0.7 && (!secondBest || bestMatch.score - secondBest.score > 15)) {
      strategy = 'direct';
      reasoning = `High-confidence match: ${bestMatch.name} scores ${bestMatch.score}/100 with clear lead. Recommend direct assignment.`;
    } else if (confidence >= 0.4 && topCandidates.length >= 2) {
      strategy = 'auction';
      reasoning = `Multiple viable candidates (top ${topCandidates.length}). Recommend posting as opportunity and letting candidates self-select.`;
    } else {
      strategy = 'broadcast';
      reasoning = `No strong individual match. Recommend broadcasting to the network for wider discovery.`;
    }
  } else {
    reasoning = 'No active connections available for routing. Consider expanding the network.';
  }

  return {
    taskDescription,
    candidates: topCandidates,
    bestMatch,
    confidence,
    routingStrategy: strategy,
    reasoning,
  };
}

/**
 * Get routing intelligence summary for the system prompt.
 * Provides Divi with awareness of network routing capabilities.
 */
export async function getRoutingIntelligenceDigest(userId: string): Promise<string> {
  const connections = await prisma.connection.count({
    where: {
      status: 'active',
      OR: [{ requesterId: userId }, { accepterId: userId }],
    },
  });

  if (connections === 0) return '';

  // Count federated connections
  const federated = await prisma.connection.count({
    where: {
      status: 'active',
      OR: [{ requesterId: userId }, { accepterId: userId }],
      peerInstanceUrl: { not: null },
    },
  });

  // Recent routing outcomes
  const recentAssignments = await prisma.agentRelay.findMany({
    where: {
      fromUserId: userId,
      intent: 'assign_task',
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { status: true },
  });

  const completed = recentAssignments.filter((r: any) => r.status === 'completed').length;
  const total = recentAssignments.length;

  let digest = `\n### 📡 Routing Intelligence\n`;
  digest += `Network: ${connections} active connections (${federated} federated). `;
  if (total > 0) {
    digest += `Task routing success rate: ${Math.round((completed / total) * 100)}% (${completed}/${total} last 30d). `;
  }
  digest += `Use \`route_task\` to find the best person for any task. `;
  digest += `Strategy options: direct (high confidence), auction (competitive), broadcast (wide net).\n`;

  return digest;
}
