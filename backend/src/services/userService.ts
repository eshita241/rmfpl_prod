import { ActionType, LogEntity, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError, notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";
import { effectivePermissions, effectiveRoleName, normalizePermissions, permissionLabels, permissions } from "./permissionService.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isSuperAdmin: true,
  roleDefinitionId: true,
  roleDefinition: true,
  createdAt: true,
  deletedAt: true
} as const;

type PresentableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isSuperAdmin: boolean;
  roleDefinitionId: string | null;
  roleDefinition?: { name: string; permissions: string[] } | null;
  createdAt: Date;
  deletedAt?: Date | null;
};

function presentUser(user: PresentableUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    roleDefinitionId: user.roleDefinitionId,
    roleName: effectiveRoleName(user),
    permissions: effectivePermissions(user),
    createdAt: user.createdAt,
    deletedAt: user.deletedAt ?? null
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: userSelect
  });
  return users.map(presentUser);
}

export async function changeUserRole(id: string, input: { role?: Role; roleDefinitionId?: string | null }, performedBy: string) {
  const previous = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!previous) throw notFound("User not found");
  if (previous.isSuperAdmin) throw new AppError("Super admin role cannot be changed.", 400);

  if (input.roleDefinitionId) {
    const roleDefinition = await prisma.roleDefinition.findUnique({ where: { id: input.roleDefinitionId } });
    if (!roleDefinition) throw notFound("Role not found");
  }

  const user = await prisma.user.update({
    where: { id },
    data: input.roleDefinitionId
      ? { roleDefinitionId: input.roleDefinitionId }
      : { role: input.role ?? Role.USER, roleDefinitionId: null },
    select: userSelect
  });

  await writeLog({
    actionType: ActionType.UPDATE,
    entity: LogEntity.USER_ROLE,
    entityId: id,
    previousValues: { role: previous.role, roleDefinitionId: previous.roleDefinitionId },
    newValues: { role: user.role, roleDefinitionId: user.roleDefinitionId },
    performedBy
  });

  return presentUser(user);
}

export async function deleteUser(id: string, performedBy: string) {
  if (id === performedBy) throw new AppError("You cannot delete your own user account.", 400);

  const previous = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
  if (!previous) throw notFound("User not found");
  if (previous.isSuperAdmin) throw new AppError("Super admin cannot be deleted.", 400);
  const deletedAt = new Date();

  await prisma.user.update({
    where: { id },
    data: { deletedAt, roleDefinitionId: null }
  });

  await writeLog({
    actionType: ActionType.DELETE,
    entity: LogEntity.USER_ROLE,
    entityId: id,
    previousValues: presentUser(previous),
    newValues: { deletedAt },
    performedBy
  });
}

export function listAvailablePermissions() {
  return permissions.map((permission) => ({ id: permission, label: permissionLabels[permission] }));
}

export function listRoleDefinitions() {
  return prisma.roleDefinition.findMany({ orderBy: { name: "asc" } });
}

export async function createRoleDefinition(input: { name: string; permissions: string[] }) {
  return prisma.roleDefinition.create({
    data: {
      name: input.name.trim(),
      permissions: normalizePermissions(input.permissions)
    }
  });
}
