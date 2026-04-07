'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

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
type Service = 'email' | 'calendar' | 'drive';
type Provider = 'google' | 'microsoft' | 'smtp';

const SERVICES: { id: Service; label: string; icon: string; description: string }[] = [
  { id: 'email', label: 'Email', icon: '📧', description: 'Send, receive, and sync email' },
  { id: 'calendar', label: 'Calendar', icon: '📅', description: 'Sync calendar events' },
  { id: 'drive', label: 'Drive', icon: '📁', description: 'Sync files and documents' },
];

const PROVIDERS: { id: Provider; label: string; services: Service[] }[] = [
  { id: 'google', label: 'Google (Gmail / Calendar / Drive)', services: ['email', 'calendar', 'drive'] },
  { id: 'microsoft', label: 'Microsoft (Outlook / O365)', services: ['email', 'calendar', 'drive'] },
  { id: 'smtp', label: 'SMTP / IMAP (Any provider)', services: ['email'] },
];

export function IntegrationManager() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupIdentity, setSetupIdentity] = useState<Identity>('operator');
  const [setupService, setSetupService] = useState<Service>('email');
  const [setupProvider, setSetupProvider] = useState<Provider>('google');
  const [setupLabel, setSetupLabel] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        identity: setupIdentity,
        provider: setupProvider,
        service: setupService,
        label: setupLabel || (setupIdentity === 'agent' ? `Divi's ${setupService}` : `My ${setupService}`),
        emailAddress: setupEmail || undefined,
      };
      if (setupProvider === 'smtp' || (setupProvider === 'google' && setupService === 'email')) {
        payload.smtpHost = smtpHost;
        payload.smtpPort = smtpPort;
        payload.smtpUser = smtpUser;
        payload.smtpPass = smtpPass;
      }
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this integration?')) return;
    await fetch(`/api/integrations?id=${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
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

  const handleSync = async (id: string) => {
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

  const resetForm = () => {
    setShowSetup(false);
    setSetupLabel('');
    setSetupEmail('');
    setSmtpHost('');
    setSmtpPort('587');
    setSmtpUser('');
    setSmtpPass('');
  };

  const operatorAccounts = accounts.filter(a => a.identity === 'operator');
  const agentAccounts = accounts.filter(a => a.identity === 'agent');

  const getServiceIcon = (service: string) => {
    return SERVICES.find(s => s.id === service)?.icon || '🔗';
  };

  const renderAccountCard = (account: IntegrationAccount) => (
    <div
      key={account.id}
      className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl">{getServiceIcon(account.service)}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {account.label || `${account.service} (${account.provider})`}
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            {account.emailAddress || account.provider}
            {account.lastSyncAt && (
              <> · Last sync: {new Date(account.lastSyncAt).toLocaleDateString()}</>
            )}
          </div>
          {testResult?.id === account.id && (
            <div className={cn('text-xs mt-1', testResult.ok ? 'text-green-400' : 'text-red-400')}>
              {testResult.ok ? '✓' : '✗'} {testResult.msg}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {account.service === 'email' && (
          <>
            <button
              onClick={() => handleTest(account.id)}
              disabled={testing === account.id}
              className="px-2 py-1 text-xs rounded bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors disabled:opacity-50"
            >
              {testing === account.id ? '...' : 'Test'}
            </button>
            <button
              onClick={() => handleSync(account.id)}
              disabled={syncing === account.id}
              className="px-2 py-1 text-xs rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-50"
            >
              {syncing === account.id ? 'Syncing...' : 'Sync'}
            </button>
          </>
        )}
        <button
          onClick={() => handleDelete(account.id)}
          className="px-2 py-1 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );

  const needsSmtp = setupProvider === 'smtp' || (setupProvider === 'google' && setupService === 'email');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Identities & Integrations</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Connect services for you (operator) and Divi (agent) separately.
          </p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="px-3 py-1.5 text-xs rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
        >
          + Add Integration
        </button>
      </div>

      {/* Operator section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">👤</span>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Operator (You)</h4>
        </div>
        {operatorAccounts.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] border-dashed text-center">
            No integrations configured. Add your email, calendar, or drive.
          </div>
        ) : (
          <div className="space-y-2">{operatorAccounts.map(renderAccountCard)}</div>
        )}
      </div>

      {/* Agent section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🤖</span>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Agent (Divi)</h4>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Give Divi its own email, calendar, and drive for independent operation.
        </p>
        {agentAccounts.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] border-dashed text-center">
            No agent integrations. Divi can operate with its own identity when configured.
          </div>
        ) : (
          <div className="space-y-2">{agentAccounts.map(renderAccountCard)}</div>
        )}
      </div>

      {/* Setup form */}
      {showSetup && (
        <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">New Integration</h4>
            <button onClick={resetForm} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>

          {/* Identity selector */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Identity</label>
            <div className="flex gap-2">
              {(['operator', 'agent'] as Identity[]).map(id => (
                <button
                  key={id}
                  onClick={() => setSetupIdentity(id)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs rounded-lg border transition-colors',
                    setupIdentity === id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  )}
                >
                  {id === 'operator' ? '👤 You (Operator)' : '🤖 Divi (Agent)'}
                </button>
              ))}
            </div>
          </div>

          {/* Service selector */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Service</label>
            <div className="flex gap-2">
              {SERVICES.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => setSetupService(svc.id)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs rounded-lg border transition-colors text-center',
                    setupService === svc.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  )}
                >
                  <div>{svc.icon}</div>
                  <div className="mt-1">{svc.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Provider selector */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Provider</label>
            <select
              value={setupProvider}
              onChange={e => setSetupProvider(e.target.value as Provider)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
            >
              {PROVIDERS.filter(p => p.services.includes(setupService)).map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Label (optional)</label>
            <input
              type="text"
              value={setupLabel}
              onChange={e => setSetupLabel(e.target.value)}
              placeholder={setupIdentity === 'agent' ? "Divi's Gmail" : 'My Work Email'}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Email address */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Email Address</label>
            <input
              type="email"
              value={setupEmail}
              onChange={e => setSetupEmail(e.target.value)}
              placeholder={setupIdentity === 'agent' ? 'divi@yourdomain.com' : 'you@yourdomain.com'}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* SMTP/IMAP credentials */}
          {needsSmtp && (
            <div className="space-y-3 p-3 bg-[var(--bg-primary)] rounded-lg">
              <p className="text-xs text-[var(--text-muted)]">
                {setupProvider === 'google'
                  ? 'For Gmail: use smtp.gmail.com with an App Password (Settings → Security → 2FA → App Passwords)'
                  : 'Enter your SMTP server details. IMAP host will be auto-detected for fetching.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono text-[10px] mb-1 block">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    placeholder={setupProvider === 'google' ? 'smtp.gmail.com' : 'smtp.example.com'}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="label-mono text-[10px] mb-1 block">Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
              <div>
                <label className="label-mono text-[10px] mb-1 block">Username</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  placeholder={setupEmail || 'your-email@gmail.com'}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label className="label-mono text-[10px] mb-1 block">
                  {setupProvider === 'google' ? 'App Password' : 'Password'}
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
          )}

          {/* Calendar/Drive placeholder */}
          {setupService !== 'email' && (
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg text-xs text-[var(--text-muted)] text-center">
              {setupProvider === 'google' || setupProvider === 'microsoft'
                ? 'OAuth integration for Calendar and Drive is coming soon. For now, use webhooks to sync events.'
                : 'Select Google or Microsoft for calendar/drive integration.'}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || (needsSmtp && (!smtpHost || !smtpUser || !smtpPass))}
            className="w-full py-2 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Integration'}
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]">
        <p className="font-medium text-[var(--text-secondary)] mb-1">Why two identities?</p>
        <p>
          The operator is you — your email, your calendar, your files.
          The agent (Divi) can have its own email address, its own calendar, and its own drive.
          This means Divi can send emails as itself, manage its own schedule, and store working files
          independently. Each identity has its own set of credentials.
        </p>
      </div>
    </div>
  );
}
