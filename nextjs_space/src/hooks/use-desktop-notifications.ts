/**
 * DEP-007: Desktop Notification Layer
 *
 * React hook for OS-level desktop notifications.
 * Fires when the browser tab is NOT focused, respecting per-category toggles.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type DesktopNotifEvent =
  | 'task_completed'
  | 'task_blocked'
  | 'main_message'
  | 'meeting_soon'
  | 'meeting_now'
  | 'new_email'
  | 'relay_inbound'
  | 'aivaro_response';

const EVENT_TO_CATEGORY: Record<DesktopNotifEvent, string> = {
  task_completed: 'queue',
  task_blocked: 'queue',
  main_message: 'comms',
  meeting_soon: 'meetings',
  meeting_now: 'meetings',
  new_email: 'email',
  relay_inbound: 'comms',
  aivaro_response: 'comms',
};

export interface DesktopNotifSettings {
  desktopNotifications: boolean;
  desktopNotifQueue: boolean;
  desktopNotifMeetings: boolean;
  desktopNotifEmail: boolean;
  desktopNotifComms: boolean;
}

const DEFAULT_SETTINGS: DesktopNotifSettings = {
  desktopNotifications: false,
  desktopNotifQueue: true,
  desktopNotifMeetings: true,
  desktopNotifEmail: true,
  desktopNotifComms: true,
};

export function useDesktopNotifications(
  settings?: Partial<DesktopNotifSettings>
) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  const isTabFocused = useRef(true);

  // Track tab focus
  useEffect(() => {
    const onFocus = () => { isTabFocused.current = true; };
    const onBlur = () => { isTabFocused.current = false; };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Check initial permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const sendNotification = useCallback(
    (event: DesktopNotifEvent, title: string, body?: string) => {
      // Gate: notifications API available?
      if (!('Notification' in window)) return;
      // Gate: permission granted?
      if (Notification.permission !== 'granted') return;
      // Gate: master toggle
      if (!mergedSettings.desktopNotifications) return;
      // Gate: category toggle
      const category = EVENT_TO_CATEGORY[event];
      const categoryKey = `desktopNotif${category.charAt(0).toUpperCase()}${category.slice(1)}` as keyof DesktopNotifSettings;
      if (mergedSettings[categoryKey] === false) return;
      // Gate: tab is focused — don't fire if user is looking at the app
      if (isTabFocused.current) return;

      try {
        new Notification(title, {
          body: body || undefined,
          icon: '/favicon.ico',
          tag: `dividen-${event}-${Date.now()}`,
          silent: false,
        });
      } catch {
        // Some browsers block constructing Notification outside of user gesture
      }
    },
    [mergedSettings]
  );

  return { permission, requestPermission, sendNotification };
}
