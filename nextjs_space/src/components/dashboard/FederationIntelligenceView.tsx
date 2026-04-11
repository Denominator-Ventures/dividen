'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SerendipityMatch {
  connectionId: string;
  connectionName: string;
  score: number;
  reason: string;
  matchType: string;
  sharedConnections?: number;
}

interface RoutingDigest {
  totalConnections: number;
  activeConnections: number;
  routingCapabilities: string[];
  topSkills: { skill: string; count: number }[];
  avgCapacity: number;
}

interface PatternSummary {
  totalPatterns: number;
  topCategories: { category: string; count: number }[];
  avgConfidence: number;
  recentSynthesis?: string;
}

type FedTab = 'overview' | 'serendipity' | 'routing' | 'patterns';

export default function FederationIntelligenceView() {
  const [tab, setTab] = useState<FedTab>('overview');
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<SerendipityMatch[]>([]);
  const [routingDigest, setRoutingDigest] = useState<RoutingDigest | null>(null);
  const [patternSummary, setPatternSummary] = useState<PatternSummary | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch in parallel
      const [graphRes, routingRes, connectionsRes, patternsRes] = await Promise.allSettled([
        fetch('/api/federation/graph'),
        fetch('/api/federation/routing'),
        fetch('/api/connections'),
        fetch('/api/ambient-learning/synthesize'),
      ]);

      if (graphRes.status === 'fulfilled' && graphRes.value.ok) {
        const data = await graphRes.value.json();
        setMatches(data.matches || []);
      }

      if (routingRes.status === 'fulfilled' && routingRes.value.ok) {
        const data = await routingRes.value.json();
        setRoutingDigest(data.digest || null);
      }

      if (connectionsRes.status === 'fulfilled' && connectionsRes.value.ok) {
        const data = await connectionsRes.value.json();
        setConnections(Array.isArray(data) ? data : []);
      }

      if (patternsRes.status === 'fulfilled' && patternsRes.value.ok) {
        const data = await patternsRes.value.json();
        setPatternSummary({
          totalPatterns: data.stats?.totalPatterns || data.patterns?.length || 0,
          topCategories: data.stats?.topCategories || [],
          avgConfidence: data.stats?.avgConfidence || 0,
          recentSynthesis: data.stats?.lastSynthesized || null,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { id: FedTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Network Health', icon: '🌐' },
    { id: 'serendipity', label: 'Serendipity', icon: '✨' },
    { id: 'routing', label: 'Task Routing', icon: '🔀' },
    { id: 'patterns', label: 'Learning', icon: '🧠' },
  ];

  const activeConnections = connections.filter((c: any) => c.status === 'active');
  const federatedConnections = connections.filter((c: any) => c.isFederated);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white/90">🌐 Federation Intelligence</h1>
            <p className="text-[10px] text-white/35 mt-0.5">Network health, serendipity matches, routing intelligence, and learning patterns</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-all disabled:opacity-30"
          >
            {loading ? '⏳ Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === t.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Network stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Connections', value: connections.length, icon: '🔗' },
                { label: 'Active', value: activeConnections.length, icon: '✅' },
                { label: 'Federated', value: federatedConnections.length, icon: '🌍' },
                { label: 'Serendipity Matches', value: matches.length, icon: '✨' },
              ].map((s, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                  <div className="text-lg mb-1">{s.icon}</div>
                  <div className="text-lg font-semibold text-white/90">{s.value}</div>
                  <div className="text-[10px] text-white/35">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Network health bars */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/70 mb-3">📊 Network Health</h3>
              <div className="space-y-3">
                {[
                  { label: 'Connection Coverage', value: activeConnections.length, max: Math.max(connections.length, 1), color: 'bg-emerald-500' },
                  { label: 'Federation Ratio', value: federatedConnections.length, max: Math.max(connections.length, 1), color: 'bg-blue-500' },
                  { label: 'Pattern Confidence', value: Math.round((patternSummary?.avgConfidence || 0) * 100), max: 100, color: 'bg-purple-500', suffix: '%' },
                  { label: 'Routing Ready', value: routingDigest?.activeConnections || 0, max: Math.max(routingDigest?.totalConnections || 1, 1), color: 'bg-brand-500' },
                ].map((bar, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-white/40">{bar.label}</span>
                      <span className="text-white/60 font-medium">{bar.value}{bar.suffix || ''} / {bar.max}{bar.suffix || ''}</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 opacity-70', bar.color)}
                        style={{ width: `${Math.max((bar.value / bar.max) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick insights */}
            <div className="bg-gradient-to-br from-brand-500/5 via-purple-500/5 to-emerald-500/5 border border-brand-500/10 rounded-xl p-4">
              <h3 className="text-sm font-medium text-brand-400 mb-2">💡 Insights</h3>
              <ul className="text-xs text-white/50 space-y-1.5">
                {matches.length > 0 && (
                  <li>• {matches.length} potential serendipity match{matches.length !== 1 ? 'es' : ''} — connections you should introduce to each other</li>
                )}
                {patternSummary && patternSummary.totalPatterns > 0 && (
                  <li>• {patternSummary.totalPatterns} ambient learning pattern{patternSummary.totalPatterns !== 1 ? 's' : ''} synthesized — Divi is getting smarter with every interaction</li>
                )}
                {routingDigest && routingDigest.topSkills?.length > 0 && (
                  <li>• Top network skills: {routingDigest.topSkills.slice(0, 3).map(s => s.skill).join(', ')}</li>
                )}
                {federatedConnections.length === 0 && (
                  <li>• No federated connections yet — federation multiplies intelligence across instances</li>
                )}
                {connections.length === 0 && (
                  <li>• No connections yet — invite collaborators to build your network graph</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {tab === 'serendipity' && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/70 mb-1">✨ Serendipity Matches</h3>
              <p className="text-[10px] text-white/30 mb-4">People in your network who should know each other — based on complementary skills, shared context, and graph topology.</p>
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🔮</div>
                  <p className="text-xs text-white/40">No serendipity matches yet. Build more connections to unlock graph intelligence.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-400">
                            {(m.connectionName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm text-white/80">{m.connectionName || 'Unknown'}</div>
                            <div className="text-[10px] text-white/30">{m.matchType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            'text-xs font-mono font-medium',
                            m.score >= 0.8 ? 'text-emerald-400' : m.score >= 0.6 ? 'text-brand-400' : 'text-white/40'
                          )}>
                            {Math.round(m.score * 100)}% match
                          </div>
                          {m.sharedConnections != null && m.sharedConnections > 0 && (
                            <div className="text-[9px] text-white/25">{m.sharedConnections} shared</div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">{m.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'routing' && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/70 mb-1">🔀 Task Routing Intelligence</h3>
              <p className="text-[10px] text-white/30 mb-4">7-signal weighted scoring for matching tasks to the right people in your network.</p>

              {!routingDigest ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🛰️</div>
                  <p className="text-xs text-white/40">No routing data yet. Routes are scored as tasks are delegated.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scoring weights visualization */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Scoring Weights</h4>
                      {[
                        { label: 'Skill Match', weight: 30, color: 'bg-brand-500' },
                        { label: 'Completion Rate', weight: 20, color: 'bg-emerald-500' },
                        { label: 'Capacity', weight: 15, color: 'bg-blue-500' },
                        { label: 'Trust', weight: 10, color: 'bg-purple-500' },
                        { label: 'Reputation', weight: 10, color: 'bg-amber-500' },
                        { label: 'Domain Proximity', weight: 10, color: 'bg-cyan-500' },
                        { label: 'Latency', weight: 5, color: 'bg-white' },
                      ].map((w, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <div className="w-16 text-[9px] text-white/35 text-right">{w.label}</div>
                          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full">
                            <div className={cn('h-full rounded-full opacity-60', w.color)} style={{ width: `${w.weight}%` }} />
                          </div>
                          <div className="w-6 text-[9px] text-white/30 text-right">{w.weight}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Network Skills</h4>
                      {routingDigest.topSkills?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {routingDigest.topSkills.slice(0, 12).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/40">
                              {s.skill} <span className="text-white/20">×{s.count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/30">No skills indexed yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                      <div className="text-sm font-semibold text-white/80">{routingDigest.totalConnections}</div>
                      <div className="text-[9px] text-white/30">Total Connections</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                      <div className="text-sm font-semibold text-white/80">{routingDigest.activeConnections}</div>
                      <div className="text-[9px] text-white/30">Route-Ready</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                      <div className="text-sm font-semibold text-white/80">{routingDigest.routingCapabilities?.length || 0}</div>
                      <div className="text-[9px] text-white/30">Capabilities</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'patterns' && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/70 mb-1">🧠 Ambient Learning Patterns</h3>
              <p className="text-[10px] text-white/30 mb-4">Synthesized from relay interactions. Every ambient relay teaches the protocol — timing, phrasing, topic success.</p>

              {!patternSummary || patternSummary.totalPatterns === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🌱</div>
                  <p className="text-xs text-white/40">No patterns synthesized yet. Send and receive ambient relays to build the learning loop.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                      <div className="text-lg font-semibold text-purple-400">{patternSummary.totalPatterns}</div>
                      <div className="text-[10px] text-white/35">Active Patterns</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                      <div className="text-lg font-semibold text-brand-400">{Math.round(patternSummary.avgConfidence * 100)}%</div>
                      <div className="text-[10px] text-white/35">Avg Confidence</div>
                    </div>
                    {patternSummary.recentSynthesis && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                        <div className="text-xs font-medium text-white/60">{new Date(patternSummary.recentSynthesis).toLocaleDateString()}</div>
                        <div className="text-[10px] text-white/35">Last Synthesis</div>
                      </div>
                    )}
                  </div>

                  {patternSummary.topCategories?.length > 0 && (
                    <div className="bg-white/[0.02] rounded-lg p-3">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Pattern Categories</h4>
                      <div className="space-y-1.5">
                        {patternSummary.topCategories.map((cat, i) => {
                          const maxCount = Math.max(...patternSummary.topCategories.map(c => c.count));
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-20 text-[10px] text-white/40 text-right truncate">{cat.category}</div>
                              <div className="flex-1 h-2 bg-white/[0.04] rounded-full">
                                <div
                                  className="h-full bg-purple-500/60 rounded-full transition-all"
                                  style={{ width: `${Math.max((cat.count / maxCount) * 100, 4)}%` }}
                                />
                              </div>
                              <div className="w-5 text-[9px] text-white/25">{cat.count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                    <p className="text-[10px] text-white/40">
                      💡 Patterns are synthesized from ambient relay signals — timing, disruption, topic relevance, and phrasing effectiveness.
                      The more ambient relays exchanged, the better Divi learns when and how to ask questions naturally.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
