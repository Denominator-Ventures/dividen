export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NETWORK_MARKETPLACE_FEE_FLOOR } from '@/lib/marketplace-config';
import { NETWORK_RECRUITING_FEE_FLOOR } from '@/lib/recruiting-config';

/**
 * POST /api/v2/federation/validate-payment
 *
 * Called by federated instances before completing a marketplace or job payment.
 * Validates that the payment routes through DiviDen with the enforced fee floor.
 *
 * Required headers:
 *   Authorization: Bearer <platformToken>
 *
 * Body:
 *   {
 *     transactionType: 'marketplace' | 'job',
 *     grossAmount: number,
 *     proposedFeePercent: number,
 *     agentId?: string,    // for marketplace transactions
 *     executionId?: string,
 *     contractId?: string, // for job transactions
 *   }
 *
 * Returns:
 *   {
 *     valid: boolean,
 *     enforcedFeePercent: number,
 *     enforcedFeeAmount: number,
 *     developerPayout: number,
 *     message: string,
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate via platformToken
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    const instance = await prisma.instanceRegistry.findFirst({
      where: { platformToken: token, platformLinked: true },
    });
    if (!instance) {
      return NextResponse.json(
        { valid: false, error: 'Invalid platform token or instance not linked' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { transactionType, grossAmount, proposedFeePercent } = body;

    if (!transactionType || typeof grossAmount !== 'number' || typeof proposedFeePercent !== 'number') {
      return NextResponse.json(
        { valid: false, error: 'Missing required fields: transactionType, grossAmount, proposedFeePercent' },
        { status: 400 }
      );
    }

    // Determine the enforced fee floor based on transaction type
    let feeFloor: number;
    if (transactionType === 'marketplace') {
      feeFloor = NETWORK_MARKETPLACE_FEE_FLOOR;
    } else if (transactionType === 'job') {
      feeFloor = NETWORK_RECRUITING_FEE_FLOOR;
    } else {
      return NextResponse.json(
        { valid: false, error: `Unknown transactionType: ${transactionType}. Use 'marketplace' or 'job'.` },
        { status: 400 }
      );
    }

    // Enforce fee floor — proposed fee must meet or exceed the floor
    const enforcedFeePercent = Math.max(proposedFeePercent, feeFloor);
    const enforcedFeeAmount = Math.round(grossAmount * (enforcedFeePercent / 100) * 100) / 100;
    const developerPayout = Math.round((grossAmount - enforcedFeeAmount) * 100) / 100;
    const valid = proposedFeePercent >= feeFloor;

    // Log the validation attempt
    await prisma.telemetryEvent.create({
      data: {
        type: 'federation_payment_validation',
        path: '/api/v2/federation/validate-payment',
        method: 'POST',
        metadata: JSON.stringify({
          instanceId: instance.id,
          instanceName: instance.name,
          transactionType,
          grossAmount,
          proposedFeePercent,
          enforcedFeePercent,
          valid,
          agentId: body.agentId,
          executionId: body.executionId,
          contractId: body.contractId,
        }),
      },
    }).catch(() => { /* swallow telemetry errors */ });

    return NextResponse.json({
      valid,
      enforcedFeePercent,
      enforcedFeeAmount,
      developerPayout,
      feeFloor,
      message: valid
        ? `Payment validated. ${enforcedFeePercent}% fee ($${enforcedFeeAmount}) will be routed to DiviDen.`
        : `Fee too low. Network ${transactionType} transactions require a minimum ${feeFloor}% fee. Your proposed ${proposedFeePercent}% will be overridden to ${enforcedFeePercent}%.`,
    });
  } catch (error: any) {
    console.error('Federation payment validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
