import type { Request, Response } from "express";
import { z } from "zod";
import { createEntry, deleteEntry, listEntries, updateEntry } from "../services/entryService.js";
import { param } from "../utils/request.js";

const entrySchema = z
  .object({
    date: z.string().min(10),
    shift: z.string().min(1),
    companyId: z.string().min(1),
    skuId: z.string().min(1),
    quantityProduced: z.coerce.number().int().nonnegative(),
    mouldsUsed: z.coerce.number().int().positive(),
    emptySlotsPerMould: z.coerce.number().int().nonnegative(),
    notes: z.string().optional()
  });

export async function postEntry(req: Request, res: Response) {
  const result = await createEntry(entrySchema.parse(req.body), req.user!.id);
  res.status(201).json(result);
}

export async function getEntries(req: Request, res: Response) {
  res.json(
    await listEntries({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined
    })
  );
}

export async function putEntry(req: Request, res: Response) {
  res.json(await updateEntry(param(req, "id"), entrySchema.parse(req.body), req.user!.id));
}

export async function removeEntry(req: Request, res: Response) {
  await deleteEntry(param(req, "id"), req.user!.id);
  res.status(204).send();
}
