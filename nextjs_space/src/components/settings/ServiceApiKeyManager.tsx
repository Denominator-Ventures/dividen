'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ServiceKeyData {
  id: string;
  service: string;
  keyName: string;
  keyHint: string;
  createdAt: string;
  updatedAt?: string;
}

const SERVICE_PRESETS = [
  { value: 'sendgrid', label: 'SendGrid', icon: '📧', description: 'Email sending service' },
  { value: 'twilio', label: 'Twilio', icon: '📱', description: 'SMS and voice' },
  { value: 'slack', label: 'Slack', icon: '💬', description: 'Slack Bot Token' },
  { value: 'stripe', label: 'Stripe', icon: '💳', description: 'Payment processing' },
  { value: 'notion', label: 'Notion', icon: '📓', description: 'Notion API' },
  { value: 'airtable', label: 'Airtable', icon: '📊', description: 'Airtable API' },
  { value: 'github', label: 'GitHub', icon: '🐙', description: 'GitHub Personal Access Token' },
  { value: 'custom', label: 'Custom', icon: '🔧', description: 'Any other service' },
];

export function ServiceApiKeyManager() {
  const [keys, setKeys] = useState<ServiceKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState('sendgrid');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/service-keys');
      const data = await res.json();
      if (data.success) setKeys(data.data);
    } finally {
      setLoading(false);
    }
  };

  const addKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/service-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: newService,
          keyName: newKeyName,
          keyValue: newKeyValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKeys(prev => [data.data, ...prev]);
        setShowAdd(false);
        setNewKeyName('');
        setNewKeyValue('');
        setNewService('sendgrid');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    await fetch(`/api/service-keys/${id}`, { method: 'DELETE' });
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  if (loading) {
    return <div className="animate-pulse text-[var(--text-secondary)] text-sm">Loading service keys...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Store API keys for external services. Used by webhooks and action tags for outbound integrations.
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
        >
          + Add Key
        </button>
      </div>

      {/* Add Key Form */}
      {showAdd && (
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)] space-y-3">
          <h4 className="font-medium text-sm">Add Service API Key</h4>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Service</label>
            <div className="grid grid-cols-4 gap-2">
              {SERVICE_PRESETS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setNewService(s.value)}
                  className={cn(
                    'p-2 rounded-lg border text-center text-xs transition-colors',
                    newService === s.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  )}
                >
                  <div>{s.icon}</div>
                  <div className="mt-0.5">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Label</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production SendGrid Key"
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">API Key / Token</label>
            <input
              type="password"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder="Paste your API key here"
              className="input-field w-full text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addKey}
              disabled={!newKeyName.trim() || !newKeyValue.trim() || saving}
              className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Key'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm px-4 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            ⚠️ Keys are stored in the database. In production, ensure your database is encrypted.
          </p>
        </div>
      )}

      {/* Key List */}
      {keys.length === 0 ? (
        <div className="text-center py-6 text-[var(--text-muted)]">
          <p className="text-3xl mb-2">🔑</p>
          <p>No service API keys stored</p>
          <p className="text-sm mt-1">Add keys for services like SendGrid, Twilio, Slack, etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => {
            const preset = SERVICE_PRESETS.find(s => s.value === key.service);
            return (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{preset?.icon || '🔧'}</span>
                  <div>
                    <div className="text-sm font-medium">{key.keyName}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {preset?.label || key.service} · <code>{key.keyHint}</code>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
