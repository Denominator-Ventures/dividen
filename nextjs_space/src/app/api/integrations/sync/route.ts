import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

// POST /api/integrations/sync — fetch emails from IMAP and store in DB
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!((session?.user as any)?.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session!.user as any).id;
    const { integrationId, limit = 25 } = await req.json();

    if (!integrationId) {
      return NextResponse.json({ success: false, error: 'integrationId required' }, { status: 400 });
    }

    const account = await prisma.integrationAccount.findFirst({
      where: { id: integrationId, userId, service: 'email' },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Email integration not found' }, { status: 404 });
    }

    if (!account.smtpHost || !account.smtpUser || !account.smtpPass) {
      return NextResponse.json({ success: false, error: 'SMTP/IMAP credentials incomplete' }, { status: 400 });
    }

    // Determine IMAP host from SMTP host
    let imapHost = account.smtpHost;
    if (imapHost.startsWith('smtp.')) {
      imapHost = imapHost.replace('smtp.', 'imap.');
    }

    const client = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: {
        user: account.smtpUser,
        pass: account.smtpPass,
      },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    let synced = 0;

    try {
      // Fetch latest messages
      const fetchLimit = Math.min(limit, 50);
      const mailbox = client.mailbox;
      const totalMessages = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox) ? (mailbox as any).exists as number : 0;
      if (totalMessages === 0) {
        await lock.release();
        await client.logout();
        return NextResponse.json({ success: true, synced: 0, message: 'Inbox is empty' });
      }

      const startSeq = Math.max(1, totalMessages - fetchLimit + 1);
      const range = `${startSeq}:*`;

      for await (const message of client.fetch(range, {
        envelope: true,
        bodyStructure: true,
        source: { maxLength: 4096 }, // Get first 4KB of source for snippet
      })) {
        const env = message.envelope;
        if (!env) continue;

        const messageId = env.messageId || `imap-${message.uid}`;

        // Skip if already synced
        const existing = await prisma.emailMessage.findFirst({
          where: { externalId: messageId, userId },
        });
        if (existing) continue;

        const fromAddr = env.from?.[0];
        const toAddr = env.to?.[0];

        // Extract a text snippet from source
        let snippet = '';
        if (message.source) {
          const sourceText = message.source.toString('utf-8');
          // Try to extract text after headers
          const bodyStart = sourceText.indexOf('\r\n\r\n');
          if (bodyStart > -1) {
            snippet = sourceText.slice(bodyStart + 4, bodyStart + 204)
              .replace(/[\r\n]+/g, ' ')
              .replace(/<[^>]+>/g, '')
              .trim();
          }
        }

        // Auto-link to contact if sender email matches
        let linkedContactId: string | null = null;
        if (fromAddr?.address) {
          const contact = await prisma.contact.findFirst({
            where: { userId, email: fromAddr.address },
          });
          if (contact) linkedContactId = contact.id;
        }

        await prisma.emailMessage.create({
          data: {
            subject: env.subject || '(No Subject)',
            fromName: fromAddr?.name || fromAddr?.address || 'Unknown',
            fromEmail: fromAddr?.address || null,
            toEmail: toAddr?.address || null,
            snippet,
            source: 'imap',
            externalId: messageId,
            linkedContactId,
            isRead: false,
            receivedAt: env.date ? new Date(env.date) : new Date(),
            userId,
          },
        });
        synced++;
      }
    } finally {
      await lock.release();
    }

    await client.logout();

    // Update lastSyncAt
    await prisma.integrationAccount.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true, synced, message: `Synced ${synced} new emails` });
  } catch (error: any) {
    console.error('Email sync error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Email sync failed',
    }, { status: 500 });
  }
}
