'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Extension {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  source: string;
  sourceUrl: string | null;
  version: string;
  config: string;
  scope: string;
  scopeId: string | null;
  isActive: boolean;
  priority: number;
  installedById: string;
  installedBy: { id: string; name: string | null; email: string };
  createdAt: string;
  updatedAt: string;
}

interface ParsedConfig {
  promptText?: string;
  actionTags?: Array<{ name: string; description: string; syntax: string }>;
  parameters?: Record<string, any>;
  model?: string;
}

type View = 'list' | 'detail' | 'import';

export function ExtensionsView() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedExt, setSelectedExt] = useState<Extension | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Import form state
  const [importName, setImportName] = useState('');
  const [importDescription, setImportDescription] = useState('');
  const [importType, setImportType] = useState<'skill' | 'persona' | 'prompt_layer'>('skill');
  const [importSource, setImportSource] = useState<'manual' | 'custom'>('manual');
  const [importScope, setImportScope] = useState<'user' | 'team' | 'project' | 'global'>('user');
  const [importScopeId, setImportScopeId] = useState('');
  const [importConfig, setImportConfig] = useState('');
  const [importPriority, setImportPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<string>('all');

  const fetchExtensions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/extensions');
      if (!res.ok) throw new Error('Failed to fetch extensions');
      const data = await res.json();
      setExtensions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExtensions(); }, [fetchExtensions]);

  const toggleActive = async (ext: Extension) => {
    try {
      const res = await fetch(`/api/extensions/${ext.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ext.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchExtensions();
      if (selectedExt?.id === ext.id) {
        setSelectedExt({ ...ext, isActive: !ext.isActive });
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const deleteExtension = async (id: string) => {
    if (!confirm('Remove this extension? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/extensions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchExtensions();
      if (selectedExt?.id === id) {
        setSelectedExt(null);
        setView('list');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleImport = async () => {
    setError(null);
    if (!importName.trim()) { setError('Name is required'); return; }
    if (!importConfig.trim()) { setError('Config JSON is required'); return; }

    // Validate JSON
    try { JSON.parse(importConfig); } catch {
      setError('Config must be valid JSON'); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importName.trim(),
          description: importDescription.trim() || null,
          type: importType,
          source: importSource,
          scope: importScope,
          scopeId: importScope === 'user' || importScope === 'global' ? null : importScopeId || null,
          config: importConfig,
          priority: importPriority,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to install extension');
      }
      // Reset form & go back to list
      setImportName(''); setImportDescription(''); setImportConfig('');
      setImportScopeId(''); setImportPriority(0);
      setImportType('skill'); setImportSource('manual'); setImportScope('user');
      setView('list');
      await fetchExtensions();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const parseConfig = (configStr: string): ParsedConfig => {
    try { return JSON.parse(configStr); } catch { return {}; }
  };

  const filteredExtensions = extensions.filter(ext => {
    if (filterType !== 'all' && ext.type !== filterType) return false;
    if (filterScope !== 'all' && ext.scope !== filterScope) return false;
    return true;
  });

  const typeIcon = (type: string) => type === 'persona' ? '🎭' : type === 'prompt_layer' ? '📜' : '⚡';
  const scopeIcon = (scope: string) => scope === 'user' ? '👤' : scope === 'team' ? '👥' : scope === 'project' ? '📋' : '🌐';
  const sourceLabel = (source: string) => source === 'custom' ? '🔧 Custom' : '📝 Manual';

  // ── Import View ──────────────────────────────────────────────────────
  if (view === 'import') {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setView('list')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">← Back</button>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Install Extension</h3>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Name *</label>
            <input
              type="text"
              value={importName}
              onChange={e => setImportName(e.target.value)}
              placeholder="e.g. Deal Closer Pro"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
            <input
              type="text"
              value={importDescription}
              onChange={e => setImportDescription(e.target.value)}
              placeholder="What does this extension do?"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
              <select
                value={importType}
                onChange={e => setImportType(e.target.value as any)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="skill">⚡ Skill</option>
                <option value="persona">🎭 Persona</option>
                <option value="prompt_layer">📜 Prompt Layer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Source</label>
              <select
                value={importSource}
                onChange={e => setImportSource(e.target.value as any)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="manual">📝 Manual</option>
                <option value="custom">🔧 Custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Scope</label>
              <select
                value={importScope}
                onChange={e => setImportScope(e.target.value as any)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="user">👤 Personal</option>
                <option value="team">👥 Team</option>
                <option value="project">📋 Project</option>
                <option value="global">🌐 Global</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Priority</label>
              <input
                type="number"
                value={importPriority}
                onChange={e => setImportPriority(Number(e.target.value))}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>

          {(importScope === 'team' || importScope === 'project') && (
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                {importScope === 'team' ? 'Team ID' : 'Project ID'}
              </label>
              <input
                type="text"
                value={importScopeId}
                onChange={e => setImportScopeId(e.target.value)}
                placeholder={`Paste the ${importScope} ID`}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Config JSON *</label>
            <textarea
              value={importConfig}
              onChange={e => setImportConfig(e.target.value)}
              placeholder={`{\n  "promptText": "You are now an expert negotiator...",\n  "actionTags": [\n    {\n      "name": "negotiate",\n      "description": "Launch negotiation mode",\n      "syntax": "[[negotiate:{terms}]]"\n    }\n  ],\n  "parameters": {}\n}`}
              rows={10}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] font-mono"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Supported fields: <code>promptText</code>, <code>actionTags</code>, <code>parameters</code>, <code>model</code>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={saving}
              className="flex-1 bg-[var(--brand-primary)] text-white text-sm font-medium py-2 rounded-lg hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Installing...' : '🧩 Install Extension'}
            </button>
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────────────────────
  if (view === 'detail' && selectedExt) {
    const config = parseConfig(selectedExt.config);
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => { setView('list'); setSelectedExt(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">← Back</button>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {typeIcon(selectedExt.type)} {selectedExt.name}
          </h3>
          <span className={cn(
            'ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium',
            selectedExt.isActive ? 'bg-green-500/15 text-green-400' : 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]'
          )}>
            {selectedExt.isActive ? 'Active' : 'Disabled'}
          </span>
        </div>

        {/* Meta */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
          {selectedExt.description && (
            <p className="text-xs text-[var(--text-secondary)]">{selectedExt.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
            <div>Type: <span className="text-[var(--text-primary)]">{selectedExt.type}</span></div>
            <div>Scope: <span className="text-[var(--text-primary)]">{scopeIcon(selectedExt.scope)} {selectedExt.scope}</span></div>
            <div>Source: <span className="text-[var(--text-primary)]">{sourceLabel(selectedExt.source)}</span></div>
            <div>Version: <span className="text-[var(--text-primary)]">{selectedExt.version}</span></div>
            <div>Priority: <span className="text-[var(--text-primary)]">{selectedExt.priority}</span></div>
            <div>By: <span className="text-[var(--text-primary)]">{selectedExt.installedBy.name || selectedExt.installedBy.email}</span></div>
          </div>
          {selectedExt.sourceUrl && (
            <a href={selectedExt.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--brand-primary)] hover:underline">
              View source →
            </a>
          )}
        </div>

        {/* Config Preview */}
        {config.promptText && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">📜 Prompt Text</h4>
            <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
              {config.promptText}
            </pre>
          </div>
        )}

        {config.actionTags && config.actionTags.length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">⚡ Action Tags</h4>
            <div className="space-y-1">
              {config.actionTags.map((tag, i) => (
                <div key={i} className="text-[10px]">
                  <code className="text-[var(--brand-primary)]">{tag.syntax}</code>
                  <span className="text-[var(--text-muted)] ml-2">— {tag.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {config.parameters && Object.keys(config.parameters).length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">⚙ Parameters</h4>
            <pre className="text-[10px] text-[var(--text-secondary)] font-mono">
              {JSON.stringify(config.parameters, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw Config */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">🔧 Raw Config</h4>
          <pre className="text-[10px] text-[var(--text-muted)] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {JSON.stringify(parseConfig(selectedExt.config), null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleActive(selectedExt)}
            className={cn(
              'flex-1 text-sm font-medium py-2 rounded-lg transition-colors',
              selectedExt.isActive
                ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
            )}
          >
            {selectedExt.isActive ? '⏸ Disable' : '▶ Enable'}
          </button>
          <button
            onClick={() => deleteExtension(selectedExt.id)}
            className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            🗑 Remove
          </button>
        </div>
      </div>
    );
  }

  // ── List View ────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">🧩 Extensions</h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Install skills, personas & prompt layers to augment Divi
          </p>
        </div>
        <button
          onClick={() => setView('import')}
          className="bg-[var(--brand-primary)] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--brand-primary)]/90 transition-colors"
        >
          + Install
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="skill">⚡ Skills</option>
          <option value="persona">🎭 Personas</option>
          <option value="prompt_layer">📜 Prompt Layers</option>
        </select>
        <select
          value={filterScope}
          onChange={e => setFilterScope(e.target.value)}
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none"
        >
          <option value="all">All Scopes</option>
          <option value="user">👤 Personal</option>
          <option value="team">👥 Team</option>
          <option value="project">📋 Project</option>
          <option value="global">🌐 Global</option>
        </select>
      </div>

      {/* Extension list */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-xs">Loading extensions...</div>
      ) : filteredExtensions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🧩</div>
          <p className="text-sm text-[var(--text-muted)] mb-1">No extensions installed</p>
          <p className="text-[10px] text-[var(--text-muted)] mb-4">
            Extensions add new skills, personas, and prompt layers to your Divi agent.
            Create your own or paste a config JSON to install.
          </p>
          <button
            onClick={() => setView('import')}
            className="bg-[var(--brand-primary)] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[var(--brand-primary)]/90 transition-colors"
          >
            Install Your First Extension
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExtensions.map(ext => (
            <button
              key={ext.id}
              onClick={() => { setSelectedExt(ext); setView('detail'); }}
              className="w-full text-left bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3 hover:border-[var(--brand-primary)]/40 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{typeIcon(ext.type)}</span>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                      {ext.name}
                    </div>
                    {ext.description && (
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{ext.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">{scopeIcon(ext.scope)} {ext.scope}</span>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    ext.isActive ? 'bg-green-400' : 'bg-[var(--text-muted)]'
                  )} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                <span>{sourceLabel(ext.source)}</span>
                <span>v{ext.version}</span>
                {
                  (() => {
                    const config = parseConfig(ext.config);
                    const tagCount = config.actionTags?.length || 0;
                    return tagCount > 0 ? <span>{tagCount} action tag{tagCount > 1 ? 's' : ''}</span> : null;
                  })()
                }
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
