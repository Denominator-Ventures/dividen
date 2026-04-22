// Shared types for the ChatView component tree.
// Extracted from ChatView.tsx during Phase 3.1.

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: any;
}

export interface TagResult {
  tag: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface MentionResult {
  id: string;
  type: 'person' | 'agent' | 'team';
  name: string;
  username?: string | null;
  avatar?: string | null;
  subtitle?: string;
  description?: string;
  diviName?: string;
  memberCount?: number;
}

export interface CommandResult {
  id: string;
  type: 'command';
  name: string;
  fullCommand: string;
  source: string;
  sourceSlug: string;
  sourceType: 'agent' | 'capability';
  description: string;
  usage: string;
}

export interface MktSuggestion {
  type: 'agent' | 'capability';
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  pricingModel: string;
  price?: number | null;
  installed?: boolean;
  relevanceScore: number;
}
