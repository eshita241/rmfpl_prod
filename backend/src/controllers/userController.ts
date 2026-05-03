import type { Request, Response } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { changeUserRole, listUsers } from "../services/userService.js";
import { param } from "../utils/request.js";

export async function getUsers(_req: Request, res: Response) {
  res.json(await listUsers());
}

export async function patchUserRole(req: Request, res: Response) {
  const body = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
  res.json(await changeUserRole(param(req, "id"), body.role, req.user!.id));
}
