export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { DocFooterDownload } from '@/components/docs/DocFooterDownload';

export const metadata: Metadata = {
  title: 'Project Invites Integration Guide',
  description: 'Implementation recipe for project invites as first-class Divi→Divi communication events — AgentRelay, CommsMessage, QueueItem, federation delivery, and UI surfaces.',
  openGraph: {
    title: 'DiviDen · Project Invites Integration Guide',
    description: 'Payload shapes, federation delivery, duplicate guard, force reinvite, Accept/Decline wiring, and client-side event listeners for project invites.',
    images: [{ url: '/api/og?title=Project+Invites+Integration&subtitle=v2.3.1+implementation+guide&tag=docs', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen · Project Invites Integration Guide',
    description: 'Payload shapes, federation delivery, Accept/Decline wiring, and event listeners for project invites.',
    images: ['/api/og?title=Project+Invites+Integration&subtitle=v2.3.1+implementation+guide&tag=docs'],
  },
};

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[11px] font-mono px-1.5 py-0.5 bg-white/[0.06] rounded text-brand-400">{children}</code>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="p-4 bg-[var(--bg-surface)] rounded-lg text-xs overflow-x-auto border border-[var(--border-primary)] my-3 font-mono leading-relaxed text-[var(--text-secondary)]">
      <code>{children}</code>
    </pre>
  );
}

function Note({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'success'; children: React.ReactNode }) {
  const color = kind === 'warn'
    ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
    : kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
      : 'border-brand-500/30 bg-brand-500/5 text-[var(--text-secondary)]';
  return (
    <div className={`my-4 p-4 rounded-lg border text-sm ${color}`}>{children}</div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-2xl font-bold font-heading mb-4 text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

export default function ProjectInvitesIntegrationPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto p-8" data-doc-content>
        {/* Back nav */}
        <div className="mb-8 flex items-center gap-4 flex-wrap">
          <a href="/documentation" className="text-brand-400 hover:text-brand-300 text-sm">← Documentation</a>
          <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300 text-sm">Integrations</a>
          <a href="/docs/developers" className="text-brand-400 hover:text-brand-300 text-sm">API Reference</a>
          <a href="/docs/relay-spec" className="text-brand-400 hover:text-brand-300 text-sm">Relay Spec</a>
          <a href="/docs/federation" className="text-brand-400 hover:text-brand-300 text-sm">Federation</a>
          <a href="/docs/release-notes#release-v2.3.1" className="text-brand-400 hover:text-brand-300 text-sm">v2.3.1 Release Notes</a>
        </div>

        <h1 className="text-3xl font-bold mb-2">🤝 Project Invites Integration Guide</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Implementation recipe for the v2.3.1 project invite flow — invite, accept, decline, reinvite, and federated delivery.
        </p>

        <Note>
          <strong>Scope.</strong> This guide is the canonical reference for anyone wiring up project invites — whether inside the DiviDen
          monorepo, on a federated peer instance (FVP, a self-hosted node, an agent bridge), or in a third-party integration that needs to react to invite events.
        </Note>

        <Note kind="success">
          <strong>v2.3.2 update:</strong> Federated project invites now correctly push over the wire. The invite route fires both{' '}
          <Inline>pushRelayToFederatedInstance</Inline> AND <Inline>pushNotificationToFederatedInstance</Inline> (type=<Inline>project_invite</Inline>, with
          <Inline>projectId</Inline> top-level) after records are written. The v2.3.1 gap where federated invitees received the local records but
          no cross-instance notification is now closed. Relay stays <Inline>pending</Inline> until peer ACKs via <Inline>/api/federation/relay-ack</Inline>.
          See <a href="/docs/relay-spec#scope-resolution" className="text-brand-400 hover:text-brand-300">relay-spec §7.6</a> for scope resolution semantics on the receiver.
        </Note>

        {/* TOC */}
        <div className="mb-10 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Contents</p>
          <ul className="list-disc list-inside text-sm space-y-1 text-[var(--text-secondary)]">
            <li><a href="#why" className="text-brand-400 hover:text-brand-300">1. Why we changed this</a></li>
            <li><a href="#flow" className="text-brand-400 hover:text-brand-300">2. End-to-end flow</a></li>
            <li><a href="#send" className="text-brand-400 hover:text-brand-300">3. Sending an invite</a></li>
            <li><a href="#records" className="text-brand-400 hover:text-brand-300">4. Records created on send</a></li>
            <li><a href="#federation" className="text-brand-400 hover:text-brand-300">5. Federation / cross-instance delivery</a></li>
            <li><a href="#receive" className="text-brand-400 hover:text-brand-300">6. Receiving & surfacing on the peer</a></li>
            <li><a href="#accept-decline" className="text-brand-400 hover:text-brand-300">7. Accept / Decline wiring</a></li>
            <li><a href="#dedup" className="text-brand-400 hover:text-brand-300">8. Duplicate guard & force reinvite</a></li>
            <li><a href="#ui" className="text-brand-400 hover:text-brand-300">9. UI surfaces (6 of them)</a></li>
            <li><a href="#events" className="text-brand-400 hover:text-brand-300">10. Client-side refresh events</a></li>
            <li><a href="#sql" className="text-brand-400 hover:text-brand-300">11. Useful SQL queries</a></li>
            <li><a href="#extending" className="text-brand-400 hover:text-brand-300">12. Extending the pattern</a></li>
            <li><a href="#checklist" className="text-brand-400 hover:text-brand-300">13. Integration checklist</a></li>
          </ul>
        </div>

        {/* ── 1 ─────────────────────────────────────────── */}
        <Section id="why" title="1. Why we changed this">
          <p className="text-[var(--text-secondary)] mb-3">
            Before v2.3.1, a project invite was a silent row-insert into <Inline>ProjectInvite</Inline> plus a generic
            notification <Inline>QueueItem</Inline>. It didn&apos;t exist in the operator&apos;s bell count, it didn&apos;t show up
            in Divi&apos;s context, it didn&apos;t thread with other Divi-to-Divi comms, and nobody could see who was
            invited without drilling into the card detail.
          </p>
          <p className="text-[var(--text-secondary)] mb-3">
            In v2.3.1 the invite is a <strong>relay</strong> first, with four records written in one transaction:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2 mb-3">
            <li><Inline>ProjectInvite</Inline> — source-of-truth for invite state</li>
            <li><Inline>QueueItem</Inline> — invitee&apos;s queue surfaces the action</li>
            <li><Inline>AgentRelay</Inline> (<Inline>intent=&apos;introduce&apos;</Inline>, <Inline>payload.kind=&apos;project_invite&apos;</Inline>) — so the invite is logged on both sides&apos; Comms tab and picked up by federation push</li>
            <li><Inline>CommsMessage</Inline> (<Inline>sender=&apos;divi&apos;</Inline>) — so the invitee&apos;s inbox, bell count, and Divi conversation naturally pick it up</li>
          </ul>
          <p className="text-[var(--text-secondary)]">
            This is the template every important action should follow: <em>mutate state → queue the action → log it as a relay → surface it as a message.</em> One code path, four signals.
          </p>
        </Section>

        {/* ── 2 ─────────────────────────────────────────── */}
        <Section id="flow" title="2. End-to-end flow">
          <Code>{`┌─────────────────┐     POST /api/projects/:id/invite       ┌─────────────────┐
│   Inviter UI    │───────────────────────────────────────▶│   API route     │
│  (CardDetail)   │  { connectionId, role, message, force? }│  (server)       │
└─────────────────┘                                         └────────┬────────┘
                                                                     │
                    ┌────────────────────────────────────────────────┼────────────────────┐
                    │                                                │                    │
            ┌───────▼──────┐      ┌──────────┐      ┌────────────┐   │       ┌─────────────────┐
            │ ProjectInvite│      │QueueItem │      │ AgentRelay │   │       │  CommsMessage   │
            │  (creates)   │      │(invitee) │      │ (introduce │   │       │ (sender=divi,   │
            │              │      │notification│    │  kind=PI)  │   │       │  to=invitee)    │
            └──────────────┘      └──────────┘      └──────┬─────┘   │       └─────────────────┘
                                                           │         │
                                    federation check on connection   │
                                                           │         │
                                                    ┌──────▼───────┐ │
                                                    │ local target │ │
                                                    │ ───── or ─── │ │
                                                    │ federated:   │ │
                                                    │ push relay   │ │
                                                    │ to peer URL  │ │
                                                    └──────┬───────┘ │
                                                           │         │
           ┌───────────────────────────────────────────────▼─────────▼────────────┐
           │                    Invitee's Divi instance                           │
           │  Queue + Inbox + Bell + Card ghost avatar + Comms thread + Accept/Dec │
           └──────────────────────────────────────────────────────────────────────┘`}</Code>
        </Section>

        {/* ── 3 ─────────────────────────────────────────── */}
        <Section id="send" title="3. Sending an invite">
          <p className="text-[var(--text-secondary)] mb-3">
            Authenticated call to <Inline>POST /api/projects/[id]/invite</Inline>. Body fields:
          </p>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-sm">
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li><Inline>connectionId</Inline>? — invite by <Inline>Connection</Inline> record (preferred for federation)</li>
              <li><Inline>userId</Inline>? — invite by local user ID (same-instance)</li>
              <li><Inline>email</Inline>? — invite by email lookup</li>
              <li><Inline>role</Inline>? — <Inline>&apos;lead&apos;</Inline> | <Inline>&apos;contributor&apos;</Inline> | <Inline>&apos;observer&apos;</Inline> (default <Inline>&apos;contributor&apos;</Inline>)</li>
              <li><Inline>message</Inline>? — optional note from inviter; surfaces on the invitee&apos;s queue card</li>
              <li><Inline>force</Inline>? — if true, rotate an existing pending invite instead of erroring</li>
            </ul>
          </div>
          <Code>{`// Example: invite from client
const res = await fetch(\`/api/projects/\${projectId}/invite\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectionId: 'conn_abc',
    role: 'contributor',
    message: 'Want your eye on the Q3 board',
  }),
});

if (res.status === 409) {
  const { code, inviteId } = await res.json();
  // code === 'ALREADY_INVITED'
  // surface the 'Resend invite / Keep existing' prompt to the user
  // to resend: POST again with { ...originalBody, force: true }
} else if (res.ok) {
  const { invite, relayId, replacedInviteId } = await res.json();
  window.dispatchEvent(new CustomEvent('dividen:board-refresh'));
  window.dispatchEvent(new CustomEvent('dividen:comms-refresh'));
}`}</Code>
        </Section>

        {/* ── 4 ─────────────────────────────────────────── */}
        <Section id="records" title="4. Records created on send">
          <p className="text-[var(--text-secondary)] mb-3">The endpoint writes up to four records in a Prisma transaction:</p>

          <h3 className="font-semibold text-sm mb-2 text-brand-400">4.1 ProjectInvite</h3>
          <Code>{`{
  id: string,                // cmp_*
  projectId: string,
  invitedByUserId: string,   // inviter
  invitedUserId: string|null,
  invitedEmail: string|null,
  connectionId: string|null, // for federated invites
  role: 'lead'|'contributor'|'observer',
  message: string|null,
  status: 'pending'|'accepted'|'declined'|'cancelled',
  createdAt, updatedAt
}`}</Code>

          <h3 className="font-semibold text-sm mb-2 text-brand-400 mt-4">4.2 QueueItem</h3>
          <Code>{`{
  userId: invitee.id,
  type: 'notification',
  status: 'pending',
  title: 'Project invite: <projectName>',
  body: '<inviterName> invited you to join as <role>.',
  metadata: {
    type: 'project_invite',   // <-- discriminator for QueuePanel
    inviteId: <ProjectInvite.id>,
    projectId, projectName, role, inviterName, message
  },
  priority: 'high'
}`}</Code>

          <h3 className="font-semibold text-sm mb-2 text-brand-400 mt-4">4.3 AgentRelay</h3>
          <Code>{`{
  type: 'request',
  intent: 'introduce',
  direction: 'outbound',      // from inviter's side
  status: 'delivered',
  connectionId: <invitee connection id, if federated>,
  fromUserId: inviter.id,
  toUserId: invitee.id,
  subject: 'Invite to "<projectName>"',
  payload: JSON.stringify({
    kind: 'project_invite',
    inviteId, projectId, projectName,
    role, message, inviterName
  }),
  priority: 'high',
  visibility: 'both'
}`}</Code>

          <h3 className="font-semibold text-sm mb-2 text-brand-400 mt-4">4.4 CommsMessage</h3>
          <Code>{`{
  userId: invitee.id,
  peerId: inviter.id,
  sender: 'divi',              // surfaces in invitee's bell + comms thread
  direction: 'inbound',
  content: '<inviterName> invited you to "<projectName>" as <role>.',
  contentType: 'project_invite',
  relatedRelayId: <AgentRelay.id>,
  metadata: { inviteId, projectId, projectName, role }
}`}</Code>
        </Section>

        {/* ── 5 ─────────────────────────────────────────── */}
        <Section id="federation" title="5. Federation / cross-instance delivery">
          <p className="text-[var(--text-secondary)] mb-3">
            If the target connection has <Inline>isFederated=true</Inline> and a <Inline>peerInstanceUrl</Inline>, the invite route
            fires <strong>two</strong> async pushes (v2.3.2): <Inline>pushRelayToFederatedInstance(relayId)</Inline> and
            <Inline>pushNotificationToFederatedInstance({`{type:'project_invite', projectId, ...}`})</Inline>. Both are
            fire-and-forget POSTs to the peer&apos;s <Inline>/api/federation/relay</Inline> and <Inline>/api/federation/notifications</Inline>{' '}
            with the <Inline>x-federation-token</Inline> header. 10-second timeout; failure leaves the relay in place locally for the peer to pick up on next poll.
          </p>
          <Code>{`// Inside the invite route, after records are written:
if (invitee.connection?.isFederated && invitee.connection.peerInstanceUrl) {
  // Runs async, never blocks the response
  pushRelayToFederatedInstance(relay.id).catch(err =>
    console.error('[invite] federation push failed', err)
  );
  pushNotificationToFederatedInstance({
    connectionId: invitee.connection.id,
    type: 'project_invite',
    title: \`Project invite: \${project.name}\`,
    message: \`\${inviter.name} invited you to join \${project.name}\`,
    projectId: project.id,
    teamId: project.teamId ?? undefined,
    metadata: { inviteId: invite.id, inviterUserId: inviter.id },
  }).catch(err => console.error('[invite] notification push failed', err));
}`}</Code>
          <p className="text-[var(--text-secondary)] mb-2">
            The federation push is idempotent (v2.3): if <Inline>peerRelayId</Inline> is already stamped, it skips re-pushing,
            preventing the duplicate-delivery cascade that used to happen on retries.
          </p>
          <p className="text-[var(--text-secondary)]">
            <strong>Scope wire fields (v2.3.2):</strong> both endpoints accept top-level <Inline>teamId</Inline> and <Inline>projectId</Inline>. The
            receiver runs scope resolution — if the IDs exist locally, they&apos;re attached to the mirrored records; if not, they&apos;re
            dropped and echoed back as <Inline>scopeDropped</Inline> in the ack response. See{' '}
            <a href="/docs/relay-spec#scope-resolution" className="text-brand-400 hover:text-brand-300">relay-spec §7.6</a>.
          </p>
        </Section>

        {/* ── 6 ─────────────────────────────────────────── */}
        <Section id="receive" title="6. Receiving & surfacing on the peer">
          <p className="text-[var(--text-secondary)] mb-3">
            On the receiving instance, <Inline>POST /api/federation/relay</Inline> ingests the relay and, because
            <Inline>payload.kind === &apos;project_invite&apos;</Inline>, the handler mirrors the same record set locally:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2 mb-3">
            <li>Creates a local <Inline>ProjectInvite</Inline> stub (or syncs state if one already exists for the connection)</li>
            <li>Creates a <Inline>QueueItem</Inline> with <Inline>metadata.type=&apos;project_invite&apos;</Inline></li>
            <li>Creates a <Inline>CommsMessage</Inline> so the bell count ticks + the Comms tab threads it under the inviter</li>
            <li>Populates <Inline>payload._sender</Inline> with <Inline>{`{name,email,instanceUrl,connectionId,isFederated:true}`}</Inline> so the agent can resolve sender identity without a local user row</li>
          </ul>
          <Note kind="warn">
            <strong>Minimal compliance for peer integrators:</strong> at minimum treat the relay as an actionable notification and
            expose <Inline>PATCH /api/project-invites</Inline> (or equivalent) so the receiver can Accept/Decline. Full parity (queue + comms
            + card) is strongly recommended but not strictly required — senders degrade gracefully if ack is received.
          </Note>
        </Section>

        {/* ── 7 ─────────────────────────────────────────── */}
        <Section id="accept-decline" title="7. Accept / Decline wiring">
          <Code>{`// From QueuePanel or inbox row:
const res = await fetch('/api/project-invites', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ inviteId, action: 'accept' }), // or 'decline'
});

if (res.ok) {
  window.dispatchEvent(new CustomEvent('dividen:board-refresh'));
  window.dispatchEvent(new CustomEvent('dividen:queue-refresh'));
  window.dispatchEvent(new CustomEvent('dividen:comms-refresh'));
}`}</Code>
          <p className="text-[var(--text-secondary)] mb-3">Server-side effects per action:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm">
              <strong className="text-emerald-300">Accept</strong>
              <ul className="list-disc list-inside mt-1 text-[var(--text-secondary)] text-xs space-y-0.5">
                <li>Create <Inline>ProjectMember</Inline> ({'{projectId, userId, role}'})</li>
                <li><Inline>ProjectInvite.status → &apos;accepted&apos;</Inline></li>
                <li><Inline>QueueItem.status → &apos;done_today&apos;</Inline></li>
                <li><Inline>AgentRelay.status → &apos;completed&apos;</Inline></li>
                <li><Inline>CommsMessage</Inline> marked read</li>
                <li>If federated, ack-back via <Inline>/api/federation/relay-ack</Inline></li>
              </ul>
            </div>
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-sm">
              <strong className="text-rose-300">Decline</strong>
              <ul className="list-disc list-inside mt-1 text-[var(--text-secondary)] text-xs space-y-0.5">
                <li><Inline>ProjectInvite.status → &apos;declined&apos;</Inline></li>
                <li><Inline>QueueItem.status → &apos;cancelled&apos;</Inline></li>
                <li><Inline>AgentRelay.status → &apos;declined&apos;</Inline></li>
                <li>Thread marked resolved on both sides</li>
                <li>If federated, ack-back with <Inline>status=declined</Inline></li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── 8 ─────────────────────────────────────────── */}
        <Section id="dedup" title="8. Duplicate guard & force reinvite">
          <p className="text-[var(--text-secondary)] mb-3">
            The endpoint looks up any existing <Inline>pending</Inline> invite for <Inline>(projectId, invitee)</Inline>
            before writing. If one exists and the request does not include <Inline>force:true</Inline>, it returns:
          </p>
          <Code>{`HTTP 409
{
  "error": "User already has a pending invite for this project",
  "code": "ALREADY_INVITED",
  "inviteId": "cmp_xyz"
}`}</Code>
          <p className="text-[var(--text-secondary)] mb-3">
            The UI uses this to surface an inline prompt — &quot;<em>already has a pending invite</em>&quot; with <strong>Resend invite</strong>
            and <strong>Keep existing</strong> buttons. Resend repeats the original POST with <Inline>force: true</Inline> added:
          </p>
          <Code>{`// Server behavior when force:true
// 1. Cancel the existing invite and its side-effect records
//    - ProjectInvite.status → 'cancelled'
//    - QueueItem.status → 'cancelled' (via metadata.inviteId match)
//    - AgentRelay.status → 'cancelled'
//    - CommsMessage.hiddenAt = now
// 2. Create a fresh ProjectInvite + QueueItem + AgentRelay + CommsMessage
// 3. Respond with:
{
  "success": true,
  "invite": { /* new invite */ },
  "relayId": "clx_new",
  "replacedInviteId": "cmp_xyz",
  "message": "Invite resent."
}`}</Code>
          <Note>
            <strong>Why not just PATCH the old invite?</strong> Because the queue item and comms message carry the original timestamp
            and inviter context. Replacing the record set keeps the invitee&apos;s surfaces fresh (new bell ping, new queue entry)
            while preserving the <Inline>replacedInviteId</Inline> link for auditability.
          </Note>
        </Section>

        {/* ── 9 ─────────────────────────────────────────── */}
        <Section id="ui" title="9. UI surfaces (6 of them)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '📬', name: 'QueuePanel', desc: 'Pinned "Pending Invites" section at top. Each invite renders an inline card with Accept / Decline buttons.' },
              { icon: '🔔', name: 'Bell count', desc: 'Unread CommsMessage (sender=divi, contentType=project_invite) increments the bell.' },
              { icon: '💬', name: 'Comms thread', desc: 'The CommsMessage threads under the inviter. Shows relay footnote with type + status + dismiss.' },
              { icon: '👻', name: 'Card ghost avatar', desc: 'Kanban card shows pending invites as dashed amber avatars alongside active contributors.' },
              { icon: '🧑\u200d🤝\u200d🧑', name: 'Contributors section', desc: 'Card detail modal\'s Contributors section opens expanded by default. Lists active members and pending invites with status dots.' },
              { icon: '➕', name: 'Add Contributor picker', desc: 'Inside Contributors section. Search-as-you-type against accepted Connection records. Duplicate guard + force reinvite inline.' },
            ].map(surface => (
              <div key={surface.name} className="p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{surface.icon}</span>
                  <strong className="text-brand-400 text-sm">{surface.name}</strong>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{surface.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 10 ────────────────────────────────────────── */}
        <Section id="events" title="10. Client-side refresh events">
          <p className="text-[var(--text-secondary)] mb-3">
            Every state change in the invite lifecycle should dispatch the relevant refresh events so open views update without
            a full reload:
          </p>
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)] text-sm">
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li><Inline>dividen:board-refresh</Inline> — every kanban board view listens; refetches projects + cards.</li>
              <li><Inline>dividen:queue-refresh</Inline> — QueuePanel listens; refetches queue items.</li>
              <li><Inline>dividen:comms-refresh</Inline> — Comms tab + bell listen; refetches threads and unread count.</li>
              <li><Inline>dividen:notifications-refresh</Inline> — NotificationsPopover listens; refetches notification feed.</li>
            </ul>
          </div>
          <Code>{`// Dispatch all three after any mutate:
function refreshInviteSurfaces() {
  const events = ['board-refresh', 'queue-refresh', 'comms-refresh', 'notifications-refresh'];
  events.forEach(name => window.dispatchEvent(new CustomEvent(\`dividen:\${name}\`)));
}`}</Code>
        </Section>

        {/* ── 11 ────────────────────────────────────────── */}
        <Section id="sql" title="11. Useful SQL queries">
          <h3 className="font-semibold text-sm mb-2 text-brand-400">Pending invites for a project</h3>
          <Code>{`SELECT pi.*, u.name AS inviter_name
FROM "ProjectInvite" pi
JOIN "User" u ON u.id = pi."invitedByUserId"
WHERE pi."projectId" = $1
  AND pi.status = 'pending'
ORDER BY pi."createdAt" DESC;`}</Code>

          <h3 className="font-semibold text-sm mb-2 text-brand-400 mt-4">Invite relay + comms for audit trail</h3>
          <Code>{`SELECT
  pi.id AS invite_id, pi.status AS invite_status,
  ar.id AS relay_id, ar.status AS relay_status, ar."peerRelayId",
  cm.id AS comms_id, cm."hiddenAt" AS comms_hidden
FROM "ProjectInvite" pi
LEFT JOIN "AgentRelay" ar
  ON ar.payload::jsonb->>'inviteId' = pi.id
LEFT JOIN "CommsMessage" cm
  ON cm.metadata::jsonb->>'inviteId' = pi.id
WHERE pi.id = $1;`}</Code>

          <h3 className="font-semibold text-sm mb-2 text-brand-400 mt-4">Find orphaned queue items (invite cancelled but queue entry not)</h3>
          <Code>{`SELECT q.id, q.title, q.status, q.metadata
FROM "QueueItem" q
JOIN "ProjectInvite" pi ON pi.id = q.metadata::jsonb->>'inviteId'
WHERE q.metadata::jsonb->>'type' = 'project_invite'
  AND pi.status IN ('cancelled','declined')
  AND q.status = 'pending';`}</Code>
        </Section>

        {/* ── 12 ────────────────────────────────────────── */}
        <Section id="extending" title="12. Extending the pattern">
          <p className="text-[var(--text-secondary)] mb-3">
            The invite flow is the prototype for every important action that should feel like a communication event — not a silent
            database write. Apply the same four-record pattern whenever you add:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1 pl-2 mb-3">
            <li><strong>Role changes</strong> — promote / demote / remove a contributor should emit an AgentRelay + CommsMessage to the affected user.</li>
            <li><strong>Shared-context handoffs</strong> — when an operator hands a thread to a teammate, the receiving side should see a queue item + comms bubble.</li>
            <li><strong>Team membership events</strong> — team invites, team promotions, team disbands.</li>
            <li><strong>Federated capability updates</strong> — when a peer publishes a new capability, push a relay so the connected operator sees it surface naturally.</li>
          </ul>
          <p className="text-[var(--text-secondary)]">
            The pattern is deliberately uniform: pick a relay intent, choose a <Inline>payload.kind</Inline> discriminator, write the
            four records in a transaction, push via federation if the target is federated, dispatch refresh events client-side.
          </p>
        </Section>

        {/* ── 13 ────────────────────────────────────────── */}
        <Section id="checklist" title="13. Integration checklist">
          <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-primary)]">
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              {[
                'Server: duplicate guard checks ProjectInvite.status=pending before insert',
                'Server: 409 { code: "ALREADY_INVITED", inviteId } when duplicate + !force',
                'Server: force:true cancels existing ProjectInvite + QueueItem + AgentRelay + CommsMessage',
                'Server: all 4 records created in a single Prisma transaction',
                'Server: AgentRelay.intent="introduce" + payload.kind="project_invite"',
                'Server: CommsMessage.sender="divi" + contentType="project_invite"',
                'Server: QueueItem.metadata.type="project_invite" (discriminator)',
                'Server: federation push fired async when connection.isFederated',
                'Server: federation ingest mirrors records on peer + ack-back',
                'Client: POST returns relayId, inviteId, replacedInviteId?',
                'Client: 409 prompts inline "Resend invite / Keep existing"',
                'Client: Accept/Decline wired to PATCH /api/project-invites',
                'Client: dispatches dividen:board-refresh + queue-refresh + comms-refresh',
                'UI: ghost avatars for pending invites on kanban cards',
                'UI: Contributors section opens expanded by default inside card detail',
                'UI: QueuePanel pinned "📬 Pending Invites" section with Accept/Decline',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-400 flex-shrink-0 mt-0.5">☐</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <DocFooterDownload containerId="doc-content" filename="dividen-project-invites-integration" lastUpdated="April 18, 2026" />

        <div className="border-t border-[var(--border-primary)] pt-6 mt-8 text-center text-sm text-[var(--text-muted)]" data-no-download>
          <p>Built by <a href="https://dividen.ai" className="text-brand-400 hover:text-brand-300">DiviDen</a> — the Agentic Working Protocol</p>
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            <a href="/docs/integrations" className="text-brand-400 hover:text-brand-300">Integrations</a>
            <a href="/docs/developers" className="text-brand-400 hover:text-brand-300">API Reference</a>
            <a href="/docs/relay-spec" className="text-brand-400 hover:text-brand-300">Relay Spec</a>
            <a href="/docs/federation" className="text-brand-400 hover:text-brand-300">Federation</a>
            <a href="/docs/release-notes" className="text-brand-400 hover:text-brand-300">Release Notes</a>
          </div>
        </div>
      </div>
    </div>
  );
}
