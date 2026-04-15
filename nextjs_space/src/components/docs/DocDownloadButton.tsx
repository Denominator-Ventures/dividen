'use client';

import { useCallback } from 'react';

/* ── DOM → Markdown converter ────────────────────────────────────────────── */

function domToMarkdown(el: Element): string {
  const lines: string[] = [];

  function walk(node: Node, depth: number = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.replace(/\s+/g, ' ') || '';
      if (t.trim()) lines.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Skip buttons and interactive elements
    if (tag === 'button' || tag === 'nav' || el.dataset.noDownload) return;

    // Headers
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const prefix = '#'.repeat(level);
      lines.push('');
      lines.push(`${prefix} ${el.textContent?.trim() || ''}`);
      lines.push('');
      return;
    }

    // Code blocks
    if (tag === 'pre') {
      lines.push('');
      lines.push('```');
      lines.push(el.textContent?.trim() || '');
      lines.push('```');
      lines.push('');
      return;
    }

    // Inline code
    if (tag === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre') {
      lines.push(`\`${el.textContent?.trim() || ''}\``);
      return;
    }

    // List items
    if (tag === 'li') {
      const text = el.textContent?.trim() || '';
      lines.push(`- ${text}`);
      return;
    }

    // Tables
    if (tag === 'table') {
      const rows = el.querySelectorAll('tr');
      rows.forEach((row, ri) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowText = cells.map(c => (c.textContent?.trim() || '').replace(/\|/g, '\\|')).join(' | ');
        lines.push(`| ${rowText} |`);
        if (ri === 0) {
          lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
        }
      });
      lines.push('');
      return;
    }

    // Paragraphs and divs
    if (tag === 'p') {
      lines.push('');
      for (const child of Array.from(node.childNodes)) walk(child, depth);
      lines.push('');
      return;
    }

    // Strong/bold within text flow
    if (tag === 'strong' || tag === 'b') {
      lines.push(`**${el.textContent?.trim() || ''}**`);
      return;
    }

    // Horizontal rules
    if (tag === 'hr') {
      lines.push('');
      lines.push('---');
      lines.push('');
      return;
    }

    // Recurse for everything else
    for (const child of Array.from(node.childNodes)) walk(child, depth + 1);
  }

  walk(el);

  // Clean up: collapse multiple blank lines, trim
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Download trigger ────────────────────────────────────────────────────── */

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Components ──────────────────────────────────────────────────────────── */

interface DocDownloadButtonProps {
  /** Pre-built markdown (if provided, skips DOM extraction) */
  markdown?: string;
  /** DOM container ID to extract markdown from */
  containerId?: string;
  /** Filename without extension */
  filename: string;
  /** Visual variant */
  variant?: 'full' | 'icon';
  /** Optional label override */
  label?: string;
  /** Optional className */
  className?: string;
}

export function DocDownloadButton({ markdown, containerId, filename, variant = 'full', label, className = '' }: DocDownloadButtonProps) {
  const handleDownload = useCallback(() => {
    let content = markdown || '';
    if (!content && containerId) {
      const el = document.getElementById(containerId);
      if (el) content = domToMarkdown(el);
    }
    if (!content) {
      // Last resort: grab the main content area
      const main = document.querySelector('[data-doc-content]') || document.querySelector('main') || document.body;
      content = domToMarkdown(main);
    }
    // Prepend metadata
    const header = `<!-- Downloaded from dividen.ai on ${new Date().toISOString().split('T')[0]} -->\n\n`;
    triggerDownload(header + content, filename);
  }, [markdown, containerId, filename]);

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        data-no-download
        title={`Download ${filename}.md`}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-brand-400 transition-colors ${className}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      data-no-download
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-brand-500/30 text-sm text-[var(--text-secondary)] hover:text-brand-400 transition-all ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {label || 'Download as .md'}
    </button>
  );
}

/**
 * Badge to annotate recently updated sections.
 * Shows "UPDATED {date}" or "NEW" with a subtle glow.
 */
export function UpdatedBadge({ date, isNew = false }: { date?: string; isNew?: boolean }) {
  if (isNew) {
    return (
      <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/20 align-middle">
        NEW
      </span>
    );
  }
  return (
    <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20 align-middle">
      UPDATED{date ? ` ${date}` : ''}
    </span>
  );
}
