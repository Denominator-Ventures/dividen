-- AlterTable: Add agent environment management fields to marketplace_subscriptions
ALTER TABLE "marketplace_subscriptions" ADD COLUMN IF NOT EXISTS "installed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "marketplace_subscriptions" ADD COLUMN IF NOT EXISTS "installedAt" TIMESTAMP(3);
ALTER TABLE "marketplace_subscriptions" ADD COLUMN IF NOT EXISTS "uninstalledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_subscriptions_installed_idx" ON "marketplace_subscriptions"("installed");
