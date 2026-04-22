'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentWidgetContainer, parseWidgetPayload } from '@/components/widgets';
import type { WidgetItem, WidgetItemAction, AgentWidgetData } from '@/components/widgets';
import { OnboardingChatWidgets } from '../OnboardingChatWidgets';
import { RelayFootnote } from '../RelayFootnote';
import { renderMarkdownLite, formatTime } from './helpers';
import {
  SetupNowLaterButtons,
  SetupNextTaskButtons,
  SignalsSetupButtons,
} from './SetupButtons';
import type { ChatMessage } from './types';

export function MessageBubble({
  message,
  userPhoto,
  userName,
  diviName,
  resolvedRelayIds,
  onRelayDismissed,
  onAddMessage,
  onOnboardingAction,
  onSetupNextTask,
  onSetupSkipTask,
  onSignalsSetupComplete,
}: {
  message: ChatMessage;
  userPhoto?: string | null;
  userName?: string | null;
  diviName?: string;
  resolvedRelayIds?: Set<string>;
  onRelayDismissed?: (id: string) => void;
  onAddMessage?: (msg: ChatMessage) => void;
  onOnboardingAction?: (action: 'submit' | 'skip' | 'google_connect', phase: number, data?: any) => void;
  onSetupNextTask?: (taskText: string, action: any) => void;
  onSetupSkipTask?: (taskText: string) => void;
  onSignalsSetupComplete?: (choice: 'done' | 'skip') => void;
}) {
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
