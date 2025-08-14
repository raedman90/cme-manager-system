-- CreateEnum
CREATE TYPE "public"."DisinfectionAgent" AS ENUM ('PERACETICO', 'HIPOCLORITO', 'OPA', 'QUATERNARIO', 'ALCOOL70', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."SterMethod" AS ENUM ('STEAM_134', 'STEAM_121', 'H2O2', 'ETO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."TestResult" AS ENUM ('PASS', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "public"."ShelfPolicy" AS ENUM ('TIME', 'EVENT');

-- DropEnum
DROP TYPE "public"."QualResult";

-- DropEnum
DROP TYPE "public"."SterilMethod";

-- CreateTable
CREATE TABLE "public"."WashEvent" (
    "id" TEXT NOT NULL,
    "stageEventId" TEXT NOT NULL,
    "method" "public"."WashMethod" NOT NULL,
    "detergent" TEXT,
    "timeMin" INTEGER,
    "tempC" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WashEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DisinfectionEvent" (
    "id" TEXT NOT NULL,
    "stageEventId" TEXT NOT NULL,
    "agent" "public"."DisinfectionAgent" NOT NULL,
    "concentration" TEXT,
    "contactMin" INTEGER NOT NULL,
    "solutionLotId" TEXT,
    "testStripLot" TEXT,
    "testStripResult" "public"."TestResult",
    "measuredTempC" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisinfectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SterilizationEvent" (
    "id" TEXT NOT NULL,
    "stageEventId" TEXT NOT NULL,
    "method" "public"."SterMethod" NOT NULL,
    "autoclaveId" TEXT,
    "program" TEXT,
    "exposureMin" INTEGER,
    "tempC" DOUBLE PRECISION,
    "ci" "public"."TestResult",
    "bi" "public"."TestResult",
    "loadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SterilizationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StorageEvent" (
    "id" TEXT NOT NULL,
    "stageEventId" TEXT NOT NULL,
    "location" TEXT,
    "shelfPolicy" "public"."ShelfPolicy",
    "expiresAt" TIMESTAMP(3),
    "integrityOk" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WashEvent_stageEventId_key" ON "public"."WashEvent"("stageEventId");

-- CreateIndex
CREATE UNIQUE INDEX "DisinfectionEvent_stageEventId_key" ON "public"."DisinfectionEvent"("stageEventId");

-- CreateIndex
CREATE UNIQUE INDEX "SterilizationEvent_stageEventId_key" ON "public"."SterilizationEvent"("stageEventId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageEvent_stageEventId_key" ON "public"."StorageEvent"("stageEventId");

-- AddForeignKey
ALTER TABLE "public"."WashEvent" ADD CONSTRAINT "WashEvent_stageEventId_fkey" FOREIGN KEY ("stageEventId") REFERENCES "public"."StageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DisinfectionEvent" ADD CONSTRAINT "DisinfectionEvent_stageEventId_fkey" FOREIGN KEY ("stageEventId") REFERENCES "public"."StageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SterilizationEvent" ADD CONSTRAINT "SterilizationEvent_stageEventId_fkey" FOREIGN KEY ("stageEventId") REFERENCES "public"."StageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StorageEvent" ADD CONSTRAINT "StorageEvent_stageEventId_fkey" FOREIGN KEY ("stageEventId") REFERENCES "public"."StageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
