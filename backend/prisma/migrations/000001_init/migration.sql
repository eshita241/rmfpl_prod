CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE "LogEntity" AS ENUM ('SKU', 'ENTRY', 'USER_ROLE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SKU" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL,
  "mouldCapacity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionEntry" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "shift" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "quantityProduced" INTEGER NOT NULL,
  "mouldsUsed" INTEGER NOT NULL,
  "emptySlotsPerMould" INTEGER NOT NULL,
  "damages" INTEGER NOT NULL DEFAULT 0,
  "damageReason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Log" (
  "id" TEXT NOT NULL,
  "actionType" "ActionType" NOT NULL,
  "entity" "LogEntity" NOT NULL,
  "entityId" TEXT NOT NULL,
  "changes" JSONB NOT NULL,
  "performedBy" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");
CREATE UNIQUE INDEX "SKU_name_companyId_key" ON "SKU"("name", "companyId");

ALTER TABLE "SKU"
  ADD CONSTRAINT "SKU_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductionEntry"
  ADD CONSTRAINT "ProductionEntry_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionEntry"
  ADD CONSTRAINT "ProductionEntry_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionEntry"
  ADD CONSTRAINT "ProductionEntry_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Log"
  ADD CONSTRAINT "Log_performedBy_fkey"
  FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
