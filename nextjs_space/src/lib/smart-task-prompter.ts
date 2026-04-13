/**
 * Smart Task Prompter
 * 
 * When a queue item is edited (via chat or UI), this module calls an LLM to
 * re-optimize the task title + description so it is maximally clear and
 * actionable for the target agent / capability type.
 *
 * The optimization is "invisible" — it runs in the background and silently
 * updates the queue item in the database. The user sees the improved version
 * next time the queue refreshes.
 */

import { prisma } from '@/lib/prisma';
import { getAvailableProvider } from '@/lib/llm';

// ─── Non-streaming LLM helper (lightweight, reusable) ─────────────────────
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  userId?: string
): Promise<string | null> {
  const provider = await getAvailableProvider(undefined, userId);
  if (!provider) return null;

  try {
    if (provider.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text || null;
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 512,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    console.error('[smart-prompter] LLM call failed:', err);
    return null;
  }
}

// ─── System prompt for task optimization ──────────────────────────────────
const OPTIMIZER_SYSTEM = `You are a task optimization engine for DiviDen, an AI agent operating system.

When given a queue task (title, description, type, handler metadata), you rewrite it to be:
1. **Specific** — no vague language. Include concrete deliverables.
2. **Actionable** — start with a verb. The agent receiving this should know exactly what to do.
3. **Context-rich** — preserve all relevant context from the original.
4. **Scoped** — match the handler/agent type so the receiving agent can parse it optimally.

Rules:
- Keep the title SHORT (under 80 chars). It should read like a task heading.
- The description should be 1-3 sentences max. Dense, not fluffy.
- Do NOT invent details that weren't in the original.
- Preserve the original intent exactly — just make it clearer.
- If the task is already well-formed, return it unchanged.

Respond with ONLY valid JSON: {"title": "...", "description": "..."}
No markdown, no explanation, no extra text.`;

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Optimizes a queue item's title and description for the target agent type.
 * Runs as fire-and-forget — caller doesn't wait for result.
 */
export async function optimizeTaskForAgent(
  queueItemId: string,
  userId: string
): Promise<void> {
  const item = await prisma.queueItem.findFirst({
    where: { id: queueItemId, userId },
    select: { id: true, title: true, description: true, type: true, metadata: true },
  });
  if (!item) return;

  // Parse handler info from metadata
  let handlerInfo = '';
  if (item.metadata) {
    try {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      if (meta.handler) handlerInfo = `Handler: ${JSON.stringify(meta.handler)}`;
      if (meta.capabilityType) handlerInfo = `Capability: ${meta.capabilityType} / ${meta.action || 'execute'}`;
      if (meta.taskType) handlerInfo = `Task type: ${meta.taskType}`;
    } catch { /* ignore */ }
  }

  const userPrompt = [
    `Task type: ${item.type}`,
    `Title: ${item.title}`,
    `Description: ${item.description || '(none)'}`,
    handlerInfo,
  ].filter(Boolean).join('\n');

  const result = await callLLM(OPTIMIZER_SYSTEM, userPrompt, userId);
  if (!result) return;

  try {
    const parsed = JSON.parse(result);
    const updateData: any = {};
    if (parsed.title && parsed.title !== item.title) updateData.title = parsed.title;
    if (parsed.description && parsed.description !== item.description) updateData.description = parsed.description;

    if (Object.keys(updateData).length > 0) {
      // Store original in metadata so user can see what changed
      let existingMeta: any = {};
      if (item.metadata) {
        try { existingMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; } catch { /* ignore */ }
      }
      existingMeta._preOptimize = { title: item.title, description: item.description };

      await prisma.queueItem.update({
        where: { id: item.id },
        data: {
          ...updateData,
          metadata: JSON.stringify(existingMeta),
        },
      });
      console.log(`[smart-prompter] Optimized task "${item.title}" → "${updateData.title || item.title}"`);
    }
  } catch (err) {
    console.error('[smart-prompter] Failed to parse LLM response:', result, err);
  }
}
