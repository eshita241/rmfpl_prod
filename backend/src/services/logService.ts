import type { ActionType, LogEntity, Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";

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
          gte: new Date(`${filters.date}T00:00:00.000Z`),
          lte: new Date(`${filters.date}T23:59:59.999Z`)
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
