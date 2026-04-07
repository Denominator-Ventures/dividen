'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string | null;
  type: string;
  tags: string | null;
  cardId: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  note: '📝',
  report: '📊',
  template: '📄',
  meeting_notes: '🗓️',
};

export function DriveView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Document | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('note');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) setDocuments(data.data);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleCreate = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, type: editType }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => [data.data, ...prev]);
        setSelected(data.data);
        setCreating(false);
        setEditing(false);
        setEditTitle('');
        setEditContent('');
        setEditType('note');
      }
    } catch (e) {
      console.error('Failed to create document:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected || !editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, type: editType }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.map(d => d.id === selected.id ? data.data : d));
        setSelected(data.data);
        setEditing(false);
      }
    } catch (e) {
      console.error('Failed to update document:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  };

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.content || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)] text-sm">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="label-mono text-[var(--text-muted)] flex-shrink-0" style={{ fontSize: '10px' }}>Drive</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="input-field text-xs py-1 px-2 flex-1 min-w-0"
          />
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(true); setSelected(null); setEditTitle(''); setEditContent(''); setEditType('note'); }}
          className="btn-primary text-xs px-3 py-1 flex-shrink-0"
        >
          + New
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className={cn('overflow-y-auto', (selected || creating) ? 'w-2/5 border-r border-[var(--border-color)]' : 'w-full')}>
          {filtered.length === 0 && !creating ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-3">📁</div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No documents yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Create notes, reports, and templates. Divi can also generate documents for you via chat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelected(doc); setCreating(false); setEditing(false); }}
                  className={cn(
                    'w-full text-left p-3 hover:bg-[var(--bg-surface)] transition-colors',
                    selected?.id === doc.id && 'bg-[var(--bg-surface)]'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{TYPE_ICONS[doc.type] || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate block">{doc.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)] capitalize">{doc.type.replace('_', ' ')}</span>
                        <span className="text-xs text-[var(--text-muted)]">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {doc.content && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{doc.content.slice(0, 100)}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail / Editor */}
        {(selected || creating) && (
          <div className="w-3/5 overflow-y-auto p-4 flex flex-col">
            {editing || creating ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document title..."
                  className="input-field text-sm mb-2"
                  autoFocus
                />
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="input-field text-xs mb-2 py-1"
                >
                  <option value="note">📝 Note</option>
                  <option value="report">📊 Report</option>
                  <option value="template">📄 Template</option>
                  <option value="meeting_notes">🗓️ Meeting Notes</option>
                </select>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write your content here... (Markdown supported)"
                  className="input-field text-sm flex-1 min-h-[200px] resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={creating ? handleCreate : handleUpdate}
                    disabled={saving || !editTitle.trim()}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {saving ? 'Saving...' : creating ? 'Create' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setCreating(false); if (creating) setSelected(null); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : selected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditing(true); setEditTitle(selected.title); setEditContent(selected.content || ''); setEditType(selected.type); }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                    <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-[var(--text-muted)] capitalize">{TYPE_ICONS[selected.type]} {selected.type.replace('_', ' ')}</span>
                  <span className="text-xs text-[var(--text-muted)]">Updated {new Date(selected.updatedAt).toLocaleString()}</span>
                </div>
                {selected.content ? (
                  <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {selected.content}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">No content yet. Click Edit to add content.</p>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
