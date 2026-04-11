'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileViewProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  };
  profile: {
    headline: string | null;
    bio: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    industry: string | null;
    skills: string[];
    taskTypes: string[];
    experience: any[];
    education: any[];
    languages: any[];
    countriesLived: any[];
    lifeExperiences: any[];
    volunteering: any[];
    hobbies: string[];
    personalValues: string[];
    superpowers: string[];
    capacity: string | null;
    capacityNote: string | null;
    timezone: string | null;
    workingHours: string | null;
    linkedinUrl: string | null;
    visibility: string | null;
  } | null;
  stats: {
    connections: number;
    agents: number;
    reputation: {
      score: number;
      level: string;
      jobsCompleted: number;
      jobsPosted: number;
      avgRating: number;
      totalRatings: number;
      onTimeRate: number;
      responseRate: number;
    } | null;
  };
  agents: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    pricingModel: string;
    price: number | null;
    avgRating: number;
    totalRatings: number;
    totalExecutions: number;
    avgResponseTime: number | null;
    successRate: number | null;
    version: string | null;
    tags: string[];
  }[];
  teams: {
    id: string;
    name: string;
    type: string;
    avatar: string | null;
    headline: string | null;
    memberCount: number;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    type: string;
    createdAt: string;
    reviewerName: string;
    reviewerId: string | null;
  }[];
}

interface RelationshipData {
  connectionId: string;
  connectionContext: {
    notes: string | null;
    tags: string[];
    context: string | null;
    relationshipType: string | null;
    firstMetAt: string | null;
    strength: string | null;
    nickname: string | null;
    connectedSince: string;
  };
  sharedTeams: { id: string; name: string; type: string; avatar: string | null; _count: { members: number } }[];
  sharedProjects: { id: string; name: string; status: string; color: string | null; _count: { members: number; kanbanCards: number } }[];
  relays: { total: number; recent: any[] };
  contracts: any[];
  agentUsage: {
    youUsedTheirs: number;
    theyUsedYours: number;
    yourAgents: { id: string; name: string }[];
    theirAgents: { id: string; name: string }[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPACITY_COLORS: Record<string, string> = {
  available: 'text-green-400',
  limited: 'text-yellow-400',
  busy: 'text-orange-400',
  unavailable: 'text-red-400',
};

const CAPACITY_DOT: Record<string, string> = {
  available: 'bg-green-400',
  limited: 'bg-yellow-400',
  busy: 'bg-orange-400',
  unavailable: 'bg-red-400',
};

const LEVEL_COLORS: Record<string, string> = {
  new: 'text-[var(--text-muted)]',
  rising: 'text-blue-400',
  established: 'text-green-400',
  trusted: 'text-purple-400',
  exemplary: 'text-yellow-400',
};

const TEAM_TYPE_ICON: Record<string, string> = {
  work: '🏢',
  community: '🌍',
  hybrid: '🔀',
};

type TabId = 'identity' | 'agents' | 'us' | 'network';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function stars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileView({ user, profile, stats, agents, teams, reviews }: ProfileViewProps) {
  const { data: session } = useSession() || {};
  const currentUserId = (session?.user as any)?.id;
  const isOwnProfile = currentUserId === user.id;
  const isConnected = !isOwnProfile && !!currentUserId; // Will be refined by relationship fetch

  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [relationship, setRelationship] = useState<RelationshipData | null>(null);
  const [relLoading, setRelLoading] = useState(false);
  const [hasConnection, setHasConnection] = useState(false);

  // Fetch relationship data ("Us" section) when tab is selected or on mount
  const fetchRelationship = useCallback(async () => {
    if (isOwnProfile || !currentUserId) return;
    setRelLoading(true);
    try {
      const res = await fetch(`/api/profile/${user.id}/relationship`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRelationship(data);
          setHasConnection(true);
        }
      }
    } catch { /* silent */ }
    setRelLoading(false);
  }, [user.id, currentUserId, isOwnProfile]);

  useEffect(() => {
    fetchRelationship();
  }, [fetchRelationship]);

  const tabs: { id: TabId; label: string; icon: string; show: boolean }[] = [
    { id: 'identity', label: 'Profile', icon: '👤', show: true },
    { id: 'agents', label: 'Agents & Services', icon: '🤖', show: agents.length > 0 || (stats.reputation?.jobsCompleted ?? 0) > 0 },
    { id: 'us', label: 'Us', icon: '🤝', show: hasConnection && !isOwnProfile },
    { id: 'network', label: 'Network', icon: '🌐', show: true },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] px-4 py-3 sticky top-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg text-brand-400">⬡</span>
            <span className="font-bold text-brand-400 tracking-tight">DiviDen</span>
          </Link>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <Link href="/settings" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Edit Profile
              </Link>
            )}
            <Link href="/dashboard" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* ─── Hero Card ─────────────────────────────────────────── */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 md:p-8 mb-4 shadow-lg shadow-black/20">
          <div className="flex items-start gap-5">
            <div className="w-18 h-18 rounded-full bg-brand-400/20 flex items-center justify-center text-3xl text-brand-400 flex-shrink-0" style={{ width: 72, height: 72 }}>
              {user.name ? user.name[0].toUpperCase() : '⬡'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{user.name || 'Anonymous Agent'}</h1>
                {profile?.capacity && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${CAPACITY_COLORS[profile.capacity]} bg-[var(--bg-primary)]`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${CAPACITY_DOT[profile.capacity] || 'bg-gray-400'}`} />
                    {profile.capacity}
                  </span>
                )}
                {stats.reputation && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${LEVEL_COLORS[stats.reputation.level] || ''}`}>
                    {stats.reputation.level}
                  </span>
                )}
              </div>
              {profile?.headline && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">{profile.headline}</p>
              )}
              {(profile?.currentTitle || profile?.currentCompany) && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' at ')}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-muted)]">
                <span>Joined {timeAgo(user.createdAt)}</span>
                {profile?.timezone && <span>· {profile.timezone}</span>}
                {profile?.industry && <span>· {profile.industry}</span>}
                {profile?.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                    LinkedIn ↗
                  </a>
                )}
              </div>
              {profile?.capacityNote && (
                <p className="text-xs text-[var(--text-muted)] mt-1 italic">&quot;{profile.capacityNote}&quot;</p>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-5 border-t border-[var(--border-color)]">
            <Stat value={stats.connections} label="Connections" />
            <Stat value={stats.agents} label="Agents" />
            <Stat
              value={stats.reputation ? stats.reputation.score.toFixed(0) : '—'}
              label={stats.reputation ? `Rep · ${stars(stats.reputation.avgRating)}` : 'Reputation'}
            />
            <Stat value={teams.length} label="Teams" />
          </div>
        </div>

        {/* ─── Action Bar (for other users) ──────────────────────── */}
        {!isOwnProfile && currentUserId && (
          <div className="flex items-center gap-2 mb-4">
            {!hasConnection && (
              <Link
                href={`/dashboard?tab=connections&connect=${user.id}`}
                className="px-4 py-2 text-xs font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 transition-colors"
              >
                + Connect
              </Link>
            )}
            {hasConnection && (
              <>
                <Link
                  href={`/dashboard?tab=connections`}
                  className="px-4 py-2 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-brand-400/30 transition-colors"
                >
                  ✉ Message
                </Link>
                <Link
                  href={`/dashboard?tab=marketplace`}
                  className="px-4 py-2 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-brand-400/30 transition-colors"
                >
                  🤖 View Agents
                </Link>
              </>
            )}
          </div>
        )}

        {/* ─── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex gap-1 mb-4 border-b border-[var(--border-color)] overflow-x-auto">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── Tab Content ────────────────────────────────────────── */}
        {activeTab === 'identity' && <IdentitySection profile={profile} reviews={reviews} />}
        {activeTab === 'agents' && <AgentsSection agents={agents} reputation={stats.reputation} />}
        {activeTab === 'us' && <UsSection relationship={relationship} loading={relLoading} targetName={user.name} />}
        {activeTab === 'network' && <NetworkSection stats={stats} teams={teams} />}

        {/* Empty state */}
        {!profile && activeTab === 'identity' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-sm text-[var(--text-muted)]">
              This profile is private. Connect with {user.name || 'this user'} to see more.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-brand-400">{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─── Section 1: Identity ──────────────────────────────────────────────────────

function IdentitySection({ profile, reviews }: { profile: ProfileViewProps['profile']; reviews: ProfileViewProps['reviews'] }) {
  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Bio */}
      {profile.bio && (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{profile.bio}</p>
        </Card>
      )}

      {/* Skills & Task Types */}
      {(profile.skills.length > 0 || profile.taskTypes.length > 0) && (
        <Card>
          {profile.skills.length > 0 && (
            <div className="mb-4">
              <SectionLabel>Skills</SectionLabel>
              <TagList items={profile.skills} color="brand" />
            </div>
          )}
          {profile.taskTypes.length > 0 && (
            <div>
              <SectionLabel>Accepts Task Types</SectionLabel>
              <TagList items={profile.taskTypes} color="neutral" />
            </div>
          )}
        </Card>
      )}

      {/* Superpowers & Values */}
      {(profile.superpowers.length > 0 || profile.personalValues.length > 0) && (
        <Card>
          {profile.superpowers.length > 0 && (
            <div className="mb-4">
              <SectionLabel>⚡ Superpowers</SectionLabel>
              <TagList items={profile.superpowers} color="brand" />
            </div>
          )}
          {profile.personalValues.length > 0 && (
            <div>
              <SectionLabel>💎 Values</SectionLabel>
              <TagList items={profile.personalValues} color="neutral" />
            </div>
          )}
        </Card>
      )}

      {/* Experience & Education */}
      {(profile.experience.length > 0 || profile.education.length > 0) && (
        <Card>
          {profile.experience.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Experience</SectionLabel>
              <div className="space-y-3">
                {profile.experience.map((exp: any, i: number) => (
                  <div key={i} className="pl-3 border-l-2 border-brand-400/20">
                    <div className="text-sm font-medium">{exp.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {exp.company}{exp.startYear ? ` · ${exp.startYear}${exp.endYear ? `–${exp.endYear}` : '–present'}` : ''}
                    </div>
                    {exp.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {profile.education.length > 0 && (
            <div>
              <SectionLabel>Education</SectionLabel>
              <div className="space-y-2">
                {profile.education.map((edu: any, i: number) => (
                  <div key={i} className="pl-3 border-l-2 border-[var(--border-color)]">
                    <div className="text-sm font-medium">{edu.school}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {[edu.degree, edu.field].filter(Boolean).join(' in ')}{edu.year ? ` · ${edu.year}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Languages & Countries */}
      {(profile.languages.length > 0 || profile.countriesLived.length > 0) && (
        <Card>
          {profile.languages.length > 0 && (
            <div className="mb-4">
              <SectionLabel>🗣 Languages</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang: any, i: number) => (
                  <span key={i} className="px-2 py-1 text-xs bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {lang.language} <span className="text-[var(--text-muted)]">· {lang.proficiency}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.countriesLived.length > 0 && (
            <div>
              <SectionLabel>🌍 Countries Lived</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {profile.countriesLived.map((c: any, i: number) => (
                  <span key={i} className="px-2 py-1 text-xs bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {c.country}{c.years ? ` (${c.years}y)` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Life Experiences, Volunteering, Hobbies */}
      {(profile.lifeExperiences.length > 0 || profile.volunteering.length > 0 || profile.hobbies.length > 0) && (
        <Card>
          {profile.volunteering.length > 0 && (
            <div className="mb-4">
              <SectionLabel>🤲 Volunteering</SectionLabel>
              <div className="space-y-2">
                {profile.volunteering.map((v: any, i: number) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-[var(--text-primary)]">{v.role}</span>
                    <span className="text-[var(--text-muted)]"> at {v.org}</span>
                    {v.description && <p className="text-[var(--text-secondary)] mt-0.5">{v.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {profile.hobbies.length > 0 && (
            <div className="mb-4">
              <SectionLabel>🎯 Hobbies & Interests</SectionLabel>
              <TagList items={profile.hobbies} color="neutral" />
            </div>
          )}
          {profile.lifeExperiences.length > 0 && (
            <div>
              <SectionLabel>🌟 Life Milestones</SectionLabel>
              <div className="space-y-1">
                {profile.lifeExperiences.map((le: any, i: number) => (
                  <div key={i} className="text-xs text-[var(--text-secondary)]">
                    {le.year && <span className="text-[var(--text-muted)] mr-2">{le.year}</span>}
                    {le.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <Card>
          <SectionLabel>⭐ Recent Reviews</SectionLabel>
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className="p-3 rounded-lg bg-[var(--bg-primary)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-yellow-400">{stars(review.rating)}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{review.reviewerName}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5">{review.comment}</p>
                )}
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-1 inline-block">
                  {review.type === 'poster_to_worker' ? 'As worker' : 'As poster'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Section 2: Agents & Services ─────────────────────────────────────────────

function AgentsSection({ agents, reputation }: { agents: ProfileViewProps['agents']; reputation: ProfileViewProps['stats']['reputation'] }) {
  return (
    <div className="space-y-4">
      {/* Reputation Card */}
      {reputation && (
        <Card>
          <SectionLabel>📊 Reputation</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <MiniStat value={reputation.score.toFixed(0)} label="Score" sub={`/100 · ${reputation.level}`} />
            <MiniStat value={reputation.avgRating.toFixed(1)} label="Avg Rating" sub={`${reputation.totalRatings} reviews`} />
            <MiniStat value={`${(reputation.onTimeRate * 100).toFixed(0)}%`} label="On-Time" sub={`${reputation.jobsCompleted} jobs done`} />
            <MiniStat value={`${(reputation.responseRate * 100).toFixed(0)}%`} label="Response Rate" sub={`${reputation.jobsPosted} posted`} />
          </div>
        </Card>
      )}

      {/* Agent List */}
      {agents.length > 0 && (
        <Card>
          <SectionLabel>🤖 Marketplace Agents</SectionLabel>
          <div className="grid gap-3 mt-2">
            {agents.map(agent => (
              <div key={agent.id} className="p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{agent.name}</h3>
                      {agent.version && <span className="text-[9px] text-[var(--text-muted)] font-mono">v{agent.version}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{agent.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {agent.avgRating > 0 && (
                      <span className="text-xs text-yellow-400">★ {agent.avgRating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-surface)] rounded text-[var(--text-muted)]">{agent.category}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {agent.pricingModel === 'free' ? 'Free' : `$${agent.price}/${agent.pricingModel === 'per_task' ? 'task' : 'mo'}`}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{agent.totalExecutions} runs</span>
                  {agent.avgResponseTime && (
                    <span className="text-[10px] text-[var(--text-muted)]">{(agent.avgResponseTime / 1000).toFixed(1)}s avg</span>
                  )}
                  {agent.successRate !== null && agent.successRate !== undefined && (
                    <span className="text-[10px] text-[var(--text-muted)]">{(agent.successRate * 100).toFixed(0)}% success</span>
                  )}
                </div>
                {agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.tags.slice(0, 5).map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[9px] bg-brand-400/10 text-brand-300 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {agents.length === 0 && !reputation && (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No agents or services listed yet.</p>
        </Card>
      )}
    </div>
  );
}

// ─── Section 3: Us (Relationship Context) ─────────────────────────────────────

function UsSection({ relationship, loading, targetName }: { relationship: RelationshipData | null; loading: boolean; targetName: string | null }) {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
          <span className="animate-pulse">Loading relationship data...</span>
        </div>
      </Card>
    );
  }

  if (!relationship) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          Connect with {targetName || 'this user'} to see your shared context.
        </p>
      </Card>
    );
  }

  const ctx = relationship.connectionContext;
  const name = targetName || 'them';

  return (
    <div className="space-y-4">
      {/* Connection Context */}
      <Card>
        <SectionLabel>🔗 Your Connection</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <MiniStat value={ctx.relationshipType || '—'} label="Relationship" />
          <MiniStat value={ctx.strength || '—'} label="Strength" />
          <MiniStat value={ctx.connectedSince ? timeAgo(ctx.connectedSince) : '—'} label="Connected" />
          <MiniStat value={ctx.firstMetAt ? timeAgo(ctx.firstMetAt) : '—'} label="First Met" />
        </div>
        {ctx.context && (
          <p className="text-xs text-[var(--text-secondary)] mt-3 italic">&quot;{ctx.context}&quot;</p>
        )}
        {ctx.tags.length > 0 && (
          <div className="mt-2">
            <TagList items={ctx.tags} color="brand" />
          </div>
        )}
        {ctx.notes && (
          <div className="mt-3 p-2 rounded bg-[var(--bg-primary)] text-xs text-[var(--text-muted)]">
            📝 {ctx.notes}
          </div>
        )}
      </Card>

      {/* Shared Teams & Projects */}
      {(relationship.sharedTeams.length > 0 || relationship.sharedProjects.length > 0) && (
        <Card>
          {relationship.sharedTeams.length > 0 && (
            <div className="mb-4">
              <SectionLabel>👥 Shared Teams</SectionLabel>
              <div className="space-y-2 mt-1">
                {relationship.sharedTeams.map(team => (
                  <div key={team.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-primary)]">
                    <span>{team.avatar || TEAM_TYPE_ICON[team.type] || '👥'}</span>
                    <span className="text-sm font-medium">{team.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{team._count.members} members</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {relationship.sharedProjects.length > 0 && (
            <div>
              <SectionLabel>📋 Shared Projects</SectionLabel>
              <div className="space-y-2 mt-1">
                {relationship.sharedProjects.map(proj => (
                  <div key={proj.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-primary)]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color || '#4F7CFF' }} />
                    <span className="text-sm font-medium">{proj.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{proj.status}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{proj._count.kanbanCards} cards</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Relay History */}
      {relationship.relays.total > 0 && (
        <Card>
          <SectionLabel>🌊 Relay History — {relationship.relays.total} total</SectionLabel>
          <div className="space-y-2 mt-2">
            {relationship.relays.recent.map((relay: any) => (
              <div key={relay.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-primary)]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">{relay.direction === 'outbound' ? '↗' : '↙'}</span>
                  <span className="text-xs font-medium">{relay.subject}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{relay.type}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(relay.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Job Contracts */}
      {relationship.contracts.length > 0 && (
        <Card>
          <SectionLabel>📄 Job History Together</SectionLabel>
          <div className="space-y-2 mt-2">
            {relationship.contracts.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-primary)]">
                <div>
                  <span className="text-xs font-medium">{c.job?.title || 'Contract'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-2">
                    {c.isCurrentUserClient ? `You hired ${name}` : `${name} hired you`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.status === 'completed' ? 'bg-green-400/10 text-green-400' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                    {c.status}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent Usage */}
      {(relationship.agentUsage.youUsedTheirs > 0 || relationship.agentUsage.theyUsedYours > 0) && (
        <Card>
          <SectionLabel>🤖 Agent Cross-Usage</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="p-3 rounded bg-[var(--bg-primary)]">
              <div className="text-lg font-bold text-brand-400">{relationship.agentUsage.youUsedTheirs}</div>
              <div className="text-[10px] text-[var(--text-muted)]">times you used their agents</div>
              {relationship.agentUsage.theirAgents.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {relationship.agentUsage.theirAgents.slice(0, 3).map(a => (
                    <span key={a.id} className="text-[9px] px-1.5 py-0.5 bg-brand-400/10 text-brand-300 rounded">{a.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 rounded bg-[var(--bg-primary)]">
              <div className="text-lg font-bold text-brand-400">{relationship.agentUsage.theyUsedYours}</div>
              <div className="text-[10px] text-[var(--text-muted)]">times they used your agents</div>
              {relationship.agentUsage.yourAgents.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {relationship.agentUsage.yourAgents.slice(0, 3).map(a => (
                    <span key={a.id} className="text-[9px] px-1.5 py-0.5 bg-brand-400/10 text-brand-300 rounded">{a.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Section 4: Network ───────────────────────────────────────────────────────

function NetworkSection({ stats, teams }: { stats: ProfileViewProps['stats']; teams: ProfileViewProps['teams'] }) {
  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>🌐 Network Presence</SectionLabel>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <MiniStat value={stats.connections} label="Connections" />
          <MiniStat value={stats.agents} label="Agents Listed" />
          <MiniStat value={teams.length} label="Teams" />
        </div>
      </Card>

      {teams.length > 0 && (
        <Card>
          <SectionLabel>👥 Teams</SectionLabel>
          <div className="space-y-2 mt-2">
            {teams.map(team => (
              <div key={team.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <span className="text-xl">{team.avatar || TEAM_TYPE_ICON[team.type] || '👥'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{team.name}</div>
                  {team.headline && <div className="text-xs text-[var(--text-muted)]">{team.headline}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-muted)]">{team.memberCount} members</div>
                  <div className="text-[9px] text-[var(--text-muted)] uppercase">{team.type}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{children}</h3>
  );
}

function TagList({ items, color }: { items: string[]; color: 'brand' | 'neutral' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item: string) => (
        <span
          key={item}
          className={`px-2 py-1 text-xs rounded-md ${
            color === 'brand'
              ? 'bg-brand-400/10 text-brand-300'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function MiniStat({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[9px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}
