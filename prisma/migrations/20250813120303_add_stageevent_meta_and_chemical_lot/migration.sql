-- CreateEnum
CREATE TYPE "public"."WashMethod" AS ENUM ('MANUAL', 'ULTRASSONICA', 'TERMO_DESINFECCAO');

-- CreateEnum
CREATE TYPE "public"."Disinfectant" AS ENUM ('PERACETICO', 'HIPOCLORITO', 'OPA', 'QUATERNARIO', 'ALCOOL70', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."SterilMethod" AS ENUM ('STEAM_134', 'STEAM_121', 'H2O2', 'ETO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."QualResult" AS ENUM ('PASS', 'FAIL', 'NA');

-- AlterTable
ALTER TABLE "public"."StageEvent" ADD COLUMN     "meta" JSONB;

-- CreateTable
CREATE TABLE "public"."ChemicalLot" (
    "id" TEXT NOT NULL,
    "type" "public"."Disinfectant" NOT NULL,
    "lotCode" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3),
    "expiryAt" TIMESTAMP(3),
    "concentration" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChemicalLot_pkey" PRIMARY KEY ("id")
);
