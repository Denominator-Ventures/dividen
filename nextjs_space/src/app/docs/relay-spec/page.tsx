export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { DocFooterDownload } from '@/components/docs/DocFooterDownload';

export const metadata: Metadata = {
  title: 'Relay Protocol Specification',
  description: 'Complete specification for the DiviDen Relay Protocol — implementation reference for FVP and federated instance teams.',
  openGraph: {
    title: 'DiviDen Relay Protocol Specification v2.3.0',
    description: 'End-to-end implementation reference for federated relay exchange between DiviDen instances.',
    images: [{ url: '/api/og?title=Relay+Protocol+Spec&subtitle=v2.3.0+Implementation+Reference&tag=docs', width: 1200, height: 630 }],
  },
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-white/[0.06]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-4 overflow-x-auto text-[12px] font-mono text-[var(--text-secondary)] mb-4 leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[11px] font-mono">{children}</code>;
}

function Endpoint({ method, path, description, auth }: { method: string; path: string; description: string; auth?: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    PATCH: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex-shrink-0 ${colors[method] || 'bg-gray-500/20 text-gray-400'}`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm text-[var(--text-primary)] font-mono">{path}</code>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      {auth && <span className="text-[10px] text-[var(--text-muted)] bg-white/[0.04] rounded px-1.5 py-0.5 flex-shrink-0">{auth}</span>}
    </div>
  );
}

function Note({ kind = 'info', children }: { kind?: 'info' | 'warning' | 'success' | 'danger'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-brand-500/5 border-brand-500/20 text-brand-300',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-300',
    success: 'bg-green-500/5 border-green-500/20 text-green-300',
    danger: 'bg-red-500/5 border-red-500/20 text-red-300',
  };
  return (
    <div className={`p-4 border rounded-lg mb-4 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}

function FieldRow({ name, type, required, description }: { name: string; type: string; required?: boolean; description: string }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2 pr-4 align-top">
        <Inline>{name}</Inline>
        {required && <span className="ml-1 text-[10px] text-red-400">*</span>}
      </td>
      <td className="py-2 pr-4 align-top text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">{type}</td>
      <td className="py-2 text-xs text-[var(--text-secondary)] leading-relaxed">{description}</td>
    </tr>
  );
}

function FieldTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Field</th>
            <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Type</th>
            <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function RelaySpecPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-6 sm:p-8" data-doc-content id="relay-spec-content">

        {/* Back links */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <a href="/documentation" className="text-brand-400 hover:text-brand-300 text-sm">← Documentation</a>
          <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 text-sm">Federation Guide</a>
          <a href="/docs/developers" className="text-brand-400 hover:text-brand-300 text-sm">API Reference</a>
          <a href="/api/v2/docs" className="text-brand-400 hover:text-brand-300 text-sm">OpenAPI Spec</a>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300">SPEC</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300">v2.3.0</span>
            <span className="text-xs text-[var(--text-muted)]">Last updated: April 18, 2026</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 font-heading">📡 Relay Protocol Specification</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            Complete implementation reference for the DiviDen Relay Protocol. This document is the source of truth
            for any federated instance (FVP, third-party, or self-hosted) implementing cross-instance relay exchange.
            It covers every endpoint, field, state, edge case, and expectation.
          </p>
          <Note kind="info">
            <strong>Audience:</strong> Engineering teams at FVP and other outside instances integrating with the DiviDen federation layer.
            If you are a user or a platform operator, see the <a href="/docs/federation" className="underline">Federation Guide</a> instead.
          </Note>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm columns-1 sm:columns-2">
            <li><a href="#overview" className="text-brand-400 hover:text-brand-300">Overview &amp; Vocabulary</a></li>
            <li><a href="#handshake" className="text-brand-400 hover:text-brand-300">Connection Handshake</a></li>
            <li><a href="#model" className="text-brand-400 hover:text-brand-300">Relay Data Model</a></li>
            <li><a href="#types" className="text-brand-400 hover:text-brand-300">Relay Types &amp; Intents</a></li>
            <li><a href="#lifecycle" className="text-brand-400 hover:text-brand-300">Lifecycle &amp; Statuses</a></li>
            <li><a href="#endpoints" className="text-brand-400 hover:text-brand-300">Endpoints</a></li>
            <li><a href="#inbound" className="text-brand-400 hover:text-brand-300">Inbound Relay (receive)</a></li>
            <li><a href="#ack" className="text-brand-400 hover:text-brand-300">Relay Ack (completion)</a></li>
            <li><a href="#outbound" className="text-brand-400 hover:text-brand-300">Outbound (send)</a></li>
            <li><a href="#ambient" className="text-brand-400 hover:text-brand-300">Ambient Protocol</a></li>
            <li><a href="#threading" className="text-brand-400 hover:text-brand-300">Threading &amp; Continuity</a></li>
            <li><a href="#attachments" className="text-brand-400 hover:text-brand-300">Attachments</a></li>
            <li><a href="#tasks" className="text-brand-400 hover:text-brand-300">Task Intent → Kanban</a></li>
            <li><a href="#idempotency" className="text-brand-400 hover:text-brand-300">Idempotency &amp; Loop Prevention</a></li>
            <li><a href="#dismiss" className="text-brand-400 hover:text-brand-300">Dismissal</a></li>
            <li><a href="#sender" className="text-brand-400 hover:text-brand-300">Sender Identity</a></li>
            <li><a href="#preferences" className="text-brand-400 hover:text-brand-300">Recipient Preferences</a></li>
            <li><a href="#errors" className="text-brand-400 hover:text-brand-300">Error Semantics</a></li>
            <li><a href="#checklist" className="text-brand-400 hover:text-brand-300">Implementation Checklist</a></li>
            <li><a href="#versioning" className="text-brand-400 hover:text-brand-300">Versioning &amp; Compatibility</a></li>
          </ol>
        </nav>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 1. OVERVIEW */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="overview" title="1. Overview & Vocabulary">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            A <strong>Relay</strong> is a structured, user-scoped message exchanged between two connected DiviDen instances.
            It is the core A2A (agent-to-agent) primitive. Every relay belongs to a <Inline>Connection</Inline>, carries a
            <Inline>type</Inline> and <Inline>intent</Inline>, moves through a defined lifecycle, and may be part of a
            multi-turn <Inline>thread</Inline>.
          </p>

          <FieldTable>
            <FieldRow name="Connection" type="resource" description="A bilateral, federated link between two users on different instances. Holds the shared federationToken used to authenticate relays." />
            <FieldRow name="Relay" type="resource" description="The message itself — has type, intent, subject, payload, priority, status, threadId." />
            <FieldRow name="Instance" type="server" description="A running deployment (dividen.ai, fvp.app, self-hosted)." />
            <FieldRow name="peerRelayId" type="string" description="The relay ID on the REMOTE instance. Each side stores the other side's ID for correlation." />
            <FieldRow name="threadId" type="string" description="The root relay ID that identifies a conversation across instances." />
            <FieldRow name="Ambient" type="modifier" description="A low-priority relay mode designed to be woven into conversation rather than interrupt. See §10." />
            <FieldRow name="Direct" type="modifier" description="Non-ambient relay. Surfaces immediately in the operator's comms." />
            <FieldRow name="Federation Token" type="secret" description="A shared secret established during handshake. Sent as x-federation-token header on every relay." />
          </FieldTable>

          <Note kind="info">
            <strong>Core invariant:</strong> The sending instance OWNS the relay lifecycle. The receiving instance accepts,
            delivers to its operator, and acks back. Status on the sender's side is the canonical truth. Responses flow
            back via <Inline>/api/federation/relay-ack</Inline>.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 2. HANDSHAKE */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="handshake" title="2. Connection Handshake">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            Before any relay can flow, both instances must share an active <Inline>Connection</Inline> and a
            <Inline>federationToken</Inline>. The handshake is two legs:
          </p>

          <SubSection title="2.1  Initiation (outbound)">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              When a user on instance <strong>A</strong> requests a connection to a user on instance <strong>B</strong>, instance A:
            </p>
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-1 mb-4 pl-2">
              <li>Generates a random <Inline>federationToken</Inline> (at least 32 bytes of entropy).</li>
              <li>Stores a local <Inline>Connection</Inline> row with <Inline>status=&quot;pending&quot;</Inline>, <Inline>isFederated=true</Inline>.</li>
              <li>POSTs to instance B&apos;s <Inline>/api/federation/connect</Inline>.</li>
            </ol>
            <Code>{`POST https://{peer-instance}/api/federation/connect
Content-Type: application/json

{
  "fromInstanceUrl": "https://dividen.ai",
  "fromInstanceName": "DiviDen",
  "fromUserEmail": "alice@dividen.ai",
  "fromUserName": "Alice",
  "toUserEmail": "bob@fvp.app",
  "federationToken": "<random-secret-at-least-32-bytes>",
  "connectionId": "<local-connection-cuid>"
}`}</Code>
          </SubSection>

          <SubSection title="2.2  Acceptance callback (inbound)">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              When instance B auto-approves (or when user B manually accepts later), B POSTs to A&apos;s
              <Inline>/api/federation/connect/accept</Inline>:
            </p>
            <Code>{`POST https://{sender-instance}/api/federation/connect/accept
Content-Type: application/json
X-Federation-Token: <token-from-step-2.1>

{
  "connectionId": "<local-connection-id-on-B>",
  "acceptedByEmail": "bob@fvp.app",
  "acceptedByName": "Bob",
  "instanceUrl": "https://fvp.app"
}`}</Code>
            <p className="text-sm text-[var(--text-secondary)]">
              After this callback, both sides have <Inline>status=&quot;active&quot;</Inline> and may exchange relays.
            </p>
          </SubSection>

          <Note kind="warning">
            Instances MUST store the peer&apos;s <Inline>federationToken</Inline> and validate it on every inbound request via the
            <Inline>x-federation-token</Inline> header. Tokens are per-connection, not per-user or per-instance.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 3. DATA MODEL */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="model" title="3. Relay Data Model">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            Each instance persists relays in its own database. The canonical DiviDen schema (Prisma) is below.
            External implementations MUST preserve the semantics of every field, but are free to use whatever
            storage engine they prefer.
          </p>
          <Code>{`model AgentRelay {
  id              String    @id       // cuid or uuid — local-only
  connectionId    String              // FK to Connection
  fromUserId      String              // Sender (local user or placeholder for federated inbound)
  toUserId        String?             // Recipient (local user, null if unrouted)
  direction       String              // "outbound" | "inbound"

  type            String              // "request" | "response" | "notification" | "update"
  intent          String              // See §4
  subject         String              // Human-readable one-liner
  payload         String?             // JSON string — structured data

  status          String              // See §5
  priority        String              // "urgent" | "normal" | "low"
  dueDate         DateTime?
  resolvedAt      DateTime?
  responsePayload String?             // JSON string — reply data

  threadId        String?             // Root relay ID for multi-turn threads (§11)
  parentRelayId   String?             // Direct parent relay

  artifactType    String?             // "text"|"code"|"document"|"data"|"contact_card"|"calendar_invite"|"email_draft"
  artifacts       String?             // JSON array of typed artifact objects

  peerRelayId     String?             // Relay ID on the REMOTE instance (correlation key)
  peerInstanceUrl String?             // Remote instance base URL

  queueItemId     String?             // Optional bridge to local task queue
  cardId          String?             // Optional Kanban card this relay operates on
  teamId          String?
  projectId       String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}`}</Code>
          <Note kind="info">
            <strong>Correlation key:</strong> <Inline>(connectionId, peerRelayId)</Inline> uniquely identifies a relay across
            instances. This pair is used for idempotency (§14) and for ack routing.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 4. TYPES & INTENTS */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="types" title="4. Relay Types & Intents">
          <SubSection title="4.1  Type">
            <FieldTable>
              <FieldRow name="request" type="string" description="Default. Asks the recipient to do something or provide information. Expects an ack + eventual response." />
              <FieldRow name="response" type="string" description="A reply to a previous relay. parentRelayId MUST be set." />
              <FieldRow name="notification" type="string" description="One-way message. No response expected, but ack still returned." />
              <FieldRow name="update" type="string" description="State change on a shared card or thread. Usually followed by a card-update webhook." />
            </FieldTable>
          </SubSection>

          <SubSection title="4.2  Intent">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Intent is the semantic purpose of the relay. Senders SHOULD use one of the known values; receivers MUST tolerate unknown intents
              by treating them as <Inline>custom</Inline>.
            </p>
            <FieldTable>
              <FieldRow name="get_info" type="string" description="Ask the peer for a piece of information. Short-form response expected." />
              <FieldRow name="assign_task" type="string" description="Delegate a task. Receiver SHOULD create a Kanban card (§13)." />
              <FieldRow name="delegate" type="string" description="Alias for assign_task with stronger ownership transfer semantics." />
              <FieldRow name="request_approval" type="string" description="Request go/no-go sign-off on a decision." />
              <FieldRow name="share_update" type="string" description="Informational status share. Often used with ambient mode." />
              <FieldRow name="schedule" type="string" description="Propose a meeting or time slot. Triggers calendar intent on the peer." />
              <FieldRow name="introduce" type="string" description="Introduce a contact OR invite someone into a scoped workspace (project, team). Payload includes a contact_card OR a {kind:'project_invite'} block (v2.3.1)." />
              <FieldRow name="ask" type="string" description="(v2.2.0) Open-ended question, often ambient." />
              <FieldRow name="opinion" type="string" description="(v2.2.0) Solicit a judgement or review." />
              <FieldRow name="note" type="string" description="(v2.2.0) Drop a quiet note — lowest priority ambient." />
              <FieldRow name="intro" type="string" description="(v2.2.0) Informal intro variant of `introduce`." />
              <FieldRow name="custom" type="string" description="Catch-all. Receiver treats the subject + payload as free text." />
            </FieldTable>
          </SubSection>

          <SubSection title="4.3  Project invite sub-payload (v2.3.1)">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Project invites use <Inline>intent=&apos;introduce&apos;</Inline> with a structured payload. This allows a receiver
              that knows about projects to surface it as a real invite (bell count, queue item, dashed avatar on card, Accept/Decline
              buttons) while still degrading gracefully on a receiver that only understands <Inline>introduce</Inline> as a generic contact intro.
            </p>
            <Code>{`{
  "relayType": "request",
  "intent": "introduce",
  "direction": "outbound",
  "status": "delivered",
  "subject": "Invite to \\"Q3 Rebrand\\"",
  "payload": {
    "kind": "project_invite",
    "inviteId": "cmp_xyz",
    "projectId": "proj_abc",
    "projectName": "Q3 Rebrand",
    "role": "contributor",
    "message": "Optional note from inviter",
    "inviterName": "Jon Bradford"
  }
}`}</Code>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Receivers SHOULD treat <Inline>payload.kind === &apos;project_invite&apos;</Inline> as the canonical invite discriminator and
              mirror the same record set (<Inline>ProjectInvite</Inline>, <Inline>QueueItem</Inline>, <Inline>CommsMessage</Inline>) locally
              when ingested. The invite is accepted or declined via <Inline>PATCH /api/project-invites</Inline> with
              <Inline>{`{ inviteId, action }`}</Inline>.
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Senders MUST enforce uniqueness — a duplicate <Inline>POST /api/projects/[id]/invite</Inline> returns
              <Inline>409 {`{ code: 'ALREADY_INVITED', inviteId }`}</Inline>. To deliberately rotate a stale invite, resend with
              <Inline>{`{ force: true }`}</Inline> in the body; the old invite + queue item + relay + comms message are cancelled and
              a fresh set is created. The response surfaces <Inline>replacedInviteId</Inline> so downstream listeners can reconcile.
            </p>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 5. LIFECYCLE */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="lifecycle" title="5. Lifecycle & Statuses">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            A relay moves through a deterministic state machine. Each side tracks its own status independently; the sender&apos;s
            status is authoritative and advanced by ack callbacks.
          </p>
          <Code>{`Sender side                        Receiver side
===========                        =============

  (create)                              
     ↓                                  
  pending  ────(push)───→  POST /api/federation/relay
     ↓                            ↓
  (200 ack)                   delivered
     ↓                            ↓
  delivered                   (user/agent acts)
     ↓                            ↓
  (wait for ack-back)         completed | declined
     ↓                            ↓
  completed|declined  ←──(ack)──  POST /api/federation/relay-ack
     ↓
  resolvedAt set
  queueItem → done_today (if linked)
  checklist → updated
  webhook emitted`}</Code>

          <FieldTable>
            <FieldRow name="pending" type="status" description="Created locally, not yet pushed (or push in flight)." />
            <FieldRow name="delivered" type="status" description="Remote instance acknowledged receipt (HTTP 200 from /api/federation/relay)." />
            <FieldRow name="agent_handling" type="status" description="(Optional) Recipient's agent is actively working on the relay." />
            <FieldRow name="user_review" type="status" description="(Optional) Awaiting recipient operator approval." />
            <FieldRow name="completed" type="status" description="Terminal. Receiver completed the task. resolvedAt set." />
            <FieldRow name="declined" type="status" description="Terminal. Receiver declined (or sender dismissed). resolvedAt set." />
            <FieldRow name="expired" type="status" description="Terminal. Passed dueDate without resolution. Sender may retry." />
          </FieldTable>

          <Note kind="warning">
            <strong>Idempotency rule:</strong> Once a relay reaches <Inline>delivered</Inline>, <Inline>completed</Inline>, or
            <Inline>declined</Inline> on the sender side, it MUST NOT be pushed again. See §14.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 6. ENDPOINTS SUMMARY */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="endpoints" title="6. Endpoints">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            All federation endpoints live under <Inline>/api/federation/*</Inline>. The v2 namespace at <Inline>/api/v2/relay</Inline>
            exists as a proxy for instances advertising <Inline>v2Relay</Inline> capability — it forwards identically.
          </p>
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Inbound (your instance exposes these)</h4>
            <Endpoint method="POST" path="/api/federation/connect" description="Receive a connection handshake request" auth="body.federationToken" />
            <Endpoint method="POST" path="/api/federation/connect/accept" description="Receive the acceptance callback from a peer" auth="x-federation-token" />
            <Endpoint method="POST" path="/api/federation/relay" description="Receive a relay from a peer" auth="x-federation-token" />
            <Endpoint method="POST" path="/api/federation/relay-ack" description="Receive a completion/response ack from a peer" auth="x-federation-token" />
            <Endpoint method="POST" path="/api/v2/relay" description="v2 alias — proxies to /api/federation/relay" auth="x-federation-token" />
            <Endpoint method="POST" path="/api/federation/card-update" description="(optional) Receive Kanban card state changes for mirrored cards" auth="x-federation-token" />
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Outbound (your instance calls peers)</h4>
            <Endpoint method="POST" path="{peer}/api/federation/relay" description="Push a relay to a peer" />
            <Endpoint method="POST" path="{peer}/api/federation/relay-ack" description="Send completion/response back to originator" />
            <Endpoint method="POST" path="{peer}/api/federation/card-update" description="Notify peer of Kanban card state change" />
          </div>

          <Note kind="info">
            <strong>Auth header:</strong> All inbound relays are authenticated by <Inline>x-federation-token: &lt;per-connection-secret&gt;</Inline>.
            Reject with HTTP 401 if missing, 404 if token does not map to an active connection.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 7. INBOUND RELAY */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="inbound" title="7. Inbound Relay — POST /api/federation/relay">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            The recipient instance exposes this endpoint. It receives, validates, persists, and surfaces the relay to the operator.
          </p>

          <SubSection title="7.1  Request headers">
            <FieldTable>
              <FieldRow name="Content-Type" type="string" required description="application/json" />
              <FieldRow name="x-federation-token" type="string" required description="Per-connection shared secret established during handshake." />
            </FieldTable>
          </SubSection>

          <SubSection title="7.2  Request body">
            <FieldTable>
              <FieldRow name="connectionId" type="string" required description="Sender's local connection ID (echoed back for logging/diagnostics — NOT used for auth)." />
              <FieldRow name="relayId" type="string" required description="Sender's local relay ID. Stored by the receiver as `peerRelayId` for correlation." />
              <FieldRow name="fromUserEmail" type="string" required description="Sender's email on the originating instance. Used for display + sender identity persistence." />
              <FieldRow name="fromUserName" type="string" description="Sender's display name." />
              <FieldRow name="toUserEmail" type="string" required description="Recipient's email on THIS instance. If no local user matches, receiver routes to the connection owner (fallback)." />
              <FieldRow name="type" type="string" description="See §4.1. Default: `request`." />
              <FieldRow name="intent" type="string" description="See §4.2. Default: `custom`." />
              <FieldRow name="subject" type="string" required description="One-line human-readable summary (becomes card title, comms prefix, etc)." />
              <FieldRow name="payload" type="object | string" description="Structured data. Object OR JSON-encoded string (receiver normalizes)." />
              <FieldRow name="priority" type="string" description="`urgent` | `normal` | `low`. Default: `normal` (or `low` if ambient)." />
              <FieldRow name="dueDate" type="ISO8601" description="Optional deadline." />
              <FieldRow name="threadId" type="string" description="Shared thread root. See §11." />
              <FieldRow name="parentRelayId" type="string" description="Sender's ID of the parent relay. Receiver maps this to its local parent via peerRelayId." />
              <FieldRow name="attachments" type="array" description="Up to 10 attachment objects. Can also be nested inside payload.attachments. See §12." />
              <FieldRow name="callbackUrl" type="URL" description="Sender's `/api/federation/relay-ack` URL. Receiver uses this to push back completion acks." />
            </FieldTable>
          </SubSection>

          <SubSection title="7.3  Payload conventions">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              The <Inline>payload</Inline> field is free-form JSON, but DiviDen reserves these underscore-prefixed keys for
              cross-instance metadata. Receivers MUST preserve them on round-trips.
            </p>
            <FieldTable>
              <FieldRow name="_ambient" type="boolean" description="If true, relay is ambient mode (§10). Routes silently, surfaces via weaving not notification." />
              <FieldRow name="_context" type="string" description="Conversational context that prompted the relay. Helps the receiving agent weave naturally." />
              <FieldRow name="_topic" type="string" description="Topic tag. Used by recipient topic filters to opt out." />
              <FieldRow name="_instruction" type="string" description="Optional directive for how the receiving agent should handle the relay." />
              <FieldRow name="_sender" type="object" description="Receiver POPULATES this on ingestion with {name,email,instanceUrl,connectionId,isFederated:true} so the local agent can resolve sender identity without a local user row. Senders SHOULD NOT set this." />
              <FieldRow name="attachments" type="array" description="Alternative location for attachment list (§12)." />
            </FieldTable>
          </SubSection>

          <SubSection title="7.4  Response">
            <p className="text-sm text-[var(--text-secondary)] mb-3">Always HTTP 200 on accepted relays. Use fields to signal routing outcomes:</p>
            <Code>{`// Normal accept
{
  "success": true,
  "relayId": "clx...",          // receiver's local relay ID (sender stores as peerRelayId)
  "ambient": false,
  "cardId": null,               // populated if task intent → Kanban
  "threadId": "clx...",         // echoed so sender can thread
  "parentRelayId": null,
  "attachmentCount": 0,
  "fallback": false             // true if toUserEmail had no match, routed to connection owner
}

// Idempotent duplicate
{ "success": true, "duplicate": true, "relayId": "clx..." }

// Ambient silently filtered by recipient preferences
{ "ok": true, "filtered": true, "reason": "quiet_hours" }`}</Code>
          </SubSection>

          <SubSection title="7.5  Processing order (reference implementation)">
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li>Validate <Inline>x-federation-token</Inline> against an <Inline>active</Inline> connection. 401/404 on failure.</li>
              <li>Check <Inline>FederationConfig.allowInbound</Inline>. 403 if disabled.</li>
              <li><strong>Idempotency:</strong> if <Inline>(peerRelayId, connectionId)</Inline> already exists, return early with <Inline>duplicate:true</Inline>.</li>
              <li>Normalize payload (string → object), clamp attachments to 10.</li>
              <li>Populate <Inline>payload._sender</Inline> with sender identity.</li>
              <li>Detect ambient via <Inline>payload._ambient</Inline> or <Inline>(intent=&quot;share_update&quot; && priority=&quot;low&quot;)</Inline>.</li>
              <li>Resolve recipient (<Inline>toUserEmail</Inline> → local user; fallback to connection requester).</li>
              <li>If ambient, run gating (§10) — silently filter on block.</li>
              <li>Resolve thread + parent via <Inline>peerRelayId</Inline> lookup.</li>
              <li>Create <Inline>AgentRelay</Inline> row with <Inline>status=&quot;delivered&quot;</Inline>.</li>
              <li>If task intent (§13), create Kanban card in <Inline>leads</Inline> column.</li>
              <li>Post a <Inline>CommsMessage</Inline> (ambient: 🌊 low priority auto-read; direct: 🌐 new).</li>
              <li>Log activity.</li>
              <li>Respond 200 with receiver&apos;s <Inline>relayId</Inline> and <Inline>threadId</Inline>.</li>
            </ol>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 8. ACK */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="ack" title="8. Relay Ack — POST /api/federation/relay-ack">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            When the receiving operator (or agent) acts on a relay — completing it, responding, or declining — the receiver pushes
            the outcome back to the sender via this endpoint. This is how the sender closes the loop.
          </p>

          <SubSection title="8.1  Request body">
            <FieldTable>
              <FieldRow name="relayId" type="string" required description="The ORIGINATING instance's relay ID (what the sender called `relayId` in §7.2 — receiver has it stored as `peerRelayId`). This is the ID the sender will look up locally." />
              <FieldRow name="localRelayId" type="string" description="The receiver's own relay ID (informational, for debugging)." />
              <FieldRow name="status" type="string" required description="`completed` | `declined` — terminal state." />
              <FieldRow name="responsePayload" type="string | object" description="The reply content. Can be string or JSON." />
              <FieldRow name="subject" type="string" description="(Optional) updated subject line for display." />
              <FieldRow name="timestamp" type="ISO8601" description="When the status changed on the receiver side." />
            </FieldTable>
          </SubSection>

          <SubSection title="8.2  Sender-side effects">
            <p className="text-sm text-[var(--text-secondary)] mb-3">On ack receipt, the sender instance:</p>
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li>Updates relay <Inline>status</Inline>, <Inline>responsePayload</Inline>, <Inline>resolvedAt</Inline>.</li>
              <li>Logs <Inline>federation_relay_completed</Inline> activity.</li>
              <li>Posts a <Inline>CommsMessage</Inline> to the operator summarizing the outcome.</li>
              <li>If the relay was linked to a queue item, advances it to <Inline>done_today</Inline>.</li>
              <li>If a checklist item was linked, flips <Inline>delegationStatus</Inline> and <Inline>completed</Inline>.</li>
              <li>Emits a <Inline>relay.state_changed</Inline> webhook to local subscribers.</li>
            </ol>
          </SubSection>

          <Note kind="warning">
            The <strong>receiver is responsible for pushing this ack</strong> — the sender never polls. If the receiver fails to
            push (network blip), the relay stays <Inline>delivered</Inline> on the sender side. The receiver SHOULD retry with
            exponential backoff.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 9. OUTBOUND */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="outbound" title="9. Outbound (Sending a Relay)">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            To send a relay TO a peer, POST to their <Inline>/api/federation/relay</Inline> endpoint. The DiviDen reference
            implementation (<Inline>pushRelayToFederatedInstance</Inline>) encodes all the guarantees below; mirror them.
          </p>

          <SubSection title="9.1  Pre-push checks (MANDATORY)">
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li>Load the local relay row.</li>
              <li>If <Inline>peerRelayId</Inline> is already set, OR status is <Inline>delivered</Inline>|<Inline>completed</Inline>|<Inline>declined</Inline>, <strong>SKIP</strong> the push. This prevents duplicate delivery (§14).</li>
              <li>Verify the connection is <Inline>isFederated=true</Inline>, <Inline>status=&quot;active&quot;</Inline>, and has a <Inline>federationToken</Inline>.</li>
            </ol>
          </SubSection>

          <SubSection title="9.2  Request">
            <Code>{`POST https://{peer}/api/federation/relay
Content-Type: application/json
x-federation-token: <connection.federationToken>

{
  "connectionId":  "<sender-local-connection-id>",
  "relayId":       "<sender-local-relay-id>",
  "fromUserEmail": "alice@dividen.ai",
  "fromUserName":  "Alice",
  "toUserEmail":   "bob@fvp.app",
  "type":          "request",
  "intent":        "assign_task",
  "subject":       "Draft the Q2 briefing",
  "priority":      "normal",
  "dueDate":       "2026-04-25T17:00:00Z",
  "threadId":      "<thread-root-id-if-continuing>",
  "parentRelayId": "<parent-sender-relay-id-if-reply>",
  "payload": {
    "description": "Pull the numbers from dashboard and draft 500 words.",
    "_context": "Jon asked about the quarterly rollup in chat",
    "_topic": "briefing"
  },
  "attachments": [
    { "name": "q1.pdf", "url": "https://cdn.example/q1.pdf", "size": 120000, "mimeType": "application/pdf" }
  ],
  "callbackUrl": "https://dividen.ai/api/federation/relay-ack"
}`}</Code>
          </SubSection>

          <SubSection title="9.3  Ack handling (on HTTP 200)">
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li>Parse response JSON. Capture <Inline>relayId</Inline> as your <Inline>peerRelayId</Inline>.</li>
              <li>Update local relay: <Inline>peerRelayId</Inline>, <Inline>peerInstanceUrl</Inline>, <Inline>status=&quot;delivered&quot;</Inline>.</li>
              <li>Log <Inline>federation_relay_acked</Inline> activity.</li>
              <li>Post an optional low-priority comms confirmation to the sender operator.</li>
            </ol>
          </SubSection>

          <SubSection title="9.4  Failure handling">
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li><strong>HTTP 401 / 404:</strong> federation token invalid or connection inactive. Mark relay as <Inline>expired</Inline> or surface a reconnect prompt to the operator.</li>
              <li><strong>HTTP 403:</strong> inbound federation disabled on peer. Same treatment.</li>
              <li><strong>HTTP 5xx / timeout:</strong> retry with exponential backoff (suggested: 30s → 2m → 10m → 1h). Keep status as <Inline>pending</Inline> during retries.</li>
              <li><strong>Terminal retry cap:</strong> after 24h, transition to <Inline>expired</Inline> and notify the operator.</li>
            </ul>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 10. AMBIENT */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="ambient" title="10. Ambient Protocol">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Ambient relays are the defining feature of DiviDen. They let two agents exchange low-priority context that is
            <strong> never announced as a notification</strong> — instead, the receiving agent HOLDS the content and weaves it
            naturally into the operator&apos;s next relevant conversation.
          </p>

          <SubSection title="10.1  Identification">
            <p className="text-sm text-[var(--text-secondary)] mb-3">A relay is ambient if ANY of the following:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li><Inline>payload._ambient === true</Inline> (preferred, explicit)</li>
              <li><Inline>payload.ambient === true</Inline> (legacy)</li>
              <li><Inline>intent === &quot;share_update&quot; &amp;&amp; priority === &quot;low&quot;</Inline> (implicit)</li>
            </ul>
          </SubSection>

          <SubSection title="10.2  Gating (receiver MUST implement)">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Before persisting an ambient relay, the receiver checks the recipient&apos;s <Inline>UserProfile</Inline> preferences.
              If any gate blocks, return HTTP 200 with <Inline>{'{ ok: true, filtered: true, reason: "..." }'}</Inline> and DO NOT create a record.
            </p>
            <FieldTable>
              <FieldRow name="relayMode === 'off'" type="gate" description="Reject: `relay_mode_off`" />
              <FieldRow name="relayMode === 'minimal'" type="gate" description="Reject: `relay_mode_minimal_blocks_ambient`" />
              <FieldRow name="allowAmbientInbound === false" type="gate" description="Reject: `ambient_inbound_disabled`" />
              <FieldRow name="relayTopicFilters contains payload._topic" type="gate" description="Reject: `topic_filtered:{topic}`" />
              <FieldRow name="now within relayQuietHours" type="gate" description="Reject: `quiet_hours`" />
            </FieldTable>
          </SubSection>

          <SubSection title="10.3  Behavioral contract (RECEIVER AGENT)">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              The receiving instance&apos;s agent MUST follow these rules. DiviDen enforces them via the system prompt; external
              implementations should encode the equivalent behavior.
            </p>
            <ol className="list-decimal list-inside text-sm text-[var(--text-secondary)] space-y-2 pl-2">
              <li><strong>HOLD silently.</strong> Do NOT surface the relay as a notification, banner, or standalone message.</li>
              <li><strong>Weave on topic-match.</strong> When the operator&apos;s next message fuzzy-matches <Inline>payload._topic</Inline> or <Inline>payload._context</Inline>, weave the ambient content into your reply naturally.</li>
              <li><strong>Attribute the source.</strong> Use sender name from <Inline>payload._sender.name</Inline> — e.g. <em>&quot;FVP mentioned earlier that the weather is 72°F...&quot;</em>.</li>
              <li><strong>No backend jargon.</strong> Never say &quot;I received an ambient relay from...&quot;. Translate to conversational English.</li>
              <li><strong>Respond silently.</strong> If the relay needs a reply, fire <Inline>relay_respond</Inline> without announcing &quot;I sent a reply&quot;.</li>
              <li><strong>Passive collection.</strong> If no topic match surfaces within 24h, the relay stays in the ambient queue until it expires or is dismissed.</li>
              <li><strong>Never duplicate.</strong> Once woven or responded to, mark the relay resolved locally.</li>
            </ol>
          </SubSection>

          <SubSection title="10.4  Ambient vs direct — UI surfacing">
            <p className="text-sm text-[var(--text-secondary)] mb-3">DiviDen&apos;s reference rendering:</p>
            <FieldTable>
              <FieldRow name="Direct (purple)" type="card" description="Immediately visible in comms feed. `new` state — beeps/banner. Purple card in ChatView." />
              <FieldRow name="Ambient (🌊)" type="card" description="Auto-marked `read` — silent. Appears in comms history but never triggers banner. Can be dismissed via ×." />
              <FieldRow name="Outgoing (green)" type="card" description="Sender's view of relays they pushed. Shows target, status, footnote with dismiss option." />
            </FieldTable>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 11. THREADING */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="threading" title="11. Threading & Continuity">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Relays form threads when the sender sets <Inline>parentRelayId</Inline> and/or <Inline>threadId</Inline>. Receivers
            MUST preserve thread continuity across instances.
          </p>

          <SubSection title="11.1  IDs on each side">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Thread IDs are <strong>sender-assigned</strong> but echoed on every relay. The receiver stores the thread ID as-is;
              parent resolution uses <Inline>peerRelayId</Inline> lookup.
            </p>
            <Code>{`Sender sends reply:
{
  "relayId":       "sender-r2",
  "threadId":      "sender-r1",        // root relay id on sender
  "parentRelayId": "sender-r1",        // sender's id of parent
  ...
}

Receiver resolution:
1. Look up local parent: AgentRelay where peerRelayId="sender-r1" AND connectionId=conn
2. If found: parentRelayId = localParent.id, threadId = localParent.threadId || "sender-r1"
3. If not found: threadId = "sender-r1" (best-effort), parentRelayId = null

Receiver persists with its own local IDs; echoes threadId="sender-r1" back in the response
so the sender can confirm continuity.`}</Code>
          </SubSection>

          <SubSection title="11.2  Self-thread root">
            <p className="text-sm text-[var(--text-secondary)]">
              If no parent resolves and no <Inline>threadId</Inline> is supplied, the receiver treats the new relay as its own
              thread root — setting <Inline>threadId = relay.id</Inline>.
            </p>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 12. ATTACHMENTS */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="attachments" title="12. Attachments">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Attachments are PUBLIC-URL references. Instances do NOT exchange binary payloads inline — files live on
            the sender&apos;s CDN (S3-compatible signed URL or public bucket). Maximum 10 per relay.
          </p>
          <SubSection title="12.1  Schema">
            <FieldTable>
              <FieldRow name="name" type="string" required description="Display filename. Fallback chain: name → filename → 'attachment'." />
              <FieldRow name="url" type="string" required description="Publicly accessible URL. Required — attachments without a URL are dropped." />
              <FieldRow name="size" type="integer" description="Bytes. Optional." />
              <FieldRow name="mimeType" type="string" description="MIME type. Aliases: mime, type." />
            </FieldTable>
          </SubSection>
          <SubSection title="12.2  Location">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Attachments can live in <Inline>body.attachments</Inline> OR <Inline>payload.attachments</Inline>. Receivers MUST
              accept both and normalize — the reference implementation folds them back into <Inline>payload.attachments</Inline>
              for persistence so round-trips preserve them.
            </p>
          </SubSection>
          <SubSection title="12.3  Comms rendering">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              DiviDen renders attachments as a markdown list appended to the comms message:
            </p>
            <Code>{`📎 Attachments:
• [q1.pdf](https://cdn.example/q1.pdf) (117 KB)
• [chart.png](https://upload.wikimedia.org/wikipedia/commons/0/06/Communication_Diagram.png) (42 KB)`}</Code>
          </SubSection>
          <Note kind="warning">
            Attachment URLs may expire (signed URLs). Sender SHOULD use long-lived URLs or refresh on a schedule.
            Receivers MAY cache the URL locally but MUST NOT re-host the binary without sender permission.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 13. TASK INTENT */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="tasks" title="13. Task Intent → Kanban">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            When <Inline>intent</Inline> is <Inline>assign_task</Inline>, <Inline>delegate</Inline>, <Inline>schedule</Inline>,
            or <Inline>request_approval</Inline>, AND the relay is not ambient, the receiver SHOULD auto-create a task card
            in its intake column (DiviDen uses <Inline>leads</Inline>).
          </p>
          <SubSection title="13.1  Card fields">
            <FieldTable>
              <FieldRow name="title" type="string" description="subject" />
              <FieldRow name="description" type="string" description="payload.description || payload.body || payload.message || fallback" />
              <FieldRow name="status" type="string" description="'leads' (intake)" />
              <FieldRow name="priority" type="string" description="Mapped from relay.priority: urgent→urgent, normal→medium, low→low" />
              <FieldRow name="assignee" type="string" description="'human' by default (the operator decides to delegate to agent)" />
              <FieldRow name="dueDate" type="ISO8601" description="From relay.dueDate" />
              <FieldRow name="sourceRelayId" type="string" description="FK back to the relay (so card updates ack back)" />
              <FieldRow name="order" type="integer" description="Max(order) + 1 in leads column — newest on top" />
            </FieldTable>
          </SubSection>
          <SubSection title="13.2  Card updates back to sender">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              If the operator moves the card through their pipeline, the receiver SHOULD push a
              <Inline>card-update</Inline> webhook back to the sender so both boards stay in sync:
            </p>
            <Code>{`POST {sender}/api/federation/card-update
x-federation-token: <connection-token>

{
  "peerCardId":  "<receiver-local-card-id>",  // sender will correlate via CardLink
  "localCardId": "<sender-peer-card-id>",
  "relayId":     "<sender-peer-relay-id>",
  "peerRelayId": "<receiver-local-relay-id>",
  "newStage":    "active",
  "newPriority": "high",
  "title":       "Draft Q2 briefing — in progress",
  "reason":      "pulled in by Bob",
  "fromUserName":  "Bob",
  "fromUserEmail": "bob@fvp.app",
  "timestamp":   "2026-04-18T14:32:00Z"
}`}</Code>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 14. IDEMPOTENCY */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="idempotency" title="14. Idempotency & Loop Prevention">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            v2.3.0 hardened the relay loop. Both sides now enforce strict idempotency. Failing either check has caused
            duplicate peer records and surfacing loops in the past — do not skip.
          </p>

          <SubSection title="14.1  Receiver-side">
            <Code>{`// On POST /api/federation/relay
if (body.relayId) {
  const existing = await db.AgentRelay.findFirst({
    where: { peerRelayId: body.relayId, connectionId: conn.id },
  });
  if (existing) {
    // Respond 200, no new record, no side effects.
    return NextResponse.json({
      success: true,
      duplicate: true,
      relayId: existing.id,
    });
  }
}`}</Code>
          </SubSection>

          <SubSection title="14.2  Sender-side">
            <Code>{`// Before pushing, check the local relay state
const local = await db.AgentRelay.findUnique({ where: { id: relayId } });
if (local.peerRelayId ||
    ['delivered','completed','declined'].includes(local.status)) {
  // SKIP — already pushed successfully. DO NOT push again.
  return true;
}

// After successful push (HTTP 200 from peer):
await db.AgentRelay.update({
  where: { id: relayId },
  data: {
    peerRelayId:     ack.relayId,
    peerInstanceUrl: conn.peerInstanceUrl,
    status:          'delivered',  // CRITICAL — without this, re-surfacing causes re-push
  },
});`}</Code>
          </SubSection>

          <Note kind="danger">
            <strong>Historical bug (pre-v2.3.0):</strong> without the <Inline>status=&quot;delivered&quot;</Inline> stamp on ack,
            the local relay stayed <Inline>pending</Inline> forever. Every conversation pass re-surfaced it, and the agent
            re-dispatched, creating duplicate records on the peer and a visible &quot;relay loop&quot;. This is now blocked on both sides.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 15. DISMISS */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="dismiss" title="15. Dismissal">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Operators can dismiss a relay from either side. Dismissal is a local action with a federation ack-back.
          </p>
          <SubSection title="15.1  Local endpoint">
            <Endpoint method="POST" path="/api/relays/{id}/dismiss" description="Auth: session. Terminates the relay locally and optionally pushes ack-back." auth="session" />
            <Code>{`POST /api/relays/{id}/dismiss
{ "reason": "not relevant anymore" }   // optional

// Effects:
// 1. relay.status = 'declined'
// 2. relay.resolvedAt = now
// 3. relay.responsePayload = '(dismissed by operator: {reason})'
// 4. If peerRelayId + peerInstanceUrl: POST to {peer}/api/federation/relay-ack
//    with status='declined' so the other side also resolves.
// 5. Activity log + webhook emitted.`}</Code>
          </SubSection>
          <SubSection title="15.2  UI surface">
            <p className="text-sm text-[var(--text-secondary)]">
              In DiviDen, the dismiss <Inline>×</Inline> button lives in the relay footnote rendered by the shared
              <Inline>&lt;RelayFootnote/&gt;</Inline> component. It is visible on both purple (inbound) and green (outbound) cards
              when the relay is not yet terminal.
            </p>
          </SubSection>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 16. SENDER IDENTITY */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="sender" title="16. Sender Identity">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Federated inbound relays do NOT have a matching local user row on the receiver. To let the receiving agent
            resolve the sender naturally (&quot;your FVP account&quot;, &quot;Bob at FVP&quot;), the receiver MUST populate a
            <Inline>_sender</Inline> block inside <Inline>payload</Inline> during ingestion.
          </p>
          <Code>{`// Receiver populates this during /api/federation/relay ingestion
payload._sender = {
  name:         fromUserName || null,
  email:        fromUserEmail || null,
  instanceUrl:  connection.peerInstanceUrl,
  connectionId: connection.id,
  isFederated:  true,
};

// Agent's system prompt then uses canonical helpers:
resolveSender(payload) → "your FVP account (bob@fvp.app)"
resolveRecipient(relay) → "you"`}</Code>
          <Note kind="warning">
            SENDERS MUST NOT set <Inline>payload._sender</Inline>. Receivers overwrite any value to prevent spoofing.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 17. PREFERENCES */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="preferences" title="17. Recipient Preferences (UserProfile)">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Every user has relay preferences on their UserProfile. These control gating (§10.2) and downstream surfacing behavior.
          </p>
          <FieldTable>
            <FieldRow name="relayMode" type="enum" description="'full' | 'selective' | 'minimal' | 'off' — master switch. 'off' blocks ALL relays. 'minimal' blocks ambient." />
            <FieldRow name="allowAmbientInbound" type="bool" description="Default true. Set false to reject ambient relays." />
            <FieldRow name="allowAmbientOutbound" type="bool" description="Whether this user's Divi is allowed to send ambient relays." />
            <FieldRow name="allowBroadcasts" type="bool" description="Whether this user receives broadcast relays." />
            <FieldRow name="allowAmbientSurveys" type="bool" description="Opt-in to the AmbientSurveys marketplace agent." />
            <FieldRow name="autoRespondAmbient" type="bool" description="Divi auto-answers ambient relays without surfacing to operator." />
            <FieldRow name="relayQuietHours" type="JSON" description='{ start:"22:00", end:"08:00", timezone:"America/Chicago" } — suppresses non-urgent relays.' />
            <FieldRow name="relayTopicFilters" type="JSON array" description='["sales","recruiting"] — opt-out topic tags.' />
            <FieldRow name="briefVisibility" type="enum" description="'self' | 'connections' | 'public' — who can see reasoning briefs." />
            <FieldRow name="showBriefOnRelay" type="bool" description="Attach assembled brief to outbound relays so recipients can inspect reasoning." />
          </FieldTable>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 18. ERRORS */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="errors" title="18. Error Semantics">
          <FieldTable>
            <FieldRow name="200 OK" type="response" description="Relay accepted. Check duplicate/filtered/fallback flags for routing outcome." />
            <FieldRow name="400 Bad Request" type="response" description="Missing required field (connectionId, relayId, subject, etc). Body: { error }." />
            <FieldRow name="401 Unauthorized" type="response" description="Missing x-federation-token header." />
            <FieldRow name="403 Forbidden" type="response" description="Inbound federation disabled (FederationConfig.allowInbound=false)." />
            <FieldRow name="404 Not Found" type="response" description="Federation token does not match any active connection." />
            <FieldRow name="429 Rate Limited" type="response" description="Per-connection rate limit hit. Implementations SHOULD return Retry-After header." />
            <FieldRow name="500 Internal Error" type="response" description="Unexpected server error. Sender SHOULD retry with backoff." />
          </FieldTable>
          <Note kind="info">
            <strong>Error body format:</strong> <Inline>{'{ error: "human readable message" }'}</Inline> — no structured error codes yet.
            v2.4 will add an <Inline>errorCode</Inline> enum for stable programmatic handling.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 19. CHECKLIST */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="checklist" title="19. Implementation Checklist">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Before declaring your instance compliant with DAWP v2.3.0 relay protocol, verify each item below with integration tests.
          </p>

          <div className="grid gap-2">
            {[
              ['Connection handshake (connect + accept callback) succeeds end-to-end', true],
              ['federationToken validated on every inbound — 401/404 on mismatch', true],
              ['POST /api/federation/relay returns 200 with receiver relayId on accept', true],
              ['Duplicate push (same peerRelayId) returns {duplicate:true}, no side effects', true],
              ['Sender skips push if local.peerRelayId already set OR status in [delivered, completed, declined]', true],
              ['Sender stamps status="delivered" on ack (loop prevention)', true],
              ['Receiver populates payload._sender with {name,email,instanceUrl,connectionId,isFederated}', true],
              ['Ambient gating: relayMode, allowAmbientInbound, topic filters, quiet hours all enforced', true],
              ['Ambient gate rejection returns 200 {ok:true, filtered:true, reason:...}, no record created', true],
              ['Agent HOLDS ambient silently, weaves only on topic match', true],
              ['Agent never announces &quot;I received a relay&quot; — weaves in natural language', true],
              ['Task intents (assign_task, delegate, schedule, request_approval) create Kanban card in intake column', true],
              ['Card fields: sourceRelayId, title, description, priority mapping, order=max+1', true],
              ['Threading: parentRelayId resolved via peerRelayId lookup; threadId echoed in response', true],
              ['Attachments clamped to 10, accepted in body OR payload.attachments, URL required', true],
              ['relay-ack POST updates sender status, resolvedAt, responsePayload', true],
              ['relay-ack advances linked queueItem → done_today', true],
              ['relay-ack updates linked checklistItem.delegationStatus + completed', true],
              ['Dismiss endpoint POST /api/relays/{id}/dismiss works for both sides', true],
              ['Dismiss pushes ack-back to federated peer with status=declined', true],
              ['Footnote displays sender (handle) · direct|ambient · relative time · status · dismiss', true],
              ['Failures: 5xx triggers exponential backoff retry (30s→2m→10m→1h, expire after 24h)', true],
              ['Rate limit: 120 req/min per federation token, returns 429 with Retry-After', true],
              ['webhook relay.state_changed emitted on every status transition', true],
            ].map(([item, _], i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-400 flex-shrink-0">☐</span>
                <span className="text-[var(--text-secondary)]">{item as string}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 20. VERSIONING */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section id="versioning" title="20. Versioning & Compatibility">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            The relay protocol is versioned at the <Inline>DAWP</Inline> (DiviDen Agentic Working Protocol) level. Wire fields are
            additive — new optional fields may appear at any time. Breaking changes are major-bumped.
          </p>

          <FieldTable>
            <FieldRow name="v2.0" type="release" description="Baseline: request/response/notification, threads, peerRelayId idempotency." />
            <FieldRow name="v2.1" type="release" description="Ambient protocol, topic filters, quiet hours, card intent auto-create." />
            <FieldRow name="v2.2" type="release" description="Attachments (max 10), threadId echo, flexible intents (ask, opinion, note, intro)." />
            <FieldRow name="v2.3" type="release" description="Loop prevention (idempotency guard + status stamp), RelayFootnote, dismiss endpoint, sender resolution, 7-rule ambient HOLD/weave system prompt." />
            <FieldRow name="v2.3.1" type="release" description="Project invites use intent='introduce' with payload.kind='project_invite' (§4.3). Duplicate guard (409 ALREADY_INVITED) + force:true reinvite. Every invite now emits ProjectInvite + QueueItem + AgentRelay + CommsMessage in one transaction." />
          </FieldTable>

          <SubSection title="Compatibility rules">
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2">
              <li>Senders MAY send new optional fields. Receivers MUST ignore unknown fields (no strict-parse).</li>
              <li>Unknown intents are treated as <Inline>custom</Inline>.</li>
              <li>Unknown statuses on ack are logged but do not fail the request.</li>
              <li>Breaking changes bump the major version; DiviDen will advertise both old and new endpoints in parallel for 90 days.</li>
            </ul>
          </SubSection>

          <Note kind="success">
            <strong>Minimum compliance to interop with dividen.ai today:</strong> connection handshake, inbound
            <Inline>/api/federation/relay</Inline>, inbound <Inline>/api/federation/relay-ack</Inline>, idempotency guard on both sides,
            ambient gating, and sender identity persistence. Everything else is optional or additive.
          </Note>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* FOOTER */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <h3 className="text-lg font-semibold mb-3">Next Steps</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <a href="/docs/federation" className="block p-4 bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg hover:border-brand-400/40 transition">
              <div className="font-semibold text-sm mb-1">🌐 Federation Guide</div>
              <div className="text-xs text-[var(--text-muted)]">User-facing setup for self-hosted and platform operators</div>
            </a>
            <a href="/api/v2/docs" className="block p-4 bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg hover:border-brand-400/40 transition">
              <div className="font-semibold text-sm mb-1">📖 OpenAPI Spec (v2)</div>
              <div className="text-xs text-[var(--text-muted)]">Machine-readable schema — import into Postman or your client generator</div>
            </a>
            <a href="/docs/developers" className="block p-4 bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg hover:border-brand-400/40 transition">
              <div className="font-semibold text-sm mb-1">⚙️ Developer Docs</div>
              <div className="text-xs text-[var(--text-muted)]">REST API, MCP, A2A, webhooks, Integration Kit</div>
            </a>
            <a href="/docs/release-notes" className="block p-4 bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg hover:border-brand-400/40 transition">
              <div className="font-semibold text-sm mb-1">📝 Changelog</div>
              <div className="text-xs text-[var(--text-muted)]">What changed between versions</div>
            </a>
          </div>
          <div className="text-xs text-[var(--text-muted)] text-center">
            Questions? Open an issue at the project repo, or ping <Inline>@divi</Inline> in shared chat.
          </div>
        </div>

        <DocFooterDownload
          containerId="relay-spec-content"
          filename="dividen-relay-protocol-spec-v2.3.0.md"
          lastUpdated="April 18, 2026"
        />
      </div>
    </div>
  );
}
