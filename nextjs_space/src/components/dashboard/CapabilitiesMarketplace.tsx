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
  editableFields: string; // JSON string of EditableField[]
  status: string;
  featured: boolean;
  totalPurchases: number;
  avgRating: number;
  totalRatings: number;
  installed?: boolean;
  // Only after purchase:
  prompt?: string;
  customizations?: string | null;
  resolvedPrompt?: string | null;
  userCapabilityId?: string;
  installedAt?: string;
  lastUsedAt?: string | null;
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
  { value: 'ops', label: 'Ops', icon: '🔧' },
  { value: 'engineering', label: 'Engineering', icon: '🛠' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
];

const INTEGRATION_BADGES: Record<string, { label: string; color: string }> = {
  webhook: { label: 'Webhook', color: 'text-blue-400 bg-blue-500/15 border-blue-500/25' },
  api: { label: 'API', color: 'text-purple-400 bg-purple-500/15 border-purple-500/25' },
  native: { label: 'Native', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' },
  email: { label: 'Email', color: 'text-amber-400 bg-amber-500/15 border-amber-500/25' },
};

/* ── Component ─────────────────────────────────────────────── */

export function CapabilitiesMarketplace() {
  const [view, setView] = useState<'browse' | 'installed'>('browse');
  const [capabilities, setCapabilities] = useState<MarketplaceCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<MarketplaceCapability | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (view === 'installed') params.set('installed', 'true');
      else {
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

  useEffect(() => { fetchCapabilities(); }, [fetchCapabilities]);

  const handleInstall = async (capId: string) => {
    setInstalling(capId);
    try {
      const res = await fetch('/api/marketplace-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilityId: capId }),
      });
      if (res.ok) {
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Install failed:', e);
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

  const parseEditableFields = (raw: string): EditableField[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  /* ── Browse Card ──────────────────────────────────────────── */
  const BrowseCard = ({ cap }: { cap: MarketplaceCapability }) => {
    const fields = parseEditableFields(cap.editableFields);
    const tags = cap.tags ? cap.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const intBadge = INTEGRATION_BADGES[cap.integrationType] || INTEGRATION_BADGES.webhook;

    return (
      <button
        onClick={() => setSelected(cap)}
        className="text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-all group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl flex-shrink-0">{cap.icon}</span>
            <div className="min-w-0">
              <h3 className="font-medium text-white/90 truncate group-hover:text-brand-400 transition-colors">
                {cap.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', intBadge.color)}>
                  {intBadge.label}
                </span>
                {cap.featured && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">⭐ Featured</span>
                )}
              </div>
            </div>
          </div>
          {cap.installed ? (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">Installed</span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex-shrink-0">
              {cap.price === 0 ? 'Free' : `$${cap.price}`}
            </span>
          )}
        </div>

        <p className="text-xs text-white/50 mt-2 line-clamp-2">{cap.description}</p>

        <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
          <span>📦 {cap.totalPurchases} installs</span>
          {fields.length > 0 && <span>🔧 {fields.length} customizable fields</span>}
          {cap.avgRating > 0 && <span>⭐ {cap.avgRating.toFixed(1)}</span>}
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
              <p className="text-xs text-white/40 mt-0.5">{cap.category} · {cap.integrationType}</p>
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

        {/* Customization Editor */}
        {isEditing && fields.length > 0 && (
          <div className="mt-4 space-y-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <div className="text-xs font-medium text-white/60 mb-2">⚙️ Customize Fields</div>
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-[11px] text-white/50 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {field.description && (
                  <p className="text-[10px] text-white/25 mb-1">{field.description}</p>
                )}
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

        {/* Show resolved prompt preview */}
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
    const intBadge = INTEGRATION_BADGES[cap.integrationType] || INTEGRATION_BADGES.webhook;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          onClick={e => e.stopPropagation()}
          className="relative bg-[#0d0d12] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cap.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white/90">{cap.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', intBadge.color)}>
                    {intBadge.label}
                  </span>
                  <span className="text-[10px] text-white/30">{cap.category}</span>
                  {cap.featured && <span className="text-[10px]">⭐</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-lg">✕</button>
          </div>

          {/* Description */}
          <p className="text-sm text-white/60 mt-4">{cap.longDescription || cap.description}</p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map(tag => (
                <span key={tag} className="text-[10px] text-white/35 bg-white/[0.05] px-2 py-0.5 rounded-full">{tag}</span>
              ))}
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

          {/* Editable Fields Preview */}
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

          {/* Prompt preview (only if installed) */}
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

          {/* Action */}
          <div className="mt-6 flex gap-2">
            {cap.installed ? (
              <>
                <button
                  onClick={() => { setSelected(null); setView('installed'); }}
                  className="flex-1 py-2.5 rounded-lg bg-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/30 border border-brand-500/30 transition-colors"
                >⚙️ Manage</button>
                <button
                  onClick={() => handleUninstall(cap.id)}
                  className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400/60 text-sm hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-colors"
                >Uninstall</button>
              </>
            ) : (
              <button
                onClick={() => { handleInstall(cap.id); setSelected(null); }}
                disabled={installing === cap.id}
                className="flex-1 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
              >{installing === cap.id ? 'Installing...' : cap.price === 0 ? '⚡ Install Free' : `Install · $${cap.price}`}</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Main Render ─────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white/90">⚡ Capabilities</h2>
            <p className="text-xs text-white/35 mt-0.5">Skill packs that extend what Divi can do</p>
          </div>
          <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5">
            <button
              onClick={() => setView('browse')}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md transition-colors',
                view === 'browse' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60'
              )}
            >Browse</button>
            <button
              onClick={() => setView('installed')}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md transition-colors',
                view === 'installed' ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/60'
              )}
            >My Capabilities</button>
          </div>
        </div>

        {/* Filters (browse only) */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm">Loading capabilities...</div>
        ) : capabilities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">{view === 'installed' ? '📭' : '🔍'}</div>
            <div className="text-white/50 text-sm">
              {view === 'installed' ? 'No capabilities installed yet' : 'No capabilities found'}
            </div>
            <div className="text-white/25 text-xs mt-1">
              {view === 'installed'
                ? 'Browse the marketplace and install capabilities to extend Divi'
                : 'Try adjusting your search or category filter'}
            </div>
            {view === 'installed' && (
              <button
                onClick={() => setView('browse')}
                className="mt-3 text-xs px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors"
              >Browse Capabilities</button>
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

      {/* Detail Modal */}
      {selected && <DetailModal cap={selected} />}
    </div>
  );
}
