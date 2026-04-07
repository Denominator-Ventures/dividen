// ─── Mode Types ─────────────────────────────────────────────────────────────

export type DividenMode = 'cockpit' | 'chief_of_staff';

// ─── Kanban Types ───────────────────────────────────────────────────────────

export type CardStatus = 'leads' | 'qualifying' | 'proposal' | 'negotiation' | 'contracted' | 'active' | 'development' | 'planning' | 'paused' | 'completed';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CardAssignee = 'human' | 'agent';

export const KANBAN_COLUMNS: { id: CardStatus; label: string; color: string }[] = [
  { id: 'leads', label: 'Leads', color: '#94a3b8' },
  { id: 'qualifying', label: 'Qualifying', color: '#60a5fa' },
  { id: 'proposal', label: 'Proposal', color: '#a78bfa' },
  { id: 'negotiation', label: 'Negotiation', color: '#fbbf24' },
  { id: 'contracted', label: 'Contracted', color: '#f59e0b' },
  { id: 'active', label: 'Active', color: '#34d399' },
  { id: 'development', label: 'Development', color: '#2dd4bf' },
  { id: 'planning', label: 'Planning', color: '#818cf8' },
  { id: 'paused', label: 'Paused', color: '#6b7280' },
  { id: 'completed', label: 'Completed', color: '#a78bfa' },
];

export interface KanbanCardData {
  id: string;
  title: string;
  description: string | null;
  status: CardStatus;
  priority: CardPriority;
  assignee: CardAssignee;
  dueDate: string | null;
  order: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistItemData[];
  contacts: CardContactData[];
}

export interface ChecklistItemData {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  cardId: string;
}

export interface CardContactData {
  id: string;
  cardId: string;
  contactId: string;
  role: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  };
}

// ─── Queue Types ────────────────────────────────────────────────────────────

export type QueueItemType = 'task' | 'notification' | 'reminder' | 'agent_suggestion';
export type QueueItemStatus = 'ready' | 'in_progress' | 'done_today' | 'blocked' | 'later';

export const QUEUE_SECTIONS: { id: QueueItemStatus; label: string; icon: string; color: string }[] = [
  { id: 'ready', label: 'Ready', icon: '🟢', color: '#34d399' },
  { id: 'in_progress', label: 'In Progress', icon: '🔵', color: '#60a5fa' },
  { id: 'done_today', label: 'Done Today', icon: '✅', color: '#a78bfa' },
  { id: 'blocked', label: 'Blocked', icon: '🔴', color: '#f87171' },
  { id: 'later', label: 'Later', icon: '⏳', color: '#94a3b8' },
];

export interface QueueItemData {
  id: string;
  type: QueueItemType;
  title: string;
  description: string | null;
  priority: CardPriority;
  status: QueueItemStatus;
  source: string | null;
  userId: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat Types ─────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

// ─── Agent Types ────────────────────────────────────────────────────────────

export type AgentProvider = 'openai' | 'anthropic';
export type AgentMessageType = 'status_update' | 'suggestion' | 'alert' | 'completion';

// ─── Contact / CRM Types ────────────────────────────────────────────────────

export interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  tags: string | null;
  source: string | null;
  enrichedData: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  cards?: CardContactData[];
}

export type ContactSource = 'manual' | 'chat' | 'enriched';

// ─── Memory Types ───────────────────────────────────────────────────────────

export type MemoryTier = 1 | 2 | 3;

// Tier 1: Explicit Facts
export type Tier1Category = 'general' | 'project' | 'contact';

// Tier 2: Behavioral Rules
export type Tier2Category = 'communication' | 'workflow' | 'preferences';
export type RulePriority = 'critical' | 'high' | 'medium' | 'low';

// Tier 3: Learned Patterns
export type Tier3Category = 'style' | 'preference' | 'workflow' | 'communication';

export type MemoryCategory = Tier1Category | Tier2Category | Tier3Category;
export type LearningCategory = 'style' | 'preference' | 'workflow' | 'communication';

export interface MemoryItemData {
  id: string;
  tier: MemoryTier;
  category: string;
  key: string;
  value: string;
  scope: string | null;
  pinned: boolean;
  priority: string | null;
  confidence: number | null;
  approved: boolean | null;
  source: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const MEMORY_TIERS: { id: MemoryTier; label: string; description: string; icon: string }[] = [
  { id: 1, label: 'Explicit Facts', description: 'Facts and context you or the AI have saved', icon: '📌' },
  { id: 2, label: 'Behavioral Rules', description: 'Directives that govern AI behavior', icon: '📏' },
  { id: 3, label: 'Learned Patterns', description: 'AI observations about your preferences', icon: '🧠' },
];

export const TIER1_CATEGORIES: Tier1Category[] = ['general', 'project', 'contact'];
export const TIER2_CATEGORIES: Tier2Category[] = ['communication', 'workflow', 'preferences'];
export const TIER3_CATEGORIES: Tier3Category[] = ['style', 'preference', 'workflow', 'communication'];
export const RULE_PRIORITIES: RulePriority[] = ['critical', 'high', 'medium', 'low'];

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Dashboard Tab Types ────────────────────────────────────────────────────

export type CenterTab = 'chat' | 'kanban' | 'crm' | 'recordings' | 'drive';

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface SetupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// ─── Settings Types ─────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── External Agent API Key Types ────────────────────────────────────────

export type ApiPermission = 'queue' | 'chat' | 'kanban' | 'contacts';

export interface ExternalApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string; // 'all' or JSON array of ApiPermission
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}