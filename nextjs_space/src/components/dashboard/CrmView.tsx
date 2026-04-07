'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ContactDetailModal } from './ContactDetailModal';
import type { ContactData } from '@/types';

interface ContactCardLink {
  id: string;
  cardId: string;
  contactId: string;
  role: string | null;
  card: { id: string; title: string; status: string };
}

interface ContactWithCards extends Omit<ContactData, 'cards'> {
  cards?: ContactCardLink[];
}

export function CrmView() {
  const [contacts, setContacts] = useState<ContactWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactWithCards | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', role: '', tags: '' });

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
          <p className="text-sm text-[var(--text-secondary)]">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
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
        <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)] space-y-2">
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
      <div className="flex gap-2 mb-3">
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
          contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => setSelectedContact(contact)}
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
        />
      )}
    </div>
  );
}

// ─── Contact Card Sub-Component ──────────────────────────────────────────────

function ContactCard({
  contact,
  onClick,
}: {
  contact: ContactWithCards;
  onClick: () => void;
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

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] hover:border-brand-500/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{contact.name}</span>
            {contact.company && (
              <span className="text-xs text-[var(--text-muted)] truncate">@ {contact.company}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {contact.email && <span className="truncate">{contact.email}</span>}
            {contact.role && <span className="truncate">{contact.role}</span>}
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1 flex-shrink-0">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded"
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
          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--text-muted)]">
            📋 {contact.cards.length}
          </span>
        )}
      </div>
    </button>
  );
}
