-- CreateEnum
CREATE TYPE "public"."AlertKind" AS ENUM ('DISINFECTION_FAIL', 'STERILIZATION_FAIL', 'STORAGE_EXPIRES_SOON', 'STORAGE_EXPIRED', 'READINESS_BLOCK');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('OPEN', 'ACKED', 'RESOLVED');

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "public"."AlertKind" NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "cycleId" TEXT,
    "materialId" TEXT,
    "stageEventId" TEXT,
    "stage" TEXT,
    "dueAt" TIMESTAMP(3),
    "data" JSONB,
    "ackedBy" TEXT,
    "ackedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_key_key" ON "public"."Alert"("key");

-- CreateIndex
CREATE INDEX "Alert_status_severity_createdAt_idx" ON "public"."Alert"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_cycleId_idx" ON "public"."Alert"("cycleId");

-- CreateIndex
CREATE INDEX "Alert_stageEventId_idx" ON "public"."Alert"("stageEventId");
