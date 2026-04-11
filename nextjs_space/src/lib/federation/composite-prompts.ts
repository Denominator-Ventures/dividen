/**
 * FVP Brief Proposal #13: Composite Cross-Instance Prompts
 *
 * Network Briefing Aggregation — Divi can query connected instances
 * for contextual intelligence and compose a unified network briefing.
 *
 * Use cases:
 * - "What's happening across my network?" — aggregate activity from all connections
 * - "Who in my network knows about X?" — cross-instance expertise query
 * - "Network pulse" — morning briefing with network-wide signals
 */

import { prisma } from '../prisma';

export interface NetworkBriefingSource {
  instanceId: string;
  instanceName: string;
  connectionId: string;
  data: {
    activeJobs?: Array<{ title: string; urgency: string }>;
    recentActivity?: Array<{ type: string; summary: string; timestamp: string }>;
    availableExpertise?: string[];
    openRequests?: number;
    networkHealth?: 'active' | 'moderate' | 'quiet';
  };
}

export interface NetworkBriefing {
  generatedAt: string;
  instanceCount: number;
  sources: NetworkBriefingSource[];
  summary: {
    totalActiveJobs: number;
    totalOpenRequests: number;
    networkHealth: string;
    topExpertise: string[];
    urgentItems: Array<{ source: string; item: string }>;
  };
  digest: string; // Human-readable digest for system prompt injection
}

/**
 * Generate this instance's contribution to a network briefing.
 * This is what gets shared when another instance asks for our status.
 */
export async function generateLocalBriefingContribution(userId: string): Promise<NetworkBriefingSource['data']> {
  // Active jobs
  const jobs = await prisma.networkJob.findMany({
    where: { posterId: userId, status: 'open' },
    select: { title: true, urgency: true },
    take: 5,
  });

  // Recent activity (last 48h)
  const recentRelays = await prisma.agentRelay.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    select: { type: true, subject: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Profile expertise
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { skills: true, capacity: true },
  });
  let skills: string[] = [];
  try { skills = JSON.parse(profile?.skills || '[]'); } catch {}

  // Open relay requests
  const openRequests = await prisma.agentRelay.count({
    where: { toUserId: userId, status: 'pending', type: 'request' },
  });

  // Determine health based on activity
  const health = recentRelays.length >= 5 ? 'active' : recentRelays.length >= 1 ? 'moderate' : 'quiet';

  return {
    activeJobs: jobs.map(j => ({ title: j.title, urgency: j.urgency || 'normal' })),
    recentActivity: recentRelays.map(r => ({
      type: r.type,
      summary: r.subject || 'Relay activity',
      timestamp: r.createdAt.toISOString(),
    })),
    availableExpertise: skills,
    openRequests,
    networkHealth: health as 'active' | 'moderate' | 'quiet',
  };
}

/**
 * Compile a full network briefing from local data + federation sources.
 * In practice, the agent calls this and it queries connected instances.
 */
export async function compileNetworkBriefing(userId: string): Promise<NetworkBriefing> {
  const now = new Date();
  const sources: NetworkBriefingSource[] = [];

  // 1. Local contribution
  const localData = await generateLocalBriefingContribution(userId);
  sources.push({
    instanceId: process.env.NEXTAUTH_URL || 'local',
    instanceName: 'This instance',
    connectionId: 'local',
    data: localData,
  });

  // 2. Query connected instances (federation peers)
  const connections = await prisma.connection.findMany({
    where: {
      status: 'active',
      OR: [{ requesterId: userId }, { accepterId: userId }],
      peerInstanceUrl: { not: null },
    },
    select: {
      id: true,
      peerInstanceUrl: true,
      peerUserName: true,
      permissions: true,
    },
    take: 10,
  });

  for (const conn of connections) {
    if (!conn.peerInstanceUrl) continue;

    let trustLevel = 'restricted';
    try { trustLevel = JSON.parse(conn.permissions || '{}').trustLevel || 'restricted'; } catch {}
    if (trustLevel === 'restricted') continue; // Only query trusted peers

    try {
      const url = `${conn.peerInstanceUrl.replace(/\/$/, '')}/api/federation/briefing`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id, requestType: 'network_briefing' }),
        signal: AbortSignal.timeout(5000),
      });

      if (resp.ok) {
        const data = await resp.json();
        sources.push({
          instanceId: conn.peerInstanceUrl,
          instanceName: conn.peerUserName || 'Connected instance',
          connectionId: conn.id,
          data: data.contribution || {},
        });
      }
    } catch {
      // Federation peer unreachable — skip silently
    }
  }

  // 3. Compile summary
  let totalActiveJobs = 0;
  let totalOpenRequests = 0;
  const allExpertise: string[] = [];
  const urgentItems: Array<{ source: string; item: string }> = [];
  const healthScores: string[] = [];

  for (const src of sources) {
    totalActiveJobs += src.data.activeJobs?.length || 0;
    totalOpenRequests += src.data.openRequests || 0;
    if (src.data.availableExpertise) allExpertise.push(...src.data.availableExpertise);
    if (src.data.networkHealth) healthScores.push(src.data.networkHealth);

    for (const job of src.data.activeJobs || []) {
      if (job.urgency === 'critical' || job.urgency === 'high') {
        urgentItems.push({ source: src.instanceName, item: job.title });
      }
    }
  }

  // Top expertise by frequency
  const expertiseCount: Record<string, number> = {};
  for (const e of allExpertise) { expertiseCount[e.toLowerCase()] = (expertiseCount[e.toLowerCase()] || 0) + 1; }
  const topExpertise = Object.entries(expertiseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);

  const overallHealth = healthScores.includes('active') ? 'Active' :
    healthScores.includes('moderate') ? 'Moderate' : 'Quiet';

  // 4. Generate digest
  let digest = `## 🌐 Network Pulse — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}\n\n`;
  digest += `**${sources.length} instance${sources.length > 1 ? 's' : ''} reporting** | Health: ${overallHealth} | `;
  digest += `${totalActiveJobs} active jobs | ${totalOpenRequests} open requests\n\n`;

  if (urgentItems.length > 0) {
    digest += `### ⚡ Urgent\n`;
    for (const item of urgentItems) {
      digest += `- **${item.source}**: ${item.item}\n`;
    }
    digest += '\n';
  }

  if (topExpertise.length > 0) {
    digest += `### 🧠 Network Expertise: ${topExpertise.slice(0, 5).join(', ')}\n\n`;
  }

  return {
    generatedAt: now.toISOString(),
    instanceCount: sources.length,
    sources,
    summary: {
      totalActiveJobs,
      totalOpenRequests,
      networkHealth: overallHealth,
      topExpertise,
      urgentItems,
    },
    digest,
  };
}
