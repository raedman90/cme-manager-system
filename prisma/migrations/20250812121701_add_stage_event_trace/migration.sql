-- CreateEnum
CREATE TYPE "public"."EventSource" AS ENUM ('DB', 'LEDGER');

-- CreateTable
CREATE TABLE "public"."StageEvent" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorId" TEXT,
    "operatorMSP" TEXT,
    "source" "public"."EventSource" NOT NULL,
    "ledgerTxId" TEXT,
    "ledgerBlock" BIGINT,
    "batchId" TEXT,
    "notes" TEXT,

    CONSTRAINT "StageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StageEvent_ledgerTxId_key" ON "public"."StageEvent"("ledgerTxId");

-- CreateIndex
CREATE INDEX "StageEvent_materialId_occurredAt_idx" ON "public"."StageEvent"("materialId", "occurredAt");

-- CreateIndex
CREATE INDEX "StageEvent_cycleId_occurredAt_idx" ON "public"."StageEvent"("cycleId", "occurredAt");

-- AddForeignKey
ALTER TABLE "public"."StageEvent" ADD CONSTRAINT "StageEvent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StageEvent" ADD CONSTRAINT "StageEvent_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "public"."Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
