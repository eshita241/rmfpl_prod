ALTER TABLE "ProductionEntry" ADD COLUMN "batchNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProductionEntry" ADD COLUMN "notes" TEXT;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "skuId", "date"
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "ProductionEntry"
  WHERE "deletedAt" IS NULL
)
UPDATE "ProductionEntry"
SET "batchNumber" = ranked.rn
FROM ranked
WHERE "ProductionEntry"."id" = ranked."id";
