import type { Role, User } from "@prisma/client";

export type AuthUser = Pick<User, "id" | "name" | "email" | "role">;

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export type JwtPayload = {
  id: string;
  email: string;
  role: Role;
};
