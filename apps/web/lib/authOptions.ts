import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { deriveRoleFromEmail, type AppRole, type AppSessionUser } from "./roleUtils";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      const role = deriveRoleFromEmail(token.email as string | undefined);
      token.role = role;
      return token;
    },
    async session({ session, token }) {
      const role =
        (token.role as AppRole | undefined) ||
        deriveRoleFromEmail(session.user?.email ?? null);

      if (session.user) {
        (session.user as AppSessionUser).role = role ?? "student";
      }

      return session;
    },
  },
};
