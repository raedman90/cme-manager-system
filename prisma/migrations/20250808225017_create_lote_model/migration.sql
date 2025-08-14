-- AlterTable
ALTER TABLE "public"."Material" ADD COLUMN     "loteId" TEXT;

-- CreateTable
CREATE TABLE "public"."Lote" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lote_numero_key" ON "public"."Lote"("numero");

-- AddForeignKey
ALTER TABLE "public"."Material" ADD CONSTRAINT "Material_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
