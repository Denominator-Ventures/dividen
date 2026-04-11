/**
 * Hook for consuming the SSE activity stream.
 * Falls back to polling if SSE connection fails.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ActivityEvent {
  id: string;
  action: string;
  actor: string;
  summary: string;
  time: string;
}

export function useActivityStream(enabled: boolean = true) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCount = useCallback(() => setNewCount(0), []);

  useEffect(() => {
    if (!enabled) return;

    let retries = 0;
    const maxRetries = 5;

    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      const es = new EventSource('/api/activity/stream');
      esRef.current = es;

      es.addEventListener('connected', () => {
        setConnected(true);
        retries = 0;
      });

      es.addEventListener('activity', (e: MessageEvent) => {
        try {
          const data: ActivityEvent = JSON.parse(e.data);
          setEvents((prev) => {
            // Deduplicate by ID
            if (prev.some((p) => p.id === data.id)) return prev;
            const next = [data, ...prev].slice(0, 100);
            return next;
          });
          setNewCount((c) => c + 1);
        } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;

        if (retries < maxRetries) {
          retries++;
          const delay = Math.min(1000 * Math.pow(2, retries), 30000);
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [enabled]);

  return { events, connected, newCount, resetCount };
}
