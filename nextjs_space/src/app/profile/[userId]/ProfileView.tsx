'use client';

import Link from 'next/link';

interface ProfileViewProps {
  user: {
    id: string;
    name: string | null;
    createdAt: string;
  };
  profile: {
    headline: string | null;
    bio: string | null;
    skills: string | null;
    taskTypes: string | null;
    capacity: string | null;
    capacityNote: string | null;
    timezone: string | null;
  } | null;
  stats: {
    connections: number;
    agents: number;
    reputation: { score: number; level: string } | null;
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
    totalExecutions: number;
    version: string | null;
  }[];
}

const CAPACITY_COLORS: Record<string, string> = {
  available: 'text-green-400',
  limited: 'text-yellow-400',
  busy: 'text-orange-400',
  unavailable: 'text-red-400',
};

function parseJsonArray(str: string | null): string[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function ProfileView({ user, profile, stats, agents }: ProfileViewProps) {
  const skills = parseJsonArray(profile?.skills ?? null);
  const taskTypes = parseJsonArray(profile?.taskTypes ?? null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg text-brand-400">⬡</span>
            <span className="font-bold text-brand-400 tracking-tight">DiviDen</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-brand-400/20 flex items-center justify-center text-2xl text-brand-400 flex-shrink-0">
              {user.name ? user.name[0].toUpperCase() : '⬡'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{user.name || 'Anonymous Agent'}</h1>
              {profile?.headline && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{profile.headline}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span>Joined {timeAgo(user.createdAt)}</span>
                {profile?.timezone && <span>· {profile.timezone}</span>}
                {profile?.capacity && (
                  <span className={CAPACITY_COLORS[profile.capacity] || 'text-[var(--text-muted)]'}>
                    ● {profile.capacity}
                  </span>
                )}
              </div>
              {profile?.capacityNote && (
                <p className="text-xs text-[var(--text-muted)] mt-1 italic">{profile.capacityNote}</p>
              )}
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-[var(--text-secondary)] mt-5 leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[var(--border-color)]">
            <div className="text-center">
              <div className="text-lg font-bold text-brand-400">{stats.connections}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-brand-400">{stats.agents}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Agents Listed</div>
            </div>
            <div className="text-center">
              {stats.reputation ? (
                <>
                  <div className="text-lg font-bold text-brand-400">{stats.reputation.score}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{stats.reputation.level}</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-[var(--text-muted)]">—</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Reputation</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Skills & Task Types */}
        {(skills.length > 0 || taskTypes.length > 0) && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 mb-6">
            {skills.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill: string) => (
                    <span key={skill} className="px-2 py-1 text-xs bg-brand-400/10 text-brand-300 rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {taskTypes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Task Types</h3>
                <div className="flex flex-wrap gap-1.5">
                  {taskTypes.map((t: string) => (
                    <span key={t} className="px-2 py-1 text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-md border border-[var(--border-color)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Agents */}
        {agents.length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">🏪 Marketplace Agents</h2>
            <div className="grid gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{agent.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{agent.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-shrink-0 ml-3">
                      {agent.avgRating > 0 && (
                        <span>★ {agent.avgRating.toFixed(1)}</span>
                      )}
                      {agent.version && (
                        <span className="label-mono" style={{ fontSize: '9px' }}>v{agent.version}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                    <span className="px-1.5 py-0.5 bg-[var(--bg-surface)] rounded">{agent.category}</span>
                    <span>{agent.pricingModel === 'free' ? 'Free' : `$${agent.price}/${agent.pricingModel === 'per_task' ? 'task' : 'mo'}`}</span>
                    <span>{agent.totalExecutions} executions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for profiles with no public info */}
        {!profile && skills.length === 0 && agents.length === 0 && (
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
