/**
 * Shared notification preferences helpers.
 * Used by both the preferences API route and the feed API route.
 */

export const DEFAULT_PREFS = {
  enabled: true,
  categories: {
    board: true,
    queue: true,
    comms: true,
    connections: true,
    teams: true,
    projects: true,
    crm: true,
    calendar: true,
    goals: true,
    marketplace: true,
    federation: true,
    drive: true,
    intelligence: true,
    system: true,
  },
};

export type NotificationPrefs = typeof DEFAULT_PREFS;

export function parsePrefs(raw: string | null | undefined): NotificationPrefs {
  if (!raw) return { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
  try {
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled ?? true,
      categories: { ...DEFAULT_PREFS.categories, ...(parsed.categories || {}) },
    };
  } catch {
    return { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
  }
}
