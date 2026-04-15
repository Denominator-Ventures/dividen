/**
 * CapabilityModule — Phase 2 Formal Interface
 *
 * Defines the contract for marketplace capabilities that integrate with
 * the DiviDen relevance engine and system prompt assembly pipeline.
 *
 * A CapabilityModule is a data-driven prompt module that:
 * - Declares its own signal patterns (so the relevance engine knows when to load it)
 * - Has a prompt template with editable fields
 * - Can be installed/uninstalled per-user
 * - Gets injected into the system prompt when its signals match
 *
 * This replaces the old "static group" model where all installed capabilities
 * loaded under the generic `active_caps` group. Now each capability module
 * competes independently in the relevance engine scoring.
 */

import { prisma } from './prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CapabilityModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  moduleVersion: string;

  // Prompt injection
  promptTemplate: string;         // base prompt (before user customization)
  resolvedPrompt: string | null;  // user's customized version (null = use base)
  editableFields: EditableField[];
  tokenEstimate: number | null;

  // Relevance engine integration
  signalPatterns: string[];       // regex strings — scored against current message + context
  alwaysLoad: boolean;            // bypass scoring, always inject

  // Metadata
  integrationType: string | null; // webhook pairing
  tags: string | null;
  commands: CapabilityCommand[] | null;
}

export interface EditableField {
  name: string;
  label?: string;
  type?: 'text' | 'textarea' | 'select' | 'boolean';
  options?: string[];           // for select type
  defaultValue?: string;
  description?: string;
}

export interface CapabilityCommand {
  name: string;
  description: string;
  usage: string;
}

export interface CapabilityModuleScore {
  module: CapabilityModule;
  score: number;
  matchedPatterns: string[];
}

// ── Signal Pattern Scoring ────────────────────────────────────────────────────

/**
 * Scores a capability module against the current message and recent context.
 * Uses the same scoring logic as the core relevance engine:
 *   - Current message match: +0.6
 *   - Recent context match:  +0.3
 *   - Baseline:              +0.05
 *   - alwaysLoad modules:     1.0 (bypass scoring)
 *
 * Returns a score and the patterns that matched.
 */
export function scoreCapabilityModule(
  module: CapabilityModule,
  message: string,
  recentContext: string
): CapabilityModuleScore {
  if (module.alwaysLoad) {
    return { module, score: 1.0, matchedPatterns: ['*always*'] };
  }

  if (!module.signalPatterns || module.signalPatterns.length === 0) {
    // No signal patterns = only loads when explicitly referenced by name
    const namePattern = new RegExp(module.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const nameMatch = namePattern.test(message) || namePattern.test(recentContext);
    return {
      module,
      score: nameMatch ? 0.6 : 0.05,
      matchedPatterns: nameMatch ? [module.name] : [],
    };
  }

  let score = 0;
  const matchedPatterns: string[] = [];

  for (const patternStr of module.signalPatterns) {
    try {
      const regex = new RegExp(patternStr, 'i');
      if (regex.test(message)) {
        score = Math.max(score, 0.6);
        matchedPatterns.push(patternStr);
        break; // one message match is enough for max weight
      }
    } catch {
      // Invalid regex — skip
    }
  }

  if (score < 0.6) {
    for (const patternStr of module.signalPatterns) {
      try {
        const regex = new RegExp(patternStr, 'i');
        if (regex.test(recentContext)) {
          score += 0.3;
          if (!matchedPatterns.includes(patternStr)) matchedPatterns.push(patternStr);
          break;
        }
      } catch {}
    }
  }

  return {
    module,
    score: Math.min(score + 0.05, 1.0),
    matchedPatterns,
  };
}

// ── Module Loading ────────────────────────────────────────────────────────────

/**
 * Fetches all installed capability modules for a user and scores them
 * against the current message context. Returns only modules that meet
 * the relevance threshold (0.3 by default).
 */
export async function loadRelevantCapabilityModules(
  userId: string,
  message: string,
  recentContext: string,
  threshold = 0.3
): Promise<CapabilityModuleScore[]> {
  try {
    const userCaps = await prisma.userCapability.findMany({
      where: { userId, status: 'active' },
      include: {
        capability: {
          select: {
            id: true, name: true, slug: true, description: true, icon: true,
            category: true, moduleVersion: true,
            prompt: true, editableFields: true, tokenEstimate: true,
            signalPatterns: true, alwaysLoad: true,
            integrationType: true, tags: true, commands: true,
          },
        },
      },
      take: 30, // cap at 30 installed modules
    });

    if (userCaps.length === 0) return [];

    const scoredModules: CapabilityModuleScore[] = [];

    for (const uc of userCaps) {
      const cap = uc.capability;

      // Parse JSON fields safely
      let signalPatterns: string[] = [];
      if (cap.signalPatterns) {
        try { signalPatterns = JSON.parse(cap.signalPatterns); } catch {}
      }

      let editableFields: EditableField[] = [];
      if (cap.editableFields) {
        try { editableFields = JSON.parse(cap.editableFields); } catch {}
      }

      let commands: CapabilityCommand[] | null = null;
      if (cap.commands) {
        try { commands = JSON.parse(cap.commands); } catch {}
      }

      const module: CapabilityModule = {
        id: cap.id,
        name: cap.name,
        slug: cap.slug,
        description: cap.description,
        icon: cap.icon,
        category: cap.category,
        moduleVersion: cap.moduleVersion,
        promptTemplate: cap.prompt,
        resolvedPrompt: uc.resolvedPrompt,
        editableFields,
        tokenEstimate: cap.tokenEstimate,
        signalPatterns,
        alwaysLoad: cap.alwaysLoad,
        integrationType: cap.integrationType,
        tags: cap.tags,
        commands,
      };

      const scored = scoreCapabilityModule(module, message, recentContext);
      if (scored.score >= threshold) {
        scoredModules.push(scored);
      }
    }

    // Sort by score descending
    scoredModules.sort((a, b) => b.score - a.score);

    return scoredModules;
  } catch (err) {
    console.error('loadRelevantCapabilityModules error:', err);
    return [];
  }
}

/**
 * Builds the system prompt injection for loaded capability modules.
 * Each module's resolved prompt (or base prompt) is injected with metadata.
 */
export function buildCapabilityModulePrompt(scoredModules: CapabilityModuleScore[]): string {
  if (scoredModules.length === 0) return '';

  let text = '## Installed Capability Modules\n';
  text += `${scoredModules.length} module(s) loaded based on conversation relevance.\n\n`;

  for (const { module, score, matchedPatterns } of scoredModules) {
    const prompt = module.resolvedPrompt || module.promptTemplate;
    const truncated = prompt.length > 1200 ? prompt.slice(0, 1200) + '\n[...truncated]' : prompt;

    text += `### ${module.icon} ${module.name} (${module.category})\n`;
    text += `*Module v${module.moduleVersion} · Relevance: ${(score * 100).toFixed(0)}%`;
    if (matchedPatterns.length > 0 && matchedPatterns[0] !== '*always*') {
      text += ` · Matched: ${matchedPatterns.slice(0, 3).join(', ')}`;
    }
    text += '*\n\n';
    text += truncated + '\n\n';

    // Add commands if present
    if (module.commands && module.commands.length > 0) {
      text += `**Commands:** ${module.commands.map(c => `\`${c.usage}\``).join(', ')}\n\n`;
    }
  }

  text += '> When the operator\'s task matches an installed capability\'s domain, follow its prompt instructions. Capabilities with higher relevance scores should be preferred.\n';

  return text.trim();
}

// ── Public API Response Format ────────────────────────────────────────────────

/**
 * Returns the CapabilityModule spec for external consumption (federation API).
 */
export interface CapabilityModuleSpec {
  version: string;
  description: string;
  fields: {
    signalPatterns: { type: 'json_array'; description: string; example: string[] };
    tokenEstimate: { type: 'integer'; description: string };
    alwaysLoad: { type: 'boolean'; description: string; default: false };
    moduleVersion: { type: 'string'; description: string; default: '1.0' };
    promptTemplate: { type: 'text'; description: string };
    editableFields: { type: 'json_array'; description: string; example: EditableField[] };
  };
  scoring: {
    messageMatchWeight: number;
    contextMatchWeight: number;
    baseline: number;
    threshold: number;
    alwaysLoadScore: number;
  };
}

export function getCapabilityModuleSpec(): CapabilityModuleSpec {
  return {
    version: '1.0',
    description: 'CapabilityModule defines how marketplace capabilities integrate with the DiviDen relevance engine. Each module declares signal patterns that determine when its prompt is loaded into the agent\'s context window.',
    fields: {
      signalPatterns: {
        type: 'json_array',
        description: 'Array of regex strings. When any pattern matches the current message or recent context, the module\'s prompt is loaded. Case-insensitive matching.',
        example: ['email.*draft', 'send.*email', 'compose.*message', 'outbound.*mail'],
      },
      tokenEstimate: {
        type: 'integer',
        description: 'Estimated token count of the resolved prompt. Used for budget management — total loaded modules should stay under ~4,000 tokens.',
      },
      alwaysLoad: {
        type: 'boolean',
        description: 'If true, this module\'s prompt is always injected regardless of signal matching. Use sparingly — adds to every message\'s token cost.',
        default: false,
      },
      moduleVersion: {
        type: 'string',
        description: 'Version of the CapabilityModule spec this capability targets. Current: "1.0".',
        default: '1.0',
      },
      promptTemplate: {
        type: 'text',
        description: 'The base system prompt instructions. Supports {{field_name}} placeholders that get replaced with user customizations from editableFields.',
      },
      editableFields: {
        type: 'json_array',
        description: 'Fields the user can customize after installation. Each field has name, label, type, options (for select), defaultValue, and description.',
        example: [
          { name: 'companyName', label: 'Company Name', type: 'text', defaultValue: 'Acme Corp' },
          { name: 'tone', label: 'Communication Tone', type: 'select', options: ['professional', 'casual', 'friendly'] },
        ],
      },
    },
    scoring: {
      messageMatchWeight: 0.6,
      contextMatchWeight: 0.3,
      baseline: 0.05,
      threshold: 0.3,
      alwaysLoadScore: 1.0,
    },
  };
}
