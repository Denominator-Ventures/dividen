export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRecruitingFeeInfo, calculateRecruitingFee } from '@/lib/recruiting-config';

/**
 * GET /api/recruiting/fee-info — Public endpoint for recruiting fee structure
 */
export async function GET() {
  const info = getRecruitingFeeInfo();
  const internalExample = calculateRecruitingFee(1000, false);
  const networkExample = calculateRecruitingFee(1000, true);
  return NextResponse.json({
    ...info,
    internalExample: {
      gross: 1000,
      recruitingFee: internalExample.recruitingFee,
      workerPayout: internalExample.workerPayout,
      description: `Internal: On a $1,000 job — worker gets $${internalExample.workerPayout}, fee is $${internalExample.recruitingFee}`,
    },
    networkExample: {
      gross: 1000,
      recruitingFee: networkExample.recruitingFee,
      workerPayout: networkExample.workerPayout,
      description: `Network: On a $1,000 job — worker gets $${networkExample.workerPayout}, fee is $${networkExample.recruitingFee} (minimum ${info.networkFeePercent}%)`,
    },
  });
}
