/**
 * Feature Gates — Premium feature enforcement for DiviDen open-core model.
 * 
 * Teams are a premium feature. The code is open source (MIT), but the hosted
 * platform requires an active TeamSubscription for team features.
 * 
 * Billing boundary: work inside a team-owned project → team pays.
 * Personal work → individual pays. The project is the attribution unit.
 */

import { prisma } from '@/lib/prisma';

export class FeatureGateError extends Error {
  public code: string;
  public tier?: string;
  
  constructor(message: string, code: string = 'SUBSCRIPTION_REQUIRED', tier?: string) {
    super(message);
    this.name = 'FeatureGateError';
    this.code = code;
    this.tier = tier;
  }
}

/**
 * Require an active team subscription (any tier).
 * Use this for: team creation, team projects, team billing, team profiles.
 */
export async function requireTeamSubscription(teamId: string) {
  const sub = await prisma.teamSubscription.findUnique({
    where: { teamId },
  });

  if (!sub) {
    throw new FeatureGateError(
      'Teams require an active subscription. Start a 14-day free trial to get started.',
      'NO_SUBSCRIPTION'
    );
  }

  if (sub.status === 'canceled') {
    throw new FeatureGateError(
      'This team\'s subscription has been canceled. Reactivate to use team features.',
      'SUBSCRIPTION_CANCELED'
    );
  }

  if (sub.status === 'past_due') {
    throw new FeatureGateError(
      'This team\'s subscription payment is past due. Please update your payment method.',
      'SUBSCRIPTION_PAST_DUE'
    );
  }

  // Trialing and active are both valid
  return sub;
}

/**
 * Require Team Pro subscription.
 * Use this for: team agent, advanced spending policies, team analytics,
 * team↔team connections, unlimited projects.
 */
export async function requireTeamPro(teamId: string) {
  const sub = await requireTeamSubscription(teamId);

  if (sub.tier !== 'pro') {
    throw new FeatureGateError(
      'This feature requires a Team Pro subscription. Upgrade to unlock the team agent, unlimited projects, and advanced controls.',
      'PRO_REQUIRED',
      'pro'
    );
  }

  return sub;
}

/**
 * Check if team can add more members based on subscription limits.
 */
export async function checkTeamMemberLimit(teamId: string) {
  const sub = await requireTeamSubscription(teamId);

  const memberCount = await prisma.teamMember.count({
    where: { teamId },
  });

  if (memberCount >= sub.memberLimit) {
    const upgradeMsg = sub.tier === 'starter'
      ? ' Upgrade to Team Pro for up to 10 members (and $9/additional member beyond that).'
      : ` Add more members at $${sub.perSeatPrice || 9}/month per additional seat.`;

    throw new FeatureGateError(
      `This team has reached its member limit (${sub.memberLimit}).${upgradeMsg}`,
      'MEMBER_LIMIT_REACHED',
      sub.tier
    );
  }

  return { sub, memberCount };
}

/**
 * Check if team can add more projects (Starter = 3, Pro = unlimited).
 */
export async function checkTeamProjectLimit(teamId: string) {
  const sub = await requireTeamSubscription(teamId);

  if (sub.tier === 'starter') {
    const projectCount = await prisma.project.count({
      where: { teamId, status: { not: 'archived' } },
    });

    if (projectCount >= 3) {
      throw new FeatureGateError(
        'Team Starter allows up to 3 active projects. Upgrade to Team Pro for unlimited projects.',
        'PROJECT_LIMIT_REACHED',
        'starter'
      );
    }
  }

  return sub;
}

/**
 * Check team spending policy before allowing a billable action.
 * Returns true if the action is within budget, throws if over limit.
 */
export async function checkTeamBudget(teamId: string, amount: number) {
  const billing = await prisma.teamBilling.findUnique({
    where: { teamId },
  });

  if (!billing || !billing.isActive) {
    throw new FeatureGateError(
      'Team billing is not set up. Configure a payment method to use team-billed services.',
      'NO_BILLING'
    );
  }

  if (billing.monthlyBudget && (billing.currentSpend + amount) > billing.monthlyBudget) {
    throw new FeatureGateError(
      `This action would exceed the team\'s monthly budget ($${billing.monthlyBudget}). Current spend: $${billing.currentSpend.toFixed(2)}.`,
      'BUDGET_EXCEEDED'
    );
  }

  return billing;
}

/**
 * Get the billing context for a project — determines who pays.
 * Returns team billing if the project belongs to a team with active billing,
 * otherwise returns null (individual pays).
 */
export async function getProjectBillingContext(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { teamId: true },
  });

  if (!project?.teamId) return null; // Personal project — individual pays

  const billing = await prisma.teamBilling.findUnique({
    where: { teamId: project.teamId },
  });

  if (!billing || !billing.isActive) return null; // Team has no billing — individual pays

  return {
    teamId: project.teamId,
    billing,
  };
}

/**
 * Determine subscription tier defaults for creating a new team subscription.
 */
export function getSubscriptionDefaults(tier: 'starter' | 'pro') {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  if (tier === 'starter') {
    return {
      tier: 'starter',
      status: 'trialing',
      memberLimit: 5,
      monthlyPrice: 29,
      perSeatPrice: null,
      billingCycleStart: now,
      trialEndsAt: trialEnd,
    };
  }

  return {
    tier: 'pro',
    status: 'trialing',
    memberLimit: 10,
    monthlyPrice: 79,
    perSeatPrice: 9,
    billingCycleStart: now,
    trialEndsAt: trialEnd,
  };
}
