export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integration Docs',
  description: 'API documentation for connecting agents, webhooks, calendars, email, and external tools to DiviDen.',
  openGraph: {
    title: 'DiviDen Integration Docs',
    description: 'API keys, webhooks, calendar sync, email, and agent-to-agent protocol integration.',
    images: [{ url: '/api/og?title=Integration+Docs&subtitle=Connect+agents%2C+webhooks%2C+calendars%2C+and+tools&tag=docs', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen Integration Docs',
    description: 'API keys, webhooks, calendar sync, email, and agent-to-agent protocol integration.',
    images: ['/api/og?title=Integration+Docs&subtitle=Connect+agents%2C+webhooks%2C+calendars%2C+and+tools&tag=docs'],
  },
};

import { DocFooterDownload } from '@/components/docs/DocFooterDownload';

export default function IntegrationDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-8" data-doc-content>
        <div className="mb-8 flex items-center gap-4">
          <a href="/documentation" className="text-brand-400 hover:text-brand-300 text-sm">
            ← Documentation
          </a>
          <a href="/docs/developers" className="text-brand-400 hover:text-brand-300 text-sm">API Reference</a>
          <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 text-sm">Federation</a>
        </div>

        <h1 className="text-3xl font-bold mb-2">🔗 DiviDen Integration Guide</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Connect Google services, external tools, and custom webhooks to DiviDen.
        </p>

        {/* Google OAuth — Primary Integration */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">🟢 Google Integration (Recommended)</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            The fastest way to connect email, calendar, and file storage. DiviDen uses Google OAuth to sync your Gmail, Google Calendar, and Google Drive directly — no webhooks or third-party tools needed.
          </p>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] mb-4">
            <h3 className="font-medium mb-2">Quick Start</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)]">
              <li>Go to <strong>Settings → Integrations</strong></li>
              <li>Click <strong>Connect Google</strong></li>
              <li>Authorize Gmail, Calendar, and Drive access</li>
              <li>DiviDen syncs your data automatically — emails, events, and files appear in the dashboard</li>
            </ol>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-center">
              <div className="text-2xl mb-1">📧</div>
              <h4 className="font-medium text-sm">Gmail</h4>
              <p className="text-[10px] text-[var(--text-muted)]">Read, send, compose</p>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-center">
              <div className="text-2xl mb-1">📅</div>
              <h4 className="font-medium text-sm">Calendar</h4>
              <p className="text-[10px] text-[var(--text-muted)]">Full read + write</p>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-center">
              <div className="text-2xl mb-1">📁</div>
              <h4 className="font-medium text-sm">Drive</h4>
              <p className="text-[10px] text-[var(--text-muted)]">Read-only file sync</p>
            </div>
          </div>
          <div className="p-3 bg-brand-500/5 border border-brand-500/20 rounded-lg text-sm text-[var(--text-secondary)]">
            <strong className="text-brand-400">Multi-account support:</strong> Connect up to 3 Google accounts per identity. Calendar and Drive views show per-account tabs and color-coded filters.
          </div>
        </section>

        {/* SMTP Alternative */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">📮 SMTP / IMAP (Alternative)</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            If you don&apos;t use Google, connect any email provider via SMTP/IMAP. Go to <strong>Settings → Integrations → + SMTP</strong> and provide your server credentials.
          </p>
        </section>

        {/* Overview — Webhooks */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">🔗 Webhooks</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            For services beyond Google (Slack, GitHub, Notion, CRMs, etc.), DiviDen uses a <strong>webhook-first</strong> approach. Create webhook endpoints that receive data from platforms like Zapier, Make, n8n, or direct API calls.
          </p>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
            <h3 className="font-medium mb-2">Quick Start</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)]">
              <li>Go to <strong>Settings → Integrations</strong></li>
              <li>Click <strong>+ New Webhook</strong> and choose a type</li>
              <li>Copy the webhook URL and secret</li>
              <li>Configure your external service to POST data to the URL</li>
              <li>DiviDen auto-learns your payload structure via LLM and maps fields automatically</li>
              <li>Data flows into Calendar, Inbox, Recordings, CRM, and Queue</li>
            </ol>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-3">
            💡 <strong>Tip:</strong> You can also ask Divi to set up webhooks and API keys directly from chat.
            Just say &quot;set up a calendar webhook&quot; and Divi will create it for you.
          </p>
        </section>

        {/* Webhook Types */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Webhook Types</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: '📅 Calendar', endpoint: '/api/webhooks/calendar', desc: 'Creates queue items from events, adds attendees as contacts' },
              { type: '📧 Email', endpoint: '/api/webhooks/email', desc: 'Creates contacts from senders, adds email as queue notification' },
              { type: '📝 Transcript', endpoint: '/api/webhooks/transcript', desc: 'Creates kanban cards with checklists from action items' },
              { type: '🔗 Generic', endpoint: '/api/webhooks/generic', desc: 'Creates a queue item with the payload data' },
            ].map(item => (
              <div key={item.type} className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
                <h3 className="font-medium">{item.type}</h3>
                <code className="text-xs text-brand-400">{item.endpoint}</code>
                <p className="text-xs text-[var(--text-muted)] mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Authentication</h2>
          <div className="space-y-3">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium text-sm">Query Parameter (Simplest)</h3>
              <code className="text-xs text-green-400 block mt-1">
                POST /api/webhooks/calendar?webhookId=ID&secret=YOUR_SECRET
              </code>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium text-sm">Header-Based Secret</h3>
              <code className="text-xs text-green-400 block mt-1">
                X-Webhook-Secret: YOUR_SECRET
              </code>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium text-sm">HMAC-SHA256 Signature</h3>
              <code className="text-xs text-green-400 block mt-1">
                X-Webhook-Signature: sha256=COMPUTED_HMAC_HEX
              </code>
            </div>
          </div>
        </section>

        {/* Payload Examples */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Payload Examples</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-1">📅 Calendar Event</h3>
              <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
  "summary": "Team Standup",
  "description": "Daily standup meeting",
  "start": { "dateTime": "2025-01-15T09:00:00Z" },
  "end": { "dateTime": "2025-01-15T09:30:00Z" },
  "attendees": [
    { "email": "alice@example.com", "displayName": "Alice Johnson" }
  ]
}`}</pre>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">📧 Email Notification</h3>
              <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
  "from": { "name": "Jane Doe", "email": "jane@example.com" },
  "subject": "Project Update",
  "body": "Hi, here is the latest update..."
}`}</pre>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">📝 Meeting Transcript</h3>
              <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
  "title": "Q1 Planning Meeting",
  "transcript": "Discussion about Q1 goals...",
  "actionItems": [
    "Review budget proposal by Friday",
    "Schedule follow-up with engineering"
  ],
  "participants": [
    { "name": "John Doe", "email": "john@example.com" }
  ]
}`}</pre>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">🔗 Generic</h3>
              <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
  "title": "New Form Submission",
  "description": "Lead from website",
  "data": { "name": "Alex Brown", "email": "alex@example.com" }
}`}</pre>
            </div>
          </div>
        </section>

        {/* Zapier Examples */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Zapier Examples</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium">Google Calendar → DiviDen</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)] mt-2">
                <li>Trigger: Google Calendar → New Event</li>
                <li>Action: Webhooks by Zapier → POST</li>
                <li>URL: Your DiviDen calendar webhook URL</li>
                <li>Map: summary, description, start.dateTime, end.dateTime, attendees</li>
              </ol>
            </div>
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium">Gmail → DiviDen</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)] mt-2">
                <li>Trigger: Gmail → New Email</li>
                <li>Action: Webhooks by Zapier → POST</li>
                <li>URL: Your DiviDen email webhook URL</li>
                <li>Map: from.name, from.email, subject, body</li>
              </ol>
            </div>
          </div>
        </section>

        {/* cURL */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Testing with cURL</h2>
          <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`curl -X POST "YOUR_WEBHOOK_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "summary": "Test Meeting",
    "start": {"dateTime": "2025-01-15T10:00:00Z"},
    "attendees": [{"email": "test@example.com"}]
  }'`}</pre>
        </section>

        {/* Auto-Learn Field Mapping */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">🧠 Auto-Learn Field Mapping</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            When a webhook payload arrives for the first time, DiviDen&apos;s LLM analyzes the structure and
            automatically maps fields to the correct internal format. You can view, edit, or re-learn mappings
            in <strong>Settings → Integrations → Field Mapping</strong>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { status: 'Auto-Learned', color: 'text-green-400', desc: 'LLM analyzed and mapped fields automatically' },
              { status: 'Manual', color: 'text-blue-400', desc: 'You manually specified field paths' },
              { status: 'Mixed', color: 'text-yellow-400', desc: 'Combination of auto-learned and manual overrides' },
              { status: 'None', color: 'text-gray-400', desc: 'No mapping yet — send a test payload to trigger' },
            ].map(item => (
              <div key={item.status} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
                <span className={`font-medium text-sm ${item.color}`}>{item.status}</span>
                <p className="text-xs text-[var(--text-muted)] mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities Marketplace */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">🧩 Capabilities Marketplace</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            Capabilities are modular skill packs your agent can install to gain new abilities — from drafting emails to generating invoices. They live in <strong>Settings → Integrations → Capabilities</strong>.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <span className="font-medium text-sm text-brand-400">20 Seeded Capabilities</span>
              <p className="text-xs text-[var(--text-muted)] mt-1">Across 7 categories: productivity, communication, finance, HR, operations, sales, custom.</p>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <span className="font-medium text-sm text-brand-400">Integration-Gated</span>
              <p className="text-xs text-[var(--text-muted)] mt-1">Some capabilities require a connected integration (email, calendar, CRM, etc.) before install.</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            You can also <strong>create custom capabilities</strong> with your own prompt template, category, and integration requirement. Pricing supports <code className="text-brand-400 text-xs">free</code> and <code className="text-brand-400 text-xs">one_time</code> models.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            📖 Full API reference: see the <a href="/docs/developers#capabilities-api" className="text-brand-400 hover:text-brand-300">Capabilities API</a> section in Developer Docs.
          </p>
        </section>

        {/* Agent API v2 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">🔑 Agent API v2</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            External AI agents can interact with your DiviDen instance via the Agent API. Generate a Bearer
            token in <strong>Settings → API Keys</strong>, then use the <code>/api/v2/*</code> endpoints.
          </p>
          <div className="space-y-2">
            {[
              { method: 'GET/POST', path: '/api/v2/kanban', desc: 'List or create Kanban cards' },
              { method: 'GET/POST', path: '/api/v2/contacts', desc: 'List or create contacts' },
              { method: 'GET/POST', path: '/api/v2/queue', desc: 'List or dispatch queue items' },
              { method: 'GET/POST', path: '/api/v2/docs', desc: 'API documentation (OpenAPI spec)' },
              { method: 'POST', path: '/api/v2/shared-chat/send', desc: 'Send a message to Divi' },
              { method: 'GET', path: '/api/v2/shared-chat/stream', desc: 'Stream Divi\'s response (SSE)' },
            ].map(item => (
              <div key={item.path} className="flex items-center gap-3 p-2 bg-[var(--bg-surface)] rounded border border-[var(--border-primary)]">
                <code className="text-xs font-mono text-brand-400 w-20 shrink-0">{item.method}</code>
                <code className="text-xs font-mono text-green-400 w-52 shrink-0">{item.path}</code>
                <span className="text-xs text-[var(--text-muted)]">{item.desc}</span>
              </div>
            ))}
          </div>
          <pre className="p-3 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)] mt-3">{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  YOUR_DIVIDEN_URL/api/v2/kanban`}</pre>
        </section>

        {/* Federation docs link */}
        <section className="mb-8">
          <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-lg">
            <h2 className="text-lg font-semibold mb-1 text-brand-400">🌐 Federation &amp; Connections</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Looking to connect with other DiviDen instances, self-host the open source version, or build
              an agent that speaks DAWP? See the full
              <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 mx-1 font-medium">Federation Guide →</a>
            </p>
          </div>
        </section>

        {/* Download */}
        <DocFooterDownload filename="dividen-integration-docs" lastUpdated="April 14, 2026" />

        <div className="border-t border-[var(--border-primary)] pt-6 mt-8 text-center text-sm text-[var(--text-muted)]" data-no-download>
          <p>Built by <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">DiviDen</a> — the individual-first operating system</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="/open-source" className="text-brand-400 hover:text-brand-300">Open Source</a>
            <a href="/documentation" className="text-brand-400 hover:text-brand-300">Documentation</a>
            <a href="/docs/developers" className="text-brand-400 hover:text-brand-300">API Reference</a>
            <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">Federation</a>
            <a href="/docs/release-notes" className="text-brand-400 hover:text-brand-300">Changelog</a>
          </div>
        </div>
      </div>
    </div>
  );
}
