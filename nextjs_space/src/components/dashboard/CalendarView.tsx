'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEventData } from '@/types';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1).toDateString();
  const b = new Date(d2).toDateString();
  return a === b;
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return new Date(dateStr).toDateString() === t.toDateString();
}

function getDayLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  return formatDate(dateStr);
}

interface CreateEventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEventData | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateEventForm>({
    title: '', date: '', startTime: '', endTime: '', location: '', description: '',
  });

  const fetchEvents = useCallback(async () => {
    try {
      // Fetch 30 days of events
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      const res = await fetch(`/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (e) {
      console.error('Failed to fetch calendar events:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = useCallback(async () => {
    if (!form.title || !form.date || !form.startTime) return;
    setSaving(true);
    try {
      const startTime = new Date(`${form.date}T${form.startTime}`);
      const endTime = form.endTime ? new Date(`${form.date}T${form.endTime}`) : null;
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          startTime: startTime.toISOString(),
          endTime: endTime?.toISOString() || null,
          location: form.location || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => [...prev, data.data].sort((a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));
        setCreating(false);
        setForm({ title: '', date: '', startTime: '', endTime: '', location: '', description: '' });
        setSelected(data.data);
      }
    } catch (e) {
      console.error('Failed to create event:', e);
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    } catch (e) {
      console.error('Failed to delete event:', e);
    }
  }, [selected]);

  // Group events by day
  const grouped: { label: string; date: string; events: CalendarEventData[] }[] = [];
  for (const evt of events) {
    const existing = grouped.find((g) => isSameDay(g.date, evt.startTime));
    if (existing) {
      existing.events.push(evt);
    } else {
      grouped.push({ label: getDayLabel(evt.startTime), date: evt.startTime, events: [evt] });
    }
  }

  const parseAttendees = (att: string | null): { name?: string; email?: string }[] => {
    if (!att) return [];
    try { return JSON.parse(att); } catch { return []; }
  };

  return (
    <div className="h-full flex">
      {/* Left: Agenda list */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col">
        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
          <span className="label-mono text-[var(--text-muted)]" style={{ fontSize: '10px' }}>Next 30 Days</span>
          <button
            onClick={() => setCreating(true)}
            className="flex-shrink-0 bg-[var(--brand-primary)] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-brand-600 transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Event</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">No upcoming events</p>
              <p className="text-xs text-[var(--text-muted)]">Connect your calendar via webhooks or add events manually.</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                {/* Day header */}
                <div className="px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-color)] sticky top-0 z-10">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isToday(group.date) ? 'text-brand-400' : 'text-[var(--text-muted)]'
                  }`}>
                    {group.label}
                  </span>
                </div>
                {group.events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => setSelected(evt)}
                    className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-color)] transition-colors ${
                      selected?.id === evt.id ? 'bg-[var(--brand-primary)]/8' : 'hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Time column */}
                      <div className="flex-shrink-0 w-14 text-right">
                        <span className="text-xs font-medium text-brand-400">{formatTime(evt.startTime)}</span>
                        {evt.endTime && (
                          <span className="block text-[10px] text-[var(--text-muted)]">{formatTime(evt.endTime)}</span>
                        )}
                      </div>
                      {/* Divider */}
                      <div className="w-0.5 self-stretch bg-brand-500/30 rounded-full flex-shrink-0" />
                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{evt.title}</p>
                        {evt.location && (
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">📍 {evt.location}</p>
                        )}
                        {evt.attendees && parseAttendees(evt.attendees).length > 0 && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            👤 {parseAttendees(evt.attendees).length} attendee{parseAttendees(evt.attendees).length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail / Create */}
      <div className="hidden md:flex flex-1 flex-col min-h-0">
        {creating ? (
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Event</h3>
              <button onClick={() => setCreating(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40" />
                </div>
                <div>
                  <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">Start</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40" />
                </div>
                <div>
                  <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">End</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40" />
                </div>
              </div>
              <div>
                <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40" placeholder="Optional" />
              </div>
              <div>
                <label className="label-mono text-[var(--text-muted)] text-[10px] block mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-500/40 resize-none" placeholder="Optional" />
              </div>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.date || !form.startTime}
                className="bg-[var(--brand-primary)] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-40">
                {saving ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.title}</h3>
                <button onClick={() => handleDelete(selected.id)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[var(--border-color)] text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors">Delete</button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                <span>📅 {formatDate(selected.startTime)}</span>
                <span>⏰ {formatTime(selected.startTime)}{selected.endTime ? ` – ${formatTime(selected.endTime)}` : ''}</span>
                {selected.location && <span>📍 {selected.location}</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selected.description && (
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap mb-4">{selected.description}</p>
              )}
              {selected.attendees && parseAttendees(selected.attendees).length > 0 && (
                <div>
                  <span className="label-mono text-[var(--text-muted)] text-[10px] block mb-2">Attendees</span>
                  <div className="space-y-1">
                    {parseAttendees(selected.attendees).map((a, i) => (
                      <div key={i} className="text-xs text-[var(--text-secondary)]">
                        👤 {a.name || a.email || 'Unknown'}{a.email && a.name ? ` (${a.email})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 text-[10px] text-[var(--text-muted)]">
                Source: {selected.source} • Created {new Date(selected.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Calendar</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              Your upcoming events from connected calendars appear here. Connect Google Calendar via webhooks, or add events manually.
            </p>
            <button onClick={() => setCreating(true)}
              className="mt-4 bg-[var(--brand-primary)] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-brand-600 transition-colors">
              Add Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
