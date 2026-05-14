import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Role } from "@prisma/client";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { effectivePermissions, effectiveRoleName } from "../services/permissionService.js";

export const isGoogleAuthConfigured = Boolean(env.googleClientId && env.googleClientSecret);

if (isGoogleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email"));

          const user = await prisma.user.upsert({
            where: { email },
            update: { name: profile.displayName },
            create: { email, name: profile.displayName, role: Role.PENDING },
            include: { roleDefinition: true }
          });

          done(null, {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
            roleDefinitionId: user.roleDefinitionId,
            roleName: effectiveRoleName(user),
            permissions: effectivePermissions(user)
          });
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

export { passport };
