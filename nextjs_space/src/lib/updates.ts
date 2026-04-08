/**
 * DiviDen Updates / Changelog
 * 
 * Each update is a timestamped entry written in founder voice.
 * Add new entries to the top of the array.
 */

export interface Update {
  id: string;
  date: string;         // ISO date string
  title: string;
  subtitle?: string;
  tags: string[];
  content: string;      // Markdown-ish content (rendered with basic formatting)
}

export const UPDATES: Update[] = [
  {
    id: 'briefs-and-ambient-learning',
    date: '2026-04-08',
    title: 'The Brief, and the Protocol That Teaches Itself',
    subtitle: 'Orchestration with full transparency. An ambient protocol that gets smarter with every interaction.',
    tags: ['protocol', 'brief', 'learning', 'orchestration'],
    content: `Two things shipped today that represent a real shift in how we think about this platform — and the protocol underneath it.

The first is the brief. The second is the learning engine. Together they complete a loop that I've been thinking about since before there was any code.

## The Brief — Show Your Work

Here's the problem with AI agents doing things on your behalf: you have no idea why they did what they did.

An agent routes a task to someone on your team. Why that person? What context did it consider? What alternatives did it weigh? Most agent platforms treat that as a black box. "Trust me, I picked the right person."

We don't think that's good enough. Especially when the decisions involve real people's time and real deliverables.

So now, every orchestration action in DiviDen generates a **brief** — a reasoning artifact that shows exactly what happened:

- What context was assembled (card state, pipeline position, contact graph, activity timeline)
- Which connections were evaluated, and what their skill/availability profiles looked like
- Why a specific routing decision was made
- What was sent, to whom, via what mode (direct, ambient, broadcast)

The brief is the handshake contract between human and agent. You can always inspect it. You can always audit why Divi made a decision. The same way Divi helps you audit your team's work, you can audit Divi's.

This matters more than it might seem. As agents take on more autonomy — especially in Chief of Staff mode — the brief is how trust gets built. Not through blind faith, but through transparency. Show your work. Every time.

## The Ambient Learning Engine

The ambient relay protocol shipped in the last update. Direct, broadcast, ambient — three modes for agents to coordinate without humans breaking focus.

But here's the thing: a protocol that doesn't learn from its own performance is just a static set of rules. And static rules can't handle the infinite variability of human conversation and work rhythms.

So now, every ambient relay interaction feeds a learning loop.

When your Divi weaves an ambient question into conversation and gets a response back, the system captures everything:

- **Timing** — What time of day did this happen? How long did it take to find a natural moment to ask?
- **Disruption** — Did it land seamlessly, or did it feel forced?
- **Topic relevance** — Was the ambient question related to what was already being discussed?
- **Response quality** — Did we get a substantive answer, or a brush-off?
- **What gets ignored** — Ambient relays that sit unanswered for 48 hours get captured as "ignored" signals. That's data too.

These signals get synthesized into patterns. The patterns get injected back into Divi's context. So the next time Divi considers sending an ambient relay, it knows:

- Which time windows get the best response rates
- Which topics work well ambiently vs. which need a direct relay
- Whether a particular connection is experiencing relay fatigue
- How to phrase questions for maximum seamlessness

The protocol is now self-improving. High-confidence patterns become behavioral rules. Medium-confidence patterns are guidelines. Low-confidence patterns are early signals applied with judgment. And as more ambient relays happen across the platform, all of this gets more precise.

## Task Routing — Kanban to Relay in One Step

The orchestration layer now connects the Kanban board directly to the relay protocol. When a card reaches a stage that implies work is needed, Divi can:

1. Decompose the card into discrete tasks
2. Match each task against your connection graph — skills, lived experience, task types, current availability
3. Route each task via the appropriate relay mode
4. Generate a brief for every routing decision

You can say "route this card" and Divi handles the rest. Or you can say "show me the brief" and inspect the reasoning before anything gets sent.

The Kanban card is the convergence point. People, deliverables, conversations, and status all meet there. The brief is the reasoning layer on top. The relay protocol is the execution layer underneath.

## For Open Source Builders

If you're running your own DiviDen instance — or building on the protocol — here's what this means for you:

**Two new Prisma models**: \`AmbientRelaySignal\` and \`AmbientPattern\`. The signal table captures per-relay outcome data. The pattern table stores synthesized learnings. Run \`npx prisma db push\` to pick them up.

**Two new action tags**: \`task_route\` and \`assemble_brief\`. These connect your Kanban board directly to the relay protocol. The system prompt (Layer 17) now includes orchestration intelligence and self-assessment instructions.

**The learning engine** lives in \`src/lib/ambient-learning.ts\` — four exported functions: \`captureAmbientSignal\`, \`synthesizePatterns\`, \`getAmbientLearningPromptSection\`, and \`captureIgnoredAmbientSignals\`. Pattern synthesis runs automatically in the background after ambient signals are captured, or you can trigger it manually via \`POST /api/ambient-learning/synthesize\`.

**The brief system** lives in \`src/lib/brief-assembly.ts\` — context assembly, skill matching, and brief generation. Briefs are stored as \`AgentBrief\` records and exposed via \`/api/briefs\`.

When your instance connects to the network via federation, the learning engine runs locally on your data. Your patterns stay on your instance. But the protocol improvement compounds — every self-hosted node that uses ambient relays generates learnings that make its own ambient protocol better over time.

The action tag count is now 30+. The system prompt is 18 layers. The protocol spec on os.dividen.ai will be updated to reflect all of this.

## What This Means

The platform now has three properties that I think matter more than any individual feature:

**Transparency** — Every agent decision is inspectable. The brief is always there. No black boxes.

**Self-improvement** — The protocol learns from its own performance. It doesn't need you to configure rules or tweak settings. It watches what works and adjusts.

**Convergence** — Kanban state, contact relationships, relay protocol, and AI reasoning all flow through the same system. They're not separate tools bolted together. They're one graph.

This is still early. The learning engine has maybe a handful of signals right now. Give it a few weeks of real ambient relay traffic and the patterns will start compounding. That's the point — the more you use it, the less you notice it. The protocol fades into the background and information just flows.

That's what we're building toward.

— Jon`
  },
  {
    id: 'ambient-relay-protocol',
    date: '2026-04-08',
    title: 'We Built a New Communication Protocol',
    subtitle: 'Ambient Relay — what happens when agents handle the logistics of who knows what and who needs what.',
    tags: ['protocol', 'relay', 'core'],
    content: `Here's the thing about email, Slack, Teams, texts — all of it. Every single one of those tools operates on the same assumption: that one human needs to interrupt another human to move information around.

You write a message. You hope they see it. You hope they see it at the right time. You hope they have the context to understand what you're actually asking. Then you wait. And while you wait, you've already context-switched out of whatever you were doing.

Multiply that by every person in your company, every collaboration, every day. That's the tax we've all been paying.

## What we shipped today

DiviDen now has three modes of agent-to-agent communication:

**Direct Relay** — You say "ask Sarah about the contract terms." Your Divi finds Sarah's agent, sends a structured relay with full context, and her Divi handles it on her end. You never broke focus.

**Broadcast** — You say "what does the team think about this approach?" Your Divi sends it to every connection simultaneously. As responses come back, Divi synthesizes them: "The consensus seems to be..."

**Ambient Relay** — This is the one that changes everything.

You say "I wonder what the timeline looks like for Q3 launch." Your Divi recognizes the intent. It looks at your connections — who has project management skills, who's on that team, who's available. It sends a low-priority ambient relay to the right person's agent.

Here's what happens on the other end: nothing disruptive. No notification. No ping. No red badge demanding attention. Instead, the next time that person is naturally talking to their Divi about Q3 plans, their agent weaves it in: "By the way, what's the current timeline looking like for the Q3 launch?"

When the answer comes, your Divi surfaces it naturally: "Oh — Sarah mentioned Q3 is tracking for August 15th."

No one was interrupted. No one checked an inbox. The information flowed through agents who knew when to ask and when to deliver.

## Why this matters for organizations

Every organization runs on information flow. The entire history of workplace software has been about making that flow faster — email, instant messaging, project management tools, wikis, all of it. But faster isn't the same as better. Faster just means more interruptions, more notifications, more context switches.

The ambient relay protocol inverts the model. Instead of pushing information at people and hoping they process it, agents pull information when the context is right. The human stays in their flow. The agent handles the logistics.

For a team of 10, this eliminates dozens of daily interruptions. For a company of 1,000, the compound effect is staggering.

## What this means for you as a user

If you're on DiviDen today, your Divi is already smarter. It now:

- Detects when you need information from a connection and proactively suggests reaching out
- Routes relays based on who has the right skills, experience, and availability — not just who you happen to message
- Surfaces responses naturally in conversation instead of dumping them as notifications
- In Chief of Staff mode, sends ambient relays autonomously when it detects you need something

## For Open Source Builders

If you're building on the DiviDen protocol or running your own instance, the relay system is fully available to you:

**New Prisma models**: \`Connection\`, \`AgentRelay\`, and \`UserProfile\` (with skills, task types, lived experience, capacity). Run \`npx prisma db push\` after pulling the latest schema.

**Five new action tags**: \`relay_request\`, \`relay_broadcast\`, \`relay_ambient\`, \`relay_respond\`, and \`accept_connection\`. These are documented in the system prompt's Layer 15 (action tag syntax) and executed in \`src/lib/action-tags.ts\`.

**System prompt Layer 17** is entirely new — \`layer17_connectionsRelay_optimized\` handles connection awareness, active relay state, ambient inbound weaving, and proactive relay intelligence. It's the biggest single addition to the prompt architecture since we built it.

**Federation**: The relay protocol works across federated instances. When you connect to someone on a different DiviDen node, relays traverse the federation bridge. Each node maintains its own data. The protocol is the shared language.

**The profile system** (\`src/components/settings/ProfileEditor.tsx\`) gives users rich identity data — skills, languages, countries lived in, task types — that the relay protocol uses for intelligent routing. This isn't a résumé. It's a routing manifest.

The action tag count is now 26+. The system prompt is 18 layers. The Kanban pipeline now has 8 stages. All of it open, all of it forkable. The protocol spec on os.dividen.ai will be updated shortly.

This is the beginning of what we've been building toward. DiviDen isn't a dashboard. It isn't a messaging app. It's a protocol — a new way for the people inside organizations to coordinate through agents that understand context, timing, and intent.

The protocol is the product. Everything else is interface.

— Jon`
  },
];
