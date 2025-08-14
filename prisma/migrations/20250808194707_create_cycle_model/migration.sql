-- CreateTable
CREATE TABLE "public"."Cycle" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "observacoes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Cycle" ADD CONSTRAINT "Cycle_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
