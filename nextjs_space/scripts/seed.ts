import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed required test account
  const testPasswordHash = await bcrypt.hash('johndoe123', 12);
  
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      passwordHash: testPasswordHash,
      role: 'admin',
      mode: 'cockpit',
    },
  });

  // Seed admin account
  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'changeme', 12);

  await prisma.user.upsert({
    where: { email: 'admin@dividen.ai' },
    update: {},
    create: {
      email: 'admin@dividen.ai',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'admin',
      mode: 'cockpit',
    },
  });

  // Seed default notification rules for all users
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const user of allUsers) {
    // Meeting Starting Soon
    const existingMeeting = await prisma.notificationRule.findFirst({
      where: { userId: user.id, eventType: 'meeting_starting' },
    });
    if (!existingMeeting) {
      await prisma.notificationRule.create({
        data: {
          userId: user.id,
          name: 'Meeting Starting Soon',
          eventType: 'meeting_starting',
          conditions: JSON.stringify({ minutesBefore: 5 }),
          message: "Meeting '{{title}}' starts in {{minutes}}m",
          style: 'warning',
          sound: true,
          enabled: true,
        },
      });
    }
  }

  // ── Seed Marketplace Capabilities ──────────────────────────────────────────
  console.log('Seeding marketplace capabilities...');

  const capabilities = [
    {
      slug: 'email-triage-auto-respond',
      name: 'Email Triage & Auto-Respond',
      icon: '📧',
      description: 'Automatically categorize inbound emails by urgency and intent, draft context-aware replies, and escalate critical messages to your queue.',
      longDescription: 'Gives your Divi the ability to intelligently triage incoming emails. It reads the sender, subject, body, and thread context to classify urgency (critical/high/routine/FYI), detect intent (request, question, introduction, follow-up, spam), and either draft a reply or escalate to your queue. Customizable tone, signature, and escalation rules.',
      category: 'communications',
      tags: JSON.stringify(['email', 'triage', 'auto-reply', 'productivity']),
      integrationType: 'email',
      pricingModel: 'free',
      featured: true,
      editableFields: JSON.stringify(['tone', 'signature', 'escalationRules', 'autoReplyThreshold', 'vipContacts']),
      prompt: `You have the Email Triage & Auto-Respond capability enabled.

When an inbound email arrives (via webhook or sync), analyze it:
1. **Classify urgency**: critical (needs response <1hr), high (same day), routine (this week), fyi (no response needed)
2. **Detect intent**: request, question, introduction, follow-up, scheduling, spam/newsletter
3. **For routine emails**: Draft a contextual reply matching the operator's tone ({{tone}}). Sign with {{signature}}.
4. **For critical/high emails**: Create a queue item with the email summary and suggested reply. Do NOT auto-send.
5. **VIP contacts** ({{vipContacts}}): Always escalate to queue regardless of urgency.
6. **Escalation rules**: {{escalationRules}}
7. **Auto-reply threshold**: Only auto-send replies for emails classified below {{autoReplyThreshold}} urgency.

Never auto-send to new contacts you haven't seen before. Always check with the operator first.`,
    },
    {
      slug: 'meeting-prep-debrief',
      name: 'Meeting Prep & Debrief',
      icon: '📅',
      description: 'Automatically prepare pre-meeting briefs with attendee context and post-meeting action item extraction from transcripts.',
      longDescription: 'Before each meeting, your Divi assembles a brief: who the attendees are (from CRM), last interactions, open items, and suggested talking points. After the meeting, it processes the transcript to extract action items, decisions, and follow-ups — routing them to the appropriate queue or kanban card.',
      category: 'operations',
      tags: JSON.stringify(['meetings', 'prep', 'debrief', 'transcripts', 'action-items']),
      integrationType: 'calendar',
      pricingModel: 'free',
      featured: true,
      editableFields: JSON.stringify(['prepLeadTimeMinutes', 'briefDepth', 'actionItemAssignment', 'transcriptSource']),
      prompt: `You have the Meeting Prep & Debrief capability enabled.

**Pre-meeting (triggered {{prepLeadTimeMinutes}} minutes before):**
1. Look up all attendees in the CRM. Summarize: name, role, company, last interaction, any open items.
2. Check kanban cards and queue items related to the meeting topic or attendees.
3. Prepare a brief with: attendee context, suggested agenda points, open questions, and relevant documents.
4. Surface the brief via a queue notification or chat message.

**Post-meeting (triggered when transcript arrives):**
1. Parse the transcript for: decisions made, action items (who/what/when), follow-ups needed, and key takeaways.
2. Create queue items for each action item, tagged with the meeting.
3. Update relevant kanban cards with meeting notes.
4. Draft follow-up emails if commitments were made to external parties.

Brief depth: {{briefDepth}} (concise | detailed | comprehensive).
Action item assignment: {{actionItemAssignment}} (auto-assign | suggest | manual).
Transcript source: {{transcriptSource}} (webhook | manual upload).`,
    },
    {
      slug: 'crm-enrichment-sync',
      name: 'CRM Contact Enrichment',
      icon: '🔍',
      description: 'Automatically enrich new contacts with company data, social profiles, and relationship context from your communication history.',
      longDescription: 'When a new contact enters your CRM (via webhook, email, or manual entry), this capability triggers enrichment: it searches for the contact\'s company, role, LinkedIn presence, recent news, and cross-references your existing network for mutual connections. Results are merged into the contact record.',
      category: 'sales',
      tags: JSON.stringify(['crm', 'enrichment', 'contacts', 'research']),
      integrationType: 'crm',
      pricingModel: 'free',
      editableFields: JSON.stringify(['enrichmentDepth', 'autoEnrichThreshold', 'skipDomains']),
      prompt: `You have the CRM Contact Enrichment capability enabled.

When a new contact is created or updated:
1. Search for the contact's company, title, and public profile.
2. Cross-reference with existing contacts for mutual connections.
3. Summarize recent company news or relevant context.
4. Update the contact record with enriched data.
5. Enrichment depth: {{enrichmentDepth}} (basic | standard | deep).
6. Auto-enrich threshold: {{autoEnrichThreshold}} — only auto-enrich contacts from domains NOT in {{skipDomains}}.
7. For contacts from skip domains, just log the contact without enrichment.`,
    },
    {
      slug: 'invoice-expense-tracker',
      name: 'Invoice & Expense Tracker',
      icon: '💰',
      description: 'Parse incoming invoices and receipts, categorize expenses, flag anomalies, and maintain a running financial summary.',
      longDescription: 'Processes financial documents (invoices, receipts, statements) received via email or upload. Extracts amounts, vendors, categories, and due dates. Maintains a running expense ledger and flags unusual charges or overdue payments.',
      category: 'finance',
      tags: JSON.stringify(['invoices', 'expenses', 'finance', 'tracking', 'bookkeeping']),
      integrationType: 'email',
      pricingModel: 'free',
      editableFields: JSON.stringify(['expenseCategories', 'flagThreshold', 'currency', 'reportFrequency']),
      prompt: `You have the Invoice & Expense Tracker capability enabled.

When a financial document is received:
1. Extract: vendor name, amount, currency, date, due date, line items, tax.
2. Categorize into: {{expenseCategories}}.
3. Flag if amount exceeds {{flagThreshold}} or if vendor is new.
4. Add to queue for operator approval if flagged.
5. Maintain running totals by category and time period.
6. Default currency: {{currency}}.
7. Generate summary reports on {{reportFrequency}} basis.`,
    },
    {
      slug: 'lead-qualification',
      name: 'Inbound Lead Qualification',
      icon: '🎯',
      description: 'Score and qualify inbound leads based on configurable criteria, auto-respond with next steps, and route hot leads to your queue.',
      longDescription: 'Processes inbound inquiries (from email, forms, or webhooks) and scores them against your ideal customer profile. Hot leads get immediate follow-up drafts; cold leads get nurture sequences. All scoring criteria are customizable.',
      category: 'sales',
      tags: JSON.stringify(['leads', 'qualification', 'sales', 'scoring', 'pipeline']),
      integrationType: 'generic',
      pricingModel: 'free',
      editableFields: JSON.stringify(['idealCustomerProfile', 'scoringCriteria', 'hotLeadThreshold', 'coldLeadResponse', 'followUpCadence']),
      prompt: `You have the Inbound Lead Qualification capability enabled.

When a lead comes in:
1. Score against ideal customer profile: {{idealCustomerProfile}}.
2. Scoring criteria: {{scoringCriteria}}.
3. If score >= {{hotLeadThreshold}}: Create urgent queue item + draft personalized follow-up email.
4. If score < threshold: Send {{coldLeadResponse}} template and add to nurture track.
5. Follow-up cadence for nurture: {{followUpCadence}}.
6. Log all lead interactions in CRM contact record.`,
    },
    {
      slug: 'slack-channel-digest',
      name: 'Slack Channel Digest',
      icon: '💬',
      description: 'Summarize Slack channels into daily/weekly digests, extract action items, and highlight messages that need your attention.',
      longDescription: 'Connects to your Slack workspace via webhook and processes channel activity. Generates concise digests highlighting decisions, action items, questions directed at you, and important announcements. Configurable per channel.',
      category: 'communications',
      tags: JSON.stringify(['slack', 'digest', 'summary', 'channels', 'productivity']),
      integrationType: 'slack',
      pricingModel: 'free',
      editableFields: JSON.stringify(['channels', 'digestFrequency', 'highlightKeywords', 'ignoreChannels']),
      prompt: `You have the Slack Channel Digest capability enabled.

When Slack messages arrive via webhook:
1. Buffer messages by channel.
2. On {{digestFrequency}} schedule, generate digest per channel.
3. For each channel in {{channels}}: summarize key discussions, extract action items, highlight @mentions.
4. Flag messages containing {{highlightKeywords}}.
5. Ignore activity in {{ignoreChannels}}.
6. Surface digest as a chat message or queue item depending on urgency.`,
    },
    {
      slug: 'contract-review-assistant',
      name: 'Contract Review Assistant',
      icon: '📜',
      description: 'Analyze contracts and legal documents for key terms, risks, unusual clauses, and compliance issues.',
      longDescription: 'When a contract or legal document is shared, this capability extracts key terms (parties, dates, amounts, obligations), flags non-standard clauses, identifies risks, and generates a summary with recommended actions. Not legal advice — a smart first pass.',
      category: 'legal',
      tags: JSON.stringify(['contracts', 'legal', 'review', 'risk', 'compliance']),
      integrationType: 'generic',
      pricingModel: 'free',
      editableFields: JSON.stringify(['riskTolerance', 'standardTerms', 'flagClauses', 'jurisdictions']),
      prompt: `You have the Contract Review Assistant capability enabled.

When a contract is shared for review:
1. Extract: parties, effective date, term length, key obligations, payment terms, termination clauses.
2. Flag non-standard clauses based on {{standardTerms}}.
3. Identify risks based on {{riskTolerance}} (conservative | moderate | aggressive).
4. Specifically flag: {{flagClauses}} (e.g., non-compete, IP assignment, liability caps).
5. Check jurisdiction compatibility with {{jurisdictions}}.
6. Generate summary with: key terms, risks, recommended changes, and approval/rejection recommendation.
7. Add to queue for operator review with summary attached.

DISCLAIMER: This is an analytical tool, not legal advice. Always have a qualified attorney review contracts.`,
    },
    {
      slug: 'weekly-ops-report',
      name: 'Weekly Ops Report Generator',
      icon: '📊',
      description: 'Compile a weekly operations report from your queue, calendar, comms, and project activity — ready to share with stakeholders.',
      longDescription: 'Every week (or on-demand), this capability pulls data from across your Divi — completed tasks, open items, meeting outcomes, communication highlights, and project progress — and compiles it into a polished report. Customizable sections and audience.',
      category: 'operations',
      tags: JSON.stringify(['reports', 'operations', 'weekly', 'summary', 'stakeholders']),
      integrationType: null,
      pricingModel: 'free',
      editableFields: JSON.stringify(['reportDay', 'sections', 'audience', 'format', 'distributionList']),
      prompt: `You have the Weekly Ops Report Generator capability enabled.

On {{reportDay}} (or when requested), generate a report:
1. **Sections to include**: {{sections}} (e.g., completed-tasks, open-items, meetings-held, key-decisions, blockers, upcoming-week).
2. Pull data from: queue items, calendar events, comms messages, kanban cards, and project activity for the past 7 days.
3. Format: {{format}} (bullet-summary | narrative | mixed).
4. Audience: {{audience}} — adjust detail level and tone accordingly.
5. Distribution: {{distributionList}} — draft email with report or surface in chat.`,
    },
    {
      slug: 'candidate-screening',
      name: 'Candidate Screening & Outreach',
      icon: '👥',
      description: 'Screen job applicants against role requirements, rank candidates, and draft personalized outreach for top matches.',
      longDescription: 'Processes incoming applications or resumes, evaluates them against your job posting criteria, ranks candidates by fit, and drafts personalized outreach messages for top candidates. Handles rejection emails for non-fits with configurable tone.',
      category: 'hr',
      tags: JSON.stringify(['hiring', 'screening', 'candidates', 'outreach', 'recruiting']),
      integrationType: 'email',
      pricingModel: 'free',
      editableFields: JSON.stringify(['roleRequirements', 'scoringWeights', 'outreachTone', 'rejectionTemplate', 'topCandidateCount']),
      prompt: `You have the Candidate Screening capability enabled.

When a candidate application arrives:
1. Parse resume/application for: skills, experience, education, location.
2. Score against {{roleRequirements}} using {{scoringWeights}}.
3. Rank in the candidate pool.
4. Top {{topCandidateCount}} candidates: Draft personalized outreach in {{outreachTone}} tone.
5. Below threshold: Queue {{rejectionTemplate}} draft for operator review.
6. Create CRM contact for each candidate.
7. Surface top candidates as queue items for operator decision.`,
    },
    {
      slug: 'social-media-monitor',
      name: 'Social & News Monitor',
      icon: '📡',
      description: 'Monitor mentions of your brand, competitors, or keywords across news and social channels. Get real-time alerts for significant events.',
      longDescription: 'Tracks mentions and sentiment across configurable sources. When significant events are detected (press mentions, competitor moves, industry news), it creates a brief and routes it to your queue with recommended responses.',
      category: 'research',
      tags: JSON.stringify(['social-media', 'monitoring', 'news', 'brand', 'competitive-intelligence']),
      integrationType: 'generic',
      pricingModel: 'free',
      editableFields: JSON.stringify(['keywords', 'competitors', 'sources', 'alertThreshold', 'sentimentTracking']),
      prompt: `You have the Social & News Monitor capability enabled.

Continuously monitor for:
1. Keywords: {{keywords}} across {{sources}} (news, social, industry blogs).
2. Competitor activity: {{competitors}}.
3. Alert threshold: {{alertThreshold}} (any-mention | significant-only | critical-only).
4. When a significant mention is detected: create a brief with context, sentiment, and suggested response.
5. Track sentiment over time if {{sentimentTracking}} is enabled.
6. Route alerts to queue based on urgency.`,
    },
    {
      slug: 'project-standup-generator',
      name: 'Daily Standup Generator',
      icon: '🏗️',
      description: 'Generate daily standup updates from project activity, git commits, and task progress — ready to paste into Slack or email.',
      longDescription: 'Analyzes your recent activity across projects, queue items, and communications to generate a concise standup update. Follows the classic "done/doing/blocked" format or your custom template.',
      category: 'engineering',
      tags: JSON.stringify(['standup', 'daily', 'engineering', 'project-management']),
      integrationType: null,
      pricingModel: 'free',
      editableFields: JSON.stringify(['standupFormat', 'projectScope', 'deliveryMethod', 'standupTime']),
      prompt: `You have the Daily Standup Generator capability enabled.

At {{standupTime}} (or when requested), generate standup:
1. Pull activity from last 24hrs: completed queue items, kanban card updates, calendar events, and comms.
2. Scope to projects: {{projectScope}} (all | specific project IDs).
3. Format: {{standupFormat}} (done-doing-blocked | narrative | custom).
4. Delivery: {{deliveryMethod}} (chat | email-draft | queue-item).`,
    },
    {
      slug: 'content-draft-review',
      name: 'Content Drafting & Review',
      icon: '✍️',
      description: 'Draft blog posts, newsletters, and social content based on your notes and style guide. Review and suggest edits for existing content.',
      longDescription: 'Turn rough notes, bullet points, or voice memos into polished content. Maintains your brand voice and style guide. Can review existing drafts for clarity, grammar, tone consistency, and SEO optimization.',
      category: 'creative',
      tags: JSON.stringify(['content', 'writing', 'blog', 'newsletter', 'editing']),
      integrationType: null,
      pricingModel: 'free',
      editableFields: JSON.stringify(['brandVoice', 'styleGuide', 'targetAudience', 'contentTypes', 'seoKeywords']),
      prompt: `You have the Content Drafting & Review capability enabled.

When content work is requested:
1. Brand voice: {{brandVoice}}.
2. Style guide: {{styleGuide}}.
3. Target audience: {{targetAudience}}.
4. Supported content types: {{contentTypes}} (blog | newsletter | social | email-campaign | press-release).
5. For drafting: Transform notes/bullets into polished content matching brand voice.
6. For review: Check clarity, grammar, tone consistency, and {{seoKeywords}} optimization.
7. Surface drafts in chat; final versions as documents.`,
    },
    {
      slug: 'daily-briefing-generator',
      name: 'Daily Briefing Generator',
      icon: '📋',
      description: 'Generate a personalized morning briefing covering calendar, priority tasks, pending relays, and key metrics.',
      category: 'productivity',
      tags: 'briefing,morning,summary,daily,productivity',
      integrationType: null,
      pricingModel: 'free',
      featured: true,
      editableFields: JSON.stringify([
        { key: 'briefingTime', label: 'Briefing Time', type: 'text', placeholder: '8:00 AM' },
        { key: 'focusAreas', label: 'Focus Areas', type: 'textarea', placeholder: 'Revenue targets, hiring pipeline, product launches' },
        { key: 'tone', label: 'Tone', type: 'select', options: ['executive', 'casual', 'tactical'] },
      ]),
      prompt: `You are a daily briefing assistant.
1. Each {{briefingTime}}, compile a morning briefing for the operator.
2. Focus on: {{focusAreas}}.
3. Pull from: calendar events (next 24h), high-priority queue items, unread relays, recent activity.
4. Tone: {{tone}}. Keep it scannable — bullet points, bold highlights, action items at the top.
5. Flag anything that needs immediate attention as 🔴 URGENT.`,
    },
    {
      slug: 'expense-receipt-scanner',
      name: 'Expense Receipt Scanner',
      icon: '🧾',
      description: 'Process expense receipts from email attachments or uploads. Extract vendor, amount, date, and category for bookkeeping.',
      category: 'finance',
      tags: 'expense,receipt,bookkeeping,accounting,extract',
      integrationType: 'email',
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'expenseCategories', label: 'Expense Categories', type: 'textarea', placeholder: 'Travel, Software, Meals, Office Supplies' },
        { key: 'currency', label: 'Default Currency', type: 'text', placeholder: 'USD' },
        { key: 'approvalThreshold', label: 'Auto-Approve Below ($)', type: 'text', placeholder: '100' },
      ]),
      prompt: `You are an expense receipt processor.
1. When an email or document contains a receipt/invoice, extract: vendor name, amount, date, and categorize into {{expenseCategories}}.
2. Default currency: {{currency}}.
3. Auto-approve expenses below the amount set in approvalThreshold field. Flag larger ones for operator review.
4. Maintain a running log. Surface weekly expense summaries when asked.`,
    },
    {
      slug: 'competitor-intel-monitor',
      name: 'Competitor Intelligence Monitor',
      icon: '🔭',
      description: 'Track competitor activity across web, social, and news. Surface relevant updates and strategic implications.',
      category: 'sales',
      tags: 'competitor,intelligence,monitoring,strategy,market',
      integrationType: null,
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'competitors', label: 'Competitors to Track', type: 'textarea', placeholder: 'Company A, Company B, Company C' },
        { key: 'industry', label: 'Industry', type: 'text', placeholder: 'SaaS / AI' },
        { key: 'alertFrequency', label: 'Alert Frequency', type: 'select', options: ['daily', 'weekly', 'real-time'] },
      ]),
      prompt: `You are a competitive intelligence analyst.
1. Monitor and surface relevant updates about: {{competitors}}.
2. Industry context: {{industry}}.
3. Track: product launches, pricing changes, funding rounds, key hires, partnerships, press mentions.
4. Alert frequency: {{alertFrequency}}.
5. For each update, include: what happened, strategic implication for us, suggested response.`,
    },
    {
      slug: 'onboarding-checklist-helper',
      name: 'Employee Onboarding Helper',
      icon: '🎓',
      description: 'Guide new team members through onboarding with automated checklists, introductions, and resource sharing.',
      category: 'hr',
      tags: 'onboarding,new-hire,checklist,hr,training',
      integrationType: null,
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Acme Corp' },
        { key: 'onboardingSteps', label: 'Onboarding Steps', type: 'textarea', placeholder: 'Setup accounts, Meet team, Review handbook, First project brief' },
        { key: 'keyContacts', label: 'Key Contacts', type: 'textarea', placeholder: 'HR: jane@co, IT: bob@co, Manager: alice@co' },
      ]),
      prompt: `You are an onboarding coordinator for {{companyName}}.
1. When a new team member is introduced, create and track an onboarding checklist: {{onboardingSteps}}.
2. Key contacts: {{keyContacts}}.
3. Send introductions, share resources, and track progress through each step.
4. Surface a completion summary when all steps are done.`,
    },
    {
      slug: 'meeting-notes-distributor',
      name: 'Meeting Notes Distributor',
      icon: '📝',
      description: 'After meetings, automatically format notes, extract action items, and distribute summaries to attendees.',
      category: 'productivity',
      tags: 'meeting,notes,action-items,summary,distribute',
      integrationType: 'calendar',
      pricingModel: 'free',
      featured: true,
      editableFields: JSON.stringify([
        { key: 'noteFormat', label: 'Note Format', type: 'select', options: ['bullet-points', 'narrative', 'structured'] },
        { key: 'distributeVia', label: 'Distribute Via', type: 'select', options: ['chat', 'email-draft', 'relay'] },
        { key: 'includeActionItems', label: 'Include Action Items', type: 'select', options: ['yes', 'no'] },
      ]),
      prompt: `You are a meeting notes assistant.
1. After each meeting, format notes in {{noteFormat}} style.
2. Extract action items with owners and deadlines (if {{includeActionItems}} = yes).
3. Distribute summary via {{distributeVia}}.
4. For recurring meetings, track action item completion across sessions.`,
    },
    {
      slug: 'customer-feedback-aggregator',
      name: 'Customer Feedback Aggregator',
      icon: '📊',
      description: 'Collect and categorize customer feedback from multiple channels. Surface trends and sentiment shifts.',
      category: 'sales',
      tags: 'feedback,customer,sentiment,trends,product',
      integrationType: null,
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'feedbackChannels', label: 'Feedback Channels', type: 'textarea', placeholder: 'Support emails, Slack #feedback, NPS surveys' },
        { key: 'productAreas', label: 'Product Areas', type: 'textarea', placeholder: 'Onboarding, Dashboard, API, Billing' },
        { key: 'reportFrequency', label: 'Report Frequency', type: 'select', options: ['daily', 'weekly', 'monthly'] },
      ]),
      prompt: `You are a customer feedback analyst.
1. Aggregate feedback from: {{feedbackChannels}}.
2. Categorize by product area: {{productAreas}}.
3. Track sentiment (positive/neutral/negative) and volume trends.
4. Generate a {{reportFrequency}} report highlighting: top themes, sentiment shifts, urgent issues, feature requests.`,
    },
    {
      slug: 'sop-documentation-helper',
      name: 'SOP Documentation Helper',
      icon: '📖',
      description: 'Help create and maintain Standard Operating Procedures. Convert ad-hoc processes into documented, repeatable workflows.',
      category: 'operations',
      tags: 'sop,documentation,process,workflow,playbook',
      integrationType: null,
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'docStyle', label: 'Documentation Style', type: 'select', options: ['step-by-step', 'flowchart-text', 'checklist'] },
        { key: 'audience', label: 'Target Audience', type: 'text', placeholder: 'New hires, All staff, Technical team' },
      ]),
      prompt: `You are an SOP documentation assistant.
1. When the operator describes a process, convert it into a clean {{docStyle}} SOP.
2. Target audience: {{audience}}.
3. Include: purpose, prerequisites, step-by-step instructions, expected outcomes, troubleshooting tips.
4. Store SOPs as documents. When asked, surface relevant SOPs for a given task.`,
    },
    {
      slug: 'invoice-payment-reminder',
      name: 'Invoice & Payment Reminder',
      icon: '💰',
      description: 'Track outstanding invoices and payment due dates. Send reminders before deadlines and flag overdue payments.',
      category: 'finance',
      tags: 'invoice,payment,reminder,accounts-receivable,billing',
      integrationType: 'email',
      pricingModel: 'free',
      featured: false,
      editableFields: JSON.stringify([
        { key: 'reminderDays', label: 'Remind Days Before Due', type: 'text', placeholder: '7,3,1' },
        { key: 'escalationContact', label: 'Escalation Contact', type: 'text', placeholder: 'finance@company.com' },
        { key: 'overdueAction', label: 'Overdue Action', type: 'select', options: ['notify-only', 'draft-follow-up', 'escalate'] },
      ]),
      prompt: `You are an invoice and payment tracking assistant.
1. Track outstanding invoices and their due dates.
2. Send reminders {{reminderDays}} days before due date.
3. For overdue invoices: {{overdueAction}}.
4. Escalation contact: {{escalationContact}}.
5. Maintain a summary of accounts receivable status.`,
    },
  ];

  for (const cap of capabilities) {
    await prisma.marketplaceCapability.upsert({
      where: { slug: cap.slug },
      update: {
        name: cap.name,
        description: cap.description,
        longDescription: cap.longDescription,
        icon: cap.icon,
        category: cap.category,
        tags: cap.tags,
        integrationType: cap.integrationType,
        pricingModel: cap.pricingModel,
        featured: cap.featured || false,
        editableFields: cap.editableFields,
        prompt: cap.prompt,
        publisherName: 'DiviDen',
        publisherType: 'platform',
        approvalStatus: 'approved',
      },
      create: {
        ...cap,
        status: 'active',
        isSystemSeed: true,
        publisherName: 'DiviDen',
        publisherType: 'platform',
        approvalStatus: 'approved',
      },
    });
  }
  console.log(`Seeded ${capabilities.length} marketplace capabilities.`);

  // ── Agent Skills Capabilities (agentskills.io ecosystem) ──────────────────
  const agentSkills = [
    { slug: 'skill-document-processing', name: 'Document Processing', icon: '📄', category: 'operations', description: 'Extract, classify, and summarize documents using structured analysis.', prompt: 'Process documents by extracting key information, classifying content type, and generating structured summaries. Handle PDFs, emails, contracts, and reports.', skillBody: 'name: document-processing\nversion: 1.0\ninstructions: Extract structured data from documents.\nresources:\n  - type: file\n    accept: pdf,docx,txt' },
    { slug: 'skill-web-research', name: 'Web Research & Synthesis', icon: '🌐', category: 'research', description: 'Research topics across the web and synthesize findings into actionable summaries.', prompt: 'Conduct comprehensive web research on given topics. Cross-reference multiple sources, identify key findings, and produce structured research reports with citations.', skillBody: 'name: web-research\nversion: 1.0\ninstructions: Research and synthesize from multiple web sources.\noutput: structured-report' },
    { slug: 'skill-code-review', name: 'Code Review & Analysis', icon: '🔍', category: 'engineering', description: 'Analyze code for bugs, security issues, and improvement opportunities.', prompt: 'Review code submissions for bugs, security vulnerabilities, performance issues, and style consistency. Provide actionable feedback with specific line references and suggested fixes.', skillBody: 'name: code-review\nversion: 1.0\ninstructions: Analyze code quality and provide structured feedback.\nresources:\n  - type: code\n    languages: any' },
    { slug: 'skill-data-analysis', name: 'Data Analysis & Visualization', icon: '📊', category: 'finance', description: 'Analyze datasets and generate insights with visualization recommendations.', prompt: 'Analyze provided datasets. Identify trends, anomalies, and correlations. Generate summary statistics and recommend appropriate visualizations for key findings.', skillBody: 'name: data-analysis\nversion: 1.0\ninstructions: Analyze data and produce insights with visualization specs.\nresources:\n  - type: data\n    accept: csv,json,xlsx' },
    { slug: 'skill-api-integration', name: 'API Integration Builder', icon: '🔌', category: 'engineering', description: 'Design and document API integrations between services.', prompt: 'Design API integration workflows between specified services. Generate OpenAPI specs, authentication flows, error handling strategies, and implementation guides.', skillBody: 'name: api-integration\nversion: 1.0\ninstructions: Design and document API integration patterns.\noutput: openapi-spec' },
    { slug: 'skill-presentation', name: 'Presentation Builder', icon: '🎤', category: 'creative', description: 'Generate structured presentation outlines with speaker notes.', prompt: 'Create presentation outlines based on provided topics. Structure slides with clear narratives, data points, and speaker notes. Adapt tone for the target audience.', skillBody: 'name: presentation-builder\nversion: 1.0\ninstructions: Generate structured slide decks with narratives.\noutput: markdown-slides' },
    { slug: 'skill-test-generation', name: 'Test Generation & Automation', icon: '🧪', category: 'engineering', description: 'Generate test suites and automation scripts for codebases.', prompt: 'Analyze code and generate comprehensive test suites including unit tests, integration tests, and edge cases. Support multiple testing frameworks and languages.', skillBody: 'name: test-generation\nversion: 1.0\ninstructions: Generate test suites from code analysis.\nresources:\n  - type: code\n    languages: any' },
    { slug: 'skill-workflow-automation', name: 'Workflow Automation Designer', icon: '⚡', category: 'operations', description: 'Design automated workflows connecting tools and processes.', prompt: 'Design automated workflows that connect existing tools and processes. Generate step-by-step automation plans with trigger conditions, actions, and error handling.', skillBody: 'name: workflow-automation\nversion: 1.0\ninstructions: Design multi-step automation workflows.\noutput: workflow-spec' },
  ];

  for (const skill of agentSkills) {
    await prisma.marketplaceCapability.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, description: skill.description, prompt: skill.prompt, skillBody: skill.skillBody, publisherName: 'DiviDen', approvalStatus: 'approved' },
      create: {
        ...skill,
        pricingModel: 'free',
        status: 'active',
        isSystemSeed: true,
        skillFormat: true,
        skillSource: 'agentskills.io',
        publisherName: 'DiviDen',
        publisherType: 'platform',
        approvalStatus: 'approved',
        longDescription: `Agent Skills-compatible capability from the agentskills.io ecosystem. ${skill.description}`,
        tags: JSON.stringify(['agent-skills', skill.category]),
      },
    });
  }
  console.log(`Seeded ${agentSkills.length} Agent Skills capabilities.`);

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
