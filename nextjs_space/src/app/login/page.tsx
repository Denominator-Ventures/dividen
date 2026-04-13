'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupComplete = searchParams.get('setup') === 'complete';
  const inviteToken = searchParams.get('invite');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        // Accept any pending invitations for this user's email
        try {
          if (inviteToken) {
            await fetch(`/api/invites/${inviteToken}/accept`, { method: 'POST' });
          }
          await fetch('/api/invites/accept-pending', { method: 'POST' });
        } catch (err) {
          console.error('Failed to accept pending invites:', err);
        }
        router.push('/dashboard');
      }
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
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            DiviDen
          </h1>
          <p className="label-mono">
            Command Center
          </p>
        </div>

        {/* Success banner */}
        {setupComplete && (
          <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-4 py-3 rounded-lg text-sm mb-6 text-center">
            Account created. Sign in below.
          </div>
        )}

        {/* Invite banner */}
        {inviteToken && !setupComplete && (
          <div className="bg-[var(--brand-primary)]/8 border border-[var(--brand-primary)]/20 px-4 py-3 rounded-lg text-sm mb-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              ✉️ Sign in to accept your invitation and auto-connect.
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label-mono block mb-2">
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-mono block mb-2">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Don&apos;t have an account?{' '}
          <a href="/setup" className="text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium">
            Create one
          </a>
        </p>
        <p className="text-center text-[10px] text-white/25 mt-4">
          By signing in, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400/50 hover:text-brand-400 underline underline-offset-2">
            Terms of Service
          </a>{' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400/50 hover:text-brand-400 underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
