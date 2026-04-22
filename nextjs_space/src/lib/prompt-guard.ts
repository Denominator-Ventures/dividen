/**
 * v2.4.6 — Prompt Injection Hardening
 *
 * Defence-in-depth layer between user/federated input and the LLM context.
 *
 * 1. detectInjectionAttempt() — pattern-based detection + risk score
 * 2. sanitizeUserInput()       — strip known injection vectors
 * 3. wrapUntrustedContent()    — boundary-marker wrapping for LLM awareness
 * 4. MAX_USER_MESSAGE_LENGTH   — hard cap on input size
 */

// ── Constants ───────────────────────────────────────────────────────────────

/** Hard cap on user message length (characters). Anything over is truncated. */
export const MAX_USER_MESSAGE_LENGTH = 12_000;

/** Hard cap on federated relay payload length. */
export const MAX_RELAY_PAYLOAD_LENGTH = 8_000;

const BOUNDARY_START = '[[UNTRUSTED_USER_INPUT_START]]';
const BOUNDARY_END   = '[[UNTRUSTED_USER_INPUT_END]]';

const RELAY_BOUNDARY_START = '[[UNTRUSTED_RELAY_CONTENT_START]]';
const RELAY_BOUNDARY_END   = '[[UNTRUSTED_RELAY_CONTENT_END]]';

// ── Injection Pattern Registry ──────────────────────────────────────────────

interface InjectionPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  // Direct instruction overrides
  { name: 'ignore_instructions',    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|rules?|context)/i, severity: 'high' },
  { name: 'new_instructions',       pattern: /(?:new|updated|revised|real|actual|true)\s+(?:instructions?|system\s*prompt|directives?)/i, severity: 'high' },
  { name: 'you_are_now',            pattern: /(?:you\s+are\s+now|from\s+now\s+on|henceforth|going\s+forward)\s+(?:a|an|the|my)?\s*(?:different|new|helpful|unrestricted|unfiltered|jailbroken)/i, severity: 'high' },
  { name: 'forget_everything',      pattern: /(?:forget|discard|erase|wipe|clear|reset)\s+(?:all|everything|your|the)?\s*(?:previous|prior|above|system|original)?\s*(?:instructions?|prompts?|context|memory|rules?)/i, severity: 'high' },
  { name: 'system_prompt_extract',  pattern: /(?:reveal|show|print|output|display|repeat|echo|dump|leak)\s+(?:your|the)?\s*(?:system|original|initial|full|hidden)?\s*(?:prompt|instructions?|rules?|directives?|context)/i, severity: 'high' },

  // Role-play / persona hijack
  { name: 'roleplay_override',      pattern: /(?:pretend|act|behave|roleplay|role[- ]play|imagine)\s+(?:you\s+are|to\s+be|as\s+if|as\s+a)\s/i, severity: 'medium' },
  { name: 'dan_jailbreak',          pattern: /\b(?:DAN|do\s+anything\s+now|STAN|DUDE|AIM|UCAR|JailBreak)\b/i, severity: 'high' },

  // Delimiter / encoding attacks
  { name: 'fake_system_message',    pattern: /(?:^|\n)\s*(?:system|assistant|\[system\]|\[INST\]|<\|im_start\|>|<\|system\|>)\s*[:>]/im, severity: 'high' },
  { name: 'markdown_injection',     pattern: /```(?:system|instruction|prompt|override)/i, severity: 'medium' },
  { name: 'base64_payload',         pattern: /(?:decode|base64|atob|eval)\s*\(.*[A-Za-z0-9+/=]{20,}/i, severity: 'medium' },
  { name: 'unicode_smuggling',      pattern: /[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]{3,}/,  severity: 'medium' },

  // Indirect injection (data exfil / tool abuse)
  { name: 'exfil_attempt',          pattern: /(?:fetch|curl|wget|http|send|post|request)\s+(?:to|data|this|my|the)?\s*(?:https?:\/\/|webhook|endpoint)/i, severity: 'high' },
  { name: 'tool_abuse',             pattern: /(?:execute|run|call|invoke)\s+(?:the\s+)?(?:following|this)\s+(?:code|command|function|script|tool)/i, severity: 'medium' },

  // Boundary marker forgery
  { name: 'boundary_forgery',       pattern: /\[\[(?:UNTRUSTED|TRUSTED|SYSTEM|END_SYSTEM|START_SYSTEM|SAFE|UNSAFE)/i, severity: 'high' },
];

// ── Detection ───────────────────────────────────────────────────────────────

export interface InjectionDetectionResult {
  isInjection: boolean;
  riskScore: number;       // 0–1
  matchedPatterns: string[];
  highSeverityHit: boolean;
}

/**
 * Analyse text for prompt injection patterns.
 * Returns a structured result with risk score and matched pattern names.
 */
export function detectInjectionAttempt(text: string): InjectionDetectionResult {
  const matched: { name: string; severity: string }[] = [];

  for (const p of INJECTION_PATTERNS) {
    if (p.pattern.test(text)) {
      matched.push({ name: p.name, severity: p.severity });
    }
  }

  if (matched.length === 0) {
    return { isInjection: false, riskScore: 0, matchedPatterns: [], highSeverityHit: false };
  }

  // Score: high=0.5, medium=0.25, low=0.1 — capped at 1.0
  const SEVERITY_WEIGHT: Record<string, number> = { high: 0.5, medium: 0.25, low: 0.1 };
  const rawScore = matched.reduce((s, m) => s + (SEVERITY_WEIGHT[m.severity] || 0.1), 0);
  const riskScore = Math.min(rawScore, 1.0);
  const highSeverityHit = matched.some(m => m.severity === 'high');

  return {
    isInjection: true,
    riskScore,
    matchedPatterns: matched.map(m => m.name),
    highSeverityHit,
  };
}

// ── Sanitization ────────────────────────────────────────────────────────────

/**
 * Strip / neutralise known injection vectors from user text.
 * This does NOT reject the message — it defangs it.
 */
export function sanitizeUserInput(text: string): string {
  let sanitized = text;

  // Remove zero-width / invisible unicode characters used for smuggling
  sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '');

  // Neutralise fake system/assistant role markers
  sanitized = sanitized.replace(/(?:^|\n)\s*(?:system|assistant|\[system\]|\[INST\]|<\|im_start\|>|<\|system\|>)\s*[:>]/gim, '[blocked-role-marker]');

  // Neutralise boundary marker forgery
  sanitized = sanitized.replace(/\[\[(?:UNTRUSTED|TRUSTED|SYSTEM|END_SYSTEM|START_SYSTEM|SAFE|UNSAFE)[^\]]*\]\]/gi, '[blocked-boundary]');

  return sanitized;
}

// ── Boundary Wrapping ───────────────────────────────────────────────────────

/**
 * Wrap user content with boundary markers so the LLM can distinguish
 * system instructions from user-supplied text.
 */
export function wrapUntrustedContent(text: string): string {
  return `${BOUNDARY_START}\n${text}\n${BOUNDARY_END}`;
}

/**
 * Wrap federated relay content with relay-specific boundary markers.
 */
export function wrapRelayContent(text: string): string {
  return `${RELAY_BOUNDARY_START}\n${text}\n${RELAY_BOUNDARY_END}`;
}

// ── Length Enforcement ──────────────────────────────────────────────────────

/**
 * Enforce character limit on user message. Returns truncated text + flag.
 */
export function enforceMessageLength(text: string, maxLength: number = MAX_USER_MESSAGE_LENGTH): { text: string; wasTruncated: boolean } {
  if (text.length <= maxLength) return { text, wasTruncated: false };
  return { text: text.slice(0, maxLength) + '\n[Message truncated — exceeded maximum length]', wasTruncated: true };
}

/**
 * Full pipeline: enforce length → sanitize → detect → wrap.
 * Returns the processed text + metadata for telemetry.
 */
export function processUserInput(rawText: string): {
  processedText: string;
  boundaryWrapped: string;
  detection: InjectionDetectionResult;
  wasTruncated: boolean;
} {
  const { text: lengthChecked, wasTruncated } = enforceMessageLength(rawText.trim());
  const sanitized = sanitizeUserInput(lengthChecked);
  const detection = detectInjectionAttempt(sanitized);
  const boundaryWrapped = wrapUntrustedContent(sanitized);

  return {
    processedText: sanitized,
    boundaryWrapped,
    detection,
    wasTruncated,
  };
}

// ── Token Estimation ────────────────────────────────────────────────────────

/**
 * Cheap token estimator. Uses the widely-accepted ~4 chars/token heuristic
 * for English LLM tokenizers (GPT-4, Claude).
 *
 * This is deliberately NOT tiktoken \u2014 we want zero dependencies and sub-ms
 * overhead. For prompt budgeting and cost tracking the error bar (\u00b115%)
 * is well within the precision we need.
 *
 * For code-heavy or non-English text, actual tokens will be higher; treat
 * this as a lower bound for cost alarms.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens across a list of LLM messages. Adds a small per-message
 * overhead (~4 tokens) for role markers and formatting that most tokenizers add.
 */
export function estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content) + 4; // role framing overhead
  }
  return total;
}

/**
 * Process relay payload: enforce length → sanitize → detect → wrap.
 */
export function processRelayPayload(rawText: string): {
  processedText: string;
  boundaryWrapped: string;
  detection: InjectionDetectionResult;
  wasTruncated: boolean;
} {
  const { text: lengthChecked, wasTruncated } = enforceMessageLength(rawText.trim(), MAX_RELAY_PAYLOAD_LENGTH);
  const sanitized = sanitizeUserInput(lengthChecked);
  const detection = detectInjectionAttempt(sanitized);
  const boundaryWrapped = wrapRelayContent(sanitized);

  return {
    processedText: sanitized,
    boundaryWrapped,
    detection,
    wasTruncated,
  };
}
