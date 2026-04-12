'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapabilityRule {
  id: string;
  rule: string;
  enabled: boolean;
}

interface Capability {
  id: string;
  type: string;
  name: string;
  status: string;
  identity: string;
  rules: CapabilityRule[];
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

type SetupStep = 'intro' | 'identity' | 'rules' | 'review';

const DEFAULT_EMAIL_RULES: CapabilityRule[] = [
  { id: 'e1', rule: 'Always check with me before sending emails to new contacts', enabled: true },
  { id: 'e2', rule: 'Match my writing tone and style in all drafted emails', enabled: true },
  { id: 'e3', rule: 'Flag urgent emails that need a response within 2 hours', enabled: true },
  { id: 'e4', rule: 'Never share confidential information in emails without my approval', enabled: true },
  { id: 'e5', rule: 'CC me on all emails sent on my behalf', enabled: false },
  { id: 'e6', rule: 'Auto-send routine acknowledgment replies (e.g. "Got it, thanks")', enabled: false },
];

const DEFAULT_MEETING_RULES: CapabilityRule[] = [
  { id: 'm1', rule: 'Only schedule meetings during my working hours', enabled: true },
  { id: 'm2', rule: 'Always include a video call link', enabled: true },
  { id: 'm3', rule: 'Leave 15-minute buffers between back-to-back meetings', enabled: true },
  { id: 'm4', rule: 'Check with me before scheduling meetings with external contacts', enabled: true },
  { id: 'm5', rule: 'Prefer 30-minute meetings over 60-minute meetings', enabled: false },
  { id: 'm6', rule: 'Block mornings for deep work — no meetings before 11am', enabled: false },
];

// ─── Capability Setup Wizard ──────────────────────────────────────────────────

function CapabilitySetupWizard({
  type,
  onComplete,
  onCancel,
}: {
  type: 'email' | 'meetings';
  onComplete: (data: { identity: string; rules: CapabilityRule[]; config: Record<string, any> }) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [identity, setIdentity] = useState('operator');
  const [rules, setRules] = useState<CapabilityRule[]>(
    type === 'email' ? DEFAULT_EMAIL_RULES.map(r => ({ ...r })) : DEFAULT_MEETING_RULES.map(r => ({ ...r }))
  );
  const [customRule, setCustomRule] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const isEmail = type === 'email';
  const title = isEmail ? 'Outbound Email' : 'Meeting Scheduling';
  const icon = isEmail ? '📧' : '📅';

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addCustomRule = () => {
    if (!customRule.trim()) return;
    setRules(prev => [...prev, { id: `custom_${Date.now()}`, rule: customRule.trim(), enabled: true }]);
    setCustomRule('');
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onComplete({ identity, rules, config });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isEmail ? 'Define how Divi sends emails for you' : 'Set rules for how Divi schedules meetings'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            ✕
          </button>
        </div>
        {/* Step indicator */}
        <div className="flex gap-1 mt-4">
          {(['intro', 'identity', 'rules', 'review'] as SetupStep[]).map((s, i) => (
            <div key={s} className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              (['intro', 'identity', 'rules', 'review'].indexOf(step) >= i) ? 'bg-brand-400' : 'bg-[var(--bg-primary)]'
            )} />
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Step: Intro */}
        {step === 'intro' && (
          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              {isEmail
                ? 'Once enabled, Divi can draft and send emails on your behalf. It will follow your rules, match your tone, and always respect your boundaries. You control exactly what Divi can do.'
                : 'Once enabled, Divi can schedule meetings for you. It will respect your calendar preferences, working hours, and personal rules for how meetings should be arranged.'}
            </p>
            <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)] mb-4">
              <p className="text-[11px] text-brand-400 font-medium mb-2">What Divi can do with this capability</p>
              <div className="space-y-1.5">
                {(isEmail ? [
                  'Draft and send email replies based on your inbox',
                  'Follow up on conversations automatically',
                  'Send introductions and meeting requests',
                  'Route emails to you when they need your personal attention',
                ] : [
                  'Suggest optimal meeting times based on your calendar',
                  'Send scheduling invitations to contacts',
                  'Reschedule when conflicts arise',
                  'Prep you with context before each meeting',
                ]).map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-400 text-xs mt-0.5">✓</span>
                    <span className="text-xs text-[var(--text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={onCancel} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                Not now
              </button>
              <button onClick={() => setStep('identity')} className="btn-primary px-5 py-2 text-sm">
                Set it up →
              </button>
            </div>
          </div>
        )}

        {/* Step: Identity */}
        {step === 'identity' && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">How should Divi {isEmail ? 'send emails' : 'schedule meetings'}?</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Choose whether Divi acts as you or identifies itself as your AI agent.
            </p>

            <div className="space-y-3 mb-6">
              {[
                {
                  id: 'operator',
                  label: isEmail ? 'Send as me' : 'Schedule as me',
                  desc: isEmail
                    ? 'Emails come from your email address. Recipients see your name and signature.'
                    : 'Meeting invites come from your calendar. Attendees see your name.',
                  icon: '👤',
                },
                {
                  id: 'agent',
                  label: isEmail ? 'Send as Divi (agent email)' : 'Schedule as Divi',
                  desc: isEmail
                    ? 'Emails come from a dedicated agent email address. Recipients know it\'s your AI agent.'
                    : 'Meeting invites identify Divi as the organizer, acting on your behalf.',
                  icon: '🤖',
                },
                {
                  id: 'both',
                  label: 'Both — Divi decides',
                  desc: isEmail
                    ? 'Divi chooses based on context: personal replies come from you, routine messages from the agent.'
                    : 'Divi uses your calendar for direct meetings and the agent identity for coordination.',
                  icon: '⚡',
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setIdentity(opt.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-all',
                    identity === opt.id
                      ? 'border-brand-400 bg-brand-500/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[rgba(255,255,255,0.1)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{opt.icon}</span>
                    <div>
                      <p className={cn('text-sm font-medium', identity === opt.id ? 'text-brand-400' : 'text-[var(--text-primary)]')}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Agent email config */}
            {(identity === 'agent' || identity === 'both') && isEmail && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <p className="text-[11px] text-brand-400 font-medium mb-2">🤖 Agent Email Setup</p>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Connect a dedicated email for Divi. This gives your agent its own channel of communication.
                  You can set this up now or later in Settings → Integrations.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="divi@yourdomain.com"
                    value={config.agentEmail || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, agentEmail: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-brand-400"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Optional — you can configure this later</p>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('intro')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                ← Back
              </button>
              <button onClick={() => setStep('rules')} className="btn-primary px-5 py-2 text-sm">
                Define rules →
              </button>
            </div>
          </div>
        )}

        {/* Step: Rules */}
        {step === 'rules' && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Set the rules</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Toggle the defaults that work for you and add your own. You can always change these later.
            </p>

            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    rule.enabled
                      ? 'bg-brand-500/5 border-brand-500/20'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] opacity-60'
                  )}
                >
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs border transition-colors mt-0.5',
                      rule.enabled
                        ? 'bg-brand-400 border-brand-400 text-white'
                        : 'border-[var(--border-color)] text-transparent'
                    )}
                  >
                    ✓
                  </button>
                  <p className="text-xs text-[var(--text-secondary)] flex-1 leading-relaxed">{rule.rule}</p>
                  {rule.id.startsWith('custom_') && (
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="text-[var(--text-muted)] hover:text-red-400 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom rule */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add your own rule..."
                value={customRule}
                onChange={(e) => setCustomRule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomRule()}
                className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-400"
              />
              <button
                onClick={addCustomRule}
                disabled={!customRule.trim()}
                className="btn-secondary text-xs px-3 disabled:opacity-50"
              >
                + Add
              </button>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('identity')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                ← Back
              </button>
              <button onClick={() => setStep('review')} className="btn-primary px-5 py-2 text-sm">
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Review & Activate</h4>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">{identity === 'operator' ? '👤' : identity === 'agent' ? '🤖' : '⚡'}</span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {identity === 'operator' ? (isEmail ? 'Sends as you' : 'Schedules as you')
                      : identity === 'agent' ? (isEmail ? 'Sends as Divi' : 'Schedules as Divi')
                      : 'Divi decides per context'}
                  </span>
                </div>
                {config.agentEmail && (
                  <p className="text-[10px] text-[var(--text-muted)] ml-5">Agent email: {config.agentEmail}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <p className="text-[11px] text-brand-400 font-medium mb-2">
                  {rules.filter(r => r.enabled).length} active rules
                </p>
                <div className="space-y-1">
                  {rules.filter(r => r.enabled).map(rule => (
                    <div key={rule.id} className="flex items-start gap-2">
                      <span className="text-green-400 text-[10px] mt-0.5">✓</span>
                      <span className="text-[11px] text-[var(--text-secondary)]">{rule.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('rules')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                ← Edit rules
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                {saving ? 'Activating...' : `Activate ${title} →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Capability Card ──────────────────────────────────────────────────────────

function CapabilityCard({
  capability,
  onConfigure,
  onToggle,
}: {
  capability: Capability;
  onConfigure: () => void;
  onToggle: () => void;
}) {
  const isEmail = capability.type === 'email';
  const isMeeting = capability.type === 'meetings';
  const icon = isEmail ? '📧' : isMeeting ? '📅' : '⚡';
  const activeRules = capability.rules.filter((r: any) => r.enabled).length;

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    enabled: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', label: 'Active' },
    disabled: { bg: 'bg-[var(--bg-primary)] border-[var(--border-color)]', text: 'text-[var(--text-muted)]', label: 'Disabled' },
    paused: { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', label: 'Paused' },
    setup: { bg: 'bg-brand-500/10 border-brand-500/20', text: 'text-brand-400', label: 'Setup' },
  };
  const sc = statusColors[capability.status] || statusColors.disabled;

  return (
    <div className={cn('p-4 rounded-xl border transition-all', sc.bg)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{capability.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-[10px] font-medium', sc.text)}>{sc.label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {activeRules} rule{activeRules !== 1 ? 's' : ''} · {capability.identity === 'operator' ? 'As you' : capability.identity === 'agent' ? 'As Divi' : 'Context-aware'}
              </span>
            </div>
          </div>
        </div>

        {capability.status !== 'setup' && (
          <button
            onClick={onToggle}
            className={cn(
              'relative w-10 h-[22px] rounded-full transition-colors',
              capability.status === 'enabled' ? 'bg-green-500' : 'bg-[var(--bg-surface-hover)]'
            )}
          >
            <div
              className={cn(
                'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                capability.status === 'enabled' ? 'translate-x-[22px]' : 'translate-x-[3px]'
              )}
            />
          </button>
        )}
      </div>

      {/* Quick rule preview */}
      {capability.rules.filter((r: any) => r.enabled).length > 0 && (
        <div className="space-y-1 mb-3">
          {capability.rules.filter((r: any) => r.enabled).slice(0, 3).map((rule: any) => (
            <div key={rule.id} className="flex items-start gap-2">
              <span className="text-green-400 text-[9px] mt-0.5">✓</span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">{rule.rule}</span>
            </div>
          ))}
          {capability.rules.filter((r: any) => r.enabled).length > 3 && (
            <span className="text-[10px] text-[var(--text-muted)] ml-4">
              +{capability.rules.filter((r: any) => r.enabled).length - 3} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={onConfigure}
        className="w-full text-xs py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
      >
        {capability.status === 'setup' ? 'Complete Setup →' : 'Edit Rules & Settings'}
      </button>
    </div>
  );
}

// ─── Main CapabilitiesView ────────────────────────────────────────────────────

export function CapabilitiesView() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupType, setSetupType] = useState<'email' | 'meetings' | null>(null);

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch('/api/capabilities');
      const data = await res.json();
      if (data.success) setCapabilities(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCapabilities(); }, [fetchCapabilities]);

  const emailCap = capabilities.find(c => c.type === 'email');
  const meetingCap = capabilities.find(c => c.type === 'meetings');

  const handleSetupComplete = async (type: string, data: { identity: string; rules: CapabilityRule[]; config: Record<string, any> }) => {
    try {
      await fetch('/api/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          identity: data.identity,
          rules: data.rules,
          config: data.config,
          status: 'enabled',
        }),
      });
      await fetchCapabilities();
      setSetupType(null);
    } catch (e) {
      console.error('Failed to save capability:', e);
    }
  };

  const handleToggle = async (type: string, currentStatus: string) => {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    try {
      await fetch(`/api/capabilities/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setCapabilities(prev => prev.map(c =>
        c.type === type ? { ...c, status: newStatus } : c
      ));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-[var(--text-muted)]">Loading capabilities...</span>
      </div>
    );
  }

  // If we're in a setup wizard
  if (setupType) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-xl mx-auto">
          <CapabilitySetupWizard
            type={setupType}
            onComplete={(data) => handleSetupComplete(setupType, data)}
            onCancel={() => setSetupType(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Capabilities</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Outbound actions Divi can perform on your behalf. Each capability has its own rules and identity settings.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-4 mb-6">
          <p className="text-[11px] text-brand-400 font-medium mb-2">How capabilities work with the Queue</p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs flex-shrink-0">📧</span>
              <span className="text-xs text-[var(--text-secondary)]">Divi triages your inbox and surfaces replies that need sending → they appear in your Queue</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs flex-shrink-0">📅</span>
              <span className="text-xs text-[var(--text-secondary)]">Divi identifies meetings that need scheduling → scheduling requests land in your Queue</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs flex-shrink-0">✅</span>
              <span className="text-xs text-[var(--text-secondary)]">You approve, edit, or dismiss each action. Divi only executes what you greenlight.</span>
            </div>
          </div>
        </div>

        {/* Capability Cards */}
        <div className="space-y-4">
          {/* Email */}
          {emailCap ? (
            <CapabilityCard
              capability={emailCap}
              onConfigure={() => setSetupType('email')}
              onToggle={() => handleToggle('email', emailCap.status)}
            />
          ) : (
            <button
              onClick={() => setSetupType('email')}
              className="w-full p-5 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-brand-400/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">📧</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-brand-400 transition-colors">
                    Set up Outbound Email
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Let Divi draft and send emails for you. Define rules, choose identity, control everything.
                  </p>
                </div>
                <span className="ml-auto text-[var(--text-muted)] group-hover:text-brand-400 transition-colors">→</span>
              </div>
            </button>
          )}

          {/* Meetings */}
          {meetingCap ? (
            <CapabilityCard
              capability={meetingCap}
              onConfigure={() => setSetupType('meetings')}
              onToggle={() => handleToggle('meetings', meetingCap.status)}
            />
          ) : (
            <button
              onClick={() => setSetupType('meetings')}
              className="w-full p-5 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-brand-400/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">📅</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-brand-400 transition-colors">
                    Set up Meeting Scheduling
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Let Divi schedule meetings on your behalf. Set working hours, buffers, and preferences.
                  </p>
                </div>
                <span className="ml-auto text-[var(--text-muted)] group-hover:text-brand-400 transition-colors">→</span>
              </div>
            </button>
          )}
        </div>

        {/* Queue relationship callout */}
        <div className="mt-6 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            <strong className="text-[var(--text-secondary)]">Pro tip:</strong> After setting up capabilities, connect your email inbox (Settings → Integrations) and ask Divi to triage it. Divi will read everything, surface what&apos;s important, and generate reply drafts and meeting requests that appear in your Queue. This is the fastest way to see the value.
          </p>
        </div>
      </div>
    </div>
  );
}
