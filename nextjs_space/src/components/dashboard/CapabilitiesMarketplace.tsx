'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */

interface MarketplaceCapability {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  icon: string;
  category: string;
  tags: string;
  integrationType: string;
  pricingModel: string;
  price: number;
  editableFields: string;
  status: string;
  featured: boolean;
  totalPurchases: number;
  avgRating: number;
  totalRatings: number;
  installed?: boolean;
  integrationConnected?: boolean;
  isSystemSeed?: boolean;
  prompt?: string;
  customizations?: string | null;
  resolvedPrompt?: string | null;
  userCapabilityId?: string;
  installedAt?: string;
  lastUsedAt?: string | null;
  hasAccessPassword?: boolean;
  publisherName?: string;
  publisherType?: string;
  publisherUrl?: string;
  skillFormat?: boolean;
  skillSource?: string;
  accessPassword?: string | null;
  isOwner?: boolean;
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

/* ── Constants ─────────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'all', label: 'All', icon: '🔮' },
  { value: 'productivity', label: 'Productivity', icon: '⚡' },
  { value: 'sales', label: 'Sales', icon: '💰' },
  { value: 'finance', label: 'Finance', icon: '📊' },
  { value: 'hr', label: 'HR', icon: '👥' },
  { value: 'operations', label: 'Ops', icon: '🔧' },
  { value: 'engineering', label: 'Engineering', icon: '🛠' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'communications', label: 'Comms', icon: '💬' },
  { value: 'custom', label: 'Custom', icon: '🎯' },
];

const INTEGRATION_TYPES = [
  { value: '', label: 'None (Broad)' },
  { value: 'email', label: '📧 Email' },
  { value: 'calendar', label: '📅 Calendar' },
  { value: 'slack', label: '💬 Slack' },
  { value: 'crm', label: '📊 CRM' },
  { value: 'transcript', label: '🎤 Transcript' },
  { value: 'payments', label: '💳 Payments' },
  { value: 'generic', label: '🔗 Generic Webhook' },
];

const INTEGRATION_BADGES: Record<string, { label: string; color: string }> = {
  webhook: { label: 'Webhook', color: 'text-blue-400 bg-blue-500/15 border-blue-500/25' },
  api: { label: 'API', color: 'text-purple-400 bg-purple-500/15 border-purple-500/25' },
  native: { label: 'Native', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' },
  email: { label: 'Email', color: 'text-amber-400 bg-amber-500/15 border-amber-500/25' },
  calendar: { label: 'Calendar', color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25' },
  slack: { label: 'Slack', color: 'text-purple-400 bg-purple-500/15 border-purple-500/25' },
  crm: { label: 'CRM', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' },
  transcript: { label: 'Transcript', color: 'text-pink-400 bg-pink-500/15 border-pink-500/25' },
  payments: { label: 'Payments', color: 'text-green-400 bg-green-500/15 border-green-500/25' },
  generic: { label: 'Webhook', color: 'text-blue-400 bg-blue-500/15 border-blue-500/25' },
};

/* ── Component ─────────────────────────────────────────────── */

interface CapabilitiesMarketplaceProps {
  onStartGuidedChat?: (message: string) => void;
}

export function CapabilitiesMarketplace({ onStartGuidedChat }: CapabilitiesMarketplaceProps) {
  const [view, setView] = useState<'browse' | 'installed' | 'create'>('browse');
  const [capabilities, setCapabilities] = useState<MarketplaceCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<MarketplaceCapability | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  // Password state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '', description: '', icon: '⚡', category: 'custom',
    integrationType: '', pricingModel: 'free', price: 0, prompt: '',
    tags: '', editableFields: '[]', accessPassword: '', commands: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (view === 'installed') params.set('installed', 'true');
      else if (view === 'browse') {
        if (category !== 'all') params.set('category', category);
        if (search) params.set('search', search);
      }
      const res = await fetch(`/api/marketplace-capabilities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data.capabilities || []);
      }
    } catch (e) {
      console.error('Failed to fetch capabilities:', e);
    } finally {
      setLoading(false);
    }
  }, [view, category, search]);

  useEffect(() => {
    if (view !== 'create') fetchCapabilities();
  }, [fetchCapabilities, view]);

  const handleInstall = async (capId: string, password?: string) => {
    setInstalling(capId);
    setInstallError(null);
    setPasswordError('');
    try {
      const payload: any = { capabilityId: capId };
      if (password) payload.accessPassword = password;
      const res = await fetch('/api/marketplace-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPasswordInput('');
        setShowPasswordInput(false);
        // Find the capability name for the guided chat
        const cap = capabilities.find(c => c.id === capId) || selected;
        setSelected(null);

        // Launch guided chat with Divi for configuration
        if (onStartGuidedChat && cap) {
          const fields = parseEditableFields(cap.editableFields);
          const fieldList = fields.length > 0
            ? `It has ${fields.length} configurable fields: ${fields.map(f => f.label).join(', ')}.`
            : '';
          onStartGuidedChat(
            `I just installed the "${cap.name}" capability. ${fieldList} Help me configure it for my specific needs and use case.`
          );
        } else {
          await fetchCapabilities();
        }
      } else {
        const err = await res.json();
        if (err.code === 'INTEGRATION_REQUIRED') {
          setInstallError(err.error);
        } else if (err.code === 'PAYMENT_REQUIRED') {
          if (password) {
            setPasswordError('Incorrect password');
          } else if (err.hasAccessPassword) {
            setShowPasswordInput(true);
            setInstallError(`This capability costs $${(err.price || 0).toFixed(2)}. Enter the developer access password to install for free.`);
          } else {
            setInstallError(err.error);
          }
        } else {
          setInstallError(err.error || 'Install failed');
        }
      }
    } catch (e) {
      console.error('Install failed:', e);
      setInstallError('Network error');
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (capId: string) => {
    if (!confirm('Uninstall this capability? Divi will no longer use it for tasks.')) return;
    try {
      const res = await fetch(`/api/marketplace-capabilities/${capId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelected(null);
        setEditingId(null);
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Uninstall failed:', e);
    }
  };

  const startEdit = (cap: MarketplaceCapability) => {
    setEditingId(cap.id);
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
        setEditingId(null);
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.description || !createForm.prompt) return;
    setCreating(true);
    try {
      const res = await fetch('/api/marketplace-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...createForm }),
      });
      if (res.ok) {
        setCreateForm({ name: '', description: '', icon: '⚡', category: 'custom', integrationType: '', pricingModel: 'free', price: 0, prompt: '', tags: '', editableFields: '[]', accessPassword: '', commands: '' });
        setView('installed');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create capability');
      }
    } catch (e) {
      console.error('Create failed:', e);
    } finally {
      setCreating(false);
    }
  };

  const parseEditableFields = (raw: string): EditableField[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  /* ── Browse Card ──────────────────────────────────────────── */
  const BrowseCard = ({ cap }: { cap: MarketplaceCapability }) => {
    const fields = parseEditableFields(cap.editableFields);
    const tags = cap.tags ? cap.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const intBadge = INTEGRATION_BADGES[cap.integrationType] || INTEGRATION_BADGES.generic;
    const needsIntegration = cap.integrationType && cap.integrationType !== 'generic' && cap.integrationType !== '';
    const locked = needsIntegration && !cap.integrationConnected && !cap.installed;

    return (
      <button
        onClick={() => { setInstallError(null); setSelected(cap); }}
        className={cn(
          'text-left bg-white/[0.03] hover:bg-white/[0.06] border rounded-xl p-4 transition-all group',
          locked ? 'border-amber-500/20 hover:border-amber-500/30' : 'border-white/[0.06] hover:border-white/[0.12]'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl flex-shrink-0">{cap.icon}</span>
            <div className="min-w-0">
              <h3 className="font-medium text-white/90 truncate group-hover:text-brand-400 transition-colors">
                {cap.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {needsIntegration && (
                  <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', intBadge?.color)}>
                    {intBadge?.label}
                  </span>
                )}
                {locked && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">🔒 Requires Integration</span>
                )}
                {cap.featured && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">⭐ Featured</span>
                )}
                {cap.skillFormat && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">🧩 Agent Skill</span>
                )}
              </div>
            </div>
          </div>
          {cap.installed ? (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">Installed</span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex-shrink-0">
              {cap.price === 0 || !cap.price ? 'Free' : `$${cap.price}`}
            </span>
          )}
        </div>

        <p className="text-xs text-white/50 mt-2 line-clamp-2">{cap.description}</p>

        <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
          {cap.publisherName && <span>{cap.publisherType === 'platform' ? '🏢' : '👤'} by {cap.publisherName}</span>}
          <span>📦 {cap.totalPurchases} installs</span>
          {fields.length > 0 && <span>🔧 {fields.length} customizable</span>}
          {!needsIntegration && <span>🌐 Broad</span>}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
      </button>
    );
  };

  /* ── Installed Card ──────────────────────────────────────── */
  const InstalledCard = ({ cap }: { cap: MarketplaceCapability }) => {
    const fields = parseEditableFields(cap.editableFields);
    const isEditing = editingId === cap.id;

    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{cap.icon}</span>
            <div>
              <h3 className="font-medium text-white/90">{cap.name}</h3>
              <p className="text-xs text-white/40 mt-0.5">{cap.category}{cap.integrationType && cap.integrationType !== 'generic' ? ` · ${cap.integrationType}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditing && fields.length > 0 && (
              <button
                onClick={() => startEdit(cap)}
                className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 border border-white/10 transition-colors"
              >✏️ Customize</button>
            )}
            <button
              onClick={() => handleUninstall(cap.id)}
              className="text-[10px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20 transition-colors"
            >Uninstall</button>
          </div>
        </div>

        <p className="text-xs text-white/50 mt-2">{cap.description}</p>

        {isEditing && fields.length > 0 && (
          <div className="mt-4 space-y-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <div className="text-xs font-medium text-white/60 mb-2">⚙️ Customize Fields</div>
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-[11px] text-white/50 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {field.description && <p className="text-[10px] text-white/25 mb-1">{field.description}</p>}
                {field.type === 'select' && field.options ? (
                  <select
                    value={customValues[field.key] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-brand-500/50"
                  >
                    <option value="">Select...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={customValues[field.key] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={customValues[field.key] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => saveCustomizations(cap.id)}
                disabled={saving}
                className="text-[11px] px-3 py-1.5 rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 border border-brand-500/30 transition-colors disabled:opacity-50"
              >{saving ? 'Saving...' : '💾 Save'}</button>
              <button
                onClick={() => setEditingId(null)}
                className="text-[11px] px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 transition-colors"
              >Cancel</button>
            </div>
          </div>
        )}

        {!isEditing && cap.resolvedPrompt && (
          <details className="mt-3">
            <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50 transition-colors">View active prompt</summary>
            <pre className="mt-2 text-[10px] text-white/40 bg-white/[0.02] p-2 rounded border border-white/[0.04] whitespace-pre-wrap max-h-32 overflow-y-auto">
              {cap.resolvedPrompt}
            </pre>
          </details>
        )}

        {cap.installedAt && (
          <div className="text-[10px] text-white/20 mt-2">Installed {new Date(cap.installedAt).toLocaleDateString()}</div>
        )}
      </div>
    );
  };

  /* ── Detail Modal ─────────────────────────────────────────── */
  const DetailModal = ({ cap }: { cap: MarketplaceCapability }) => {
    const fields = parseEditableFields(cap.editableFields);
    const tags = cap.tags ? cap.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const intBadge = INTEGRATION_BADGES[cap.integrationType] || null;
    const needsIntegration = cap.integrationType && cap.integrationType !== 'generic' && cap.integrationType !== '';
    const locked = needsIntegration && !cap.integrationConnected && !cap.installed;
    const isPaid = cap.pricingModel === 'one_time' && (cap.price || 0) > 0;

    const closeModal = () => {
      setSelected(null);
      setInstallError(null);
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordInput(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          onClick={e => e.stopPropagation()}
          className="relative bg-[#0d0d12] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cap.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white/90">{cap.name}</h2>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {intBadge && (
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', intBadge.color)}>
                      {intBadge.label}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30">{cap.category}</span>
                  {locked && <span className="text-[10px] text-amber-400">🔒 Integration required</span>}
                  {cap.featured && <span className="text-[10px]">⭐</span>}
                  {isPaid && !cap.installed && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">${(cap.price || 0).toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={closeModal} className="text-white/30 hover:text-white/60 text-lg">✕</button>
          </div>

          <p className="text-sm text-white/60 mt-4">{cap.longDescription || cap.description}</p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map(tag => (
                <span key={tag} className="text-[10px] text-white/35 bg-white/[0.05] px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Integration warning */}
          {locked && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                🔒 This capability requires an active <strong>{cap.integrationType}</strong> integration.
              </p>
              <p className="text-[10px] text-amber-400/60 mt-1">
                Go to Settings → Integrations to connect {cap.integrationType} first.
              </p>
            </div>
          )}

          {/* Owner: show access password */}
          {cap.isOwner && cap.accessPassword && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔑</span>
                <span className="text-xs font-medium text-white/50">Access Password:</span>
                <code className="text-xs text-brand-400 bg-white/5 px-2 py-0.5 rounded font-mono">{cap.accessPassword}</code>
              </div>
              <p className="text-[10px] text-white/30 mt-1">Share this with people you want to give free access to this capability.</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.05]">
              <div className="text-lg font-semibold text-white/80">{cap.totalPurchases}</div>
              <div className="text-[10px] text-white/30">Installs</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.05]">
              <div className="text-lg font-semibold text-white/80">{cap.avgRating > 0 ? cap.avgRating.toFixed(1) : '—'}</div>
              <div className="text-[10px] text-white/30">Rating</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.05]">
              <div className="text-lg font-semibold text-white/80">{fields.length}</div>
              <div className="text-[10px] text-white/30">Custom Fields</div>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-white/50 mb-2">Customizable after install:</h4>
              <div className="space-y-1.5">
                {fields.map(f => (
                  <div key={f.key} className="flex items-center gap-2 text-xs">
                    <span className="text-white/20">🔧</span>
                    <span className="text-white/60">{f.label}</span>
                    <span className="text-[10px] text-white/20">({f.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cap.installed && cap.prompt && (
            <details className="mt-4">
              <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">View prompt template</summary>
              <pre className="mt-2 text-[10px] text-white/40 bg-white/[0.02] p-3 rounded border border-white/[0.04] whitespace-pre-wrap max-h-48 overflow-y-auto">
                {cap.prompt}
              </pre>
            </details>
          )}
          {!cap.installed && (
            <p className="text-[10px] text-white/25 mt-3 italic">🔒 Full prompt visible after install</p>
          )}

          {/* Install error */}
          {installError && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {installError}
            </div>
          )}

          {/* Password unlock — for paid capabilities with access passwords */}
          {!cap.installed && !cap.isOwner && isPaid && cap.hasAccessPassword && showPasswordInput && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🔑</span>
                <span className="text-xs font-medium text-white/60">Have an access password?</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  placeholder="Enter password"
                  onKeyDown={e => e.key === 'Enter' && passwordInput.trim() && handleInstall(cap.id, passwordInput.trim())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                />
                <button
                  onClick={() => handleInstall(cap.id, passwordInput.trim())}
                  disabled={!passwordInput.trim() || installing === cap.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {installing === cap.id ? 'Unlocking...' : 'Unlock Free Access'}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
          )}

          {/* Action buttons — show ONLY Install or Uninstall, never both */}
          <div className="mt-6 flex gap-2">
            {cap.installed ? (
              <>
                <button
                  onClick={() => {
                    closeModal();
                    // Launch guided chat for reconfiguration
                    if (onStartGuidedChat) {
                      const flds = parseEditableFields(cap.editableFields);
                      const fieldList = flds.length > 0
                        ? `It has ${flds.length} configurable fields: ${flds.map(f => f.label).join(', ')}.`
                        : '';
                      onStartGuidedChat(
                        `I want to reconfigure the "${cap.name}" capability. ${fieldList} Help me adjust it for my needs.`
                      );
                    } else {
                      setView('installed');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/30 border border-brand-500/30 transition-colors"
                >💬 Configure with Divi</button>
                <button
                  onClick={() => handleUninstall(cap.id)}
                  className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400/60 text-sm hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-colors"
                >Uninstall</button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleInstall(cap.id)}
                  disabled={installing === cap.id || !!locked}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                    locked
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-not-allowed'
                      : isPaid
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                  )}
                >
                  {locked
                    ? `🔒 Connect ${cap.integrationType} first`
                    : installing === cap.id
                      ? 'Installing...'
                      : isPaid
                        ? `💳 Purchase · $${(cap.price || 0).toFixed(2)}`
                        : '⚡ Install Free'}
                </button>
                {/* Show password hint for paid caps without opening yet */}
                {isPaid && cap.hasAccessPassword && !showPasswordInput && !locked && (
                  <button
                    onClick={() => setShowPasswordInput(true)}
                    className="py-2.5 px-4 rounded-lg bg-white/[0.04] text-white/40 text-sm hover:text-white/60 hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                    title="Have an access password?"
                  >🔑</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Create View ─────────────────────────────────────────── */
  const CreateView = () => (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-4">🎯 Create Custom Capability</h3>
        <p className="text-xs text-white/40 mb-4">Build a skill pack that extends what Divi can do. It will be added to the Bubble Store and auto-installed for you.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Icon</label>
              <input
                type="text"
                value={createForm.icon}
                onChange={e => setCreateForm(p => ({ ...p, icon: e.target.value }))}
                className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-center text-lg focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Weekly Report Generator"
                className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">Description *</label>
            <textarea
              value={createForm.description}
              onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What does this capability do?"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Category</label>
              <select
                value={createForm.category}
                onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/70 focus:outline-none"
              >
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Integration Type</label>
              <select
                value={createForm.integrationType}
                onChange={e => setCreateForm(p => ({ ...p, integrationType: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/70 focus:outline-none"
              >
                {INTEGRATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {createForm.integrationType && createForm.integrationType !== 'generic' && (
                <p className="text-[10px] text-amber-400/60 mt-1">🔒 Users will need {createForm.integrationType} connected to install</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Pricing</label>
              <select
                value={createForm.pricingModel}
                onChange={e => setCreateForm(p => ({ ...p, pricingModel: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/70 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="one_time">One-Time Purchase</option>
              </select>
            </div>
            {createForm.pricingModel === 'one_time' && (
              <div>
                <label className="block text-[11px] text-white/50 mb-1">Price ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={createForm.price}
                  onChange={e => setCreateForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">🔑 Access Password <span className="text-white/25">(optional — lets users bypass paywall)</span></label>
            <input
              type="text"
              value={createForm.accessPassword}
              onChange={e => setCreateForm(p => ({ ...p, accessPassword: e.target.value }))}
              placeholder="Leave empty for no password bypass"
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
            />
            {createForm.accessPassword && (
              <p className="text-[10px] text-amber-400/60 mt-1">🔑 Users with this password can install without paying</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">⚡ Commands <span className="text-white/25">(JSON array — invokable via !slug.command)</span></label>
            <textarea
              value={createForm.commands}
              onChange={e => setCreateForm(p => ({ ...p, commands: e.target.value }))}
              placeholder={'[\n  {"name": "run", "description": "Execute this capability", "usage": "!slug.run"}\n]'}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">Tags <span className="text-white/25">(comma-separated)</span></label>
            <input
              type="text"
              value={createForm.tags}
              onChange={e => setCreateForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. reporting, analytics, weekly"
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">
              Prompt * <span className="text-white/25">(‘{'{'}{'{'}<span>fieldName</span>{'}'}{'}'}’ syntax for editable placeholders)</span>
            </label>
            <textarea
              value={createForm.prompt}
              onChange={e => setCreateForm(p => ({ ...p, prompt: e.target.value }))}
              placeholder={`You are a reporting assistant for {{companyName}}.\nEvery {{frequency}}, compile a summary of...`}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1">
              Editable Fields <span className="text-white/25">(JSON array)</span>
            </label>
            <textarea
              value={createForm.editableFields}
              onChange={e => setCreateForm(p => ({ ...p, editableFields: e.target.value }))}
              placeholder='[{"key":"companyName","label":"Company Name","type":"text","placeholder":"Acme Corp"}]'
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 resize-none font-mono"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !createForm.name || !createForm.description || !createForm.prompt}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >{creating ? 'Creating...' : '⚡ Create & Install'}</button>
        </div>
      </div>
    </div>
  );

  /* ── Main Render ─────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white/90">⚡ Capabilities</h2>
            <p className="text-xs text-white/35 mt-0.5">Skill packs that extend what Divi can do</p>
          </div>
          <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5">
            <button
              onClick={() => setView('browse')}
              className={cn('text-xs px-3 py-1.5 rounded-md transition-colors', view === 'browse' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60')}
            >Browse</button>
            <button
              onClick={() => setView('installed')}
              className={cn('text-xs px-3 py-1.5 rounded-md transition-colors', view === 'installed' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60')}
            >Installed</button>
            <button
              onClick={() => setView('create')}
              className={cn('text-xs px-3 py-1.5 rounded-md transition-colors', view === 'create' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60')}
            >+ Create</button>
          </div>
        </div>

        {view === 'browse' && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search capabilities..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-9 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
              />
              <span className="absolute left-3 top-2.5 text-white/30">🔍</span>
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {view === 'create' ? (
          <CreateView />
        ) : loading ? (
          <div className="text-center py-12 text-white/30 text-sm">Loading capabilities...</div>
        ) : capabilities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">{view === 'installed' ? '📭' : '🔍'}</div>
            <div className="text-white/50 text-sm">
              {view === 'installed' ? 'No capabilities installed yet' : 'No capabilities found'}
            </div>
            <div className="text-white/25 text-xs mt-1">
              {view === 'installed'
                ? 'Browse the Bubble Store or create a custom capability'
                : 'Try adjusting your search or category filter'}
            </div>
            {view === 'installed' && (
              <div className="flex gap-2 justify-center mt-3">
                <button
                  onClick={() => setView('browse')}
                  className="text-xs px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors"
                >Browse Capabilities</button>
                <button
                  onClick={() => setView('create')}
                  className="text-xs px-4 py-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 transition-colors"
                >+ Create Custom</button>
              </div>
            )}
          </div>
        ) : view === 'browse' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capabilities.map(cap => <BrowseCard key={cap.id} cap={cap} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {capabilities.map(cap => <InstalledCard key={cap.id} cap={cap} />)}
          </div>
        )}
      </div>

      {selected && <DetailModal cap={selected} />}
    </div>
  );
}
