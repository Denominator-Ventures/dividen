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
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
            <h3 className="font-medium mb-2">Quick Start</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)]">
              <li>Go to <strong>Settings → Integrations</strong></li>
              <li>Click <strong>+ New Webhook</strong> and choose a type</li>
              <li>Copy the webhook URL and secret</li>
              <li>Configure your external service to POST data to the URL</li>
              <li>DiviDen automatically creates tasks, contacts, and cards</li>
            </ol>
          </div>
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
              <div key={item.type} className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
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
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium text-sm">Query Parameter (Simplest)</h3>
              <code className="text-xs text-green-400 block mt-1">
                POST /api/webhooks/calendar?webhookId=ID&secret=YOUR_SECRET
              </code>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium text-sm">Header-Based Secret</h3>
              <code className="text-xs text-green-400 block mt-1">
                X-Webhook-Secret: YOUR_SECRET
              </code>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
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
              <pre className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
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
              <pre className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
  "from": { "name": "Jane Doe", "email": "jane@example.com" },
  "subject": "Project Update",
  "body": "Hi, here is the latest update..."
}`}</pre>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-1">📝 Meeting Transcript</h3>
              <pre className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
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
              <pre className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`{
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
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-medium">Google Calendar → DiviDen</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)] mt-2">
                <li>Trigger: Google Calendar → New Event</li>
                <li>Action: Webhooks by Zapier → POST</li>
                <li>URL: Your DiviDen calendar webhook URL</li>
                <li>Map: summary, description, start.dateTime, end.dateTime, attendees</li>
              </ol>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
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
          <pre className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)]">{`curl -X POST "YOUR_WEBHOOK_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "summary": "Test Meeting",
    "start": {"dateTime": "2025-01-15T10:00:00Z"},
    "attendees": [{"email": "test@example.com"}]
  }'`}</pre>
        </section>

        <div className="border-t border-[var(--border-primary)] pt-6 text-center text-sm text-[var(--text-muted)]">
          <p>Full documentation available at <code>docs/integrations.md</code> in the project root.</p>
          <a href="/settings" className="text-brand-400 hover:text-brand-300 mt-2 inline-block">
            ← Back to Settings
          </a>
        </div>
      </div>
    </div>
  );
}
