/**
 * Standard pricing tier schema for marketplace agents.
 * Used by federation sync, admin UI, and marketplace display.
 *
 * Pricing models:
 *   - free: no charge
 *   - per_task: fixed price per execution
 *   - tiered: volume-based tiers (lower price at higher volume)
 *   - dynamic: agent determines price per result (two-phase checkout)
 */

export interface PricingTier {
  name: string;          // e.g. "Basic", "Pro", "Enterprise"
  pricePerTask: number;  // $ per execution in this tier
  taskLimit?: number;    // max tasks in this tier (null = unlimited)
  description?: string;  // human-readable description
}

export interface PricingConfig {
  model: 'free' | 'per_task' | 'tiered' | 'dynamic';
  currency?: string;     // ISO 4217 (default: USD)
  pricePerTask?: number; // for per_task model
  tiers?: PricingTier[]; // for tiered model, ordered low→high
  dynamicConfig?: {      // for dynamic model
    estimateRange?: [number, number]; // estimated min/max per task
    requiresApproval: boolean;        // user must approve before charge
    description?: string;             // explain how pricing works
  };
}

/**
 * Parse pricingDetails JSON from DB into a typed PricingConfig.
 * Falls back to simple model-based config if pricingDetails is empty.
 */
export function parsePricingConfig(
  pricingModel: string,
  pricePerTask?: number | null,
  pricingDetails?: string | null
): PricingConfig {
  // Try parsing structured pricingDetails first
  if (pricingDetails) {
    try {
      const parsed = JSON.parse(pricingDetails);
      if (parsed.model) return parsed as PricingConfig;
    } catch { /* fall through */ }
  }

  // Fall back to simple model
  switch (pricingModel) {
    case 'free':
      return { model: 'free' };
    case 'per_task':
      return { model: 'per_task', pricePerTask: pricePerTask || 0 };
    case 'tiered':
      return { model: 'tiered', tiers: [] };
    case 'dynamic':
      return { model: 'dynamic', dynamicConfig: { requiresApproval: true } };
    default:
      return { model: 'free' };
  }
}

/**
 * Serialize a PricingConfig to JSON for DB storage.
 */
export function serializePricingConfig(config: PricingConfig): string {
  return JSON.stringify(config);
}

/**
 * Get a human-readable pricing label for display.
 */
export function getPricingLabel(config: PricingConfig): string {
  switch (config.model) {
    case 'free':
      return 'Free';
    case 'per_task':
      return `$${(config.pricePerTask || 0).toFixed(2)}/task`;
    case 'tiered': {
      if (!config.tiers?.length) return 'Tiered pricing';
      const lowest = config.tiers[0];
      return `From $${lowest.pricePerTask.toFixed(2)}/task`;
    }
    case 'dynamic': {
      const dc = config.dynamicConfig;
      if (dc?.estimateRange) {
        return `~$${dc.estimateRange[0].toFixed(2)}–$${dc.estimateRange[1].toFixed(2)}/task`;
      }
      return 'Dynamic pricing';
    }
    default:
      return 'Free';
  }
}

/**
 * Resolve the effective price for a given execution context.
 * For tiered: looks up based on cumulative task count.
 * For dynamic: returns null (price determined by agent after execution).
 */
export function resolveExecutionPrice(
  config: PricingConfig,
  cumulativeTaskCount: number = 0
): number | null {
  switch (config.model) {
    case 'free':
      return 0;
    case 'per_task':
      return config.pricePerTask || 0;
    case 'tiered': {
      if (!config.tiers?.length) return 0;
      let remaining = cumulativeTaskCount;
      let activeTier = config.tiers[0];
      for (const tier of config.tiers) {
        if (tier.taskLimit && remaining >= tier.taskLimit) {
          remaining -= tier.taskLimit;
          continue;
        }
        activeTier = tier;
        break;
      }
      return activeTier.pricePerTask;
    }
    case 'dynamic':
      return null; // price determined post-execution
    default:
      return 0;
  }
}
