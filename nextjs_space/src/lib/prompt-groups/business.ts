import { prisma } from '../prisma';

export async function buildBusinessOperationsLayer(userId: string): Promise<string> {
  try {
    const [
      activeContracts,
      postedJobs,
      appliedJobs,
      recentEarnings,
      reputation,
      recordings,
      integrations,
      marketplaceAgents,
      pendingApplications,
    ] = await Promise.all([
      // Active agreements where user is poster or contributor
      prisma.jobContract.findMany({
        where: {
          OR: [{ clientId: userId }, { workerId: userId }],
          status: { in: ['active', 'paused'] },
        },
        include: {
          job: { select: { id: true, title: true } },
          client: { select: { id: true, name: true } },
          worker: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Tasks the user posted
      prisma.networkJob.findMany({
        where: { posterId: userId, status: { in: ['open', 'in_progress'] } },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Tasks the user expressed interest in
      prisma.jobApplication.findMany({
        where: { applicantId: userId, status: { in: ['pending', 'shortlisted'] } },
        include: { job: { select: { id: true, title: true, compensationType: true, compensationAmount: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Recent payments (last 90 days) where user is contributor
      prisma.jobPayment.findMany({
        where: {
          contract: { workerId: userId },
          stripePaymentStatus: 'succeeded',
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // User's reputation score
      prisma.reputationScore.findUnique({ where: { userId } }),
      // Recent recordings
      prisma.recording.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Integration accounts
      prisma.integrationAccount.findMany({
        where: { userId, isActive: true },
        select: { provider: true, service: true, identity: true, label: true, lastSyncAt: true },
      }),
      // User's marketplace agents (if they're a developer)
      prisma.marketplaceAgent.findMany({
        where: { developerId: userId, status: 'active' },
        select: { id: true, name: true, category: true, pricingModel: true, avgRating: true, totalExecutions: true },
        take: 5,
      }),
      // Pending interest on user's posted tasks
      prisma.jobApplication.findMany({
        where: { job: { posterId: userId }, status: 'pending' },
        include: {
          job: { select: { title: true } },
          applicant: { select: { name: true, email: true } },
        },
        take: 10,
      }),
    ]);

    // Skip entire section if user has no business activity
    const hasActivity = activeContracts.length > 0 || postedJobs.length > 0 || appliedJobs.length > 0 
      || recentEarnings.length > 0 || reputation || recordings.length > 0 
      || integrations.length > 0 || marketplaceAgents.length > 0 || pendingApplications.length > 0;
    
    if (!hasActivity) return '';

    let text = '## Business Operations\n';

    // Active Agreements
    if (activeContracts.length > 0) {
      text += `\n### Active Agreements (${activeContracts.length})\n`;
      for (const c of activeContracts) {
        const role = c.clientId === userId ? 'POSTER' : 'CONTRIBUTOR';
        const counterparty = role === 'POSTER' ? c.worker?.name : c.client?.name;
        text += `- [${role}] "${c.job?.title}" with ${counterparty || 'Unknown'} — $${c.compensationAmount}/${c.compensationType} | Status: ${c.status} | Paid: $${c.totalPaid}\n`;
      }
    }

    // Posted Tasks
    if (postedJobs.length > 0) {
      text += `\n### Your Posted Tasks (${postedJobs.length})\n`;
      for (const j of postedJobs) {
        text += `- "${j.title}" (${j.status}) — ${j._count.applications} interested\n`;
      }
    }

    // Pending interest on your tasks - ACTION REQUIRED
    if (pendingApplications.length > 0) {
      text += `\n### 📋 Pending Interest — ACTION REQUIRED (${pendingApplications.length})\n`;
      for (const a of pendingApplications) {
        text += `- **${a.applicant?.name || a.applicant?.email}** expressed interest in "${a.job?.title}"\n`;
      }
      text += `Surface these to the operator. They can assign contributors from the Network → Tasks tab.\n`;
    }

    // Tasks applied to
    if (appliedJobs.length > 0) {
      text += `\n### Your Expressed Interest (${appliedJobs.length})\n`;
      for (const a of appliedJobs) {
        const comp = a.job?.compensationAmount ? `$${a.job.compensationAmount}/${a.job.compensationType}` : 'volunteer';
        text += `- "${a.job?.title}" — ${a.status} | ${comp}\n`;
      }
    }

    // Earnings
    if (recentEarnings.length > 0) {
      const totalEarned = recentEarnings.reduce((sum: any, p: any) => sum + p.workerPayout, 0);
      text += `\n### Earnings (last 90 days)\n`;
      text += `Total earned: $${totalEarned.toFixed(2)} across ${recentEarnings.length} payments\n`;
    }

    // Reputation
    if (reputation) {
      text += `\n### Reputation\n`;
      const ratingDisplay = reputation.jobsCompleted < 5 ? '5.0 ⭐ (new — ratings factor after 5 tasks)' : `${reputation.avgRating.toFixed(1)} ⭐ (${reputation.totalRatings} reviews)`;
      text += `Level: **${reputation.level}** | Score: ${reputation.score}/100 | ${ratingDisplay} | Tasks completed: ${reputation.jobsCompleted} | On-time: ${(reputation.onTimeRate * 100).toFixed(0)}%\n`;
    }

    // Recordings
    if (recordings.length > 0) {
      text += `\n### Recent Recordings (${recordings.length})\n`;
      for (const r of recordings) {
        const dur = r.duration ? ` (${Math.round(r.duration / 60)}min)` : '';
        text += `- [${r.id}] "${r.title}" (${r.source})${dur} — ${r.status}${r.cardId ? ` 🔗 linked to card` : ''}\n`;
      }
    }

    // Integration accounts
    if (integrations.length > 0) {
      text += `\n### Active Integrations\n`;
      const googleIntegrations = integrations.filter((i: any) => i.provider === 'google');
      const smtpIntegrations = integrations.filter((i: any) => i.provider !== 'google');
      if (googleIntegrations.length > 0) {
        text += `**Google OAuth Connected:**\n`;
        for (const i of googleIntegrations) {
          text += `- ${i.service} (${i.identity})${i.label ? ` — "${i.label}"` : ''}${i.lastSyncAt ? ` | last sync: ${new Date(i.lastSyncAt as any).toISOString().split('T')[0]}` : ' | not synced yet'}\n`;
        }
        text += `\nYou can trigger syncs with [[sync_signal:{"service":"email|calendar|drive|all"}]]. Use this when the operator asks about recent emails, upcoming meetings, or shared files.\n`;
        // Gemini meeting notes capability
        const hasCalendar = googleIntegrations.some((i: any) => i.service === 'calendar');
        if (hasCalendar && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'REPLACE_WITH_YOUR_GEMINI_API_KEY') {
          text += `\n**📝 Gemini Meeting Notes**: The operator has Gemini API configured. After calendar events with recordings, you can generate AI meeting notes using [[generate_meeting_notes:{"eventId":"...","recordingId":"optional"}]]. This creates structured notes with key decisions, action items, and follow-ups. Proactively suggest this after meetings end or when the operator mentions needing meeting notes.\n`;
        }
      }
      if (smtpIntegrations.length > 0) {
        text += `**SMTP/IMAP:**\n`;
        for (const i of smtpIntegrations) {
          text += `- ${i.provider}/${i.service} (${i.identity})${i.label ? ` — "${i.label}"` : ''}\n`;
        }
      }
    } else {
      text += `\n### Integrations\nNo services connected. The operator can connect Google (Gmail, Calendar, Drive) from Settings → Integrations. Guide them there if they mention emails, calendar, or files.\n`;
    }

    // Marketplace agents (developer's own)
    if (marketplaceAgents.length > 0) {
      text += `\n### Your Bubble Store Agents\n`;
      for (const a of marketplaceAgents) {
        text += `- **${a.name}** (${a.category}) — ${a.pricingModel} | ⭐ ${(a.avgRating as number)?.toFixed(1) || 'N/A'} | ${a.totalExecutions} executions\n`;
      }
    }

    // Installed marketplace agents — only agents actively in Divi's toolkit
    try {
      const installedAgents = await prisma.marketplaceSubscription.findMany({
        where: { userId, installed: true },
        include: {
          agent: {
            select: {
              id: true, name: true, category: true, taskTypes: true,
              contextInstructions: true, contextPreparation: true,
              requiredInputSchema: true, outputSchema: true,
              executionNotes: true, inputFormat: true, outputFormat: true,
              developerId: true,
            },
          },
        },
        take: 15,
      });

      if (installedAgents.length > 0) {
        text += `\n### Installed Agent Toolkit (${installedAgents.length} active)\nThese agents are installed in your environment. You know how to work with each of them. Use their Integration Kit to prepare context correctly before executing.\n`;
        for (const sub of installedAgents) {
          const ag = sub.agent;
          const isOwn = ag.developerId === userId;
          text += `\n#### 🔧 ${ag.name} (${ag.category})${isOwn ? ' [YOUR OWN — no fees]' : ''}\n`;
          text += `- ID: \`${ag.id}\` | Format: ${ag.inputFormat} → ${ag.outputFormat}\n`;
          if (ag.taskTypes) {
            try { const tt = JSON.parse(ag.taskTypes); text += `- Handles: ${tt.join(', ')}\n`; } catch {}
          }
          if (ag.contextInstructions) {
            text += `- **Context prep**: ${ag.contextInstructions.slice(0, 500)}\n`;
          }
          if (ag.contextPreparation) {
            try {
              const steps = JSON.parse(ag.contextPreparation);
              if (Array.isArray(steps) && steps.length > 0) {
                text += `- **Pre-flight**: ${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join(' | ')}\n`;
              }
            } catch {}
          }
          if (ag.executionNotes) {
            text += `- **Notes**: ${ag.executionNotes.slice(0, 200)}\n`;
          }
        }
        text += `\nWhen the operator's task matches an installed agent's task types, proactively suggest using it. Follow the Integration Kit instructions to prepare context before calling [[execute_agent:...]]. For the operator's OWN agents, execution is always free.\nAgents not in this list are NOT installed — suggest installing them first via [[install_agent:{"agentId":"..."}]] if the operator wants to use one.\n`;
      }
    } catch { /* installed agents lookup failed — non-critical */ }

    // Installed marketplace capabilities
    try {
      const userCaps = await prisma.userCapability.findMany({
        where: { userId, status: 'active' },
        include: {
          capability: {
            select: { id: true, name: true, category: true, icon: true, integrationType: true, tags: true },
          },
        },
        take: 20,
      });

      if (userCaps.length > 0) {
        text += `\n### Active Capabilities (${userCaps.length})\nThese capability packs extend what you can do. Each adds specialized behavior triggered by matching tasks, webhooks, or operator requests.\n`;
        for (const uc of userCaps) {
          const cap = uc.capability;
          text += `- ${cap.icon} **${cap.name}** (${cap.category})${cap.integrationType ? ` — pairs with ${cap.integrationType} webhooks` : ''}\n`;
        }
        text += `\nWhen you have a matching capability, tasks in that domain CAN enter the queue. The capability's prompt guides your behavior for those tasks.\n`;

        // Inject resolved prompts into context
        const resolvedCaps = await prisma.userCapability.findMany({
          where: { userId, status: 'active', resolvedPrompt: { not: null } },
          select: { resolvedPrompt: true, capability: { select: { name: true } } },
          take: 10,
        });
        if (resolvedCaps.length > 0) {
          text += `\n### Capability Instructions\n`;
          for (const rc of resolvedCaps) {
            text += `\n**${rc.capability.name}:**\n${rc.resolvedPrompt!.slice(0, 800)}\n`;
          }
        }
      } else {
        text += `\n### Capabilities\nNo capability packs installed yet. When the operator needs to handle tasks outside your built-in skills (email, meetings) and has no installed agents, suggest browsing the Bubble Store using [[suggest_marketplace:{"query":"..."}]].\n`;
      }
    } catch { /* capabilities lookup failed — non-critical */ }

    // Business-specific behavioral rules
    text += `\n### Business Operations Rules
- When the operator asks about earnings, show totals from agreements + Bubble Store.
- When someone expresses interest in a posted task, surface it proactively with their details.
- When an agreement is active, track milestones and payment status.
- Proactively remind about pending reviews on completed tasks.
- If recordings exist without summaries, offer to help review them.
- When the operator asks about their reputation, explain the scoring components. Everyone starts at 5.0⭐ — real ratings don't factor until 5+ completed tasks.
- For Stripe payment issues, guide them to Settings → 💳 Payments or the Bubble Store → Earnings tab.
- Payment routing uses a two-tier fee model:
  - INTERNAL transactions (both parties on the same instance): configurable fee, can be 0% for whitelabel/closed-team deployments.
  - NETWORK transactions (marketplace, federation, external agents/users): enforced minimum floor — ${process.env.NETWORK_RECRUITING_FEE_FLOOR || '7'}% platform fee on task agreements, ${process.env.NETWORK_MARKETPLACE_FEE_FLOOR || '3'}% on Bubble Store agent transactions. Payments route through DiviDen and cannot bypass the platform fee. The platform does not take a cut on equity or non-monetary compensation.
- Self-hosted instances connecting to the DiviDen network must route payments through DiviDen. The fee floor cannot be overridden for network transactions.`;

    return text;
  } catch (e) {
    console.error('Business operations layer error:', e);
    return '';
  }
}
