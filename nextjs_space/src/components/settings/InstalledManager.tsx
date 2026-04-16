'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */

interface InstalledAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  status: string;
  installedAt: string;
  subscriptionId?: string;
}

interface InstalledCapability {
  id: string;
  userCapabilityId: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  editableFields: string;
  customizations: string | null;
  resolvedPrompt: string | null;
  installedAt: string;
  lastUsedAt: string | null;
}

interface EditableField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

/* ── Helpers ───────────────────────────────────────────────── */

function parseEditableFields(raw?: string | null): EditableField[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── Component ─────────────────────────────────────────────── */

interface InstalledManagerProps {
  onNavigate?: (tab: string) => void;
}

export function InstalledManager({ onNavigate }: InstalledManagerProps) {
  const [agents, setAgents] = useState<InstalledAgent[]>([]);
  const [capabilities, setCapabilities] = useState<InstalledCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCap, setEditingCap] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [agentRes, capRes] = await Promise.all([
        fetch('/api/settings/installed-agents').then(r => r.ok ? r.json() : { agents: [] }).catch(() => ({ agents: [] })),
        fetch('/api/marketplace-capabilities?installed=true').then(r => r.ok ? r.json() : { capabilities: [] }).catch(() => ({ capabilities: [] })),
      ]);
      setAgents(agentRes.agents || []);
      setCapabilities(capRes.capabilities || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Agent actions ── */
  const uninstallAgent = async (agent: InstalledAgent) => {
    if (!confirm(`Uninstall "${agent.name}"? It will no longer run tasks for you.`)) return;
    try {
      // Unsubscribe by agent ID
      const res = await fetch(`/api/marketplace/${agent.id}/subscribe`, { method: 'DELETE' });
      if (res.ok) setAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch { /* ignore */ }
  };

  /* ── Capability actions ── */
  const uninstallCapability = async (id: string) => {
    if (!confirm('Uninstall this capability? Divi will no longer use it.')) return;
    try {
      const res = await fetch(`/api/marketplace-capabilities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCapabilities(prev => prev.filter(c => c.id !== id));
        setEditingCap(null);
      }
    } catch { /* ignore */ }
  };

  const startEdit = (cap: InstalledCapability) => {
    setEditingCap(cap.id);
    const fields = parseEditableFields(cap.editableFields);
    const existing = cap.customizations ? JSON.parse(cap.customizations) : {};
    const values: Record<string, string> = {};
    fields.forEach(f => { values[f.key] = existing[f.key] || ''; });
    setCustomValues(values);
  };

  const saveCustomizations = async (capId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/marketplace-capabilities/${capId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customizations: customValues }),
      });
      if (res.ok) {
        setEditingCap(null);
        await fetchAll();
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-[var(--text-muted)]">Loading installed items...</div>;
  }

  const totalInstalled = agents.length + capabilities.length;

  return (
    <div className="space-y-6">
      {/* ── Installed Agents ── */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold">🫧 Installed Agents</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Agents from the Bubble Store that run tasks on your behalf
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('marketplace')}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Open Bubble Store →
          </button>
        </div>
        <div className="panel-body">
          {agents.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-2">No agents installed yet.</p>
          ) : (
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{agent.icon || '🤖'}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{agent.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        {agent.category} · installed {timeAgo(agent.installedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => uninstallAgent(agent)}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Uninstall
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Installed Capabilities ── */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold">⚡ Installed Capabilities</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Prompt modules that extend what your Divi can do
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('capabilities')}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Open Capability Store →
          </button>
        </div>
        <div className="panel-body">
          {capabilities.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-2">No capabilities installed yet.</p>
          ) : (
            <div className="space-y-2">
              {capabilities.map(cap => {
                const fields = parseEditableFields(cap.editableFields);
                const isEditing = editingCap === cap.id;

                return (
                  <div key={cap.id} className="p-3 bg-[var(--bg-surface)] rounded-lg">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{cap.icon || '⚡'}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-[var(--text-primary)] truncate">{cap.name}</div>
                          <div className="text-xs text-[var(--text-muted)] truncate">
                            {cap.category} · installed {timeAgo(cap.installedAt)}
                            {cap.lastUsedAt ? ` · used ${timeAgo(cap.lastUsedAt)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fields.length > 0 && (
                          <button
                            onClick={() => isEditing ? setEditingCap(null) : startEdit(cap)}
                            className="text-xs text-[var(--text-muted)] hover:text-brand-400 transition-colors"
                          >
                            {isEditing ? 'Cancel' : 'Edit Rules'}
                          </button>
                        )}
                        <button
                          onClick={() => uninstallCapability(cap.id)}
                          className="text-xs text-red-400/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Uninstall
                        </button>
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && fields.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
                        <p className="text-xs text-[var(--text-muted)] mb-2">Customize rules for your use case:</p>
                        {fields.map(field => (
                          <div key={field.key}>
                            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                              {field.label}
                              {field.description && (
                                <span className="font-normal text-[var(--text-muted)] ml-1">— {field.description}</span>
                              )}
                            </label>
                            {field.type === 'select' && field.options ? (
                              <select
                                value={customValues[field.key] || ''}
                                onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="input-field text-sm w-full"
                              >
                                <option value="">Select...</option>
                                {field.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={customValues[field.key] || ''}
                                onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder || ''}
                                rows={3}
                                className="input-field text-sm w-full resize-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={customValues[field.key] || ''}
                                onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder || ''}
                                className="input-field text-sm w-full"
                              />
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingCap(null)}
                            className="text-xs px-3 py-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                          >Cancel</button>
                          <button
                            onClick={() => saveCustomizations(cap.id)}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors disabled:opacity-50"
                          >{saving ? 'Saving...' : 'Save Rules'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {totalInstalled === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-[var(--text-muted)]">Nothing installed yet</p>
          <div className="flex gap-2 justify-center mt-3">
            <button
              onClick={() => onNavigate?.('marketplace')}
              className="text-xs px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors"
            >🫧 Browse Agents</button>
            <button
              onClick={() => onNavigate?.('capabilities')}
              className="text-xs px-4 py-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 transition-colors"
            >⚡ Browse Capabilities</button>
          </div>
        </div>
      )}
    </div>
  );
}
