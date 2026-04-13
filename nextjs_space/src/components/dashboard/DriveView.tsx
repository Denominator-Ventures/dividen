'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string | null;
  type: string;
  tags: string | null;
  url: string | null;
  fileSource: string;
  accountEmail: string | null;
  mimeType: string | null;
  fileSize: number | null;
  thumbnailUrl: string | null;
  cardId: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  note: '📝',
  report: '📊',
  template: '📄',
  meeting_notes: '🗓️',
  drive_file: '📎',
};

const SOURCE_ICONS: Record<string, string> = {
  local: '💾',
  google_drive: '🔷',
  dropbox: '📦',
  onedrive: '☁️',
  url: '🔗',
};

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📕',
  'application/vnd.google-apps.document': '📘',
  'application/vnd.google-apps.spreadsheet': '📗',
  'application/vnd.google-apps.presentation': '📙',
  'application/vnd.google-apps.folder': '📁',
  'image/': '🖼️',
  'video/': '🎥',
  'audio/': '🎵',
  'text/': '📄',
};

function getMimeIcon(mime: string | null): string {
  if (!mime) return '📎';
  for (const [prefix, icon] of Object.entries(MIME_ICONS)) {
    if (mime.startsWith(prefix)) return icon;
  }
  return '📎';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getViewerUrl(doc: Document): string | null {
  if (!doc.url) return null;
  // Google Drive files — use Google's embedded viewer
  if (doc.fileSource === 'google_drive' && doc.url.includes('drive.google.com')) {
    // Extract file ID from various URL formats
    const match = doc.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    // For Google Docs/Sheets/Slides, convert to embed
    if (doc.url.includes('/document/')) return doc.url.replace('/edit', '/preview').replace('/view', '/preview');
    if (doc.url.includes('/spreadsheets/')) return doc.url.replace('/edit', '/preview').replace('/view', '/preview');
    if (doc.url.includes('/presentation/')) return doc.url.replace('/edit', '/embed').replace('/view', '/embed');
  }
  // PDF URLs
  if (doc.mimeType === 'application/pdf' || doc.url.endsWith('.pdf')) {
    return doc.url;
  }
  // Images
  if (doc.mimeType?.startsWith('image/')) {
    return doc.url;
  }
  return null;
}

function canPreview(doc: Document): boolean {
  return !!getViewerUrl(doc);
}

export function DriveView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('note');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editFileSource, setEditFileSource] = useState('local');
  const [activeAccountTab, setActiveAccountTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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

  // Derive account tabs
  const accountTabs = useMemo(() => {
    const emails = new Set<string>();
    for (const doc of documents) {
      if (doc.accountEmail) emails.add(doc.accountEmail);
    }
    return Array.from(emails).sort();
  }, [documents]);

  const handleCreate = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, type: editType, url: editUrl || null, fileSource: editFileSource }),
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
        setEditUrl('');
        setEditFileSource('local');
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
        body: JSON.stringify({ title: editTitle, content: editContent, type: editType, url: editUrl || null, fileSource: editFileSource }),
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
      if (selected?.id === id) { setSelected(null); setViewerOpen(false); }
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  };

  // Filter by search + account tab
  const filtered = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.content || '').toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeAccountTab === 'all' ||
        (activeAccountTab === 'local' ? !d.accountEmail : d.accountEmail === activeAccountTab);
      return matchesSearch && matchesTab;
    });
  }, [documents, search, activeAccountTab]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)] text-sm">Loading documents...</div>
      </div>
    );
  }

  // File viewer overlay
  if (viewerOpen && selected) {
    const viewerUrl = getViewerUrl(selected);
    const isImage = selected.mimeType?.startsWith('image/');
    return (
      <div className="h-full flex flex-col">
        {/* Viewer toolbar */}
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setViewerOpen(false)}
              className="text-xs text-[var(--text-muted)] hover:text-white px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              ← Back
            </button>
            <span className="text-sm font-medium text-white truncate">{selected.title}</span>
            {selected.mimeType && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)] font-mono">{selected.mimeType.split('/').pop()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.url && (
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded bg-brand-500/10 transition-colors"
              >
                Open External ↗
              </a>
            )}
          </div>
        </div>
        {/* Viewer content */}
        <div className="flex-1 bg-black/20">
          {isImage && selected.url ? (
            <div className="h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.url} alt={selected.title} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          ) : viewerUrl ? (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title={selected.title}
              allow="autoplay"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="text-4xl mb-4">{getMimeIcon(selected.mimeType)}</div>
              <h3 className="text-sm font-semibold text-white mb-2">Preview not available</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">This file type cannot be previewed inline.</p>
              {selected.url && (
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-4 py-2">
                  Open in new tab ↗
                </a>
              )}
            </div>
          )}
        </div>
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-[var(--text-muted)] hover:bg-white/[0.08] transition-colors"
            title={viewMode === 'table' ? 'Grid view' : 'Table view'}
          >
            {viewMode === 'table' ? '⊞' : '☰'}
          </button>
          <button
            onClick={() => { setCreating(true); setEditing(true); setSelected(null); setEditTitle(''); setEditContent(''); setEditType('note'); setEditUrl(''); setEditFileSource('local'); }}
            className="btn-primary text-xs px-3 py-1 flex-shrink-0"
          >
            + New
          </button>
        </div>
      </div>

      {/* Account tabs (only if multiple accounts) */}
      {accountTabs.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[var(--border-color)] flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveAccountTab('all')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap',
              activeAccountTab === 'all' ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-muted)] hover:bg-white/[0.04]'
            )}
          >
            All Files
          </button>
          <button
            onClick={() => setActiveAccountTab('local')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap',
              activeAccountTab === 'local' ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-muted)] hover:bg-white/[0.04]'
            )}
          >
            💾 Local
          </button>
          {accountTabs.map(email => (
            <button
              key={email}
              onClick={() => setActiveAccountTab(email)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap',
                activeAccountTab === email ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--text-muted)] hover:bg-white/[0.04]'
              )}
            >
              🔷 {email.split('@')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Document list / table */}
        <div className={cn('overflow-y-auto', (selected || creating) ? 'w-2/5 border-r border-[var(--border-color)]' : 'w-full')}>
          {filtered.length === 0 && !creating ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-3">📁</div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No documents{activeAccountTab !== 'all' ? ' in this account' : ''}</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                {activeAccountTab !== 'all' ? 'Sync your Google Drive to see files here.' : 'Create notes, reports, and templates. Divi can also generate documents for you via chat.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table view */
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)] text-[10px] uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)] text-[10px] uppercase tracking-wider hidden lg:table-cell">Size</th>
                  <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Modified</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => { setSelected(doc); setCreating(false); setEditing(false); }}
                    className={cn(
                      'border-b border-[var(--border-color)] cursor-pointer transition-colors',
                      selected?.id === doc.id ? 'bg-brand-500/5' : 'hover:bg-[var(--bg-surface)]'
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0">{doc.mimeType ? getMimeIcon(doc.mimeType) : (doc.fileSource !== 'local' ? (SOURCE_ICONS[doc.fileSource] || '🔗') : (TYPE_ICONS[doc.type] || '📝'))}</span>
                        <span className="text-[var(--text-primary)] truncate font-medium">{doc.title}</span>
                        {canPreview(doc) && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-brand-500/10 text-brand-400 flex-shrink-0">👁</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] capitalize hidden md:table-cell">
                      {doc.mimeType ? doc.mimeType.split('/').pop()?.replace('vnd.google-apps.', '') : doc.type.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] font-mono hidden lg:table-cell">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Grid view (original card layout) */
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
                    <span className="text-base flex-shrink-0">{doc.mimeType ? getMimeIcon(doc.mimeType) : (doc.fileSource !== 'local' ? (SOURCE_ICONS[doc.fileSource] || '🔗') : (TYPE_ICONS[doc.type] || '📝'))}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate block">{doc.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)] capitalize">{doc.type.replace('_', ' ')}</span>
                        {doc.fileSource !== 'local' && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">{doc.fileSource.replace('_', ' ')}</span>
                        )}
                        {doc.accountEmail && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-muted)]">{doc.accountEmail.split('@')[0]}</span>
                        )}
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
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={editFileSource}
                    onChange={(e) => setEditFileSource(e.target.value)}
                    className="input-field text-xs py-1 w-40"
                  >
                    <option value="local">💾 Local</option>
                    <option value="google_drive">🔷 Google Drive</option>
                    <option value="dropbox">📦 Dropbox</option>
                    <option value="onedrive">☁️ OneDrive</option>
                    <option value="url">🔗 External URL</option>
                  </select>
                  {editFileSource !== 'local' && (
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://..."
                      className="input-field text-xs py-1 flex-1"
                    />
                  )}
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={editFileSource !== 'local' ? 'Optional notes about this file...' : 'Write your content here... (Markdown supported)'}
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
                    {canPreview(selected) && (
                      <button
                        onClick={() => setViewerOpen(true)}
                        className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded bg-brand-500/10 transition-colors"
                      >
                        👁 View
                      </button>
                    )}
                    <button
                      onClick={() => { setEditing(true); setEditTitle(selected.title); setEditContent(selected.content || ''); setEditType(selected.type); setEditUrl(selected.url || ''); setEditFileSource(selected.fileSource || 'local'); }}
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
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs text-[var(--text-muted)] capitalize">{getMimeIcon(selected.mimeType)} {selected.mimeType ? selected.mimeType.split('/').pop() : selected.type.replace('_', ' ')}</span>
                  {selected.fileSource !== 'local' && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">
                      {SOURCE_ICONS[selected.fileSource] || '🔗'} {selected.fileSource.replace('_', ' ')}
                    </span>
                  )}
                  {selected.accountEmail && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-muted)]">📧 {selected.accountEmail}</span>
                  )}
                  {selected.fileSize && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">{formatFileSize(selected.fileSize)}</span>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">Updated {new Date(selected.updatedAt).toLocaleString()}</span>
                </div>
                {selected.url && (
                  <div className="flex gap-2 mb-4">
                    {canPreview(selected) && (
                      <button
                        onClick={() => setViewerOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-white bg-brand-500 hover:bg-brand-600 rounded px-3 py-1.5 transition-colors"
                      >
                        👁 Open in Viewer
                      </button>
                    )}
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-1.5 transition-colors"
                    >
                      🔗 Open in {selected.fileSource === 'google_drive' ? 'Google Drive' : selected.fileSource === 'dropbox' ? 'Dropbox' : selected.fileSource === 'onedrive' ? 'OneDrive' : 'browser'}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </a>
                  </div>
                )}
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
