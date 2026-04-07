'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'card' | 'contact' | 'document' | 'recording' | 'calendar' | 'email' | 'comms' | 'queue';
  title: string;
  subtitle: string;
  icon: string;
  meta?: string;
}

const TYPE_LABELS: Record<string, string> = {
  card: 'Board',
  contact: 'CRM',
  document: 'Drive',
  recording: 'Recordings',
  calendar: 'Calendar',
  email: 'Inbox',
  comms: 'Comms',
  queue: 'Queue',
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
};

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
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=25`);
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
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Navigate to result
  const navigateTo = useCallback((result: SearchResult) => {
    onClose();
    const tabMap: Record<string, string> = {
      card: 'board',
      contact: 'crm',
      document: 'drive',
      recording: 'recordings',
      calendar: 'calendar',
      email: 'inbox',
      queue: 'queue',
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
      const selected = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  if (!isOpen) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Build flat list for keyboard navigation while rendering groups
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[600px] z-50">
        <div className="bg-[#141414] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards, contacts, documents, events, emails…"
              className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[50vh] overflow-y-auto"
          >
            {query.length >= 2 && !loading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.length < 2 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-3">Search across your entire command center</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.entries(TYPE_LABELS).map(([type, label]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-[var(--border-color)] text-[var(--text-muted)]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[type] }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                {/* Type Header */}
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  />
                  <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>
                    {TYPE_LABELS[type] || type}
                  </span>
                </div>

                {/* Items */}
                {items.map((result) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === selectedIndex
                          ? 'bg-brand-500/10'
                          : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text-primary)] truncate">
                          {result.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {result.subtitle}
                        </div>
                      </div>
                      {idx === selectedIndex && (
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono text-[9px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded font-mono text-[9px]">↵</kbd>
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
