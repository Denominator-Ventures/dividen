'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */

interface MarketplaceAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category: string;
  tags?: string;
  pricingModel: string;
  pricePerTask?: number | null;
  subscriptionPrice?: number | null;
  taskLimit?: number | null;
  status: string;
  featured: boolean;
  totalExecutions: number;
  avgRating: number;
  totalRatings: number;
  avgResponseTime?: number | null;
  successRate?: number | null;
  developerName: string;
  developerUrl?: string | null;
  supportsA2A: boolean;
  supportsMCP: boolean;
  inputFormat: string;
  outputFormat: string;
  createdAt: string;
  _count?: { subscriptions: number };
  // Detail fields
  isOwner?: boolean;
  subscription?: any;
  recentExecutions?: Execution[];
  endpointUrl?: string;
  authMethod?: string;
  samplePrompts?: string;
  pricingDetails?: string;
  // Agent Integration Kit
  taskTypes?: string | null;
  contextInstructions?: string | null;
  requiredInputSchema?: string | null;
  outputSchema?: string | null;
  usageExamples?: string | null;
  contextPreparation?: string | null;
  executionNotes?: string | null;
  installGuide?: string | null;
  commands?: string | null;
  developerId?: string;
  version?: string;
  changelog?: string | null;
  // Access password
  accessPassword?: string | null; // only exposed to owner
  hasAccessPassword?: boolean;
}

interface Execution {
  id: string;
  taskInput: string;
  taskOutput?: string | null;
  status: string;
  responseTimeMs?: number | null;
  rating?: number | null;
  createdAt: string;
  completedAt?: string | null;
}

interface FeeInfo {
  feePercent: number;
  networkFeePercent: number;
  developerPercent: number;
  networkDeveloperPercent: number;
  isSelfHosted: boolean;
  label: string;
  networkLabel: string;
}

interface EarningsData {
  hasListings: boolean;
  hasPaidListings?: boolean;
  feeInfo?: FeeInfo;
  stripeConnect?: {
    hasAccount: boolean;
    onboarded: boolean;
  };
  totals?: {
    totalAgents: number;
    paidAgents: number;
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    activeSubscriptions: number;
    uniqueUsers: number;
    grossRevenue: number;
    platformFees: number;
    developerPayout: number;
    pendingPayout: number;
    subscriptionMRR: number;
    estimatedRevenue: number;
  };
  agents?: any[];
  recentExecutions?: any[];
}

type ViewMode = 'browse' | 'detail' | 'register' | 'my_agents' | 'earnings';
type EarningsTab = 'agent' | 'job';

interface JobEarningsTotals {
  totalContracts: number;
  activeContracts: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalFees: number;
  totalSpent: number;
}

interface JobEarningsData {
  asWorker: { contracts: any[]; totals: JobEarningsTotals };
  asClient: { contracts: any[]; totals: JobEarningsTotals };
}

interface MarketplaceViewProps {
  prefillAgent?: {
    name?: string;
    description?: string;
    endpointUrl?: string;
    category?: string;
  };
  onPrefillConsumed?: () => void;
  initialView?: ViewMode;
}

/* ── Constants ─────────────────────────────────────────────── */

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'coding', label: 'Coding', icon: '💻' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'operations', label: 'Ops', icon: '⚙️' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'general', label: 'General', icon: '🤖' },
];

const PRICING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'per_task', label: 'Per Task' },
  { id: 'subscription', label: 'Subscription' },
];

const PRICING_BADGES: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  per_task: { label: 'Per Task', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  subscription: { label: 'Subscription', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  tiered: { label: 'Tiered', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  dynamic: { label: 'Dynamic', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
};

const CATEGORY_COLORS: Record<string, string> = {
  research: 'text-blue-400',
  coding: 'text-green-400',
  writing: 'text-purple-400',
  analysis: 'text-amber-400',
  operations: 'text-red-400',
  creative: 'text-pink-400',
  general: 'text-zinc-400',
};

/* ── Component ─────────────────────────────────────────────── */

export function MarketplaceView({ prefillAgent, onPrefillConsumed, initialView }: MarketplaceViewProps = {}) {
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
  const [regForm, setRegForm] = useState({
    name: '', description: '', longDescription: '', endpointUrl: '',
    authMethod: 'bearer', authToken: '', authHeader: '',
    developerName: '', developerUrl: '',
    category: 'general', tags: '',
    inputFormat: 'text', outputFormat: 'text',
    samplePrompts: '',
    pricingModel: 'free', pricePerTask: '', subscriptionPrice: '', taskLimit: '',
    accessPassword: '',
    supportsA2A: false, supportsMCP: false, agentCardUrl: '',
    // Agent Integration Kit
    taskTypes: '',
    contextInstructions: '',
    requiredInputSchema: '',
    outputSchema: '',
    usageExamples: '',
    contextPreparation: '',
    executionNotes: '',
    installGuide: '',
    commands: '',
  });
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
      setRegForm({
        name: '', description: '', longDescription: '', endpointUrl: '',
        authMethod: 'bearer', authToken: '', authHeader: '',
        developerName: '', developerUrl: '',
        category: 'general', tags: '',
        inputFormat: 'text', outputFormat: 'text',
        samplePrompts: '',
        pricingModel: 'free', pricePerTask: '', subscriptionPrice: '', taskLimit: '',
        accessPassword: '',
        supportsA2A: false, supportsMCP: false, agentCardUrl: '',
        taskTypes: '', contextInstructions: '', requiredInputSchema: '',
        outputSchema: '', usageExamples: '', contextPreparation: '', executionNotes: '',
        installGuide: '', commands: '',
      });
      openDetail(agent.id);
    } catch (e: any) {
      setRegError(e.message);
    } finally {
      setRegistering(false);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────── */

  const formatPrice = (agent: MarketplaceAgent) => {
    if (agent.pricingModel === 'free') return 'Free';
    if (agent.pricingModel === 'per_task' && agent.pricePerTask) return `$${agent.pricePerTask}/task`;
    if (agent.pricingModel === 'subscription' && agent.subscriptionPrice) {
      const limit = agent.taskLimit ? ` (${agent.taskLimit} tasks/mo)` : ' (unlimited)';
      return `$${agent.subscriptionPrice}/mo${limit}`;
    }
    if (agent.pricingModel === 'tiered' && agent.pricingDetails) {
      try {
        const config = JSON.parse(agent.pricingDetails);
        if (config.tiers?.length) {
          return `From $${config.tiers[0].pricePerTask}/task`;
        }
      } catch { /* ignore */ }
      return 'Tiered';
    }
    if (agent.pricingModel === 'dynamic') {
      if (agent.pricingDetails) {
        try {
          const config = JSON.parse(agent.pricingDetails);
          if (config.dynamicConfig?.estimateRange) {
            const [min, max] = config.dynamicConfig.estimateRange;
            return `~$${min}–$${max}/task`;
          }
        } catch { /* ignore */ }
      }
      return 'Dynamic';
    }
    return agent.pricingModel;
  };

  const parseTags = (tags?: string | null): string[] => {
    if (!tags) return [];
    try { return JSON.parse(tags); } catch { return []; }
  };

  const parseSamplePrompts = (sp?: string | null): string[] => {
    if (!sp) return [];
    try { return JSON.parse(sp); } catch { return []; }
  };

  const stars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
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

  /* ── Render: Register ────────────────────────────────────── */

  const renderRegister = () => (
    <div className="space-y-4">
      <button
        onClick={() => setView('browse')}
        className="text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        ← Back to Bubble Store
      </button>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white/90 mb-1">🏗️ Register Your Agent</h2>
        <p className="text-xs text-white/40 mb-4">List your agent on the Bubble Store for others to discover and use.</p>

        {regError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-4">{regError}</div>
        )}

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Agent Name *</label>
              <input
                value={regForm.name}
                onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                placeholder="My Research Agent"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Developer Name *</label>
              <input
                value={regForm.developerName}
                onChange={e => setRegForm(p => ({ ...p, developerName: e.target.value }))}
                placeholder="Your name or org"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Short Description *</label>
            <input
              value={regForm.description}
              onChange={e => setRegForm(p => ({ ...p, description: e.target.value }))}
              placeholder="One-liner about what your agent does"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Detailed Description</label>
            <textarea
              value={regForm.longDescription}
              onChange={e => setRegForm(p => ({ ...p, longDescription: e.target.value }))}
              placeholder="Full description, capabilities, limitations... (Markdown supported)"
              rows={4}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
            />
          </div>

          {/* Endpoint */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">🔌 Connection</h3>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Endpoint URL *</label>
              <input
                value={regForm.endpointUrl}
                onChange={e => setRegForm(p => ({ ...p, endpointUrl: e.target.value }))}
                placeholder="https://your-agent.example.com/api/execute"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Auth Method</label>
                <select
                  value={regForm.authMethod}
                  onChange={e => setRegForm(p => ({ ...p, authMethod: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="header">Custom Header</option>
                </select>
              </div>
              {regForm.authMethod !== 'none' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">
                    {regForm.authMethod === 'bearer' ? 'Bearer Token' : regForm.authMethod === 'api_key' ? 'API Key' : 'Token Value'}
                  </label>
                  <input
                    type="password"
                    value={regForm.authToken}
                    onChange={e => setRegForm(p => ({ ...p, authToken: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>
              )}
              {regForm.authMethod === 'header' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Header Name</label>
                  <input
                    value={regForm.authHeader}
                    onChange={e => setRegForm(p => ({ ...p, authHeader: e.target.value }))}
                    placeholder="X-Custom-Key"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category & Tags */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">🏷️ Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Category</label>
                <select
                  value={regForm.category}
                  onChange={e => setRegForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Input Format</label>
                <select
                  value={regForm.inputFormat}
                  onChange={e => setRegForm(p => ({ ...p, inputFormat: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="a2a">A2A Protocol</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Output Format</label>
                <select
                  value={regForm.outputFormat}
                  onChange={e => setRegForm(p => ({ ...p, outputFormat: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="a2a">A2A Protocol</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Tags (comma-separated)</label>
              <input
                value={regForm.tags}
                onChange={e => setRegForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="research, summarization, academic, papers"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div className="mt-3">
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Sample Prompts (one per line)</label>
              <textarea
                value={regForm.samplePrompts}
                onChange={e => setRegForm(p => ({ ...p, samplePrompts: e.target.value }))}
                placeholder={"Summarize this research paper\nFind recent publications on..."}
                rows={3}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>
          </div>

          {/* Agent Integration Kit */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-1">🧠 Agent Integration Kit</h3>
            <p className="text-[10px] text-white/30 mb-3">
              This is how other users&apos; Divis learn to work with your agent. The better you define this, the better the results.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Task Types (comma-separated)</label>
                <input
                  value={regForm.taskTypes}
                  onChange={e => setRegForm(p => ({ ...p, taskTypes: e.target.value }))}
                  placeholder="research, summarization, code-review, data-analysis"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                />
                <p className="text-[10px] text-white/25 mt-0.5">What kinds of work this agent handles. Other Divis match tasks to agents using these.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Context Instructions</label>
                <textarea
                  value={regForm.contextInstructions}
                  onChange={e => setRegForm(p => ({ ...p, contextInstructions: e.target.value }))}
                  placeholder={"Before calling this agent, gather:\n- The full text or URL of the document to analyze\n- Specify the desired output format (bullet points, narrative, table)\n- Include any domain-specific terminology or context\n\nDo NOT send raw HTML — extract clean text first."}
                  rows={5}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Tell other Divis exactly how to prepare context before calling your agent. Markdown supported.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Preparation Steps (one per line)</label>
                <textarea
                  value={regForm.contextPreparation}
                  onChange={e => setRegForm(p => ({ ...p, contextPreparation: e.target.value }))}
                  placeholder={"Collect the source material URL or text\nIdentify the target audience\nSpecify output length preference\nNote any topics to exclude"}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Step-by-step checklist Divi follows before executing. Think of it as a pre-flight checklist.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Input Schema (JSON)</label>
                  <textarea
                    value={regForm.requiredInputSchema}
                    onChange={e => setRegForm(p => ({ ...p, requiredInputSchema: e.target.value }))}
                    placeholder={'{\n  "prompt": "string (required)",\n  "format": "bullet|narrative|table",\n  "maxLength": "number (optional)"\n}'}
                    rows={5}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Output Schema (JSON)</label>
                  <textarea
                    value={regForm.outputSchema}
                    onChange={e => setRegForm(p => ({ ...p, outputSchema: e.target.value }))}
                    placeholder={'{\n  "summary": "string",\n  "keyPoints": ["string"],\n  "confidence": "number 0-1"\n}'}
                    rows={5}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Usage Examples (JSON array)</label>
                <textarea
                  value={regForm.usageExamples}
                  onChange={e => setRegForm(p => ({ ...p, usageExamples: e.target.value }))}
                  placeholder={'[\n  {\n    "input": "Summarize this paper on quantum computing",\n    "output": "A 3-paragraph summary covering...",\n    "description": "Basic summarization task"\n  }\n]'}
                  rows={5}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Real input/output examples teach other Divis the pattern. The more, the better.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Execution Notes</label>
                <textarea
                  value={regForm.executionNotes}
                  onChange={e => setRegForm(p => ({ ...p, executionNotes: e.target.value }))}
                  placeholder={"Rate limit: 10 requests/minute. Best results with prompts under 2000 chars. Agent may take 15-30s for complex queries."}
                  rows={2}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Rate limits, quirks, best practices — anything Divi should know at execution time.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">📋 Install Guide (Markdown)</label>
                <textarea
                  value={regForm.installGuide}
                  onChange={e => setRegForm(p => ({ ...p, installGuide: e.target.value }))}
                  placeholder={"## Setup\n1. Connect your API key in Settings → Integrations\n2. Configure the response format preference\n3. Test with: \"Summarize the latest quarterly report\""}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Shown to users after install. Guide them through configuration and first use.</p>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">⚡ Commands (JSON array)</label>
                <textarea
                  value={regForm.commands}
                  onChange={e => setRegForm(p => ({ ...p, commands: e.target.value }))}
                  placeholder={'[\n  {"name": "research", "description": "Deep research on a topic", "usage": "!your-slug.research <query>"},\n  {"name": "summarize", "description": "Summarize a document", "usage": "!your-slug.summarize <url>"}\n]'}
                  rows={4}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
                />
                <p className="text-[10px] text-white/25 mt-0.5">Users invoke these via <code className="text-brand-400/60">!slug.command</code> in chat. Divi routes the task to your agent.</p>
              </div>
            </div>
          </div>

          {/* Protocol support */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={regForm.supportsA2A} onChange={e => setRegForm(p => ({ ...p, supportsA2A: e.target.checked }))} className="rounded" />
              A2A Compatible
            </label>
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={regForm.supportsMCP} onChange={e => setRegForm(p => ({ ...p, supportsMCP: e.target.checked }))} className="rounded" />
              MCP Compatible
            </label>
          </div>

          {/* Pricing */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-3">💰 Pricing & Revenue Split</h3>

            {/* Fee info banner */}
            {feeInfo && regForm.pricingModel !== 'free' && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-brand-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-400 text-sm font-semibold">{feeInfo.developerPercent}% to you</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">{feeInfo.feePercent}% DiviDen routing fee</span>
                </div>
                <p className="text-[10px] text-white/35">
                  {feeInfo.isSelfHosted
                    ? 'Internal transactions: 0% fee. Network transactions: minimum 3% routing fee.'
                    : `You keep ${feeInfo.developerPercent}% of every transaction. DiviDen takes a ${feeInfo.feePercent}% routing fee for discovery, execution proxy, and infrastructure.`}
                </p>
                {regForm.pricingModel === 'per_task' && regForm.pricePerTask && (
                  <div className="mt-2 text-[10px] text-white/40">
                    Example: ${regForm.pricePerTask}/task → you earn <span className="text-emerald-400">${(parseFloat(regForm.pricePerTask) * feeInfo.developerPercent / 100).toFixed(2)}</span> per execution
                  </div>
                )}
                {regForm.pricingModel === 'subscription' && regForm.subscriptionPrice && (
                  <div className="mt-2 text-[10px] text-white/40">
                    Example: ${regForm.subscriptionPrice}/mo → you earn <span className="text-emerald-400">${(parseFloat(regForm.subscriptionPrice) * feeInfo.developerPercent / 100).toFixed(2)}</span>/subscriber/mo
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Pricing Model</label>
                <select
                  value={regForm.pricingModel}
                  onChange={e => setRegForm(p => ({ ...p, pricingModel: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="per_task">Per Task</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              {regForm.pricingModel === 'per_task' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Price Per Task ($)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={regForm.pricePerTask}
                    onChange={e => setRegForm(p => ({ ...p, pricePerTask: e.target.value }))}
                    placeholder="1.00"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              )}
              {regForm.pricingModel === 'subscription' && (
                <>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Monthly Price ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={regForm.subscriptionPrice}
                      onChange={e => setRegForm(p => ({ ...p, subscriptionPrice: e.target.value }))}
                      placeholder="29.99"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider">Task Limit (blank = unlimited)</label>
                    <input
                      type="number" min="0"
                      value={regForm.taskLimit}
                      onChange={e => setRegForm(p => ({ ...p, taskLimit: e.target.value }))}
                      placeholder="100"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Access Password */}
          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/60 mb-1">🔑 Access Password</h3>
            <p className="text-[10px] text-white/30 mb-3">
              Set a password that you can share with people to give them free access to your agent — even if it&apos;s a paid agent. They enter the password when subscribing and skip payment entirely.
            </p>
            <input
              value={regForm.accessPassword}
              onChange={e => setRegForm(p => ({ ...p, accessPassword: e.target.value }))}
              placeholder="Leave blank for no password access"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* Developer URL */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Developer Website / GitHub</label>
            <input
              value={regForm.developerUrl}
              onChange={e => setRegForm(p => ({ ...p, developerUrl: e.target.value }))}
              placeholder="https://github.com/your-org"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <button
            onClick={submitRegistration}
            disabled={registering || !regForm.name || !regForm.description || !regForm.endpointUrl || !regForm.developerName}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              registering
                ? 'bg-white/5 text-white/30 cursor-wait'
                : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
            )}
          >
            {registering ? 'Registering...' : '🚀 Register Agent'}
          </button>
        </div>
      </div>
    </div>
  );

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

  /* ── Render: Earnings (tabbed — Job Earnings + Agent Earnings) ── */

  const renderJobEarnings = () => {
    if (jobEarningsLoading) return <div className="text-center py-8 text-white/30">Loading job earnings...</div>;
    if (!jobEarnings) return null;

    const w = jobEarnings.asWorker;
    const c = jobEarnings.asClient;

    return (
      <div className="space-y-4">
        {/* Worker earnings hero */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-brand-500/5 to-teal-500/5 border border-emerald-500/20 rounded-xl p-6">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Job Earnings (as Worker)</div>
          <div className="text-3xl font-bold text-emerald-400">${(w.totals.totalPaid || 0).toLocaleString()}</div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-white/40">{w.totals.totalContracts} contract{w.totals.totalContracts !== 1 ? 's' : ''}</span>
            <span className="text-white/15">|</span>
            <span className="text-white/40">{w.totals.activeContracts} active</span>
            {w.totals.totalPending > 0 && (
              <>
                <span className="text-white/15">|</span>
                <span className="text-amber-400/70">Pending: ${w.totals.totalPending.toLocaleString()}</span>
              </>
            )}
            {w.totals.totalFees > 0 && (
              <>
                <span className="text-white/15">|</span>
                <span className="text-white/30">Fees: ${w.totals.totalFees.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Worker contracts */}
        {w.contracts.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">📋 Your Job Contracts</h3>
            <div className="space-y-2">
              {w.contracts.map((ct: any) => (
                <div key={ct.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{ct.job?.title || 'Job'}</div>
                    <div className="text-[10px] text-white/35">
                      {ct.compensationType} · ${ct.compensationAmount}/{ct.compensationType === 'flat' ? 'total' : ct.compensationType}
                      {ct.job?.poster?.name && <span> · Client: {ct.job.poster.name}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-sm font-medium text-emerald-400">${ct.totalPaid || 0}</div>
                    {ct.totalPending > 0 && <div className="text-[9px] text-amber-400/60">+${ct.totalPending} pending</div>}
                    <div className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block',
                      ct.status === 'active' ? 'bg-emerald-500/20 text-emerald-400'
                        : ct.status === 'completed' ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-white/10 text-white/40'
                    )}>
                      {ct.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {w.contracts.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">💼</div>
            <p className="text-sm text-white/40">No job contracts yet. Apply to jobs to start earning.</p>
          </div>
        )}

        {/* Client spending */}
        {c.contracts.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">💳 Your Spending (as Client)</h3>
            <div className="flex items-center gap-4 mb-3 text-xs">
              <span className="text-white/40">Total spent: <span className="text-white/70 font-medium">${c.totals.totalSpent.toLocaleString()}</span></span>
              <span className="text-white/40">Fees: <span className="text-white/50">${c.totals.totalFees.toLocaleString()}</span></span>
            </div>
            <div className="space-y-2">
              {c.contracts.map((ct: any) => (
                <div key={ct.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{ct.job?.title || 'Job'}</div>
                    <div className="text-[10px] text-white/35">
                      Worker: {ct.worker?.name || ct.worker?.email || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white/50">${ct.totalPaid || 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAgentEarnings = () => {
    if (earningsLoading) return <div className="text-center py-8 text-white/30">Loading agent earnings...</div>;
    if (!earnings?.hasListings) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-sm font-medium text-white/60 mb-1">No agents listed yet</h3>
          <p className="text-xs text-white/35 mb-4">List an agent with paid pricing to start earning from the Bubble Store.</p>
          <button onClick={() => setView('register')} className="px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-all">
            + List Your First Agent
          </button>
        </div>
      );
    }

    const t = earnings.totals!;
    const fi = earnings.feeInfo || feeInfo;
    const sc = earnings.stripeConnect;
    return (
      <div className="space-y-4">
        {/* Stripe Connect banner */}
        {sc && !sc.onboarded && earnings.hasPaidListings && (
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-xl border',
            sc.hasAccount
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-brand-500/10 border-brand-500/20'
          )}>
            <span className="text-2xl">{sc.hasAccount ? '⏳' : '🏦'}</span>
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-medium', sc.hasAccount ? 'text-amber-400' : 'text-brand-400')}>
                {sc.hasAccount ? 'Complete Stripe Setup' : 'Set Up Payouts'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {sc.hasAccount
                  ? 'Your Stripe Connect onboarding is incomplete. Finish it to receive payouts from paid agent executions.'
                  : 'Connect your bank account via Stripe to receive payouts when users execute your paid agents.'}
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all',
                sc.hasAccount
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
              )}
            >
              {sc.hasAccount ? 'Continue →' : 'Connect Stripe →'}
            </button>
          </div>
        )}

        {sc?.onboarded && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-xs">✓ Stripe Connected</span>
            <button
              onClick={async () => {
                const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
              }}
              className="text-xs text-white/40 hover:text-white/60 transition-colors ml-auto"
            >
              Open Stripe Dashboard →
            </button>
          </div>
        )}

        {/* Revenue hero */}
        <div className="bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-emerald-500/5 border border-brand-500/20 rounded-xl p-6">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Bubble Store Earnings</div>
          <div className="text-3xl font-bold text-emerald-400">${(t.developerPayout || 0).toLocaleString()}</div>
          {t.grossRevenue > 0 && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-white/40">Gross: ${t.grossRevenue.toLocaleString()}</span>
              <span className="text-white/15">|</span>
              <span className="text-white/30">Platform fee: ${t.platformFees.toLocaleString()}</span>
              {t.pendingPayout > 0 && (
                <>
                  <span className="text-white/15">|</span>
                  <span className="text-amber-400/70">Pending: ${t.pendingPayout.toLocaleString()}</span>
                </>
              )}
            </div>
          )}
          <div className="text-xs text-white/35 mt-1">{t.paidAgents} paid agent{t.paidAgents !== 1 ? 's' : ''} · {t.activeSubscriptions} active subscriber{t.activeSubscriptions !== 1 ? 's' : ''}</div>
          {fi && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/40">
              💡 Revenue split: <span className="text-emerald-400 font-medium">{fi.developerPercent}% to you</span> · {fi.feePercent}% routing fee
              {fi.isSelfHosted && <span className="ml-1 text-brand-400">(internal: 0% · network: {fi.networkFeePercent}% min)</span>}
              {!fi.isSelfHosted && <span className="ml-1">· Internal transactions configurable · Network: {fi.networkFeePercent}% minimum enforced</span>}
            </div>
          )}
          {t.subscriptionMRR > 0 && (
            <div className="mt-2 text-xs text-brand-400/70">📈 Monthly recurring: ${t.subscriptionMRR.toLocaleString()}/mo</div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Agents', value: t.totalAgents, icon: '🤖' },
            { label: 'Total Executions', value: t.totalExecutions, icon: '🚀' },
            { label: 'Success Rate', value: t.completedExecutions > 0 ? `${Math.round((t.completedExecutions / t.totalExecutions) * 100)}%` : '—', icon: '✅' },
            { label: 'Unique Users', value: t.uniqueUsers, icon: '👥' },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-lg font-semibold text-white/90">{s.value}</div>
              <div className="text-[10px] text-white/35">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Agent breakdown with visual bars */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-medium text-white/70 mb-4">📊 Agent Performance</h3>
          <div className="space-y-3">
            {earnings.agents?.map((a: any) => {
              const maxExec = Math.max(...(earnings.agents?.map((x: any) => x.totalExecutions || 0) || [1]));
              const execPct = maxExec > 0 ? ((a.totalExecutions || 0) / maxExec) * 100 : 0;
              const successRate = a.totalExecutions > 0 ? Math.round(((a.completedExecutions || a.totalExecutions) / a.totalExecutions) * 100) : 0;
              const maxRev = Math.max(...(earnings.agents?.map((x: any) => (x.developerPayout || 0)) || [1]));
              const revPct = maxRev > 0 ? ((a.developerPayout || 0) / maxRev) * 100 : 0;
              return (
                <div key={a.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm">{CATEGORIES.find(c => c.id === a.category)?.icon || '🤖'}</span>
                      <div className="min-w-0">
                        <div className="text-sm text-white/80 truncate">{a.name}</div>
                        <div className="text-[10px] text-white/35">{a._count?.subscriptions || 0} subscribers</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className={cn('text-sm font-medium', a.pricingModel === 'free' ? 'text-white/40' : 'text-emerald-400')}>
                        {a.pricingModel === 'free' ? 'Free' : `$${(a.developerPayout || 0).toLocaleString()}`}
                      </div>
                      <div className={cn('text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block', a.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40')}>
                        {a.status}
                      </div>
                    </div>
                  </div>
                  {/* Execution bar */}
                  <div className="mb-1.5">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-white/35">Executions: {a.totalExecutions || 0}</span>
                      <span className={cn('font-medium', successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-red-400')}>
                        {successRate}% success
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500/60 rounded-full transition-all duration-500" style={{ width: `${Math.max(execPct, 2)}%` }} />
                    </div>
                  </div>
                  {/* Revenue bar (only for paid) */}
                  {a.pricingModel !== 'free' && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-white/35">Revenue share</span>
                        {a.grossRevenue > 0 && <span className="text-white/25">gross ${(a.grossRevenue || 0).toLocaleString()}</span>}
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${Math.max(revPct, 2)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution success breakdown chart */}
        {t.totalExecutions > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">⚙️ Execution Breakdown</h3>
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const completed = t.completedExecutions || 0;
                const failed = t.failedExecutions || 0;
                const pending = t.totalExecutions - completed - failed;
                const total = t.totalExecutions;
                return [
                  { label: 'Completed', count: completed, color: 'bg-emerald-500' },
                  { label: 'Failed', count: failed, color: 'bg-red-500' },
                  { label: 'Pending', count: pending > 0 ? pending : 0, color: 'bg-amber-500' },
                ].filter(s => s.count > 0).map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] text-white/50 font-medium">{s.count}</div>
                    <div
                      className={cn('w-full rounded-t-md', s.color, 'opacity-60')}
                      style={{ height: `${Math.max((s.count / total) * 80, 4)}px` }}
                    />
                    <div className="text-[9px] text-white/30">{s.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {earnings.recentExecutions && earnings.recentExecutions.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">⚡ Recent Activity</h3>
            <div className="space-y-1.5">
              {earnings.recentExecutions.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    e.status === 'completed' ? 'bg-emerald-400' : e.status === 'failed' ? 'bg-red-400' : 'bg-white/20'
                  )} />
                  <span className="text-white/50 truncate flex-1">{e.taskInput.slice(0, 50)}{e.taskInput.length > 50 ? '...' : ''}</span>
                  {e.developerPayout > 0 && (
                    <span className="text-emerald-400/80 flex-shrink-0 font-medium">+${e.developerPayout}</span>
                  )}
                  <span className="text-white/25 flex-shrink-0">{e.user?.name || 'User'}</span>
                  {e.rating && <span className="text-amber-400/60 flex-shrink-0">{'★'.repeat(e.rating)}</span>}
                  <span className="text-white/20 flex-shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEarnings = () => {
    return (
      <div className="space-y-4">
        {/* Earnings sub-tabs */}
        <div className="flex gap-2 border-b border-white/[0.06] pb-px">
          <button
            onClick={() => setEarningsTab('job')}
            className={cn(
              'px-3 py-2 text-sm rounded-t-lg transition-all',
              earningsTab === 'job'
                ? 'bg-white/10 text-white border-b-2 border-emerald-500'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            💼 Job Earnings
          </button>
          <button
            onClick={() => setEarningsTab('agent')}
            className={cn(
              'px-3 py-2 text-sm rounded-t-lg transition-all',
              earningsTab === 'agent'
                ? 'bg-white/10 text-white border-b-2 border-brand-500'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            🤖 Agent Earnings
          </button>
        </div>

        {earningsTab === 'job' && renderJobEarnings()}
        {earningsTab === 'agent' && renderAgentEarnings()}
      </div>
    );
  };

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
              Browse
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
              + List Agent
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
              💰 Earnings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {view === 'browse' && renderBrowse()}
        {view === 'detail' && renderDetail()}
        {view === 'register' && renderRegister()}
        {view === 'earnings' && renderEarnings()}
      </div>
    </div>
  );
}