'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, EmptyState, useAdminFetch } from './shared';

interface PromptGroup {
  index: number;
  label: string;
  tokenEstimate: number;
  preview: string;
  content: string;
}

interface SystemPromptData {
  groups: PromptGroup[];
  totalTokens: number;
  generatedFor: string;
  generatedAt: string;
}

export default function SystemPromptTab({ token }: { token: string }) {
  const adminFetch = useAdminFetch(token);
  const [data, setData] = useState<SystemPromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetch('/api/admin/system-prompt');
      setData(result);
    } catch (err) {
      console.error('Failed to fetch system prompt:', err);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchPrompt(); }, [fetchPrompt]);

  if (loading) return <div className="text-center text-[var(--text-secondary)] py-8">Loading system prompt…</div>;
  if (!data) return <EmptyState icon="📝" title="No Data" description="Could not load system prompt. Make sure at least one user exists." />;

  const filteredGroups = searchQuery
    ? data.groups.filter((g) =>
        g.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.groups;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Prompt Groups" value={data.groups.length} icon="📝" />
        <MetricCard label="Est. Total Tokens" value={`~${data.totalTokens.toLocaleString()}`} icon="🎯" accent />
        <MetricCard label="Generated For" value={data.generatedFor} icon="👤" />
        <MetricCard label="Status" value="Read-Only" icon="🔒" subtitle="DB overrides coming soon" />
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prompt content…"
          className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-brand-500/40"
        />
        <button
          onClick={() => setExpanded(expanded === -1 ? null : -1)}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] transition-colors"
        >
          {expanded === -1 ? 'Collapse All' : 'Expand All'}
        </button>
        <button onClick={fetchPrompt} className="px-2.5 py-2 rounded text-[11px] text-[var(--text-secondary)] hover:bg-white/[0.04]">↻</button>
      </div>

      {/* Prompt groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => {
          const isOpen = expanded === -1 || expanded === group.index;
          return (
            <div key={group.index} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen && expanded !== -1 ? null : group.index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-brand-400 w-6">#{group.index}</span>
                  <span className="text-sm font-medium text-white">{group.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">~{group.tokenEstimate} tokens</span>
                  <span className="text-[var(--text-secondary)] text-xs">{isOpen ? '▼' : '▶'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-white/[0.06] p-4">
                  <pre className="text-[11px] text-[var(--text-secondary)] font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                    {group.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && searchQuery && (
        <EmptyState icon="🔍" title="No matches" description={`No prompt groups match "${searchQuery}"`} />
      )}
    </div>
  );
}
