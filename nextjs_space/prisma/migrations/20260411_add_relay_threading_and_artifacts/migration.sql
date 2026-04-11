-- FVP Brief Proposals #2 and #3: Relay Threading + Structured Artifacts
-- Add threadId for multi-turn conversation grouping
ALTER TABLE "agent_relays" ADD COLUMN "threadId" TEXT;
-- Add artifact support for typed response objects
ALTER TABLE "agent_relays" ADD COLUMN "artifactType" TEXT;
ALTER TABLE "agent_relays" ADD COLUMN "artifacts" TEXT;
-- Index for thread queries
CREATE INDEX "agent_relays_threadId_idx" ON "agent_relays"("threadId");
