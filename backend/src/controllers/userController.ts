import type { Request, Response } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { changeUserRole, createRoleDefinition, deleteUser, listAvailablePermissions, listRoleDefinitions, listUsers } from "../services/userService.js";
import { param } from "../utils/request.js";

export async function getUsers(_req: Request, res: Response) {
  res.json(await listUsers());
}

export async function patchUserRole(req: Request, res: Response) {
  const body = z.object({ role: z.enum([Role.ADMIN, Role.USER, Role.DISPATCH]).optional(), roleDefinitionId: z.string().nullable().optional() }).parse(req.body);
  res.json(await changeUserRole(param(req, "id"), body, req.user!.id));
}

export async function removeUser(req: Request, res: Response) {
  await deleteUser(param(req, "id"), req.user!.id);
  res.status(204).send();
}

export async function getPermissions(_req: Request, res: Response) {
  res.json(listAvailablePermissions());
}

export async function getRoleDefinitions(_req: Request, res: Response) {
  res.json(await listRoleDefinitions());
}

export async function postRoleDefinition(req: Request, res: Response) {
  const body = z.object({ name: z.string().trim().min(2), permissions: z.array(z.string()).min(1) }).parse(req.body);
  res.status(201).json(await createRoleDefinition(body));
}
