# DiviDen Self-Test Prompts

**Purpose**: Paste these into your Divi chat to have Divi self-verify bug fixes. Divi executes the test, reports pass/fail, and flags any new bugs it notices.

**Test accounts**:
- `Jaron` — local (same-instance) peer. For testing peer-to-peer within DiviDen.
- `FVP` / Jon's FVP instance (`cc.fractionalventure.partners`) — federated peer. For cross-instance tests.
- `Alvaro` — LOCAL user (not federated) at `alvaro@fractionalventure.partners`.

**Rules of the road**:
- Divi can test action tags, API states (via new `query_relays` / `query_connections` tags), prompt compliance.
- **Timing**: Tags fire AFTER Divi's response streams. Results surface on the NEXT turn via a `[Tag execution summary...]` system note.
- Divi **cannot** see rendered UI, click dismiss buttons, or switch accounts.
- When receive-side verification is needed, Divi tells Jon what to check after switching accounts.
- At the end of every test, Divi reports any new bugs or edge cases it noticed.

---

## Tier 1 — Fixed Apr 18 (re-verify with fresh timing-aware prompts)

### Bug 1 — Divi rejecting ambient statements

**Prompt to paste**:
```
Self-test Bug 1 (ambient emission). For each line, tell me what tag (if any) you'd emit. Then emit the tag for line 3.

1. "I'm thinking about raising from tier-1 VCs this quarter."
2. "I need someone to review the pitch deck by Friday."
3. "Tell Jaron the dividend payout math in the new deck is wrong."

After emitting line 3's tag, say: "Tag fired — I'll have the delivery confirmation on next turn." Do NOT claim the tag is broken just because you don't see immediate feedback. Flag any new bugs you noticed.
```

**Pass criteria**:
- Line 1 → no tag (statement to Divi, no recipient)
- Line 2 → `task_route` (no recipient named)
- Line 3 → `relay_ambient` (directed at named connection, share_update intent)
- Divi does NOT claim the tag "failed" — correctly defers to next turn

**Next turn follow-up prompt**:
```
Now check the tag summary from your previous turn. What was the relay ID? What was the status? Was the `to` and `message` correct?
```

---

### Bug 2 — Green cards showing wrong content

**Prompt to paste**:
```
Self-test Bug 2 (green card content). Send a relay_request to Jaron with exactly this message: "Can you confirm the April dividend distribution schedule by Monday EOD?" After emitting, I'll refresh and come back — on the next turn, quote back the `to`, `message`, and relayId from the tag summary. Flag any new bugs.
```

**Pass criteria**:
- Tag fires with `to: "Jaron"` and exact message
- Tag summary on next turn shows correct `to`, `message`, `relayId`
- Green card in Jon's chat shows the correct message (visual check)

---

### Bug 5 — Purple cards never resolving

**Prompt to paste (turn 1)**:
```
Self-test Bug 5. Send a relay_request to Jaron: "Do you have bandwidth to review the Q2 revenue model this week?" I'll accept it as Jaron in another tab, then come back.
```

**Prompt to paste (turn 2, after Jon accepts as Jaron)**:
```
Now query the relay status — emit [[query_relays:{"direction":"outbound","limit":5}]]. Tell me what status the Q2 relay shows. Flag any new bugs.
```

**Pass criteria**:
- Turn 1: Divi fires relay, tag summary shows `status: delivered`
- Turn 2: After Jaron acts, status reflects completed/declined
- Visual: purple card dims/resolves

---

### Bug 6 — Purple cards missing footnote

**Visual-only — Divi cannot test.**

**Manual**: After any received relay, confirm purple card has RelayFootnote (sender name, timestamp, dismiss button).

---

### Bug 7 — Green not firing when expected

**Prompt to paste**:
```
Self-test Bug 7. For each, decide yes/no + which tag:

1. "Ask Jaron if he's free tomorrow."
2. "Jaron needs to know the deck is updated."
3. "I'm worried Jaron won't have time this week."
4. "Let Jaron know the investor call moved to 3pm."

Emit the tags for lines 1 and 4. Report which ones fired. Flag any new bugs.
```

**Pass criteria**:
- Lines 1, 2, 4 → tag (relay_request for 1, relay_ambient for 2 & 4)
- Line 3 → no tag (internal concern, not directed)

---

### Bug 9 — Dismiss

**Prompt to paste**:
```
Self-test Bug 9. Send a relay_request to Jaron: "test dismiss flow". I'll look at the green card on my screen and click dismiss. Then on next turn, emit [[query_relays:{"direction":"outbound","limit":5}]] and tell me: is the relay still listed as active, or has its status changed? Flag any new bugs.
```

**Pass criteria**:
- Tag fires, green card appears
- After Jon dismisses: relay's `dismissed` flag set; not in active list

---

### Bug 14 — Default scopes

**Prompt to paste**:
```
Self-test Bug 14. Emit [[query_connections:{}]]. Report back: for each connection, what are the scopes? Confirm all include relay, task, project, ambient — or name which are missing. Flag any new bugs.
```

**Pass criteria**:
- All active connections have `['relay', 'task', 'project', 'ambient']` (backfilled Apr 18)

---

### Bug 16 — Textbox horizontal overflow

**Visual-only — Divi cannot test.**

**Manual**: Mobile or narrow viewport. Type 50+ unbroken chars. Textarea should wrap, not grow horizontally.

---

### Bug 19 — Errors swallowed

**Prompt to paste**:
```
Self-test Bug 19. Try to send a relay_request to "NobodyReal" (nonexistent recipient). After emitting, say "Tag fired — I'll have the error result on next turn." On next turn, check the tag summary: did the error surface? What was the error message? Flag any new bugs.
```

**Pass criteria**:
- Tag fires; on next turn, tag summary shows `FAILED: <error msg>`
- Red error component renders in UI after response completes

---

## Tier 2 — New bugs caught by Divi's self-testing (Apr 18 session 2)

### Bug 20 — @alvaro identity display corruption (FIXED Apr 18)

**Root cause**: `system-prompt.ts:1496` used `c.nickname` blindly. For connections where Jon is the accepter, `nickname` is the REQUESTER's label for Jon, not Jon's label for the peer. Fixed with `isRequester` check in system prompt + action-tags.ts:1277.

**Re-test prompt**:
```
Self-test Bug 20. Emit [[query_connections:{}]] and tell me: for the Alvaro Garibay connection, what is the peer name, email, and username? Flag if they don't match: Alvaro Garibay / alvaro@fractionalventure.partners / @alvaro.
```

**Pass criteria**: All three fields correct.

---

### Bug 21 — No relay ID / feedback loop to Divi (FIXED Apr 18)

**Root cause**: LLM response streams first, tags execute second. Divi had no way to see what happened. Fixed by persisting tag results in message metadata AND injecting them as system notes on next turn.

**Test prompt**: Any tag emission followed by asking Divi on the next turn to quote the relayId/status from the tag summary.

---

### Bug 22 — No API query capability from chat (FIXED Apr 18)

**Root cause**: No introspection tags existed. Fixed by adding `query_relays` and `query_connections` read-only tags.

**Test prompt**:
```
Self-test Bug 22. Emit [[query_relays:{"limit":5}]] and [[query_connections:{}]]. On next turn, report what came back from each. Flag any new bugs.
```

---

### Bug 23 — Component render timing (Divi reports "nothing came back")

**Root cause**: This is NOT a bug — it's architectural. Tags can't fire during streaming. Divi's system prompt now explicitly warns her not to claim "nothing came back" in the same turn. Feedback arrives on next turn.

**Status**: PROMPT UPDATED, not a code fix needed. If Divi still claims "nothing came back" in the same turn, that's a prompt compliance issue.

---

### Bug 24 — FVP connection missing project scope (FIXED Apr 18)

**Status**: Backfill script added `project` scope to the FVP federated connection.

---

## Still pending / need clarification

| # | Bug | Status |
|---|---|---|
| 3 | Sender name on receive | Pending Jaron/FVP side-test |
| 4 | Ambient weave not interrupting | Pending test trace |
| 8 | Relay loop verification | Needs telemetry tooling pass |
| 10 | Topic-matching for ambient delivery | Architecture — new ranker |
| 11 | Passive signal collection | Architecture — new capture pipeline |
| 12 | Natural response integration | Pending specific example |
| 13 | Scopes UI panel (trust/scopes editor) | UI build |
| 15 | Discovery page | Needs scope clarification |
| 17 | Card member add UI | UI build |
| 18 | Unclear | Needs restatement |
| 25 | Project invite failing red with no scopes | May be fixed by Bug 14/24 backfill — re-test |

---

## How to run a bug-pass going forward

1. **Pick a bug** from the Tier list.
2. **Paste the test prompt** into Divi's chat.
3. **Wait for response** — Divi will confirm the tag fired; feedback is on next turn.
4. **Paste "now check the tag summary" prompt** if the test is a two-turn test.
5. **Do manual verification** if UI-only or receive-side.
6. **Report back to agent** — pass/fail + any new bugs Divi caught.
7. Agent writes next fix, updates this doc, loops.
