'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ExternalKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

const PERMISSION_OPTIONS = [
  { id: 'queue', label: 'Queue', icon: '📋' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'kanban', label: 'Kanban', icon: '📊' },
  { id: 'contacts', label: 'Contacts', icon: '👤' },
];

export function ExternalKeyManager() {
  const [keys, setKeys] = useState<ExternalKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [allPerms, setAllPerms] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v2/keys');
      const data = await res.json();
      if (data.success) setKeys(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v2/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: allPerms ? 'all' : selectedPerms,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedKey(data.data.key);
        setNewKeyName('');
        setSelectedPerms([]);
        setAllPerms(true);
        setExpiresInDays('');
        fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch('/api/v2/keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchKeys();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete API key "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/v2/keys?id=${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatPerms = (perms: string): string => {
    if (perms === 'all') return 'All permissions';
    try {
      const arr = JSON.parse(perms);
      return arr.join(', ');
    } catch {
      return perms;
    }
  };

  const timeAgo = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <div className="text-[var(--text-secondary)] animate-pulse">Loading API keys...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Created key alert */}
      {createdKey && (
        <div className="p-4 bg-green-900/30 border border-green-600/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 font-semibold text-sm">✅ API Key Created</span>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-[var(--text-muted)] hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-[var(--bg-primary)] rounded text-sm font-mono text-green-300 break-all">
              {createdKey}
            </code>
            <button
              onClick={copyKey}
              className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white transition-colors"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">🔑</div>
          <p className="text-[var(--text-secondary)] mb-3">No Agent API keys yet</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Create an API key to allow external AI agents to connect to your DiviDen instance.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Generate API Key
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  key.isActive
                    ? 'bg-[var(--bg-tertiary)] border-[var(--border-primary)]'
                    : 'bg-[var(--bg-tertiary)]/50 border-[var(--border-primary)]/50 opacity-60'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{key.name}</span>
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        key.isActive
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      )}
                    >
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                    <code>{key.keyPrefix}</code>
                    <span>·</span>
                    <span>{formatPerms(key.permissions)}</span>
                    <span>·</span>
                    <span>{key.usageCount.toLocaleString()} calls</span>
                    <span>·</span>
                    <span>Last used: {timeAgo(key.lastUsedAt)}</span>
                    {key.expiresAt && (
                      <>
                        <span>·</span>
                        <span className={new Date(key.expiresAt) < new Date() ? 'text-red-400' : ''}>
                          {new Date(key.expiresAt) < new Date() ? 'Expired' : `Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggle(key.id, key.isActive)}
                    className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white transition-colors"
                    title={key.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {key.isActive ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => handleDelete(key.id, key.name)}
                    className="text-xs px-2 py-1 rounded hover:bg-red-600/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              + Generate New Key
            </button>
          )}
        </>
      )}

      {/* Create form */}
      {showForm && (
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)] space-y-3">
          <h4 className="font-medium text-sm">Generate New API Key</h4>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Research Agent, Sales Bot"
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Permissions</label>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={allPerms}
                  onChange={(e) => {
                    setAllPerms(e.target.checked);
                    if (e.target.checked) setSelectedPerms([]);
                  }}
                  className="rounded"
                />
                All permissions
              </label>
            </div>
            {!allPerms && (
              <div className="flex flex-wrap gap-2">
                {PERMISSION_OPTIONS.map((perm) => (
                  <label
                    key={perm.id}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm cursor-pointer border transition-colors',
                      selectedPerms.includes(perm.id)
                        ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(perm.id)}
                      onChange={(e) => {
                        setSelectedPerms(
                          e.target.checked
                            ? [...selectedPerms, perm.id]
                            : selectedPerms.filter((p) => p !== perm.id)
                        );
                      }}
                      className="hidden"
                    />
                    {perm.icon} {perm.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">
              Expiration (optional)
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Never expires</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim() || (!allPerms && selectedPerms.length === 0)}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {creating ? 'Generating...' : 'Generate Key'}
            </button>
            <button
              onClick={() => { setShowForm(false); setCreatedKey(null); }}
              className="text-sm text-[var(--text-secondary)] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
