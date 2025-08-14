-- 1) Adiciona as novas colunas ainda SEM NOT NULL/UNIQUE
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "badgeCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- 2) Preenche badgeCode para registros existentes
-- Prefixo conforme a role e um sufixo pseudo-aleatório em maiúsculas
UPDATE "User"
SET "badgeCode" = (
  CASE "role"
    WHEN 'ADMIN'   THEN 'ADM-'
    WHEN 'TECH'    THEN 'TECH-'
    WHEN 'AUDITOR' THEN 'AUD-'
    ELSE 'EMP-'
  END
  || UPPER(SUBSTRING(md5(random()::text || now()::text || "id") for 8))
)
WHERE "badgeCode" IS NULL OR "badgeCode" = '';

-- 3) Garante unicidade antes de travar a coluna
-- (Se já existir índice com outro nome, ajuste conforme necessário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_badgeCode_key'
  ) THEN
    CREATE UNIQUE INDEX "User_badgeCode_key" ON "User"("badgeCode");
  END IF;
END $$;

-- 4) Agora sim torna NOT NULL
ALTER TABLE "User" ALTER COLUMN "badgeCode" SET NOT NULL;
