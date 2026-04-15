/**
 * Google API sync services for DiviDen.
 * Pulls data from Gmail, Calendar, and Drive into the local database.
 */

import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { getValidAccessToken } from '@/lib/google-oauth';
import { logActivity } from '@/lib/activity';

type IntAccount = {
  id: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  syncCursor: string | null;
  emailAddress: string | null;
};

function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// ─── Gmail Sync ───────────────────────────────────────────────────────────────

export async function syncGmail(account: IntAccount, limit = 30): Promise<number> {
  const token = await getValidAccessToken(account);
  const gmail = google.gmail({ version: 'v1', auth: getAuth(token) });

  // List recent messages (basic metadata)
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    q: 'in:inbox',
    ...(account.syncCursor ? { pageToken: account.syncCursor } : {}),
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return 0;

  let synced = 0;

  for (const msg of messages) {
    if (!msg.id) continue;

    // Skip if already synced
    const existing = await prisma.emailMessage.findFirst({
      where: { externalId: msg.id, userId: account.userId },
    });
    if (existing) continue;

    // Fetch full message
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = full.data.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('From');
      const to = getHeader('To');
      const subject = getHeader('Subject') || '(No Subject)';
      const dateStr = getHeader('Date');
      const snippet = full.data.snippet || '';

      // Parse from name/email
      const fromMatch = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
      const fromName = fromMatch?.[1]?.trim() || from;
      const fromEmail = fromMatch?.[2]?.trim() || from;

      // Parse to email
      const toMatch = to.match(/<([^>]+)>/);
      const toEmail = toMatch?.[1] || to.split(',')[0]?.trim() || '';

      // Labels
      const labels = (full.data.labelIds || []).map((l: string) => l.toLowerCase()).join(',');
      const isRead = !(full.data.labelIds || []).includes('UNREAD');
      const isStarred = (full.data.labelIds || []).includes('STARRED');

      // Auto-link to contact if sender email matches
      let linkedContactId: string | null = null;
      if (fromEmail) {
        const contact = await prisma.contact.findFirst({
          where: { userId: account.userId, email: fromEmail },
        });
        if (contact) linkedContactId = contact.id;
      }

      await prisma.emailMessage.create({
        data: {
          subject,
          fromName,
          fromEmail,
          toEmail,
          snippet,
          labels,
          isRead,
          isStarred,
          source: 'gmail',
          externalId: msg.id,
          linkedContactId,
          receivedAt: dateStr ? new Date(dateStr) : new Date(),
          metadata: JSON.stringify({ threadId: full.data.threadId, labelIds: full.data.labelIds }),
          userId: account.userId,
        },
      });
      synced++;
    } catch (err: any) {
      console.error(`[gmail-sync] Failed to fetch message ${msg.id}:`, err.message);
    }
  }

  // Store next page token for incremental sync
  if (listRes.data.nextPageToken) {
    await prisma.integrationAccount.update({
      where: { id: account.id },
      data: { syncCursor: listRes.data.nextPageToken, lastSyncAt: new Date() },
    });
  } else {
    await prisma.integrationAccount.update({
      where: { id: account.id },
      data: { syncCursor: null, lastSyncAt: new Date() },
    });
  }

  return synced;
}

// ─── Calendar Sync ────────────────────────────────────────────────────────────

export async function syncCalendar(account: IntAccount, daysAhead = 14): Promise<number> {
  const token = await getValidAccessToken(account);
  const cal = google.calendar({ version: 'v3', auth: getAuth(token) });

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const listRes = await cal.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = listRes.data.items || [];
  let synced = 0;

  for (const event of events) {
    if (!event.id) continue;

    // Upsert: update if exists, create if not
    const existing = await prisma.calendarEvent.findFirst({
      where: { externalId: event.id, userId: account.userId },
    });

    const startTime = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date)
        : new Date();

    const endTime = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date)
        : undefined;

    const attendees = event.attendees
      ? JSON.stringify(event.attendees.map((a: any) => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
          self: a.self,
        })))
      : null;

    const data = {
      title: event.summary || '(No Title)',
      description: event.description || null,
      startTime,
      endTime: endTime || null,
      location: event.location || null,
      attendees,
      source: 'google' as const,
      externalId: event.id,
      accountEmail: account.emailAddress || null,
      metadata: JSON.stringify({
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        conferenceData: event.conferenceData,
        status: event.status,
        organizer: event.organizer,
      }),
      userId: account.userId,
    };

    if (existing) {
      const { userId: _uid, ...updateData } = data;
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.calendarEvent.create({ data });
      synced++;
    }
  }

  await prisma.integrationAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });

  return synced;
}

// ─── Drive Sync (file metadata) ───────────────────────────────────────────────

export async function syncDrive(account: IntAccount, limit = 50): Promise<number> {
  const token = await getValidAccessToken(account);
  const drive = google.drive({ version: 'v3', auth: getAuth(token) });

  const listRes = await drive.files.list({
    pageSize: limit,
    orderBy: 'modifiedTime desc',
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,shared,owners,lastModifyingUser)',
    q: "trashed = false",
    ...(account.syncCursor ? { pageToken: account.syncCursor } : {}),
  });

  const files = listRes.data.files || [];
  let synced = 0;

  for (const file of files) {
    if (!file.id) continue;

    const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}`;
    const driveTag = `gdrive:${file.id}`;

    // Upsert as a Document record — deduplicate via tags containing drive id
    const existing = await prisma.document.findFirst({
      where: { userId: account.userId, tags: { contains: driveTag } },
    });

    const content = [
      `[Google Drive file: ${file.name}](${driveUrl})`,
      file.mimeType ? `Type: ${file.mimeType}` : '',
      file.shared ? 'Shared' : '',
      (file.lastModifyingUser as any)?.emailAddress ? `Last edited by: ${(file.lastModifyingUser as any).emailAddress}` : '',
    ].filter(Boolean).join('\n');

    if (!existing) {
      await prisma.document.create({
        data: {
          title: file.name || 'Untitled',
          content,
          type: 'drive_file',
          fileSource: 'google_drive',
          url: driveUrl,
          tags: driveTag,
          accountEmail: account.emailAddress || null,
          mimeType: file.mimeType || null,
          fileSize: file.size ? parseInt(String(file.size), 10) : null,
          thumbnailUrl: (file as any).thumbnailLink || null,
          userId: account.userId,
        },
      });
      synced++;
    } else {
      await prisma.document.update({
        where: { id: existing.id },
        data: {
          title: file.name || 'Untitled',
          content,
          url: driveUrl,
          accountEmail: account.emailAddress || null,
          mimeType: file.mimeType || null,
          fileSize: file.size ? parseInt(String(file.size), 10) : null,
          thumbnailUrl: (file as any).thumbnailLink || null,
        },
      });
    }
  }

  // Store page token for incremental sync
  await prisma.integrationAccount.update({
    where: { id: account.id },
    data: {
      syncCursor: listRes.data.nextPageToken || null,
      lastSyncAt: new Date(),
    },
  });

  return synced;
}

// ─── Sync All Services for a User ─────────────────────────────────────────────

export async function syncAllGoogleServices(userId: string): Promise<{
  email: number;
  calendar: number;
  drive: number;
}> {
  const accounts = await prisma.integrationAccount.findMany({
    where: { userId, provider: 'google', isActive: true, refreshToken: { not: null } },
  });

  const results = { email: 0, calendar: 0, drive: 0 };

  for (const account of accounts) {
    try {
      if (account.service === 'email') {
        results.email += await syncGmail(account);
      } else if (account.service === 'calendar') {
        results.calendar += await syncCalendar(account);
      } else if (account.service === 'drive') {
        results.drive += await syncDrive(account);
      }
    } catch (err: any) {
      console.error(`[google-sync] Failed to sync ${account.service} (${account.id}):`, err.message);
    }
  }

  const total = results.email + results.calendar + results.drive;
  if (total > 0) {
    logActivity({
      userId,
      action: 'sync_completed',
      summary: `Synced ${total} items — ${results.email} emails, ${results.calendar} events, ${results.drive} files`,
      actor: 'divi',
      metadata: results,
    }).catch(() => {});
  }

  return results;
}
