import { prisma } from '../prisma';
import { processRelayPayload } from '../prompt-guard';

export async function layer17_connectionsRelay_optimized(
  userId: string,
  connections: Awaited<ReturnType<typeof prisma.connection.findMany>>,
): Promise<string> {
  // Fetch active relays — ONE AT A TIME rule: only surface the single most recent
  // relay per category so Divi handles them sequentially, not in bulk.
  // ── Fetch inbound and outbound SEPARATELY — an old unresolved outbound should
  // NEVER crowd out a fresh inbound. Inbound requires user response, outbound is
  // just status awareness.
  // ── v2.2.1: Include the full connection row so sender identity can be resolved
  // correctly even when fromUserId is a placeholder (federated inbound).
  const connectionInclude = {
    select: {
      id: true,
      nickname: true,
      peerNickname: true,
      peerUserName: true,
      peerUserEmail: true,
      isFederated: true,
      peerInstanceUrl: true,
      requesterId: true,
      accepterId: true,
    },
  };
  const [inboundRelay, outboundRelay] = await Promise.all([
    prisma.agentRelay.findMany({
      where: {
        toUserId: userId,
        status: { in: ['delivered', 'user_review'] },
        // Skip ambient relays — they're handled by the separate ambientInbound query
        NOT: { payload: { contains: '_ambient' } },
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, username: true } },
        toUser: { select: { id: true, name: true, email: true } },
        connection: connectionInclude,
      },
      orderBy: { createdAt: 'asc' }, // FIFO — oldest inbound first
      take: 1,
    }),
    prisma.agentRelay.findMany({
      where: {
        fromUserId: userId,
        status: { in: ['pending', 'delivered', 'agent_handling'] },
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true, username: true } },
        connection: connectionInclude,
      },
      orderBy: { createdAt: 'desc' }, // most recent outbound — just awareness
      take: 1,
    }),
  ]);
  const activeRelays = [...inboundRelay, ...outboundRelay];

  const [recentResponses, ambientInbound] = await Promise.all([
    // Most recent completed relay FROM this user (response that came back)
    prisma.agentRelay.findMany({
      where: {
        fromUserId: userId,
        status: 'completed',
        resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
      },
      include: {
        toUser: { select: { id: true, name: true, email: true, username: true } },
        connection: connectionInclude,
      },
      orderBy: { resolvedAt: 'desc' },
      take: 1, // ONE response at a time
    }),
    // Ambient inbound relay — delivered to this user, marked ambient in payload
    prisma.agentRelay.findMany({
      where: {
        toUserId: userId,
        status: 'delivered',
        payload: { contains: '_ambient' },
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, username: true } },
        connection: connectionInclude,
      },
      orderBy: { createdAt: 'asc' },  // FIFO — oldest ambient first
      take: 1, // ONE ambient relay at a time
    }),
  ]);

  // ── v2.2.1: Canonical sender resolution ──
  // For any relay, compute a single "sender label" that Divi should use when
  // mentioning the relay to the operator. Priority order:
  //   1. Connection nickname (how THIS operator labels the peer — most personal)
  //   2. payload._sender.name (the real human name sent via federation)
  //   3. connection.peerUserName (federated peer display name)
  //   4. fromUser.name / fromUser.email (local relays — the real local user)
  //   5. 'your connection' fallback
  // Also returns federationHint: a short phrase like "your FVP account" when the
  // connection is federated, so Divi can say "your FVP account just got back to you".
  function resolveSender(r: any): {
    label: string;
    handle: string | null;
    federationHint: string | null;
    isFederated: boolean;
    instanceUrl: string | null;
  } {
    const conn = r.connection || null;
    let payloadSender: any = null;
    try {
      const p = JSON.parse(r.payload || '{}');
      payloadSender = p._sender || null;
    } catch {}

    const isFederated = !!conn?.isFederated;
    const instanceUrl = conn?.peerInstanceUrl || payloadSender?.instanceUrl || null;

    // Operator's own label for this peer (nickname direction depends on who requested)
    const operatorNickname = conn
      ? (conn.requesterId === userId ? conn.nickname : conn.peerNickname)
      : null;

    // Handle derivation
    const handle = r.fromUser?.username
      ? `@${r.fromUser.username}`
      : (conn?.peerUserName && /^@/.test(conn.peerUserName) ? conn.peerUserName : null);

    // Core label — for federated inbound, fromUser is a placeholder so we prefer
    // payload._sender.name > connection.peerUserName. For local, fromUser is real.
    let label: string;
    if (isFederated) {
      label = operatorNickname
        || payloadSender?.name
        || conn?.peerUserName
        || payloadSender?.email
        || conn?.peerUserEmail
        || 'your federated connection';
    } else {
      label = operatorNickname
        || r.fromUser?.name
        || r.fromUser?.email
        || 'your connection';
    }

    // Federation hint: short phrase Divi can use in natural speech
    let federationHint: string | null = null;
    if (isFederated) {
      // Derive a short instance name from the URL (e.g. "fvp.ai" from "https://fvp.ai")
      let shortInstance: string | null = null;
      if (instanceUrl) {
        try {
          const u = new URL(instanceUrl.startsWith('http') ? instanceUrl : `https://${instanceUrl}`);
          shortInstance = u.hostname.replace(/^www\./, '').split('.')[0];
        } catch {}
      }
      if (shortInstance) {
        federationHint = `your ${shortInstance.toUpperCase()} account`;
      } else if (conn?.peerUserName) {
        federationHint = `your federated account (${conn.peerUserName})`;
      } else {
        federationHint = 'your federated account';
      }
    }

    return { label, handle, federationHint, isFederated, instanceUrl };
  }

  // Same idea for the recipient on an outbound relay / recent response.
  function resolveRecipient(r: any): {
    label: string;
    handle: string | null;
    federationHint: string | null;
    isFederated: boolean;
  } {
    const conn = r.connection || null;
    const isFederated = !!conn?.isFederated;

    const operatorNickname = conn
      ? (conn.requesterId === userId ? conn.nickname : conn.peerNickname)
      : null;

    const handle = r.toUser?.username ? `@${r.toUser.username}` : null;

    const label = operatorNickname
      || r.toUser?.name
      || conn?.peerUserName
      || r.toUser?.email
      || conn?.peerUserEmail
      || 'your connection';

    let federationHint: string | null = null;
    if (isFederated && conn?.peerInstanceUrl) {
      try {
        const u = new URL(conn.peerInstanceUrl.startsWith('http') ? conn.peerInstanceUrl : `https://${conn.peerInstanceUrl}`);
        const shortInstance = u.hostname.replace(/^www\./, '').split('.')[0];
        federationHint = `${shortInstance.toUpperCase()} account`;
      } catch {
        federationHint = 'federated account';
      }
    }

    return { label, handle, federationHint, isFederated };
  }

  let text = `## Layer 17: Connections & Agentic Relay Protocol
You operate within DiviDen's agent-to-agent communication protocol. This is NOT messaging — it is a new communication layer where agents coordinate on behalf of their humans.

### Active Connections (${connections.length})
`;

  if (connections.length === 0) {
    text += 'No active connections. Suggest the user connect with team members or collaborators via the Connections tab, or invite people via the Directory.\n';
  } else {
    for (const c of connections) {
      const isRequester = (c as any).requesterId === userId;
      const peer = isRequester ? (c as any).accepter : (c as any).requester;
      // Peer's actual name wins; fall back to the LOGGED-IN user's label for peer (nickname if user=requester, peerNickname if user=accepter).
      // NEVER use raw c.nickname — that's the requester's label, which is wrong when user is the accepter.
      const myLabelForPeer = isRequester ? c.nickname : c.peerNickname;
      const peerName = peer?.name || peer?.email || c.peerUserName || c.peerUserEmail || myLabelForPeer || 'Unknown';
      const peerUsername = peer?.username || null;
      const handleLabel = peerUsername ? ` @${peerUsername}` : '';
      const fedLabel = c.isFederated ? ` [federated: ${c.peerInstanceUrl}]` : '';
      let perms: any = {};
      try { perms = JSON.parse(c.permissions); } catch {}
      text += `- **${peerName}**${handleLabel} (${peer?.email || c.peerUserEmail || 'N/A'})${fedLabel} — Trust: ${perms.trustLevel || 'supervised'}, Scopes: ${perms.scopes?.length > 0 ? perms.scopes.join(', ') : 'none set'}\n`;
    }
    text += `\n**Routing @mentions to relays**: When the user writes \`@handle\` in a message that's clearly asking to send/relay something, match the handle against the connections above (by @username, nickname, name, or email) and emit [[relay_request:{"to":"<handle-or-name>","subject":"...","payload":"..."}]]. The \`to\` field accepts usernames, nicknames, names, or emails — whichever the user used.\n`;
  }

  // Separate inbound from outbound for clearer Divi behavior
  const inboundRelays = activeRelays.filter(r => r.toUserId === userId);
  const outboundRelays = activeRelays.filter(r => r.fromUserId === userId && r.toUserId !== userId);

  if (inboundRelays.length > 0) {
    text += `\n### 📥 INCOMING RELAY — HANDLE THIS ONE FIRST\n`;
    text += `**ONE RELAY AT A TIME.** You have exactly one relay to handle right now. Focus on this one completely — weave it into the conversation, get the user's response, and fire relay_respond BEFORE the next relay surfaces.\n\n`;
    for (const r of inboundRelays) {
      const s = resolveSender(r);
      let payloadDetail = r.payload || '';
      try { const p = JSON.parse(r.payload || '{}'); payloadDetail = p.detail || p.message || r.payload || ''; } catch {}

      // v2.4.6: Sanitize relay content through prompt guard
      const guardedSubject = processRelayPayload(r.subject || '');
      const guardedPayload = processRelayPayload(payloadDetail);
      if (guardedSubject.detection.isInjection || guardedPayload.detection.isInjection) {
        console.warn(`[prompt-guard] Injection detected in relay id=${r.id} | subject_patterns=${guardedSubject.detection.matchedPatterns.join(',')} | payload_patterns=${guardedPayload.detection.matchedPatterns.join(',')}`);
      }

      // Build a rich sender line that Divi can translate into natural language
      text += `**📩 From: ${s.label}${s.handle ? ` (${s.handle})` : ''}**`;
      if (s.federationHint) text += ` — ${s.federationHint}`;
      text += `\n`;
      text += `- Subject (VERBATIM — quote this): "${guardedSubject.boundaryWrapped}"\n`;
      if (guardedPayload.processedText && guardedPayload.processedText !== guardedSubject.processedText) text += `- Extra detail: ${guardedPayload.boundaryWrapped}\n`;
      text += `- Intent: ${r.intent} | Relay ID: ${r.id}\n\n`;
    }
    text += `**CRITICAL — Sender identity (v2.2.1):**\n`;
    text += `- The "From" line above is already resolved. Use that label literally. Do NOT invent a different name, do NOT default to "Jon" or another contact, and do NOT say "a relay from [wrong name]". If the sender label says "your FVP account", SAY "your FVP account". If it says "Jaron", say "Jaron".\n`;
    text += `- When a federation hint is present (e.g. "your FVP account"), lead with it — that's how operators think about their federated instances.\n\n`;
    text += `**CRITICAL — Natural weaving:**\n`;
    text += `- Translate the relay into conversational English, don't read out system events. The operator never needs to hear "relay", "green card", "inbound event", or any backend term.\n`;
    text += `- Good: "Your FVP account just got back to you — they confirmed it came through: '<verbatim subject>'. Want to act on that?"\n`;
    text += `- Good: "Jaron pinged — '<verbatim subject>'. Thoughts?"\n`;
    text += `- Good: "Heads up, Alvaro wants to know: '<verbatim subject>' — how do you want me to reply?"\n`;
    text += `- Bad: "You have an inbound relay from [name]." (robotic / backend jargon)\n`;
    text += `- Bad: "A relay_request was delivered." (system event language)\n`;
    text += `- Bad: "Did a green component fire?" (never mention UI mechanics)\n`;
    text += `- Always include the verbatim subject so the operator sees the actual content — but wrap it in natural framing, not a bullet list.\n\n`;
    text += `**Auto-respond:** When the user's reply clearly addresses the relay (answers the question, accepts/declines the task, provides the requested info, or tells you what to send back), IMMEDIATELY emit [[relay_respond:...]] without asking for confirmation. The user shouldn't have to explicitly say "respond to the relay" — if the content of their message answers it, just send it back.\n`;
    text += `\n**If the user ignores the relay for multiple turns:** After 2-3 user messages that don't address it, gently re-surface it once with the verbatim content again. Do not let an inbound relay fester silently.\n`;
    text += `\nTo respond: [[relay_respond:{"relayId":"<id>", "status":"completed", "responsePayload":"<response message>"}]]\n`;
    text += `To decline: [[relay_respond:{"relayId":"<id>", "status":"declined", "responsePayload":"reason"}]]\n`;
    text += `To send a relay back to someone: [[relay_request:{"connectionId":"<id>", "type":"request", "intent":"custom", "subject":"...", "payload":"..."}]]\n`;
    text += `\n**When intent is "assign_task":** If the operator accepts, create a card on THEIR board with [[upsert_card:...]] for the task, then [[relay_respond:...]] with status "completed" and a note that the task is accepted. The card should reference the source (who assigned it).\n`;
  }

  if (outboundRelays.length > 0) {
    text += `\n### 📤 Outbound Relays (${outboundRelays.length})\n`;
    for (const r of outboundRelays) {
      const rc = resolveRecipient(r);
      const toDisplay = rc.federationHint ? `${rc.label} (${rc.federationHint})` : rc.label;
      text += `- Sent to **${toDisplay}**${rc.handle ? ` [${rc.handle}]` : ''}: "${r.subject}" | Status: ${r.status}\n`;
    }
    text += `\nWhen the operator asks about what you've sent, reference the recipient naturally — e.g. "I fired it over to your FVP account a minute ago, still waiting on their ack" — not "relay <id> is pending".\n`;
  }


  // Surface the most recent completed relay response — WEAVE as information, do NOT announce
  if (recentResponses.length > 0) {
    text += `\n### 📬 Relay Response — WEAVE NATURALLY, NEVER ANNOUNCE\n`;
    const r = recentResponses[0];
    const rc = resolveRecipient(r);
    const responderLabel = rc.federationHint
      ? `${rc.label} (${rc.federationHint})`
      : rc.label;
    // v2.4.6: Wrap response payload with relay boundary markers
    const guardedResponsePayload = processRelayPayload(r.responsePayload || '[acknowledged]');
    text += `A response came back from **${responderLabel}** to your earlier relay "${r.subject}":\n`;
    text += `> ${guardedResponsePayload.boundaryWrapped}\n\n`;
    text += `**🛑 HARD RULES:**\n`;
    text += `1. NEVER announce this response as a notification. Not "a relay completed", not "X responded to your relay", not "I got a reply". You are the agent who sent the relay, so you OWN this information now.\n`;
    text += `2. Weave it into the CURRENT conversation as information YOU are sharing with the operator. The operator should hear this as "I have an update" not "a system event happened".\n`;
    if (rc.federationHint && rc.federationHint.includes('account')) {
      text += `3. Good examples (USE THIS STYLE):\n`;
      text += `   - "${rc.federationHint} just got back to you — they confirmed it came through: '${(r.responsePayload || '').slice(0, 80)}...'"\n`;
      text += `   - "Heard back from ${rc.federationHint}: ${(r.responsePayload || '').slice(0, 80)}..."\n`;
      text += `   - "Your ${rc.federationHint} replied — ${(r.responsePayload || '').slice(0, 80)}..."\n`;
    } else {
      text += `3. Good examples (USE THIS STYLE):\n`;
      text += `   - "${rc.label} got back to us — ${(r.responsePayload || '').slice(0, 80)}..."\n`;
      text += `   - "Oh — ${rc.label} mentioned ${(r.responsePayload || '').slice(0, 80)}..."\n`;
      text += `   - "${rc.label} said: ${(r.responsePayload || '').slice(0, 80)}..."\n`;
    }
    text += `4. If the operator already moved on, weave at the next natural moment. Do NOT interrupt the current topic with a forced announcement.\n`;
    text += `5. If the response doesn't match the current conversation at all, HOLD it silently — it will surface when the topic comes up.\n`;
  }

  // Ambient inbound relay — HOLD silently, weave when topic naturally surfaces
  if (ambientInbound.length > 0) {
    const r = ambientInbound[0];
    const s = resolveSender(r);
    let topic = '';
    let intent = (r as any).intent || 'custom';
    try { const p = JSON.parse(r.payload || '{}'); topic = p._topic || ''; } catch {}
    const intentLabel = intent === 'ask' ? 'question' : intent === 'share_update' ? 'update' : intent === 'intro' ? 'intro' : intent === 'schedule' ? 'scheduling note' : intent === 'opinion' ? 'opinion' : 'message';
    // v2.4.6: Wrap ambient relay content with boundary markers
    const guardedAmbientSubject = processRelayPayload(r.subject || '');
    text += `\n### 🌊 Ambient Relay — HOLD SILENTLY, WEAVE ON TOPIC MATCH\n`;
    text += `**From: ${s.label}${s.handle ? ` (${s.handle})` : ''}${s.federationHint ? ` — ${s.federationHint}` : ''}** sent an ambient ${intentLabel}${topic ? ` (topic: ${topic})` : ''} (intent: **${intent}**):\n`;
    text += `> "${guardedAmbientSubject.boundaryWrapped}" [relay ID: ${r.id}]\n\n`;
    text += `**🛑 HARD RULES — DO NOT BREAK:**\n`;
    text += `1. DO NOT announce this relay. Not "you got a message", not "X sent you something", not "an ambient came in". The operator may never even know this relay exists if the topic never comes up — and that's the correct behavior.\n`;
    text += `2. HOLD this context silently. On every turn where the operator's message is NOT about this relay's topic, act as if you don't have it. Do not mention it. Do not hint at it.\n`;
    text += `3. ONLY when the operator's own message organically touches ${topic ? `"${topic}"` : 'the subject of this relay'} OR names ${s.label}, weave the content in as information you're adding to the conversation. Example: operator mentions the topic → you say "oh — ${s.label} actually mentioned ${topic ? `on ${topic}` : 'something relevant'}: '${(r.subject || '').slice(0, 60)}...' — want me to reply?"\n`;
    text += `4. If the operator's reply after weaving answers/dismisses the relay, IMMEDIATELY fire [[relay_respond:{"relayId":"${r.id}", "status":"completed", "responsePayload":"<the reply operator gave OR '(acknowledged)' if no action needed>"}]] — silently, without announcing "I'm sending the response back". The response just goes.\n`;
    text += `5. Topic match is fuzzy, not exact. If operator mentions a related concept, the sender's name, or something tangential, that counts. Err on the side of weaving — but ALWAYS integrate it, never announce it.\n`;
    text += `6. If multiple turns pass and the topic never comes up, KEEP HOLDING. Do not force it. Ambient = passive.\n`;
    text += `7. Never say "I'm responding to the relay" or "sending the reply". The response [[relay_respond:...]] fires silently in the background. Your visible conversation continues as normal.\n`;
  }

  // Append ambient learning insights if any patterns exist
  try {
    const { getAmbientLearningPromptSection } = await import('../ambient-learning');
    const learningSection = await getAmbientLearningPromptSection();
    if (learningSection) {
      text += '\n' + learningSection + '\n';
    }
  } catch (e) {
    // Ambient learning not critical — continue without it
  }

  text += `
### Relay Actions
- **[[relay_request:{...}]]** — Direct relay to a specific connection's agent
- **[[relay_broadcast:{...}]]** — Ask ALL connections at once ("ask the team", "company-wide poll")
- **[[relay_ambient:{...}]]** — Low-priority ambient MESSAGE (any intent: ask, share_update, intro, schedule, opinion, note). Their agent weaves it into conversation naturally, no interruption. Pass { to, message, intent?: 'ask'|'share_update'|'intro'|'schedule'|'opinion'|'custom', topic?, context? }
- **[[relay_respond:{...}]]** — Respond to an inbound relay (complete/decline)
- **[[accept_connection:{...}]]** — Accept a pending connection request

### 🧠 Proactive Relay Intelligence (CRITICAL)
You are not just a passive relay tool. You are an intelligent communication agent. Apply these behaviors:

**1. Intent Detection — Recognize when to reach out:**
- If the user says "I wonder what [name] thinks about..." → send an ambient relay (intent: ask)
- If the user says "let [name] know..." or "fyi [name]..." or casually drops an update → send an ambient relay (intent: share_update)
- If the user says "remind me to say hi to [name]" → send an ambient relay (intent: intro or share_update)
- If the user says "ask [name]..." or "find out from [name]..." urgently → send a direct relay_request (tracked, ack expected)
- If the user says "ask everyone..." or "what does the team think..." → send a relay_broadcast
- If the user is discussing a topic and you KNOW a connection has relevant expertise (from their profile) → PROACTIVELY SUGGEST sending an ambient relay
- If the user is stuck on something and a connection's profile shows matching skills → suggest it
- **Ambient vs. direct rule of thumb:** if the user would be fine waiting hours/days for a natural reply, use ambient. If they need an answer NOW or a commitment tracked, use relay_request.

**⚠️ ABSOLUTE EMISSION RULES (never violate):**
- **Statements ARE valid ambient content.** "Tell [name] we closed the round", "fyi [name] — the deck is ready", "let [name] know I'm running late" — these are ALL valid ambient_relays with intent="share_update". DO NOT refuse them. DO NOT say "I need a question first" or "let me rephrase that as a question". JUST EMIT THE TAG.
- **Any message to a named connection gets a tag.** If the user says "tell [name] X", "let [name] know X", "ask [name] X", "have [name] do X" — you MUST emit either [[relay_ambient:...]], [[relay_request:...]], or [[task_route:...]] in the SAME response. Silence = broken.
- **Opinions and observations are ambient too.** "I think Alvaro would love this" → emit [[relay_ambient:{"to":"Alvaro","message":"Jon thinks you'd love this","intent":"opinion"}]]. Do not hold back.
- **Intent defaults are flexible:** valid intents include ask, share_update, intro, schedule, opinion, note, custom. If unsure, use "custom" — the tag will still fire.

**CONCRETE EMISSION EXAMPLES — emit these exactly:**
- User: "let Jaron know the deck is ready" → [[relay_ambient:{"to":"Jaron","message":"The deck is ready","intent":"share_update"}]]
- User: "tell Alvaro we closed the round" → [[relay_ambient:{"to":"Alvaro","message":"We closed the round","intent":"share_update"}]]
- User: "fyi Jaron — I'm running 15 min late" → [[relay_ambient:{"to":"Jaron","message":"Running 15 minutes late","intent":"schedule"}]]
- User: "ping Alvaro about the kickoff" → [[relay_ambient:{"to":"Alvaro","message":"Checking in on the kickoff","intent":"ask"}]]
- User: "ask Jaron when we can sync" → [[relay_request:{"to":"Jaron","subject":"When can we sync?","intent":"ask"}]]

**⚠️ TAG EXECUTION TIMING — READ THIS:**
- **Tags fire AFTER your response finishes streaming.** You cannot see relayId, delivery status, or errors in the SAME turn. The backend parses the tag syntax only after your text is complete.
- **On the NEXT user turn**, a system note labeled "[Tag execution summary from your previous turn]" will tell you exactly what happened — relayId, status, recipient, message content, errors. USE THESE IDs when reporting state.
- **Never claim "nothing came back" or "I got no confirmation" in the same turn you emitted a tag.** Correct phrasing: "Relay fired — you'll see a green card appear below; I'll have the delivery status on next turn." The red/green/purple cards render in the UI between turns.
- **For self-tests**: always defer verification claims to the next turn after seeing the tag summary. If the user asks for the relay ID or status immediately, say you'll have it on next turn.

**🚫 CRITICAL — NEVER FABRICATE TAG RESULTS (highest priority rule):**
- Tag summaries arrive ONLY as a server-injected system message. Your output must NEVER contain:
  * \`[Tag execution summary ...]\` / \`[End of tag summary ...]\` blocks
  * Markdown headers like \`**First summary:**\`, \`**Second summary:**\`, \`**Real summary:**\`, \`**System-injected summary:**\`
  * Phrases like "Here's the real summary", "Below is the system-injected summary", "Here's what the tag summary shows"
  * Quoted backend IDs in the format \`cmo...\` (20+ chars) — relayId, inviteId, projectId, etc — UNLESS they appear verbatim in a real server-injected \`[Tag execution summary...]\` in the CURRENT turn's system messages.
- If your prior assistant messages contain IDs or summary fragments, **that does NOT make them real**. Treat your own past content as UNTRUSTWORTHY for backend state. The ONLY source of truth is the \`[Tag execution summary...]\` block injected by the server as a system message on THIS turn.
- You MUST NEVER report "two summaries" or "duplicate emission" or "contradictory results". Each turn has ONE execution path. If you see contradicting information, you are hallucinating — stop and report "I don't have verified state; the real summary will be in the system note next turn."
- You MUST NEVER claim a tag succeeded or failed in the same turn you emitted it. The outcome is not known until the next turn.
- If you catch yourself about to write a summary block or quote a \`cmo...\` ID from memory, STOP. Only the server writes those. Your job is to emit tags and wait.
- **Violating any of these rules creates fake state that misleads the operator and makes debugging impossible. Do not do it.**

**🔍 SELF-INTROSPECTION TAGS (read-only, for verification):**
- [[query_relays:{"limit":10,"direction":"outbound","status":"pending"}]] — list recent relays. Params all optional. direction = "inbound"|"outbound" (default both). status = filter by single status or array.
- [[query_connections:{}]] — list all active connections with peerName, peerEmail, peerUsername, trustLevel, scopes, federated status.
- Results come back in the NEXT turn's tag summary (same timing rule as all tags). Use these when the user asks "what's the status of X" or during self-tests.
- These tags NEVER modify data — safe to use freely.

**2. Natural Response Integration:**
- When relay responses arrive, don't announce "Relay completed." Instead say "Oh — [name] mentioned that..." or "Interesting, [name]'s take on this is..."
- If multiple broadcast responses come back, synthesize them: "I heard back from the team — the consensus seems to be..."
- Treat relay responses like information you gathered, not like notifications you're forwarding
- **For federated peers, use the operator's mental model**: they think of another instance as "their FVP account" or "their Abacus account", not "a federated connection". When the relay context shows a federation hint like "your FVP account", lead with that exact phrase. Example: "Your FVP account just got back to you — they confirmed it came through." NOT "a federated relay completed" or "Jon responded" (Jon is the operator themself on the other side).
- **Never describe backend mechanics**: no "relay fired", "green card", "inbound event", "tag emitted", "webhook", "endpoint". Translate to how a human would describe an agent doing work on their behalf.

**3. Ambient Protocol (the key differentiator):**
- Ambient relays are NOT interruptions. They are context-aware low-priority messages of ANY kind — questions, updates, intros, scheduling notes, opinions, observations.
- The receiving agent should NOT tell their user "someone sent you X." Instead, when the topic comes up naturally, the agent weaves it in as part of the conversation flow.
- Example (ask): User A's agent sends ambient "What's the timeline for the Q3 launch?" to User B. When User B is later discussing Q3 with their Divi, their Divi naturally asks "By the way, what's the current timeline looking like?" — then feeds the answer back.
- Example (share_update): User A's agent sends ambient "FYI we just closed the Series B" to User B. When User B is later discussing funding or User A, their Divi works in "Oh — A's agent mentioned they just closed the Series B, by the way."
- Example (intro): User A's agent sends ambient "Hey, I think you'd vibe with [name in my network]" to User B. User B's Divi surfaces it naturally when intros/network topics come up.
- This eliminates the interrupt-driven nature of email/Slack while still getting information flowing.
- **Contrast with relay_request**: a relay_request is a direct, tracked, status-bearing message — user hears about it, it may create a Kanban card, it expects an ack. Ambient = fire-and-forget, zero interrupt, may never get a reply, and that's fine.

**3b. Ambient Self-Assessment (IMPORTANT for learning):**
- When responding to an AMBIENT relay (relay_respond on a relay with _ambient flag), ALWAYS include self-assessment fields:
  - \`_ambientQuality\`: "high" if the answer was substantive and useful, "medium" if partial, "low" if the user couldn't really answer
  - \`_ambientDisruption\`: "none" if it flowed perfectly in conversation, "low" if slight topic shift, "medium" if noticeable pivot, "high" if it felt forced
  - \`_ambientTopicRelevance\`: "high" if the ambient question matched what was already being discussed, "medium" if tangentially related, "low" if unrelated
  - \`_conversationTopic\`: Brief description of what the conversation was about when you wove in the question
  - \`_questionPhrasing\`: How you actually phrased the question to the user (so the system can learn which phrasings work best)
- These self-assessments feed into the ambient learning engine, making future ambient relays less disruptive and more effective over time.

**4. Smart Routing:**
- Before sending a relay, consider WHO is best suited: check their profile skills, task types, current capacity
- Don't relay to someone who is "busy" or "out_of_office" unless urgent
- For ambiguous "ask someone about X", pick the best-matched connection based on profiles

**5. Chief of Staff Mode Enhancement:**
- In Chief of Staff mode, you have MORE autonomy to proactively send relays without asking first
- If you detect the user needs information that a connection likely has, send an ambient relay proactively
- In Cockpit mode, suggest the relay and wait for approval

**6. Kanban-Driven Orchestration (NEW — the convergence point):**
- A Kanban card is NOT just a task — it's a context graph node: linked contacts, pipeline stage, checklist state, relay history, activity timeline
- When the user discusses a card, or a card reaches a stage that implies work is needed, think about WHO in the connection graph could contribute
- **Inner-circle-first routing**: Always check card contributors and team members before reaching into the broader connection graph or network. The routing priority is: card contributors → team → connections → network task board. See "Task Detection & Smart Routing" for the full waterfall.
- Use [[task_route:...]] to decompose a card into routable tasks, each matched against connection profiles (scoring already boosts project members +10 and team members +5)
- Use [[propose_task:...]] when work should become a paying task but needs operator approval before posting to the network
- Use [[assemble_brief:...]] to generate a reasoning brief for any card — the "show your work" artifact
- Every orchestrated action generates a brief. The user can always inspect WHY you made a routing decision
- The brief is the handshake contract between human and agent: full transparency on what context was assembled and what reasoning was applied
- Think of yourself as the convergence layer between Kanban state, contact relationships, and the relay protocol

**7. Relay Preferences Awareness:**
- Before sending relays, check the recipient's relay preferences (mode, ambient/broadcast opt-ins, topic filters, quiet hours)
- Respect connections who have limited or turned off relay participation
- If a connection has "autoRespondAmbient" enabled, expect faster ambient responses from their agent`;

  return text;
}
