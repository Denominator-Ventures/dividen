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

  // ── Save User Message ─────────────────────────────────────────────────
  await prisma.chatMessage.create({
    data: {
      role: 'user',
      content: message.trim(),
      userId,
    },
  });

  // ── Fetch User Data ───────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, mode: true },
  });

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Build System Prompt (dynamic — loads only relevant groups) ────────
  let systemPrompt = await buildSystemPrompt({
    userId: user.id,
    mode: user.mode,
    userName: user.name,
    currentMessage: message.trim(),
  });

  // ── Catch-Up Mode: Assemble briefing data server-side and inject into prompt ──
  if (catchUpMode) {
    try {
      const briefing = await assembleBriefing(userId);
      // Append the pre-assembled briefing context + pacing instructions to the system prompt
      systemPrompt += '\n\n---\n\n' + briefing.briefingContext + '\n\n---\n\n' + briefing.pacingPrompt;
    } catch (err: any) {
      console.error('[chat/send] Catch-up pipeline error:', err);
      // Fallback: continue without briefing data — LLM will use system prompt context
    }
  }

  // ── Build Message History ─────────────────────────────────────────────
  // Use up to 50 recent non-cleared messages for context continuity.
  // The thread continues as long as the user wants — clearing starts fresh
  // but Divi still has underlying knowledge via system prompt + memory.
  const recentMessages = await prisma.chatMessage.findMany({
    where: { userId, clearedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.role === 'assistant' ? stripActionTags(m.content) : m.content,
    })),
  ];

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
              let msgMetadata: any = tags.length > 0 ? { tags: tagResults } : null;
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
              if (settingsTag?.data || googleConnectTag?.data) {
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
