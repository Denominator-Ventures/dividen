'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeToggle } from '@/components/settings/ModeToggle';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { MemoryPanel } from '@/components/dashboard/MemoryPanel';
import { ExternalKeyManager } from '@/components/settings/ExternalKeyManager';
import { WebhookManager } from '@/components/settings/WebhookManager';
import { ServiceApiKeyManager } from '@/components/settings/ServiceApiKeyManager';
import { IntegrationManager } from '@/components/settings/IntegrationManager';
import { InstallDesktopButton } from '@/components/InstallDesktopButton';
import { NotificationManager } from '@/components/settings/NotificationManager';
import { FederationManager } from '@/components/settings/FederationManager';
import RelaySettings from '@/components/settings/RelaySettings';
import PaymentSettings from '@/components/settings/PaymentSettings';
import { DiviSettings } from '@/components/settings/DiviSettings';
import { cn } from '@/lib/utils';
import { DragScrollContainer } from '@/components/ui/DragScrollContainer';

interface SettingsData {
  user: {
    id: string;
    name: string;
    email: string;
    username?: string | null;
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

type SettingsTab = 'divi' | 'general' | 'integrations' | 'network' | 'payments' | 'notifications' | 'learnings';

interface Learning {
  id: string;
  category: string;
  observation: string;
  confidence: number;
  isNew: boolean;
  source: string | null;
  evidence: string | null;
  dismissed: boolean;
  createdAt: string;
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['divi','general','integrations','network','payments','notifications','learnings'].includes(tab)) {
      return tab as SettingsTab;
    }
    return 'divi';
  });
  const [resettingWalkthrough, setResettingWalkthrough] = useState(false);

  // Learnings state
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [learningsLoading, setLearningsLoading] = useState(false);
  const [newLearningsCount, setNewLearningsCount] = useState(0);
  const [learningFilter, setLearningFilter] = useState<string>('all');
  const [editingLearning, setEditingLearning] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchLearnings = useCallback(async () => {
    setLearningsLoading(true);
    try {
      const res = await fetch('/api/learnings');
      if (res.ok) {
        const d = await res.json();
        setLearnings(d.learnings || []);
        setNewLearningsCount(d.newCount || 0);
      }
    } catch { /* ignore */ } finally { setLearningsLoading(false); }
  }, []);

  // Fetch learnings when tab is active
  useEffect(() => {
    if (activeTab === 'learnings') {
      fetchLearnings();
    }
  }, [activeTab, fetchLearnings]);

  // Mark as seen when viewing learnings tab
  useEffect(() => {
    if (activeTab === 'learnings' && newLearningsCount > 0) {
      const newIds = learnings.filter(l => l.isNew).map(l => l.id);
      if (newIds.length > 0) {
        fetch('/api/learnings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: newIds }) }).catch(() => {});
      }
    }
  }, [activeTab, learnings, newLearningsCount]);

  const handleDeleteLearning = async (id: string) => {
    const res = await fetch(`/api/learnings/${id}`, { method: 'DELETE' });
    if (res.ok) setLearnings(prev => prev.filter(l => l.id !== id));
  };

  const handleEditLearning = async (id: string) => {
    const res = await fetch(`/api/learnings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation: editText }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLearnings(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
      setEditingLearning(null);
    }
  };

  const handleDismissLearning = async (id: string) => {
    const res = await fetch(`/api/learnings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: true }),
    });
    if (res.ok) setLearnings(prev => prev.filter(l => l.id !== id));
  };

  const [fetchError, setFetchError] = useState(false);

  const loadSettings = useCallback(async (retries = 2) => {
    setLoading(true);
    setFetchError(false);
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) { setData(json.data); setLoading(false); break; }
        if (i === retries) { setFetchError(true); setLoading(false); }
      } catch {
        if (i === retries) { setFetchError(true); setLoading(false); }
        else await new Promise(r => setTimeout(r, 1000));
      }
    }
    // Fetch memory stats (non-critical, no retry needed)
    try {
      const memRes = await fetch('/api/memory');
      const memJson = await memRes.json();
      if (memJson.success) {
        const items = memJson.data || [];
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
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

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

  if (fetchError && !data) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-3xl opacity-40">⚠️</div>
        <p className="text-sm text-[var(--text-secondary)]">Failed to load settings. This may be a temporary connection issue.</p>
        <button onClick={() => loadSettings()} className="btn-primary text-sm px-4 py-2">Retry</button>
      </div>
    );
  }

  const TABS: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'divi', label: 'Your Divi', icon: '🤖' },
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'learnings', label: 'Learnings', icon: '🧠' },
    { id: 'notifications', label: 'Alerts', icon: '🔔' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure your DiviDen Command Center
        </p>
      </div>

      {/* Tab Navigation — horizontal scroll on mobile with drag-to-scroll */}
      <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
        <DragScrollContainer>
          <div className="flex gap-1 p-1 bg-[var(--bg-surface)] rounded-lg">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                  activeTab === tab.id
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </DragScrollContainer>
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

          {/* Username */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold">Username</h2>
            </div>
            <div className="panel-body">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Your unique @handle for mentions in chat. Others can tag you with <code className="text-brand-400 text-xs font-mono">@{data?.user?.username || 'yourname'}</code>.
              </p>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 text-sm">@</span>
                <input
                  type="text"
                  defaultValue={data?.user?.username || ''}
                  placeholder="e.g. jon"
                  className="input-field flex-1 text-sm"
                  maxLength={30}
                  onBlur={async (e) => {
                    const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
                    e.target.value = val;
                    const res = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username: val }),
                    });
                    if (res.ok) {
                      setData((prev: any) => prev ? { ...prev, user: { ...prev.user, username: val || null } } : prev);
                    } else {
                      const err = await res.json();
                      alert(err.error || 'Failed to update username');
                    }
                  }}
                />
              </div>
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
                      body: JSON.stringify({ hasSeenWalkthrough: false, hasCompletedOnboarding: false }),
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
                  setData((prev) => {
                    if (!prev) return prev;
                    // Deactivate old keys for the same provider (mirrors backend behavior)
                    const updated = prev.apiKeys.map(k =>
                      k.provider === key.provider ? { ...k, isActive: false } : k
                    );
                    return { ...prev, apiKeys: [...updated, key] };
                  });
                }}
                onKeyDeleted={(keyId) => {
                  setData((prev) =>
                    prev ? { ...prev, apiKeys: prev.apiKeys.filter(k => k.id !== keyId) } : prev
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

      {/* Your Divi Tab */}
      {activeTab === 'divi' && data?.user && (
        <DiviSettings
          diviName={(data.user as any).diviName || null}
          workingStyle={(data.user as any).workingStyle || null}
          triageSettings={(data.user as any).triageSettings || null}
          goalsEnabled={(data.user as any).goalsEnabled || false}
        />
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-fade-in">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">💳 Payment Settings</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your payment methods and developer payout settings for the Agent Marketplace.</p>
          </div>
          <PaymentSettings />
        </div>
      )}

      {/* Network Tab (Relay + Federation) */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="font-semibold">🌊 Relay Protocol</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Control how your Divi participates in agent-to-agent communication, ambient information
                  gathering, and reasoning transparency.
                </p>
              </div>
            </div>
            <div className="panel-body">
              <RelaySettings />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="font-semibold">🌐 Federation</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Network connection and cross-instance settings. DiviDen.ai is the primary hub — logged-in users are automatically connected. Federation is only needed for external open-source instances.
                  <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 ml-1">Read the Federation Guide →</a>
                </p>
              </div>
            </div>
            <div className="panel-body">
              <FederationManager />
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <>
          {/* Capabilities Quick Link */}
          <div className="panel">
            <div className="panel-header flex items-center justify-between">
              <div>
                <h2 className="font-semibold">⚡ Capabilities</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Skill packs that extend what Divi can do — browse, install, or create your own
                </p>
              </div>
              <a
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate to dashboard capabilities tab
                  window.location.href = '/dashboard?tab=capabilities';
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors whitespace-nowrap"
              >
                ⚡ Open Marketplace
              </a>
            </div>
          </div>

          {/* Identities & Integrations Section */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="font-semibold">🔗 Identities & Integrations</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Connect email, calendar, and drive for you and Divi independently
                </p>
              </div>
            </div>
            <div className="panel-body">
              <IntegrationManager />
            </div>
          </div>

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

      {/* Learnings Tab */}
      {activeTab === 'learnings' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="font-semibold">🧠 Intelligence Learnings</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Patterns Divi has learned from your interactions. Edit or dismiss any that don&apos;t feel right.
                  </p>
                </div>
                {newLearningsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {newLearningsCount} new
                  </span>
                )}
              </div>
            </div>

            {/* Category filter */}
            <div className="px-4 py-2 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto scrollbar-hide">
              {['all', 'interaction_pattern', 'response_style', 'capability_usage', 'scheduling'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setLearningFilter(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    learningFilter === cat
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {cat === 'all' ? 'All' : cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            <div className="panel-body">
              {learningsLoading ? (
                <div className="text-center py-8 text-[var(--text-muted)]">Loading learnings...</div>
              ) : learnings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🧠</div>
                  <p className="text-[var(--text-secondary)] text-sm">No learnings yet</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    As you use DiviDen, Divi will learn your patterns and preferences
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {learnings
                    .filter(l => learningFilter === 'all' || l.category === learningFilter)
                    .map(learning => (
                      <div key={learning.id} className="py-3 px-1 group">
                        <div className="flex items-start gap-2">
                          {learning.isNew && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {editingLearning === learning.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded p-2 text-sm resize-none"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleEditLearning(learning.id)} className="px-2 py-1 rounded text-xs bg-[var(--brand-primary)] text-white">Save</button>
                                  <button onClick={() => setEditingLearning(null)} className="px-2 py-1 rounded text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)]">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm">{learning.observation}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
                                    {learning.category.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {Math.round(learning.confidence * 100)}% confidence
                                  </span>
                                  {learning.source && (
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      via {learning.source}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {new Date(learning.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          {editingLearning !== learning.id && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => { setEditingLearning(learning.id); setEditText(learning.observation); }}
                                className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs"
                                title="Edit"
                              >✏️</button>
                              <button
                                onClick={() => handleDismissLearning(learning.id)}
                                className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs"
                                title="Dismiss"
                              >🚫</button>
                              <button
                                onClick={() => handleDeleteLearning(learning.id)}
                                className="p-1 rounded hover:bg-[var(--bg-surface)] text-red-400 text-xs"
                                title="Delete"
                              >🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Analytics summary */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="font-semibold text-sm">📊 Learning Summary</h2>
            </div>
            <div className="panel-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-xl font-bold">{learnings.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total Learnings</div>
                </div>
                <div className="text-center p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-xl font-bold">{learnings.filter(l => l.category === 'interaction_pattern').length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Interaction Patterns</div>
                </div>
                <div className="text-center p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-xl font-bold">{learnings.filter(l => l.category === 'response_style').length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Style Learnings</div>
                </div>
                <div className="text-center p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-xl font-bold">{learnings.filter(l => l.confidence >= 0.7).length}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">High Confidence</div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-3">
                Learnings are generated from your usage patterns and feed into Divi&apos;s NOW engine scoring, draft suggestions, and queue prioritization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="font-semibold">🔔 Cockpit Notifications</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Banner alerts that appear in your chat view when events happen
              </p>
            </div>
          </div>
          <div className="panel-body">
            <NotificationManager />
          </div>
        </div>
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
            <a href="https://github.com/Denominator-Ventures/dividen" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
              GitHub
            </a>
            <span>·</span>
            <a href="/docs/integrations" className="hover:text-brand-400 transition-colors">
              Docs
            </a>
            <span>·</span>
            <InstallDesktopButton className="hover:text-brand-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-[var(--text-muted)]">Loading settings...</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}