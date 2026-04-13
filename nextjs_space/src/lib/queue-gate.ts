/**
 * Queue Gating System
 * 
 * Before a task enters the queue, checks if the user has:
 * 1. An installed marketplace agent that handles the task type
 * 2. An active capability that covers the task domain
 * 3. A built-in agent capability (email, meetings) that applies
 * 
 * If none match, returns a "no_handler" result with smart marketplace suggestions.
 */

import { prisma } from '@/lib/prisma';

export interface GateCheckResult {
  allowed: boolean;
  handler?: {
    type: 'agent' | 'capability' | 'builtin';
    id: string;
    name: string;
  };
  suggestions?: MarketplaceSuggestion[];
  reason?: string;
}

export interface MarketplaceSuggestion {
  type: 'agent' | 'capability';
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  pricingModel: string;
  price?: number | null;
  installed?: boolean;
  relevanceScore: number; // 0-1
}

/**
 * Check if a user can handle a task before it enters the queue.
 * Returns allowed:true if any handler exists, or allowed:false with suggestions.
 */
export async function checkQueueGate(
  userId: string,
  taskTitle: string,
  taskDescription?: string | null,
  taskType?: string | null
): Promise<GateCheckResult> {
  const searchText = `${taskTitle} ${taskDescription || ''} ${taskType || ''}`.toLowerCase();

  // ── 1. Check installed marketplace agents ────────────────────────────────
  const installedAgents = await prisma.marketplaceSubscription.findMany({
    where: { userId, status: 'active', installed: true },
    include: {
      agent: {
        select: { id: true, name: true, taskTypes: true, category: true, tags: true, description: true },
      },
    },
  });

  for (const sub of installedAgents) {
    const agent = sub.agent;
    if (agentMatchesTask(agent, searchText)) {
      return {
        allowed: true,
        handler: { type: 'agent', id: agent.id, name: agent.name },
      };
    }
  }

  // ── 2. Check active user capabilities ────────────────────────────────────
  const userCaps = await prisma.userCapability.findMany({
    where: { userId, status: 'active' },
    include: {
      capability: {
        select: { id: true, name: true, category: true, tags: true, description: true, icon: true, integrationType: true },
      },
    },
  });

  for (const uc of userCaps) {
    const cap = uc.capability;
    if (capabilityMatchesTask(cap, searchText)) {
      return {
        allowed: true,
        handler: { type: 'capability', id: cap.id, name: cap.name },
      };
    }
  }

  // ── 3. Check built-in agent capabilities (email, meetings) ──────────────
  const builtinCaps = await prisma.agentCapability.findMany({
    where: { userId, status: 'enabled' },
    select: { id: true, type: true, name: true },
  });

  for (const bc of builtinCaps) {
    if (builtinMatchesTask(bc, searchText)) {
      return {
        allowed: true,
        handler: { type: 'builtin', id: bc.id, name: bc.name },
      };
    }
  }

  // ── 4. No handler found — search marketplace for suggestions ────────────
  const suggestions = await searchMarketplaceSuggestions(userId, searchText);

  return {
    allowed: false,
    reason: 'No installed agent or capability can handle this task.',
    suggestions,
  };
}

/**
 * Search marketplace for agents + capabilities matching a task description.
 * Returns ranked suggestions.
 */
export async function searchMarketplaceSuggestions(
  userId: string,
  searchText: string,
  limit: number = 6
): Promise<MarketplaceSuggestion[]> {
  const keywords = extractKeywords(searchText);
  const suggestions: MarketplaceSuggestion[] = [];

  // Get user's already-installed IDs to mark them
  const [installedAgentIds, installedCapIds] = await Promise.all([
    prisma.marketplaceSubscription.findMany({
      where: { userId, status: 'active' },
      select: { agentId: true },
    }).then(subs => new Set(subs.map(s => s.agentId))),
    prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      select: { capabilityId: true },
    }).then(ucs => new Set(ucs.map(uc => uc.capabilityId))),
  ]);

  // Search marketplace agents
  const agents = await prisma.marketplaceAgent.findMany({
    where: { status: 'active' },
    select: {
      id: true, name: true, description: true, category: true,
      tags: true, taskTypes: true, pricingModel: true,
      pricePerTask: true, subscriptionPrice: true, featured: true,
    },
    take: 50,
  });

  for (const agent of agents) {
    const score = scoreRelevance(agent, keywords, searchText);
    if (score > 0.15) {
      suggestions.push({
        type: 'agent',
        id: agent.id,
        name: agent.name,
        description: agent.description.substring(0, 150),
        category: agent.category,
        pricingModel: agent.pricingModel,
        price: agent.pricingModel === 'per_task' ? agent.pricePerTask : agent.subscriptionPrice,
        installed: installedAgentIds.has(agent.id),
        relevanceScore: score,
      });
    }
  }

  // Search marketplace capabilities
  const capabilities = await prisma.marketplaceCapability.findMany({
    where: { status: 'active' },
    select: {
      id: true, name: true, description: true, icon: true,
      category: true, tags: true, integrationType: true,
      pricingModel: true, price: true, featured: true,
    },
    take: 50,
  });

  for (const cap of capabilities) {
    const score = scoreRelevance(cap, keywords, searchText);
    if (score > 0.15) {
      suggestions.push({
        type: 'capability',
        id: cap.id,
        name: cap.name,
        description: cap.description.substring(0, 150),
        icon: cap.icon,
        category: cap.category,
        pricingModel: cap.pricingModel,
        price: cap.price,
        installed: installedCapIds.has(cap.id),
        relevanceScore: score,
      });
    }
  }

  // Sort by relevance and return top N
  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// ── Matching Helpers ──────────────────────────────────────────────────────────

function agentMatchesTask(agent: any, searchText: string): boolean {
  // Check taskTypes JSON array
  if (agent.taskTypes) {
    try {
      const types = JSON.parse(agent.taskTypes) as string[];
      if (types.some((t: string) => searchText.includes(t.toLowerCase()))) return true;
    } catch {}
  }
  // Check category and tags
  if (searchText.includes(agent.category.toLowerCase())) return true;
  if (agent.tags) {
    try {
      const tags = JSON.parse(agent.tags) as string[];
      if (tags.some((t: string) => searchText.includes(t.toLowerCase()))) return true;
    } catch {}
  }
  // Check name fuzzy match
  const nameWords = agent.name.toLowerCase().split(/\s+/);
  if (nameWords.some((w: string) => w.length > 3 && searchText.includes(w))) return true;
  return false;
}

function capabilityMatchesTask(cap: any, searchText: string): boolean {
  // Check category
  if (searchText.includes(cap.category.toLowerCase())) return true;
  // Check integration type
  if (cap.integrationType && searchText.includes(cap.integrationType.toLowerCase())) return true;
  // Check tags
  if (cap.tags) {
    try {
      const tags = JSON.parse(cap.tags) as string[];
      if (tags.some((t: string) => searchText.includes(t.toLowerCase()))) return true;
    } catch {}
  }
  // Check name fuzzy match
  const nameWords = cap.name.toLowerCase().split(/\s+/);
  if (nameWords.some((w: string) => w.length > 3 && searchText.includes(w))) return true;
  // Check description keywords
  const descWords = cap.description.toLowerCase().split(/\s+/);
  const searchWords = searchText.split(/\s+/);
  const overlap = searchWords.filter((w: string) => w.length > 4 && descWords.includes(w));
  if (overlap.length >= 2) return true;
  return false;
}

function builtinMatchesTask(cap: { type: string; name: string }, searchText: string): boolean {
  const emailKeywords = ['email', 'send', 'reply', 'draft', 'inbox', 'message', 'mail', 'compose'];
  const meetingKeywords = ['meeting', 'schedule', 'calendar', 'book', 'appointment', 'call'];

  if (cap.type === 'email' && emailKeywords.some(k => searchText.includes(k))) return true;
  if (cap.type === 'meetings' && meetingKeywords.some(k => searchText.includes(k))) return true;
  return false;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'up', 'out',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'i', 'me', 'we', 'you', 'he', 'she', 'it', 'they', 'them', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'only', 'own', 'same', 'get', 'make', 'need', 'want', 'help',
    'task', 'please', 'need', 'want']);

  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function scoreRelevance(item: any, keywords: string[], fullText: string): number {
  let score = 0;
  const itemText = [
    item.name || '',
    item.description || '',
    item.category || '',
    item.tags || '',
    item.taskTypes || '',
    item.integrationType || '',
  ].join(' ').toLowerCase();

  // Keyword overlap
  const matchedKeywords = keywords.filter(k => itemText.includes(k));
  score += matchedKeywords.length * 0.15;

  // Category boost
  if (fullText.includes((item.category || '').toLowerCase())) score += 0.2;

  // Featured boost
  if (item.featured) score += 0.1;

  // Integration type match
  if (item.integrationType && fullText.includes(item.integrationType.toLowerCase())) score += 0.25;

  // Name word match
  const nameWords = (item.name || '').toLowerCase().split(/\s+/);
  const nameMatches = nameWords.filter((w: string) => w.length > 3 && fullText.includes(w));
  score += nameMatches.length * 0.2;

  return Math.min(score, 1);
}
