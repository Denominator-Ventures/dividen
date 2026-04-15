'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────── */
interface PersonItem {
  id: string; name: string; email: string;
  headline?: string; capacity?: string;
  currentTitle?: string; currentCompany?: string;
  industry?: string; skills?: string[]; taskTypes?: string[];
  bio?: string; connectionStatus: string | null; joinedAt: string;
}

interface TeamItem {
  id: string; name: string; description?: string; avatar?: string;
  type: string; visibility: string; headline?: string;
  industry?: string; location?: string; agentEnabled: boolean;
  memberCount: number; projectCount: number; followerCount: number;
  tier: string | null; isFollowing: boolean; memberRole: string | null;
}

interface AgentItem {
  id: string; name: string; slug: string; description: string;
  category: string; pricingModel: string; pricePerTask?: number;
  subscriptionPrice?: number; tags: string[]; avgRating: number;
  totalRatings: number; totalExecutions: number; avgResponseTime?: number;
  successRate?: number; featured: boolean; developerName: string; developerId?: string;
  supportsA2A: boolean; supportsMCP: boolean;
  isInstalled: boolean; isSubscribed: boolean;
}

interface JobItem {
  id: string; title: string; description: string;
  taskType: string; urgency: string; compensation?: string;
  compensationType?: string; compensationAmount?: number;
  isPaid: boolean; estimatedHours?: number; deadline?: string;
  requiredSkills: string[]; applicationCount: number;
  posterName: string; posterId: string;
  applicationStatus: string | null; createdAt: string;
}

interface Facets {
  skills: { name: string; count: number }[];
  agentCategories: { name: string; count: number }[];
  teamTypes: string[];
  capacities: string[];
}

interface DiscoverData {
  people?: { items: PersonItem[]; total: number; hasMore: boolean };
  teams?: { items: TeamItem[]; total: number; hasMore: boolean };
  agents?: { items: AgentItem[]; total: number; hasMore: boolean };
  jobs?: { items: JobItem[]; total: number; hasMore: boolean };
  facets?: Facets;
}

type Section = 'all' | 'people' | 'teams' | 'agents' | 'jobs';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'all', label: 'Overview', icon: '\u{1F30D}' },
  { id: 'people', label: 'People', icon: '\u{1F9D1}' },
  { id: 'teams', label: 'Teams', icon: '\u{1F3E2}' },
  { id: 'agents', label: 'Agents', icon: '\u{1F916}' },
  { id: 'jobs', label: 'Jobs', icon: '\u{1F4BC}' },
];

const CAPACITY_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-400',
  limited: 'bg-amber-500/15 text-amber-400',
  busy: 'bg-red-500/15 text-red-400',
  unavailable: 'bg-gray-500/15 text-gray-400',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/15 text-gray-400',
  medium: 'bg-blue-500/15 text-blue-400',
  high: 'bg-amber-500/15 text-amber-400',
  critical: 'bg-red-500/15 text-red-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── Component ────────────────────────────────────────────────── */

export default function DiscoverView() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('all');
  const [data, setData] = useState<DiscoverData>({});
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ section });
      if (skillFilter) params.set('skill', skillFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('limit', section === 'all' ? '6' : '12');
      const res = await fetch(`/api/discover?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [section, skillFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Action Handlers ── */
  const handleFollow = async (teamId: string) => {
    try {
      await fetch(`/api/teams/${teamId}/follow`, { method: 'POST' });
      fetchData();
    } catch { /* silent */ }
  };

  /* ── Render Helpers ── */
  const renderSectionHeader = (title: string, icon: string, count: number, sectionId: Section) => (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <span>{icon}</span> {title}
        <span className="text-[10px] font-normal text-[var(--text-muted)]">{count}</span>
      </h3>
      {section === 'all' && count > 0 && (
        <button
          onClick={() => setSection(sectionId)}
          className="text-[11px] text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] transition-colors"
        >
          View all \u2192
        </button>
      )}
    </div>
  );

  const renderPersonCard = (p: PersonItem) => (
    <div
      key={p.id}
      className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer group"
      onClick={() => router.push(`/profile/${p.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
            {p.name}
          </h4>
          {p.headline && (
            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{p.headline}</p>
          )}
          {!p.headline && p.currentTitle && (
            <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
              {p.currentTitle}{p.currentCompany ? ` at ${p.currentCompany}` : ''}
            </p>
          )}
        </div>
        {p.capacity && (
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-2', CAPACITY_COLORS[p.capacity] || 'bg-gray-500/15 text-gray-400')}>
            {p.capacity}
          </span>
        )}
      </div>

      {p.skills && p.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {p.skills.slice(0, 4).map((s, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">{s}</span>
          ))}
          {p.skills.length > 4 && <span className="text-[9px] text-[var(--text-muted)]">+{p.skills.length - 4}</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        {p.connectionStatus === 'active' ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Connected</span>
        ) : p.connectionStatus === 'pending' ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Pending</span>
        ) : (
          <span className="text-[9px] text-[var(--text-muted)]">Not connected</span>
        )}
        <span className="text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">View Profile \u2192</span>
      </div>
    </div>
  );

  const renderTeamCard = (t: TeamItem) => (
    <div
      key={t.id}
      className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer group"
      onClick={() => router.push(`/team/${t.id}`)}
    >
      <div className="flex items-start gap-3 mb-2">
        {t.avatar && <span className="text-2xl flex-shrink-0">{t.avatar}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {t.name}
            </h4>
            {t.tier && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium uppercase">{t.tier}</span>
            )}
            {t.agentEnabled && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/15 text-purple-400">Agent</span>
            )}
          </div>
          {t.headline && <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{t.headline}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mb-3">
        <span>{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}</span>
        <span>{t.projectCount} project{t.projectCount !== 1 ? 's' : ''}</span>
        {t.industry && <span className="truncate">{t.industry}</span>}
      </div>

      <div className="flex items-center justify-between">
        {t.memberRole ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] capitalize">{t.memberRole}</span>
        ) : t.isFollowing ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Following</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); handleFollow(t.id); }}
            className="text-[10px] px-2 py-1 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors"
          >
            Follow
          </button>
        )}
        <span className="text-[9px] text-[var(--text-muted)]">{t.followerCount} follower{t.followerCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );

  const renderAgentCard = (a: AgentItem) => (
    <div
      key={a.id}
      className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {a.name}
            </h4>
            {a.featured && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">Featured</span>}
            {a.isInstalled && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Installed</span>}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{a.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 capitalize">{a.category}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-muted)] capitalize">{a.pricingModel}</span>
        {a.supportsA2A && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400">A2A</span>}
        {a.supportsMCP && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400">MCP</span>}
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          {a.avgRating > 0 && <span className="text-amber-400">\u2605 {a.avgRating.toFixed(1)}</span>}
          <span>{a.totalExecutions.toLocaleString()} runs</span>
        </div>
        <span className="text-[var(--text-muted)]">{a.developerId
          ? <a href={`/profile/${a.developerId}`} target="_blank" rel="noopener" className="text-brand-400 hover:underline" onClick={e => e.stopPropagation()}>{a.developerName}</a>
          : a.developerName}</span>
      </div>
    </div>
  );

  const renderJobCard = (j: JobItem) => {
    const comp = j.compensationType && j.compensationAmount
      ? `$${j.compensationAmount}/${j.compensationType}`
      : j.compensation || (j.isPaid ? 'Paid' : 'Volunteer');

    return (
      <div key={j.id} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 hover:border-[var(--brand-primary)]/30 transition-all">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{j.title}</h4>
            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{j.description}</p>
          </div>
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-2', URGENCY_COLORS[j.urgency] || 'bg-gray-500/15 text-gray-400')}>
            {j.urgency}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 capitalize">{j.taskType}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{comp}</span>
          {j.estimatedHours && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-muted)]">{j.estimatedHours}h est.</span>
          )}
        </div>

        {j.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {j.requiredSkills.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">{s}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span>by {j.posterName}</span>
            <span>{j.applicationCount} applicant{j.applicationCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            {j.applicationStatus ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] capitalize">{j.applicationStatus}</span>
            ) : null}
            <span>{timeAgo(j.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  /* ── Main Render ── */
  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Hero */}
      <div className="text-center py-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Discover the Network
        </h2>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
          Find people to connect with, teams to follow, agents to install, and jobs to take on.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSection(s.id); setSkillFilter(''); setCategoryFilter(''); }}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all',
              section === s.id
                ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            )}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Skill Filter Chips (when viewing people or all) */}
      {(section === 'all' || section === 'people') && data.facets?.skills && data.facets.skills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--text-muted)] mr-1">Skills:</span>
          {data.facets.skills.slice(0, 12).map((s) => (
            <button
              key={s.name}
              onClick={() => setSkillFilter(skillFilter === s.name ? '' : s.name)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                skillFilter === s.name
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Category Filter (when viewing agents) */}
      {(section === 'agents') && data.facets?.agentCategories && data.facets.agentCategories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--text-muted)] mr-1">Category:</span>
          <button
            onClick={() => setCategoryFilter('')}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border transition-all',
              !categoryFilter
                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
            )}
          >
            All
          </button>
          {data.facets.agentCategories.map((c) => (
            <button
              key={c.name}
              onClick={() => setCategoryFilter(categoryFilter === c.name ? '' : c.name)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all capitalize',
                categoryFilter === c.name
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
              )}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="space-y-6">
          {/* People */}
          {data.people && data.people.items.length > 0 && (
            <div>
              {renderSectionHeader('People to Connect With', '\u{1F9D1}', data.people.total, 'people')}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.people.items.map(renderPersonCard)}
              </div>
            </div>
          )}

          {/* Teams */}
          {data.teams && data.teams.items.length > 0 && (
            <div>
              {renderSectionHeader('Teams to Follow', '\u{1F3E2}', data.teams.total, 'teams')}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.teams.items.map(renderTeamCard)}
              </div>
            </div>
          )}

          {/* Agents */}
          {data.agents && data.agents.items.length > 0 && (
            <div>
              {renderSectionHeader('Agents to Try', '\u{1F916}', data.agents.total, 'agents')}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.agents.items.map(renderAgentCard)}
              </div>
            </div>
          )}

          {/* Jobs */}
          {data.jobs && data.jobs.items.length > 0 && (
            <div>
              {renderSectionHeader('Open Opportunities', '\u{1F4BC}', data.jobs.total, 'jobs')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.jobs.items.map(renderJobCard)}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!data.people?.items.length && !data.teams?.items.length && !data.agents?.items.length && !data.jobs?.items.length && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">{'\u{1F30D}'}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {section === 'all' ? 'The network is quiet right now. Be the first to create a team or list an agent!' :
                  `No ${section} found${skillFilter ? ` for "${skillFilter}"` : ''}${categoryFilter ? ` in ${categoryFilter}` : ''}.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
