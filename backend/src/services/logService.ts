import type { ActionType, LogEntity, Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const IST_OFFSET_MINUTES = 330;

type LogInput = {
  actionType: ActionType;
  entity: LogEntity;
  entityId: string;
  previousValues?: unknown;
  newValues?: unknown;
  performedBy: string;
};

export async function writeLog(input: LogInput) {
  return prisma.log.create({
    data: {
      actionType: input.actionType,
      entity: input.entity,
      entityId: input.entityId,
      performedBy: input.performedBy,
      changes: {
        previousValues: input.previousValues ?? null,
        newValues: input.newValues ?? null
      } as Prisma.InputJsonValue
    }
  });
}

export async function listLogs(filters: { date?: string; role?: Role }) {
  const dateWhere = filters.date
    ? {
        timestamp: {
          gte: istDayStartUtc(filters.date),
          lte: istDayEndUtc(filters.date)
        }
      }
    : {};
  const userScopeWhere =
    filters.role === Role.ADMIN
      ? {}
      : {
          OR: [
            { entity: "ENTRY" as const, actionType: "CREATE" as const },
            { entity: "DAMAGE" as const, actionType: "CREATE" as const }
          ]
        };

  return prisma.log.findMany({
    where: { ...dateWhere, ...userScopeWhere },
    orderBy: { timestamp: "desc" },
    include: { performer: { select: { id: true, name: true, email: true, role: true } } },
    take: 300
  });
}

function istDayStartUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MINUTES * 60_000);
}

function istDayEndUtc(date: string) {
  const start = istDayStartUtc(date);
  return new Date(start.getTime() + 24 * 60 * 60_000 - 1);
}
