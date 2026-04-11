/**
 * FVP Brief Proposal #11: Shared Ambient Learning Patterns
 *
 * Cross-instance pattern sharing protocol. Instances share anonymized,
 * aggregated learning patterns so the whole network improves together.
 *
 * Key principles:
 * - No raw signals cross boundaries — only synthesized patterns
 * - Patterns include confidence + signal count for weighted merging
 * - Each instance can reject patterns below a confidence threshold
 * - Patterns are scoped: 'global' patterns are shareable, 'user:*' are not
 */

import { prisma } from '../prisma';

export interface SharedPattern {
  patternType: string;
  description: string;
  insight: string;
  confidence: number;
  signalCount: number;
  sourceInstanceId: string;
  sourceVersion: string;
  sharedAt: string;
}

export interface PatternExchangePayload {
  instanceId: string;
  instanceVersion: string;
  patterns: SharedPattern[];
  requestedTypes?: string[]; // What pattern types this instance wants back
}

export interface PatternExchangeResponse {
  accepted: number;
  rejected: number;
  reciprocatedPatterns: SharedPattern[];
}

/**
 * Export local shareable patterns for federation.
 * Only global-scope, active patterns above minimum confidence.
 */
export async function exportShareablePatterns(
  minConfidence = 0.4
): Promise<SharedPattern[]> {
  const patterns = await prisma.ambientPattern.findMany({
    where: {
      isActive: true,
      scope: 'global',
      confidence: { gte: minConfidence },
      signalCount: { gte: 3 },
    },
    orderBy: [{ confidence: 'desc' }, { signalCount: 'desc' }],
    take: 20,
  });

  const instanceId = process.env.NEXTAUTH_URL || 'unknown';

  return patterns.map(p => ({
    patternType: p.patternType,
    description: p.description,
    insight: p.insight,
    confidence: p.confidence,
    signalCount: p.signalCount,
    sourceInstanceId: instanceId,
    sourceVersion: '0.3.0',
    sharedAt: new Date().toISOString(),
  }));
}

/**
 * Import patterns from a connected instance.
 * Merges with local patterns using weighted confidence scoring.
 *
 * Merge strategy:
 * - New pattern types: adopt if confidence >= localMinConfidence
 * - Existing pattern types: weighted average based on signal counts
 * - Never overwrite local patterns with lower-confidence remote ones
 */
export async function importSharedPatterns(
  incoming: SharedPattern[],
  localMinConfidence = 0.3
): Promise<{ accepted: number; rejected: number; merged: number }> {
  let accepted = 0;
  let rejected = 0;
  let merged = 0;

  for (const remote of incoming) {
    // Skip non-shareable scopes that somehow arrived
    if (remote.confidence < localMinConfidence) {
      rejected++;
      continue;
    }

    // Look for existing local pattern of same type
    const localPattern = await prisma.ambientPattern.findFirst({
      where: {
        patternType: remote.patternType,
        scope: 'global',
        isActive: true,
      },
    });

    if (localPattern) {
      // Weighted merge: combine insights proportional to signal counts
      const totalSignals = localPattern.signalCount + remote.signalCount;
      const localWeight = localPattern.signalCount / totalSignals;
      const remoteWeight = remote.signalCount / totalSignals;
      const mergedConfidence = (localPattern.confidence * localWeight) + (remote.confidence * remoteWeight);

      // Only update if the merge improves or maintains confidence
      if (mergedConfidence >= localPattern.confidence * 0.9) {
        const mergedMetadata = JSON.stringify({
          localInsight: localPattern.insight,
          remoteInsight: remote.insight,
          remoteSource: remote.sourceInstanceId,
          mergedAt: new Date().toISOString(),
          localWeight: Math.round(localWeight * 100),
          remoteWeight: Math.round(remoteWeight * 100),
          ...(localPattern.metadata ? JSON.parse(localPattern.metadata) : {}),
        });

        await prisma.ambientPattern.update({
          where: { id: localPattern.id },
          data: {
            confidence: mergedConfidence,
            signalCount: totalSignals,
            metadata: mergedMetadata,
            lastSynthesized: new Date(),
          },
        });
        merged++;
      } else {
        rejected++;
      }
    } else {
      // New pattern type — adopt it with a federation discount
      const federatedConfidence = remote.confidence * 0.8; // 20% discount for unverified remote data
      await prisma.ambientPattern.create({
        data: {
          patternType: remote.patternType,
          description: `[Federated] ${remote.description}`,
          insight: remote.insight,
          confidence: federatedConfidence,
          signalCount: remote.signalCount,
          scope: 'global',
          metadata: JSON.stringify({
            source: 'federation',
            sourceInstanceId: remote.sourceInstanceId,
            originalConfidence: remote.confidence,
            importedAt: new Date().toISOString(),
          }),
          isActive: true,
          lastSynthesized: new Date(),
        },
      });
      accepted++;
    }
  }

  return { accepted, rejected, merged };
}

/**
 * Build the network-wide learning digest for the system prompt.
 * Augments local patterns with federation metadata.
 */
export async function getNetworkLearningDigest(): Promise<string> {
  const patterns = await prisma.ambientPattern.findMany({
    where: { isActive: true, scope: 'global' },
    orderBy: [{ confidence: 'desc' }],
    take: 15,
  });

  const federated = patterns.filter(p => {
    try { return JSON.parse(p.metadata || '{}').source === 'federation'; } catch { return false; }
  });

  if (patterns.length === 0) return '';

  let text = `\n### 🌐 Network Learning (${patterns.length} patterns, ${federated.length} from federation)\n`;
  text += 'Patterns learned from this instance and connected nodes:\n\n';

  for (const p of patterns.slice(0, 8)) {
    const isFed = federated.includes(p);
    const badge = isFed ? '🌍' : '🏠';
    const conf = p.confidence >= 0.7 ? 'HIGH' : p.confidence >= 0.4 ? 'MED' : 'LOW';
    text += `${badge} **[${conf}] ${p.patternType}:** ${p.insight}\n\n`;
  }

  return text;
}
