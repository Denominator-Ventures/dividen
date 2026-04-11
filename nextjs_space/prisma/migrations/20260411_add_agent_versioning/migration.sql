-- Agent Versioning: version tracking + consumer version pinning
ALTER TABLE "marketplace_agents" ADD COLUMN "version" TEXT NOT NULL DEFAULT '1.0.0';
ALTER TABLE "marketplace_agents" ADD COLUMN "changelog" TEXT;
ALTER TABLE "marketplace_subscriptions" ADD COLUMN "pinnedVersion" TEXT;
