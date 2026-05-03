import { Router } from "express";
import { Role } from "@prisma/client";
import { getCompanies, getLogs, getReport, downloadApp } from "../controllers/baseControllers.js";
import { getDamages, postDamage, putDamage, removeDamage } from "../controllers/damageController.js";
import { getEntries, getNextBatch, postEntry, putEntry, removeEntry } from "../controllers/entryController.js";
import { getSkus, postSku, putSku, removeSku } from "../controllers/skuController.js";
import { getUsers, patchUserRole } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { authRoutes } from "./authRoutes.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const routes = Router();

routes.get("/health", (_req, res) => res.json({ ok: true }));
routes.get("/favicon.ico", (_req, res) => res.status(204).send());
routes.use("/auth", authRoutes);

routes.use(requireAuth);
routes.get("/companies", asyncHandler(getCompanies));
routes.get("/sku", asyncHandler(getSkus));
routes.post("/sku", requireRole(Role.ADMIN), asyncHandler(postSku));
routes.put("/sku/:id", requireRole(Role.ADMIN), asyncHandler(putSku));
routes.delete("/sku/:id", requireRole(Role.ADMIN), asyncHandler(removeSku));
routes.post("/entries", asyncHandler(postEntry));
routes.get("/entries", asyncHandler(getEntries));
routes.get("/entries/next-batch", asyncHandler(getNextBatch));
routes.put("/entries/:id", requireRole(Role.ADMIN), asyncHandler(putEntry));
routes.delete("/entries/:id", requireRole(Role.ADMIN), asyncHandler(removeEntry));
routes.post("/damages", asyncHandler(postDamage));
routes.get("/damages", asyncHandler(getDamages));
routes.put("/damages/:id", requireRole(Role.ADMIN), asyncHandler(putDamage));
routes.delete("/damages/:id", requireRole(Role.ADMIN), asyncHandler(removeDamage));
routes.get("/logs", asyncHandler(getLogs));
routes.get("/reports", asyncHandler(getReport));
routes.get("/download-app", asyncHandler(downloadApp));
routes.get("/users", requireRole(Role.ADMIN), asyncHandler(getUsers));
routes.patch("/users/:id/role", requireRole(Role.ADMIN), asyncHandler(patchUserRole));
