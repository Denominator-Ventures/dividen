'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

export default function TeamInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/teams/invite/${params.token}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Invite not found');
          return;
        }
        setInvite(await res.json());
      })
      .catch(() => setError('Failed to load invite'))
      .finally(() => setLoading(false));
  }, [params.token]);

  const accept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/teams/invite/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }
      setResult(data);
    } catch {
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const decline = async () => {
    setAccepting(true);
    try {
      await fetch(`/api/teams/invite/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      router.push('/dashboard');
    } catch {
      setError('Failed to decline invite');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto" />
          <p className="text-sm text-[var(--text-muted)] mt-4">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-4xl mb-4">❌</p>
          <h1 className="text-lg font-semibold mb-2">Invite Error</h1>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 rounded-lg bg-brand-500 text-black font-medium text-sm">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="text-lg font-semibold mb-2">Welcome to {result.teamName}!</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            You&apos;ve joined as a <span className="text-brand-400 font-medium">{result.role}</span>.
            {result.projectsJoined > 0 && ` Added to ${result.projectsJoined} project${result.projectsJoined > 1 ? 's' : ''}.`}
          </p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 rounded-lg bg-brand-500 text-black font-medium text-sm">
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="max-w-md mx-auto px-6 text-center">
        <p className="text-4xl mb-4">{invite.team?.avatar || '👥'}</p>
        <h1 className="text-xl font-semibold mb-1">Join {invite.team?.name}</h1>
        {invite.team?.headline && <p className="text-sm text-[var(--text-secondary)] mb-1">{invite.team.headline}</p>}
        {invite.team?.description && <p className="text-xs text-[var(--text-muted)] mb-4">{invite.team.description}</p>}
        
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] mb-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[var(--text-muted)]">Invited by</span>
            <span className="text-sm font-medium">{invite.inviter?.name || 'Someone'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Role</span>
            <span className={cn('text-sm font-medium', invite.role === 'admin' ? 'text-brand-400' : 'text-white/60')}>{invite.role}</span>
          </div>
          {invite.message && (
            <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-secondary)] italic">&ldquo;{invite.message}&rdquo;</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[var(--text-muted)]">{invite.team?._count?.members || 0} member{(invite.team?._count?.members || 0) !== 1 ? 's' : ''}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)]">{invite.team?.type || 'work'}</span>
          </div>
        </div>

        {status !== 'authenticated' ? (
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-3">Log in to accept this invite</p>
            <button onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/team/invite/${params.token}`)}`)} className="px-6 py-2.5 rounded-lg bg-brand-500 text-black font-medium text-sm">
              Log In
            </button>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            <button onClick={decline} disabled={accepting} className="px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--text-secondary)] hover:text-white text-sm transition-colors">
              Decline
            </button>
            <button onClick={accept} disabled={accepting} className="px-6 py-2.5 rounded-lg bg-brand-500 text-black font-medium text-sm disabled:opacity-50">
              {accepting ? 'Joining...' : 'Accept & Join'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
