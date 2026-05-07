import type { Request, Response } from "express";
import { z } from "zod";
import { createEntry, deleteEntry, listEntries, nextBatchNumber, updateEntry } from "../services/entryService.js";
import { param } from "../utils/request.js";

const entrySchema = z
  .object({
    date: z.string().min(10),
    companyId: z.string().min(1),
    skuId: z.string().min(1),
    quantityProduced: z.coerce.number().int().nonnegative().optional(),
    mouldsUsed: z.coerce.number().int().positive(),
    emptySlotsPerMould: z.coerce.number().int().nonnegative(),
    notes: z.string().optional()
  });

export async function postEntry(req: Request, res: Response) {
  const result = await createEntry(entrySchema.parse(req.body), req.user!.id, req.user!.role);
  res.status(201).json(result);
}

export async function getEntries(req: Request, res: Response) {
  res.json(
    await listEntries({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      companyId: req.query.companyId as string | undefined,
      skuId: req.query.skuId as string | undefined
    })
  );
}

export async function getNextBatch(req: Request, res: Response) {
  const query = z.object({ date: z.string().min(10), skuId: z.string().min(1) }).parse(req.query);
  res.json({ batchNumber: await nextBatchNumber(query.date, query.skuId) });
}

export async function putEntry(req: Request, res: Response) {
  res.json(await updateEntry(param(req, "id"), entrySchema.parse(req.body), req.user!.id));
}

export async function removeEntry(req: Request, res: Response) {
  await deleteEntry(param(req, "id"), req.user!.id);
  res.status(204).send();
}
