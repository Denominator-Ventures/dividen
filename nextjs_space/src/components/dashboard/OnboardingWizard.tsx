'use client';

import { useState, useCallback } from 'react';

interface OnboardingWizardProps {
  userName?: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'agent' | 'workspace' | 'connect' | 'done';

const STEPS: Step[] = ['welcome', 'agent', 'workspace', 'connect', 'done'];

const STARTER_TASKS = [
  { title: 'Try chatting with Divi', description: 'Open the Chat tab and ask Divi to help you with something. Try: "What can you help me with?"', type: 'task' as const, priority: 'medium' as const },
  { title: 'Create your first kanban card', description: 'Go to the Board tab, click + Add Card, and create a card for something you\'re working on.', type: 'task' as const, priority: 'medium' as const },
  { title: 'Add a contact to your CRM', description: 'Open the CRM tab and add someone you work with. Divi will help you enrich their profile.', type: 'task' as const, priority: 'low' as const },
  { title: 'Explore the Agent Marketplace', description: 'Check out the Marketplace tab under Network to discover and install agent extensions.', type: 'task' as const, priority: 'low' as const },
];

export function OnboardingWizard({ userName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [agentName, setAgentName] = useState('Divi');
  const [seedTasks, setSeedTasks] = useState(true);
  const [loading, setLoading] = useState(false);

  const currentIdx = STEPS.indexOf(step);
  const progress = ((currentIdx) / (STEPS.length - 1)) * 100;

  const next = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx]);
  };

  const prev = () => {
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx]);
  };

  const finishOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      // Seed starter tasks if opted in
      if (seedTasks) {
        for (const task of STARTER_TASKS) {
          await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, source: 'system' }),
          }).catch(() => {});
        }
      }

      // Save agent name to profile if customized
      if (agentName && agentName !== 'Divi') {
        await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `My agent's name is ${agentName}. Please remember this.` }),
        }).catch(() => {});
      }

      // Mark onboarding complete
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      });

      onComplete();
    } catch {
      onComplete();
    } finally {
      setLoading(false);
    }
  }, [agentName, seedTasks, onComplete]);

  const skip = async () => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hasCompletedOnboarding: true }),
    }).catch(() => {});
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-primary)]">
          <div
            className="h-full bg-brand-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 md:p-8">
          {/* ── Welcome ───────────────────── */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-5xl mb-4">⬡</div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                Let&apos;s set up your workspace in 60 seconds. You&apos;ll configure your AI agent,
                seed some starter content, and be ready to go.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={skip} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                  Skip setup
                </button>
                <button onClick={next} className="btn-primary px-6 py-2 text-sm">
                  Let&apos;s go →
                </button>
              </div>
            </div>
          )}

          {/* ── Name Your Agent ─────────── */}
          {step === 'agent' && (
            <div>
              <div className="text-3xl mb-3">🤖</div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Name your AI agent</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Your agent works alongside you — managing tasks, coordinating with other agents, and handling the operational overhead. Give it a name.
              </p>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Divi"
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-brand-400 transition-colors mb-2"
                maxLength={20}
              />
              <p className="text-[10px] text-[var(--text-muted)] mb-5">Default: Divi. You can change this anytime in Settings.</p>
              <div className="flex justify-between">
                <button onClick={prev} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">← Back</button>
                <button onClick={next} className="btn-primary px-5 py-2 text-sm">Next →</button>
              </div>
            </div>
          )}

          {/* ── Workspace Setup ─────────── */}
          {step === 'workspace' && (
            <div>
              <div className="text-3xl mb-3">📋</div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Seed your workspace</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                We&apos;ll add a few starter tasks to your queue so you can learn the system by doing.
              </p>

              <div className="space-y-2 mb-5">
                {STARTER_TASKS.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <span className="text-brand-400 mt-0.5">✦</span>
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{task.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedTasks}
                  onChange={(e) => setSeedTasks(e.target.checked)}
                  className="rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-brand-400 focus:ring-brand-400"
                />
                <span className="text-sm text-[var(--text-secondary)]">Add these starter tasks to my queue</span>
              </label>

              <div className="flex justify-between">
                <button onClick={prev} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">← Back</button>
                <button onClick={next} className="btn-primary px-5 py-2 text-sm">Next →</button>
              </div>
            </div>
          )}

          {/* ── Connect ────────────────── */}
          {step === 'connect' && (
            <div>
              <div className="text-3xl mb-3">🔗</div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Connect with others</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                DiviDen is built for collaboration between AI agents. Here&apos;s how to get started:
              </p>

              <div className="space-y-3 mb-5">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-primary)] font-medium">📨 Invite someone</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Go to Connections tab → Invite. They&apos;ll get an email with a link to join and connect their agent to yours.</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-primary)] font-medium">🌐 Federation</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Connect to other DiviDen instances for cross-organization agent collaboration. Your agents negotiate, share context, and route tasks autonomously.</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-primary)] font-medium">🏪 Marketplace</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Browse and install agent extensions, or list your own for others to use. Paid agents earn revenue with a 97/3 split.</p>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={prev} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">← Back</button>
                <button onClick={() => setStep('done')} className="btn-primary px-5 py-2 text-sm">Finish →</button>
              </div>
            </div>
          )}

          {/* ── Done ───────────────────── */}
          {step === 'done' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">You&apos;re all set</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                Your workspace is ready. Start by chatting with {agentName || 'Divi'} — ask it anything.
                {seedTasks && ' Check your Queue for starter tasks.'}
              </p>
              <button
                onClick={finishOnboarding}
                disabled={loading}
                className="btn-primary px-8 py-3 text-sm"
              >
                {loading ? 'Setting up...' : 'Enter DiviDen →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
