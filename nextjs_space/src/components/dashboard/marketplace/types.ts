/* ── Marketplace types ─────────────────────────────────────────
 * Shared types used by MarketplaceView and its sub-views.
 * Extracted in v2.4.7 Phase 3.2 cleanup sprint.
 * ──────────────────────────────────────────────────────────── */

export interface MarketplaceAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category: string;
  tags?: string;
  pricingModel: string;
  pricePerTask?: number | null;
  subscriptionPrice?: number | null;
  taskLimit?: number | null;
  status: string;
  featured: boolean;
  totalExecutions: number;
  avgRating: number;
  totalRatings: number;
  avgResponseTime?: number | null;
  successRate?: number | null;
  developerName: string;
  developerUrl?: string | null;
  supportsA2A: boolean;
  supportsMCP: boolean;
  inputFormat: string;
  outputFormat: string;
  createdAt: string;
  _count?: { subscriptions: number };
  // Detail fields
  isOwner?: boolean;
  subscription?: any;
  recentExecutions?: Execution[];
  endpointUrl?: string;
  authMethod?: string;
  samplePrompts?: string;
  pricingDetails?: string;
  // Agent Integration Kit
  taskTypes?: string | null;
  contextInstructions?: string | null;
  requiredInputSchema?: string | null;
  outputSchema?: string | null;
  usageExamples?: string | null;
  contextPreparation?: string | null;
  executionNotes?: string | null;
  installGuide?: string | null;
  commands?: string | null;
  developerId?: string;
  version?: string;
  changelog?: string | null;
  // Access password
  accessPassword?: string | null; // only exposed to owner
  hasAccessPassword?: boolean;
}

export interface Execution {
  id: string;
  taskInput: string;
  taskOutput?: string | null;
  status: string;
  responseTimeMs?: number | null;
  rating?: number | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface FeeInfo {
  feePercent: number;
  networkFeePercent: number;
  developerPercent: number;
  networkDeveloperPercent: number;
  isSelfHosted: boolean;
  label: string;
  networkLabel: string;
}

export interface EarningsData {
  hasListings: boolean;
  hasPaidListings?: boolean;
  feeInfo?: FeeInfo;
  stripeConnect?: {
    hasAccount: boolean;
    onboarded: boolean;
  };
  totals?: {
    totalAgents: number;
    paidAgents: number;
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    activeSubscriptions: number;
    uniqueUsers: number;
    grossRevenue: number;
    platformFees: number;
    developerPayout: number;
    pendingPayout: number;
    subscriptionMRR: number;
    estimatedRevenue: number;
  };
  agents?: any[];
  recentExecutions?: any[];
}

export type ViewMode = 'browse' | 'detail' | 'register' | 'my_agents' | 'earnings' | 'capabilities';
export type EarningsTab = 'agent' | 'job';

export interface JobEarningsTotals {
  totalContracts: number;
  activeContracts: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  totalFees: number;
  totalSpent: number;
}

export interface JobEarningsData {
  asWorker: { contracts: any[]; totals: JobEarningsTotals };
  asClient: { contracts: any[]; totals: JobEarningsTotals };
}

export interface MarketplaceViewProps {
  prefillAgent?: {
    name?: string;
    description?: string;
    endpointUrl?: string;
    category?: string;
  };
  onPrefillConsumed?: () => void;
  initialView?: ViewMode;
  onStartGuidedChat?: (message: string) => void;
}

/* ── Registration form state shape ────────────────────────── */

export interface RegisterFormState {
  name: string;
  description: string;
  longDescription: string;
  endpointUrl: string;
  authMethod: string;
  authToken: string;
  authHeader: string;
  developerName: string;
  developerUrl: string;
  category: string;
  tags: string;
  inputFormat: string;
  outputFormat: string;
  samplePrompts: string;
  pricingModel: string;
  pricePerTask: string;
  subscriptionPrice: string;
  taskLimit: string;
  accessPassword: string;
  supportsA2A: boolean;
  supportsMCP: boolean;
  agentCardUrl: string;
  // Agent Integration Kit
  taskTypes: string;
  contextInstructions: string;
  requiredInputSchema: string;
  outputSchema: string;
  usageExamples: string;
  contextPreparation: string;
  executionNotes: string;
  installGuide: string;
  commands: string;
}
