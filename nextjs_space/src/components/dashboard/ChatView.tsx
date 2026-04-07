'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tagResults, setTagResults] = useState<TagResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

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

        // Add assistant message to history
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullCleanContent || stripTagsClient(streamingContent),
          createdAt: new Date().toISOString(),
        };
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

  // ── Quick actions ─────────────────────────────────────────────────────
  const quickActions = [
    { label: '📊 What\'s my status?', message: 'Give me a status update on all my tasks and projects.' },
    { label: '➕ Create a task', message: 'Help me create a new task.' },
    { label: '📋 Show my board', message: 'Show me my current Kanban board state.' },
  ];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            AI Chat
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
              DiviDen Command Center
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md mb-3">
              Chat with your AI agent. Ask questions, delegate tasks, or get
              status updates on your projects.
            </p>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 max-w-md mb-5">
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-brand-400">Bring your own AI.</span>{' '}
                Add your OpenAI or Anthropic API key in{' '}
                <a href="/settings" className="text-brand-400 hover:text-brand-300 underline">
                  Settings
                </a>{' '}
                to enable the chat agent. Nothing runs on our dime — you control your own AI.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {quickActions.map((action) => (
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
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming response */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  AI
                </div>
                <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg p-3 max-w-[80%]">
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
                  AI
                </div>
                <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg p-3 max-w-[80%]">
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
              <div className="mx-11 p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">
                  ⚡ Actions executed:
                </p>
                {tagResults.map((r, i) => (
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
      <div className="border-t border-[var(--border-color)] p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? 'Waiting for response...' : 'Type a message to your AI agent...'}
            className="input-field flex-1"
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className={cn(
              'btn-primary px-6 transition-opacity',
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
          isUser
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            : 'bg-[var(--brand-primary)] text-white'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 rounded-lg p-3 max-w-[80%]',
          isUser
            ? 'bg-[var(--brand-primary)]/10 ml-auto'
            : 'bg-[var(--bg-tertiary)]'
        )}
      >
        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
          {message.content}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
