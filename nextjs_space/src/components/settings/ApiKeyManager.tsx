'use client';

import { useState } from 'react';

interface ApiKey {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiKeyManagerProps {
  apiKeys: ApiKey[];
  onKeyAdded: (key: ApiKey) => void;
  onKeyDeleted?: (keyId: string) => void;
}

export function ApiKeyManager({ apiKeys, onKeyAdded, onKeyDeleted }: ApiKeyManagerProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    provider: 'openai',
    apiKey: '',
    label: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);

  // Auto-detect provider from key prefix
  const handleKeyChange = (value: string) => {
    const trimmed = value.trim();
    let detectedProvider = form.provider;
    let detected = false;

    if (trimmed.startsWith('sk-ant-')) {
      detectedProvider = 'anthropic';
      detected = true;
    } else if (trimmed.startsWith('sk-') && !trimmed.startsWith('sk-ant-')) {
      detectedProvider = 'openai';
      detected = true;
    }

    setForm({ ...form, apiKey: value, provider: detectedProvider });
    setAutoDetected(detected);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        onKeyAdded({
          ...data.data,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        setForm({ provider: 'openai', apiKey: '', label: '' });
        setAdding(false);
      } else {
        setError(data.error || 'Failed to add API key');
      }
    } catch {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Remove this API key? Divi will no longer be able to use it.')) return;
    setDeletingId(keyId);
    try {
      const res = await fetch(`/api/settings?id=${keyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onKeyDeleted?.(keyId);
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  // Only show active keys (inactive ones are superseded)
  const activeKeys = apiKeys.filter(k => k.isActive);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Add your API keys for GPT-4 (OpenAI) and Claude Sonnet (Anthropic) to
        enable Divi, your AI agent.
      </p>

      {/* Existing Keys */}
      {activeKeys.length > 0 && (
        <div className="space-y-2">
          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between bg-[var(--bg-surface)] rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <div>
                  <div className="text-sm font-medium capitalize">
                    {key.provider}
                    {key.label && (
                      <span className="text-[var(--text-muted)] font-normal">
                        {' '}— {key.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    •••••••• (hidden) · Active
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
                className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                title="Remove key"
              >
                {deletingId === key.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Form */}
      {adding ? (
        <form onSubmit={handleAdd} className="space-y-3 bg-[var(--bg-surface)] rounded-lg p-4">
          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              API Key
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              className="input-field"
              placeholder={form.provider === 'anthropic' ? 'sk-ant-api03-...' : 'sk-...'}
              required
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Paste your OpenAI or Anthropic API key — we&apos;ll auto-detect the provider.
              {activeKeys.some(k => k.provider === form.provider) && (
                <span className="text-amber-400"> Adding a new key will replace the existing {form.provider} key.</span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Provider
              {autoDetected && (
                <span className="ml-2 text-[11px] text-green-400 font-normal">
                  ✓ auto-detected
                </span>
              )}
            </label>
            <select
              value={form.provider}
              onChange={(e) => { setForm({ ...form, provider: e.target.value }); setAutoDetected(false); }}
              className="input-field"
            >
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="input-field"
              placeholder="My API Key"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Key'}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => { setAdding(false); setAutoDetected(false); }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="btn-secondary text-sm"
          onClick={() => setAdding(true)}
        >
          {activeKeys.length > 0 ? '+ Replace / Add Key' : '+ Add API Key'}
        </button>
      )}
    </div>
  );
}
