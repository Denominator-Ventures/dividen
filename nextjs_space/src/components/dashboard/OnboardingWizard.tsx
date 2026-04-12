'use client';

import { useState, useCallback } from 'react';

interface OnboardingWizardProps {
  userName?: string;
  onComplete: (options?: { triggerDiviIntro?: boolean }) => void;
}

export function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [agentName, setAgentName] = useState('Divi');
  const [autoDetected, setAutoDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleKeyChange = (value: string) => {
    const trimmed = value.trim();
    let detectedProvider = provider;
    let detected = false;

    if (trimmed.startsWith('sk-ant-')) {
      detectedProvider = 'anthropic';
      detected = true;
    } else if (trimmed.startsWith('sk-') && !trimmed.startsWith('sk-ant-')) {
      detectedProvider = 'openai';
      detected = true;
    }

    setProvider(detectedProvider);
    setAutoDetected(detected);
    setApiKey(value);
  };

  const handleSubmit = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please paste your API key to continue.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // 1. Initialize onboarding — creates project + tasks + saves key
      const res = await fetch('/api/onboarding/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          provider,
          agentName: agentName.trim() || 'Divi',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to initialize. Please try again.');
        return;
      }

      // 2. Signal the dashboard to trigger Divi's intro and switch to chat
      onComplete({ triggerDiviIntro: true });
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, provider, agentName, onComplete]);

  const handleSkip = useCallback(async () => {
    setLoading(true);
    try {
      // Initialize with no API key — still create the project + tasks
      await fetch('/api/onboarding/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: agentName.trim() || 'Divi' }),
      });
      onComplete({ triggerDiviIntro: false });
    } catch {
      onComplete({ triggerDiviIntro: false });
    } finally {
      setLoading(false);
    }
  }, [agentName, onComplete]);

  const firstName = userName?.split(' ')[0];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">⬡</span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Welcome{firstName ? `, ${firstName}` : ''}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Let&apos;s get Divi working for you
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Divi is your personal AI agent. It learns how you work, manages your tasks, reads your email, 
            and handles the operational overhead so you can focus on what matters. First, give Divi access to an AI model.
          </p>
        </div>

        {/* API Key Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              AI Model API Key
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Divi uses this key to think, draft, and act on your behalf. We auto-detect the provider from the key prefix.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="sk-ant-... or sk-..."
              className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-brand-400 transition-colors font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-3 mt-2">
              {autoDetected ? (
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span>✓</span>
                  Detected: {provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">Provider:</span>
                  {['anthropic', 'openai'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        provider === p
                          ? 'border-brand-400 text-brand-400 bg-brand-500/10'
                          : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {p === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advanced: Agent Name */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <span className="text-[9px]">{showAdvanced ? '▼' : '▶'}</span>
              Customize agent name
            </button>
            {showAdvanced && (
              <div className="mt-2">
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Divi"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-brand-400 transition-colors"
                  maxLength={20}
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Default: Divi. You can change this anytime.</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* What happens next */}
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <p className="text-[11px] text-brand-400 font-medium mb-2">What happens next</p>
            <div className="space-y-1.5">
              {[
                { icon: '💬', text: 'Divi introduces itself and walks you through what it can do' },
                { icon: '📧', text: 'Divi offers to connect your email and show you what\'s important' },
                { icon: '⚡', text: 'Setup tasks appear in your NOW panel — complete or skip at your pace' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs flex-shrink-0">{item.icon}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            >
              Skip for now — I&apos;ll add it later
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !apiKey.trim()}
              className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                'Activate Divi →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
