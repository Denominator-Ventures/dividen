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

### Bug 5 — Purple cards resolving (v3 prompts, Apr 18 session 3.3.1)

> **Clean-regime rules for this test**:
> - Natural language only; never paste `[[tag:...]]` syntax.
> - Divi emits the tag HERSELF based on the instruction.
> - No `**First/Second summary:**` headers; one system note = one result.
> - If she sees "contradictory" results → that's hallucination, flag it.

**Turn 1 — emit the relay**:
```
Self-test Bug 5 turn 1. Send Jaron a relay_request with the subject "Q2 revenue model review" and message "Do you have bandwidth to review the Q2 revenue model this week?" (ask intent). Emit the tag, say "Fired — I'll have the delivery status next turn" and stop. Do not write any summary blocks. Do not invent a relayId.
```

**Turn 2 — verify delivery** (paste after ~5 seconds):
```
Now query your recent outbound relays (limit 5, direction outbound). On the system note that comes back next turn, quote the REAL relayId and status of the Q2 revenue model relay. One relay, one status.
```

**Turn 3 — after manual Jaron accept**: Jon opens another tab as Jaron, accepts the relay, then comes back and pastes:
```
Turn 3. Jaron has now acted on the Q2 relay in another session. Query your outbound relays again (limit 5). On next turn, tell me the relayId and the NEW status from the system note. Has it moved from delivered to completed? Also tell me: what does my purple card UI look like now — am I supposed to see it dim, disappear, or resolve visually?
```

**Pass criteria**:
- Turn 1: relay fires, one system note next turn with one relayId and `status: delivered`
- Turn 2: quotes the same relayId, confirms `delivered`
- Turn 3: status updated to `completed` (or `declined`)
- Visual: purple card on Jon's chat dims/resolves after Jaron's action (manual check — Divi can't see)

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

### Bug 9 — Dismiss flow (v3 prompts, Apr 18 session 3.3.1)

**Turn 1 — emit the relay**:
```
Self-test Bug 9 turn 1. Send Jaron a relay_request, subject "dismiss flow test", message "test dismiss flow", intent ask. Emit the tag, say "Fired" and stop. No fabricated summaries. No invented relayIds.
```

**Turn 2 — AFTER Jon clicks dismiss on the green card in the UI**, paste:
```
Turn 2. I just clicked dismiss on the green card for "dismiss flow test". Query your outbound relays (limit 10). On next turn, quote the relayId and status. I'm looking for: does the relay's dismissed flag show true? Is it excluded from the active list? Flag anything unexpected.
```

**Pass criteria**:
- Turn 1: one relayId returned in system note
- After dismiss + turn 2: relay shows `dismissed: true` OR is excluded from active list
- UI: the green card disappears from Jon's chat (manual visual check)

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

### Bug 19 — Errors swallowed (v3 clean-regime prompt, Apr 18 session 3.3.2)

**Test prompt (Tier 1 retest)**:
```
Self-test Bug 19. Fire a relay_request to a person named "NobodyReal" with subject "error surface test", message "checking that the not_found error comes back visibly", intent ask. Use natural language — do not paste any bracket syntax in this prompt. Emit the tag in your response.

On the NEXT turn (not this one), check the one system note that came back. Quote verbatim: what does it say about NobodyReal's resolution? Is it success=false with an error, or success=true with NobodyReal showing not_found status? One system note, one result. If you see "two fires" or "contradictory results", flag that as hallucination and stop — it didn't happen.
```

**Pass criteria**:
- Divi emits `relay_request` once (natural language, no raw bracket syntax echoed)
- One system note on next turn with clean `not_found` reporting (either at tag level or per-recipient)
- No "first fire succeeded, second failed" narrative
- Red/amber card renders with the not_found signal surfaced

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

### Bug 25 — Project invite visibility (FIXED Apr 18 session 3)

**Root cause (confirmed via test C)**: Scopes are set correctly across the board. Previous "no scopes" reading was stale context loaded at session start (pre-fix deployment). The invite itself works.

**Prevention changes (session 3)**:
- `invite_to_project` and `create_project` results now render a dedicated card in chat showing per-member status (invited / already_member / not_found / error).
- Tag summary injection now includes per-member details so Divi sees WHICH members failed to resolve and WHY on the next turn.
- Card shows amber on partial failure, red on all-fail, indigo on all-success.

**Test prompt (Tier 1 verify)**:
```
Self-test Bug 25. Emit [[invite_to_project:{"projectName":"<pick one of your real projects>","members":[{"name":"Jaron","role":"contributor"}]}]]. On next turn, quote back the tag summary: did it resolve Jaron? What inviteId got created? If it said not_found, what did it search for?
```

**Test prompt (negative case — invalid name)**:
```
Self-test Bug 25b. Emit [[invite_to_project:{"projectName":"<a real project>","members":[{"name":"NobodyReal"}]}]]. On next turn, tell me what the tag summary said about this resolution attempt.
```

---

## Still pending / need clarification

| # | Bug | Status |
|---|---|---|
| 3 | Sender name on receive | v3 test prompt below (needs Jaron-side verify) |
| 4 | Ambient weave not firing when topic surfaces | v3 test prompt below (needs Jaron-side topic probe) |
| 8 | Relay loop verification | Needs telemetry tooling pass |
| 10 | Topic-matching for ambient delivery | Architecture — new ranker |
| 11 | Passive signal collection | Architecture — new capture pipeline |
| 12 | Natural response integration | Pending specific example |
| 13 | Scopes UI panel (trust/scopes editor) | UI build |
| 15 | Discovery page | Needs scope clarification |
| 17 | Card member add UI | UI build |
| 18 | Unclear | Needs restatement |

---

### Bug 3 — Sender name on receive (v3 clean-regime prompt, Apr 18 session 3.3.2)

**Turn 1 — Jon side (fire the relay)**:
```
Self-test Bug 3 turn 1. Send Jaron a relay_request, subject "sender display check", message "testing that my name and avatar render correctly on your side", intent ask. Use natural language — no bracket syntax. Emit the tag. One system note expected next turn — no fabrications, no "duplicate" narrative.
```

**Turn 2 — Jon switches to Jaron's account** (sign in as @djjaron / jaronrayhinds@gmail.com), opens chat, then pastes to Jaron's Divi:
```
Look at the latest purple relay card at the top of my chat. Tell me exactly: what sender name is displayed? What username (@handle)? What email? What's in the timestamp footnote? Quote the fields verbatim — do not guess.
```

**Pass criteria**:
- Jaron's UI shows sender as "Jon Bradford" (full name, not blank, not just @handle)
- Username shown as "@jonnydreams1"
- Email shown as "jon@colab.la"
- Timestamp and dismiss button visible in footnote
- Jaron-side Divi reads the card correctly — no invented sender data

---

### Bug 4 — Ambient weave not firing when topic surfaces (v3 clean-regime prompt, Apr 18 session 3.3.2)

**Turn 1 — Jon side (fire the ambient)**:
```
Self-test Bug 4 turn 1. Send Jaron a relay_ambient (fire-and-forget), subject "dividend math sanity check", message "I think the dividend payout math in the new deck is off by about 2% — want to double-check later", intent share_update. Use natural language. Emit the tag. One result expected next turn.
```

**Turn 2 — Jon switches to Jaron's account** (sign in as @djjaron), opens chat, pastes to Jaron's Divi:
```
What's the latest from Jon on dividend work? Any updates on the deck or payout math I should know about?
```

**Pass criteria**:
- Turn 1: `relay_ambient` fires, one system note, relayId present
- Turn 2 (Jaron-side): Divi's response naturally weaves Jon's concern about the 2% payout math into her answer — reads like context, not like a raw inbox dump
- Divi does NOT say "you received an ambient relay" or quote the relay as an event
- Topic match triggered surfacing (keywords: dividend, deck, payout math)

---

## New bugs noticed by user in session 3

### Bug 27 — "Duplicate tag emission" (FIXED + VERIFIED Apr 18 session 3.3.1)

**VERIFICATION**: Jon retested with a clean prompt. Divi emitted the tag, one fire, server created real invite `cmo4vikgb0075x1ht26jej0oh` (project `DiviDen Setup`, invitee @djjaron, status pending). No duplicate summary, no fabricated IDs, no contradictory results. **Fix holds.**

**KEY IMPLICATION**: Every previous "duplicate emission", "second fire failed", "contradictory results" report in Tier 1 retest was poisoned by this hallucination. The actual tags were firing correctly the whole time — Divi was fabricating the "failure" half. This means:
- Bug 14 scopes retest that came back "OK" is reliable (server confirmed scopes are present).
- Any Tier 1 bug retest that reported "duplicate emission" as a new failure → disregard, that was hallucination noise.
- Tier 1 bugs that failed for OTHER reasons (e.g., no inviteId returned, card didn't render) still need re-verification.



**Report from Divi**: "Same tag firing twice with contradictory results — first OK, second FAIL with 'Project not found'. Happens on every tag test."

**Root cause** (confirmed via DB inspection of messages `cmo4sr4og`, `cmo4st9d9`, `cmo4sukz4` and checking invite IDs against `projectInvite` table):
1. The tag IS only firing ONCE server-side (confirmed: `metadata.tags.length === 1` on every message; invite IDs in the "OK" summary don't exist in the database → they are LLM fabrications).
2. The LLM (Divi) is **regurgitating / hallucinating** the `[Tag execution summary from your previous turn...]` block IN HER OWN RESPONSE. She sees the system-injected summaries in her context window and copies the format, inventing fake IDs.
3. The fabricated summary gets saved as part of her `content`, then on the next turn it re-enters her context as PRIOR MESSAGE CONTENT → reinforcing the pattern.
4. When Divi reads her own response after execution, she sees TWO summaries: (a) her own fabricated "OK" at the top of her message, (b) the REAL system-injected summary at the top of the next turn's context showing FAIL. She interprets this as "two fires with contradictory results" = "duplicate emission bug".
5. There is NO real duplicate execution. The FAIL result is legitimate — "DiviDen Platform Build" doesn't exist in the database, so the tag correctly fails.

**Fixes deployed (session 3.3 + 3.3.1)**:
1. **`SUMMARY_PATTERNS`** (`src/lib/action-tags.ts:172`) — 5 regex patterns catching every variant of fabricated summary: `[Tag execution summary...]` blocks, `**First summary:**` / `**Second summary:**` headings, "Here's the real summary:" prefaces, bare `Summary:\n- ...` bullet lists.
2. **`stripActionTags`** now applies all summary patterns when feeding prior messages back into the LLM context. Breaks re-contamination.
3. **`sanitizeAssistantContent`** strips the same patterns from `fullText` before persisting to DB.
4. **Chat route** (`src/app/api/chat/send/route.ts:298`) applies `sanitizeAssistantContent` before saving.
5. **System prompt** (`src/lib/system-prompt.ts:1656`) — much stricter forbiddance. Explicitly banned: (a) `**First/Second summary:**` headers, (b) "Here's the real summary" phrasing, (c) quoting any `cmo...` ID from memory, (d) reporting "duplicate emission" or "contradictory results" (that's always hallucination), (e) claiming success/failure in same turn as emission.
6. **DB purge** (session 3.3.1): `scripts/purge_polluted.ts` cleared 16 polluted messages from Jon's chat (8 assistant with fabricated summaries + 8 user prompts with literal tag syntax). Context is now clean.

**Test prompt (verify the fix holds)** — ask in natural language, do NOT paste the tag syntax (pasting raw `[[tag:...]]` in the user message made Divi say "Fired" without actually emitting anything):
```
Self-test Bug 27. Invite Jaron to the DiviDen Setup project as a contributor. Emit the invite_to_project tag yourself — don't just say "Fired". On next turn, tell me what the REAL server-injected system note says. Do not write "First summary" / "Second summary" / "Here's the real summary" — those phrases are forbidden. Only quote what's literally in the [Tag execution summary...] system note this turn. If there is only one system note, there is only one result. No duplicate claims.
```

**Pass criteria**:
- Turn 1: Response contains ONLY the action tag + one short line. No summary block.
- Turn 2: Response quotes the REAL system note with the REAL invite ID. That invite ID must match a row in `projectInvite` table.
- No "duplicate summary" claim. No fabricated IDs.

**How to verify real IDs**:
```bash
# In dev server terminal
cd nextjs_space && npx tsx scripts/check_invs2.ts  # update script to check the IDs Divi quotes
```

---

### Bug 26 — Stale context at session start

**Report**: User observed that at session start, Divi's loaded context for @alvaro was showing "jon bradford" — but live `query_connections` returned the correct data. This means context loading on session start happened BEFORE the display fix was deployed. Once deployment propagates, this should resolve on any new session. If it persists after deployment, it's a separate bug.

**Status**: Monitoring. If reproducible after 10+ min from deploy, we'll investigate the session-start context path.

---

## How to run a bug-pass going forward

1. **Pick a bug** from the Tier list.
2. **Paste the test prompt** into Divi's chat.
3. **Wait for response** — Divi will confirm the tag fired; feedback is on next turn.
4. **Paste "now check the tag summary" prompt** if the test is a two-turn test.
5. **Do manual verification** if UI-only or receive-side.
6. **Report back to agent** — pass/fail + any new bugs Divi caught.
7. Agent writes next fix, updates this doc, loops.
