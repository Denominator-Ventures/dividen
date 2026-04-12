/**
 * Job recruiting fee configuration — Two-Tier Fee Model.
 *
 * INTERNAL jobs (both poster and worker on same instance):
 *   Configurable via RECRUITING_FEE_PERCENT env var. Can be 0%.
 *
 * NETWORK jobs (worker found via federation, marketplace, or external connection):
 *   Enforced minimum floor of NETWORK_RECRUITING_FEE_FLOOR (default 7%).
 *   Payments route through DiviDen — the platform fee cannot be bypassed.
 *
 * Default: 7% recruiting fee, 93% to worker.
 */

/** Minimum fee % enforced for network-routed job payments */
export const NETWORK_RECRUITING_FEE_FLOOR = parseFloat(
  process.env.NETWORK_RECRUITING_FEE_FLOOR || '7'
);

/**
 * Returns the configured internal recruiting fee percent.
 */
export function getInternalRecruitingFeePercent(): number {
  const envVal = process.env.RECRUITING_FEE_PERCENT;
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }
  return 7; // default 7%
}

/**
 * Returns the recruiting fee percent for a given transaction context.
 */
export function getRecruitingFeePercent(isNetworkTransaction = false): number {
  const internal = getInternalRecruitingFeePercent();
  if (!isNetworkTransaction) return internal;
  return Math.max(internal, NETWORK_RECRUITING_FEE_FLOOR);
}

/**
 * Calculates recruiting fee split.
 */
export function calculateRecruitingFee(
  grossAmount: number,
  isNetworkTransaction = false
) {
  const feePercent = getRecruitingFeePercent(isNetworkTransaction);
  const recruitingFee = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const workerPayout = Math.round((grossAmount - recruitingFee) * 100) / 100;
  return { grossAmount, recruitingFee, workerPayout, feePercent, isNetworkTransaction };
}

/**
 * Format compensation for display.
 */
export function formatCompensation(
  type: string | null | undefined,
  amount: number | null | undefined,
  currency: string = 'USD'
): string {
  if (!type || !amount || amount <= 0) return 'Volunteer / Unpaid';
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  switch (type) {
    case 'flat': return `${fmt} flat fee`;
    case 'hourly': return `${fmt}/hr`;
    case 'weekly': return `${fmt}/week`;
    case 'monthly': return `${fmt}/month`;
    default: return fmt;
  }
}

/**
 * Returns display-friendly recruiting fee info for the UI.
 */
export function getRecruitingFeeInfo() {
  const internalFee = getInternalRecruitingFeePercent();
  const networkFee = Math.max(internalFee, NETWORK_RECRUITING_FEE_FLOOR);
  const isSelfHosted = internalFee === 0;

  return {
    feePercent: internalFee,
    networkFeePercent: networkFee,
    workerPercent: 100 - internalFee,
    networkWorkerPercent: 100 - networkFee,
    isSelfHosted,
    label: isSelfHosted
      ? `Internal: 0% fee · Network: ${networkFee}% recruiting fee`
      : `${internalFee}% recruiting fee · ${100 - internalFee}% to worker`,
    networkLabel: `${networkFee}% minimum fee on all network job payments`,
  };
}

/**
 * Compensation type display labels.
 */
export const COMPENSATION_TYPES = [
  { value: 'flat', label: 'Flat Fee', desc: 'One-time payment for the entire job' },
  { value: 'hourly', label: 'Hourly', desc: 'Pay per hour worked' },
  { value: 'weekly', label: 'Weekly', desc: 'Pay per week of engagement' },
  { value: 'monthly', label: 'Monthly', desc: 'Pay per month of engagement' },
  { value: 'volunteer', label: 'Volunteer / Unpaid', desc: 'No monetary compensation' },
] as const;
