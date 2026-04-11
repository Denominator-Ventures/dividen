export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getFeeInfo } from '@/lib/marketplace-config';

// GET /api/marketplace/fee-info — Public fee structure info
export async function GET() {
  return NextResponse.json(getFeeInfo());
}
