/**
 * Job recruiting fee configuration.
 * Default: 7% recruiting fee when DiviDen matches an outside-network worker to a paid job.
 * Open-source / self-hosted users can set RECRUITING_FEE_PERCENT=0 to keep 100%.
 * Separate from the 3% Agent Marketplace routing fee — this is for human talent recruiting.
 */

export function getRecruitingFeePercent(): number {
  const envVal = process.env.RECRUITING_FEE_PERCENT;
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }
  return 7; // default 7%
}

export function calculateRecruitingFee(grossAmount: number) {
  const feePercent = getRecruitingFeePercent();
  const recruitingFee = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const workerPayout = Math.round((grossAmount - recruitingFee) * 100) / 100;
  return { grossAmount, recruitingFee, workerPayout, feePercent };
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
  const feePercent = getRecruitingFeePercent();
  return {
    feePercent,
    workerPercent: 100 - feePercent,
    isSelfHosted: feePercent === 0,
    label: feePercent === 0
      ? 'Self-hosted — 0% recruiting fee'
      : `${feePercent}% recruiting fee · ${100 - feePercent}% to worker`,
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
