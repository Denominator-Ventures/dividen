'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  type: string;
  visibility: string;
  headline: string | null;
  website: string | null;
  location: string | null;
  industry: string | null;
  foundedAt: string | null;
  agentEnabled: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
  subscription: {
    tier: string;
    status: string;
    memberLimit: number;
    trialEndsAt: string | null;
  } | null;
}

interface MemberData {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    headline: string | null;
    capacity: string | null;
    avatar: string | null;
  } | null;
  connection: {
    id: string;
    peerUserName: string | null;
    peerInstanceUrl: string | null;
    isFederated: boolean;
  } | null;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  color: string | null;
  visibility: string;
  memberCount: number;
  cardCount: number;
}

interface TeamProfileViewProps {
  team: TeamData;
  members: MemberData[];
  projects: ProjectData[];
  stats: { followers: number; queueItems: number; relays: number; goals: number };
  currentUserId: string | null;
  isMember: boolean;
  isOwner: boolean;
  isFollowing: boolean;
}

type Tab = 'about' | 'members' | 'projects';

const VISIBILITY_ICONS: Record<string, string> = { private: '🔒', network: '👥', public: '🌐' };
const TYPE_LABELS: Record<string, string> = { work: 'Work Team', community: 'Community', hybrid: 'Hybrid' };
const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-500/15',
  admin: 'text-purple-400 bg-purple-500/15',
  member: 'text-[var(--text-muted)] bg-[var(--bg-surface)]',
};
const CAPACITY_COLORS: Record<string, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  unavailable: 'bg-red-500',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TeamProfileView({
  team, members, projects, stats,
  currentUserId, isMember, isOwner, isFollowing: initialFollowing,
}: TeamProfileViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [following, setFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch(`/api/teams/${team.id}/follow`, { method });
      if (res.ok) setFollowing(!following);
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'about', label: 'About' },
    { id: 'members', label: 'Members', count: members.length },
    { id: 'projects', label: 'Projects', count: projects.length },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-6 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-brand-500/15 flex items-center justify-center text-2xl flex-shrink-0">
            {team.avatar || team.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{team.name}</h1>
              <span className="text-xs">{VISIBILITY_ICONS[team.visibility] || '🔒'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                {TYPE_LABELS[team.type] || team.type}
              </span>
              {team.subscription && (
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  team.subscription.tier === 'pro'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'bg-brand-500/15 text-brand-400'
                )}>
                  {team.subscription.tier === 'pro' ? '⚡ Pro' : '🌱 Starter'}
                  {team.subscription.status === 'trialing' && ' (trial)'}
                </span>
              )}
              {team.agentEnabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  🤖 Team Agent
                </span>
              )}
            </div>

            {team.headline && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{team.headline}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
              {team.industry && <span>🏢 {team.industry}</span>}
              {team.location && <span>📍 {team.location}</span>}
              {team.website && (
                <a href={team.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                  🔗 {team.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {team.foundedAt && (
                <span>📅 Founded {new Date(team.foundedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3">
              {[
                { label: 'Members', value: members.length },
                { label: 'Projects', value: projects.length },
                { label: 'Followers', value: stats.followers },
                { label: 'Relays', value: stats.relays },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-sm font-semibold">{s.value}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {!isMember && currentUserId && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={cn(
                  'text-xs px-4 py-2 rounded-lg transition-colors',
                  following
                    ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    : 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25'
                )}
              >
                {followLoading ? '...' : following ? '✓ Following' : '+ Follow'}
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => router.push('/settings?tab=teams')}
                className="text-xs px-4 py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ⚙️ Manage
              </button>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 text-xs py-2 rounded-md transition-colors flex items-center justify-center gap-1',
                activeTab === tab.id
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[9px] px-1 rounded-full bg-brand-500/20 text-brand-400">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        {activeTab === 'about' && (
          <div className="space-y-6 mt-4">
            {/* Description */}
            {team.description && (
              <div>
                <h4 className="label-mono text-[var(--text-muted)] mb-2" style={{ fontSize: '10px' }}>About</h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-primary)]">
                  {team.description}
                </p>
              </div>
            )}

            {/* Created by */}
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              <div className="w-8 h-8 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400 text-xs font-bold">
                {(team.createdBy.name || team.createdBy.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{team.createdBy.name || team.createdBy.email}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Created {timeAgo(team.createdAt)}</div>
              </div>
              {currentUserId && team.createdBy.id !== currentUserId && (
                <a
                  href={`/profile/${team.createdBy.id}`}
                  className="ml-auto text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                >
                  View Profile →
                </a>
              )}
            </div>

            {/* Subscription info (visible to members) */}
            {isMember && team.subscription && (
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <h4 className="label-mono text-[var(--text-muted)] mb-2" style={{ fontSize: '10px' }}>Subscription</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <span className={cn(
                      'text-sm font-medium capitalize',
                      team.subscription.tier === 'pro' ? 'text-purple-400' : 'text-brand-400'
                    )}>
                      {team.subscription.tier === 'pro' ? '⚡ Team Pro' : '🌱 Team Starter'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-2 capitalize">{team.subscription.status}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {members.length}/{team.subscription.memberLimit} members
                  </div>
                  {team.subscription.status === 'trialing' && team.subscription.trialEndsAt && (
                    <div className="text-xs text-amber-400">
                      Trial ends {new Date(team.subscription.trialEndsAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-2 mt-4">
            {members.map((member) => {
              const name = member.user?.name || member.connection?.peerUserName || 'Unknown';
              const subtitle = member.user?.headline || member.connection?.peerInstanceUrl || member.user?.email || '';
              const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              const capacity = member.user?.capacity;

              return (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-400 text-xs font-bold">
                      {initials}
                    </div>
                    {capacity && (
                      <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)]', CAPACITY_COLORS[capacity] || 'bg-gray-500')} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{name}</span>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full capitalize', ROLE_COLORS[member.role] || ROLE_COLORS.member)}>
                        {member.role}
                      </span>
                      {member.connection?.isFederated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">🌐 Federated</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{subtitle}</div>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Joined {timeAgo(member.joinedAt)}
                  </div>
                  {member.user?.id && currentUserId && member.user.id !== currentUserId && (
                    <a
                      href={`/profile/${member.user.id}`}
                      className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
                    >
                      Profile →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-2 mt-4">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                {isMember ? 'No active projects yet.' : 'No visible projects.'}
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || '#4F7CFF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{project.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] capitalize">
                        {project.status}
                      </span>
                      <span className="text-[9px]">
                        {project.visibility === 'private' ? '🔒' : project.visibility === 'team' ? '👥' : '🌐'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] flex-shrink-0">
                    <span>👥 {project.memberCount}</span>
                    <span>📋 {project.cardCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
