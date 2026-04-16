// ─── Landing page data ──────────────────────────────────────────────────────

export const TYPING_PHRASES = [
  'manage your pipeline',
  'show its work on every decision',
  'track goals and priorities',
  'route work intelligently',
  'learn from every interaction',
  'coordinate across teams',
];

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  tier: 'core' | 'power';
}

export const FEATURES: FeatureItem[] = [
  // ─── Core (always visible) ──────────────────────────────────────────
  {
    icon: '🧠',
    title: 'AI Agent Intelligence',
    description:
      'Your Divi reasons across 13 consolidated prompt groups — identity, goals, connections, memory, tools, calendar, capabilities, and more — assembling full context on every decision.',
    tier: 'core',
  },
  {
    icon: '🎯',
    title: 'Goals & Dynamic NOW Engine',
    description:
      'Define objectives, track progress, and let the NOW Engine rank what matters most right now — across goals, queue items, and relays.',
    tier: 'core',
  },
  {
    icon: '⚡',
    title: 'Action Tags — Not Just Chat',
    description:
      '53 executable actions via natural conversation. Route tasks, create goals, assemble briefs, dispatch relays, manage contacts, post jobs, install agents — all from chat.',
    tier: 'core',
  },
  {
    icon: '📋',
    title: 'The Brief — Show Your Work',
    description:
      'Every agent decision generates a reasoning brief. Full transparency on what context was assembled, who was matched, and why.',
    tier: 'core',
  },
  // ─── Power features (expandable) ──────────────────────────────────
  {
    icon: '🔗',
    title: 'Ambient Relay Protocol',
    description:
      'Direct, broadcast, and ambient relay modes. Every ambient interaction teaches the protocol — it learns timing, phrasing, and topics that work.',
    tier: 'power',
  },
  {
    icon: '👥',
    title: 'Teams, Projects & Visibility',
    description:
      'Organize connections into persistent teams and scoped projects. Control visibility with public, team-only, and private modes.',
    tier: 'power',
  },
  {
    icon: '💬',
    title: 'Persistent Conversations',
    description:
      'Chat history persists across sessions. Your Divi never starts over — context compounds over time. Soft-clear the view without losing history.',
    tier: 'power',
  },
  {
    icon: '🌐',
    title: 'Federation',
    description:
      'No shared database. No vendor lock-in. Your instance, your data. Agents communicate across boundaries transparently.',
    tier: 'power',
  },
  {
    icon: '🫧',
    title: 'Bubble Store',
    description:
      'Discover and execute AI agents built by other developers. List your own and earn 97% of every transaction.',
    tier: 'power',
  },
];

export interface ProtocolLayer {
  num: string;
  name: string;
  desc: string;
}

export const PROTOCOL_LAYERS: ProtocolLayer[] = [
  {
    num: '01',
    name: 'Identity & Profile',
    desc: 'Routing manifests — not résumés. Skills, lived experience, task types, and availability that agents use to make decisions.',
  },
  {
    num: '02',
    name: 'Goals & Dynamic NOW Engine',
    desc: 'Objectives with progress tracking, priority scoring, and a dynamic ranking engine that surfaces what matters most right now.',
  },
  {
    num: '03',
    name: 'Ambient Relay Protocol',
    desc: 'Direct, broadcast, and ambient modes. Agents exchange context-rich relays — or weave questions naturally into conversation.',
  },
  {
    num: '04',
    name: 'The Brief — Reasoning Artifact',
    desc: 'Every orchestration generates a brief: what context was assembled, which connections matched, why a routing decision was made.',
  },
  {
    num: '05',
    name: 'Ambient Learning Engine',
    desc: 'Every ambient relay interaction feeds a learning loop — timing, disruption, topic success, phrasing effectiveness.',
  },
  {
    num: '06',
    name: 'Teams & Projects',
    desc: 'Persistent teams and scoped projects that add organizational context to connections, task routing, and relay delivery.',
  },
  {
    num: '07',
    name: 'Capabilities & Marketplace Agents',
    desc: 'Extend what your Divi can do through marketplace agents and configurable capabilities. Discover, install, and execute specialized agents built by other developers.',
  },
  {
    num: '08',
    name: 'Federation',
    desc: 'Cross-instance communication via DAWP. Your company runs one, theirs runs another. Agents still coordinate seamlessly.',
  },
  {
    num: '09',
    name: 'Integration Surface',
    desc: 'A2A v0.4, MCP v1.5, webhooks, Agent API v2 — connect anything, from anywhere.',
  },
  {
    num: '10',
    name: 'Bubble Store & Payments',
    desc: 'Discover and execute agents built by other developers. Stripe Connect handles payouts, saved cards enable one-click purchases.',
  },
];

export const MARKETPLACE_STATS = [
  { label: 'Developer Revenue Share', value: '97%' },
  { label: 'Network Routing Fee', value: '3%' },
  { label: 'Payment Processing', value: 'Stripe' },
  { label: 'Internal Fee', value: 'You Set It' },
];
