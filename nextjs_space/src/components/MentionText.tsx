'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';

/**
 * MentionText — renders text with clickable @username mentions.
 *
 * Parses `@username` tokens out of any text string, resolves them to user profiles
 * via a batched API call, and renders them as styled clickable chips that link to
 * the user's profile page.
 *
 * Usage:
 *   <MentionText text="Hey @jon, can you review this?" className="text-sm" />
 */

interface ResolvedUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
}

// Module-level cache so we don't re-fetch across component instances
const resolveCache = new Map<string, ResolvedUser | null>();
const pendingBatch = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchCallbacks: Array<() => void> = [];

function scheduleBatchResolve() {
  if (batchTimer) return;
  batchTimer = setTimeout(async () => {
    const usernames = Array.from(pendingBatch);
    pendingBatch.clear();
    batchTimer = null;
    const cbs = [...batchCallbacks];
    batchCallbacks = [];

    if (usernames.length === 0) { cbs.forEach(cb => cb()); return; }

    try {
      const res = await fetch(`/api/users/resolve?usernames=${encodeURIComponent(usernames.join(','))}`);
      const json = await res.json();
      const data: Record<string, ResolvedUser> = json.data || {};
      for (const uname of usernames) {
        resolveCache.set(uname, data[uname] || null);
      }
    } catch {
      // Mark all as null so we don't retry endlessly
      for (const uname of usernames) {
        if (!resolveCache.has(uname)) resolveCache.set(uname, null);
      }
    }
    cbs.forEach(cb => cb());
  }, 50); // 50ms batch window
}

// Regex to match @username tokens — must be preceded by start-of-string or whitespace
const MENTION_REGEX = /(?:^|(?<=\s))@([a-z0-9_.-]{2,30})(?=\s|$|[.,;:!?)])/g;

export function MentionText({ text, className }: { text: string; className?: string }) {
  const [, forceUpdate] = useState(0);

  // Extract all @usernames from text
  const mentions = useMemo(() => {
    const found: string[] = [];
    const re = /(?:^|\s)@([a-z0-9_.-]{2,30})(?=\s|$|[.,;:!?)])/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      const uname = match[1];
      if (!found.includes(uname)) found.push(uname);
    }
    return found;
  }, [text]);

  // Resolve unknown mentions
  useEffect(() => {
    const unresolved = mentions.filter(u => !resolveCache.has(u));
    if (unresolved.length === 0) return;

    for (const u of unresolved) pendingBatch.add(u);
    batchCallbacks.push(() => forceUpdate(n => n + 1));
    scheduleBatchResolve();
  }, [mentions]);

  // Split text into segments: plain text and @mention tokens
  const segments = useMemo(() => {
    const result: Array<{ type: 'text'; value: string } | { type: 'mention'; username: string }> = [];
    let lastIdx = 0;
    // Use a simpler regex that works with split
    const re = /@([a-z0-9_.-]{2,30})(?=\s|$|[.,;:!?)])/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      const fullMatch = match[0]; // @username
      const username = match[1];
      const startIdx = match.index;

      if (startIdx > lastIdx) {
        result.push({ type: 'text', value: text.slice(lastIdx, startIdx) });
      }
      result.push({ type: 'mention', username });
      lastIdx = startIdx + fullMatch.length;
    }
    if (lastIdx < text.length) {
      result.push({ type: 'text', value: text.slice(lastIdx) });
    }
    return result;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.value}</span>;
        }
        const resolved = resolveCache.get(seg.username);
        if (resolved) {
          return (
            <Link
              key={i}
              href={`/profile/${resolved.id}`}
              className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors font-medium cursor-pointer no-underline"
              title={`${resolved.name || resolved.username} — View profile`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[0.85em]">@{resolved.username}</span>
            </Link>
          );
        }
        // Not yet resolved or not a valid user — render as plain styled text
        return (
          <span
            key={i}
            className="text-[var(--brand-primary)]/70 font-medium"
          >
            @{seg.username}
          </span>
        );
      })}
    </span>
  );
}

export default MentionText;
