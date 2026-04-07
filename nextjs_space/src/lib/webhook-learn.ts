/**
 * Webhook Auto-Learn Engine
 * 
 * Uses LLM to analyze incoming webhook payloads and produce field mappings
 * so DiviDen knows how to interpret data from any provider.
 * 
 * Flow:
 * 1. First payload arrives with no mapping → process with defaults + trigger learn
 * 2. LLM analyzes payload structure → produces a fieldMap
 * 3. fieldMap saved to webhook.mappingRules
 * 4. Future payloads use the fieldMap for accurate extraction
 * 5. User can manually override any field mapping in Settings
 */

import { prisma } from '@/lib/prisma';
import { getAvailableProvider } from '@/lib/llm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookFieldMap {
  [key: string]: string; // target_field → source_field_path (dot notation)
}

export interface WebhookMappingConfig {
  fieldMap: WebhookFieldMap;
  source: 'auto_learned' | 'manual' | 'mixed';
  learnedAt?: string;
  confidence?: 'high' | 'medium' | 'low';
  samplePayloadKeys?: string[];
}

// ─── Field Map Templates ─────────────────────────────────────────────────────

const FIELD_TEMPLATES: Record<string, string[]> = {
  calendar: ['title', 'description', 'startTime', 'endTime', 'location', 'attendees'],
  email: ['subject', 'fromName', 'fromEmail', 'toEmail', 'body', 'snippet', 'labels', 'receivedAt'],
  transcript: ['title', 'transcript', 'summary', 'actionItems', 'participants'],
  generic: ['title', 'description', 'type', 'priority'],
};

// ─── Payload Key Extractor ───────────────────────────────────────────────────

function extractAllPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      // Go one level deeper for nested objects (not arrays)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [subKey, subValue] of Object.entries(value)) {
          const subPath = `${path}.${subKey}`;
          paths.push(subPath);
          // One more level
          if (subValue && typeof subValue === 'object' && !Array.isArray(subValue)) {
            for (const deepKey of Object.keys(subValue)) {
              paths.push(`${subPath}.${deepKey}`);
            }
          }
        }
      }
    }
  }
  return paths;
}

// ─── LLM Analysis ────────────────────────────────────────────────────────────

async function callLLMNonStreaming(
  systemPrompt: string,
  userPrompt: string,
  userId?: string
): Promise<string | null> {
  const provider = await getAvailableProvider(undefined, userId);
  if (!provider) {
    console.log('[webhook-learn] No LLM API key available, skipping auto-learn');
    return null;
  }

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
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
          max_tokens: 1024,
          temperature: 0.1,
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
    console.error('[webhook-learn] LLM call failed:', err);
    return null;
  }
}

/**
 * Analyze a webhook payload and produce a field mapping.
 */
export async function analyzePayload(
  payload: any,
  webhookType: string
): Promise<WebhookMappingConfig | null> {
  const targetFields = FIELD_TEMPLATES[webhookType] || FIELD_TEMPLATES.generic;
  const allPaths = extractAllPaths(payload);

  // Build a preview of the payload (truncate values for brevity)
  const preview: Record<string, any> = {};
  function buildPreview(obj: any, path = '') {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const p = path ? `${path}.${key}` : key;
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            preview[p] = `[Array of ${value.length} items]`;
            if (value.length > 0 && typeof value[0] === 'object') {
              preview[p + '[0]'] = JSON.stringify(value[0]).substring(0, 100);
            }
          } else {
            buildPreview(value, p);
          }
        } else {
          const str = String(value);
          preview[p] = str.length > 80 ? str.substring(0, 80) + '...' : str;
        }
      }
    }
  }
  buildPreview(payload);

  const systemPrompt = `You are a webhook payload analyzer for the DiviDen Command Center. Your job is to map incoming webhook payload fields to DiviDen's internal fields.

Rules:
- Respond ONLY with a valid JSON object. No explanation, no markdown fences.
- The JSON must have the structure: {"fieldMap": {"targetField": "source.path"}, "confidence": "high|medium|low"}
- Use dot notation for nested paths (e.g., "event.start.dateTime")
- Only include mappings you're confident about
- If a target field has no clear source, omit it
- For arrays (attendees, participants), map to the path of the array itself`;

  const userPrompt = `Webhook type: ${webhookType}

Target fields I need to extract:
${targetFields.map(f => `- ${f}`).join('\n')}

Incoming payload structure:
${JSON.stringify(preview, null, 2)}

All available paths:
${allPaths.join(', ')}

Produce a JSON field mapping.`;

  const response = await callLLMNonStreaming(systemPrompt, userPrompt);
  if (!response) return null;

  try {
    // Clean any markdown fences
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.fieldMap || typeof parsed.fieldMap !== 'object') return null;

    // Validate that mapped paths actually exist in the payload
    const validatedMap: WebhookFieldMap = {};
    for (const [target, sourcePath] of Object.entries(parsed.fieldMap)) {
      if (typeof sourcePath === 'string' && targetFields.includes(target)) {
        validatedMap[target] = sourcePath;
      }
    }

    if (Object.keys(validatedMap).length === 0) return null;

    return {
      fieldMap: validatedMap,
      source: 'auto_learned',
      learnedAt: new Date().toISOString(),
      confidence: parsed.confidence || 'medium',
      samplePayloadKeys: allPaths.slice(0, 30),
    };
  } catch (err) {
    console.error('[webhook-learn] Failed to parse LLM response:', err);
    return null;
  }
}

// ─── Main Learn + Save Function ──────────────────────────────────────────────

/**
 * Analyze a payload and save the learned mapping to the webhook.
 * Called asynchronously after processing — does not block the webhook response.
 */
export async function learnAndSaveMapping(
  webhookId: string,
  payload: any,
  webhookType: string
): Promise<WebhookMappingConfig | null> {
  try {
    const mapping = await analyzePayload(payload, webhookType);
    if (!mapping) {
      console.log(`[webhook-learn] Could not learn mapping for webhook ${webhookId}`);
      return null;
    }

    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        mappingRules: JSON.stringify(mapping),
      },
    });

    console.log(`[webhook-learn] Saved auto-learned mapping for webhook ${webhookId}:`, mapping.fieldMap);
    return mapping;
  } catch (err) {
    console.error('[webhook-learn] Failed to save mapping:', err);
    return null;
  }
}

// ─── Parse Stored Mapping ────────────────────────────────────────────────────

/**
 * Parse the mappingRules JSON string from a webhook into a WebhookMappingConfig.
 * Returns null if not a valid mapping config (could be legacy MappingRule[] format).
 */
export function parseMappingConfig(mappingRules: string | null): WebhookMappingConfig | null {
  if (!mappingRules) return null;
  try {
    const parsed = JSON.parse(mappingRules);
    // Check if this is our new format (has fieldMap) vs legacy MappingRule[] format
    if (parsed.fieldMap && typeof parsed.fieldMap === 'object') {
      return parsed as WebhookMappingConfig;
    }
    return null;
  } catch {
    return null;
  }
}
