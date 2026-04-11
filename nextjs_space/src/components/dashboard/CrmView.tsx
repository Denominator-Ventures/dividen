'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ContactDetailModal } from './ContactDetailModal';
import type { ContactData, ContactPlatformUser } from '@/types';

interface ContactCardLink {
  id: string;
  cardId: string;
  contactId: string;
  role: string | null;
  card: { id: string; title: string; status: string };
}

interface ContactWithCards extends Omit<ContactData, 'cards'> {
  cards?: ContactCardLink[];
  platformUserId?: string | null;
  platformUserStatus?: string | null;
  matchedAt?: string | null;
  platformUser?: ContactPlatformUser | null;
}

type PlatformFilter = 'all' | 'on_dividen' | 'invite';

export function CrmView() {
  const [contacts, setContacts] = useState<ContactWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [selectedContact, setSelectedContact] = useState<ContactWithCards | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', role: '', tags: '' });
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      if (data.success) setContacts(data.data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [search, tagFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Collect all unique tags across contacts
  const allTags = Array.from(
    new Set(
      contacts
        .flatMap((c) => (c.tags || '').split(','))
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );

  // Platform-filtered contacts
  const filteredContacts = contacts.filter((c) => {
    if (platformFilter === 'on_dividen') return !!c.platformUserId;
    if (platformFilter === 'invite') return !c.platformUserId && !!c.email;
    return true;
  });

  // Platform stats
  const onDiviDenCount = contacts.filter((c) => !!c.platformUserId).length;
  const invitableCount = contacts.filter((c) => !c.platformUserId && !!c.email).length;

  const handleInviteContact = async (contact: ContactWithCards) => {
    if (!contact.email || invitingId) return;
    setInvitingId(contact.id);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: contact.email,
          inviteeName: contact.name,
          message: `Hey ${contact.name.split(' ')[0]}, I'd like to connect with you on DiviDen.`,
        }),
      });
      if (res.ok) {
        // Refresh contacts to pick up status change
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to invite contact:', err);
    } finally {
      setInvitingId(null);
    }
  };

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) => [data.data, ...prev]);
        setNewContact({ name: '', email: '', phone: '', company: '', role: '', tags: '' });
        setShowNewForm(false);
      }
    } catch (err) {
      console.error('Failed to create contact:', err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedContact(null);
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleUpdateContact = async (id: string, updates: Partial<ContactData>) => {
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.data } : c)));
        if (selectedContact?.id === id) {
          setSelectedContact((prev) => prev ? { ...prev, ...data.data } : prev);
        }
      }
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Contacts</h3>
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
            {onDiviDenCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {onDiviDenCount} on DiviDen
              </span>
            )}
            {invitableCount > 0 && (
              <span className="text-xs text-[var(--text-muted)]">{invitableCount} invitable</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="btn-primary text-sm"
        >
          {showNewForm ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* New Contact Form */}
      {showNewForm && (
        <div className="mb-4 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field text-sm"
              placeholder="Name *"
              value={newContact.name}
              onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Email"
              value={newContact.email}
              onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Phone"
              value={newContact.phone}
              onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Company"
              value={newContact.company}
              onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Role"
              value={newContact.role}
              onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))}
            />
            <input
              className="input-field text-sm"
              placeholder="Tags (comma-separated)"
              value={newContact.tags}
              onChange={(e) => setNewContact((p) => ({ ...p, tags: e.target.value }))}
            />
          </div>
          <button
            onClick={handleCreateContact}
            disabled={!newContact.name.trim()}
            className="btn-primary text-sm w-full disabled:opacity-50"
          >
            Create Contact
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-2">
        <input
          className="input-field text-sm flex-1"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {allTags.length > 0 && (
          <select
            className="input-field text-sm w-36"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Platform Filter Pills */}
      <div className="flex gap-1.5 mb-3">
        {([
          { id: 'all' as PlatformFilter, label: 'All', count: contacts.length },
          { id: 'on_dividen' as PlatformFilter, label: '🟢 On DiviDen', count: onDiviDenCount },
          { id: 'invite' as PlatformFilter, label: '✉️ Invitable', count: invitableCount },
        ]).map((pill) => (
          <button
            key={pill.id}
            onClick={() => setPlatformFilter(pill.id)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1',
              platformFilter === pill.id
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            )}
          >
            {pill.label}
            <span className="text-[10px] opacity-70">{pill.count}</span>
          </button>
        ))}
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-[var(--text-secondary)] py-8">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60%] text-center">
            <div className="text-5xl mb-4 opacity-20">👥</div>
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              {search || tagFilter ? 'No matching contacts' : 'No contacts yet'}
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              {search || tagFilter
                ? 'Try adjusting your search or filter.'
                : 'Add contacts to track relationships, or let the AI create them from conversations.'}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => setSelectedContact(contact)}
              onInvite={() => handleInviteContact(contact)}
              inviting={invitingId === contact.id}
            />
          ))
        )}
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={handleUpdateContact}
          onDelete={handleDeleteContact}
          allContacts={contacts.map(c => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}

// ─── Contact Card Sub-Component ──────────────────────────────────────────────

function ContactCard({
  contact,
  onClick,
  onInvite,
  inviting,
}: {
  contact: ContactWithCards;
  onClick: () => void;
  onInvite: () => void;
  inviting: boolean;
}) {
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

  const isOnPlatform = !!contact.platformUserId;
  const isInvited = contact.platformUserStatus === 'invited';
  const canInvite = !isOnPlatform && !!contact.email && !isInvited;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 bg-[var(--bg-secondary)] rounded-lg border transition-colors',
        isOnPlatform
          ? 'border-emerald-500/20 hover:border-emerald-500/40'
          : 'border-[var(--border-primary)] hover:border-brand-500/40'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with platform indicator */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold',
            isOnPlatform
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-[var(--brand-primary)]/20 text-brand-400'
          )}>
            {initials}
          </div>
          {isOnPlatform && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-secondary)] flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{contact.name}</span>
            {contact.company && (
              <span className="text-xs text-[var(--text-muted)] truncate">@ {contact.company}</span>
            )}
            {/* Platform badge inline */}
            {isOnPlatform && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium flex-shrink-0">
                On DiviDen
              </span>
            )}
            {isInvited && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium flex-shrink-0">
                Invited
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {contact.email && <span className="truncate">{contact.email}</span>}
            {contact.role && <span className="truncate">{contact.role}</span>}
            {isOnPlatform && contact.platformUser?.profile?.headline && (
              <span className="truncate text-emerald-400/70">{contact.platformUser.profile.headline}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1 flex-shrink-0">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-[var(--brand-primary)]/15 text-brand-400 rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px] text-[var(--text-muted)]">+{tags.length - 2}</span>
          )}
        </div>

        {/* Linked cards count */}
        {contact.cards && contact.cards.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-surface)] rounded text-[var(--text-muted)]">
            📋 {contact.cards.length}
          </span>
        )}

        {/* Invite CTA or Profile link */}
        {canInvite && (
          <button
            onClick={(e) => { e.stopPropagation(); onInvite(); }}
            disabled={inviting}
            className="text-[10px] px-2 py-1 rounded bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {inviting ? '...' : '✉️ Invite'}
          </button>
        )}
        {isOnPlatform && contact.platformUserId && (
          <a
            href={`/profile/${contact.platformUserId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex-shrink-0"
          >
            View Profile →
          </a>
        )}
      </div>
    </button>
  );
}
