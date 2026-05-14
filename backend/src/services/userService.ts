import { ActionType, LogEntity, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/errors.js";
import { writeLog } from "./logService.js";
import { effectivePermissions, effectiveRoleName, normalizePermissions, permissionLabels, permissions } from "./permissionService.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  roleDefinitionId: true,
  roleDefinition: true,
  createdAt: true
} as const;

type PresentableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleDefinitionId: string | null;
  roleDefinition?: { name: string; permissions: string[] } | null;
  createdAt: Date;
};

function presentUser(user: PresentableUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleDefinitionId: user.roleDefinitionId,
    roleName: effectiveRoleName(user),
    permissions: effectivePermissions(user),
    createdAt: user.createdAt
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect
  });
  return users.map(presentUser);
}

export async function changeUserRole(id: string, input: { role?: Role; roleDefinitionId?: string | null }, performedBy: string) {
  const previous = await prisma.user.findUnique({ where: { id } });
  if (!previous) throw notFound("User not found");

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
