import type { Request, Response } from "express";
import { z } from "zod";
import { createDamage, deleteDamage, listDamages, updateDamage } from "../services/damageService.js";
import { param } from "../utils/request.js";

const createDamageSchema = z.object({
  date: z.string().min(10),
  companyId: z.string().min(1),
  skuId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  reason: z.string().min(2)
});

const updateDamageSchema = z.object({
  date: z.string().min(10),
  productionEntryId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  reason: z.string().min(2)
});

export async function postDamage(req: Request, res: Response) {
  const damages = await createDamage(createDamageSchema.parse(req.body), req.user!.id, req.user!.role);
  res.status(201).json(damages);
}

export async function getDamages(req: Request, res: Response) {
  res.json(
    await listDamages({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined
    })
  );
}

export async function putDamage(req: Request, res: Response) {
  res.json(await updateDamage(param(req, "id"), updateDamageSchema.parse(req.body), req.user!.id));
}

export async function removeDamage(req: Request, res: Response) {
  await deleteDamage(param(req, "id"), req.user!.id);
  res.status(204).send();
}
