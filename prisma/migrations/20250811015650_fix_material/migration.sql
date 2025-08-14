-- Adiciona colunas novas (codigo sem NOT NULL por enquanto)
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "descricao" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

-- Preenche 'codigo' para registros já existentes (garante unicidade)
UPDATE "Material"
SET "codigo" = 'MAT-' || to_char(now(), 'YYYYMMDD') || '-' || substr("id", 1, 8)
WHERE ("codigo" IS NULL OR "codigo" = '');

-- Torna 'codigo' obrigatório e único
ALTER TABLE "Material" ALTER COLUMN "codigo" SET NOT NULL;

-- Índice único (usa o nome padrão que o Prisma gera para @unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Material_codigo_key'
  ) THEN
    CREATE UNIQUE INDEX "Material_codigo_key" ON "Material"("codigo");
  END IF;
END$$;
