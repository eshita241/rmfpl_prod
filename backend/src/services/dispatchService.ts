import { ActionType, LogEntity } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError, notFound } from "../utils/errors.js";
import { safeUserSelect } from "../utils/selects.js";
import { writeLog } from "./logService.js";

export type DispatchInput = {
  date: string;
  companyId: string;
  skuId: string;
  quantity: number;
  carNumber: string;
  sealNumber?: string;
  cratesSent?: number;
  cratesReceived?: number;
};

export type DispatchFilters = {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  skuId?: string;
};

const vehicleNumberPattern = /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/;

function dateRange(filters: DispatchFilters) {
  return {
    gte: filters.startDate ? new Date(filters.startDate) : undefined,
    lte: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined
  };
}

async function validateDispatchInput(input: DispatchInput) {
  const sku = await prisma.sKU.findUnique({ where: { id: input.skuId }, include: { company: true } });
  if (!sku) throw new AppError("Select a valid variant.", 400);
  if (sku.deletedAt) throw new AppError("This variant has been archived.", 400);
  if (sku.companyId !== input.companyId) throw new AppError("Variant does not belong to this company.", 400);
  return sku;
}

function normalizeVehicleNumber(carNumber: string) {
  return carNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

function assertValidVehicleNumber(carNumber: string) {
  if (!vehicleNumberPattern.test(carNumber)) {
    throw new AppError("Enter a valid vehicle number, for example MH12AB1234 or 24BH1234AA.", 400);
  }
}

async function dispatchQuantityState(input: Pick<DispatchInput, "date" | "companyId" | "skuId">, excludeDispatchId?: string) {
  const date = new Date(input.date);
  const [produced, dispatched] = await Promise.all([
    prisma.productionEntry.aggregate({
      where: {
        deletedAt: null,
        date,
        companyId: input.companyId,
        skuId: input.skuId
      },
      _sum: { quantityProduced: true }
    }),
    prisma.dispatchEntry.aggregate({
      where: {
        deletedAt: null,
        ...(excludeDispatchId ? { id: { not: excludeDispatchId } } : {}),
        date,
        companyId: input.companyId,
        skuId: input.skuId
      },
      _sum: { quantity: true }
    })
  ]);

  const quantityProduced = produced._sum.quantityProduced ?? 0;
  const quantityDispatched = dispatched._sum.quantity ?? 0;
  return {
    quantityProduced,
    quantityDispatched,
    quantityRemaining: Math.max(quantityProduced - quantityDispatched, 0)
  };
}

export async function createDispatch(input: DispatchInput, createdBy: string) {
  const sku = await validateDispatchInput(input);
  const isModern = sku.company.name.toLowerCase() === "modern";
  const carNumber = normalizeVehicleNumber(input.carNumber);
  assertValidVehicleNumber(carNumber);

  const quantityState = await dispatchQuantityState(input);
  if (input.quantity > quantityState.quantityRemaining) {
    throw new AppError(
      `Dispatch quantity cannot exceed remaining production quantity. Produced: ${quantityState.quantityProduced}. Already dispatched: ${quantityState.quantityDispatched}. Remaining allowed: ${quantityState.quantityRemaining}.`,
      400
    );
  }

  const entry = await prisma.dispatchEntry.create({
    data: {
      date: new Date(input.date),
      companyId: input.companyId,
      skuId: input.skuId,
      quantity: input.quantity,
      carNumber,
      sealNumber: isModern ? input.sealNumber?.trim() || null : null,
      cratesSent: isModern ? input.cratesSent ?? 0 : 0,
      cratesReceived: isModern ? input.cratesReceived ?? 0 : 0,
      createdBy
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect } }
  });

  await writeLog({
    actionType: ActionType.CREATE,
    entity: LogEntity.DISPATCH,
    entityId: entry.id,
    newValues: entry,
    performedBy: createdBy
  });

  return entry;
}

export async function updateDispatch(id: string, input: DispatchInput, performedBy: string) {
  const previous = await prisma.dispatchEntry.findUnique({ where: { id } });
  if (!previous) throw notFound("Dispatch entry not found");
  if (previous.deletedAt) throw notFound("Dispatch entry has been archived");

  const sku = await validateDispatchInput(input);
  const isModern = sku.company.name.toLowerCase() === "modern";
  const carNumber = normalizeVehicleNumber(input.carNumber);
  assertValidVehicleNumber(carNumber);

  const quantityState = await dispatchQuantityState(input, id);
  if (input.quantity > quantityState.quantityRemaining) {
    throw new AppError(
      `Dispatch quantity cannot exceed remaining production quantity. Produced: ${quantityState.quantityProduced}. Already dispatched: ${quantityState.quantityDispatched}. Remaining allowed: ${quantityState.quantityRemaining}.`,
      400
    );
  }

  const entry = await prisma.dispatchEntry.update({
    where: { id },
    data: {
      date: new Date(input.date),
      companyId: input.companyId,
      skuId: input.skuId,
      quantity: input.quantity,
      carNumber,
      sealNumber: isModern ? input.sealNumber?.trim() || null : null,
      cratesSent: isModern ? input.cratesSent ?? 0 : 0,
      cratesReceived: isModern ? input.cratesReceived ?? 0 : 0
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect } }
  });

  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.DISPATCH,
    entityId: id,
    previousValues: previous,
    newValues: entry,
    performedBy
  });

  return entry;
}

export async function listDispatches(filters: DispatchFilters) {
  return prisma.dispatchEntry.findMany({
    where: {
      deletedAt: null,
      companyId: filters.companyId || undefined,
      skuId: filters.skuId || undefined,
      date: dateRange(filters)
    },
    include: { company: true, sku: true, creator: { select: safeUserSelect } },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 500
  });
}

export async function listProductionTotals(filters: DispatchFilters) {
  if (!filters.companyId || !filters.skuId) return [];

  const entries = await prisma.productionEntry.groupBy({
    by: ["date", "companyId", "skuId"],
    where: {
      deletedAt: null,
      companyId: filters.companyId || undefined,
      skuId: filters.skuId || undefined,
      date: dateRange(filters)
    },
    _sum: { quantityProduced: true },
    orderBy: [{ date: "desc" }, { companyId: "asc" }, { skuId: "asc" }]
  });

  const companyIds = Array.from(new Set(entries.map((entry) => entry.companyId)));
  const skuIds = Array.from(new Set(entries.map((entry) => entry.skuId)));
  const [companies, skus] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: companyIds } } }),
    prisma.sKU.findMany({ where: { id: { in: skuIds } } })
  ]);
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const skuById = new Map(skus.map((sku) => [sku.id, sku]));

  return Promise.all(
    entries.map(async (entry) => {
      const quantityProduced = entry._sum.quantityProduced ?? 0;
      const dispatched = await prisma.dispatchEntry.aggregate({
        where: {
          deletedAt: null,
          date: entry.date,
          companyId: entry.companyId,
          skuId: entry.skuId
        },
        _sum: { quantity: true }
      });
      const quantityDispatched = dispatched._sum.quantity ?? 0;
      return {
        date: entry.date,
        companyId: entry.companyId,
        skuId: entry.skuId,
        quantityProduced,
        quantityDispatched,
        quantityRemaining: Math.max(quantityProduced - quantityDispatched, 0),
        company: companyById.get(entry.companyId),
        sku: skuById.get(entry.skuId)
      };
    })
  );
}
