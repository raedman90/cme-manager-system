-- CreateTable
CREATE TABLE "public"."AlertComment" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertComment_alertId_createdAt_idx" ON "public"."AlertComment"("alertId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AlertComment" ADD CONSTRAINT "AlertComment_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "public"."Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
