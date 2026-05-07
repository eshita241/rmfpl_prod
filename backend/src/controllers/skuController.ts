import type { Request, Response } from "express";
import { SkuCategory } from "@prisma/client";
import { z } from "zod";
import { createSku, deleteSku, listSkus, updateSku } from "../services/skuService.js";
import { param } from "../utils/request.js";

const skuSchema = z.object({
  name: z.string().min(2),
  companyId: z.string().min(1),
  category: z.nativeEnum(SkuCategory).default(SkuCategory.OTHER),
  weight: z.coerce.number().positive(),
  mouldCapacity: z.coerce.number().int().positive()
});

export async function getSkus(req: Request, res: Response) {
  res.json(
    await listSkus(
      req.query.companyId as string | undefined,
      req.query.includeArchived === "true" && req.user?.role === "ADMIN"
    )
  );
}

export async function postSku(req: Request, res: Response) {
  const sku = await createSku(skuSchema.parse(req.body), req.user!.id);
  res.status(201).json(sku);
}

export async function putSku(req: Request, res: Response) {
  const sku = await updateSku(param(req, "id"), skuSchema.parse(req.body), req.user!.id);
  res.json(sku);
}

export async function removeSku(req: Request, res: Response) {
  await deleteSku(param(req, "id"), req.user!.id);
  res.status(204).send();
}
