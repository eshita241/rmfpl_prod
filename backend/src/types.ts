import type { Role, User } from "@prisma/client";
import type { Permission } from "./services/permissionService.js";

export type AuthUser = Pick<User, "id" | "name" | "email" | "role"> & {
  isSuperAdmin?: boolean;
  roleDefinitionId?: string | null;
  roleName: string;
  permissions: Permission[];
};

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export type JwtPayload = {
  id: string;
  email: string;
  role: Role;
};
