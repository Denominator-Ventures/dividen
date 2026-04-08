/**
 * DiviDen Ambient Relay Learning Engine
 * 
 * Captures outcome signals from every ambient relay and synthesizes
 * cross-user patterns that feed back into the system prompt.
 * 
 * The loop:
 * 1. Signal Capture — every relay_respond on an ambient relay logs metrics
 * 2. Pattern Synthesis — aggregate signals into actionable patterns
 * 3. Prompt Injection — feed learned patterns into Layer 17 system prompt
 * 
 * This is how the ambient protocol gets better over time:
 * less disruptive, more pointed, perfected timing.
 */

import { prisma } from './prisma';

// ─── Signal Capture ──────────────────────────────────────────────────────────

export interface AmbientSignalInput {
  relayId: string;
  fromUserId: string;
  toUserId: string | null;
  relayCreatedAt: Date;
  outcome: 'answered' | 'declined' | 'ignored' | 'deferred';
  responseQuality?: 'substantive' | 'brief' | 'dismissive' | null;
  disruptionLevel?: 'seamless' | 'noticed' | 'disruptive' | null;
  topicRelevance?: 'on_topic' | 'adjacent' | 'forced' | null;
  ambientTopic?: string | null;
  conversationTopic?: string | null;
  questionPhrasing?: string | null;
  userFeedback?: string | null;
}

/**
 * Capture an outcome signal from an ambient relay.
 * Called when relay_respond completes on a relay with _ambient flag.
 */
export async function captureAmbientSignal(input: AmbientSignalInput) {
  const now = new Date();
  const latencyMinutes = Math.round((now.getTime() - input.relayCreatedAt.getTime()) / (1000 * 60));

  // Get recipient's timezone for hour/day tracking
  let hourOfDay: number | null = null;
  let dayOfWeek: number | null = null;
  if (input.toUserId) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: input.toUserId },
      select: { timezone: true },
    });
    if (profile?.timezone) {
      try {
        const recipientTime = new Date(now.toLocaleString('en-US', { timeZone: profile.timezone }));
        hourOfDay = recipientTime.getHours();
        dayOfWeek = recipientTime.getDay();
      } catch {
        hourOfDay = now.getUTCHours();
        dayOfWeek = now.getUTCDay();
      }
    } else {
      hourOfDay = now.getUTCHours();
      dayOfWeek = now.getUTCDay();
    }
  }

  return prisma.ambientRelaySignal.create({
    data: {
      relayId: input.relayId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      relayCreatedAt: input.relayCreatedAt,
      wovenAt: input.outcome === 'answered' ? now : null,
      respondedAt: input.outcome === 'answered' ? now : null,
      latencyMinutes,
      responseMinutes: null, // Will be set separately if we track weaving vs responding separately
      outcome: input.outcome,
      responseQuality: input.responseQuality || null,
      disruptionLevel: input.disruptionLevel || null,
      topicRelevance: input.topicRelevance || null,
      ambientTopic: input.ambientTopic || null,
      conversationTopic: input.conversationTopic || null,
      questionPhrasing: input.questionPhrasing || null,
      dayOfWeek,
      hourOfDay,
      userFeedback: input.userFeedback || null,
    },
  });
}

// ─── Pattern Synthesis ───────────────────────────────────────────────────────

interface SynthesizedPattern {
  patternType: string;
  description: string;
  insight: string;
  confidence: number;
  signalCount: number;
  scope: string;
  metadata: Record<string, any>;
}

/**
 * Synthesize cross-user patterns from accumulated ambient relay signals.
 * Run periodically or after significant signal accumulation.
 */
export async function synthesizePatterns(): Promise<SynthesizedPattern[]> {
  const patterns: SynthesizedPattern[] = [];

  // Fetch all signals from last 30 days for global patterns
  const recentSignals = await prisma.ambientRelaySignal.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentSignals.length < 3) {
    return patterns; // Not enough data to synthesize
  }

  const totalSignals = recentSignals.length;
  const answered = recentSignals.filter(s => s.outcome === 'answered');
  const declined = recentSignals.filter(s => s.outcome === 'declined');
  const ignored = recentSignals.filter(s => s.outcome === 'ignored');

  // ── 1. Overall Response Rate Pattern ──────────────────────────────────
  const responseRate = answered.length / totalSignals;
  patterns.push({
    patternType: 'general',
    description: `Ambient relay response rate: ${(responseRate * 100).toFixed(0)}% (${answered.length}/${totalSignals})`,
    insight: responseRate >= 0.7
      ? 'Ambient relays are working well — most questions get answered. Continue current approach.'
      : responseRate >= 0.4
        ? 'Ambient relays have moderate success. Consider being more selective about when to use them — focus on topics where the recipient has demonstrated expertise.'
        : 'Ambient relays are frequently ignored or declined. Reserve them for high-confidence topic matches and avoid sending too many.',
    confidence: Math.min(0.9, 0.3 + (totalSignals / 50)),
    signalCount: totalSignals,
    scope: 'global',
    metadata: { responseRate, answered: answered.length, declined: declined.length, ignored: ignored.length, total: totalSignals },
  });

  // ── 2. Timing Patterns ───────────────────────────────────────────────
  const answeredWithHour = answered.filter(s => s.hourOfDay !== null);
  if (answeredWithHour.length >= 3) {
    const hourBuckets: Record<string, { answered: number; total: number }> = {};
    for (const s of recentSignals.filter(s => s.hourOfDay !== null)) {
      const bucket = s.hourOfDay! < 9 ? 'early_morning' :
        s.hourOfDay! < 12 ? 'morning' :
        s.hourOfDay! < 14 ? 'midday' :
        s.hourOfDay! < 17 ? 'afternoon' :
        s.hourOfDay! < 21 ? 'evening' : 'night';
      if (!hourBuckets[bucket]) hourBuckets[bucket] = { answered: 0, total: 0 };
      hourBuckets[bucket].total++;
      if (s.outcome === 'answered') hourBuckets[bucket].answered++;
    }

    const bestPeriod = Object.entries(hourBuckets)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (b[1].answered / b[1].total) - (a[1].answered / a[1].total))[0];
    const worstPeriod = Object.entries(hourBuckets)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (a[1].answered / a[1].total) - (b[1].answered / b[1].total))[0];

    if (bestPeriod && worstPeriod && bestPeriod[0] !== worstPeriod[0]) {
      const periodLabels: Record<string, string> = {
        early_morning: 'early morning (before 9am)',
        morning: 'morning (9am-12pm)',
        midday: 'midday (12-2pm)',
        afternoon: 'afternoon (2-5pm)',
        evening: 'evening (5-9pm)',
        night: 'night (after 9pm)',
      };
      patterns.push({
        patternType: 'timing',
        description: `Best time for ambient relays: ${periodLabels[bestPeriod[0]]} (${((bestPeriod[1].answered / bestPeriod[1].total) * 100).toFixed(0)}% success). Worst: ${periodLabels[worstPeriod[0]]} (${((worstPeriod[1].answered / worstPeriod[1].total) * 100).toFixed(0)}% success).`,
        insight: `Prefer weaving ambient questions during ${periodLabels[bestPeriod[0]]} when users are most receptive. Avoid ${periodLabels[worstPeriod[0]]} — questions are more likely to be ignored or feel disruptive.`,
        confidence: Math.min(0.85, 0.3 + (answeredWithHour.length / 30)),
        signalCount: answeredWithHour.length,
        scope: 'global',
        metadata: { hourBuckets, bestPeriod: bestPeriod[0], worstPeriod: worstPeriod[0] },
      });
    }
  }

  // ── 3. Latency Patterns ──────────────────────────────────────────────
  const answeredWithLatency = answered.filter(s => s.latencyMinutes !== null);
  if (answeredWithLatency.length >= 3) {
    const latencies = answeredWithLatency.map(s => s.latencyMinutes!);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const medianLatency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];

    // Check if faster responses correlate with better quality
    const quickResponses = answeredWithLatency.filter(s => s.latencyMinutes! <= medianLatency);
    const slowResponses = answeredWithLatency.filter(s => s.latencyMinutes! > medianLatency);
    const quickSubstantive = quickResponses.filter(s => s.responseQuality === 'substantive').length;
    const slowSubstantive = slowResponses.filter(s => s.responseQuality === 'substantive').length;

    patterns.push({
      patternType: 'timing',
      description: `Average time to weave ambient question: ${avgLatency.toFixed(0)} minutes (median: ${medianLatency} min)`,
      insight: avgLatency > 120
        ? 'Ambient questions are taking a while to get woven in — this is actually good. It means agents are waiting for natural moments rather than forcing the question. Don\'t rush.'
        : avgLatency > 30
          ? 'Good pacing. Ambient questions are being woven in within a reasonable window. Maintain this timing.'
          : 'Questions are being woven in very quickly — make sure they\'re finding natural conversation moments rather than being injected too eagerly.',
      confidence: Math.min(0.8, 0.3 + (answeredWithLatency.length / 20)),
      signalCount: answeredWithLatency.length,
      scope: 'global',
      metadata: { avgLatency, medianLatency, quickSubstantive, slowSubstantive },
    });
  }

  // ── 4. Disruption Level Pattern ──────────────────────────────────────
  const withDisruption = recentSignals.filter(s => s.disruptionLevel);
  if (withDisruption.length >= 3) {
    const seamless = withDisruption.filter(s => s.disruptionLevel === 'seamless').length;
    const noticed = withDisruption.filter(s => s.disruptionLevel === 'noticed').length;
    const disruptive = withDisruption.filter(s => s.disruptionLevel === 'disruptive').length;
    const seamlessRate = seamless / withDisruption.length;

    patterns.push({
      patternType: 'phrasing',
      description: `Disruption profile: ${(seamlessRate * 100).toFixed(0)}% seamless, ${((noticed / withDisruption.length) * 100).toFixed(0)}% noticed, ${((disruptive / withDisruption.length) * 100).toFixed(0)}% disruptive`,
      insight: disruptive > seamless
        ? 'Too many ambient questions are feeling disruptive. CRITICAL: Wait longer for natural topic alignment. Ask as part of a broader point, not as a standalone question. Frame as curiosity, not a request.'
        : seamlessRate > 0.6
          ? 'Most ambient questions land seamlessly — the phrasing and timing approach is working well. Keep framing questions as natural curiosity within the flow of conversation.'
          : 'Mixed results. Focus on waiting for the conversation to naturally touch the topic before weaving in the question. When in doubt, defer — better to skip than disrupt.',
      confidence: Math.min(0.85, 0.3 + (withDisruption.length / 20)),
      signalCount: withDisruption.length,
      scope: 'global',
      metadata: { seamless, noticed, disruptive, seamlessRate },
    });
  }

  // ── 5. Topic Success Patterns ─────────────────────────────────────────
  const withTopic = recentSignals.filter(s => s.ambientTopic);
  if (withTopic.length >= 5) {
    const topicBuckets: Record<string, { answered: number; total: number; seamless: number }> = {};
    for (const s of withTopic) {
      const t = s.ambientTopic!.toLowerCase();
      if (!topicBuckets[t]) topicBuckets[t] = { answered: 0, total: 0, seamless: 0 };
      topicBuckets[t].total++;
      if (s.outcome === 'answered') topicBuckets[t].answered++;
      if (s.disruptionLevel === 'seamless') topicBuckets[t].seamless++;
    }

    const goodTopics = Object.entries(topicBuckets)
      .filter(([, v]) => v.total >= 2 && (v.answered / v.total) >= 0.6)
      .map(([topic, stats]) => ({ topic, successRate: stats.answered / stats.total, total: stats.total }));

    const poorTopics = Object.entries(topicBuckets)
      .filter(([, v]) => v.total >= 2 && (v.answered / v.total) < 0.4)
      .map(([topic, stats]) => ({ topic, successRate: stats.answered / stats.total, total: stats.total }));

    if (goodTopics.length > 0 || poorTopics.length > 0) {
      patterns.push({
        patternType: 'topic',
        description: `Topic success rates — high: ${goodTopics.map(t => t.topic).join(', ') || 'none yet'}. Low: ${poorTopics.map(t => t.topic).join(', ') || 'none yet'}.`,
        insight: [
          goodTopics.length > 0 ? `Topics with high ambient success: ${goodTopics.map(t => `"${t.topic}" (${(t.successRate * 100).toFixed(0)}%)`).join(', ')}. These work well as ambient questions.` : '',
          poorTopics.length > 0 ? `Topics that don't work well ambiently: ${poorTopics.map(t => `"${t.topic}" (${(t.successRate * 100).toFixed(0)}%)`).join(', ')}. Consider using direct relays for these instead.` : '',
        ].filter(Boolean).join(' '),
        confidence: Math.min(0.8, 0.3 + (withTopic.length / 30)),
        signalCount: withTopic.length,
        scope: 'global',
        metadata: { goodTopics, poorTopics },
      });
    }
  }

  // ── 6. Frequency Pattern ─────────────────────────────────────────────
  // Per-user: are some users getting too many ambient relays?
  const perUserCounts: Record<string, { total: number; declined: number; ignored: number }> = {};
  for (const s of recentSignals) {
    if (!s.toUserId) continue;
    if (!perUserCounts[s.toUserId]) perUserCounts[s.toUserId] = { total: 0, declined: 0, ignored: 0 };
    perUserCounts[s.toUserId].total++;
    if (s.outcome === 'declined') perUserCounts[s.toUserId].declined++;
    if (s.outcome === 'ignored') perUserCounts[s.toUserId].ignored++;
  }

  const overloaded = Object.entries(perUserCounts)
    .filter(([, v]) => v.total >= 5 && ((v.declined + v.ignored) / v.total) > 0.5);

  if (overloaded.length > 0) {
    patterns.push({
      patternType: 'frequency',
      description: `${overloaded.length} user(s) showing ambient relay fatigue (>50% decline/ignore rate with 5+ relays)`,
      insight: 'Some users are receiving too many ambient relays and ignoring or declining them. Reduce frequency for these connections — space ambient relays at least 24 hours apart per recipient. Prioritize quality over quantity.',
      confidence: Math.min(0.9, 0.4 + (overloaded.length / 5)),
      signalCount: overloaded.reduce((a, [, v]) => a + v.total, 0),
      scope: 'global',
      metadata: { overloadedUsers: overloaded.length, details: overloaded.map(([uid, v]) => ({ userId: uid, ...v })) },
    });
  }

  // ── Store patterns ──────────────────────────────────────────────────
  for (const p of patterns) {
    await prisma.ambientPattern.upsert({
      where: {
        id: `pattern_${p.patternType}_${p.scope}`,
      },
      create: {
        id: `pattern_${p.patternType}_${p.scope}`,
        patternType: p.patternType,
        description: p.description,
        insight: p.insight,
        confidence: p.confidence,
        signalCount: p.signalCount,
        scope: p.scope,
        metadata: JSON.stringify(p.metadata),
        isActive: true,
        lastSynthesized: new Date(),
      },
      update: {
        description: p.description,
        insight: p.insight,
        confidence: p.confidence,
        signalCount: p.signalCount,
        metadata: JSON.stringify(p.metadata),
        lastSynthesized: new Date(),
      },
    });
  }

  return patterns;
}

// ─── System Prompt Integration ───────────────────────────────────────────────

/**
 * Generate the ambient learning section for the system prompt.
 * This is what makes the protocol self-improving — patterns learned from
 * all users' interactions are fed back into how Divi handles ambient relays.
 */
export async function getAmbientLearningPromptSection(): Promise<string> {
  const patterns = await prisma.ambientPattern.findMany({
    where: { isActive: true },
    orderBy: [{ confidence: 'desc' }, { signalCount: 'desc' }],
    take: 10,
  });

  if (patterns.length === 0) {
    return ''; // No learned patterns yet
  }

  // Also get raw signal stats for context
  const totalSignals = await prisma.ambientRelaySignal.count();
  const last7dSignals = await prisma.ambientRelaySignal.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  let text = `\n### 🧬 Ambient Protocol Learning (${totalSignals} signals, ${last7dSignals} last 7 days)\n`;
  text += `The following patterns have been learned from real ambient relay interactions across the platform. Apply them to improve your ambient relay behavior:\n\n`;

  for (const p of patterns) {
    const conf = p.confidence >= 0.7 ? 'HIGH' : p.confidence >= 0.4 ? 'MEDIUM' : 'LOW';
    text += `**[${conf} confidence — ${p.signalCount} signals] ${p.patternType.toUpperCase()}:** ${p.insight}\n\n`;
  }

  text += `\n**Meta-instruction:** These patterns are data-driven. High-confidence patterns should be followed closely. Medium-confidence patterns are guidelines. Low-confidence patterns are early signals — apply with judgment. As more ambient relays occur, these patterns will become more precise.\n`;

  return text;
}

// ─── Ignored Ambient Relay Detection ──────────────────────────────────────────

/**
 * Scans for ambient relays that have been in "delivered" status for >48 hours
 * without a response. These get captured as "ignored" signals so the learning
 * engine can detect patterns in what gets ignored (topic, timing, recipient).
 * Returns the count of newly captured ignored signals.
 */
export async function captureIgnoredAmbientSignals(): Promise<number> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

  // Find ambient relays that have been delivered for >48h and aren't yet captured as ignored
  const staleAmbientRelays = await prisma.agentRelay.findMany({
    where: {
      status: 'delivered',
      payload: { contains: '_ambient' },
      createdAt: { lte: cutoff },
    },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    take: 50, // Process in batches
  });

  let captured = 0;

  for (const relay of staleAmbientRelays) {
    // Check if we already captured an ignored signal for this relay
    const existing = await prisma.ambientRelaySignal.findFirst({
      where: { relayId: relay.id, outcome: 'ignored' },
    });
    if (existing) continue;

    let payload: any = {};
    try { payload = JSON.parse(relay.payload || '{}'); } catch {}

    const hourOfDay = relay.createdAt.getHours();
    const dayOfWeek = relay.createdAt.getDay();

    await prisma.ambientRelaySignal.create({
      data: {
        relayId: relay.id,
        fromUserId: relay.fromUserId,
        toUserId: relay.toUserId,
        relayCreatedAt: relay.createdAt,
        outcome: 'ignored',
        responseQuality: null,
        disruptionLevel: null,
        topicRelevance: null,
        latencyMinutes: -1, // Sentinel: never responded
        hourOfDay,
        dayOfWeek,
        ambientTopic: payload._topic || relay.subject || null,
        conversationTopic: null,
        questionPhrasing: null,
        metadata: JSON.stringify({
          intent: relay.intent,
          priority: relay.priority,
          detectedAt: new Date().toISOString(),
          staleSinceHours: Math.round((Date.now() - relay.createdAt.getTime()) / (60 * 60 * 1000)),
        }),
      },
    });

    captured++;
  }

  if (captured > 0) {
    console.log(`[ambient-learning] Captured ${captured} ignored ambient relay signals`);
  }

  return captured;
}
