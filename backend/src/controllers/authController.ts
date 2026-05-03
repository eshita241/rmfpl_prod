import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { setAuthCookie, signAuthToken } from "../middleware/auth.js";
import { createPasswordUser, loginWithPassword } from "../services/authService.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2)
});

export function oauthCallback(req: Request, res: Response) {
  if (!req.user) return res.redirect(`${env.frontendUrl}/login?error=oauth`);
  const token = signAuthToken({ id: req.user.id, email: req.user.email, role: req.user.role });
  setAuthCookie(res, token);
  return res.redirect(env.frontendUrl);
}

export function me(req: Request, res: Response) {
  return res.json({ user: req.user });
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await loginWithPassword(body.email, body.password);
  const token = signAuthToken({ id: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
  return res.json({ user });
}

export async function signup(req: Request, res: Response) {
  const body = signupSchema.parse(req.body);
  const user = await createPasswordUser(body);
  const token = signAuthToken({ id: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
  return res.status(201).json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production"
  });
  return res.status(204).send();
}
