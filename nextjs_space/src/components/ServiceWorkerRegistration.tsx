'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered, scope:', reg.scope);

        // Check for updates immediately on load
        reg.update().catch(() => {});

        // Check for updates every 60 seconds
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60_000);

        // When a new SW is found waiting, tell it to activate immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[SW] New version activated — app updated');
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.log('[SW] Registration failed:', err);
      });

    // When a new SW takes control, reload the page to get fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[SW] Controller changed — reloading for fresh version');
      window.location.reload();
    });
  }, []);

  return null;
}
