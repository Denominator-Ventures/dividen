'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingWelcomeProps {
  userName?: string;
  onStart: () => void;
  onDismiss: () => void;
  /** If set, skip the welcome screen and open directly to the API key step */
  initialStep?: Step;
}

type Step = 'welcome' | 'apikey';

/** UI-facing provider choice — 'chatgpt' maps to 'openai' when saved */
type ProviderChoice = 'anthropic' | 'openai' | 'chatgpt';

const PROVIDERS: { id: ProviderChoice; label: string; sub: string; icon: string }[] = [
  { id: 'anthropic', label: 'Anthropic', sub: 'Claude', icon: '🟣' },
  { id: 'openai',    label: 'OpenAI',    sub: 'GPT-4o', icon: '🟢' },
  { id: 'chatgpt',   label: 'ChatGPT',   sub: 'I have a subscription', icon: '💬' },
];

function getDbProvider(choice: ProviderChoice): 'openai' | 'anthropic' {
  return choice === 'anthropic' ? 'anthropic' : 'openai';
}

function getKeyPlaceholder(choice: ProviderChoice): string {
  return choice === 'anthropic' ? 'sk-ant-api03-...' : 'sk-proj-...';
}

function getKeyLabel(choice: ProviderChoice): string {
  if (choice === 'anthropic') return 'Anthropic API Key';
  if (choice === 'chatgpt')  return 'OpenAI API Key';
  return 'OpenAI API Key';
}

function getSaveLabel(choice: ProviderChoice): string {
  if (choice === 'anthropic') return 'Claude (onboarding)';
  return 'GPT-4o (onboarding)';
}

/**
 * Two-step welcome modal:
 *  Step 1 — "Welcome to DiviDen" intro with feature highlights
 *  Step 2 — Bring-your-own-AI key entry (Anthropic, OpenAI, or ChatGPT)
 * After the key is saved, triggers onStart to begin the chat-based onboarding with Divi.
 */
export function OnboardingWelcome({ userName, onStart, onDismiss, initialStep }: OnboardingWelcomeProps) {
  const [step, setStep] = useState<Step>(initialStep || 'welcome');
  const [provider, setProvider] = useState<ProviderChoice>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const firstName = userName?.split(' ')[0];

  const handleSaveKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    const trimmed = apiKey.trim();
    if (provider === 'anthropic' && !trimmed.startsWith('sk-ant-')) {
      setError('Anthropic keys start with sk-ant-');
      return;
    }
    if ((provider === 'openai' || provider === 'chatgpt') && !trimmed.startsWith('sk-')) {
      setError('OpenAI keys start with sk-');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: getDbProvider(provider),
          apiKey: trimmed,
          label: getSaveLabel(provider),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save API key');
      }

      onStart();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setSaving(false);
    }
  }, [apiKey, provider, onStart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* ── Step 1: Welcome ── */}
        {step === 'welcome' && (
          <>
            <div className="p-6 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--brand-primary)]/15 flex items-center justify-center">
                <span className="text-3xl">⬡</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                {firstName ? `Welcome, ${firstName}` : 'Welcome to DiviDen'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Meet Divi — your personal AI command center
              </p>
            </div>

            <div className="px-6 pb-2">
              <div className="space-y-3 mb-5">
                {[
                  { icon: '🧠', text: 'Divi reads your signals — email, calendar, files — and sorts what matters' },
                  { icon: '📋', text: 'Tasks appear on your board, organized and prioritized automatically' },
                  { icon: '⚡', text: 'Approve, adjust, or let Divi handle it — you stay in control' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setStep('apikey')}
                className="w-full btn-primary py-3 text-sm font-semibold rounded-xl"
              >
                Get Started →
              </button>
              <button
                onClick={onDismiss}
                className="w-full mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-2"
              >
                I&apos;ll explore on my own
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: API Key Entry ── */}
        {step === 'apikey' && (
          <>
            <div className="p-6 pb-3">
              <button
                onClick={() => { setStep('welcome'); setError(null); }}
                className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 mb-3 transition-colors"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/15 flex items-center justify-center">
                  <span className="text-xl">🔑</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Bring Your Own AI</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Divi uses your API key — you own your data and usage</p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-2">
              {/* BYOAI explanation */}
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mb-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  DiviDen is <strong className="text-[var(--text-primary)]">BYOAI</strong> (Bring Your Own AI). 
                  Your API key stays in your account and is used only for your Divi agent. 
                  We never share it, and you can update or remove it at any time in Settings.
                </p>
              </div>

              {/* Provider selector — 3 tiles */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id); setError(null); }}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-center transition-all',
                      provider === p.id
                        ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-color)]/60',
                    )}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <p className={cn(
                      'text-xs font-medium leading-tight',
                      provider === p.id ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]',
                    )}>{p.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight">{p.sub}</p>
                  </button>
                ))}
              </div>

              {/* ChatGPT explainer — only shown when ChatGPT tile is selected */}
              {provider === 'chatgpt' && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-4">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-emerald-400">Already have ChatGPT?</strong> Your ChatGPT account gives you API access too.
                    Grab your key from the OpenAI developer dashboard — same account, same login.
                  </p>
                </div>
              )}

              {/* API key input */}
              <div className="mb-3">
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
                  {getKeyLabel(provider)}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                    placeholder={getKeyPlaceholder(provider)}
                    className="input-base w-full pr-10 text-sm font-mono"
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Where to get it — provider-specific guide with direct links */}
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-[var(--border-color)] mb-4">
                {provider === 'anthropic' ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      <strong className="text-[var(--text-secondary)]">How to get your key:</strong>
                    </p>
                    <ol className="text-[10px] text-[var(--text-muted)] leading-relaxed list-decimal list-inside space-y-0.5">
                      <li>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">console.anthropic.com/settings/keys</a></li>
                      <li>Sign in (or create a free account)</li>
                      <li>Click <strong className="text-[var(--text-secondary)]">Create Key</strong>, copy it, and paste below</li>
                    </ol>
                  </div>
                ) : provider === 'chatgpt' ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      <strong className="text-[var(--text-secondary)]">How to get your key (same ChatGPT login):</strong>
                    </p>
                    <ol className="text-[10px] text-[var(--text-muted)] leading-relaxed list-decimal list-inside space-y-0.5">
                      <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">platform.openai.com/api-keys</a></li>
                      <li>Log in with <strong className="text-[var(--text-secondary)]">your existing ChatGPT account</strong></li>
                      <li>Click <strong className="text-[var(--text-secondary)]">Create new secret key</strong>, copy it, and paste below</li>
                    </ol>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-1">
                      💡 API usage is billed separately from your ChatGPT subscription — you only pay for what Divi uses.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      <strong className="text-[var(--text-secondary)]">How to get your key:</strong>
                    </p>
                    <ol className="text-[10px] text-[var(--text-muted)] leading-relaxed list-decimal list-inside space-y-0.5">
                      <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">platform.openai.com/api-keys</a></li>
                      <li>Sign in (or create a free account)</li>
                      <li>Click <strong className="text-[var(--text-secondary)]">Create new secret key</strong>, copy it, and paste below</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6">
              <button
                onClick={handleSaveKey}
                disabled={saving || !apiKey.trim()}
                className="w-full btn-primary py-3 text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting Divi...
                  </span>
                ) : (
                  '💬 Save Key & Start Chat with Divi →'
                )}
              </button>
              <button
                onClick={onDismiss}
                className="w-full mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-2"
              >
                I&apos;ll set this up later in Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
