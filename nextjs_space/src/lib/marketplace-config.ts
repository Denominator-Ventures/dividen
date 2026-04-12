/**
 * Marketplace revenue split configuration — Two-Tier Fee Model.
 *
 * INTERNAL transactions (both parties on the same instance):
 *   Configurable via MARKETPLACE_FEE_PERCENT env var. Can be 0%.
 *   This is for whitelabel / closed-team deployments that never touch the network.
 *
 * NETWORK transactions (marketplace, federation, external agents/users):
 *   Enforced minimum floor of NETWORK_MARKETPLACE_FEE_FLOOR (default 3%).
 *   Cannot be overridden to 0 — DiviDen routes the payment and takes a routing fee.
 *   Self-hosted instances connecting to the DiviDen network must route payments through DiviDen.
 *
 * Default: 3% platform fee (DiviDen routing fee), 97% to developer.
 */

// ── Floor constants ──────────────────────────────────────────────────────────

/** Minimum fee % enforced for any network-routed marketplace transaction */
export const NETWORK_MARKETPLACE_FEE_FLOOR = parseFloat(
  process.env.NETWORK_MARKETPLACE_FEE_FLOOR || '3'
);

// ── Fee resolution ───────────────────────────────────────────────────────────

/**
 * Returns the configured internal fee percent.
 * Self-hosted instances can set MARKETPLACE_FEE_PERCENT=0 for internal-only transactions.
 */
export function getInternalFeePercent(): number {
  const envVal = process.env.MARKETPLACE_FEE_PERCENT;
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }
  return 3; // default 3%
}

/**
 * Returns the platform fee percent for a given transaction context.
 *
 * @param isNetworkTransaction  true when the transaction crosses instance boundaries
 *                              (marketplace agent from another instance, federated relay,
 *                               external user via connection, etc.)
 */
export function getPlatformFeePercent(isNetworkTransaction = false): number {
  const internal = getInternalFeePercent();
  if (!isNetworkTransaction) return internal;
  // Network transactions enforce the floor — cannot be set below it
  return Math.max(internal, NETWORK_MARKETPLACE_FEE_FLOOR);
}

// ── Revenue split ────────────────────────────────────────────────────────────

/**
 * Calculates the revenue split for a marketplace execution.
 *
 * @param grossAmount           The total amount charged for the execution
 * @param isNetworkTransaction  Whether this crosses instance boundaries
 */
export function calculateRevenueSplit(
  grossAmount: number,
  isNetworkTransaction = false
) {
  const feePercent = getPlatformFeePercent(isNetworkTransaction);
  const platformFee = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const developerPayout = Math.round((grossAmount - platformFee) * 100) / 100;
  return { grossAmount, platformFee, developerPayout, feePercent, isNetworkTransaction };
}

// ── Display helpers ──────────────────────────────────────────────────────────

/**
 * Returns display-friendly fee info for the UI.
 */
export function getFeeInfo() {
  const internalFee = getInternalFeePercent();
  const networkFee = Math.max(internalFee, NETWORK_MARKETPLACE_FEE_FLOOR);
  const isSelfHosted = internalFee === 0;

  return {
    feePercent: internalFee,
    networkFeePercent: networkFee,
    developerPercent: 100 - internalFee,
    networkDeveloperPercent: 100 - networkFee,
    isSelfHosted,
    label: isSelfHosted
      ? `Internal: 0% fee · Network: ${networkFee}% routing fee`
      : `${100 - internalFee}% to you · ${internalFee}% routing fee`,
    networkLabel: `${networkFee}% minimum fee on all network transactions`,
  };
}