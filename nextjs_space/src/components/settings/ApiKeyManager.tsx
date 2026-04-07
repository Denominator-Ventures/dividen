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
}

export function ApiKeyManager({ apiKeys, onKeyAdded }: ApiKeyManagerProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    provider: 'openai',
    apiKey: '',
    label: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Add your API keys for GPT-4 (OpenAI) and Claude Sonnet (Anthropic) to
        enable AI agent features.
      </p>

      {/* Existing Keys */}
      {apiKeys.length > 0 && (
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    key.isActive ? 'bg-green-400' : 'bg-gray-500'
                  }`}
                />
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
                    •••••••• (hidden)
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  key.isActive
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}
              >
                {key.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Form */}
      {adding ? (
        <form onSubmit={handleAdd} className="space-y-3 bg-[var(--bg-tertiary)] rounded-lg p-4">
          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Provider
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className="input-field"
            >
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              API Key
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              className="input-field"
              placeholder="sk-..."
              required
            />
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
              onClick={() => setAdding(false)}
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
          + Add API Key
        </button>
      )}
    </div>
  );
}
