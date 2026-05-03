ALTER TYPE "LogEntity" ADD VALUE 'DAMAGE';

CREATE TABLE "DamageEntry" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "batch" TEXT,
  "companyId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DamageEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DamageEntry"
  ADD CONSTRAINT "DamageEntry_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DamageEntry"
  ADD CONSTRAINT "DamageEntry_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DamageEntry"
  ADD CONSTRAINT "DamageEntry_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
