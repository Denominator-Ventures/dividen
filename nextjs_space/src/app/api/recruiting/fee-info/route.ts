export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRecruitingFeeInfo, calculateRecruitingFee } from '@/lib/recruiting-config';

/**
 * GET /api/recruiting/fee-info — Public endpoint for recruiting fee structure
 */
export async function GET() {
  const info = getRecruitingFeeInfo();
  const example = calculateRecruitingFee(1000);
  return NextResponse.json({
    ...info,
    example: {
      gross: 1000,
      recruitingFee: example.recruitingFee,
      workerPayout: example.workerPayout,
      description: `On a $1,000 job: worker gets $${example.workerPayout}, DiviDen recruiting fee is $${example.recruitingFee}`,
    },
  });
}
