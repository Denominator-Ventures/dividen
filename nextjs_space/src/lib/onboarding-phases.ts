/**
 * Onboarding Phase Definitions
 * 
 * Defines the content, widgets, and flow for each onboarding phase.
 * Used by the onboarding advance API and rendered in ChatView.
 */

export interface OnboardingWidget {
  type: 'slider' | 'toggle' | 'select' | 'radio' | 'google_connect' | 'submit' | 'skip' | 'info' | 'webhook_setup';
  id: string;
  label?: string;
  description?: string;
  // Slider
  min?: number;
  max?: number;
  value?: number;
  lowLabel?: string;
  highLabel?: string;
  // Toggle
  checked?: boolean;
  // Select / Radio
  options?: { value: string; label: string; description?: string }[];
  selectedValue?: string;
  // Google Connect
  identity?: 'operator' | 'agent';
  accountIndex?: number;
  connected?: boolean;
  connectedEmail?: string;
  // Submit
  submitLabel?: string;
  // Info
  text?: string;
  icon?: string;
}

export interface OnboardingPhaseConfig {
  phase: number;
  name: string;
  diviMessage: string;
  widgets: OnboardingWidget[];
  // If true, phase auto-advances after viewing (no interaction needed)
  autoAdvance?: boolean;
}

export function getPhase1Message(diviName: string): string {
  return `Hey! 👋 I'm ${diviName || 'Divi'}, your personal AI command center. Now that we've got the brain connected, let me learn how you like to work.

I've got a few quick questions — they'll shape how I communicate, how proactive I am, and what I do on your behalf. You can always change these later in Settings.

Let's start with the basics:`;
}

export function getPhase1Widgets(workingStyle: any): OnboardingWidget[] {
  const ws = workingStyle || { verbosity: 3, proactivity: 4, autonomy: 3, formality: 2 };
  return [
    {
      type: 'slider', id: 'verbosity', label: 'Response Detail',
      description: 'How much context and detail in my responses?',
      min: 1, max: 5, value: ws.verbosity, lowLabel: 'Concise', highLabel: 'Detailed',
    },
    {
      type: 'slider', id: 'proactivity', label: 'Proactivity',
      description: 'Should I surface suggestions or wait for you to ask?',
      min: 1, max: 5, value: ws.proactivity, lowLabel: 'Reactive', highLabel: 'Proactive',
    },
    {
      type: 'slider', id: 'autonomy', label: 'Autonomy',
      description: 'How much independence on routine decisions?',
      min: 1, max: 5, value: ws.autonomy, lowLabel: 'Ask First', highLabel: 'Act & Report',
    },
    {
      type: 'slider', id: 'formality', label: 'Tone',
      description: 'How should I talk to you?',
      min: 1, max: 5, value: ws.formality, lowLabel: 'Casual', highLabel: 'Professional',
    },
    {
      type: 'radio', id: 'identityPreference',
      label: 'How should I handle your accounts?',
      description: 'I can send emails through your account, use your calendar and drive — or I can have my own separate accounts that I manage independently.',
      options: [
        { value: 'shared', label: 'Use my accounts', description: 'Send as you, use your calendar & drive' },
        { value: 'separate', label: 'Give Divi its own', description: "Divi gets its own email, calendar & drive" },
        { value: 'hybrid', label: 'Both', description: 'Use mine for sending, but give Divi its own workspace' },
      ],
      selectedValue: 'shared',
    },
    { type: 'submit', id: 'phase1_submit', submitLabel: 'Save & Continue →' },
    { type: 'skip', id: 'phase1_skip', label: 'Skip — I\'ll configure later' },
  ];
}

export function getPhase2Message(): string {
  return `Great settings! Now let's get your email connected. This is the single biggest unlock — once I can see your inbox, I can triage action items, draft responses, and keep you on top of everything.

**Option 1: Connect Gmail** (recommended)
One click and I get access to email, calendar, and drive. We support up to 3 personal accounts.

**Option 2: SMTP**
If you prefer, you can configure SMTP in Settings → Integrations. Skip this step and set it up later.

Let's start with your primary Gmail:`;
}

export function getPhase2Widgets(
  operatorCount: number,
  agentCount: number,
  identityPreference: string,
  connectedEmails: string[]
): OnboardingWidget[] {
  const widgets: OnboardingWidget[] = [];

  // Show connected accounts
  for (let i = 0; i < connectedEmails.length; i++) {
    widgets.push({
      type: 'info', id: `connected_${i}`,
      icon: '✅', text: `Connected: ${connectedEmails[i]}`,
    });
  }

  // Show connect buttons for remaining slots
  if (operatorCount < 3) {
    const label = operatorCount === 0
      ? '🔗 Connect Gmail'
      : operatorCount === 1
        ? '🔗 Connect Another Gmail'
        : '🔗 Connect Third Gmail';
    widgets.push({
      type: 'google_connect', id: `gmail_connect_${operatorCount}`,
      label,
      identity: 'operator',
      accountIndex: operatorCount,
      connected: false,
    });
  }

  // If they want Divi to have its own, show agent connect
  if ((identityPreference === 'separate' || identityPreference === 'hybrid') && agentCount === 0) {
    widgets.push({
      type: 'google_connect', id: 'gmail_connect_agent',
      label: "🤖 Connect Divi's Gmail",
      description: "This will be Divi's own email account — separate from yours.",
      identity: 'agent',
      accountIndex: 0,
      connected: false,
    });
  } else if (agentCount > 0) {
    widgets.push({
      type: 'info', id: 'agent_connected',
      icon: '🤖', text: `Divi's account connected`,
    });
  }

  widgets.push({ type: 'submit', id: 'phase2_submit', submitLabel: operatorCount > 0 ? 'Continue →' : 'Continue without email' });
  widgets.push({ type: 'skip', id: 'phase2_skip', label: 'Skip — I\'ll set up email later' });

  return widgets;
}

export function getPhase3Message(connectedServices: string[]): string {
  if (connectedServices.length === 0) {
    return `No worries — you can always connect accounts later in Settings → Integrations.

Let's move on to signals and webhooks. You can skip this too if you'd like.`;
  }

  const services = [...new Set(connectedServices)];
  return `🎉 **Nice!** By connecting Google, you just fast-tracked yourself. Here's what you unlocked:

📧 **Email Tab** — Your inbox is now live. Hover over any email to discuss it with me, ask me to draft replies, or extract action items.

📅 **Calendar Tab** — Your events, recordings, and meeting notes are synced. I can prep you for meetings and generate follow-up notes.

📁 **Drive Tab** — Your files are browsable. Point me at any document and I can summarize, analyze, or act on it.

All of these tabs are interactive — hover over any item and I can help. Try it after we finish setup!`;
}

export function getPhase4Message(): string {
  return `Now let's talk about **Signals**. Every piece of information that flows into your command center is a signal — email, calendar events, files, and more.

But you can also add **custom signals** via webhooks. This means any external tool, service, or automation can feed data to me.

**Examples of webhook signals:**
• 🛒 Stripe — new payments, subscription changes
• 📋 Jira/Linear — ticket updates, sprint changes
• 🔔 Slack — important channel messages
• 📊 Analytics — traffic spikes, conversion alerts
• 🏗️ GitHub — PRs, deployments, issues
• 📱 CRM — new leads, deal stage changes

Want to set one up now? I'll walk you through it. Or skip and add signals anytime from the 📡 Signals tab.`;
}

export function getPhase4Widgets(): OnboardingWidget[] {
  return [
    {
      type: 'webhook_setup', id: 'webhook_setup',
      label: 'Set up a webhook signal',
      description: 'I\'ll generate a unique URL you can paste into any service.',
    },
    { type: 'submit', id: 'phase4_submit', submitLabel: 'Continue to final step →' },
    { type: 'skip', id: 'phase4_skip', label: 'Skip — I\'ll add signals later' },
  ];
}

export function getPhase5Message(hasEmail: boolean, hasCalendar: boolean, hasDrive: boolean): string {
  const sources: string[] = [];
  if (hasEmail) sources.push('your last 300 emails');
  if (hasCalendar) sources.push('your events and notes from the past 2 weeks');
  if (hasDrive) sources.push('files uploaded in the last 30 days');

  if (sources.length === 0) {
    return `**Final Step: System Propagation**

Since you haven't connected any accounts yet, there's nothing to catch up on right now. Once you connect your email, calendar, or drive, come back and run Catch Up from the top bar — I'll process everything and get up to speed.

You're all set! 🎉 Your command center is ready. Start chatting with me anytime, or explore the tabs above.`;
  }

  return `**Final Step: System Propagation** 🚀

This is the most important step. I'm going to go through ${sources.join(', ')} — building context, extracting tasks, identifying people, and getting fully up to speed on your world.

This is an expanded Catch Up and it'll take a few minutes, but it's critical. After this, I'll know:
• Who your key contacts are and how you interact with them
• What tasks and action items are pending
• What meetings are coming up and what prep is needed
• What files and documents are relevant right now

Ready? Hit the button and I'll get started.`;
}

export function getPhase5Widgets(hasConnectedSources: boolean): OnboardingWidget[] {
  if (!hasConnectedSources) {
    return [
      { type: 'submit', id: 'phase5_submit', submitLabel: 'Finish Setup 🎉' },
    ];
  }
  return [
    { type: 'submit', id: 'phase5_start', submitLabel: '🚀 Start Propagation' },
    { type: 'skip', id: 'phase5_skip', label: 'Skip — I\'ll run Catch Up later' },
  ];
}

export function getCompletionMessage(diviName: string): string {
  return `✅ **Setup Complete!**

${diviName || 'Divi'} is fully configured and ready to work. Here's your command center:

• **Chat** — Talk to me anytime. I'm always here.
• **NOW** — Your prioritized task list. I keep it fresh.
• **Board** — Kanban cards for everything that needs tracking.
• **Email / Calendar / Drive** — Interactive tabs. Hover to engage.
• **📡 Signals** — Your data feeds. Add more anytime.
• **🔄 Catch Up** — One-click triage of everything.

What would you like to tackle first?`;
}
