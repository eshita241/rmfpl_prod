import { ActionType, LogEntity, Prisma, SkuCategory } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";

type SkuInput = {
  name: string;
  companyId: string;
  category: SkuCategory;
  weight: number;
  mouldCapacity: number;
};

export function listSkus(companyId?: string, includeArchived = false) {
  return prisma.sKU.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(includeArchived ? {} : { deletedAt: null })
    },
    include: { company: true },
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }]
  });
}

export async function createSku(data: SkuInput, performedBy: string) {
  const sku = await prisma.sKU.create({ data, include: { company: true } });
  await writeLog({
    actionType: ActionType.CREATE,
    entity: LogEntity.SKU,
    entityId: sku.id,
    newValues: sku,
    performedBy
  });
  return sku;
}

export async function updateSku(id: string, data: SkuInput, performedBy: string) {
  const previous = await prisma.sKU.findUnique({ where: { id } });
  if (!previous) throw notFound("SKU not found");

  const sku = await prisma.sKU.update({ where: { id }, data, include: { company: true } });
  if (previous.category !== sku.category || previous.companyId !== sku.companyId) {
    await resequenceAffectedBatches(id, previous.category, sku.category, previous.companyId, sku.companyId);
  }
  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.SKU,
    entityId: id,
    previousValues: previous,
    newValues: sku,
    performedBy
  });
  return sku;
}

async function resequenceAffectedBatches(
  skuId: string,
  previousCategory: SkuCategory,
  nextCategory: SkuCategory,
  previousCompanyId: string,
  nextCompanyId: string
) {
  const dates = await prisma.productionEntry.findMany({
    where: { skuId, deletedAt: null },
    distinct: ["date"],
    select: { date: true }
  });

  await Promise.all(
    dates.flatMap(({ date }) => {
      const updates: Promise<unknown>[] = [];
      if (previousCategory === SkuCategory.BREAD) {
        updates.push(resequenceBreadBatches(previousCompanyId, date));
      }
      if (nextCategory === SkuCategory.BREAD) {
        updates.push(resequenceBreadBatches(nextCompanyId, date));
      }
      if (nextCategory !== SkuCategory.BREAD) {
        updates.push(resequenceSkuBatches(skuId, date));
      }
      return updates;
    })
  );
}

async function resequenceBreadBatches(companyId: string, date: Date) {
  await prisma.$executeRaw(
    Prisma.sql`
      WITH ranked_entries AS (
        SELECT
          pe."id",
          ROW_NUMBER() OVER (ORDER BY pe."createdAt" ASC, pe."id" ASC) AS rn
        FROM "ProductionEntry" pe
        JOIN "SKU" sku ON sku."id" = pe."skuId"
        WHERE pe."deletedAt" IS NULL
          AND pe."companyId" = ${companyId}
          AND pe."date" = ${date}
          AND sku."category" = 'BREAD'
      )
      UPDATE "ProductionEntry" pe
      SET "batchNumber" = ranked_entries.rn
      FROM ranked_entries
      WHERE pe."id" = ranked_entries."id"
    `
  );
}

async function resequenceSkuBatches(skuId: string, date: Date) {
  await prisma.$executeRaw(
    Prisma.sql`
      WITH ranked_entries AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
        FROM "ProductionEntry"
        WHERE "deletedAt" IS NULL
          AND "skuId" = ${skuId}
          AND "date" = ${date}
      )
      UPDATE "ProductionEntry" pe
      SET "batchNumber" = ranked_entries.rn
      FROM ranked_entries
      WHERE pe."id" = ranked_entries."id"
    `
  );
}

export async function deleteSku(id: string, performedBy: string) {
  const previous = await prisma.sKU.findUnique({ where: { id } });
  if (!previous) throw notFound("SKU not found");

  const sku = await prisma.sKU.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: { company: true }
  });
  await writeLog({
    actionType: ActionType.DELETE,
    entity: LogEntity.SKU,
    entityId: id,
    previousValues: previous,
    newValues: sku,
    performedBy
  });
}
