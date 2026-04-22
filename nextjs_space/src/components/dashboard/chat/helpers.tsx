import React from 'react';
import { MentionText } from '@/components/MentionText';

/** Markdown-lite renderer — handles bold, inline code, bullets, headers. Safe with special chars. */
export function renderMarkdownLite(text: string): React.ReactNode {
  if (!text) return null;

  // Process line by line for structure (headers, bullets), then inline for bold/code
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<br key={`br-${li}`} />);
      continue;
    }

    // Heading lines (### heading)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], `h-${li}`);
      const cls = level <= 2 ? 'font-bold text-base mt-2 mb-1' : 'font-semibold text-sm mt-1.5 mb-0.5';
      elements.push(<div key={`h-${li}`} className={cls}>{content}</div>);
      continue;
    }

    // Bullet lines (• or - or * at start)
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length > 0;
      const content = renderInline(bulletMatch[2], `b-${li}`);
      elements.push(
        <div key={`b-${li}`} className={`flex gap-1.5 ${indent ? 'ml-4' : ''}`}>
          <span className="text-[var(--text-muted)] flex-shrink-0 select-none">{'\u2022'}</span>
          <span>{content}</span>
        </div>
      );
      continue;
    }

    // Regular line
    elements.push(<span key={`l-${li}`}>{renderInline(line, `l-${li}`)}</span>);
    if (li < lines.length - 1 && lines[li + 1]?.trim()) {
      elements.push(<br key={`lbr-${li}`} />);
    }
  }

  return <>{elements}</>;
}

/** Render inline formatting: **bold**, `code`, @mentions, and preserve special characters */
export function renderInline(text: string, keyPrefix: string): React.ReactNode {
  // Split on **bold**, `code`, and @mention patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|@[a-z0-9_.-]{2,30})/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${keyPrefix}-${i}`} className="px-1 py-0.5 rounded text-[11px] font-mono bg-white/[0.06]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^@[a-z0-9_.-]{2,30}$/.test(part)) {
      return <MentionText key={`${keyPrefix}-${i}`} text={part} />;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

/** Client-side tag stripping for streaming display */
export function stripTagsClient(text: string): string {
  return text
    .replace(/\[\[\w+:\s*\{[\s\S]*?\}\s*\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}
