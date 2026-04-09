-- AlterTable: Add queueItemId to agent_relays for DEP-003 Relay↔Queue Bridge
ALTER TABLE "agent_relays" ADD COLUMN "queueItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agent_relays_queueItemId_key" ON "agent_relays"("queueItemId");
