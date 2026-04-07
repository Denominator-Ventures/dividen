'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WebhookData {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  url: string;
  secret: string;
  mappingRules: string | null;
  totalLogs: number;
  recentSuccess: number;
  recentErrors: number;
  lastTriggered: string | null;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  payload: string;
  status: string;
  statusCode: number;
  error: string | null;
  actionsRun: string | null;
  createdAt: string;
}

const WEBHOOK_TYPES = [
  { value: 'calendar', label: '📅 Calendar', description: 'Google Calendar, Outlook, Calendly events' },
  { value: 'email', label: '📧 Email', description: 'Gmail, Outlook, SendGrid notifications' },
  { value: 'transcript', label: '📝 Transcript', description: 'Otter.ai, Fireflies, meeting notes' },
  { value: 'generic', label: '🔗 Generic', description: 'Any custom integration or Zapier/Make' },
];

const SAMPLE_PAYLOADS: Record<string, object> = {
  calendar: {
    summary: 'Team Standup',
    description: 'Daily standup meeting',
    start: { dateTime: '2025-01-15T09:00:00Z' },
    end: { dateTime: '2025-01-15T09:30:00Z' },
    attendees: [
      { email: 'alice@example.com', displayName: 'Alice Johnson' },
      { email: 'bob@example.com', displayName: 'Bob Smith' },
    ],
  },
  email: {
    from: { name: 'Jane Doe', email: 'jane@example.com' },
    subject: 'Project Update',
    body: 'Hi, here is the latest update on the project...',
  },
  transcript: {
    title: 'Q1 Planning Meeting',
    transcript: 'Discussion about Q1 goals and resource allocation...',
    actionItems: [
      'Review budget proposal by Friday',
      'Schedule follow-up with engineering',
      'Prepare presentation for stakeholders',
    ],
    participants: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
    ],
  },
  generic: {
    event: 'new_form_submission',
    title: 'Contact Form - Lead',
    description: 'New lead from website contact form',
    data: { name: 'Alex Brown', email: 'alex@example.com', message: 'Interested in your product' },
  },
};

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('generic');
  const [creating, setCreating] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks-management');
      const data = await res.json();
      if (data.success) setWebhooks(data.data);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, type: newType }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchWebhooks();
        setShowCreate(false);
        setNewName('');
        setNewType('generic');
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await fetch(`/api/webhooks-management/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setWebhooks(prev =>
      prev.map(w => (w.id === id ? { ...w, isActive: !isActive } : w))
    );
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook? This cannot be undone.')) return;
    await fetch(`/api/webhooks-management/${id}`, { method: 'DELETE' });
    setWebhooks(prev => prev.filter(w => w.id !== id));
    if (selectedWebhook === id) setSelectedWebhook(null);
  };

  const fetchLogs = async (id: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/webhooks-management/${id}/logs`);
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } finally {
      setLoadingLogs(false);
    }
  };

  const testWebhook = async (webhook: WebhookData) => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = SAMPLE_PAYLOADS[webhook.type] || SAMPLE_PAYLOADS.generic;
      const res = await fetch(`/api/webhooks-management/${webhook.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh logs
      fetchLogs(webhook.id);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <div className="animate-pulse text-[var(--text-secondary)]">Loading webhooks...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Receive data from external services via webhooks. Connect Zapier, Make, n8n, or any service that supports webhooks.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
        >
          + New Webhook
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] space-y-3">
          <h4 className="font-medium text-sm">Create New Webhook</h4>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Google Calendar Sync"
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewType(t.value)}
                  className={cn(
                    'p-2 rounded-lg border text-left text-sm transition-colors',
                    newType === t.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
                  )}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createWebhook}
              disabled={!newName.trim() || creating}
              className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-sm px-4 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <p className="text-3xl mb-2">🔗</p>
          <p>No webhooks configured yet</p>
          <p className="text-sm mt-1">Create a webhook to start receiving data from external services</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]"
            >
              {/* Webhook Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    webhook.isActive ? 'bg-green-400' : 'bg-gray-500'
                  )} />
                  <h4 className="font-medium text-sm">{webhook.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    {WEBHOOK_TYPES.find(t => t.value === webhook.type)?.label || webhook.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                    className={cn(
                      'text-xs px-2 py-1 rounded transition-colors',
                      webhook.isActive
                        ? 'text-yellow-400 hover:bg-yellow-400/10'
                        : 'text-green-400 hover:bg-green-400/10'
                    )}
                  >
                    {webhook.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex gap-4 text-xs text-[var(--text-muted)] mb-3">
                <span>📊 {webhook.totalLogs} requests</span>
                {webhook.recentSuccess > 0 && (
                  <span className="text-green-400">✓ {webhook.recentSuccess} recent OK</span>
                )}
                {webhook.recentErrors > 0 && (
                  <span className="text-red-400">✗ {webhook.recentErrors} recent errors</span>
                )}
                {webhook.lastTriggered && (
                  <span>Last: {timeAgo(webhook.lastTriggered)}</span>
                )}
              </div>

              {/* URL & Secret */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-12 shrink-0">URL</span>
                  <code className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {webhook.url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                    className="text-xs text-brand-400 hover:text-brand-300 shrink-0"
                  >
                    {copiedField === `url-${webhook.id}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-12 shrink-0">Secret</span>
                  <code className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {webhook.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhook.secret, `secret-${webhook.id}`)}
                    className="text-xs text-brand-400 hover:text-brand-300 shrink-0"
                  >
                    {copiedField === `secret-${webhook.id}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => testWebhook(webhook)}
                  disabled={testing}
                  className="text-xs px-3 py-1.5 rounded bg-[var(--brand-primary)]/15 text-brand-400 hover:bg-[var(--brand-primary)]/20 disabled:opacity-50"
                >
                  {testing ? '⏳ Testing...' : '🧪 Test'}
                </button>
                <button
                  onClick={() => {
                    if (selectedWebhook === webhook.id) {
                      setSelectedWebhook(null);
                    } else {
                      setSelectedWebhook(webhook.id);
                      fetchLogs(webhook.id);
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  📋 {selectedWebhook === webhook.id ? 'Hide Logs' : 'View Logs'}
                </button>
              </div>

              {/* Test Result */}
              {testResult && selectedWebhook !== webhook.id && (
                <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded text-xs">
                  <div className="font-medium mb-1">
                    {testResult.success ? '✅ Test Successful' : '❌ Test Failed'}
                  </div>
                  <div className="text-[var(--text-muted)]">
                    {testResult.processed} action(s) executed
                  </div>
                  {testResult.results?.map((r: any, i: number) => (
                    <div key={i} className={cn('mt-1', r.success ? 'text-green-400' : 'text-red-400')}>
                      {r.success ? '✓' : '✗'} {r.action}{r.error ? `: ${r.error}` : ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Logs Panel */}
              {selectedWebhook === webhook.id && (
                <div className="mt-3 border-t border-[var(--border-primary)] pt-3">
                  <h5 className="text-xs font-medium text-[var(--text-muted)] mb-2">Recent Logs</h5>
                  {loadingLogs ? (
                    <div className="text-xs text-[var(--text-muted)] animate-pulse">Loading logs...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)]">No logs yet</div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 bg-[var(--bg-secondary)] rounded text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'font-medium',
                              log.status === 'success' ? 'text-green-400' : log.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                            )}>
                              {log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚠'} {log.status} ({log.statusCode})
                            </span>
                            <span className="text-[var(--text-muted)]">{timeAgo(log.createdAt)}</span>
                          </div>
                          {log.error && (
                            <div className="text-red-400 mt-1">{log.error}</div>
                          )}
                          {log.actionsRun && (
                            <div className="text-[var(--text-muted)] mt-1">
                              Actions: {JSON.parse(log.actionsRun).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
