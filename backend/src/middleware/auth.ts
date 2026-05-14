import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import type { JwtPayload } from "../types.js";
import { AppError } from "../utils/errors.js";
import { effectivePermissions, effectiveRoleName, type Permission } from "../services/permissionService.js";

export function signAuthToken(payload: JwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;
    if (!token) throw new AppError("Please sign in first.", 401);

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, isSuperAdmin: true, roleDefinitionId: true, roleDefinition: true, deletedAt: true }
    });

    if (!user || user.deletedAt) throw new AppError("Your session is no longer valid.", 401);
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      roleDefinitionId: user.roleDefinitionId,
      roleName: effectiveRoleName(user),
      permissions: effectivePermissions(user)
    };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("Please sign in again.", 401));
  }
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Please sign in first.", 401));
    if (req.user.permissions.includes("ADMIN")) return next();
    if (!requiredPermissions.some((permission) => req.user!.permissions.includes(permission))) {
      return next(new AppError("You do not have permission to do that.", 403));
    }
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Please sign in first.", 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to do that.", 403));
    }
    next();
  };
}
