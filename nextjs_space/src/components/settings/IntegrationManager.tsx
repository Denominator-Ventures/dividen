'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

interface IntegrationAccount {
  id: string;
  identity: string;
  provider: string;
  service: string;
  label: string | null;
  emailAddress: string | null;
  accountIndex: number;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const MAX_OPERATOR_GOOGLE = 3;
const MAX_AGENT_GOOGLE = 1;

type Identity = 'operator' | 'agent';

export function IntegrationManager() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);
  const [smtpIdentity, setSmtpIdentity] = useState<Identity>('operator');
  const [smtpLabel, setSmtpLabel] = useState('');
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [googleOAuthAvailable, setGoogleOAuthAvailable] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
        if (typeof data.googleOAuthAvailable === 'boolean') {
          setGoogleOAuthAvailable(data.googleOAuthAvailable);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Handle ?google=connected or ?error= from OAuth callback
  useEffect(() => {
    const googleStatus = searchParams.get('google');
    const errorMsg = searchParams.get('error');
    if (googleStatus === 'connected') {
      setToast({ type: 'success', msg: 'Google connected! Syncing emails, calendar, and drive in the background...' });
      fetchAccounts();
      // Trigger a full sync (server already started one fire-and-forget, but this ensures completion)
      fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'all' }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setToast({ type: 'success', msg: `Sync complete — ${d.email || 0} emails, ${d.calendar || 0} events, ${d.drive || 0} files` });
            fetchAccounts(); // Refresh to show lastSyncAt
          }
        })
        .catch(() => {});
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('google');
      router.replace(url.pathname + url.search, { scroll: false });
    } else if (errorMsg) {
      setToast({ type: 'error', msg: `Connection failed: ${decodeURIComponent(errorMsg)}` });
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, fetchAccounts, router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleConnectGoogle = (identity: Identity, accountIndex = 0) => {
    window.location.href = `/api/auth/google-connect?identity=${identity}&accountIndex=${accountIndex}`;
  };

  const handleDisconnectGoogle = async (account: IntegrationAccount) => {
    const acctLabel = account.emailAddress || (account.identity === 'operator' ? 'your account' : "Divi's account");
    if (!confirm(`Disconnect ${acctLabel}? This removes Gmail, Calendar, and Drive access for this Google account.`)) return;
    await fetch(`/api/integrations?id=${account.id}&disconnectGoogle=true`, { method: 'DELETE' });
    setToast({ type: 'success', msg: 'Google disconnected.' });
    fetchAccounts();
  };

  const handleSync = async (id: string, serviceName?: string) => {
    setSyncing(id);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ id, ok: true, msg: data.message });
        await fetchAccounts();
      } else {
        setTestResult({ id, ok: false, msg: data.error });
      }
    } catch {
      setTestResult({ id, ok: false, msg: 'Sync failed' });
    } finally {
      setSyncing(null);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id }),
      });
      const data = await res.json();
      setTestResult({ id, ok: data.success, msg: data.message || data.error || '' });
    } catch {
      setTestResult({ id, ok: false, msg: 'Connection failed' });
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteSmtp = async (id: string) => {
    if (!confirm('Remove this integration?')) return;
    await fetch(`/api/integrations?id=${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleSaveSmtp = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: smtpIdentity,
          provider: 'smtp',
          service: 'email',
          label: smtpLabel || (smtpIdentity === 'agent' ? "Divi's Email" : 'My Email'),
          emailAddress: smtpEmail || undefined,
          smtpHost, smtpPort, smtpUser, smtpPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
        setShowSmtpSetup(false);
        setSmtpLabel(''); setSmtpEmail(''); setSmtpHost(''); setSmtpPort('587'); setSmtpUser(''); setSmtpPass('');
      }
    } finally {
      setSaving(false);
    }
  };

  // Group accounts by identity
  const operatorAccounts = accounts.filter(a => a.identity === 'operator');
  const agentAccounts = accounts.filter(a => a.identity === 'agent');
  const operatorGoogleAccounts = operatorAccounts.filter(a => a.provider === 'google');
  const agentGoogleAccounts = agentAccounts.filter(a => a.provider === 'google');
  const operatorSmtpAccounts = operatorAccounts.filter(a => a.provider === 'smtp');
  const agentSmtpAccounts = agentAccounts.filter(a => a.provider === 'smtp');

  const GoogleLogo = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  const GmailLogo = () => (
    <svg width="18" height="14" viewBox="0 0 24 18">
      <path fill="#4285F4" d="M2 0h2l8 6 8-6h2a2 2 0 012 2v14a2 2 0 01-2 2h-2V4.5L12 11 4 4.5V18H2a2 2 0 01-2-2V2a2 2 0 012-2z"/>
      <path fill="#EA4335" d="M0 2l12 9 12-9v2L12 13 0 4z" opacity=".8"/>
    </svg>
  );

  const serviceIcon = (s: string) => {
    if (s === 'email') return <span className="text-lg">📧</span>;
    if (s === 'calendar') return <span className="text-lg">📅</span>;
    return <span className="text-lg">📁</span>;
  };
  const serviceLabel = (s: string) => s === 'email' ? 'Gmail' : s === 'calendar' ? 'Calendar' : 'Drive';

  const renderGoogleGroup = (googleAccts: IntegrationAccount[], identity: Identity) => {
    // Group by accountIndex (each index = one Google account with 3 services)
    const byIndex = new Map<number, IntegrationAccount[]>();
    for (const acct of googleAccts) {
      const idx = acct.accountIndex ?? 0;
      if (!byIndex.has(idx)) byIndex.set(idx, []);
      byIndex.get(idx)!.push(acct);
    }
    const connectedGroups = Array.from(byIndex.entries()).sort((a, b) => a[0] - b[0]);
    const maxAccounts = identity === 'operator' ? MAX_OPERATOR_GOOGLE : MAX_AGENT_GOOGLE;
    const canAddMore = connectedGroups.length < maxAccounts;
    const nextIndex = connectedGroups.length > 0 ? Math.max(...connectedGroups.map(g => g[0])) + 1 : 0;

    if (connectedGroups.length === 0) {
      // If Google OAuth is not configured (self-hosted), show setup instructions
      if (!googleOAuthAvailable) {
        return (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--border-color)] opacity-70">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <GoogleLogo size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm text-[var(--text-muted)]">Google OAuth not configured</div>
              <div className="text-xs text-[var(--text-muted)]">
                Set <code className="code-inline">GOOGLE_CLIENT_ID</code> and <code className="code-inline">GOOGLE_CLIENT_SECRET</code> in your <code className="code-inline">.env</code> to enable.{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  Google Cloud Console →
                </a>
              </div>
            </div>
          </div>
        );
      }
      return (
        <button
          onClick={() => handleConnectGoogle(identity, 0)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--border-color)] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <GoogleLogo size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm text-[var(--text-primary)] group-hover:text-brand-400 transition-colors">
              Connect Google Account
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Links Gmail, Calendar &amp; Drive in one click
            </div>
          </div>
        </button>
      );
    }

    return (
      <div className="space-y-4">
        {connectedGroups.map(([idx, accts]) => {
          const primaryEmail = accts.find(a => a.service === 'email')?.emailAddress || 'Connected';
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-white flex items-center justify-center"><GoogleLogo size={14} /></div>
                  <span className="text-xs text-[var(--text-secondary)]">{primaryEmail}</span>
                </div>
                <button
                  onClick={() => handleDisconnectGoogle(accts[0])}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
              {accts.map(acct => (
                <div
                  key={acct.id}
                  className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">{serviceIcon(acct.service)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {serviceLabel(acct.service)}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {acct.lastSyncAt ? `Last sync: ${new Date(acct.lastSyncAt).toLocaleDateString()}` : 'Not synced yet'}
                      </div>
                      {testResult?.id === acct.id && (
                        <div className={cn('text-xs mt-1', testResult.ok ? 'text-green-400' : 'text-red-400')}>
                          {testResult.ok ? '✓' : '✗'} {testResult.msg}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSync(acct.id, acct.service)}
                    disabled={syncing === acct.id}
                    className="px-2 py-1 text-xs rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-50"
                  >
                    {syncing === acct.id ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {/* Add another account */}
        {canAddMore && (
          <button
            onClick={() => handleConnectGoogle(identity, nextIndex)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-[var(--border-color)] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
          >
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center flex-shrink-0">
              <GoogleLogo size={14} />
            </div>
            <div className="text-xs text-[var(--text-muted)] group-hover:text-brand-400 transition-colors">
              + Connect another Google account
            </div>
          </button>
        )}
      </div>
    );
  };

  const renderSmtpCards = (smtpAccts: IntegrationAccount[]) => {
    return smtpAccts.map(acct => (
      <div
        key={acct.id}
        className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">📧</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {acct.label || 'SMTP Email'}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              {acct.emailAddress || 'IMAP/SMTP'}
              {acct.lastSyncAt && (<> · Last sync: {new Date(acct.lastSyncAt).toLocaleDateString()}</>)}
            </div>
            {testResult?.id === acct.id && (
              <div className={cn('text-xs mt-1', testResult.ok ? 'text-green-400' : 'text-red-400')}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => handleTest(acct.id)} disabled={testing === acct.id}
            className="px-2 py-1 text-xs rounded bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors disabled:opacity-50">
            {testing === acct.id ? '...' : 'Test'}
          </button>
          <button onClick={() => handleSync(acct.id)} disabled={syncing === acct.id}
            className="px-2 py-1 text-xs rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-50">
            {syncing === acct.id ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={() => handleDeleteSmtp(acct.id)}
            className="px-2 py-1 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors">
            ✕
          </button>
        </div>
      </div>
    ));
  };

  const renderIdentitySection = (
    identity: Identity,
    emoji: string,
    title: string,
    subtitle: string,
    googleAccts: IntegrationAccount[],
    smtpAccts: IntegrationAccount[],
  ) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{emoji}</span>
        <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{title}</h4>
      </div>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mb-3">{subtitle}</p>}

      {/* Google section */}
      <div className="mb-3">{renderGoogleGroup(googleAccts, identity)}</div>

      {/* SMTP accounts */}
      {smtpAccts.length > 0 && (
        <div className="space-y-2">{renderSmtpCards(smtpAccts)}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'p-3 rounded-lg text-xs border',
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Identities & Integrations</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Connect Google or SMTP for you (operator) and Divi (agent) separately.
          </p>
        </div>
        <button
          onClick={() => setShowSmtpSetup(true)}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
        >
          + SMTP
        </button>
      </div>

      {/* Operator */}
      {renderIdentitySection(
        'operator', '👤', 'Operator (You)', '',
        operatorGoogleAccounts, operatorSmtpAccounts,
      )}

      {/* Agent */}
      {renderIdentitySection(
        'agent', '🤖', 'Agent (Divi)',
        "Give Divi its own Google account or SMTP for independent operation.",
        agentGoogleAccounts, agentSmtpAccounts,
      )}

      {/* SMTP Setup Form */}
      {showSmtpSetup && (
        <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Add SMTP Email</h4>
            <button onClick={() => setShowSmtpSetup(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>

          <div>
            <label className="label-mono text-[10px] mb-1 block">Identity</label>
            <div className="flex gap-2">
              {(['operator', 'agent'] as Identity[]).map(id => (
                <button key={id} onClick={() => setSmtpIdentity(id)}
                  className={cn('flex-1 px-3 py-2 text-xs rounded-lg border transition-colors',
                    smtpIdentity === id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  )}>
                  {id === 'operator' ? '👤 You' : '🤖 Divi'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-mono text-[10px] mb-1 block">Label</label>
            <input type="text" value={smtpLabel} onChange={e => setSmtpLabel(e.target.value)}
              placeholder="My Work Email" className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          </div>
          <div>
            <label className="label-mono text-[10px] mb-1 block">Email Address</label>
            <input type="email" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)}
              placeholder="you@example.com" className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          </div>

          <div className="space-y-3 p-3 bg-[var(--bg-primary)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">Enter your SMTP/IMAP server details.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-mono text-[10px] mb-1 block">SMTP Host</label>
                <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com" className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              </div>
              <div>
                <label className="label-mono text-[10px] mb-1 block">Port</label>
                <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
                  placeholder="587" className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
              </div>
            </div>
            <div>
              <label className="label-mono text-[10px] mb-1 block">Username</label>
              <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)}
                placeholder="your-email@example.com" className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div>
              <label className="label-mono text-[10px] mb-1 block">Password</label>
              <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)}
                placeholder="••••••••••••" className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            </div>
          </div>

          <button onClick={handleSaveSmtp}
            disabled={saving || !smtpHost || !smtpUser || !smtpPass}
            className="w-full py-2 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save SMTP Integration'}
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]">
        <p className="font-medium text-[var(--text-secondary)] mb-1">Why two identities?</p>
        <p>
          The operator is you — your email, your calendar, your files.
          The agent (Divi) can have its own email address, calendar, and drive.
          Connect Google to link all three services at once, or add SMTP for email-only.
        </p>
      </div>
    </div>
  );
}