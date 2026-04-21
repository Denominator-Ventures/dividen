import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// POST /api/integrations/test — test an email integration
async function _POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { integrationId } = await req.json();

    if (!integrationId) {
      return NextResponse.json({ success: false, error: 'integrationId required' }, { status: 400 });
    }

    const account = await prisma.integrationAccount.findFirst({
      where: { id: integrationId, userId },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
    }

    if (account.service !== 'email') {
      return NextResponse.json({ success: false, error: 'Test only supports email integrations' }, { status: 400 });
    }

    if (account.provider === 'smtp' || account.provider === 'google') {
      if (!account.smtpHost || !account.smtpUser || !account.smtpPass) {
        return NextResponse.json({ success: false, error: 'SMTP credentials incomplete' }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort || 587,
        secure: account.smtpPort === 465,
        auth: {
          user: account.smtpUser,
          pass: account.smtpPass,
        },
      });

      await transporter.verify();

      return NextResponse.json({ success: true, message: 'SMTP connection verified' });
    }

    return NextResponse.json({ success: false, error: `Provider ${account.provider} test not supported yet` }, { status: 400 });
  } catch (error: any) {
    console.error('Integration test error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Connection test failed',
    }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
