import type { Request, Response } from "express";
import { z } from "zod";
import { createDispatch, listDispatches, listProductionTotals, updateDispatch } from "../services/dispatchService.js";
import { param } from "../utils/request.js";

const dispatchSchema = z.object({
  date: z.string().min(10),
  companyId: z.string().min(1),
  skuId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  carNumber: z.string().trim().min(1),
  sealNumber: z.string().optional(),
  cratesSent: z.coerce.number().int().nonnegative().optional(),
  cratesReceived: z.coerce.number().int().nonnegative().optional()
});

const filtersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  companyId: z.string().optional(),
  skuId: z.string().optional()
});

export async function postDispatch(req: Request, res: Response) {
  res.status(201).json(await createDispatch(dispatchSchema.parse(req.body), req.user!.id));
}

export async function putDispatch(req: Request, res: Response) {
  res.json(await updateDispatch(param(req, "id"), dispatchSchema.parse(req.body), req.user!.id));
}

export async function getDispatches(req: Request, res: Response) {
  res.json(await listDispatches(filtersSchema.parse(req.query)));
}

export async function getDispatchProductionTotals(req: Request, res: Response) {
  res.json(await listProductionTotals(filtersSchema.parse(req.query)));
}
