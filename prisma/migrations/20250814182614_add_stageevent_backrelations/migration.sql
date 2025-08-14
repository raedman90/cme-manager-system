-- CreateEnum
CREATE TYPE "public"."DisinfectionActivationLevel" AS ENUM ('ATIVO_2', 'ATIVO_1', 'INATIVO', 'NAO_REALIZADO');

-- AlterTable
ALTER TABLE "public"."DisinfectionEvent" ADD COLUMN     "activationLevel" "public"."DisinfectionActivationLevel",
ADD COLUMN     "activationTime" TEXT,
ADD COLUMN     "testStripExpiry" TIMESTAMP(3);
