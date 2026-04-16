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

interface PlatformUserInfo {
  id: string;
  name: string | null;
  email: string;
  profile?: {
    headline: string | null;
    capacity: string | null;
    visibility: string | null;
  } | null;
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
  platformUserId?: string | null;
  platformUserStatus?: string | null;
  matchedAt?: string | null;
  platformUser?: PlatformUserInfo | null;
}

interface TimelineItem {
  type: string;
  date: string;
  title: string;
  subtitle?: string;
  icon: string;
  id: string;
}

interface Relationship {
  id: string;
  type: string;
  label: string | null;
  direction: 'outgoing' | 'incoming';
  contact: { id: string; name: string; company: string | null; role: string | null; email: string | null };
}

interface ActivityStats {
  emails: number;
  calendarEvents: number;
  commsMessages: number;
  linkedCards: number;
  relationships: number;
}

interface ContactDetailModalProps {
  contact: ContactInfo;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ContactInfo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  allContacts?: Array<{ id: string; name: string }>;
}

const RELATIONSHIP_TYPES = [
  { value: 'colleague', label: 'Colleague', icon: '👥' },
  { value: 'manager', label: 'Manager', icon: '👔' },
  { value: 'report', label: 'Direct Report', icon: '📋' },
  { value: 'partner', label: 'Partner', icon: '🤝' },
  { value: 'spouse', label: 'Spouse/Family', icon: '❤️' },
  { value: 'friend', label: 'Friend', icon: '😊' },
  { value: 'referral', label: 'Referral', icon: '🔗' },
  { value: 'custom', label: 'Custom', icon: '✏️' },
];

const INVERSE_LABELS: Record<string, string> = {
  manager: 'reports to',
  report: 'manages',
  referral: 'referred by',
  colleague: 'colleague of',
  partner: 'partner of',
  spouse: 'family of',
  friend: 'friend of',
  custom: 'related to',
};

const statusColors: Record<string, string> = {
  leads: '#94a3b8',
  qualifying: '#60a5fa',
  proposal: '#a78bfa',
  negotiation: '#fbbf24',
  contracted: '#f59e0b',
  active: '#34d399',
  development: '#2dd4bf',
  planning: '#818cf8',
  paused: '#6b7280',
  completed: '#a78bfa',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type DetailTab = 'overview' | 'timeline' | 'relationships';

export function ContactDetailModal({
  contact,
  onClose,
  onUpdate,
  onDelete,
  allContacts,
}: ContactDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
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

  // Activity data
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Add relationship form
  const [showAddRel, setShowAddRel] = useState(false);
  const [relForm, setRelForm] = useState({ toId: '', type: 'colleague', label: '' });
  const [addingRel, setAddingRel] = useState(false);

  // Fetch linked cards
  useEffect(() => {
    fetch(`/api/contacts/${contact.id}/cards`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setLinkedCards(data.data); })
      .catch(console.error);

    if (contact.enrichedData) {
      try { setEnrichmentData(JSON.parse(contact.enrichedData)); } catch {}
    }
  }, [contact.id, contact.enrichedData]);

  // Fetch activity timeline + relationships
  useEffect(() => {
    setActivityLoading(true);
    fetch(`/api/contacts/${contact.id}/activity`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data.stats);
          setTimeline(data.data.timeline);
          setRelationships(data.data.relationships);
        }
      })
      .catch(console.error)
      .finally(() => setActivityLoading(false));
  }, [contact.id]);

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
      if (data.success) setEnrichmentData(data.data.enrichment);
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(contact.id);
  };

  const handleAddRelationship = async () => {
    if (!relForm.toId || !relForm.type) return;
    setAddingRel(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relForm),
      });
      const data = await res.json();
      if (data.success) {
        setRelationships((prev) => [...prev, data.data]);
        setRelForm({ toId: '', type: 'colleague', label: '' });
        setShowAddRel(false);
      }
    } catch (err) {
      console.error('Failed to add relationship:', err);
    } finally {
      setAddingRel(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    try {
      await fetch(`/api/contacts/${contact.id}/relationships?relId=${relId}`, { method: 'DELETE' });
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
    } catch (err) {
      console.error('Failed to delete relationship:', err);
    }
  };

  const tags = (contact.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const initials = contact.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Activity', count: timeline.length },
    { id: 'relationships', label: 'Relationships', count: relationships.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-3">
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
                {!editing && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {[contact.role, contact.company].filter(Boolean).join(' @ ') || contact.email || 'Contact'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResearch}
                disabled={enriching}
                className="text-xs px-3 py-1.5 bg-[var(--bg-surface)] rounded-md hover:bg-[var(--brand-primary)]/15 text-[var(--text-secondary)] hover:text-brand-400 transition-colors disabled:opacity-50"
              >
                {enriching ? '🔄' : '🔍'} Research
              </button>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="flex gap-4 mb-3">
              {[
                { label: 'Cards', value: stats.linkedCards, icon: '📋' },
                { label: 'Emails', value: stats.emails, icon: '📧' },
                { label: 'Events', value: stats.calendarEvents, icon: '📅' },
                { label: 'Comms', value: stats.commsMessages, icon: '📡' },
                { label: 'Relations', value: stats.relationships, icon: '🔗' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{s.value}</div>
                  <div className="text-[10px] text-[var(--text-muted)] label-mono">{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && !editing && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-[var(--brand-primary)]/15 text-brand-400 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Tab Bar */}
          <div className="flex gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1',
                  activeTab === tab.id
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[9px] px-1 py-0 rounded-full bg-brand-500/20 text-brand-400">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Contact Information</h4>
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
                      <label className="text-xs text-[var(--text-muted)] mb-1 block">Tags</label>
                      <input className="input-field text-sm w-full" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-[var(--text-muted)] mb-1 block">Notes</label>
                      <textarea className="input-field text-sm w-full min-h-[80px] resize-y" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {contact.email && <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Email</span>{contact.email}</div>}
                    {contact.phone && <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Phone</span>{contact.phone}</div>}
                    {contact.company && <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Company</span>{contact.company}</div>}
                    {contact.role && <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Role</span>{contact.role}</div>}
                    {contact.source && <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Source</span><span className="capitalize">{contact.source}</span></div>}
                    <div className="text-sm"><span className="text-[var(--text-muted)] text-xs block">Created</span>{new Date(contact.createdAt).toLocaleDateString()}</div>
                  </div>
                )}
                {!editing && contact.notes && (
                  <div className="mt-2">
                    <span className="text-[var(--text-muted)] text-xs block mb-1">Notes</span>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-surface)] rounded-lg p-3">{contact.notes}</p>
                  </div>
                )}
              </div>

              {/* Platform Profile Section */}
              {contact.platformUserId && contact.platformUser && (
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="label-mono text-emerald-400 flex items-center gap-1.5" style={{ fontSize: '10px' }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      DiviDen Profile
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 capitalize">
                      {contact.platformUserStatus || 'matched'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {contact.platformUser.name || contact.name}
                      </span>
                      {contact.platformUser.profile?.capacity && (
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                          contact.platformUser.profile.capacity === 'available' ? 'bg-emerald-500/15 text-emerald-400' :
                          contact.platformUser.profile.capacity === 'busy' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-red-500/15 text-red-400'
                        )}>
                          {contact.platformUser.profile.capacity}
                        </span>
                      )}
                    </div>
                    {contact.platformUser.profile?.headline && (
                      <p className="text-xs text-[var(--text-secondary)]">{contact.platformUser.profile.headline}</p>
                    )}
                    {contact.matchedAt && (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Linked {timeAgo(contact.matchedAt)}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/profile/${contact.platformUserId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    View Full Profile →
                  </a>
                </div>
              )}

              {/* Invite CTA (no platform user) */}
              {!contact.platformUserId && contact.email && contact.platformUserStatus !== 'invited' && (
                <div className="p-3 bg-brand-500/5 rounded-lg border border-brand-500/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="label-mono text-brand-400 mb-1" style={{ fontSize: '10px' }}>Not on DiviDen yet</h4>
                      <p className="text-xs text-[var(--text-muted)]">Invite {contact.name.split(' ')[0]} to connect on the platform.</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/invites', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              inviteeEmail: contact.email,
                              inviteeName: contact.name,
                              message: `Hey ${contact.name.split(' ')[0]}, I'd like to connect with you on DiviDen.`,
                            }),
                          });
                        } catch (err) {
                          console.error('Invite failed:', err);
                        }
                      }}
                      className="text-xs px-3 py-1.5 bg-brand-500/15 text-brand-400 rounded hover:bg-brand-500/25 transition-colors"
                    >
                      ✉️ Send Invite
                    </button>
                  </div>
                </div>
              )}

              {/* Invited status banner */}
              {!contact.platformUserId && contact.platformUserStatus === 'invited' && (
                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm">✉️</span>
                    <div>
                      <h4 className="label-mono text-amber-400" style={{ fontSize: '10px' }}>Invitation Sent</h4>
                      <p className="text-xs text-[var(--text-muted)]">{contact.name.split(' ')[0]} has been invited to DiviDen.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Cards */}
              <div>
                <h4 className="label-mono text-[var(--text-muted)] mb-2" style={{ fontSize: '10px' }}>Linked Cards ({linkedCards.length})</h4>
                {linkedCards.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No linked cards.</p>
                ) : (
                  <div className="space-y-1.5">
                    {linkedCards.map((lc) => (
                      <div key={lc.linkId} className="flex items-center justify-between p-2 bg-[var(--bg-surface)] rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[lc.card.status] || '#94a3b8' }} />
                          <span>{lc.card.title}</span>
                          {lc.role && <span className="text-xs text-[var(--text-muted)]">({lc.role})</span>}
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
                  <h4 className="label-mono text-[var(--text-muted)] mb-2" style={{ fontSize: '10px' }}>Research Data</h4>
                  <div className="p-3 bg-[var(--bg-surface)] rounded-lg text-sm space-y-1">
                    {enrichmentData.notes?.map((note: string, i: number) => (
                      <p key={i} className="text-xs text-[var(--text-secondary)]">• {note}</p>
                    ))}
                    {enrichmentData.enrichedAt && (
                      <div className="text-xs text-[var(--text-muted)] mt-2">
                        Last enriched: {new Date(enrichmentData.enrichedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {activeTab === 'timeline' && (
            <div>
              {activityLoading ? (
                <div className="text-center text-[var(--text-muted)] py-8">Loading activity...</div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-20">📊</div>
                  <p className="text-sm text-[var(--text-muted)]">No activity found for this contact.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Activity appears when emails arrive, events are shared, or comms are linked.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {timeline.map((item, i) => (
                    <div key={`${item.type}-${item.id}-${i}`} className="flex gap-3 pb-3">
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center">
                        <span className="text-base">{item.icon}</span>
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-[var(--border-color)] mt-1" />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{timeAgo(item.date)}</span>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-[var(--text-muted)] truncate">{item.subtitle}</p>
                        )}
                        <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] mt-1 capitalize">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Relationships Tab ── */}
          {activeTab === 'relationships' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>
                  Connections ({relationships.length})
                </h4>
                <button
                  onClick={() => setShowAddRel(!showAddRel)}
                  className="text-xs px-2 py-1 bg-[var(--bg-surface)] rounded-md hover:bg-brand-500/15 text-[var(--text-secondary)] hover:text-brand-400 transition-colors"
                >
                  {showAddRel ? '✕ Cancel' : '+ Add Relationship'}
                </button>
              </div>

              {/* Add Relationship Form */}
              {showAddRel && (
                <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] space-y-2">
                  <select
                    className="input-field text-sm w-full"
                    value={relForm.toId}
                    onChange={(e) => setRelForm((p) => ({ ...p, toId: e.target.value }))}
                  >
                    <option value="">Select contact...</option>
                    {(allContacts || []).filter((c) => c.id !== contact.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input-field text-sm"
                      value={relForm.type}
                      onChange={(e) => setRelForm((p) => ({ ...p, type: e.target.value }))}
                    >
                      {RELATIONSHIP_TYPES.map((rt) => (
                        <option key={rt.value} value={rt.value}>{rt.icon} {rt.label}</option>
                      ))}
                    </select>
                    <input
                      className="input-field text-sm"
                      placeholder="Label (optional)"
                      value={relForm.label}
                      onChange={(e) => setRelForm((p) => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={handleAddRelationship}
                    disabled={!relForm.toId || addingRel}
                    className="btn-primary text-sm w-full disabled:opacity-50"
                  >
                    {addingRel ? 'Adding...' : 'Add Relationship'}
                  </button>
                </div>
              )}

              {/* Relationship List */}
              {relationships.length === 0 && !showAddRel ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-20">🔗</div>
                  <p className="text-sm text-[var(--text-muted)]">No relationships mapped yet.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Link contacts to track who knows who.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {relationships.map((rel) => {
                    const typeInfo = RELATIONSHIP_TYPES.find((rt) => rt.value === rel.type);
                    const displayLabel = rel.direction === 'incoming'
                      ? INVERSE_LABELS[rel.type] || rel.type
                      : rel.type;
                    return (
                      <div
                        key={rel.id}
                        className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] rounded-lg group"
                      >
                        <span className="text-lg">{typeInfo?.icon || '🔗'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{rel.contact.name}</span>
                            {rel.contact.company && (
                              <span className="text-xs text-[var(--text-muted)]">@ {rel.contact.company}</span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            <span className="capitalize">{displayLabel}</span>
                            {rel.label && <span className="text-[var(--text-muted)]"> · {rel.label}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRelationship(rel.id)}
                          className="text-xs text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove relationship"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-primary)] flex items-center justify-between">
          <button
            onClick={handleDelete}
            className={cn(
              'text-sm px-3 py-1.5 rounded-md transition-colors',
              confirmDelete ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-600/10'
            )}
          >
            {confirmDelete ? 'Confirm Delete' : '🗑 Delete'}
          </button>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-primary text-sm">✏️ Edit</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}