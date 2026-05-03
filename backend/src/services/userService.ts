import { ActionType, LogEntity, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";

export function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
}

export async function changeUserRole(id: string, role: Role, performedBy: string) {
  const previous = await prisma.user.findUnique({ where: { id } });
  if (!previous) throw notFound("User not found");

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.USER_ROLE,
    entityId: id,
    previousValues: { role: previous.role },
    newValues: { role: user.role },
    performedBy
  });

  return user;
}
