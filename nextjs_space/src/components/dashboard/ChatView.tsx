'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AgentWidgetContainer, parseWidgetPayload } from './AgentWidget';
import type { WidgetItem, WidgetItemAction, AgentWidgetData } from './AgentWidget';
import { emitSignal } from '@/lib/behavior-signals';
import { OnboardingChatWidgets } from './OnboardingChatWidgets';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: any;
}

interface TagResult {
  tag: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface MentionResult {
  id: string;
  type: 'person' | 'agent';
  name: string;
  username?: string | null;
  avatar?: string | null;
  subtitle?: string;
  description?: string;
  diviName?: string;
}

interface CommandResult {
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

interface ChatViewProps {
  prefill?: string | null;
  onPrefillConsumed?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatView({ prefill, onPrefillConsumed }: ChatViewProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tagResults, setTagResults] = useState<TagResult[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [diviName, setDiviName] = useState('Divi');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Inline @mention and !command search ───────────────────────────────
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([]);
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [inlineMode, setInlineMode] = useState<'@' | '!' | null>(null);
  const [inlineQuery, setInlineQuery] = useState('');
  const [inlineTriggerIdx, setInlineTriggerIdx] = useState(-1); // cursor position of trigger char
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mentionFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch user info (photo, API key status, divi name) ──────────────
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const u = data.data?.user;
          if (u?.profilePhotoUrl) setUserPhoto(u.profilePhotoUrl);
          if (u?.name) setUserName(u.name);
          if (u?.diviName) setDiviName(u.diviName);
          const keys = data.data?.apiKeys || [];
          setHasApiKey(keys.some((k: any) => k.isActive));
        }
      })
      .catch(() => {});
  }, []);

  // ── Scroll to bottom ──────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ── Handle prefill from NOW panel click ──────────────────────────────
  useEffect(() => {
    if (prefill) {
      setInput(prefill);
      onPrefillConsumed?.();
      // Focus the input after setting prefill
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefill, onPrefillConsumed]);

  // ── Inline search: detect @ and ! triggers on input change ──────────
  const handleInputChange = useCallback((val: string) => {
    setInput(val);

    // Get cursor position from input ref
    const cursor = inputRef.current?.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);

    // Look for " @" or "^@" (start of input)
    const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    // Look for " !" or "^!"
    const bangMatch = textBeforeCursor.match(/(?:^|\s)!(\S*)$/);

    if (atMatch) {
      const query = atMatch[1];
      const triggerPos = textBeforeCursor.lastIndexOf('@');
      setInlineMode('@');
      setInlineQuery(query);
      setInlineTriggerIdx(triggerPos);
      setSelectedIdx(0);
      // Debounced fetch
      if (mentionFetchRef.current) clearTimeout(mentionFetchRef.current);
      mentionFetchRef.current = setTimeout(async () => {
        try {
          // Fetch people and agents in parallel
          const [pRes, aRes] = await Promise.all([
            fetch(`/api/chat/mentions?type=people&q=${encodeURIComponent(query)}`),
            fetch(`/api/chat/mentions?type=agents&q=${encodeURIComponent(query)}`),
          ]);
          const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);
          const combined: MentionResult[] = [
            ...(pData.success ? pData.data : []),
            ...(aData.success ? aData.data : []),
          ];
          setMentionResults(combined.slice(0, 8));
        } catch { setMentionResults([]); }
      }, 150);
    } else if (bangMatch) {
      const query = bangMatch[1];
      const triggerPos = textBeforeCursor.lastIndexOf('!');
      setInlineMode('!');
      setInlineQuery(query);
      setInlineTriggerIdx(triggerPos);
      setSelectedIdx(0);
      if (mentionFetchRef.current) clearTimeout(mentionFetchRef.current);
      mentionFetchRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/chat/mentions?type=commands&q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setCommandResults(data.success ? data.data.slice(0, 8) : []);
        } catch { setCommandResults([]); }
      }, 150);
    } else {
      // Clear inline search
      if (inlineMode) {
        setInlineMode(null);
        setMentionResults([]);
        setCommandResults([]);
      }
    }
  }, [inlineMode]);

  const inlineItems = useMemo(() => {
    if (inlineMode === '@') return mentionResults;
    if (inlineMode === '!') return commandResults;
    return [];
  }, [inlineMode, mentionResults, commandResults]);

  const selectInlineItem = useCallback((item: MentionResult | CommandResult) => {
    const val = input;
    const triggerIdx = inlineTriggerIdx;
    const cursor = inputRef.current?.selectionStart ?? val.length;
    let replacement: string;

    if (item.type === 'command') {
      replacement = (item as CommandResult).fullCommand + ' ';
    } else {
      // Person or agent — use @username or @slug
      const handle = (item as MentionResult).username || (item as MentionResult).name;
      replacement = `@${handle} `;
    }

    // Replace from trigger char to current cursor position
    const before = val.slice(0, triggerIdx);
    const after = val.slice(cursor);
    const newVal = before + replacement + after;
    setInput(newVal);
    setInlineMode(null);
    setMentionResults([]);
    setCommandResults([]);

    // Restore cursor position
    const newCursorPos = before.length + replacement.length;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [input, inlineTriggerIdx]);

  // ── Fetch chat history ────────────────────────────────────────────────
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch('/api/chat/messages?limit=50');
        const data = await res.json();
        if (data.success && data.data?.messages) {
          setMessages(data.data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMessages();
  }, []);

  // ── Send message with SSE streaming ───────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || isStreaming) return;

      setInput('');
      setError(null);
      setTagResults([]);

      // Optimistic add user message
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent('');
      emitSignal('chat_send', { contentLength: content.length });

      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        if (!res.body) {
          throw new Error('No response body');
        }

        // Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullCleanContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case 'token':
                  setStreamingContent((prev) => prev + event.content);
                  break;

                case 'tags_executed':
                  if (event.results) {
                    setTagResults(event.results);
                  }
                  break;

                case 'done':
                  fullCleanContent = event.content;
                  // Capture widget metadata if present (e.g., show_settings_widget)
                  if (event.metadata) {
                    (window as any).__lastMsgMeta = event.metadata;
                  }
                  break;

                case 'error':
                  throw new Error(event.content);
              }
            } catch (e: any) {
              if (e.message && !e.message.includes('JSON')) {
                throw e;
              }
              // Ignore JSON parse errors for partial data
            }
          }
        }

        // Add assistant message to history (include widget metadata if any)
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullCleanContent || stripTagsClient(streamingContent),
          createdAt: new Date().toISOString(),
          metadata: (window as any).__lastMsgMeta || undefined,
        };
        delete (window as any).__lastMsgMeta;
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error('Chat error:', err);
        setError(err.message || 'Failed to send message');
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        inputRef.current?.focus();
      }
    },
    [input, isStreaming]
  );

  // ── Clear chat ────────────────────────────────────────────────────────
  const clearChat = async () => {
    try {
      await fetch('/api/chat/messages', { method: 'DELETE' });
      setMessages([]);
      setError(null);
      setTagResults([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // ── Onboarding phase action handler ─────────────────────────────────
  const handleOnboardingAction = useCallback(async (
    action: 'submit' | 'skip' | 'google_connect',
    phase: number,
    data?: any
  ) => {
    if (action === 'google_connect') {
      // Redirect to Google OAuth with onboarding return context
      const identity = data?.identity || 'operator';
      const accountIndex = data?.accountIndex ?? 0;
      window.location.href = `/api/auth/google-connect?identity=${identity}&accountIndex=${accountIndex}&returnTo=onboarding`;
      return;
    }

    try {
      // Phase -1 = settings adjustment (not onboarding) — save settings via show_settings endpoint
      if (phase === -1) {
        await fetch('/api/onboarding/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'show_settings', settings: data }),
        });
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: `msg-confirm-${Date.now()}`,
          role: 'assistant',
          content: '✅ Settings updated! Your changes are active now.',
          createdAt: new Date().toISOString(),
        }]);
        return;
      }

      // Regular onboarding — advance to next phase
      const res = await fetch('/api/onboarding/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'skip' ? 'skip' : 'advance',
          settings: data,
        }),
      });
      const result = await res.json();
      if (result.success && result.data?.message) {
        // Reload messages to show the new phase message
        const msgRes = await fetch('/api/chat/messages?limit=50');
        const msgData = await msgRes.json();
        if (msgData.success && msgData.data?.messages) {
          setMessages(msgData.data.messages);
        }
      }
    } catch (err) {
      console.error('Onboarding action failed:', err);
    }
  }, []);

  // ── Quick actions (no API key) ───────────────────────────────────────
  const quickActions = [
    { label: '📊 What\'s my status?', message: 'Give me a status update on all my tasks and projects.' },
    { label: '➕ Create a task', message: 'Help me create a new task.' },
    { label: '📋 Show my board', message: 'Show me my current Kanban board state.' },
  ];

  // ── Engagement actions (has API key, cleared chat) ─────────────────
  const engagementActions = [
    { label: '☀️ Catch me up', message: 'Catch me up on everything — what happened since we last talked, what\'s urgent, what needs my attention.' },
    { label: '🧠 Let\'s strategize', message: 'I want to think through something strategic. Help me work through my priorities and what to focus on next.' },
    { label: '⚡ Quick task', message: 'I have something quick I need done. Let me tell you what it is.' },
  ];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Chat with {diviName}
          </span>
          {isStreaming && (
            <span className="text-xs text-[var(--brand-primary)] animate-pulse">
              ● Thinking...
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[var(--text-muted)] animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4 opacity-20">⬡</div>
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              {hasApiKey ? `What can ${diviName} help with?` : 'DiviDen Command Center'}
            </h3>
            {!hasApiKey && hasApiKey !== null ? (
              <>
                <p className="text-sm text-[var(--text-muted)] max-w-md mb-3">
                  Chat with {diviName}, your AI agent. Ask questions, delegate tasks, or get
                  status updates on your projects.
                </p>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg px-4 py-3 max-w-md mb-5">
                  <p className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-brand-400">Bring your own AI.</span>{' '}
                    Add your OpenAI or Anthropic API key in{' '}
                    <a href="/settings" className="text-brand-400 hover:text-brand-300 underline">
                      Settings
                    </a>{' '}
                    to enable the chat agent. Nothing runs on our dime — you control your own AI.
                  </p>
                </div>
              </>
            ) : hasApiKey ? (
              <p className="text-sm text-[var(--text-muted)] max-w-md mb-5">
                Start a conversation or pick one of these to get going.
              </p>
            ) : null}
            <div className="flex gap-2 flex-wrap justify-center">
              {(hasApiKey ? engagementActions : quickActions).map((action) => (
                <button
                  key={action.label}
                  className="btn-secondary text-sm"
                  onClick={() => sendMessage(action.message)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} userPhoto={userPhoto} userName={userName} diviName={diviName} onAddMessage={(m: ChatMessage) => setMessages(prev => [...prev, m])} onOnboardingAction={handleOnboardingAction} />
            ))}

            {/* Streaming response */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(diviName || 'D')[0].toUpperCase()}
                </div>
                <div className="flex-1 bg-[var(--bg-surface)] rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {stripTagsClient(streamingContent)}
                    <span className="animate-pulse">▌</span>
                  </p>
                </div>
              </div>
            )}

            {/* Streaming placeholder when no content yet */}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(diviName || 'D')[0].toUpperCase()}
                </div>
                <div className="flex-1 bg-[var(--bg-surface)] rounded-lg p-3 max-w-[80%]">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Tag execution results */}
            {tagResults.length > 0 && (
              <div className="mx-11 space-y-2">
                {/* Standard action results */}
                {tagResults.some(r => !r.data?.gated && !r.data?.suggestions) && (
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">
                      ⚡ Actions executed:
                    </p>
                    {tagResults.filter(r => !r.data?.gated && !r.data?.suggestions).map((r, i) => (
                      <div key={i} className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <span>{r.success ? '✅' : '❌'}</span>
                        <span>{r.tag.replace('_', ' ')}</span>
                        {r.data?.title && (
                          <span className="text-[var(--text-secondary)]">
                            — {r.data.title}
                          </span>
                        )}
                        {r.error && (
                          <span className="text-red-400">— {r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Marketplace Suggestion Cards (from gated queue or suggest_marketplace) */}
                {tagResults.filter(r => r.data?.suggestions?.length > 0).map((r, idx) => (
                  <MarketplaceSuggestionCard
                    key={`mkt-${idx}`}
                    suggestions={r.data.suggestions}
                    message={r.data.message || 'Here are some marketplace options:'}
                    gated={!!r.data.gated}
                    onInstall={async (type: string, id: string) => {
                      try {
                        if (type === 'capability') {
                          await fetch('/api/marketplace-capabilities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ capabilityId: id }),
                          });
                        } else {
                          await fetch(`/api/marketplace/${id}/subscribe`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                        }
                        // Trigger a chat message to confirm
                        setInput(`I just installed a ${type} from the marketplace. Let me know what's next.`);
                      } catch (e) {
                        console.error('Install failed:', e);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <p className="font-medium">⚠ Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-[var(--border-color)] p-3 md:p-4">
        {/* Inline search popup — renders above the input */}
        {inlineMode && inlineItems.length > 0 && (
          <div className="mb-2 bg-[#141419] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                {inlineMode === '@' ? '👥 People & Agents' : '⚡ Commands'}
              </span>
            </div>
            {inlineItems.map((item, idx) => (
              <button
                key={item.id}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  idx === selectedIdx
                    ? 'bg-brand-500/15 text-white'
                    : 'text-white/70 hover:bg-white/5'
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  selectInlineItem(item);
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                {inlineMode === '@' ? (
                  <>
                    <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
                      {(item as MentionResult).avatar ? (
                        <img src={(item as MentionResult).avatar!} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (item as MentionResult).type === 'agent' ? '🤖' : (
                        ((item as MentionResult).name || '?')[0]?.toUpperCase()
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{(item as MentionResult).name}</div>
                      <div className="text-[10px] text-white/40 truncate">{(item as MentionResult).subtitle}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 flex-shrink-0">
                      {(item as MentionResult).type === 'agent' ? 'Agent' : 'Person'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base flex-shrink-0">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium font-mono truncate text-brand-400">{(item as CommandResult).fullCommand}</div>
                      <div className="text-[10px] text-white/40 truncate">{(item as CommandResult).description}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 flex-shrink-0">
                      {(item as CommandResult).source}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={isStreaming ? `${diviName} is thinking...` : `Message ${diviName}... (@ to mention, ! for commands)`}
            className="input-field flex-1 text-sm md:text-base"
            disabled={isStreaming}
            onKeyDown={(e) => {
              // Inline search keyboard navigation
              if (inlineMode && inlineItems.length > 0) {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIdx((p) => (p > 0 ? p - 1 : inlineItems.length - 1));
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIdx((p) => (p < inlineItems.length - 1 ? p + 1 : 0));
                  return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  selectInlineItem(inlineItems[selectedIdx]);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setInlineMode(null);
                  setMentionResults([]);
                  setCommandResults([]);
                  return;
                }
              }
              // Normal send
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className={cn(
              'btn-primary px-3 md:px-6 transition-opacity',
              (isStreaming || !input.trim()) && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => sendMessage()}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ────────────────────────────────────────────────

function MessageBubble({ message, userPhoto, userName, diviName, onAddMessage, onOnboardingAction }: { message: ChatMessage; userPhoto?: string | null; userName?: string | null; diviName?: string; onAddMessage?: (msg: ChatMessage) => void; onOnboardingAction?: (action: 'submit' | 'skip' | 'google_connect', phase: number, data?: any) => void }) {
  const isUser = message.role === 'user';
  const isSystemHidden = message.role === 'user' && message.content?.startsWith('[SYSTEM:');
  const initials = isUser
    ? (userName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (diviName || 'D')[0].toUpperCase();

  // Parse onboarding metadata
  const onboardingMeta = (() => {
    if (!message.metadata) return null;
    const meta = typeof message.metadata === 'string' ? (() => { try { return JSON.parse(message.metadata as string); } catch { return null; } })() : message.metadata;
    if (meta?.isOnboarding && meta?.widgets) return meta;
    return null;
  })();

  // Hide system-triggered messages
  if (isSystemHidden) return null;

  return (
    <div className={cn('flex gap-3 items-start', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar — Divi on left */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--brand-primary)] text-white">
          {initials}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'rounded-xl px-4 py-3 max-w-[80%]',
          isUser
            ? 'bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/20'
            : 'bg-[var(--bg-surface)] border border-[var(--border-color)]'
        )}
      >
        <div className="text-sm text-[var(--text-primary)] leading-relaxed">
          {renderMarkdownLite(message.content)}
        </div>
        {/* Agent Widget rendering */}
        {(() => {
          const widgetPayload = parseWidgetPayload(message.metadata);
          if (!widgetPayload) return null;
          return (
            <AgentWidgetContainer
              payload={widgetPayload}
              onAction={async (item: WidgetItem, action: WidgetItemAction, widget: AgentWidgetData) => {
                console.log('[AgentWidget] Action:', { item: item.id, action: action.action, widget: widget.title });

                // Handle dynamic pricing checkout
                if ((action.action === 'purchase' || action.action === 'custom') && action.payload?.executionId && action.payload?.agentId) {
                  const { executionId, agentId } = action.payload;
                  const approveAction = action.payload.action || (action.action === 'purchase' ? 'approve' : 'decline');

                  try {
                    const res = await fetch(`/api/marketplace/${agentId}/execute/${executionId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: approveAction }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      // Add a system message confirming the action
                      const confirmMsg = approveAction === 'approve'
                        ? `✅ Payment approved. ${data.message || ''}`
                        : `❌ Quote declined. No charge applied.`;
                      onAddMessage?.({
                        id: `sys-${Date.now()}`,
                        role: 'assistant',
                        content: confirmMsg,
                        createdAt: new Date().toISOString(),
                      });
                    } else {
                      console.error('Quote action failed:', data.error);
                    }
                  } catch (err) {
                    console.error('Failed to process quote action:', err);
                  }
                }

                // Handle URL opening
                if (action.action === 'open_url' && action.url) {
                  window.open(action.url, '_blank');
                }
              }}
            />
          );
        })()}
        {/* Onboarding interactive widgets */}
        {onboardingMeta && onboardingMeta.widgets?.length > 0 && (
          <OnboardingChatWidgets
            widgets={onboardingMeta.widgets}
            phase={onboardingMeta.onboardingPhase}
            onSubmit={(phase, settings) => onOnboardingAction?.('submit', phase, settings)}
            onSkip={(phase) => onOnboardingAction?.('skip', phase)}
            onGoogleConnect={(identity, accountIndex) => onOnboardingAction?.('google_connect', onboardingMeta.onboardingPhase, { identity, accountIndex })}
          />
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 opacity-60">
          {formatTime(message.createdAt)}
        </p>
      </div>

      {/* Avatar — User on right */}
      {isUser && (
        userPhoto ? (
          <img
            src={userPhoto}
            alt={userName || 'You'}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--bg-surface)] text-[var(--text-secondary)]">
            {initials}
          </div>
        )
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Markdown-lite renderer — handles bold, inline code, bullets, headers. Safe with special chars. */
function renderMarkdownLite(text: string): React.ReactNode {
  if (!text) return null;

  // Process line by line for structure (headers, bullets), then inline for bold/code
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<br key={`br-${li}`} />);
      continue;
    }

    // Heading lines (### heading)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], `h-${li}`);
      const cls = level <= 2 ? 'font-bold text-base mt-2 mb-1' : 'font-semibold text-sm mt-1.5 mb-0.5';
      elements.push(<div key={`h-${li}`} className={cls}>{content}</div>);
      continue;
    }

    // Bullet lines (• or - or * at start)
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length > 0;
      const content = renderInline(bulletMatch[2], `b-${li}`);
      elements.push(
        <div key={`b-${li}`} className={`flex gap-1.5 ${indent ? 'ml-4' : ''}`}>
          <span className="text-[var(--text-muted)] flex-shrink-0 select-none">{'\u2022'}</span>
          <span>{content}</span>
        </div>
      );
      continue;
    }

    // Regular line
    elements.push(<span key={`l-${li}`}>{renderInline(line, `l-${li}`)}</span>);
    if (li < lines.length - 1 && lines[li + 1]?.trim()) {
      elements.push(<br key={`lbr-${li}`} />);
    }
  }

  return <>{elements}</>;
}

/** Render inline formatting: **bold**, `code`, and preserve special characters */
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  // Split on **bold** and `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${keyPrefix}-${i}`} className="px-1 py-0.5 rounded text-[11px] font-mono bg-white/[0.06]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

/** Client-side tag stripping for streaming display */
function stripTagsClient(text: string): string {
  return text
    .replace(/\[\[\w+:\s*\{[\s\S]*?\}\s*\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// ─── Marketplace Suggestion Card (inline in chat) ────────────────────────────

interface MktSuggestion {
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

function MarketplaceSuggestionCard({
  suggestions,
  message,
  gated,
  onInstall,
}: {
  suggestions: MktSuggestion[];
  message: string;
  gated: boolean;
  onInstall: (type: string, id: string) => void;
}) {
  const [installingId, setInstallingId] = useState<string | null>(null);
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const [installedIds, setInstalledIds] = useState<Set<string>>(
    new Set(safeSuggestions.filter(s => s.installed).map(s => s.id))
  );

  const handleInstall = async (type: string, id: string) => {
    setInstallingId(id);
    try {
      await onInstall(type, id);
      setInstalledIds(prev => new Set([...prev, id]));
    } finally {
      setInstallingId(null);
    }
  };

  const categoryColors: Record<string, string> = {
    communications: 'text-blue-400 bg-blue-400/10',
    operations: 'text-emerald-400 bg-emerald-400/10',
    research: 'text-purple-400 bg-purple-400/10',
    finance: 'text-amber-400 bg-amber-400/10',
    hr: 'text-pink-400 bg-pink-400/10',
    sales: 'text-orange-400 bg-orange-400/10',
    engineering: 'text-cyan-400 bg-cyan-400/10',
    creative: 'text-violet-400 bg-violet-400/10',
    legal: 'text-slate-400 bg-slate-400/10',
    general: 'text-gray-400 bg-gray-400/10',
  };

  return (
    <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.04] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-brand-500/10 flex items-center gap-2">
        <span className="text-base">🛒</span>
        <span className="text-xs font-medium text-brand-400">
          {gated ? 'Marketplace — No handler found' : 'Marketplace Suggestions'}
        </span>
      </div>

      <div className="px-4 py-2">
        <p className="text-[11px] text-[var(--text-secondary)] mb-3">{message}</p>

        <div className="grid gap-2">
          {safeSuggestions.map((s) => {
            const isInstalled = installedIds.has(s.id);
            const colorClass = categoryColors[s.category] || categoryColors.general;

            return (
              <div
                key={s.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-lg shrink-0 mt-0.5">{s.icon || (s.type === 'agent' ? '🤖' : '⚡')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white truncate">{s.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${colorClass}`}>
                      {s.category}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-secondary)]">
                      {s.type === 'agent' ? '🤖 Agent' : '⚡ Capability'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {s.pricingModel === 'free' ? '✨ Free' :
                       s.pricingModel === 'per_task' ? `$${s.price}/task` :
                       s.pricingModel === 'subscription' ? `$${s.price}/mo` :
                       s.pricingModel === 'one_time' ? `$${s.price}` :
                       s.pricingModel}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {Math.round(s.relevanceScore * 100)}% match
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleInstall(s.type, s.id)}
                  disabled={isInstalled || installingId === s.id}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    isInstalled
                      ? 'bg-emerald-400/10 text-emerald-400 cursor-default'
                      : installingId === s.id
                        ? 'bg-brand-500/10 text-brand-400 animate-pulse'
                        : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 active:scale-95'
                  }`}
                >
                  {isInstalled ? '✓ Added' : installingId === s.id ? '...' : s.pricingModel === 'free' ? 'Add Free' : 'Get'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
