'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
interface LinkedCard {
  linkId: string;
  role: string | null;
  card: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee?: string;
    dueDate?: string | null;
    createdAt?: string;
  };
}

interface ContactInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  tags: string | null;
  source: string | null;
  enrichedData: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactDetailModalProps {
  contact: ContactInfo;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ContactInfo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ContactDetailModal({
  contact,
  onClose,
  onUpdate,
  onDelete,
}: ContactDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    role: contact.role || '',
    notes: contact.notes || '',
    tags: contact.tags || '',
  });
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch linked cards
    fetch(`/api/contacts/${contact.id}/cards`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLinkedCards(data.data);
      })
      .catch(console.error);

    // Parse existing enrichment data
    if (contact.enrichedData) {
      try {
        setEnrichmentData(JSON.parse(contact.enrichedData));
      } catch {}
    }
  }, [contact.id, contact.enrichedData]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(contact.id, form);
    setSaving(false);
    setEditing(false);
  };

  const handleResearch = async () => {
    setEnriching(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setEnrichmentData(data.data.enrichment);
      }
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(contact.id);
  };

  const tags = (contact.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const initials = contact.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors: Record<string, string> = {
    leads: '#94a3b8',
    qualifying: '#60a5fa',
    proposal: '#a78bfa',
    negotiation: '#fbbf24',
    active: '#34d399',
    development: '#2dd4bf',
    completed: '#a78bfa',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center text-brand-400 text-lg font-bold">
              {initials}
            </div>
            <div>
              {editing ? (
                <input
                  className="input-field text-lg font-semibold"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              ) : (
                <h2 className="text-lg font-semibold">{contact.name}</h2>
              )}
              {contact.company && !editing && (
                <p className="text-sm text-[var(--text-secondary)]">@ {contact.company}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResearch}
              disabled={enriching}
              className="text-xs px-3 py-1.5 bg-[var(--bg-surface)] rounded-md hover:bg-[var(--brand-primary)]/15 text-[var(--text-secondary)] hover:text-brand-400 transition-colors disabled:opacity-50"
            >
              {enriching ? '🔄 Enriching...' : '🔍 Research'}
            </button>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Contact Information
            </h4>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Email</label>
                  <input className="input-field text-sm w-full" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Phone</label>
                  <input className="input-field text-sm w-full" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Company</label>
                  <input className="input-field text-sm w-full" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Role</label>
                  <input className="input-field text-sm w-full" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Tags (comma-separated)</label>
                  <input className="input-field text-sm w-full" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Notes</label>
                  <textarea
                    className="input-field text-sm w-full min-h-[80px] resize-y"
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)] w-16">Email</span>
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)] w-16">Phone</span>
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)] w-16">Company</span>
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.role && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)] w-16">Role</span>
                    <span>{contact.role}</span>
                  </div>
                )}
                {contact.notes && (
                  <div className="text-sm mt-2">
                    <span className="text-[var(--text-muted)] block mb-1">Notes</span>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && !editing && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-[var(--brand-primary)]/15 text-brand-400 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Linked Kanban Cards */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Linked Cards ({linkedCards.length})
            </h4>
            {linkedCards.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No linked kanban cards.</p>
            ) : (
              <div className="space-y-1.5">
                {linkedCards.map((lc) => (
                  <div
                    key={lc.linkId}
                    className="flex items-center justify-between p-2 bg-[var(--bg-surface)] rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: statusColors[lc.card.status] || '#94a3b8' }}
                      />
                      <span>{lc.card.title}</span>
                      {lc.role && (
                        <span className="text-xs text-[var(--text-muted)]">({lc.role})</span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] capitalize">{lc.card.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrichment Data */}
          {enrichmentData && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Research Data
              </h4>
              <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-sm space-y-1">
                {enrichmentData.linkedCards !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Linked Cards</span>
                    <span>{enrichmentData.linkedCards}</span>
                  </div>
                )}
                {enrichmentData.activeDeals !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Active Deals</span>
                    <span>{enrichmentData.activeDeals}</span>
                  </div>
                )}
                {enrichmentData.relatedMemories !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Related Memories</span>
                    <span>{enrichmentData.relatedMemories}</span>
                  </div>
                )}
                {enrichmentData.notes && enrichmentData.notes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                    <span className="text-[var(--text-muted)] block mb-1">Context Notes:</span>
                    {enrichmentData.notes.map((note: string, i: number) => (
                      <p key={i} className="text-xs text-[var(--text-secondary)]">• {note}</p>
                    ))}
                  </div>
                )}
                {enrichmentData.enrichedAt && (
                  <div className="text-xs text-[var(--text-muted)] mt-2">
                    Last enriched: {new Date(enrichmentData.enrichedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Timeline
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Created {new Date(contact.createdAt).toLocaleDateString()}
                {contact.source && (
                  <span className="text-xs px-1.5 py-0.5 bg-[var(--bg-surface)] rounded capitalize">
                    {contact.source}
                  </span>
                )}
              </div>
              {contact.updatedAt !== contact.createdAt && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                  Updated {new Date(contact.updatedAt).toLocaleDateString()}
                </div>
              )}
              {linkedCards.map((lc) => (
                <div key={lc.linkId} className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                  Linked to &quot;{lc.card.title}&quot;
                  {lc.role && <span className="text-xs text-[var(--text-muted)]">as {lc.role}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-primary)] flex items-center justify-between">
          <button
            onClick={handleDelete}
            className={cn(
              'text-sm px-3 py-1.5 rounded-md transition-colors',
              confirmDelete
                ? 'bg-red-600 text-white'
                : 'text-red-400 hover:bg-red-600/10'
            )}
          >
            {confirmDelete ? 'Confirm Delete' : '🗑 Delete'}
          </button>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="btn-primary text-sm"
              >
                ✏️ Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
