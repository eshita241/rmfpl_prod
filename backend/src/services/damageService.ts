import { ActionType, LogEntity } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { safeUserSelect } from "../utils/selects.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";

export type DamageInput = {
  date: string;
  productionEntryId: string;
  amount: number;
  reason: string;
};

async function getProductionEntry(input: DamageInput) {
  const entry = await prisma.productionEntry.findUnique({
    where: { id: input.productionEntryId },
    include: { company: true, sku: true, damageEntries: true }
  });
  if (!entry) throw new AppError("Select a valid production entry.", 400);
  if (entry.deletedAt) throw new AppError("Selected production entry has been archived.", 400);

  const requestedDate = new Date(input.date).toISOString().slice(0, 10);
  const entryDate = entry.date.toISOString().slice(0, 10);
  if (requestedDate !== entryDate) {
    throw new AppError("Damage date must match the selected production entry date.", 400);
  }

  const alreadyDamaged = entry.damageEntries
    .filter((damage) => !damage.deletedAt)
    .reduce((total, damage) => total + damage.amount, 0);
  const remaining = entry.quantityProduced - alreadyDamaged;
  if (input.amount > remaining) {
    throw new AppError(
      `Damage quantity cannot exceed production quantity. Already damaged: ${alreadyDamaged}. Remaining allowed: ${Math.max(remaining, 0)}.`,
      400
    );
  }

  return entry;
}

export async function createDamage(input: DamageInput, createdBy: string) {
  const entry = await getProductionEntry(input);
  const damage = await prisma.damageEntry.create({
    data: {
      date: new Date(input.date),
      batch: entry.shift,
      productionEntryId: entry.id,
      companyId: entry.companyId,
      skuId: entry.skuId,
      amount: input.amount,
      reason: input.reason,
      createdBy
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect }, productionEntry: true }
  });

  await writeLog({
    actionType: ActionType.CREATE,
    entity: LogEntity.DAMAGE,
    entityId: damage.id,
    newValues: damage,
    performedBy: createdBy
  });

  return damage;
}

export function listDamages(filters: { startDate?: string; endDate?: string }) {
  return prisma.damageEntry.findMany({
    where: {
      deletedAt: null,
      date: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined
      }
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect }, productionEntry: true },
    orderBy: { date: "desc" },
    take: 500
  });
}

export async function updateDamage(id: string, input: DamageInput, performedBy: string) {
  const previous = await prisma.damageEntry.findUnique({ where: { id } });
  if (!previous) throw notFound("Damage entry not found");
  if (previous.deletedAt) throw notFound("Damage entry has been archived");

  const entry = await prisma.productionEntry.findUnique({
    where: { id: input.productionEntryId },
    include: { company: true, sku: true, damageEntries: true }
  });
  if (!entry || entry.deletedAt) throw new AppError("Select a valid production entry.", 400);

  const alreadyDamaged = entry.damageEntries
    .filter((damage) => !damage.deletedAt && damage.id !== id)
    .reduce((total, damage) => total + damage.amount, 0);
  const remaining = entry.quantityProduced - alreadyDamaged;
  if (input.amount > remaining) {
    throw new AppError(
      `Damage quantity cannot exceed production quantity. Already damaged: ${alreadyDamaged}. Remaining allowed: ${Math.max(remaining, 0)}.`,
      400
    );
  }

  const damage = await prisma.damageEntry.update({
    where: { id },
    data: {
      date: new Date(input.date),
      batch: entry.shift,
      productionEntryId: entry.id,
      companyId: entry.companyId,
      skuId: entry.skuId,
      amount: input.amount,
      reason: input.reason
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect }, productionEntry: true }
  });

  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.DAMAGE,
    entityId: id,
    previousValues: previous,
    newValues: damage,
    performedBy
  });

  return damage;
}

export async function deleteDamage(id: string, performedBy: string) {
  const previous = await prisma.damageEntry.findUnique({ where: { id } });
  if (!previous) throw notFound("Damage entry not found");
  if (previous.deletedAt) return;

  const damage = await prisma.damageEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: { company: true, sku: true, creator: { select: safeUserSelect }, productionEntry: true }
  });

  await writeLog({
    actionType: ActionType.DELETE,
    entity: LogEntity.DAMAGE,
    entityId: id,
    previousValues: previous,
    newValues: damage,
    performedBy
  });
}
