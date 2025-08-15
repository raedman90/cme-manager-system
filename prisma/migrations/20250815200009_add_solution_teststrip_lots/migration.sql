-- CreateEnum
CREATE TYPE "public"."ConcentrationUnit" AS ENUM ('PERCENT', 'PPM');

-- CreateTable
CREATE TABLE "public"."SolutionLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "agent" "public"."DisinfectionAgent" NOT NULL,
    "concentrationLabel" TEXT,
    "unit" "public"."ConcentrationUnit",
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "expiryAt" TIMESTAMP(3) NOT NULL,
    "brand" TEXT,
    "supplier" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolutionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TestStripLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "agent" "public"."DisinfectionAgent" NOT NULL,
    "expiryAt" TIMESTAMP(3) NOT NULL,
    "brand" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestStripLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolutionLot_agent_active_expiryAt_idx" ON "public"."SolutionLot"("agent", "active", "expiryAt");

-- CreateIndex
CREATE INDEX "TestStripLot_agent_active_expiryAt_idx" ON "public"."TestStripLot"("agent", "active", "expiryAt");
