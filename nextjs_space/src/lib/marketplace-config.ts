/**
 * Marketplace revenue split configuration.
 * The fee percent is configurable via MARKETPLACE_FEE_PERCENT env var.
 * Default: 3% platform fee (DiviDen routing fee), 97% to developer.
 * Open-source users can set MARKETPLACE_FEE_PERCENT=0 to keep 100%.
 */

export function getPlatformFeePercent(): number {
  const envVal = process.env.MARKETPLACE_FEE_PERCENT;
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }
  return 3; // default 3%
}

export function calculateRevenueSplit(grossAmount: number) {
  const feePercent = getPlatformFeePercent();
  const platformFee = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const developerPayout = Math.round((grossAmount - platformFee) * 100) / 100;
  return { grossAmount, platformFee, developerPayout, feePercent };
}

/**
 * Returns display-friendly fee info for the UI.
 */
export function getFeeInfo() {
  const feePercent = getPlatformFeePercent();
  return {
    feePercent,
    developerPercent: 100 - feePercent,
    isSelfHosted: feePercent === 0,
    label: feePercent === 0
      ? 'Self-hosted — 0% platform fee'
      : `${100 - feePercent}% to you · ${feePercent}% routing fee`,
  };
}
