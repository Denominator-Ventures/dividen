import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getValidAccessToken } from '@/lib/google-oauth';
import { withTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

/**
 * Send an email via Gmail API (for Google-connected accounts).
 * Uses raw RFC 2822 message format.
 */
async function sendViaGmail(
  accessToken: string,
  fromEmail: string,
  fromName: string | undefined,
  to: string,
  subject: string,
  body: string,
  replyToMessageId?: string,
  cc?: string,
  bcc?: string,
): Promise<{ messageId: string }> {
  // Build RFC 2822 message
  const lines: string[] = [];
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(`Subject: ${subject}`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  if (replyToMessageId) {
    lines.push(`In-Reply-To: ${replyToMessageId}`);
    lines.push(`References: ${replyToMessageId}`);
  }
  lines.push(''); // blank line between headers and body
  lines.push(body);

  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail send failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return { messageId: data.id };
}

// POST /api/integrations/send — send an email via Gmail API or SMTP
async function _POST(req: NextRequest) {
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

    let messageId: string | undefined;

    if (account.provider === 'google') {
      // ── Gmail API send ──
      const accessToken = await getValidAccessToken(account);
      const fromAddress = account.emailAddress || 'me';
      const fromName = account.label || (senderIdentity === 'agent' ? 'Divi' : undefined);
      const result = await sendViaGmail(accessToken, fromAddress, fromName, to, subject, body, replyToMessageId, cc, bcc);
      messageId = result.messageId;
    } else {
      // ── SMTP send ──
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
      messageId = result.messageId || undefined;
    }

    // Store the sent email in the DB
    const fromAddress = account.emailAddress || account.smtpUser || 'unknown';
    const fromName = account.label || (senderIdentity === 'agent' ? 'Divi' : fromAddress);
    await prisma.emailMessage.create({
      data: {
        subject,
        fromName,
        fromEmail: fromAddress,
        toEmail: to,
        body,
        snippet: body.slice(0, 200),
        source: 'sent',
        externalId: messageId || null,
        isRead: true,
        labels: 'sent',
        userId,
      },
    });

    return NextResponse.json({ success: true, messageId });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to send email',
    }, { status: 500 });
  }
}

export const POST = withTelemetry(_POST);
