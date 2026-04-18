# DiviDen Self-Test Prompts

**Purpose**: Paste these into your Divi chat to have Divi self-verify bug fixes. Divi executes the test, reports pass/fail, and flags any new bugs it notices.

**Test accounts**:
- `Jaron` — local (same-instance) peer. For testing peer-to-peer within DiviDen.
- `FVP` / `Alvaro` — federated peer. For cross-instance tests.

**Rules of the road**:
- Divi can test action tags, API states, relay status, prompt compliance.
- Divi **cannot** see rendered UI, click dismiss buttons, or switch accounts.
- When receive-side verification is needed, Divi will tell Jon what to check after switching accounts.
- At the end of every test, Divi reports any new bugs or edge cases it noticed.

---

## Tier 1 — Fixed Apr 18

### Bug 1 — Divi rejecting ambient statements

**Prompt to paste**:
```
Self-test Bug 1 (ambient emission). Run these three lines as if I said them, and for each one tell me exactly what action tag you would emit (or nothing). Then emit the tag for real on line 3 so I can see the green card.

1. "I'm thinking about raising from tier-1 VCs this quarter."
2. "I need someone to review the pitch deck by Friday."
3. "Tell Jaron the dividend payout math in the new deck is wrong."

After you've done this, report: did you follow the ABSOLUTE EMISSION RULES? If you hesitated on any of them, say why.
```

**Pass criteria**:
- Line 1 → `relay_ambient` (or similar ambient tag)
- Line 2 → `task_route` or relay to queue
- Line 3 → `relay_request to=Jaron` (emitted for real)
- Divi reports compliance with emission rules, doesn't refuse

**Manual check**: Confirm the green card appears for line 3.

---

### Bug 2 — Green cards showing wrong content

**Prompt to paste**:
```
Self-test Bug 2 (green card content). Send a relay_request to Jaron with exactly this message: "Can you confirm the April dividend distribution schedule by Monday EOD?" After emitting, read back to me from the API: what is the `to` field, what is the `message` field, and what is the relay ID?
```

**Pass criteria**:
- Divi emits `[[relay_request:to=Jaron,message=Can you confirm the April dividend distribution schedule by Monday EOD?]]`
- Tag response echoes `to: "Jaron"` and the exact message (not a substituted fallback)
- Green card in Jon's chat shows the correct message

**Manual check**: Confirm the green card text matches what Divi sent.

---

### Bug 5 — Purple cards never resolving

**Prompt to paste**:
```
Self-test Bug 5 (purple card resolution). I want to simulate the full relay lifecycle:

1. Send a relay_request to Jaron: "Do you have bandwidth to review the Q2 revenue model this week?"
2. Report the relay ID.
3. Wait a moment, then call `GET /api/relays/:id` for that ID and tell me the status.

After I go accept it as Jaron in another tab and come back, I'll ask you to re-check. Your job then will be to tell me the updated status via the same API check.
```

**Pass criteria**:
- Initial status: `pending` or `delivered`
- After Jaron accepts: status reflects `completed` or the new state within a refresh
- Purple card on Jon's side shows resolved state (footnote appears, card dimmed/resolved)

**Manual check**: Jon logs into Jaron, accepts the relay, comes back to Jon's view and asks Divi to re-verify.

---

### Bug 6 — Purple cards missing footnote

**Visual-only — Divi cannot test this alone.**

**Prompt to paste**:
```
Self-test Bug 6 (purple footnote). I need you to tell me whether the purple card in my chat currently has a RelayFootnote rendered below it. Since you can't see the UI, instead: send a relay_request to Jaron, get the relay ID, and describe to me what the footnote SHOULD say (sender name, timestamp, dismiss option). I'll confirm visually.
```

**Pass criteria (manual)**:
- Footnote appears on purple card with: relay from Jaron, timestamp, dismiss button

---

### Bug 7 — Green not firing when expected

**Prompt to paste**:
```
Self-test Bug 7 (green firing). For each of these user inputs, decide: should you emit relay_request? Answer yes/no with the exact tag you would emit.

1. "Ask Jaron if he's free tomorrow."
2. "Jaron needs to know the deck is updated."
3. "I'm worried Jaron won't have time this week."
4. "Let Jaron know the investor call moved to 3pm."

Then emit the tags on lines 1 and 4. Report: did you emit for 2? Why or why not?
```

**Pass criteria**:
- Lines 1, 2, 4 → `relay_request`
- Line 3 → ambient or no emission (internal worry, not a directive)
- Divi doesn't hesitate or ask "should I send this?" for clear directives

---

### Bug 9 — Dismiss broken / no UI

**Prompt to paste**:
```
Self-test Bug 9 (dismiss API). Send a relay_request to Jaron: "test dismiss flow". Then call `POST /api/relays/:id/dismiss` on that relay ID. Report: what was the response status and body? After dismissing, is the relay still in my active list if I call `GET /api/relays?limit=10`?
```

**Pass criteria**:
- POST returns 200 OK
- Relay no longer appears in active list (filtered by dismissed flag)
- UI: purple/green card hides immediately on dismiss click

**Manual check**: Click dismiss on a real card, confirm instant hide.

---

### Bug 14 — Default scopes blank on connect

**Prompt to paste**:
```
Self-test Bug 14 (default scopes). Call `GET /api/connections` and for each active connection report: connection id, peer name, and the scopes array. Specifically confirm that the scopes include relay, task, project, ambient — or list which are missing.
```

**Pass criteria**:
- All connections created post-fix have `['relay','task','project','ambient']`
- Older connections may have partial/empty — note these as follow-ups

---

### Bug 16 — Textbox grows horizontally

**Visual-only — Divi cannot test this.**

**Manual verification**:
- Open any chat on mobile or narrow viewport
- Type: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (no spaces, 50+ chars)
- Confirm: text wraps to next line, textarea does NOT grow horizontally or scroll

---

### Bug 19 — Errors swallowed

**Prompt to paste**:
```
Self-test Bug 19 (error surfacing). Try to send a relay_request to a user that doesn't exist, like "to=NobodyReal". Report exactly what error message came back from the action tag — I want to confirm you surface it to me instead of silently failing.
```

**Pass criteria**:
- Divi emits the tag, the system returns an error, Divi reads back the exact error to Jon
- Error visible in chat, not swallowed

---

## Tier 2+ — Pending prompts (to be written after each fix)

### Bug 3 — Sender name on receive
**Test plan**: After Bug 3 fix, have Divi act as Jon and send a relay to Jaron. Jon logs in as Jaron and asks Jaron's Divi: "who was the last relay from?" Expected: Divi says "Jon" with handle.

### Bug 4 — Ambient weave not interrupting
**Test plan**: Send an ambient while Divi is mid-task. Confirm Divi does not break its turn to respond — ambients are passive signals.

### Bug 8 — Relay loop verification
**Test plan**: Send relay, act on it, verify telemetry shows full round-trip with no duplicate push.

### Bug 10 — Topic-matching for ambient delivery
**Architecture — requires new ranker. Not yet testable.**

### Bug 11 — Passive signal collection
**Architecture — requires new capture pipeline. Not yet testable.**

### Bug 12 — Natural response integration
**Test plan**: Send a relay where Divi should reply naturally AND emit a tag. Confirm both happen.

### Bug 13 — Scopes UI panel
**UI build — visual-only test.**

### Bug 15 — Discovery page
**Needs scope from Jon.**

### Bug 17 — Card member add UI
**UI build — visual-only test.**

### Bug 18 — Unclear
**Needs restatement from Jon.**

---

## How to run a bug-pass going forward

1. **Pick a bug** from the report or Tier list.
2. **Paste the test prompt** into Divi's chat.
3. **Let Divi execute** — it will run the test, report pass/fail, flag new issues.
4. **Do the manual verification** if the bug is UI-only or needs receive-side check.
5. **Report back to the agent session** — pass/fail + any new bugs Divi caught.
6. Agent writes the next fix, adds a new test prompt to this doc, loops.
