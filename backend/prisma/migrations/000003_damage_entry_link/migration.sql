ALTER TABLE "DamageEntry" ADD COLUMN "productionEntryId" TEXT;

ALTER TABLE "DamageEntry"
  ADD CONSTRAINT "DamageEntry_productionEntryId_fkey"
  FOREIGN KEY ("productionEntryId") REFERENCES "ProductionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
