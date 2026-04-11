-- FVP Brief Proposal #7: Portable Reputation
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "isFederated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "endorsements" TEXT;
ALTER TABLE "reputation_scores" ADD COLUMN IF NOT EXISTS "federatedScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
