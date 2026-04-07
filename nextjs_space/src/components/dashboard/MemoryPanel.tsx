'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MemoryItemData, MemoryTier } from '@/types';
import { MEMORY_TIERS, TIER1_CATEGORIES, TIER2_CATEGORIES, TIER3_CATEGORIES, RULE_PRIORITIES } from '@/types';

export function MemoryPanel() {
  const [activeTier, setActiveTier] = useState<MemoryTier>(1);
  const [items, setItems] = useState<MemoryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tier: String(activeTier) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/memory?${params}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error('Failed to fetch memory items:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTier, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handlePin = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/${id}/pin`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, pinned: data.data.pinned } : i)));
      }
    } catch (err) {
      console.error('Failed to pin:', err);
    }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/memory/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, approved: data.data.approved, confidence: data.data.confidence } : i
          )
        );
      }
    } catch (err) {
      console.error('Failed to approve/reject:', err);
    }
  };

  const handleEditSave = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, value: data.data.value } : i)));
        setEditingId(null);
        setEditValue('');
      }
    } catch (err) {
      console.error('Failed to edit:', err);
    }
  };

  const tierInfo = MEMORY_TIERS.find((t) => t.id === activeTier)!;

  return (
    <div className="h-full flex flex-col">
      {/* Tier Tabs */}
      <div className="flex gap-1 p-3 pb-0">
        {MEMORY_TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => { setActiveTier(tier.id); setShowNewForm(false); setEditingId(null); }}
            className={cn(
              'flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors text-center',
              activeTier === tier.id
                ? 'bg-[var(--brand-primary)]/15 text-brand-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            )}
          >
            <span className="block text-base">{tier.icon}</span>
            <span className="block mt-0.5">{tier.label}</span>
          </button>
        ))}
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-[var(--text-muted)]">{tierInfo.description}</p>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 px-3 pb-2">
        <input
          className="input-field text-sm flex-1"
          placeholder="Search memory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="text-sm px-3 py-1.5 bg-[var(--brand-primary)]/15 text-brand-400 rounded-md hover:bg-[var(--brand-primary)]/20 transition-colors"
        >
          {showNewForm ? '✕' : '+'}
        </button>
      </div>

      {/* New Item Form */}
      {showNewForm && <NewMemoryForm tier={activeTier} onCreated={(item) => { setItems((p) => [item, ...p]); setShowNewForm(false); }} />}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading ? (
          <div className="text-center text-[var(--text-secondary)] py-8 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl opacity-20 mb-2">{tierInfo.icon}</div>
            <p className="text-sm text-[var(--text-muted)]">No {tierInfo.label.toLowerCase()} yet</p>
          </div>
        ) : (
          items.map((item) => (
            <MemoryItemCard
              key={item.id}
              item={item}
              tier={activeTier}
              isEditing={editingId === item.id}
              editValue={editingId === item.id ? editValue : ''}
              onStartEdit={() => { setEditingId(item.id); setEditValue(item.value); }}
              onCancelEdit={() => { setEditingId(null); setEditValue(''); }}
              onEditChange={setEditValue}
              onSaveEdit={() => handleEditSave(item.id)}
              onPin={() => handlePin(item.id)}
              onDelete={() => handleDelete(item.id)}
              onApprove={(approved) => handleApprove(item.id, approved)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── New Memory Form ──────────────────────────────────────────────────────────

function NewMemoryForm({
  tier,
  onCreated,
}: {
  tier: MemoryTier;
  onCreated: (item: MemoryItemData) => void;
}) {
  const categories = tier === 1 ? TIER1_CATEGORIES : tier === 2 ? TIER2_CATEGORIES : TIER3_CATEGORIES;

  const [form, setForm] = useState({
    key: '',
    value: '',
    category: categories[0] as string,
    scope: '',
    priority: 'medium',
    confidence: '0.5',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.key || !form.value) return;
    setSaving(true);
    try {
      const body: any = {
        tier,
        key: form.key,
        value: form.value,
        category: form.category,
      };
      if (tier === 1 && form.scope) body.scope = form.scope;
      if (tier === 2) body.priority = form.priority;
      if (tier === 3) body.confidence = parseFloat(form.confidence);

      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.data);
        setForm({ key: '', value: '', category: categories[0], scope: '', priority: 'medium', confidence: '0.5' });
      }
    } catch (err) {
      console.error('Failed to create:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-3 mb-2 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="input-field text-sm" placeholder="Key / Label *" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
        <select className="input-field text-sm" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <textarea className="input-field text-sm w-full min-h-[60px] resize-y" placeholder="Value / Content *" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
      {tier === 1 && (
        <input className="input-field text-sm w-full" placeholder="Scope (e.g., project name)" value={form.scope} onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))} />
      )}
      {tier === 2 && (
        <select className="input-field text-sm w-full" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          {RULE_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
      {tier === 3 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Confidence:</span>
          <input type="range" min="0" max="1" step="0.1" className="flex-1" value={form.confidence} onChange={(e) => setForm((p) => ({ ...p, confidence: e.target.value }))} />
          <span className="text-xs font-mono w-8">{form.confidence}</span>
        </div>
      )}
      <button onClick={handleSubmit} disabled={!form.key || !form.value || saving} className="btn-primary text-sm w-full disabled:opacity-50">
        {saving ? 'Saving...' : 'Add Memory Item'}
      </button>
    </div>
  );
}

// ─── Memory Item Card ─────────────────────────────────────────────────────────

function MemoryItemCard({
  item,
  tier,
  isEditing,
  editValue,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onSaveEdit,
  onPin,
  onDelete,
  onApprove,
}: {
  item: MemoryItemData;
  tier: MemoryTier;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
  onSaveEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onApprove: (approved: boolean) => void;
}) {
  const priorityColors: Record<string, string> = {
    critical: 'text-red-400 bg-red-600/20',
    high: 'text-orange-400 bg-orange-600/20',
    medium: 'text-yellow-400 bg-yellow-600/20',
    low: 'text-green-400 bg-green-600/20',
  };

  return (
    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] group">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {tier === 1 && item.pinned && <span className="text-xs">📌</span>}
          <span className="text-sm font-medium">{item.key}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-surface)] rounded capitalize text-[var(--text-muted)]">
            {item.category}
          </span>
          {tier === 1 && item.scope && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[var(--brand-primary)]/10 text-brand-400 rounded">
              {item.scope}
            </span>
          )}
          {tier === 2 && item.priority && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', priorityColors[item.priority] || '')}>
              {item.priority}
            </span>
          )}
          {tier === 3 && item.approved === true && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">✓ Approved</span>
          )}
          {tier === 3 && item.approved === false && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded">✗ Rejected</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {tier === 1 && (
            <button onClick={onPin} className="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface)]" title={item.pinned ? 'Unpin' : 'Pin'}>
              {item.pinned ? '📌' : '📍'}
            </button>
          )}
          <button onClick={onStartEdit} className="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface)]" title="Edit">
            ✏️
          </button>
          <button onClick={onDelete} className="text-xs px-1.5 py-0.5 rounded hover:bg-red-600/10 text-red-400" title="Delete">
            🗑
          </button>
        </div>
      </div>

      {/* Value */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea className="input-field text-sm w-full min-h-[60px] resize-y" value={editValue} onChange={(e) => onEditChange(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={onSaveEdit} className="btn-primary text-xs">Save</button>
            <button onClick={onCancelEdit} className="text-xs text-[var(--text-secondary)]">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{item.value}</p>
      )}

      {/* Tier 3: Confidence Bar + Approve/Reject */}
      {tier === 3 && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Confidence:</span>
            <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  (item.confidence || 0) >= 0.7 ? 'bg-green-500' : (item.confidence || 0) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${(item.confidence || 0) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">{(item.confidence || 0).toFixed(2)}</span>
          </div>
          {item.approved === null && (
            <div className="flex gap-2">
              <button onClick={() => onApprove(true)} className="text-xs px-2.5 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors">
                ✓ Approve
              </button>
              <button onClick={() => onApprove(false)} className="text-xs px-2.5 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors">
                ✗ Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Source + timestamp */}
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
        {item.source && <span className="capitalize">via {item.source}</span>}
        <span>·</span>
        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
