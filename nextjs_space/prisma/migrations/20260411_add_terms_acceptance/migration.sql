-- Add terms acceptance fields to User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;

-- Update marketplace execution fee default to 3%
ALTER TABLE "marketplace_executions" ALTER COLUMN "feePercent" SET DEFAULT 3;
