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
  project?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      role: string;
      userId: string | null;
      user: { id: string; name: string | null; email: string } | null;
      connection: { id: string; peerUserName: string | null; peerUserEmail: string | null } | null;
    }>;
  } | null;
  // v2: Delegation provenance
  originCardId?: string | null;
  originUserId?: string | null;
  originUserName?: string | null; // Resolved from the linked card
  sourceRelayId?: string | null;
  // Linked Kards: cross-user visibility
  linkedCards?: Array<{
    linkId: string;
    linkedCardId: string;
    linkedCardTitle: string;
    linkedCardStatus: string;
    linkedUserName: string | null;
    direction: 'outbound' | 'inbound';
    linkType: string;
    checklistProgress?: string;
  }>;
}

export interface ChecklistItemData {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  cardId: string;
  dueDate?: string | null;
  assigneeType?: string;
  assigneeName?: string | null;
  assigneeId?: string | null;
  delegationStatus?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
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
export type QueueItemStatus = 'pending_confirmation' | 'ready' | 'in_progress' | 'done_today' | 'blocked' | 'later';

export const QUEUE_SECTIONS: { id: QueueItemStatus; label: string; icon: string; color: string }[] = [
  { id: 'pending_confirmation', label: 'Pending Approval', icon: '🟡', color: '#facc15' },
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

export interface ContactPlatformUser {
  id: string;
  name: string | null;
  email: string;
  profile?: {
    headline: string | null;
    capacity: string | null;
    visibility: string | null;
  } | null;
}

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
  platformUserId?: string | null;
  platformUserStatus?: string | null;
  matchedAt?: string | null;
  platformUser?: ContactPlatformUser | null;
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

export type CenterTab = 'chat' | 'kanban' | 'crm' | 'recordings' | 'drive' | 'calendar' | 'inbox' | 'connections' | 'teams' | 'goals' | 'jobs' | 'marketplace' | 'federation' | 'discover' | 'earnings' | 'profile' | 'capabilities';

// ─── Calendar Types ──────────────────────────────────────────────────────────

export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  attendees: string | null;
  source: string;
  externalId: string | null;
  accountEmail: string | null;
  metadata: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Email Types ─────────────────────────────────────────────────────────────

export interface EmailMessageData {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  body: string | null;
  snippet: string | null;
  labels: string | null;
  isRead: boolean;
  isStarred: boolean;
  source: string;
  externalId: string | null;
  linkedCardId: string | null;
  linkedContactId: string | null;
  metadata: string | null;
  userId: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  linkedCard?: { id: string; title: string; status: string } | null;
  linkedContact?: { id: string; name: string; company: string | null } | null;
}

// ─── Comms Channel Types ─────────────────────────────────────────────────────

export type CommsSender = 'user' | 'divi' | 'system';
export type CommsState = 'new' | 'read' | 'acknowledged' | 'resolved' | 'dismissed';
export type CommsPriority = 'urgent' | 'normal' | 'low';

export interface CommsMessageData {
  id: string;
  sender: CommsSender;
  content: string;
  state: CommsState;
  priority: CommsPriority;
  linkedCardId: string | null;
  linkedContactId: string | null;
  linkedRecordingId: string | null;
  linkedDocumentId: string | null;
  metadata: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  linkedCard?: { id: string; title: string; status: string } | null;
  linkedContact?: { id: string; name: string; company: string | null } | null;
  linkedRecording?: { id: string; title: string } | null;
  linkedDocument?: { id: string; title: string; type: string } | null;
}

export const COMMS_STATES: { id: CommsState; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: '#4f7cff' },
  { id: 'read', label: 'Read', color: '#94a3b8' },
  { id: 'acknowledged', label: 'Acknowledged', color: '#fbbf24' },
  { id: 'resolved', label: 'Resolved', color: '#34d399' },
  { id: 'dismissed', label: 'Dismissed', color: '#6b7280' },
];

// ─── Connection Types ────────────────────────────────────────────────────────

export type ConnectionStatus = 'pending' | 'active' | 'blocked' | 'declined';
export type TrustLevel = 'full_auto' | 'supervised' | 'restricted';
export type ConnectionScope = 'request_files' | 'assign_tasks' | 'read_status' | 'schedule' | 'share_updates' | 'request_approval';

export interface ConnectionPermissions {
  trustLevel: TrustLevel;
  scopes: ConnectionScope[];
}

export interface ConnectionData {
  id: string;
  requesterId: string;
  accepterId: string | null;
  status: ConnectionStatus;
  permissions: string; // JSON ConnectionPermissions
  nickname: string | null;
  peerNickname: string | null;
  isFederated: boolean;
  peerInstanceUrl: string | null;
  peerUserId: string | null;
  peerUserName: string | null;
  peerUserEmail: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string | null; email: string };
  accepter?: { id: string; name: string | null; email: string } | null;
  _count?: { relays: number };
}

export const TRUST_LEVELS: { id: TrustLevel; label: string; description: string; icon: string }[] = [
  { id: 'full_auto', label: 'Full Auto', description: "Their Divi can fulfill requests without your approval", icon: '⚡' },
  { id: 'supervised', label: 'Supervised', description: "Divi queues requests for your review before acting", icon: '👁️' },
  { id: 'restricted', label: 'Restricted', description: "You only receive notifications — no auto-actions", icon: '🔒' },
];

export const CONNECTION_SCOPES: { id: ConnectionScope; label: string; icon: string }[] = [
  { id: 'request_files', label: 'Request Files', icon: '📁' },
  { id: 'assign_tasks', label: 'Assign Tasks', icon: '✅' },
  { id: 'read_status', label: 'Read Project Status', icon: '📊' },
  { id: 'schedule', label: 'Schedule Meetings', icon: '📅' },
  { id: 'share_updates', label: 'Share Updates', icon: '📢' },
  { id: 'request_approval', label: 'Request Approval', icon: '🤝' },
];

// ─── Agent Relay Types ──────────────────────────────────────────────────────

export type RelayType = 'request' | 'response' | 'notification' | 'update';
export type RelayIntent = 'get_info' | 'assign_task' | 'request_approval' | 'share_update' | 'schedule' | 'introduce' | 'custom';
export type RelayStatus = 'pending' | 'delivered' | 'agent_handling' | 'user_review' | 'completed' | 'declined' | 'expired';
export type RelayDirection = 'outbound' | 'inbound';

export interface AgentRelayData {
  id: string;
  connectionId: string;
  fromUserId: string;
  toUserId: string | null;
  direction: RelayDirection;
  type: RelayType;
  intent: RelayIntent;
  subject: string;
  payload: string | null;
  status: RelayStatus;
  priority: CommsPriority;
  dueDate: string | null;
  resolvedAt: string | null;
  responsePayload: string | null;
  parentRelayId: string | null;
  peerRelayId: string | null;
  peerInstanceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  connection?: ConnectionData;
  fromUser?: { id: string; name: string | null; email: string };
  toUser?: { id: string; name: string | null; email: string } | null;
}

export const RELAY_STATUSES: { id: RelayStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: '#94a3b8' },
  { id: 'delivered', label: 'Delivered', color: '#60a5fa' },
  { id: 'agent_handling', label: 'Agent Handling', color: '#fbbf24' },
  { id: 'user_review', label: 'Needs Review', color: '#f59e0b' },
  { id: 'completed', label: 'Completed', color: '#34d399' },
  { id: 'declined', label: 'Declined', color: '#f87171' },
  { id: 'expired', label: 'Expired', color: '#6b7280' },
];

export const RELAY_INTENTS: { id: RelayIntent; label: string; icon: string }[] = [
  { id: 'get_info', label: 'Get Info', icon: '🔍' },
  { id: 'assign_task', label: 'Assign Task', icon: '📋' },
  { id: 'request_approval', label: 'Request Approval', icon: '✅' },
  { id: 'share_update', label: 'Share Update', icon: '📢' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'introduce', label: 'Introduce', icon: '🤝' },
  { id: 'custom', label: 'Custom', icon: '💬' },
];

// ─── Federation Types ───────────────────────────────────────────────────────

export type FederationMode = 'open' | 'closed' | 'allowlist';

export interface FederationConfigData {
  id: string;
  instanceName: string;
  instanceUrl: string | null;
  federationMode: FederationMode;
  allowInbound: boolean;
  allowOutbound: boolean;
  requireApproval: boolean;
}

// ─── Profile Types ──────────────────────────────────────────────────────────

export type CapacityStatus = 'available' | 'busy' | 'limited' | 'unavailable';
export type ProfileVisibility = 'public' | 'connections' | 'private';
export type ProfileSection = 'professional' | 'lived_experience' | 'availability' | 'values' | 'superpowers';

export interface UserProfileData {
  id: string;
  userId: string;
  // Professional
  headline: string | null;
  bio: string | null;
  skills: string[];
  experience: Array<{ title: string; company: string; startYear: number; endYear?: number; description?: string }>;
  education: Array<{ institution: string; degree: string; field?: string; year?: number }>;
  certifications: string[];
  linkedinUrl: string | null;
  // Lived Experience
  languages: Array<{ language: string; proficiency: 'native' | 'fluent' | 'conversational' | 'basic' }>;
  countriesLived: Array<{ country: string; years?: number; context?: string }>;
  lifeMilestones: Array<{ milestone: string; year?: number; insight?: string }>;
  volunteering: Array<{ org: string; role?: string; cause?: string }>;
  hobbies: string[];
  personalValues: string[];
  superpowers: string[];
  taskTypes: string[];
  // Availability
  capacityStatus: CapacityStatus;
  capacityNote: string | null;
  timezone: string | null;
  workingHours: string | null;
  outOfOffice: Array<{ start: string; end: string; reason?: string }>;
  // Job Preferences
  minCompensationType: string | null;
  minCompensationAmount: number | null;
  minCompensationCurrency: string;
  acceptVolunteerWork: boolean;
  acceptProjectInvites: boolean;
  // Privacy
  visibility: ProfileVisibility;
  sharedSections: ProfileSection[];
  // Meta
  linkedinData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export const CAPACITY_STATUSES: Array<{ id: CapacityStatus; label: string; icon: string; color: string }> = [
  { id: 'available', label: 'Available', icon: '🟢', color: 'text-green-400' },
  { id: 'limited', label: 'Limited', icon: '🟡', color: 'text-yellow-400' },
  { id: 'busy', label: 'Busy', icon: '🟠', color: 'text-orange-400' },
  { id: 'unavailable', label: 'Unavailable', icon: '🔴', color: 'text-red-400' },
];

export const TASK_TYPES: Array<{ id: string; label: string; icon: string; description: string }> = [
  { id: 'research', label: 'Research', icon: '🔍', description: 'Finding information, market analysis, due diligence' },
  { id: 'review', label: 'Review & Feedback', icon: '📝', description: 'Reviewing documents, code, proposals, designs' },
  { id: 'introductions', label: 'Introductions', icon: '🤝', description: 'Connecting people, making warm intros' },
  { id: 'technical', label: 'Technical', icon: '⚙️', description: 'Engineering, debugging, architecture, data analysis' },
  { id: 'creative', label: 'Creative', icon: '🎨', description: 'Design, writing, branding, content creation' },
  { id: 'strategy', label: 'Strategy', icon: '♟️', description: 'Planning, decision-making, roadmapping' },
  { id: 'operations', label: 'Operations', icon: '📋', description: 'Logistics, scheduling, coordination, project management' },
  { id: 'mentoring', label: 'Mentoring', icon: '🌱', description: 'Coaching, teaching, career guidance' },
  { id: 'sales', label: 'Sales & BD', icon: '💼', description: 'Business development, pitching, partnerships' },
  { id: 'legal', label: 'Legal & Compliance', icon: '⚖️', description: 'Contracts, regulatory, compliance advice' },
  { id: 'finance', label: 'Finance', icon: '📊', description: 'Budgeting, forecasting, financial analysis' },
  { id: 'hr', label: 'People & Culture', icon: '👥', description: 'Hiring, team building, conflict resolution' },
  { id: 'translation', label: 'Translation', icon: '🌐', description: 'Language translation, localization, cultural adaptation' },
  { id: 'custom', label: 'Other', icon: '✨', description: 'Custom task types not listed above' },
];

export const PROFILE_SECTIONS: Array<{ id: ProfileSection; label: string; icon: string }> = [
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'lived_experience', label: 'Lived Experience', icon: '🌍' },
  { id: 'availability', label: 'Availability', icon: '📅' },
  { id: 'values', label: 'Values & Principles', icon: '💎' },
  { id: 'superpowers', label: 'Superpowers', icon: '⚡' },
];

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