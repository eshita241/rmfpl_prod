import { ActionType, LogEntity, Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { safeUserSelect } from "../utils/selects.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";

export type DailyDamageInput = {
  date: string;
  companyId: string;
  skuId: string;
  amount: number;
  reason: string;
};

export type BatchDamageInput = {
  date: string;
  productionEntryId: string;
  amount: number;
  reason: string;
};

function todayInIst() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertUserCanWriteDate(date: string, role: Role) {
  if (role === Role.ADMIN) return;
  if (date.slice(0, 10) !== todayInIst()) {
    throw new AppError("Only admins can add or change damage entries for previous dates.", 403);
  }
}

async function getProductionEntry(input: BatchDamageInput) {
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

export async function createDamage(input: DailyDamageInput, createdBy: string, role: Role) {
  assertUserCanWriteDate(input.date, role);

  return prisma.$transaction(async (tx) => {
    const sku = await tx.sKU.findUnique({ where: { id: input.skuId } });
    if (!sku || sku.deletedAt) throw new AppError("Select a valid SKU.", 400);
    if (sku.companyId !== input.companyId) throw new AppError("SKU does not belong to this company.", 400);

    const entries = await tx.productionEntry.findMany({
      where: {
        date: new Date(input.date),
        companyId: input.companyId,
        skuId: input.skuId,
        deletedAt: null
      },
      include: {
        company: true,
        sku: true,
        damageEntries: { where: { deletedAt: null } }
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });

    if (entries.length === 0) {
      throw new AppError("No production entries found for this SKU on the selected date.", 400);
    }

    const totalProduced = entries.reduce((total, entry) => total + entry.quantityProduced, 0);
    const alreadyDamaged = entries.reduce(
      (total, entry) => total + entry.damageEntries.reduce((entryTotal, damage) => entryTotal + damage.amount, 0),
      0
    );
    const totalRemaining = totalProduced - alreadyDamaged;

    if (input.amount > totalRemaining) {
      throw new AppError(
        `Damage quantity cannot exceed production quantity. Already damaged: ${alreadyDamaged}. Remaining allowed: ${Math.max(totalRemaining, 0)}.`,
        400
      );
    }

    let remainingToAllocate = input.amount;
    const damages = [];

    for (const entry of entries) {
      const entryDamaged = entry.damageEntries.reduce((total, damage) => total + damage.amount, 0);
      const entryRemaining = entry.quantityProduced - entryDamaged;
      const amount = Math.min(remainingToAllocate, entryRemaining);
      if (amount <= 0) continue;

      const damage = await tx.damageEntry.create({
        data: {
          date: new Date(input.date),
          batch: `Batch ${entry.batchNumber}`,
          productionEntryId: entry.id,
          companyId: entry.companyId,
          skuId: entry.skuId,
          amount,
          reason: input.reason,
          createdBy
        },
        include: { company: true, sku: true, creator: { select: safeUserSelect }, productionEntry: true }
      });

      await tx.log.create({
        data: {
          actionType: ActionType.CREATE,
          entity: LogEntity.DAMAGE,
          entityId: damage.id,
          performedBy: createdBy,
          changes: {
            previousValues: null,
            newValues: damage
          } as Prisma.InputJsonValue
        }
      });

      damages.push(damage);
      remainingToAllocate -= amount;
      if (remainingToAllocate === 0) break;
    }

    return damages;
  });
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

export async function updateDamage(id: string, input: BatchDamageInput, performedBy: string) {
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
      batch: `Batch ${entry.batchNumber}`,
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
