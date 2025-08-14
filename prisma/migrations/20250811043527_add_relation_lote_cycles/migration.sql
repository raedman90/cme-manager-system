/*
  Warnings:

  - You are about to drop the column `ativo` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `codigo` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `descricao` on the `Material` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Etapa" AS ENUM ('RECEBIMENTO', 'LAVAGEM', 'DESINFECCAO', 'ESTERILIZACAO', 'ARMAZENAMENTO');

-- DropIndex
DROP INDEX "public"."Material_ativo_idx";

-- DropIndex
DROP INDEX "public"."Material_codigo_idx";

-- DropIndex
DROP INDEX "public"."Material_codigo_key";

-- DropIndex
DROP INDEX "public"."Material_nome_idx";

-- AlterTable
ALTER TABLE "public"."Cycle" ADD COLUMN     "loteId" TEXT;

-- AlterTable
ALTER TABLE "public"."Lote" ADD COLUMN     "etapa" "public"."Etapa" NOT NULL DEFAULT 'ESTERILIZACAO';

-- AlterTable
ALTER TABLE "public"."Material" DROP COLUMN "ativo",
DROP COLUMN "codigo",
DROP COLUMN "descricao";

-- CreateIndex
CREATE INDEX "Cycle_loteId_idx" ON "public"."Cycle"("loteId");

-- AddForeignKey
ALTER TABLE "public"."Cycle" ADD CONSTRAINT "Cycle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
