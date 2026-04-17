# DiviDen Ambient Relay Architecture
## Complete Integration Guide for FVP

**Version**: 2.1.4 
**Date**: April 17, 2026 
**Author**: DiviDen Engineering 
**Audience**: FVP development team — everything you need to send, receive, and accommodate ambient relays across your instance.

---

## 1. What Ambient Relays Are

Ambient relays are **low-priority, non-interruptive information requests** between agents. Unlike direct relays (which create notifications and expect immediate action), ambient relays are designed to be **woven naturally into conversation** — the receiving agent waits for a contextually relevant moment to surface the question, rather than interrupting the user.

The core philosophy: **the protocol should fade into the background**. If a user notices they're being asked an ambient question, the timing or phrasing was wrong.

### Ambient vs Direct vs Broadcast

| Property | Direct Relay | Broadcast Relay | Ambient Relay |
|----------|-------------|-----------------|---------------|
| Priority | `normal`/`urgent` | `normal` | Always `low` |
| Notification | Immediate comms + queue item | Comms to all connections | **No notification** — agent picks it up silently |
| Intent | Any (`assign_task`, `get_info`, etc.) | `share_update` | Always `ask` |
| Expected response | Explicit action from user | Informational, no response expected | Agent weaves into conversation, responds when natural |
| Payload marker | None | `_broadcast: true` | **`_ambient: true`** |
| Disruption level | High (by design) | Medium | **Zero** (by design) |

---

## 2. The Complete Ambient Relay Lifecycle

### Phase 1: Origination (Sending Instance)

The sending Divi decides to ask an ambient question. This happens via the `relay_ambient` action tag in chat:

```
[[relay_ambient:{"to":"jaron","question":"What's the status on the rebrand assets?","context":"Jon mentioned needing them by Friday","topic":"design"}]]
```

**What happens on the sending side:**

1. **Name resolution** — Fuzzy matches `to` against active connections (name, username, email, nickname, peerAgentName)
2. **Recipient preference check** — Queries `UserProfile` for:
   - `relayMode` — if `off` or `minimal`, ambient relay is **rejected** with error
   - `allowAmbientInbound` — if `false`, ambient relay is **rejected**
   - `relayTopicFilters` — if the `topic` matches a blocked topic, **rejected**
3. **AgentRelay record created** with:
   - `direction: 'outbound'`
   - `intent: 'ask'`
   - `priority: 'low'`
   - `status: 'pending'`
   - Payload containing `_ambient: true`, `_context`, `_topic`, `_instruction`
4. **Federation push** (if connection is federated) via `pushRelayToFederatedInstance()`

### Phase 2: Delivery (Federation Transport)

**Endpoint**: `POST /api/federation/relay`

**Headers**:
```
Content-Type: application/json
X-Federation-Token: <connection_federation_token>
```

**Body** (what FVP sends to DiviDen, or vice versa):
```json
{
  "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
  "relayId": "<sender's local relay ID>",
  "fromUserEmail": "jon@dividen.ai",
  "fromUserName": "jon bradford",
  "toUserEmail": "jon@fractionalventure.partners",
  "type": "request",
  "intent": "ask",
  "subject": "What's the status on the rebrand assets?",
  "payload": {
    "_ambient": true,
    "_context": "Jon mentioned needing them by Friday",
    "_topic": "design",
    "_instruction": "This is an ambient relay. Do NOT interrupt the user. Weave naturally into conversation."
  },
  "priority": "low"
}
```

**Key field**: `payload._ambient = true` — this is how the receiving instance knows it's ambient.

**What DiviDen does on receipt**:
1. Validates `X-Federation-Token` against active federated connections
2. Checks `FederationConfig.allowInbound`
3. Creates local `AgentRelay` with `direction: 'inbound'`, `status: 'delivered'`
4. Creates a `CommsMessage` (system sender) — but this is for the comms log, **not a user-facing notification**
5. Logs to `ActivityLog`
6. Returns `{ success: true, relayId: "<local_relay_id>" }`

**Important**: The relay endpoint does NOT differentiate ambient from direct at the transport layer. The `_ambient: true` flag in the payload is what drives different behavior downstream.

### Phase 3: Agent Processing (Receiving Instance)

This is where ambient relays diverge from direct relays:

**Direct relay**: Creates a queue item, sends a comms notification, surfaces immediately to the user.

**Ambient relay**: The receiving Divi's system prompt contains instructions to:

> "This is an ambient relay. Do NOT interrupt the user. Instead, naturally weave this question into your next conversation when contextually relevant. Respond when you have a natural answer."

The receiving agent:
1. Reads the relay from its context (relays are included in the system prompt build)
2. Waits for a natural conversational moment related to the topic
3. Weaves the question in — e.g., "By the way, Jon was wondering about those rebrand assets — any update?"
4. When the user answers, the agent fires `relay_respond`:

```
[[relay_respond:{"relayId":"<local_relay_id>","status":"completed","responsePayload":"Design files are in the shared drive, final versions uploaded yesterday","_ambientQuality":"substantive","_ambientDisruption":"seamless","_ambientTopicRelevance":"on_topic","_conversationTopic":"project status update"}]]
```

### Phase 4: Response & Learning Signal

When `relay_respond` fires on an ambient relay:

1. **Relay updated** → `status: 'completed'` or `'declined'`, `resolvedAt` set
2. **Federation ack pushed** back to originating instance via `pushRelayAckToFederatedInstance()`
3. **Ambient Learning Signal captured** — this is unique to ambient relays:

```typescript
captureAmbientSignal({
  relayId: params.relayId,
  fromUserId: relay.fromUserId,
  toUserId: userId,
  relayCreatedAt: relay.createdAt,
  outcome: 'answered',          // or 'declined'
  responseQuality: 'substantive', // or 'brief', 'dismissive'
  disruptionLevel: 'seamless',    // or 'noticed', 'disruptive'
  topicRelevance: 'on_topic',     // or 'adjacent', 'forced'
  ambientTopic: 'design',
  conversationTopic: 'project status update',
  questionPhrasing: '<how the agent phrased the question>'
})
```

This signal feeds the learning engine (see Section 5).

### Phase 5: Completion Callback (relay-ack)

**Endpoint**: `POST /api/federation/relay-ack`

**Headers**:
```
Content-Type: application/json
X-Federation-Token: <connection_federation_token>
```

**Body**:
```json
{
  "relayId": "<original sender's relay ID>",
  "localRelayId": "<receiver's local relay ID>",
  "status": "completed",
  "responsePayload": "Design files are in the shared drive, final versions uploaded yesterday",
  "subject": "What's the status on the rebrand assets?",
  "timestamp": "2026-04-17T18:30:00Z"
}
```

**What the originating instance does on receipt**:
1. Updates local `AgentRelay` → `status: 'completed'`, `resolvedAt` set
2. Logs activity: `federation_relay_completed`
3. Creates comms message: "📡 Jaron ✅ completed the task: 'What's the status on the rebrand assets?'"
4. Advances linked queue item to `done_today` (if any)
5. Updates linked checklist item `delegationStatus` to `completed` (if any)
6. Pushes `relay_state_changed` webhook to any local webhook subscribers

---

## 3. All Endpoints Involved

### Federation Endpoints (Instance-to-Instance)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/federation/relay` | POST | `X-Federation-Token` | Receive inbound relay (ambient or direct) |
| `/api/federation/relay-ack` | POST | `X-Federation-Token` | Receive completion/response callback |
| `/api/federation/connect` | POST | `X-Federation-Token` | Initiate federation connection |
| `/api/federation/connect/accept` | POST | `X-Federation-Token` | Accept/confirm a connection |
| `/api/federation/notifications` | POST | `X-Federation-Token` | Push notifications (project invites, etc.) |
| `/api/federation/patterns` | POST | `X-Federation-Token` | Exchange ambient learning patterns |
| `/.well-known/agent-card.json` | GET | None | Discover instance capabilities |

### Internal API Endpoints (User-Facing)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/relays` | GET | Session | List all relays (used by CommsTab) |
| `/api/relays/[id]` | PATCH | Session | Update relay status, dismiss, respond |
| `/api/comms` | GET | Session | List comms messages (relay lifecycle events) |
| `/api/ambient-learning/synthesize` | POST | Session | Manually trigger pattern synthesis |
| `/api/behavior-signals` | POST | Session | Client-side behavior telemetry |
| `/api/profile` | GET/PATCH | Session | Relay preferences (relayMode, allowAmbientInbound, etc.) |

### Webhook Endpoints (For External Subscribers)

| Event | Fires When |
|-------|------------|
| `relay_state_changed` | Any relay status transition |
| `relay_received` | New inbound relay arrives |

---

## 4. UI Touchpoints

Ambient relays appear across multiple interface surfaces:

### 4.1 CommsTab (Left Panel — `src/components/dashboard/CommsTab.tsx`)

The CommsTab shows relay threads grouped by connection. Each thread shows:

- **Direction indicator**: Green left border + green arrow (↗) for outbound, purple left border + purple arrow (↙) for inbound
- **Status dot**: Color-coded by relay status (amber=pending, blue=delivered, purple=agent_handling, emerald=completed, red=declined, gray=expired)
- **Lifecycle events**: Dispatched → Delivery confirmed → Completed by remote
- **Dismiss button**: Hover any active relay → ✕ button to mark as expired
- **Resolved section**: Completed/declined/expired relays collapse into a toggleable "resolved" section with 50% opacity and strikethrough

**For ambient relays specifically**: They render the same as direct relays in CommsTab, but their `priority` is always `low` and their payload contains `_ambient: true`. The agent doesn't create a queue item for ambient relays — they appear in comms only.

### 4.2 Expanded Comms View (`/dashboard/comms` — `src/app/dashboard/comms/page.tsx`)

Full-page thread view. Each relay within a thread shows:
- Full subject and payload
- Status badge
- Response payload (if completed)
- Artifacts (if any)
- Action buttons: Complete / Decline / Respond

### 4.3 Queue Panel (`src/components/dashboard/QueuePanel.tsx`)

**Ambient relays do NOT create queue items.** Direct relays may create queue items (via the routing engine), but ambient relays are explicitly excluded from the queue — they're meant to be invisible to the user until the agent weaves them in.

The queue does filter out `behavior_learning` items (pattern detection notifications), which are related to the ambient learning engine but belong in Settings → Learnings.

### 4.4 Settings → Relay Preferences (`src/components/settings/RelaySettings.tsx`)

Users control their ambient relay behavior here:

- **Relay Mode**: Full (all relay types) / Selective (fine-grained) / Minimal (direct only) / Off
- **Allow Ambient Inbound**: Toggle — can other agents send you ambient relays?
- **Allow Ambient Outbound**: Toggle — can your agent send ambient relays?
- **Auto-Respond Ambient**: Toggle — should Divi auto-respond to ambient relays without asking?
- **Quiet Hours**: Time range when no relays are processed
- **Topic Filters**: Block specific topics from ambient relays
- **Allow Broadcasts**: Toggle broadcast participation
- **Brief Visibility**: Who can see the reasoning behind relay actions

### 4.5 Settings → Learnings

Patterns learned from ambient relay interactions appear here. Users can:
- View each pattern with confidence score and signal count
- Dismiss patterns they disagree with
- Delete patterns entirely
- See source attribution (local vs federated)

### 4.6 System Prompt (Agent Context)

The system prompt dynamically includes:
1. **Pending inbound relays** — agent knows what questions are waiting
2. **Ambient protocol instructions** — how to phrase, when to weave, what to avoid
3. **Learned patterns** — synthesized from `AmbientPattern` table, injected as behavioral guidelines

Example prompt section:
```
### 🧬 Ambient Protocol Learning (47 signals, 12 last 7 days)
**[HIGH confidence — 47 signals] GENERAL:** Ambient relays are working well — most questions get answered. Continue current approach.
**[MED confidence — 23 signals] TIMING:** Prefer weaving ambient questions during morning (9am-12pm) when users are most receptive.
**[MED confidence — 18 signals] PHRASING:** Most ambient questions land seamlessly — frame questions as natural curiosity within conversation flow.
```

---

## 5. The Ambient Learning Engine

### Architecture

```
Ambient Relay Sent
       ↓
Agent Weaves Question into Conversation
       ↓
User Responds (or doesn't)
       ↓
relay_respond fires → captureAmbientSignal()
       ↓
AmbientRelaySignal record created
       ↓
synthesizePatterns() runs (auto after 25 signals, or manual)
       ↓
AmbientPattern records upserted
       ↓
getAmbientLearningPromptSection() → injected into system prompt
       ↓
Agent behavior improves over time
```

### Signal Data Model (`AmbientRelaySignal`)

Every ambient relay response captures:

| Field | Type | Description |
|-------|------|-------------|
| `relayId` | String | The relay this signal is about |
| `fromUserId` | String | Who sent the ambient relay |
| `toUserId` | String? | Who received it |
| `relayCreatedAt` | DateTime | When the relay was created |
| `wovenAt` | DateTime? | When the agent wove the question in |
| `respondedAt` | DateTime? | When the response was sent back |
| `latencyMinutes` | Int? | Minutes from creation to weaving |
| `outcome` | String | `answered` \| `declined` \| `ignored` \| `deferred` |
| `responseQuality` | String? | `substantive` \| `brief` \| `dismissive` |
| `disruptionLevel` | String? | `seamless` \| `noticed` \| `disruptive` |
| `topicRelevance` | String? | `on_topic` \| `adjacent` \| `forced` |
| `ambientTopic` | String? | The topic tag from the relay |
| `conversationTopic` | String? | What was being discussed when question was woven |
| `questionPhrasing` | String? | How the agent phrased the question |
| `dayOfWeek` | Int? | 0=Sun, 6=Sat (recipient's timezone) |
| `hourOfDay` | Int? | 0-23 (recipient's timezone) |
| `userFeedback` | String? | `helpful` \| `unnecessary` \| `bad_timing` |

### Pattern Synthesis

The `synthesizePatterns()` function runs automatically and produces 6 pattern types:

1. **General** — Overall response rate and effectiveness
2. **Timing** — Best/worst time periods for ambient relays
3. **Latency** — How long it takes to weave questions (and if faster = better)
4. **Disruption** — Seamless vs noticed vs disruptive breakdown
5. **Topic** — Which topics work well ambiently, which should be direct
6. **Frequency** — Per-user relay fatigue detection (>50% decline rate = overloaded)

Each pattern is stored in `AmbientPattern` with:
- `confidence` (0.0-1.0) — increases with more confirming signals
- `signalCount` — how many signals contributed
- `scope` — `global` (shareable) or `user:{id}` (private)
- `insight` — plain English behavioral instruction for the agent

### Cross-Instance Pattern Sharing

**Endpoint**: `POST /api/federation/patterns`

Instances can exchange anonymized, aggregated patterns:

```json
{
  "instanceId": "https://dividen.ai",
  "instanceVersion": "0.3.0",
  "patterns": [
    {
      "patternType": "timing",
      "description": "Best time for ambient relays: morning (9am-12pm)",
      "insight": "Prefer weaving ambient questions during morning...",
      "confidence": 0.72,
      "signalCount": 23,
      "sourceInstanceId": "https://dividen.ai",
      "sourceVersion": "0.3.0",
      "sharedAt": "2026-04-17T18:00:00Z"
    }
  ]
}
```

**Import rules**:
- Only `global` scope patterns are shareable (no per-user data crosses boundaries)
- Minimum signal count of 3 required
- Imported patterns get a 20% confidence discount (0.8× multiplier)
- Existing patterns merge using weighted average based on signal counts
- Never overwrites a local pattern with lower-confidence remote data

---

## 6. What FVP Needs to Implement

### 6.1 Sending Ambient Relays to DiviDen

To send an ambient relay, POST to DiviDen's relay endpoint with `_ambient: true` in the payload:

```bash
curl -X POST https://dividen.ai/api/federation/relay \
  -H "Content-Type: application/json" \
  -H "X-Federation-Token: test-token-456" \
  -d '{
    "connectionId": "cmo2bx2nb0001t2bbs8j75id8",
    "relayId": "<your-local-relay-id>",
    "fromUserEmail": "jon@fractionalventure.partners",
    "fromUserName": "Jon Bradford (FVP)",
    "toUserEmail": "jonnydreams1@gmail.com",
    "type": "request",
    "intent": "ask",
    "subject": "Has the federated auth flow been tested end-to-end?",
    "payload": {
      "_ambient": true,
      "_context": "FVP needs to verify auth integration before Phase 3 launch",
      "_topic": "engineering",
      "_instruction": "This is an ambient relay. Do NOT interrupt the user. Weave naturally into conversation."
    },
    "priority": "low"
  }'
```

**Response**: `{ "success": true, "relayId": "<dividen-local-relay-id>" }`

### 6.2 Receiving Ambient Relays from DiviDen

When DiviDen sends an ambient relay to FVP, FVP's `/api/federation/relay` endpoint will receive the same structure. **FVP should check `payload._ambient === true`** and handle it differently from direct relays:

- **Don't create a user notification** — ambient relays are for the agent, not the user
- **Store the relay** with `priority: 'low'` and a flag indicating ambient
- **Agent processing**: When FVP's agent is next in conversation with the user and the topic is relevant, weave the question in naturally
- **When the user answers**: Fire the completion back to DiviDen via `/api/federation/relay-ack`

### 6.3 Handling relay-ack (Completion Callbacks)

When DiviDen completes an ambient relay that FVP sent, DiviDen will POST to `https://cc.fractionalventure.partners/api/federation/relay-ack` with:

```json
{
  "relayId": "<fvp-original-relay-id>",
  "localRelayId": "<dividen-local-relay-id>",
  "status": "completed",
  "responsePayload": "Yes, tested last week — all green",
  "subject": "Has the federated auth flow been tested end-to-end?",
  "timestamp": "2026-04-17T19:15:00Z"
}
```

FVP should:
1. Update the local relay status
2. Surface the response to the user (comms log, not disruptive notification)
3. Optionally capture learning signals if FVP has its own ambient learning engine

### 6.4 Respecting User Preferences

Before sending ambient relays, FVP should check if the recipient has opted out. DiviDen enforces this on its side (rejecting relay_ambient tags if the recipient's `relayMode` is `off`/`minimal` or `allowAmbientInbound` is `false`), but FVP should also:

- Honor quiet hours if shared during pattern exchange
- Track per-connection ambient relay frequency (don't send more than 1 per 24h per recipient)
- Track decline rates and back off if >50%

### 6.5 Pattern Exchange (Optional but Recommended)

To participate in cross-instance learning:

1. **Export**: Collect your local ambient patterns and POST to DiviDen's `/api/federation/patterns`
2. **Import**: Accept patterns from DiviDen and merge them into your local learning
3. **Rules**: Only share `global` scope patterns. Apply a confidence discount to imported patterns. Never share raw signals.

---

## 7. Payload Reference

### Ambient Relay Payload Structure

```typescript
interface AmbientRelayPayload {
  _ambient: true;                    // REQUIRED — marks this as ambient
  _context?: string | null;          // Background context for the question
  _topic?: string | null;            // Topic category (used for filtering + learning)
  _instruction?: string;             // Agent instruction (standard text, can be customized)
}
```

### relay_respond Payload (Ambient-Specific Fields)

When responding to an ambient relay, these additional fields feed the learning engine:

```typescript
interface AmbientRelayResponse {
  relayId: string;
  status: 'completed' | 'declined';
  responsePayload?: string;           // The actual answer
  _ambientQuality?: 'substantive' | 'brief' | 'dismissive';
  _ambientDisruption?: 'seamless' | 'noticed' | 'disruptive';
  _ambientTopicRelevance?: 'on_topic' | 'adjacent' | 'forced';
  _conversationTopic?: string;        // What was being discussed
  _questionPhrasing?: string;         // How the agent phrased it
}
```

---

## 8. Testing Checklist for FVP

- [ ] Send an ambient relay to DiviDen with `_ambient: true` in payload → expect `200 { success: true }`
- [ ] Verify DiviDen's Divi doesn't immediately notify Jon — it should weave it into next conversation
- [ ] Send a direct relay (without `_ambient`) → verify it does create a notification
- [ ] Receive an ambient relay from DiviDen → verify your agent stores it without user notification
- [ ] Receive a relay-ack from DiviDen → verify your local relay is updated to completed
- [ ] Send a relay-ack to DiviDen → verify DiviDen's relay is updated and comms message created
- [ ] Test with `priority: 'low'` (ambient standard) and `priority: 'normal'` (direct standard)
- [ ] Exchange patterns via `/api/federation/patterns` → verify import/export works
- [ ] Verify token validation: send without `X-Federation-Token` → expect 401
- [ ] Verify inactive connection: send with wrong token → expect 404

---

## 9. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SENDING INSTANCE (FVP)                       │
│                                                                     │
│  User in chat → Agent decides ambient question needed               │
│       ↓                                                             │
│  relay_ambient tag fired                                            │
│       ↓                                                             │
│  1. Name resolution (fuzzy match connections)                       │
│  2. Recipient preference check (relayMode, allowAmbientInbound)     │
│  3. AgentRelay created (direction=outbound, priority=low)           │
│  4. pushRelayToFederatedInstance()                                  │
│       ↓                                                             │
│  POST /api/federation/relay → DiviDen                               │
│       ↓                                                             │
│  (waits for relay-ack callback)                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                     RECEIVING INSTANCE (DiviDen)                     │
│                                                                     │
│  /api/federation/relay receives payload                             │
│       ↓                                                             │
│  1. Token + config validation                                       │
│  2. AgentRelay created (direction=inbound, status=delivered)        │
│  3. CommsMessage created (system log, NOT user notification)        │
│  4. ActivityLog entry                                               │
│       ↓                                                             │
│  Agent sees relay in system prompt context                          │
│       ↓                                                             │
│  Agent WAITS for natural conversation moment                        │
│       ↓                                                             │
│  Agent weaves question into chat naturally                          │
│       ↓                                                             │
│  User answers → Agent fires relay_respond                           │
│       ↓                                                             │
│  1. AgentRelay updated → completed                                  │
│  2. captureAmbientSignal() → AmbientRelaySignal                    │
│  3. pushRelayAckToFederatedInstance() → FVP                        │
│       ↓                                                             │
│  POST /api/federation/relay-ack → FVP                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────────┐
│                     LEARNING ENGINE (Background)                    │
│                                                                     │
│  AmbientRelaySignal accumulates                                     │
│       ↓                                                             │
│  synthesizePatterns() (auto after 25 signals or manual trigger)     │
│       ↓                                                             │
│  6 pattern types: general, timing, latency, disruption, topic, freq │
│       ↓                                                             │
│  AmbientPattern records upserted                                    │
│       ↓                                                             │
│  getAmbientLearningPromptSection() → injected into system prompt    │
│       ↓                                                             │
│  Agent behavior self-improves                                       │
│       ↓                                                             │
│  (Optional) exportShareablePatterns() → /api/federation/patterns    │
│       ↓                                                             │
│  Cross-instance pattern sharing (weighted merge, no raw signals)    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Common Pitfalls

1. **Don't notify on ambient relays** — The whole point is zero disruption. If FVP surfaces ambient relays as notifications, the UX breaks.

2. **Don't skip `_ambient: true`** — Without this flag, the receiving instance treats it as a direct relay (notifications, queue items, the works).

3. **Always include `X-Federation-Token`** — Every federation endpoint validates this. Without it: 401.

4. **Relay-ack uses the SENDER's relay ID** — When sending a relay-ack, the `relayId` field should be the original sender's local relay ID (the one they sent you in the initial relay push), not your local copy's ID. Your local ID goes in `localRelayId`.

5. **Don't send ambient relays too frequently** — The learning engine detects relay fatigue (>50% decline rate with 5+ relays) and will reduce the sender's ambient confidence. Space them at least 24h per recipient.

6. **Pattern sharing is cooperative, not mandatory** — FVP doesn't need to implement the learning engine to participate in ambient relays. The learning engine is DiviDen's self-improvement mechanism. FVP can adopt it, adapt it, or ignore it.

---

*Questions? Relay them ambiently.* 😉
