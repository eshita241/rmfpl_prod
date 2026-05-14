import { Role, type RoleDefinition } from "@prisma/client";

export const permissions = ["PRODUCTION", "DISPATCH", "REPORTS", "LOGS", "ADMIN"] as const;
export type Permission = (typeof permissions)[number];

export const permissionLabels: Record<Permission, string> = {
  PRODUCTION: "Production entries and damages",
  DISPATCH: "Dispatch",
  REPORTS: "Reports",
  LOGS: "Logs",
  ADMIN: "Admin settings"
};

export function builtInPermissions(role: Role): Permission[] {
  if (role === Role.ADMIN) return [...permissions];
  if (role === Role.DISPATCH) return ["DISPATCH"];
  return ["PRODUCTION", "REPORTS", "LOGS"];
}

export function effectivePermissions(user: { role: Role; roleDefinition?: Pick<RoleDefinition, "permissions"> | null }) {
  if (user.role === Role.ADMIN) return builtInPermissions(Role.ADMIN);
  return normalizePermissions(user.roleDefinition?.permissions ?? builtInPermissions(user.role));
}

export function effectiveRoleName(user: { role: Role; roleDefinition?: Pick<RoleDefinition, "name"> | null }) {
  return user.roleDefinition?.name ?? user.role;
}

export function normalizePermissions(input: string[]) {
  const allowed = new Set<string>(permissions);
  return Array.from(new Set(input.filter((permission): permission is Permission => allowed.has(permission))));
}
