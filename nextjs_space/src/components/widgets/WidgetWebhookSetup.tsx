'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface WidgetWebhookSetupProps {
  label?: string;
  description?: string;
  createEndpoint?: string;
  disabled?: boolean;
  className?: string;
}

export function WidgetWebhookSetup({
  label, description, createEndpoint = '/api/webhooks-management', disabled, className,
}: WidgetWebhookSetupProps) {
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    if (!webhookName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookName.trim(),
          signalType: 'custom',
          description: `Webhook: ${webhookName}`,
        }),
      });
      const data = await res.json();
      if (data.success || data.data?.webhookUrl) {
        setWebhookUrl(data.data?.webhookUrl || data.webhookUrl || '');
        setCreated(true);
      }
    } catch (e) {
      console.error('Failed to create webhook:', e);
    } finally {
      setCreating(false);
    }
  };

  if (created && webhookUrl) {
    return (
      <div className={cn('rounded-[var(--widget-radius)] p-3 space-y-2', className)}
        style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-success-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">✅</span>
          <span className="text-xs font-medium" style={{ color: 'var(--widget-success)' }}>Webhook created: {webhookName}</span>
        </div>
        <div className="rounded px-2 py-1.5" style={{ background: 'var(--widget-input-bg)' }}>
          <p className="text-[10px] mb-1" style={{ color: 'var(--widget-text-muted)' }}>Your webhook URL (paste this into your service):</p>
          <code className="text-[10px] font-mono break-all select-all" style={{ color: 'var(--widget-accent-text)' }}>{webhookUrl}</code>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-[var(--widget-radius)] p-3 space-y-2', className)}
      style={{ background: 'var(--widget-bg)', border: '1px solid var(--widget-border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--widget-text)' }}>{label}</span>
      {description && (
        <p className="text-[10px]" style={{ color: 'var(--widget-text-muted)' }}>{description}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={webhookName}
          onChange={(e) => setWebhookName(e.target.value)}
          placeholder="e.g. Stripe, GitHub, Slack..."
          disabled={disabled || creating}
          className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none"
          style={{
            background: 'var(--widget-input-bg)',
            border: '1px solid var(--widget-input-border)',
            color: 'var(--widget-text)',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={disabled || creating || !webhookName.trim()}
          className="px-3 py-2 text-white text-xs rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
          style={{ background: 'var(--widget-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--widget-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--widget-accent)'; }}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
