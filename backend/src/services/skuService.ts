import { ActionType, LogEntity } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";

type SkuInput = {
  name: string;
  companyId: string;
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
