'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TeamAnalyticsDashboard } from './TeamAnalyticsDashboard';

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user?: { id: string; name: string | null; email: string } | null;
  connection?: { id: string; peerUserName: string | null; peerUserEmail: string | null; peerInstanceUrl: string | null; isFederated?: boolean } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  visibility?: string;
  color: string | null;
  teamId: string | null;
  team?: { id: string; name: string; avatar: string | null } | null;
  members: TeamMember[];
  _count: { kanbanCards: number; queueItems: number; relays: number };
}

interface ProjectContextData {
  project: { id: string; name: string; status: string; visibility: string; teamName: string | null };
  members: Array<{
    name: string | null; email: string | null; role: string; isFederated: boolean;
    cards: Array<{ id: string; title: string; status: string; priority: string }>;
    queueItems: Array<{ id: string; title: string; status: string }>;
    activeRelays: Array<{ id: string; subject: string; status: string; direction: string }>;
  }>;
  summary: { totalCards: number; totalQueue: number; totalRelays: number; cardsByStatus: Record<string, number>; blockedMembers: string[] };
}

interface TeamSubscriptionInfo {
  tier: string;
  status: string;
  memberLimit: number;
  trialEndsAt?: string | null;
}

interface TeamInvite {
  id: string;
  token: string;
  role: string;
  status: string;
  message: string | null;
  inviteeEmail: string | null;
  createdAt: string;
  inviter: { id: string; name: string | null; email: string } | null;
  invitee: { id: string; name: string | null; email: string } | null;
  connection: { id: string; peerUserName: string | null; peerUserEmail: string | null; peerInstanceUrl: string | null } | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  isActive: boolean;
  headline?: string | null;
  type?: string;
  visibility?: string;
  isSelfHosted?: boolean;
  originInstanceUrl?: string | null;
  members: TeamMember[];
  _count: { projects: number; queueItems: number; relays: number; followers?: number };
  subscription?: TeamSubscriptionInfo | null;
}

type View = 'list' | 'team-detail' | 'project-detail';

export function TeamsView() {
  const [view, setView] = useState<View>('list');
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formVisibility, setFormVisibility] = useState('private');
  const [saving, setSaving] = useState(false);
  const [listTab, setListTab] = useState<'teams' | 'projects'>('teams');
  const [projectCtx, setProjectCtx] = useState<ProjectContextData | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);
  // Team invite & project assignment state
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [teamDetailTab, setTeamDetailTab] = useState<'overview' | 'analytics'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/projects'),
      ]);
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createTeam = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null, avatar: formAvatar || null }),
      });
      if (res.ok) {
        setShowCreateTeam(false);
        setFormName(''); setFormDesc(''); setFormAvatar('');
        fetchData();
      }
    } finally { setSaving(false); }
  };

  const createProject = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null, teamId: formTeamId || null, visibility: formVisibility }),
      });
      if (res.ok) {
        setShowCreateProject(false);
        setFormName(''); setFormDesc(''); setFormTeamId(''); setFormVisibility('private');
        fetchData();
      }
    } finally { setSaving(false); }
  };

  const fetchProjectContext = async (id: string) => {
    setLoadingCtx(true);
    try {
      const res = await fetch(`/api/projects/${id}/context`);
      if (res.ok) setProjectCtx(await res.json());
    } catch { /* ignore */ } finally { setLoadingCtx(false); }
  };

  const fetchTeamInvites = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/invites`);
      if (res.ok) setTeamInvites(await res.json());
    } catch { /* ignore */ }
  };

  const sendInvite = async (teamId: string) => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, message: inviteMessage.trim() || null }),
      });
      if (res.ok) {
        setShowInvite(false);
        setInviteEmail(''); setInviteRole('member'); setInviteMessage('');
        fetchTeamInvites(teamId);
      }
    } finally { setSaving(false); }
  };

  const assignTeamToProject = async (teamId: string) => {
    if (!assignProjectId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: assignProjectId }),
      });
      if (res.ok) {
        setShowAssignProject(false);
        setAssignProjectId('');
        fetchData();
      }
    } finally { setSaving(false); }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/team/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const getMemberDisplay = (m: TeamMember) => {
    if (m.user) return { name: m.user.name || m.user.email, sub: m.role, federated: false };
    if (m.connection) return { name: m.connection.peerUserName || m.connection.peerUserEmail || 'Unknown', sub: `${m.role} · ${m.connection.peerInstanceUrl}`, federated: true };
    return { name: 'Unknown', sub: m.role, federated: false };
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    archived: 'bg-white/[0.06] text-white/40 border-white/[0.06]',
  };

  const roleColors: Record<string, string> = {
    owner: 'text-amber-400',
    admin: 'text-brand-400',
    lead: 'text-amber-400',
    contributor: 'text-emerald-400',
    reviewer: 'text-blue-400',
    observer: 'text-white/40',
    member: 'text-white/60',
  };

  const visibilityConfig: Record<string, { icon: string; label: string; color: string; desc: string }> = {
    private: { icon: '🔒', label: 'Private', color: 'bg-white/[0.06] text-white/60 border-white/[0.06]', desc: 'Only invited members' },
    team: { icon: '👥', label: 'Team', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', desc: 'All team members' },
    open: { icon: '🌐', label: 'Open', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', desc: 'Discoverable by connections' },
  };

  // ── List View ────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setListTab('teams')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                listTab === 'teams' ? 'bg-brand-500/10 text-brand-400' : 'text-[var(--text-secondary)] hover:text-white')}
            >
              👥 Teams ({teams.length})
            </button>
            <button
              onClick={() => setListTab('projects')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                listTab === 'projects' ? 'bg-brand-500/10 text-brand-400' : 'text-[var(--text-secondary)] hover:text-white')}
            >
              📁 Projects ({projects.length})
            </button>
          </div>
          <button
            onClick={() => listTab === 'teams' ? setShowCreateTeam(true) : setShowCreateProject(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all"
          >
            + New {listTab === 'teams' ? 'Team' : 'Project'}
          </button>
        </div>

        {/* Create modals */}
        {showCreateTeam && (
          <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-surface)] space-y-2">
            <div className="flex gap-2">
              <input value={formAvatar} onChange={e => setFormAvatar(e.target.value)} placeholder="🚀 Emoji" className="input-field w-16 text-center" />
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Team name" className="input-field flex-1" autoFocus />
            </div>
            <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description (optional)" className="input-field w-full" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCreateTeam(false); setFormName(''); setFormDesc(''); setFormAvatar(''); }} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
              <button onClick={createTeam} disabled={saving || !formName.trim()} className="text-xs px-3 py-1 rounded-lg bg-brand-500 text-black font-medium disabled:opacity-40">Create Team</button>
            </div>
          </div>
        )}
        {showCreateProject && (
          <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-surface)] space-y-2">
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Project name" className="input-field w-full" autoFocus />
            <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description (optional)" className="input-field w-full" />
            <div className="flex gap-2">
              <select value={formTeamId} onChange={e => setFormTeamId(e.target.value)} className="input-field flex-1 text-sm">
                <option value="">No team (independent)</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.avatar || '👥'} {t.name}</option>)}
              </select>
              <select value={formVisibility} onChange={e => setFormVisibility(e.target.value)} className="input-field w-32 text-sm">
                <option value="private">🔒 Private</option>
                {formTeamId && <option value="team">👥 Team</option>}
                <option value="open">🌐 Open</option>
              </select>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{visibilityConfig[formVisibility]?.desc || ''}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCreateProject(false); setFormName(''); setFormDesc(''); setFormTeamId(''); setFormVisibility('private'); }} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
              <button onClick={createProject} disabled={saving || !formName.trim()} className="text-xs px-3 py-1 rounded-lg bg-brand-500 text-black font-medium disabled:opacity-40">Create Project</button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && <p className="text-center text-xs text-[var(--text-muted)] py-8">Loading...</p>}

          {!loading && listTab === 'teams' && teams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm text-[var(--text-secondary)]">No teams yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Teams are persistent groups — people who work together across projects.</p>
            </div>
          )}

          {!loading && listTab === 'projects' && projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📁</p>
              <p className="text-sm text-[var(--text-secondary)]">No projects yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Projects are scoped collaborations — shared queues, kanban lanes, and relay context.</p>
            </div>
          )}

          {/* Teams list */}
          {!loading && listTab === 'teams' && teams.map(team => (
            <button
              key={team.id}
              onClick={() => { setSelectedTeam(team); setView('team-detail'); }}
              className="w-full text-left p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:border-brand-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{team.avatar || '👥'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{team.name}</h3>
                    {!team.isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">Inactive</span>}
                    {team.subscription && (
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                        team.subscription.tier === 'pro' ? 'bg-purple-500/15 text-purple-400' : 'bg-brand-500/15 text-brand-400'
                      )}>
                        {team.subscription.tier === 'pro' ? '⚡ Pro' : '🌱 Starter'}
                        {team.subscription.status === 'trialing' && ' trial'}
                      </span>
                    )}
                  </div>
                  {team.headline && <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{team.headline}</p>}
                  {!team.headline && team.description && <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{team.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
                    <span>{team._count.projects} project{team._count.projects !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex -space-x-1 mt-1 justify-end">
                    {team.members.slice(0, 5).map(m => {
                      const d = getMemberDisplay(m);
                      return (
                        <div key={m.id} title={d.name} className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border',
                          d.federated ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                        )}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                    {team.members.length > 5 && <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-[8px] text-white/40">+{team.members.length - 5}</div>}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {/* Projects list */}
          {!loading && listTab === 'projects' && projects.map(project => {
            const vis = visibilityConfig[project.visibility || 'private'] || visibilityConfig.private;
            const hasFederatedMembers = project.members.some(m => m.connection?.isFederated);
            const hasMultipleTeams = !project.teamId && project.members.some(m => m.connection);
            return (
              <button
                key={project.id}
                onClick={() => { setSelectedProject(project); setProjectCtx(null); setView('project-detail'); fetchProjectContext(project.id); }}
                className="w-full text-left p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:border-brand-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ background: project.color || '#4F7CFF' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm truncate">{project.name}</h3>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', statusColors[project.status] || statusColors.active)}>{project.status}</span>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', vis.color)}>{vis.icon} {vis.label}</span>
                      {hasFederatedMembers && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">🌐 cross-instance</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {project.team && <span className="text-[10px] text-[var(--text-muted)]">{project.team.avatar || '👥'} {project.team.name}</span>}
                      {!project.team && hasMultipleTeams && <span className="text-[10px] text-[var(--text-muted)]">🔀 cross-team</span>}
                      {project.description && <span className="text-[10px] text-[var(--text-muted)] truncate">{project.description}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-[var(--text-muted)] space-y-0.5">
                    <div>{project.members.length} member{project.members.length !== 1 ? 's' : ''}</div>
                    <div>{project._count.kanbanCards} card{project._count.kanbanCards !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Team Detail View ─────────────────────────────────────────────────────
  if (view === 'team-detail' && selectedTeam) {
    const team = selectedTeam;
    const isOwnerOrAdmin = team.members.some(m => m.user && ['owner', 'admin'].includes(m.role));
    const unassignedProjects = projects.filter(p => p.teamId !== team.id);
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 pt-3 pb-2 border-b border-[var(--border-primary)]">
          <button onClick={() => { setView('list'); setSelectedTeam(null); setTeamInvites([]); setTeamDetailTab('overview'); }} className="text-xs text-brand-400 hover:text-brand-300 mb-2">← Back to Teams</button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{team.avatar || '👥'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-lg">{team.name}</h2>
                {team.isSelfHosted && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">🏠 Self-Hosted</span>
                )}
                {!team.isSelfHosted && team.subscription && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                    team.subscription.tier === 'pro' ? 'bg-purple-500/15 text-purple-400' : 'bg-brand-500/15 text-brand-400'
                  )}>
                    {team.subscription.tier === 'pro' ? '⚡ Pro' : '🌱 Starter'}
                    {team.subscription.status === 'trialing' && ' trial'}
                  </span>
                )}
              </div>
              {team.headline && <p className="text-xs text-[var(--text-secondary)]">{team.headline}</p>}
              {!team.headline && team.description && <p className="text-xs text-[var(--text-secondary)]">{team.description}</p>}
              {team.originInstanceUrl && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Origin: {team.originInstanceUrl}</p>}
            </div>
            <a
              href={`/team/${team.id}`}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-brand-400 transition-colors flex-shrink-0"
            >
              Full Profile →
            </a>
          </div>
        </div>

        {/* Tab switcher for team detail */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-[var(--border-primary)]">
          {[
            { id: 'overview' as const, label: 'Overview', icon: '📋' },
            { id: 'analytics' as const, label: 'Analytics & Billing', icon: '📊' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTeamDetailTab(tab.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                teamDetailTab === tab.id
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {teamDetailTab === 'analytics' ? (
          <div className="flex-1 overflow-y-auto p-4">
            <TeamAnalyticsDashboard
              teamId={team.id}
              userRole={team.members.find(m => m.user)?.role || 'member'}
            />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Subscription info — only for platform teams */}
          {!team.isSelfHosted && team.subscription && (
            <div className={cn(
              'p-3 rounded-lg border',
              team.subscription.tier === 'pro' ? 'bg-purple-500/5 border-purple-500/15' : 'bg-brand-500/5 border-brand-500/15'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {team.subscription.tier === 'pro' ? '⚡ Team Pro' : '🌱 Team Starter'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] capitalize">{team.subscription.status}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {team.members.length}/{team.subscription.memberLimit} seats
                </span>
              </div>
              {team.subscription.status === 'trialing' && team.subscription.trialEndsAt && (
                <div className="text-[10px] text-amber-400 mt-1">
                  Trial ends {new Date(team.subscription.trialEndsAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Self-hosted info */}
          {team.isSelfHosted && (
            <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/15">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-400">🏠 Self-Hosted Team</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">This team originated from an open-source instance. No subscription required — all features are unlimited.</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Members', value: team.members.length, icon: '👤' },
              { label: 'Projects', value: team._count.projects, icon: '📁' },
              { label: 'Relays', value: team._count.relays, icon: '📡' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-center">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xl font-bold mt-1">{s.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Members</h3>
              {isOwnerOrAdmin && (
                <button onClick={() => { setShowInvite(!showInvite); fetchTeamInvites(team.id); }} className="text-[10px] px-2 py-1 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all">
                  + Invite
                </button>
              )}
            </div>

            {/* Invite form */}
            {showInvite && (
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-brand-500/20 mb-2 space-y-2">
                <div className="flex gap-2">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className="input-field flex-1 text-sm" autoFocus />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="input-field w-24 text-sm">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <input value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} placeholder="Add a note (optional)" className="input-field w-full text-sm" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowInvite(false); setInviteEmail(''); }} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
                  <button onClick={() => sendInvite(team.id)} disabled={saving || !inviteEmail.trim()} className="text-xs px-3 py-1 rounded-lg bg-brand-500 text-black font-medium disabled:opacity-40">Send Invite</button>
                </div>

                {/* Pending invites */}
                {teamInvites.filter(i => i.status === 'pending').length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Pending Invites</p>
                    {teamInvites.filter(i => i.status === 'pending').map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{inv.inviteeEmail || inv.invitee?.email || inv.connection?.peerUserEmail || 'Unknown'}</span>
                        <span className={cn('text-[9px]', roleColors[inv.role])}>{inv.role}</span>
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          className="text-[9px] px-2 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)] hover:text-white transition-colors"
                        >
                          {copiedToken === inv.token ? '✓ Copied' : '🔗 Copy Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              {team.members.map(m => {
                const d = getMemberDisplay(m);
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      d.federated ? 'bg-purple-500/20 text-purple-300' : 'bg-brand-500/20 text-brand-300'
                    )}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{d.sub}</p>
                    </div>
                    <span className={cn('text-[10px] font-medium', roleColors[m.role] || 'text-white/60')}>{m.role}</span>
                    {d.federated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">🌐 federated</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team's Projects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Projects</h3>
              {isOwnerOrAdmin && unassignedProjects.length > 0 && (
                <button onClick={() => setShowAssignProject(!showAssignProject)} className="text-[10px] px-2 py-1 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all">
                  + Assign Project
                </button>
              )}
            </div>

            {/* Assign project form */}
            {showAssignProject && (
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-brand-500/20 mb-2 space-y-2">
                <p className="text-[10px] text-[var(--text-muted)]">Assigning a project adds all team members as contributors. Divi&apos;s CoS mode will consider team members for qualifying tasks.</p>
                <select value={assignProjectId} onChange={e => setAssignProjectId(e.target.value)} className="input-field w-full text-sm">
                  <option value="">Select a project...</option>
                  {unassignedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowAssignProject(false); setAssignProjectId(''); }} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
                  <button onClick={() => assignTeamToProject(team.id)} disabled={saving || !assignProjectId} className="text-xs px-3 py-1 rounded-lg bg-brand-500 text-black font-medium disabled:opacity-40">Assign</button>
                </div>
              </div>
            )}

            {projects.filter(p => p.teamId === team.id).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] p-3 text-center">No projects in this team yet</p>
            ) : (
              <div className="space-y-1">
                {projects.filter(p => p.teamId === team.id).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProject(p); setView('project-detail'); }}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:border-brand-500/30 transition-all"
                  >
                    <div className="w-1.5 h-6 rounded-full" style={{ background: p.color || '#4F7CFF' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{p.members.length} members · {p._count.kanbanCards} cards</p>
                    </div>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', statusColors[p.status] || statusColors.active)}>{p.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  }
  // ── Project Detail View ──────────────────────────────────────────────────
  if (view === 'project-detail' && selectedProject) {
    const project = selectedProject;
    const vis = visibilityConfig[project.visibility || 'private'] || visibilityConfig.private;
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 pt-3 pb-2 border-b border-[var(--border-primary)]">
          <button onClick={() => { setView('list'); setSelectedProject(null); setProjectCtx(null); }} className="text-xs text-brand-400 hover:text-brand-300 mb-2">← Back</button>
          <div className="flex items-center gap-3">
            <div className="w-3 h-10 rounded-full" style={{ background: project.color || '#4F7CFF' }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-lg">{project.name}</h2>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', statusColors[project.status] || statusColors.active)}>{project.status}</span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', vis.color)}>{vis.icon} {vis.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {project.team && <span className="text-xs text-[var(--text-muted)]">{project.team.avatar || '👥'} {project.team.name}</span>}
                {project.description && <span className="text-xs text-[var(--text-secondary)]">{project.description}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Members', value: project.members.length, icon: '👤' },
              { label: 'Cards', value: project._count.kanbanCards, icon: '📋' },
              { label: 'Queue', value: project._count.queueItems, icon: '📥' },
              { label: 'Relays', value: project._count.relays, icon: '📡' },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-center">
                <span className="text-base">{s.icon}</span>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Project Activity Dashboard — shows what Divi sees */}
          {loadingCtx && <p className="text-center text-xs text-[var(--text-muted)] py-4">Loading project intelligence...</p>}
          {projectCtx && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">🧠 Divi&apos;s View</h3>
                <span className="text-[10px] text-[var(--text-muted)]">what Divi knows about everyone</span>
              </div>

              {/* Blockers alert */}
              {projectCtx.summary.blockedMembers.length > 0 && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  ⚠️ Potentially blocked: {projectCtx.summary.blockedMembers.join(', ')}
                </div>
              )}

              {/* Cards by stage */}
              {Object.keys(projectCtx.summary.cardsByStatus).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(projectCtx.summary.cardsByStatus).map(([stage, count]) => (
                    <span key={stage} className={cn('text-[9px] px-2 py-0.5 rounded border', statusColors[stage] || 'bg-white/[0.06] text-white/60 border-white/[0.06]')}>
                      {stage}: {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Per-member activity */}
              <div className="space-y-2">
                {projectCtx.members.map((m, i) => (
                  <div key={i} className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold',
                        m.isFederated ? 'bg-purple-500/20 text-purple-300' : 'bg-brand-500/20 text-brand-300'
                      )}>
                        {(m.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{m.name || m.email || 'Unknown'}</span>
                      <span className={cn('text-[9px]', roleColors[m.role] || 'text-white/60')}>{m.role}</span>
                    </div>
                    <div className="pl-7 space-y-0.5">
                      {m.cards.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">📋 {m.cards.map(c => `${c.title} [${c.status}]`).join(', ')}</p>
                      )}
                      {m.queueItems.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">📥 {m.queueItems.map(q => `${q.title} [${q.status}]`).join(', ')}</p>
                      )}
                      {m.activeRelays.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">📡 {m.activeRelays.map(r => `${r.direction === 'inbound' ? '📥' : '📤'} ${r.subject} [${r.status}]`).join(', ')}</p>
                      )}
                      {m.cards.length === 0 && m.queueItems.length === 0 && m.activeRelays.length === 0 && (
                        <p className="text-[10px] text-[var(--text-muted)] italic">No active items</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Members</h3>
            <div className="space-y-1">
              {project.members.map(m => {
                const d = getMemberDisplay(m);
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      d.federated ? 'bg-purple-500/20 text-purple-300' : 'bg-brand-500/20 text-brand-300'
                    )}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{d.sub}</p>
                    </div>
                    <span className={cn('text-[10px] font-medium', roleColors[m.role] || 'text-white/60')}>{m.role}</span>
                    {d.federated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">🌐 federated</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}