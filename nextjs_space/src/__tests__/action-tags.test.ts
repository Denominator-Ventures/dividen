/**
 * Tests: src/lib/action-tags.ts
 *
 * Parser + sanitizer utilities. These are the public contract that the Phase 2.1
 * refactor must preserve byte-for-byte. Every test here must still pass AFTER
 * we split the 3,466-line file into per-tag handler modules.
 */
import { describe, it, expect } from 'vitest';
import {
  parseActionTags,
  stripActionTags,
  sanitizeAssistantContent,
  SUPPORTED_TAGS,
} from '@/lib/action-tags';

describe('action-tags / parseActionTags', () => {
  it('parses a single well-formed tag', () => {
    const text = 'Sure — [[create_card:{"title":"Call Alvaro","column":"to_do"}]] done.';
    const tags = parseActionTags(text);
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('create_card');
    expect(tags[0].params).toEqual({ title: 'Call Alvaro', column: 'to_do' });
    expect(tags[0].raw).toBe('[[create_card:{"title":"Call Alvaro","column":"to_do"}]]');
  });

  it('parses multiple tags in the same response', () => {
    const text =
      'First [[create_card:{"title":"A"}]] then [[relay_request:{"to":"Jaron","subject":"hey"}]]';
    const tags = parseActionTags(text);
    expect(tags).toHaveLength(2);
    expect(tags.map(t => t.name)).toEqual(['create_card', 'relay_request']);
  });

  it('silently drops unsupported tag names', () => {
    const text = '[[totally_fake_tag:{"x":1}]][[create_card:{"title":"ok"}]]';
    const tags = parseActionTags(text);
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('create_card');
  });

  it('recovers from single-quote JSON and trailing commas', () => {
    // LLMs occasionally emit sloppy JSON
    const text = "[[create_card:{'title':'Test','priority':'high',}]]";
    const tags = parseActionTags(text);
    expect(tags).toHaveLength(1);
    expect(tags[0].params.title).toBe('Test');
    expect(tags[0].params.priority).toBe('high');
  });

  it('returns empty array on unparseable JSON (no throw)', () => {
    const text = '[[create_card:{this is not json at all}]]';
    const tags = parseActionTags(text);
    expect(tags).toEqual([]);
  });

  it('returns empty array on text with no tags', () => {
    expect(parseActionTags('Just a normal reply with no tags.')).toEqual([]);
  });
});

describe('action-tags / stripActionTags', () => {
  it('removes tag syntax while keeping surrounding prose', () => {
    const text = 'Creating that card now. [[create_card:{"title":"x"}]] Let me know if you need more.';
    const stripped = stripActionTags(text);
    expect(stripped).not.toContain('[[');
    expect(stripped).not.toContain('create_card');
    expect(stripped).toContain('Creating that card now.');
    expect(stripped).toContain('Let me know if you need more.');
  });

  it('strips fabricated tag execution summary blocks', () => {
    const hallucinated =
      'Done. [Tag execution summary from your previous turn]\n- relayId: cmofake123\n[End of tag summary]\nReady for the next task.';
    const stripped = stripActionTags(hallucinated);
    expect(stripped).not.toContain('Tag execution summary');
    expect(stripped).not.toContain('cmofake123');
    expect(stripped).toContain('Done.');
    expect(stripped).toContain('Ready for the next task.');
  });

  it('strips markdown-style fake summary headers', () => {
    const fake = 'Here we go.\n\n**First summary:**\n- Created card cmoFAKE\n- Sent relay\n\nAll set.';
    const stripped = stripActionTags(fake);
    expect(stripped).not.toContain('First summary');
    expect(stripped).not.toContain('cmoFAKE');
    expect(stripped).toContain('Here we go.');
    expect(stripped).toContain('All set.');
  });

  it('collapses excessive blank lines after stripping', () => {
    const messy = 'top\n\n\n\n[[create_card:{"title":"x"}]]\n\n\n\nbottom';
    const stripped = stripActionTags(messy);
    expect(stripped).not.toMatch(/\n{3,}/);
  });
});

describe('action-tags / sanitizeAssistantContent', () => {
  it('keeps action tags intact (unlike stripActionTags)', () => {
    const text = 'Working on it. [[create_card:{"title":"x"}]]';
    const sanitized = sanitizeAssistantContent(text);
    expect(sanitized).toContain('[[create_card');
    expect(sanitized).toContain('Working on it.');
  });

  it('removes fabricated summary blocks', () => {
    const polluted =
      '[[create_card:{"title":"x"}]]\n\n[Tag execution summary from your previous turn]\n- id: cmofake\n[End of tag summary]';
    const sanitized = sanitizeAssistantContent(polluted);
    expect(sanitized).toContain('[[create_card'); // tag preserved
    expect(sanitized).not.toContain('Tag execution summary');
    expect(sanitized).not.toContain('cmofake');
  });
});

describe('action-tags / SUPPORTED_TAGS registry invariants', () => {
  it('contains the core relay and card tags', () => {
    const coreTags = [
      'create_card',
      'upsert_card',
      'relay_request',
      'relay_respond',
      'task_route',
      'create_project',
      'invite_to_project',
    ];
    for (const t of coreTags) {
      expect(SUPPORTED_TAGS).toContain(t);
    }
  });

  it('has no duplicate tag names', () => {
    const set = new Set(SUPPORTED_TAGS);
    expect(set.size).toBe(SUPPORTED_TAGS.length);
  });
});
