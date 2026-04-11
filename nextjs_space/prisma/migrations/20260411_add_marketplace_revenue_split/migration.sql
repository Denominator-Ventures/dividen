-- Add revenue tracking to MarketplaceAgent
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "totalGrossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "totalPlatformFees" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "totalDeveloperPayout" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "pendingPayout" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add revenue split to MarketplaceExecution
ALTER TABLE "marketplace_executions" ADD COLUMN IF NOT EXISTS "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_executions" ADD COLUMN IF NOT EXISTS "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_executions" ADD COLUMN IF NOT EXISTS "developerPayout" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "marketplace_executions" ADD COLUMN IF NOT EXISTS "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 7;
