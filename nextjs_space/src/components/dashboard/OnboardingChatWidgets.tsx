'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingWidget } from '@/lib/onboarding-phases';

interface OnboardingChatWidgetsProps {
  widgets: OnboardingWidget[];
  phase: number;
  onSubmit: (phase: number, settings: Record<string, any>) => void;
  onSkip: (phase: number) => void;
  onGoogleConnect: (identity: 'operator' | 'agent', accountIndex: number) => void;
  disabled?: boolean;
}

export function OnboardingChatWidgets({
  widgets,
  phase,
  onSubmit,
  onSkip,
  onGoogleConnect,
  disabled = false,
}: OnboardingChatWidgetsProps) {
  const safeWidgets = Array.isArray(widgets) ? widgets : [];

  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const w of safeWidgets) {
      if (w.type === 'slider') init[w.id] = w.value ?? w.min ?? 1;
      if (w.type === 'toggle') init[w.id] = w.checked ?? false;
      if (w.type === 'select' || w.type === 'radio') init[w.id] = w.selectedValue ?? w.options?.[0]?.value ?? '';
      if (w.type === 'text_input') init[w.id] = w.defaultValue ?? '';
    }
    return init;
  });

  const [submitted, setSubmitted] = useState(false);

  const setValue = useCallback((id: string, val: any) => {
    setValues(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    // Build settings object from widget values — universal for onboarding + settings adjustment
    const settings: Record<string, any> = {};

    // Working style sliders
    const hasSliders = ['verbosity', 'proactivity', 'autonomy', 'formality'].some(k => values[k] !== undefined);
    if (hasSliders) {
      settings.workingStyle = {
        verbosity: values.verbosity ?? 3,
        proactivity: values.proactivity ?? 4,
        autonomy: values.autonomy ?? 3,
        formality: values.formality ?? 2,
      };
    }

    // Triage style
    if (values.triageStyle) {
      settings.triageSettings = { triageStyle: values.triageStyle };
    }

    // Identity preference
    if (values.identityPreference) {
      settings.identityPreference = values.identityPreference;
    }

    // Goals
    if (values.goalsEnabled !== undefined) {
      settings.goalsEnabled = values.goalsEnabled;
    }

    // Divi name
    if (values.diviName !== undefined && values.diviName !== '') {
      settings.diviName = values.diviName;
    }

    onSubmit(phase, settings);
  }, [phase, values, onSubmit]);

  const handleSkip = useCallback(() => {
    setSubmitted(true);
    onSkip(phase);
  }, [phase, onSkip]);

  const isDisabled = disabled || submitted;

  return (
    <div className={cn('space-y-3 mt-3', isDisabled && 'opacity-60 pointer-events-none')}>
      {safeWidgets.map((widget) => {
        switch (widget.type) {
          case 'slider':
            return (
              <SliderWidget
                key={widget.id}
                widget={widget}
                value={values[widget.id] ?? widget.value ?? widget.min ?? 1}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'toggle':
            return (
              <ToggleWidget
                key={widget.id}
                widget={widget}
                checked={values[widget.id] ?? false}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'radio':
            return (
              <RadioWidget
                key={widget.id}
                widget={widget}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'select':
            return (
              <SelectWidget
                key={widget.id}
                widget={widget}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'google_connect':
            return (
              <GoogleConnectWidget
                key={widget.id}
                widget={widget}
                onConnect={() => onGoogleConnect(
                  widget.identity || 'operator',
                  widget.accountIndex ?? 0
                )}
                disabled={isDisabled}
              />
            );
          case 'info':
            return (
              <InfoWidget key={widget.id} widget={widget} />
            );
          case 'text_input':
            return (
              <TextInputWidget
                key={widget.id}
                widget={widget}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'webhook_setup':
            return (
              <WebhookSetupWidget key={widget.id} widget={widget} disabled={isDisabled} />
            );
          case 'submit':
            return (
              <button
                key={widget.id}
                onClick={handleSubmit}
                disabled={isDisabled}
                className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-500/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitted ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  widget.submitLabel || 'Continue \u2192'
                )}
              </button>
            );
          case 'skip':
            return (
              <button
                key={widget.id}
                onClick={handleSkip}
                disabled={isDisabled}
                className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
              >
                {widget.label || 'Skip this step'}
              </button>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SliderWidget({
  widget,
  value,
  onChange,
  disabled,
}: {
  widget: OnboardingWidget;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const min = widget.min ?? 1;
  const max = widget.max ?? 5;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)]">{widget.label}</span>
        <span className="text-[10px] font-mono text-brand-400">{value}/{max}</span>
      </div>
      {widget.description && (
        <p className="text-[10px] text-[var(--text-muted)] mb-2">{widget.description}</p>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-runnable-track]:rounded-full
            [&::-webkit-slider-runnable-track]:bg-white/10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-brand-400
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:-mt-[5px]
            [&::-moz-range-track]:rounded-full
            [&::-moz-range-track]:bg-white/10
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-brand-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-brand-400"
          style={{
            background: `linear-gradient(to right, rgba(79,124,255,0.5) 0%, rgba(79,124,255,0.5) ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[var(--text-muted)]">{widget.lowLabel || min}</span>
        <span className="text-[9px] text-[var(--text-muted)]">{widget.highLabel || max}</span>
      </div>
    </div>
  );
}

function ToggleWidget({
  widget,
  checked,
  onChange,
  disabled,
}: {
  widget: OnboardingWidget;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
      <div>
        <span className="text-xs font-medium text-[var(--text-primary)]">{widget.label}</span>
        {widget.description && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{widget.description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3',
          checked ? 'bg-brand-500' : 'bg-white/10'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          )}
        />
      </button>
    </div>
  );
}

function RadioWidget({
  widget,
  value,
  onChange,
  disabled,
}: {
  widget: OnboardingWidget;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
      <span className="text-xs font-medium text-[var(--text-primary)]">{widget.label}</span>
      {widget.description && (
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 mb-2">{widget.description}</p>
      )}
      <div className="space-y-1.5 mt-2">
        {widget.options?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg border transition-all text-xs',
              value === opt.value
                ? 'border-brand-400 bg-brand-500/10 text-[var(--text-primary)]'
                : 'border-white/[0.06] bg-transparent text-[var(--text-secondary)] hover:border-white/[0.12]'
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                value === opt.value ? 'border-brand-400' : 'border-white/20'
              )}>
                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
              </div>
              <div>
                <span className="font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="text-[var(--text-muted)] ml-1.5">— {opt.description}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectWidget({
  widget,
  value,
  onChange,
  disabled,
}: {
  widget: OnboardingWidget;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
      <span className="text-xs font-medium text-[var(--text-primary)]">{widget.label}</span>
      {widget.description && (
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 mb-2">{widget.description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full mt-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-brand-400"
      >
        {widget.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function GoogleConnectWidget({
  widget,
  onConnect,
  disabled,
}: {
  widget: OnboardingWidget;
  onConnect: () => void;
  disabled: boolean;
}) {
  if (widget.connected) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
        <span className="text-sm">✅</span>
        <span className="text-xs text-emerald-400">
          Connected: {widget.connectedEmail || 'Google Account'}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={disabled}
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex items-center gap-3 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group disabled:opacity-50"
    >
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      </div>
      <div className="text-left flex-1">
        <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-white">
          {widget.label || 'Connect Gmail'}
        </span>
        {widget.description && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{widget.description}</p>
        )}
      </div>
      <span className="text-[var(--text-muted)] text-xs">→</span>
    </button>
  );
}

function InfoWidget({ widget }: { widget: OnboardingWidget }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex items-center gap-2">
      {widget.icon && <span className="text-sm">{widget.icon}</span>}
      <span className="text-xs text-[var(--text-secondary)]">{widget.text}</span>
    </div>
  );
}

function TextInputWidget({
  widget,
  value,
  onChange,
  disabled,
}: {
  widget: OnboardingWidget;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--text-secondary)]">
        {widget.label}
      </label>
      {widget.description && (
        <p className="text-[10px] text-[var(--text-muted)]">{widget.description}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={widget.placeholder || ''}
        className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/40 disabled:opacity-50 transition-colors"
      />
    </div>
  );
}

function WebhookSetupWidget({
  widget,
  disabled,
}: {
  widget: OnboardingWidget;
  disabled: boolean;
}) {
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    if (!webhookName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookName.trim(),
          signalType: 'custom',
          description: `Onboarding webhook: ${webhookName}`,
        }),
      });
      const data = await res.json();
      if (data.success || data.data?.webhookUrl) {
        setWebhookUrl(data.data?.webhookUrl || data.webhookUrl || '');
        setCreated(true);
      }
    } catch (e) {
      console.error('Failed to create webhook:', e);
    } finally {
      setCreating(false);
    }
  };

  if (created && webhookUrl) {
    return (
      <div className="bg-white/[0.03] border border-emerald-500/20 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">✅</span>
          <span className="text-xs font-medium text-emerald-400">Webhook created: {webhookName}</span>
        </div>
        <div className="bg-[var(--bg-primary)] rounded px-2 py-1.5">
          <p className="text-[10px] text-[var(--text-muted)] mb-1">Your webhook URL (paste this into your service):</p>
          <code className="text-[10px] text-brand-400 font-mono break-all select-all">{webhookUrl}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 space-y-2">
      <span className="text-xs font-medium text-[var(--text-primary)]">{widget.label}</span>
      {widget.description && (
        <p className="text-[10px] text-[var(--text-muted)]">{widget.description}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={webhookName}
          onChange={(e) => setWebhookName(e.target.value)}
          placeholder="e.g. Stripe, GitHub, Slack..."
          disabled={disabled || creating}
          className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-brand-400"
        />
        <button
          onClick={handleCreate}
          disabled={disabled || creating || !webhookName.trim()}
          className="px-3 py-2 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-500/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
