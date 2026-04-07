/**
 * DiviDen LLM Provider Integration
 *
 * Uses the user's OWN API keys (stored in DB via Settings)
 * for OpenAI (GPT-4) or Anthropic (Claude) streaming chat completions.
 * No default/free AI — users must bring their own keys.
 */

import { prisma } from './prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Fetch the user's active API key from the database.
 * Tries preferred provider first, then falls back to the other.
 */
export async function getAvailableProvider(
  preferredProvider?: LLMProvider
): Promise<{ provider: LLMProvider; apiKey: string } | null> {
  const order: LLMProvider[] = preferredProvider
    ? [preferredProvider, preferredProvider === 'openai' ? 'anthropic' : 'openai']
    : ['openai', 'anthropic'];

  for (const p of order) {
    const key = await prisma.agentApiKey.findFirst({
      where: { provider: p, isActive: true },
      select: { apiKey: true },
    });
    if (key?.apiKey) {
      return { provider: p, apiKey: key.apiKey };
    }
  }

  return null;
}

// ─── OpenAI Streaming ────────────────────────────────────────────────────────

async function streamOpenAI(
  apiKey: string,
  messages: LLMMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  await readSSEStream(response, callbacks);
}

// ─── Anthropic Streaming ─────────────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string,
  messages: LLMMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  // Separate system prompt from messages for Anthropic format
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemMsg?.content || '',
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  // Anthropic SSE has different event format
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let partial = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    partial += decoder.decode(value, { stream: true });
    const lines = partial.split('\n');
    partial = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text || '';
            if (text) {
              fullText += text;
              callbacks.onToken(text);
            }
          } else if (parsed.type === 'message_stop') {
            callbacks.onDone(fullText);
            return;
          }
        } catch {
          // skip
        }
      }
    }
  }

  callbacks.onDone(fullText);
}

// ─── Shared SSE Reader (OpenAI-format) ──────────────────────────────────────

async function readSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from LLM API');

  const decoder = new TextDecoder();
  let fullText = '';
  let partial = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    partial += decoder.decode(value, { stream: true });
    const lines = partial.split('\n');
    partial = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          callbacks.onDone(fullText);
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            callbacks.onToken(content);
          }
        } catch {
          // skip
        }
      }
    }
  }

  callbacks.onDone(fullText);
}

// ─── Main Streaming Function ─────────────────────────────────────────────────

/**
 * Stream LLM response using the user's own API keys.
 * Requires at least one active OpenAI or Anthropic key in settings.
 */
export async function streamLLMResponse(
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  preferredProvider?: LLMProvider
): Promise<void> {
  const available = await getAvailableProvider(preferredProvider);

  if (!available) {
    callbacks.onError(
      new Error(
        'No API key configured. Go to Settings and add your OpenAI or Anthropic API key to enable the AI agent.'
      )
    );
    return;
  }

  try {
    if (available.provider === 'anthropic') {
      await streamAnthropic(available.apiKey, messages, callbacks);
    } else {
      await streamOpenAI(available.apiKey, messages, callbacks);
    }
  } catch (error: any) {
    callbacks.onError(
      new Error(`LLM streaming error: ${error?.message || 'Unknown error'}`)
    );
  }
}
