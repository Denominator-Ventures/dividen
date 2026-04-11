'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

interface InviteData {
  valid: boolean;
  inviterName: string;
  inviterEmail: string;
  inviteeName?: string;
  inviteeEmail?: string;
  message?: string;
  sourceInstance?: string;
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Fetch invite context if token is present
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    fetch(`/api/invites/${inviteToken}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setInvite(data);
          setForm(prev => ({
            ...prev,
            email: data.inviteeEmail || prev.email,
            name: data.inviteeName || prev.name,
          }));
        } else {
          setInviteError(data.error || 'Invalid invitation');
        }
      })
      .catch(() => setInviteError('Could not verify invitation'))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service to create an account');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create account
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          acceptedTerms: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // Step 2: If invite token, auto-login and accept the invite
      if (inviteToken) {
        const signInResult = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Accept the specific invite
          try {
            await fetch(`/api/invites/${inviteToken}/accept`, { method: 'POST' });
          } catch (err) {
            console.error('Failed to accept invite:', err);
          }

          // Also accept any other pending invites for this email
          try {
            await fetch('/api/invites/accept-pending', { method: 'POST' });
          } catch (err) {
            console.error('Failed to accept pending invites:', err);
          }

          router.push('/dashboard');
          return;
        }
      }

      // No invite token — go to login page normally
      router.push('/login?setup=complete');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
              DiviDen
            </h1>
          </Link>
          <p className="label-mono">
            {invite ? 'Accept Invitation' : 'Create Account'}
          </p>
        </div>

        {/* Invite context banner */}
        {inviteLoading && (
          <div className="bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/15 px-4 py-3 rounded-lg text-sm mb-6 text-center">
            <div className="animate-pulse text-[var(--text-muted)] text-xs">Loading invitation...</div>
          </div>
        )}

        {inviteError && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg text-sm mb-6">
            <p className="text-xs font-medium mb-1">⚠ Invitation Issue</p>
            <p className="text-[11px] text-yellow-400/80">{inviteError}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">You can still create an account below.</p>
          </div>
        )}

        {invite && (
          <div className="bg-[var(--brand-primary)]/8 border border-[var(--brand-primary)]/20 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">✉️</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">You&apos;ve been invited!</span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">{invite.inviterName}</strong> ({invite.inviterEmail}) invited you to join DiviDen. Create your account to connect.
            </p>
            {invite.message && (
              <div className="mt-2 pl-3 border-l-2 border-[var(--brand-primary)]/30">
                <p className="text-[11px] text-[var(--text-secondary)] italic">&ldquo;{invite.message}&rdquo;</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label-mono block mb-2">Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-mono block mb-2">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              readOnly={!!invite?.inviteeEmail}
            />
            {invite?.inviteeEmail && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Email pre-filled from invitation</p>
            )}
          </div>

          <div>
            <label className="label-mono block mb-2">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="label-mono block mb-2">Confirm Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          {/* Terms of Service */}
          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30"
            />
            <label htmlFor="accept-terms" className="text-xs text-white/50 leading-relaxed cursor-pointer">
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                Terms of Service
              </a>
              , including the agent liability disclaimers and marketplace terms. I understand that DiviDen is not responsible for actions taken by any AI agent on this platform.
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !acceptedTerms}
          >
            {loading ? 'Creating...' : invite ? 'Create Account & Connect' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Already have an account?{' '}
          <a
            href={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
            className="text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium"
          >
            Sign in{invite ? ' to accept invite' : ''}
          </a>
        </p>

        {/* Open Source CTA */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Take your DiviDen to the next level.{' '}
            <a
              href="https://os.dividen.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium"
            >
              Build your own customizable version →
            </a>
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Open source · Self-host · Extend with your own integrations
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}