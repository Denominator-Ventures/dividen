/* ── Marketplace helpers ───────────────────────────────────────
 * Display helpers used across marketplace sub-views.
 * Extracted in v2.4.7 Phase 3.2 cleanup sprint.
 * ──────────────────────────────────────────────────────────── */

import type { MarketplaceAgent } from './types';

export function formatPrice(agent: MarketplaceAgent): string {
  if (agent.pricingModel === 'free') return 'Free';
  if (agent.pricingModel === 'per_task' && agent.pricePerTask) return `$${agent.pricePerTask}/task`;
  if (agent.pricingModel === 'subscription' && agent.subscriptionPrice) {
    const limit = agent.taskLimit ? ` (${agent.taskLimit} tasks/mo)` : ' (unlimited)';
    return `$${agent.subscriptionPrice}/mo${limit}`;
  }
  if (agent.pricingModel === 'tiered' && agent.pricingDetails) {
    try {
      const config = JSON.parse(agent.pricingDetails);
      if (config.tiers?.length) {
        return `From $${config.tiers[0].pricePerTask}/task`;
      }
    } catch { /* ignore */ }
    return 'Tiered';
  }
  if (agent.pricingModel === 'dynamic') {
    if (agent.pricingDetails) {
      try {
        const config = JSON.parse(agent.pricingDetails);
        if (config.dynamicConfig?.estimateRange) {
          const [min, max] = config.dynamicConfig.estimateRange;
          return `~$${min}–$${max}/task`;
        }
      } catch { /* ignore */ }
    }
    return 'Dynamic';
  }
  return agent.pricingModel;
}

export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

export function parseSamplePrompts(sp?: string | null): string[] {
  if (!sp) return [];
  try { return JSON.parse(sp); } catch { return []; }
}

export function stars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}
