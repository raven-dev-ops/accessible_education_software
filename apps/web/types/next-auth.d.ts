import { type AppRole, type AppSessionUser } from "../lib/roleUtils";

declare module "next-auth" {
  interface Session {
    user?: AppSessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}
