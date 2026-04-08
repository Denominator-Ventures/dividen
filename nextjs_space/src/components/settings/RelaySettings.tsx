'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type RelayMode = 'full' | 'selective' | 'minimal' | 'off';
type BriefVisibility = 'self' | 'connections' | 'public';

interface RelayPreferences {
  relayMode: RelayMode;
  allowAmbientInbound: boolean;
  allowAmbientOutbound: boolean;
  allowBroadcasts: boolean;
  autoRespondAmbient: boolean;
  relayQuietHours: { start: string; end: string; timezone: string } | null;
  relayTopicFilters: string[];
  briefVisibility: BriefVisibility;
  showBriefOnRelay: boolean;
}

const RELAY_MODES: Array<{ id: RelayMode; label: string; icon: string; description: string; detail: string }> = [
  {
    id: 'full',
    label: 'Full Participation',
    icon: '🌊',
    description: 'Your Divi actively participates in all relay types — direct, broadcast, and ambient.',
    detail: 'This is the recommended mode. Your agent will naturally weave ambient questions into conversation, respond to broadcasts, and proactively suggest relays when it detects you need information from a connection.',
  },
  {
    id: 'selective',
    label: 'Selective',
    icon: '🎯',
    description: 'Direct relays only. Ambient and broadcast participation is individually configurable below.',
    detail: 'Use this if you want fine-grained control over which relay types you participate in. You can toggle ambient and broadcast independently.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    icon: '🔇',
    description: 'Only receive direct relays addressed specifically to you. No ambient, no broadcasts.',
    detail: 'Your agent will still process direct relay requests, but won\'t participate in ambient information gathering or team-wide broadcasts.',
  },
  {
    id: 'off',
    label: 'Relay Off',
    icon: '⛔',
    description: 'Disable all agent-to-agent communication. You can still use DiviDen for personal productivity.',
    detail: 'No relays will be sent or received. Your connections can still see your profile, but their agents cannot reach yours.',
  },
];

const BRIEF_VISIBILITY_OPTIONS: Array<{ id: BriefVisibility; label: string; icon: string; description: string }> = [
  {
    id: 'self',
    label: 'Only Me',
    icon: '🔒',
    description: 'Only you can see the reasoning briefs behind agent actions.',
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: '👥',
    description: 'Your connections can see the brief behind relays sent to them — full transparency.',
  },
  {
    id: 'public',
    label: 'Public',
    icon: '🌐',
    description: 'Anyone can see reasoning briefs. Maximum accountability.',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function RelaySettings() {
  const [prefs, setPrefs] = useState<RelayPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [newTopicFilter, setNewTopicFilter] = useState('');

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) {
        const p = data.profile;
        setPrefs({
          relayMode: p.relayMode || 'full',
          allowAmbientInbound: p.allowAmbientInbound ?? true,
          allowAmbientOutbound: p.allowAmbientOutbound ?? true,
          allowBroadcasts: p.allowBroadcasts ?? true,
          autoRespondAmbient: p.autoRespondAmbient ?? false,
          relayQuietHours: p.relayQuietHours || null,
          relayTopicFilters: p.relayTopicFilters || [],
          briefVisibility: p.briefVisibility || 'self',
          showBriefOnRelay: p.showBriefOnRelay ?? true,
        });
      }
    } catch (e) {
      console.error('Failed to load relay preferences:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const update = (field: keyof RelayPreferences, value: any) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [field]: value });
    setDirty(true);
  };

  const save = async () => {
    if (!prefs || !dirty) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data.success) {
        setDirty(false);
        setSaveMessage('Relay preferences saved');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save');
      }
    } catch {
      setSaveMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addTopicFilter = () => {
    if (!prefs || !newTopicFilter.trim()) return;
    const filters = [...prefs.relayTopicFilters, newTopicFilter.trim().toLowerCase()];
    update('relayTopicFilters', [...new Set(filters)]);
    setNewTopicFilter('');
  };

  const removeTopicFilter = (topic: string) => {
    if (!prefs) return;
    update('relayTopicFilters', prefs.relayTopicFilters.filter(t => t !== topic));
  };

  if (loading || !prefs) {
    return <div className="animate-pulse text-[var(--text-secondary)] py-8">Loading relay preferences...</div>;
  }

  const isSelectiveMode = prefs.relayMode === 'selective';
  const isOff = prefs.relayMode === 'off';
  const isMinimal = prefs.relayMode === 'minimal';

  return (
    <div className="space-y-8">
      {/* Save Bar */}
      {dirty && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-lg p-3">
          <span className="text-sm text-brand-400">You have unsaved changes</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 bg-[var(--brand-primary)] text-white text-sm rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
      {saveMessage && (
        <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          ✓ {saveMessage}
        </div>
      )}

      {/* ─── What is the Relay Protocol? ─── */}
      <div className="bg-[var(--bg-surface)] rounded-xl p-5 border border-[var(--border-primary)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span>🌊</span> The Ambient Relay Protocol
        </h3>
        <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p>
            DiviDen uses a new communication layer between AI agents — not messages between people, but
            <strong className="text-[var(--text-primary)]"> structured coordination between agents on behalf of their humans</strong>.
          </p>
          <p>
            There are three modes of relay:
          </p>
          <ul className="space-y-2 ml-1">
            <li className="flex gap-2">
              <span className="text-brand-400 shrink-0">Direct →</span>
              <span>Your Divi asks a specific connection&apos;s Divi for something. Like a targeted question.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-400 shrink-0">Broadcast →</span>
              <span>Your Divi asks all connections at once. &ldquo;What does the team think about X?&rdquo;</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 shrink-0">Ambient →</span>
              <span>
                The key innovation. Your Divi sends a low-priority question to another agent.
                That agent <em>doesn&apos;t interrupt</em> their user — instead, it waits for the topic to come up
                naturally in conversation, asks about it as if curious, and sends the answer back. <strong className="text-[var(--text-primary)]">No one gets interrupted. Information still flows.</strong>
              </span>
            </li>
          </ul>
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Every relay generates a &ldquo;reasoning brief&rdquo; — a transparent record of what context was assembled
            and why the agent made the decisions it did. You can always inspect the brief to verify agent reasoning.
          </p>
        </div>
      </div>

      {/* ─── Relay Mode ─── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          Participation Mode
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Controls your overall level of participation in agent-to-agent communication.
        </p>
        <div className="grid gap-3">
          {RELAY_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => update('relayMode', mode.id)}
              className={cn(
                'text-left p-4 rounded-xl border transition-all',
                prefs.relayMode === mode.id
                  ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8'
                  : 'border-[var(--border-primary)] bg-[var(--bg-surface)] hover:border-[var(--border-primary)]/80'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{mode.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium text-sm',
                      prefs.relayMode === mode.id ? 'text-brand-400' : 'text-[var(--text-primary)]'
                    )}>
                      {mode.label}
                    </span>
                    {prefs.relayMode === mode.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/20 text-brand-400 font-mono uppercase">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{mode.description}</p>
                  {prefs.relayMode === mode.id && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 italic">{mode.detail}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Granular Controls (visible when selective or full) ─── */}
      {!isOff && (
        <div className={cn('space-y-6', isMinimal && 'opacity-50 pointer-events-none')}>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Ambient Relay</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Ambient relays are the non-interruptive information channel. Your Divi weaves questions into conversation naturally.
            </p>

            <div className="space-y-3">
              <ToggleRow
                label="Receive ambient relays"
                description="Other agents can send ambient questions for your Divi to weave into conversation. Your Divi will ask about it naturally when the topic arises — you won't be interrupted."
                checked={prefs.allowAmbientInbound}
                onChange={(v) => update('allowAmbientInbound', v)}
                disabled={isMinimal}
              />
              <ToggleRow
                label="Send ambient relays"
                description="Your Divi can proactively send ambient questions to connections' agents when it detects you need information someone likely has."
                checked={prefs.allowAmbientOutbound}
                onChange={(v) => update('allowAmbientOutbound', v)}
                disabled={isMinimal}
              />
              <ToggleRow
                label="Auto-respond to ambient relays"
                description="If enabled, your Divi may answer ambient questions on your behalf without surfacing them to you first — useful if you trust your agent's judgment and want to reduce noise. Only applies to low-priority ambient asks."
                checked={prefs.autoRespondAmbient}
                onChange={(v) => update('autoRespondAmbient', v)}
                disabled={isMinimal}
                cautionLabel="Advanced"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Broadcast Relay</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Broadcasts go to all your connections at once — like a team-wide question.
            </p>
            <ToggleRow
              label="Receive broadcast relays"
              description="Connections can send team-wide questions that your Divi will surface when relevant. Turning this off means your agent won't participate in broadcasts."
              checked={prefs.allowBroadcasts}
              onChange={(v) => update('allowBroadcasts', v)}
              disabled={isMinimal}
            />
          </div>
        </div>
      )}

      {/* ─── Quiet Hours ─── */}
      {!isOff && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Quiet Hours</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            During quiet hours, non-urgent relays are held until the window ends. Urgent direct relays still come through.
          </p>
          <div className="flex items-center gap-3">
            <ToggleRow
              label="Enable quiet hours"
              description=""
              checked={!!prefs.relayQuietHours}
              onChange={(v) => {
                if (v) {
                  update('relayQuietHours', { start: '22:00', end: '08:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
                } else {
                  update('relayQuietHours', null);
                }
              }}
            />
          </div>
          {prefs.relayQuietHours && (
            <div className="mt-3 flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">From</label>
                <input
                  type="time"
                  value={prefs.relayQuietHours.start}
                  onChange={(e) => update('relayQuietHours', { ...prefs.relayQuietHours, start: e.target.value })}
                  className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">To</label>
                <input
                  type="time"
                  value={prefs.relayQuietHours.end}
                  onChange={(e) => update('relayQuietHours', { ...prefs.relayQuietHours, end: e.target.value })}
                  className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {prefs.relayQuietHours.timezone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Topic Filters ─── */}
      {!isOff && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Topic Opt-Outs</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Add topics you don&apos;t want to be asked about via ambient relays. Your agent will decline ambient relays tagged with these topics.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTopicFilter}
              onChange={(e) => setNewTopicFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTopicFilter()}
              placeholder="e.g. recruiting, sales, personal"
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={addTopicFilter}
              className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-brand-400 hover:border-brand-400/30 transition-colors"
            >
              Add
            </button>
          </div>
          {prefs.relayTopicFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prefs.relayTopicFilters.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-full text-xs text-[var(--text-secondary)]"
                >
                  {topic}
                  <button
                    onClick={() => removeTopicFilter(topic)}
                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Reasoning Briefs / Transparency ─── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <span>📋</span> Reasoning Briefs
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Every time your Divi routes a relay, decomposes a task, or orchestrates an action, it generates a
          <strong className="text-[var(--text-secondary)]"> reasoning brief</strong> — a full record of what context
          was assembled and why the decision was made.
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Think of it like showing your work. You can always click into any agent action to see the underlying
          brief and verify (or correct) the reasoning. This is how humans audit agents and agents help audit humans.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Who can see your briefs?</label>
            <div className="grid gap-2">
              {BRIEF_VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update('briefVisibility', opt.id)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all',
                    prefs.briefVisibility === opt.id
                      ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8'
                      : 'border-[var(--border-primary)] bg-[var(--bg-surface)] hover:border-[var(--border-primary)]/80'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span className={cn(
                      'text-sm font-medium',
                      prefs.briefVisibility === opt.id ? 'text-brand-400' : 'text-[var(--text-primary)]'
                    )}>
                      {opt.label}
                    </span>
                    {prefs.briefVisibility === opt.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/20 text-brand-400 font-mono uppercase">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 ml-7">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <ToggleRow
            label="Attach briefs to outbound relays"
            description="When your Divi sends a relay, include the assembled brief so the recipient can see exactly why the relay was sent and what context informed it."
            checked={prefs.showBriefOnRelay}
            onChange={(v) => update('showBriefOnRelay', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Row Component ──────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  cautionLabel,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  cautionLabel?: string;
}) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)]',
      disabled && 'opacity-40 pointer-events-none'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
          {cautionLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono uppercase">{cautionLabel}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative shrink-0 w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-primary)]'
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  );
}
