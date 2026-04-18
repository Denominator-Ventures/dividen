/**
 * POST /api/chat/send
 * 
 * Main chat endpoint. Accepts user message, builds system prompt,
 * streams LLM response via SSE, parses action tags, executes them,
 * and saves messages to database.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { parseActionTags, executeActionTags, stripActionTags } from '@/lib/action-tags';
import { streamLLMResponse, type LLMMessage } from '@/lib/llm';
import { assembleBriefing } from '@/lib/catch-up-pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = (session.user as any).id;

  // ── Parse Request ─────────────────────────────────────────────────────
  let body: { message: string; provider?: string; catchUpMode?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, provider, catchUpMode } = body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Save User Message + Fetch User Data (parallel) ─────────────────
  const [, user] = await Promise.all([
    prisma.chatMessage.create({
      data: {
        role: 'user',
        content: message.trim(),
        userId,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, mode: true },
    }),
  ]);

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Build System Prompt + Fetch Message History + Inbound Relays (parallel) ──
  const [baseSystemPrompt, recentMessages, inboundRelays] = await Promise.all([
    buildSystemPrompt({
      userId: user.id,
      mode: user.mode,
      userName: user.name,
      currentMessage: message.trim(),
    }),
    prisma.chatMessage.findMany({
      where: { userId, clearedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Fetch the ONE oldest inbound relay for relay-badge metadata (FIFO — matches system prompt)
    prisma.agentRelay.findMany({
      where: {
        toUserId: userId,
        status: { in: ['delivered', 'user_review'] },
      },
      select: {
        id: true,
        subject: true,
        intent: true,
        payload: true,
        status: true,
        connectionId: true,
        createdAt: true,
        fromUser: { select: { id: true, name: true, email: true } },
        connection: { select: { nickname: true, peerNickname: true, peerUserName: true } },
      },
      orderBy: { createdAt: 'asc' },  // FIFO — oldest first, one per message
      take: 1,
    }),
  ]);

  let systemPrompt = baseSystemPrompt;

  // ── Catch-Up Mode: Assemble briefing data server-side and inject into prompt ──
  if (catchUpMode) {
    try {
      const briefing = await assembleBriefing(userId);
      systemPrompt += '\n\n---\n\n' + briefing.briefingContext + '\n\n---\n\n' + briefing.pacingPrompt;
    } catch (err: any) {
      console.error('[chat/send] Catch-up pipeline error:', err);
    }
  }

  // Build message history. For assistant messages that executed tags, inject a
  // post-message system note so Divi sees what actually happened (tags execute
  // AFTER her response streams, so inline awareness is impossible).
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];
  for (const m of recentMessages.reverse()) {
    llmMessages.push({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.role === 'assistant' ? stripActionTags(m.content) : m.content,
    });
    if (m.role === 'assistant' && m.metadata) {
      try {
        const meta = JSON.parse(m.metadata);
        const tagResults: any[] = Array.isArray(meta?.tags) ? meta.tags : [];
        if (tagResults.length > 0) {
          const lines: string[] = ['[Tag execution summary from your previous turn — this is what actually happened after you emitted:]'];
          for (const t of tagResults) {
            const d = t.data || {};
            if (!t.success) {
              lines.push(`- ${t.tag} FAILED: ${t.error || 'unknown error'}`);
              continue;
            }
            if (t.tag === 'relay_request') {
              lines.push(`- relay_request OK. relayId=${d.relayId}, to=${d.to || d.recipient || '?'}, status=${d.status}, intent=${d.intent}, message="${(d.message || d.subject || '').slice(0, 120)}"`);
            } else if (t.tag === 'relay_respond') {
              lines.push(`- relay_respond OK. relayId=${d.relayId}, status=${d.status}, response="${(d.subject || '').slice(0, 120)}"`);
            } else if (t.tag === 'relay_ambient') {
              lines.push(`- relay_ambient OK. ${d.ambientSignalCaptured ? 'signal captured' : ''} ${d.deliveredTo ? `delivered to ${d.deliveredTo}` : ''} ${d.skipped ? `skipped: ${d.skipped}` : ''}`);
            } else if (t.tag === 'task_route') {
              lines.push(`- task_route OK. queueItemId=${d.queueItemId || d.id}, assigned=${d.assignedTo || 'routing'}`);
            } else if (t.tag === 'accept_connection') {
              lines.push(`- accept_connection OK. connectionId=${d.connectionId}, peer=${d.peerName || '?'}`);
            } else if (t.tag === 'upsert_card') {
              lines.push(`- upsert_card OK. cardId=${d.cardId}, title="${(d.title || '').slice(0, 80)}"`);
            } else if (t.tag === 'query_relays') {
              lines.push(`- query_relays returned ${d.count || 0} relays:`);
              for (const r of (d.relays || []).slice(0, 15)) {
                lines.push(`    • ${r.id} | ${r.direction} | ${r.from} → ${r.to} | status=${r.status} | intent=${r.intent} | "${(r.subject || '').slice(0, 60)}"`);
              }
            } else if (t.tag === 'query_connections') {
              lines.push(`- query_connections returned ${d.count || 0} connections:`);
              for (const c of (d.connections || [])) {
                lines.push(`    • ${c.id} | ${c.peerName}${c.peerUsername ? ` (@${c.peerUsername})` : ''} | ${c.peerEmail || 'no-email'} | fed=${c.isFederated} | trust=${c.trustLevel} | scopes=[${(c.scopes || []).join(',')}]`);
              }
            } else {
              lines.push(`- ${t.tag} OK. ${JSON.stringify(d).slice(0, 200)}`);
            }
          }
          lines.push('[End of tag summary. The green/red/purple cards from these tags rendered in the chat UI AFTER your previous response finished streaming. If the user asks you to verify state, reference the IDs above.]');
          llmMessages.push({ role: 'system', content: lines.join('\n') });
        }
      } catch {}
    }
  }

  // ── Stream Response via SSE ───────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let fullResponse = '';

      streamLLMResponse(
        llmMessages,
        {

          onToken(token: string) {
            fullResponse += token;
            // Send each token as an SSE event
            const data = JSON.stringify({ type: 'token', content: token });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          },

          async onDone(fullText: string) {
            try {
              // Parse action tags from complete response
              const tags = parseActionTags(fullText);
              const cleanText = stripActionTags(fullText);

              // Log tag compliance for debugging
              if (tags.length > 0) {
                console.log(`[chat] Tags parsed: ${tags.map(t => t.name).join(', ')}`);
              } else if (/route|assign|dispatch|delegate|send.*task/i.test(fullText) && /\[\[/.test(fullText) === false) {
                console.warn(`[chat] ⚠️ Response mentions routing/assigning but has NO action tags. Possible LLM compliance issue.`);
              }

              // Execute action tags
              let tagResults: any[] = [];
              if (tags.length > 0) {
                tagResults = await executeActionTags(tags, userId);

                // If any ambient signal was captured, trigger background pattern synthesis
                const hadAmbientSignal = tagResults.some(r => r.data?.ambientSignalCaptured);
                if (hadAmbientSignal) {
                  // Fire-and-forget: synthesize patterns in background
                  import('@/lib/ambient-learning').then(({ synthesizePatterns, captureIgnoredAmbientSignals }) => {
                    captureIgnoredAmbientSignals()
                      .then(() => synthesizePatterns())
                      .catch(e => console.error('[ambient-learning] Background synthesis error:', e));
                  }).catch(() => {});
                }

                // Send tag execution results
                const tagData = JSON.stringify({
                  type: 'tags_executed',
                  results: tagResults,
                });
                controller.enqueue(encoder.encode(`data: ${tagData}\n\n`));
              }

              // Check if any tag result is a settings widget — merge widget data into metadata
              const settingsTag = tagResults.find((r: any) => r.data?.isSettingsWidget);
              const googleConnectTag = tagResults.find((r: any) => r.data?.widgetType === 'google_connect');
              // Attach relay context for UI badges (which relays were in Divi's context)
              const relayContext = inboundRelays.length > 0 ? inboundRelays.map(r => ({
                id: r.id,
                subject: r.subject,
                intent: r.intent,
                payload: r.payload,
                connectionId: r.connectionId,
                fromName: r.fromUser?.name || r.connection?.peerNickname || r.connection?.peerUserName || r.fromUser?.email || 'Unknown',
                createdAt: r.createdAt,
              })) : undefined;

              let msgMetadata: any = tags.length > 0 ? { tags: tagResults } : null;
              if (relayContext) {
                msgMetadata = { ...msgMetadata, relayContext };
              }
              if (settingsTag?.data) {
                msgMetadata = {
                  ...msgMetadata,
                  isOnboarding: true, // reuse the widget renderer
                  onboardingPhase: -1,
                  widgets: settingsTag.data.widgets,
                  settingsGroup: settingsTag.data.settingsGroup,
                };
              }
              // Google Connect widget — reuse onboarding widget renderer with google_connect type
              if (googleConnectTag?.data) {
                const gcWidgets = [{
                  type: 'google_connect' as const,
                  id: `google_connect_chat_${Date.now()}`,
                  label: googleConnectTag.data.label,
                  description: googleConnectTag.data.description,
                  identity: googleConnectTag.data.identity,
                  accountIndex: googleConnectTag.data.accountIndex,
                  connected: googleConnectTag.data.connected,
                  connectedEmail: googleConnectTag.data.connectedEmail,
                }];
                msgMetadata = {
                  ...msgMetadata,
                  isOnboarding: true,
                  onboardingPhase: -1,
                  widgets: [
                    ...(msgMetadata?.widgets || []),
                    ...gcWidgets,
                  ],
                };
              }

              // Save assistant message (with raw content including tags for context)
              await prisma.chatMessage.create({
                data: {
                  role: 'assistant',
                  content: fullText,
                  userId,
                  metadata: msgMetadata ? JSON.stringify(msgMetadata) : null,
                },
              });

              // Send done event with clean text (include widget metadata if present)
              const donePayload: any = {
                type: 'done',
                content: cleanText,
                tagsExecuted: tagResults.length,
              };
              if (settingsTag?.data || googleConnectTag?.data || relayContext) {
                donePayload.metadata = msgMetadata;
              }
              const doneData = JSON.stringify(donePayload);
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
              controller.close();
            } catch (error: any) {
              console.error('[chat/send] Error in onDone:', error);
              const errData = JSON.stringify({
                type: 'error',
                content: 'Failed to process response',
              });
              controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
              controller.close();
            }
          },

          onError(error: Error) {
            console.error('[chat/send] LLM error:', error.message);
            const errData = JSON.stringify({
              type: 'error',
              content: error.message,
            });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
            controller.close();
          },
        },
        provider as any,
        userId
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
