'use client';

import { useState, useCallback } from 'react';

interface OnboardingWizardProps {
  userName?: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'agent' | 'workspace' | 'connect' | 'done';

const STEPS: Step[] = ['welcome', 'agent', 'workspace', 'connect', 'done'];

// NOW items — high-priority, action-oriented, show up immediately in the NOW panel
const NOW_TASKS = [
  { title: 'Connect your email', description: 'Let Divi read your inbox, surface what matters, and draft responses. This is the #1 way to get value fast.', type: 'task' as const, priority: 'urgent' as const },
  { title: 'Chat with Divi', description: 'Open the Chat tab and try: "What can you help me with?" — Divi learns your style the more you interact.', type: 'task' as const, priority: 'high' as const },
  { title: 'Add your first contact', description: 'Open CRM and add someone you work with. Divi will help you track context and history.', type: 'task' as const, priority: 'high' as const },
  { title: 'Set a goal', description: 'Go to Goals and create something you\'re working toward. Divi will track progress and nudge you.', type: 'task' as const, priority: 'medium' as const },
];

// Queue items — lower-priority exploration tasks, show in Queue panel separately
const QUEUE_TASKS = [
  { title: 'Explore the Agent Marketplace', description: 'Discover community-built agents under Network → Marketplace. Install one to extend Divi.', type: 'task' as const, priority: 'low' as const },
  { title: 'Create a kanban card', description: 'Go to Board and create a card for a project you\'re tracking. Divi can help manage it.', type: 'task' as const, priority: 'low' as const },
  { title: 'Invite a collaborator', description: 'Go to Network → Connections and invite someone. Your agents will coordinate automatically.', type: 'task' as const, priority: 'low' as const },
  { title: 'Check out Extensions', description: 'Browse the Extensions tab to see available integrations and agent plugins.', type: 'task' as const, priority: 'low' as const },
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
      // Seed starter tasks if opted in — NOW items (high priority) + Queue items (low priority)
      if (seedTasks) {
        for (const task of NOW_TASKS) {
          await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, source: 'system' }),
          }).catch(() => {});
        }
        for (const task of QUEUE_TASKS) {
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
              <div className="text-3xl mb-3">⚡</div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Seed your workspace</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                We&apos;ll add starter items to get you moving. High-priority actions land in <strong>NOW</strong>, exploration tasks go to your <strong>Queue</strong>.
              </p>

              <p className="text-[10px] text-brand-400 uppercase tracking-wider font-medium mb-2">⚡ NOW — Do These First</p>
              <div className="space-y-1.5 mb-4">
                {NOW_TASKS.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-brand-500/5 border border-brand-500/15">
                    <span className="text-brand-400 mt-0.5 text-xs">●</span>
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{task.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">📋 Queue — Explore Later</p>
              <div className="space-y-1.5 mb-4">
                {QUEUE_TASKS.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <span className="text-[var(--text-muted)] mt-0.5 text-xs">○</span>
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{task.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{task.description}</p>
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
                <span className="text-sm text-[var(--text-secondary)]">Add these starter items</span>
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
                {seedTasks && ' Your NOW panel has action items, and your Queue has exploration tasks.'}
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
