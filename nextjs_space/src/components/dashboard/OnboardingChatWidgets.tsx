'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingWidget } from '@/lib/onboarding-phases';
import {
  WidgetSlider,
  WidgetToggle,
  WidgetRadio,
  WidgetSelect,
  WidgetTextInput,
  WidgetInfo,
  WidgetGoogleConnect,
  WidgetWebhookSetup,
  WidgetSubmitButton,
  WidgetSkipButton,
} from '@/components/widgets';

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

    if (values.triageStyle) {
      settings.triageSettings = { triageStyle: values.triageStyle };
    }
    if (values.identityPreference) {
      settings.identityPreference = values.identityPreference;
    }
    if (values.goalsEnabled !== undefined) {
      settings.goalsEnabled = values.goalsEnabled;
    }
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
              <WidgetSlider
                key={widget.id}
                id={widget.id}
                label={widget.label || ''}
                description={widget.description}
                value={values[widget.id] ?? widget.value ?? widget.min ?? 1}
                min={widget.min}
                max={widget.max}
                lowLabel={widget.lowLabel}
                highLabel={widget.highLabel}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'toggle':
            return (
              <WidgetToggle
                key={widget.id}
                id={widget.id}
                label={widget.label || ''}
                description={widget.description}
                checked={values[widget.id] ?? false}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'radio':
            return (
              <WidgetRadio
                key={widget.id}
                id={widget.id}
                label={widget.label || ''}
                description={widget.description}
                options={widget.options || []}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'select':
            return (
              <WidgetSelect
                key={widget.id}
                id={widget.id}
                label={widget.label || ''}
                description={widget.description}
                options={widget.options || []}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'google_connect':
            return (
              <WidgetGoogleConnect
                key={widget.id}
                label={widget.label}
                description={widget.description}
                connected={widget.connected}
                connectedEmail={widget.connectedEmail}
                onConnect={() => onGoogleConnect(
                  widget.identity || 'operator',
                  widget.accountIndex ?? 0
                )}
                disabled={isDisabled}
              />
            );
          case 'info':
            return (
              <WidgetInfo key={widget.id} icon={widget.icon} text={widget.text} />
            );
          case 'text_input':
            return (
              <WidgetTextInput
                key={widget.id}
                id={widget.id}
                label={widget.label || ''}
                description={widget.description}
                placeholder={widget.placeholder}
                value={values[widget.id] ?? ''}
                onChange={(v) => setValue(widget.id, v)}
                disabled={isDisabled}
              />
            );
          case 'webhook_setup':
            return (
              <WidgetWebhookSetup
                key={widget.id}
                label={widget.label}
                description={widget.description}
                disabled={isDisabled}
              />
            );
          case 'submit':
            return (
              <WidgetSubmitButton
                key={widget.id}
                label={widget.submitLabel || 'Continue \u2192'}
                loading={submitted}
                onClick={handleSubmit}
                disabled={isDisabled}
              />
            );
          case 'skip':
            return (
              <WidgetSkipButton
                key={widget.id}
                label={widget.label || 'Skip this step'}
                onClick={handleSkip}
                disabled={isDisabled}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
