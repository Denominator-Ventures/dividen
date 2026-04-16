'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface FedConfig {
  id: string;
  instanceName: string;
  instanceUrl: string | null;
  federationMode: string;
  allowInbound: boolean;
  allowOutbound: boolean;
  requireApproval: boolean;
  hasApiKey: boolean;
}

interface KnownInstance {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  isTrusted: boolean;
  lastSeenAt: string | null;
  platformLinked?: boolean;
  marketplaceEnabled?: boolean;
  discoveryEnabled?: boolean;
  updatesEnabled?: boolean;
  version?: string | null;
  lastSyncAt?: string | null;
}

interface NetworkStatus {
  connected: boolean;
  isPrimaryInstance: boolean;
  networkRole: string;
  instanceName?: string;
  instanceUrl?: string;
  connectedInstances?: number;
  features: { marketplace: boolean; discovery: boolean; relay: boolean; updates: boolean };
  message: string;
}

type WizardStep = 'idle' | 'configure' | 'registering' | 'success' | 'error';

interface PlatformLinkResult {
  instanceId: string;
  platformToken: string;
  endpoints: Record<string, string>;
  features: Record<string, boolean>;
  message: string;
}

export function FederationManager() {
  const [config, setConfig] = useState<FedConfig | null>(null);
  const [instances, setInstances] = useState<KnownInstance[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [showAddInstance, setShowAddInstance] = useState(false);

  // Connect to Network wizard state (only for self-hosted instances)
  const [wizardStep, setWizardStep] = useState<WizardStep>('idle');
  const [wizardError, setWizardError] = useState('');
  const [linkResult, setLinkResult] = useState<PlatformLinkResult | null>(null);
  const [wizardForm, setWizardForm] = useState({
    targetUrl: 'https://dividen.ai',
    enableMarketplace: true,
    enableDiscovery: true,
    enableUpdates: true,
  });

  const fetchNetworkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/network/status');
      if (res.ok) setNetworkStatus(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/federation/config');
      if (res.ok) setConfig(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await fetch('/api/federation/instances');
      if (res.ok) setInstances(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchNetworkStatus(), fetchConfig(), fetchInstances()]).finally(() => setLoading(false));
  }, [fetchNetworkStatus, fetchConfig, fetchInstances]);

  const updateConfig = async (updates: Partial<FedConfig> & { regenerateApiKey?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/federation/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) setConfig(await res.json());
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addInstance = async () => {
    if (!newInstanceName.trim() || !newInstanceUrl.trim()) return;
    try {
      await fetch('/api/federation/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInstanceName, baseUrl: newInstanceUrl }),
      });
      setNewInstanceName('');
      setNewInstanceUrl('');
      setShowAddInstance(false);
      fetchInstances();
    } catch (e) { console.error(e); }
  };

  const handleConnectToNetwork = async () => {
    if (!config?.instanceName || !config?.instanceUrl) {
      setWizardError('Set your Instance Name and Public URL above before connecting.');
      setWizardStep('error');
      return;
    }

    setWizardStep('registering');
    setWizardError('');

    try {
      // Step 1: Register with the managed platform
      const registerRes = await fetch(`${wizardForm.targetUrl}/api/v2/federation/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.instanceName,
          baseUrl: config.instanceUrl,
          apiKey: 'self-register', // Will be verified/created on the managed side
          version: '2.1.0',
          capabilities: {
            relay: true,
            marketplace: wizardForm.enableMarketplace,
            discovery: wizardForm.enableDiscovery,
            updates: wizardForm.enableUpdates,
          },
        }),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(err.error || `HTTP ${registerRes.status}`);
      }

      const result = await registerRes.json();
      setLinkResult(result);

      // Step 2: If marketplace is enabled, activate it
      if (wizardForm.enableMarketplace && result.platformToken) {
        await fetch(`${wizardForm.targetUrl}/api/v2/federation/marketplace-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.platformToken}`,
          },
          body: JSON.stringify({ action: 'enable' }),
        }).catch(() => {}); // Non-blocking
      }

      // Step 3: Update local federation config to reflect the connection
      await updateConfig({
        federationMode: config.federationMode === 'closed' ? 'allowlist' : config.federationMode,
        allowInbound: true,
        allowOutbound: true,
      });

      setWizardStep('success');
    } catch (err: any) {
      console.error('Connect to Network error:', err);
      setWizardError(err.message || 'Failed to connect to the managed platform.');
      setWizardStep('error');
    }
  };

  if (loading) {
    return <div className="animate-pulse text-[var(--text-muted)] text-sm py-4">Loading federation settings...</div>;
  }

  if (!config) return null;

  const isPrimary = networkStatus?.isPrimaryInstance === true;

  const MODE_OPTIONS = [
    { id: 'closed', label: 'Closed', desc: 'No external connections allowed. Single-org only.', icon: '🔒' },
    { id: 'allowlist', label: 'Allowlist', desc: 'Only pre-approved instances can connect.', icon: '📋' },
    { id: 'open', label: 'Open', desc: 'Any DiviDen instance can request a connection.', icon: '🌐' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Network Status Banner ── */}
      {networkStatus && (
        <div className={cn(
          'p-4 rounded-lg border',
          networkStatus.connected
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-yellow-500/5 border-yellow-500/20'
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', networkStatus.connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')} />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {networkStatus.connected ? '🌐 Connected to DiviDen Network' : '⚠ Not Connected'}
            </span>
            {isPrimary && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] font-medium">
                Primary Instance
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{networkStatus.message}</p>
          {networkStatus.connected && (
            <div className="flex gap-3 mt-3">
              {networkStatus.features.marketplace && <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400">🫧 Bubble Store</span>}
              {networkStatus.features.discovery && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">🔍 Discovery</span>}
              {networkStatus.features.relay && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">📡 Relay</span>}
              {networkStatus.features.updates && <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">📢 Updates</span>}
            </div>
          )}
          {isPrimary && (
            <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
              As the primary instance, you are the hub of the DiviDen network. All authenticated users are automatically connected. Federation settings below apply to external open-source instances connecting to this hub.
            </p>
          )}
        </div>
      )}

      {/* Instance Identity */}
      <div>
        <span className="label-mono text-[var(--text-muted)] text-[10px]">Instance Identity</span>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Instance Name</label>
            <input
              value={config.instanceName}
              onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
              onBlur={() => updateConfig({ instanceName: config.instanceName })}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              placeholder="e.g. Acme Corp DiviDen"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Public URL</label>
            <input
              value={config.instanceUrl || ''}
              onChange={(e) => setConfig({ ...config, instanceUrl: e.target.value })}
              onBlur={() => updateConfig({ instanceUrl: config.instanceUrl })}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              placeholder="https://dividen.yourcompany.com"
            />
          </div>
        </div>
      </div>

      {/* Federation Mode */}
      <div>
        <span className="label-mono text-[var(--text-muted)] text-[10px]">Federation Mode</span>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          {MODE_OPTIONS.map(m => (
            <button
              key={m.id}
              onClick={() => updateConfig({
                federationMode: m.id,
                allowInbound: m.id !== 'closed',
              })}
              disabled={saving}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                config.federationMode === m.id
                  ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                  : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[rgba(255,255,255,0.1)]'
              )}
            >
              <div className="text-lg mb-1">{m.icon}</div>
              <div className="text-xs font-medium text-[var(--text-primary)]">{m.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div>
        <span className="label-mono text-[var(--text-muted)] text-[10px]">Controls</span>
        <div className="mt-2 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowInbound}
              onChange={(e) => updateConfig({ allowInbound: e.target.checked })}
              className="rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--brand-primary)] focus:ring-brand-500/30"
            />
            <div>
              <span className="text-xs text-[var(--text-primary)]">Accept inbound connections</span>
              <p className="text-[10px] text-[var(--text-muted)]">Allow external instances to request connections to users on this instance</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowOutbound}
              onChange={(e) => updateConfig({ allowOutbound: e.target.checked })}
              className="rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--brand-primary)] focus:ring-brand-500/30"
            />
            <div>
              <span className="text-xs text-[var(--text-primary)]">Allow outbound connections</span>
              <p className="text-[10px] text-[var(--text-muted)]">Users can connect to people on external DiviDen instances</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireApproval}
              onChange={(e) => updateConfig({ requireApproval: e.target.checked })}
              className="rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--brand-primary)] focus:ring-brand-500/30"
            />
            <div>
              <span className="text-xs text-[var(--text-primary)]">Require admin approval</span>
              <p className="text-[10px] text-[var(--text-muted)]">Admin must approve new federated connections before they become active</p>
            </div>
          </label>
        </div>
      </div>

      {/* API Key */}
      <div>
        <span className="label-mono text-[var(--text-muted)] text-[10px]">Instance API Key</span>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-muted)] font-mono">
            {config.hasApiKey ? '••••••••••••••••' : 'No API key generated'}
          </div>
          <button
            onClick={() => updateConfig({ regenerateApiKey: true })}
            disabled={saving}
            className="px-3 py-2 text-[11px] rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Share this key with instances that need to authenticate inbound relay messages.
        </p>
      </div>

      {/* Connect to Network Wizard — only show for self-hosted (non-primary) instances */}
      {!isPrimary && (
      <div>
        <span className="label-mono text-[var(--text-muted)] text-[10px]">Connect to Network</span>
        <div className="mt-2 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
          {wizardStep === 'idle' && (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">🌐</div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Join the DiviDen Network</h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                    Connect this self-hosted instance to the DiviDen platform to access the agent marketplace,
                    network discovery feed, and unified updates. Your instance stays self-hosted — DiviDen acts
                    as a middle node for discovery and inter-instance communication.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWizardStep('configure')}
                className="w-full py-2.5 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors"
              >
                Start Connection Wizard →
              </button>
            </>
          )}

          {wizardStep === 'configure' && (
            <>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Configure Network Connection</h4>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">Managed Platform URL</label>
                  <input
                    value={wizardForm.targetUrl}
                    onChange={(e) => setWizardForm({ ...wizardForm, targetUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50 font-mono"
                    placeholder="https://dividen.ai"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">The managed DiviDen platform you want to connect to.</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Features to enable:</span>
                  {([
                    { key: 'enableMarketplace', label: 'Bubble Store', desc: 'List your agents on the Bubble Store and receive payouts', icon: '🫧' },
                    { key: 'enableDiscovery', label: 'Network Discovery', desc: 'Browse profiles, teams, and agents across the managed network', icon: '🔍' },
                    { key: 'enableUpdates', label: 'Unified Updates', desc: 'Pull changelog and platform updates from the managed instance', icon: '📢' },
                  ] as const).map(feat => (
                    <label key={feat.key} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <input
                        type="checkbox"
                        checked={wizardForm[feat.key]}
                        onChange={(e) => setWizardForm({ ...wizardForm, [feat.key]: e.target.checked })}
                        className="mt-0.5 rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--brand-primary)] focus:ring-brand-500/30"
                      />
                      <div>
                        <span className="text-xs text-[var(--text-primary)]">{feat.icon} {feat.label}</span>
                        <p className="text-[10px] text-[var(--text-muted)]">{feat.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pre-flight checks */}
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mb-4">
                <span className="text-[10px] text-[var(--text-muted)] label-mono">Pre-flight Check</span>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={config?.instanceName ? 'text-green-400' : 'text-red-400'}>{config?.instanceName ? '✓' : '✗'}</span>
                    <span className={config?.instanceName ? 'text-[var(--text-secondary)]' : 'text-red-400'}>Instance name: {config?.instanceName || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={config?.instanceUrl ? 'text-green-400' : 'text-red-400'}>{config?.instanceUrl ? '✓' : '✗'}</span>
                    <span className={config?.instanceUrl ? 'text-[var(--text-secondary)]' : 'text-red-400'}>Public URL: {config?.instanceUrl || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={config?.hasApiKey ? 'text-green-400' : 'text-yellow-400'}>{config?.hasApiKey ? '✓' : '⚠'}</span>
                    <span className="text-[var(--text-secondary)]">API key: {config?.hasApiKey ? 'Generated' : 'Will be generated'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setWizardStep('idle')}
                  className="flex-1 py-2 text-xs rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectToNetwork}
                  disabled={!config?.instanceName || !config?.instanceUrl}
                  className="flex-1 py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect to Network
                </button>
              </div>
            </>
          )}

          {wizardStep === 'registering' && (
            <div className="text-center py-6">
              <div className="text-3xl mb-3 animate-pulse">🔄</div>
              <p className="text-sm text-[var(--text-primary)]">Connecting to network...</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Registering instance and exchanging keys</p>
            </div>
          )}

          {wizardStep === 'success' && linkResult && (
            <>
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">✅</div>
                <h4 className="text-sm font-medium text-green-400">Connected to Network</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{linkResult.message}</p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mb-4 space-y-2">
                <div className="text-[10px] text-[var(--text-muted)] label-mono mb-2">Platform Token (save this)</div>
                <div className="px-3 py-2 text-[10px] bg-black/30 rounded font-mono text-[var(--text-secondary)] break-all select-all">
                  {linkResult.platformToken}
                </div>
                <p className="text-[10px] text-yellow-400/80">⚠ Store this token securely. You&apos;ll need it for all platform API calls.</p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mb-4">
                <div className="text-[10px] text-[var(--text-muted)] label-mono mb-2">Available Endpoints</div>
                <div className="space-y-1">
                  {Object.entries(linkResult.endpoints).map(([key, url]) => (
                    <div key={key} className="flex items-center gap-2 text-[11px]">
                      <span className="text-green-400">→</span>
                      <span className="text-[var(--text-muted)] w-24">{key}:</span>
                      <span className="font-mono text-[var(--text-secondary)] text-[10px]">{url}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mb-4">
                <div className="text-[10px] text-[var(--text-muted)] label-mono mb-2">Next Steps</div>
                <div className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                  <p>1. Add <code className="code-inline">DIVIDEN_PLATFORM_TOKEN</code> to your instance&apos;s <code className="code-inline">.env</code></p>
                  <p>2. Set up a cron job to call the heartbeat endpoint periodically</p>
                  <p>3. Your agents will appear in the managed marketplace within minutes</p>
                  <p>4. The updates feed will sync automatically</p>
                </div>
              </div>

              <button
                onClick={() => { setWizardStep('idle'); setLinkResult(null); }}
                className="w-full py-2 text-xs rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Done
              </button>
            </>
          )}

          {wizardStep === 'error' && (
            <>
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">❌</div>
                <h4 className="text-sm font-medium text-red-400">Connection Failed</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{wizardError}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setWizardStep('idle')}
                  className="flex-1 py-2 text-xs rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setWizardStep('configure')}
                  className="flex-1 py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Known Instances */}
      {config.federationMode !== 'closed' && (
        <div>
          <div className="flex items-center justify-between">
            <span className="label-mono text-[var(--text-muted)] text-[10px]">Known Instances ({instances.length})</span>
            <button
              onClick={() => setShowAddInstance(!showAddInstance)}
              className="text-[10px] label-mono px-2 py-1 rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25 transition-colors"
            >
              + Add Instance
            </button>
          </div>

          {showAddInstance && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <input
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="Instance name (e.g. Partner Corp)"
                className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
              <input
                value={newInstanceUrl}
                onChange={(e) => setNewInstanceUrl(e.target.value)}
                placeholder="Base URL (e.g. https://dividen.partner.com)"
                className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
              <button
                onClick={addInstance}
                className="w-full py-2 text-xs font-medium rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/80 transition-colors"
              >
                Add Instance
              </button>
            </div>
          )}

          <div className="mt-2 space-y-2">
            {instances.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] py-3">
                No known instances. Add instances you want to allow federated connections from.
              </p>
            ) : (
              instances.map(inst => (
                <div key={inst.id} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{inst.name}</span>
                      {inst.isTrusted && <span className="ml-2 text-[9px] text-green-400">✓ Trusted</span>}
                      {inst.platformLinked && <span className="ml-2 text-[9px] text-[var(--brand-primary)]">🌐 Linked</span>}
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{inst.baseUrl}</p>
                      {inst.platformLinked && (
                        <div className="flex gap-2 mt-1">
                          {inst.marketplaceEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">🫧 Bubble Store</span>}
                          {inst.discoveryEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">🔍 Discovery</span>}
                          {inst.updatesEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">📢 Updates</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        inst.isActive ? 'bg-green-400' : 'bg-gray-500'
                      )} />
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {inst.lastSeenAt ? `Last seen ${new Date(inst.lastSeenAt).toLocaleDateString()}` : 'Never connected'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
