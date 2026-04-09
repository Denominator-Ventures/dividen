-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "duration" INTEGER,
    "dbAction" TEXT,
    "dbModel" TEXT,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetry_events_type_idx" ON "telemetry_events"("type");

-- CreateIndex
CREATE INDEX "telemetry_events_userId_idx" ON "telemetry_events"("userId");

-- CreateIndex
CREATE INDEX "telemetry_events_createdAt_idx" ON "telemetry_events"("createdAt");

-- CreateIndex
CREATE INDEX "telemetry_events_path_idx" ON "telemetry_events"("path");
