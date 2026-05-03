import type { Request, Response } from "express";
import { z } from "zod";
import { createDamage, deleteDamage, listDamages, updateDamage } from "../services/damageService.js";
import { param } from "../utils/request.js";

const damageSchema = z.object({
  date: z.string().min(10),
  productionEntryId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  reason: z.string().min(2)
});

export async function postDamage(req: Request, res: Response) {
  const damage = await createDamage(damageSchema.parse(req.body), req.user!.id);
  res.status(201).json(damage);
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
  res.json(await updateDamage(param(req, "id"), damageSchema.parse(req.body), req.user!.id));
}

export async function removeDamage(req: Request, res: Response) {
  await deleteDamage(param(req, "id"), req.user!.id);
  res.status(204).send();
}
