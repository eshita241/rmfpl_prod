import { Router } from "express";
import { isGoogleAuthConfigured, passport } from "../config/passport.js";
import { login, logout, me, oauthCallback, signup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRoutes = Router();

authRoutes.get("/google", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    return res.status(503).json({ message: "Google OAuth is not configured yet." });
  }
  return passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});
authRoutes.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure", session: false }),
  oauthCallback
);
authRoutes.get("/failure", (_req, res) => res.status(401).json({ message: "Google sign-in failed." }));
authRoutes.post("/login", asyncHandler(login));
authRoutes.post("/signup", asyncHandler(signup));
authRoutes.get("/me", requireAuth, me);
authRoutes.post("/logout", logout);
