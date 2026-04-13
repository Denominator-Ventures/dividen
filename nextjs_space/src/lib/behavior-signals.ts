/**
 * Client-side helper to emit behavior signals.
 * Fire-and-forget — never blocks UI.
 */

export function emitSignal(action: string, context?: Record<string, any>, duration?: number) {
  try {
    fetch('/api/behavior-signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, context, duration }),
    }).catch(() => {}); // swallow errors
  } catch {
    // silent
  }
}
