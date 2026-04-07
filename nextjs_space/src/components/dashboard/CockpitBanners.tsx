'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  ruleId: string;
  name: string;
  message: string;
  style: string;
  sound: boolean;
  eventType: string;
}

const STYLE_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info:    { bg: 'bg-brand-500/10', border: 'border-brand-500/30', text: 'text-brand-400', icon: 'ℹ️' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: '⚠️' },
  urgent:  { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🚨' },
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '✅' },
};

export function CockpitBanners({ mode }: { mode: 'cockpit' | 'chief_of_staff' }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const soundPlayedRef = useRef<Set<string>>(new Set());

  const checkNotifications = useCallback(async () => {
    if (mode !== 'cockpit') {
      setBanners([]);
      return;
    }
    try {
      const res = await fetch('/api/notifications/check');
      const data = await res.json();
      if (data.success) {
        setBanners(data.data || []);
        // Play sound for new banners with sound enabled
        for (const b of (data.data || []) as Banner[]) {
          if (b.sound && !soundPlayedRef.current.has(b.id)) {
            soundPlayedRef.current.add(b.id);
            // Simple beep via AudioContext
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.1;
              osc.start();
              osc.stop(ctx.currentTime + 0.15);
            } catch { /* audio not available */ }
          }
        }
      }
    } catch { /* silent */ }
  }, [mode]);

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [checkNotifications]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const visible = banners.filter(b => !dismissed.has(b.id));

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-3 pt-2">
      {visible.map((banner) => {
        const style = STYLE_MAP[banner.style] || STYLE_MAP.info;
        return (
          <div
            key={banner.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all animate-in slide-in-from-top-2 duration-300',
              style.bg, style.border
            )}
          >
            <span className="text-sm shrink-0">{style.icon}</span>
            <div className="flex-1 min-w-0">
              <span className={cn('text-xs font-medium', style.text)}>
                {banner.message}
              </span>
            </div>
            <button
              onClick={() => handleDismiss(banner.id)}
              className={cn('text-xs shrink-0 px-1.5 py-0.5 rounded hover:bg-black/20 transition-colors', style.text)}
            >
              Dismiss
            </button>
          </div>
        );
      })}
    </div>
  );
}
