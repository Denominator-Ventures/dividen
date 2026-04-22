import { describe, it, expect } from 'vitest';
import { healStreamingMarkdown } from '@/lib/streaming-markdown';

describe('healStreamingMarkdown', () => {
  it('returns empty string unchanged', () => {
    expect(healStreamingMarkdown('')).toBe('');
  });

  it('leaves balanced markdown untouched', () => {
    const input = 'This is **bold** and `code` with no issues.';
    expect(healStreamingMarkdown(input)).toBe(input);
  });

  it('closes an unbalanced bold marker', () => {
    const result = healStreamingMarkdown('Starting **bold without close');
    expect(result).toBe('Starting **bold without close**');
  });

  it('closes an unbalanced inline code backtick', () => {
    const result = healStreamingMarkdown('Call `getUser(');
    expect(result).toBe('Call `getUser(`');
  });

  it('closes an unbalanced triple-backtick fence', () => {
    const result = healStreamingMarkdown('```ts\nconst foo = 1;');
    expect(result.endsWith('```')).toBe(true);
    expect((result.match(/```/g) || []).length).toBe(2);
  });

  it('does not add fences when already balanced', () => {
    const input = '```ts\nconst foo = 1;\n```';
    expect(healStreamingMarkdown(input)).toBe(input);
  });

  it('strips orphan table header row while waiting for separator', () => {
    const result = healStreamingMarkdown('Here is a table:\n| Name | Value |');
    expect(result).toBe('Here is a table:');
  });

  it('preserves complete table with header + separator', () => {
    const input = '| Name | Value |\n|------|-------|\n| Foo  | 1     |';
    expect(healStreamingMarkdown(input)).toBe(input);
  });

  it('preserves header when separator arrives on next line', () => {
    const input = '| Name | Value |\n|------|-------|';
    expect(healStreamingMarkdown(input)).toBe(input);
  });

  it('is idempotent', () => {
    const input = 'Starting **bold and `code';
    const once = healStreamingMarkdown(input);
    const twice = healStreamingMarkdown(once);
    expect(twice).toBe(once);
  });

  it('handles multiple unbalanced markers together', () => {
    const result = healStreamingMarkdown('**unclosed bold and `unclosed code');
    // Should close code first, then bold, in that order.
    expect(result).toContain('**');
    expect(result).toContain('`');
    expect((result.match(/\*\*/g) || []).length % 2).toBe(0);
    expect((result.replace(/```/g, '').match(/`/g) || []).length % 2).toBe(0);
  });
});
