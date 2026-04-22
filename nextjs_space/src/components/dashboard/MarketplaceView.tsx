'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CapabilitiesMarketplace } from './CapabilitiesMarketplace';
import {
  CATEGORIES,
  PRICING_FILTERS,
  PRICING_BADGES,
  CATEGORY_COLORS,
  EMPTY_REGISTER_FORM,
} from './marketplace/constants';
import { formatPrice, parseTags, parseSamplePrompts, stars } from './marketplace/helpers';
import type {
  MarketplaceAgent,
  Execution,
  FeeInfo,
  EarningsData,
  ViewMode,
  EarningsTab,
  JobEarningsData,
  MarketplaceViewProps,
} from './marketplace/types';
import { RegisterView } from './marketplace/RegisterView';
import { EarningsView } from './marketplace/EarningsView';

/* ── Component ─────────────────────────────────────────────── */

export function MarketplaceView({ prefillAgent, onPrefillConsumed, initialView, onStartGuidedChat }: MarketplaceViewProps = {}) {
  const [view, setView] = useState<ViewMode>(initialView || 'browse');
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [pricing, setPricing] = useState('all');
  const [sort, setSort] = useState('popular');
  const [total, setTotal] = useState(0);

  // Execution state
  const [taskInput, setTaskInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Earnings state
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsTab, setEarningsTab] = useState<EarningsTab>('job');
  const [jobEarnings, setJobEarnings] = useState<JobEarningsData | null>(null);
  const [jobEarningsLoading, setJobEarningsLoading] = useState(false);

  // Fee info (fetched once for registration form display)
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);

  // Registration form
  const [regForm, setRegForm] = useState(EMPTY_REGISTER_FORM);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');
  const [accessPasswordInput, setAccessPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Handle prefill from extensions/connections
  useEffect(() => {
    if (prefillAgent) {
      setRegForm(prev => ({
        ...prev,
        name: prefillAgent.name || prev.name,
        description: prefillAgent.description || prev.description,
        endpointUrl: prefillAgent.endpointUrl || prev.endpointUrl,
        category: prefillAgent.category || prev.category,
      }));
      setView('register');
      onPrefillConsumed?.();
    }
  }, [prefillAgent, onPrefillConsumed]);

  /* ── Fetch agents ─────────────────────────────────────────── */

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (pricing !== 'all') params.set('pricing', pricing);
      if (search) params.set('search', search);
      params.set('sort', sort);

      const res = await fetch(`/api/marketplace?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
        setTotal(data.total);
      }
    } catch (e) {
      console.error('Failed to fetch marketplace agents:', e);
    } finally {
      setLoading(false);
    }
  }, [category, pricing, search, sort]);

  useEffect(() => {
    if (view === 'browse' || view === 'my_agents') {
      fetchAgents();
    }
  }, [fetchAgents, view]);

  // Fetch fee info once
  useEffect(() => {
    fetch('/api/marketplace/fee-info').then(r => r.json()).then(setFeeInfo).catch(() => {});
  }, []);

  /* ── Fetch agent detail ──────────────────────────────────── */

  const openDetail = async (agentId: string) => {
    try {
      const res = await fetch(`/api/marketplace/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAgent(data);
        setView('detail');
        setTaskInput('');
        setExecutionResult(null);
      }
    } catch (e) {
      console.error('Failed to fetch agent detail:', e);
    }
  };

  /* ── Execute task ─────────────────────────────────────────── */

  const executeTask = async () => {
    if (!selectedAgent || !taskInput.trim() || executing) return;
    setExecuting(true);
    setExecutionResult(null);
    try {
      const res = await fetch(`/api/marketplace/${selectedAgent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: taskInput }),
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (e: any) {
      setExecutionResult({ status: 'failed', error: e.message });
    } finally {
      setExecuting(false);
    }
  };

  /* ── Subscribe / Unsubscribe ─────────────────────────────── */

  const toggleSubscription = async () => {
    if (!selectedAgent) return;
    try {
      if (selectedAgent.subscription?.status === 'active') {
        await fetch(`/api/marketplace/${selectedAgent.id}/subscribe`, { method: 'DELETE' });
      } else {
        await fetch(`/api/marketplace/${selectedAgent.id}/subscribe`, { method: 'POST' });
      }
      // Refresh detail
      openDetail(selectedAgent.id);
    } catch (e) {
      console.error('Subscription error:', e);
    }
  };

  const unlockWithPassword = async () => {
    if (!selectedAgent || !accessPasswordInput.trim()) return;
    setPasswordError('');
    try {
      const res = await fetch(`/api/marketplace/${selectedAgent.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessPassword: accessPasswordInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to unlock');
        return;
      }
      if (data.passwordGranted) {
        setAccessPasswordInput('');
        openDetail(selectedAgent.id);
      } else {
        setPasswordError('Incorrect password');
      }
    } catch (e) {
      setPasswordError('Failed to unlock agent');
    }
  };

  /* ── Install / Uninstall toggle ──────────────────────────── */

  const [installing, setInstalling] = useState(false);

  const toggleInstall = async () => {
    if (!selectedAgent || installing) return;
    setInstalling(true);
    try {
      const isInstalled = selectedAgent.subscription?.installed;
      const res = await fetch(`/api/marketplace/${selectedAgent.id}/install`, {
        method: isInstalled ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        // Refresh detail to pick up new installed state
        await openDetail(selectedAgent.id);
      }
    } catch (e) {
      console.error('Install toggle error:', e);
    } finally {
      setInstalling(false);
    }
  };

  /* ── Rate execution ──────────────────────────────────────── */

  const rateExecution = async (executionId: string, rating: number) => {
    if (!selectedAgent) return;
    try {
      await fetch(`/api/marketplace/${selectedAgent.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId, rating }),
      });
      openDetail(selectedAgent.id);
    } catch (e) {
      console.error('Rating error:', e);
    }
  };

  /* ── Register agent ──────────────────────────────────────── */

  const submitRegistration = async () => {
    setRegistering(true);
    setRegError('');
    try {
      const payload: any = {
        ...regForm,
        accessPassword: regForm.accessPassword || null,
        tags: regForm.tags ? regForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        samplePrompts: regForm.samplePrompts ? regForm.samplePrompts.split('\n').filter(Boolean) : [],
        // Agent Integration Kit
        taskTypes: regForm.taskTypes ? regForm.taskTypes.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        contextInstructions: regForm.contextInstructions || null,
        requiredInputSchema: regForm.requiredInputSchema || null,
        outputSchema: regForm.outputSchema || null,
        usageExamples: regForm.usageExamples ? (() => {
          try { return JSON.parse(regForm.usageExamples); } catch { return []; }
        })() : [],
        contextPreparation: regForm.contextPreparation ? regForm.contextPreparation.split('\n').filter(Boolean) : [],
        executionNotes: regForm.executionNotes || null,
        installGuide: regForm.installGuide || null,
        commands: regForm.commands ? (() => {
          try { return JSON.parse(regForm.commands); } catch { return []; }
        })() : [],
      };
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setRegError(err.error || 'Registration failed');
        return;
      }
      const agent = await res.json();
      setRegForm(EMPTY_REGISTER_FORM);
      openDetail(agent.id);
    } catch (e: any) {
      setRegError(e.message);
    } finally {
      setRegistering(false);
    }
  };
  /* ── Render: Browse ──────────────────────────────────────── */

  const renderBrowse = () => (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-9 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
          />
          <span className="absolute left-3 top-2.5 text-white/30">🔍</span>
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              category === cat.id
                ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20'
            )}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Pricing chips */}
      <div className="flex gap-2">
        {PRICING_FILTERS.map(p => (
          <button
            key={p.id}
            onClick={() => setPricing(p.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs border transition-all',
              pricing === p.id
                ? 'bg-white/10 text-white/80 border-white/20'
                : 'bg-white/3 text-white/40 border-white/8 hover:border-white/15'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-white/40">
        {loading ? 'Loading...' : `${total} agent${total !== 1 ? 's' : ''} found`}
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/30">Loading Bubble Store...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">🫧</div>
          <div className="text-white/50 text-sm">No agents found</div>
          <div className="text-white/30 text-xs mt-1">Try adjusting your filters or be the first to list one</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => openDetail(agent.id)}
              className="text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-lg', CATEGORY_COLORS[agent.category] || 'text-white/60')}>
                      {CATEGORIES.find(c => c.id === agent.category)?.icon || '🤖'}
                    </span>
                    <h3 className="font-medium text-white/90 truncate group-hover:text-brand-400 transition-colors">
                      {agent.name}
                    </h3>
                    {agent.featured && <span className="text-xs">⭐</span>}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
                    <span>by {(agent as any).isFederated
                      ? <a href={`/developer/${agent.slug}`} target="_blank" rel="noopener" className="text-purple-400 hover:underline" onClick={e => e.stopPropagation()}>{agent.developerName}</a>
                      : agent.developerId
                        ? <a href={`/profile/${agent.developerId}`} target="_blank" rel="noopener" className="text-brand-400 hover:underline" onClick={e => e.stopPropagation()}>{agent.developerName}</a>
                        : agent.developerName}</span>
                    {(agent as any).isFederated && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[9px] font-medium border border-purple-500/20">🌐 Federated</span>
                    )}
                    {agent.status === 'pending_review' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-medium border border-amber-500/20">⏳ Pending Review</span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap',
                  PRICING_BADGES[agent.pricingModel]?.className || 'bg-white/10 text-white/50'
                )}>
                  {formatPrice(agent)}
                </div>
              </div>

              <p className="text-xs text-white/50 line-clamp-2 mb-2">{agent.description}</p>

              {/* Task types from Integration Kit */}
              {agent.taskTypes && (() => {
                try {
                  const types = JSON.parse(agent.taskTypes as string);
                  if (Array.isArray(types) && types.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {types.slice(0, 3).map((t: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-brand-500/10 text-brand-300/70 rounded text-[10px] border border-brand-500/10">
                            {t}
                          </span>
                        ))}
                        {types.length > 3 && <span className="text-[10px] text-white/25">+{types.length - 3}</span>}
                      </div>
                    );
                  }
                } catch { /* ignore */ }
                return null;
              })()}

              {/* Tags */}
              {parseTags(agent.tags).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {parseTags(agent.tags).slice(0, 4).map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/40">{tag}</span>
                  ))}
                  {parseTags(agent.tags).length > 4 && (
                    <span className="text-[10px] text-white/30">+{parseTags(agent.tags).length - 4}</span>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 text-[10px] text-white/35">
                <span>🚀 {agent.totalExecutions} runs</span>
                {agent.totalRatings > 0 && (
                  <span className="text-amber-400/70">{stars(agent.avgRating)} ({agent.totalRatings})</span>
                )}
                {agent.avgResponseTime && (
                  <span>⚡ {agent.avgResponseTime < 1000 ? `${agent.avgResponseTime}ms` : `${(agent.avgResponseTime / 1000).toFixed(1)}s`}</span>
                )}
                {agent.successRate != null && (
                  <span>✅ {Math.round(agent.successRate * 100)}%</span>
                )}
                {agent.supportsA2A && <span className="text-blue-400/60">A2A</span>}
                {agent.supportsMCP && <span className="text-green-400/60">MCP</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Render: Detail ──────────────────────────────────────── */

  const renderDetail = () => {
    if (!selectedAgent) return null;
    const a = selectedAgent;
    const samples = parseSamplePrompts(a.samplePrompts);
    const tags = parseTags(a.tags);
    const hasSubscription = a.subscription?.status === 'active';
    const needsSubscription = a.pricingModel === 'subscription' && !hasSubscription;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => { setView('browse'); setSelectedAgent(null); }}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          ← Back to Bubble Store
        </button>

        {/* Header */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORIES.find(c => c.id === a.category)?.icon || '🤖'}</span>
                <h2 className="text-lg font-semibold text-white/90">{a.name}</h2>
                {a.featured && <span className="text-sm">⭐ Featured</span>}
                {a.subscription?.installed && (
                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Installed
                  </span>
                )}
              </div>
              <div className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                <span>by {(a as any).isFederated
                  ? <a href={`/developer/${a.slug}`} target="_blank" rel="noopener" className="text-purple-400 hover:underline">{a.developerName}</a>
                  : a.developerId
                    ? <a href={`/profile/${a.developerId}`} target="_blank" rel="noopener" className="text-brand-400 hover:underline">{a.developerName}</a>
                    : a.developerName}</span>
                {(a as any).isFederated && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[9px] font-medium border border-purple-500/20">🌐 {(a as any).sourceInstanceUrl ? (() => { try { return new URL((a as any).sourceInstanceUrl).hostname; } catch { return 'Federated'; } })() : 'Federated'}</span>
                )}
                {a.status === 'pending_review' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-medium border border-amber-500/20">⏳ Pending Review</span>
                )}
              </div>
            </div>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border',
              PRICING_BADGES[a.pricingModel]?.className
            )}>
              {formatPrice(a)}
            </div>
          </div>

          <p className="text-sm text-white/60 mb-4">{a.description}</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-xs text-white/40">
            <span>🚀 {a.totalExecutions} executions</span>
            {a.totalRatings > 0 && (
              <span className="text-amber-400/70">{stars(a.avgRating)} {a.avgRating.toFixed(1)} ({a.totalRatings} ratings)</span>
            )}
            {a.avgResponseTime && <span>⚡ Avg {a.avgResponseTime < 1000 ? `${a.avgResponseTime}ms` : `${(a.avgResponseTime / 1000).toFixed(1)}s`}</span>}
            {a.successRate != null && <span>✅ {Math.round(a.successRate * 100)}% success</span>}
            <span>📊 {a._count?.subscriptions || 0} subscribers</span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[11px] text-white/50">{tag}</span>
              ))}
            </div>
          )}

          {/* Protocol badges + version */}
          <div className="flex flex-wrap gap-2 mt-3">
            {a.version && <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded text-[10px] font-mono">v{a.version}</span>}
            {a.supportsA2A && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px]">A2A Compatible</span>}
            {a.supportsMCP && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px]">MCP Compatible</span>}
            <span className="px-2 py-0.5 bg-white/5 text-white/40 border border-white/10 rounded text-[10px]">In: {a.inputFormat} → Out: {a.outputFormat}</span>
          </div>

          {/* Changelog (if available) */}
          {a.changelog && (() => {
            try {
              const entries = JSON.parse(a.changelog);
              if (Array.isArray(entries) && entries.length > 0) {
                return (
                  <details className="mt-3 group">
                    <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50 transition-colors">
                      📝 Changelog ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                    </summary>
                    <div className="mt-2 space-y-1 pl-3 border-l border-white/[0.06]">
                      {entries.slice(0, 10).map((entry: any, i: number) => (
                        <div key={i} className="text-[10px] text-white/40">
                          <span className="text-brand-400 font-mono">v{entry.version}</span>
                          {entry.previousVersion && <span className="text-white/20 font-mono"> ← v{entry.previousVersion}</span>}
                          <span className="text-white/20 mx-1">·</span>
                          <span className="text-white/25">{new Date(entry.date).toLocaleDateString()}</span>
                          <span className="text-white/20 mx-1">—</span>
                          <span>{entry.changes}</span>
                          {entry.diff && Object.keys(entry.diff).length > 0 && (
                            <details className="mt-1 ml-2">
                              <summary className="text-[9px] text-white/20 cursor-pointer hover:text-white/35">view diff</summary>
                              <div className="mt-0.5 space-y-0.5 text-[9px]">
                                {Object.entries(entry.diff).map(([field, val]: [string, any]) => (
                                  <div key={field} className="text-white/25">
                                    <span className="text-white/40">{field}:</span>{' '}
                                    <span className="text-red-400/50 line-through">{String(val.from || '(empty)').slice(0, 80)}</span>{' → '}
                                    <span className="text-green-400/50">{String(val.to || '(empty)').slice(0, 80)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              }
              return null;
            } catch { return null; }
          })()}

          {/* Subscription button for subscription agents */}
          {a.pricingModel === 'subscription' && !a.isOwner && (
            <div className="mt-4">
              <button
                onClick={toggleSubscription}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  hasSubscription
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                )}
              >
                {hasSubscription ? '✕ Cancel Subscription' : '✓ Subscribe'}
              </button>
              {hasSubscription && a.subscription && (
                <div className="text-xs text-white/30 mt-1">
                  {a.subscription.tasksUsed}{a.subscription.taskLimit ? `/${a.subscription.taskLimit}` : ''} tasks used this period
                </div>
              )}
            </div>
          )}

          {/* Owner: show access password */}
          {a.isOwner && a.accessPassword && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔑</span>
                <span className="text-xs font-medium text-white/50">Access Password:</span>
                <code className="text-xs text-brand-400 bg-white/5 px-2 py-0.5 rounded font-mono">{a.accessPassword}</code>
              </div>
              <p className="text-[10px] text-white/30 mt-1">Share this with people you want to give free access to this agent.</p>
            </div>
          )}

          {/* Password unlock — for agents with access passwords */}
          {!a.isOwner && !hasSubscription && a.hasAccessPassword && (
            <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🔑</span>
                <span className="text-xs font-medium text-white/60">Have an access password?</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={accessPasswordInput}
                  onChange={e => { setAccessPasswordInput(e.target.value); setPasswordError(''); }}
                  placeholder="Enter password"
                  onKeyDown={e => e.key === 'Enter' && unlockWithPassword()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                />
                <button
                  onClick={unlockWithPassword}
                  disabled={!accessPasswordInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Unlock Free Access
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
          )}

          {/* Install / Uninstall — Divi's Active Toolkit */}
          {!a.isOwner && (() => {
            const needsSub = a.pricingModel !== 'free' && !hasSubscription;
            return (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleInstall}
                  disabled={installing || needsSub}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                    needsSub
                      ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                      : a.subscription?.installed
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                  )}
                >
                  {installing ? (
                    <span className="animate-pulse">⏳</span>
                  ) : a.subscription?.installed ? (
                    <>🧠 Uninstall from Divi</>
                  ) : (
                    <>⚡ Install to Divi&apos;s Toolkit</>
                  )}
                </button>
                {needsSub && (
                  <span className="text-[10px] text-white/35">Subscribe first to install paid agents</span>
                )}
                {a.subscription?.installed && (
                  <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                    Installed — Divi knows this agent
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Long description */}
        {a.longDescription && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-2">About</h3>
            <div className="text-xs text-white/50 whitespace-pre-wrap">{a.longDescription}</div>
          </div>
        )}

        {/* Agent Integration Kit */}
        {(a.taskTypes || a.contextInstructions || a.contextPreparation || a.requiredInputSchema || a.outputSchema || a.usageExamples || a.executionNotes) && (
          <div className="bg-gradient-to-br from-brand-500/[0.04] to-emerald-500/[0.04] border border-brand-500/[0.12] rounded-xl p-4">
            <h3 className="text-sm font-medium text-brand-400 mb-3">🧠 Agent Integration Kit</h3>
            <p className="text-[10px] text-white/35 mb-3">This is what your Divi needs to know to work with this agent effectively.</p>

            {/* Task Types */}
            {a.taskTypes && (() => {
              try {
                const types = JSON.parse(a.taskTypes as string);
                if (Array.isArray(types) && types.length > 0) {
                  return (
                    <div className="mb-3">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Handles</div>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map((t: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-brand-500/15 text-brand-300 rounded-full text-[11px] border border-brand-500/20">{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch { /* ignore parse errors */ }
              return null;
            })()}

            {/* Context Instructions */}
            {a.contextInstructions && (
              <div className="mb-3">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">How Divi Should Prepare Context</div>
                <div className="bg-black/20 rounded-lg p-3 text-xs text-white/60 whitespace-pre-wrap">{a.contextInstructions}</div>
              </div>
            )}

            {/* Preparation Steps */}
            {a.contextPreparation && (() => {
              try {
                const steps = JSON.parse(a.contextPreparation as string);
                if (Array.isArray(steps) && steps.length > 0) {
                  return (
                    <div className="mb-3">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Pre-Flight Checklist</div>
                      <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                        {steps.map((step: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-white/55">
                            <span className="text-brand-400 font-mono text-[10px] mt-0.5 shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch { /* ignore parse errors */ }
              return null;
            })()}

            {/* Input/Output Schema */}
            {(a.requiredInputSchema || a.outputSchema) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {a.requiredInputSchema && (
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Expected Input</div>
                    <pre className="bg-black/30 rounded-lg p-2.5 text-[10px] text-emerald-300/70 overflow-x-auto font-mono">{a.requiredInputSchema}</pre>
                  </div>
                )}
                {a.outputSchema && (
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Returns</div>
                    <pre className="bg-black/30 rounded-lg p-2.5 text-[10px] text-amber-300/70 overflow-x-auto font-mono">{a.outputSchema}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Usage Examples */}
            {a.usageExamples && (() => {
              try {
                const examples = JSON.parse(a.usageExamples as string);
                if (Array.isArray(examples) && examples.length > 0) {
                  return (
                    <div className="mb-3">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Usage Examples</div>
                      <div className="space-y-2">
                        {examples.map((ex: any, i: number) => (
                          <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/[0.04]">
                            {ex.description && <div className="text-[10px] text-white/40 mb-1.5 font-medium">{ex.description}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <div className="text-[9px] text-white/30 uppercase mb-0.5">Input</div>
                                <div className="text-[11px] text-white/60 bg-black/20 rounded p-2 font-mono">{ex.input}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-white/30 uppercase mb-0.5">Output</div>
                                <div className="text-[11px] text-white/60 bg-black/20 rounded p-2 font-mono">{ex.output}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch { /* ignore parse errors */ }
              return null;
            })()}

            {/* Execution Notes */}
            {a.executionNotes && (
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">⚠️ Notes</div>
                <div className="text-xs text-amber-300/60 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">{a.executionNotes}</div>
              </div>
            )}
          </div>
        )}

        {/* Execute Task */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3">🚀 Execute Task</h3>

          {needsSubscription ? (
            <div className="text-xs text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              Subscribe to this agent to execute tasks.
            </div>
          ) : (
            <>
              {/* Sample prompts */}
              {samples.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-white/30 mb-1.5">Try a sample:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {samples.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setTaskInput(s)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-white/50 transition-all"
                      >
                        {s.length > 60 ? s.slice(0, 60) + '...' : s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  placeholder="Describe your task..."
                  rows={3}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
              </div>
              <button
                onClick={executeTask}
                disabled={!taskInput.trim() || executing}
                className={cn(
                  'mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all w-full',
                  executing
                    ? 'bg-white/5 text-white/30 cursor-wait'
                    : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                )}
              >
                {executing ? '⏳ Executing...' : '▶ Run Task'}
              </button>
            </>
          )}

          {/* Execution result */}
          {executionResult && (
            <div className={cn(
              'mt-3 rounded-lg border p-3',
              executionResult.status === 'completed'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-xs font-medium',
                  executionResult.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {executionResult.status === 'completed' ? '✓ Completed' : '✕ ' + (executionResult.status || 'Failed')}
                </span>
                {executionResult.responseTimeMs && (
                  <span className="text-[10px] text-white/30">{executionResult.responseTimeMs}ms</span>
                )}
              </div>
              {executionResult.output ? (
                <div className="text-xs text-white/70 whitespace-pre-wrap max-h-64 overflow-y-auto bg-black/20 rounded p-2 font-mono">
                  {executionResult.output}
                </div>
              ) : executionResult.error ? (
                <div className="text-xs text-red-400/70">{executionResult.error}</div>
              ) : null}

              {/* Rate */}
              {executionResult.status === 'completed' && executionResult.executionId && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] text-white/30 mr-1">Rate:</span>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => rateExecution(executionResult.executionId, r)}
                      className="text-sm hover:scale-110 transition-transform"
                    >
                      {r <= (executionResult.rating || 0) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Executions */}
        {a.recentExecutions && a.recentExecutions.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">📜 Your Recent Executions</h3>
            <div className="space-y-2">
              {a.recentExecutions.map(exec => (
                <div key={exec.id} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 truncate flex-1">{exec.taskInput.slice(0, 80)}{exec.taskInput.length > 80 ? '...' : ''}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded ml-2',
                      exec.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      exec.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-white/10 text-white/40'
                    )}>
                      {exec.status}
                    </span>
                  </div>
                  {exec.taskOutput && (
                    <div className="text-[10px] text-white/40 mt-1 line-clamp-2">{exec.taskOutput}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-white/25">
                    {exec.responseTimeMs && <span>{exec.responseTimeMs}ms</span>}
                    {exec.rating && <span className="text-amber-400/60">{'★'.repeat(exec.rating)}</span>}
                    <span>{new Date(exec.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  /* ── Fetch earnings ─────────────────────────────────────────── */

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch('/api/marketplace/earnings');
      if (res.ok) {
        const data = await res.json();
        setEarnings(data);
      }
    } catch (e) {
      console.error('Failed to fetch earnings:', e);
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  const fetchJobEarnings = useCallback(async () => {
    setJobEarningsLoading(true);
    try {
      const res = await fetch('/api/jobs/earnings');
      if (res.ok) {
        const data = await res.json();
        setJobEarnings(data);
      }
    } catch (e) {
      console.error('Failed to fetch job earnings:', e);
    } finally {
      setJobEarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'earnings') {
      fetchEarnings();
      fetchJobEarnings();
    }
  }, [view, fetchEarnings, fetchJobEarnings]);

  // Check for earnings on mount to show/hide the tab
  useEffect(() => {
    fetch('/api/marketplace/earnings').then(r => r.json()).then(d => setEarnings(d)).catch(() => {});
  }, []);

  /* ── Main Render ─────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white/90">🫧 Bubble Store</h1>
            <p className="text-[10px] text-white/35 mt-0.5">Discover, connect, and execute tasks with community agents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('browse')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'browse' || view === 'detail'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              Agents
            </button>
            <button
              onClick={() => setView('capabilities')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'capabilities'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              Capabilities
            </button>
            <button
              onClick={() => setView('register')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'register'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              + List
            </button>
            {/* Earnings tab - always visible (job + agent earnings) */}
            <button
              onClick={() => setView('earnings')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'earnings'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              {'\uD83D\uDCB0'} Earnings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {view === 'browse' && renderBrowse()}
        {view === 'detail' && renderDetail()}
        {view === 'register' && (
          <RegisterView
            regForm={regForm}
            setRegForm={setRegForm}
            regError={regError}
            registering={registering}
            feeInfo={feeInfo}
            onBack={() => setView('browse')}
            onSubmit={submitRegistration}
          />
        )}
        {view === 'earnings' && (
          <EarningsView
            earningsTab={earningsTab}
            setEarningsTab={setEarningsTab}
            earnings={earnings}
            earningsLoading={earningsLoading}
            jobEarnings={jobEarnings}
            jobEarningsLoading={jobEarningsLoading}
            feeInfo={feeInfo}
            onGoToRegister={() => setView('register')}
          />
        )}
        {view === 'capabilities' && <CapabilitiesMarketplace onStartGuidedChat={onStartGuidedChat} />}
      </div>
    </div>
  );
}