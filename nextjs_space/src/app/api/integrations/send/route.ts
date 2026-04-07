import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

// POST /api/integrations/send — send an email via configured SMTP
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { identity, to, subject, body, replyToMessageId, cc, bcc } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ success: false, error: 'to, subject, and body are required' }, { status: 400 });
    }

    // Find the email integration for this identity
    const senderIdentity = identity || 'operator';
    const account = await prisma.integrationAccount.findFirst({
      where: { userId, identity: senderIdentity, service: 'email', isActive: true },
    });

    if (!account) {
      return NextResponse.json({
        success: false,
        error: `No email integration configured for ${senderIdentity}. Go to Settings → Identities to set one up.`,
      }, { status: 400 });
    }

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

    const fromAddress = account.emailAddress || account.smtpUser;
    const fromName = account.label || (senderIdentity === 'agent' ? 'Divi' : undefined);

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
      to,
      subject,
      text: body,
      cc: cc || undefined,
      bcc: bcc || undefined,
    };

    if (replyToMessageId) {
      mailOptions.inReplyTo = replyToMessageId;
      mailOptions.references = replyToMessageId;
    }

    const result = await transporter.sendMail(mailOptions);

    // Store the sent email in the DB
    await prisma.emailMessage.create({
      data: {
        subject,
        fromName: fromName || fromAddress,
        fromEmail: fromAddress,
        toEmail: to,
        body,
        snippet: body.slice(0, 200),
        source: 'sent',
        externalId: result.messageId || null,
        isRead: true,
        labels: 'sent',
        userId,
      },
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to send email',
    }, { status: 500 });
  }
}
