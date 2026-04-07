'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NotificationRule {
  id: string;
  name: string;
  eventType: string;
  conditions: string | null;
  message: string;
  style: string;
  sound: boolean;
  enabled: boolean;
  createdAt: string;
}

const EVENT_TYPES = [
  {
    id: 'meeting_starting',
    label: '📅 Meeting Starting',
    description: 'Alert when a calendar event is about to begin',
    vars: ['{{title}}', '{{minutes}}', '{{time}}'],
    defaultMessage: "Meeting '{{title}}' starts in {{minutes}}m",
    defaultConditions: { minutesBefore: 5 },
    defaultStyle: 'warning',
  },
  {
    id: 'task_overdue',
    label: '⏰ Task Overdue',
    description: 'Alert when a queued task has been waiting too long',
    vars: ['{{title}}', '{{hours}}'],
    defaultMessage: "Task '{{title}}' has been waiting {{hours}}h",
    defaultConditions: { hoursOverdue: 24 },
    defaultStyle: 'urgent',
  },
  {
    id: 'email_received',
    label: '📧 Email Received',
    description: 'Alert when a new unread email arrives',
    vars: ['{{from}}', '{{subject}}'],
    defaultMessage: 'New email from {{from}}: {{subject}}',
    defaultConditions: {},
    defaultStyle: 'info',
  },
  {
    id: 'contact_stale',
    label: '👤 Contact Stale',
    description: 'Alert when contacts haven\'t been updated recently',
    vars: ['{{count}}', '{{names}}', '{{days}}'],
    defaultMessage: '{{count}} contacts need attention: {{names}}',
    defaultConditions: { staleDays: 7 },
    defaultStyle: 'info',
  },
  {
    id: 'card_moved',
    label: '📌 Card Moved',
    description: 'Alert when a Kanban card changes stage',
    vars: ['{{summary}}'],
    defaultMessage: '{{summary}}',
    defaultConditions: {},
    defaultStyle: 'success',
  },
  {
    id: 'queue_added',
    label: '📥 Queue Item Added',
    description: 'Alert when a new task enters the queue',
    vars: ['{{title}}', '{{source}}'],
    defaultMessage: 'New in queue: {{title}} (from {{source}})',
    defaultConditions: {},
    defaultStyle: 'info',
  },
  {
    id: 'custom',
    label: '✨ Custom',
    description: 'A persistent banner with custom text',
    vars: [],
    defaultMessage: '',
    defaultConditions: {},
    defaultStyle: 'info',
  },
];

const STYLE_OPTIONS = [
  { id: 'info', label: 'Info', color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
  { id: 'warning', label: 'Warning', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'urgent', label: 'Urgent', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { id: 'success', label: 'Success', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
];

export function NotificationManager() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newEventType, setNewEventType] = useState('meeting_starting');
  const [newName, setNewName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newStyle, setNewStyle] = useState('info');
  const [newSound, setNewSound] = useState(false);
  const [newConditions, setNewConditions] = useState<Record<string, number | string | undefined>>({});

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) setRules(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // When event type changes, populate defaults
  useEffect(() => {
    const preset = EVENT_TYPES.find(e => e.id === newEventType);
    if (preset) {
      if (!newName) setNewName(preset.label.replace(/^[^\s]+ /, ''));
      setNewMessage(preset.defaultMessage);
      setNewStyle(preset.defaultStyle);
      setNewConditions(preset.defaultConditions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEventType]);

  const handleCreate = async () => {
    if (!newName || !newMessage) return;
    setSaving(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          eventType: newEventType,
          message: newMessage,
          style: newStyle,
          sound: newSound,
          conditions: Object.keys(newConditions).length > 0 ? newConditions : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => [data.data, ...prev]);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification rule?')) return;
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const resetForm = () => {
    setShowCreate(false);
    setNewName('');
    setNewMessage('');
    setNewStyle('info');
    setNewSound(false);
    setNewConditions({});
    setNewEventType('meeting_starting');
  };

  const getStyleConfig = (style: string) => STYLE_OPTIONS.find(s => s.id === style) || STYLE_OPTIONS[0];
  const getEventConfig = (eventType: string) => EVENT_TYPES.find(e => e.id === eventType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Cockpit Banners</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Custom notifications that appear as banners across the chat in cockpit mode.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-xs rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
        >
          + Add Notification
        </button>
      </div>

      {/* Existing rules */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 && !showCreate ? (
        <div className="text-center py-8 px-4">
          <div className="text-3xl mb-3">🔔</div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">No notification rules yet</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Create rules to get banner alerts in cockpit mode. For example, get notified when a meeting is starting, a task is overdue, or a new email arrives.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const styleConfig = getStyleConfig(rule.style);
            const eventConfig = getEventConfig(rule.eventType);
            return (
              <div
                key={rule.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  rule.enabled ? styleConfig.color : 'bg-[var(--bg-surface)] border-[var(--border-color)] opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <span className="text-[10px] label-mono px-1.5 py-0.5 rounded bg-black/20">
                        {eventConfig?.label || rule.eventType}
                      </span>
                    </div>
                    <p className="text-xs opacity-80 truncate">{rule.message}</p>
                    {rule.conditions && (
                      <p className="text-[10px] opacity-60 mt-0.5">
                        Conditions: {Object.entries(JSON.parse(rule.conditions)).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {rule.sound && <span className="text-[10px]">🔊</span>}
                    <button
                      onClick={() => handleToggle(rule.id, !rule.enabled)}
                      className={cn(
                        'w-8 h-4 rounded-full transition-colors relative',
                        rule.enabled ? 'bg-green-500/40' : 'bg-[var(--bg-primary)]'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                        rule.enabled ? 'left-4' : 'left-0.5'
                      )} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">New Notification Rule</h4>
            <button onClick={resetForm} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
          </div>

          {/* Event type grid */}
          <div>
            <label className="label-mono text-[10px] mb-2 block">Trigger Event</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(evt => (
                <button
                  key={evt.id}
                  onClick={() => { setNewEventType(evt.id); setNewName(evt.label.replace(/^[^\s]+ /, '')); }}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                    newEventType === evt.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  )}
                >
                  <div className="font-medium">{evt.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{evt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Meeting Alert"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Message template */}
          <div>
            <label className="label-mono text-[10px] mb-1 block">Banner Message</label>
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              rows={2}
              placeholder="Use {{variables}} for dynamic content"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none font-mono"
            />
            {getEventConfig(newEventType)?.vars && getEventConfig(newEventType)!.vars.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {getEventConfig(newEventType)!.vars.map(v => (
                  <button
                    key={v}
                    onClick={() => setNewMessage(prev => prev + ' ' + v)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conditions (dynamic based on event type) */}
          {newEventType === 'meeting_starting' && (
            <div>
              <label className="label-mono text-[10px] mb-1 block">Minutes Before</label>
              <input
                type="number"
                value={newConditions.minutesBefore ?? 5}
                onChange={e => setNewConditions(prev => ({ ...prev, minutesBefore: parseInt(e.target.value) || 5 }))}
                min={1}
                max={60}
                className="w-24 px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          )}
          {newEventType === 'task_overdue' && (
            <div>
              <label className="label-mono text-[10px] mb-1 block">Hours Overdue</label>
              <input
                type="number"
                value={newConditions.hoursOverdue ?? 24}
                onChange={e => setNewConditions(prev => ({ ...prev, hoursOverdue: parseInt(e.target.value) || 24 }))}
                min={1}
                className="w-24 px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          )}
          {newEventType === 'contact_stale' && (
            <div>
              <label className="label-mono text-[10px] mb-1 block">Days Before Stale</label>
              <input
                type="number"
                value={newConditions.staleDays ?? 7}
                onChange={e => setNewConditions(prev => ({ ...prev, staleDays: parseInt(e.target.value) || 7 }))}
                min={1}
                className="w-24 px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          )}

          {/* Style + Sound */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="label-mono text-[10px] mb-1 block">Style</label>
              <div className="flex gap-2">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setNewStyle(s.id)}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-[10px] rounded-lg border transition-colors text-center',
                      newStyle === s.id ? s.color : 'border-[var(--border-color)] text-[var(--text-muted)]'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={newSound}
                onChange={e => setNewSound(e.target.checked)}
                className="rounded border-[var(--border-color)]"
              />
              🔊 Sound
            </label>
          </div>

          {/* Preview */}
          {newMessage && (
            <div>
              <label className="label-mono text-[10px] mb-1 block">Preview</label>
              <div className={cn(
                'px-4 py-2.5 rounded-lg border text-xs font-medium',
                getStyleConfig(newStyle).color
              )}>
                {newMessage}
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving || !newName || !newMessage}
            className="w-full py-2 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Notification Rule'}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)]">
        <p className="font-medium text-[var(--text-secondary)] mb-1">How it works</p>
        <p>
          Notification rules are checked every 30 seconds while you're in cockpit mode.
          When conditions are met, a banner slides across the top of your chat view.
          Use template variables (e.g. {'{{title}}'}) to include dynamic data in the message.
        </p>
      </div>
    </div>
  );
}
