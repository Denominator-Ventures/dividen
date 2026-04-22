/* AUTO-EMITTED by extract_tags.ts — Phase 2.1 registry split */
import { prisma } from '../prisma';
import { deduplicatedQueueCreate } from '../queue-dedup';
import { pushRelayStateChanged } from '../webhook-push';
import { getPlatformFeePercent } from '../marketplace-config';
import { checkQueueGate, searchMarketplaceSuggestions } from '../queue-gate';
import { optimizeTaskForAgent } from '../smart-task-prompter';
import { checkAndAutoCompleteCard } from '../card-auto-complete';
import { logActivity } from '../activity';
import type { TagHandlerMap } from './_types';

export const handlers: TagHandlerMap = {
  'create_event': (params, userId, name) => handlers['set_reminder'](params, userId, name),

  'set_reminder': async (params, userId, name) => {
        // Store as queue items with metadata
        const itemType = name === 'create_event' ? 'task' : 'reminder';
        const eventMeta = JSON.stringify({
          date: params.date,
          time: params.time,
          type: name,
        });
        const eventDedup = await deduplicatedQueueCreate({
          type: itemType,
          title: params.title || (name === 'create_event' ? 'New Event' : 'Reminder'),
          description: params.description || null,
          priority: params.priority || 'medium',
          source: 'agent',
          userId,
          metadata: eventMeta,
        });
        return { tag: name, success: true, data: { id: eventDedup.item.id, title: eventDedup.item.title, deduplicated: !eventDedup.created } };
      
  },

  'send_email': async (params, userId, name) => {
        if (!params.to || !params.subject || !params.body) {
          return { tag: name, success: false, error: 'Missing to, subject, or body' };
        }
        const sendIdentity = params.identity || 'operator';
        // Try to find an email integration for this identity
        const emailAccount = await prisma.integrationAccount.findFirst({
          where: { userId, identity: sendIdentity, service: 'email', isActive: true },
        });
        if (emailAccount?.smtpHost && emailAccount?.smtpUser && emailAccount?.smtpPass) {
          // Send via SMTP
          try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
              host: emailAccount.smtpHost,
              port: emailAccount.smtpPort || 587,
              secure: emailAccount.smtpPort === 465,
              auth: { user: emailAccount.smtpUser, pass: emailAccount.smtpPass },
            });
            const fromAddr = emailAccount.emailAddress || emailAccount.smtpUser;
            const fromName = emailAccount.label || (sendIdentity === 'agent' ? 'Divi' : undefined);
            const result = await transporter.sendMail({
              from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
              to: params.to,
              subject: params.subject,
              text: params.body,
            });
            // Store sent email
            await prisma.emailMessage.create({
              data: {
                subject: params.subject,
                fromName: fromName || fromAddr,
                fromEmail: fromAddr,
                toEmail: params.to,
                body: params.body,
                snippet: params.body.slice(0, 200),
                source: 'sent',
                externalId: result.messageId || null,
                isRead: true,
                labels: 'sent',
                userId,
              },
            });
            // Log capability execution to activity feed
            await prisma.activityLog.create({
              data: {
                action: 'capability_executed',
                actor: 'divi',
                summary: `Sent email to ${params.to}: "${params.subject}"`,
                metadata: JSON.stringify({ capabilityType: 'email', action: 'send', to: params.to, subject: params.subject, identity: sendIdentity }),
                userId,
              },
            }).catch(() => {});
            return { tag: name, success: true, data: { messageId: result.messageId, sent: true, as: sendIdentity } };
          } catch (err: any) {
            return { tag: name, success: false, error: `SMTP send failed: ${err?.message}` };
          }
        } else {
          // Fallback: save as draft in queue (with dedup)
          const emailMeta = JSON.stringify({
            to: params.to,
            subject: params.subject,
            body: params.body,
            identity: sendIdentity,
            type: 'email_draft',
          });
          const emailDedup = await deduplicatedQueueCreate({
            type: 'task',
            title: `Email draft: ${params.subject || 'No subject'}`,
            description: `To: ${params.to}\n\n${params.body || ''}`,
            priority: 'medium',
            source: 'agent',
            userId,
            metadata: emailMeta,
          });
          return { tag: name, success: true, data: { id: emailDedup.item.id, note: `No email integration for ${sendIdentity}. Saved as draft in queue.`, deduplicated: !emailDedup.created } };
        }
      
  },

  'create_calendar_event': async (params, userId, name) => {
        if (!params.title) {
          return { tag: name, success: false, error: 'Missing title' };
        }
        const startTime = params.startTime || params.date
          ? new Date(params.startTime || `${params.date}T${params.time || '09:00'}`)
          : new Date();
        const endTime = params.endTime
          ? new Date(params.endTime)
          : new Date(startTime.getTime() + 60 * 60 * 1000); // default 1hr

        const calEvent = await prisma.calendarEvent.create({
          data: {
            title: params.title,
            description: params.description || null,
            startTime,
            endTime,
            location: params.location || null,
            attendees: params.attendees ? JSON.stringify(params.attendees) : null,
            source: 'chat',
            userId,
          },
        });
        // Log capability execution to activity feed
        await prisma.activityLog.create({
          data: {
            action: 'capability_executed',
            actor: 'divi',
            summary: `Created calendar event: "${params.title}" at ${startTime.toISOString()}`,
            metadata: JSON.stringify({ capabilityType: 'meetings', action: 'create_event', title: params.title }),
            userId,
          },
        }).catch(() => {});
        return {
          tag: name,
          success: true,
          data: { id: calEvent.id, title: calEvent.title, startTime: calEvent.startTime.toISOString() },
        };
      
  },

  'create_document': async (params, userId, name) => {
        if (!params.title) {
          return { tag: name, success: false, error: 'Missing title' };
        }
        const validDocTypes = ['note', 'report', 'template', 'meeting_notes'];
        const docType = validDocTypes.includes(params.type) ? params.type : 'note';
        const doc = await prisma.document.create({
          data: {
            title: params.title,
            content: params.content || '',
            type: docType,
            tags: params.tags || null,
            userId,
          },
        });
        return {
          tag: name,
          success: true,
          data: { id: doc.id, title: doc.title, type: docType },
        };
      
  },

  'send_comms': async (params, userId, name) => {
        if (!params.content) {
          return { tag: name, success: false, error: 'Missing content' };
        }
        const comms = await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: params.content,
            state: 'new',
            priority: params.priority || 'normal',
            linkedCardId: params.linkedCardId || null,
            linkedContactId: params.linkedContactId || null,
            userId,
          },
        });
        return {
          tag: name,
          success: true,
          data: { id: comms.id, note: 'Message sent to Comms Channel' },
        };
      
  },

  'generate_meeting_notes': async (params, userId, name) => {
        // params: { eventId, recordingId? }
        if (!params.eventId) {
          return { tag: name, success: false, error: 'eventId is required.' };
        }
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'REPLACE_WITH_YOUR_GEMINI_API_KEY') {
          return { tag: name, success: false, error: 'GEMINI_API_KEY is not configured. The operator needs to add their Gemini API key.' };
        }
        const { generateAndSaveMeetingNotes } = await import('@/lib/gemini-meeting-notes');
        const result = await generateAndSaveMeetingNotes(userId, params.eventId, params.recordingId);
        return {
          tag: name,
          success: true,
          data: {
            documentId: result.documentId,
            summary: result.notes.summary,
            actionItems: result.notes.actionItems,
            topics: result.notes.topics,
            sentiment: result.notes.sentiment,
          },
        };
      
  },

  'sync_signal': async (params, userId, name) => {
        const syncService = params.service || 'all'; // email | calendar | drive | all
        const syncIdentity = params.identity || 'operator';
        if (syncService === 'all') {
          const { syncAllGoogleServices } = await import('@/lib/google-sync');
          const result = await syncAllGoogleServices(userId);
          return { tag: name, success: true, data: result };
        }
        // Find the integration for this service + identity
        const syncAccount = await prisma.integrationAccount.findFirst({
          where: { userId, service: syncService, identity: syncIdentity, provider: 'google' },
        });
        if (!syncAccount) {
          return { tag: name, success: false, error: `No Google ${syncService} integration found for ${syncIdentity}` };
        }
        const { syncGmail, syncCalendar, syncDrive } = await import('@/lib/google-sync');
        let synced = 0;
        if (syncService === 'email') synced = await syncGmail(syncAccount as any);
        else if (syncService === 'calendar') synced = await syncCalendar(syncAccount as any);
        else if (syncService === 'drive') synced = await syncDrive(syncAccount as any);

        await prisma.integrationAccount.update({
          where: { id: syncAccount.id },
          data: { lastSyncAt: new Date() },
        });
        return { tag: name, success: true, data: { service: syncService, synced } };
      
  },
};

export default handlers;
