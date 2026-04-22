'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AgentWidgetContainer, parseWidgetPayload } from '@/components/widgets';
import type { WidgetItem, WidgetItemAction, AgentWidgetData } from '@/components/widgets';
import { emitSignal } from '@/lib/behavior-signals';
import { healStreamingMarkdown } from '@/lib/streaming-markdown';
import { OnboardingChatWidgets } from './OnboardingChatWidgets';
import { MentionText } from '@/components/MentionText';
import { RelayFootnote } from './RelayFootnote';

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
  type: 'person' | 'agent' | 'team';
  name: string;
  username?: string | null;
  avatar?: string | null;
  subtitle?: string;
  description?: string;
  diviName?: string;
  memberCount?: number;
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
  const [streamingMode, setStreamingMode] = useState<'default' | 'catchUp'>('default');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tagResults, setTagResults] = useState<TagResult[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [diviName, setDiviName] = useState('Divi');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // ── Local state: relay IDs that have been dismissed client-side ──
  // (used to instantly gray-out purple cards without waiting for refetch)
  const [dismissedRelayIds, setDismissedRelayIds] = useState<Set<string>>(() => new Set());

  // ── Resolved relay IDs (for collapsing relay badges on old messages) ──
  const resolvedRelayIds = useMemo(() => {
    const ids = new Set<string>();
    for (const msg of messages) {
      if (!msg.metadata) continue;
      const meta = typeof msg.metadata === 'string' ? (() => { try { return JSON.parse(msg.metadata as string); } catch { return null; } })() : msg.metadata;
      if (!meta?.tags || !Array.isArray(meta.tags)) continue;
      for (const t of meta.tags) {
        if (t.tag === 'relay_respond' && t.success && t.data?.relayId) {
          ids.add(t.data.relayId);
        }
      }
      // Check if any relayContext items have resolved status (from refetch after dismiss/complete)
      if (meta?.relayContext && Array.isArray(meta.relayContext)) {
        for (const r of meta.relayContext) {
          if (r?.id && (r.status === 'completed' || r.status === 'declined' || r.status === 'expired' || r.resolvedAt)) {
            ids.add(r.id);
          }
        }
      }
    }
    // Also include currently-streaming tag results
    for (const t of tagResults) {
      if (t.tag === 'relay_respond' && t.success && (t as any).data?.relayId) {
        ids.add((t as any).data.relayId);
      }
    }
    // Include dismissed IDs (client-side tracking)
    for (const id of Array.from(dismissedRelayIds)) ids.add(id);
    return ids;
  }, [messages, tagResults, dismissedRelayIds]);

  // ── Scroll to bottom ──────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ── Pending auto-send message (set by prefill, consumed after sendMessage is ready) ──
  const pendingAutoSend = useRef<string | null>(null);
  const autoSendConsumed = useRef(false);

  // ── Handle prefill from NOW panel click / auto-send from onboarding ──
  useEffect(() => {
    if (prefill) {
      // Check if this is an auto-send prefill (starts with __AUTOSEND__)
      if (prefill.startsWith('__AUTOSEND__')) {
        pendingAutoSend.current = prefill.replace('__AUTOSEND__', '');
        autoSendConsumed.current = false;
        onPrefillConsumed?.();
        return;
      }
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
          // Fetch people, agents, and teams in parallel
          const [pRes, aRes, tRes] = await Promise.all([
            fetch(`/api/chat/mentions?type=people&q=${encodeURIComponent(query)}`),
            fetch(`/api/chat/mentions?type=agents&q=${encodeURIComponent(query)}`),
            fetch(`/api/chat/mentions?type=teams&q=${encodeURIComponent(query)}`),
          ]);
          const [pData, aData, tData] = await Promise.all([pRes.json(), aRes.json(), tRes.json()]);
          const combined: MentionResult[] = [
            ...(pData.success ? pData.data : []),
            ...(tData.success ? tData.data : []),
            ...(aData.success ? aData.data : []),
          ];
          setMentionResults(combined.slice(0, 10));
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
      const m = item as MentionResult;
      // Person or agent — use @username or @slug; team — use @teamName
      const handle = m.type === 'team'
        ? m.name.toLowerCase().replace(/\s+/g, '-')
        : (m.username || m.name);
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
  const loadMessages = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setIsLoading(true);
      const res = await fetch('/api/chat/messages?limit=50');
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ── Listen for relay dismissal / comms refresh events ──
  useEffect(() => {
    const handler = () => {
      // Re-fetch messages silently so metadata.relayContext reflects latest statuses
      loadMessages({ silent: true });
    };
    window.addEventListener('dividen:comms-refresh', handler);
    window.addEventListener('dividen:now-refresh', handler);
    return () => {
      window.removeEventListener('dividen:comms-refresh', handler);
      window.removeEventListener('dividen:now-refresh', handler);
    };
  }, [loadMessages]);

  // ── Send message with SSE streaming ───────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string, opts?: { catchUpMode?: boolean }) => {
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
      setStreamingMode(opts?.catchUpMode ? 'catchUp' : 'default');
      emitSignal('chat_send', { contentLength: content.length });

      try {
        const reqBody: any = { message: content };
        if (opts?.catchUpMode) reqBody.catchUpMode = true;
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
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
        let executedTagResults: any[] = [];

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
                    executedTagResults = event.results;
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
        // Signal NOW panel to refresh after any agent response (may have executed action tags)
        window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));

        // Auto-continue after sync_signal: feed results back to LLM so Divi reports findings
        const syncResult = executedTagResults.find((r: any) => r.tag === 'sync_signal' && r.success);
        if (syncResult) {
          const syncData = syncResult.data || {};
          const syncSummary = syncData.synced !== undefined
            ? `Synced ${syncData.synced} items from ${syncData.service || 'all services'}`
            : 'Sync completed';
          // Brief pause for UX, then auto-send a hidden follow-up so the LLM continues
          setTimeout(() => {
            sendMessage(`[SYSTEM: sync_signal completed — ${syncSummary}. Now analyze what was found and report back to the operator. Continue with the task you were working on. Do NOT say you need to sync again.]`);
          }, 1500);
        }
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

  // ── Consume pending auto-send once sendMessage is available + messages loaded ──
  useEffect(() => {
    if (pendingAutoSend.current && !autoSendConsumed.current && !isStreaming && !isLoading && messages.length > 0) {
      const msg = pendingAutoSend.current;
      pendingAutoSend.current = null;
      autoSendConsumed.current = true;
      const timer = setTimeout(() => sendMessage(msg), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, isLoading, messages.length]);

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

  // ── Setup next task handler (triggered by Yes/Skip buttons on auto-continue messages) ──
  const handleSetupNextTask = useCallback(async (taskText: string, action: any) => {
    try {
      if (action?.actionTag) {
        // Task has an interactive widget — trigger the action tag directly
        const tagName = action.actionTag;
        const tagParams = action.actionParams || {};

        // Special case: open_signals_settings — show a button to open settings, then confirm
        if (tagName === 'open_signals_settings') {
          const signalsMsg: ChatMessage = {
            id: `msg-signals-setup-${Date.now()}`,
            role: 'assistant',
            content: `Time for custom signals — this is where you configure additional data sources and routing rules beyond the defaults.\n\nHit **📡 Open Signal Settings** below to configure them. When you're done (or if you want to skip), let me know.`,
            createdAt: new Date().toISOString(),
            metadata: { isSignalsSetup: true },
          };
          // Persist to DB
          fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'assistant', content: signalsMsg.content, metadata: JSON.stringify(signalsMsg.metadata) }),
          }).catch(() => {});
          setMessages(prev => [...prev, signalsMsg]);
          return;
        }

        // Special case: catch_up — sync data first, then send the full briefing prompt to the LLM
        if (tagName === 'catch_up') {
          const syncingMsg: ChatMessage = {
            id: `msg-syncing-${Date.now()}`,
            role: 'assistant',
            content: '🔄 Syncing your connected signals first...',
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, syncingMsg]);

          // Sync in background (fire and forget — don't block the catch-up)
          fetch('/api/chat/execute-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: 'sync_signal', params: { service: 'all' } }),
          }).then(() => {
            window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));
          }).catch(() => {});

          // Give sync a moment to start, then send the catch-up prompt to the LLM
          // The LLM has full Board/Queue/Inbox context in its system prompt
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Build the catch-up prompt (same as the header Catch Up button)
          let catchUpPrompt: string;
          try {
            const configRes = await fetch('/api/signals/config');
            const configJson = await configRes.json();
            const { getCatchUpPrompt } = await import('@/lib/signals');
            catchUpPrompt = getCatchUpPrompt(configJson.success ? configJson.data : undefined);
          } catch {
            const { getCatchUpPrompt } = await import('@/lib/signals');
            catchUpPrompt = getCatchUpPrompt();
          }

          sendMessage(catchUpPrompt, { catchUpMode: true });

          // Mark the "Run Your First Catch-Up" setup task as complete
          fetch('/api/onboarding/complete-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskText: 'Run Your First Catch-Up' }),
          }).then(() => {
            window.dispatchEvent(new Event('dividen:now-refresh'));
          }).catch(() => {});

          return;
        }

        // Call the action tag execution endpoint to get widget data
        const tagRes = await fetch('/api/chat/execute-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: tagName, params: tagParams }),
        });
        const tagResult = await tagRes.json();

        // Handle sync_signal failure (e.g., no Google account connected)
        if (tagName === 'sync_signal' && !tagResult?.success) {
          const errorContent = tagResult?.error
            ? `⚠️ **Catch-Up couldn't run**: ${tagResult.error}\n\nMake sure you've connected your Google account first, then try again.`
            : '⚠️ **Catch-Up couldn\'t run**. Make sure you\'ve connected your Google account first.';
          const errMsg: ChatMessage = {
            id: `msg-sync-err-${Date.now()}`,
            role: 'assistant',
            content: errorContent,
            createdAt: new Date().toISOString(),
          };
          fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'assistant', content: errMsg.content }),
          }).catch(() => {});
          setMessages(prev => [...prev, errMsg]);
          return;
        }

        if (tagResult?.success && tagResult?.data) {
          // Build widget message metadata
          let msgMetadata: any = null;
          if (tagResult.data.isSettingsWidget) {
            msgMetadata = {
              isOnboarding: true,
              onboardingPhase: -1,
              widgets: tagResult.data.widgets,
              settingsGroup: tagResult.data.settingsGroup,
            };
          } else if (tagResult.data.widgetType === 'google_connect') {
            msgMetadata = {
              isOnboarding: true,
              onboardingPhase: -1,
              widgets: [{
                type: 'google_connect',
                id: `gc_${tagResult.data.identity}_${tagResult.data.accountIndex}`,
                identity: tagResult.data.identity,
                accountIndex: tagResult.data.accountIndex,
                label: tagResult.data.label,
                description: tagResult.data.description,
                connected: tagResult.data.connected,
                connectedEmail: tagResult.data.connectedEmail,
              }],
            };
          }

          // Handle sync_signal results (not a widget — show as a message)
          if (tagName === 'sync_signal') {
            const syncData = tagResult.data;
            let syncSummary = '🔄 **Catch-Up Complete!**\n\n';
            if (syncData && typeof syncData === 'object') {
              const parts: string[] = [];
              if (syncData.email !== undefined) parts.push(`📧 **Email**: ${syncData.email} new messages synced`);
              if (syncData.calendar !== undefined) parts.push(`📅 **Calendar**: ${syncData.calendar} events synced`);
              if (syncData.drive !== undefined) parts.push(`📁 **Drive**: ${syncData.drive} files synced`);
              if (syncData.synced !== undefined) parts.push(`Synced ${syncData.synced} items from ${syncData.service || 'all services'}`);
              if (parts.length > 0) {
                syncSummary += parts.join('\n');
              } else {
                syncSummary += 'All connected signals have been processed.';
              }
            } else {
              syncSummary += 'All connected signals have been processed.';
            }
            syncSummary += '\n\nYour board has been updated with what I found. Check the **NOW** panel for new items.';
            const syncMsg: ChatMessage = {
              id: `msg-sync-${Date.now()}`,
              role: 'assistant',
              content: syncSummary,
              createdAt: new Date().toISOString(),
            };
            fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: syncMsg.content }),
            }).catch(() => {});
            setMessages(prev => [...prev, syncMsg]);
            window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));
            return;
          }

          if (msgMetadata) {
            const widgetMsg: ChatMessage = {
              id: `msg-widget-${Date.now()}`,
              role: 'assistant',
              content: `Here are the settings for **${taskText}**. Adjust anything and hit save:`,
              createdAt: new Date().toISOString(),
              metadata: msgMetadata,
            };
            // Persist to DB
            fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: widgetMsg.content, metadata: JSON.stringify(msgMetadata) }),
            }).catch(() => {});
            setMessages(prev => [...prev, widgetMsg]);
            window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));
            return;
          }
        }
        // Fallback: if tag execution failed, send to LLM
        sendMessage(`Let's do "${taskText}" now.`);
      } else if (action?.agentPrompt) {
        // No widget — send the task's agent prompt to the LLM for conversational handling
        sendMessage(`[SYSTEM: ${action.agentPrompt}]`);
      } else {
        // Fallback
        sendMessage(`Let's do "${taskText}" now.`);
      }
      window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));
    } catch (err) {
      console.error('[handleSetupNextTask] Error:', err);
      sendMessage(`Let's do "${taskText}" now.`);
    }
  }, [sendMessage]);

  // ── Signals setup complete handler ─────────────────────────────────
  const handleSignalsSetupComplete = useCallback(async (choice: 'done' | 'skip') => {
    try {
      if (choice === 'done') {
        // Mark the custom signals task as complete
        const completeRes = await fetch('/api/onboarding/complete-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskText: 'Set Up Custom Signals' }),
        });
        const result = await completeRes.json();
        const { nextTaskText, nextTaskAction, allTasksComplete } = result?.data || {};

        let confirmContent = '✅ Custom signals configured — nice. That\'s checked off your setup list.';
        let confirmMetadata: any = null;

        if (nextTaskText) {
          confirmContent += `\n\nNext up is **"${nextTaskText}"**. Want to knock that out now?`;
          confirmMetadata = {
            isSetupNextTask: true,
            nextTaskText,
            nextTaskAction: nextTaskAction || null,
          };
        } else if (allTasksComplete) {
          confirmContent += '\n\nAnd that wraps up your setup! You\'re good to go.';
        }

        // Persist and show
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: confirmContent, metadata: confirmMetadata ? JSON.stringify(confirmMetadata) : undefined }),
        }).catch(() => {});
        setMessages(prev => [...prev, {
          id: `msg-signals-done-${Date.now()}`,
          role: 'assistant',
          content: confirmContent,
          createdAt: new Date().toISOString(),
          metadata: confirmMetadata,
        }]);
      } else {
        // Skip — same flow as handleSetupSkipTask but for signals specifically
        const skipMsg: ChatMessage = {
          id: `msg-signals-skip-${Date.now()}`,
          role: 'assistant',
          content: '⏭️ No worries — custom signals are optional. You can always set them up later in Settings → Integrations.',
          createdAt: new Date().toISOString(),
        };
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: skipMsg.content }),
        }).catch(() => {});

        // Still check what the next task is
        const completeRes = await fetch('/api/onboarding/complete-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskText: 'Set Up Custom Signals' }),
        });
        const result = await completeRes.json();
        const { nextTaskText, nextTaskAction } = result?.data || {};

        if (nextTaskText) {
          skipMsg.content += `\n\nNext up is **"${nextTaskText}"**. Want to do that now?`;
          skipMsg.metadata = { isSetupNextTask: true, nextTaskText, nextTaskAction: nextTaskAction || null };
        }

        setMessages(prev => [...prev, skipMsg]);
      }
      window.dispatchEvent(new Event('dividen:now-refresh'));
      window.dispatchEvent(new Event('dividen:activity-refresh'));
    } catch (err) {
      console.error('[handleSignalsSetupComplete] Error:', err);
    }
  }, []);

  const handleSetupSkipTask = useCallback(async (taskText: string) => {
    // Mark the task as skipped in a Divi message
    const skipMsg: ChatMessage = {
      id: `msg-skip-${Date.now()}`,
      role: 'assistant',
      content: `⏭️ Skipping "${taskText}" for now. You can always come back to it later.\n\nWhat would you like to do next?`,
      createdAt: new Date().toISOString(),
    };
    fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'assistant', content: skipMsg.content }),
    }).catch(() => {});
    setMessages(prev => [...prev, skipMsg]);
    window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));
  }, []);

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
        const settingsGroup = data?._settingsGroup || undefined;
        const cleanData = data ? { ...data } : {};
        delete cleanData._settingsGroup;

        const settingsRes = await fetch('/api/onboarding/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'show_settings', settings: cleanData, settingsGroup }),
        });
        const settingsResult = await settingsRes.json();
        const { tasksCompleted, nextTaskText, nextTaskAction, allTasksComplete } = settingsResult?.data || {};

        // Acknowledge the completed task and ask about the next one
        // Signal NOW panel to refresh after settings change
        window.dispatchEvent(new Event('dividen:now-refresh')); window.dispatchEvent(new Event('dividen:activity-refresh'));

        let confirmContent = '✅ Settings saved.';
        let confirmMetadata: any = null;
        if (tasksCompleted && nextTaskText) {
          confirmContent = `✅ Done — that's checked off your setup list.\n\nNext up is **"${nextTaskText}"**. Want to knock that out now?`;
          // Attach next task action metadata so the message renders Yes/Skip buttons
          confirmMetadata = {
            isSetupNextTask: true,
            nextTaskText,
            nextTaskAction: nextTaskAction || null,
          };
        } else if (tasksCompleted && allTasksComplete) {
          confirmContent = `✅ Done — and that was the last one! Your setup checklist is complete. You're all set to go.\n\nWhat would you like to focus on?`;
        }

        // Persist to DB so the LLM sees it in conversation context
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: confirmContent, metadata: confirmMetadata ? JSON.stringify(confirmMetadata) : undefined }),
        }).catch(() => {});

        setMessages(prev => [...prev, {
          id: `msg-confirm-${Date.now()}`,
          role: 'assistant',
          content: confirmContent,
          createdAt: new Date().toISOString(),
          metadata: confirmMetadata,
        }]);
        return;
      }

      // ── Setup choice (together/solo) — sets due dates on the pre-created project ──
      if (phase === 0 && data?.setupMode) {
        const spRes = await fetch('/api/onboarding/setup-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: data.setupMode }),
        });
        const spResult = await spRes.json();

        if (data.setupMode === 'solo') {
          setMessages(prev => [...prev, {
            id: `msg-setup-confirm-${Date.now()}`,
            role: 'assistant' as const,
            content: `No problem — your setup tasks are due in a week. Take your time exploring.\n\nI'll check in if anything's still open. You can always ask me for help with any of them.`,
            createdAt: new Date().toISOString(),
          }]);
        } else {
          // "together" — directly trigger the first task's widget
          const firstTask = spResult?.data?.firstTask?.text || "Configure Divi's Working Style";
          // Look up action from the response or use default
          const firstTaskAction = spResult?.data?.firstTask?.action || { actionTag: 'show_settings_widget', actionParams: { group: 'working_style' } };
          setTimeout(() => {
            handleSetupNextTask(firstTask, firstTaskAction);
          }, 400);
        }
        return;
      }

      // Regular onboarding — advance to next phase (legacy)
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
  }, [sendMessage]);

  // ── Quick actions (no API key) ───────────────────────────────────────
  const quickActions = [
    { label: '📊 What\'s my status?', message: 'Give me a status update on all my tasks and projects.' },
    { label: '➕ Create a task', message: 'Help me create a new task.' },
    { label: '📋 Show my board', message: 'Show me my current Kanban board state.' },
  ];

  // ── Engagement actions (has API key, cleared chat) ─────────────────
  const engagementActions = [
    { label: '☀️ Catch me up', message: 'Catch me up on everything — what happened since we last talked, what\'s urgent, what needs my attention.', catchUpMode: true },
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
              {(hasApiKey ? engagementActions : quickActions).map((action: any) => (
                <button
                  key={action.label}
                  className="btn-secondary text-sm"
                  onClick={() => sendMessage(action.message, action.catchUpMode ? { catchUpMode: true } : undefined)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} userPhoto={userPhoto} userName={userName} diviName={diviName} resolvedRelayIds={resolvedRelayIds} onRelayDismissed={(id: string) => setDismissedRelayIds(prev => { const n = new Set(prev); n.add(id); return n; })} onAddMessage={(m: ChatMessage) => setMessages(prev => [...prev, m])} onOnboardingAction={handleOnboardingAction} onSetupNextTask={handleSetupNextTask} onSetupSkipTask={handleSetupSkipTask} onSignalsSetupComplete={handleSignalsSetupComplete} />
            ))}

            {/* Streaming response (Phase 2.5.1/2.5.2: markdown-rendered with healing + table buffering) */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(diviName || 'D')[0].toUpperCase()}
                </div>
                <div className="flex-1 bg-[var(--bg-surface)] rounded-lg p-3 max-w-[80%]">
                  <div className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {renderMarkdownLite(healStreamingMarkdown(stripTagsClient(streamingContent)))}
                    <span className="animate-pulse text-[var(--text-muted)]">▌</span>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming placeholder when no content yet (Phase 2.5.3: adaptive text) */}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(diviName || 'D')[0].toUpperCase()}
                </div>
                <div className="flex-1 bg-[var(--bg-surface)] rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-xs text-[var(--text-muted)] italic">
                      {streamingMode === 'catchUp' ? 'Gathering context\u2026' : 'Thinking\u2026'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tag execution results */}
            {tagResults.length > 0 && (
              <div className="mx-11 space-y-2">
                {/* Relay action results — green outgoing cards */}
                {tagResults.filter(r => (r.tag === 'relay_respond' || r.tag === 'relay_request' || r.tag === 'relay_broadcast' || r.tag === 'relay_ambient') && r.success).map((r, i) => {
                  const isAmbient = r.tag === 'relay_ambient' || (r.tag === 'relay_respond' && r.data?.ambientSignalCaptured);
                  const body = r.data?.subject || r.data?.responseText || r.data?.message || r.data?.question || r.data?.note;
                  const to = r.data?.to || r.data?.recipient;
                  const sender = r.data?.to || r.data?.recipient || r.data?.recipientLabel || r.data?.peerName || 'peer';
                  const ts = r.data?.timestamp || r.data?.createdAt || new Date().toISOString();
                  return (
                    <div key={`relay-${i}`} className="p-2.5 rounded-lg border-l-2 border-l-emerald-500/70 bg-emerald-500/[0.06] border border-emerald-500/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 text-[10px] font-bold">↗</span>
                        <span className="text-[11px] font-medium text-emerald-300">
                          {r.tag === 'relay_respond' ? '📡 Relay response sent' : r.tag === 'relay_broadcast' ? '📡 Broadcast sent' : r.tag === 'relay_ambient' ? '🌊 Ambient relay sent' : '📡 Relay sent'}
                        </span>
                      </div>
                      {/* For relay_respond: show "Re: <original>" above what the operator actually sent */}
                      {r.tag === 'relay_respond' && r.data?.originalSubject && (
                        <p className="text-[9px] text-emerald-300/40 mt-0.5 pl-4 line-clamp-1 italic">Re: {r.data.originalSubject}</p>
                      )}
                      {to && (
                        <p className="text-[9px] text-emerald-300/50 mt-0.5 pl-4 line-clamp-1">→ {to}</p>
                      )}
                      {body && (
                        <p className="text-[10px] text-emerald-300/80 mt-0.5 pl-4 line-clamp-2">{body}</p>
                      )}
                      <div className="mt-1.5 pt-1 border-t border-emerald-500/10 pl-4">
                        <RelayFootnote
                          relayId={r.data?.relayId || null}
                          sender={sender}
                          type={isAmbient ? 'ambient' : 'direct'}
                          timestamp={ts}
                          status={(r.data?.status || 'delivered') as any}
                          tone="emerald"
                          dismissible={!!r.data?.relayId}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Failed relay results — red warning */}
                {tagResults.filter(r => (r.tag === 'relay_respond' || r.tag === 'relay_request' || r.tag === 'relay_broadcast' || r.tag === 'relay_ambient') && !r.success).map((r, i) => (
                  <div key={`relay-err-${i}`} className="p-2 rounded-lg border-l-2 border-l-red-500/70 bg-red-500/[0.06] border border-red-500/20">
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-400 text-[10px] font-bold">✕</span>
                      <span className="text-[11px] font-medium text-red-300">{r.tag.replace('_', ' ')} failed</span>
                    </div>
                    {r.error && <p className="text-[10px] text-red-300/70 mt-0.5 pl-4">{r.error}</p>}
                  </div>
                ))}
                {/* Project invite results — detailed per-member status */}
                {tagResults.filter(r => (r.tag === 'invite_to_project' || r.tag === 'create_project')).map((r, i) => {
                  const members = r.tag === 'create_project'
                    ? (r.data?.memberInvites || [])
                    : (r.data?.invites || []);
                  const hasFailures = members.some((m: any) => m.status === 'not_found' || m.status === 'error');
                  const hasSuccess = members.some((m: any) => m.status === 'invited' || m.status === 're-sent' || m.status === 'already_member');
                  const tone = hasFailures
                    ? (hasSuccess ? 'amber' : 'red')
                    : 'indigo';
                  const toneClass = tone === 'red'
                    ? 'border-l-red-500/70 bg-red-500/[0.06] border-red-500/20'
                    : tone === 'amber'
                      ? 'border-l-amber-500/70 bg-amber-500/[0.06] border-amber-500/20'
                      : 'border-l-indigo-500/70 bg-indigo-500/[0.06] border-indigo-500/20';
                  const titleToneClass = tone === 'red'
                    ? 'text-red-300'
                    : tone === 'amber'
                      ? 'text-amber-300'
                      : 'text-indigo-300';
                  return (
                    <div key={`proj-${i}`} className={`p-2.5 rounded-lg border-l-2 border ${toneClass}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`${titleToneClass} text-[10px] font-bold`}>📋</span>
                        <span className={`text-[11px] font-medium ${titleToneClass}`}>
                          {r.tag === 'create_project' ? `Project created: ${r.data?.projectName}` : `Invites to: ${r.data?.projectName}`}
                        </span>
                      </div>
                      {members.length > 0 && (
                        <div className="mt-1.5 pl-4 space-y-0.5">
                          {members.map((m: any, j: number) => {
                            const icon = m.status === 'invited' || m.status === 're-sent'
                              ? '✅'
                              : m.status === 'already_member' || m.status === 'skipped'
                                ? '⏭'
                                : m.status === 'not_found'
                                  ? '⚠️'
                                  : '❌';
                            return (
                              <div key={j} className="text-[10px] text-[var(--text-muted)] flex items-start gap-1">
                                <span className="shrink-0">{icon}</span>
                                <span className="text-[var(--text-secondary)]">{m.name || '?'}</span>
                                <span className="text-[var(--text-muted)]">— {m.status}</span>
                                {m.error && <span className="text-red-400">({m.error})</span>}
                                {m.reason && <span className="text-[var(--text-muted)]">({m.reason})</span>}
                                {m.searched && <span className="text-[var(--text-muted)]">(searched: {m.searched})</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Standard non-relay action results */}
                {tagResults.some(r => !r.data?.gated && !r.data?.suggestions && !['relay_respond', 'relay_request', 'relay_broadcast', 'relay_ambient', 'invite_to_project', 'create_project'].includes(r.tag)) && (
                  <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">
                      ⚡ Actions executed:
                    </p>
                    {tagResults.filter(r => !r.data?.gated && !r.data?.suggestions && !['relay_respond', 'relay_request', 'relay_broadcast', 'relay_ambient', 'invite_to_project', 'create_project'].includes(r.tag)).map((r, i) => (
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
                        setInput(`I just installed a ${type} from the Bubble Store. Let me know what's next.`);
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
          <div id="inline-search-listbox" role="listbox" aria-label={inlineMode === '@' ? 'People, Teams & Agents' : 'Commands'} className="mb-2 bg-[#141419] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                {inlineMode === '@' ? '👥 People, Teams & Agents' : '⚡ Commands'}
              </span>
            </div>
            {inlineItems.map((item, idx) => (
              <button
                key={item.id}
                id={`inline-item-${idx}`}
                role="option"
                aria-selected={idx === selectedIdx}
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
                        (item as MentionResult).type === 'team'
                          ? <span className="text-sm">{(item as MentionResult).avatar}</span>
                          : <img src={(item as MentionResult).avatar!} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (item as MentionResult).type === 'agent' ? '🤖' : (item as MentionResult).type === 'team' ? '👥' : (
                        ((item as MentionResult).name || '?')[0]?.toUpperCase()
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{(item as MentionResult).name}</div>
                      <div className="text-[10px] text-white/40 truncate">{(item as MentionResult).subtitle}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 flex-shrink-0">
                      {(item as MentionResult).type === 'agent' ? 'Agent' : (item as MentionResult).type === 'team' ? 'Team' : 'Person'}
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

        <div className="flex gap-2 items-end w-full min-w-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e.target.value);
              // Auto-resize: reset height then grow to scrollHeight
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
            placeholder={isStreaming ? `${diviName} is thinking...` : `Message ${diviName}... (@ to mention, ! for commands)`}
            className="input-field flex-1 min-w-0 w-0 text-sm md:text-base resize-none overflow-y-auto"
            style={{ maxHeight: '160px', minHeight: '42px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            rows={1}
            wrap="soft"
            disabled={isStreaming}
            role="combobox"
            aria-expanded={!!(inlineMode && inlineItems.length > 0)}
            aria-haspopup="listbox"
            aria-controls="inline-search-listbox"
            aria-activedescendant={inlineMode && inlineItems.length > 0 ? `inline-item-${selectedIdx}` : undefined}
            aria-label={`Message ${diviName}`}
            autoComplete="off"
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
              // Normal send on Enter (without shift for newline)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                // Reset textarea height after sending
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                }
              }
            }}
          />
          <button
            className={cn(
              'btn-primary px-3 md:px-6 transition-opacity flex-shrink-0',
              (isStreaming || !input.trim()) && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              sendMessage();
              if (inputRef.current) inputRef.current.style.height = 'auto';
            }}
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

/** Now / Later buttons rendered below the setup intro message */
/** Yes / Skip buttons rendered below auto-continue "Next up is X" messages */
function SetupNextTaskButtons({ nextTaskText, nextTaskAction, onConfirm, onSkip }: {
  nextTaskText: string;
  nextTaskAction: any;
  onConfirm: (taskText: string, action: any) => void;
  onSkip: (taskText: string) => void;
}) {
  const [chosen, setChosen] = useState<'yes' | 'skip' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'yes' ? `⚡ Loading ${nextTaskText}…` : '⏭️ Skipped.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => { setChosen('yes'); onConfirm(nextTaskText, nextTaskAction); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ⚡ Yes, let&apos;s go
      </button>
      <button
        onClick={() => { setChosen('skip'); onSkip(nextTaskText); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        ⏭️ Skip for now
      </button>
    </div>
  );
}

function SetupNowLaterButtons({ onChoice }: { onChoice: (mode: 'together' | 'solo') => void }) {
  const [chosen, setChosen] = useState<'together' | 'solo' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'together' ? '⚡ Let\u2019s go — tasks due today.' : '📅 No rush — tasks due in a week.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => { setChosen('together'); onChoice('together'); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ⚡ Let&apos;s do it now
      </button>
      <button
        onClick={() => { setChosen('solo'); onChoice('solo'); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        📅 I&apos;ll do it later
      </button>
    </div>
  );
}

function SignalsSetupButtons({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [chosen, setChosen] = useState<'done' | 'skip' | null>(null);

  if (chosen) {
    return (
      <div className="mt-3 text-xs text-[var(--text-muted)] italic">
        {chosen === 'done' ? '✅ Checking your signal setup…' : '⏭️ Skipped — you can set up signals anytime.'}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      <button
        onClick={() => { window.location.href = '/settings?tab=integrations'; }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
      >
        📡 Open Signal Settings
      </button>
      <button
        onClick={() => { setChosen('done'); onDone(); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
      >
        ✅ Done — I&apos;ve set them up
      </button>
      <button
        onClick={() => { setChosen('skip'); onSkip(); }}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        ⏭️ Skip for now
      </button>
    </div>
  );
}

function MessageBubble({ message, userPhoto, userName, diviName, resolvedRelayIds, onRelayDismissed, onAddMessage, onOnboardingAction, onSetupNextTask, onSetupSkipTask, onSignalsSetupComplete }: { message: ChatMessage; userPhoto?: string | null; userName?: string | null; diviName?: string; resolvedRelayIds?: Set<string>; onRelayDismissed?: (id: string) => void; onAddMessage?: (msg: ChatMessage) => void; onOnboardingAction?: (action: 'submit' | 'skip' | 'google_connect', phase: number, data?: any) => void; onSetupNextTask?: (taskText: string, action: any) => void; onSetupSkipTask?: (taskText: string) => void; onSignalsSetupComplete?: (choice: 'done' | 'skip') => void }) {
  const [relayExpanded, setRelayExpanded] = useState(false);
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

  // Detect setup intro message for now/later buttons
  const isSetupIntro = (() => {
    if (!message.metadata) return false;
    const meta = typeof message.metadata === 'string' ? (() => { try { return JSON.parse(message.metadata as string); } catch { return null; } })() : message.metadata;
    return meta?.isSetupIntro === true;
  })();

  // Detect "next task" auto-continue message — renders Yes/Skip buttons
  const setupNextTaskMeta = (() => {
    if (!message.metadata) return null;
    const meta = typeof message.metadata === 'string' ? (() => { try { return JSON.parse(message.metadata as string); } catch { return null; } })() : message.metadata;
    if (meta?.isSetupNextTask) return meta;
    return null;
  })();

  // Detect signals setup message — renders Open Settings + Done/Skip buttons
  const isSignalsSetup = (() => {
    if (!message.metadata) return false;
    const meta = typeof message.metadata === 'string' ? (() => { try { return JSON.parse(message.metadata as string); } catch { return null; } })() : message.metadata;
    return meta?.isSignalsSetup === true;
  })();

  // Parse relay context — inbound relays Divi had in context when generating this message
  const relayContext: Array<{ id: string; subject: string; intent: string; payload: string | null; fromName: string; connectionId: string; createdAt: string }> | null = (() => {
    if (!message.metadata || isUser) return null;
    const meta = typeof message.metadata === 'string' ? (() => { try { return JSON.parse(message.metadata as string); } catch { return null; } })() : message.metadata;
    if (meta?.relayContext && Array.isArray(meta.relayContext) && meta.relayContext.length > 0) return meta.relayContext;
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

        {/* Relay context badge — shows when Divi's response was informed by inbound relays */}
        {relayContext && (() => {
          const allResolved = resolvedRelayIds ? relayContext.every(r => resolvedRelayIds.has(r.id)) : false;
          return (
          <div className={cn('mt-2 transition-opacity', allResolved && !relayExpanded && 'opacity-40')}>
            <button
              onClick={() => setRelayExpanded(!relayExpanded)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
                allResolved
                  ? 'bg-gray-500/10 border border-gray-500/20 text-gray-500 hover:bg-gray-500/15'
                  : 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/15'
              )}
            >
              <span>{allResolved ? '✓' : '📡'}</span>
              <span>{relayContext.length} relay{relayContext.length !== 1 ? 's' : ''} {allResolved ? 'resolved' : 'in context'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', relayExpanded && 'rotate-180')}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {relayExpanded && (
              <div className="mt-2 space-y-2">
                {relayContext.map((relay) => {
                  const isResolved = resolvedRelayIds?.has(relay.id) ?? false;
                  let payloadText = relay.payload || '';
                  let isAmbient = false;
                  try {
                    const p = JSON.parse(relay.payload || '{}');
                    payloadText = p.message || p.body || p.detail || p.text || (typeof p === 'string' ? p : relay.payload || '');
                    isAmbient = !!p._ambient;
                  } catch {}
                  return (
                    <div key={relay.id} className={cn('rounded-lg p-2.5', isResolved ? 'bg-gray-500/5 border border-gray-500/10' : 'bg-purple-500/5 border border-purple-500/10')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[10px] font-bold uppercase', isResolved ? 'text-gray-500' : 'text-purple-400')}>From {relay.fromName}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">· {relay.intent}</span>
                        {isResolved && <span className="text-[9px] px-1 py-px rounded bg-emerald-500/10 text-emerald-400 font-medium">resolved</span>}
                      </div>
                      <p className={cn('text-xs font-medium mb-0.5', isResolved ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]')}>{relay.subject}</p>
                      {payloadText && payloadText !== relay.subject && (
                        <p className={cn('text-[11px] leading-relaxed', isResolved ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]')}>{payloadText}</p>
                      )}
                      <div className="mt-1.5 pt-1 border-t border-purple-500/10">
                        <RelayFootnote
                          relayId={relay.id}
                          sender={relay.fromName}
                          type={isAmbient ? 'ambient' : 'direct'}
                          timestamp={relay.createdAt}
                          status={isResolved ? 'completed' : 'delivered'}
                          tone="purple"
                          dismissible={!isResolved}
                          onDismissed={() => onRelayDismissed?.(relay.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })()}

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
            onSubmit={(phase, settings) => onOnboardingAction?.('submit', phase, { ...settings, _settingsGroup: onboardingMeta.settingsGroup })}
            onSkip={(phase) => onOnboardingAction?.('skip', phase)}
            onGoogleConnect={(identity, accountIndex) => onOnboardingAction?.('google_connect', onboardingMeta.onboardingPhase, { identity, accountIndex })}
          />
        )}
        {/* Setup intro: now/later buttons */}
        {isSetupIntro && (
          <SetupNowLaterButtons onChoice={(mode) => onOnboardingAction?.('submit', 0, { setupMode: mode })} />
        )}
        {/* Setup next task: yes/skip buttons */}
        {setupNextTaskMeta && (
          <SetupNextTaskButtons
            nextTaskText={setupNextTaskMeta.nextTaskText}
            nextTaskAction={setupNextTaskMeta.nextTaskAction}
            onConfirm={(taskText, action) => onSetupNextTask?.(taskText, action)}
            onSkip={(taskText) => onSetupSkipTask?.(taskText)}
          />
        )}
        {/* Signals setup: open settings + done/skip buttons */}
        {isSignalsSetup && (
          <SignalsSetupButtons
            onDone={() => onSignalsSetupComplete?.('done')}
            onSkip={() => onSignalsSetupComplete?.('skip')}
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

/** Render inline formatting: **bold**, `code`, @mentions, and preserve special characters */
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  // Split on **bold**, `code`, and @mention patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|@[a-z0-9_.-]{2,30})/g);
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
    if (/^@[a-z0-9_.-]{2,30}$/.test(part)) {
      return <MentionText key={`${keyPrefix}-${i}`} text={part} />;
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
        <span className="text-base">🫧</span>
        <span className="text-xs font-medium text-brand-400">
          {gated ? 'Bubble Store — No handler found' : 'Bubble Store Suggestions'}
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