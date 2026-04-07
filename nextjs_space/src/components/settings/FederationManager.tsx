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
}

export function FederationManager() {
  const [config, setConfig] = useState<FedConfig | null>(null);
  const [instances, setInstances] = useState<KnownInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [showAddInstance, setShowAddInstance] = useState(false);

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
    Promise.all([fetchConfig(), fetchInstances()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchInstances]);

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

  if (loading) {
    return <div className="animate-pulse text-[var(--text-muted)] text-sm py-4">Loading federation settings...</div>;
  }

  if (!config) return null;

  const MODE_OPTIONS = [
    { id: 'closed', label: 'Closed', desc: 'No external connections allowed. Single-org only.', icon: '🔒' },
    { id: 'allowlist', label: 'Allowlist', desc: 'Only pre-approved instances can connect.', icon: '📋' },
    { id: 'open', label: 'Open', desc: 'Any DiviDen instance can request a connection.', icon: '🌐' },
  ];

  return (
    <div className="space-y-6">
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
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{inst.baseUrl}</p>
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
