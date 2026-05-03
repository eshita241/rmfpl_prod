import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

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
            create: { email, name: profile.displayName }
          });

          done(null, {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          });
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

export { passport };
