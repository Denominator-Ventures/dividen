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
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      if (data.success) setAccounts(data.data);
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
      setToast({ type: 'success', msg: 'Google account connected! Gmail, Calendar, and Drive are now linked.' });
      fetchAccounts();
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

  const handleConnectGoogle = (identity: Identity) => {
    window.location.href = `/api/auth/google-connect?identity=${identity}`;
  };

  const handleDisconnectGoogle = async (account: IntegrationAccount) => {
    if (!confirm(`Disconnect Google for ${account.identity === 'operator' ? 'you' : 'Divi'}? This removes Gmail, Calendar, and Drive access.`)) return;
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

  const serviceIcon = (s: string) => s === 'email' ? '📧' : s === 'calendar' ? '📅' : '📁';
  const serviceLabel = (s: string) => s === 'email' ? 'Gmail' : s === 'calendar' ? 'Calendar' : 'Drive';

  const renderGoogleGroup = (googleAccts: IntegrationAccount[], identity: Identity) => {
    if (googleAccts.length === 0) {
      return (
        <button
          onClick={() => handleConnectGoogle(identity)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--border-color)] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            G
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

    // Google is connected — show the 3 services
    const primaryEmail = googleAccts.find(a => a.service === 'email')?.emailAddress || 'Connected';
    const firstId = googleAccts[0]?.id;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white text-[10px] font-bold">G</div>
            <span className="text-xs text-[var(--text-secondary)]">{primaryEmail}</span>
          </div>
          <button
            onClick={() => handleDisconnectGoogle(googleAccts[0])}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
        {googleAccts.map(acct => (
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
