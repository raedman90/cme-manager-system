-- AlterTable
ALTER TABLE "public"."Material" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "codigo" VARCHAR(64),
ADD COLUMN     "descricao" TEXT;
