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
  'relay_request': async (params, userId, name) => {
        // params: { connectionNickname or connectionId, intent, subject, payload?, priority? }
        const subject = params.subject || params.message || 'Agent relay request';
        const intent = params.intent || 'custom';
        const priority = params.priority || 'normal';

        // Find the connection — by nickname, username, email, or ID
        let connection: any = null;
        if (params.connectionId) {
          connection = await prisma.connection.findUnique({ where: { id: params.connectionId } });
        } else if (params.connectionNickname || params.to || params.name || params.username || params.handle) {
          // Normalize search — strip leading @ if present
          let search = (params.connectionNickname || params.to || params.name || params.username || params.handle || '').toString().toLowerCase().trim();
          if (search.startsWith('@')) search = search.slice(1);
          const allConns = await prisma.connection.findMany({
            where: {
              OR: [{ requesterId: userId }, { accepterId: userId }],
              status: 'active',
            },
            include: {
              requester: { select: { id: true, name: true, email: true, username: true } },
              accepter: { select: { id: true, name: true, email: true, username: true } },
            },
          });
          // Prefer EXACT username match first (most specific), then substring match on other fields
          connection = allConns.find((c: any) => {
            const peer = c.requesterId === userId ? c.accepter : c.requester;
            const peerUsername = (peer?.username || '').toLowerCase();
            return peerUsername && peerUsername === search;
          });
          if (!connection) {
            connection = allConns.find((c: any) => {
              const peer = c.requesterId === userId ? c.accepter : c.requester;
              const nick = (c.nickname || '').toLowerCase();
              const peerNick = (c.peerNickname || '').toLowerCase();
              const peerName = (c.peerUserName || '').toLowerCase();
              const peerUsername = (peer?.username || '').toLowerCase();
              const reqName = (c.requester?.name || '').toLowerCase();
              const accName = (c.accepter?.name || '').toLowerCase();
              const reqEmail = (c.requester?.email || '').toLowerCase();
              const accEmail = (c.accepter?.email || '').toLowerCase();
              return [nick, peerNick, peerName, peerUsername, reqName, accName, reqEmail, accEmail].some(v => v && v.includes(search));
            });
          }
        }

        if (!connection) {
          return { tag: name, success: false, error: 'Could not find an active connection matching that name. The user may need to connect first.' };
        }

        const toUserId_relay = connection.requesterId === userId ? connection.accepterId : connection.requesterId;

        // Threading: inherit threadId if continuing a thread, or generate new
        let relayThreadId = params.threadId || null;
        if (!relayThreadId && params.parentRelayId) {
          const parentRelay = await prisma.agentRelay.findUnique({ where: { id: params.parentRelayId }, select: { threadId: true } });
          relayThreadId = parentRelay?.threadId || null;
        }

        const relay = await prisma.agentRelay.create({
          data: {
            connectionId: connection.id,
            fromUserId: userId,
            toUserId: connection.isFederated ? null : toUserId_relay,
            direction: 'outbound',
            type: 'request',
            intent,
            subject,
            payload: params.payload ? (typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload)) : null,
            status: 'pending',
            priority,
            threadId: relayThreadId,
            parentRelayId: params.parentRelayId || null,
            peerInstanceUrl: connection.isFederated ? connection.peerInstanceUrl : null,
            cardId: params.cardId || null, // v2: Direct FK to source card if provided
            // v2.3.2 — multi-tenant routing (caller supplies scope when relay is project/team-linked)
            teamId: params.teamId || undefined,
            projectId: params.projectId || undefined,
          },
        });

        // Notify the receiver (local)
        if (!connection.isFederated && toUserId_relay) {
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 Relay sent on your behalf: "${subject}"`,
              state: 'new',
              priority,
              userId: toUserId_relay,
              metadata: JSON.stringify({ type: 'agent_relay', relayId: relay.id, intent }),
            },
          });
          await prisma.agentRelay.update({ where: { id: relay.id }, data: { status: 'delivered' } });
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_sent',
            actor: 'divi',
            summary: `Divi sent ${intent} relay: "${subject}"`,
            metadata: JSON.stringify({ relayId: relay.id, connectionId: connection.id }),
            userId,
          },
        });

        // Push relay state webhook
        pushRelayStateChanged(userId, { relayId: relay.id, threadId: relayThreadId, previousState: null, newState: 'pending', subject });

        // Resolve recipient label for UI (green card)
        let peerLabel = '';
        try {
          const connFull = await prisma.connection.findUnique({
            where: { id: connection.id },
            include: {
              requester: { select: { name: true, email: true, username: true } },
              accepter: { select: { name: true, email: true, username: true } },
            },
          });
          if (connFull) {
            const isRequester = connFull.requesterId === userId;
            const peer = isRequester ? connFull.accepter : connFull.requester;
            // Jon's label for peer depends on which side of the connection Jon is on:
            // - requester side: `nickname` (the requester's own label for the accepter)
            // - accepter side: `peerNickname` (the accepter's own label for the requester)
            const myLabelForPeer = isRequester ? (connFull as any).nickname : (connFull as any).peerNickname;
            peerLabel = myLabelForPeer || (connFull as any).peerUserName || peer?.name || peer?.username || peer?.email || '';
          }
        } catch {}

        const payloadMsg = params.payload
          ? (typeof params.payload === 'string' ? params.payload : (params.payload.message || params.payload.question || JSON.stringify(params.payload)))
          : null;

        return {
          tag: name,
          success: true,
          data: {
            relayId: relay.id,
            threadId: relayThreadId,
            subject,
            message: payloadMsg || subject,
            intent,
            status: connection.isFederated ? 'pending' : 'delivered',
            to: peerLabel || undefined,
            recipient: peerLabel || undefined,
          },
        };
      
  },

  'relay_broadcast': async (params, userId, name) => {
        // params: { subject, payload?, intent?, priority?, context?, teamId?, projectId? }
        // Sends a relay to connections — scoped to team/project members when provided, otherwise all connections
        const broadcastSubject = params.subject || params.message || 'Team-wide query';
        const broadcastIntent = params.intent || 'ask';
        const broadcastPriority = params.priority || 'normal';

        // Build scoped connection ID set when team/project is specified
        let scopedConnIds: Set<string> | null = null;
        if (params.projectId) {
          const projMembers = await prisma.projectMember.findMany({
            where: { projectId: params.projectId },
            select: { connectionId: true },
          });
          scopedConnIds = new Set(projMembers.map((m: any) => m.connectionId).filter(Boolean) as string[]);
        } else if (params.teamId) {
          const tmMembers = await prisma.teamMember.findMany({
            where: { teamId: params.teamId },
            select: { connectionId: true },
          });
          scopedConnIds = new Set(tmMembers.map((m: any) => m.connectionId).filter(Boolean) as string[]);
        }

        const allActiveConns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            status: 'active',
            ...(scopedConnIds ? { id: { in: Array.from(scopedConnIds) } } : {}),
          },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        if (allActiveConns.length === 0) {
          return { tag: name, success: false, error: 'No active connections to broadcast to.' };
        }

        // Check recipient relay preferences — respect broadcast opt-outs
        const peerUserIds = allActiveConns.map((c: any) => c.requesterId === userId ? c.accepterId : c.requesterId).filter(Boolean) as string[];
        const peerProfiles = await prisma.userProfile.findMany({
          where: { userId: { in: peerUserIds } },
          select: { userId: true, relayMode: true, allowBroadcasts: true },
        });
        const profileMap = new Map<string, any>(peerProfiles.map((p: any) => [p.userId, p]));

        const broadcastResults: { name: string; relayId: string }[] = [];
        const skipped: string[] = [];
        for (const conn of allActiveConns) {
          const toId = conn.requesterId === userId ? conn.accepterId : conn.requesterId;

          // Check if recipient opted out of broadcasts
          if (toId) {
            const peerPref = profileMap.get(toId);
            if (peerPref) {
              if (peerPref.relayMode === 'off' || peerPref.relayMode === 'minimal' || !peerPref.allowBroadcasts) {
                const peerName = conn.requesterId === userId
                  ? (conn.accepter?.name || 'Unknown')
                  : (conn.requester?.name || 'Unknown');
                skipped.push(peerName);
                continue;
              }
            }
          }
          const peerName = conn.requesterId === userId
            ? (conn.accepter?.name || conn.nickname || 'Unknown')
            : (conn.requester?.name || conn.peerNickname || 'Unknown');

          const relay = await prisma.agentRelay.create({
            data: {
              connectionId: conn.id,
              fromUserId: userId,
              toUserId: conn.isFederated ? null : toId,
              direction: 'outbound',
              type: 'request',
              intent: broadcastIntent,
              subject: broadcastSubject,
              payload: JSON.stringify({
                ...(params.payload ? (typeof params.payload === 'object' ? params.payload : { data: params.payload }) : {}),
                _broadcast: true,
                _context: params.context || null,
              }),
              status: 'pending',
              priority: broadcastPriority,
              peerInstanceUrl: conn.isFederated ? conn.peerInstanceUrl : null,
              ...(params.teamId ? { teamId: params.teamId } : {}),
              ...(params.projectId ? { projectId: params.projectId } : {}),
            },
          });

          // Deliver: local users get comms, federated connections get pushed
          if (conn.isFederated) {
            // Push to federated instance
            try {
              const { pushRelayToFederatedInstance } = await import('../federation-push');
              const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
              pushRelayToFederatedInstance(conn.id, {
                relayId: relay.id,
                fromUserEmail: senderUser?.email || '',
                fromUserName: senderUser?.name || '',
                fromUserId: userId,
                toUserEmail: conn.peerUserEmail || undefined,
                type: 'request',
                intent: broadcastIntent,
                subject: broadcastSubject,
                payload: {
                  ...(params.payload ? (typeof params.payload === 'object' ? params.payload : { data: params.payload }) : {}),
                  _broadcast: true,
                  _context: params.context || null,
                },
                priority: broadcastPriority,
              });
            } catch (fedErr: any) {
              console.warn('[relay_broadcast] Failed to push federated relay:', fedErr?.message);
            }
          } else if (toId) {
            await prisma.commsMessage.create({
              data: {
                sender: 'divi',
                content: `📡 Team relay: "${broadcastSubject}"`,
                state: 'new',
                priority: broadcastPriority,
                userId: toId,
                metadata: JSON.stringify({ type: 'agent_relay', relayId: relay.id, intent: broadcastIntent, broadcast: true }),
              },
            });
            await prisma.agentRelay.update({ where: { id: relay.id }, data: { status: 'delivered' } });
          }

          broadcastResults.push({ name: peerName, relayId: relay.id });
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_broadcast',
            actor: 'divi',
            summary: `Divi broadcast "${broadcastSubject}" to ${broadcastResults.length} connections`,
            metadata: JSON.stringify({ relayIds: broadcastResults.map(r => r.relayId) }),
            userId,
          },
        }).catch(() => {});

        return {
          tag: name,
          success: true,
          data: {
            sent: broadcastResults.length,
            recipients: broadcastResults.map(r => r.name),
            subject: broadcastSubject,
          },
        };
      
  },

  'relay_ambient': async (params, userId, name) => {
        // params: { to (name/email), message|question|subject, intent?, context?, topic? }
        // Creates a LOW-PRIORITY relay that the receiving agent should weave naturally into conversation
        // rather than interrupting with a notification. Accepts ANY message type — updates, questions, intros,
        // schedules, opinions, observations — not just questions.
        const ambientMessage = params.message || params.subject || params.question || params.text || '';
        if (!ambientMessage) {
          return { tag: name, success: false, error: 'Missing message for ambient relay' };
        }

        const searchTerm = (params.to || params.name || params.connectionNickname || '').toLowerCase();
        if (!searchTerm) {
          return { tag: name, success: false, error: 'Must specify who to send to (to/name)' };
        }

        // Intent defaults to 'custom' — ambient can convey any of: ask, share_update, intro, schedule, opinion, note, custom
        const ambientIntent = (params.intent || 'custom').toString();

        const ambientConns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            status: 'active',
          },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            accepter: { select: { id: true, name: true, email: true } },
          },
        });

        const ambientConn = ambientConns.find((c: any) => {
          const nick = (c.nickname || '').toLowerCase();
          const peerNick = (c.peerNickname || '').toLowerCase();
          const peerName = (c.peerUserName || '').toLowerCase();
          const reqName = (c.requester?.name || '').toLowerCase();
          const accName = (c.accepter?.name || '').toLowerCase();
          const reqEmail = (c.requester?.email || '').toLowerCase();
          const accEmail = (c.accepter?.email || '').toLowerCase();
          return [nick, peerNick, peerName, reqName, accName, reqEmail, accEmail].some(v => v.includes(searchTerm));
        });

        if (!ambientConn) {
          return { tag: name, success: false, error: `No active connection matching "${searchTerm}"` };
        }

        const ambientToId = ambientConn.requesterId === userId ? ambientConn.accepterId : ambientConn.requesterId;

        // Check recipient's ambient relay preferences
        if (ambientToId) {
          const recipientProfile = await prisma.userProfile.findUnique({
            where: { userId: ambientToId },
            select: { relayMode: true, allowAmbientInbound: true, relayTopicFilters: true },
          });
          if (recipientProfile) {
            if (recipientProfile.relayMode === 'off' || recipientProfile.relayMode === 'minimal') {
              return { tag: name, success: false, error: `Recipient has relay mode set to "${recipientProfile.relayMode}" — ambient relays not accepted.` };
            }
            if (!recipientProfile.allowAmbientInbound) {
              return { tag: name, success: false, error: 'Recipient has opted out of receiving ambient relays.' };
            }
            // Check topic filters
            if (params.topic && recipientProfile.relayTopicFilters) {
              try {
                const filters: string[] = JSON.parse(recipientProfile.relayTopicFilters);
                if (filters.some(f => params.topic.toLowerCase().includes(f.toLowerCase()))) {
                  return { tag: name, success: false, error: `Recipient has opted out of "${params.topic}" topic relays.` };
                }
              } catch {}
            }
          }
        }

        const ambientRelay = await prisma.agentRelay.create({
          data: {
            connectionId: ambientConn.id,
            fromUserId: userId,
            toUserId: ambientConn.isFederated ? null : ambientToId,
            direction: 'outbound',
            type: 'request',
            intent: ambientIntent,
            subject: ambientMessage,
            payload: JSON.stringify({
              _ambient: true,
              _context: params.context || null,
              _topic: params.topic || null,
              _instruction: 'This is an ambient relay. Do NOT interrupt the user. Instead, naturally weave this message into your next conversation when contextually relevant. Respond if/when you have a natural answer.',
            }),
            status: 'pending',
            priority: 'low',
            peerInstanceUrl: ambientConn.isFederated ? ambientConn.peerInstanceUrl : null,
            ...(params.teamId ? { teamId: params.teamId } : {}),
            ...(params.projectId ? { projectId: params.projectId } : {}),
          },
        });

        // Deliver: local users get silent delivery, federated connections get pushed
        if (ambientConn.isFederated) {
          try {
            const { pushRelayToFederatedInstance } = await import('../federation-push');
            const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            pushRelayToFederatedInstance(ambientConn.id, {
              relayId: ambientRelay.id,
              fromUserEmail: senderUser?.email || '',
              fromUserName: senderUser?.name || '',
              fromUserId: userId,
              toUserEmail: ambientConn.peerUserEmail || undefined,
              type: 'request',
              intent: ambientIntent,
              subject: ambientMessage,
              payload: {
                _ambient: true,
                _context: params.context || null,
                _topic: params.topic || null,
                _instruction: 'This is an ambient relay. Do NOT interrupt the user. Weave naturally into conversation.',
              },
              priority: 'low',
            });
          } catch (fedErr: any) {
            console.warn('[relay_ambient] Failed to push federated ambient relay:', fedErr?.message);
          }
        } else if (ambientToId) {
          await prisma.agentRelay.update({ where: { id: ambientRelay.id }, data: { status: 'delivered' } });
          // No comms notification for ambient relays — the receiving agent picks it up silently
        }

        await prisma.activityLog.create({
          data: {
            action: 'relay_ambient',
            actor: 'divi',
            summary: `Divi sent ambient ${ambientIntent} to ${searchTerm}: "${ambientMessage.slice(0, 60)}..."`,
            metadata: JSON.stringify({ relayId: ambientRelay.id, intent: ambientIntent }),
            userId,
          },
        }).catch(() => {});

        return {
          tag: name,
          success: true,
          data: {
            relayId: ambientRelay.id,
            to: searchTerm,
            subject: ambientMessage,
            message: ambientMessage,
            intent: ambientIntent,
            mode: 'ambient',
            note: `Sent as ambient ${ambientIntent} relay — their agent will work this into conversation naturally.`,
          },
        };
      
  },

  'accept_connection': async (params, userId, name) => {
        // params: { connectionId }
        if (!params.connectionId) {
          return { tag: name, success: false, error: 'connectionId is required.' };
        }
        const conn = await prisma.connection.findUnique({ where: { id: params.connectionId } });
        if (!conn || conn.accepterId !== userId || conn.status !== 'pending') {
          return { tag: name, success: false, error: 'No pending connection found for you with that ID.' };
        }
        const acceptedConn = await prisma.connection.update({
          where: { id: params.connectionId },
          data: { status: 'active' },
        });
        await prisma.commsMessage.create({
          data: {
            sender: 'divi',
            content: `Connection accepted! Agents can now communicate.`,
            state: 'new',
            priority: 'normal',
            userId: conn.requesterId,
            metadata: JSON.stringify({ type: 'connection_accepted', connectionId: params.connectionId }),
          },
        });
        return { tag: name, success: true, data: { connectionId: acceptedConn.id, status: 'active' } };
      
  },

  'relay_respond': async (params, userId, name) => {
        // params: { relayId, status ("completed"|"declined"), responsePayload?,
        //           _ambientQuality?, _ambientDisruption?, _ambientTopicRelevance?, _conversationTopic?, _questionPhrasing? }
        // Flexible: also accept { to, message } or { response } as fallback formats
        const resolvedPayload = params.responsePayload || params.message || params.response || params.text || null;
        const resolvedStatus = params.status || 'completed'; // default to completed

        // If relayId is missing, auto-resolve: find the oldest unresolved inbound relay for this user
        let resolvedRelayId = params.relayId;
        if (!resolvedRelayId) {
          const autoRelay = await prisma.agentRelay.findFirst({
            where: { toUserId: userId, status: { in: ['delivered', 'user_review'] } },
            orderBy: { createdAt: 'asc' }, // FIFO
          });
          if (autoRelay) {
            resolvedRelayId = autoRelay.id;
            console.log(`[relay_respond] Auto-resolved relayId: ${resolvedRelayId} (LLM omitted relayId)`);
          } else {
            return { tag: name, success: false, error: 'No unresolved inbound relay found to respond to.' };
          }
        }

        const relayToRespond = await prisma.agentRelay.findUnique({ where: { id: resolvedRelayId } });
        if (!relayToRespond) {
          return { tag: name, success: false, error: 'Relay not found.' };
        }
        const updatedRelay = await prisma.agentRelay.update({
          where: { id: resolvedRelayId },
          data: {
            status: resolvedStatus,
            resolvedAt: new Date(),
            responsePayload: resolvedPayload ? (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)) : null,
          },
        });

        // ── Ambient Learning: Capture signal if this was an ambient relay ──
        let isAmbient = false;
        let ambientTopic: string | null = null;
        try {
          const payload = JSON.parse(relayToRespond.payload || '{}');
          isAmbient = !!payload._ambient;
          ambientTopic = payload._topic || null;
        } catch {}

        if (isAmbient) {
          try {
            const { captureAmbientSignal } = await import('../ambient-learning');
            await captureAmbientSignal({
              relayId: resolvedRelayId,
              fromUserId: relayToRespond.fromUserId,
              toUserId: userId,
              relayCreatedAt: relayToRespond.createdAt,
              outcome: resolvedStatus === 'completed' ? 'answered' : 'declined',
              responseQuality: params._ambientQuality || (
                resolvedPayload && (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)).length > 50
                  ? 'substantive' : resolvedPayload ? 'brief' : null
              ),
              disruptionLevel: params._ambientDisruption || null,
              topicRelevance: params._ambientTopicRelevance || null,
              ambientTopic,
              conversationTopic: params._conversationTopic || null,
              questionPhrasing: params._questionPhrasing || null,
            });
          } catch (err: any) {
            console.error('[ambient-learning] Failed to capture signal:', err.message);
          }
        }

        // Notify the original sender
        if (relayToRespond.fromUserId !== userId) {
          const statusLabel = resolvedStatus === 'completed' ? '✅ completed' : '❌ declined';
          await prisma.commsMessage.create({
            data: {
              sender: 'divi',
              content: `📡 Divi ${statusLabel} the relay: "${relayToRespond.subject}"`,
              state: 'new',
              priority: relayToRespond.priority || 'normal',
              userId: relayToRespond.fromUserId,
              metadata: JSON.stringify({ type: 'relay_response', relayId: resolvedRelayId }),
            },
          });
        }
        // Push relay state webhook
        pushRelayStateChanged(relayToRespond.fromUserId, {
          relayId: resolvedRelayId,
          threadId: relayToRespond.threadId,
          previousState: relayToRespond.status,
          newState: resolvedStatus,
          subject: relayToRespond.subject,
        });

        // ── Sync delegation status on sender's checklist item ──
        // Find any checklist item linked to this relay (sourceType='relay', sourceId=relayId)
        try {
          const linkedChecklist = await prisma.checklistItem.findFirst({
            where: { sourceType: 'relay', sourceId: resolvedRelayId },
          });
          if (linkedChecklist) {
            const newDelegationStatus = resolvedStatus === 'completed' ? 'accepted' : resolvedStatus === 'declined' ? 'declined' : resolvedStatus;
            await prisma.checklistItem.update({
              where: { id: linkedChecklist.id },
              data: {
                delegationStatus: newDelegationStatus,
                completed: resolvedStatus === 'completed' ? false : linkedChecklist.completed, // accepted != completed
              },
            });
          }
        } catch {}

        // ── Sync linked queue item if relay_respond completes the relay ──
        if (relayToRespond.queueItemId && (resolvedStatus === 'completed' || resolvedStatus === 'declined')) {
          try {
            const { syncQueueWithRelayCompletion } = await import('../relay-queue-bridge');
            await syncQueueWithRelayCompletion(resolvedRelayId, relayToRespond.fromUserId, resolvedPayload || resolvedStatus);
          } catch {}
        }

        // ── Push completion ack back to originating federated instance ──
        if (relayToRespond.peerRelayId && relayToRespond.peerInstanceUrl) {
          try {
            const { pushRelayAckToFederatedInstance } = await import('../federation-push');
            pushRelayAckToFederatedInstance({
              id: relayToRespond.id,
              peerRelayId: relayToRespond.peerRelayId,
              peerInstanceUrl: relayToRespond.peerInstanceUrl,
              connectionId: relayToRespond.connectionId,
              subject: relayToRespond.subject,
              status: resolvedStatus,
              responsePayload: resolvedPayload ? (typeof resolvedPayload === 'string' ? resolvedPayload : JSON.stringify(resolvedPayload)) : null,
            }).catch(() => {});
          } catch {}
        }

        // Build the display string for the outgoing response card:
        // - If declined with no payload: show "Declined: <original subject>"
        // - Otherwise: show the operator's actual response payload (what they sent back)
        // - Fallback: explicit acknowledgement — NEVER echo the raw inbound subject (bug #2)
        const responseText: string = (() => {
          if (typeof resolvedPayload === 'string' && resolvedPayload.trim()) return resolvedPayload.trim();
          if (resolvedPayload && typeof resolvedPayload === 'object') {
            try {
              const s = JSON.stringify(resolvedPayload);
              return s.length > 200 ? s.slice(0, 200) + '…' : s;
            } catch { /* noop */ }
          }
          if (resolvedStatus === 'declined') return `Declined: ${relayToRespond.subject}`;
          if (resolvedStatus === 'completed') return `Acknowledged: ${relayToRespond.subject}`;
          // Any other status with no payload: show the status + hint, NOT the raw inbound subject
          return `${resolvedStatus}: ${relayToRespond.subject}`;
        })();

        // Resolve recipient label for the green outgoing card (who this response went to)
        let respondToLabel = '';
        try {
          if (relayToRespond.fromUserId) {
            const fromUser = await prisma.user.findUnique({
              where: { id: relayToRespond.fromUserId },
              select: { name: true, email: true, username: true },
            });
            respondToLabel = fromUser?.name || fromUser?.username || fromUser?.email || '';
          }
          if (!respondToLabel && relayToRespond.connectionId) {
            const connFull = await prisma.connection.findUnique({
              where: { id: relayToRespond.connectionId },
              select: { peerUserName: true, peerNickname: true, nickname: true },
            });
            respondToLabel = connFull?.peerUserName || connFull?.peerNickname || connFull?.nickname || '';
          }
        } catch {}

        return {
          tag: name,
          success: true,
          data: {
            relayId: updatedRelay.id,
            status: resolvedStatus,
            // `subject` is what the outgoing-response card renders — this must be
            // the operator's response, NOT the original inbound subject.
            subject: responseText,
            originalSubject: relayToRespond.subject,
            responsePayload: resolvedPayload || null,
            ambientSignalCaptured: isAmbient,
            to: respondToLabel || undefined,
            recipient: respondToLabel || undefined,
          },
        };
      
  },

  'query_relays': async (params, userId, name) => {
        const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 50);
        const directionFilter = params.direction; // 'inbound' | 'outbound' | undefined
        const statusFilter = params.status; // optional status filter
        const where: any = {};
        if (directionFilter === 'inbound') {
          where.toUserId = userId;
        } else if (directionFilter === 'outbound') {
          where.fromUserId = userId;
        } else {
          where.OR = [{ toUserId: userId }, { fromUserId: userId }];
        }
        if (statusFilter) {
          where.status = Array.isArray(statusFilter) ? { in: statusFilter } : statusFilter;
        }
        const relays = await prisma.agentRelay.findMany({
          where,
          include: {
            fromUser: { select: { id: true, name: true, email: true, username: true } },
            toUser: { select: { id: true, name: true, email: true, username: true } },
            connection: { select: { id: true, isFederated: true, peerUserName: true, peerUserEmail: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        const relaySummary = relays.map(r => ({
          id: r.id,
          direction: r.fromUserId === userId ? 'outbound' : 'inbound',
          from: r.fromUser?.name || r.fromUser?.email || 'Unknown',
          to: r.toUser?.name || r.connection?.peerUserName || r.connection?.peerUserEmail || 'Unknown',
          status: r.status,
          intent: r.intent,
          subject: r.subject,
          isFederated: !!r.connection?.isFederated,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
        }));
        return { tag: name, success: true, data: { count: relaySummary.length, relays: relaySummary } };
      
  },

  'query_connections': async (params, userId, name) => {
        const conns = await prisma.connection.findMany({
          where: {
            OR: [{ requesterId: userId }, { accepterId: userId }],
            status: params.status || 'active',
          },
          include: {
            requester: { select: { id: true, name: true, email: true, username: true } },
            accepter: { select: { id: true, name: true, email: true, username: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });
        const connSummary = conns.map(c => {
          const isRequester = c.requesterId === userId;
          const peer = isRequester ? c.accepter : c.requester;
          const myLabelForPeer = isRequester ? c.nickname : c.peerNickname;
          let perms: any = {};
          try { perms = JSON.parse(c.permissions); } catch {}
          return {
            id: c.id,
            peerName: peer?.name || c.peerUserName || myLabelForPeer || 'Unknown',
            peerEmail: peer?.email || c.peerUserEmail || null,
            peerUsername: peer?.username || null,
            isFederated: c.isFederated,
            peerInstanceUrl: c.peerInstanceUrl || null,
            status: c.status,
            trustLevel: perms.trustLevel || 'supervised',
            scopes: perms.scopes || [],
          };
        });
        return { tag: name, success: true, data: { count: connSummary.length, connections: connSummary } };
      
  },
};

export default handlers;
