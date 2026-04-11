-- AlterTable: Add Agent Integration Kit fields to marketplace_agents
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "taskTypes" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "contextInstructions" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "requiredInputSchema" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "outputSchema" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "usageExamples" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "contextPreparation" TEXT;
ALTER TABLE "marketplace_agents" ADD COLUMN IF NOT EXISTS "executionNotes" TEXT;
