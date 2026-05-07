WITH ranked_bread_entries AS (
  SELECT
    pe."id",
    ROW_NUMBER() OVER (
      PARTITION BY pe."companyId", pe."date"
      ORDER BY pe."createdAt" ASC, pe."id" ASC
    ) AS rn
  FROM "ProductionEntry" pe
  JOIN "SKU" sku ON sku."id" = pe."skuId"
  WHERE pe."deletedAt" IS NULL
    AND sku."name" ILIKE '%bread%'
)
UPDATE "ProductionEntry" pe
SET "batchNumber" = ranked_bread_entries.rn
FROM ranked_bread_entries
WHERE pe."id" = ranked_bread_entries."id";

ALTER TABLE "ProductionEntry" DROP COLUMN IF EXISTS "shift";
