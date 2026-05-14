ALTER TYPE "Role" ADD VALUE 'DISPATCH';
ALTER TYPE "LogEntity" ADD VALUE 'DISPATCH';

CREATE TABLE "DispatchEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "carNumber" TEXT NOT NULL,
    "sealNumber" TEXT,
    "jumboCratesReceived" INTEGER NOT NULL DEFAULT 0,
    "mediumCratesReceived" INTEGER NOT NULL DEFAULT 0,
    "pizzaCratesReceived" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DispatchEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DispatchEntry" ADD CONSTRAINT "DispatchEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchEntry" ADD CONSTRAINT "DispatchEntry_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchEntry" ADD CONSTRAINT "DispatchEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "DispatchEntry_date_idx" ON "DispatchEntry"("date");
CREATE INDEX "DispatchEntry_companyId_idx" ON "DispatchEntry"("companyId");
CREATE INDEX "DispatchEntry_skuId_idx" ON "DispatchEntry"("skuId");
