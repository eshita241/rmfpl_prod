import { ActionType, LogEntity, Role, SkuCategory } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError, notFound } from "../utils/errors.js";
import { safeUserSelect } from "../utils/selects.js";
import { writeLog } from "./logService.js";

export type EntryInput = {
  date: string;
  companyId: string;
  skuId: string;
  quantityProduced?: number;
  mouldsUsed: number;
  emptySlotsPerMould: number;
  notes?: string;
};

async function validateCapacity(input: EntryInput) {
  const sku = await prisma.sKU.findUnique({ where: { id: input.skuId } });
  if (!sku) throw new AppError("Select a valid SKU.", 400);
  if (sku.deletedAt) throw new AppError("This SKU has been archived and cannot be used for new production.", 400);
  if (sku.companyId !== input.companyId) throw new AppError("SKU does not belong to this company.", 400);

  return {
    sku,
    totalCapacity: input.mouldsUsed * sku.mouldCapacity,
    quantityProduced: calculateQuantity(input.mouldsUsed, sku.mouldCapacity, input.emptySlotsPerMould),
    exceedsCapacity: false
  };
}

function calculateQuantity(mouldsUsed: number, mouldCapacity: number, extraFilledSlots: number) {
  return Math.max(mouldsUsed * mouldCapacity + extraFilledSlots, 0);
}

function dateInIst(dayOffset = 0) {
  const target = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(target);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertUserCanWriteDate(date: string, role: Role) {
  if (role === Role.ADMIN) return;
  const requestedDate = date.slice(0, 10);
  const allowedDates = new Set([dateInIst(-1), dateInIst(), dateInIst(1)]);
  if (!allowedDates.has(requestedDate)) {
    throw new AppError("Users can add production entries only for yesterday, today, or tomorrow.", 403);
  }
}

function isBreadSku(sku: { category: SkuCategory }) {
  return sku.category === SkuCategory.BREAD;
}

async function batchScopeWhere(skuId: string) {
  const sku = await prisma.sKU.findUnique({ where: { id: skuId } });
  if (!sku) throw new AppError("Select a valid SKU.", 400);

  return isBreadSku(sku)
    ? {
        companyId: sku.companyId,
        sku: { category: SkuCategory.BREAD }
      }
    : { skuId };
}

export async function nextBatchNumber(date: string, skuId: string, excludeId?: string) {
  const scopeWhere = await batchScopeWhere(skuId);
  const count = await prisma.productionEntry.count({
    where: {
      date: new Date(date),
      deletedAt: null,
      ...scopeWhere,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });
  return count + 1;
}

async function resequenceBatches(date: Date, skuId: string) {
  const scopeWhere = await batchScopeWhere(skuId);
  const entries = await prisma.productionEntry.findMany({
    where: { date, deletedAt: null, ...scopeWhere },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });

  await Promise.all(
    entries.map((entry, index) =>
      prisma.productionEntry.update({
        where: { id: entry.id },
        data: { batchNumber: index + 1 }
      })
    )
  );
}

export async function createEntry(input: EntryInput, createdBy: string, role: Role) {
  assertUserCanWriteDate(input.date, role);
  const capacity = await validateCapacity(input);
  const batchNumber = await nextBatchNumber(input.date, input.skuId);
  const entry = await prisma.productionEntry.create({
    data: {
      ...input,
      quantityProduced: capacity.quantityProduced,
      date: new Date(input.date),
      batchNumber,
      notes: input.notes?.trim() || null,
      createdBy
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect } }
  });

  await writeLog({
    actionType: ActionType.CREATE,
    entity: LogEntity.ENTRY,
    entityId: entry.id,
    newValues: entry,
    performedBy: createdBy
  });

  return { entry, ...capacity };
}

export async function listEntries(filters: { startDate?: string; endDate?: string; companyId?: string; skuId?: string }) {
  return prisma.productionEntry.findMany({
    where: {
      deletedAt: null,
      companyId: filters.companyId || undefined,
      skuId: filters.skuId || undefined,
      date: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined
      }
    },
    include: {
      company: true,
      sku: true,
      creator: { select: safeUserSelect },
      damageEntries: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } }
    },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 500
  });
}

export async function updateEntry(id: string, input: EntryInput, performedBy: string) {
  const capacity = await validateCapacity(input);
  const previous = await prisma.productionEntry.findUnique({ where: { id }, include: { damageEntries: true } });
  if (!previous) throw notFound("Entry not found");
  if (previous.deletedAt) throw notFound("Entry has been archived");

  const activeDamageTotal = previous.damageEntries
    .filter((damage) => !damage.deletedAt)
    .reduce((total, damage) => total + damage.amount, 0);
  if (capacity.quantityProduced < activeDamageTotal) {
    throw new AppError(`Quantity cannot be less than active damages (${activeDamageTotal}).`, 400);
  }

  const oldDate = previous.date;
  const oldSkuId = previous.skuId;
  const skuOrDateChanged =
    oldSkuId !== input.skuId || oldDate.toISOString().slice(0, 10) !== new Date(input.date).toISOString().slice(0, 10);
  const batchNumber = skuOrDateChanged ? await nextBatchNumber(input.date, input.skuId, id) : previous.batchNumber;

  const entry = await prisma.productionEntry.update({
    where: { id },
    data: {
      ...input,
      quantityProduced: capacity.quantityProduced,
      date: new Date(input.date),
      batchNumber,
      notes: input.notes?.trim() || null
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect } }
  });

  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.ENTRY,
    entityId: id,
    previousValues: previous,
    newValues: entry,
    performedBy
  });

  if (skuOrDateChanged) {
    await resequenceBatches(oldDate, oldSkuId);
    await resequenceBatches(new Date(input.date), input.skuId);
  }

  return entry;
}

export async function deleteEntry(id: string, performedBy: string) {
  const previous = await prisma.productionEntry.findUnique({ where: { id } });
  if (!previous) throw notFound("Entry not found");
  if (previous.deletedAt) return;

  const entry = await prisma.productionEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: { company: true, sku: true, creator: { select: safeUserSelect } }
  });

  await writeLog({
    actionType: ActionType.DELETE,
    entity: LogEntity.ENTRY,
    entityId: id,
    previousValues: previous,
    newValues: entry,
    performedBy
  });

  await resequenceBatches(previous.date, previous.skuId);
}
