/**
 * Onboarding Phase Definitions
 * 
 * Defines the content, widgets, and flow for each onboarding phase.
 * Used by the onboarding advance API and rendered in ChatView.
 * 
 * Phase 0: API Key (OnboardingWizard — not chat-based)
 * Phase 1: Divi Settings (workingStyle, triage, identity, goals)
 * Phase 2: Email / Google Connect
 * Phase 3: What you just unlocked (connected overview)
 * Phase 4: Webhooks & Custom Signals
 * Phase 5: System Propagation (expanded catch-up)
 * Phase 6: Complete
 */

export interface OnboardingWidget {
  type: 'slider' | 'toggle' | 'select' | 'radio' | 'google_connect' | 'submit' | 'skip' | 'info' | 'webhook_setup' | 'text_input';
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
  // Text input
  placeholder?: string;
  maxLength?: number;
  defaultValue?: string;
}

export interface OnboardingPhaseConfig {
  phase: number;
  name: string;
  diviMessage: string;
  widgets: OnboardingWidget[];
  autoAdvance?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: Divi Settings Walkthrough
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhase1Message(diviName: string): string {
  return `Hey! \ud83d\udc4b I'm ${diviName || 'Divi'}, your personal AI command center. Now that we've got the brain connected, let me learn how you like to work.

First up \u2014 **how detailed should I be?** If you set this low, I'll be short and punchy. Set it high and I'll give you full context with every response. Most people start at 3 and adjust later.`;
}

export function getPhase1Widgets(workingStyle: any, triageSettings: any, goalsEnabled: boolean, currentDiviName: string): OnboardingWidget[] {
  const ws = workingStyle || { verbosity: 3, proactivity: 4, autonomy: 3, formality: 2 };
  const ts = triageSettings || { triageStyle: 'task-first' };
  return [
    // \u2500\u2500 Response Detail
    {
      type: 'slider', id: 'verbosity', label: 'Response Detail',
      description: 'Low = terse, one-liner answers. High = thorough breakdowns with reasoning.',
      min: 1, max: 5, value: ws.verbosity, lowLabel: 'Concise', highLabel: 'Detailed',
    },
    // \u2500\u2500 Proactivity
    {
      type: 'slider', id: 'proactivity', label: 'Proactivity',
      description: 'Low = I wait for you to ask. High = I surface things you should know about, suggest next steps, and flag issues before you ask.',
      min: 1, max: 5, value: ws.proactivity, lowLabel: 'Reactive', highLabel: 'Proactive',
    },
    // \u2500\u2500 Autonomy
    {
      type: 'slider', id: 'autonomy', label: 'Autonomy',
      description: 'Low = I check with you before doing anything. High = I handle routine stuff and report back. This affects email drafts, task creation, and triage.',
      min: 1, max: 5, value: ws.autonomy, lowLabel: 'Ask First', highLabel: 'Act & Report',
    },
    // \u2500\u2500 Tone
    {
      type: 'slider', id: 'formality', label: 'Tone',
      description: 'Low = casual, first-name basis, emoji-friendly. High = professional, structured, meeting-ready language.',
      min: 1, max: 5, value: ws.formality, lowLabel: 'Casual', highLabel: 'Professional',
    },
    // \u2500\u2500 Triage Style
    {
      type: 'radio', id: 'triageStyle',
      label: 'How should I handle incoming signals?',
      description: 'When I triage your email, calendar, and other signals, how should I organize what I find?',
      options: [
        { value: 'task-first', label: 'Task-First', description: 'Extract tasks, route to existing cards. Board converges over time.' },
        { value: 'card-per-item', label: 'Card Per Item', description: 'New card for every signal. More cards, less convergence.' },
        { value: 'minimal', label: 'Minimal', description: 'Light-touch summaries without heavy board changes.' },
      ],
      selectedValue: ts.triageStyle || 'task-first',
    },
    // \u2500\u2500 Identity Preference
    {
      type: 'radio', id: 'identityPreference',
      label: 'How should I handle your accounts?',
      description: 'I can send emails through your account, use your calendar and drive \u2014 or I can have my own separate accounts that I manage independently.',
      options: [
        { value: 'shared', label: 'Use my accounts', description: 'Send as you, use your calendar & drive' },
        { value: 'separate', label: 'Give Divi its own', description: "Divi gets its own email, calendar & drive" },
        { value: 'hybrid', label: 'Both', description: 'Use mine for sending, but give Divi its own workspace' },
      ],
      selectedValue: 'shared',
    },
    // \u2500\u2500 Goals
    {
      type: 'toggle', id: 'goalsEnabled',
      label: 'Enable Goals tracking?',
      description: 'I can track objectives, nudge you on progress, and break goals into actionable steps. Turn this on if you want goal-oriented coaching.',
      checked: goalsEnabled,
    },
    // \u2500\u2500 Agent Name
    {
      type: 'text_input', id: 'diviName',
      label: 'What should I call myself?',
      description: 'Default is Divi. You can rename me to anything.',
      placeholder: 'Divi',
      defaultValue: currentDiviName || '',
      maxLength: 20,
    },
    { type: 'submit', id: 'phase1_submit', submitLabel: 'Save & Continue \u2192' },
    { type: 'skip', id: 'phase1_skip', label: 'Skip \u2014 I\'ll configure later' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: Email / Google Connect
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhase2Message(): string {
  return `Great settings! Now let's get your email connected. This is the **single biggest unlock** \u2014 once I can see your inbox, I can triage action items, draft responses, and keep you on top of everything.

Connecting Gmail also gives me access to your **Calendar** and **Drive** automatically. We support up to **3 personal accounts**.

Alternatively, if you prefer SMTP, you can configure it later in Settings \u2192 Integrations.

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
      icon: '\u2705', text: `Connected: ${connectedEmails[i]}`,
    });
  }

  // Show connect buttons for remaining operator slots
  if (operatorCount < 3) {
    const label = operatorCount === 0
      ? '\ud83d\udd17 Connect Gmail'
      : operatorCount === 1
        ? '\ud83d\udd17 Connect Another Gmail'
        : '\ud83d\udd17 Connect Third Gmail';
    widgets.push({
      type: 'google_connect', id: `gmail_connect_${operatorCount}`,
      label,
      identity: 'operator',
      accountIndex: operatorCount,
      connected: false,
    });
  }

  // If 1+ connected, offer another
  if (operatorCount >= 1 && operatorCount < 3) {
    widgets.push({
      type: 'info', id: 'multi_account_note',
      icon: '\ud83d\udca1', text: `We support up to 3 Gmail accounts. Connect more if you use multiple.`,
    });
  }

  // Agent account option based on identity preference
  if ((identityPreference === 'separate' || identityPreference === 'hybrid') && agentCount === 0) {
    widgets.push({
      type: 'google_connect', id: 'gmail_connect_agent',
      label: "\ud83e\udd16 Connect Divi's Gmail",
      description: "This will be Divi's own email account \u2014 separate from yours. It can send/receive independently.",
      identity: 'agent',
      accountIndex: 0,
      connected: false,
    });
  } else if (agentCount > 0) {
    widgets.push({
      type: 'info', id: 'agent_connected',
      icon: '\ud83e\udd16', text: `Divi's account connected`,
    });
  }

  widgets.push({
    type: 'submit', id: 'phase2_submit',
    submitLabel: operatorCount > 0 ? 'Continue \u2192' : 'Continue without email',
  });
  widgets.push({ type: 'skip', id: 'phase2_skip', label: 'Skip \u2014 I\'ll set up email later' });

  return widgets;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: What you just unlocked
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhase3Message(connectedServices: string[]): string {
  const hasGoogle = connectedServices.length > 0;

  if (!hasGoogle) {
    return `No worries on email \u2014 you can always connect it later in **Settings \u2192 Integrations**.

Even without email connected, your command center has a lot to offer. Here's what's available to you:

\ud83d\udcac **Chat** \u2014 Talk to me about anything. I can create tasks, manage your board, research things, and more.
\ud83d\udcdd **Board** \u2014 Your kanban-style project board. Cards flow from ideas to done.
\ud83d\udcc8 **NOW** \u2014 Your real-time priority list \u2014 I rank what matters most right now.
\ud83c\udf10 **Marketplace** \u2014 Install agents that extend what I can do.

Once you connect email later, the Email, Calendar, and Drive tabs will light up instantly.`;
  }

  return `\ud83c\udf89 **Nice!** By connecting Google, you just fast-tracked yourself. Here's what you unlocked:

\ud83d\udce7 **Email Tab** \u2014 Your inbox is now live. Hover over any email to discuss it with me, ask me to draft replies, or extract action items.

\ud83d\udcc5 **Calendar Tab** \u2014 Your events, recordings, and meeting notes are synced. I can prep you for meetings and generate follow-up notes.

\ud83d\udcc1 **Drive Tab** \u2014 Your files are browsable. Point me at any document and I can summarize, analyze, or act on it.

All of these tabs are **interactive** \u2014 hover over any item and I can help. Try it after we finish setup!`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: Webhooks & Custom Signals
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhase4Message(): string {
  return `Now let's talk about **Signals**. Every piece of information that flows into your command center is a signal \u2014 email, calendar events, files, and more.

But you can also add **custom signals** via webhooks. This means any external tool, service, or automation can feed data to me.

**Examples of webhook signals:**
\u2022 \ud83d\uded2 Stripe \u2014 new payments, subscription changes
\u2022 \ud83d\udccb Jira/Linear \u2014 ticket updates, sprint changes
\u2022 \ud83d\udd14 Slack \u2014 important channel messages
\u2022 \ud83d\udcca Analytics \u2014 traffic spikes, conversion alerts
\u2022 \ud83c\udfd7\ufe0f GitHub \u2014 PRs, deployments, issues
\u2022 \ud83d\udcf1 CRM \u2014 new leads, deal stage changes

Want to set one up now? I'll walk you through it. Or skip and add signals anytime from the \ud83d\udce1 Signals tab.`;
}

export function getPhase4Widgets(): OnboardingWidget[] {
  return [
    {
      type: 'webhook_setup', id: 'webhook_setup',
      label: 'Set up a webhook signal',
      description: 'I\'ll generate a unique URL you can paste into any service.',
    },
    { type: 'submit', id: 'phase4_submit', submitLabel: 'Continue to final step \u2192' },
    { type: 'skip', id: 'phase4_skip', label: 'Skip \u2014 I\'ll add signals later' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: System Propagation (expanded catch-up)
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhase5Message(hasEmail: boolean, hasCalendar: boolean, hasDrive: boolean): string {
  const sources: string[] = [];
  if (hasEmail) sources.push('your last 300 emails');
  if (hasCalendar) sources.push('your events and notes from the past 2 weeks');
  if (hasDrive) sources.push('files uploaded in the last 30 days');

  if (sources.length === 0) {
    return `**Final Step: System Propagation**

Since you haven't connected any data sources yet, there's nothing to propagate right now. Once you connect your email, calendar, or drive, you can run **\ud83d\udd04 Catch Up** from the top bar \u2014 I'll process everything and get fully up to speed on your world.

You're all set! \ud83c\udf89 Your command center is ready.`;
  }

  return `**Final Step: System Propagation** \ud83d\ude80

This is the most important step. I'm going to go through ${sources.join(', ')} \u2014 building context, extracting tasks, identifying people, and getting fully up to speed on your world.

This is an **expanded Catch Up** and it'll take a few minutes, but it's critical to getting you on the right path. After this, I'll know:
\u2022 Who your key contacts are and how you interact with them
\u2022 What tasks and action items are pending
\u2022 What meetings are coming up and what prep is needed
\u2022 What files and documents are relevant right now

Ready? Hit the button and I'll get started. This runs in the background \u2014 you can keep chatting while I work.`;
}

export function getPhase5Widgets(hasConnectedSources: boolean): OnboardingWidget[] {
  if (!hasConnectedSources) {
    return [
      { type: 'submit', id: 'phase5_submit', submitLabel: 'Finish Setup \ud83c\udf89' },
    ];
  }
  return [
    { type: 'submit', id: 'phase5_start', submitLabel: '\ud83d\ude80 Start Propagation' },
    { type: 'skip', id: 'phase5_skip', label: 'Skip \u2014 I\'ll run Catch Up later' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settings widget configs (for re-invocation from chat via action tags)
// ═══════════════════════════════════════════════════════════════════════════════

export type SettingsWidgetGroup = 'working_style' | 'triage' | 'identity' | 'goals' | 'all';

export function getSettingsWidgets(
  group: SettingsWidgetGroup,
  workingStyle: any,
  triageSettings: any,
  goalsEnabled: boolean,
  diviName: string,
): OnboardingWidget[] {
  const ws = workingStyle || { verbosity: 3, proactivity: 4, autonomy: 3, formality: 2 };
  const ts = triageSettings || { triageStyle: 'task-first' };
  const widgets: OnboardingWidget[] = [];

  if (group === 'working_style' || group === 'all') {
    widgets.push(
      { type: 'slider', id: 'verbosity', label: 'Response Detail', description: 'Low = terse. High = thorough.', min: 1, max: 5, value: ws.verbosity, lowLabel: 'Concise', highLabel: 'Detailed' },
      { type: 'slider', id: 'proactivity', label: 'Proactivity', description: 'Low = wait for instructions. High = surface suggestions.', min: 1, max: 5, value: ws.proactivity, lowLabel: 'Reactive', highLabel: 'Proactive' },
      { type: 'slider', id: 'autonomy', label: 'Autonomy', description: 'Low = check first. High = handle routine stuff independently.', min: 1, max: 5, value: ws.autonomy, lowLabel: 'Ask First', highLabel: 'Act & Report' },
      { type: 'slider', id: 'formality', label: 'Tone', description: 'Low = casual. High = professional.', min: 1, max: 5, value: ws.formality, lowLabel: 'Casual', highLabel: 'Professional' },
    );
  }

  if (group === 'triage' || group === 'all') {
    widgets.push({
      type: 'radio', id: 'triageStyle', label: 'Triage Style',
      description: 'How I organize what I find when processing signals.',
      options: [
        { value: 'task-first', label: 'Task-First', description: 'Route to existing cards' },
        { value: 'card-per-item', label: 'Card Per Item', description: 'New card for every signal' },
        { value: 'minimal', label: 'Minimal', description: 'Light summaries only' },
      ],
      selectedValue: ts.triageStyle || 'task-first',
    });
  }

  if (group === 'goals' || group === 'all') {
    widgets.push({
      type: 'toggle', id: 'goalsEnabled', label: 'Goals Tracking',
      description: 'Track objectives and get goal-oriented coaching.',
      checked: goalsEnabled,
    });
  }

  if (group === 'identity' || group === 'all') {
    widgets.push({
      type: 'text_input', id: 'diviName',
      label: 'Agent Name',
      description: 'What should I call myself?',
      placeholder: 'Divi',
      defaultValue: diviName || 'Divi',
      maxLength: 20,
    });
  }

  widgets.push({ type: 'submit', id: 'settings_submit', submitLabel: 'Save Changes' });

  return widgets;
}
