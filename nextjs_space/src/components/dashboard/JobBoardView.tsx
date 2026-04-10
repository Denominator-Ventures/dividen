'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  taskType: string;
  urgency: string;
  status: string;
  compensation?: string;
  estimatedHours?: number;
  deadline?: string;
  requiredSkills?: string;
  preferredSkills?: string;
  visibility: string;
  completionNote?: string;
  createdAt: string;
  poster: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
  _count?: { applications: number };
  applications?: any[];
}

interface MatchResult {
  jobId: string;
  score: number;
  reason: string;
}

interface Reputation {
  score: number;
  level: string;
  jobsCompleted: number;
  jobsPosted: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  responseRate: number;
}

type ViewMode = 'browse' | 'my_jobs' | 'assigned' | 'matches' | 'reputation';

const TASK_TYPES = [
  'research', 'review', 'introductions', 'technical', 'creative',
  'strategy', 'operations', 'mentoring', 'sales', 'legal',
  'finance', 'hr', 'translation', 'custom',
];

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-zinc-500/20 text-zinc-400',
  cancelled: 'bg-red-500/20 text-red-400',
  expired: 'bg-zinc-700/20 text-zinc-500',
};

const LEVEL_COLORS: Record<string, string> = {
  new: 'text-zinc-400',
  rising: 'text-blue-400',
  established: 'text-emerald-400',
  trusted: 'text-amber-400',
  exemplary: 'text-purple-400',
};

function parseSkills(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function JobBoardView() {
  const [view, setView] = useState<ViewMode>('browse');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Create form
  const [form, setForm] = useState({
    title: '', description: '', taskType: 'custom', urgency: 'medium',
    compensation: '', estimatedHours: '', deadline: '',
    requiredSkills: '', preferredSkills: '', visibility: 'network',
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/jobs?';
      if (view === 'my_jobs') url += 'mine=true&status=all';
      else if (view === 'assigned') url += 'assigned=true&status=all';
      else url += 'status=open';

      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) { console.error('Failed to fetch jobs:', e); }
    setLoading(false);
  }, [view]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/match');
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) { console.error('Failed to fetch matches:', e); }
    setLoading(false);
  }, []);

  const fetchReputation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reputation');
      const data = await res.json();
      setReputation(data.reputation || null);
    } catch (e) { console.error('Failed to fetch reputation:', e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (view === 'matches') fetchMatches();
    else if (view === 'reputation') fetchReputation();
    else fetchJobs();
  }, [view, fetchJobs, fetchMatches, fetchReputation]);

  const createJob = async () => {
    const payload: any = {
      ...form,
      requiredSkills: form.requiredSkills ? form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
      preferredSkills: form.preferredSkills ? form.preferredSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
      estimatedHours: form.estimatedHours || undefined,
      deadline: form.deadline || undefined,
    };
    const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      setShowCreate(false);
      setForm({ title: '', description: '', taskType: 'custom', urgency: 'medium', compensation: '', estimatedHours: '', deadline: '', requiredSkills: '', preferredSkills: '', visibility: 'network' });
      fetchJobs();
    }
  };

  const applyToJob = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'self_apply' }),
    });
    if (res.ok) {
      alert('Application submitted!');
      fetchJobs();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to apply');
    }
  };

  const acceptApplication = async (jobId: string, applicantId: string) => {
    // Accept = assign the job to this applicant
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    if (res.ok) {
      // Also update the assignment
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      // Note: assigneeId set through a direct update isn't in PATCH allowed fields
      // We'll handle this properly — for now just update status
      fetchJobs();
      setShowDetail(false);
    }
  };

  const completeJob = async (jobId: string) => {
    const note = prompt('Completion notes (optional):');
    const res = await fetch(`/api/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionNote: note || '' }),
    });
    if (res.ok) {
      alert('Job completed! Consider leaving a review.');
      fetchJobs();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-white">Network Job Board</h2>
          <p className="text-xs text-zinc-500">Post tasks, find talent, build reputation</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
        >
          + Post Job
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/5 overflow-x-auto">
        {[
          { id: 'browse' as ViewMode, label: '🌐 Browse', },
          { id: 'matches' as ViewMode, label: '✨ Matches' },
          { id: 'my_jobs' as ViewMode, label: '📤 My Posts' },
          { id: 'assigned' as ViewMode, label: '📥 Assigned' },
          { id: 'reputation' as ViewMode, label: '⭐ Reputation' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              view === tab.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : view === 'reputation' ? (
          <ReputationView reputation={reputation} />
        ) : view === 'matches' ? (
          matches.length === 0 ? (
            <EmptyState
              icon="✨"
              title="No matches yet"
              subtitle="Complete your profile with skills and task types to get matched with relevant jobs"
            />
          ) : (
            matches.map(m => (
              <MatchCard
                key={m.jobId}
                match={m}
                onApply={() => applyToJob(m.jobId)}
              />
            ))
          )
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={view === 'browse' ? '💼' : view === 'my_jobs' ? '📤' : '📥'}
            title={view === 'browse' ? 'No open jobs' : view === 'my_jobs' ? 'No jobs posted' : 'No assigned jobs'}
            subtitle={view === 'browse' ? 'Be the first to post a task to the network' : view === 'my_jobs' ? 'Post a job to get help from the network' : 'Apply to open jobs to get started'}
          />
        ) : (
          jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              isMine={view === 'my_jobs'}
              isAssigned={view === 'assigned'}
              onApply={() => applyToJob(job.id)}
              onComplete={() => completeJob(job.id)}
              onSelect={() => { setSelectedJob(job); setShowDetail(true); }}
            />
          ))
        )}
      </div>

      {/* Create Job Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg mx-4 bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Post a Job to the Network</h3>
            
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500"
                placeholder="e.g. Research market sizing for AI agents" />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Description *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 h-24 resize-none"
                placeholder="Describe the task, deliverables, and context..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Task Type</label>
                <select value={form.taskType} onChange={e => setForm(f => ({ ...f, taskType: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white">
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Urgency</label>
                <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Compensation</label>
                <input value={form.compensation} onChange={e => setForm(f => ({ ...f, compensation: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500"
                  placeholder="e.g. $500, equity swap, mutual" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Est. Hours</label>
                <input type="number" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500"
                  placeholder="e.g. 4" />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white" />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Required Skills (comma-separated)</label>
              <input value={form.requiredSkills} onChange={e => setForm(f => ({ ...f, requiredSkills: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500"
                placeholder="e.g. python, data analysis, research" />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Preferred Skills (comma-separated)</label>
              <input value={form.preferredSkills} onChange={e => setForm(f => ({ ...f, preferredSkills: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500"
                placeholder="e.g. AI, machine learning" />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Visibility</label>
              <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white">
                <option value="network">Network (all instances)</option>
                <option value="instance">Instance (local only)</option>
                <option value="connections">Connections only</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={createJob} disabled={!form.title || !form.description}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Post Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {showDetail && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => { setShowDetail(false); setSelectedJob(null); }}
          onRefresh={fetchJobs}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function JobCard({ job, isMine, isAssigned, onApply, onComplete, onSelect }: {
  job: Job; isMine: boolean; isAssigned: boolean;
  onApply: () => void; onComplete: () => void; onSelect: () => void;
}) {
  const skills = parseSkills(job.requiredSkills);
  return (
    <div
      onClick={onSelect}
      className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors cursor-pointer space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
            <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border', URGENCY_COLORS[job.urgency] || URGENCY_COLORS.medium)}>
              {job.urgency}
            </span>
            <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full', STATUS_COLORS[job.status] || STATUS_COLORS.open)}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2">{job.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] text-zinc-500">📋 {job.taskType}</span>
        {job.compensation && <span className="text-[10px] text-emerald-400">💰 {job.compensation}</span>}
        {job.estimatedHours && <span className="text-[10px] text-zinc-500">⏱️ {job.estimatedHours}h</span>}
        {job.deadline && <span className="text-[10px] text-zinc-500">📅 {new Date(job.deadline).toLocaleDateString()}</span>}
        <span className="text-[10px] text-zinc-600">by {job.poster?.name || 'Unknown'}</span>
        <span className="text-[10px] text-zinc-600">{timeAgo(job.createdAt)}</span>
        {(job._count?.applications ?? 0) > 0 && (
          <span className="text-[10px] text-blue-400">👤 {job._count?.applications} applicant{(job._count?.applications ?? 0) !== 1 ? 's' : ''}</span>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {skills.slice(0, 5).map(s => (
            <span key={s} className="px-2 py-0.5 text-[10px] bg-white/5 text-zinc-400 rounded-full">{s}</span>
          ))}
          {skills.length > 5 && <span className="text-[10px] text-zinc-500">+{skills.length - 5} more</span>}
        </div>
      )}

      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        {!isMine && !isAssigned && job.status === 'open' && (
          <button onClick={onApply}
            className="px-3 py-1 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
            Apply
          </button>
        )}
        {isAssigned && job.status === 'in_progress' && (
          <button onClick={onComplete}
            className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, onApply }: { match: MatchResult; onApply: () => void }) {
  return (
    <div className="p-4 bg-zinc-900/50 border border-amber-500/10 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-sm font-semibold text-white">{Math.round(match.score * 100)}% match</span>
        </div>
        <button onClick={onApply}
          className="px-3 py-1 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
          Express Interest
        </button>
      </div>
      <p className="text-xs text-zinc-400">{match.reason}</p>
      <p className="text-[10px] text-zinc-600">Job ID: {match.jobId.slice(0, 8)}...</p>
    </div>
  );
}

function ReputationView({ reputation }: { reputation: Reputation | null }) {
  if (!reputation) return <EmptyState icon="⭐" title="No reputation data" subtitle="Complete jobs to build your network reputation" />;

  const levelEmoji: Record<string, string> = { new: '🌱', rising: '📈', established: '🏛️', trusted: '🛡️', exemplary: '👑' };

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-xl text-center space-y-3">
        <div className="text-4xl font-bold text-white">{Math.round(reputation.score)}</div>
        <div className={cn('text-lg font-semibold capitalize', LEVEL_COLORS[reputation.level] || 'text-zinc-400')}>
          {levelEmoji[reputation.level] || '🌱'} {reputation.level}
        </div>
        <p className="text-xs text-zinc-500">Network Reputation Score</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Jobs Completed', value: reputation.jobsCompleted, icon: '✅' },
          { label: 'Jobs Posted', value: reputation.jobsPosted, icon: '📤' },
          { label: 'Avg Rating', value: reputation.avgRating > 0 ? `${reputation.avgRating.toFixed(1)} ⭐` : 'No ratings', icon: '⭐' },
          { label: 'On-Time Rate', value: `${Math.round(reputation.onTimeRate * 100)}%`, icon: '⏰' },
          { label: 'Response Rate', value: `${Math.round(reputation.responseRate * 100)}%`, icon: '💬' },
          { label: 'Total Reviews', value: reputation.totalRatings, icon: '📝' },
        ].map(stat => (
          <div key={stat.label} className="p-3 bg-zinc-800/50 border border-white/5 rounded-lg">
            <div className="text-xs text-zinc-500 mb-1">{stat.icon} {stat.label}</div>
            <div className="text-sm font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Level progression */}
      <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl space-y-2">
        <h4 className="text-xs font-semibold text-zinc-400">Reputation Levels</h4>
        <div className="space-y-1">
          {['new', 'rising', 'established', 'trusted', 'exemplary'].map(level => (
            <div key={level} className={cn('flex items-center gap-2 text-xs px-2 py-1 rounded',
              reputation.level === level ? 'bg-white/5 font-semibold' : 'opacity-50'
            )}>
              <span>{levelEmoji[level]}</span>
              <span className={cn('capitalize', LEVEL_COLORS[level])}>{level}</span>
              <span className="text-zinc-600 ml-auto">
                {level === 'new' && '0-19'}
                {level === 'rising' && '20-39'}
                {level === 'established' && '40-59'}
                {level === 'trusted' && '60-79'}
                {level === 'exemplary' && '80-100'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobDetailModal({ job, onClose, onRefresh }: { job: Job; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<Job | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${job.id}`).then(r => r.json()).then(d => setDetail(d.job)).catch(() => {});
  }, [job.id]);

  const submitReview = async (revieweeType: 'poster' | 'assignee') => {
    const res = await fetch(`/api/jobs/${job.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    if (res.ok) {
      alert('Review submitted!');
      setReviewComment('');
      onRefresh();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed');
    }
  };

  const skills = parseSkills(job.requiredSkills);
  const prefSkills = parseSkills(job.preferredSkills);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4 bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{job.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border', URGENCY_COLORS[job.urgency])}>{job.urgency}</span>
              <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full', STATUS_COLORS[job.status])}>{job.status.replace('_', ' ')}</span>
              <span className="text-[10px] text-zinc-500">📋 {job.taskType}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="text-sm text-zinc-300 whitespace-pre-wrap">{job.description}</div>

        <div className="grid grid-cols-2 gap-3">
          {job.compensation && <div className="text-xs"><span className="text-zinc-500">Compensation:</span> <span className="text-emerald-400">{job.compensation}</span></div>}
          {job.estimatedHours && <div className="text-xs"><span className="text-zinc-500">Est. Hours:</span> <span className="text-white">{job.estimatedHours}h</span></div>}
          {job.deadline && <div className="text-xs"><span className="text-zinc-500">Deadline:</span> <span className="text-white">{new Date(job.deadline).toLocaleDateString()}</span></div>}
          <div className="text-xs"><span className="text-zinc-500">Posted by:</span> <span className="text-white">{job.poster?.name || 'Unknown'}</span></div>
          {job.assignee && <div className="text-xs"><span className="text-zinc-500">Assigned to:</span> <span className="text-white">{job.assignee.name}</span></div>}
          <div className="text-xs"><span className="text-zinc-500">Visibility:</span> <span className="text-white">{job.visibility}</span></div>
        </div>

        {skills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-1">Required Skills</h4>
            <div className="flex gap-1 flex-wrap">
              {skills.map(s => <span key={s} className="px-2 py-0.5 text-[10px] bg-brand-500/10 text-brand-400 rounded-full">{s}</span>)}
            </div>
          </div>
        )}

        {prefSkills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-1">Preferred Skills</h4>
            <div className="flex gap-1 flex-wrap">
              {prefSkills.map(s => <span key={s} className="px-2 py-0.5 text-[10px] bg-zinc-500/10 text-zinc-400 rounded-full">{s}</span>)}
            </div>
          </div>
        )}

        {/* Applications */}
        {detail?.applications && detail.applications.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Applications ({detail.applications.length})</h4>
            <div className="space-y-2">
              {detail.applications.map((app: any) => (
                <div key={app.id} className="p-3 bg-zinc-800/50 border border-white/5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white font-medium">{app.applicant?.name}</span>
                    {app.matchScore && <span className="text-xs text-amber-400 ml-2">{Math.round(app.matchScore * 100)}% match</span>}
                    {app.coverNote && <p className="text-xs text-zinc-400 mt-1">{app.coverNote}</p>}
                    {app.matchReason && <p className="text-[10px] text-zinc-500 mt-0.5">{app.matchReason}</p>}
                  </div>
                  <span className={cn('px-2 py-0.5 text-[10px] rounded-full', 
                    app.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                    app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  )}>{app.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review section for completed jobs */}
        {job.status === 'completed' && (
          <div className="border-t border-white/5 pt-4">
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Leave a Review</h4>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setReviewRating(n)}
                  className={cn('text-lg', n <= reviewRating ? 'text-amber-400' : 'text-zinc-700')}>
                  ★
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 h-16 resize-none mb-2"
              placeholder="How was the experience?" />
            <button onClick={() => submitReview('assignee')}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors">
              Submit Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}
