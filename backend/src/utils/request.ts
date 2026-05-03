import type { Request } from "express";
import { AppError } from "./errors.js";

export function param(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string") throw new AppError(`Missing route parameter: ${name}`, 400);
  return value;
}
