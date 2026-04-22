/* ── Marketplace constants ─────────────────────────────────────
 * Categories, pricing filters/badges, and category color classes.
 * Extracted in v2.4.7 Phase 3.2 cleanup sprint.
 * ──────────────────────────────────────────────────────────── */

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'coding', label: 'Coding', icon: '💻' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'operations', label: 'Ops', icon: '⚙️' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'general', label: 'General', icon: '🤖' },
];

export const PRICING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'per_task', label: 'Per Task' },
  { id: 'subscription', label: 'Subscription' },
];

export const PRICING_BADGES: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  per_task: { label: 'Per Task', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  subscription: { label: 'Subscription', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  tiered: { label: 'Tiered', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  dynamic: { label: 'Dynamic', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
};

export const CATEGORY_COLORS: Record<string, string> = {
  research: 'text-blue-400',
  coding: 'text-green-400',
  writing: 'text-purple-400',
  analysis: 'text-amber-400',
  operations: 'text-red-400',
  creative: 'text-pink-400',
  general: 'text-zinc-400',
};

export const EMPTY_REGISTER_FORM = {
  name: '',
  description: '',
  longDescription: '',
  endpointUrl: '',
  authMethod: 'bearer',
  authToken: '',
  authHeader: '',
  developerName: '',
  developerUrl: '',
  category: 'general',
  tags: '',
  inputFormat: 'text',
  outputFormat: 'text',
  samplePrompts: '',
  pricingModel: 'free',
  pricePerTask: '',
  subscriptionPrice: '',
  taskLimit: '',
  accessPassword: '',
  supportsA2A: false,
  supportsMCP: false,
  agentCardUrl: '',
  taskTypes: '',
  contextInstructions: '',
  requiredInputSchema: '',
  outputSchema: '',
  usageExamples: '',
  contextPreparation: '',
  executionNotes: '',
  installGuide: '',
  commands: '',
};
