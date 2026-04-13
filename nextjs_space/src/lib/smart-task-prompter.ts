/**
 * Smart Task Prompter v2
 *
 * When a queue item is created or edited, this module:
 * 1. Looks up the target agent's Integration Kit (requiredInputSchema,
 *    contextInstructions, usageExamples, executionNotes) from the marketplace.
 * 2. Calls an LLM to produce:
 *    - `displaySummary`: A short (≤120 char) human-readable line for the queue UI.
 *    - `optimizedPayload`: The full structured payload that the outbound agent
 *      expects, formatted to match its `requiredInputSchema`. If no schema is
 *      defined, falls back to a well-structured { task, context, deliverables }
 *      generic format.
 * 3. Stores both in the queue item's `metadata` JSON, preserving the original
 *    user input in `_original` for audit.
 *
 * The title and description on the QueueItem row remain the operator's own
 * words — never silently overwritten. The optimized version lives in metadata
 * and is what gets sent to the agent at execution time.
 */

import { prisma } from '@/lib/prisma';
import { getAvailableProvider } from '@/lib/llm';

// ─── Non-streaming LLM helper ──────────────────────────────────────────────
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
          max_tokens: 2048,
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
          max_tokens: 2048,
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

// ─── Build optimizer system prompt dynamically ─────────────────────────────
function buildOptimizerPrompt(agentKit: AgentIntegrationKit | null): string {
  let prompt = `You are the Task Optimization Engine for DiviDen, an AI agent operating system.

You receive a queue task (title, description, context, files, type) written by a human operator.
Your job is to produce TWO things:

1. **displaySummary** — A short human-readable summary (≤120 characters) for the queue card UI.
   - Starts with a verb. Captures the core intent.
   - Truncate gracefully — the full details live elsewhere.

2. **optimizedPayload** — The FULL structured payload to send to the outbound agent.
   - Preserve ALL information from the original (context, file references, names, dates, amounts, etc.).
   - Do NOT drop, summarize, or truncate anything in the payload. More detail is always better.
   - Do NOT invent information that wasn't in the original.
   - Structure it so the receiving agent can parse and execute immediately.
`;

  if (agentKit) {
    prompt += `\n## Target Agent: ${agentKit.name}\n`;
    if (agentKit.contextInstructions) {
      prompt += `\n### Context Preparation Instructions (from the agent developer):\n${agentKit.contextInstructions}\n`;
    }
    if (agentKit.requiredInputSchema) {
      prompt += `\n### Required Input Schema (the payload MUST conform to this):\n\`\`\`json\n${agentKit.requiredInputSchema}\n\`\`\`\n`;
      prompt += `\nThe \`optimizedPayload\` object MUST match this schema exactly. Fill every required field.\n`;
    }
    if (agentKit.usageExamples) {
      prompt += `\n### Usage Examples (from the agent developer):\n${agentKit.usageExamples}\n`;
    }
    if (agentKit.executionNotes) {
      prompt += `\n### Execution Notes:\n${agentKit.executionNotes}\n`;
    }
    if (agentKit.taskTypes) {
      prompt += `\n### Accepted Task Types: ${agentKit.taskTypes}\n`;
    }
  } else {
    prompt += `\n## No specific agent schema available.\nUse this generic structure for optimizedPayload:\n\`\`\`json\n{\n  "task": "Clear action statement",\n  "context": "All relevant background",\n  "deliverables": ["Expected output 1", "..."],\n  "files": ["any file references from the original"],\n  "constraints": "Any constraints or deadlines mentioned"\n}\n\`\`\`\n`;
  }

  prompt += `\n## Response Format\nRespond with ONLY valid JSON — no markdown fences, no explanation:\n{\n  "displaySummary": "Short ≤120 char summary for queue UI",\n  "optimizedPayload": { ... }\n}\n`;

  return prompt;
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface AgentIntegrationKit {
  name: string;
  taskTypes: string | null;
  contextInstructions: string | null;
  requiredInputSchema: string | null;
  outputSchema: string | null;
  usageExamples: string | null;
  contextPreparation: string | null;
  executionNotes: string | null;
  inputFormat: string;
}

// ─── Resolve the target agent's Integration Kit ────────────────────────────
async function resolveAgentKit(
  metadata: any
): Promise<AgentIntegrationKit | null> {
  // metadata.handler = { type: 'agent', id: '...', name: '...' }
  if (!metadata?.handler) return null;
  const handler = metadata.handler;

  if (handler.type === 'agent' && handler.id) {
    const agent = await prisma.marketplaceAgent.findUnique({
      where: { id: handler.id },
      select: {
        name: true,
        taskTypes: true,
        contextInstructions: true,
        requiredInputSchema: true,
        outputSchema: true,
        usageExamples: true,
        contextPreparation: true,
        executionNotes: true,
        inputFormat: true,
      },
    });
    return agent || null;
  }

  // For capability or builtin handlers, no Integration Kit — return null
  // The prompter will fall back to the generic structure
  return null;
}

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Optimizes a queue item for its target agent.
 *
 * Produces:
 * - metadata.displaySummary  — short line for queue card UI
 * - metadata.optimizedPayload — full structured payload for the agent
 * - metadata._original — snapshot of the operator's original title + description
 *
 * The QueueItem's own title/description are NOT overwritten.
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

  // Parse existing metadata
  let meta: any = {};
  if (item.metadata) {
    try { meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; } catch { /* ignore */ }
  }

  // Resolve the target agent's Integration Kit
  const agentKit = await resolveAgentKit(meta);

  // Build prompts
  const systemPrompt = buildOptimizerPrompt(agentKit);

  const userLines: string[] = [
    `Task type: ${item.type}`,
    `Title: ${item.title}`,
    `Description: ${item.description || '(none provided)'}`,
  ];

  // Include any attached file references from metadata
  if (meta.files && Array.isArray(meta.files)) {
    userLines.push(`Attached files: ${meta.files.map((f: any) => typeof f === 'string' ? f : f.name || f.url).join(', ')}`);
  }
  // Include any context fields already in metadata
  if (meta.context) userLines.push(`Context: ${meta.context}`);
  if (meta.expectedOutcome) userLines.push(`Expected outcome: ${meta.expectedOutcome}`);
  if (meta.taskType) userLines.push(`Task category: ${meta.taskType}`);

  const userPrompt = userLines.join('\n');

  const result = await callLLM(systemPrompt, userPrompt, userId);
  if (!result) return;

  try {
    const parsed = JSON.parse(result);
    if (!parsed.displaySummary && !parsed.optimizedPayload) return;

    // Store optimization results in metadata (never touch title/description)
    meta._original = meta._original || { title: item.title, description: item.description };
    if (parsed.displaySummary) meta.displaySummary = parsed.displaySummary;
    if (parsed.optimizedPayload) meta.optimizedPayload = parsed.optimizedPayload;
    meta._optimizedAt = new Date().toISOString();
    if (agentKit) meta._optimizedForAgent = agentKit.name;

    await prisma.queueItem.update({
      where: { id: item.id },
      data: { metadata: JSON.stringify(meta) },
    });

    console.log(`[smart-prompter] Optimized "${item.title}" → summary: "${parsed.displaySummary || '(unchanged)'}"`);
  } catch (err) {
    console.error('[smart-prompter] Failed to parse LLM response:', result, err);
  }
}
