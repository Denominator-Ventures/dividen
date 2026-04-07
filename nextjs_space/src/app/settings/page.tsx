'use client';

import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/settings/ModeToggle';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { MemoryPanel } from '@/components/dashboard/MemoryPanel';
import { ExternalKeyManager } from '@/components/settings/ExternalKeyManager';
import { WebhookManager } from '@/components/settings/WebhookManager';
import { ServiceApiKeyManager } from '@/components/settings/ServiceApiKeyManager';
import { cn } from '@/lib/utils';

interface SettingsData {
  user: {
    id: string;
    name: string;
    email: string;
    mode: string;
    role: string;
  };
  apiKeys: Array<{
    id: string;
    provider: string;
    label: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
}

interface MemoryStats {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  pinned: number;
  approved: number;
  pending: number;
}

type SettingsTab = 'general' | 'integrations';

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [resettingWalkthrough, setResettingWalkthrough] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));

    // Fetch memory stats
    fetch('/api/memory')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          const items = res.data || [];
          setMemoryStats({
            total: items.length,
            tier1: items.filter((i: any) => i.tier === 1).length,
            tier2: items.filter((i: any) => i.tier === 2).length,
            tier3: items.filter((i: any) => i.tier === 3).length,
            pinned: items.filter((i: any) => i.pinned).length,
            approved: items.filter((i: any) => i.approved === true).length,
            pending: items.filter((i: any) => i.tier === 3 && i.approved === null).length,
          });
        }
      });
  }, []);

  const handleClearOldMemories = async () => {
    if (!confirm('This will delete all Tier 3 patterns with confidence below 0.3. Continue?')) return;
    setClearingMemory(true);
    try {
      const res = await fetch('/api/memory?tier=3');
      const data = await res.json();
      if (data.success) {
        const lowConfidence = data.data.filter((i: any) => (i.confidence || 0) < 0.3);
        for (const item of lowConfidence) {
          await fetch(`/api/memory/${item.id}`, { method: 'DELETE' });
        }
        window.location.reload();
      }
    } finally {
      setClearingMemory(false);
    }
  };

  const handleExportMemory = async () => {
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dividen-memory-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-[var(--text-secondary)]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure your DiviDen Command Center
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[var(--bg-surface)] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'general'
              ? 'bg-[var(--brand-primary)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          ⚙️ General
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'integrations'
              ? 'bg-[var(--brand-primary)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          🔗 Integrations
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <>
          {/* Mode Toggle */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold">Operating Mode</h2>
            </div>
            <div className="panel-body">
              <ModeToggle
                currentMode={(data?.user?.mode as 'cockpit' | 'chief_of_staff') || 'cockpit'}
                onModeChange={async (mode) => {
                  await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode }),
                  });
                  setData((prev) =>
                    prev ? { ...prev, user: { ...prev.user, mode } } : prev
                  );
                }}
              />
            </div>
          </div>

          {/* Guided Walkthrough */}
          <div className="panel">
            <div className="panel-header flex items-center justify-between">
              <h2 className="font-semibold">Guided Walkthrough</h2>
            </div>
            <div className="panel-body">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Take a guided tour of the DiviDen Command Center to learn about all the key features and how to get started.
              </p>
              <button
                onClick={async () => {
                  setResettingWalkthrough(true);
                  try {
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hasSeenWalkthrough: false }),
                    });
                    window.location.href = '/dashboard';
                  } catch {
                    setResettingWalkthrough(false);
                  }
                }}
                disabled={resettingWalkthrough}
                className="text-sm px-4 py-2 bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--brand-primary)]/15 text-[var(--text-secondary)] hover:text-brand-400 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {resettingWalkthrough ? 'Redirecting...' : 'Restart Walkthrough'}
              </button>
            </div>
          </div>

          {/* Memory Management */}
          <div className="panel">
            <div className="panel-header flex items-center justify-between">
              <h2 className="font-semibold">Memory Management</h2>
              <button
                onClick={() => setShowMemoryManager(!showMemoryManager)}
                className="text-sm text-brand-400 hover:text-brand-300"
              >
                {showMemoryManager ? 'Hide Manager' : 'Open Manager'}
              </button>
            </div>
            <div className="panel-body">
              {memoryStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-center">
                    <div className="text-2xl font-bold text-brand-400">{memoryStats.total}</div>
                    <div className="text-xs text-[var(--text-muted)]">Total Items</div>
                  </div>
                  <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400">{memoryStats.tier1}</div>
                    <div className="text-xs text-[var(--text-muted)]">📌 Facts</div>
                  </div>
                  <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-center">
                    <div className="text-2xl font-bold text-brand-400">{memoryStats.tier2}</div>
                    <div className="text-xs text-[var(--text-muted)]">📏 Rules</div>
                  </div>
                  <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">{memoryStats.tier3}</div>
                    <div className="text-xs text-[var(--text-muted)]">🧠 Patterns</div>
                  </div>
                </div>
              )}

              {memoryStats && (memoryStats.pinned > 0 || memoryStats.pending > 0) && (
                <div className="flex gap-4 mb-4 text-sm text-[var(--text-secondary)]">
                  {memoryStats.pinned > 0 && <span>📌 {memoryStats.pinned} pinned</span>}
                  {memoryStats.approved > 0 && <span>✓ {memoryStats.approved} approved</span>}
                  {memoryStats.pending > 0 && (
                    <span className="text-yellow-400">⏳ {memoryStats.pending} pending review</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleExportMemory}
                  className="text-sm px-3 py-1.5 bg-[var(--bg-surface)] rounded-md hover:bg-[var(--brand-primary)]/15 text-[var(--text-secondary)] hover:text-brand-400 transition-colors"
                >
                  📤 Export All
                </button>
                <button
                  onClick={handleClearOldMemories}
                  disabled={clearingMemory}
                  className="text-sm px-3 py-1.5 bg-[var(--bg-surface)] rounded-md hover:bg-red-600/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {clearingMemory ? '🔄 Clearing...' : '🗑 Clear Low-Confidence'}
                </button>
              </div>

              {showMemoryManager && (
                <div className="mt-4 border-t border-[var(--border-primary)] pt-4 h-[500px]">
                  <MemoryPanel />
                </div>
              )}
            </div>
          </div>

          {/* Agent API Keys (v2) */}
          <div className="panel">
            <div className="panel-header flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Agent API Keys</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Bearer tokens for external AI agents to connect via the v2 API
                </p>
              </div>
              <a
                href="/api/v2/docs"
                target="_blank"
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                📄 API Docs
              </a>
            </div>
            <div className="panel-body">
              <ExternalKeyManager />
            </div>
          </div>

          {/* AI Provider API Keys */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold">AI Provider API Keys</h2>
            </div>
            <div className="panel-body">
              <ApiKeyManager
                apiKeys={data?.apiKeys || []}
                onKeyAdded={(key) => {
                  setData((prev) =>
                    prev ? { ...prev, apiKeys: [...prev.apiKeys, key] } : prev
                  );
                }}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold">Account</h2>
            </div>
            <div className="panel-body space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Name</span>
                <span>{data?.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Email</span>
                <span>{data?.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Role</span>
                <span className="capitalize">{data?.user?.role}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <>
          {/* Webhooks Section */}
          <div className="panel">
            <div className="panel-header flex items-center justify-between">
              <div>
                <h2 className="font-semibold">🔗 Webhooks</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Receive data from external services (Zapier, Make, n8n, custom integrations)
                </p>
              </div>
              <a
                href="/docs/integrations"
                target="_blank"
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                📖 Integration Guide
              </a>
            </div>
            <div className="panel-body">
              <WebhookManager />
            </div>
          </div>

          {/* Service API Keys Section */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="font-semibold">🔑 Service API Keys</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Store credentials for external services (SendGrid, Twilio, Slack, etc.)
                </p>
              </div>
            </div>
            <div className="panel-body">
              <ServiceApiKeyManager />
            </div>
          </div>

          {/* Integration Help */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold">📚 Quick Setup Guide</h2>
            </div>
            <div className="panel-body space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-brand-400 mb-1">How Webhooks Work</h4>
                <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
                  <li>Create a webhook above and choose a type (Calendar, Email, Transcript, or Generic)</li>
                  <li>Copy the webhook URL and secret</li>
                  <li>Configure your external service (Zapier, Make, etc.) to send data to the URL</li>
                  <li>DiviDen automatically creates tasks, contacts, and cards from incoming data</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-brand-400 mb-1">Authentication Methods</h4>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
                  <li><code className="text-xs bg-[var(--bg-surface)] px-1 rounded">?secret=YOUR_SECRET</code> — Query parameter (simplest)</li>
                  <li><code className="text-xs bg-[var(--bg-surface)] px-1 rounded">X-Webhook-Secret: YOUR_SECRET</code> — Header-based</li>
                  <li><code className="text-xs bg-[var(--bg-surface)] px-1 rounded">X-Webhook-Signature: sha256=...</code> — HMAC-SHA256 signature</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-brand-400 mb-1">Popular Integrations</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[var(--bg-surface)] rounded text-xs">
                    <span className="font-medium">📅 Google Calendar → DiviDen</span>
                    <p className="text-[var(--text-muted)] mt-0.5">Auto-create tasks from calendar events via Zapier</p>
                  </div>
                  <div className="p-2 bg-[var(--bg-surface)] rounded text-xs">
                    <span className="font-medium">📧 Gmail → DiviDen</span>
                    <p className="text-[var(--text-muted)] mt-0.5">Create contacts and tasks from important emails</p>
                  </div>
                  <div className="p-2 bg-[var(--bg-surface)] rounded text-xs">
                    <span className="font-medium">📝 Otter.ai → DiviDen</span>
                    <p className="text-[var(--text-muted)] mt-0.5">Extract action items from meeting transcripts</p>
                  </div>
                  <div className="p-2 bg-[var(--bg-surface)] rounded text-xs">
                    <span className="font-medium">🔗 Custom → DiviDen</span>
                    <p className="text-[var(--text-muted)] mt-0.5">Any service that can send HTTP POST webhooks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* System Info Footer */}
      <div className="mt-8 pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="font-mono">DiviDen v0.1.0</span>
            <span>·</span>
            <span>Next.js 14</span>
            <span>·</span>
            <span>PostgreSQL</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com/jonnyuniverse/dividenapp" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
              GitHub
            </a>
            <span>·</span>
            <a href="/docs/integrations" className="hover:text-brand-400 transition-colors">
              Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
