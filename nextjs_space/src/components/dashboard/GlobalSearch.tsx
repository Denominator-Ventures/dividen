'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  icon: string;
  meta?: string;
  url?: string;
  section: 'personal' | 'network';
}

const TYPE_LABELS: Record<string, string> = {
  card: 'Board',
  contact: 'CRM',
  document: 'Drive',
  recording: 'Recordings',
  calendar: 'Calendar',
  email: 'Email',
  comms: 'Comms',
  queue: 'Queue',
  person: 'People',
  team: 'Teams',
  agent: 'Agents',
  job: 'Jobs',
};

const TYPE_COLORS: Record<string, string> = {
  card: '#4f7cff',
  contact: '#22c55e',
  document: '#f59e0b',
  recording: '#a855f7',
  calendar: '#3b82f6',
  email: '#f97316',
  comms: '#06b6d4',
  queue: '#6b7280',
  person: '#10b981',
  team: '#8b5cf6',
  agent: '#ec4899',
  job: '#eab308',
};

const SECTION_LABELS: Record<string, string> = {
  personal: 'Your Data',
  network: 'Network',
};

type SearchScope = 'all' | 'personal' | 'network';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setScope('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  const search = useCallback(async (q: string, s: SearchScope) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30&scope=${s}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(query, scope), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, scope, search]);

  // Navigate to result
  const navigateTo = useCallback((result: SearchResult) => {
    onClose();

    // Network results with direct URLs
    if (result.url) {
      router.push(result.url);
      return;
    }

    // Tab-based navigation for personal results
    const tabMap: Record<string, string> = {
      card: 'kanban',
      contact: 'crm',
      document: 'drive',
      recording: 'recordings',
      calendar: 'calendar',
      email: 'inbox',
      queue: 'queue',
      agent: 'marketplace',
      job: 'jobs',
      team: 'teams',
      person: 'connections',
    };
    if (result.type === 'comms') {
      router.push('/dashboard/comms');
    } else if (onNavigate && tabMap[result.type]) {
      onNavigate(tabMap[result.type]);
    }
  }, [onClose, onNavigate, router]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigateTo(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, selectedIndex, onClose, navigateTo]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('[data-result-item]');
      const selected = items[selectedIndex] as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useEffect(() => { setSelectedIndex(0); }, [results]);

  if (!isOpen) return null;

  // Group results by section, then by type
  const personalResults = results.filter(r => r.section === 'personal');
  const networkResults = results.filter(r => r.section === 'network');

  const groupByType = (items: SearchResult[]) =>
    items.reduce<Record<string, SearchResult[]>>((acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    }, {});

  const personalGrouped = groupByType(personalResults);
  const networkGrouped = groupByType(networkResults);

  let flatIndex = 0;

  const renderResultItem = (result: SearchResult) => {
    const idx = flatIndex++;
    return (
      <button
        key={`${result.type}-${result.id}`}
        data-result-item
        onClick={() => navigateTo(result)}
        onMouseEnter={() => setSelectedIndex(idx)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          idx === selectedIndex ? 'bg-brand-500/10' : 'hover:bg-[var(--bg-surface)]'
        }`}
      >
        <span className="text-base flex-shrink-0">{result.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate">{result.title}</div>
          <div className="text-[11px] text-[var(--text-muted)] truncate">{result.subtitle}</div>
        </div>
        {/* Connection/status badge for network results */}
        {result.meta && result.section === 'network' && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            result.meta === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
            result.meta === 'pending' ? 'bg-amber-500/15 text-amber-400' :
            result.meta === 'high' || result.meta === 'critical' ? 'bg-red-500/15 text-red-400' :
            'bg-[var(--bg-surface)] text-[var(--text-muted)]'
          }`}>
            {result.meta === 'active' ? 'Connected' : result.meta === 'pending' ? 'Pending' : result.meta}
          </span>
        )}
        {result.url && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] flex-shrink-0 opacity-50">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        {idx === selectedIndex && !result.url && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono">
            &#x21B5;
          </kbd>
        )}
      </button>
    );
  };

  const renderGroup = (type: string, items: SearchResult[]) => (
    <div key={type}>
      <div className="px-4 py-1.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
        <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>{TYPE_LABELS[type] || type}</span>
      </div>
      {items.map(renderResultItem)}
    </div>
  );

  const scopeButtons: { id: SearchScope; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'personal', label: 'My Data' },
    { id: 'network', label: 'Network' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-[12%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[640px] z-50">
        <div className="bg-[#141414] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything \u2014 your data, people, teams, agents, jobs\u2026"
              className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono">ESC</kbd>
          </div>

          {/* Scope Pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border-color)]">
            {scopeButtons.map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  scope === s.id
                    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
            {query.length >= 2 && !loading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.length < 2 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-3">Search across your command center and the DiviDen network</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.entries(TYPE_LABELS).map(([type, label]) => (
                    <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-[var(--border-color)] text-[var(--text-muted)]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal results */}
            {Object.keys(personalGrouped).length > 0 && Object.keys(networkGrouped).length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{SECTION_LABELS.personal}</span>
              </div>
            )}
            {Object.entries(personalGrouped).map(([type, items]) => renderGroup(type, items))}

            {/* Network results */}
            {Object.keys(networkGrouped).length > 0 && (
              <>
                {Object.keys(personalGrouped).length > 0 && (
                  <div className="mx-4 my-1 border-t border-[var(--border-color)]" />
                )}
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    {SECTION_LABELS.network}
                  </span>
                </div>
                {Object.entries(networkGrouped).map(([type, items]) => renderGroup(type, items))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono text-[9px]">&uarr;&darr;</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono text-[9px]">&#x21B5;</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono text-[9px]">esc</kbd>
                close
              </span>
            </div>
            {results.length > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
