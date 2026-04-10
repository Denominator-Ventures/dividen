/**
 * DEP-013: Job Matching Engine
 * 
 * Scores how well a user profile matches a job posting.
 * Uses skills overlap, task type alignment, availability, and reputation.
 */

import { prisma } from '@/lib/prisma';

interface MatchResult {
  userId: string;
  score: number;       // 0-1
  reason: string;      // human-readable explanation
  breakdown: {
    skillMatch: number;
    taskTypeMatch: number;
    availabilityMatch: number;
    reputationBonus: number;
  };
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(s => String(s).toLowerCase().trim()) : [];
  } catch {
    return [];
  }
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const matches = a.filter(s => setB.has(s)).length;
  return matches / Math.max(a.length, 1);
}

/**
 * Find and score matching users for a given job.
 * Returns sorted by score descending.
 */
export async function findMatchesForJob(jobId: string, limit = 20): Promise<MatchResult[]> {
  const job = await prisma.networkJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'open') return [];

  const requiredSkills = parseJsonArray(job.requiredSkills);
  const preferredSkills = parseJsonArray(job.preferredSkills);
  const allJobSkills = [...new Set([...requiredSkills, ...preferredSkills])];

  // Get all user profiles (exclude poster)
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { not: job.posterId } },
    include: { user: { select: { id: true, name: true } } },
  });

  const results: MatchResult[] = [];

  for (const profile of profiles) {
    const userSkills = parseJsonArray(profile.skills);
    const userTaskTypes = parseJsonArray(profile.taskTypes);

    // 1. Skill match (40% weight)
    const reqScore = requiredSkills.length > 0 ? overlapScore(requiredSkills, userSkills) : 0.5;
    const prefScore = preferredSkills.length > 0 ? overlapScore(preferredSkills, userSkills) : 0;
    const skillMatch = requiredSkills.length > 0
      ? reqScore * 0.7 + prefScore * 0.3
      : overlapScore(allJobSkills, userSkills);

    // 2. Task type match (25% weight)
    const taskTypeMatch = userTaskTypes.includes(job.taskType.toLowerCase()) ? 1 : 0;

    // 3. Availability (20% weight)
    let availabilityMatch = 0.5;
    if (profile.capacity === 'available') availabilityMatch = 1;
    else if (profile.capacity === 'limited') availabilityMatch = 0.6;
    else if (profile.capacity === 'busy') availabilityMatch = 0.2;
    else if (profile.capacity === 'unavailable') availabilityMatch = 0;

    // 4. Reputation bonus (15% weight)
    let reputationBonus = 0.5; // default for new users
    const rep = await prisma.reputationScore.findUnique({ where: { userId: profile.userId } });
    if (rep) {
      reputationBonus = rep.score / 100;
    }

    const score = skillMatch * 0.4 + taskTypeMatch * 0.25 + availabilityMatch * 0.2 + reputationBonus * 0.15;

    // Build reason
    const matchedSkills = allJobSkills.filter(s => userSkills.includes(s));
    const reasonParts: string[] = [];
    if (matchedSkills.length > 0) reasonParts.push(`Skills: ${matchedSkills.join(', ')}`);
    if (taskTypeMatch > 0) reasonParts.push(`Task type "${job.taskType}" in their repertoire`);
    if (availabilityMatch >= 0.6) reasonParts.push(`Currently ${profile.capacity}`);
    if (rep && rep.score >= 50) reasonParts.push(`Reputation: ${rep.level} (${Math.round(rep.score)})`);

    results.push({
      userId: profile.userId,
      score: Math.round(score * 100) / 100,
      reason: reasonParts.join('. ') || 'General availability',
      breakdown: { skillMatch, taskTypeMatch, availabilityMatch, reputationBonus },
    });
  }

  return results
    .filter(r => r.score > 0.1) // minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find matching jobs for a given user profile.
 */
export async function findMatchingJobsForUser(userId: string, limit = 20): Promise<(MatchResult & { jobId: string })[]> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  const userSkills = parseJsonArray(profile.skills);
  const userTaskTypes = parseJsonArray(profile.taskTypes);

  // Get open jobs not posted by this user
  const jobs = await prisma.networkJob.findMany({
    where: { status: 'open', posterId: { not: userId } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const rep = await prisma.reputationScore.findUnique({ where: { userId } });

  const results: (MatchResult & { jobId: string })[] = [];

  for (const job of jobs) {
    const requiredSkills = parseJsonArray(job.requiredSkills);
    const preferredSkills = parseJsonArray(job.preferredSkills);
    const allJobSkills = [...new Set([...requiredSkills, ...preferredSkills])];

    const reqScore = requiredSkills.length > 0 ? overlapScore(requiredSkills, userSkills) : 0.5;
    const prefScore = preferredSkills.length > 0 ? overlapScore(preferredSkills, userSkills) : 0;
    const skillMatch = requiredSkills.length > 0
      ? reqScore * 0.7 + prefScore * 0.3
      : overlapScore(allJobSkills, userSkills);

    const taskTypeMatch = userTaskTypes.includes(job.taskType.toLowerCase()) ? 1 : 0;

    let availabilityMatch = 0.5;
    if (profile.capacity === 'available') availabilityMatch = 1;
    else if (profile.capacity === 'limited') availabilityMatch = 0.6;
    else if (profile.capacity === 'busy') availabilityMatch = 0.2;
    else if (profile.capacity === 'unavailable') availabilityMatch = 0;

    let reputationBonus = 0.5;
    if (rep) reputationBonus = rep.score / 100;

    const score = skillMatch * 0.4 + taskTypeMatch * 0.25 + availabilityMatch * 0.2 + reputationBonus * 0.15;

    const matchedSkills = allJobSkills.filter(s => userSkills.includes(s));
    const reasonParts: string[] = [];
    if (matchedSkills.length > 0) reasonParts.push(`Your skills match: ${matchedSkills.join(', ')}`);
    if (taskTypeMatch > 0) reasonParts.push(`Task type "${job.taskType}" matches your preferences`);
    if (job.compensation) reasonParts.push(`Compensation: ${job.compensation}`);

    results.push({
      jobId: job.id,
      userId,
      score: Math.round(score * 100) / 100,
      reason: reasonParts.join('. ') || 'Open task on the network',
      breakdown: { skillMatch, taskTypeMatch, availabilityMatch, reputationBonus },
    });
  }

  return results
    .filter(r => r.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Recompute reputation score for a user.
 */
export async function recomputeReputation(userId: string) {
  const [completedJobs, postedJobs, reviews, allAssigned] = await Promise.all([
    prisma.networkJob.count({ where: { assigneeId: userId, status: 'completed' } }),
    prisma.networkJob.count({ where: { posterId: userId } }),
    prisma.jobReview.findMany({ where: { revieweeId: userId }, select: { rating: true } }),
    prisma.networkJob.findMany({
      where: { assigneeId: userId, status: { in: ['completed', 'expired'] } },
      select: { status: true, deadline: true, updatedAt: true },
    }),
  ]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // On-time rate: completed before deadline
  let onTimeCount = 0;
  let deadlineCount = 0;
  for (const j of allAssigned) {
    if (j.deadline) {
      deadlineCount++;
      if (j.status === 'completed' && j.updatedAt <= j.deadline) onTimeCount++;
    }
  }
  const onTimeRate = deadlineCount > 0 ? onTimeCount / deadlineCount : 1;

  // Response rate (as poster)
  const postedJobIds = await prisma.networkJob.findMany({
    where: { posterId: userId },
    select: { id: true },
  });
  let totalApps = 0;
  let respondedApps = 0;
  if (postedJobIds.length > 0) {
    const apps = await prisma.jobApplication.findMany({
      where: { jobId: { in: postedJobIds.map(j => j.id) } },
      select: { status: true },
    });
    totalApps = apps.length;
    respondedApps = apps.filter(a => a.status !== 'pending').length;
  }
  const responseRate = totalApps > 0 ? respondedApps / totalApps : 1;

  // Composite score (0-100)
  const completionWeight = Math.min(completedJobs * 5, 30); // max 30 from completions
  const ratingWeight = (avgRating / 5) * 35; // max 35 from ratings
  const onTimeWeight = onTimeRate * 20; // max 20 from punctuality
  const responseWeight = responseRate * 15; // max 15 from responsiveness
  const score = Math.min(completionWeight + ratingWeight + onTimeWeight + responseWeight, 100);

  // Level thresholds
  let level = 'new';
  if (score >= 80) level = 'exemplary';
  else if (score >= 60) level = 'trusted';
  else if (score >= 40) level = 'established';
  else if (score >= 20) level = 'rising';

  await prisma.reputationScore.upsert({
    where: { userId },
    create: {
      userId,
      jobsCompleted: completedJobs,
      jobsPosted: postedJobs,
      avgRating,
      totalRatings: reviews.length,
      onTimeRate,
      responseRate,
      score,
      level,
    },
    update: {
      jobsCompleted: completedJobs,
      jobsPosted: postedJobs,
      avgRating,
      totalRatings: reviews.length,
      onTimeRate,
      responseRate,
      score,
      level,
    },
  });

  return { score, level, jobsCompleted: completedJobs, avgRating, onTimeRate };
}
