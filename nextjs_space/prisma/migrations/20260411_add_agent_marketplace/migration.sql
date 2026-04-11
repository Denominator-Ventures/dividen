-- CreateTable
CREATE TABLE "marketplace_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "endpointUrl" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL DEFAULT 'bearer',
    "authHeader" TEXT,
    "authToken" TEXT,
    "developerId" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "developerUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "inputFormat" TEXT NOT NULL DEFAULT 'text',
    "outputFormat" TEXT NOT NULL DEFAULT 'text',
    "samplePrompts" TEXT,
    "pricingModel" TEXT NOT NULL DEFAULT 'free',
    "pricePerTask" DOUBLE PRECISION,
    "subscriptionPrice" DOUBLE PRECISION,
    "taskLimit" INTEGER,
    "pricingDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "successRate" DOUBLE PRECISION,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "supportsA2A" BOOLEAN NOT NULL DEFAULT false,
    "supportsMCP" BOOLEAN NOT NULL DEFAULT false,
    "agentCardUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_subscriptions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "tasksUsed" INTEGER NOT NULL DEFAULT 0,
    "taskLimit" INTEGER,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "taskInput" TEXT NOT NULL,
    "taskOutput" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "responseTimeMs" INTEGER,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_agents_slug_key" ON "marketplace_agents"("slug");
CREATE INDEX "marketplace_agents_developerId_idx" ON "marketplace_agents"("developerId");
CREATE INDEX "marketplace_agents_status_idx" ON "marketplace_agents"("status");
CREATE INDEX "marketplace_agents_category_idx" ON "marketplace_agents"("category");
CREATE INDEX "marketplace_agents_featured_idx" ON "marketplace_agents"("featured");
CREATE INDEX "marketplace_agents_pricingModel_idx" ON "marketplace_agents"("pricingModel");
CREATE INDEX "marketplace_agents_createdAt_idx" ON "marketplace_agents"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_subscriptions_agentId_userId_key" ON "marketplace_subscriptions"("agentId", "userId");
CREATE INDEX "marketplace_subscriptions_agentId_idx" ON "marketplace_subscriptions"("agentId");
CREATE INDEX "marketplace_subscriptions_userId_idx" ON "marketplace_subscriptions"("userId");
CREATE INDEX "marketplace_subscriptions_status_idx" ON "marketplace_subscriptions"("status");

-- CreateIndex
CREATE INDEX "marketplace_executions_agentId_idx" ON "marketplace_executions"("agentId");
CREATE INDEX "marketplace_executions_userId_idx" ON "marketplace_executions"("userId");
CREATE INDEX "marketplace_executions_status_idx" ON "marketplace_executions"("status");
CREATE INDEX "marketplace_executions_createdAt_idx" ON "marketplace_executions"("createdAt");

-- AddForeignKey
ALTER TABLE "marketplace_agents" ADD CONSTRAINT "marketplace_agents_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_subscriptions" ADD CONSTRAINT "marketplace_subscriptions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "marketplace_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_subscriptions" ADD CONSTRAINT "marketplace_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_executions" ADD CONSTRAINT "marketplace_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "marketplace_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_executions" ADD CONSTRAINT "marketplace_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
