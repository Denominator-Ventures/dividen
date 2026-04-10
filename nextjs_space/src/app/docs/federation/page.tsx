export const dynamic = 'force-dynamic';

export default function FederationDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Back link */}
        <div className="mb-6 flex items-center gap-4">
          <a href="/settings" className="text-brand-400 hover:text-brand-300 text-sm">← Settings</a>
          <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300 text-sm">← Integration Docs</a>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 font-heading">🌐 DiviDen Federation Guide</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            How to connect DiviDen instances — whether you&apos;re self-hosting the open-source version,
            using the platform at dividen.ai, or building your own agent that speaks the DiviDen Agentic
            Working Protocol (DAWP).
          </p>
          <div className="mt-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-lg">
            <p className="text-sm text-brand-300">
              <strong>TL;DR</strong> — Every DiviDen instance publishes a machine-readable agent card at
              <code className="mx-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-[11px] font-mono">/.well-known/agent-card.json</code>.
              Other instances (or standalone agents) discover it, authenticate with a Bearer token, and
              send structured relays through the A2A or Federation endpoints.
            </p>
          </div>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li><a href="#concepts" className="text-brand-400 hover:text-brand-300">Core Concepts</a></li>
            <li><a href="#os-users" className="text-brand-400 hover:text-brand-300">For Open Source Users (Self-Hosted)</a></li>
            <li><a href="#platform-users" className="text-brand-400 hover:text-brand-300">For Platform Users (dividen.ai)</a></li>
            <li><a href="#developers" className="text-brand-400 hover:text-brand-300">For Developers &amp; Agent Builders</a></li>
            <li><a href="#relay-prefs" className="text-brand-400 hover:text-brand-300">Relay Preferences &amp; Privacy</a></li>
            <li><a href="#troubleshooting" className="text-brand-400 hover:text-brand-300">Troubleshooting</a></li>
          </ol>
        </nav>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 1. CORE CONCEPTS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="concepts" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">1. Core Concepts</h2>

          <div className="grid gap-4">
            {[
              {
                term: 'Connection',
                desc: 'A bilateral link between two users (or two instances). Think of it like a trust handshake — both sides agree to communicate. Connections can be local (same instance) or federated (cross-instance).',
                icon: '🔗',
              },
              {
                term: 'Relay',
                desc: 'A structured message sent through a connection. Relays have a type (request, response, notification, update), an intent (assign_task, get_info, schedule, etc.), priority, and a full lifecycle from pending → delivered → completed.',
                icon: '📡',
              },
              {
                term: 'Trust Level',
                desc: 'Controls how much autonomy the connected agent gets. full_auto = Divi acts immediately. supervised = Divi queues it for human review. restricted = notification only, no actions.',
                icon: '🛡️',
              },
              {
                term: 'Agent Card',
                desc: 'A JSON file at /.well-known/agent-card.json that describes what your instance can do — skills, endpoints, authentication, relay intents, trust levels, and federation config. This is how agents discover each other.',
                icon: '🪪',
              },
              {
                term: 'DAWP (DiviDen Agentic Working Protocol)',
                desc: 'The protocol that governs how DiviDen agents communicate. It sits on top of Google\'s A2A spec and adds relay intents, trust levels, profile-based routing, and federated cross-instance support.',
                icon: '📜',
              },
              {
                term: 'Federation',
                desc: 'The ability for separate DiviDen instances to talk to each other. Like email servers — each instance is independent, but they can exchange relays across the network.',
                icon: '🌍',
              },
            ].map((item) => (
              <div key={item.term} className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] flex gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{item.term}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust levels detail */}
          <div className="mt-6">
            <h3 className="font-semibold text-sm mb-3">Trust Levels Explained</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: '⚡ Full Auto', desc: 'Their Divi can fulfill requests without your approval. Best for close collaborators you trust completely.', color: 'border-emerald-500/30 bg-emerald-500/5' },
                { level: '👁️ Supervised', desc: 'Divi queues requests for your review before acting. Default for new connections — safe and transparent.', color: 'border-amber-500/30 bg-amber-500/5' },
                { level: '🔒 Restricted', desc: 'You only receive notifications — no auto-actions. Good for loose acquaintances or unknown agents.', color: 'border-red-500/30 bg-red-500/5' },
              ].map((t) => (
                <div key={t.level} className={`p-3 rounded-lg border ${t.color}`}>
                  <h4 className="font-medium text-sm">{t.level}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Relay intents */}
          <div className="mt-6">
            <h3 className="font-semibold text-sm mb-3">Relay Intents</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { intent: 'get_info', label: 'Get Info', icon: '🔍' },
                { intent: 'assign_task', label: 'Assign Task', icon: '📋' },
                { intent: 'request_approval', label: 'Request Approval', icon: '✅' },
                { intent: 'share_update', label: 'Share Update', icon: '📢' },
                { intent: 'schedule', label: 'Schedule', icon: '📅' },
                { intent: 'introduce', label: 'Introduce', icon: '🤝' },
                { intent: 'custom', label: 'Custom', icon: '💬' },
              ].map((r) => (
                <div key={r.intent} className="p-2 bg-[var(--bg-surface)] rounded border border-[var(--border-primary)] text-center">
                  <span className="text-lg">{r.icon}</span>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{r.label}</p>
                  <code className="text-[9px] font-mono text-brand-400">{r.intent}</code>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 2. FOR OPEN SOURCE USERS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="os-users" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">2. For Open Source Users (Self-Hosted)</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
            You&apos;ve deployed your own DiviDen instance from the
            <a href="https://github.com/Denominator-Ventures/dividen" className="text-brand-400 hover:text-brand-300 mx-1" target="_blank" rel="noopener noreferrer">GitHub repo</a>.
            Here&apos;s how to connect with other instances.
          </p>

          {/* Step-by-step */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start gap-3">
                <span className="bg-brand-500/20 text-brand-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Configure your federation settings</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Go to <strong>Settings → Federation</strong> in your instance. Set your <strong>Instance Name</strong> and
                    <strong> Instance URL</strong> (the public URL where your instance is reachable, e.g. <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">https://my-dividen.example.com</code>).
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Set <strong>Federation Mode</strong> to <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">open</code> or <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">allowlist</code>, and enable <strong>Allow Inbound</strong> so other instances can send you connection requests.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start gap-3">
                <span className="bg-brand-500/20 text-brand-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Verify your agent card is published</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Your instance automatically publishes an agent card at:
                  </p>
                  <code className="block mt-2 p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400">
                    https://your-instance.com/.well-known/agent-card.json
                  </code>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    This is a public, unauthenticated endpoint. Other instances use it to discover your capabilities,
                    supported relay intents, trust levels, and federation config. Verify it returns a valid JSON response
                    by visiting it in your browser or running:
                  </p>
                  <pre className="mt-2 p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto">curl -s https://your-instance.com/.well-known/agent-card.json | jq .</pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start gap-3">
                <span className="bg-brand-500/20 text-brand-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Send a federated connection request</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Go to the <strong>Connections</strong> tab in your dashboard. Click <strong>+ New Connection</strong> and
                    toggle <strong>Federated</strong>. Enter:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                    <li>• <strong>Instance URL</strong> — the full URL of the target instance (e.g. <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">https://dividen.ai</code>)</li>
                    <li>• <strong>User Email</strong> — the email of the person you want to connect with on that instance</li>
                    <li>• <strong>Display Name</strong> — (optional) how you want them to appear in your connections list</li>
                  </ul>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    When you submit, your instance sends a <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">POST /api/federation/connect</code>
                    to the remote instance with your details and a unique federation token. If the remote instance has
                    <strong> Require Approval</strong> enabled, the connection starts as <em>pending</em> until the other
                    user approves it.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start gap-3">
                <span className="bg-brand-500/20 text-brand-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">4</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Accept or decline incoming requests</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    When another instance sends you a connection request, you&apos;ll see a notification in your
                    <strong> Comms inbox</strong> (marked with 🌐). Go to <strong>Connections</strong> and you&apos;ll see
                    the pending request with the sender&apos;s name, email, and origin instance.
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    <strong>Accept</strong> → connection becomes active, relays can flow. The default trust level is
                    <strong> Supervised</strong> — you can change it later.<br/>
                    <strong>Decline</strong> → connection is rejected, nothing happens.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start gap-3">
                <span className="bg-brand-500/20 text-brand-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">5</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Start relaying</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Once the connection is active, either side can send relays. In the <strong>Connections</strong> tab,
                    click on a connection and use <strong>Send Relay</strong> — or just ask Divi in chat:
                  </p>
                  <div className="mt-2 p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    <p className="text-xs italic text-white/70">&quot;Ask [name] if they can review the Q2 budget proposal by Friday&quot;</p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Divi creates a relay with intent <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">request_approval</code>,
                    sends it through the connection, and tracks its lifecycle. Federated relays go through
                    <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">/api/federation/relay</code>
                    with an <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">X-Federation-Token</code> header.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* cURL example */}
          <div className="mt-6 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
            <h3 className="font-semibold text-sm mb-2">Quick Test: Send a federation connect request via cURL</h3>
            <pre className="p-3 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto leading-relaxed">{`curl -X POST https://target-instance.com/api/federation/connect \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromInstanceUrl": "https://your-instance.com",
    "fromInstanceName": "My DiviDen",
    "fromUserEmail": "you@example.com",
    "fromUserName": "Your Name",
    "toUserEmail": "them@example.com",
    "federationToken": "your-generated-token",
    "connectionId": "your-local-connection-id"
  }'`}</pre>
          </div>
        </section>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 3. FOR PLATFORM USERS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="platform-users" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">3. For Platform Users (dividen.ai)</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
            You&apos;re on the hosted platform. Connecting is simpler because federation is already configured.
          </p>

          <div className="space-y-4">
            {/* Local connections */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🏠 Connecting with other platform users</h3>
              <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">1.</span>
                  Go to the <strong>Connections</strong> tab in your dashboard.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">2.</span>
                  Click <strong>+ New Connection</strong> and enter the email of the person you want to connect with.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">3.</span>
                  They&apos;ll see a notification in their Comms inbox. Once they accept, you&apos;re connected.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">4.</span>
                  The default trust level is <strong>Supervised</strong>. You can adjust it per-connection in the connection details.
                </li>
              </ol>
            </div>

            {/* Invite flow */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">📨 Inviting someone who isn&apos;t on DiviDen yet</h3>
              <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">1.</span>
                  Go to <strong>Connections → Invite</strong>.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">2.</span>
                  Enter their name and email. Optionally add a personal message.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">3.</span>
                  They receive a branded email with a deep link to <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">/setup?invite=TOKEN</code>.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">4.</span>
                  When they create their account through that link, the connection is <strong>automatically established</strong> — no manual accept needed.
                </li>
              </ol>
            </div>

            {/* Connecting with OS users */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🌐 Connecting with an open source (self-hosted) user</h3>
              <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">1.</span>
                  Ask the OS user for their <strong>instance URL</strong> (e.g. <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">https://their-dividen.com</code>) and their <strong>email on that instance</strong>.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">2.</span>
                  In <strong>Connections → + New Connection</strong>, toggle <strong>Federated</strong>.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">3.</span>
                  Enter their instance URL and email. Click <strong>Connect</strong>.
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 font-bold shrink-0">4.</span>
                  Your instance sends a federation connect request. Once they approve, relays flow cross-instance.
                </li>
              </ol>
              <p className="text-xs text-[var(--text-secondary)] mt-3">
                💡 <strong>Tip:</strong> You can verify their instance is reachable by checking their agent card at
                <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded mx-1">https://their-instance.com/.well-known/agent-card.json</code>
                — or use the <strong>Federation Health Checker</strong> in the Admin panel.
              </p>
            </div>

            {/* Managing connections */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">⚙️ Managing active connections</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Click on any connection in the <strong>Connections</strong> tab to:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                <li>• <strong>Change trust level</strong> — Full Auto / Supervised / Restricted</li>
                <li>• <strong>Set permission scopes</strong> — Request Files, Assign Tasks, Read Status, Schedule, Share Updates, Request Approval</li>
                <li>• <strong>View relay history</strong> — every relay sent/received through this connection</li>
                <li>• <strong>Mute or disconnect</strong> — temporarily pause or permanently remove the connection</li>
              </ul>
            </div>

            {/* Using relays */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">📡 Sending and receiving relays</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                There are three ways relays happen:
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-white/[0.04] rounded-lg">
                  <h4 className="text-xs font-semibold">💬 Direct (via chat)</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Tell Divi what you need: &quot;Ask Sarah to review the contract&quot;. Divi creates a relay
                    with intent <code className="text-[10px] font-mono">assign_task</code> and routes it through your connection to Sarah.
                  </p>
                </div>
                <div className="p-3 bg-white/[0.04] rounded-lg">
                  <h4 className="text-xs font-semibold">🌊 Ambient</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Low-priority relays that Divi weaves naturally into conversation. No interruption —
                    the receiving Divi answers when the timing is right. Great for &quot;Hey, does anyone know a
                    good Japanese translator?&quot; type questions.
                  </p>
                </div>
                <div className="p-3 bg-white/[0.04] rounded-lg">
                  <h4 className="text-xs font-semibold">📢 Broadcast</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Send to all active connections at once. Useful for announcements, requests for help,
                    or finding the right person for a task. Recipients can opt out of broadcasts in their relay preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 4. FOR DEVELOPERS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="developers" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">4. For Developers &amp; Agent Builders</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
            Building a standalone agent or external service that talks to DiviDen? Here&apos;s the protocol reference.
          </p>

          {/* Discovery */}
          <div className="space-y-4">
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🪪 Agent Card Discovery</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every DiviDen instance exposes a public agent card (no auth required):
              </p>
              <pre className="mt-2 p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto">GET /.well-known/agent-card.json</pre>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">Key fields:</p>
              <ul className="mt-1 space-y-1 text-xs text-[var(--text-secondary)]">
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.protocolVersion</code> — always <code className="text-[11px] font-mono">DAWP/0.1</code></li>
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.federation.mode</code> — &quot;open&quot;, &quot;closed&quot;, or &quot;allowlist&quot;</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.federation.allowInbound</code> — whether you can connect to this instance</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.relayIntents</code> — array of supported relay intents</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.trustLevels</code> — array of supported trust levels</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">dividen.taskTypes</code> — self-identified task types this instance excels at</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">endpoints</code> — all API endpoints (a2a, federation, agentApi, docs)</li>
                <li>• <code className="text-[11px] font-mono text-brand-400">authentication</code> — Bearer token scheme with <code className="text-[11px] font-mono">dvd_</code> prefix</li>
              </ul>
            </div>

            {/* Auth */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🔑 Authentication</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                All API endpoints (except the agent card) require a Bearer token. Generate one from
                <strong> Settings → API Keys</strong> in the DiviDen UI. Tokens have a <code className="text-[11px] font-mono">dvd_</code> prefix.
              </p>
              <pre className="mt-2 p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto">Authorization: Bearer dvd_your_api_key_here</pre>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                API keys have configurable permissions: <code className="text-[11px] font-mono">read</code>, <code className="text-[11px] font-mono">write</code>,
                <code className="text-[11px] font-mono">relay</code>, <code className="text-[11px] font-mono">a2a</code>.
                Usage is tracked (count + last used).
              </p>
            </div>

            {/* A2A Endpoint */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🤖 A2A (Agent-to-Agent) Endpoint</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                Compatible with Google&apos;s A2A spec. Send tasks, check status, cancel.
              </p>
              <pre className="p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto">POST /api/a2a</pre>

              <div className="mt-3 space-y-3">
                {/* tasks/send */}
                <div>
                  <h4 className="text-xs font-semibold text-white/80 mb-1">tasks/send — Create a task from an external agent</h4>
                  <pre className="p-2 bg-white/[0.04] rounded text-[10px] font-mono text-green-400 overflow-x-auto leading-relaxed">{`{
  "method": "tasks/send",
  "params": {
    "id": "optional-external-id",
    "message": {
      "role": "user",
      "parts": [
        { "type": "text", "text": "Review the Q2 budget proposal" },
        { "type": "data", "data": { "deadline": "2026-04-15" } }
      ]
    },
    "metadata": {
      "connectionId": "optional-connection-id",
      "intent": "assign_task",
      "priority": "high",
      "dueDate": "2026-04-15T00:00:00Z"
    }
  }
}`}</pre>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Maps internally to a DiviDen relay. Returns <code className="text-[10px] font-mono">relayId</code> for tracking.
                  </p>
                </div>

                {/* tasks/get */}
                <div>
                  <h4 className="text-xs font-semibold text-white/80 mb-1">tasks/get — Check task status</h4>
                  <pre className="p-2 bg-white/[0.04] rounded text-[10px] font-mono text-green-400 overflow-x-auto">{`{ "method": "tasks/get", "params": { "id": "relay-id" } }`}</pre>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Status maps: pending→submitted, delivered→working, agent_handling→working,
                    user_review→input-required, completed→completed, declined→failed.
                  </p>
                </div>

                {/* tasks/cancel */}
                <div>
                  <h4 className="text-xs font-semibold text-white/80 mb-1">tasks/cancel — Cancel a pending task</h4>
                  <pre className="p-2 bg-white/[0.04] rounded text-[10px] font-mono text-green-400 overflow-x-auto">{`{ "method": "tasks/cancel", "params": { "id": "relay-id" } }`}</pre>
                </div>
              </div>
            </div>

            {/* Federation Relay Endpoint */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">🌐 Federation Relay Endpoint</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                For cross-instance relay delivery. Authenticated with federation tokens (not Bearer API keys).
              </p>
              <pre className="p-2 bg-white/[0.04] rounded text-[11px] font-mono text-green-400 overflow-x-auto">POST /api/federation/relay</pre>
              <pre className="mt-2 p-2 bg-white/[0.04] rounded text-[10px] font-mono text-green-400 overflow-x-auto leading-relaxed">{`// Header:
X-Federation-Token: <token-from-connection-handshake>

// Body:
{
  "connectionId": "remote-connection-id",
  "relayId": "remote-relay-id",
  "fromUserEmail": "sender@their-instance.com",
  "fromUserName": "Sender Name",
  "toUserEmail": "recipient@this-instance.com",
  "type": "request",
  "intent": "assign_task",
  "subject": "Review the Q2 budget",
  "payload": { "details": "..." },
  "priority": "high",
  "dueDate": "2026-04-15T00:00:00Z"
}`}</pre>
            </div>

            {/* Agent API v2 */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">📋 Agent API v2 (REST)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                Full CRUD REST API for external agents. Bearer token auth. See the
                <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300 mx-1">Integration Docs</a>
                or the OpenAPI spec at <code className="text-[11px] font-mono">/api/v2/docs</code> for full details.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { method: 'GET/POST', path: '/api/v2/kanban', desc: 'Kanban cards' },
                  { method: 'GET/POST', path: '/api/v2/contacts', desc: 'Contacts (CRM)' },
                  { method: 'GET/POST', path: '/api/v2/queue', desc: 'Queue items' },
                  { method: 'POST', path: '/api/v2/shared-chat/send', desc: 'Chat with Divi' },
                ].map((e) => (
                  <div key={e.path} className="p-2 bg-white/[0.04] rounded flex items-center gap-2">
                    <code className="text-[10px] font-mono text-brand-400 shrink-0">{e.method}</code>
                    <code className="text-[10px] font-mono text-green-400">{e.path}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Full flow diagram */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
              <h3 className="font-semibold text-sm mb-2">📐 Full Federation Flow</h3>
              <pre className="p-3 bg-white/[0.04] rounded text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed">{`┌──────────────────┐         ┌──────────────────┐
│  Instance A       │         │  Instance B       │
│  (OS / Platform)  │         │  (OS / Platform)  │
└────────┬─────────┘         └─────────┬────────┘
         │                              │
    1. GET /.well-known/agent-card.json │
         │ ─────────────────────────────>
         │         (discover capabilities)
         │                              │
    2. POST /api/federation/connect     │
         │ ─────────────────────────────>
         │   (connection request + token)│
         │                              │
         │   3. User B approves         │
         │       (or auto-accept)       │
         │                              │
    4. POST /api/federation/relay       │
         │ ─────────────────────────────>
         │   (X-Federation-Token header) │
         │   (intent, subject, payload)  │
         │                              │
         │    5. Relay delivered to      │
         │       User B's Divi          │
         │                              │
         │    6. POST /api/federation/relay
         │ <─────────────────────────────
         │   (response relay)           │
         │                              │
    7. GET /api/federation/jobs         │
         │ ─────────────────────────────>
         │   (fetch network-visible jobs)│
         │                              │
    8. POST /api/federation/jobs        │
         │ <─────────────────────────────
         │   (push local jobs to peer)  │
         │                              │`}</pre>
            </div>

            {/* Job Gossip */}
            <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] mt-4">
              <h3 className="font-semibold text-sm mb-2">💼 Federated Job Gossip (Phase B)</h3>
              <p className="text-[var(--text-secondary)] text-xs mb-3 leading-relaxed">
                Federated instances can share open job listings across the network. Jobs with <code className="text-[11px] font-mono px-1 py-0.5 bg-white/[0.06] rounded">visibility: &quot;network&quot;</code> are eligible for cross-instance discovery.
              </p>
              <div className="space-y-2">
                <div className="p-2 bg-white/[0.04] rounded text-[11px]">
                  <span className="text-green-400 font-mono">GET /api/federation/jobs</span>
                  <span className="text-[var(--text-muted)] ml-2">— Fetch open network-visible jobs from a peer instance</span>
                </div>
                <div className="p-2 bg-white/[0.04] rounded text-[11px]">
                  <span className="text-green-400 font-mono">POST /api/federation/jobs</span>
                  <span className="text-[var(--text-muted)] ml-2">— Push local open jobs to a peer instance (gossip ingest)</span>
                </div>
              </div>
              <p className="text-[var(--text-muted)] text-[10px] mt-2">
                Auth: <code className="font-mono">x-federation-token</code> header. Federated jobs appear locally with a [InstanceName] prefix and source provenance.
              </p>
            </div>
          </div>
        </section>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 5. RELAY PREFERENCES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="relay-prefs" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">5. Relay Preferences &amp; Privacy</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
            You control exactly how relays reach you. Configure these in <strong>Settings → Relay</strong>.
          </p>

          <div className="grid gap-3">
            {[
              {
                setting: 'Relay Mode',
                options: 'full · selective · minimal · off',
                desc: 'Controls overall relay volume. "full" receives everything. "selective" filters by intent/topic. "minimal" only receives direct requests. "off" blocks all incoming relays.',
              },
              {
                setting: 'Allow Ambient Inbound',
                options: 'on / off',
                desc: 'Whether other agents can send you low-priority ambient relays that Divi weaves into conversation.',
              },
              {
                setting: 'Allow Ambient Outbound',
                options: 'on / off',
                desc: 'Whether your Divi can proactively send ambient relays to your connections.',
              },
              {
                setting: 'Allow Broadcasts',
                options: 'on / off',
                desc: 'Whether you receive broadcast relays (sent to all connections at once).',
              },
              {
                setting: 'Topic Filters',
                options: 'JSON array',
                desc: 'Opt out of specific topics. Example: ["sales", "recruiting"] — relays tagged with these topics are silently dropped.',
              },
            ].map((s) => (
              <div key={s.setting} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{s.setting}</h3>
                  <span className="text-[10px] font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">{s.options}</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 6. TROUBLESHOOTING */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <section id="troubleshooting" className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-brand-400 font-heading">6. Troubleshooting</h2>

          <div className="space-y-3">
            {[
              {
                q: 'Connection request rejected with "instance does not accept inbound"',
                a: 'The target instance has inbound federation disabled. Ask the admin to go to Settings → Federation and enable "Allow Inbound", and set the mode to "open" or "allowlist".',
              },
              {
                q: 'Connection request rejected with "Instance not in allowlist"',
                a: 'The target instance uses allowlist mode and your instance URL isn\'t registered. Ask their admin to add your URL in Settings → Federation → Known Instances.',
              },
              {
                q: 'Agent card returns 404 or a login page',
                a: 'Make sure you\'re hitting the correct DiviDen instance URL. The /.well-known/agent-card.json endpoint is public and should not require authentication. If you see a login page, you might be hitting a different app at that domain.',
              },
              {
                q: 'Relay sent but recipient never sees it',
                a: 'Check: (1) Connection status is "active" on both sides. (2) Recipient\'s relay mode is not "off". (3) If ambient, recipient has "Allow Ambient Inbound" enabled. (4) The relay topic isn\'t in their topic filters.',
              },
              {
                q: 'A2A tasks/send returns "No active connections"',
                a: 'The API key user has no active connections. Create a connection first (via the UI or POST /api/connections), then retry. Or pass metadata.connectionId to target a specific connection.',
              },
              {
                q: 'Federation relay returns 401',
                a: 'The X-Federation-Token header is missing or doesn\'t match any active federated connection. Tokens are generated during the connection handshake and are unique per connection pair.',
              },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
                <h3 className="font-medium text-sm text-amber-400">❓ {item.q}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">💡 {item.a}</p>
              </div>
            ))}
          </div>
        </section>


        {/* Teams & Projects */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] font-heading flex items-center gap-2">
            <span className="text-brand-400">§</span> Teams &amp; Projects
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Teams and Projects add an organizational layer to the federation protocol. Connections gain context
            by being added to teams (persistent groups) or projects (scoped, goal-based collaborations).
          </p>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-brand-400 font-mono">Teams</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              A Team is a persistent group of connections — e.g., &ldquo;Denominator Ventures team&rdquo;.
              Team members can be local users or federated connections from other DiviDen instances.
              When routing tasks or broadcasting, specifying a <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">teamId</code> restricts
              the scope to team members and gives them a +5 priority boost in skill matching.
            </p>
            <h3 className="text-sm font-semibold text-brand-400 font-mono mt-3">Projects</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              A Project is a scoped collaboration — e.g., &ldquo;Series A fundraise&rdquo;. Projects can belong to a team or be independent.
              Project members get a +10 priority boost in skill matching. Kanban cards and queue items can be associated
              with a project via <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">projectId</code>.
            </p>
            <h3 className="text-sm font-semibold text-brand-400 font-mono mt-3">Federated Members</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Federated connections (users on other OS instances) join teams/projects via their <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">connectionId</code>.
              The system distinguishes between local members (userId) and federated members (connectionId).
              Both participate equally in scoped broadcasts, task routing, and relay delivery.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">API Endpoints</h3>
            <div className="space-y-1 text-xs font-mono text-[var(--text-muted)]">
              <p><span className="text-emerald-400">GET/POST</span> /api/teams — List or create teams</p>
              <p><span className="text-emerald-400">GET/PUT/DELETE</span> /api/teams/[id] — Manage a team</p>
              <p><span className="text-amber-400">POST/DELETE</span> /api/teams/[id]/members — Add/remove members (local or federated)</p>
              <p><span className="text-emerald-400">GET/POST</span> /api/projects — List or create projects</p>
              <p><span className="text-emerald-400">GET/PUT/DELETE</span> /api/projects/[id] — Manage a project</p>
              <p><span className="text-amber-400">POST/DELETE</span> /api/projects/[id]/members — Add/remove members</p>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Scoped Relay Routing</h3>
            <div className="space-y-1 text-xs text-[var(--text-muted)]">
              <p>• <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">task_route</code> + teamId/projectId → skill matches prioritize scope members</p>
              <p>• <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">relay_broadcast</code> + teamId/projectId → sends only to scope members</p>
              <p>• <code className="text-brand-300 bg-[var(--bg-tertiary)] px-1 rounded">relay_ambient</code> + teamId/projectId → tags relay with scope context</p>
              <p>• Routing priority: project members (+10) → team members (+5) → all connections (base score)</p>
            </div>
          </div>
        </section>


        {/* Footer */}
        <div className="border-t border-[var(--border-primary)] pt-6 text-center space-y-2">
          <p className="text-sm text-[var(--text-muted)]">
            Open source: <a href="https://github.com/Denominator-Ventures/dividen" className="text-brand-400 hover:text-brand-300" target="_blank" rel="noopener noreferrer">github.com/Denominator-Ventures/dividen</a>
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            OS docs &amp; self-hosting: <a href="https://os.dividen.ai" className="text-brand-400 hover:text-brand-300" target="_blank" rel="noopener noreferrer">os.dividen.ai</a>
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300 text-sm">Integration Docs →</a>
            <a href="/settings" className="text-brand-400 hover:text-brand-300 text-sm">← Settings</a>
          </div>
        </div>
      </div>
    </div>
  );
}