/**
 * DiviDen LLM Provider Integration
 * 
 * Uses Abacus AI RouteLLM API for streaming chat completions.
 * Falls back gracefully if no API key is configured.
 */

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
 * Check if any LLM provider is available (Abacus AI API key).
 */
export async function getAvailableProvider(): Promise<{
  provider: LLMProvider;
  apiKey: string;
} | null> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (apiKey) {
    return { provider: 'openai', apiKey };
  }
  return null;
}

// ─── Main Streaming Function ─────────────────────────────────────────────────

/**
 * Stream LLM response using Abacus AI RouteLLM API.
 */
export async function streamLLMResponse(
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  _preferredProvider?: LLMProvider
): Promise<void> {
  const apiKey = process.env.ABACUSAI_API_KEY;

  if (!apiKey) {
    callbacks.onError(
      new Error('No API key configured. The ABACUSAI_API_KEY environment variable is not set.')
    );
    return;
  }

  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: messages.map((m: LLMMessage) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      callbacks.onError(new Error(`LLM API error (${response.status}): ${errText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('No response body from LLM API'));
      return;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let partialRead = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      partialRead += decoder.decode(value, { stream: true });
      const lines = partialRead.split('\n');
      partialRead = lines.pop() || '';

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
            // Skip invalid JSON
          }
        }
      }
    }

    // If we reach here without [DONE], still call onDone
    callbacks.onDone(fullText);
  } catch (error: any) {
    callbacks.onError(new Error(`LLM streaming error: ${error?.message || 'Unknown error'}`));
  }
}