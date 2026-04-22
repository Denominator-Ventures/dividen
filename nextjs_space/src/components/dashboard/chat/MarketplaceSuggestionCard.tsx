'use client';

import { useState } from 'react';
import type { MktSuggestion } from './types';

export function MarketplaceSuggestionCard({
  suggestions,
  message,
  gated,
  onInstall,
}: {
  suggestions: MktSuggestion[];
  message: string;
  gated: boolean;
  onInstall: (type: string, id: string) => void;
}) {
  const [installingId, setInstallingId] = useState<string | null>(null);
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const [installedIds, setInstalledIds] = useState<Set<string>>(
    new Set(safeSuggestions.filter(s => s.installed).map(s => s.id))
  );

  const handleInstall = async (type: string, id: string) => {
    setInstallingId(id);
    try {
      await onInstall(type, id);
      setInstalledIds(prev => new Set([...prev, id]));
    } finally {
      setInstallingId(null);
    }
  };

  const categoryColors: Record<string, string> = {
    communications: 'text-blue-400 bg-blue-400/10',
    operations: 'text-emerald-400 bg-emerald-400/10',
    research: 'text-purple-400 bg-purple-400/10',
    finance: 'text-amber-400 bg-amber-400/10',
    hr: 'text-pink-400 bg-pink-400/10',
    sales: 'text-orange-400 bg-orange-400/10',
    engineering: 'text-cyan-400 bg-cyan-400/10',
    creative: 'text-violet-400 bg-violet-400/10',
    legal: 'text-slate-400 bg-slate-400/10',
    general: 'text-gray-400 bg-gray-400/10',
  };

  return (
    <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.04] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-brand-500/10 flex items-center gap-2">
        <span className="text-base">🫧</span>
        <span className="text-xs font-medium text-brand-400">
          {gated ? 'Bubble Store — No handler found' : 'Bubble Store Suggestions'}
        </span>
      </div>

      <div className="px-4 py-2">
        <p className="text-[11px] text-[var(--text-secondary)] mb-3">{message}</p>

        <div className="grid gap-2">
          {safeSuggestions.map((s) => {
            const isInstalled = installedIds.has(s.id);
            const colorClass = categoryColors[s.category] || categoryColors.general;

            return (
              <div
                key={s.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-lg shrink-0 mt-0.5">{s.icon || (s.type === 'agent' ? '🤖' : '⚡')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white truncate">{s.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${colorClass}`}>
                      {s.category}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)]">
                      {s.type === 'agent' ? '🤖 Agent' : '⚡ Capability'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {s.pricingModel === 'free' ? '✨ Free' :
                       s.pricingModel === 'per_task' ? `$${s.price}/task` :
                       s.pricingModel === 'subscription' ? `$${s.price}/mo` :
                       s.pricingModel === 'one_time' ? `$${s.price}` :
                       s.pricingModel}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {Math.round(s.relevanceScore * 100)}% match
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleInstall(s.type, s.id)}
                  disabled={isInstalled || installingId === s.id}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    isInstalled
                      ? 'bg-emerald-400/10 text-emerald-400 cursor-default'
                      : installingId === s.id
                        ? 'bg-brand-500/10 text-brand-400 animate-pulse'
                        : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 active:scale-95'
                  }`}
                >
                  {isInstalled ? '✓ Added' : installingId === s.id ? '...' : s.pricingModel === 'free' ? 'Add Free' : 'Get'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
