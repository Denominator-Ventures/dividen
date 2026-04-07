export const dynamic = 'force-dynamic';

export default function IntegrationDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <a href="/settings" className="text-brand-400 hover:text-brand-300 text-sm">
            ← Back to Settings
          </a>
        </div>

        <h1 className="text-3xl font-bold mb-2">🔗 DiviDen Integration Guide</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Connect any external service to DiviDen using webhooks and API keys.
        </p>

        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-brand-400">Overview</h2>
          <p className="text-[var(--text-secondary)] mb-3">
            DiviDen uses a <strong>webhook-first</strong> integration approach. Instead of complex OAuth flows,
            connect external services by creating webhook endpoints that receive data from platforms like
            Zapier, Make (Integromat), n8n, or direct API calls.
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

        <div className="border-t border-[var(--border-primary)] pt-6 text-center text-sm text-[var(--text-muted)]">
          <p>Open source: <a href="https://github.com/Denominator-Ventures/dividen" className="text-brand-400 hover:text-brand-300">github.com/Denominator-Ventures/dividen</a></p>
          <a href="/settings" className="text-brand-400 hover:text-brand-300 mt-2 inline-block">
            ← Back to Settings
          </a>
        </div>
      </div>
    </div>
  );
}
