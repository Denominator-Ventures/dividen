/**
 * FVP Brief Proposal #12: Graph Topology Matching (Serendipity Engine)
 *
 * Finds structural similarities between connection graphs across instances.
 * The goal: surface "you should meet X" recommendations based on graph
 * patterns, not just profile keywords.
 *
 * Algorithms:
 * 1. Structural hole detection — find people who bridge disconnected clusters
 * 2. Triadic closure — suggest connections that would complete triangles
 * 3. Interest cluster overlap — find people with similar network topology
 * 4. Complementary expertise — find people whose network fills your gaps
 */

import { prisma } from '../prisma';

export interface GraphNode {
  id: string;
  name: string;
  type: 'user' | 'contact' | 'connection';
  skills: string[];
  industries: string[];
  connections: string[]; // IDs of connected nodes
}

export interface SerendipityMatch {
  targetId: string;
  targetName: string;
  matchType: 'triadic_closure' | 'structural_bridge' | 'cluster_overlap' | 'complementary_expertise';
  score: number; // 0-100
  reason: string;
  sharedConnections: string[];
  suggestedIntro?: string;
}

/**
 * Build the local user's connection graph.
 * Includes direct connections and their known connections (2-hop).
 */
export async function buildLocalGraph(userId: string): Promise<Map<string, GraphNode>> {
  const graph = new Map<string, GraphNode>();

  // Get user's profile
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const userSkills: string[] = [];
  const userIndustries: string[] = [];
  try { userSkills.push(...JSON.parse(profile?.skills || '[]')); } catch {}
  if (profile?.industry) userIndustries.push(profile.industry);

  // Get all active connections
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

  // Build user node
  const userConnIds = connections.map((c: any) => c.requesterId === userId ? (c.accepterId || c.id) : c.requesterId);
  graph.set(userId, {
    id: userId,
    name: profile?.headline || 'Self',
    type: 'user',
    skills: userSkills,
    industries: userIndustries,
    connections: userConnIds,
  });

  // Build peer nodes
  for (const conn of connections) {
    const peer = conn.requesterId === userId ? conn.accepter : conn.requester;
    const peerId = peer?.id || conn.id;
    const peerName = conn.peerUserName || peer?.name || 'Unknown';

    if (!graph.has(peerId)) {
      let peerSkills: string[] = [];
      let peerIndustries: string[] = [];

      if (peer?.id) {
        const peerProfile = await prisma.userProfile.findUnique({ where: { userId: peer.id } });
        try { peerSkills = JSON.parse(peerProfile?.skills || '[]'); } catch {}
        if (peerProfile?.industry) peerIndustries.push(peerProfile.industry);
      }

      graph.set(peerId, {
        id: peerId,
        name: peerName,
        type: 'connection',
        skills: peerSkills,
        industries: peerIndustries,
        connections: [userId], // At minimum connected to the user
      });
    }
  }

  // Also include contacts as lightweight nodes
  const contacts = await prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true, email: true, company: true, tags: true },
    take: 100,
  });

  for (const contact of contacts) {
    if (!graph.has(contact.id)) {
      let tags: string[] = [];
      try { tags = JSON.parse(contact.tags || '[]'); } catch {}
      graph.set(contact.id, {
        id: contact.id,
        name: contact.name || contact.email || 'Unknown',
        type: 'contact',
        skills: tags,
        industries: contact.company ? [contact.company] : [],
        connections: [userId],
      });
    }
  }

  return graph;
}

/**
 * Find serendipitous connection opportunities.
 * Analyzes the graph for structural patterns that suggest valuable introductions.
 */
export async function findSerendipityMatches(
  userId: string,
  maxResults = 5
): Promise<SerendipityMatch[]> {
  const graph = await buildLocalGraph(userId);
  const userNode = graph.get(userId);
  if (!userNode) return [];

  const matches: SerendipityMatch[] = [];
  const userConns = new Set(userNode.connections);

  // ── 1. Triadic Closure ─────────────────────────────────────────────
  // Find "friends of friends" not yet connected to user
  for (const connId of userNode.connections) {
    const connNode = graph.get(connId);
    if (!connNode) continue;

    for (const foafId of connNode.connections) {
      if (foafId === userId || userConns.has(foafId)) continue;
      const foafNode = graph.get(foafId);
      if (!foafNode) continue;

      // Count shared connections (mutual friends)
      const sharedConns = foafNode.connections.filter(id => userConns.has(id));
      if (sharedConns.length < 1) continue;

      const score = Math.min(100, 30 + (sharedConns.length * 20));
      const sharedNames = sharedConns
        .map(id => graph.get(id)?.name || 'unknown')
        .slice(0, 3);

      matches.push({
        targetId: foafId,
        targetName: foafNode.name,
        matchType: 'triadic_closure',
        score,
        reason: `${sharedConns.length} mutual connection${sharedConns.length > 1 ? 's' : ''}: ${sharedNames.join(', ')}`,
        sharedConnections: sharedConns,
        suggestedIntro: `Ask ${sharedNames[0]} for an intro to ${foafNode.name}`,
      });
    }
  }

  // ── 2. Complementary Expertise ─────────────────────────────────────
  // Find connections whose skills complement (not duplicate) the user's
  const userSkillSet = new Set(userNode.skills.map(s => s.toLowerCase()));

  for (const [nodeId, node] of graph) {
    if (nodeId === userId || node.type === 'contact') continue;

    const nodeSkills = node.skills.map(s => s.toLowerCase());
    const overlapping = nodeSkills.filter(s => userSkillSet.has(s));
    const complementary = nodeSkills.filter(s => !userSkillSet.has(s));

    // Good match: some overlap (shared context) + significant complementary skills
    if (overlapping.length >= 1 && complementary.length >= 2) {
      const score = Math.min(100, 20 + (overlapping.length * 10) + (complementary.length * 15));

      // Only add if not already matched with higher score
      const existing = matches.find(m => m.targetId === nodeId);
      if (!existing || existing.score < score) {
        if (existing) matches.splice(matches.indexOf(existing), 1);
        matches.push({
          targetId: nodeId,
          targetName: node.name,
          matchType: 'complementary_expertise',
          score,
          reason: `Shared context in ${overlapping.join(', ')}; brings ${complementary.slice(0, 3).join(', ')}`,
          sharedConnections: overlapping,
        });
      }
    }
  }

  // ── 3. Structural Bridge Detection ─────────────────────────────────
  // Find nodes that connect otherwise disconnected parts of the graph
  for (const [nodeId, node] of graph) {
    if (nodeId === userId || node.connections.length < 2) continue;

    // Check if removing this node would disconnect any of its neighbors
    const neighborGroups = new Set<string>();
    for (const neighborId of node.connections) {
      const neighbor = graph.get(neighborId);
      if (!neighbor) continue;
      // Simple heuristic: if this neighbor only connects through this node, it's a bridge
      const altPaths = neighbor.connections.filter(id => id !== nodeId && node.connections.includes(id));
      neighborGroups.add(altPaths.length === 0 ? `isolated_${neighborId}` : 'connected');
    }

    const isolatedCount = [...neighborGroups].filter(g => g.startsWith('isolated_')).length;
    if (isolatedCount >= 2) {
      const score = Math.min(100, 40 + (isolatedCount * 15));
      const existing = matches.find(m => m.targetId === nodeId);
      if (!existing) {
        matches.push({
          targetId: nodeId,
          targetName: node.name,
          matchType: 'structural_bridge',
          score,
          reason: `Bridges ${isolatedCount} otherwise disconnected parts of your network`,
          sharedConnections: node.connections.filter(id => userConns.has(id)),
        });
      }
    }
  }

  // Sort by score descending and return top N
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Generate a graph topology summary for federation exchange.
 * Anonymized — no names, only structural data.
 */
export async function exportGraphTopology(userId: string): Promise<{
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  clusterCoefficient: number;
  skillDistribution: Record<string, number>;
  industryDistribution: Record<string, number>;
}> {
  const graph = await buildLocalGraph(userId);

  const nodes = [...graph.values()];
  const edgeCount = nodes.reduce((acc, n) => acc + n.connections.length, 0) / 2;
  const avgDegree = nodes.length > 0 ? edgeCount * 2 / nodes.length : 0;

  // Simple clustering coefficient approximation
  let totalClustering = 0;
  for (const node of nodes) {
    if (node.connections.length < 2) continue;
    let triangles = 0;
    const possibleTriangles = node.connections.length * (node.connections.length - 1) / 2;
    for (let i = 0; i < node.connections.length; i++) {
      for (let j = i + 1; j < node.connections.length; j++) {
        const ni = graph.get(node.connections[i]);
        if (ni?.connections.includes(node.connections[j])) triangles++;
      }
    }
    totalClustering += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
  }
  const clusterCoefficient = nodes.length > 0 ? totalClustering / nodes.length : 0;

  // Anonymized skill/industry distribution
  const skillDist: Record<string, number> = {};
  const industryDist: Record<string, number> = {};
  for (const node of nodes) {
    for (const s of node.skills) { skillDist[s.toLowerCase()] = (skillDist[s.toLowerCase()] || 0) + 1; }
    for (const i of node.industries) { industryDist[i.toLowerCase()] = (industryDist[i.toLowerCase()] || 0) + 1; }
  }

  return {
    nodeCount: nodes.length,
    edgeCount: Math.round(edgeCount),
    avgDegree: Math.round(avgDegree * 100) / 100,
    clusterCoefficient: Math.round(clusterCoefficient * 1000) / 1000,
    skillDistribution: skillDist,
    industryDistribution: industryDist,
  };
}