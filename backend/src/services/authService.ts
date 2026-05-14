import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { effectivePermissions, effectiveRoleName } from "./permissionService.js";

function authUser(user: Awaited<ReturnType<typeof prisma.user.findUnique>> & { roleDefinition?: { name: string; permissions: string[] } | null }) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    roleDefinitionId: user.roleDefinitionId,
    roleName: effectiveRoleName(user),
    permissions: effectivePermissions(user)
  };
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { roleDefinition: true }
  });

  if (!user?.passwordHash || user.deletedAt) {
    throw new AppError("Email or password is incorrect.", 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Email or password is incorrect.", 401);
  }

  return authUser(user)!;
}

export async function createPasswordUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: Role.PENDING
    }
  });

  return authUser({ ...user, roleDefinition: null })!;
}
