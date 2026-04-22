/**
 * Streaming-markdown healing helpers.
 *
 * When markdown streams token-by-token, the UI can show unbalanced / half-formed
 * structures (e.g. `**bold` with the closing `**` not yet arrived, or a table
 * header row `| a | b |` before the `|---|---|` separator lands). Rendering
 * these intermediate states produces visual glitches.
 *
 * `healStreamingMarkdown` applies a small set of forgiving transforms so the
 * intermediate text renders cleanly:
 *
 *   1. Strip orphan table header rows (pipe-rows without an adjacent separator).
 *   2. Auto-close unbalanced ``` fence blocks.
 *   3. Auto-close unbalanced inline `code` backticks.
 *   4. Auto-close unbalanced `**bold**` markers.
 *
 * The function is pure and idempotent — calling it twice produces the same
 * output as calling it once.
 */
export function healStreamingMarkdown(text: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  const keep: string[] = [];

  const pipeLine = /^\s*\|.*\|\s*$/;
  const separator = /^\s*\|[\s:|-]+\|\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (pipeLine.test(line) && !separator.test(line)) {
      // Look ahead up to 2 lines for the separator row.
      const hasSeparatorAhead = lines.slice(i + 1, i + 3).some((l) => separator.test(l));
      // Look behind up to 3 lines for a separator (means we're inside a completed table body).
      const hasSeparatorBehind = lines.slice(Math.max(0, i - 3), i).some((l) => separator.test(l));
      if (!hasSeparatorAhead && !hasSeparatorBehind) {
        // Orphan header / body-without-separator row \u2014 drop while we wait for the separator to arrive.
        continue;
      }
    }
    keep.push(line);
  }

  let healed = keep.join('\n');

  // Auto-close unbalanced ``` fence blocks first (so they don't interact with
  // inline backtick counting below).
  const fenceMatches = healed.match(/```/g);
  const fenceCount = fenceMatches ? fenceMatches.length : 0;
  if (fenceCount % 2 === 1) {
    healed += healed.endsWith('\n') ? '```' : '\n```';
  }

  // Auto-close unbalanced inline backticks (excluding the ``` we already balanced).
  const withoutFences = healed.replace(/```/g, '');
  const inlineTicks = (withoutFences.match(/`/g) || []).length;
  if (inlineTicks % 2 === 1) {
    healed += '`';
  }

  // Auto-close unbalanced **bold** markers.
  const boldCount = (healed.match(/\*\*/g) || []).length;
  if (boldCount % 2 === 1) {
    healed += '**';
  }

  return healed;
}
