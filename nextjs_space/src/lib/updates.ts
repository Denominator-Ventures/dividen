/**
 * DiviDen Updates / Changelog
 *
 * Each update is a timestamped entry written in founder voice.
 * Data lives in `./updates/entries.json` — add new entries to the top of that file.
 *
 * Phase 2.3 cleanup: extracted ~4,055 lines of release-note entries out of this
 * file and into a plain JSON payload. Consumers (`UpdatesPage.tsx`,
 * `LandingPage.tsx`, `/api/v2/updates`) keep using `import { UPDATES } from '@/lib/updates'`
 * — the public surface is unchanged.
 */

import entries from './updates/entries.json';

export interface Update {
  id: string;
  date: string;         // ISO date string (YYYY-MM-DD)
  time?: string;        // Time string for display, e.g. "2:30 PM" — optional for backwards compat
  title: string;
  subtitle?: string;
  tags: string[];
  content: string;      // Markdown-ish content (rendered with basic formatting)
}

export const UPDATES: Update[] = entries as Update[];
